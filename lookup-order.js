const { query } = require('./lib/db');
const { isRateLimited, getClientIp } = require('./lib/rate-limit');
const { decrypt } = require('./lib/crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = getClientIp(req);
  if (isRateLimited(ip, 15, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 10 phút!' });
  }

  const code = (req.method === 'GET' ? req.query.code : req.body?.code) || '';
  const phone = (req.method === 'GET' ? req.query.phone : req.body?.phone) || '';
  const email = (req.method === 'GET' ? req.query.email : req.body?.email) || '';

  const cleanCode = code.trim().toUpperCase();
  const cleanPhone = phone.replace(/[\s.-]/g, '');
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanCode && (cleanPhone || cleanEmail)) {
    try {
      const historyRes = await query(`
        SELECT 
          o.id, o.code, o.amount, o.status, o.contact_name, o.contact_phone, o.contact_email,
          o.created_at, o.paid_at, o.delivered_at, o.warranty_until,
          p.id as plan_id, p.name as plan_name, p.duration_days, p.account_type,
          pr.id as product_id, pr.name as product_name
        FROM public.orders o
        LEFT JOIN public.plans p ON p.id = o.plan_id
        LEFT JOIN public.products pr ON pr.id = p.product_id
        WHERE ($1 != '' AND (o.contact_phone = $1 OR o.customer_phone = $1))
           OR ($2 != '' AND (o.contact_email = $2 OR o.customer_email = $2))
        ORDER BY o.created_at DESC
        LIMIT 50;
      `, [cleanPhone, cleanEmail]);

      const now = new Date();
      const ordersWithWarranty = historyRes.rows.map(o => {
        let daysLeft = 0;
        let warrantyStatus = 'PENDING';
        if (o.warranty_until) {
          const diffMs = new Date(o.warranty_until) - now;
          daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          warrantyStatus = daysLeft > 0 ? (daysLeft <= 7 ? 'EXPIRING_SOON' : 'ACTIVE') : 'EXPIRED';
        }
        // Mask customer phone & email for customer privacy protection
        const rawPhone = o.contact_phone || '';
        const maskedPhone = rawPhone.length > 5 ? rawPhone.slice(0, 3) + '***' + rawPhone.slice(-3) : '***';
        const rawEmail = o.contact_email || '';
        const maskedEmail = rawEmail.includes('@') ? rawEmail.replace(/^([^@]{2})[^@]+(@.+)$/, '$1***$2') : '';
        return {
          ...o,
          contact_phone: maskedPhone,
          contact_email: maskedEmail,
          customer_phone: maskedPhone,
          customer_email: maskedEmail,
          warranty_days_left: daysLeft,
          warranty_status: warrantyStatus
        };
      });

      return res.status(200).json({
        success: true,
        orders: ordersWithWarranty
      });
    } catch (err) {
      console.error('Error fetching order history:', err);
      return res.status(500).json({ error: 'Lỗi tra cứu lịch sử đơn hàng' });
    }
  }

  if (!cleanCode) {
    return res.status(400).json({ error: 'Vui lòng nhập Mã đơn hàng, Số điện thoại hoặc Email để tìm kiếm!' });
  }

  try {
    let orderRes;
    if (cleanPhone || cleanEmail) {
      orderRes = await query(`
        SELECT 
          o.id, o.code, o.amount, o.status, o.contact_name, o.contact_phone, o.contact_email, o.note,
          o.created_at, o.paid_at, o.delivered_at, o.warranty_until, o.license_info,
          p.id as plan_id, p.name as plan_name, p.duration_days, p.account_type,
          pr.id as product_id, pr.name as product_name, pr.warranty_policy
        FROM public.orders o
        LEFT JOIN public.plans p ON p.id = o.plan_id
        LEFT JOIN public.products pr ON pr.id = p.product_id
        WHERE o.code = $1 AND (($2 != '' AND (o.contact_phone = $2 OR o.customer_phone = $2)) OR ($3 != '' AND (o.contact_email = $3 OR o.customer_email = $3)))
        LIMIT 1;
      `, [cleanCode, cleanPhone, cleanEmail]);
    } else {
      orderRes = await query(`
        SELECT 
          o.id, o.code, o.amount, o.status, o.contact_name, o.contact_phone, o.contact_email, o.note,
          o.created_at, o.paid_at, o.delivered_at, o.warranty_until, o.license_info,
          p.id as plan_id, p.name as plan_name, p.duration_days, p.account_type,
          pr.id as product_id, pr.name as product_name, pr.warranty_policy
        FROM public.orders o
        LEFT JOIN public.plans p ON p.id = o.plan_id
        LEFT JOIN public.products pr ON pr.id = p.product_id
        WHERE o.code = $1
        LIMIT 1;
      `, [cleanCode]);
    }

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Không tìm thấy đơn hàng phù hợp. Vui lòng kiểm tra lại Mã đơn hoặc Số điện thoại/Email!' 
      });
    }

    const order = orderRes.rows[0];

    let deliveredCredentials = null;
    if (order.status === 'delivered') {
      const delivRes = await query(`
        SELECT credentials_encrypted, delivered_at
        FROM public.deliveries
        WHERE order_id = $1
        LIMIT 1;
      `, [order.id]);

      if (delivRes.rows.length > 0) {
        deliveredCredentials = decrypt(delivRes.rows[0].credentials_encrypted);
      } else if (order.license_info) {
        deliveredCredentials = order.license_info;
      }
    }

    let warrantyStatus = 'NONE';
    let daysLeft = 0;
    if (order.warranty_until) {
      const diffMs = new Date(order.warranty_until) - new Date();
      daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        warrantyStatus = (daysLeft <= 7) ? 'EXPIRING_SOON' : 'ACTIVE';
      } else {
        warrantyStatus = 'EXPIRED';
      }
    }

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        amount: order.amount,
        status: order.status,
        contact_name: order.contact_name,
        contact_phone: (order.contact_phone && order.contact_phone.length > 5)
          ? order.contact_phone.slice(0, 3) + '***' + order.contact_phone.slice(-3)
          : '***',
        product_id: order.product_id,
        plan_name: order.plan_name,
        product_name: order.product_name,
        duration_days: order.duration_days,
        account_type: order.account_type,
        created_at: order.created_at,
        paid_at: order.paid_at,
        delivered_at: order.delivered_at,
        warranty_until: order.warranty_until,
        warranty_status: warrantyStatus,
        warranty_days_left: daysLeft,
        credentials: deliveredCredentials
      }
    });

  } catch (err) {
    console.error('lookup-order error:', err);
    return res.status(500).json({ error: 'Đã có lỗi hệ thống khi tra cứu đơn hàng.' });
  }
};

const { query } = require('./lib/db');
const { isRateLimited, getClientIp } = require('./lib/rate-limit');
const { decrypt } = require('./lib/crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = getClientIp(req);
  // Rate limit: max 15 lookups per 10 minutes per IP
  if (isRateLimited(ip, 15, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 10 phút!' });
  }

  const code = (req.method === 'GET' ? req.query.code : req.body?.code) || '';
  const phone = (req.method === 'GET' ? req.query.phone : req.body?.phone) || '';

  const cleanCode = code.trim().toUpperCase();
  const cleanPhone = phone.replace(/[\s.-]/g, '');

  if (!cleanCode || !cleanPhone) {
    return res.status(400).json({ error: 'Vui lòng nhập cả Mã đơn hàng và Số điện thoại đặt hàng!' });
  }

  try {
    const orderRes = await query(`
      SELECT 
        o.id, o.code, o.amount, o.status, o.contact_name, o.contact_phone, o.contact_email, o.note,
        o.created_at, o.paid_at, o.delivered_at, o.warranty_until, o.license_info,
        p.name as plan_name, p.duration_days, p.account_type,
        pr.name as product_name, pr.warranty_policy
      FROM public.orders o
      LEFT JOIN public.plans p ON p.id = o.plan_id
      LEFT JOIN public.products pr ON pr.id = p.product_id
      WHERE o.code = $1 AND (o.contact_phone = $2 OR o.customer_phone = $2)
      LIMIT 1;
    `, [cleanCode, cleanPhone]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Không tìm thấy đơn hàng phù hợp với mã đơn và số điện thoại đã nhập. Vui lòng kiểm tra lại!' 
      });
    }

    const order = orderRes.rows[0];

    // If order is delivered, look up credentials from deliveries table
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
        // Fallback for legacy plain text delivery
        deliveredCredentials = order.license_info;
      }
    }

    // Calculate warranty status
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
        contact_phone: order.contact_phone,
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

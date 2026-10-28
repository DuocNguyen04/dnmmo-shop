const { query } = require('./lib/db');
const { isRateLimited, getClientIp } = require('./lib/rate-limit');
const crypto = require('crypto');

// Generate cryptographically secure random order code: DN + 6 alphanumeric chars
function generateOrderCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude confusing 0, 1, I, O
  let code = 'DN';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ip = getClientIp(req);

    // Rate limiting: max 5 orders per hour per IP
    if (isRateLimited(ip, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ 
        error: 'Bạn đã tạo quá nhiều đơn hàng trong thời gian ngắn. Vui lòng thử lại sau 1 giờ!' 
      });
    }

    const { plan_id, name, phone, email, note, captcha_token, user_id } = req.body || {};

    // 1. Validate phone
    const cleanPhone = (phone || '').replace(/[\s.-]/g, '');
    const phoneRegex = /^(0|\+84)\d{9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        error: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 chữ số)!' 
      });
    }

    // 2. Validate note
    if (note && note.length > 300) {
      return res.status(400).json({ 
        error: 'Ghi chú không được vượt quá 300 ký tự!' 
      });
    }

    // 3. Validate email if present
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Địa chỉ email không hợp lệ!' 
      });
    }

    // 4. Validate Captcha if TURNSTILE_SECRET_KEY is configured
    if (process.env.TURNSTILE_SECRET_KEY && captcha_token) {
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: captcha_token,
            remoteip: ip
          })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          return res.status(400).json({ error: 'Xác minh Captcha không thành công. Vui lòng thử lại!' });
        }
      } catch (err) {
        console.warn('Captcha verification network warning:', err.message);
      }
    }

    // 5. Look up plan in Database (SERVER DECIDES PRICE & DURATION)
    if (!plan_id) {
      return res.status(400).json({ error: 'Vui lòng chọn một gói dịch vụ để đặt hàng!' });
    }

    const planRes = await query(`
      SELECT 
        p.id as plan_id, p.name as plan_name, p.price, p.duration_days, p.account_type, p.is_active as plan_active,
        pr.id as product_id, pr.name as product_name, pr.is_active as product_active
      FROM public.plans p
      JOIN public.products pr ON pr.id = p.product_id
      WHERE p.id = $1;
    `, [plan_id]);

    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Gói dịch vụ không tồn tại trong hệ thống!' });
    }

    const plan = planRes.rows[0];
    if (!plan.plan_active || !plan.product_active) {
      return res.status(400).json({ error: 'Gói dịch vụ này hiện đang tạm ngưng phục vụ!' });
    }

    // Check inventory count
    const stockRes = await query(`
      SELECT COUNT(*)::int as available_count
      FROM public.inventory_items
      WHERE plan_id = $1 AND status = 'available';
    `, [plan_id]);
    const availableStock = stockRes.rows[0].available_count;

    // 6. Generate unguessable Order Code
    let code = generateOrderCode();
    // Guarantee uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const exists = await query(`SELECT 1 FROM public.orders WHERE code = $1`, [code]);
      if (exists.rows.length === 0) break;
      code = generateOrderCode();
      attempts++;
    }

    // 7. Insert order into DB with server price
    const insertRes = await query(`
      INSERT INTO public.orders (
        code, user_id, plan_id, variant_id, amount, price, 
        contact_name, customer_name, 
        contact_phone, customer_phone, 
        contact_email, customer_email, 
        note, customer_note, status
      )
      VALUES ($1, $2, $3, $3, $4::int, $4::numeric, $5, $5, $6, $6, $7, $7, $8, $8, 'pending')
      RETURNING id, code, amount, status, contact_name, contact_phone, contact_email, created_at;
    `, [
      code,
      user_id || null,
      plan.plan_id,
      plan.price,
      (name || '').trim().substring(0, 100),
      cleanPhone,
      (email || '').trim().substring(0, 100),
      (note || '').trim().substring(0, 300)
    ]);

    const order = insertRes.rows[0];

    // 8. Generate VietQR configuration
    const bankId = process.env.VIETQR_BANK_ID || 'MB'; // MBBank default
    const accountNo = process.env.VIETQR_ACCOUNT_NO || '0865899763';
    const accountName = process.env.VIETQR_ACCOUNT_NAME || 'NGUYEN TAT DUOC';
    const amount = order.amount;
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${order.code}&accountName=${encodeURIComponent(accountName)}`;

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        amount: order.amount,
        status: order.status,
        contact_name: order.contact_name,
        contact_phone: order.contact_phone,
        contact_email: order.contact_email,
        plan_name: plan.plan_name,
        product_name: plan.product_name,
        duration_days: plan.duration_days,
        account_type: plan.account_type,
        created_at: order.created_at,
        available_stock: availableStock
      },
      vietqr: {
        qr_url: qrUrl,
        bank_id: bankId,
        account_no: accountNo,
        account_name: accountName,
        amount: amount,
        content: order.code
      }
    });

  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: 'Đã có lỗi hệ thống xảy ra khi xử lý đơn hàng. Vui lòng liên hệ Zalo hỗ trợ!' });
  }
};

const { query } = require('./lib/db');
const { isRateLimited, getClientIp } = require('./lib/rate-limit');
const crypto = require('crypto');

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

    // 1. Anti-bot Honeypot Trap
    if (req.body?.hp || req.body?.hp_field || req.body?.b_address) {
      return res.status(400).json({ error: 'Yêu cầu không hợp lệ (Phát hiện bot spam)!' });
    }

    // 2. Strict Rate Limiting (Max 5 orders / 5 minutes, 20 / hour per IP)
    if (isRateLimited('co_5m_' + ip, 5, 5 * 60 * 1000) || isRateLimited('co_1h_' + ip, 20, 60 * 60 * 1000)) {
      return res.status(429).json({ 
        error: 'Bạn đã tạo quá nhiều đơn hàng trong thời gian ngắn. Vui lòng thử lại sau vài phút!' 
      });
    }

    const { plan_id, name, phone, email, note, captcha_token, user_id } = req.body || {};

    // 3. XSS Protection & Sanitization on All Customer Inputs
    const cleanName = String(name || '').replace(/[<>]/g, '').trim().slice(0, 100);
    const cleanPhone = (phone || '').replace(/[\s.-]/g, '');
    const cleanEmail = String(email || '').replace(/[<>]/g, '').trim().toLowerCase().slice(0, 100);
    const cleanNote = String(note || '').replace(/[<>]/g, '').trim().slice(0, 300);

    const phoneRegex = /^(\+84|0)\d{7,11}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        error: 'Số điện thoại không hợp lệ. Vui lòng nhập đúng số điện thoại (từ 8 đến 11 chữ số)!' 
      });
    }

    // 4. Anti-Flood Defense: Max 3 pending orders per phone in 30 minutes
    try {
      const pendingCheck = await query(`
        SELECT COUNT(*) as count FROM public.orders 
        WHERE (contact_phone = $1 OR customer_phone = $1) 
          AND status = 'pending' 
          AND created_at > NOW() - INTERVAL '30 minutes';
      `, [cleanPhone]);
      if (parseInt(pendingCheck.rows[0]?.count || 0) >= 3) {
        return res.status(429).json({
          error: 'Số điện thoại này hiện đang có 3 đơn hàng chờ xử lý. Vui lòng liên hệ Zalo 0865 899 763 trước khi tạo thêm đơn mới!'
        });
      }
    } catch (floodErr) {
      console.warn('Pending flood check warning:', floodErr.message);
    }

    let validUserId = null;
    if (user_id) {
      try {
        const uCheck = await query('SELECT id FROM public.users WHERE id = $1', [user_id]);
        if (uCheck.rows.length > 0) {
          validUserId = user_id;
        }
      } catch (e) {
        validUserId = null;
      }
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ 
        error: 'Địa chỉ email không hợp lệ!' 
      });
    }

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

    let finalPrice = Number(plan.price) || 0;
    let appliedFlashSale = null;

    // Check if plan or product has an active Flash Sale with remaining stock
    try {
      const fsCheck = await query(`
        SELECT id, sale_price, total_stock, remaining_stock 
        FROM public.flash_sales 
        WHERE is_active = true 
          AND (plan_id = $1 OR (product_id = $2 AND plan_id IS NULL))
          AND (remaining_stock IS NULL OR remaining_stock > 0)
        ORDER BY created_at ASC 
        LIMIT 1;
      `, [plan.plan_id, plan.product_id]);

      if (fsCheck.rows.length > 0) {
        const fsItem = fsCheck.rows[0];
        if (fsItem.sale_price && Number(fsItem.sale_price) > 0) {
          finalPrice = Number(fsItem.sale_price);
          appliedFlashSale = fsItem;

          // Safely decrement remaining_stock in real time
          await query(`
            UPDATE public.flash_sales
            SET 
              remaining_stock = GREATEST(0, COALESCE(remaining_stock, 20) - 1),
              stock_text = 'Còn ' || GREATEST(0, COALESCE(remaining_stock, 20) - 1) || ' lượt',
              progress_percent = LEAST(98, GREATEST(5, ROUND(((COALESCE(total_stock, 50) - GREATEST(0, COALESCE(remaining_stock, 20) - 1))::numeric / GREATEST(1, COALESCE(total_stock, 50))) * 100))),
              updated_at = NOW()
            WHERE id = $1;
          `, [fsItem.id]);
        }
      }
    } catch (fsErr) {
      console.warn('Flash sale price sync error:', fsErr.message);
    }

    const stockRes = await query(`
      SELECT COUNT(*)::int as available_count
      FROM public.inventory_items
      WHERE plan_id = $1 AND status = 'available';
    `, [plan_id]);
    const availableStock = stockRes.rows[0].available_count;

    let code = generateOrderCode();
    let attempts = 0;
    while (attempts < 5) {
      const exists = await query(`SELECT 1 FROM public.orders WHERE code = $1`, [code]);
      if (exists.rows.length === 0) break;
      code = generateOrderCode();
      attempts++;
    }

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
      validUserId,
      plan.plan_id,
      finalPrice,
      cleanName,
      cleanPhone,
      cleanEmail,
      cleanNote
    ]);

    const order = insertRes.rows[0];

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

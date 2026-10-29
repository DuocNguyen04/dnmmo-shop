const { query, getPool } = require('./lib/db');
const { encrypt, decrypt } = require('./lib/crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

async function verifyAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  
  if (!token) return { isAdmin: false, error: 'Chưa có thông tin xác thực' };

  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (adminSecret && token === adminSecret) {
    return { isAdmin: true, actorId: 'b5109669-3a83-4b53-ac87-bc58f68af58e', email: process.env.ADMIN_EMAIL || 'admin@system.local' };
  }

  // 1. Check if token is our encrypted admin session token (AES-256-GCM)
  try {
    const decrypted = decrypt(token);
    if (decrypted && decrypted.startsWith('{')) {
      const sess = JSON.parse(decrypted);
      if (sess && sess.role === 'admin' && (!sess.exp || sess.exp > Date.now())) {
        return { isAdmin: true, actorId: sess.userId, email: sess.email };
      }
    }
  } catch (e) {}

  // 2. Check Supabase JWT
  return new Promise(resolve => {
    const anonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdWlvcHVwYW5leWNoam5oZndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMzg5NzksImV4cCI6MjEwODcxNDk3OX0.LGnyNKQSf1nJaLs0hv2wSgCnIDZu8OVuhePpujM3xEI';
    const url = new URL('https://kouiopupaneychjnhfwd.supabase.co/auth/v1/user');
    const options = {
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${token}`
      }
    };

    const r = https.request(url, options, async res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        if (res.statusCode !== 200) {
          return resolve({ isAdmin: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
        }
        try {
          const user = JSON.parse(data);
          const profRes = await query(`
            SELECT p.role, p.full_name, u.email FROM public.profiles p
            LEFT JOIN auth.users u ON u.id = p.id
            WHERE p.id = $1;
          `, [user.id]);

          if (profRes.rows.length > 0 && profRes.rows[0].role === 'admin') {
            resolve({ isAdmin: true, actorId: user.id, email: user.email });
          } else {
            resolve({ isAdmin: false, error: 'Tài khoản của bạn không có quyền Quản trị viên (Admin)' });
          }
        } catch (e) {
          resolve({ isAdmin: false, error: 'Lỗi xác thực quyền: ' + e.message });
        }
      });
    });
    r.on('error', e => resolve({ isAdmin: false, error: e.message }));
    r.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action || '';

  if (action === 'login') {
    const rawEmail = req.body?.email || '';
    const rawPass = req.body?.password || '';
    const email = String(rawEmail).trim().toLowerCase();
    const password = String(rawPass).trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Email và Mật khẩu!' });
    }

    // Helper to issue login success response & record audit log
    const sendLoginSuccess = async (userId, userEmail, userName) => {
      const token = encrypt(JSON.stringify({
        userId,
        email: userEmail,
        role: 'admin',
        ts: Date.now(),
        exp: Date.now() + 86400000 * 7 // 7 days valid
      }));

      try {
        await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1::uuid, 'admin_login', 'auth', $2::text, $3::jsonb);", [
          userId, userId, JSON.stringify({ email: userEmail, ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1' })
        ]);
      } catch (auditErr) {
        console.error('Audit log error on login:', auditErr.message);
      }

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: userId,
          email: userEmail,
          name: userName || 'Admin',
          role: 'admin'
        }
      });
    };

    // 1. FAST-PATH: Master Admin Authentication via Allowed Emails & Passwords
    const envAdminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const envAdminPass = (process.env.ADMIN_PASSWORD || '').trim();

    const allowedAdminEmails = [
      'duocnguyen.work@gmail.com',
      'duoc.ntd15@gmail.com',
      'duocnguyen04@gmail.com',
      'duoc@gmail.com',
      'admin@duocnguyenmmo.store',
      'admin@dnmmo.store',
      'admin',
      envAdminEmail
    ].filter(Boolean);

    const validMasterPasswords = [
      'Tatduoc2026A#',
      'Tatduoc2026A#AdminSecure',
      'Tatduoc2026A',
      'Admin@2026!',
      'duoc@gmail.com',
      'admin123',
      envAdminPass
    ].filter(Boolean);

    if (allowedAdminEmails.includes(email) && validMasterPasswords.includes(password)) {
      return await sendLoginSuccess('b5109669-3a83-4b53-ac87-bc58f68af58e', email, 'Nguyễn Được (Admin)');
    }

    // 2. Database Admin Check via public.users table
    try {
      const uRes = await query(`
        SELECT id, email, name, role, password 
        FROM public.users 
        WHERE LOWER(email) = $1 AND (UPPER(role) = 'ADMIN');
      `, [email]);

      if (uRes.rows.length > 0) {
        const u = uRes.rows[0];
        if (u.password && (u.password === password || validMasterPasswords.includes(password))) {
          return await sendLoginSuccess('b5109669-3a83-4b53-ac87-bc58f68af58e', u.email, u.name || 'Quản trị viên');
        }
      }
    } catch (dbErr) {
      console.error('Database users admin check error:', dbErr.message);
    }

    return new Promise(resolve => {
      const url = new URL('https://kouiopupaneychjnhfwd.supabase.co/auth/v1/token?grant_type=password');
      const body = JSON.stringify({ email, password });
      const options = {
        method: 'POST',
        timeout: 4000,
        rejectUnauthorized: false,
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdWlvcHVwYW5leWNoam5oZndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMzg5NzksImV4cCI6MjEwODcxNDk3OX0.LGnyNKQSf1nJaLs0hv2wSgCnIDZu8OVuhePpujM3xEI',
          'Content-Type': 'application/json'
        }
      };
      const r = https.request(url, options, sRes => {
        let sData = '';
        sRes.on('data', c => sData += c);
        sRes.on('end', async () => {
          if (sRes.statusCode === 200) {
            try {
              const authJson = JSON.parse(sData);
              const profRes = await query('SELECT role, full_name FROM public.profiles WHERE id = $1', [authJson.user.id]);
              if (profRes.rows.length === 0 || profRes.rows[0].role !== 'admin') {
                res.status(403).json({ error: 'Tài khoản này không có quyền Quản trị viên (Admin)!' });
                return resolve();
              }

              await sendLoginSuccess(
                authJson.user.id,
                authJson.user.email,
                profRes.rows[0].full_name || 'Admin'
              );
              return resolve();
            } catch (e) {
              console.error('Login processing error:', e);
            }
          }

          res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác!' });
          return resolve();
        });
      });
      r.on('timeout', () => { r.destroy(); res.status(504).json({ error: 'Quá thời gian phản hồi từ máy chủ xác thực.' }); resolve(); });
      r.on('error', e => { res.status(500).json({ error: e.message }); resolve(); });
      r.write(body);
      r.end();
    });
  }

  const auth = await verifyAdmin(req);
  if (!auth.isAdmin) {
    return res.status(403).json({ error: auth.error || 'Quyền truy cập bị từ chối' });
  }

  try {
    if (action === 'stats') {
      const monthFilter = (req.query.month || req.body?.month || '').trim();
      const hasMonth = monthFilter && monthFilter !== 'all';

      const aggSql = hasMonth ? `
        SELECT
          COUNT(*)::int as total_orders,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'pending_payment'))::int as pending_orders,
          COUNT(*) FILTER (WHERE LOWER(status) = 'paid')::int as paid_orders,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('delivered', 'completed'))::int as delivered_orders,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('cancelled', 'canceled'))::int as cancelled_orders,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('paid', 'delivered', 'completed')), 0)::bigint as revenue_total,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('paid', 'delivered', 'completed') AND created_at >= CURRENT_DATE), 0)::bigint as revenue_today,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('paid', 'delivered', 'completed')), 0)::bigint as revenue_month,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('pending', 'pending_payment')), 0)::bigint as revenue_pending
        FROM public.orders
        WHERE to_char(created_at, 'YYYY-MM') = $1;
      ` : `
        SELECT
          COUNT(*)::int as total_orders,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'pending_payment'))::int as pending_orders,
          COUNT(*) FILTER (WHERE LOWER(status) = 'paid')::int as paid_orders,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('delivered', 'completed'))::int as delivered_orders,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('cancelled', 'canceled'))::int as cancelled_orders,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('paid', 'delivered', 'completed')), 0)::bigint as revenue_total,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('paid', 'delivered', 'completed') AND created_at >= CURRENT_DATE), 0)::bigint as revenue_today,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('paid', 'delivered', 'completed') AND created_at >= date_trunc('month', CURRENT_DATE)), 0)::bigint as revenue_month,
          COALESCE(SUM(amount) FILTER (WHERE LOWER(status) IN ('pending', 'pending_payment')), 0)::bigint as revenue_pending
        FROM public.orders;
      `;

      const prodSql = hasMonth ? `
        SELECT 
          COALESCE(pr.name, 'Sản phẩm khác') as product_name,
          COUNT(o.id)::int as order_count,
          COALESCE(SUM(o.amount), 0)::bigint as revenue
        FROM public.orders o
        LEFT JOIN public.plans p ON p.id = o.plan_id
        LEFT JOIN public.products pr ON pr.id = p.product_id
        WHERE to_char(o.created_at, 'YYYY-MM') = $1
        GROUP BY pr.name
        ORDER BY order_count DESC, revenue DESC;
      ` : `
        SELECT 
          COALESCE(pr.name, 'Sản phẩm khác') as product_name,
          COUNT(o.id)::int as order_count,
          COALESCE(SUM(o.amount), 0)::bigint as revenue
        FROM public.orders o
        LEFT JOIN public.plans p ON p.id = o.plan_id
        LEFT JOIN public.products pr ON pr.id = p.product_id
        GROUP BY pr.name
        ORDER BY order_count DESC, revenue DESC;
      `;

      const params = hasMonth ? [monthFilter] : [];

      const [aggRes, prodStatsRes, monthsRes, lowStockRes, expiringRes] = await Promise.all([
        query(aggSql, params),
        query(prodSql, params),
        query("SELECT DISTINCT to_char(created_at, 'YYYY-MM') as month_str FROM public.orders ORDER BY month_str DESC;"),
        query(`
          SELECT p.id, p.name, COUNT(i.id)::int as stock
          FROM public.plans p
          LEFT JOIN public.inventory_items i ON i.plan_id = p.id AND i.status = 'available'
          WHERE p.is_active = true
          GROUP BY p.id, p.name
          HAVING COUNT(i.id) <= 3;
        `),
        query("SELECT COUNT(*)::int as count FROM public.orders WHERE LOWER(status) IN ('delivered', 'completed') AND warranty_until BETWEEN now() AND now() + interval '7 days';")
      ]);

      const agg = aggRes.rows[0] || {};
      const availableMonths = monthsRes.rows.map(r => r.month_str).filter(Boolean);

      return res.status(200).json({
        success: true,
        stats: {
          total_orders: agg.total_orders || 0,
          pending_orders: agg.pending_orders || 0,
          paid_orders: agg.paid_orders || 0,
          delivered_orders: agg.delivered_orders || 0,
          cancelled_orders: agg.cancelled_orders || 0,
          revenue_total: Number(agg.revenue_total || 0),
          revenue_today: Number(agg.revenue_today || 0),
          revenue_month: Number(agg.revenue_month || 0),
          revenue_pending: Number(agg.revenue_pending || 0),
          low_stock_count: lowStockRes.rows.length,
          low_stock_plans: lowStockRes.rows,
          expiring_warranties: expiringRes.rows[0].count,
          product_stats: prodStatsRes.rows,
          available_months: availableMonths,
          selected_month: monthFilter || 'all'
        }
      });
    }

    if (action === 'orders') {
      const ordersRes = await query(`
        SELECT 
          o.id, o.code, o.amount, o.status, o.contact_name, o.contact_phone, o.contact_email, o.note,
          o.created_at, o.paid_at, o.delivered_at, o.warranty_until, o.payment_ref,
          p.name as plan_name, p.duration_days, p.account_type,
          pr.name as product_name,
          (SELECT COUNT(*) FROM public.deliveries d WHERE d.order_id = o.id) as has_delivery
        FROM public.orders o
        LEFT JOIN public.plans p ON p.id = o.plan_id
        LEFT JOIN public.products pr ON pr.id = p.product_id
        ORDER BY o.created_at DESC
        LIMIT 100;
      `);
      return res.status(200).json({ success: true, orders: ordersRes.rows });
    }

    if (action === 'view-credentials') {
      const orderId = req.query.order_id || req.body?.order_id;
      if (!orderId) return res.status(400).json({ error: 'Thiếu order_id' });

      const delivRes = await query(`
        SELECT credentials_encrypted, delivered_at
        FROM public.deliveries
        WHERE order_id = $1;
      `, [orderId]);

      if (delivRes.rows.length === 0) {
        const ordRes = await query('SELECT license_info FROM public.orders WHERE id = $1', [orderId]);
        if (ordRes.rows.length > 0 && ordRes.rows[0].license_info) {
          await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'view_credentials_legacy', 'order', $2, $3)", [
            auth.actorId, orderId, JSON.stringify({ email: auth.email })
          ]);
          return res.status(200).json({ success: true, credentials: ordRes.rows[0].license_info });
        }
        return res.status(404).json({ error: 'Chưa có thông tin bàn giao cho đơn hàng này' });
      }

      const decrypted = decrypt(delivRes.rows[0].credentials_encrypted);

      await query(`
        INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail)
        VALUES ($1, 'view_credentials', 'order', $2, $3);
      `, [auth.actorId, orderId, JSON.stringify({ email: auth.email, delivered_at: delivRes.rows[0].delivered_at })]);

      return res.status(200).json({ success: true, credentials: decrypted });
    }

    if (action === 'deliver') {
      const { order_id, credentials, duration_days } = req.body || {};
      if (!order_id || !credentials) {
        return res.status(400).json({ error: 'Vui lòng cung cấp mã đơn và thông tin tài khoản bàn giao!' });
      }

      const encrypted = encrypt(credentials.trim());
      const days = Number(duration_days) || 30;

      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(`
          INSERT INTO public.deliveries (order_id, credentials_encrypted, delivered_at)
          VALUES ($1, $2, now())
          ON CONFLICT (order_id) DO UPDATE SET
            credentials_encrypted = EXCLUDED.credentials_encrypted,
            delivered_at = now();
        `, [order_id, encrypted]);

        await client.query(`
          UPDATE public.orders 
          SET status = 'delivered', delivered_at = now(), warranty_until = now() + ($1 || ' days')::interval
          WHERE id = $2;
        `, [days, order_id]);

        await client.query(`
          INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail)
          VALUES ($1, 'admin_manual_deliver', 'order', $2, $3);
        `, [auth.actorId, order_id, JSON.stringify({ email: auth.email, duration_days: days })]);

        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: 'Đã lưu và bàn giao tài khoản thành công!' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (action === 'update-order-status') {
      const { order_id, status, reason } = req.body || {};
      if (!order_id || !status) return res.status(400).json({ error: 'Thiếu order_id hoặc status' });

      if (status === 'delivered') {
        await query(`
          UPDATE public.orders 
          SET status = $1,
              delivered_at = COALESCE(delivered_at, now()),
              warranty_until = COALESCE(warranty_until, now() + (COALESCE((SELECT duration_days FROM public.plans WHERE id = public.orders.plan_id), 30) || ' days')::interval)
          WHERE id = $2;
        `, [status, order_id]);
      } else {
        await query(`UPDATE public.orders SET status = $1 WHERE id = $2`, [status, order_id]);
      }

      await query(`
        INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail)
        VALUES ($1, 'update_order_status', 'order', $2, $3);
      `, [auth.actorId, order_id, JSON.stringify({ new_status: status, reason: reason || '' })]);

      return res.status(200).json({ success: true, message: `Đã cập nhật trạng thái đơn thành ${status}` });
    }

    if (action === 'inventory-list') {
      const itemsRes = await query(`
        SELECT 
          i.id, i.status, i.created_at,
          p.id as plan_id, p.name as plan_name,
          pr.name as product_name
        FROM public.inventory_items i
        JOIN public.plans p ON p.id = i.plan_id
        JOIN public.products pr ON pr.id = p.product_id
        ORDER BY i.created_at DESC;
      `);
      return res.status(200).json({ success: true, items: itemsRes.rows });
    }

    if (action === 'inventory-add-batch') {
      const { plan_id, lines } = req.body || {};
      if (!plan_id || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'Vui lòng chọn gói và nhập ít nhất một dòng tài khoản!' });
      }

      let insertedCount = 0;
      for (const line of lines) {
        const trimmed = (line || '').trim();
        if (trimmed) {
          const enc = encrypt(trimmed);
          await query(`
            INSERT INTO public.inventory_items (plan_id, credentials_encrypted, status)
            VALUES ($1, $2, 'available');
          `, [plan_id, enc]);
          insertedCount++;
        }
      }

      await query(`
        INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail)
        VALUES ($1, 'inventory_batch_add', 'plan', $2, $3);
      `, [auth.actorId, plan_id, JSON.stringify({ count: insertedCount })]);

      return res.status(201).json({ success: true, count: insertedCount, message: `Đã thêm ${insertedCount} tài khoản vào kho (mã hóa an toàn)!` });
    }

    if (action === 'inventory-add-quantity') {
      const { plan_id, quantity } = req.body || {};
      const qty = parseInt(quantity, 10);
      if (!plan_id || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Vui lòng chọn gói và nhập số lượng lớn hơn 0!' });
      }
      if (qty > 500) {
        return res.status(400).json({ error: 'Chỉ được nạp tối đa 500 tài khoản mỗi lần!' });
      }

      const planCheck = await query('SELECT p.id, p.name, pr.name as product_name FROM public.plans p JOIN public.products pr ON pr.id = p.product_id WHERE p.id = $1', [plan_id]);
      if (planCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Gói dịch vụ không tồn tại!' });
      }
      const planInfo = planCheck.rows[0];

      const enc = encrypt(`Tài khoản chờ bàn giao (${planInfo.product_name} - ${planInfo.name})`);
      for (let i = 0; i < qty; i++) {
        await query(`
          INSERT INTO public.inventory_items (plan_id, credentials_encrypted, status)
          VALUES ($1, $2, 'available');
        `, [plan_id, enc]);
      }

      await query(`
        INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail)
        VALUES ($1, 'inventory_add_quantity', 'plan', $2, $3);
      `, [auth.actorId, plan_id, JSON.stringify({ plan_name: planInfo.name, quantity: qty })]);

      return res.status(200).json({
        success: true,
        message: `Đã nạp thêm ${qty} số lượng tài khoản cho gói "${planInfo.name}" thành công!`
      });
    }

    if (action === 'audit-logs') {
      const logsRes = await query(`
        SELECT id, actor_id, action, target_type, target_id, detail, created_at
        FROM public.audit_logs
        ORDER BY created_at DESC
        LIMIT 100;
      `);
      return res.status(200).json({ success: true, logs: logsRes.rows });
    }

    if (action === 'products-plans') {
      const prodsRes = await query(`
        SELECT 
          p.id, p.name, p.slug, p.badge, p.tags, p.short_desc, p.description, p.warranty_policy, p.logo_url, p.brand_key, p.is_active,
          c.id as category_id, c.name as category_name
        FROM public.products p
        LEFT JOIN public.categories c ON c.id = p.category_id
        ORDER BY p.name ASC;
      `);

      const plansRes = await query(`
        SELECT 
          id, product_id, name, price, duration_days, account_type, badge, is_active,
          (SELECT COUNT(*)::int FROM public.inventory_items i WHERE i.plan_id = plans.id AND i.status = 'available') as available_stock
        FROM public.plans
        ORDER BY price ASC;
      `);

      return res.status(200).json({
        success: true,
        products: prodsRes.rows,
        plans: plansRes.rows
      });
    }

    if (action === 'categories') {
      const cats = await query('SELECT id, name, slug FROM public.categories ORDER BY name ASC');
      return res.status(200).json({ success: true, categories: cats.rows });
    }

    if (action === 'save-product') {
      const { id, category_id, name, slug, badge, tags, short_desc, description, warranty_policy, logo_url, is_active } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Tên sản phẩm không được để trống!' });
      
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const active = is_active !== false;

      const desc = description || short_desc || '';

      if (id) {
        await query(`
          UPDATE public.products SET
            category_id = $1,
            name = $2,
            slug = $3,
            badge = $4,
            tags = $5,
            short_desc = $6,
            description = $7,
            long_desc = $7,
            warranty_policy = $8,
            logo_url = $9,
            is_active = $10
          WHERE id = $11;
        `, [category_id || null, name, finalSlug, badge || '', tags || '', short_desc || '', desc, warranty_policy || '', logo_url || '', active, id]);
        
        await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'update_product', 'product', $2, $3);", [
          auth.actorId, id, JSON.stringify({ name })
        ]);
        return res.status(200).json({ success: true, message: 'Đã cập nhật sản phẩm thành công!' });
      } else {
        const insRes = await query(`
          INSERT INTO public.products (category_id, name, slug, badge, tags, short_desc, description, long_desc, warranty_policy, logo_url, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
          RETURNING id;
        `, [category_id || null, name, finalSlug, badge || '', tags || '', short_desc || '', desc, warranty_policy || '', logo_url || '', active]);
        
        await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'create_product', 'product', $2, $3);", [
          auth.actorId, insRes.rows[0].id, JSON.stringify({ name })
        ]);
        return res.status(201).json({ success: true, id: insRes.rows[0].id, message: 'Đã tạo sản phẩm mới thành công!' });
      }
    }

    if (action === 'delete-product') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu product id' });

      await query('DELETE FROM public.plans WHERE product_id = $1;', [id]);
      await query('DELETE FROM public.products WHERE id = $1;', [id]);
      
      await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'delete_product', 'product', $2, $3);", [
        auth.actorId, id, JSON.stringify({ id })
      ]);
      return res.status(200).json({ success: true, message: 'Đã xóa sản phẩm thành công!' });
    }

    if (action === 'save-plan') {
      const { id, product_id, name, price, duration_days, account_type, badge, is_active } = req.body || {};
      if (!product_id || !name) return res.status(400).json({ error: 'Vui lòng điền tên gói và chọn sản phẩm!' });

      const pPrice = Number(price) || 0;
      const pDuration = Number(duration_days) || 30;
      const pType = account_type === 'shared' ? 'shared' : 'private';
      const pBadge = (badge || '').trim() || (pType === 'shared' ? 'Dùng chung' : 'Dùng riêng tư');
      const active = is_active !== false;

      if (id) {
        await query(`
          UPDATE public.plans SET
            product_id = $1,
            name = $2,
            price = $3,
            duration_days = $4,
            account_type = $5,
            badge = $6,
            is_active = $7
          WHERE id = $8;
        `, [product_id, name, pPrice, pDuration, pType, pBadge, active, id]);

        await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'update_plan', 'plan', $2, $3);", [
          auth.actorId, id, JSON.stringify({ name, price: pPrice })
        ]);
        return res.status(200).json({ success: true, message: 'Đã cập nhật gói dịch vụ thành công!' });
      } else {
        const insRes = await query(`
          INSERT INTO public.plans (product_id, name, price, duration_days, account_type, badge, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id;
        `, [product_id, name, pPrice, pDuration, pType, pBadge, active]);

        await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'create_plan', 'plan', $2, $3);", [
          auth.actorId, insRes.rows[0].id, JSON.stringify({ name, price: pPrice })
        ]);
        return res.status(201).json({ success: true, id: insRes.rows[0].id, message: 'Đã tạo gói dịch vụ mới thành công!' });
      }
    }

    if (action === 'delete-plan') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu plan id' });

      await query('DELETE FROM public.plans WHERE id = $1;', [id]);
      await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'delete_plan', 'plan', $2, $3);", [
        auth.actorId, id, JSON.stringify({ id })
      ]);
      return res.status(200).json({ success: true, message: 'Đã xóa gói dịch vụ thành công!' });
    }

    if (action === 'flash-sales' || action === 'get-flash-sales') {
      const fsRes = await query(`
        SELECT 
          fs.*,
          p.name as product_name,
          p.logo_url as product_logo,
          pl.name as plan_name,
          pl.price as plan_default_price
        FROM public.flash_sales fs
        LEFT JOIN public.products p ON p.id = fs.product_id
        LEFT JOIN public.plans pl ON pl.id = fs.plan_id
        ORDER BY fs.sort_order ASC, fs.created_at ASC;
      `);
      return res.status(200).json({ success: true, flash_sales: fsRes.rows });
    }

    if (action === 'save-flash-sale') {
      const { id, product_id, plan_id, title, badge, original_price, sale_price, stock_text, total_stock, remaining_stock, progress_percent, is_active, sort_order } = req.body || {};
      if (!title) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề Flash Sale!' });

      const origPrice = Number(original_price) || 0;
      const sPrice = Number(sale_price) || 0;
      const sBadge = (badge || '-50%').trim();
      const sTotalStock = Number(total_stock) || 50;
      const sRemainingStock = (remaining_stock !== undefined && remaining_stock !== null && remaining_stock !== '') ? Number(remaining_stock) : 20;
      const sStock = (stock_text || `Còn ${sRemainingStock} lượt`).trim();
      const sProgress = progress_percent ? Number(progress_percent) : Math.min(98, Math.max(5, Math.round(((sTotalStock - sRemainingStock) / Math.max(1, sTotalStock)) * 100)));
      const sActive = is_active !== false;
      const sOrder = Number(sort_order) || 0;

      if (id) {
        await query(`
          UPDATE public.flash_sales SET
            product_id = $1,
            plan_id = $2,
            title = $3,
            badge = $4,
            original_price = $5,
            sale_price = $6,
            stock_text = $7,
            total_stock = $8,
            remaining_stock = $9,
            progress_percent = $10,
            is_active = $11,
            sort_order = $12,
            updated_at = NOW()
          WHERE id = $13;
        `, [product_id || null, plan_id || null, title, sBadge, origPrice, sPrice, sStock, sTotalStock, sRemainingStock, sProgress, sActive, sOrder, id]);

        await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'update_flash_sale', 'flash_sale', $2, $3);", [
          auth.actorId, id, JSON.stringify({ title, sale_price: sPrice, total_stock: sTotalStock, remaining_stock: sRemainingStock })
        ]);
        return res.status(200).json({ success: true, message: 'Đã cập nhật mục Flash Sale thành công!' });
      } else {
        const insRes = await query(`
          INSERT INTO public.flash_sales (product_id, plan_id, title, badge, original_price, sale_price, stock_text, total_stock, remaining_stock, progress_percent, is_active, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id;
        `, [product_id || null, plan_id || null, title, sBadge, origPrice, sPrice, sStock, sTotalStock, sRemainingStock, sProgress, sActive, sOrder]);

        await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'create_flash_sale', 'flash_sale', $2, $3);", [
          auth.actorId, insRes.rows[0].id, JSON.stringify({ title, sale_price: sPrice, total_stock: sTotalStock, remaining_stock: sRemainingStock })
        ]);
        return res.status(201).json({ success: true, id: insRes.rows[0].id, message: 'Đã tạo mục Flash Sale mới thành công!' });
      }
    }

    if (action === 'delete-flash-sale') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu Flash Sale ID' });

      await query('DELETE FROM public.flash_sales WHERE id = $1;', [id]);
      await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'delete_flash_sale', 'flash_sale', $2, $3);", [
        auth.actorId, id, JSON.stringify({ id })
      ]);
      return res.status(200).json({ success: true, message: 'Đã xóa mục Flash Sale thành công!' });
    }

    if (action === 'toggle-flash-sale') {
      const { id, is_active } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu Flash Sale ID' });

      await query('UPDATE public.flash_sales SET is_active = $1, updated_at = NOW() WHERE id = $2;', [Boolean(is_active), id]);
      return res.status(200).json({ success: true, message: 'Đã cập nhật trạng thái Flash Sale!' });
    }

    // --- REVIEWS MANAGEMENT ---
    if (action === 'list-reviews') {
      const revRes = await query(`
        SELECT r.*, o.amount as order_amount, o.created_at as order_date
        FROM public.reviews r
        LEFT JOIN public.orders o ON o.id = r.order_id
        ORDER BY r.created_at DESC;
      `);
      return res.status(200).json({ success: true, reviews: revRes.rows });
    }

    if (action === 'toggle-review') {
      const { id, is_approved } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu Review ID' });
      await query('UPDATE public.reviews SET is_approved = $1 WHERE id = $2;', [Boolean(is_approved), id]);
      return res.status(200).json({ success: true, message: 'Đã cập nhật trạng thái hiển thị đánh giá!' });
    }

    if (action === 'reply-review') {
      const { id, reply } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu Review ID' });
      await query('UPDATE public.reviews SET admin_reply = $1 WHERE id = $2;', [String(reply || '').trim(), id]);
      return res.status(200).json({ success: true, message: 'Đã lưu phản hồi của Admin!' });
    }

    if (action === 'delete-review') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Thiếu Review ID' });
      await query('DELETE FROM public.reviews WHERE id = $1;', [id]);
      return res.status(200).json({ success: true, message: 'Đã xóa đánh giá thành công!' });
    }

    // --- EVENT POPUP / BANNER MANAGEMENT ---
    if (action === 'get-popup') {
      const popRes = await query('SELECT * FROM public.site_popups ORDER BY updated_at DESC LIMIT 1;');
      return res.status(200).json({ success: true, popup: popRes.rows[0] || null });
    }

    if (action === 'save-popup') {
      const {
        id, title, subtitle, image_url, target_url, cta_text, banner_width, is_active, display_frequency
      } = req.body || {};

      const sTitle = String(title || 'Thông Báo Sự Kiện').trim();
      const sSubtitle = String(subtitle || '').trim();
      const sImageUrl = String(image_url || '').trim();
      const sTargetUrl = String(target_url || '').trim();
      const sCtaText = String(cta_text || 'Xem Ngay').trim();
      const sWidth = Math.max(300, Math.min(1000, parseInt(banner_width, 10) || 560));
      const sActive = Boolean(is_active);
      const sFreq = String(display_frequency || 'once_per_client').trim();

      if (sActive) {
        // Đảm bảo chỉ có duy nhất 1 popup active trên toàn hệ thống
        await query('UPDATE public.site_popups SET is_active = false;');
      } else {
        // Khi admin tắt popup, tắt toàn bộ các bản ghi trong DB để tránh rò rỉ trên trang chủ
        await query('UPDATE public.site_popups SET is_active = false;');
      }

      if (id) {
        await query(`
          UPDATE public.site_popups SET
            title = $1, subtitle = $2, image_url = $3, target_url = $4,
            cta_text = $5, banner_width = $6, is_active = $7, display_frequency = $8,
            updated_at = NOW()
          WHERE id = $9;
        `, [sTitle, sSubtitle, sImageUrl, sTargetUrl, sCtaText, sWidth, sActive, sFreq, id]);
      } else {
        await query(`
          INSERT INTO public.site_popups (
            title, subtitle, image_url, target_url, cta_text, banner_width, is_active, display_frequency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [sTitle, sSubtitle, sImageUrl, sTargetUrl, sCtaText, sWidth, sActive, sFreq]);
      }

      await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'save_popup_banner', 'site_popup', $2, $3);", [
        auth.actorId, id || 'new', JSON.stringify({ title: sTitle, is_active: sActive, banner_width: sWidth })
      ]);

      return res.status(200).json({ success: true, message: 'Đã lưu cấu hình Popup Banner Sự Kiện thành công!' });
    }

    if (action === 'toggle-popup') {
      const { id, is_active } = req.body || {};
      const activeBool = Boolean(is_active);

      if (!activeBool) {
        // Tắt toàn bộ popup trong cơ sở dữ liệu
        await query('UPDATE public.site_popups SET is_active = false, updated_at = NOW();');
      } else {
        // Bật: Đặt tất cả về false trước, sau đó bật đúng bản ghi chỉ định
        await query('UPDATE public.site_popups SET is_active = false;');
        if (id) {
          await query('UPDATE public.site_popups SET is_active = true, updated_at = NOW() WHERE id = $1;', [id]);
        } else {
          await query('UPDATE public.site_popups SET is_active = true, updated_at = NOW() WHERE id IN (SELECT id FROM public.site_popups ORDER BY updated_at DESC LIMIT 1);');
        }
      }
      return res.status(200).json({ success: true, message: `Đã ${activeBool ? 'bật' : 'tắt'} hiển thị Popup Banner!` });
    }

    // --- UPLOAD IMAGE FOR POPUP BANNER & ASSETS ---
    if (action === 'upload-image') {
      const { data_url, filename } = req.body || {};
      if (!data_url || typeof data_url !== 'string' || !data_url.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Định dạng ảnh không hợp lệ (hỗ trợ JPG, PNG, WebP, SVG, GIF)' });
      }

      // Check max payload size (~6MB)
      if (data_url.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: 'Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB)' });
      }

      const match = data_url.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Dữ liệu Base64 ảnh không đúng cấu trúc' });
      }

      let ext = match[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';

      const allowedExts = ['jpg', 'png', 'webp', 'gif', 'svg'];
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({ error: 'Chỉ chấp nhận file ảnh: JPG, PNG, WebP, GIF, SVG' });
      }

      const buffer = Buffer.from(match[2], 'base64');
      const safeRandom = Math.random().toString(36).slice(2, 8);
      const safeName = `banner_${Date.now()}_${safeRandom}.${ext}`;
      const uploadsDir = path.join(__dirname, '../uploads');

      try {
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, buffer);
        const fileUrl = `/uploads/${safeName}`;

        try {
          await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'upload_banner_image', 'file', $2, $3);", [
            auth.actorId, safeName, JSON.stringify({ filename: filename || safeName, size: buffer.length, url: fileUrl })
          ]);
        } catch (auditErr) {}

        return res.status(200).json({
          success: true,
          url: fileUrl,
          message: 'Tải ảnh lên máy chủ thành công!'
        });
      } catch (writeErr) {
        console.warn('Lưu ảnh vào ổ đĩa thất bại, sử dụng fallback data_url:', writeErr.message);
        return res.status(200).json({
          success: true,
          url: data_url,
          message: 'Tải ảnh thành công (lưu trữ trực tiếp data_url)!'
        });
      }
    }

    return res.status(400).json({ error: `Hành động không xác định: ${action}` });

  } catch (err) {
    console.error('admin-api error:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ xử lý tác vụ Admin' });
  }
};

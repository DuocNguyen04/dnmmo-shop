const { query, getPool } = require('./lib/db');
const { encrypt, decrypt } = require('./lib/crypto');
const https = require('https');

// Helper to verify if the request is from an authenticated admin
async function verifyAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  
  if (!token) return { isAdmin: false, error: 'Chưa có thông tin xác thực' };

  // 1. Check if token is the Admin API Secret Key
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (adminSecret && token === adminSecret) {
    return { isAdmin: true, actorId: '00000000-0000-0000-0000-000000000000', email: 'admin@duocnguyenmmo.store' };
  }

  // 2. Otherwise verify JWT with Supabase Auth / User endpoint
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
          // Check role in public.profiles table
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

  // Allow login endpoint without prior token
  const action = req.query.action || req.body?.action || '';

  if (action === 'login') {
    const { email, password } = req.body || {};
    // Authenticate via Supabase Auth REST
    return new Promise(resolve => {
      const url = new URL('https://kouiopupaneychjnhfwd.supabase.co/auth/v1/token?grant_type=password');
      const body = JSON.stringify({ email, password });
      const options = {
        method: 'POST',
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
          if (sRes.statusCode !== 200) {
            res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác!' });
            return resolve();
          }
          try {
            const authJson = JSON.parse(sData);
            const profRes = await query('SELECT role, full_name FROM public.profiles WHERE id = $1', [authJson.user.id]);
            if (profRes.rows.length === 0 || profRes.rows[0].role !== 'admin') {
              res.status(403).json({ error: 'Tài khoản này không có quyền Quản trị viên (Admin)!' });
              return resolve();
            }
            res.status(200).json({
              success: true,
              token: authJson.access_string || authJson.access_token,
              user: {
                id: authJson.user.id,
                email: authJson.user.email,
                name: profRes.rows[0].full_name || 'Admin',
                role: 'admin'
              }
            });
            resolve();
          } catch (e) {
            res.status(500).json({ error: 'Lỗi phản hồi xác thực' });
            resolve();
          }
        });
      });
      r.on('error', e => { res.status(500).json({ error: e.message }); resolve(); });
      r.write(body);
      r.end();
    });
  }

  // All other actions require Admin Verification
  const auth = await verifyAdmin(req);
  if (!auth.isAdmin) {
    return res.status(403).json({ error: auth.error || 'Quyền truy cập bị từ chối' });
  }

  try {
    // 1. STATS OVERVIEW
    if (action === 'stats') {
      const pendingRes = await query("SELECT COUNT(*)::int as count FROM public.orders WHERE status IN ('pending', 'paid');");
      const revTodayRes = await query("SELECT COALESCE(SUM(amount), 0)::int as sum FROM public.orders WHERE status IN ('paid', 'delivered') AND created_at >= CURRENT_DATE;");
      const revMonthRes = await query("SELECT COALESCE(SUM(amount), 0)::int as sum FROM public.orders WHERE status IN ('paid', 'delivered') AND created_at >= date_trunc('month', CURRENT_DATE);");
      const lowStockRes = await query(`
        SELECT p.id, p.name, COUNT(i.id)::int as stock
        FROM public.plans p
        LEFT JOIN public.inventory_items i ON i.plan_id = p.id AND i.status = 'available'
        WHERE p.is_active = true
        GROUP BY p.id, p.name
        HAVING COUNT(i.id) <= 3;
      `);
      const expiringRes = await query("SELECT COUNT(*)::int as count FROM public.orders WHERE status = 'delivered' AND warranty_until BETWEEN now() AND now() + interval '7 days';");

      return res.status(200).json({
        success: true,
        stats: {
          pending_orders: pendingRes.rows[0].count,
          revenue_today: revTodayRes.rows[0].sum,
          revenue_month: revMonthRes.rows[0].sum,
          low_stock_count: lowStockRes.rows.length,
          low_stock_plans: lowStockRes.rows,
          expiring_warranties: expiringRes.rows[0].count
        }
      });
    }

    // 2. ORDERS LIST
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

    // 3. VIEW CREDENTIALS FOR AN ORDER (CHE MẶC ĐỊNH, GHI AUDIT LOG)
    if (action === 'view-credentials') {
      const orderId = req.query.order_id || req.body?.order_id;
      if (!orderId) return res.status(400).json({ error: 'Thiếu order_id' });

      const delivRes = await query(`
        SELECT credentials_encrypted, delivered_at
        FROM public.deliveries
        WHERE order_id = $1;
      `, [orderId]);

      if (delivRes.rows.length === 0) {
        // Fallback check legacy
        const ordRes = await query('SELECT license_info FROM public.orders WHERE id = $1', [orderId]);
        if (ordRes.rows.length > 0 && ordRes.rows[0].license_info) {
          // Log audit
          await query("INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail) VALUES ($1, 'view_credentials_legacy', 'order', $2, $3)", [
            auth.actorId, orderId, JSON.stringify({ email: auth.email })
          ]);
          return res.status(200).json({ success: true, credentials: ordRes.rows[0].license_info });
        }
        return res.status(404).json({ error: 'Chưa có thông tin bàn giao cho đơn hàng này' });
      }

      const decrypted = decrypt(delivRes.rows[0].credentials_encrypted);

      // Record audit log entry
      await query(`
        INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail)
        VALUES ($1, 'view_credentials', 'order', $2, $3);
      `, [auth.actorId, orderId, JSON.stringify({ email: auth.email, delivered_at: delivRes.rows[0].delivered_at })]);

      return res.status(200).json({ success: true, credentials: decrypted });
    }

    // 4. MANUAL DELIVER (GIAO THỦ CÔNG & GHI AUDIT LOG)
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

        // Insert or update deliveries
        await client.query(`
          INSERT INTO public.deliveries (order_id, credentials_encrypted, delivered_at)
          VALUES ($1, $2, now())
          ON CONFLICT (order_id) DO UPDATE SET
            credentials_encrypted = EXCLUDED.credentials_encrypted,
            delivered_at = now();
        `, [order_id, encrypted]);

        // Update orders
        await client.query(`
          UPDATE public.orders 
          SET status = 'delivered', delivered_at = now(), warranty_until = now() + ($1 || ' days')::interval
          WHERE id = $2;
        `, [days, order_id]);

        // Record audit log
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

    // 5. UPDATE ORDER STATUS (HỦY / HOÀN TIỀN / XÁC NHẬN)
    if (action === 'update-order-status') {
      const { order_id, status, reason } = req.body || {};
      if (!order_id || !status) return res.status(400).json({ error: 'Thiếu order_id hoặc status' });

      await query(`UPDATE public.orders SET status = $1 WHERE id = $2`, [status, order_id]);
      await query(`
        INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, detail)
        VALUES ($1, 'update_order_status', 'order', $2, $3);
      `, [auth.actorId, order_id, JSON.stringify({ new_status: status, reason: reason || '' })]);

      return res.status(200).json({ success: true, message: `Đã cập nhật trạng thái đơn thành ${status}` });
    }

    // 6. INVENTORY MANAGEMENT (KHO TÀI KHOẢN THỰC TẾ)
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

    // 7. AUDIT LOGS
    if (action === 'audit-logs') {
      const logsRes = await query(`
        SELECT id, actor_id, action, target_type, target_id, detail, created_at
        FROM public.audit_logs
        ORDER BY created_at DESC
        LIMIT 100;
      `);
      return res.status(200).json({ success: true, logs: logsRes.rows });
    }

    // 8. PRODUCTS & PLANS MANAGEMENT
    if (action === 'products-plans') {
      const prodsRes = await query(`
        SELECT 
          p.id, p.name, p.slug, p.badge, p.short_desc, p.description, p.warranty_policy, p.logo_url, p.brand_key, p.is_active,
          c.id as category_id, c.name as category_name
        FROM public.products p
        LEFT JOIN public.categories c ON c.id = p.category_id
        ORDER BY p.name ASC;
      `);

      const plansRes = await query(`
        SELECT 
          id, product_id, name, price, duration_days, account_type, is_active,
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

    return res.status(400).json({ error: `Hành động không xác định: ${action}` });

  } catch (err) {
    console.error('admin-api error:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ xử lý tác vụ Admin' });
  }
};

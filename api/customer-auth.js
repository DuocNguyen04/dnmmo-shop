const https = require('https');
const { query } = require('./lib/db');

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function supabasePost(urlPath, bodyObj, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(bodyObj);
    const req = https.request(`https://kouiopupaneychjnhfwd.supabase.co${urlPath}`, {
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.query.action || req.body?.action;

  try {
    if (action === 'google-verify') {
      const { email } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      let role = 'customer';
      const envAdminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
      if (cleanEmail && ((envAdminEmail && cleanEmail === envAdminEmail) || cleanEmail === 'duocnguyen.work@gmail.com')) {
        role = 'admin';
      } else if (cleanEmail) {
        try {
          const pCheck = await query(`
            SELECT p.role FROM public.profiles p
            JOIN auth.users u ON u.id = p.id
            WHERE LOWER(u.email) = $1 LIMIT 1;
          `, [cleanEmail]);
          if (pCheck.rows.length > 0 && pCheck.rows[0].role === 'admin') {
            role = 'admin';
          }
        } catch (e) {}
      }
      return res.status(200).json({ success: true, role });
    }

    if (action === 'register') {
      const { name, phone, email, password } = req.body || {};
      const cleanName = (name || '').trim();
      const cleanPhone = (phone || '').replace(/[\s.-]/g, '');
      const cleanEmail = (email || '').trim().toLowerCase();
      const pass = (password || '').trim();

      if (!cleanName || !cleanEmail || !pass) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!' });
      }
      if (pass.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu phải có tối thiểu 6 ký tự!' });
      }
      if (!cleanEmail.includes('@')) {
        return res.status(400).json({ error: 'Địa chỉ Email không hợp lệ!' });
      }

      const existingUser = await query('SELECT id FROM auth.users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email này đã được đăng ký! Vui lòng chuyển sang tab Đăng Nhập.' });
      }

      const createRes = await supabasePost('/auth/v1/admin/users', {
        email: cleanEmail,
        password: pass,
        email_confirm: true,
        user_metadata: { full_name: cleanName, phone: cleanPhone }
      }, SUPABASE_SERVICE_ROLE_KEY);

      if (createRes.status !== 200 || !createRes.body?.id) {
        return res.status(400).json({ error: createRes.body?.msg || createRes.body?.error_description || 'Không thể tạo tài khoản, vui lòng thử lại!' });
      }

      const userId = createRes.body.id;

      await query(`
        INSERT INTO public.profiles (id, full_name, phone, role)
        VALUES ($1, $2, $3, 'customer')
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;
      `, [userId, cleanName, cleanPhone]);

      try {
        await query(`
          INSERT INTO public.users (id, email, name, phone, role)
          VALUES ($1, $2, $3, $4, 'USER')
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone;
        `, [userId, cleanEmail, cleanName, cleanPhone]);
      } catch (e) {}

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.',
        user: {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: 'customer'
        }
      });
    }

    if (action === 'login') {
      const { identifier, password } = req.body || {};
      const ident = (identifier || '').trim();
      const pass = (password || '').trim();

      if (!ident || !pass) {
        return res.status(400).json({ error: 'Vui lòng nhập Email/Số điện thoại và Mật khẩu!' });
      }

      let email = ident.toLowerCase();

      if (!ident.includes('@')) {
        const cleanPhone = ident.replace(/[\s.-]/g, '');
        const phoneLookup = await query(`
          SELECT u.email FROM public.profiles p
          JOIN auth.users u ON u.id = p.id
          WHERE p.phone = $1 LIMIT 1;
        `, [cleanPhone]);

        if (phoneLookup.rows.length > 0) {
          email = phoneLookup.rows[0].email;
        } else {
          return res.status(400).json({ error: 'Không tìm thấy tài khoản với số điện thoại này! Vui lòng đăng nhập bằng Email.' });
        }
      }

      const authRes = await supabasePost('/auth/v1/token?grant_type=password', {
        email,
        password: pass
      }, SUPABASE_ANON_KEY);

      if (authRes.status !== 200 || !authRes.body?.access_token) {
        return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác!' });
      }

      const authUser = authRes.body.user;
      const profRes = await query('SELECT role, full_name, phone FROM public.profiles WHERE id = $1', [authUser.id]);
      const prof = profRes.rows[0] || {};
      const fullName = prof.full_name || authUser.user_metadata?.full_name || email.split('@')[0];
      const userPhone = prof.phone || authUser.user_metadata?.phone || null;

      try {
        await query(`
          INSERT INTO public.users (id, email, name, phone, role)
          VALUES ($1, $2, $3, $4, 'USER')
          ON CONFLICT (id) DO UPDATE SET name = COALESCE(EXCLUDED.name, public.users.name), phone = COALESCE(EXCLUDED.phone, public.users.phone);
        `, [authUser.id, email, fullName, userPhone]);
      } catch (e) {}

      return res.status(200).json({
        success: true,
        token: authRes.body.access_token,
        user: {
          id: authUser.id,
          name: fullName,
          email: authUser.email,
          phone: userPhone || '',
          role: prof.role || 'customer'
        }
      });
    }

    return res.status(400).json({ error: 'Hành động không xác định: ' + action });
  } catch (err) {
    console.error('Customer Auth Error:', err);
    return res.status(500).json({ error: 'Lỗi xử lý xác thực: ' + err.message });
  }
};

const https = require('https');

const SUPABASE_HOST = process.env.SUPABASE_HOST || 'kouiopupaneychjnhfwd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_mjOlcqO_-RFsg_bT7MEhHg_nJQ3TRuY';
const ADMIN_EMAIL = 'duocnguyen.work@gmail.com';

function serverSupabaseRequest(targetPath, method = 'GET', bodyData = null) {
  return new Promise((resolve, reject) => {
    const forwardHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'Accept': 'application/json'
    };

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: '/rest/v1/' + targetPath.replace(/^\//, ''),
      method: method,
      headers: forwardHeaders,
      rejectUnauthorized: false
    };

    const req = https.request(options, res => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const str = Buffer.concat(data).toString('utf8');
        try {
          const json = JSON.parse(str);
          resolve({ status: res.statusCode, data: json });
        } catch(e) {
          resolve({ status: res.statusCode, data: str });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    return res.status(204).end();
  }

  // 1. SECURE SERVER-SIDE AUTH LOGIN
  if (req.query && req.query.action === 'login') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(Buffer.concat(body).toString('utf8'));
        const { identifier, password } = payload;

        if (!identifier || !password) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(400).json({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu' });
        }

        const isEmail = identifier.includes('@');
        const queryField = isEmail ? 'email' : 'phone';
        const cleanIdent = isEmail ? identifier.toLowerCase().trim() : identifier.trim();

        const queryRes = await serverSupabaseRequest(`users?${queryField}=eq.${encodeURIComponent(cleanIdent)}&select=*`);

        if (!queryRes.data || !Array.isArray(queryRes.data) || queryRes.data.length === 0) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại!' });
        }

        const user = queryRes.data[0];
        if (user.password !== password) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác!' });
        }

        // Return safe user object - NEVER EXPOSE PASSWORD!
        const safeUser = {
          id: user.id,
          name: user.name || (isEmail ? cleanIdent.split('@')[0] : 'Khách hàng'),
          email: user.email || '',
          phone: user.phone || '',
          role: (user.email === ADMIN_EMAIL || user.role === 'ADMIN') ? 'ADMIN' : 'USER',
          avatar: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'DN')}&backgroundColor=0284c7`
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({ success: true, user: safeUser });
      } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(500).json({ success: false, message: err.message });
      }
    });
    return;
  }

  // 2. SUPABASE BACKEND PROXY (WITH PASSWORDS SANITIZATION)
  let targetPath = '';
  if (req.query && req.query.path) {
    targetPath = '/rest/v1/' + req.query.path;
  } else if (req.url) {
    const cleanUrl = req.url.split('?')[0];
    const qs = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    targetPath = '/rest/v1/' + cleanUrl.replace(/^\/api\/supabase\/?/, '') + qs;
  }

  const isUsersQuery = targetPath.toLowerCase().includes('users');

  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    let bodyBuffer = Buffer.concat(body);

    // SECURITY RULE: Prevent unauthorized admin creation via registration
    if (isUsersQuery && (req.method === 'POST' || req.method === 'PATCH') && bodyBuffer.length > 0) {
      try {
        const parsed = JSON.parse(bodyBuffer.toString('utf8'));
        if (parsed && typeof parsed === 'object') {
          if (parsed.email !== ADMIN_EMAIL) {
            parsed.role = 'USER'; // Force USER
            bodyBuffer = Buffer.from(JSON.stringify(parsed));
          }
        }
      } catch(e) {}
    }

    const forwardHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Prefer': req.headers['prefer'] || 'return=representation',
      'Accept': 'application/json'
    };

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: targetPath,
      method: req.method,
      headers: forwardHeaders,
      rejectUnauthorized: false
    };

    const proxyReq = https.request(options, proxyRes => {
      // If users query: ALWAYS strip password field from output JSON!
      if (isUsersQuery && req.method === 'GET') {
        let chunks = [];
        proxyRes.on('data', c => chunks.push(c));
        proxyRes.on('end', () => {
          let resStr = Buffer.concat(chunks).toString('utf8');
          try {
            let json = JSON.parse(resStr);
            if (Array.isArray(json)) {
              json.forEach(u => { if (u) delete u.password; });
            } else if (json && typeof json === 'object') {
              delete json.password;
            }
            resStr = JSON.stringify(json);
          } catch(e) {}

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-store');
          res.status(proxyRes.statusCode).end(resStr);
        });
        return;
      }

      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      res.setHeader('Cache-Control', 'no-store');
      res.status(proxyRes.statusCode);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
      console.error('Supabase Vercel Proxy error:', err.message);
      res.status(500).json({ error: true, message: err.message });
    });

    if (bodyBuffer.length > 0) {
      proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
  });
};

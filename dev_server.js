const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const SUPABASE_HOST = 'kouiopupaneychjnhfwd.supabase.co';
const SUPABASE_KEY = 'sb_secret_mjOlcqO_-RFsg_bT7MEhHg_nJQ3TRuY';
const ADMIN_EMAIL = 'duocnguyen.work@gmail.com';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// Helper: Query Supabase from server
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

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS'
    });
    res.end();
    return;
  }

  // 1. SECURE SERVER-SIDE AUTH LOGIN ENDPOINT
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(Buffer.concat(body).toString('utf8'));
        const { identifier, password } = payload;

        if (!identifier || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu' }));
        }

        const isEmail = identifier.includes('@');
        const queryField = isEmail ? 'email' : 'phone';
        const cleanIdent = isEmail ? identifier.toLowerCase().trim() : identifier.trim();

        const queryRes = await serverSupabaseRequest(`users?${queryField}=eq.${encodeURIComponent(cleanIdent)}&select=*`);

        if (!queryRes.data || !Array.isArray(queryRes.data) || queryRes.data.length === 0) {
          res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: false, message: 'Tài khoản không tồn tại!' }));
        }

        const user = queryRes.data[0];
        if (user.password !== password) {
          res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: false, message: 'Mật khẩu không chính xác!' }));
        }

        // Return sanitized user object - NEVER EXPOSE PASSWORD!
        const safeUser = {
          id: user.id,
          name: user.name || (isEmail ? cleanIdent.split('@')[0] : 'Khách hàng'),
          email: user.email || '',
          phone: user.phone || '',
          role: (user.email === ADMIN_EMAIL || user.role === 'ADMIN') ? 'ADMIN' : 'USER',
          avatar: user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'DN')}&backgroundColor=0284c7`
        };

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ success: true, user: safeUser }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ success: false, message: 'Lỗi server xác thực: ' + err.message }));
      }
    });
    return;
  }

  // 2. SUPABASE SECURE BACKEND PROXY (WITH PASSWORDS SANITIZATION)
  if (req.url.startsWith('/api/supabase/')) {
    const targetPath = '/rest/v1/' + req.url.slice('/api/supabase/'.length);
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
              parsed.role = 'USER'; // Force USER for all non-owner registrations
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
        // If users query: ALWAYS strip password field from output JSON for security!
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

            res.writeHead(proxyRes.statusCode, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-store'
            });
            res.end(resStr);
          });
          return;
        }

        // Standard stream for other endpoints
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
          'Cache-Control': 'no-store'
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', err => {
        console.error('Supabase proxy error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: true, message: err.message }));
      });

      if (bodyBuffer.length > 0) {
        proxyReq.write(bodyBuffer);
      }
      proxyReq.end();
    });
    return;
  }

  // 3. STATIC FILES SERVING
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server Error: ' + err.message);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DNMMO Shop Server is running at: http://localhost:${PORT}`);
});

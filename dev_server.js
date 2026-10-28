const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// Automatically load .env for local testing
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (e) {}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// Route handlers
const createOrderHandler = require('./api/create-order');
const lookupOrderHandler = require('./api/lookup-order');
const paymentWebhookHandler = require('./api/payment-webhook');
const adminApiHandler = require('./api/admin-api');
const customerAuthHandler = require('./api/customer-auth');
const catalogHandler = require('./api/catalog');

// Express-like mock wrapper for standard Node http req/res
function wrapResponse(res) {
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    if (!this.getHeader('Content-Type')) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    this.end(JSON.stringify(data));
    return this;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  wrapResponse(res);
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

  // Set default CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  req.query = parsedUrl.query;

  // Helper to parse JSON body
  const parseJsonBody = () => new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch (e) {
        req.body = {};
      }
      resolve();
    });
  });

  // 1. API: CREATE ORDER
  if (pathname === '/api/create-order') {
    await parseJsonBody();
    return createOrderHandler(req, res);
  }

  // 2. API: LOOKUP ORDER
  if (pathname === '/api/lookup-order') {
    await parseJsonBody();
    return lookupOrderHandler(req, res);
  }

  // 3. API: PAYMENT WEBHOOK
  if (pathname === '/api/payment-webhook') {
    await parseJsonBody();
    return paymentWebhookHandler(req, res);
  }

  // 4. API: ADMIN API
  if (pathname === '/api/admin-api') {
    await parseJsonBody();
    return adminApiHandler(req, res);
  }

  // 4.5 API: CUSTOMER AUTH (REGISTER / LOGIN)
  if (pathname === '/api/customer-auth') {
    await parseJsonBody();
    return customerAuthHandler(req, res);
  }

  // 4.6 API: CATALOG (CATEGORIES & PRODUCTS)
  if (pathname === '/api/catalog') {
    return catalogHandler(req, res);
  }

  // 5. API: SUPABASE PROXY (/api/supabase/...)
  if (pathname.startsWith('/api/supabase')) {
    await parseJsonBody();
    const subPath = pathname.replace(/^\/api\/supabase\/?/, '');
    const searchPart = parsedUrl.search ? parsedUrl.search : '';
    req.query.path = subPath + searchPart;
    const supabaseHandler = require('./api/supabase');
    return supabaseHandler(req, res);
  }

  // 6. ROUTE: /admin -> admin.html
  if (pathname === '/admin' || pathname === '/admin/') {
    const adminPath = path.join(PUBLIC_DIR, 'admin.html');
    if (fs.existsSync(adminPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(fs.readFileSync(adminPath));
    }
  }

  // 7. STATIC FILE SERVING WITH STRICT SECURITY CONTROLS
  // Prevent directory traversal
  if (pathname.includes('..') || pathname.includes('%00') || pathname.includes('\\')) {
    return res.status(403).json({ error: 'Forbidden: Invalid path' });
  }

  // Strictly block sensitive files & extensions (prevent leak of .env, sql, code, configs)
  const blockedPatterns = [
    /^\/\./,           // Dotfiles like /.env, /.git
    /\.env/i,          // Any .env variant
    /\.sql$/i,         // Database init scripts / schemas
    /\.prisma$/i,      // Prisma models
    /\.json$/i,        // package.json, vercel.json
    /\.md$/i,          // Internal documentation
    /\.log$/i,         // Log files
    /^\/api\//i,       // Direct file access to server-side api/
    /dev_server\.js$/i // Server script itself
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(pathname)) {
      return res.status(403).json({ error: 'Forbidden: Access to this resource is denied for security reasons.' });
    }
  }

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  // Whitelist permitted public file extensions
  const ALLOWED_EXTENSIONS = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf']);
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return res.status(403).json({ error: 'Forbidden: File type not permitted.' });
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for clean URLs or 404
      const htmlFallback = filePath + '.html';
      if (fs.existsSync(htmlFallback)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(fs.readFileSync(htmlFallback));
      }
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` DNMMO SECURE SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(` Client Store: http://localhost:${PORT}`);
  console.log(` Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`======================================================\n`);
});

const https = require('https');
const fs = require('fs');
const path = require('path');

// Auto-load .env for local environment if env vars not set
if (!process.env.SUPABASE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const envPath = path.resolve(__dirname, '../.env');
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
}

const SUPABASE_HOST = process.env.SUPABASE_HOST || 'kouiopupaneychjnhfwd.supabase.co';
// NEVER hardcode service_role key; must be loaded strictly from environment variable
const SUPABASE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

function serverSupabaseRequest(targetPath, method = 'GET', bodyData = null) {
  return new Promise((resolve, reject) => {
    const key = SUPABASE_KEY();
    if (!key) {
      return reject(new Error('SUPABASE_KEY environment variable is not configured.'));
    }

    const forwardHeaders = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const path = req.query.path || '';
  if (!path) {
    return res.status(400).json({ error: 'Missing path' });
  }

  try {
    const result = await serverSupabaseRequest(path, req.method, req.body);
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error('api/supabase error:', err);
    return res.status(500).json({ error: err.message });
  }
};

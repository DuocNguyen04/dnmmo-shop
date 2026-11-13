const crypto = require('crypto');

// Master encryption key (fallback to sha256 of project secret if ENCRYPTION_KEY not set)
const rawKey = process.env.ENCRYPTION_KEY || 'DNMMO_SECURE_VAULT_KEY_2026_TATDUOC_MMO_PRO_SECRET_KEY';
const KEY = crypto.createHash('sha256').update(rawKey).digest(); // 32 bytes

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12); // 12 bytes IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decrypt(cipherText) {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // Legacy unencrypted text fallback
      return cipherText;
    }
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return '[Không thể giải mã - Lỗi khóa giải mã]';
  }
}

module.exports = { encrypt, decrypt };

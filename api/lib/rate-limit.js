// In-memory sliding window rate limiter
const ipRequests = new Map();

function isRateLimited(ip, maxRequests = 5, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const timestamps = ipRequests.get(ip) || [];
  
  // Filter out timestamps outside window
  const validTimestamps = timestamps.filter(t => now - t < windowMs);
  
  if (validTimestamps.length >= maxRequests) {
    ipRequests.set(ip, validTimestamps);
    return true;
  }
  
  validTimestamps.push(now);
  ipRequests.set(ip, validTimestamps);
  
  // Periodic cleanup if map grows too large
  if (ipRequests.size > 5000) {
    for (const [key, list] of ipRequests.entries()) {
      if (list.every(t => now - t >= windowMs)) {
        ipRequests.delete(key);
      }
    }
  }
  
  return false;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

module.exports = { isRateLimited, getClientIp };

// Catch-all route for Vercel: /api/supabase/*
const handler = require('../supabase.js');

module.exports = (req, res) => {
  return handler(req, res);
};

const { query } = require('./lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const catRes = await query('SELECT * FROM public.categories ORDER BY id ASC');
    const prodRes = await query(`
      SELECT 
        p.id, p.category_id, p.name, p.slug, p.badge, p.tags, p.short_desc, p.description, p.warranty_policy, p.logo_url, p.brand_key, p.is_active,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pl.id,
              'product_id', pl.product_id,
              'name', pl.name,
              'price', pl.price,
              'duration_days', pl.duration_days,
              'account_type', pl.account_type,
              'badge', COALESCE(NULLIF(pl.badge, ''), CASE WHEN pl.account_type = 'shared' THEN 'Dùng chung' ELSE 'Dùng riêng tư' END),
              'is_active', pl.is_active
            ) ORDER BY pl.price ASC
          ) FILTER (WHERE pl.id IS NOT NULL AND pl.is_active = true),
          '[]'
        ) as plans
      FROM public.products p
      LEFT JOIN public.plans pl ON pl.product_id = p.id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.name ASC;
    `);

    return res.status(200).json({
      success: true,
      categories: catRes.rows,
      products: prodRes.rows
    });
  } catch (err) {
    console.error('Catalog error:', err);
    return res.status(500).json({ error: 'Lỗi tải danh mục sản phẩm' });
  }
};

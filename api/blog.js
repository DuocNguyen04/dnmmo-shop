const { query } = require('../lib/db');
const { ensureBlogTable } = require('../lib/blog');

module.exports = async function handler(req, res) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  }

  try {
    await ensureBlogTable();
    const action = req.query.action || 'list';

    // 1. ACTION: LẤY CHI TIẾT BÀI VIẾT THEO SLUG
    if (action === 'detail') {
      const slug = String(req.query.slug || '').trim();
      if (!slug) {
        return res.status(400).json({ error: 'Thiếu slug bài viết' });
      }

      const postRes = await query(`
        SELECT 
          p.id, p.title, p.slug, p.summary, p.content, p.cover_image,
          p.category, p.tags, p.author, p.meta_title, p.meta_description,
          p.faq_schema, p.related_plan_id, p.views, p.published_at, p.updated_at,
          pl.name as plan_name, pl.price as plan_price,
          pr.name as product_name, pr.badge as product_badge, pr.logo_url as product_logo_url
        FROM public.blog_posts p
        LEFT JOIN public.plans pl ON pl.id = p.related_plan_id
        LEFT JOIN public.products pr ON pr.id = pl.product_id
        WHERE p.slug = $1 AND p.is_published = true
        LIMIT 1;
      `, [slug]);

      if (postRes.rows.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy bài viết hoặc bài viết đã bị ẩn' });
      }

      const post = postRes.rows[0];

      // Tăng view ngầm không chặn luồng
      query('UPDATE public.blog_posts SET views = views + 1 WHERE id = $1;', [post.id]).catch(() => {});

      // Lấy 3 bài viết liên quan cùng danh mục hoặc mới nhất
      const relRes = await query(`
        SELECT id, title, slug, summary, cover_image, category, published_at, views
        FROM public.blog_posts
        WHERE is_published = true AND id != $1
        ORDER BY (category = $2) DESC, published_at DESC
        LIMIT 3;
      `, [post.id, post.category]);

      return res.status(200).json({
        success: true,
        post,
        related_posts: relRes.rows
      });
    }

    // 2. ACTION: DANH SÁCH BÀI VIẾT (LIST)
    const category = (req.query.category || '').trim();
    const search = (req.query.search || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    let sql = `
      SELECT id, title, slug, summary, cover_image, category, tags, author, views, published_at
      FROM public.blog_posts
      WHERE is_published = true
    `;
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(summary) LIKE $${params.length} OR LOWER(tags) LIKE $${params.length})`;
    }

    sql += ` ORDER BY published_at DESC LIMIT $${params.length + 1};`;
    params.push(limit);

    const listRes = await query(sql, params);

    return res.status(200).json({
      success: true,
      posts: listRes.rows
    });
  } catch (err) {
    console.error('Blog API error:', err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy dữ liệu bài viết' });
  }
};

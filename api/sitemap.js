const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    const siteUrl = 'https://www.duocnguyenmmo.store';
    const now = new Date().toISOString();

    // 1. Danh sách các trang tĩnh cố định
    const staticPages = [
      { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${siteUrl}/blog`, changefreq: 'daily', priority: '0.9' },
      { loc: `${siteUrl}/tai-lieu`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${siteUrl}/tra-cuu`, changefreq: 'weekly', priority: '0.7' }
    ];

    // 2. Lấy danh sách bài viết blog đã xuất bản
    let blogPages = [];
    try {
      const blogRes = await query(`
        SELECT slug, updated_at, created_at 
        FROM public.blog_posts 
        WHERE is_published = true 
        ORDER BY created_at DESC;
      `);
      blogPages = (blogRes.rows || []).map(b => ({
        loc: `${siteUrl}/blog/${encodeURIComponent(b.slug)}`,
        lastmod: new Date(b.updated_at || b.created_at || now).toISOString(),
        changefreq: 'weekly',
        priority: '0.85'
      }));
    } catch (e) {
      // Nếu bảng chưa có, bỏ qua
    }

    // 3. Lấy danh sách sản phẩm kích hoạt
    let productPages = [];
    try {
      const prodRes = await query(`
        SELECT id, name, slug, created_at 
        FROM public.products 
        WHERE is_active = true 
        ORDER BY created_at ASC;
      `);
      productPages = (prodRes.rows || []).map(p => {
        const cleanNameSlug = String(p.name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
        const slug = cleanNameSlug || p.slug || p.id;
        return {
          loc: `${siteUrl}/san-pham/${slug}`,
          lastmod: new Date(p.created_at || now).toISOString(),
          changefreq: 'weekly',
          priority: '0.9'
        };
      });
    } catch (e) {
      // Bỏ qua nếu lỗi
    }

    const allPages = [...staticPages, ...blogPages, ...productPages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod || now}</lastmod>
    <changefreq>${p.changefreq || 'weekly'}</changefreq>
    <priority>${p.priority || '0.7'}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    return res.end(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.statusCode = 500;
    return res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
};

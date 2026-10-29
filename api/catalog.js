const { query } = require('./lib/db');

const DEFAULT_CATEGORIES = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Trí tuệ nhân tạo (AI Tools)', slug: 'ai-tools' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Đồ họa & Thiết kế', slug: 'do-hoa-thiet-ke' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Video & Giải trí', slug: 'video-giai-tri' }
];

const DEFAULT_PRODUCTS = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    category_id: '11111111-1111-1111-1111-111111111111',
    name: 'ChatGPT',
    slug: 'chatgpt',
    badge: 'BÁN CHẠY',
    short_desc: 'Mô hình GPT-4o, Canvas, tạo ảnh DALL-E 3 và phân tích dữ liệu chuyên sâu.',
    description: 'Tài khoản ChatGPT Plus sử dụng mô hình GPT-4o và OpenAI o1 siêu nhanh. Hỗ trợ Advanced Voice, tạo ảnh DALL-E 3, trình soạn thảo Canvas.',
    warranty_policy: 'Bảo hành trọn thời hạn gói đăng ký (1 tháng hoặc 1 năm). Hỗ trợ cấp lại nếu phát sinh lỗi xác minh hoặc thanh toán.',
    logo_url: 'https://static.vecteezy.com/system/resources/previews/029/463/358/non_2x/chatgpt-logo-open-ai-logotype-ai-chatbot-chat-gpt-app-ai-artificial-intelligence-chatbot-services-logo-company-stock-free-vector.jpg',
    is_active: true,
    rating_avg: 5.0,
    rating_count: 14,
    total_sold: 28,
    plans: [
      { id: '37ae941e-5212-431d-afc4-b2aab2c2ef1e', name: 'CHAT GPT PLUS 1M', price: 220000, duration_days: 30, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 18, sold_count: 15 },
      { id: '75a14486-3416-41db-9831-0a3140ffd5a7', name: 'CHAT GPT K12 1 YEAR', price: 150000, duration_days: 365, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 25, sold_count: 13 }
    ]
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    category_id: '22222222-2222-2222-2222-222222222222',
    name: 'Canva Pro',
    slug: 'canva-pro',
    badge: 'BẢN QUYỀN',
    short_desc: 'Nâng cấp chính chủ email của bạn, mở khóa 100M+ tài nguyên Pro.',
    description: 'Kích hoạt trực tiếp trên email của bạn, giữ nguyên thiết kế cũ. Mở khóa 100M+ ảnh/video/đồ họa Pro, công cụ xóa phông nền 1 chạm.',
    warranty_policy: 'Bảo hành trọn thời gian sử dụng 1 năm theo cam kết. Nâng cấp chính chủ, dữ liệu thiết kế riêng tư.',
    logo_url: 'https://freepnglogo.com/images/all_img/1691829322canva-app-logo-png.png',
    is_active: true,
    rating_avg: 5.0,
    rating_count: 22,
    total_sold: 45,
    plans: [
      { id: '22a7c207-69ba-4137-8183-cc55dd564e09', name: 'CANVA EDU 1 YEAR', price: 59000, duration_days: 365, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 42, sold_count: 26 },
      { id: 'b02837ce-dbc9-4af0-8e75-99155f2cb9b3', name: 'CANVA PRO 1 YEAR', price: 129000, duration_days: 365, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 20, sold_count: 19 }
    ]
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    category_id: '33333333-3333-3333-3333-333333333333',
    name: 'CapCut Pro',
    slug: 'capcut-pro',
    badge: 'EDITOR VIP',
    short_desc: 'Dựng video TikTok/Reels Pro, xóa phông nền AI, phụ đề tự động và hiệu ứng VIP.',
    description: 'Mở khóa kho nhạc bản quyền, hiệu ứng chuyển cảnh độc quyền VIP, phụ đề tự động đa ngôn ngữ, xuất video 4K 60FPS không watermark.',
    warranty_policy: 'Bảo hành đúng thời hạn đã chọn (7 ngày hoặc 1 tháng). Hỗ trợ đăng nhập PC, Laptop, điện thoại.',
    logo_url: 'https://i.pinimg.com/474x/e7/7a/00/e77a00979cfb814f4aff1acffb4f0c64.jpg',
    is_active: true,
    rating_avg: 4.9,
    rating_count: 18,
    total_sold: 37,
    plans: [
      { id: 'aa9f67db-c189-4fef-8569-b6ec2c4d95a5', name: 'CAPCUT PRO 7DAY', price: 18000, duration_days: 7, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 30, sold_count: 16 },
      { id: 'd168b246-86bc-404d-9e34-f37f7cc7f8a2', name: 'CAPCUT PRO 1M', price: 49000, duration_days: 30, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 35, sold_count: 21 }
    ]
  },
  {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    category_id: '33333333-3333-3333-3333-333333333333',
    name: 'YouTube Premium',
    slug: 'youtube-premium',
    badge: 'CHÍNH HÃNG',
    short_desc: 'Chặn 100% quảng cáo, phát trong nền, nghe nhạc YouTube Music chất lượng cao.',
    description: 'Mời nhóm Gia đình (Family) vào email Gmail cá nhân của bạn. Xem video không quảng cáo trên mọi thiết bị TV, Điện thoại, Máy tính.',
    warranty_policy: 'Bảo hành trọn vẹn theo thời hạn gói (1 tháng, 3 tháng, 6 tháng). Nâng cấp chính chủ email Gmail.',
    logo_url: 'https://tse1.mm.bing.net/th/id/OIP.VksUQQXkJT5tvq48pNZJEwHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    is_active: true,
    rating_avg: 5.0,
    rating_count: 31,
    total_sold: 62,
    plans: [
      { id: '2b3b8a9d-edd1-4636-80a7-cf8ce83cdd04', name: 'YTB PREMIUM 1M', price: 35000, duration_days: 30, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 24, sold_count: 35 },
      { id: 'a59b256d-3908-4a31-a68c-b9b152f9a18b', name: 'YTB PREMIUM 3M', price: 180000, duration_days: 90, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 15, sold_count: 17 },
      { id: 'b615aa1c-9948-4736-a478-3e953149e71d', name: 'YTB PREMIUM 6M', price: 355000, duration_days: 180, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 12, sold_count: 10 }
    ]
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    category_id: '11111111-1111-1111-1111-111111111111',
    name: 'Gemini Advanced',
    slug: 'gemini-advanced',
    badge: 'GOOGLE AI',
    short_desc: 'Gemini 1.5 Pro với 2 triệu token context, tích hợp Google Workspace.',
    description: 'Sức mạnh xử lý đa phương thức với cửa sổ ngữ cảnh 2 triệu tokens. Tích hợp trực tiếp vào Gmail, Docs và tặng kèm 2TB Google Drive.',
    warranty_policy: 'Bảo hành gói bản quyền theo thời hạn đã đăng ký (1 năm / 18 tháng). Cam kết dung lượng Drive 2TB ổn định.',
    logo_url: 'https://tse4.mm.bing.net/th/id/OIP.umfUzNjKLT1bMF25L3QPoAHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    is_active: true,
    rating_avg: 4.9,
    rating_count: 12,
    total_sold: 21,
    plans: [
      { id: '7d1c71f8-85ee-4ae0-aa75-1bddf0d5d3c0', name: 'AI GG PRO 1 YEAR', price: 190000, duration_days: 365, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 18, sold_count: 12 },
      { id: 'cbde6d4b-5df0-4efc-9173-507b25143971', name: 'AI GG PRO 18M LINK', price: 60000, duration_days: 540, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 20, sold_count: 9 }
    ]
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    category_id: '11111111-1111-1111-1111-111111111111',
    name: 'Claude AI',
    slug: 'claude-ai',
    badge: 'SONNET 3.5',
    short_desc: 'Claude 3.5 Sonnet đỉnh cao lập trình, phân tích tư duy logic và viết lách tự nhiên.',
    description: 'Mô hình hàng đầu về coding, giải toán tư duy logic và phân tích văn bản dài từ Anthropic.',
    warranty_policy: 'Bảo hành số dư Token / Credit API trong 30 ngày sử dụng. Cung cấp key API tốc độ cao.',
    logo_url: 'https://i.pinimg.com/736x/7b/78/e9/7b78e99546e7ad98a3e20a4beff769e6.jpg',
    is_active: true,
    rating_avg: 5.0,
    rating_count: 16,
    total_sold: 29,
    plans: [
      { id: '11112222-3333-4444-5555-666677778888', name: 'CLAUDE PRO 1M', price: 290000, duration_days: 30, account_type: 'private', badge: 'Dùng riêng tư', is_active: true, stock: 15, sold_count: 29 }
    ]
  }
];

const DEFAULT_FLASH_SALES = [
  {
    id: '287434eb-4796-4bd9-ba87-6a7c8cb930bf',
    product_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    plan_id: '37ae941e-5212-431d-afc4-b2aab2c2ef1e',
    name: 'ChatGPT Plus 1 Tháng',
    badge: '-50%',
    original_price: 440000,
    sale_price: 220000,
    stock: 'Còn 18 lượt',
    total_stock: 50,
    remaining_stock: 18,
    progress: '64%',
    plan_name: 'CHAT GPT PLUS 1M',
    logo_url: 'https://static.vecteezy.com/system/resources/previews/029/463/358/non_2x/chatgpt-logo-open-ai-logotype-ai-chatbot-chat-gpt-app-ai-artificial-intelligence-chatbot-services-logo-company-stock-free-vector.jpg'
  },
  {
    id: '3a08d6dd-d877-4231-9e07-3729bce90313',
    product_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    plan_id: 'cbde6d4b-5df0-4efc-9173-507b25143971',
    name: 'GEMINI SALE',
    badge: '-50%',
    original_price: 60000,
    sale_price: 42000,
    stock: 'Còn 20 lượt',
    total_stock: 50,
    remaining_stock: 20,
    progress: '60%',
    plan_name: 'AI GG PRO 18M LINK',
    logo_url: 'https://tse4.mm.bing.net/th/id/OIP.umfUzNjKLT1bMF25L3QPoAHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3'
  },
  {
    id: 'eea420d0-dab0-4484-8417-151f7742244d',
    product_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    plan_id: 'b02837ce-dbc9-4af0-8e75-99155f2cb9b3',
    name: 'Canva Pro Bản Quyền 1 Năm',
    badge: '-56%',
    original_price: 135000,
    sale_price: 59000,
    stock: 'Còn 20 lượt',
    total_stock: 50,
    remaining_stock: 20,
    progress: '60%',
    plan_name: 'CANVA PRO 1 YEAR',
    logo_url: 'https://freepnglogo.com/images/all_img/1691829322canva-app-logo-png.png'
  },
  {
    id: '7144fff2-4af4-497d-ad63-77e5ae6ed5ff',
    product_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    plan_id: 'd168b246-86bc-404d-9e34-f37f7cc7f8a2',
    name: 'CapCut Pro VIP 1 Tháng',
    badge: '-45%',
    original_price: 89000,
    sale_price: 49000,
    stock: 'Còn 20 lượt',
    total_stock: 50,
    remaining_stock: 20,
    progress: '60%',
    plan_name: 'CAPCUT PRO 1M',
    logo_url: 'https://i.pinimg.com/474x/e7/7a/00/e77a00979cfb814f4aff1acffb4f0c64.jpg'
  }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action || req.body?.action || '';

  // 1. ACTION: SUBMIT REVIEW FOR DELIVERED ORDER
  if (action === 'submit-review' || (req.method === 'POST' && req.body?.order_code)) {
    try {
      const order_code = String(req.body?.order_code || '').trim().toUpperCase();
      const rating = Math.min(5, Math.max(1, parseInt(req.body?.rating, 10) || 5));
      const comment = String(req.body?.comment || '').trim();

      if (!order_code || !comment) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp mã đơn hàng và nội dung đánh giá!' });
      }

      // Verify order exists and is delivered or completed
      const orderRes = await query(`
        SELECT o.id, o.code, o.customer_name, o.customer_phone, o.customer_email, o.plan_id, pl.product_id, pl.name as plan_name, pr.name as product_name, o.status
        FROM public.orders o
        LEFT JOIN public.plans pl ON pl.id = o.plan_id
        LEFT JOIN public.products pr ON pr.id = pl.product_id
        WHERE UPPER(o.code) = $1;
      `, [order_code]);

      if (orderRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy mã đơn hàng này trên hệ thống!' });
      }

      const ord = orderRes.rows[0];
      const statusLower = String(ord.status || '').toLowerCase();
      if (!['delivered', 'completed'].includes(statusLower)) {
        return res.status(400).json({ success: false, error: 'Đơn hàng cần được giao thành công trước khi gửi đánh giá!' });
      }

      // Check if review already exists for this order
      const existing = await query(`SELECT id FROM public.reviews WHERE UPPER(order_code) = $1;`, [order_code]);
      if (existing.rows.length > 0) {
        await query(`
          UPDATE public.reviews 
          SET rating = $1, comment = $2, created_at = NOW()
          WHERE UPPER(order_code) = $3;
        `, [rating, comment, order_code]);
      } else {
        await query(`
          INSERT INTO public.reviews (
            order_id, order_code, customer_name, customer_phone, customer_email, product_id, product_name, plan_id, plan_name, rating, comment, is_approved
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true);
        `, [
          ord.id,
          ord.code,
          ord.customer_name || 'Khách hàng',
          ord.customer_phone || '',
          ord.customer_email || '',
          ord.product_id,
          ord.product_name || 'Tài khoản bản quyền',
          ord.plan_id,
          ord.plan_name || 'Gói bản quyền',
          rating,
          comment
        ]);
      }

      return res.status(200).json({
        success: true,
        message: 'Đánh giá sản phẩm thành công! Cảm ơn phản hồi quý báu của bạn.'
      });
    } catch (revErr) {
      console.error('Error submitting review:', revErr.message);
      return res.status(500).json({ success: false, error: 'Không thể lưu đánh giá: ' + revErr.message });
    }
  }

  // 2. ACTION: GET ORDER REVIEW
  if (action === 'get-order-review') {
    const order_code = String(req.query?.order_code || '').trim().toUpperCase();
    try {
      const revRes = await query(`SELECT * FROM public.reviews WHERE UPPER(order_code) = $1 LIMIT 1;`, [order_code]);
      return res.status(200).json({ success: true, review: revRes.rows[0] || null });
    } catch (e) {
      return res.status(200).json({ success: true, review: null });
    }
  }

  // 3. DEFAULT: GET FULL CATALOG WITH REAL-TIME STOCK, SOLD COUNT & RATINGS
  let stats = {
    completed_orders: 10,
    pending_orders: 0,
    members_count: 4,
    visitors_today: 1420,
    avg_time: '30 giây'
  };

  try {
    const statsRes = await query(`
      SELECT
        COUNT(*) FILTER (WHERE LOWER(status) IN ('paid', 'delivered', 'completed'))::int as completed_orders,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('pending', 'pending_payment'))::int as pending_orders
      FROM public.orders;
    `);
    if (statsRes && statsRes.rows && statsRes.rows[0]) {
      const row = statsRes.rows[0];
      stats.completed_orders = parseInt(row.completed_orders, 10) || 0;
      stats.pending_orders = parseInt(row.pending_orders, 10) || 0;
    }
  } catch (e) {}

  try {
    const userCountRes = await query(`SELECT COUNT(*)::int as count FROM public.profiles;`);
    if (userCountRes && userCountRes.rows && userCountRes.rows[0]) {
      stats.members_count = parseInt(userCountRes.rows[0].count, 10) || 0;
    }
  } catch (e) {}

  try {
    const visitRes = await query(`
      INSERT INTO public.site_visits (visit_date, views_count, updated_at)
      VALUES (CURRENT_DATE, 1, NOW())
      ON CONFLICT (visit_date)
      DO UPDATE SET views_count = public.site_visits.views_count + 1, updated_at = NOW()
      RETURNING views_count;
    `);
    if (visitRes && visitRes.rows && visitRes.rows[0]) {
      stats.visitors_today = parseInt(visitRes.rows[0].views_count, 10) || 1420;
    }
  } catch (e) {}

  // 4. Fetch Flash Sales with Real-Time Synchronized Stock
  let flashSales = DEFAULT_FLASH_SALES;
  try {
    const flashRes = await query(`
      SELECT 
        fs.id,
        fs.product_id,
        fs.plan_id,
        fs.title as name,
        fs.badge,
        fs.original_price,
        fs.sale_price,
        fs.stock_text as stock,
        fs.total_stock,
        fs.remaining_stock,
        fs.progress_percent,
        fs.is_active,
        fs.sort_order,
        COALESCE(p.logo_url, '') as logo_url,
        COALESCE(pl.name, '') as plan_name,
        CASE 
          WHEN (SELECT COUNT(*)::int FROM public.inventory_items ii WHERE ii.plan_id = fs.plan_id) > 0 
          THEN (SELECT COUNT(*)::int FROM public.inventory_items ii WHERE ii.plan_id = fs.plan_id AND ii.status = 'available')
          ELSE fs.remaining_stock 
        END as live_stock
      FROM public.flash_sales fs
      LEFT JOIN public.products p ON p.id = fs.product_id
      LEFT JOIN public.plans pl ON pl.id = fs.plan_id
      WHERE fs.is_active = true
      ORDER BY fs.sort_order ASC, fs.created_at ASC;
    `);
    if (flashRes && flashRes.rows && flashRes.rows.length > 0) {
      flashSales = flashRes.rows.map(r => {
        const orig = Number(r.original_price) || 0;
        const sale = Number(r.sale_price) || 0;
        const total = Math.max(1, Number(r.total_stock) || 50);
        const rem = Math.max(0, Number(r.live_stock !== null && r.live_stock !== undefined ? r.live_stock : r.remaining_stock) || 0);
        const progress = Math.min(100, Math.max(10, Math.round(((total - rem) / total) * 100)));

        return {
          ...r,
          original_price: orig,
          sale_price: sale,
          total_stock: total,
          remaining_stock: rem,
          stock: rem > 0 ? `Còn ${rem} lượt` : 'Đã cháy hàng',
          progress: progress + '%'
        };
      });
    }
  } catch (e) {
    console.warn('Flash sales query notice:', e.message);
  }

  // 5. Fetch Products with Real-time Plans, Stock, Sold Count, and Ratings
  try {
    const catRes = await query('SELECT * FROM public.categories ORDER BY id ASC');
    const prodRes = await query(`
      SELECT 
        p.id, 
        p.category_id, 
        p.name, 
        p.slug, 
        p.badge, 
        p.tags, 
        p.short_desc, 
        p.description, 
        p.warranty_policy, 
        p.logo_url, 
        p.brand_key, 
        p.is_active,
        COALESCE(ROUND((SELECT AVG(r.rating)::numeric FROM public.reviews r WHERE r.product_id = p.id AND r.is_approved = true), 1), 5.0)::float as rating_avg,
        COALESCE((SELECT COUNT(*)::int FROM public.reviews r WHERE r.product_id = p.id AND r.is_approved = true), 0) as rating_count,
        COALESCE((SELECT COUNT(*)::int FROM public.orders o JOIN public.plans plx ON plx.id = o.plan_id WHERE plx.product_id = p.id AND LOWER(o.status) IN ('delivered', 'completed', 'paid')), 0) as total_sold,
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
              'is_active', pl.is_active,
              'stock', CASE 
                WHEN (SELECT COUNT(*)::int FROM public.inventory_items ii WHERE ii.plan_id = pl.id) > 0
                THEN (SELECT COUNT(*)::int FROM public.inventory_items ii WHERE ii.plan_id = pl.id AND ii.status = 'available')
                ELSE COALESCE(pl.stock, 20)
              END,
              'sold_count', COALESCE(
                (SELECT COUNT(*)::int FROM public.orders o WHERE o.plan_id = pl.id AND LOWER(o.status) IN ('delivered', 'completed', 'paid')),
                0
              )
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

    // Fetch approved recent reviews for display and product modal
    let latestReviews = [];
    try {
      const revRes = await query(`
        SELECT id, customer_name, product_id, product_name, plan_id, plan_name, rating, comment, admin_reply, created_at
        FROM public.reviews
        WHERE is_approved = true
        ORDER BY created_at DESC
        LIMIT 50;
      `);
      latestReviews = revRes.rows || [];
    } catch (e) {}

    // Fetch active event popup banner
    let eventPopup = null;
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
    try {
      const popRes = await query('SELECT * FROM public.site_popups WHERE is_active = true ORDER BY updated_at DESC LIMIT 1;');
      if (popRes && popRes.rows && popRes.rows.length > 0 && popRes.rows[0].is_active) {
        eventPopup = popRes.rows[0];
      }
    } catch (e) {}

    if (prodRes && prodRes.rows && prodRes.rows.length > 0) {
      return res.status(200).json({
        success: true,
        categories: catRes.rows,
        products: prodRes.rows,
        flash_sales: flashSales,
        reviews: latestReviews,
        popup: eventPopup,
        stats: stats,
        client_ip: clientIp
      });
    }

    return res.status(200).json({
      success: true,
      categories: DEFAULT_CATEGORIES,
      products: DEFAULT_PRODUCTS,
      flash_sales: flashSales,
      reviews: [],
      popup: eventPopup,
      stats: stats,
      client_ip: clientIp
    });
  } catch (err) {
    console.warn('Catalog DB notice (falling back to default seeds):', err.message);
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
    return res.status(200).json({
      success: true,
      categories: DEFAULT_CATEGORIES,
      products: DEFAULT_PRODUCTS,
      flash_sales: flashSales,
      reviews: [],
      popup: null,
      stats: stats,
      client_ip: clientIp,
      is_fallback: true
    });
  }
};

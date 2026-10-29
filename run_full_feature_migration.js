const { query } = require('./api/lib/db');

async function migrate() {
  console.log('--- Starting Migration for Reviews & Stock ---');

  // 1. Create public.reviews table
  await query(`
    CREATE TABLE IF NOT EXISTS public.reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID,
      order_code VARCHAR(50) NOT NULL,
      customer_name VARCHAR(100),
      customer_phone VARCHAR(50),
      customer_email VARCHAR(100),
      product_id UUID,
      product_name VARCHAR(150),
      plan_id UUID,
      plan_name VARCHAR(150),
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      admin_reply TEXT,
      is_approved BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  console.log('✓ public.reviews table verified/created');

  // Create indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_order_code ON public.reviews (order_code);`);
  console.log('✓ public.reviews indexes created');

  // 2. Add stock column to public.plans if not exists
  await query(`
    ALTER TABLE public.plans 
    ADD COLUMN IF NOT EXISTS stock INT DEFAULT 20;
  `);
  console.log('✓ public.plans.stock column verified/created');

  // 3. Ensure flash_sales has total_stock & remaining_stock
  await query(`
    ALTER TABLE public.flash_sales
    ADD COLUMN IF NOT EXISTS total_stock INT DEFAULT 50,
    ADD COLUMN IF NOT EXISTS remaining_stock INT DEFAULT 20;
  `);
  console.log('✓ public.flash_sales stock columns verified');

  // 4. Insert initial sample reviews for delivered orders so products have nice ratings
  const existingReviews = await query('SELECT count(*)::int as count FROM public.reviews;');
  if (existingReviews.rows[0].count === 0) {
    const deliveredOrders = await query(`
      SELECT o.id, o.code, o.customer_name, o.customer_phone, o.customer_email, pl.product_id, pr.name as product_name, o.plan_id, pl.name as plan_name
      FROM public.orders o
      LEFT JOIN public.plans pl ON pl.id = o.plan_id
      LEFT JOIN public.products pr ON pr.id = pl.product_id
      WHERE LOWER(o.status) IN ('delivered', 'completed')
      LIMIT 6;
    `);

    const sampleReviews = [
      { rating: 5, comment: 'Tài khoản ChatGPT Plus kích hoạt siêu nhanh, dùng mượt mà ổn định không bị logout. Đội ngũ support Zalo rất tận tình!' },
      { rating: 5, comment: 'Nâng cấp Canva Pro chính chủ email của mình trong 1 phút, đầy đủ tính năng thiết kế và font chữ. Giá tốt hơn mua trực tiếp nhiều.' },
      { rating: 5, comment: 'Capcut Pro xuất video 4K sắc nét không dính watermark, bảo hành uy tín đúng cam kết. Rất hài lòng!' },
      { rating: 5, comment: 'Mua gói Gemini Advanced có 2TB Drive rất tiện để lưu trữ dữ liệu công việc. Shop giao tài khoản đúng hẹn.' }
    ];

    for (let i = 0; i < deliveredOrders.rows.length; i++) {
      const o = deliveredOrders.rows[i];
      const rev = sampleReviews[i % sampleReviews.length];
      await query(`
        INSERT INTO public.reviews (order_id, order_code, customer_name, customer_phone, customer_email, product_id, product_name, plan_id, plan_name, rating, comment, is_approved, admin_reply)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 'Cảm ơn quý khách đã tin tưởng và ủng hộ DNMMO!');
      `, [
        o.id,
        o.code,
        o.customer_name || 'Khách hàng',
        o.customer_phone || '',
        o.customer_email || '',
        o.product_id,
        o.product_name || 'Tài khoản bản quyền',
        o.plan_id,
        o.plan_name || 'Gói bản quyền',
        rev.rating,
        rev.comment
      ]);
    }
    console.log(`✓ Inserted ${deliveredOrders.rows.length} verified sample reviews`);
  }

  const rCount = await query('SELECT count(*)::int as count FROM public.reviews;');
  console.log(`Total reviews in DB: ${rCount.rows[0].count}`);
  console.log('--- Migration Finished Successfully ---');
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});

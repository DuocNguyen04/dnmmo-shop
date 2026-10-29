const { query } = require('./api/lib/db');

async function migrate() {
  console.log('--- Running Migration for Flash Sale Stock & Site Visits ---');

  // 1. Add total_stock and remaining_stock to public.flash_sales
  await query(`
    ALTER TABLE public.flash_sales 
    ADD COLUMN IF NOT EXISTS total_stock INT DEFAULT 50,
    ADD COLUMN IF NOT EXISTS remaining_stock INT DEFAULT 20;
  `);
  console.log('✓ Added total_stock and remaining_stock to public.flash_sales');

  // Update existing flash_sales rows if remaining_stock is NULL
  await query(`
    UPDATE public.flash_sales 
    SET 
      total_stock = COALESCE(total_stock, 50),
      remaining_stock = COALESCE(remaining_stock, 20)
    WHERE remaining_stock IS NULL;
  `);

  // 2. Create site_visits table
  await query(`
    CREATE TABLE IF NOT EXISTS public.site_visits (
      visit_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
      views_count INT DEFAULT 1,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✓ Created public.site_visits table');

  // Seed site_visits for today with realistic initial traffic if not exists
  await query(`
    INSERT INTO public.site_visits (visit_date, views_count, updated_at)
    VALUES (CURRENT_DATE, 1420, NOW())
    ON CONFLICT (visit_date) DO NOTHING;
  `);
  console.log('✓ Initialized site_visits for today');

  const check = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'flash_sales'`);
  console.log('flash_sales columns:', check.rows.map(r => r.column_name));
}

migrate().then(() => {
  console.log('Migration finished successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

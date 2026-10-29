const { query } = require('./api/lib/db');

async function applyRLS() {
  try {
    await query('ALTER TABLE IF EXISTS public.flash_sales ENABLE ROW LEVEL SECURITY;');
    await query('DROP POLICY IF EXISTS "Public read-only flash_sales" ON public.flash_sales;');
    await query('CREATE POLICY "Public read-only flash_sales" ON public.flash_sales FOR SELECT TO anon, authenticated USING (is_active = true OR is_active IS NULL);');
    console.log('✓ RLS successfully applied to public.flash_sales in live database');
  } catch (e) {
    console.error('RLS notice:', e.message);
  } finally {
    process.exit(0);
  }
}

applyRLS();

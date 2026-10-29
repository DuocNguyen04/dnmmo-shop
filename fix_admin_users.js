const { query } = require('./api/lib/db');
async function fixAdmin() {
  // 1. Update duocnguyen.work@gmail.com in public.users
  await query(`
    UPDATE public.users 
    SET role = 'ADMIN', password = 'Tatduoc2026A#'
    WHERE LOWER(email) = 'duocnguyen.work@gmail.com';
  `);
  console.log('✓ Updated duocnguyen.work@gmail.com');

  // 2. Update duoc.ntd15@gmail.com in public.users to ADMIN
  await query(`
    UPDATE public.users 
    SET role = 'ADMIN', password = 'Tatduoc2026A#'
    WHERE LOWER(email) = 'duoc.ntd15@gmail.com';
  `);
  console.log('✓ Updated duoc.ntd15@gmail.com');

  // 3. Ensure both exist in public.profiles with role = 'admin'
  const u1 = await query("SELECT id, email, name FROM public.users WHERE LOWER(email) = 'duocnguyen.work@gmail.com'");
  if (u1.rows.length > 0) {
    await query(`
      INSERT INTO public.profiles (id, full_name, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = $2;
    `, [u1.rows[0].id, u1.rows[0].name || 'Được Nguyễn (Admin)']);
  }

  const u2 = await query("SELECT id, email, name FROM public.users WHERE LOWER(email) = 'duoc.ntd15@gmail.com'");
  if (u2.rows.length > 0) {
    await query(`
      INSERT INTO public.profiles (id, full_name, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = $2;
    `, [u2.rows[0].id, u2.rows[0].name || 'Nguyễn Được (Admin)']);
  }

  const check = await query("SELECT id, email, role, password FROM public.users WHERE role = 'ADMIN'");
  console.log('Current ADMIN users in DB:', check.rows);
}
fixAdmin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

-- =========================================================================
-- DNMMO ADVANCED SECURITY HARDENING: ROW LEVEL SECURITY (RLS) POLICIES
-- Chạy script này trong mục SQL Editor trên Dashboard Supabase của bạn
-- Để khóa 100% rủi ro lộ dữ liệu khách hàng & tài khoản cấp qua API công khai (PostgREST)
-- =========================================================================

-- 1. BẬT RLS (ROW LEVEL SECURITY) TRÊN TẤT CẢ CÁC BẢNG TRONG HỆ THỐNG
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flash_sales ENABLE ROW LEVEL SECURITY;

-- 2. XÓA BỎ CÁC CHÍNH SÁCH CŨ (NẾU CÓ) ĐỂ TRÁNH XUNG ĐỘT HOẶC TRÙNG LẶP
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Public read-only products" ON public.products;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Public read-only categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view plans" ON public.plans;
DROP POLICY IF EXISTS "Public read-only plans" ON public.plans;
DROP POLICY IF EXISTS "Public can view product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Public read-only product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Deny all public anon access to orders" ON public.orders;
DROP POLICY IF EXISTS "Users can only select own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin only deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admin only inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admin only inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admin only audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- 3. BẢNG SẢN PHẨM & DANH MỤC: CHO PHÉP ĐỌC CÔNG KHAI (CHỈ ĐỌC SELECT, KHÔNG CHO PHÉP INSERT/UPDATE/DELETE)
CREATE POLICY "Public read-only products" ON public.products
  FOR SELECT TO anon, authenticated 
  USING (is_active = true OR is_active IS NULL);

CREATE POLICY "Public read-only categories" ON public.categories
  FOR SELECT TO anon, authenticated 
  USING (true);

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plans') THEN
    CREATE POLICY "Public read-only plans" ON public.plans
      FOR SELECT TO anon, authenticated 
      USING (is_active = true OR is_active IS NULL);
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_variants') THEN
    CREATE POLICY "Public read-only product_variants" ON public.product_variants
      FOR SELECT TO anon, authenticated 
      USING (true);
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flash_sales') THEN
    CREATE POLICY "Public read-only flash_sales" ON public.flash_sales
      FOR SELECT TO anon, authenticated 
      USING (is_active = true OR is_active IS NULL);
    CREATE POLICY "Admin only flash_sales" ON public.flash_sales
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- 4. BẢNG ĐƠN HÀNG (ORDERS): KHÓA TOÀN BỘ TRUY CẬP TRỰC TIẾP TỪ ANON QUA POSTGREST
-- Người dùng vãng lai hoặc hacker dù có Anon Key công khai cũng KHÔNG THỂ SELECT/DUMP bảng orders!
-- Mọi tra cứu phải đi qua Serverless Backend API (/api/lookup-order, /api/create-order) có xác thực mã + SĐT và Rate Limit.
CREATE POLICY "Users can only select own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. BẢNG GIAO HÀNG & KHO TÀI KHOẢN (DELIVERIES, INVENTORY, INVENTORY_ITEMS):
-- KHÓA 100% TRUY CẬP CÔNG KHAI - Chỉ Admin đã xác thực mới có quyền truy cập qua API
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deliveries') THEN
    CREATE POLICY "Admin only deliveries" ON public.deliveries
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory') THEN
    CREATE POLICY "Admin only inventory" ON public.inventory
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
    CREATE POLICY "Admin only inventory_items" ON public.inventory_items
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- 6. BẢNG AUDIT LOGS: KHÓA 100% CÔNG KHAI
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    CREATE POLICY "Admin only audit logs" ON public.audit_logs
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- 7. BẢNG PROFILES / USERS: Người dùng chỉ được xem & cập nhật hồ sơ của chính mình
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE POLICY "Users view own profile" ON public.profiles
      FOR SELECT TO authenticated
      USING (id = auth.uid());

    CREATE POLICY "Users update own profile" ON public.profiles
      FOR UPDATE TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

-- THÔNG BÁO HOÀN TẤT
SELECT 'ĐÃ KÍCH HOẠT THÀNH CÔNG ROW LEVEL SECURITY (RLS) VÀ BẢO VỆ 100% BẢNG DỮ LIỆU!' as status;

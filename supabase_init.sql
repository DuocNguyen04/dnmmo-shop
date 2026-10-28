-- supabase_init.sql
-- Chạy script này trong mục SQL Editor của Supabase để tạo bảng & dữ liệu mẫu 8 sản phẩm

-- 1. XÓA BẢNG CŨ (NẾU CÓ) ĐỂ TẠO MỚI CHUẨN XÁC
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "product_variants" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 2. TẠO BẢNG NGƯỜI DÙNG (USERS) HỖ TRỢ GOOGLE LOGIN
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "google_id" TEXT UNIQUE,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "role" TEXT DEFAULT 'USER', -- 'USER', 'STAFF', 'ADMIN'
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TẠO BẢNG DANH MỤC (CATEGORIES)
CREATE TABLE "categories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL
);

-- 4. TẠO BẢNG SẢN PHẨM (PRODUCTS)
CREATE TABLE "products" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "category_id" UUID REFERENCES "categories"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "badge" TEXT,
    "short_desc" TEXT NOT NULL,
    "long_desc" TEXT NOT NULL,
    "warranty_policy" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TẠO BẢNG GÓI SẢN PHẨM & GIÁ BÁN (PRODUCT_VARIANTS)
CREATE TABLE "product_variants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" UUID REFERENCES "products"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "price" NUMERIC(12, 2) NOT NULL,
    "old_price" NUMERIC(12, 2),
    "stock" INTEGER DEFAULT 10,
    "is_contact" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TẠO BẢNG ĐƠN ĐẶT HÀNG (ORDERS - LƯU SỐ ĐIỆN THOẠI KHÁCH)
CREATE TABLE "orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" TEXT UNIQUE NOT NULL,
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "variant_id" UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
    "customer_phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "customer_note" TEXT,
    "price" NUMERIC(12, 2) NOT NULL,
    "status" TEXT DEFAULT 'PENDING_CONTACT', -- 'PENDING_CONTACT', 'CONTACTED', 'COMPLETED', 'CANCELLED'
    "admin_note" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. THÊM DỮ LIỆU DANH MỤC
INSERT INTO "categories" ("id", "name", "slug") VALUES
('11111111-1111-1111-1111-111111111111', 'Trí tuệ nhân tạo (AI Tools)', 'ai-tools'),
('22222222-2222-2222-2222-222222222222', 'Đồ họa & Thiết kế', 'do-hoa-thiet-ke'),
('33333333-3333-3333-3333-333333333333', 'Video & Giải trí', 'video-giai-tri');

-- 8. THÊM DỮ LIỆU 8 SẢN PHẨM CHUẨN TỪ BẢNG GIÁ
-- 8.1. ChatGPT
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'ChatGPT', 'chatgpt', 'BÁN CHẠY', 
 'Mô hình GPT-4o, Canvas, tạo ảnh DALL-E 3 và phân tích dữ liệu chuyên sâu.',
 'Tài khoản ChatGPT Plus sử dụng độc quyền mô hình GPT-4o và OpenAI o1 siêu nhanh. Hỗ trợ tính năng Advanced Voice, tạo ảnh bản quyền DALL-E 3, trình soạn thảo Canvas cho lập trình viên.',
 'Bảo hành trọn thời hạn gói đăng ký (1 tháng hoặc 1 năm). Hỗ trợ cấp lại tài khoản nếu phát sinh lỗi xác minh hoặc lỗi thanh toán từ OpenAI. Cam kết tài khoản riêng tư ổn định.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CHAT GPT PLUS 1M', 220000, 500000, 12, false),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CHAT GPT K12 1 YEAR', 150000, 200000, 18, false),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'API CODEX TOKEN', 0, 0, 99, true);

-- 8.2. Canva Pro
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Canva Pro', 'canva-pro', 'BẢN QUYỀN',
 'Nâng cấp chính chủ email của bạn, mở khóa 100M+ tài nguyên Pro.',
 'Kích hoạt trực tiếp trên chính email cá nhân của bạn, giữ nguyên thiết kế cũ. Mở khóa 100M+ ảnh/video/đồ họa Pro, công cụ xóa phông nền 1 chạm và đổi kích thước Magic Resize.',
 'Bảo hành trọn thời gian sử dụng 1 năm theo cam kết. Nâng cấp chính chủ email cá nhân, dữ liệu thiết kế hoàn toàn riêng tư. Hỗ trợ mời lại nhóm nếu gặp sự cố.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CANVA EDU 1 YEAR', 59000, 129000, 35, false),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CANVA PRO 1 YEAR', 129000, 229000, 24, false);

-- 8.3. CapCut Pro
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'CapCut Pro', 'capcut-pro', 'EDITOR VIP',
 'Dựng video TikTok/Reels Pro, xóa phông nền AI, phụ đề tự động và hiệu ứng VIP.',
 'Mở khóa kho nhạc bản quyền, hiệu ứng chuyển cảnh độc quyền VIP, phụ đề tự động đa ngôn ngữ, xóa phông nền và xuất video 4K 60FPS không có hình mờ watermark.',
 'Bảo hành đúng thời hạn đã chọn (7 ngày hoặc 1 tháng). Hỗ trợ đăng nhập trên thiết bị PC, Laptop, iPhone, Android theo quy định.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'CAPCUT PRO 1M', 49000, 139000, 28, false),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'CAPCUT PRO 7DAY', 18000, 50000, 40, false);

-- 8.4. Gemini Pro
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Gemini Pro', 'gemini-pro', 'GOOGLE ADVANCED',
 'Mô hình Gemini 1.5 Pro với 2 triệu token context, tích hợp Google Workspace.',
 'Sức mạnh xử lý đa phương thức với cửa sổ ngữ cảnh 2 triệu tokens. Tích hợp trực tiếp vào Gmail, Google Docs và tặng kèm 2TB Google Drive tốc độ cao.',
 'Bảo hành gói bản quyền theo thời hạn đã đăng ký (1 năm / 18 tháng). Cam kết dung lượng Drive 2TB ổn định suốt thời hạn gói.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'AI GG PRO 1 YEAR', 190000, 220000, 15, false),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'AI GG PRO 18M LINK', 60000, 120000, 30, false),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'AI GG PRO 18M BH 1Y', 180000, 250000, 9, false);

-- 8.5. Claude AI
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Claude AI', 'claude-ai', 'SONNET 3.5',
 'Claude 3.5 Sonnet đỉnh cao lập trình, phân tích tư duy logic và viết lách tự nhiên.',
 'Mô hình hàng đầu về coding, giải toán tư duy logic và phân tích văn bản dài từ Anthropic.',
 'Bảo hành số dư Token / Credit API trong 30 ngày sử dụng. Cung cấp key API tốc độ cao, hỗ trợ cấu hình vào Cursor/VS Code.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '100$ API 30D', 100000, 200000, 11, false),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '500$ API 30D', 300000, 900000, 6, false),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '100M TOKEN 1DAY', 100000, 150000, 14, false);

-- 8.6. YouTube Premium
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'YouTube Premium', 'youtube-premium', 'GIA ĐÌNH CHÍNH HÃNG',
 'Chặn 100% quảng cáo, phát trong nền, nghe nhạc YouTube Music chất lượng cao.',
 'Mời nhóm Gia đình (Family) vào email Gmail cá nhân của bạn. Xem video không quảng cáo trên mọi thiết bị TV, Điện thoại, Máy tính, nghe nhạc ngầm khi tắt màn hình.',
 'Bảo hành trọn vẹn theo thời hạn gói (1 tháng, 3 tháng, 6 tháng). Nâng cấp chính chủ email Gmail, giữ nguyên lịch sử xem.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'YTB PREMIUM 1M', 35000, 75000, 50, false),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'YTB PREMIUM 3M', 180000, 300000, 22, false),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'YTB PREMIUM 6M', 355000, 600000, 16, false);

-- 8.7. Suno AI Music
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('12121212-1212-1212-1212-121212121212', '33333333-3333-3333-3333-333333333333', 'Suno AI Music', 'suno-ai-music', 'TẠO NHẠC AI',
 'Sáng tác bài hát hoàn chỉnh đầy đủ giai điệu và giọng hát bản quyền thương mại.',
 'Tài khoản Suno AI Pro/Premier tạo bài hát AI chuyên nghiệp, đầy đủ bản quyền thương mại để đăng tải YouTube/TikTok.',
 'Bảo hành số credit và thời hạn sử dụng 1 tháng của gói tài khoản.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('12121212-1212-1212-1212-121212121212', 'SUNO PRO 1M', 190000, 220000, 8, false),
('12121212-1212-1212-1212-121212121212', 'SUNO PREMIER 1M', 590000, 999000, 5, false);

-- 8.8. Muse Token
INSERT INTO "products" ("id", "category_id", "name", "slug", "badge", "short_desc", "long_desc", "warranty_policy") VALUES
('34343434-3434-3434-3434-343434343434', '11111111-1111-1111-1111-111111111111', 'Muse Token', 'muse-token', 'TOKEN BẢN QUYỀN',
 'Gói token tài nguyên AI tốc độ cao dành cho nhà phát triển và tự động hóa.',
 'Cung cấp Token kết nối API tốc độ cao, độ trễ thấp, phục vụ nhu cầu tích hợp AI số lượng lớn.',
 'Bảo hành lưu lượng token đúng cam kết theo gói đã mua.');

INSERT INTO "product_variants" ("product_id", "title", "price", "old_price", "stock", "is_contact") VALUES
('34343434-3434-3434-3434-343434343434', '1B TOKEN', 100000, 200000, 14, false),
('34343434-3434-3434-3434-343434343434', '10B TOKEN', 0, 0, 5, true);

-- 9. TẠO 2 ĐƠN HÀNG MẪU CÓ SỐ ĐIỆN THOẠI KHÁCH CHỜ GỌI ĐIỆN
INSERT INTO "orders" ("code", "variant_id", "customer_name", "customer_phone", "customer_email", "customer_note", "price", "status")
SELECT 'ORD-9412', id, 'Anh Hoàng', '0988 123 456', 'hoang.dev@gmail.com', 'Gọi trước 12h trưa nhé shop', 220000, 'PENDING_CONTACT'
FROM "product_variants" WHERE "title" = 'CHAT GPT PLUS 1M' LIMIT 1;

INSERT INTO "orders" ("code", "variant_id", "customer_name", "customer_phone", "customer_email", "customer_note", "price", "status")
SELECT 'ORD-9411', id, 'Chị Lan', '0912 889 900', 'lan.design@gmail.com', 'Gửi link qua Zalo số này luôn', 129000, 'PENDING_CONTACT'
FROM "product_variants" WHERE "title" = 'CANVA PRO 1 YEAR' LIMIT 1;

# DNMMO PRO - Nền Tảng Cung Cấp Tài Khoản Bản Quyền & Phần Mềm Uy Tín

Hệ thống thương mại điện tử chuyên nghiệp cung cấp tài khoản công cụ AI và phần mềm bản quyền (ChatGPT Plus, Canva Pro, CapCut Pro, YouTube Premium, Google Gemini Advanced, Claude AI, Suno AI). Kiến trúc bảo mật đa tầng, tách biệt hoàn toàn giữa Cửa hàng công khai (Storefront) và Bảng điều khiển Quản trị (Admin Console).

- **Website:** [duocnguyenmmo.store](https://www.duocnguyenmmo.store)
- **Hotline / Zalo tư vấn:** 0865 899 763
- **Quản trị viên:** Được Nguyễn
- **Cơ sở dữ liệu:** Supabase PostgreSQL Cloud (Row Level Security - RLS Enabled)

---

## 🌟 Tính Năng & Kiến Trúc Bảo Mật Đa Tầng

1. **Bảo mật Cơ sở dữ liệu với Row Level Security (RLS):**
   - Đã kích hoạt RLS trên toàn bộ 9 bảng (`profiles`, `categories`, `products`, `plans`, `orders`, `inventory_items`, `deliveries`, `warranty_claims`, `audit_logs`).
   - Khóa ẩn danh `anon` bị chặn hoàn toàn: không thể đọc đơn hàng, không thể đọc kho tài khoản, không thể đọc bảng deliveries, không thể đọc hồ sơ người dùng.
   - Tránh rò rỉ dữ liệu khách hàng (số điện thoại, thông tin bản quyền) qua client-side.

2. **Tách biệt hoàn toàn Quản trị viên (Decoupled Admin Portal):**
   - Cửa hàng khách mua (`index.html`) 100% sạch: không chứa UI admin, không có mã kiểm tra mật khẩu hay email admin ở phía máy khách.
   - Bảng điều khiển quản trị chuyển hẳn sang `/admin` (`admin.html`), yêu cầu đăng nhập bằng tài khoản Supabase Auth và được xác thực quyền phía máy chủ (`profiles.role = 'admin'`).
   - Mọi thao tác quản trị được kiểm soát bởi API bảo mật `/api/admin-api` và ghi nhận lịch sử vào `audit_logs`.

3. **Mã hóa Bản quyền Giao diện (AES-256-GCM Encryption):**
   - Tài khoản và key bản quyền trong kho lưu trữ và khi bàn giao được mã hóa tự động bằng thuật toán chuẩn quân đội **AES-256-GCM**.
   - Mặc định trên trang Admin tài khoản được che dấu. Khi Admin nhấn "Xem thông tin", hệ thống ghi nhật ký hành động kèm danh tính người xem vào sổ `audit_logs`.

4. **Quy trình Thanh toán & Giao dịch Tự động VietQR:**
   - **Tạo đơn hàng server-side:** Giá và hạn sử dụng do máy chủ quyết định từ database (khách hàng không thể can thiệp sửa giá từ client). Mã đơn định dạng chuẩn `DN` + 6 ký tự ngẫu nhiên (ví dụ: `DNA8B2K9`).
   - **Thanh toán VietQR:** Tự động tạo mã QR kèm nội dung chuyển khoản chính xác, có đồng hồ đếm ngược 15 phút và cơ chế polling kiểm tra trạng thái đơn hàng.
   - **Webhook tự động bàn giao:** Hỗ trợ SePay / Casso webhook với xác thực secret key và cơ chế chống trùng lặp giao dịch (Idempotency qua `payment_ref`). Khi tiền về, máy chủ tự động lock kho (`FOR UPDATE SKIP LOCKED`), đánh dấu đã bán, mã hóa và lưu vào bảng `deliveries`, tính thời hạn bảo hành.

5. **Tra cứu Đơn hàng Bảo mật (Rate-limited Order Lookup):**
   - Khách hàng có thể tra cứu đơn hàng bằng Mã đơn hàng + Số điện thoại mua hàng qua `/api/lookup-order`.
   - Giới hạn tần suất tra cứu (Rate Limit) chống brute-force tấn công dò đơn hàng.

---

## 🛠️ Cấu Trúc Mã Nguồn

```text
├── index.html            # Giao diện Cửa hàng công khai dành cho khách hàng
├── admin.html            # Giao diện Bảng điều khiển Quản trị viên (/admin)
├── logo.png              # Logo thương hiệu DNMMO
├── vercel.json           # Cấu hình Vercel: Security Headers, Routing & API Rewrites
├── package.json          # Dependencies & Scripts
├── dev_server.js         # Máy chủ phát triển chạy thử nghiệm cục bộ
├── .gitignore            # Bỏ qua node_modules, file .env và các tệp nhật ký
├── api/
│   ├── create-order.js    # API tạo đơn hàng, xác thực giá và sinh mã VietQR
│   ├── lookup-order.js    # API tra cứu đơn hàng bằng Mã đơn + Số điện thoại
│   ├── payment-webhook.js # API tiếp nhận Webhook ngân hàng (SePay/Casso) tự động giao hàng
│   ├── admin-api.js       # API nghiệp vụ quản trị: KPI, Đơn hàng, Kho, Sản phẩm, Audit Log
│   ├── supabase.js        # API proxy an toàn đến Supabase REST
│   └── lib/
│       ├── db.js          # Kết nối cơ sở dữ liệu PostgreSQL Pool
│       ├── crypto.js      # Mã hóa & giải mã tài khoản bằng AES-256-GCM
│       └── rate-limit.js  # Bộ giới hạn tần suất yêu cầu (Sliding window)
```

---

## ⚙️ Thiết Lập Biến Môi Trường (Environment Variables)

Khi triển khai trên **Vercel** (hoặc tạo file `.env` trên máy chủ):

| Tên biến | Bắt buộc | Mô tả |
| :--- | :---: | :--- |
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL Supabase Pooler (`postgresql://...:6543/postgres`) |
| `SUPABASE_HOST` | Có | Domain Supabase (ví dụ: `kouiopupaneychjnhfwd.supabase.co`) |
| `SUPABASE_KEY` | Có | Service Role Key của Supabase (lưu ở máy chủ, tuyệt đối không lộ ở client) |
| `ENCRYPTION_KEY` | Tùy chọn | Khóa bí mật dùng để mã hóa AES-256-GCM kho tài khoản bàn giao |
| `PAYMENT_WEBHOOK_SECRET` | Tùy chọn | Mã bí mật webhook dùng để xác thực các thông báo chuyển tiền từ SePay/Casso |
| `ADMIN_SECRET_KEY` | Tùy chọn | Khóa dự phòng cho các tập lệnh tự động hóa quản trị |

---

## 🚀 Hướng Dẫn Deploy Lên GitHub & Vercel

### Bước 1: Đẩy mã nguồn lên GitHub
1. Truy cập [github.com](https://github.com) và tạo repository mới (ví dụ: `dnmmo-store`).
2. Tải toàn bộ các file trong thư mục dự án lên (hoặc dùng Git: `git add .`, `git commit -m "feat: secure dnmmo v2"`, `git push origin main`).
3. Đảm bảo file `.env` **không** được commit lên GitHub (đã được ghi trong `.gitignore`).

### Bước 2: Deploy lên Vercel
1. Truy cập [vercel.com](https://vercel.com) & đăng nhập.
2. Chọn **Add New Project** -> Chọn repository vừa tạo trên GitHub.
3. Tại phần **Environment Variables**, điền đầy đủ các biến môi trường:
   - `DATABASE_URL`
   - `SUPABASE_HOST`
   - `SUPABASE_KEY`
   - `ENCRYPTION_KEY`
   - `PAYMENT_WEBHOOK_SECRET`
4. Nhấn nút **Deploy**. Vercel sẽ tự động build và cung cấp liên kết chạy chính thức!

---

## 🔐 Hướng Dẫn Sử Dụng Admin Portal
- **Đường dẫn quản trị:** `https://your-domain.com/admin`
- **Tài khoản đăng nhập:** Đăng nhập bằng Email quản trị viên đã được cấp quyền `admin` trong bảng `public.profiles`.
- Khách hàng thông thường truy cập trang chủ sẽ không bao giờ thấy nút hoặc giao diện admin.

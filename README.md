# DUOCNGUYEN PRO - Kho Tài Khoản Bản Quyền & Phần Mềm Chính Hãng

Website thương mại điện tử chuyên nghiệp cung cấp tài khoản công cụ AI và phần mềm bản quyền (ChatGPT Plus, Canva Pro, CapCut, YouTube Premium, Gemini Advanced, Claude AI, Suno AI, Muse Token).

- **Hotline / Zalo tư vấn:** 0865 899 763
- **Kỹ thuật viên:** Được Nguyễn
- **Cơ sở dữ liệu đám mây:** Supabase PostgreSQL Cloud

---

## 🌟 Điểm nổi bật của Website

1. **Logo chính hãng chuẩn xác:**
   - Sử dụng vector SVG sắc nét của từng thương hiệu: OpenAI ChatGPT, Canva, CapCut, Google Gemini, Anthropic Claude, YouTube Premium, Suno AI, Muse.
   - Giao diện Dark Mode sang trọng, tin cậy, không dùng phong cách AI màu mè sáo rỗng.

2. **Quy trình đặt hàng tinh gọn (Không cần nạp tiền phức tạp):**
   - Khách hàng chỉ cần chọn gói và để lại **Số điện thoại (Zalo)**, Họ tên, Ghi chú.
   - Đơn hàng được cấp mã riêng (ví dụ `ORD-8921`) và lưu trực tiếp lên cơ sở dữ liệu Supabase.
   - Có nút chuyển tiếp ngay sang Zalo shop `0865 899 763` để được hỗ trợ tức thì.

3. **Chính sách bảo hành & FAQ thực tế:**
   - Hoàn toàn loại bỏ những câu từ sáo rỗng như "bảo hành 1 đổi 1".
   - Quy định rõ ràng các trường hợp được bảo hành (lỗi xác thực, mất gói) và từ chối bảo hành (vi phạm chính sách hãng, tự ý đổi email).
   - Hướng dẫn chi tiết cách nâng cấp trên email chính chủ và hỗ trợ từ xa qua Ultraviewer.

4. **Trang Quản trị Admin (CRM & Kho Hàng) chuyên sâu:**
   - **Quản lý Đơn hàng (Leads):** Xem danh sách khách đặt hàng với 1 cú click để **📞 Gọi điện trực tiếp** hoặc **💬 Mở Zalo nhắn tin ngay**, nút chuyển trạng thái đơn hàng sang `Đã hoàn tất`.
   - **Quản lý & Chỉnh sửa Sản phẩm:**
     - Nút **`+ Thêm sản phẩm mới`**: Tạo sản phẩm mới kèm các gói dịch vụ lưu thẳng vào Supabase.
     - Nút **`✏️ Chỉnh sửa`**: Cập nhật tên, mô tả, chính sách bảo hành, sửa giá bán và cập nhật số lượng **tồn kho (stock)** của từng gói dịch vụ.
   - Chuyển đổi quyền nhanh chóng ngay trên Top Bar ("Khách mua hàng" ⇄ "Quản trị Admin").

5. **Đăng nhập Google:**
   - Tích hợp Supabase Auth Google Sign-in.
   - Có sẵn nút chọn nhanh tài khoản chủ shop `Duoc Nguyen` hoặc khách hàng mẫu để kiểm tra mọi tính năng ngay lập tức.

---

## 🚀 Hướng Dẫn Deploy Lên GitHub & Vercel (Miễn Phí 100%)

### Cách 1: Tải lên GitHub bằng giao diện Web (Cực kỳ đơn giản, không cần cài Git)

1. Truy cập [github.com](https://github.com) và đăng nhập tài khoản của bạn.
2. Nhấn vào nút **New** (hoặc dấu `+` ở góc trên bên phải) để tạo một Repository mới:
   - Repository name: `duocnguyen-shop`
   - Chọn chế độ: **Public**
   - Bỏ tích "Add a README file" (vì dự án đã có sẵn README).
   - Nhấn **Create repository**.
3. Tại trang Repository vừa tạo, nhấn vào liên kết **uploading an existing file**.
4. Mở thư mục dự án `shop-tai-nguyen` trên máy tính của bạn (hoặc giải nén từ tệp `shop-tai-nguyen-pro.zip`).
5. Kéo thả toàn bộ các file (`index.html`, `vercel.json`, `package.json`, `README.md`, `.gitignore`, `supabase_init.sql`) vào khung tải lên của GitHub.
6. Nhấn **Commit changes**. Toàn bộ mã nguồn đã có mặt trên GitHub!

---

### Cách 2: Deploy lên Vercel (Chỉ mất 30 giây)

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub của bạn.
2. Tại trang Dashboard, nhấn nút **Add New...** -> chọn **Project**.
3. Bạn sẽ thấy repository `duocnguyen-shop` vừa tải lên ở Bước 1. Nhấn nút **Import** bên cạnh.
4. Ở màn hình cấu hình:
   - **Framework Preset**: Chọn `Other` (hoặc để mặc định).
   - **Root Directory**: Để trống `./`.
   - Không cần cấu hình thêm biến môi trường nào vì website đã kết nối sẵn với Supabase qua API HTTPS an toàn.
5. Nhấn nút **Deploy**.
6. Sau khoảng 15-20 giây, Vercel sẽ thông báo **Congratulations!** và cung cấp cho bạn một tên miền miễn phí hoạt động 24/7 (ví dụ: `https://duocnguyen-shop.vercel.app`).

---

## 🛠️ Cấu trúc thư mục

```text
├── index.html            # Toàn bộ giao diện storefront, chi tiết sản phẩm, modal đặt hàng, CRM Admin
├── vercel.json           # Cấu hình định tuyến tĩnh và cache tối ưu cho Vercel CDN
├── package.json          # Thông tin dự án và lệnh dev
├── .gitignore            # Bỏ qua node_modules và các file nhạy cảm
├── supabase_init.sql     # File SQL dự phòng khởi tạo database Supabase
└── README.md             # Hướng dẫn chi tiết
```

---

## 📞 Liên hệ kỹ thuật
Nếu cần hỗ trợ thêm về tính năng, liên hệ Zalo: **0865 899 763** (Được Nguyễn).

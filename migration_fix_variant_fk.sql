-- Migration: Xóa ràng buộc khóa ngoại variant_id trên bảng orders
-- Giúp các sản phẩm & gói dịch vụ mới tạo từ trang Admin (như Duolingo, Canva, v.v.)
-- có thể đặt mua thành công mà không bị lỗi ràng buộc bảng product_variants cũ.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_variant_id_fkey;

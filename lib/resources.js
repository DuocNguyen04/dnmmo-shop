const { query } = require('./db');

const DRIVE_URL = 'https://drive.google.com/drive/folders/18ilzg275sTy4HJ8u-GPFRziHcSoRXuZi?usp=drive_link';

const ALLOWED_CATEGORIES = ['extension', 'prompt', 'design', 'guide', 'other'];

// Tài liệu mẫu ban đầu (giống 3 thẻ đang hiển thị trên trang Tài liệu AI)
const SEED_RESOURCES = [
  {
    title: 'Công Thức Viết Mega-Prompt Chuẩn Chuyên Gia Cho ChatGPT & Gemini',
    category: 'prompt',
    badge: 'SKILL & PROMPT AI',
    icon: '🤖',
    summary: 'Áp dụng cấu trúc 5 lớp (Đóng vai - Bối cảnh - Nhiệm vụ - Ràng buộc - Định dạng đầu ra) giúp AI trả lời sâu sắc, chính xác hơn nhiều so với cách hỏi thông thường.',
    content: 'Lớp 1 (Role): Đóng vai chuyên gia đầu ngành trong lĩnh vực cụ thể.\nLớp 2 (Context): Cung cấp bối cảnh chi tiết và dữ liệu đầu vào thực tế.\nLớp 3 (Task): Nêu rõ mục tiêu cần đạt được kèm số lượng và tiêu chuẩn nghiệm thu.\nLớp 4 (Constraints): Đặt ranh giới những điều AI tuyệt đối KHÔNG ĐƯỢC làm.\nLớp 5 (Format): Định dạng kết quả (bảng biểu Markdown, JSON hoặc các bước hành động).',
    copy_text: 'Hãy đóng vai chuyên gia [Lĩnh vực] với 10 năm kinh nghiệm. Nhiệm vụ của bạn là [Mục tiêu cụ thể]. Bối cảnh: [Thông tin đầu vào]. Yêu cầu: Trình bày rõ ràng từng bước, có bảng so sánh và ví dụ thực tế.',
    drive_url: DRIVE_URL,
    drive_label: '☁️ Mở Kho Prompt Đầy Đủ Trên Drive',
    sort_order: 1
  },
  {
    title: 'Tận Dụng Tối Đa Gemini Pro & NotebookLM Trong Học Tập / Làm Việc',
    category: 'extension',
    badge: 'MẸO SỬ DỤNG AI',
    icon: '🧠',
    summary: 'Khi đã kích hoạt Google AI Pro, bạn được mở khóa mô hình Gemini Pro cửa sổ ngữ cảnh lớn và tích hợp trực tiếp trong Gmail, Docs, Sheets:',
    content: 'Tải lên hàng chục file PDF/Word dài hàng trăm trang để tóm tắt và tra cứu dẫn chứng chính xác.\nSử dụng Gemini ngay trong Google Docs & Gmail để soạn thảo văn bản và trả lời email tự động.\nKết hợp 2TB Google Drive lưu trữ thoải mái dữ liệu công việc và backup ảnh/video chất lượng gốc.',
    copy_text: '',
    drive_url: DRIVE_URL,
    extra_url: 'https://one.google.com',
    extra_label: '🌐 Truy cập one.google.com',
    sort_order: 2
  },
  {
    title: 'Quy Trình Sản Xuất Video Ngắn Hàng Loạt Bằng AI + Canva Pro + CapCut Pro',
    category: 'design',
    badge: 'THIẾT KẾ & VIDEO AI',
    icon: '🎬',
    summary: 'Quy trình chuẩn giúp nhà sáng tạo nội dung & MMO tạo 10–20 video TikTok/Reels/Shorts mỗi ngày chỉ trong 30 phút:',
    content: 'Bước 1: Dùng ChatGPT / Gemini xuất bảng 20 kịch bản ngắn dưới dạng bảng CSV.\nBước 2: Đưa vào tính năng Tạo hàng loạt (Bulk Create) của Canva Pro để render đồng loạt.\nBước 3: Dùng CapCut Pro tạo phụ đề AI tự động, tách nền thông minh và xuất 4K 60fps.',
    copy_text: '',
    drive_url: DRIVE_URL,
    extra_url: '',
    extra_label: '',
    sort_order: 3
  }
];

let ensured = false;

async function ensureResourcesTable() {
  if (ensured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS public.site_resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'guide',
      badge TEXT DEFAULT '',
      icon TEXT DEFAULT '📘',
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      copy_text TEXT DEFAULT '',
      drive_url TEXT DEFAULT '',
      drive_label TEXT DEFAULT '',
      extra_url TEXT DEFAULT '',
      extra_label TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Bổ sung cột nếu bảng đã tồn tại từ trước
  await query('ALTER TABLE public.site_resources ADD COLUMN IF NOT EXISTS drive_label TEXT DEFAULT \'\';');
  // Bật RLS để Supabase Security Advisor không cảnh báo.
  // Backend kết nối bằng role chủ sở hữu (postgres) nên vẫn đọc/ghi bình thường;
  // khóa anon công khai sẽ KHÔNG truy cập được bảng này qua REST API.
  await query('ALTER TABLE public.site_resources ENABLE ROW LEVEL SECURITY;');

  const countRes = await query('SELECT COUNT(*)::int AS c FROM public.site_resources;');
  if ((countRes.rows[0]?.c || 0) === 0) {
    for (const r of SEED_RESOURCES) {
      await query(`
        INSERT INTO public.site_resources
          (title, category, badge, icon, summary, content, copy_text, drive_url, extra_url, extra_label, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `, [r.title, r.category, r.badge, r.icon, r.summary, r.content, r.copy_text, r.drive_url, r.extra_url, r.extra_label, r.sort_order]);
    }
  }
  ensured = true;
}

function sanitizeUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  // Chỉ cho phép http(s) để tránh chèn javascript: vào link
  return /^https?:\/\//i.test(s) ? s.slice(0, 1000) : '';
}

function normalizeResourceInput(body) {
  const b = body || {};
  const category = ALLOWED_CATEGORIES.includes(String(b.category || '').trim()) ? String(b.category).trim() : 'guide';
  return {
    title: String(b.title || '').trim().slice(0, 300),
    category,
    badge: String(b.badge || '').trim().slice(0, 60),
    icon: String(b.icon || '📘').trim().slice(0, 16) || '📘',
    summary: String(b.summary || '').trim().slice(0, 2000),
    content: String(b.content || '').trim().slice(0, 8000),
    copy_text: String(b.copy_text || '').trim().slice(0, 4000),
    drive_url: sanitizeUrl(b.drive_url),
    drive_label: String(b.drive_label || '').trim().slice(0, 120),
    extra_url: sanitizeUrl(b.extra_url),
    extra_label: String(b.extra_label || '').trim().slice(0, 120),
    is_active: b.is_active === undefined ? true : Boolean(b.is_active),
    sort_order: parseInt(b.sort_order, 10) || 0
  };
}

module.exports = { ensureResourcesTable, normalizeResourceInput, ALLOWED_CATEGORIES };

const { query } = require('./db');

let blogEnsured = false;

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 200);
}

const SEED_BLOG_POSTS = [
  {
    title: 'So Sánh ChatGPT Plus và Google Gemini Advanced: Đâu Là Công Cụ AI Đáng Tiền Nhất Năm 2026?',
    slug: 'so-sanh-chatgpt-plus-va-google-gemini-advanced',
    summary: 'Đánh giá chi tiết điểm mạnh, điểm yếu, bảng so sánh tính năng và chi phí giữa ChatGPT Plus (GPT-4o) và Gemini Advanced (2TB Google Drive) giúp bạn chọn đúng công cụ phục vụ công việc và học tập.',
    category: 'ai-tools',
    tags: 'ChatGPT, Gemini, So sánh AI, GPT-4o, Google One AI',
    cover_image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    meta_title: 'So Sánh ChatGPT Plus và Gemini Advanced: Nên Mua Bản Nào 2026? | DNMMO',
    meta_description: 'So sánh chuyên sâu ChatGPT Plus và Google Gemini Advanced về khả năng xử lý ngữ cảnh, lập trình, viết content và chi phí mua tài khoản bản quyền tiết kiệm tại DNMMO.',
    faq_schema: JSON.stringify([
      {
        q: 'Nên mua ChatGPT Plus hay Google Gemini Advanced?',
        a: 'Nếu bạn chuyên về lập trình, viết content sâu và cần tạo Custom GPTs riêng, ChatGPT Plus (GPT-4o) là lựa chọn tối ưu. Nếu bạn cần lưu trữ 2TB Google Drive, làm việc trực tiếp trong Gmail/Docs và phân tích tài liệu PDF khổng lồ, Gemini Advanced là lựa chọn vượt trội.'
      },
      {
        q: 'Mua tài khoản ChatGPT Plus và Gemini Advanced tại DNMMO có được bảo hành không?',
        a: 'Tại DNMMO PRO (https://www.duocnguyenmmo.store), tất cả tài khoản AI đều được cam kết bảo hành 1 đổi 1 trong suốt thời gian sử dụng, hỗ trợ kỹ thuật 24/7 qua Zalo 0865 099 763.'
      }
    ]),
    content: `<h2>1. Tổng Quan Về Cuộc Đua Giữa ChatGPT Plus và Google Gemini Advanced</h2>
<p>Trong năm 2026, trí tuệ nhân tạo đã trở thành trợ lý không thể thiếu cho dân văn phòng, lập trình viên, nhà sáng tạo nội dung và học sinh sinh viên. Hai "ông lớn" dẫn đầu thị trường hiện nay chính là <strong>ChatGPT Plus</strong> của OpenAI và <strong>Gemini Advanced</strong> (thuộc gói Google One AI Premium) của Google.</p>

<h2>2. Bảng So Sánh Chi Tiết Các Tiêu Chí Cốt Lõi</h2>
<div class="overflow-x-auto my-6">
  <table class="w-full text-left border-collapse border border-slate-700">
    <thead>
      <tr class="bg-slate-800 text-emerald-400">
        <th class="p-3 border border-slate-700">Tiêu Chí</th>
        <th class="p-3 border border-slate-700">ChatGPT Plus (OpenAI)</th>
        <th class="p-3 border border-slate-700">Google Gemini Advanced</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-3 border border-slate-700 font-semibold">Mô hình AI chủ đạo</td>
        <td class="p-3 border border-slate-700">GPT-4o, GPT-4 Turbo, o1-preview</td>
        <td class="p-3 border border-slate-700">Gemini 1.5 Pro (Cửa sổ ngữ cảnh 1M-2M token)</td>
      </tr>
      <tr>
        <td class="p-3 border border-slate-700 font-semibold">Thế mạnh vượt trội</td>
        <td class="p-3 border border-slate-700">Lập trình, tư duy logic, Custom GPTs, DALL-E 3</td>
        <td class="p-3 border border-slate-700">Đọc tài liệu siêu dài, tích hợp Gmail/Docs/Drive, kèm 2TB Cloud</td>
      </tr>
      <tr>
        <td class="p-3 border border-slate-700 font-semibold">Tạo ảnh AI</td>
        <td class="p-3 border border-slate-700">DALL-E 3 tích hợp mượt mà</td>
        <td class="p-3 border border-slate-700">Imagen 3 chất lượng chân thực</td>
      </tr>
      <tr>
        <td class="p-3 border border-slate-700 font-semibold">Chi phí gốc tại hãng</td>
        <td class="p-3 border border-slate-700">20 USD/tháng (~520.000 đ)</td>
        <td class="p-3 border border-slate-700">20 USD/tháng (~520.000 đ)</td>
      </tr>
      <tr>
        <td class="p-3 border border-slate-700 font-semibold">Giá tiết kiệm tại DNMMO</td>
        <td class="p-3 border border-slate-700 text-emerald-400 font-bold">Chỉ từ 79.000 đ - 180.000 đ/tháng</td>
        <td class="p-3 border border-slate-700 text-emerald-400 font-bold">Chỉ từ 99.000 đ/tháng (Chính chủ)</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>3. Khi Nào Bạn Nên Chọn ChatGPT Plus?</h2>
<p>ChatGPT Plus là lựa chọn số 1 nếu bạn thuộc các nhóm sau:</p>
<ul>
  <li><strong>Coder / Developer:</strong> GPT-4o hiểu ngữ cảnh code sâu, debug lỗi chuẩn và hỗ trợ tái cấu trúc dự án cực kỳ chính xác.</li>
  <li><strong>Copywriter & Marketer:</strong> Khả năng tùy biến giọng văn, tạo các prompt chuyên biệt thông qua kho Custom GPTs phong phú.</li>
  <li><strong>Người dùng cần phân tích dữ liệu chuyên sâu:</strong> Tính năng Advanced Data Analysis cho phép tải file Excel/CSV và vẽ biểu đồ tự động.</li>
</ul>

<h2>4. Khi Nào Bạn Nên Chọn Google Gemini Advanced?</h2>
<p>Gemini Advanced tỏ ra vượt trội tuyệt đối trong các tình huống:</p>
<ul>
  <li><strong>Học tập và Nghiên cứu chuyên sâu:</strong> Cửa sổ ngữ cảnh lên tới 1 triệu token cho phép ném vào cả cuốn sách giáo trình dày 500 trang hoặc 10 bài báo khoa học PDF để tóm tắt và đối chiếu dẫn chứng ngay lập tức.</li>
  <li><strong>Người dùng hệ sinh thái Google:</strong> Viết nháp email tự động trong Gmail, soạn bài thuyết trình trong Google Slides và phân tích bảng tính trong Google Sheets chỉ với 1 cú click.</li>
  <li><strong>Tặng kèm 2TB Google One:</strong> Đây là giá trị cộng thêm cực lớn, bạn vừa có AI cao cấp vừa giải quyết triệt để vấn đề đầy bộ nhớ điện thoại và Google Drive.</li>
</ul>

<h2>5. Kết Luận & Lời Khuyên Mua Tài Khoản Tiết Kiệm</h2>
<p>Cả hai công cụ đều là đỉnh cao công nghệ hiện nay. Nếu ngân sách cho phép, việc kết hợp cả hai sẽ mang lại hiệu suất làm việc gấp 10 lần. Để tiết kiệm chi phí tối đa, bạn có thể tham khảo các gói bản quyền chính chủ, bảo hành 1 đổi 1 tại <strong>DNMMO PRO (https://www.duocnguyenmmo.store)</strong> với mức giá ưu đãi hơn 60% so với giá niêm yết quốc tế.</p>`
  },
  {
    title: 'Quy Trình Chuẩn Tạo 20 Video Ngắn Mỗi Ngày Bằng Canva Pro và CapCut Pro Cho Dân MMO',
    slug: 'quy-trinh-tao-video-ngan-bang-canva-pro-va-capcut-pro',
    summary: 'Hướng dẫn từng bước kết hợp tính năng Bulk Create (Tạo hàng loạt) của Canva Pro cùng phụ đề tự động thông minh của CapCut Pro để xây kênh TikTok, Reels, Shorts lên xu hướng nhanh chóng.',
    category: 'tips',
    tags: 'Canva Pro, CapCut Pro, Video ngắn, TikTok, Reels, Bulk Create',
    cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    meta_title: 'Tạo 20 Video Ngắn Mỗi Ngày Bằng Canva Pro & CapCut Pro | DNMMO',
    meta_description: 'Quy trình sản xuất video ngắn hàng loạt bằng tính năng Bulk Create của Canva Pro và CapCut Pro. Tiết kiệm 80% thời gian làm video TikTok, Reels và YouTube Shorts.',
    faq_schema: JSON.stringify([
      {
        q: 'Tính năng Bulk Create trong Canva Pro là gì?',
        a: 'Bulk Create (Tạo hàng loạt) là tính năng độc quyền của Canva Pro cho phép nạp bảng dữ liệu CSV chứa hàng chục kịch bản hoặc câu danh ngôn, Canva sẽ tự động kết xuất thành hàng chục thiết kế/video độc lập chỉ trong 30 giây.'
      },
      {
        q: 'Canva Pro tại DNMMO có được dùng trên chính email cá nhân không?',
        a: 'Có, tài khoản Canva Pro tại DNMMO được kích hoạt trực tiếp trên chính email cá nhân của bạn, giữ nguyên toàn bộ thiết kế cũ và không ảnh hưởng đến quyền riêng tư.'
      }
    ]),
    content: `<h2>1. Xu Hướng Video Ngắn (Shorts/Reels/TikTok) Trong Năm 2026</h2>
<p>Video dạng ngắn dưới 60 giây tiếp tục là định dạng giữ chân người xem tốt nhất trên các nền tảng mạng xã hội. Tuy nhiên, rào cản lớn nhất của các nhà sáng tạo nội dung và dân làm Affiliate/MMO là <strong>tốc độ sản xuất video</strong>. Nếu làm thủ công từng video, bạn sẽ mất từ 1–2 tiếng cho mỗi sản phẩm.</p>

<h2>2. Bộ Đôi Công Cụ "Sát Thủ": Canva Pro + CapCut Pro</h2>
<p>Bằng cách kết hợp tính năng <strong>Tạo hàng loạt (Bulk Create)</strong> của Canva Pro cùng khả năng <strong>tự động nhận diện phụ đề & tách nền thông minh</strong> của CapCut Pro, bạn có thể hoàn thành 20 video ngắn chỉ trong vòng 30 phút.</p>

<h2>3. Hướng Dẫn Từng Bước Thực Hiện</h2>
<h3>Bước 1: Chuẩn bị 20 kịch bản bằng ChatGPT / Gemini</h3>
<p>Dùng prompt sau để xuất bảng kịch bản dạng bảng:</p>
<pre class="bg-slate-900 p-4 rounded-xl text-emerald-300 font-mono text-xs overflow-x-auto">Hãy viết cho tôi 20 mẹo ngắn hữu ích về [Chủ đề của bạn]. Trình bày dưới dạng bảng gồm 2 cột: Cột 1 là "Tieu_de", Cột 2 là "Noi_dung_meo". Mỗi mẹo không quá 30 từ.</pre>
<p>Sau đó copy bảng vào Google Sheets và tải xuống dưới dạng file <strong>.CSV</strong>.</p>

<h3>Bước 2: Nạp dữ liệu vào Canva Pro bằng tính năng Bulk Create</h3>
<ul>
  <li>Mở Canva Pro, chọn mẫu thiết kế <strong>Video TikTok (1080 x 1920 px)</strong>.</li>
  <li>Chọn một video nền phù hợp từ kho tài nguyên hàng triệu video bản quyền của Canva Pro.</li>
  <li>Tại thanh công cụ bên trái, chọn <strong>Ứng dụng (Apps) -> Tạo hàng loạt (Bulk Create)</strong>.</li>
  <li>Tải file CSV vừa tạo lên, liên kết trường dữ liệu vào khung văn bản trên video.</li>
  <li>Bấm <strong>Tạo hàng loạt</strong>, Canva Pro sẽ tự động render ra 20 trang video độc lập ngay lập tức!</li>
</ul>

<h3>Bước 3: Hoàn thiện âm thanh và hiệu ứng với CapCut Pro</h3>
<ul>
  <li>Tải các video từ Canva về và mở trong CapCut Pro.</li>
  <li>Bật tính năng <strong>Phụ đề tự động (Auto Captions)</strong> để CapCut Pro tạo phụ đề chạy từng chữ theo giọng đọc với hiệu ứng bắt mắt.</li>
  <li>Áp dụng các bộ lọc màu chuẩn điện ảnh và âm nhạc thịnh hành.</li>
  <li>Xuất video chuẩn <strong>4K 60fps</strong> để thuật toán TikTok và Reels phân phối chất lượng hiển thị sắc nét nhất.</li>
</ul>

<h2>4. Lời Khuyên Về Bản Quyền Công Cụ</h2>
<p>Để quy trình không bị gián đoạn do giới hạn tính năng hay watermark logo, việc trang bị <strong>Canva Pro chính chủ</strong> và <strong>CapCut Pro</strong> là khoản đầu tư cực kỳ tiết kiệm nhưng sinh lời cao cho bất kỳ ai làm MMO và sáng tạo nội dung. Tại DNMMO PRO, bạn có thể đăng ký Canva Pro chính chủ chỉ với vài chục nghìn đồng mỗi tháng.</p>`
  },
  {
    title: 'Tại Sao Không Nên Dùng Bản Crack / Miễn Phí Cho Công Cụ AI Và Đồ Họa?',
    slug: 'tai-sao-khong-nen-dung-ban-crack-cong-cu-ai',
    summary: 'Phân tích các rủi ro nguy hiểm về rò rỉ dữ liệu cá nhân, đánh cắp mã thẻ ngân hàng khi cài phần mềm crack, và lý do giải pháp mua tài khoản bản quyền giá rẻ tại DNMMO là lựa chọn thông minh nhất.',
    category: 'guides',
    tags: 'Bảo mật, Bản quyền, Phần mềm crack rủi ro, Tài khoản giá rẻ uy tín',
    cover_image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    meta_title: 'Rủi Ro Phần Mềm Crack & Lợi Ích Dùng Bản Quyền AI | DNMMO',
    meta_description: 'Cảnh báo nguy cơ mã độc, rò rỉ mật khẩu từ các bản crack công cụ AI. Hướng dẫn giải pháp mua bản quyền chính hãng tiết kiệm và bảo hành an toàn tại DNMMO PRO.',
    faq_schema: JSON.stringify([
      {
        q: 'Công cụ AI như ChatGPT hay Claude có bản crack không?',
        a: 'Không thể crack ChatGPT, Claude hay Gemini vì mô hình AI chạy 100% trên cụm máy chủ đám mây của OpenAI, Google, Anthropic. Các file crack trên mạng thực chất là mã độc trojan đánh cắp cookie trình duyệt và mật khẩu ngân hàng của bạn.'
      },
      {
        q: 'Mua tài khoản bản quyền tại DNMMO có an toàn không?',
        a: 'Hoàn toàn an toàn. DNMMO kích hoạt tài khoản chuẩn chính sách gia đình hoặc tài khoản thanh toán thẻ quốc tế hợp lệ, cam kết không can thiệp vào máy tính khách hàng và bảo hành xuyên suốt thời hạn.'
      }
    ]),
    content: `<h2>1. Ảo Tưởng Về "Bản Crack" Các Công Cụ Trí Tuệ Nhân Tạo</h2>
<p>Rất nhiều người dùng tìm kiếm trên Google cụm từ *"Tải ChatGPT Plus crack"* hoặc *"CapCut Pro full crack việt hóa"*. Tuy nhiên, về mặt kỹ thuật, <strong>các mô hình AI như GPT-4o, Claude 3.5 Sonnet hay Gemini Pro đều hoạt động trên hạ tầng điện toán đám mây khổng lồ của các tập đoàn công nghệ</strong>. Bạn không thể crack máy chủ của OpenAI hay Google bằng một phần mềm cài trên máy tính cá nhân.</p>

<h2>2. Những Cạm Bẫy Nguy Hiểm Đằng Sau Các File Miễn Phí Trên Mạng</h2>
<ul>
  <li><strong>Mã độc đánh cắp Cookie & Mật khẩu (RedLine Stealer):</strong> Hầu hết các file được quảng cáo là "bản crack" hoặc "cookie dùng chung vĩnh viễn" đều đính kèm mã độc. Khi bạn mở file, toàn bộ tài khoản Facebook, Zalo, Telegram và mật khẩu lưu trong trình duyệt sẽ bị gửi về máy chủ tin tặc.</li>
  <li><strong>Khóa tài khoản vĩnh viễn:</strong> Việc sử dụng các thủ thuật cheat/mod vi phạm nghiêm trọng chính sách dịch vụ của OpenAI và Canva, khiến tài khoản và dữ liệu thiết kế quan trọng của bạn có thể bị xóa sổ trong chớp mắt.</li>
  <li><strong>Không thể cập nhật tính năng mới:</strong> Thế giới AI thay đổi từng tuần. Dùng bản lậu đồng nghĩa bạn bị tụt hậu so với đối thủ đang ứng dụng các mô hình AI mới nhất.</li>
</ul>

<h2>3. Giải Pháp Thông Minh: Bản Quyền Giá Tốt, Bảo Hành 1 Đổi 1</h2>
<p>Thay vì mạo hiểm bảo mật thông tin tài chính và dữ liệu cá nhân, giải pháp thông minh của hàng ngàn bạn làm văn phòng và MMO hiện nay là sử dụng dịch vụ cung cấp bản quyền số uy tín tại <strong>DNMMO PRO (https://www.duocnguyenmmo.store)</strong>:</p>
<ul>
  <li>Chi phí cực kỳ hợp lý, chỉ bằng 1 ly cà phê mỗi tuần.</li>
  <li>Kích hoạt chính sách gia đình hoặc tài khoản trả phí hợp pháp.</li>
  <li>Đội ngũ kỹ thuật viên hỗ trợ nhiệt tình, bảo hành 1 đổi 1 nhanh chóng qua Zalo 0865 099 763.</li>
</ul>`
  }
];

async function ensureBlogTable() {
  if (blogEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS public.blog_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      category TEXT DEFAULT 'ai-tools',
      tags TEXT DEFAULT '',
      author TEXT DEFAULT 'Được Nguyễn (DNMMO)',
      meta_title TEXT DEFAULT '',
      meta_description TEXT DEFAULT '',
      faq_schema JSONB DEFAULT '[]'::jsonb,
      related_plan_id UUID,
      is_published BOOLEAN DEFAULT true,
      views INTEGER DEFAULT 0,
      published_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Bật RLS bảo mật Supabase
  await query('ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;');

  // Seed bài viết mẫu nếu bảng còn trống
  const countRes = await query('SELECT COUNT(*)::int as c FROM public.blog_posts;');
  if ((countRes.rows[0]?.c || 0) === 0) {
    for (const post of SEED_BLOG_POSTS) {
      await query(`
        INSERT INTO public.blog_posts 
          (title, slug, summary, content, cover_image, category, tags, meta_title, meta_description, faq_schema, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, true)
        ON CONFLICT (slug) DO NOTHING;
      `, [
        post.title, post.slug, post.summary, post.content, post.cover_image,
        post.category, post.tags, post.meta_title, post.meta_description, post.faq_schema
      ]);
    }
  }

  blogEnsured = true;
}

function normalizeBlogInput(body) {
  const b = body || {};
  const title = String(b.title || '').trim().slice(0, 300);
  let slug = slugify(b.slug || title);
  if (!slug) slug = 'bai-viet-' + Date.now();

  let faq = [];
  try {
    if (typeof b.faq_schema === 'string') {
      faq = JSON.parse(b.faq_schema);
    } else if (Array.isArray(b.faq_schema)) {
      faq = b.faq_schema;
    }
  } catch (e) {
    faq = [];
  }

  return {
    title,
    slug,
    summary: String(b.summary || '').trim().slice(0, 2000),
    content: String(b.content || '').trim().slice(0, 50000),
    cover_image: String(b.cover_image || '').trim().slice(0, 1000),
    category: String(b.category || 'ai-tools').trim().slice(0, 50),
    tags: String(b.tags || '').trim().slice(0, 200),
    author: String(b.author || 'Được Nguyễn (DNMMO)').trim().slice(0, 100),
    meta_title: String(b.meta_title || title).trim().slice(0, 200),
    meta_description: String(b.meta_description || b.summary || '').trim().slice(0, 500),
    faq_schema: JSON.stringify(faq),
    related_plan_id: b.related_plan_id || null,
    is_published: b.is_published === undefined ? true : Boolean(b.is_published)
  };
}

module.exports = { ensureBlogTable, slugify, normalizeBlogInput };

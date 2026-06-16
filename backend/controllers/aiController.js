const { GoogleGenerativeAI } = require('@google/generative-ai');
const { poolPromise } = require('../db');

// Lay du lieu tu DB (san pham, tho sua chua, dich vu, thong tin he thong)
const getStoreData = async () => {
  try {
    const pool = await poolPromise;

    // San pham dang ban (active, con hang) - dung dung ten cot trong DB
    let products = [];
    try {
      const productsResult = await pool.request().query(`
        SELECT 
          p.id,
          p.title,
          p.listed_price,
          p.ai_condition,
          p.ai_min_price,
          p.ai_max_price,
          p.stock,
          pc.category_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.status = 'active' AND p.stock > 0
        ORDER BY p.created_at DESC
      `);
      products = productsResult.recordset;
    } catch (e) {
      console.warn('Khong lay duoc products:', e.message);
    }

    // Tho sua chua dang san sang
    let technicians = [];
    try {
      const techResult = await pool.request().query(`
        SELECT full_name, phone, experience_years, rating_avg, is_available, total_repairs, skills
        FROM v_technician_info
        WHERE is_available = 1
      `);
      technicians = techResult.recordset;
    } catch (e) {
      console.warn('View v_technician_info khong ton tai, bo qua.');
    }

    // Dich vu sua chua
    let services = [];
    try {
      const svcResult = await pool.request().query(`
        SELECT category_name, description FROM service_categories
      `);
      services = svcResult.recordset;
    } catch (e) {
      console.warn('Bang service_categories khong ton tai, bo qua.');
    }

    // Thong tin he thong
    let systemInfo = {};
    try {
      const sysResult = await pool.request().query(`
        SELECT system_name, founder_name, support_email, hotline, description
        FROM system_info
      `);
      systemInfo = sysResult.recordset[0] || {};
    } catch (e) {
      console.warn('Bang system_info khong ton tai, bo qua.');
    }

    // 16 danh muc san pham + so luong con hang + khoang gia
    let categories = [];
    try {
      const catResult = await pool.request().query(`
        SELECT 
          pc.category_name,
          COUNT(CASE WHEN p.status = 'active' AND p.stock > 0 THEN 1 END) AS available_products,
          MIN(CASE WHEN p.status = 'active' AND p.stock > 0 THEN p.listed_price END) AS price_from,
          MAX(CASE WHEN p.status = 'active' AND p.stock > 0 THEN p.listed_price END) AS price_to
        FROM product_categories pc
        LEFT JOIN products p ON p.category_id = pc.id
        GROUP BY pc.id, pc.category_name
        ORDER BY pc.id
      `);
      categories = catResult.recordset;
    } catch (e) {
      console.warn('Khong lay duoc categories:', e.message);
    }

    // Thong ke tong quan
    let stats = {};
    try {
      const statsResult = await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM products WHERE status='active' AND stock>0) AS total_active_products,
          (SELECT COUNT(*) FROM products) AS total_products,
          (SELECT COUNT(*) FROM technician_profiles WHERE is_available=1) AS available_technicians
      `);
      stats = statsResult.recordset[0] || {};
    } catch (e) {
      console.warn('Khong lay duoc stats:', e.message);
    }

    return { products, technicians, services, systemInfo, categories, stats };
  } catch (err) {
    console.error('Loi getStoreData:', err.message);
    return { products: [], technicians: [], services: [], systemInfo: {}, categories: [], stats: {} };
  }
};

exports.chatWithAI = async (req, res) => {
  try {
    const { history, message } = req.body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chua cau hinh API key' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Lay du lieu cua hang tu DB
    const storeData = await getStoreData();

    // Format danh muc
    const categoriesText = storeData.categories.length > 0
      ? storeData.categories.map(cat => {
          const hasStock = cat.available_products > 0;
          const priceRange = hasStock
            ? ` | Gia tu ${Number(cat.price_from).toLocaleString('vi-VN')}d - ${Number(cat.price_to).toLocaleString('vi-VN')}d`
            : ' | Hien chua co hang';
          return `- ${cat.category_name}: ${cat.available_products} san pham con hang${priceRange}`;
        }).join('\n')
      : 'Chua co danh muc.';

    // Format san pham
    const productsText = storeData.products.length > 0
      ? storeData.products.map(p =>
          `[*] ${p.title} | Danh muc: ${p.category_name || 'Do dien tu'} | Gia: ${Number(p.listed_price).toLocaleString('vi-VN')}d | Tinh trang: ${p.ai_condition || 'Khong ro'} | Khoang gia AI: ${Number(p.ai_min_price).toLocaleString('vi-VN')}d - ${Number(p.ai_max_price).toLocaleString('vi-VN')}d | Con ${p.stock ?? 0} cai`
        ).join('\n')
      : 'Hien chua co san pham nao.';

    // Format tho
    const techniciansText = storeData.technicians.length > 0
      ? storeData.technicians.map(t =>
          `[*] ${t.full_name} | DT: ${t.phone} | ${t.experience_years} nam KN | Danh gia: ${t.rating_avg}/5 | Ky nang: ${t.skills}`
        ).join('\n')
      : 'Hien khong co tho ranh.';

    // Format dich vu
    const servicesText = storeData.services.length > 0
      ? storeData.services.map(s => `- ${s.category_name}: ${s.description}`).join('\n')
      : 'Xem them tren website.';

    const hotline = storeData.systemInfo.hotline || 'lien he qua website';

    const context = `
=== THONG TIN TECHCYCLE ===
Ten: ${storeData.systemInfo.system_name || 'TechCycle'}
Hotline: ${hotline}
Email: ${storeData.systemInfo.support_email || ''}
Mo ta: ${storeData.systemInfo.description || 'Nen tang mua ban va sua chua thiet bi dien tu cu'}

=== TONG QUAN HE THONG ===
San pham dang ban (con hang): ${storeData.stats.total_active_products || 0}
Tong san pham: ${storeData.stats.total_products || 0}
Tho san sang nhan viec: ${storeData.stats.available_technicians || 0}

=== 16 DANH MUC SAN PHAM (kem so luong & gia) ===
${categoriesText}

=== SAN PHAM DANG BAN (CHI TIET) ===
${productsText}

=== THO SUA CHUA SAN SANG ===
${techniciansText}

=== DICH VU SUA CHUA HO TRO ===
${servicesText}

=== QUY TAC TU VAN ===
1. Tu van gia dua tren listed_price (gia thuc te). AI goi y khoang ai_min_price - ai_max_price.
2. Neu khach hoi danh muc nao -> cho biet so san pham va khoang gia theo bang danh muc tren.
3. Neu danh muc chua co hang -> bao khach va goi y danh muc khac dang co hang.
4. Khi tu van sua chua -> gioi thieu tho phu hop theo ky nang (skills).
5. Khach muon dat lich sua -> huong dan goi hotline: ${hotline}.
6. Khach chot mua hoac can ho tro -> xin so dien thoai de lien lac.
7. Luon tra loi bang tieng Viet, lich su va chuyen nghiep.
8. Khong bia them thong tin ngoai du lieu duoc cung cap.
    `;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `Ban la tro ly ao AI cua TechCycle - nen tang mua ban do cu va sua chua thiet bi cong nghe.\n${context}`
    });

    // Ho tro ca 2 kieu goi: history (tu ChatBot.jsx) hoac message don gian
    if (Array.isArray(history) && history.length > 0) {
      const formattedHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const chat = model.startChat({ history: formattedHistory.slice(0, -1) });
      const result = await chat.sendMessage(
        formattedHistory[formattedHistory.length - 1].parts[0].text
      );

      return res.json({ reply: result.response.text() });
    }

    // Che do single message (tuong thich nguoc)
    if (message) {
      const result = await model.generateContent(message);
      return res.json({ text: result.response.text() });
    }

    return res.status(400).json({ error: 'Thieu message hoac history' });

  } catch (error) {
    console.error('AI Chat Error:', JSON.stringify(error.message));
    res.status(500).json({
      message: 'Loi ket noi AI.',
      error: error.message
    });
  }
};

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sql from 'mssql';

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
    console.error("LỖI: Chưa cấu hình GEMINI_API_KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        instanceName: process.env.DB_INSTANCE || undefined,
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    }
};
// Chỉ dùng port khi không có instanceName
if (!process.env.DB_INSTANCE) {
    dbConfig.port = parseInt(process.env.DB_PORT) || 1433;
}

const getStoreData = async () => {
    try {
        const pool = await sql.connect(dbConfig);

        // Sản phẩm active còn hàng (qua view)
        const productsResult = await pool.request().query(`
            SELECT 
                id,
                title,
                listed_price,
                ai_condition,
                ai_min_price,
                ai_max_price,
                category_name,
                seller_name
            FROM v_active_products
            ORDER BY created_at DESC
        `);

        // Thợ sửa chữa sẵn sàng (qua view)
        const techniciansResult = await pool.request().query(`
            SELECT 
                full_name,
                phone,
                experience_years,
                rating_avg,
                is_available,
                total_repairs,
                skills
            FROM v_technician_info
            WHERE is_available = 1
        `);

        // Dịch vụ sửa chữa
        const servicesResult = await pool.request().query(`
            SELECT category_name, description 
            FROM service_categories
        `);

        // Thông tin hệ thống
        const systemResult = await pool.request().query(`
            SELECT system_name, founder_name, support_email, hotline, description
            FROM system_info
        `);

        // 16 danh mục sản phẩm + số lượng sản phẩm còn hàng
        const categoriesResult = await pool.request().query(`
            SELECT 
                pc.category_name,
                pc.description,
                COUNT(p.id) AS total_products,
                COUNT(CASE WHEN p.status = 'active' AND p.stock > 0 THEN 1 END) AS available_products,
                MIN(p.listed_price) AS price_from,
                MAX(p.listed_price) AS price_to
            FROM product_categories pc
            LEFT JOIN products p ON p.category_id = pc.id
            GROUP BY pc.id, pc.category_name, pc.description
            ORDER BY pc.id
        `);

        // Tổng quan số liệu
        const statsResult = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM products WHERE status='active' AND stock>0) AS total_active_products,
                (SELECT COUNT(*) FROM products) AS total_products,
                (SELECT COUNT(*) FROM technician_profiles WHERE is_available=1) AS available_technicians,
                (SELECT COUNT(*) FROM repair_bookings WHERE status NOT IN ('completed','cancelled')) AS active_bookings
        `);

        await sql.close();

        return {
            products: productsResult.recordset,
            technicians: techniciansResult.recordset,
            services: servicesResult.recordset,
            systemInfo: systemResult.recordset[0] || {},
            categories: categoriesResult.recordset,
            stats: statsResult.recordset[0] || {}
        };
    } catch (err) {
        console.error("Lỗi kết nối SQL:", err.message);
        return { products: [], technicians: [], services: [], systemInfo: {}, categories: [], stats: {} };
    }
};

app.post('/api/chat', async (req, res) => {
    try {
        const { history } = req.body;

        const storeData = await getStoreData();

        const context = `
=== THÔNG TIN TECHCYCLE ===
Tên nền tảng: ${storeData.systemInfo.system_name || 'TechCycle'}
Hotline: ${storeData.systemInfo.hotline || 'Liên hệ admin'}
Email hỗ trợ: ${storeData.systemInfo.support_email}
Mô tả: ${storeData.systemInfo.description}

=== TỔNG QUAN HỀ THỐNG ===
Sản phẩm đang bán (còn hàng): ${storeData.stats.total_active_products || 0}
Tổng sản phẩm: ${storeData.stats.total_products || 0}
Thợ sẵn sàng nhận việc: ${storeData.stats.available_technicians || 0}
Lịch sửa đang xử lý: ${storeData.stats.active_bookings || 0}

=== 16 DANH MỤC SẢN PHẨM (kèm số lượng & giá) ===
${storeData.categories.map(cat =>
            `- ${cat.category_name}: ${cat.available_products} sản phẩm còn hàng` +
            (cat.available_products > 0 ? ` | Giá từ ${Number(cat.price_from).toLocaleString('vi-VN')}đ — ${Number(cat.price_to).toLocaleString('vi-VN')}đ` : ' | Hiện chưa có hàng')
        ).join('\n')}

=== SẢN PHẨM ĐANG BÁN (CHI TIẺT) ===
${storeData.products.map(p =>
            `[•] ${p.title} | Danh mục: ${p.category_name} | Giá: ${Number(p.listed_price).toLocaleString('vi-VN')}đ | Tình trạng AI: ${p.ai_condition} | Khoảng giá AI: ${Number(p.ai_min_price).toLocaleString('vi-VN')}đ — ${Number(p.ai_max_price).toLocaleString('vi-VN')}đ`
        ).join('\n') || 'Hiện chưa có sản phẩm nào.'}

=== THỢ SỮA CHỮA SẴN SÀNG ===
${storeData.technicians.map(t =>
            `[•] ${t.full_name} | ĐT: ${t.phone} | ${t.experience_years} năm KN | Đánh giá: ${t.rating_avg}/5 | Kỹ năng: ${t.skills}`
        ).join('\n') || 'Hiện không có thợ rảnh.'}

=== DỊCH VỤ SỬA CHỮA HỘ TRỢ ===
${storeData.services.map(s => `- ${s.category_name}: ${s.description}`).join('\n')}

=== QUY TẮC TƯ VẤN ===
1. Tư vấn giá dựa trên listed_price (đây là giá thực tế). AI gợi ý khoảng ai_min_price — ai_max_price.
2. Nếu khách hỏi danh mục nào → cho biết số sản phẩm và khoảng giá hiện có.
3. Nếu danh mục hiện chưa có hàng → báo khách và gợi ý xem các danh mục khác có hàng.
4. Khi tư vấn sửa chữa → giới thiệu thợ phù hợp theo kỹ năng (skills).
5. Khách muốn đặt lịch sửa → hướng dẫn gọi hotline: ${storeData.systemInfo.hotline} hoặc lên web.
6. Khách chốt mua hoặc cần hỗ trợ thêm → xin số điện thoại để liên lạc.
7. Luôn trả lời bằng tiếng Việt, lịch sự, nhiệt tình và chuyên nghiệp.
8. Không địa ra thông tin nằm ngoài dữ liệu được cung cấp.
        `;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `Bạn là trợ lý ảo AI của TechCycle — nền tảng mua bán đồ cũ và sửa chữa thiết bị công nghệ.\n${context}`
        });

        const formattedHistory = Array.isArray(history)
            ? history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }))
            : [];

        if (formattedHistory.length === 0) {
            return res.status(400).json({ error: "Thiếu lịch sử chat" });
        }

        const chat = model.startChat({ history: formattedHistory.slice(0, -1) });
        const result = await chat.sendMessage(
            formattedHistory[formattedHistory.length - 1].parts[0].text
        );

        res.json({ reply: result.response.text() });

    } catch (error) {
        console.error("Lỗi:", error.message);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
});

app.listen(3001, () => console.log('✅ Chatbot server chạy tại http://localhost:3001'));

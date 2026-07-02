import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

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
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    }
};

let pool;

const initDB = async () => {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to SQL Server');
};

const getStoreData = async () => {
    try {
        const productsResult = await pool.request().query(`
            SELECT 
                id, title, listed_price, ai_condition,
                ai_min_price, ai_max_price, category_name, seller_name
            FROM v_active_products
            ORDER BY created_at DESC
        `);

        const techniciansResult = await pool.request().query(`
            SELECT 
                full_name, phone, experience_years,
                rating_avg, is_available, total_repairs, skills
            FROM v_technician_info
            WHERE is_available = 1
        `);

        const servicesResult = await pool.request().query(`
            SELECT category_name, description 
            FROM service_categories
        `);

        const systemResult = await pool.request().query(`
            SELECT system_name, founder_name, support_email, hotline, description
            FROM system_info
        `);

        return {
            products: productsResult.recordset,
            technicians: techniciansResult.recordset,
            services: servicesResult.recordset,
            systemInfo: systemResult.recordset[0] || {}
        };
    } catch (err) {
        console.error("Lỗi query:", err.message);
        return { products: [], technicians: [], services: [], systemInfo: {} };
    }
};


app.post('/api/chat', async (req, res) => {
    try {
        const { history } = req.body;

        const storeData = await getStoreData();

        // ✅ DEBUG LOG — kiểm tra số sản phẩm thực tế lấy từ SQL
        console.log("🔍 Số sản phẩm thực tế lấy từ SQL:", storeData.products.length);

        const context = `
=== THÔNG TIN TECHCYCLE ===
Tên: ${storeData.systemInfo.system_name}
Hotline: ${storeData.systemInfo.hotline}
Email: ${storeData.systemInfo.support_email}
Mô tả: ${storeData.systemInfo.description}

=== TỔNG SỐ SẢN PHẨM ĐANG BÁN: ${storeData.products.length} sản phẩm ===

=== SẢN PHẨM ĐANG BÁN (CÒN HÀNG) ===
${JSON.stringify(storeData.products, null, 2)}

=== THỢ SỬA CHỮA ĐANG SẴN SÀNG ===
${JSON.stringify(storeData.technicians, null, 2)}

=== DỊCH VỤ SỬA CHỮA HỖ TRỢ ===
${JSON.stringify(storeData.services, null, 2)}

=== QUY TẮC TƯ VẤN ===
1. Tư vấn giá dựa trên listed_price (giá niêm yết thực tế).
2. AI đã định giá khoảng ai_min_price đến ai_max_price để tham khảo.
3. Nếu khách hỏi sản phẩm không có trong danh sách → báo hiện chưa có hàng.
4. Khi tư vấn sửa chữa → giới thiệu thợ phù hợp theo kỹ năng (skills).
5. Nếu khách muốn đặt lịch → hướng dẫn liên hệ hotline: ${storeData.systemInfo.hotline}
6. Luôn trả lời bằng tiếng Việt, lịch sự và chuyên nghiệp.
7. Nếu khách chốt mua hoặc cần hỗ trợ thêm → xin số điện thoại.
8. BẮT BUỘC: mỗi khi nhắc tên sản phẩm, PHẢI viết theo định dạng link markdown CHÍNH XÁC: [Tên sản phẩm](#product-ID), trong đó ID LẤY ĐÚNG từ trường "id" trong dữ liệu JSON của ĐÚNG sản phẩm đang nói tới. TUYỆT ĐỐI không lấy nhầm id của sản phẩm khác cùng tên. Ví dụ nếu sản phẩm có id=50, title="iPhone 14 Pro Max 256GB" thì viết: [iPhone 14 Pro Max 256GB](#product-50)
9. Nếu khách hỏi tổng số sản phẩm, trả lời CHÍNH XÁC bằng số ${storeData.products.length}.
        `;
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite",
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

        const rawReply = result.response.text();

        res.json({ reply: rawReply });

    } catch (error) {
        console.error("Lỗi:", error.message);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
});

initDB()
    .then(() => {
        app.listen(3001, () => console.log('✅ Chatbot server chạy tại http://localhost:3001'));
    })
    .catch(err => {
        console.error('❌ Không thể kết nối SQL Server:', err.message);
        process.exit(1);
    });
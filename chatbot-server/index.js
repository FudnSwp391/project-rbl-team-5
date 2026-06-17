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
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        instanceName: process.env.DB_INSTANCE || undefined,
    }
};

const getStoreData = async () => {
    try {
        const pool = await sql.connect(dbConfig);

        // Dùng view có sẵn — sản phẩm active, còn hàng
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

        // Dùng view có sẵn — thợ sửa chữa + kỹ năng
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

        // Danh mục sửa chữa
        const servicesResult = await pool.request().query(`
            SELECT category_name, description 
            FROM service_categories
        `);

        // Thông tin hệ thống
        const systemResult = await pool.request().query(`
            SELECT system_name, founder_name, support_email, hotline, description
            FROM system_info
        `);

        await sql.close();

        return {
            products: productsResult.recordset,
            technicians: techniciansResult.recordset,
            services: servicesResult.recordset,
            systemInfo: systemResult.recordset[0] || {}
        };
    } catch (err) {
        console.error("Lỗi kết nối SQL:", err.message);
        return { products: [], technicians: [], services: [], systemInfo: {} };
    }
};

app.post('/api/chat', async (req, res) => {
    try {
        const { history } = req.body;

        const storeData = await getStoreData();

        const context = `
=== THÔNG TIN TECHCYCLE ===
Tên: ${storeData.systemInfo.system_name}
Hotline: ${storeData.systemInfo.hotline}
Email: ${storeData.systemInfo.support_email}
Mô tả: ${storeData.systemInfo.description}

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

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
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        instanceName: process.env.DB_INSTANCE || undefined,
    }
};

let pool;

const initDB = async () => {
    pool = await sql.connect(dbConfig);
    console.log("✅ Connected to SQL Server");
};

// 1. Hàm truy vấn thông tin cửa hàng cho Chatbot bán hàng
const getStoreData = async () => {
    try {
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

        return {
            products: productsResult.recordset,
            technicians: techniciansResult.recordset,
            services: servicesResult.recordset,
            systemInfo: systemResult.recordset[0] || {}
        };
    } catch (err) {
        console.error("Lỗi truy vấn SQL (getStoreData):", err.message);
        return { products: [], technicians: [], services: [], systemInfo: {} };
    }
};

// 2. Hàm truy vấn Database để lấy dữ liệu sửa chữa cho Chatbot chẩn đoán
async function fetchSolutionFromDB(keyword) {
    try {
        const result = await pool.request()
            .input('keyword', sql.NVarChar, `%${keyword}%`)
            .query(`
                SELECT TOP 1 solution 
                FROM repair_knowledge 
                WHERE keywords LIKE @keyword OR issue_prompt LIKE @keyword
            `);

        return result.recordset.length > 0 ? result.recordset[0].solution : null;
    } catch (err) {
        console.error("❌ Lỗi truy vấn SQL (fetchSolutionFromDB):", err.message);
        return null;
    }
}

// Endpoint 1: Chatbot tư vấn bán hàng & dịch vụ chung
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
        console.error("Lỗi API chat:", error.message);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
});

// Endpoint 2: Chatbot chẩn đoán lỗi sửa chữa (được tích hợp từ chatbot-server2)
app.post('/api/chat/repair', async (req, res) => {
    try {
        const { history } = req.body;

        const formattedHistory = Array.isArray(history)
            ? history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
              }))
            : [];

        if (formattedHistory.length === 0) {
            return res.status(400).json({ error: "Thiếu lịch sử chat" });
        }

        const lastMessage = formattedHistory[formattedHistory.length - 1].parts[0].text;

        // Lấy dữ liệu giải pháp sửa chữa từ database dựa trên câu hỏi cuối cùng
        const dbData = await fetchSolutionFromDB(lastMessage);

        let systemPrompt = "";
        if (dbData) {
            console.log("🟢 Đã tìm thấy tài liệu trong Database! Đang nạp cho AI...");
            systemPrompt = `Bạn là trợ lý kỹ thuật của hệ thống TechCycle. 
Dưới đây là tài liệu hướng dẫn sửa chữa chính thức từ công ty:
"${dbData}"

YÊU CẦU QUAN TRỌNG: 
- Hãy dựa 100% vào tài liệu trên để trả lời khách hàng.
- Trả lời thân thiện, chuyên nghiệp, các bước rõ ràng.`;
        } else {
            console.log("⚪ Không tìm thấy dữ liệu trong DB. AI sẽ trả lời bằng kiến thức mặc định.");
            systemPrompt = "Bạn là trợ lý AI thân thiện của TechCycle. Hãy tư vấn khách hàng mang thiết bị ra trung tâm kiểm tra do lỗi này khá phức tạp.";
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
            contents: formattedHistory,
            generationConfig: {
                temperature: 0.2 // Thấp để AI bám sát dữ liệu sửa chữa
            }
        });

        res.json({ reply: result.response.text() });
    } catch (error) {
        console.error("❌ Lỗi API Chat Repair:", error.message);
        res.status(500).json({ error: "Có lỗi xảy ra trong quá trình xử lý chẩn đoán" });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', services: ['general_chat', 'repair_chat'], model: 'gemini-2.5-flash' });
});

// Khởi chạy cơ sở dữ liệu và Express server
initDB()
    .then(() => {
        app.listen(3001, () => {
            console.log('✅ Chatbot Server đã được hợp nhất chạy tại http://localhost:3001');
            console.log('   - POST http://localhost:3001/api/chat (Tư vấn bán hàng)');
            console.log('   - POST http://localhost:3001/api/chat/repair (Chẩn đoán lỗi)');
            console.log('   - GET  http://localhost:3001/health (Kiểm tra sức khỏe)');
        });
    })
    .catch(err => {
        console.error('❌ Không thể kết nối SQL Server:', err.message);
    });

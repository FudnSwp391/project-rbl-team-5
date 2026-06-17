import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import sql from 'mssql';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env, fallback to backend's .env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Bắt lỗi toàn cục để server không tự thoát âm thầm
process.on('uncaughtException', (err) => {
    console.error('❌ [uncaughtException]', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ [unhandledRejection]', reason);
});

// Kiểm tra API Key
let useMockAI = false;
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn("CẢNH BÁO: Chưa cấu hình GEMINI_API_KEY. Chatbot sẽ chạy ở chế độ MOCK AI.");
    useMockAI = true;
}

const ai = !useMockAI ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Cấu hình kết nối SQL Server
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    pool: {
        max: 10,
        min: 1,               // Giữ ít nhất 1 kết nối luôn alive
        idleTimeoutMillis: 60000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

let pool;

// Kết nối DB một lần khi khởi động
const initDB = async () => {
    pool = new sql.ConnectionPool(dbConfig);
    pool.on('error', err => {
        console.error('❌ SQL Pool error:', err.message);
    });
    await pool.connect();
    console.log('✅ Connected to SQL Server');
};

// Lấy dữ liệu cửa hàng từ DB (sản phẩm, thợ, dịch vụ, thông tin hệ thống)
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

// Mock AI khi không có API Key (dùng dữ liệu DB để trả lời theo rule)
function generateMockResponse(userMessage, storeData) {
    const msg = userMessage.toLowerCase();

    if (msg.includes('máy giặt') || msg.includes('giặt')) {
        const item = storeData.products.find(p => p.category_name.toLowerCase().includes('washing') || p.title.toLowerCase().includes('giặt'));
        if (item) return `TechCycle hiện đang có sản phẩm máy giặt: **${item.title}** với giá niêm yết là **${Number(item.listed_price).toLocaleString()} VND** (Tình trạng: ${item.ai_condition || 'Tốt'}). Bạn có muốn mua sản phẩm này không?`;
    }
    if (msg.includes('tủ lạnh')) {
        const item = storeData.products.find(p => p.category_name.toLowerCase().includes('refrigerator') || p.title.toLowerCase().includes('tủ lạnh'));
        if (item) return `TechCycle đang bán **${item.title}** với giá **${Number(item.listed_price).toLocaleString()} VND**. Tủ lạnh có dung tích lớn, hoạt động cực tốt.`;
    }
    if (msg.includes('máy lạnh') || msg.includes('điều hòa')) {
        const item = storeData.products.find(p => p.category_name.toLowerCase().includes('air') || p.title.toLowerCase().includes('máy lạnh') || p.title.toLowerCase().includes('điều hòa'));
        if (item) return `Chúng tôi có **${item.title}** giá **${Number(item.listed_price).toLocaleString()} VND** còn hàng. Máy lạnh chạy êm, tiết kiệm điện Inverter.`;
    }
    if (msg.includes('tai nghe') || msg.includes('sony')) {
        const item = storeData.products.find(p => p.category_name.toLowerCase().includes('audio') || p.title.toLowerCase().includes('tai nghe'));
        if (item) return `Hiện tại chúng tôi có **${item.title}** giá **${Number(item.listed_price).toLocaleString()} VND** (Chất lượng: ${item.ai_condition}). Âm thanh chống ồn đỉnh cao.`;
    }
    if (msg.includes('macbook') || msg.includes('laptop') || msg.includes('máy tính')) {
        const item = storeData.products.find(p => p.category_name.toLowerCase().includes('laptop') || p.title.toLowerCase().includes('macbook') || p.title.toLowerCase().includes('máy tính'));
        if (item) return `Chúng tôi đang thanh lý **${item.title}** với giá **${Number(item.listed_price).toLocaleString()} VND** (Độ mới: ${item.ai_condition}). Máy đẹp, hiệu năng mượt mà.`;
    }
    if (msg.includes('watch') || msg.includes('đồng hồ') || msg.includes('smartwatch')) {
        const item = storeData.products.find(p => p.category_name.toLowerCase().includes('watch') || p.title.toLowerCase().includes('watch'));
        if (item) return `TechCycle đang có **${item.title}** với giá ưu đãi **${Number(item.listed_price).toLocaleString()} VND**. Tích hợp đo nhịp tim, oxy trong máu.`;
    }
    if (msg.includes('sửa') || msg.includes('thợ') || msg.includes('hỏng') || msg.includes('lỗi') || msg.includes('repair')) {
        if (storeData.technicians.length > 0) {
            const tech = storeData.technicians[0];
            return `Để đặt lịch sửa chữa thiết bị, bạn có thể gọi hotline **${storeData.systemInfo.hotline || '0325225503'}**. Hiện tại chúng tôi có kỹ thuật viên **${tech.full_name}** (kinh nghiệm ${tech.experience_years} năm, kỹ năng: ${tech.skills}) sẵn sàng hỗ trợ bạn.`;
        }
        return `Dạ, để đặt lịch sửa chữa thiết bị công nghệ hoặc điện gia dụng, bạn vui lòng liên hệ hotline: **${storeData.systemInfo.hotline || '0325225503'}** để được hỗ trợ nhanh nhất nhé!`;
    }

    return `Chào bạn! Tôi là trợ lý ảo AI của TechCycle. Tôi có thể hỗ trợ bạn tìm kiếm sản phẩm công nghệ thanh lý (máy giặt, tủ lạnh, máy lạnh, tai nghe, laptop, apple watch...) hoặc hỗ trợ đặt lịch thợ sửa chữa. Bạn cần tư vấn thông tin gì ạ?`;
}

// Route POST /api/chat — nhận { history: [{role, text}] }
app.post('/api/chat', async (req, res) => {
    try {
        const { history } = req.body;

        const storeData = await getStoreData();

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

        // Nếu không có API key → dùng Mock AI
        if (useMockAI) {
            const reply = generateMockResponse(lastMessage, storeData);
            return res.json({ reply });
        }

        try {
            // Build context từ dữ liệu DB
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

            const systemInstruction = `Bạn là trợ lý ảo AI của TechCycle — nền tảng mua bán đồ cũ và sửa chữa thiết bị công nghệ.\n${context}`;

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: formattedHistory,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.3
                }
            });

            res.json({ reply: response.text });
        } catch (geminiErr) {
            console.warn("Lỗi kết nối Gemini API (chuyển sang Mock AI):", geminiErr.message);
            const reply = generateMockResponse(lastMessage, storeData);
            res.json({ reply });
        }

    } catch (error) {
        console.error("Lỗi:", error.message);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
});

// Route kiểm tra sức khoẻ server
app.get('/health', (req, res) => {
    res.json({ status: 'ok', model: 'gemini-3.1-flash-lite', port: 3002 });
});

// Log lý do thoát để debug
process.on('exit', (code) => {
    console.log(`🔴 Process đang thoát với code: ${code}`);
});

// Khởi động server SAU KHI kết nối DB thành công
initDB()
    .then(() => {
        const server = app.listen(3002, () => {
            console.log('✅ Chatbot Server 2 (Gemini 3.1 Flash Lite) chạy tại http://localhost:3002');
            console.log('   - POST http://localhost:3002/api/chat');
            console.log('   - GET  http://localhost:3002/health');
        });

        // Xử lý lỗi port đã được dùng
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Cổng 3002 đang được dùng bởi tiến trình khác!`);
            } else {
                console.error('❌ HTTP Server error:', err.message);
            }
        });

        // Keepalive: ngăn Node.js thoát khi event loop trống
        // (mssql tarn timers là unref nên không giữ process sống)
        const keepAlive = setInterval(() => { }, 1 << 30);

        // Dọn dẹp khi tắt server đúng cách (Ctrl+C)
        const shutdown = () => {
            console.log('\n🛑 Đang tắt Chatbot Server 2...');
            clearInterval(keepAlive);
            server.close(() => {
                pool.close();
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    })
    .catch(err => {
        console.error('❌ Không thể kết nối SQL Server:', err.message);
        process.exit(1);
    });


import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import sql from "mssql";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc API Key và cấu hình DB từ file .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 1. Cấu hình kết nối SQL Server (Lấy từ biến môi trường hoặc dùng mặc định)
const sqlConfig = {
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD || "your_password",
    database: process.env.DB_DATABASE || process.env.DB_NAME || "techcycle_db",
    server: process.env.DB_SERVER || "localhost",
    pool: { max: 10, min: 1, idleTimeoutMillis: 30000 },
    options: {
        instanceName: process.env.DB_INSTANCE || undefined,
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true" || true // Rất quan trọng khi chạy trên localhost
    }
};

if (!process.env.DB_INSTANCE) {
    sqlConfig.port = parseInt(process.env.DB_PORT) || 1433;
}

let pool;

const initDB = async () => {
    pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    console.log("✅ Connected to SQL Server");
};

// 2. Hàm truy vấn Database để lấy dữ liệu sửa chữa
async function fetchSolutionFromDB(keyword) {
    try {
        const result = await pool.request()
            .input('keyword', sql.NVarChar, `%${keyword}%`)
            .query(`
                SELECT TOP 1 solution 
                FROM repair_knowledge 
                WHERE keywords LIKE @keyword OR issue_prompt LIKE @keyword
            `);

        // Nếu tìm thấy lỗi trong DB, trả về cách giải quyết. Nếu không, trả về null.
        return result.recordset.length > 0 ? result.recordset[0].solution : null;
    } catch (err) {
        console.error("❌ Lỗi kết nối hoặc truy vấn SQL:", err);
        return null;
    }
}

// 2b. Hàm kiểm tra xem tin nhắn có đề cập tên sản phẩm cụ thể không
function hasProductMentioned(message) {
    // Danh sách từ khóa thương hiệu / dòng sản phẩm phổ biến
    const productKeywords = [
        // Điện thoại
        'iphone', 'samsung', 'oppo', 'xiaomi', 'vivo', 'realme', 'nokia', 'huawei',
        'pixel', 'oneplus', 'asus', 'sony', 'lg', 'motorola', 'redmi', 'poco',
        // Laptop / máy tính
        'laptop', 'macbook', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi',
        'surface', 'thinkpad', 'ideapad', 'vivobook', 'zenbook',
        // Máy tính bảng
        'ipad', 'tablet', 'galaxy tab',
        // Thiết bị khác
        'airpods', 'tai nghe', 'đồng hồ', 'smartwatch', 'apple watch',
        // Loại thiết bị chung
        'điện thoại', 'máy tính', 'máy tính bảng', 'thiết bị', 'sản phẩm'
    ];
    const lowerMsg = message.toLowerCase();
    return productKeywords.some(kw => lowerMsg.includes(kw));
}

// 3. API Chat endpoint kết nối React frontend
app.post("/api/chat", async (req, res) => {
    try {
        const { history } = req.body;

        let formattedHistory = [];
        if (Array.isArray(history)) {
            formattedHistory = history.map(msg => {
                const parts = [];
                if (msg.text) {
                    parts.push({ text: msg.text });
                }
                if (msg.image) {
                    const matches = msg.image.match(/^data:(image\/[A-Za-z\-+]+);base64,(.+)$/);
                    if (matches) {
                        const mimeType = matches[1];
                        const base64Data = matches[2];
                        parts.push({
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        });
                    }
                }
                if (parts.length === 0) {
                    parts.push({ text: "" });
                }
                return {
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: parts
                };
            });
        }

        if (formattedHistory.length === 0) {
            return res.status(400).json({ error: "Thiếu lịch sử chat" });
        }

        let lastMessage = "";
        const lastPart = formattedHistory[formattedHistory.length - 1]?.parts?.find(p => p.text);
        if (lastPart) {
            lastMessage = lastPart.text;
        }

        // Lấy dữ liệu từ SQL Server dựa trên câu hỏi cuối cùng của khách hàng
        const dbData = lastMessage.trim() ? await fetchSolutionFromDB(lastMessage) : null;

        // Kiểm tra khách hàng có đề cập sản phẩm cụ thể chưa
        const mentionedProduct = hasProductMentioned(lastMessage);

        // Định hình "Nhân cách" và nạp "Kiến thức" cho AI
        let systemPrompt = "";

        if (dbData) {
            console.log("🟢 Đã tìm thấy tài liệu trong Database! Đang nạp cho AI...");
            systemPrompt = `Bạn là trợ lý kỹ thuật của hệ thống TechCycle. 
Dưới đây là tài liệu hướng dẫn sửa chữa chính thức từ công ty:
"${dbData}"

YÊU CẦU QUAN TRỌNG: 
- Hãy dựa 100% vào tài liệu trên để trả lời khách hàng.
- Trả lời thân thiện, chuyên nghiệp, các bước rõ ràng.`;
        } else if (!mentionedProduct) {
            // Khách hàng chưa nêu rõ sản phẩm → yêu cầu chỉ rõ
            console.log("🟡 Khách hàng chưa chỉ rõ sản phẩm. AI sẽ hỏi thêm thông tin.");
            systemPrompt = `Bạn là trợ lý AI thân thiện của TechCycle - nền tảng sửa chữa và mua bán thiết bị điện tử.

YÊU CẦU QUAN TRỌNG:
- Khách hàng chưa cho biết cụ thể thiết bị / sản phẩm họ đang gặp vấn đề.
- Hãy lịch sự hỏi lại khách hàng để làm rõ:
  + Tên thiết bị / thương hiệu (ví dụ: iPhone 14, Samsung Galaxy S23, Laptop Dell XPS...)
  + Triệu chứng hoặc lỗi cụ thể mà thiết bị đang gặp phải.
- KHÔNG tự đoán hoặc trả lời chung chung khi chưa có đủ thông tin sản phẩm.
- Giữ thái độ thân thiện, chuyên nghiệp và nhiệt tình hỗ trợ.`;
        } else {
            // Có đề cập sản phẩm nhưng không có trong DB → tư vấn mang đến trung tâm
            console.log("⚪ Không tìm thấy dữ liệu trong DB cho sản phẩm này. AI sẽ tư vấn chung.");
            systemPrompt = `Bạn là trợ lý AI thân thiện của TechCycle - nền tảng sửa chữa và mua bán thiết bị điện tử.

YÊU CẦU QUAN TRỌNG:
- Hệ thống hiện chưa có tài liệu kỹ thuật chi tiết cho thiết bị / vấn đề này.
- Hãy thông báo lịch sự với khách hàng rằng vấn đề của họ cần được kiểm tra trực tiếp.
- Tư vấn khách hàng mang thiết bị đến trung tâm TechCycle để được kiểm tra và hỗ trợ tốt nhất.
- Có thể hỏi thêm thông tin (model máy, triệu chứng) để ghi nhận hỗ trợ tốt hơn.
- Giữ thái độ thân thiện, chuyên nghiệp và nhiệt tình hỗ trợ.`;
        }

        // Gọi API của Google Gemini
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: formattedHistory,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.2 // Mức thấp để AI bám sát tài liệu SQL
            }
        });

        res.json({ reply: response.text });
    } catch (error) {
        console.error("❌ Lỗi API Chat:", error.message);
        res.status(500).json({ error: "Có lỗi xảy ra trong quá trình xử lý tin nhắn" });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', model: 'gemini-3.1-flash-lite' });
});

// Keepalive để giữ tiến trình không bị tắt
const keepAliveInterval = setInterval(() => { }, 1 << 30);

// Dọn dẹp khi tắt server
const cleanup = async () => {
    clearInterval(keepAliveInterval);
    if (pool) {
        try {
            await pool.close();
            console.log('✅ Đã ngắt kết nối SQL Server.');
        } catch (err) {
            console.error('Lỗi khi ngắt kết nối SQL Server:', err);
        }
    }
    process.exit(0);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

initDB()
    .then(() => {
        app.listen(3002, () => {
            console.log('✅ Chatbot Server 1 (Gemini 2.5 Flash) chạy tại http://localhost:3002');
            console.log('   - POST http://localhost:3002/api/chat');
            console.log('   - GET  http://localhost:3002/health');
        });
    })
    .catch(err => {
        console.error('❌ Không thể kết nối SQL Server:', err.message);
        cleanup();
    });
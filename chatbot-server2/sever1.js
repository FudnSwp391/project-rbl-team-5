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
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

// 2. Định nghĩa bộ từ khóa nhận diện thiết bị
const categoryKeywords = {
    WashingMachine: ["máy giặt", "may giat", "máy sấy", "may say", "lồng giặt", "long giat", "vắt", "vat", "bột giặt", "bot giat"],
    Refrigerator: ["tủ lạnh", "tu lanh", "tủ đông", "tu dong", "tủ mát", "tu mat", "làm đá", "lam da", "ngăn đá", "ngan da", "ngăn mát", "ngan mat"],
    AirConditioner: ["điều hòa", "dieu hoa", "máy lạnh", "may lanh", "điều hoà", "dàn lạnh", "dan lanh", "cục nóng", "cuc nong", "cánh vẫy", "canh vay"],
    Audio: ["loa", "tai nghe", "amply", "ampli", "micro", "headphone", "âm thanh", "am thanh"],
    Laptop: ["laptop", "macbook", "máy tính xách tay", "may tinh xach tay"],
    Smartwatch: ["đồng hồ", "dong ho", "smartwatch", "apple watch"],
    Accessory: ["phụ kiện", "phu kien", "sạc dự phòng", "sac du phong", "chuột", "chuot", "bàn phím", "ban phim", "cáp sạc", "cap sac", "hub"],
    Smartphone: ["điện thoại", "dien thoai", "iphone", "samsung", "oppo", "xiaomi", "vivo", "huawei"],
    Tablet: ["máy tính bảng", "may tinh bang", "ipad", "tablet"],
    GamingConsole: ["máy chơi game", "may choi game", "tay cầm", "tay cam", "ps5", "ps4", "nintendo", "xbox", "analog", "gamepad"],
    Camera: ["máy ảnh", "may anh", "camera", "ống kính", "ong kinh", "lens", "sensor", "kính ngắm", "viewfinder"],
    TV: ["tivi", "tv", "remote tivi", "loa tivi", "màn hình tivi"],
    Monitor: ["màn hình máy tính", "man hinh may tinh", "màn hình pc", "man hinh pc", "monitor"],
    PC: ["pc", "máy tính để bàn", "may tinh de ban", "thùng máy", "thung may", "cây máy tính", "cay may tinh", "mainboard", "cpu", "ram", "bios", "case"],
    Printer: ["máy in", "may in", "hộp mực", "hop muc", "kẹt giấy", "ket giay", "in mờ", "in mo", "drum", "trống hình"],
    Router: ["router", "wifi", "cục phát", "cuc phat", "wan", "lan", "modem", "mesh"]
};

// Hàm nhận diện category từ lịch sử chat
function detectCategoryFromHistory(history) {
    if (!Array.isArray(history)) return null;

    // Ghép toàn bộ nội dung tin nhắn của user để tìm từ khóa thiết bị
    const userMessages = history
        .filter(msg => msg && msg.role === 'user')
        .map(msg => {
            if (msg.parts && Array.isArray(msg.parts)) {
                return msg.parts.map(p => (p && p.text) || "").join(" ");
            }
            return msg.text || "";
        })
        .join(" ")
        .toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
            if (userMessages.includes(keyword)) {
                return category;
            }
        }
    }
    return null;
}

// 3. Hàm truy vấn Database để lấy dữ liệu sửa chữa
async function fetchSolutionFromDB(keyword, category) {
    try {
        const request = pool.request();
        request.input('keyword', sql.NVarChar, `%${keyword}%`);

        let query = `
            SELECT TOP 1 solution 
            FROM repair_knowledge 
            WHERE (keywords LIKE @keyword OR issue_prompt LIKE @keyword)
        `;

        if (category) {
            request.input('category', sql.NVarChar, category);
            query += ` AND category = @category`;
        }

        const result = await request.query(query);

        // Nếu tìm thấy lỗi trong DB, trả về cách giải quyết. Nếu không, trả về null.
        return result.recordset.length > 0 ? result.recordset[0].solution : null;
    } catch (err) {
        console.error("❌ Lỗi kết nối hoặc truy vấn SQL:", err);
        return null;
    }
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

        // Nhận diện loại thiết bị từ lịch sử chat
        const category = detectCategoryFromHistory(formattedHistory);
        console.log(`🔍 Nhận diện loại thiết bị: ${category || "Không xác định"}`);

        // Lấy dữ liệu từ SQL Server dựa trên câu hỏi cuối cùng của khách hàng và danh mục thiết bị (nếu có)
        const dbData = (lastMessage.trim() && category) ? await fetchSolutionFromDB(lastMessage, category) : null;

        // Định hình "Nhân cách" và nạp "Kiến thức" cho AI
        let systemPrompt = "";

        if (category) {
            if (dbData) {
                console.log(`🟢 Đã tìm thấy tài liệu cho ${category} trong Database! Đang nạp cho AI...`);
                systemPrompt = `Bạn là trợ lý kỹ thuật của hệ thống TechCycle. 
Dưới đây là tài liệu hướng dẫn sửa chữa chính thức từ công ty cho thiết bị này:
"${dbData}"

YÊU CẦU QUAN TRỌNG: 
- Hãy dựa 100% vào tài liệu trên để trả lời khách hàng.
- Trả lời thân thiện, chuyên nghiệp, các bước rõ ràng.`;
            } else {
                console.log(`⚪ Không tìm thấy dữ liệu cho ${category} trong DB. AI sẽ trả lời bằng kiến thức mặc định.`);
                systemPrompt = `Bạn là trợ lý AI thân thiện của TechCycle. Hãy tư vấn khách hàng mang thiết bị ra trung tâm kiểm tra do lỗi này khá phức tạp.`;
            }
        } else {
            console.log("🔴 Không nhận diện được thiết bị trong câu hỏi. AI sẽ yêu cầu làm rõ loại thiết bị.");
            systemPrompt = `Bạn là trợ lý kỹ thuật của hệ thống TechCycle.
Khách hàng chưa cung cấp thông tin về loại thiết bị cần sửa chữa.
YÊU CẦU QUAN TRỌNG:
- Hãy lịch sự yêu cầu khách hàng làm rõ họ đang muốn sửa thiết bị nào (ví dụ: máy giặt, tủ lạnh, điều hòa, laptop, điện thoại, máy tính bảng, máy chơi game, tivi, máy in...).
- Tuyệt đối KHÔNG tự đoán thiết bị hoặc đưa ra hướng dẫn sửa chữa khi chưa biết rõ loại thiết bị của khách hàng.`;
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

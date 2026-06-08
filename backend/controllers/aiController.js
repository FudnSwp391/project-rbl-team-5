const { db } = require("../db");

exports.chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Dùng bản Flash Latest - thường có quota tốt nhất cho tài khoản cá nhân
    const modelName = "models/gemini-flash-latest"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

    // Lấy context sản phẩm để AI tư vấn
    const products = await db.find("Products");
    const productsContext = products.map(p => 
      `- ${p.product_name}: Giá ${p.price.toLocaleString('en-US')} VND, Tình trạng: ${p.condition}, Mô tả: ${p.description}`
    ).join("\n");

    const systemPrompt = `Bạn là Trợ lý AI của TechCycle. Hãy tư vấn khách hàng dựa trên dữ liệu sản phẩm này:\n${productsContext}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `${systemPrompt}\n\nKhách hỏi: ${message}` }] 
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
       throw new Error(`Google API Error: ${data.error.message}`);
    }

    const aiText = data.candidates[0].content.parts[0].text;
    res.json({ text: aiText });

  } catch (error) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({ 
      message: "Lỗi kết nối AI.", 
      error: error.message 
    });
  }
};

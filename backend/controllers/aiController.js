const { db } = require("../db");

function generateMockResponseForProducts(userMessage, products) {
  const msg = userMessage.toLowerCase();

  // Try to find matching products
  let matchedProducts = [];
  if (msg.includes('máy giặt') || msg.includes('giặt')) {
    matchedProducts = products.filter(p => p.title.toLowerCase().includes('giặt') || (p.user_description && p.user_description.toLowerCase().includes('giặt')));
  } else if (msg.includes('tủ lạnh')) {
    matchedProducts = products.filter(p => p.title.toLowerCase().includes('tủ lạnh') || (p.user_description && p.user_description.toLowerCase().includes('tủ lạnh')));
  } else if (msg.includes('máy lạnh') || msg.includes('điều hòa')) {
    matchedProducts = products.filter(p => p.title.toLowerCase().includes('máy lạnh') || p.title.toLowerCase().includes('điều hòa') || (p.user_description && p.user_description.toLowerCase().includes('máy lạnh')));
  } else if (msg.includes('tai nghe') || msg.includes('sony')) {
    matchedProducts = products.filter(p => p.title.toLowerCase().includes('tai nghe') || p.title.toLowerCase().includes('sony') || (p.user_description && p.user_description.toLowerCase().includes('tai nghe')));
  } else if (msg.includes('macbook') || msg.includes('laptop') || msg.includes('máy tính')) {
    matchedProducts = products.filter(p => p.title.toLowerCase().includes('macbook') || p.title.toLowerCase().includes('laptop') || p.title.toLowerCase().includes('máy tính') || (p.user_description && p.user_description.toLowerCase().includes('laptop')));
  } else if (msg.includes('apple watch') || msg.includes('watch') || msg.includes('đồng hồ')) {
    matchedProducts = products.filter(p => p.title.toLowerCase().includes('watch') || p.title.toLowerCase().includes('đồng hồ') || (p.user_description && p.user_description.toLowerCase().includes('watch')));
  }

  if (matchedProducts.length > 0) {
    const list = matchedProducts.map(p => {
      const price = Number(p.listed_price) || 0;
      return `- **${p.title}**: Giá **${price.toLocaleString('en-US')} VND** (Tình trạng: ${p.ai_condition || 'N/A'}). Mô tả: ${p.user_description || ''}`;
    }).join('\n');
    return `Chào bạn! TechCycle hiện đang có các sản phẩm phù hợp với yêu cầu của bạn:\n\n${list}\n\nBạn có muốn tìm hiểu thêm hay đặt mua sản phẩm nào không ạ?`;
  }

  // Fallback to list some available products if they ask generally or nothing matched
  if (products.length > 0) {
    const randomProducts = products.slice(0, 3);
    const list = randomProducts.map(p => {
      const price = Number(p.listed_price) || 0;
      return `- **${p.title}** (Giá: **${price.toLocaleString('en-US')} VND**)`;
    }).join('\n');
    return `Chào bạn! Cửa hàng TechCycle của chúng tôi hiện có các sản phẩm nổi bật sau:\n\n${list}\n\nBạn cần tôi tư vấn chi tiết về sản phẩm nào không ạ?`;
  }

  return `Chào bạn! Tôi là Trợ lý AI của TechCycle. Hiện tại hệ thống chưa cập nhật sản phẩm nào trên chợ đồ cũ. Bạn cần hỗ trợ gì khác không?`;
}

exports.chatWithAI = async (req, res) => {
  let products = [];
  try {
    // Lấy context sản phẩm để AI tư vấn
    products = await db.find("products");
  } catch (dbErr) {
    console.error("Lỗi truy vấn DB sản phẩm:", dbErr.message);
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error("Chưa cấu hình GEMINI_API_KEY hoặc đang sử dụng key mặc định.");
    }

    // Dùng bản Flash Latest - thường có quota tốt nhất cho tài khoản cá nhân
    const modelName = "models/gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

    const productsContext = products.map(p => {
      const price = Number(p.listed_price) || 0;
      return `- ${p.title}: Giá ${price.toLocaleString('en-US')} VND, Tình trạng: ${p.ai_condition || 'N/A'}, Mô tả: ${p.user_description || ''}`;
    }).join("\n");

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
    console.warn("AI Chat Error (chuyển sang Mock AI):", error.message);
    const mockReply = generateMockResponseForProducts(req.body.message || "", products);
    res.json({ text: mockReply });
  }
};

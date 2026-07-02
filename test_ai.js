async function testChat() {
    try {
        const history = [
            { role: 'user', text: 'tôi muốn bán cái điện thoại iphone 12 pro max cũ' },
            { role: 'model', text: 'Chào bạn, bạn hoàn toàn có thể bán...' },
            { role: 'user', text: 'dung lượng pin con 80%' }
        ];

        const response = await fetch("http://localhost:5000/api/ai/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ history })
        });
        const data = await response.json();
        if (response.ok) {
            console.log("Success:", data);
        } else {
            console.error("Server Error:", response.status, data);
        }
    } catch (error) {
        console.error("Network or other error:", error.message);
    }
}

testChat();

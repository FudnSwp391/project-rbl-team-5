import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ChatbotIcon from "./ChatbotIcon.jsx";
import ChatForm from "./ChatForm.jsx";
import ChatMessage from "./ChatMessage.jsx";
import "./chatbot.css";

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const ChatBot = ({ setActivePage, setSelectedProduct }) => {
    const [chatHistory, setChatHistory] = useState([]);
    const [showChatbot, setShowChatbot] = useState(false);
    const chatBodyRef = useRef();

    const generateBotResponse = async (history) => {
        const updateHistory = (text) => {
            setChatHistory((prev) => [
                ...prev.filter((msg) => msg.text !== "Thinking..."),
                { role: "model", text },
            ]);
        };

        try {
            const response = await axios.post("http://localhost:3001/api/chat", { history });
            updateHistory(response.data.reply);
        } catch {
            updateHistory("Xin lỗi, tôi gặp sự cố kỹ thuật.");
        }
    };

    const handleProductClick = async (productId) => {
        try {
            const res = await axios.get(`${API_BASE}/api/products/${productId}`);
            setSelectedProduct(res.data);
            setActivePage('shop');
            setShowChatbot(false);
        } catch (err) {
            console.error("Không tìm thấy sản phẩm:", err);
        }
    };

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [chatHistory]);

    return (
        <div className={`chatbot-container ${showChatbot ? "show" : ""}`}>
            <button onClick={() => setShowChatbot(!showChatbot)} id="chatbot-toggler">
                <span className="material-symbols-rounded">{showChatbot ? "close" : "mode_comment"}</span>
            </button>

            <div className="chatbot-popup">
                <div className="chat-header">
                    <div className="header-info">
                        <ChatbotIcon />
                        <div>
                            <h3>ChatBot TechCycle AI</h3>
                            <p>Online</p>
                        </div>
                    </div>
                    <button onClick={() => setShowChatbot(false)} className="material-symbols-rounded">close</button>
                </div>

                <div ref={chatBodyRef} className="chat-body">
                    <div className="message bot-message">
                        <ChatbotIcon />
                        <p className="message-text">Chào bạn 🧐 <br /> TechCycle AI có thể hỗ trợ được gì cho bạn?</p>
                    </div>
                    {chatHistory.map((chat, index) => (
                        <ChatMessage key={index} chat={chat} onProductClick={handleProductClick} />
                    ))}
                </div>

                <div className="chat-footer">
                    <ChatForm chatHistory={chatHistory} setChatHistory={setChatHistory} generateBotResponse={generateBotResponse} />
                </div>
            </div>
        </div>
    );
};

export default ChatBot;
import { useRef } from "react";

const ChatForm = ({ chatHistory, setChatHistory, generateBotResponse }) => {
  const inputRef = useRef();

  const handleFormSubmit = (e) => {
    e.preventDefault();
    console.log("Nút gửi đã được nhấn!");
    const userMessage = inputRef.current.value.trim();
    if (!userMessage) return;
    inputRef.current.value = "";

    const userEntry = { role: "user", text: userMessage };
    const newChatHistory = [...chatHistory, userEntry];
    setChatHistory((prev) => [...prev, userEntry, { role: "model", text: "Đang suy nghĩ..." }]);
    generateBotResponse(newChatHistory);

  };

  return (
    <form action="#" onSubmit={handleFormSubmit} className="chat-form">
      <input
        type="text"
        className="message-input"
        placeholder="Nhập tin nhắn..."
        ref={inputRef}
      />
      <button className="material-symbols-rounded">arrow_upward</button>
    </form>
  );
};

export default ChatForm;

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Laptop, Phone, PenTool, CheckCircle, ArrowRight, ShieldCheck, Send, Sparkles, Image } from 'lucide-react';
import './Booking.css';

const Booking = ({ setActivePage }) => {
  const { user, token } = useAuth();
  
  // Form states
  const [deviceType, setDeviceType] = useState('Điện thoại (iPhone/Android)');
  const [issueDescription, setIssueDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('08:00 - 10:00');
  const [contactPhone, setContactPhone] = useState(user ? user.phone : '');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // AI Chat States
  const [aiChat, setAiChat] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI chẩn đoán TechCycle. Hãy mô tả ngắn gọn lỗi thiết bị của bạn (ví dụ: "màn hình bị sọc", "máy hao pin", "macbook mất nguồn"). Tôi sẽ đề xuất giải pháp chẩn đoán và giúp bạn điền đơn hẹn sửa nhanh chóng!'
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước hình ảnh phải nhỏ hơn 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const aiChatEndRef = useRef(null);

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat]);

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() && !selectedImage) return;

    const userMsg = aiInput.trim();
    const currentMsgObj = { sender: 'user', text: userMsg };
    if (selectedImage) {
      currentMsgObj.image = selectedImage;
    }

    const currentChat = [...aiChat, currentMsgObj];
    setAiChat(currentChat);
    setAiInput('');
    setSelectedImage(null);

    // Thêm tin nhắn tạm "Đang suy nghĩ..."
    setAiChat(prev => [...prev, { sender: 'ai', text: '🤖 TechCycle AI đang phân tích chẩn đoán lỗi...' }]);

    try {
      // Map history sang định dạng chatbot-server mong muốn
      const historyToSend = currentChat.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        text: msg.text,
        image: msg.image || undefined
      }));

      const res = await fetch('http://localhost:3002/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ history: historyToSend })
      });

      if (!res.ok) {
        throw new Error('Không thể kết nối đến chatbot-server');
      }

      const data = await res.json();
      const responseText = data.reply || 'Không có phản hồi từ hệ thống AI.';

      // Tự động phân tích thiết bị dựa vào từ khóa
      let deviceTypeSuggestion = 'Điện thoại (iPhone/Android)';
      const lowerMsg = userMsg.toLowerCase();
      if (lowerMsg.includes('macbook') || lowerMsg.includes('laptop') || lowerMsg.includes('máy tính') || lowerMsg.includes('pc')) {
        deviceTypeSuggestion = 'Laptop (Macbook/Windows)';
      } else if (lowerMsg.includes('ipad') || lowerMsg.includes('tablet') || lowerMsg.includes('máy tính bảng')) {
        deviceTypeSuggestion = 'Máy tính bảng (iPad/Android Tablet)';
      } else if (lowerMsg.includes('watch') || lowerMsg.includes('đồng hồ')) {
        deviceTypeSuggestion = 'Smartwatch (Apple Watch/Samsung)';
      } else if (lowerMsg.includes('điện thoại') || lowerMsg.includes('iphone') || lowerMsg.includes('samsung') || lowerMsg.includes('oppo') || lowerMsg.includes('xiaomi') || lowerMsg.includes('vivo') || lowerMsg.includes('huawei')) {
        deviceTypeSuggestion = 'Điện thoại (iPhone/Android)';
      } else {
        deviceTypeSuggestion = 'Thiết bị khác';
      }

      const suggestion = {
        deviceType: deviceTypeSuggestion,
        issue: `${userMsg}. (Chẩn đoán bởi TechCycle AI)`
      };

      setAiChat(prev => [
        ...prev.slice(0, -1), // Loại bỏ tin nhắn tạm
        { sender: 'ai', text: responseText, suggestion }
      ]);
    } catch (error) {
      console.error(error);
      setAiChat(prev => [
        ...prev.slice(0, -1),
        { sender: 'ai', text: '🤖 Rất tiếc, tôi không thể kết nối đến máy chủ chẩn đoán. Vui lòng thử lại sau!' }
      ]);
    }
  };

  const handleApplySuggestion = (sugg) => {
    setDeviceType(sugg.deviceType);
    setIssueDescription(sugg.issue);
    // Smooth scroll to the form
    document.querySelector('.booking-form-panel').scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

    if (!user) {
      setError('Vui lòng đăng nhập trước khi đặt lịch.');
      setLoading(false);
      return;
    }

    if (!preferredDate || !issueDescription || !contactPhone) {
      setError('Vui lòng điền đầy đủ thông tin yêu cầu.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceType,
          issueDescription,
          preferredDate,
          preferredTime
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Lỗi đặt lịch hẹn.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="booking-page container animate-fade">
        <div className="login-prompt-card glass-panel text-center">
          <PenTool size={48} className="prompt-icon animate-bounce" />
          <h2>Đặt Lịch Hẹn Sửa Chữa</h2>
          <p>Để lưu trữ thông tin sửa chữa, trao đổi trực tiếp với kỹ thuật viên và theo dõi tiến độ sửa chữa thời gian thực, bạn vui lòng đăng nhập tài khoản khách hàng.</p>
          <button className="btn btn-primary" onClick={() => setActivePage('auth')}>
            Đăng nhập / Đăng ký tài khoản
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page container animate-fade">
      <div className="booking-layout">
        {/* Left Side: Instructions, Benefits & AI Assistant */}
        <div className="booking-info-panel">
          <span className="section-subtitle">Dịch vụ sửa chữa</span>
          <h1 className="booking-title">Đội ngũ kỹ thuật chuyên môn cao</h1>
          <p className="booking-desc">Chúng tôi nhận kiểm tra và sửa chữa phần cứng, thay thế màn hình, pin, cổng sạc, khắc phục lỗi hệ điều hành cho mọi thiết bị.</p>
          
          <div className="benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4>Linh kiện kiểm định zin</h4>
                <p>Mọi linh kiện thay thế đều là linh kiện chính hãng hoặc zin bóc máy chất lượng.</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon-wrapper">
                <Clock size={20} />
              </div>
              <div>
                <h4>Sửa chữa lấy ngay trong ngày</h4>
                <p>Khách hàng có thể ngồi xem trực tiếp kỹ thuật viên sửa chữa và nhận máy sau 30-60 phút.</p>
              </div>
            </div>
          </div>

          {/* AI DIAGNOSTIC ASSISTANT WIDGET */}
          <div className="booking-ai-diagnostic-box glass-panel">
            <div className="ai-header">
              <Sparkles size={20} className="ai-icon animate-pulse" />
              <div>
                <h4>Trợ lý AI chẩn đoán lỗi</h4>
                <span className="ai-badge-tag">Gemini AI</span>
              </div>
            </div>
            
            <div className="ai-chat-body">
              {aiChat.map((msg, idx) => (
                <div key={idx} className={`ai-chat-bubble-row ${msg.sender}`}>
                  <div className="ai-bubble-text-box">
                    {msg.image && (
                      <div className="chat-bubble-image-wrapper" style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxWidth: '200px' }}>
                        <img src={msg.image} alt="Diagnostic attachment" style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                    )}
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                    {msg.suggestion && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm ai-apply-btn"
                        onClick={() => handleApplySuggestion(msg.suggestion)}
                      >
                        Áp dụng chẩn đoán vào Form đặt lịch
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={aiChatEndRef} />
            </div>

            {selectedImage && (
              <div className="ai-chat-image-preview-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--neutral-lightest)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={selectedImage} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', cursor: 'pointer', padding: '0' }}
                  >
                    &times;
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', fontWeight: '500' }}>Ảnh đính kèm lỗi thiết bị</span>
              </div>
            )}
 
            <form onSubmit={handleSendAiMessage} className="ai-chat-footer" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                id="ai-image-upload-input"
              />
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => document.getElementById('ai-image-upload-input').click()}
                style={{ width: '36px', height: '36px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-color)', color: 'var(--neutral-dark)' }}
                title="Đính kèm hình ảnh lỗi thiết bị"
              >
                <Image size={16} />
              </button>
              <input 
                type="text" 
                className="form-control ai-input-control" 
                placeholder="Mô tả lỗi máy của bạn tại đây..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary ai-send-btn">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="booking-form-panel glass-panel">
          {success ? (
            <div className="booking-success-view text-center animate-scale-up">
              <CheckCircle size={60} className="success-icon" />
              <h2>Đặt Lịch Thành Công!</h2>
              <p>Lịch hẹn sửa chữa của bạn đã được tiếp nhận. Đội ngũ nhân viên TechCycle sẽ sớm liên hệ xác nhận cuộc hẹn.</p>
              <p className="sub-note">Bạn có thể theo dõi và chat với Kỹ thuật viên phụ trách tại Bảng điều khiển.</p>
              <button className="btn btn-primary" onClick={() => setActivePage('dashboard')}>
                Đi tới Bảng điều khiển
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="booking-form">
              <h3>Điền thông tin đặt lịch</h3>
              <p className="form-helper">Vui lòng điền chính xác thông tin để chúng tôi liên hệ.</p>
              
              {error && <div className="booking-error-alert">{error}</div>}

              {/* Contact Phone */}
              <div className="form-group">
                <label className="form-label">Số điện thoại liên hệ</label>
                <div className="booking-input-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="09xx xxx xxx" 
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Device Type */}
              <div className="form-group">
                <label className="form-label">Loại thiết bị</label>
                <div className="booking-input-wrapper">
                  <Laptop size={18} className="input-icon" />
                  <select 
                    className="form-control"
                    value={deviceType}
                    onChange={e => setDeviceType(e.target.value)}
                  >
                    <option value="Điện thoại (iPhone/Android)">Điện thoại (iPhone/Android)</option>
                    <option value="Laptop (Macbook/Windows)">Laptop (Macbook/Windows)</option>
                    <option value="Máy tính bảng (iPad/Android Tablet)">Máy tính bảng (iPad/Android Tablet)</option>
                    <option value="Smartwatch (Apple Watch/Samsung)">Smartwatch (Apple Watch/Samsung)</option>
                    <option value="Thiết bị khác">Thiết bị khác</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Ngày hẹn mong muốn</label>
                <div className="booking-input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <input 
                    type="date" 
                    className="form-control" 
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              {/* Time slot */}
              <div className="form-group">
                <label className="form-label">Khung giờ phù hợp</label>
                <div className="booking-input-wrapper">
                  <Clock size={18} className="input-icon" />
                  <select 
                    className="form-control"
                    value={preferredTime}
                    onChange={e => setPreferredTime(e.target.value)}
                  >
                    <option value="08:00 - 10:00">08:00 - 10:00 (Sáng)</option>
                    <option value="10:00 - 12:00">10:00 - 12:00 (Sáng)</option>
                    <option value="14:00 - 16:00">14:00 - 16:00 (Chiều)</option>
                    <option value="16:00 - 18:00">16:00 - 18:00 (Chiều)</option>
                  </select>
                </div>
              </div>

              {/* Issue Description */}
              <div className="form-group">
                <label className="form-label">Mô tả tình trạng lỗi thiết bị</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  placeholder="Mô tả chi tiết lỗi (ví dụ: máy rớt nước không lên nguồn, bể kính màn hình, chai pin sạc chậm...)"
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary booking-submit-btn" disabled={loading}>
                {loading ? 'Đang gửi thông tin...' : 'Gửi yêu cầu đặt lịch'}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;

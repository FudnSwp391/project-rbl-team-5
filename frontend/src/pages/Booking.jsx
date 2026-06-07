import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Laptop, Phone, PenTool, CheckCircle, ArrowRight, ShieldCheck, Send, Sparkles } from 'lucide-react';
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
  const aiChatEndRef = useRef(null);

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat]);

  const handleSendAiMessage = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput.trim();
    setAiChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiInput('');

    // AI diagnostic thinking simulation
    setTimeout(() => {
      let responseText = '';
      let suggestion = { deviceType: 'Điện thoại (iPhone/Android)', issue: '' };
      const lowerMsg = userMsg.toLowerCase();

      if (lowerMsg.includes('pin') || lowerMsg.includes('hao pin') || lowerMsg.includes('chai')) {
        responseText = '🤖 TechCycle AI Chẩn đoán:\n\n• Lỗi phát hiện: Chai pin hoặc lão hóa cell pin.\n• Hướng xử lý: Thay thế pin lithium zin chuẩn hãng mới.\n• Thời gian sửa: 30 phút lấy ngay.\n• Giá tham khảo: 350.000 VND - 850.000 VND.\n\nNhấn nút bên dưới để tôi tự động điền thông tin này vào phiếu hẹn giúp bạn nhé!';
        suggestion = {
          deviceType: 'Điện thoại (iPhone/Android)',
          issue: `Thay pin do: ${userMsg}. (Chẩn đoán bởi TechCycle AI: Chai pin cell cần thay mới)`
        };
      } else if (lowerMsg.includes('màn hình') || lowerMsg.includes('sọc') || lowerMsg.includes('vỡ kính') || lowerMsg.includes('bể')) {
        responseText = '🤖 TechCycle AI Chẩn đoán:\n\n• Lỗi phát hiện: Hỏng màn hình LCD hiển thị hoặc nứt kính cảm ứng ngoài.\n• Hướng xử lý: Thay màn hình nguyên bộ hoặc ép kính cảm ứng mới.\n• Thời gian sửa: 45 - 60 phút.\n• Giá tham khảo: 900.000 VND - 2.800.000 VND.\n\nNhấn nút dưới đây để áp dụng thông tin chẩn đoán này vào form VNDăng ký!';
        suggestion = {
          deviceType: 'Điện thoại (iPhone/Android)',
          issue: `Thay màn hình/ép kính do: ${userMsg}. (Chẩn đoán bởi TechCycle AI: Vỡ kính hiển thị cần thay thế)`
        };
      } else if (lowerMsg.includes('macbook') || lowerMsg.includes('laptop') || lowerMsg.includes('nguồn') || lowerMsg.includes('sập')) {
        responseText = '🤖 TechCycle AI Chẩn đoán:\n\n• Lỗi phát hiện: Hỏng IC nguồn, đứt mạch sạc hoặc lỗi mainboard chủ.\n• Hướng xử lý: Đo đạc dòng điện, đóng chip nguồn IC hoặc sửa lỗi nguồn trên mainboard.\n• Thời gian sửa: 1 - 2 ngày (cần đo đạc mạch).\n• Giá tham khảo: 600.000 VND - 1.800.000 VND.\n\nBạn có muốn tự động điền thông tin này vào form VNDặt lịch?';
        suggestion = {
          deviceType: 'Laptop (Macbook/Windows)',
          issue: `Sửa lỗi nguồn/phần cứng do: ${userMsg}. (Chẩn đoán bởi TechCycle AI: Lỗi nguồn chập nguồn IC main)`
        };
      } else if (lowerMsg.includes('ipad') || lowerMsg.includes('tablet') || lowerMsg.includes('máy tính bảng')) {
        responseText = '🤖 TechCycle AI Chẩn đoán:\n\n• Lỗi phát hiện: Thiết bị hỏng cổng sạc, chai pin hoặc lỗi màn hình hiển thị lớn.\n• Hướng xử lý: Vệ sinh cổng sạc, thay chân sạc mới hoặc ép kính màn hình.\n• Thời gian sửa: 1 - 3 tiếng.\n• Giá tham khảo: 400.000 VND - 1.200.000 VND.\n\nNhấn nút dưới để tự động hoàn tất điền form!';
        suggestion = {
          deviceType: 'Máy tính bảng (iPad/Android Tablet)',
          issue: `Sửa chữa máy tính bảng do: ${userMsg}. (Chẩn đoán bởi TechCycle AI: Hỏng chân sạc/lỏng cổng kết nối)`
        };
      } else {
        responseText = '🤖 TechCycle AI Chẩn đoán:\n\nGhi nhận hiện tượng hỏng hóc: "' + userMsg + '". Để có kết quả chẩn đoán chính xác nhất, TechCycle hỗ trợ kiểm VNDịnh phần cứng hoàn toàn miễn phí tại cửa hàng.\n\nNhấn nút bên dưới để áp dụng thông tin và đăng ký lịch hẹn, KTV sẽ kiểm VNDịnh trực tiếp cho bạn nhé!';
        suggestion = {
          deviceType: 'Thiết bị khác',
          issue: `Yêu cầu kiểm tra lỗi: ${userMsg}. (Ghi nhận thông qua TechCycle AI)`
        };
      }

      setAiChat(prev => [...prev, { 
        sender: 'ai', 
        text: responseText,
        suggestion 
      }]);
    }, 1000);
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

    const API_BASE = window.location.port === '5173' ? 'http://localhost:5000' : '';

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
                <h4>Linh kiện kiểm VNDịnh zin</h4>
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
                <span className="ai-badge-tag">MOCK LLM</span>
              </div>
            </div>
            
            <div className="ai-chat-body">
              {aiChat.map((msg, idx) => (
                <div key={idx} className={`ai-chat-bubble-row ${msg.sender}`}>
                  <div className="ai-bubble-text-box">
                    <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                    {msg.suggestion && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm ai-apply-btn"
                        onClick={() => handleApplySuggestion(msg.suggestion)}
                      >
                        Áp dụng chẩn đoán vào Form VNDặt lịch
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={aiChatEndRef} />
            </div>

            <form onSubmit={handleSendAiMessage} className="ai-chat-footer">
              <input 
                type="text" 
                className="form-control ai-input-control" 
                placeholder="Mô tả lỗi máy của bạn tại đây..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
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

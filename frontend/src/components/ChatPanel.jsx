import { useRef, useEffect } from 'react';
import { Send, Paperclip, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ChatPanel.css';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : '';

/**
 * ChatPanel - Component nhắn tin dùng chung cho Customer và Technician.
 * Props:
 * - conversations: mảng booking để hiển thị danh sách chat
 * - selectedBooking: booking đang được chọn
 * - chatMessages: mảng tin nhắn
 * - newMessage: string nội dung đang gõ
 * - isLoading: boolean đang load lịch sử
 * - isUploadingImage: boolean đang upload ảnh
 * - typingUsers: mảng username đang typing
 * - userRole: 'customer' | 'technician'
 * - onSelectConversation: fn(booking)
 * - onSendMessage: fn(e)
 * - onTyping: fn(value)
 * - onImageUpload: fn(file)
 */
const ChatPanel = ({
  conversations = [],
  selectedBooking,
  chatMessages = [],
  newMessage,
  isLoading,
  isUploadingImage,
  typingUsers = [],
  userRole,
  onSelectConversation,
  onSendMessage,
  onTyping,
  onImageUpload,
}) => {
  const { user, getAvatarUrl } = useAuth();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, typingUsers]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hôm nay';
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    const map = {
      assigned: { label: 'Đã phân công', cls: 'assigned' },
      inspecting: { label: 'Đang kiểm tra', cls: 'inspecting' },
      repairing: { label: 'Đang sửa', cls: 'repairing' },
      completed: { label: 'Hoàn thành', cls: 'completed' },
      canceled: { label: 'Đã hủy', cls: 'canceled' },
      pending: { label: 'Chờ duyệt', cls: 'pending' },
    };
    return map[status] || { label: status, cls: 'pending' };
  };

  // Nhóm tin nhắn theo ngày
  const groupedMessages = chatMessages.reduce((groups, msg) => {
    const dateKey = formatDate(msg.createdAt || msg.timestamp);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  return (
    <div className="cp-layout">
      {/* === SIDEBAR DANH SÁCH CONVERSATION === */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-header">
          <div className="cp-sidebar-title">
            <MessageSquare size={18} />
            <span>{userRole === 'customer' ? 'Phiếu Sửa Chữa' : 'Hội Thoại Khách'}</span>
          </div>
          <span className="cp-conv-count">{conversations.length}</span>
        </div>

        <div className="cp-conv-list">
          {conversations.length === 0 ? (
            <div className="cp-empty-state">
              <MessageSquare size={32} className="cp-empty-icon" />
              <p>
                {userRole === 'customer'
                  ? 'Chưa có thợ được phân công.\nVui lòng đặt lịch sửa chữa trước.'
                  : 'Chưa có khách hàng nào được gán cho bạn.'}
              </p>
            </div>
          ) : (
            conversations.map(conv => {
              const statusInfo = getStatusBadge(conv.status);
              const isActive = selectedBooking?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`cp-conv-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectConversation(conv)}
                >
                  <div className="cp-conv-avatar-wrap">
                    <img
                      src={getAvatarUrl(
                        userRole === 'customer' ? conv.technicianAvatar : conv.customerAvatar,
                        userRole === 'customer' ? conv.technicianName : conv.customerName
                      )}
                      alt="avatar"
                      className="cp-conv-avatar"
                    />
                    <span className={`cp-online-dot ${conv.status !== 'completed' ? 'online' : ''}`} />
                  </div>
                  <div className="cp-conv-info">
                    <div className="cp-conv-top-row">
                      <span className="cp-conv-name">
                        {userRole === 'customer'
                          ? (conv.technicianName || 'Thợ sửa chữa')
                          : (conv.customerName || 'Khách hàng')}
                      </span>
                      <span className={`cp-status-mini cp-status-${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="cp-conv-device">
                      🔧 {conv.deviceType || conv.device_type || 'Thiết bị'}
                    </p>
                    <p className="cp-conv-id">#{conv.id}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* === THREAD CHAT CHÍNH === */}
      <main className="cp-thread">
        {selectedBooking ? (
          <>
            {/* Header thread */}
            <div className="cp-thread-header">
              <div className="cp-thread-header-left">
                <img
                  src={getAvatarUrl(
                    userRole === 'customer' ? selectedBooking.technicianAvatar : selectedBooking.customerAvatar,
                    userRole === 'customer' ? selectedBooking.technicianName : selectedBooking.customerName
                  )}
                  alt="avatar"
                  className="cp-header-avatar"
                />
                <div>
                  <h4>
                    {userRole === 'customer'
                      ? (selectedBooking.technicianName || 'Thợ sửa chữa')
                      : (selectedBooking.customerName || 'Khách hàng')}
                  </h4>
                  <p>
                    #{selectedBooking.id} • {selectedBooking.deviceType || selectedBooking.device_type}
                  </p>
                </div>
              </div>
              <div className="cp-thread-header-actions">
                <span className={`cp-status-badge cp-status-${getStatusBadge(selectedBooking.status).cls}`}>
                  {getStatusBadge(selectedBooking.status).label}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="cp-messages-area">
              {isLoading ? (
                <div className="cp-loading-messages">
                  <div className="cp-loading-spinner" />
                  <span>Đang tải lịch sử tin nhắn...</span>
                </div>
              ) : (
                <>
                  {chatMessages.length === 0 && (
                    <div className="cp-no-messages">
                      <MessageSquare size={40} />
                      <p>Chưa có tin nhắn nào. Hãy gửi lời chào! 👋</p>
                    </div>
                  )}

                  {Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
                    <div key={dateLabel} className="cp-date-group">
                      <div className="cp-date-divider">
                        <span>{dateLabel}</span>
                      </div>
                      {msgs.map((msg, idx) => {
                        const isMe = String(msg.senderId) === String(user?.id);
                        const isImage = msg.text && msg.text.startsWith('[IMG]');
                        const imageUrl = isImage ? msg.text.replace('[IMG]', '') : null;

                        return (
                          <div
                            key={msg.id || `${dateLabel}-${idx}`}
                            className={`cp-bubble-row ${isMe ? 'me' : 'them'}`}
                          >
                            {!isMe && (
                              <img
                                src={getAvatarUrl(msg.senderAvatar, msg.senderName)}
                                alt={msg.senderName}
                                className="cp-bubble-avatar"
                              />
                            )}
                            <div className="cp-bubble-wrap">
                              {!isMe && (
                                <span className="cp-sender-name">{msg.senderName}</span>
                              )}
                              <div className={`cp-bubble ${isMe ? 'cp-bubble-me' : 'cp-bubble-them'}`}>
                                {isImage ? (
                                  <img
                                    src={imageUrl}
                                    alt="attachment"
                                    className="cp-img-attachment"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  />
                                ) : (
                                  <p>{msg.text}</p>
                                )}
                              </div>
                              <span className="cp-msg-time">
                                {formatTime(msg.createdAt || msg.timestamp)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className="cp-bubble-row them">
                      <div className="cp-bubble cp-bubble-them cp-typing-bubble">
                        <span className="cp-typing-dot" />
                        <span className="cp-typing-dot" />
                        <span className="cp-typing-dot" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input form */}
            <form className="cp-input-form" onSubmit={onSendMessage}>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImageUpload(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="cp-attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                title="Đính kèm ảnh"
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                className="cp-text-input"
                placeholder={
                  isUploadingImage
                    ? 'Đang tải ảnh lên...'
                    : `Nhắn tin tới ${userRole === 'customer'
                        ? (selectedBooking.technicianName || 'thợ sửa chữa')
                        : (selectedBooking.customerName || 'khách hàng')}...`
                }
                value={newMessage}
                onChange={(e) => onTyping(e.target.value)}
                disabled={isUploadingImage}
                autoComplete="off"
              />
              <button
                type="submit"
                className="cp-send-btn"
                disabled={isUploadingImage || !newMessage.trim()}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="cp-no-selection">
            <div className="cp-no-selection-content">
              <div className="cp-no-selection-icon">
                <MessageSquare size={48} />
              </div>
              <h3>Chọn một cuộc hội thoại</h3>
              <p>
                {userRole === 'customer'
                  ? 'Chọn phiếu sửa chữa bên trái để bắt đầu nhắn tin với thợ sửa chữa của bạn.'
                  : 'Chọn một khách hàng bên trái để bắt đầu tư vấn kỹ thuật.'}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* === PANEL CHI TIẾT BOOKING === */}
      {selectedBooking && (
        <aside className="cp-details-panel">
          <div className="cp-details-header">
            <h3>Chi tiết phiếu</h3>
            <span className="cp-details-id">#{selectedBooking.id}</span>
          </div>

          <div className="cp-details-avatar-section">
            <img
              src={getAvatarUrl(
                userRole === 'customer' ? selectedBooking.technicianAvatar : selectedBooking.customerAvatar,
                userRole === 'customer' ? selectedBooking.technicianName : selectedBooking.customerName
              )}
              alt="avatar"
              className="cp-details-avatar"
            />
            <div>
              <strong>
                {userRole === 'customer'
                  ? (selectedBooking.technicianName || 'Thợ sửa chữa')
                  : (selectedBooking.customerName || 'Khách hàng')}
              </strong>
              <p className="cp-details-role">
                {userRole === 'customer' ? '🔧 Kỹ thuật viên' : '👤 Khách hàng'}
              </p>
            </div>
          </div>

          <hr className="cp-details-divider" />

          {/* Progress Stepper */}
          <div className="cp-stepper">
            {[
              { key: 'assigned', label: 'Đã phân công' },
              { key: 'inspecting', label: 'Kiểm tra' },
              { key: 'repairing', label: 'Đang sửa' },
              { key: 'completed', label: 'Hoàn thành' },
            ].map((step, i) => {
              const stages = ['assigned', 'inspecting', 'repairing', 'completed'];
              const currentIdx = stages.indexOf(selectedBooking.status);
              const stepIdx = stages.indexOf(step.key);
              const isActive = stepIdx <= currentIdx;
              return (
                <div key={step.key} className={`cp-step ${isActive ? 'active' : ''}`}>
                  <div className="cp-step-line-wrap">
                    <div className="cp-step-dot">{i + 1}</div>
                    {i < 3 && <div className={`cp-step-line ${isActive && stepIdx < currentIdx ? 'active' : ''}`} />}
                  </div>
                  <span className="cp-step-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          <hr className="cp-details-divider" />

          <div className="cp-details-info-list">
            <div className="cp-details-info-row">
              <span className="cp-details-lbl">Thiết bị</span>
              <span className="cp-details-val">{selectedBooking.deviceType || selectedBooking.device_type}</span>
            </div>
            <div className="cp-details-info-row">
              <span className="cp-details-lbl">Ngày hẹn</span>
              <span className="cp-details-val">{selectedBooking.preferredDate || '—'}</span>
            </div>
            {selectedBooking.cost > 0 && (
              <div className="cp-details-info-row">
                <span className="cp-details-lbl">Chi phí dự kiến</span>
                <span className="cp-details-val cp-cost-highlight">
                  {selectedBooking.cost.toLocaleString('en-US')} VND
                </span>
              </div>
            )}
          </div>

          {selectedBooking.issueDescription && (
            <div className="cp-details-section">
              <span className="cp-details-lbl">Mô tả sự cố</span>
              <p className="cp-details-desc">{selectedBooking.issueDescription}</p>
            </div>
          )}

          {selectedBooking.notes && (
            <div className="cp-details-section">
              <span className="cp-details-lbl">Ghi chú kỹ thuật viên</span>
              <p className="cp-details-desc">{selectedBooking.notes}</p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};

export default ChatPanel;

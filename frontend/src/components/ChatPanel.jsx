import { useRef, useEffect } from 'react';
import { Send, Paperclip, MessageSquare, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ChatPanel.css';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname))
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : '';

/**
 * ChatPanel - Component nhắn tin cho Customer và Seller (Tư vấn).
 */
const ChatPanel = ({
  conversations = [],
  selectedConversation,
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
  onAcceptConsultation,
  unreadConversations = [],
  title,
}) => {
  const { user, getAvatarUrl } = useAuth();
  const chatEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
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

  const groupedMessages = chatMessages.reduce((groups, msg) => {
    const dateKey = formatDate(msg.createdAt || msg.timestamp);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const isSeller = userRole === 'seller' || userRole === 'admin';

  return (
    <div className="cp-layout">
      {/* SIDEBAR DANH SÁCH YÊU CẦU */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-header">
          <div className="cp-sidebar-title">
            <MessageSquare size={18} />
            <span>{title || (isSeller ? 'Hỗ trợ Tư vấn' : 'Tin nhắn')}</span>
          </div>
          <span className="cp-conv-count">{conversations.length}</span>
        </div>

        <div className="cp-conv-list">
          {conversations.length === 0 ? (
            <div className="cp-empty-state">
              <MessageSquare size={32} className="cp-empty-icon" />
              <p>Chưa có cuộc trò chuyện nào.</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = selectedConversation?.id === conv.id;
              
              // Xác định thông tin người kia dựa trên role
              const partnerName = isSeller 
                ? (conv.customerName || 'Khách hàng') 
                : (conv.sellerName || 'Đang đợi Seller');
              
              const partnerAvatar = isSeller 
                ? conv.customerAvatar 
                : conv.sellerAvatar;

              return (
                <div
                  key={conv.id}
                  className={`cp-conv-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cp-conv-avatar-wrap">
                    <img
                      src={getAvatarUrl(partnerAvatar, partnerName)}
                      alt="avatar"
                      className="cp-conv-avatar"
                    />
                    <span className={`cp-online-dot ${conv.status === 'active' ? 'online' : ''}`} />
                  </div>
                  <div className="cp-conv-info">
                    <div className="cp-conv-top-row">
                      <span className="cp-conv-name">{partnerName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {unreadConversations.includes(conv.id) && (
                          <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--accent-red)', borderRadius: '50%' }} title="Có tin nhắn mới" />
                        )}
                        <span className={`cp-status-mini cp-status-${conv.status}`}>
                          {conv.status === 'pending' ? 'Chờ nhận' : (conv.status === 'internal' ? 'Nội bộ' : 'Đang tư vấn')}
                        </span>
                      </div>
                    </div>
                    <p className="cp-conv-device">
                      {conv.productName ? `📦 ${conv.productName}` : (conv.status === 'internal' ? '💬 Phòng nội bộ' : '💬 Tư vấn chung')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* THREAD CHAT CHÍNH */}
      <main className="cp-thread">
        {selectedConversation ? (
          <>
            {/* Header thread */}
            <div className="cp-thread-header">
              <div className="cp-thread-header-left">
                <img
                  src={getAvatarUrl(
                    isSeller ? selectedConversation.customerAvatar : selectedConversation.sellerAvatar,
                    isSeller ? selectedConversation.customerName : selectedConversation.sellerName
                  )}
                  alt="avatar"
                  className="cp-header-avatar"
                />
                <div>
                  <h4>
                    {isSeller
                      ? (selectedConversation.customerName || 'Khách hàng')
                      : (selectedConversation.sellerName || 'Nhân viên Tư vấn')}
                  </h4>
                  <p>
                    #{selectedConversation.id} • {selectedConversation.productName || (selectedConversation.status === 'internal' ? 'Phòng nội bộ' : 'Tư vấn chung')}
                  </p>
                </div>
              </div>
              <div className="cp-thread-header-actions">
                {isSeller && selectedConversation.status === 'pending' && onAcceptConsultation ? (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => onAcceptConsultation(selectedConversation.id)}
                  >
                    <CheckCircle size={16} style={{marginRight: '6px'}}/> Nhận tư vấn
                  </button>
                ) : (
                  <span className={`cp-status-badge cp-status-${selectedConversation.status}`}>
                    {selectedConversation.status === 'pending' ? 'Đang chờ nhận...' : (selectedConversation.status === 'internal' ? 'Tin nhắn nội bộ' : 'Đang tư vấn')}
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="cp-messages-area" ref={messagesAreaRef}>
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
                      <p>
                        {selectedConversation.status === 'pending' && !isSeller 
                          ? 'Vui lòng chờ nhân viên vào hỗ trợ bạn...' 
                          : 'Chưa có tin nhắn nào. Hãy gửi lời chào! 👋'}
                      </p>
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
                disabled={isUploadingImage || (selectedConversation.status === 'pending' && isSeller)}
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
                    : (selectedConversation.status === 'pending' && isSeller)
                      ? 'Vui lòng nhấn Nhận Tư Vấn trước khi nhắn tin'
                      : 'Nhập tin nhắn của bạn...'
                }
                value={newMessage}
                onChange={(e) => onTyping(e.target.value)}
                disabled={isUploadingImage || (selectedConversation.status === 'pending' && isSeller)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="cp-send-btn"
                disabled={isUploadingImage || !newMessage.trim() || (selectedConversation.status === 'pending' && isSeller)}
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
              <p>Chọn ở danh sách bên trái để bắt đầu nhắn tin.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPanel;

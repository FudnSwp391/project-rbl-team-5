import { useRef, useEffect } from 'react';
import { Send, Paperclip, MessageSquare, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ChatPanel.css';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname))
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : '';

/**
 * InternalChatPanel - Component nhắn tin nội bộ cho Admin.
 */
const InternalChatPanel = ({
  staffList = [],
  selectedConversation,
  chatMessages = [],
  newMessage,
  isLoading,
  isUploadingImage,
  typingUsers = [],
  onSelectStaff,
  onSendMessage,
  onTyping,
  onImageUpload,
  unreadSenders = [],
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

  return (
    <div className="cp-layout">
      {/* SIDEBAR DANH SÁCH NHÂN VIÊN */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-header">
          <div className="cp-sidebar-title">
            <MessageSquare size={18} />
            <span>Tin nhắn nội bộ</span>
          </div>
          <span className="cp-conv-count">{staffList.length}</span>
        </div>

        <div className="cp-conv-list">
          {staffList.length === 0 ? (
            <div className="cp-empty-state">
              <MessageSquare size={32} className="cp-empty-icon" />
              <p>Chưa có nhân viên nào.</p>
            </div>
          ) : (
            staffList.map(staff => {
              const isActive = selectedConversation && 
                (Number(selectedConversation.seller_id) === Number(staff.id) || 
                 Number(selectedConversation.customer_id) === Number(staff.id));
              
              const partnerName = staff.username || staff.full_name;
              const partnerAvatar = staff.avatar;
              const roleText = staff.role === 'seller' ? 'Seller' : 'Thợ sửa chữa';

              return (
                <div
                  key={staff.id}
                  className={`cp-conv-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectStaff(staff)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cp-conv-avatar-wrap">
                    <img
                      src={getAvatarUrl(partnerAvatar, partnerName)}
                      alt="avatar"
                      className="cp-conv-avatar"
                    />
                    <span className={`cp-online-dot ${staff.status === 'active' ? 'online' : ''}`} />
                  </div>
                  <div className="cp-conv-info">
                    <div className="cp-conv-top-row">
                      <span className="cp-conv-name">{partnerName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {unreadSenders.includes(staff.id) && (
                          <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--accent-red)', borderRadius: '50%' }} title="Có tin nhắn mới" />
                        )}
                        <span className="cp-status-mini cp-status-active">
                          {roleText}
                        </span>
                      </div>
                    </div>
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
                  src={getAvatarUrl(selectedConversation.targetAvatar, selectedConversation.targetName)}
                  alt="avatar"
                  className="cp-header-avatar"
                />
                <div>
                  <h4>{selectedConversation.targetName || 'Nhân viên'}</h4>
                  <p>Phòng nội bộ</p>
                </div>
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
                      <p>Chưa có tin nhắn nội bộ nào. Hãy gửi lời chào! 👋</p>
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
                    : 'Nhập tin nhắn nội bộ của bạn...'
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
              <h3>Chọn một nhân viên</h3>
              <p>Chọn ở danh sách bên trái để bắt đầu nhắn tin nội bộ.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InternalChatPanel;

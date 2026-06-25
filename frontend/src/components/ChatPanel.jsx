import { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, MessageSquare, Save, Edit3, CheckCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ChatPanel.css';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname))
  ? `${window.location.protocol}//${window.location.hostname}:5000`
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
  onUpdateStatus,
  onUpdateCostNotes,
}) => {
  const { user, getAvatarUrl } = useAuth();
  const chatEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Trích xuất thông tin thiết bị và mô tả từ bracket [DeviceType] của backend ---
  let displayDeviceType = selectedBooking?.deviceType || selectedBooking?.device_type || 'Thiết bị';
  let displayIssue = selectedBooking?.issueDescription || selectedBooking?.issue_description || '';
  if (displayIssue.startsWith('[')) {
    const closeIdx = displayIssue.indexOf(']');
    if (closeIdx > 0) {
      displayDeviceType = displayIssue.substring(1, closeIdx);
      displayIssue = displayIssue.substring(closeIdx + 1).trim();
    }
  }

  // Định dạng ngày hẹn dự kiến
  let displayDate = '—';
  if (selectedBooking) {
    const rawDate = selectedBooking.preferred_date || selectedBooking.preferredDate;
    if (rawDate) {
      displayDate = new Date(rawDate).toLocaleDateString('vi-VN');
    }
    
    // Trích xuất khung giờ hẹn từ notes của booking
    let displayTime = selectedBooking.preferredTime || '';
    if (!displayTime && selectedBooking.notes && selectedBooking.notes.includes('Khung giờ:')) {
      const matchTime = selectedBooking.notes.match(/Khung giờ:\s*([^\r\n]+)/);
      if (matchTime) {
        displayTime = matchTime[1].trim();
      }
    }
    if (displayTime) {
      displayDate += ` (${displayTime})`;
    }
  }

  // --- Trạng thái chỉnh sửa chi tiết phiếu (chỉ cho technician) ---
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editCost, setEditCost] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Sync local state khi selectedBooking thay đổi
  useEffect(() => {
    if (selectedBooking) {
      setEditCost(selectedBooking.cost > 0 ? String(selectedBooking.cost) : '');
      setEditNotes(selectedBooking.notes || '');
      setIsEditingCost(false);
      setIsEditingNotes(false);
    }
  }, [selectedBooking?.id]);

  const handleStatusChange = async (newStatus) => {
    if (!onUpdateStatus || !selectedBooking) return;
    setIsSavingStatus(true);
    try {
      await onUpdateStatus(selectedBooking.id, newStatus);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSaveCostNotes = async () => {
    if (!onUpdateCostNotes || !selectedBooking) return;
    setIsSavingDetails(true);
    try {
      await onUpdateCostNotes(
        selectedBooking.id,
        editCost ? Number(editCost) : 0,
        editNotes
      );
      setIsEditingCost(false);
      setIsEditingNotes(false);
    } finally {
      setIsSavingDetails(false);
    }
  };

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
              
              let convDeviceType = conv.deviceType || conv.device_type || 'Thiết bị';
              const convIssue = conv.issueDescription || conv.issue_description || '';
              if (convIssue.startsWith('[')) {
                const closeIdx = convIssue.indexOf(']');
                if (closeIdx > 0) {
                  convDeviceType = convIssue.substring(1, closeIdx);
                }
              }

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
                      🔧 {convDeviceType}
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
                    #{selectedBooking.id} • {displayDeviceType}
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

          {/* === TRẠNG THÁI - Technician có thể thay đổi === */}
          {userRole === 'technician' && onUpdateStatus ? (
            <div className="cp-details-section">
              <span className="cp-details-lbl">Cập nhật trạng thái</span>
              <div className="cp-status-select-wrap">
                <select
                  className="cp-status-select"
                  value={selectedBooking.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isSavingStatus}
                >
                  <option value="assigned">Đã phân công</option>
                  <option value="inspecting">Đang kiểm tra</option>
                  <option value="repairing">Đang sửa chữa</option>
                  <option value="completed">Hoàn thành</option>
                </select>
                <ChevronDown size={14} className="cp-select-icon" />
              </div>
            </div>
          ) : null}

          {/* Progress Stepper */}
          <div className="cp-stepper">
            {[
              { key: 'assigned', label: 'Đã phân công', icon: '📋' },
              { key: 'inspecting', label: 'Kiểm tra', icon: '🔍' },
              { key: 'repairing', label: 'Đang sửa', icon: '🔧' },
              { key: 'completed', label: 'Hoàn thành', icon: '✅' },
            ].map((step, i) => {
              const stages = ['assigned', 'inspecting', 'repairing', 'completed'];
              const currentIdx = stages.indexOf(selectedBooking.status);
              const stepIdx = stages.indexOf(step.key);
              const isActive = stepIdx <= currentIdx;
              const isCurrent = stepIdx === currentIdx;
              return (
                <div key={step.key} className={`cp-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="cp-step-line-wrap">
                    <div className="cp-step-dot">
                      {isActive ? <CheckCircle size={12} /> : i + 1}
                    </div>
                    {i < 3 && <div className={`cp-step-line ${isActive && stepIdx < currentIdx ? 'active' : ''}`} />}
                  </div>
                  <span className="cp-step-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          <hr className="cp-details-divider" />

          {/* === THÔNG TIN PHIẾU === */}
          <div className="cp-details-info-list">
            <div className="cp-details-info-row">
              <span className="cp-details-lbl">Thiết bị</span>
              <span className="cp-details-val">{displayDeviceType}</span>
            </div>
            <div className="cp-details-info-row">
              <span className="cp-details-lbl">Ngày hẹn</span>
              <span className="cp-details-val">{displayDate}</span>
            </div>

            {/* === CHI PHÍ - Technician có thể sửa === */}
            <div className="cp-details-info-row">
              <span className="cp-details-lbl">Chi phí dự kiến</span>
              {userRole === 'technician' && onUpdateCostNotes ? (
                isEditingCost ? (
                  <div className="cp-inline-edit">
                    <input
                      type="number"
                      className="cp-edit-input"
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                    <span className="cp-edit-unit">VND</span>
                  </div>
                ) : (
                  <span
                    className="cp-details-val cp-cost-highlight cp-editable"
                    onClick={() => setIsEditingCost(true)}
                    title="Nhấn để chỉnh sửa"
                  >
                    {selectedBooking.cost > 0
                      ? `${selectedBooking.cost.toLocaleString('en-US')} VND`
                      : 'Chưa báo giá'}
                    <Edit3 size={12} className="cp-edit-icon" />
                  </span>
                )
              ) : (
                <span className="cp-details-val cp-cost-highlight">
                  {selectedBooking.cost > 0
                    ? `${selectedBooking.cost.toLocaleString('en-US')} VND`
                    : '—'}
                </span>
              )}
            </div>
          </div>

          {/* === MÔ TẢ SỰ CỐ === */}
          {displayIssue && (
            <div className="cp-details-section">
              <span className="cp-details-lbl">Mô tả sự cố</span>
              <p className="cp-details-desc">{displayIssue}</p>
            </div>
          )}

          {/* === GHI CHÚ KỸ THUẬT VIÊN - Technician có thể sửa === */}
          <div className="cp-details-section">
            <div className="cp-details-section-header">
              <span className="cp-details-lbl">Ghi chú kỹ thuật viên</span>
              {userRole === 'technician' && onUpdateCostNotes && !isEditingNotes && (
                <button
                  className="cp-edit-btn"
                  onClick={() => setIsEditingNotes(true)}
                  title="Chỉnh sửa ghi chú"
                >
                  <Edit3 size={12} />
                </button>
              )}
            </div>
            {userRole === 'technician' && onUpdateCostNotes && isEditingNotes ? (
              <textarea
                className="cp-edit-textarea"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Nhập ghi chú cho khách hàng..."
                rows={3}
              />
            ) : (
              <p className="cp-details-desc">
                {selectedBooking.notes || (userRole === 'technician' ? 'Chưa có ghi chú. Nhấn ✏️ để thêm.' : 'Chưa có ghi chú.')}
              </p>
            )}
          </div>

          {/* === NÚT LƯU (Technician) === */}
          {userRole === 'technician' && onUpdateCostNotes && (isEditingCost || isEditingNotes) && (
            <div className="cp-details-actions">
              <button
                className="cp-save-btn"
                onClick={handleSaveCostNotes}
                disabled={isSavingDetails}
              >
                <Save size={14} />
                {isSavingDetails ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                className="cp-cancel-btn"
                onClick={() => {
                  setIsEditingCost(false);
                  setIsEditingNotes(false);
                  setEditCost(selectedBooking.cost > 0 ? String(selectedBooking.cost) : '');
                  setEditNotes(selectedBooking.notes || '');
                }}
              >
                Hủy
              </button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};

export default ChatPanel;

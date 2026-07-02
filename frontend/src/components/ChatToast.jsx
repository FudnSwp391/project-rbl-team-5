import { MessageSquare, X } from 'lucide-react';
import './ChatToast.css';

/**
 * ChatToast - Hiển thị thông báo popup khi có tin nhắn mới.
 * Props:
 * - toasts: mảng { toastId, sender, message, bookingId }
 * - onDismiss: fn(id) để xóa toast
 * - onClickToast: fn(toast) khi nhấn vào toast (navigate đến chat)
 */
const ChatToast = ({ toasts = [], onDismiss, onClickToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="chat-toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className="chat-toast-item"
          onClick={() => onClickToast?.(toast)}
        >
          <div className="chat-toast-icon-wrap">
            <div className="chat-toast-icon-circle">
              <MessageSquare size={16} />
            </div>
            <span className="chat-toast-pulse" />
          </div>
          <div className="chat-toast-body">
            <div className="chat-toast-header">
              <strong className="chat-toast-sender">{toast.sender || 'Tin nhắn mới'}</strong>
              <span className="chat-toast-time">Vừa xong</span>
            </div>
            <p className="chat-toast-text">
              {toast.message}
            </p>
          </div>
          <button
            className="chat-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.(toast.toastId);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChatToast;

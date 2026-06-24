import { useState, useEffect } from 'react';
import { Clock, Check, X, CreditCard } from 'lucide-react';
import './PaymentConfirmationModal.css';

const PaymentConfirmationModal = ({ 
  orderId, 
  totalAmount, 
  onConfirm, 
  onWait, 
  onCancel, 
  systemInfo 
}) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [confirmAction, setConfirmAction] = useState(null); // 'wait', 'cancel', or null

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (confirmAction === 'cancel') {
    return (
      <div className="payment-modal-backdrop">
        <div className="payment-modal glass-panel">
          <div className="payment-modal-header">
            <h2>⚠️ Xác Nhận Hủy Đơn</h2>
          </div>
          <div className="payment-modal-content" style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6' }}>
              Bạn có chắc chắn muốn hủy đơn đặt hàng này không?<br/>
              Sản phẩm sẽ được mở lại để người khác có thể đặt mua.
            </p>
          </div>
          <div className="payment-modal-footer">
            <button 
              className="btn btn-outline" 
              onClick={() => setConfirmAction(null)}
            >
              Quay lại
            </button>
            <button 
              className="btn btn-danger" 
              onClick={onCancel}
            >
              Đồng ý hủy đơn
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (confirmAction === 'wait') {
    return (
      <div className="payment-modal-backdrop">
        <div className="payment-modal glass-panel">
          <div className="payment-modal-header">
            <h2>⏰ Thanh Toán Sau</h2>
          </div>
          <div className="payment-modal-content" style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6' }}>
              Đơn hàng của bạn sẽ được lưu ở trạng thái <strong>Chờ thanh toán</strong> trong <strong>10 phút</strong>.<br/>
              Bạn có thể chuyển khoản sau bằng cách truy cập trang cá nhân.<br/>
              Sau 10 phút, nếu chưa thanh toán đơn hàng sẽ tự động hủy.
            </p>
          </div>
          <div className="payment-modal-footer">
            <button 
              className="btn btn-outline" 
              onClick={() => setConfirmAction(null)}
            >
              Quay lại
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => setConfirmAction('cancel')}
            >
              Hủy đơn luôn
            </button>
            <button 
              className="btn btn-primary" 
              onClick={onWait}
            >
              Đồng ý, thanh toán sau
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-modal-backdrop">
      <div className="payment-modal glass-panel">
        <div className="payment-modal-header">
          <h2>⏳ Xác Nhận Thanh Toán</h2>
          <p>Vui lòng chuyển khoản trong <span className="countdown">{formatTime(timeLeft)}</span></p>
        </div>

        <div className="payment-modal-content">
          {/* Bank Info */}
          {systemInfo && (
            <div className="bank-section">
              <h4><CreditCard size={18} /> Thông tin tài khoản:</h4>
              <div className="bank-details">
                <p><strong>Ngân hàng:</strong> {systemInfo.bank?.name || 'TPBank'}</p>
                <p><strong>Chủ tài khoản:</strong> {systemInfo.bank?.accountHolder || 'TECHCYCLE'}</p>
                <p><strong>Số tài khoản:</strong> {systemInfo.bank?.accountNumber || '1023456789'}</p>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="amount-section">
            <p>Số tiền cần chuyển:</p>
            <div className="amount-display">
              {totalAmount.toLocaleString('en-US')} <span className="currency">VND</span>
            </div>
          </div>

          {/* QR Code Mock */}
          <div className="qr-section">
            <div className="qr-code-mock">
              <div className="qr-grid">
                {Array(9).fill(null).map((_, i) => (
                  <div key={i} className="qr-cell"></div>
                ))}
              </div>
            </div>
            <p className="qr-label">Quét mã VietQR</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="payment-modal-footer">
          <button 
            className="btn btn-outline" 
            onClick={() => setConfirmAction('wait')}
          >
            Chờ một chút
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm}
          >
            <Check size={16} /> Đã chuyển rồi
          </button>
          <button 
            className="btn btn-danger" 
            onClick={() => setConfirmAction('cancel')}
          >
            <X size={16} /> Hủy đơn
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;

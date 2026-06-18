import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import './VnpayReturn.css';

const VnpayReturn = ({ setActivePage }) => {
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Đang xác minh giao dịch...');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const searchParams = window.location.search;
      if (!searchParams) {
        setStatus('error');
        setMessage('Không tìm thấy thông tin giao dịch.');
        return;
      }

      const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

      try {
        const response = await fetch(`${API_BASE}/api/payment/vnpay_return${searchParams}`);
        const data = await response.json();

        setOrderId(data.orderId || '');

        if (response.ok && data.code === '00') {
          setStatus('success');
          setMessage('Thanh toán thành công! Đơn hàng của bạn đã được ghi nhận.');
        } else {
          setStatus('error');
          setMessage(`Thanh toán thất bại hoặc đã bị hủy. ${data.message || ''}`);
        }
      } catch (error) {
        console.error('Lỗi xác minh thanh toán:', error);
        setStatus('error');
        setMessage('Có lỗi xảy ra khi kết nối tới máy chủ để xác minh thanh toán.');
      }
    };

    verifyPayment();
  }, []);

  return (
    <div className="vnpay-return-page container animate-fade">
      <div className="vnpay-result-card glass-panel text-center">
        {status === 'loading' && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <h3>{message}</h3>
          </div>
        )}

        {status === 'success' && (
          <div className="result-success animate-scale-up">
            <CheckCircle size={64} className="icon-success" />
            <h2>Giao Dịch Thành Công!</h2>
            <p>{message}</p>
            {orderId && <p>Mã Đơn Hàng: <strong>{orderId}</strong></p>}
            
            <div className="result-actions">
              <button className="btn btn-primary" onClick={() => {
                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
                setActivePage('shop');
              }}>
                Tiếp tục mua sắm
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="result-error animate-scale-up">
            <XCircle size={64} className="icon-error" />
            <h2>Giao Dịch Thất Bại</h2>
            <p>{message}</p>
            
            <div className="result-actions">
              <button className="btn btn-primary" onClick={() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                setActivePage('checkout');
              }}>
                Thử thanh toán lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VnpayReturn;

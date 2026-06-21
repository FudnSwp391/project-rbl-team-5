import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Printer, Download } from 'lucide-react';
import './VnpayReturn.css';

const VnpayReturn = ({ setActivePage }) => {
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Đang xác minh giao dịch...');
  const [orderData, setOrderData] = useState(null);

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

        const urlParams = new URLSearchParams(searchParams);
        const amountStr = urlParams.get('vnp_Amount');
        const amount = amountStr ? parseInt(amountStr) / 100 : 0;
        const payDateStr = urlParams.get('vnp_PayDate'); 
        const payDate = payDateStr ? `${payDateStr.substring(6,8)}/${payDateStr.substring(4,6)}/${payDateStr.substring(0,4)} ${payDateStr.substring(8,10)}:${payDateStr.substring(10,12)}` : new Date().toLocaleString('vi-VN');
        const transactionNo = urlParams.get('vnp_TransactionNo');
        const bankCode = urlParams.get('vnp_BankCode');

        if (response.ok && data.code === '00') {
          setStatus('success');
          setMessage('Thanh toán thành công! Đơn hàng của bạn đã được ghi nhận.');
          setOrderData({
            orderId: data.orderId,
            items: data.orderItems || [],
            amount,
            payDate,
            transactionNo,
            bankCode
          });
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

        {status === 'success' && orderData && (
          <div className="result-success animate-scale-up invoice-container">
            <div className="invoice-header no-print">
              <CheckCircle size={64} className="icon-success" />
              <h2>Thanh Toán Thành Công!</h2>
              <p>{message}</p>
            </div>

            {/* INVOICE BILL */}
            <div className="invoice-bill" id="invoice-bill">
              <div className="invoice-bill-header">
                <h3>HÓA ĐƠN ĐIỆN TỬ</h3>
                <p>TechCycle - Uy tín & Chất lượng</p>
              </div>
              <div className="invoice-info">
                <div className="info-row"><span>Mã Đơn Hàng:</span> <strong>#{orderData.orderId}</strong></div>
                <div className="info-row"><span>Mã Giao Dịch (VNPay):</span> <strong>{orderData.transactionNo}</strong></div>
                <div className="info-row"><span>Ngân Hàng:</span> <strong>{orderData.bankCode}</strong></div>
                <div className="info-row"><span>Thời Gian:</span> <strong>{orderData.payDate}</strong></div>
              </div>
              
              <div className="invoice-items">
                <div className="item-row header">
                  <span className="name">Sản phẩm</span>
                  <span className="qty">SL</span>
                  <span className="price">Đơn giá</span>
                </div>
                {orderData.items.map((item, idx) => (
                  <div className="item-row" key={idx}>
                    <span className="name">{item.name}</span>
                    <span className="qty">{item.quantity}</span>
                    <span className="price">{item.price.toLocaleString()}đ</span>
                  </div>
                ))}
              </div>

              <div className="invoice-total">
                <span>Tổng Thanh Toán:</span>
                <span className="total-amount">{orderData.amount.toLocaleString()} VND</span>
              </div>
              <div className="invoice-footer">
                Cảm ơn quý khách đã mua sắm tại TechCycle!
              </div>
            </div>
            
            <div className="result-actions no-print">
              <button className="btn btn-secondary btn-print" onClick={() => window.print()}>
                <Printer size={18} /> In Hóa Đơn
              </button>
              <button className="btn btn-primary" onClick={() => {
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

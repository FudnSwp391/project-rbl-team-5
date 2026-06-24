import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, CreditCard, CheckCircle2, ArrowRight, ShieldCheck, Printer, Calendar } from 'lucide-react';
import './Checkout.css';

const getVietQrBankId = (brand) => {
  if (!brand) return 'vcb';
  const b = brand.toLowerCase().trim();
  if (b === 'vietcombank' || b === 'vcb') return 'vcb';
  if (b === 'tpbank' || b === 'tpb') return 'tpb';
  if (b === 'techcombank' || b === 'tcb') return 'tcb';
  if (b === 'mbbank' || b === 'mb') return 'mb';
  if (b === 'vietinbank' || b === 'ctg') return 'ctg';
  if (b === 'bidv') return 'bidv';
  if (b === 'acb') return 'acb';
  if (b === 'sacombank' || b === 'stb') return 'stb';
  return b;
};

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const Checkout = ({ setActivePage }) => {
  const { cartItems, cartTotal, clearCart, addToCart } = useCart();
  const { user, token } = useAuth();

  // Step state: 'shipping', 'payment', 'payment_qr', 'invoice'
  const [step, setStep] = useState('shipping');
  
  // Form states
  const [fullName, setFullName] = useState(user ? user.username : '');
  const [phone, setPhone] = useState(user ? user.phone : '');
  const [address, setAddress] = useState('123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // cod, bank_transfer, vnpay

  // Final Order details saved from backend
  const [completedOrder, setCompletedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds

  // Promo code states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Dynamic SePay configuration state
  const [sepayConfig, setSepayConfig] = useState({
    bankBrand: 'vietcombank',
    accountNo: '1023456789',
    accountName: 'CONG TY TNHH TECHCYCLE VN'
  });

  // Fetch SePay bank details on mount
  useEffect(() => {
    const fetchSepayConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payments/sepay_config`);
        if (res.ok) {
          const data = await res.json();
          setSepayConfig(data);
        }
      } catch (err) {
        console.error('Error fetching SePay config:', err);
      }
    };
    fetchSepayConfig();
  }, []);

  // Parse VNPAY return query params on mount
  useEffect(() => {
    const parseUrlParams = () => {
      const hash = window.location.hash;
      const searchParamsString = hash.includes('?') ? hash.split('?')[1] : window.location.search;
      const urlParams = new URLSearchParams(searchParamsString);
      
      const orderId = urlParams.get('orderId');
      const stepParam = urlParams.get('step');
      
      if (stepParam === 'invoice' && orderId) {
        setLoading(true);
        
        fetch(`${API_BASE}/api/orders`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => res.json())
        .then(orders => {
          const matchedOrder = orders.find(ord => ord.id === parseInt(orderId));
          if (matchedOrder) {
            setCompletedOrder(matchedOrder);
            setStep('invoice');
          } else {
            setError('Không tìm thấy thông tin đơn hàng thanh toán.');
          }
        })
        .catch(err => {
          setError('Không thể tải thông tin đơn hàng.');
        })
        .finally(() => {
          setLoading(false);
        });
      }
    };

    if (token) {
      parseUrlParams();
    }
  }, [token]);

  // Polling logic for SePay bank transfer status
  useEffect(() => {
    let intervalId;
    if (step === 'payment_qr' && completedOrder) {
      const checkPaymentStatus = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/orders`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const orders = await res.json();
            const currentOrder = orders.find(ord => ord.id === completedOrder.id);
            if (currentOrder && currentOrder.status === 'processing') {
              clearInterval(intervalId);
              clearCart(); // Clear cart now that payment is confirmed
              setCompletedOrder(currentOrder);
              setStep('invoice');
            } else if (currentOrder && currentOrder.status === 'canceled') {
              clearInterval(intervalId);
              setCompletedOrder(currentOrder);
              setError('Giao dịch đã hết hạn thanh toán (quá 3 phút) và đơn hàng đã bị hủy. Các mặt hàng đã được trả về giỏ hàng.');
              // Restore items to cart if not already present
              if (currentOrder.items) {
                currentOrder.items.forEach(item => {
                  const exists = cartItems.some(cartItem => cartItem.id === (item.productId || item.id));
                  if (!exists) {
                    addToCart({
                      id: item.productId || item.id,
                      name: item.name,
                      price: item.price,
                      condition: 'good'
                    });
                  }
                });
              }
            }
          }
        } catch (err) {
          console.error('Error polling payment status:', err);
        }
      };

      // Poll every 3 seconds
      intervalId = setInterval(checkPaymentStatus, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, completedOrder, token, cartItems, addToCart]);

  // Countdown timer for 3 minutes payment limit
  useEffect(() => {
    let timerId;
    if (step === 'payment_qr' && completedOrder && completedOrder.status !== 'canceled') {
      const calculateTimeLeft = () => {
        const createdAt = new Date(completedOrder.createdAt);
        const elapsedMs = new Date() - createdAt;
        const remainingSec = 180 - Math.floor(elapsedMs / 1000);
        if (remainingSec <= 0) {
          setTimeLeft(0);
          clearInterval(timerId);
          // Force set status to canceled on frontend to trigger the UI transition
          setCompletedOrder(prev => {
            const updated = { ...prev, status: 'canceled' };
            if (updated.items) {
              updated.items.forEach(item => {
                const exists = cartItems.some(cartItem => cartItem.id === (item.productId || item.id));
                if (!exists) {
                  addToCart({
                    id: item.productId || item.id,
                    name: item.name,
                    price: item.price,
                    condition: 'good'
                  });
                }
              });
            }
            return updated;
          });
        } else {
          setTimeLeft(remainingSec);
        }
      };

      calculateTimeLeft();
      timerId = setInterval(calculateTimeLeft, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [step, completedOrder, cartItems, addToCart]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualCheckStatus = async () => {
    if (!completedOrder) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const orders = await res.json();
        const currentOrder = orders.find(ord => ord.id === completedOrder.id);
        if (currentOrder && currentOrder.status === 'processing') {
          clearCart();
          setCompletedOrder(currentOrder);
          setStep('invoice');
        } else {
          setError('Hệ thống chưa nhận được khoản thanh toán của bạn. Vui lòng đợi trong giây lát.');
          setTimeout(() => setError(''), 4000);
        }
      }
    } catch (err) {
      setError('Lỗi kiểm tra trạng thái thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="checkout-page container animate-fade">
        <div className="checkout-prompt glass-panel text-center">
          <MapPin size={48} className="prompt-icon animate-bounce" />
          <h2>Yêu Cầu Đăng Nhập</h2>
          <p>Để bảo mật đơn hàng và đồng bộ lịch sử mua sắm, bạn vui lòng đăng nhập tài khoản trước khi thanh toán.</p>
          <button className="btn btn-primary" onClick={() => setActivePage('auth')}>
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && step !== 'invoice') {
    return (
      <div className="checkout-page container animate-fade">
        <div className="checkout-prompt glass-panel text-center">
          <h2>Giỏ hàng trống</h2>
          <p>Không có sản phẩm nào để tiến hành thanh toán.</p>
          <button className="btn btn-primary" onClick={() => setActivePage('shop')}>
            Quay lại Chợ Đồ Cũ
          </button>
        </div>
      </div>
    );
  }

  // Handle Next Steps
  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (!fullName || !phone || !address) {
      setError('Vui lòng nhập đầy đủ thông tin giao hàng.');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    handlePlaceOrder();
  };

  const discountAmount = appliedPromo ? Math.floor(cartTotal * (appliedPromo.discount / 100)) : 0;
  const finalTotal = cartTotal - discountAmount;

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoError('');
    
    try {
      const res = await fetch(`${API_BASE}/api/promocodes/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: promoCodeInput.trim() })
      });
      
      const data = await res.json();
      if (res.ok) {
        setAppliedPromo({ code: data.code, discount: data.discount });
        setPromoCodeInput('');
      } else {
        setPromoError(data.message || 'Mã không hợp lệ');
      }
    } catch (err) {
      setPromoError('Lỗi kết nối');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');

    const orderPayload = {
      items: cartItems.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price
      })),
      shippingInfo: {
        fullName,
        phone,
        address,
        notes
      },
      paymentMethod,
      totalAmount: finalTotal
    };

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Lỗi xử lý đơn hàng.');
      }

      // VNPay redirect
      if (data.redirectUrl) {
        clearCart();
        window.location.href = data.redirectUrl;
        return;
      }

      if (paymentMethod === 'bank_transfer') {
        setCompletedOrder(data);
        setStep('payment_qr');
        return;
      }

      setCompletedOrder(data);
      clearCart();
      setStep('invoice');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page container animate-fade">
      {step !== 'invoice' && step !== 'payment_qr' && (
        <div className="checkout-steps-indicator">
          <div className={`step-item ${step === 'shipping' ? 'active' : ''} ${step !== 'shipping' ? 'completed' : ''}`}>
            <span className="step-num">{step !== 'shipping' ? '✓' : '1'}</span>
            <span className="step-label">Vận chuyển</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step === 'payment' ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">Thanh toán & Đặt hàng</span>
          </div>
        </div>
      )}

      {error && <div className="checkout-error-alert">{error}</div>}

      <div className="checkout-content-grid">
        {/* Main form area */}
        <div className="checkout-main-panel">
          
          {/* STEP 1: SHIPPING FORM */}
          {step === 'shipping' && (
            <form onSubmit={handleShippingSubmit} className="checkout-form glass-panel">
              <h3>Thông tin vận chuyển</h3>
              <p className="form-desc">Nhập địa chỉ giao hàng chính xác để chúng tôi gởi máy đến bạn.</p>
              
              <div className="form-group">
                <label className="form-label">Họ và tên người nhận</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Nguyễn Văn A" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="0901234567" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Địa chỉ nhận hàng</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú giao hàng (Không bắt buộc)</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary checkout-step-btn">
                Tiếp tục đến thanh toán
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: PAYMENT METHOD FORM */}
          {step === 'payment' && (
            <form onSubmit={handlePaymentSubmit} className="checkout-form glass-panel">
              <h3>Phương thức thanh toán</h3>
              <p className="form-desc">Chọn hình thức thanh toán thuận tiện nhất cho bạn.</p>

              <div className="payment-options-list">
                {/* Option 1: COD */}
                <label className={`payment-option-card ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="cod" 
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  <div className="payment-card-details">
                    <span className="payment-opt-title">Thanh toán khi nhận hàng (COD)</span>
                    <p className="payment-opt-desc">Nhận hàng, kiểm tra sản phẩm trước khi thanh toán tiền mặt cho nhân viên giao hàng.</p>
                  </div>
                </label>

                {/* Option 2: Bank Transfer (SePay) */}
                <label className={`payment-option-card ${paymentMethod === 'bank_transfer' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="bank_transfer" 
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                  />
                  <div className="payment-card-details">
                    <span className="payment-opt-title">Chuyển khoản ngân hàng qua mã QR</span>
                    <p className="payment-opt-desc">Chuyển khoản an toàn nhanh chóng qua Napas. Bạn sẽ quét mã QR ngân hàng tại bước xác nhận.</p>
                  </div>
                </label>

                {/* Option 3: VNPay */}
                <label className={`payment-option-card ${paymentMethod === 'vnpay' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="payment_method" 
                    value="vnpay" 
                    checked={paymentMethod === 'vnpay'}
                    onChange={() => setPaymentMethod('vnpay')}
                  />
                  <div className="payment-card-details">
                    <span className="payment-opt-title">Thanh toán qua cổng VNPay</span>
                    <p className="payment-opt-desc">Thanh toán bằng thẻ ATM nội địa, thẻ quốc tế (Visa/MasterCard) qua cổng VNPay an toàn.</p>
                  </div>
                </label>
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="bank-info-box animate-fade">
                  <h4>Thông tin tài khoản thụ hưởng:</h4>
                  <ul>
                    <li>Ngân hàng: <strong>{sepayConfig.bankBrand.toUpperCase()}</strong></li>
                    <li>Chủ tài khoản: <strong>{sepayConfig.accountName}</strong></li>
                    <li>Số tài khoản: <strong>{sepayConfig.accountNo}</strong></li>
                    <li>Nội dung chuyển khoản: <strong>Mã đơn hàng chuyển khoản</strong></li>
                  </ul>
                </div>
              )}

              <div className="checkout-actions-row">
                <button type="button" className="btn btn-outline" onClick={() => setStep('shipping')} disabled={loading}>
                  Quay lại địa chỉ
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Đang tạo đơn hàng...' : paymentMethod === 'bank_transfer' ? 'Thanh toán qua QR' : 'Hoàn tất đặt hàng'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>
            </form>
          )}


          {/* STEP 3.5: SEPAY DYNAMIC VIETQR SCREEN */}
          {step === 'payment_qr' && completedOrder && (
            <div className="checkout-form glass-panel payment-qr-container text-center animate-fade">
              {completedOrder.status === 'canceled' ? (
                <div className="payment-expired-container" style={{ padding: '40px 20px' }}>
                  <div className="expired-icon" style={{ fontSize: '64px', color: '#ff6b6b', marginBottom: '20px' }}>⚠️</div>
                  <h3 style={{ color: '#ff6b6b', marginBottom: '12px' }}>Đơn hàng đã bị hủy</h3>
                  <p className="form-desc" style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>
                    Đã quá 3 phút mà hệ thống chưa nhận được thanh toán chuyển khoản của bạn.
                  </p>
                  <p style={{ opacity: 0.8, marginBottom: '24px' }}>
                    Các mặt hàng trong đơn hàng đã được hoàn trả lại Chợ đồ cũ của cửa hàng.
                  </p>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => setActivePage('shop')}
                  >
                    Quay lại Chợ đồ cũ
                  </button>
                </div>
              ) : (
                <>
                  <div className="payment-qr-header">
                    <h3>Thanh Toán Chuyển Khoản Ngân Hàng</h3>
                    <p className="form-desc">Vui lòng quét mã QR dưới đây hoặc chuyển khoản theo thông tin chi tiết.</p>
                    
                    {/* Countdown Timer Display */}
                    <div className="payment-countdown-timer" style={{
                      margin: '15px auto 0',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: 'rgba(255, 107, 107, 0.1)',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#ff6b6b',
                      fontWeight: 'bold'
                    }}>
                      <span className="timer-icon">⏱</span>
                      <span>Thời gian còn lại để thanh toán: <strong style={{ fontSize: '1.2rem', fontFamily: 'monospace' }}>{formatTime(timeLeft)}</strong></span>
                    </div>
                  </div>

              <div className="payment-qr-content">
                <div className="qr-image-wrapper">
                  <img 
                    src={`https://img.vietqr.io/image/${getVietQrBankId(sepayConfig.bankBrand)}-${sepayConfig.accountNo}-compact2.png?amount=${completedOrder.totalAmount}&addInfo=TC${completedOrder.id}&accountName=${encodeURIComponent(sepayConfig.accountName)}`}
                    alt="VietQR TechCycle Payment" 
                    className="qr-image"
                  />
                  <div className="qr-scanning-indicator">
                    <span className="pulse-dot"></span>
                    <span className="indicator-text">Đang chờ bạn quét mã chuyển tiền...</span>
                  </div>
                </div>

                <div className="payment-details-table">
                  <div className="details-row">
                    <span className="details-label">Ngân hàng:</span>
                    <span className="details-value">{sepayConfig.bankBrand.toUpperCase()}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Số tài khoản:</span>
                    <span className="details-value copyable" onClick={() => { navigator.clipboard.writeText(sepayConfig.accountNo); alert("Đã sao chép số tài khoản!"); }}>{sepayConfig.accountNo} <span className="copy-badge">Sao chép</span></span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Chủ tài khoản:</span>
                    <span className="details-value">{sepayConfig.accountName}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Số tiền:</span>
                    <span className="details-value highlight">{(completedOrder.totalAmount || 0).toLocaleString('vi-VN')} VND</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Nội dung chuyển khoản:</span>
                    <span className="details-value copyable highlight" onClick={() => { navigator.clipboard.writeText(`TC${completedOrder.id}`); alert("Đã sao chép nội dung chuyển khoản!"); }}>TC{completedOrder.id} <span className="copy-badge">Sao chép</span></span>
                  </div>
                </div>
              </div>

              <div className="payment-qr-warning">
                <p>⚠️ <strong>Lưu ý quan trọng:</strong> Bạn phải nhập chính xác nội dung chuyển khoản là <strong className="highlight">TC{completedOrder.id}</strong> và số tiền chuyển để hệ thống tự động xác nhận đơn hàng trong vòng 10 giây.</p>
              </div>

              <div className="payment-qr-actions">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => {
                    if (window.confirm("Đơn hàng của bạn đã được tạo ở trạng thái Chờ thanh toán. Bạn có chắc chắn muốn quay lại cửa hàng?")) {
                      setActivePage('shop');
                    }
                  }}
                  disabled={loading}
                >
                  Quay lại Chợ đồ cũ
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-check-payment" 
                  onClick={handleManualCheckStatus}
                  disabled={loading}
                >
                  {loading ? 'Đang kiểm tra...' : 'Xác nhận đã chuyển khoản'}
                </button>
              </div>
                </>
              )}
            </div>
          )}

          {/* STEP 4: INVOICE PRINT VIEW */}
          {step === 'invoice' && completedOrder && (
            <div className="invoice-container glass-panel animate-scale-up">
              <div className="invoice-header">
                <div className="invoice-brand">
                  <div className="invoice-logo">
                    <span>TechCycle Invoice</span>
                  </div>
                  <p>Công nghệ tuần hoàn - Tương lai bền vững</p>
                </div>
                <div className="invoice-meta">
                  <h2>HÓA ĐƠN MUA HÀNG</h2>
                  <p>Mã hóa đơn: <strong>{completedOrder.invoiceNumber}</strong></p>
                  <p><Calendar size={14} /> Ngày lập: {new Date(completedOrder.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              <hr className="invoice-divider" />

              <div className="invoice-addresses">
                <div className="addr-col">
                  <h5>ĐƠN VỊ CUNG CẤP:</h5>
                  <p><strong>TechCycle Việt Nam</strong></p>
                  <p>123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh</p>
                  <p>Hotline: 0900.112.233</p>
                </div>
                <div className="addr-col">
                  <h5>KHÁCH HÀNG:</h5>
                  <p><strong>{completedOrder.shippingInfo.fullName}</strong></p>
                  <p>{completedOrder.shippingInfo.address}</p>
                  <p>SĐT: {completedOrder.shippingInfo.phone}</p>
                </div>
              </div>

              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th className="text-right">Đơn giá</th>
                    <th className="text-right">Số lượng</th>
                    <th className="text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td className="text-right">{(item.price || 0).toLocaleString('en-US')} <span className="currency">VND</span></td>
                      <td className="text-right">1</td>
                      <td className="text-right">{(item.price || 0).toLocaleString('en-US')} <span className="currency">VND</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-totals">
                <div className="totals-row">
                  <span>Tạm tính:</span>
                  <span>{completedOrder.totalAmount.toLocaleString('en-US')} <span className="currency">VND</span></span>
                </div>
                <div className="totals-row">
                  <span>VAT (0% - Thiết bị cũ tái chế):</span>
                  <span>0 <span className="currency">VND</span></span>
                </div>
                <div className="totals-row">
                  <span>Vận chuyển:</span>
                  <span>Miễn phí</span>
                </div>
                <hr />
                <div className="totals-row final-row">
                  <span>Tổng thanh toán:</span>
                  <span>{completedOrder.totalAmount.toLocaleString('en-US')} <span className="currency">VND</span></span>
                </div>
              </div>

              <div className="invoice-footer">
                <div className="payment-status-badge">
                  <ShieldCheck size={18} />
                  <span>Trạng thái: CHỜ GIAO HÀNG / {completedOrder.paymentMethod === 'cod' ? 'Thanh toán COD' : completedOrder.paymentMethod === 'vnpay' ? 'Đã thanh toán VNPay' : 'Đã thanh toán CK'}</span>
                </div>
                
                <div className="invoice-actions no-print">
                  <button className="btn btn-outline" onClick={() => window.print()}>
                    <Printer size={16} />
                    In hóa đơn
                  </button>
                  <button className="btn btn-primary" onClick={() => setActivePage('shop')}>
                    Tiếp tục mua sắm
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Summary (Only visible during setup steps) */}
        {step !== 'invoice' && (
          <aside className="checkout-summary-sidebar glass-panel">
            <h3>Chi tiết đơn hàng</h3>
            <hr className="summary-divider" />
            
            <div className="checkout-items-list">
              {cartItems.map(item => (
                <div key={item.id} className="checkout-item-row">
                  <div className="checkout-item-info">
                    <span>{item.name}</span>
                    <span className="item-cond">{item.condition === 'excellent' ? 'Như mới' : item.condition === 'good' ? 'Rất tốt' : 'Khá'}</span>
                  </div>
                  <span className="checkout-item-price">{(item.price || 0).toLocaleString('en-US')} <span className="currency">VND</span></span>
                </div>
              ))}
            </div>

            <hr className="summary-divider" />

            <div className="promo-code-section" style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Mã khuyến mãi" 
                  value={promoCodeInput}
                  onChange={e => setPromoCodeInput(e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                />
                <button 
                  className="btn btn-secondary" 
                  onClick={handleApplyPromo}
                  disabled={isApplyingPromo || !promoCodeInput.trim()}
                  style={{ padding: '8px 12px' }}
                >
                  {isApplyingPromo ? '...' : 'Áp dụng'}
                </button>
              </div>
              {promoError && <div style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '4px' }}>{promoError}</div>}
              {appliedPromo && (
                <div style={{ color: '#4CAF50', fontSize: '0.85rem', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>✓ Áp dụng mã {appliedPromo.code} (-{appliedPromo.discount}%)</span>
                  <button onClick={() => setAppliedPromo(null)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem' }}>Xóa</button>
                </div>
              )}
            </div>

            <div className="summary-row">
              <span>Tạm tính:</span>
              <span>{cartTotal.toLocaleString('en-US')} <span className="currency">VND</span></span>
            </div>
            {appliedPromo && (
              <div className="summary-row" style={{ color: '#4CAF50' }}>
                <span>Giảm giá:</span>
                <span>-{discountAmount.toLocaleString('en-US')} <span className="currency">VND</span></span>
              </div>
            )}
            <div className="summary-row">
              <span>Phí giao hàng:</span>
              <span className="green-text">Miễn phí</span>
            </div>
            
            <hr className="summary-divider" />

            <div className="summary-row total-row">
              <span>Tổng thanh toán:</span>
              <span className="total-val">{finalTotal.toLocaleString('en-US')} <span className="currency">VND</span></span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Checkout;

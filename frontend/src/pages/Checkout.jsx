import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, CreditCard, CheckCircle2, ArrowRight, ShieldCheck, Printer, Calendar, Phone, Store, User, ListOrdered, Package, Tag, ShoppingCart, FileText, Coins, Truck, Check, ClipboardCheck, ChevronRight, Mail, Globe } from 'lucide-react';
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
    bankBrand: 'TPBank',
    accountNo: '0325225503',
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
            } else if (currentOrder && (currentOrder.status === 'canceled' || currentOrder.status === 'cancelled')) {
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
    if (step === 'payment_qr' && completedOrder && completedOrder.status !== 'canceled' && completedOrder.status !== 'cancelled') {
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

  const handleCancelPayment = async () => {
    if (!completedOrder) return;
    if (window.confirm("Bạn có chắc chắn muốn hủy thanh toán và hủy đơn hàng này không? Sản phẩm sẽ được trả lại shop ngay lập tức.")) {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/api/orders/${completedOrder.id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          alert("Đã hủy thanh toán và hoàn trả sản phẩm về shop thành công!");
          setCompletedOrder(null);
          setStep('payment'); // Quay lại bước chọn phương thức thanh toán
        } else {
          const data = await res.json();
          setError(data.message || 'Lỗi khi hủy thanh toán.');
        }
      } catch (err) {
        setError('Lỗi kết nối khi hủy thanh toán.');
      } finally {
        setLoading(false);
      }
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
                  className="btn btn-outline btn-cancel-payment" 
                  onClick={handleCancelPayment}
                  disabled={loading}
                  style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
                >
                  Hủy thanh toán & Quay lại
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
            <div className="invoice-container modern-invoice animate-scale-up">
              {/* Header section */}
              <div className="invoice-header">
                <div className="invoice-brand">
                  <div className="invoice-logo-wrapper">
                    <img src="/logo.png" alt="TechCycle" className="invoice-logo-img" onError={(e) => e.target.style.display = 'none'} />
                    <div className="invoice-brand-text">
                      <span className="logo-main">TechCycle</span>
                      <span className="logo-sub">Invoice</span>
                    </div>
                  </div>
                  <p className="invoice-tagline">Công nghệ tuần hoàn - Tương lai bền vững</p>
                </div>
                <div className="invoice-meta-new">
                  <h2 className="invoice-title-text">HÓA ĐƠN MUA HÀNG</h2>
                  <div className="invoice-meta-badges">
                    <div className="meta-badge-item">
                      <span className="badge-label">Mã hóa đơn:</span>
                      <span className="badge-value text-green">{completedOrder.invoiceNumber}</span>
                    </div>
                    <div className="meta-badge-item">
                      <span className="badge-label">Ngày lập:</span>
                      <span className="badge-value"><Calendar size={12} /> {new Date(completedOrder.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Columns */}
              <div className="invoice-addresses-new">
                {/* Supplier */}
                <div className="addr-card-new">
                  <span className="card-badge supplier-badge">ĐƠN VỊ CUNG CẤP</span>
                  <div className="card-content-new">
                    <div className="card-icon-avatar">
                      <Store size={22} className="avatar-icon" />
                    </div>
                    <div className="card-info-new">
                      <h4>TechCycle Việt Nam</h4>
                      <p><MapPin size={14} /> 123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh</p>
                      <p><Phone size={14} /> 0900.112.233</p>
                    </div>
                  </div>
                </div>

                {/* Customer */}
                <div className="addr-card-new">
                  <span className="card-badge customer-badge">KHÁCH HÀNG</span>
                  <div className="card-content-new">
                    <div className="card-icon-avatar">
                      <User size={22} className="avatar-icon" />
                    </div>
                    <div className="card-info-new">
                      <h4>{completedOrder.shippingInfo.fullName}</h4>
                      <p><MapPin size={14} /> {completedOrder.shippingInfo.address}</p>
                      <p><Phone size={14} /> {completedOrder.shippingInfo.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="invoice-table-new">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>STT</th>
                    <th>SẢN PHẨM</th>
                    <th className="text-right" style={{ width: '180px' }}>ĐƠN GIÁ</th>
                    <th className="text-center" style={{ width: '120px' }}>SỐ LƯỢNG</th>
                    <th className="text-right" style={{ width: '180px' }}>THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td className="item-name-cell">{item.name}</td>
                      <td className="text-right font-medium">{(item.price || 0).toLocaleString('vi-VN')} <span className="currency-unit">VND</span></td>
                      <td className="text-center">1</td>
                      <td className="text-right text-green font-bold">{(item.price || 0).toLocaleString('vi-VN')} <span className="currency-unit">VND</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Notes and Totals Row */}
              <div className="invoice-middle-row">
                {/* Notes card */}
                <div className="notes-card-new">
                  <div className="notes-header">
                    <FileText size={16} />
                    <span>GHI CHÚ</span>
                  </div>
                  <div className="notes-body">
                    {completedOrder.shippingInfo.notes ? completedOrder.shippingInfo.notes : 'Cám ơn quý khách đã tin tưởng và sử dụng dịch vụ của TechCycle.'}
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="totals-box-new">
                  <div className="totals-item-new">
                    <span className="totals-label-new"><FileText size={14} /> Tạm tính:</span>
                    <span className="totals-value-new">{(completedOrder.totalAmount || 0).toLocaleString('vi-VN')} <span className="currency-unit">VND</span></span>
                  </div>
                  <div className="totals-item-new">
                    <span className="totals-label-new"><Coins size={14} /> VAT (0% - Thiết bị cũ tái chế):</span>
                    <span className="totals-value-new">0 <span className="currency-unit">VND</span></span>
                  </div>
                  <div className="totals-item-new">
                    <span className="totals-label-new"><Truck size={14} /> Vận chuyển:</span>
                    <span className="totals-value-new text-green">Miễn phí</span>
                  </div>
                  
                  <div className="totals-final-row">
                    <span className="final-label">TỔNG THANH TOÁN:</span>
                    <span className="final-value">{(completedOrder.totalAmount || 0).toLocaleString('vi-VN')} <span className="currency-unit">VND</span></span>
                  </div>
                </div>
              </div>

              {/* Status and Next Steps */}
              <div className="invoice-bottom-grid">
                {/* Order status */}
                <div className="status-box-card">
                  <div className="card-header-new">
                    <CheckCircle2 size={16} />
                    <span>TRẠNG THÁI HÓA ĐƠN</span>
                  </div>
                  <div className="status-badge-wrapper">
                    <div className="status-check-circle">
                      <Check size={14} />
                    </div>
                    <span className="status-badge-text-green">
                      {completedOrder.paymentMethod === 'cod' ? 'CHỜ GIAO HÀNG / THANH TOÁN COD' : completedOrder.paymentMethod === 'vnpay' ? 'CHỜ GIAO HÀNG / ĐÃ THANH TOÁN VNPAY' : 'CHỜ GIAO HÀNG / ĐÃ THANH TOÁN CK'}
                    </span>
                  </div>
                </div>

                {/* Next steps timeline */}
                <div className="next-steps-card">
                  <div className="card-header-new">
                    <Truck size={16} />
                    <span>CÁC BƯỚC TIẾP THEO</span>
                  </div>
                  <div className="steps-timeline-wrapper">
                    {/* Step 1 */}
                    <div className="timeline-step-item active">
                      <div className="step-circle-icon">
                        <ClipboardCheck size={16} />
                      </div>
                      <span className="step-name-text">Xác nhận đơn hàng</span>
                    </div>
                    <ChevronRight size={14} className="step-arrow-separator" />

                    {/* Step 2 */}
                    <div className="timeline-step-item">
                      <div className="step-circle-icon">
                        <Truck size={16} />
                      </div>
                      <span className="step-name-text">Chuẩn bị giao hàng</span>
                    </div>
                    <ChevronRight size={14} className="step-arrow-separator" />

                    {/* Step 3 */}
                    <div className="timeline-step-item">
                      <div className="step-circle-icon">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="step-name-text">Giao hàng thành công</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thank you note & Footer contact */}
              <div className="invoice-footer-new">
                <div className="footer-links-col">
                  <div className="thank-you-message">
                    🌱 Cảm ơn quý khách đã lựa chọn TechCycle! 🌱
                  </div>
                  <div className="footer-contact-details">
                    <span className="contact-item"><Mail size={12} /> support@techcycle.vn</span>
                    <span className="contact-item"><Globe size={12} /> www.techcycle.vn</span>
                  </div>
                </div>
                
                {/* QR Code section */}
                <div className="footer-qr-code-section">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=https://techcycle.vn/invoice/${completedOrder.id}`} alt="Invoice QR Code" className="footer-qr-img" />
                  <span className="qr-instruct-text">Quét mã để xem<br />thông tin đơn hàng</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="invoice-actions-row no-print">
                <button className="btn btn-outline btn-print-invoice" onClick={() => window.print()}>
                  <Printer size={16} />
                  In hóa đơn
                </button>
                <button className="btn btn-primary" onClick={() => setActivePage('shop')}>
                  Tiếp tục mua sắm
                </button>
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

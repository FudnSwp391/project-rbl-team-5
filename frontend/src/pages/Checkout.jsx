import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, CreditCard, CheckCircle2, ArrowRight, ShieldCheck, Printer, Calendar, Check, X } from 'lucide-react';
import './Checkout.css';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';

const Checkout = ({ setActivePage }) => {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, token } = useAuth();

  // Step state: 'shipping', 'payment', 'confirm', 'invoice'
  const [step, setStep] = useState('shipping');
  
  // Form states
  const [fullName, setFullName] = useState(user ? user.username : '');
  const [phone, setPhone] = useState(user ? user.phone : '');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // cod, bank_transfer

  // Final Order details saved from backend
  const [completedOrder, setCompletedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Promo code states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // System info and payment confirmation states
  const [systemInfo, setSystemInfo] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState(null);

  // Fetch system info from backend
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/api';
        const response = await fetch(`${API_BASE}/api/system-info`);
        if (response.ok) {
          const data = await response.json();
          setSystemInfo(data);
        }
      } catch (error) {
        console.error('Lỗi lấy system info:', error);
      }
    };
    fetchSystemInfo();
  }, []);

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
    setStep('confirm');
  };

  const discountAmount = appliedPromo ? Math.floor(cartTotal * (appliedPromo.discount / 100)) : 0;
  const finalTotal = cartTotal - discountAmount;

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoError('');
    
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';
    
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

    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

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

      if (data.redirectUrl) {
        // Lưu thông tin giỏ hàng tạm thời (nếu cần) hoặc chỉ đơn giản chuyển hướng
        clearCart();
        window.location.href = data.redirectUrl;
        return;
      }

      setCompletedOrder(data);
      
      if (paymentMethod === 'bank_transfer') {
        setPaymentOrderId(data.id);
        setShowPaymentModal(true);
      } else {
        clearCart();
        setStep('invoice');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setLoading(true);
      const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';
      const response = await fetch(`${API_BASE}/api/orders/${paymentOrderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setShowPaymentModal(false);
        clearCart();
        setStep('invoice');
      }
    } catch (error) {
      setError('Lỗi xác nhận thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleWaitPayment = () => {
    setShowPaymentModal(false);
    clearCart();
    alert('Đơn đặt hàng của bạn đã được lưu ở trạng thái "Chờ thanh toán" trong 10 phút. Bạn có thể kiểm tra hoặc hủy đơn bất cứ lúc nào trong trang cá nhân.');
    setActivePage('dashboard');
  };

  const handleCancelOrder = async () => {
    try {
      setLoading(true);
      const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';
      const response = await fetch(`${API_BASE}/api/orders/${paymentOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setShowPaymentModal(false);
        // Do NOT call clearCart() so the items remain in the cart for a quick retry with a different method.
        alert('Đơn hàng đã được hủy thành công. Bạn có thể chọn phương thức thanh toán khác và đặt hàng lại.');
        setStep('shipping');
        setPaymentMethod('cod');
      }
    } catch (error) {
      setError('Lỗi hủy đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page container animate-fade">
      {/* Step Indicators */}
      {step !== 'invoice' && (
        <div className="checkout-steps-indicator">
          <div className={`step-item ${step === 'shipping' ? 'active' : ''} ${step !== 'shipping' ? 'completed' : ''}`}>
            <span className="step-num">{step !== 'shipping' ? '✓' : '1'}</span>
            <span className="step-label">Vận chuyển</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step === 'payment' ? 'active' : ''} ${step === 'confirm' ? 'completed' : ''}`}>
            <span className="step-num">{step === 'confirm' ? '✓' : '2'}</span>
            <span className="step-label">Thanh toán</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step === 'confirm' ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">Xác nhận</span>
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
              <p className="form-desc">Nhập địa chỉ giao hàng chính xác để chúng tôi gửi máy đến bạn.</p>
              
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

                {/* Option 2: Bank Transfer */}
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
                    <li>Ngân hàng: <strong>Vietcombank (VCB)</strong></li>
                    <li>Chủ tài khoản: <strong>CÔNG TY TNHH TECHCYCLE VN</strong></li>
                    <li>Số tài khoản: <strong>1023456789</strong></li>
                    <li>Nội dung chuyển khoản: <strong>Mã đơn hàng chuyển khoản</strong></li>
                  </ul>
                </div>
              )}

              <div className="checkout-actions-row">
                <button type="button" className="btn btn-outline" onClick={() => setStep('shipping')}>
                  Quay lại địa chỉ
                </button>
                <button type="submit" className="btn btn-primary">
                  Kiểm tra đơn hàng
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ORDER CONFIRMATION */}
          {step === 'confirm' && (
            <div className="checkout-form glass-panel">
              <h3>Xác nhận đơn hàng</h3>
              <p className="form-desc">Vui lòng kiểm tra kỹ mọi thông tin trước khi nhấn Hoàn tất đặt hàng.</p>

              <div className="confirmation-blocks">
                <div className="confirm-block">
                  <h4><MapPin size={16} /> Địa chỉ giao nhận:</h4>
                  <p><strong>{fullName}</strong> - {phone}</p>
                  <p>{address}</p>
                  {notes && <p className="confirm-notes">Ghi chú: {notes}</p>}
                </div>

                <div className="confirm-block">
                  <h4><CreditCard size={16} /> Phương thức thanh toán:</h4>
                  <p>{paymentMethod === 'cod' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : paymentMethod === 'vnpay' ? 'Thanh toán qua cổng VNPay' : 'Chuyển khoản ngân hàng (Napas)'}</p>
                  
                  {paymentMethod === 'bank_transfer' && (
                    <div className="bank-qr-mock">
                      <div className="qr-box">
                        {/* Mock QR Code representation */}
                        <div className="qr-code-grid">
                          <div></div><div></div><div></div>
                          <div></div><div></div><div></div>
                          <div></div><div></div><div></div>
                        </div>
                        <span>Quét mã VietQR</span>
                      </div>
                      <div className="qr-instruct">
                        <p>Quét mã bằng ứng dụng ngân hàng của bạn để chuyển khoản số tiền: <strong>{cartTotal.toLocaleString('en-US')} <span className="currency">VND</span></strong></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="checkout-actions-row">
                <button type="button" className="btn btn-outline" onClick={() => setStep('payment')} disabled={loading}>
                  Quay lại thanh toán
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-confirm-order" 
                  onClick={handlePlaceOrder}
                  disabled={loading}
                >
                  {loading ? 'Đang tạo đơn hàng...' : 'Hoàn tất đặt hàng'}
                  <CheckCircle2 size={18} />
                </button>
              </div>
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

      {/* Payment Confirmation Modal */}
      {showPaymentModal && systemInfo && (
        <PaymentConfirmationModal
          orderId={paymentOrderId}
          totalAmount={finalTotal}
          onConfirm={handleConfirmPayment}
          onWait={handleWaitPayment}
          onCancel={handleCancelOrder}
          systemInfo={systemInfo}
        />
      )}
    </div>
  );
};

export default Checkout;

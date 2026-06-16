import { useCart } from '../context/CartContext';
import { getProductImage } from '../components/ProductCard';
import { Trash2, ArrowLeft, ShoppingBag, CreditCard, Recycle, ShieldAlert } from 'lucide-react';
import './Cart.css';

const Cart = ({ setActivePage }) => {
  const { cartItems, removeFromCart, cartTotal } = useCart();

  const getConditionLabel = (cond) => {
    switch (cond) {
      case 'excellent': return 'Như mới (99%)';
      case 'good': return 'Rất tốt (>90%)';
      case 'fair': return 'Khá tốt (>80%)';
      default: return cond;
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page container animate-fade">
        <div className="empty-cart-card glass-panel text-center">
          <ShoppingBag size={54} className="empty-icon animate-pulse" />
          <h2>Giỏ hàng của bạn đang trống</h2>
          <p>Hiện chưa có thiết bị nào được thêm vào giỏ hàng. Hãy ghé qua Chợ đồ cũ để lựa chọn các thiết bị chất lượng giá hời nhé!</p>
          <button className="btn btn-primary" onClick={() => setActivePage('shop')}>
            Quay lại Chợ Đồ Cũ
            <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      </div>
    );
  }

  // Calculate environmental impacts (simulated)
  const co2Reduced = cartItems.length * 15; // 15kg CO2 offset per device on average
  const ewasteSaved = cartItems.length * 1.2; // 1.2kg e-waste reduced per device on average

  return (
    <div className="cart-page container animate-fade">
      <h1 className="cart-title">Giỏ hàng của bạn</h1>
      <p className="cart-subtitle">Kiểm tra lại danh sách sản phẩm trước khi tiến hành thanh toán.</p>

      <div className="cart-layout">
        {/* Left Side: Product List */}
        <div className="cart-items-panel">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item glass-panel animate-slide-up">
              <div className="item-img-wrapper">
                <img src={getProductImage(item)} alt={item.name} className="item-img" />
              </div>
              
              <div className="item-details">
                <div className="item-meta">
                  <span className={`item-badge badge-${item.condition}`}>
                    {getConditionLabel(item.condition)}
                  </span>
                  <span className="item-cat">{item.category}</span>
                </div>
                <h3 className="item-title">{item.name}</h3>
                <p className="item-price">
                  {(item.price || 0).toLocaleString('en-US')} <span className="currency">VND</span>
                </p>
              </div>

              <div className="item-actions">
                <button 
                  className="delete-item-btn" 
                  onClick={() => removeFromCart(item.id)}
                  title="Xóa khỏi giỏ hàng"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          <button className="btn btn-text back-to-shop-btn" onClick={() => setActivePage('shop')}>
            <ArrowLeft size={16} />
            Tiếp tục mua sắm
          </button>
        </div>

        {/* Right Side: Order Summary */}
        <aside className="cart-summary-panel glass-panel">
          <h3>Tóm tắt đơn hàng</h3>
          <hr className="summary-divider" />
          
          <div className="summary-row">
            <span>Tạm tính ({cartItems.length} sản phẩm):</span>
            <span className="summary-val">{cartTotal.toLocaleString('en-US')} <span className="currency">VND</span></span>
          </div>
          <div className="summary-row">
            <span>Phí vận chuyển:</span>
            <span className="summary-val green-text">Miễn phí</span>
          </div>

          <hr className="summary-divider" />

          <div className="summary-row total-row">
            <span>Tổng thanh toán:</span>
            <span className="total-amount">{cartTotal.toLocaleString('en-US')} <span className="currency">VND</span></span>
          </div>

          {/* Eco Impact Message */}
          <div className="cart-eco-impact-box">
            <Recycle size={20} className="eco-icon" />
            <div>
              <h4>Tác động xanh:</h4>
              <p>Đơn hàng này giúp tái chế <strong>{ewasteSaved.toFixed(1)}kg</strong> rác thải điện tử và giảm thiểu phát thải <strong>{co2Reduced}kg CO2</strong> ra môi trường!</p>
            </div>
          </div>

          <div className="safety-warning-box">
            <ShieldAlert size={18} className="warn-icon" />
            <p>Thiết bị công nghệ cũ đã qua kiểm định chất lượng nghiêm ngặt bởi chuyên viên TechCycle.</p>
          </div>

          <button 
            className="btn btn-secondary checkout-btn" 
            onClick={() => setActivePage('checkout')}
          >
            <CreditCard size={18} />
            Tiến hành thanh toán
          </button>
        </aside>
      </div>
    </div>
  );
};

export default Cart;

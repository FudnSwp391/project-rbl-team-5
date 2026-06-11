import { useCart } from '../context/CartContext';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import './ProductCard.css';

const CONDITION_LABELS = {
  excellent: 'Như mới',
  good: 'Rất tốt',
  fair: 'Khá tốt',
};

const CATEGORY_LABELS = {
  AirConditioner: 'Máy lạnh',
  WashingMachine: 'Máy giặt',
  Refrigerator: 'Tủ lạnh',
  Microwave: 'Lò vi sóng',
  Phone: 'Điện thoại',
  Laptop: 'Máy tính xách tay',
  Tablet: 'Máy tính bảng',
  Watch: 'Đồng hồ',
  Accessories: 'Phụ kiện',
};

const getConditionLabel = (cond) => {
  if (!cond) return '';
  const key = Object.keys(CONDITION_LABELS).find((k) => cond.toLowerCase().includes(k));
  return key ? CONDITION_LABELS[key] : cond;
};

const getCategoryLabel = (cat) => CATEGORY_LABELS[cat] ?? cat;

const ProductCard = ({ product, onViewDetails }) => {
  const { addToCart, cartItems } = useCart();
  const isAlreadyInCart = cartItems.some((item) => item.id === product.id);

  const rawCondition = product.ai_condition || product.condition;
  const condLabel = getConditionLabel(rawCondition);
  const status = product.status?.toLowerCase();
  const isSold = status === 'sold' || status === 'inactive';
  const displayPrice = product.price || product.listed_price || 0;

  return (
    <div className={`product-card ${isSold ? 'sold-out' : ''}`}>
      <div className="product-image-wrapper">
        <img src={product.image || product.image_url} alt={product.name || product.title} className="product-image" />
        <span className={`product-condition-badge badge-excellent`}>
          {condLabel}
        </span>
        {isSold && (
          <div className="sold-overlay">
            <span>Đã bán</span>
          </div>
        )}
        <div className="product-actions-overlay">
          <button 
            className="action-btn" 
            title="Xem chi tiết" 
            onClick={() => onViewDetails(product)}
          >
            <Eye size={18} />
          </button>
          <button className="action-btn" title="Yêu thích">
            <Heart size={18} />
          </button>
        </div>
      </div>

      <div className="product-details">
        <span className="product-category">{getCategoryLabel(product.category) || `Danh mục ${product.category_id || ''}`}</span>
        <h4 className="product-title" onClick={() => onViewDetails(product)}>{product.name || product.title}</h4>
        <p className="product-description">{product.user_description || product.description}</p>
        
        <div className="product-footer-price">
          <div className="price-tag">
            {displayPrice.toLocaleString('en-US')} <span className="currency">VND</span>
          </div>
          
          {!isSold ? (
            <button 
              className={`add-cart-btn ${isAlreadyInCart ? 'in-cart' : ''}`}
              onClick={() => addToCart(product)}
              disabled={isAlreadyInCart}
              title={isAlreadyInCart ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ hàng'}
            >
              <ShoppingCart size={18} />
            </button>
          ) : (
            <button className="add-cart-btn" disabled>
              Hết
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

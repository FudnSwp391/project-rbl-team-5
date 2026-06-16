import { useCart } from '../context/CartContext';
import { ShoppingCart, Eye } from 'lucide-react';
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
  const c = cond.toLowerCase();
  if (c.includes('99%') || c.includes('excellent')) return 'Như mới';
  if (c.includes('90%') || c.includes('good') || c.includes('rất tốt')) return 'Rất tốt';
  if (c.includes('80%') || c.includes('fair') || c.includes('khá tốt')) return 'Khá tốt';
  
  const key = Object.keys(CONDITION_LABELS).find((k) => c.includes(k));
  return key ? CONDITION_LABELS[key] : cond;
};

const getCategoryLabel = (cat) => CATEGORY_LABELS[cat] ?? cat;

const getConditionClass = (cond) => {
  if (!cond) return 'badge-excellent';
  const c = cond.toLowerCase();
  if (c.includes('excellent') || c.includes('như mới') || c.includes('mới') || c.includes('99%')) return 'badge-excellent';
  if (c.includes('good') || c.includes('rất tốt') || c.includes('90%')) return 'badge-good';
  if (c.includes('fair') || c.includes('khá') || c.includes('80%')) return 'badge-fair';
  return 'badge-excellent';
};

export const getProductImage = (product) => {
  if (!product) return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500';
  const imgUrl = product.image || product.image_url;
  
  // If it's a valid remote URL (starts with http/https or data:), return it
  if (imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('data:'))) {
    return imgUrl;
  }
  
  // Map categories to high-quality Unsplash image URLs
  const cat = (product.category || '').toLowerCase();
  const name = (product.name || product.title || product.product_name || '').toLowerCase();
  
  if (cat.includes('phone') || cat.includes('điện thoại')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500';
  }
  if (cat.includes('laptop') || cat.includes('máy tính xách tay') || cat.includes('computer')) {
    return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500';
  }
  if (cat.includes('tablet') || cat.includes('máy tính bảng') || cat.includes('ipad')) {
    return 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500';
  }
  if (cat.includes('watch') || cat.includes('đồng hồ')) {
    return 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500';
  }
  if (cat.includes('air') || cat.includes('máy lạnh') || cat.includes('conditioner')) {
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500';
  }
  if (cat.includes('wash') || cat.includes('máy giặt') || cat.includes('laundry')) {
    return 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500';
  }
  if (cat.includes('fridge') || cat.includes('tủ lạnh') || cat.includes('refrigerator')) {
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500';
  }
  if (cat.includes('microwave') || cat.includes('vi sóng') || cat.includes('oven')) {
    return 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500';
  }
  if (cat.includes('audio') || cat.includes('tai nghe') || cat.includes('headphone') || cat.includes('speaker')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';
  }
  
  // Check name as fallback
  if (name.includes('iphone') || name.includes('samsung') || name.includes('điện thoại') || name.includes('phone')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500';
  }
  if (name.includes('macbook') || name.includes('laptop') || name.includes('thinkpad') || name.includes('dell')) {
    return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500';
  }
  if (name.includes('air') || name.includes('máy lạnh') || name.includes('sharp') || name.includes('daikin')) {
    return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500';
  }
  if (name.includes('washing') || name.includes('máy giặt') || name.includes('electrolux') || name.includes('lg')) {
    return 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500';
  }
  if (name.includes('tủ lạnh') || name.includes('fridge') || name.includes('refrigerator')) {
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500';
  }
  
  return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500'; // Default tech image
};

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
        <img src={getProductImage(product)} alt={product.name || product.title} className="product-image" />
        <span className={`product-condition-badge badge ${getConditionClass(rawCondition)}`}>
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

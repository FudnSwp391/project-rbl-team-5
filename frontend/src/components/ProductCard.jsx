import React from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Heart, Eye } from 'lucide-react';
import './ProductCard.css';

const ProductCard = ({ product, onViewDetails }) => {
  const { addToCart, cartItems } = useCart();
  const isAlreadyInCart = cartItems.some(item => item.id === product.id);

  const getConditionLabel = (cond) => {
    switch (cond) {
      case 'excellent': return 'Như mới (99%)';
      case 'good': return 'Rất tốt (>90%)';
      case 'fair': return 'Khá tốt (>80%)';
      default: return cond;
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'AirConditioner': return 'Máy lạnh';
      case 'WashingMachine': return 'Máy giặt';
      case 'Refrigerator': return 'Tủ lạnh';
      case 'Microwave': return 'Lò vi sóng';
      case 'Phone': return 'Điện thoại';
      case 'Laptop': return 'Máy tính xách tay';
      case 'Tablet': return 'Máy tính bảng';
      case 'Watch': return 'Đồng hồ';
      case 'Accessories': return 'Phụ kiện';
      default: return cat;
    }
  };

  return (
    <div className={`product-card ${product.status === 'sold' ? 'sold-out' : ''}`}>
      <div className="product-image-wrapper">
        <img src={product.image} alt={product.name} className="product-image" />
        <span className={`product-condition-badge badge-${product.condition}`}>
          {getConditionLabel(product.condition)}
        </span>
        {product.status === 'sold' && (
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
        <span className="product-category">{getCategoryLabel(product.category)}</span>
        <h4 className="product-title" onClick={() => onViewDetails(product)}>{product.name}</h4>
        <p className="product-description">{product.description}</p>
        
        <div className="product-footer-price">
          <div className="price-tag">
            {product.price.toLocaleString('en-US')} <span className="currency">VND</span>
          </div>
          
          {product.status === 'available' ? (
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

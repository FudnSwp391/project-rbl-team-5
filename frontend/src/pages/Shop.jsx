import React, { useState, useEffect, useRef } from 'react';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { Search, SlidersHorizontal, Check, ShieldCheck, Truck, RefreshCw, X, ShoppingCart, Send, Sparkles } from 'lucide-react';
import './Shop.css';

const Shop = ({ selectedProduct, setSelectedProduct }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [conditions, setConditions] = useState({
    excellent: true,
    good: true,
    fair: true
  });
  const [sortBy, setSortBy] = useState('newest');

  // AI Chat States
  const [aiChat, setAiChat] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI tư vấn mua sắm TechCycle. Bạn cần tìm thiết bị nào? (ví dụ: "tìm VNDiện thoại dưới 10 triệu", "laptop học tập", "ipad giá rẻ"). Tôi sẽ đề xuất các máy phù hợp đang có trong kho!'
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const aiChatEndRef = useRef(null);

  const { addToCart, cartItems } = useCart();

  useEffect(() => {
    const API_BASE = window.location.port === '5173' ? 'http://localhost:5000' : '';
    fetch(`${API_BASE}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Lỗi tải sản phẩm chợ đồ cũ:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = [...products];

    // 1. Search Filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (category !== 'All') {
      result = result.filter(p => p.category === category);
    }

    // 3. Condition Filter
    result = result.filter(p => {
      if (p.condition === 'excellent' && !conditions.excellent) return false;
      if (p.condition === 'good' && !conditions.good) return false;
      if (p.condition === 'fair' && !conditions.fair) return false;
      return true;
    });

    // 4. Sort Logic
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    setFilteredProducts(result);
  }, [products, search, category, conditions, sortBy]);

  // AI scroll trigger
  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat]);

  const handleSendAiMessage = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput.trim();
    setAiChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAiInput('');

    setTimeout(() => {
      let filtered = [...products].filter(p => p.status === 'available');
      const lower = userMsg.toLowerCase();

      // Parse Category
      let cat = '';
      if (lower.includes('máy lạnh') || lower.includes('điều hòa') || lower.includes('air')) cat = 'AirConditioner';
      else if (lower.includes('máy giặt') || lower.includes('giặt') || lower.includes('wash')) cat = 'WashingMachine';
      else if (lower.includes('tủ lạnh') || lower.includes('tủ đông') || lower.includes('ref')) cat = 'Refrigerator';
      else if (lower.includes('lò vi sóng') || lower.includes('vi sóng') || lower.includes('microwave')) cat = 'Microwave';

      if (cat) {
        filtered = filtered.filter(p => p.category === cat);
      }

      // Parse Budget Price
      let budget = Infinity;
      if (lower.includes('dưới 15 triệu') || lower.includes('dưới 15tr') || lower.includes('15m')) budget = 15000000;
      else if (lower.includes('dưới 10 triệu') || lower.includes('dưới 10tr') || lower.includes('10m')) budget = 10000000;
      else if (lower.includes('dưới 5 triệu') || lower.includes('dưới 5tr') || lower.includes('5m')) budget = 5000000;

      if (budget !== Infinity) {
        filtered = filtered.filter(p => p.price <= budget);
      }

      let responseText = '';
      let recommendedProducts = [];

      if (filtered.length > 0) {
        responseText = `🤖 TechCycle AI Khuyên dùng:\n\nDựa vào yêu cầu của bạn, tôi tìm thấy ${filtered.length} sản phẩm phù hợp đang bán trong kho. Bạn có thể nhấn trực tiếp vào sản phẩm VNDể xem chi tiết:`;
        recommendedProducts = filtered.slice(0, 3); // recommend max 3
      } else {
        responseText = `🤖 TechCycle AI Khuyên dùng:\n\nRất tiếc, tôi chưa tìm thấy sản phẩm nào khớp hoàn toàn với mô tả của bạn. Hãy thử tìm các từ khóa khác như "iPhone", "MacBook", hoặc thay đổi ngân sách xem sao nhé!`;
      }

      setAiChat(prev => [...prev, { 
        sender: 'ai', 
        text: responseText,
        recommendations: recommendedProducts
      }]);
    }, 1000);
  };

  const handleConditionChange = (name) => {
    setConditions(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const closeDetailModal = () => {
    setSelectedProduct(null);
  };

  const getConditionText = (cond) => {
    switch (cond) {
      case 'excellent': return 'Như mới (99%) - Thân máy không vết trầy, pin tốt >85%.';
      case 'good': return 'Rất tốt (>90%) - Xước xát dăm rất nhẹ ở viền, hoạt động ổn định.';
      case 'fair': return 'Khá tốt (>80%) - Có vết trầy xước hao mòn rõ ràng, giá siêu tiết kiệm.';
      default: return cond;
    }
  };

  return (
    <div className="shop-page container py-4 animate-fade">
      <div className="shop-header text-center mb-5">
        <h1 className="shop-title fw-bold">Chợ Thiết Bị Công Nghệ Cũ</h1>
        <p className="shop-subtitle text-muted">Mua sắm thiết bị chính hãng, giá tiết kiệm, bảo hành đổi trả uy tín và góp phần bảo vệ môi trường.</p>
      </div>

      <div className="row g-4 shop-layout">
        {/* Sidebar Filters (Column 1) */}
        <aside className="col-lg-3 shop-filters-sidebar glass-panel h-100 p-4">
          <div className="sidebar-section-header d-flex align-items-center gap-2 mb-3">
            <SlidersHorizontal size={18} />
            <h3 className="m-0 fw-bold" style={{ fontSize: '1rem' }}>Bộ lọc tìm kiếm</h3>
          </div>
          
          <hr className="filter-divider" />

          {/* Search box */}
          <div className="filter-group mb-4">
            <label className="form-label fw-semibold">Tìm theo tên sản phẩm</label>
            <div className="search-input-wrapper position-relative">
              <Search className="search-icon position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
              <input 
                type="text" 
                className="form-control filter-search ps-5" 
                placeholder="Nhập tên máy..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Condition Box */}
          <div className="filter-group mb-3">
            <label className="form-label fw-semibold">Tình trạng máy</label>
            <div className="checkbox-list d-flex flex-column gap-2">
              <label className="checkbox-item d-flex align-items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={conditions.excellent} 
                  onChange={() => handleConditionChange('excellent')} 
                />
                <span>Như mới (99%)</span>
              </label>
              <label className="checkbox-item d-flex align-items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={conditions.good} 
                  onChange={() => handleConditionChange('good')} 
                />
                <span>Rất tốt (&gt;90%)</span>
              </label>
              <label className="checkbox-item d-flex align-items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={conditions.fair} 
                  onChange={() => handleConditionChange('fair')} 
                />
                <span>Khá tốt (&gt;80%)</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Shop Content (Column 2) */}
        <main className="col-lg-6 shop-main-content">
          {/* Top Bar Navigation / Sort */}
          <div className="shop-topbar d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
            {/* Category tabs */}
            <div className="category-tabs d-flex flex-wrap gap-2">
              {['All', 'AirConditioner', 'WashingMachine', 'Refrigerator', 'Microwave'].map(cat => (
                <button
                  key={cat}
                  className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setCategory(cat)}
                  style={{ borderRadius: '20px' }}
                >
                  {cat === 'All' ? 'Tất cả' : cat === 'AirConditioner' ? 'Máy lạnh' : cat === 'WashingMachine' ? 'Máy giặt' : cat === 'Refrigerator' ? 'Tủ lạnh' : 'Lò vi sóng'}
                </button>
              ))}
            </div>

            {/* Sort selector */}
            <div className="sort-wrapper d-flex align-items-center gap-2">
              <span className="sort-label text-nowrap text-muted" style={{ fontSize: '0.85rem' }}>Sắp xếp:</span>
              <select 
                className="form-select sort-select form-select-sm"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="newest">Mới đăng</option>
                <option value="price-asc">Giá từ thấp đến cao</option>
                <option value="price-desc">Giá từ cao đến thấp</option>
              </select>
            </div>
          </div>

          {/* Grid list of products */}
          {loading ? (
            <div className="text-center py-4">Đang tải sản phẩm...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-shop-state glass-panel text-center p-5">
              <h3>Không tìm thấy sản phẩm nào</h3>
              <p className="text-muted">Thử đổi bộ lọc hoặc từ khóa tìm kiếm khác nhé.</p>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                  setConditions({ excellent: true, good: true, fair: true });
                }}
              >
                Thiết lập lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 g-4">
              {filteredProducts.map(product => (
                <div className="col" key={product.id}>
                  <ProductCard 
                    product={product} 
                    onViewDetails={setSelectedProduct}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Shop AI Assistant (Column 3) */}
        <aside className="col-lg-3 shop-ai-sidebar glass-panel">
          <div className="ai-header">
            <Sparkles size={20} className="ai-icon animate-pulse" />
            <div>
              <h4>AI Tư Vấn Mua Sắm</h4>
              <span className="ai-badge-tag">MOCK LLM</span>
            </div>
          </div>
          
          <div className="ai-chat-body">
            {aiChat.map((msg, idx) => (
              <div key={idx} className={`ai-chat-bubble-row ${msg.sender}`}>
                <div className="ai-bubble-text-box">
                  <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="ai-recommendations-list">
                      {msg.recommendations.map(prod => (
                        <div 
                          key={prod.id} 
                          className="ai-recommend-card"
                          onClick={() => setSelectedProduct(prod)}
                        >
                          <img src={prod.image} alt={prod.name} className="rec-img" />
                          <div className="rec-info">
                            <h5>{prod.name}</h5>
                            <span className="rec-price">{prod.price.toLocaleString('en-US')} <span className="currency">VND</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={aiChatEndRef} />
          </div>

          <form onSubmit={handleSendAiMessage} className="ai-chat-footer">
            <input 
              type="text" 
              className="form-control ai-input-control" 
              placeholder="Hỏi AI chọn máy..."
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary ai-send-btn">
              <Send size={14} />
            </button>
          </form>
        </aside>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="modal-overlay animate-fade" onClick={closeDetailModal}>
          <div className="product-detail-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeDetailModal}>
              <X size={24} />
            </button>
            
            <div className="modal-body-grid">
              <div className="modal-image-panel">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="modal-product-img" />
              </div>
              
              <div className="modal-info-panel">
                <span className="modal-cat">{selectedProduct.category}</span>
                <h2 className="modal-title">{selectedProduct.name}</h2>
                
                <div className="modal-price">
                  {selectedProduct.price.toLocaleString('en-US')} <span className="currency">VND</span>
                </div>

                <div className={`modal-condition-card cond-${selectedProduct.condition}`}>
                  <h4>Tình trạng kiểm VNDịnh:</h4>
                  <p>{getConditionText(selectedProduct.condition)}</p>
                </div>

                <div className="modal-description">
                  <h3>Mô tả sản phẩm</h3>
                  <p>{selectedProduct.description}</p>
                </div>

                <div className="guarantees-grid">
                  <div className="guarantee-item">
                    <ShieldCheck className="g-icon" />
                    <span>Bảo hành 6 tháng</span>
                  </div>
                  <div className="guarantee-item">
                    <Truck className="g-icon" />
                    <span>Miễn phí vận chuyển</span>
                  </div>
                  <div className="guarantee-item">
                    <RefreshCw className="g-icon" />
                    <span>7 ngày đổi trả lỗi NSX</span>
                  </div>
                </div>

                <div className="modal-actions">
                  {selectedProduct.status === 'available' ? (
                    <button 
                      className={`btn btn-primary modal-cart-btn ${cartItems.some(i => i.id === selectedProduct.id) ? 'disabled' : ''}`}
                      disabled={cartItems.some(i => i.id === selectedProduct.id)}
                      onClick={() => {
                        addToCart(selectedProduct);
                        closeDetailModal();
                      }}
                    >
                      <ShoppingCart size={20} />
                      {cartItems.some(i => i.id === selectedProduct.id) ? 'Đã trong giỏ hàng' : 'Thêm vào giỏ hàng'}
                    </button>
                  ) : (
                    <button className="btn btn-secondary modal-cart-btn" disabled>
                      Sản phẩm VNDã bán
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;

import { useState, useEffect, useRef } from 'react';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { Search, SlidersHorizontal, ShieldCheck, Truck, RefreshCw, X, ShoppingCart, Send, Sparkles } from 'lucide-react';
import './Shop.css';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

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
      text: 'Xin chào! Tôi là Trợ lý AI tư vấn mua sắm TechCycle. Bạn cần tìm thiết bị nào? (ví dụ: "tìm điện thoại dưới 10 triệu", "laptop học tập", "ipad giá rẻ"). Tôi sẽ đề xuất các máy phù hợp đang có trong kho!'
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const aiChatEndRef = useRef(null);

  const { addToCart, cartItems } = useCart();

  useEffect(() => {
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
    let result = [...products].filter(p => {
      const status = (p.status || '').toLowerCase();
      return status !== 'sold' && status !== 'sold_out' && status !== 'inactive';
    });

    // 1. Search Filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.user_description && p.user_description.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (category !== 'All') {
      result = result.filter(p => p.category_id === parseInt(category) || p.category === category);
    }

    // 3. Condition Filter (ai_condition field)
    result = result.filter(p => {
      const cond = (p.ai_condition || p.condition || '').toLowerCase();
      if (cond.includes('excellent') && !conditions.excellent) return false;
      if (cond.includes('good') && !conditions.good) return false;
      if (cond.includes('fair') && !conditions.fair) return false;
      return true;
    });

    // 4. Sort Logic
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.price || a.listed_price || 0) - (b.price || b.listed_price || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.price || b.listed_price || 0) - (a.price || a.listed_price || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredProducts(result); // eslint-disable-line react-hooks/set-state-in-effect
  }, [products, search, category, conditions, sortBy]);

  // AI scroll trigger
  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat]);

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput.trim();
    const currentHistory = [...aiChat, { sender: 'user', text: userMsg }];
    setAiChat(currentHistory);
    setAiInput('');

    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: aiChat })
      });
      const data = await response.json();

      if (data.text) {
        setAiChat(prev => [...prev, {
          sender: 'ai',
          text: data.text
        }]);
      }
    } catch (err) {
      console.error('Lỗi kết nối AI:', err);
      setAiChat(prev => [...prev, {
        sender: 'ai',
        text: '🤖 Rất tiếc, tôi đang gặp lỗi kết nối. Vui lòng thử lại sau!'
      }]);
    }
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

      <div className="shop-layout">
        {/* Sidebar Filters (Column 1) */}
        <aside className="shop-filters-sidebar glass-panel">
          <div className="sidebar-section-header mb-3">
            <SlidersHorizontal size={18} />
            <h3 className="m-0 fw-bold">Bộ lọc</h3>
          </div>

          <hr className="filter-divider" />

          {/* Search box */}
          <div className="filter-group">
            <label className="form-label">Tìm sản phẩm</label>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="form-control filter-search"
                placeholder="Nhập tên máy..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Condition Box */}
          <div className="filter-group">
            <label className="form-label">Tình trạng máy</label>
            <div className="checkbox-list">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={conditions.excellent}
                  onChange={() => handleConditionChange('excellent')}
                />
                <span>Như mới (99%)</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={conditions.good}
                  onChange={() => handleConditionChange('good')}
                />
                <span>Rất tốt (&gt;90%)</span>
              </label>
              <label className="checkbox-item">
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
        <main className="shop-main-content">
          {/* Top Bar Navigation / Sort */}
          <div className="shop-topbar">
            {/* Category tabs */}
            <div className="category-tabs">
              {['All', 'AirConditioner', 'WashingMachine', 'Refrigerator', 'Microwave'].map(cat => (
                <button
                  key={cat}
                  className={`category-tab-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat === 'All' ? 'Tất cả' : cat === 'AirConditioner' ? 'Máy lạnh' : cat === 'WashingMachine' ? 'Máy giặt' : cat === 'Refrigerator' ? 'Tủ lạnh' : 'Lò vi sóng'}
                </button>
              ))}
            </div>

            {/* Sort selector */}
            <div className="sort-wrapper">
              <span className="sort-label">Sắp xếp:</span>
              <select
                className="form-select sort-select"
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
              {filteredProducts.map((product, index) => (
                <div className="col" key={product.id || index}>
                  <ProductCard
                    product={{
                      ...product,
                      id: product.id,
                      name: product.name || product.title,
                      price: product.price || product.listed_price,
                      image: product.image || product.image_url
                    }}
                    onViewDetails={setSelectedProduct}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Shop AI Assistant (Column 3) */}
        <aside className="shop-ai-sidebar glass-panel">
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
                          <img src={prod.image_url} alt={prod.product_name} className="rec-img" />
                          <div className="rec-info">
                         <h5>{prod.title || prod.product_name}</h5>
                            <span className="rec-price">{(prod.listed_price || prod.price || 0).toLocaleString('en-US')} <span className="currency">VND</span></span>
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
                <img src={selectedProduct.image_url || selectedProduct.image} alt={selectedProduct.product_name || selectedProduct.name} className="modal-product-img" />
              </div>

              <div className="modal-info-panel">
                <span className="modal-cat">{selectedProduct.category_name || selectedProduct.category}</span>
                <h2 className="modal-title">{selectedProduct.product_name || selectedProduct.name}</h2>

                <div className="modal-price">
                  {(selectedProduct.listed_price || selectedProduct.price || 0).toLocaleString('en-US')} <span className="currency">VND</span>
                  {selectedProduct.old_price > selectedProduct.price && (
                    <span className="modal-old-price ms-2 text-decoration-line-through text-muted" style={{ fontSize: '1rem' }}>
                      {selectedProduct.old_price.toLocaleString('en-US')} VND
                    </span>
                  )}
                </div>

                <div className={`modal-condition-card cond-excellent`}>
                  <h4>Tình trạng kiểm định:</h4>
                  <p>{selectedProduct.ai_condition || getConditionText(selectedProduct.condition)}</p>
                </div>

                <div className="modal-description">
                  <h3>Mô tả sản phẩm</h3>
                  <p>{selectedProduct.user_description || selectedProduct.description}</p>
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
                  {(!selectedProduct.status || selectedProduct.status.toLowerCase() === 'active' || selectedProduct.status.toLowerCase() === 'available') ? (
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
                      Sản phẩm đã bán
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

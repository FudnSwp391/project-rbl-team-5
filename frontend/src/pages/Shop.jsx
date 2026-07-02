import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProductCard, { getProductImage } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { Search, SlidersHorizontal, ShieldCheck, Truck, RefreshCw, X, ShoppingCart } from 'lucide-react';
import './Shop.css';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const Shop = ({ selectedProduct, setSelectedProduct, showFilters, setShowFilters }) => {
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
  const [priceRange, setPriceRange] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 15;

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
      const cond = (p.ai_condition || p.condition || '').toLowerCase().trim();

      // Map DB values → filter keys
      const isExcellent =
        cond.includes('excellent') ||
        cond === '99%' ||
        cond.startsWith('99');

      const isGood =
        cond.includes('good') ||
        cond === '>90%' ||
        cond.startsWith('>90') ||
        (cond.startsWith('9') && !isExcellent); // 90%, 92%...

      const isFair =
        cond === '>80%' ||
        cond.startsWith('>80') ||
        cond.startsWith('8'); // 80%, 85%...

      if (isExcellent && !conditions.excellent) return false;
      if (isGood && !conditions.good) return false;
      if (isFair && !conditions.fair) return false;
      return true;
    });

    // 3.5 Price Range Filter
    if (priceRange !== 'All') {
      result = result.filter(p => {
        const price = p.price || p.listed_price || 0;
        if (priceRange === 'under-5') return price < 5000000;
        if (priceRange === '5-10') return price >= 5000000 && price <= 10000000;
        if (priceRange === 'over-10') return price > 10000000;
        return true;
      });
    }

    // 4. Sort Logic
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.price || a.listed_price || 0) - (b.price || b.listed_price || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.price || b.listed_price || 0) - (a.price || a.listed_price || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredProducts(result); // eslint-disable-line react-hooks/set-state-in-effect
  }, [products, search, category, conditions, sortBy, priceRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, conditions, sortBy, priceRange]);


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

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 4) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="shop-page container py-4 animate-fade">

      <div className="shop-header-row mb-5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <button className={`toggle-filters-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={16} />
          <span>Bộ lọc</span>
        </button>

        <div className="shop-header text-center" style={{ flex: 1, minWidth: '280px' }}>
          <div className="shop-badge-premium">Chợ Công Nghệ Xanh</div>
          <h1 className="shop-title fw-bold" style={{ margin: '0 0 10px 0' }}>Chợ Thiết Bị Công Nghệ Cũ</h1>
          <p className="shop-subtitle text-muted" style={{ margin: '0 auto', maxWidth: '600px' }}>Mua sắm thiết bị chính hãng, giá tiết kiệm, bảo hành đổi trả uy tín và góp phần bảo vệ môi trường.</p>
        </div>

        <div className="header-placeholder" style={{ width: '120px' }}></div>
      </div>

      <div className={`shop-layout ${showFilters ? 'filters-open' : ''}`}>
        {showFilters && (
          <div className="filters-backdrop" onClick={() => setShowFilters(false)}></div>
        )}
        {/* Sidebar Filters (Column 1) */}
        <aside className={`shop-filters-sidebar glass-panel ${showFilters ? 'show' : ''}`}>
          <button className="close-filters-btn" onClick={() => setShowFilters(false)} title="Đóng bộ lọc">
            <X size={18} />
          </button>

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

          <hr className="filter-divider" />

          {/* Price Range Box */}
          <div className="filter-group">
            <label className="form-label">Khoảng giá</label>
            <div className="radio-list">
              {[
                { value: 'All', label: 'Tất cả giá' },
                { value: 'under-5', label: 'Dưới 5 triệu' },
                { value: '5-10', label: '5 - 10 triệu' },
                { value: 'over-10', label: 'Trên 10 triệu' }
              ].map(item => (
                <label key={item.value} className="radio-item">
                  <input
                    type="radio"
                    name="priceRange"
                    checked={priceRange === item.value}
                    onChange={() => setPriceRange(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="filter-divider" />

          {/* Guarantees Panel */}
          <div className="sidebar-badge-panel">
            <div className="badge-panel-item">
              <ShieldCheck size={16} className="item-icon" />
              <div>
                <h5>100% Kiểm định AI</h5>
                <p>Quét linh kiện và đo lường hiệu năng kỹ lưỡng.</p>
              </div>
            </div>
            <div className="badge-panel-item">
              <Truck size={16} className="item-icon" />
              <div>
                <h5>Miễn phí vận chuyển</h5>
                <p>Giao hàng nhanh toàn quốc phí 0đ.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Shop Content (Column 2) */}
        <main className="shop-main-content">
          {/* Top Bar Navigation / Sort */}
          <div className="shop-topbar">
            <div className="category-tabs">
              {['All', 'AirConditioner', 'WashingMachine', 'Refrigerator', 'Microwave', 'Audio', 'Laptop', 'Smartwatch'].map(cat => (
                <button
                  key={cat}
                  className={`category-tab-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat === 'All' ? 'Tất cả' :
                    cat === 'AirConditioner' ? 'Máy lạnh' :
                      cat === 'WashingMachine' ? 'Máy giặt' :
                        cat === 'Refrigerator' ? 'Tủ lạnh' :
                          cat === 'Microwave' ? 'Lò vi sóng' :
                            cat === 'Audio' ? 'Tai nghe' :
                              cat === 'Laptop' ? 'Laptop' : 'Đồng hồ'}
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
                  setPriceRange('All');
                }}
              >
                Thiết lập lại bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="shop-products-grid">
                {displayedProducts.map((product, index) => (
                  <ProductCard
                    key={product.id || index}
                    product={{
                      ...product,
                      id: product.id,
                      name: product.name || product.title,
                      price: product.price || product.listed_price,
                      image: product.image || product.image_url
                    }}
                    onViewDetails={setSelectedProduct}
                  />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="shop-pagination-wrapper">
                  <button
                    className="pagination-arrow-btn"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    &larr; Trước
                  </button>
                  {getPageNumbers().map((page, idx) => (
                    page === '...' ? (
                      <span key={`dots-${idx}`} className="pagination-dots">...</span>
                    ) : (
                      <button
                        key={page}
                        className={`pagination-num-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  <button
                    className="pagination-arrow-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Sau &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Product Detail Modal — render via Portal vào document.body để tránh bị ảnh hưởng bởi transform của cha */}
      {selectedProduct && createPortal(
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="product-detail-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeDetailModal}>
              <X size={24} />
            </button>

            <div className="modal-body-grid">
              <div className="modal-image-panel">
                <img src={getProductImage(selectedProduct)} alt={selectedProduct.product_name || selectedProduct.name} className="modal-product-img" />
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default Shop;

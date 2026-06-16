import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, ShoppingBag, Calendar, Plus, Trash2, 
  Users, Sun, Moon, Search, Bell, Settings, HelpCircle, LogOut,
  MapPin, CreditCard, Pencil, Tag, ArrowLeft, MessageSquare
} from 'lucide-react';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const SellerDashboard = ({ setActivePage, theme, setTheme, initialSubTab, setInitialSubTab }) => {
  const { user, token } = useAuth();
  const subTab = initialSubTab || 'stats';
  const setSubTab = setInitialSubTab;
  const [viewingUser, setViewingUser] = useState(null);
  const fileInputRef = useRef(null);

  // --- DATA STATES ---
  const [stats, setStats] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [techsList, setTechsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- SELLER HOMEPAGE STATES ---
  const [estimatedValue, setEstimatedValue] = useState(null);
  const [valuationName, setValuationName] = useState('');
  const [valuationCondition, setValuationCondition] = useState('Cấp A (Như mới)');
  const [valuationCapacity, setValuationCapacity] = useState('128 GB');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // --- FORM STATES FOR ADMIN PRODUCTS ---
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('AirConditioner');
  const [newProdCondition, setNewProdCondition] = useState('excellent');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [productSuccess, setProductSuccess] = useState('');

  // --- FORM STATES FOR EDITING PRODUCTS ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('AirConditioner');
  const [editProdCondition, setEditProdCondition] = useState('excellent');
  const [editProdImage, setEditProdImage] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdStatus, setEditProdStatus] = useState('available');

  // --- FORM STATES FOR PROMO CODES ---
  const [promoCodes, setPromoCodes] = useState([
    { code: 'CIGHENTER24', discount: '12', expiry: '15/06', status: 'active' },
    { code: 'TECHREVIEW', discount: '10', expiry: 'Hết hạn', status: 'expired' }
  ]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [newPromoActive, setNewPromoActive] = useState(true);
  const [newPromoExpiry, setNewPromoExpiry] = useState('');

  const fetchData = async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const resBookings = await fetch(`${API_BASE}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataBookings = await resBookings.json();
      if (Array.isArray(dataBookings)) setBookingsList(dataBookings);

      const resStats = await fetch(`${API_BASE}/api/users/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataStats = await resStats.json();
      if (resStats.ok) setStats(dataStats);

      const resProducts = await fetch(`${API_BASE}/api/products`);
      const dataProducts = await resProducts.json();
      if (Array.isArray(dataProducts)) setProductsList(dataProducts);

      const resTechs = await fetch(`${API_BASE}/api/users/technicians`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataTechs = await resTechs.json();
      if (Array.isArray(dataTechs)) setTechsList(dataTechs);

      const resOrders = await fetch(`${API_BASE}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataOrders = await resOrders.json();
      if (Array.isArray(dataOrders)) setOrdersList(dataOrders);
    } catch (err) {
      console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchData();
  }, [user, token, subTab]);

  const handleLogout = () => {
    setActivePage('home');
    window.location.reload();
  };

  const handleEstimateValue = (e) => {
    e.preventDefault();
    if (!valuationName.trim()) {
      alert("Vui lòng nhập tên thiết bị.");
      return;
    }
    let basePrice = 10000000;
    const nameLower = valuationName.toLowerCase();
    if (nameLower.includes("15")) basePrice = 22000000;
    else if (nameLower.includes("14")) basePrice = 17000000;
    else if (nameLower.includes("13")) basePrice = 13000000;
    else if (nameLower.includes("macbook")) basePrice = 18000000;

    const multiplier =
      valuationCondition.includes('Grade A') || valuationCondition.includes('Cấp A') ? 1.0
      : valuationCondition.includes('Grade B') || valuationCondition.includes('Cấp B') ? 0.85
      : 0.7;

    let capacityAdd = 0;
    if (valuationCapacity.includes("256")) capacityAdd = 1500000;
    else if (valuationCapacity.includes("512")) capacityAdd = 3000000;

    const finalVal = (basePrice * multiplier) + capacityAdd;
    setEstimatedValue(finalVal.toLocaleString('en-US') + " VND");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedImage(URL.createObjectURL(file));
    }
  };

  const handleCreatePromoCode = (e) => {
    e.preventDefault();
    if (!newPromoCode.trim() || !newPromoDiscount) {
      alert("Vui lòng nhập cả mã và tỷ lệ phần trăm giảm giá.");
      return;
    }
    let formattedExpiry = '30/06';
    if (newPromoExpiry) {
      const parts = newPromoExpiry.split('-');
      if (parts.length === 3) {
        formattedExpiry = `${parts[2]}/${parts[1]}`;
      }
    }
    const newCode = {
      code: newPromoCode.toUpperCase().replace(/\s+/g, ''),
      discount: newPromoDiscount,
      expiry: formattedExpiry,
      status: newPromoActive ? 'active' : 'expired'
    };
    setPromoCodes(prev => [newCode, ...prev]);
    setNewPromoCode('');
    setNewPromoDiscount('');
    setNewPromoExpiry('');
    alert(`Mã khuyến mãi ${newCode.code} đã được tạo thành công!`);
  };

  const handleDeletePromoCode = (codeToDelete) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mã khuyến mãi ${codeToDelete}?`)) {
      setPromoCodes(prev => prev.filter(p => p.code !== codeToDelete));
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setProductSuccess('');
    if (!newProdName || !newProdPrice || !newProdDesc) {
      alert('Vui lòng điền đủ thông tin thiết bị.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProdName,
          price: Number(newProdPrice),
          category: newProdCategory,
          condition: newProdCondition,
          image: newProdImage || undefined,
          description: newProdDesc
        })
      });
      if (res.ok) {
        setProductSuccess('Thêm thiết bị mới vào chợ đồ cũ thành công!');
        setNewProdName('');
        setNewProdPrice('');
        setNewProdDesc('');
        setNewProdImage('');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.message || 'Lỗi thêm sản phẩm.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị này khỏi chợ?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${prodId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Xóa thành công.');
        fetchData();
      }
    } catch {
      alert('Lỗi xóa.');
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editProdName || !editProdPrice || !editProdDesc) {
      alert('Vui lòng điền đủ thông tin thiết bị.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editProdName,
          price: Number(editProdPrice),
          category: editProdCategory,
          condition: editProdCondition,
          image: editProdImage || undefined,
          description: editProdDesc,
          status: editProdStatus
        })
      });
      if (res.ok) {
        alert('Cập nhật thiết bị thành công!');
        setEditingProduct(null);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.message || 'Lỗi cập nhật sản phẩm.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật sản phẩm.');
    }
  };

  const handleUpdateBookingCostNotes = async (bookingId, cost, notes) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cost, notes })
      });
      if (res.ok) {
        alert('Cập nhật chi phí sửa chữa thành công.');
        fetchData();
      }
    } catch {
      alert('Không thể cập nhật.');
    }
  };

  const getConditionLabel = (cond) => {
    switch (cond) {
      case 'excellent': return 'Như mới (99%)';
      case 'good': return 'Rất tốt (>90%)';
      case 'fair': return 'Khá tốt (>80%)';
      default: return cond;
    }
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'inspecting': return 'Inspecting';
      case 'repairing': return 'Repairing';
      case 'completed': return 'Completed';
      case 'canceled': return 'Canceled';
      default: return st;
    }
  };

  return (
    <div className="dashboard-page admin-dashboard-layout seller-portal-layout animate-fade">
      <div className="dashboard-grid-layout">
        {/* Sidebar Nav */}
        <aside className="dashboard-sidebar glass-panel">
          <div className="sidebar-brand-logo" onClick={() => setActivePage('home')}>
            <div className="brand-icon-box">
              <LayoutDashboard className="brand-logo-icon" size={24} />
            </div>
            <div className="brand-text-wrapper">
              <h3>TechCycle</h3>
              <span>Seller Portal</span>
            </div>
          </div>
          
          <nav className="sidebar-nav-menu">
            <button className={`sidebar-nav-btn ${subTab === 'stats' ? 'active' : ''}`} onClick={() => setSubTab('stats')}>
              <LayoutDashboard size={18} />
              Bảng điều khiển
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'products' ? 'active' : ''}`} onClick={() => setSubTab('products')}>
              <ShoppingBag size={18} />
              Inventory
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'bookings' ? 'active' : ''}`} onClick={() => setSubTab('bookings')}>
              <Calendar size={18} />
              Orders
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'customers' ? 'active' : ''}`} onClick={() => setSubTab('customers')}>
              <Users size={18} />
              Customers
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'marketing' ? 'active' : ''}`} onClick={() => setSubTab('marketing')}>
              <Tag size={18} />
              Marketing
            </button>
          </nav>

          <button className="new-report-btn seller-impact-btn" onClick={() => alert("Xuất báo cáo tác động...")}>
            Generate Impact Report
          </button>

          <div className="sidebar-bottom-nav">
            <button className="sidebar-nav-btn bottom-btn" onClick={() => alert("Settings menu is managed by Eco Seller administration.")}>
              <Settings size={18} />
              Settings
            </button>
            <button className="sidebar-nav-btn bottom-btn" onClick={() => alert("Contact TechCycle support at support@techcycle.vn")}>
              <HelpCircle size={18} />
              Help Center
            </button>
            <button className="sidebar-nav-btn bottom-btn logout" onClick={handleLogout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>

          <div className="sidebar-copyright-text">
            <p>© 2026 TechCycle - performance management & circular economy solution.</p>
          </div>
        </aside>

        {/* Dashboard Main Content Area */}
        <main className="dashboard-main-content">
          <header className="dashboard-top-bar glass-panel">
            <h2 className="topbar-page-title">Bảng Điều Khiển</h2>

            <div className="topbar-search-box seller-search-box">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Tìm kiếm sản phẩm..." />
            </div>

            <div className="topbar-actions-profile">
              <button className="topbar-action-btn theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle Light/Dark theme">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button className="topbar-action-btn notification" onClick={() => alert("No new notifications.")} title="Notifications">
                <Bell size={20} />
              </button>
              
              <button className="topbar-action-btn messages" onClick={() => setSubTab('chat')} title="Messages">
                <MessageSquare size={20} />
              </button>
              
              <div className="topbar-divider"></div>

              <div className="topbar-profile-widget">
                <div className="profile-info">
                  <h4>Nhân Viên Bán Hàng</h4>
                  <span>seller</span>
                </div>
                <img src={user.avatar} alt={user.username} className="profile-avatar-circle" />
              </div>
            </div>
          </header>

          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {!loading && subTab === 'stats' && stats && (
            <div className="seller-dashboard-view animate-fade">
              {/* 3 small stats cards */}
              <div className="seller-stats-summary-grid">
                <div className="summary-stat-card glass-panel">
                  <div className="stat-data">
                    <span className="s-label">TỔNG DOANH THU</span>
                    <h3 className="s-val">245,890,000 VND</h3>
                    <span className="s-trend-up">+6% so với tháng trước</span>
                  </div>
                  <div className="mini-bar-chart">
                    <div className="m-bar" style={{ height: '25%' }}></div>
                    <div className="m-bar" style={{ height: '40%' }}></div>
                    <div className="m-bar" style={{ height: '30%' }}></div>
                    <div className="m-bar" style={{ height: '55%' }}></div>
                    <div className="m-bar active" style={{ height: '80%' }}></div>
                  </div>
                </div>

                <div className="summary-stat-card glass-panel">
                  <div className="stat-data">
                    <span className="s-label">ĐƠN HÀNG MỚI</span>
                    <h3 className="s-val">42</h3>
                    <span className="s-badge-yellow">Xem ngay</span>
                  </div>
                </div>

                <div className="summary-stat-card glass-panel">
                  <div className="stat-data">
                    <span className="s-label">THIẾT BỊ ĐỊNH GIÁ</span>
                    <h3 className="s-val">15</h3>
                    <span className="s-badge-blue">Chờ duyệt</span>
                  </div>
                </div>
              </div>

              {/* Two column layout */}
              <div className="seller-main-layout-grid">
                {/* Left Column */}
                <div className="layout-col-left">
                  {/* Device Valuation */}
                  <div className="stats-card-widget glass-panel device-valuation-card">
                    <div className="widget-header-row">
                      <h3>Đánh Giá Thiết Bị Cũ</h3>
                      <span className="details-text-link" onClick={() => alert("Chuyển hướng đến trang định giá...")}>Xem lịch sử &gt;</span>
                    </div>
                    
                    <div className="valuation-card-split">
                      <form onSubmit={handleEstimateValue} className="valuation-form">
                        <div className="form-group">
                          <label className="form-label-sm">TÊN THIẾT BỊ</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="Ví dụ: iPhone 13 Pro Max"
                            value={valuationName}
                            onChange={e => setValuationName(e.target.value)}
                          />
                        </div>

                        <div className="form-row-grid">
                          <div className="form-group">
                            <label className="form-label-sm">TÌNH TRẠNG</label>
                            <select 
                              className="form-control form-control-sm"
                              value={valuationCondition}
                              onChange={e => setValuationCondition(e.target.value)}
                            >
                              <option>Cấp A (Như mới)</option>
                              <option>Cấp B (Rất tốt)</option>
                              <option>Cấp C (Khá tốt)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label-sm">DUNG LƯỢNG</label>
                            <select 
                              className="form-control form-control-sm"
                              value={valuationCapacity}
                              onChange={e => setValuationCapacity(e.target.value)}
                            >
                              <option>64 GB</option>
                              <option>128 GB</option>
                              <option>256 GB</option>
                              <option>512 GB</option>
                            </select>
                          </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-sm btn-estimate" style={{ background: '#006D44', color: '#fff', width: '100%', border: 'none' }}>
                          💰 Ước Tính Giá Trị
                        </button>

                        {estimatedValue && (
                          <div className="estimation-result animate-fade">
                            Giá ước tính: <strong>{estimatedValue}</strong>
                          </div>
                        )}
                      </form>

                      <div className="valuation-upload-area">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          style={{ display: 'none' }} 
                          onChange={handleFileChange} 
                          accept="image/*"
                        />
                        <div className="upload-box-border" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
                          {uploadedImage ? (
                            <img src={uploadedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                          ) : (
                            <>
                              <div className="upload-icon">📷</div>
                              <p>Tải lên hình ảnh kiểm tra</p>
                              <span>Hỗ trợ JPG, PNG (tối đa 5MB)</span>
                              <button className="btn btn-outline btn-sm" type="button">Chọn ảnh</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Management list */}
                  <div className="stats-card-widget glass-panel seller-inventory-widget">
                    <div className="widget-header-row">
                      <h3>Quản Lý Kho Hàng</h3>
                      <div className="action-icons">
                        <button className="icon-btn" onClick={() => alert("Lọc danh sách...")}>🔍</button>
                        <button className="icon-btn" onClick={() => alert("Xuất báo cáo...")}>📥</button>
                      </div>
                    </div>

                    <div className="transactions-table-wrapper">
                      <table className="transactions-table">
                        <thead>
                          <tr>
                            <th>TÊN THIẾT BỊ</th>
                            <th>DANH MỤC</th>
                            <th>TỒN KHO</th>
                            <th>GIÁ BÁN</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productsList.length > 0 ? (
                            productsList.slice(0, 4).map((prod, idx) => (
                              <tr key={prod.id || idx}>
                                <td className="prod-cell">
                                  <img src={prod.image || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=80'} alt={prod.name} className="mini-prod-thumb" />
                                  <strong>{prod.name}</strong>
                                </td>
                                <td>{prod.category === 'AirConditioner' ? 'Máy lạnh' : prod.category === 'WashingMachine' ? 'Máy giặt' : prod.category === 'Refrigerator' ? 'Tủ lạnh' : 'Gia dụng'}</td>
                                <td>{idx === 0 ? '12' : idx === 1 ? '03' : '05'} chiếc</td>
                                <td>{prod.price.toLocaleString('en-US')} VND</td>
                                <td><span className={`badge badge-${prod.status === 'available' ? 'completed' : 'pending'}`}>{prod.status === 'available' ? 'Còn hàng' : 'Hết hàng'}</span></td>
                                <td>
                                  <button className="table-edit-btn" onClick={() => setSubTab('products')}>✏️</button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Không có sản phẩm nào.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="layout-col-right">
                  {/* Recent Orders */}
                  <div className="stats-card-widget glass-panel recent-orders-widget">
                    <div className="widget-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3>Đơn Hàng Gần Đây</h3>
                      <span className="details-text-link" style={{ fontSize: '0.85rem', color: '#006D44', cursor: 'pointer', fontWeight: 600 }} onClick={() => setSubTab('bookings')}>Xem tất cả &gt;</span>
                    </div>
                    <div className="seller-orders-list">
                      <div className="order-ticket-row">
                        <span className="order-icon green">🚚</span>
                        <div className="order-info-text">
                          <strong>Đơn #TC-88210</strong>
                          <p>Đang giao cho đơn vị vận chuyển</p>
                        </div>
                      </div>
                      <div className="order-ticket-row">
                        <span className="order-icon orange">💳</span>
                        <div className="order-info-text">
                          <strong>Đơn #TC-88220</strong>
                          {orderConfirmed ? (
                            <>
                              <p style={{ color: '#006D44', fontWeight: 600 }}>Đã xác nhận thanh toán</p>
                              <span className="s-badge-yellow" style={{ background: '#E6F4EA', color: '#006D44', marginTop: '4px' }}>Đang chuẩn bị hàng</span>
                            </>
                          ) : (
                            <>
                              <p>Chờ xác nhận thanh toán</p>
                              <button className="btn btn-primary btn-sm confirm-now-btn" style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: '6px', backgroundColor: '#006D44', border: 'none', borderRadius: '4px', color: '#fff' }} onClick={() => { setOrderConfirmed(true); alert("Xác nhận thanh toán đơn #TC-88220 thành công!"); }}>XÁC NHẬN NGAY</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'products' && (
            <div className="products-manager animate-fade">
              <h2>Inventory & Certified Shop Management</h2>
              <p className="view-desc">List refurbished appliances or manage available product listings in the marketplace.</p>

              {/* Add form */}
              <form onSubmit={handleAddProduct} className="add-product-form glass-panel form-inline-custom">
                <h3>Post Refurbished Device for Sale</h3>
                {productSuccess && <div className="success-banner-alert">{productSuccess}</div>}
                
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Device Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Samsung Inverter 488L" 
                      value={newProdName}
                      onChange={e => setNewProdName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (VND)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 15000000" 
                      value={newProdPrice}
                      onChange={e => setNewProdPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-control"
                      value={newProdCategory}
                      onChange={e => setNewProdCategory(e.target.value)}
                    >
                      <option value="AirConditioner">Air Conditioner</option>
                      <option value="WashingMachine">Washing Machine</option>
                      <option value="Refrigerator">Refrigerator</option>
                      <option value="Microwave">Microwave</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Inspected Quality Condition</label>
                    <select 
                      className="form-control"
                      value={newProdCondition}
                      onChange={e => setNewProdCondition(e.target.value)}
                    >
                      <option value="excellent">Like New (99%)</option>
                      <option value="good">Very Good (&gt;90%)</option>
                      <option value="fair">Good (&gt;80%)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL (leave blank for defaults)</label>
                  <input 
                    type="url" 
                    className="form-control" 
                    placeholder="https://images.unsplash.com/..." 
                    value={newProdImage}
                    onChange={e => setNewProdImage(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Description</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="Enter details about battery, cosmetics, wear, warranty details..."
                    value={newProdDesc}
                    onChange={e => setNewProdDesc(e.target.value)}
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Publish Device
                </button>
              </form>

              {/* Product catalog list */}
              <div className="table-responsive" style={{ marginTop: '30px' }}>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Device Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Condition</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsList.map(prod => (
                      <tr key={prod.id}>
                        <td>
                          <img src={prod.image} alt={prod.name} className="tbl-prod-thumb" />
                        </td>
                        <td>
                          <strong>{prod.name}</strong>
                          <div className="tbl-subtext" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.description}</div>
                        </td>
                        <td>{prod.category}</td>
                        <td>{prod.price.toLocaleString('en-US')} VND</td>
                        <td>
                          <span className={`badge badge-${prod.condition}`}>
                            {getConditionLabel(prod.condition)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-dot ${prod.status}`}></span>
                          {prod.status === 'available' ? 'Available' : 'Sold'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              className="edit-item-btn"
                              onClick={() => {
                                setEditingProduct(prod);
                                setEditProdName(prod.name || '');
                                setEditProdPrice(prod.price || '');
                                setEditProdCategory(prod.category || 'AirConditioner');
                                setEditProdCondition(prod.condition || 'excellent');
                                setEditProdImage(prod.image || '');
                                setEditProdDesc(prod.description || '');
                                setEditProdStatus(prod.status || 'available');
                              }}
                              title="Chỉnh sửa sản phẩm"
                              style={{
                                background: 'none',
                                border: '1px solid var(--primary-light)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                padding: '6px 8px',
                                color: 'var(--primary-dark)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              className="delete-item-btn"
                              onClick={() => handleDeleteProduct(prod.id)}
                              title="Xóa sản phẩm"
                              style={{
                                background: 'none',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                padding: '6px 8px',
                                color: '#ef4444',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && subTab === 'bookings' && (
            <div className="bookings-view animate-fade">
              <h2>Repair Bookings & Orders</h2>
              <p className="view-desc">List hardware repair dispatch status and costs.</p>

              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Device</th>
                      <th>Issue Description</th>
                      <th>Preferred Time</th>
                      <th>Assigned Tech</th>
                      <th>Status</th>
                      <th>Cost & Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsList.map(bk => (
                      <tr key={bk.id}>
                        <td>
                          <strong>{bk.customerName}</strong>
                          <div className="tbl-subtext">{bk.customerPhone}</div>
                        </td>
                        <td>{bk.deviceType}</td>
                        <td>
                          <p className="tbl-desc" title={bk.issueDescription}>{bk.issueDescription}</p>
                        </td>
                        <td>{bk.preferredDate} ({bk.preferredTime})</td>
                        <td>
                          <strong>{bk.technicianName || 'Chưa phân công'}</strong>
                        </td>
                        <td>
                          <span className={`badge badge-${bk.status}`}>
                            {getStatusLabel(bk.status)}
                          </span>
                        </td>
                        <td>
                          <div className="cost-edit-wrapper">
                            <input 
                              type="number" 
                              className="form-control tbl-cost-input" 
                              defaultValue={bk.cost || 0}
                              onBlur={(e) => handleUpdateBookingCostNotes(bk.id, e.target.value, bk.notes)}
                              placeholder="Price (VND)"
                            />
                            <input 
                              type="text" 
                              className="form-control tbl-note-input"
                              defaultValue={bk.notes || ''}
                              onBlur={(e) => handleUpdateBookingCostNotes(bk.id, bk.cost, e.target.value)}
                              placeholder="Technician notes..."
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && subTab === 'customers' && (
            viewingUser ? (
              <div className="customer-detail-view animate-fade">
                <div className="detail-header-row">
                  <button className="back-to-list-btn" onClick={() => setViewingUser(null)}>
                    <ArrowLeft size={16} /> Back to List
                  </button>
                  <h2>Chi tiết Khách hàng</h2>
                </div>

                <div className="row g-4 mb-4 profile-info-row">
                  <div className="col-lg-7">
                    <div className="profile-card-widget glass-panel h-100">
                      <div className="profile-card-body">
                        <div className="profile-avatar-container">
                          <img 
                            src={viewingUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${viewingUser.username}`} 
                            alt={viewingUser.username} 
                            className="detail-avatar" 
                          />
                          <span className="member-badge">🌟 GOLD MEMBER</span>
                        </div>
                        <div className="profile-meta-info">
                          <h3>{viewingUser.username}</h3>
                          <span className="role-pill">Customer</span>
                          <span className="status-text">Male • ID: #{viewingUser.id}</span>
                        </div>
                      </div>
                      <hr className="widget-divider" />
                      <div className="profile-card-actions">
                        <button className="btn btn-outline btn-sm btn-send-message" onClick={() => { setSubTab('chat'); alert("Redirecting to Customer Q&A chat..."); }}>
                          <MessageSquare size={14} /> Send Message
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-5">
                    <div className="personal-info-card-widget glass-panel h-100">
                      <div className="card-header d-flex align-items-center gap-2 mb-3">
                        <Users size={16} className="header-icon" />
                        <h3 className="m-0">PERSONAL INFO</h3>
                      </div>
                      <div className="info-list">
                        <div className="info-row">
                          <span className="info-label">USER ID</span>
                          <span className="info-value value-id">{viewingUser.id}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">EMAIL ADDRESS</span>
                          <span className="info-value">{viewingUser.email}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">PHONE NUMBER</span>
                          <span className="info-value">{viewingUser.phone || 'N/A'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">REGISTRATION DATE</span>
                          <span className="info-value">
                            {new Date(viewingUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-4 mb-4 addresses-row">
                  <div className="col-md-6">
                    <div className="address-card glass-panel h-100 shipping-address-card">
                      <div className="address-card-header d-flex justify-content-between align-items-center mb-3">
                        <div className="header-title-wrap d-flex align-items-center gap-2">
                          <MapPin size={16} className="green-text" />
                          <h3 className="m-0">Shipping Address</h3>
                        </div>
                        <span className="badge badge-default-address">DEFAULT</span>
                      </div>
                      <p className="address-text">
                        {ordersList.filter(o => o.customerId === viewingUser.id)[0]?.shippingInfo?.address || '103 Eco Tower, District 1, Ho Chi Minh City, 70000, Vietnam'}
                      </p>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="address-card glass-panel h-100 billing-address-card">
                      <div className="address-card-header d-flex justify-content-between align-items-center mb-3">
                        <div className="header-title-wrap d-flex align-items-center gap-2">
                          <CreditCard size={16} className="orange-text" />
                          <h3 className="m-0">Billing Address</h3>
                        </div>
                      </div>
                      <p className="address-text">
                        {ordersList.filter(o => o.customerId === viewingUser.id)[0]?.shippingInfo?.address || '45 Green Lane, Ward 5, District 3, Ho Chi Minh City, 70000, Vietnam'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="recent-orders-card-widget glass-panel mb-4">
                  <div className="recent-orders-header d-flex justify-content-between align-items-center mb-3">
                    <h3 className="m-0">Recent Order History</h3>
                    <span className="view-all-link" onClick={() => alert("Redirecting to all orders...")}>View All</span>
                  </div>
                  <div className="table-responsive">
                    <table className="dashboard-table table">
                      <thead>
                        <tr>
                          <th>ORDER ID</th>
                          <th>PRODUCT NAME</th>
                          <th>DATE</th>
                          <th>AMOUNT</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersList.filter(o => o.customerId === viewingUser.id).length > 0 ? (
                          ordersList.filter(o => o.customerId === viewingUser.id).map(o => (
                            <tr key={o.id}>
                              <td className="green-text font-bold">#{o.id.toUpperCase()}</td>
                              <td>{o.items.map(it => it.name).join(', ')}</td>
                              <td>{new Date(o.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                              <td>
                                <span className="price-vnd-formatted">
                                  {o.totalAmount.toLocaleString('en-US')}
                                  <span className="price-vnd-label"> VND</span>
                                </span>
                              </td>
                              <td>
                                <span className={`status-delivery-tag ${o.status}`}>
                                  {o.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr>
                              <td className="green-text font-bold">#ORD-5521</td>
                              <td>Solar-Powered Power Bank X1</td>
                              <td>12 May, 2024</td>
                              <td>5,450,000 VND</td>
                              <td><span className="status-delivery-tag completed">DELIVERED</span></td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="customers-view animate-fade">
                <h2>Customer Registry</h2>
                <p className="view-desc">Complete register log of retail customers. Shows repair tickets and transaction orders.</p>
                
                <div className="table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Email Address</th>
                        <th>Phone Number</th>
                        <th>Joined Date</th>
                        <th>Repair Requests</th>
                        <th>Orders Placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {techsList.map(c => {
                        const bookingsCount = bookingsList.filter(b => b.customerId === c.id).length;
                        const ordersCount = ordersList.filter(o => o.customerId === c.id).length;
                        return (
                          <tr key={c.id} onClick={() => setViewingUser(c)} style={{ cursor: 'pointer' }} className="customer-row-hover">
                            <td>
                              <div className="tbl-user-cell">
                                <img src={c.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.username}`} alt={c.username} className="tbl-avatar-circle" />
                                <strong>{c.username}</strong>
                              </div>
                            </td>
                            <td>{c.email}</td>
                            <td>{c.phone || 'N/A'}</td>
                            <td>{new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td><span className="count-badge green">{bookingsCount} bookings</span></td>
                            <td><span className="count-badge blue">{ordersCount} orders</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {!loading && subTab === 'marketing' && (
            <div className="seller-marketing-view animate-fade">
              <h2>Quản Lý Chiến Dịch & Khuyến Mãi</h2>
              <p className="view-desc">Tạo mã giảm giá và quản lý các chương trình tiếp thị thu hút khách hàng.</p>
              
              <div className="seller-main-layout-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', display: 'grid', gap: '28px' }}>
                {/* Left Column - List of active coupons */}
                <div className="layout-col-left">
                  <div className="stats-card-widget glass-panel">
                    <h3 className="mb-4">Danh Sách Mã Khuyến Mãi</h3>
                    <div className="promos-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {promoCodes.map((p, idx) => (
                        <div key={idx} className="promo-code-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--neutral-lightest)', borderRadius: '12px', border: '1px solid var(--border-color)', opacity: p.status === 'active' ? 1 : 0.6 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="code-text" style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.1rem', color: p.status === 'active' ? '#006D44' : 'var(--neutral-medium)' }}>{p.code}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)', marginTop: '4px' }}>
                              {p.status === 'active' ? `Giảm ${p.discount}% - Hết hạn: ${p.expiry || '15/06'}` : 'Hết hạn'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {p.status === 'active' ? (
                              <button className="copy-code-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }} onClick={() => { navigator.clipboard.writeText(p.code); alert(`Đã sao chép mã ${p.code}!`); }} title="Sao chép">📋</button>
                            ) : (
                              <span style={{ fontSize: '1.3rem' }} title="Hết hạn">⏰</span>
                            )}
                            <button className="delete-code-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#ef4444' }} onClick={() => handleDeletePromoCode(p.code)} title="Xóa mã">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Create Promo Code */}
                <div className="layout-col-right">
                  <div className="stats-card-widget glass-panel">
                    <h3>Tạo Mã Khuyến Mãi Mới</h3>
                    <form onSubmit={handleCreatePromoCode} className="quick-code-form" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label-sm">MÃ GIẢM GIÁ (VIẾT LIỀN KHÔNG DẤU)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="VÍ DỤ: TECHCYCLE10"
                          value={newPromoCode}
                          onChange={e => setNewPromoCode(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label-sm">PHẦN TRĂM GIẢM GIÁ (%)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="10"
                          value={newPromoDiscount}
                          onChange={e => setNewPromoDiscount(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label-sm">HẠN SỬ DỤNG</label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={newPromoExpiry}
                          onChange={e => setNewPromoExpiry(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="form-label-sm" style={{ margin: 0 }}>TRẠNG THÁI HOẠT ĐỘNG</span>
                        <label className="switch-container" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                          <input 
                            type="checkbox" 
                            style={{ opacity: 0, width: 0, height: 0 }} 
                            checked={newPromoActive}
                            onChange={e => setNewPromoActive(e.target.checked)}
                          />
                          <span className="switch-slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: newPromoActive ? '#006D44' : '#ccc', borderRadius: '24px', transition: '0.4s' }}></span>
                        </label>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ background: '#006D44', color: '#fff', width: '100%', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
                        Tạo Mã Khuyến Mãi
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {editingProduct && (
        <div className="modal-backdrop" onClick={() => setEditingProduct(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>Chỉnh Sửa Thiết Bị</h3>
              <button className="close-btn" onClick={() => setEditingProduct(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Tên thiết bị</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editProdName}
                      onChange={e => setEditProdName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Giá bán (VND)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={editProdPrice}
                      onChange={e => setEditProdPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Danh mục</label>
                    <select 
                      className="form-control"
                      value={editProdCategory}
                      onChange={e => setEditProdCategory(e.target.value)}
                    >
                      <option value="AirConditioner">Air Conditioner</option>
                      <option value="WashingMachine">Washing Machine</option>
                      <option value="Refrigerator">Refrigerator</option>
                      <option value="Microwave">Microwave</option>
                      <option value="Audio">Audio</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Smartwatch">Smartwatch</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Chất lượng kiểm định</label>
                    <select 
                      className="form-control"
                      value={editProdCondition}
                      onChange={e => setEditProdCondition(e.target.value)}
                    >
                      <option value="excellent">Like New (99%)</option>
                      <option value="good">Very Good (&gt;90%)</option>
                      <option value="fair">Good (&gt;80%)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Đường dẫn ảnh (Image URL)</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      value={editProdImage}
                      onChange={e => setEditProdImage(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Trạng thái</label>
                    <select 
                      className="form-control"
                      value={editProdStatus}
                      onChange={e => setEditProdStatus(e.target.value)}
                    >
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Mô tả chi tiết</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={editProdDesc}
                    onChange={e => setEditProdDesc(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingProduct(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ backgroundColor: '#006D44', borderColor: '#006D44', color: '#fff' }}>Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;

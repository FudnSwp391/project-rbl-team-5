import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Recycle, ShoppingCart, User, LogOut, LayoutDashboard, ShoppingBag, Calendar, Menu, X, Sun, Moon, Bell, SlidersHorizontal } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ activePage, setActivePage, theme, setTheme, setDashboardSubTab, dashboardSubTab, showFilters, setShowFilters }) => {
  const { user, logout, updateAvatar, getAvatarUrl } = useAuth();
  const { cartItems } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const lastSeenId = localStorage.getItem('last_seen_notif_id') || '0';
        if (data.length > 0) {
          const unread = data.filter(n => Number(n.id) > Number(lastSeenId)).length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.error('Lỗi lấy thông báo:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDropdown = () => {
    setShowNotifDropdown(!showNotifDropdown);
    if (!showNotifDropdown && notifications.length > 0) {
      setUnreadCount(0);
      localStorage.setItem('last_seen_notif_id', notifications[0].id);
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    window.location.hash = '#/auth';
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Recycle },
    { id: 'shop', label: 'Marketplace', icon: ShoppingBag },
    { id: 'booking', label: 'Book Repair', icon: Calendar },
  ];


  return (
    <nav className="navbar">
      <div className={`navbar-container container ${activePage === 'shop' ? 'navbar-full-width' : ''}`}>
        <div className="navbar-left">
          <div 
            className="navbar-logo" 
            onClick={() => {
              const role = user?.role?.toLowerCase();
              if (['admin', 'seller', 'technician'].includes(role)) {
                window.location.hash = '#/dashboard';
              } else {
                setActivePage('home');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="logo-icon-wrapper">
              <Recycle className="logo-icon animate-spin-slow" />
            </div>
            <span className="logo-text">Tech<span>Cycle</span></span>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="navbar-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="navbar-actions">


          {/* Theme Toggle */}
          <div 
            className="theme-toggle-wrapper nav-action-item" 
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
            style={{ cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'light' ? <Moon className="action-icon" /> : <Sun className="action-icon" />}
          </div>

          {/* Bell Icon */}
          <div className="bell-icon-wrapper nav-action-item" style={{ position: 'relative' }}>
            <div onClick={handleToggleDropdown} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Notifications">
              <Bell className="action-icon" />
              {unreadCount > 0 && <span className="bell-badge-count">{unreadCount}</span>}
            </div>

            {showNotifDropdown && (
              <div className="notifications-dropdown-menu glass-panel animate-fade" style={{ position: 'absolute', top: '40px', right: '0', width: '380px', maxHeight: '500px', overflowY: 'auto', zIndex: 1000, padding: '16px', background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>🔔 Thông báo</h4>
                  <button style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowNotifDropdown(false)}>Đóng</button>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 -16px 12px -16px' }} />
                {notifications.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--neutral-medium)', margin: '20px 0', fontSize: '0.9rem' }}>Không có thông báo mới.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {notifications.map((n) => (
                      <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--neutral-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-dark)' }}>{n.title}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--neutral-medium)', flexShrink: 0 }}>{new Date(n.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {n.image && (
                          <div style={{ marginTop: '4px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={n.image} alt={n.title} style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'cover' }} />
                          </div>
                        )}
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--neutral-dark)', lineHeight: '1.5' }}>{n.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>📨 Từ: {n.sender}</span>
                          {n.targetRole && n.targetRole !== 'all' && (
                            <span style={{ fontSize: '0.7rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                              {n.targetRole === 'technician' ? '🔧 Thợ' : '🏪 Seller'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Icon */}
          <div className="cart-icon-wrapper" onClick={() => setActivePage('cart')}>
            <ShoppingCart className="action-icon" />
            {cartItems.length > 0 && (
              <span className="cart-badge animate-pulse">{cartItems.length}</span>
            )}
          </div>

          {/* User Auth Section */}
          {user ? (
            <div className="user-profile-menu">
              <div 
                className="user-profile-trigger" 
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <img src={getAvatarUrl(user.avatar, user.username)} alt={user.username} className="user-avatar" />
                <span className="user-name">{user.username}</span>
                <span className={`user-role-tag role-${user.role}`}>{user.role === 'admin' ? 'Admin' : user.role === 'technician' ? 'Tech' : user.role === 'seller' ? 'Seller' : 'Customer'}</span>
              </div>

              {showDropdown && (
                <div className="user-dropdown-menu animate-fade">
                  <div className="dropdown-info">
                    <p className="dropdown-username">{user.username}</p>
                    <p className="dropdown-email">{user.email}</p>
                    <button 
                      className="change-avatar-link-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomAvatarUrl(user.avatar || '');
                        setShowAvatarModal(true);
                        setShowDropdown(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-dark, #006D44)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        padding: '4px 0',
                        textAlign: 'left',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        marginTop: '4px'
                      }}
                    >
                      Đổi ảnh đại diện
                    </button>
                  </div>
                  <hr className="dropdown-divider" />
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      setActivePage('dashboard');
                      setShowDropdown(false);
                    }}
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </button>
                  {user.role === 'customer' && (
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        if (setDashboardSubTab) setDashboardSubTab('orders');
                        setActivePage('dashboard');
                        setShowDropdown(false);
                      }}
                    >
                      <ShoppingBag size={16} />
                      Order History
                    </button>
                  )}
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-login-nav" onClick={() => setActivePage('auth')}>
              <User size={18} />
              Login / Register
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Links */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay animate-fade">
          <div className="mobile-menu-content animate-slide-up">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`mobile-nav-link ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActivePage(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            {user && (
              <button
                className={`mobile-nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  setActivePage('dashboard');
                  setMobileMenuOpen(false);
                }}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>
            )}
            
            {user && user.role === 'customer' && (
              <button
                className="mobile-nav-link"
                onClick={() => {
                  if (setDashboardSubTab) setDashboardSubTab('orders');
                  setActivePage('dashboard');
                  setMobileMenuOpen(false);
                }}
              >
                <ShoppingBag size={20} />
                <span>Order History</span>
              </button>
            )}

            {!user && (
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => {
                setActivePage('auth');
                setMobileMenuOpen(false);
              }}>
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}
      {showAvatarModal && (
        <div className="modal-backdrop active" onClick={() => setShowAvatarModal(false)} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ width: '450px', padding: '24px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Thay đổi ảnh đại diện</h3>
              <button 
                onClick={() => setShowAvatarModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-color)' }}
              >&times;</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <img 
                  src={customAvatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=placeholder'} 
                  alt="Preview" 
                  style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #006D44' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label-sm" style={{ fontWeight: '600', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>ĐƯỜNG DẪN ẢNH ĐẠI DIỆN (URL)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Dán link ảnh (https://images.unsplash.com/...)"
                  value={customAvatarUrl}
                  onChange={e => setCustomAvatarUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label-sm" style={{ fontWeight: '600', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>HOẶC CHỌN ẢNH CÓ SẴN (PRESETS)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', justifyItems: 'center' }}>
                  {[
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Snickers',
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow'
                  ].map((p, idx) => (
                    <img 
                      key={idx}
                      src={p} 
                      alt={`Preset ${idx}`} 
                      onClick={() => setCustomAvatarUrl(p)}
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '50%', 
                        cursor: 'pointer', 
                        border: customAvatarUrl === p ? '3px solid #006D44' : '2px solid transparent',
                        transition: '0.2s',
                        background: '#f3f4f6'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setShowAvatarModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', background: 'none' }}
              >Hủy</button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={() => {
                  if (updateAvatar && customAvatarUrl.trim() !== '') {
                    updateAvatar(customAvatarUrl);
                    setShowAvatarModal(false);
                    alert("Đã cập nhật ảnh đại diện!");
                  } else {
                    alert("Vui lòng nhập link ảnh đại diện hợp lệ.");
                  }
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#006D44', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
              >Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

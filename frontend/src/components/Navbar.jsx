import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Recycle, ShoppingCart, User, LogOut, LayoutDashboard, ShoppingBag, Calendar, Menu, X, Sun, Moon, Bell, Search, MessageSquare } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ activePage, setActivePage, theme, setTheme, setDashboardSubTab, dashboardSubTab }) => {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    setActivePage('home');
  };

  const navItems = user && user.role === 'technician' ? [
    { id: 'shop', label: 'Marketplace', icon: ShoppingBag },
    { id: 'repairs', label: 'Repairs', icon: Calendar },
    { id: 'chat', label: 'Workplace', icon: MessageSquare },
  ] : [
    { id: 'home', label: 'Trang chủ', icon: Recycle },
    { id: 'shop', label: 'Chợ đồ cũ', icon: ShoppingBag },
    { id: 'booking', label: 'Đặt lịch sửa chữa', icon: Calendar },
  ];


  return (
    <nav className="navbar">
      <div className="navbar-container container">
        <div className="navbar-logo" onClick={() => setActivePage('home')}>
          <div className="logo-icon-wrapper">
            <Recycle className="logo-icon animate-spin-slow" />
          </div>
          <span className="logo-text">Tech<span>Cycle</span></span>
        </div>

        {/* Desktop Menu */}
        {user && user.role === 'technician' && activePage === 'dashboard' && (dashboardSubTab === 'overview' || !dashboardSubTab || dashboardSubTab === '') ? (
          <div className="navbar-search-centered">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search tasks..." className="nav-search-input" />
          </div>
        ) : (
          <div className="navbar-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = (user && user.role === 'technician')
                ? (activePage === 'dashboard' && dashboardSubTab === item.id) || (activePage === 'shop' && item.id === 'shop')
                : activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (user && user.role === 'technician') {
                      if (item.id === 'shop') {
                        setActivePage('shop');
                      } else {
                        if (setDashboardSubTab) setDashboardSubTab(item.id);
                        setActivePage('dashboard');
                      }
                    } else {
                      setActivePage(item.id);
                    }
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="navbar-actions">
          {/* Right search input for technician when not on overview page */}
          {user && user.role === 'technician' && !(activePage === 'dashboard' && (dashboardSubTab === 'overview' || !dashboardSubTab || dashboardSubTab === '')) && (
            <div className="navbar-search-right">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search tickets..." className="nav-search-input-sm" />
            </div>
          )}

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
          <div className="bell-icon-wrapper nav-action-item" onClick={() => alert("Không có thông báo mới.")} title="Thông báo">
            <Bell className="action-icon" />
            <span className="bell-badge-dot"></span>
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
                <img src={user.avatar} alt={user.username} className="user-avatar" />
                <span className="user-name">{user.username}</span>
                <span className={`user-role-tag role-${user.role}`}>{user.role === 'admin' ? 'Admin' : user.role === 'technician' ? 'Kỹ thuật' : user.role === 'seller' ? 'Người bán' : 'Khách'}</span>
              </div>

              {showDropdown && (
                <div className="user-dropdown-menu animate-fade">
                  <div className="dropdown-info">
                    <p className="dropdown-username">{user.username}</p>
                    <p className="dropdown-email">{user.email}</p>
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
                    Bảng điều khiển
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
                      Lịch sử mua hàng
                    </button>
                  )}
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-login-nav" onClick={() => setActivePage('auth')}>
              <User size={18} />
              Đăng nhập / Đăng ký
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
                <span>Bảng điều khiển</span>
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
                <span>Lịch sử mua hàng</span>
              </button>
            )}

            {!user && (
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => {
                setActivePage('auth');
                setMobileMenuOpen(false);
              }}>
                Đăng nhập / Đăng ký
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

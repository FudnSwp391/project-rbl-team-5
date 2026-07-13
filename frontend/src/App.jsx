import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Booking from './pages/Booking';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import VnpayReturn from './pages/VnpayReturn';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ChatBot from "./components/chatbot/ChatBot";
import ChatToast from './components/ChatToast';
import { io } from 'socket.io-client';



function MainApp() {
  const parseHash = () => {
    const hash = window.location.hash;
    if (!hash.startsWith('#/')) {
      return { page: 'home', subTab: null };
    }
    const cleanHash = hash.split('?')[0];
    const path = cleanHash.slice(2); // remove '#/'
    const parts = path.split('/');
    return { page: parts[0] || 'home', subTab: parts[1] || null };
  };

  const initial = parseHash();
  const [activePage, setActivePage] = useState(initial.page);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { user } = useAuth();
  const [dashboardSubTab, setDashboardSubTab] = useState(initial.subTab);
  const [showFilters, setShowFilters] = useState(false);
  const [chatToasts, setChatToasts] = useState([]);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (!user) return;
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)) ? `${window.location.protocol}//${window.location.hostname}:5000` : '';
    const socket = io(API_BASE);
    socket.emit('registerUser', String(user.id));

    socket.on('newBellNotification', (notif) => {
      if (notif.type === 'chat') {
        if (window.isChatViewActive && Number(window.currentActiveChatBookingId) === Number(notif.bookingId)) {
          // User is currently viewing this exact chat, no toast needed
          return;
        }
        const toastId = `toast_${Date.now()}_${Math.random()}`;
        setChatToasts(prev => [...prev.slice(-4), { ...notif, toastId }]);
        setTimeout(() => {
          setChatToasts(prev => prev.filter(t => t.toastId !== toastId));
        }, 5000);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  const handleToastClick = (toast) => {
    setChatToasts(prev => prev.filter(t => t.toastId !== toast.toastId));
    localStorage.setItem('pending_chat_booking_id', toast.bookingId);
    
    const role = user?.role?.toLowerCase();
    if (role === 'admin') setDashboardSubTab('bookings');
    else if (role === 'seller') setDashboardSubTab('bookings');
    else setDashboardSubTab('chat');
    
    setActivePage('dashboard');
  };

  // Reset showFilters when navigating away from shop
  useEffect(() => {
    if (activePage !== 'shop') {
      setShowFilters(false);
    }
  }, [activePage]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync hash changes with react state
  useEffect(() => {
    if (window.location.hash === '') {
      window.location.hash = '#/home';
    }

    const handleHashChange = () => {
      const { page, subTab } = parseHash();
      setActivePage(page);
      setDashboardSubTab(subTab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Reset dashboard sub-tab when navigating away from dashboard
  useEffect(() => {
    if (activePage !== 'dashboard' && dashboardSubTab !== null) {
      setDashboardSubTab(null);
    }
  }, [activePage, dashboardSubTab]);

  // Nếu đã đăng nhập mà vẫn đang ở trang auth → redirect về dashboard
  useEffect(() => {
    if (user && activePage === 'auth') {
      setActivePage('dashboard');
    }
  }, [user, activePage]);

  // Sync state changes back to hash
  useEffect(() => {
    const current = parseHash();
    if (current.page !== activePage || current.subTab !== dashboardSubTab) {
      const isDashboard = activePage === 'dashboard';
      const actualSubTab = isDashboard ? dashboardSubTab : null;
      const newHash = actualSubTab ? `#/${activePage}/${actualSubTab}` : `#/${activePage}`;
      window.location.hash = newHash;
    }
  }, [activePage, dashboardSubTab]);

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage]);

  // Check for VNPay redirect on initial load
  useEffect(() => {
    const searchParams = window.location.search;
    if (searchParams.includes('vnpay_return') || searchParams.includes('vnp_ResponseCode')) {
      setActivePage('vnpay_return');
    }
  }, []);
  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home setActivePage={setActivePage} setSelectedProduct={setSelectedProduct} />;
      case 'shop':
        return <Shop selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} showFilters={showFilters} setShowFilters={setShowFilters} />;
      case 'booking':
        return <Booking setActivePage={setActivePage} />;
      case 'cart':
        return <Cart setActivePage={setActivePage} />;
      case 'checkout':
        return <Checkout setActivePage={setActivePage} />;
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} theme={theme} setTheme={setTheme} initialSubTab={dashboardSubTab} setInitialSubTab={setDashboardSubTab} />;
      case 'auth':
        return <Auth setActivePage={setActivePage} />;
      case 'vnpay_return':
        return <VnpayReturn setActivePage={setActivePage} />;
      default:
        return <Home setActivePage={setActivePage} setSelectedProduct={setSelectedProduct} />;
    }
  };

  const isConsoleDashboard = activePage === 'dashboard' && user && ['admin', 'seller', 'technician'].includes(user.role?.toLowerCase());

  return (
    <div className="app-container">
      {!isConsoleDashboard && <Navbar activePage={activePage} setActivePage={setActivePage} theme={theme} setTheme={setTheme} setDashboardSubTab={setDashboardSubTab} dashboardSubTab={dashboardSubTab} showFilters={showFilters} setShowFilters={setShowFilters} />}
      <main className={isConsoleDashboard ? "" : "main-content"}>
        {renderPage()}
      </main>
      {!isConsoleDashboard && <Footer />}
      {!isConsoleDashboard && (
        <ChatBot 
          onProductClick={async (productId) => {
            try {
              const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)) 
                ? `${window.location.protocol}//${window.location.hostname}:5000` 
                : '';
              const res = await fetch(`${API_BASE}/api/products/${productId}`);
              if (res.ok) {
                const product = await res.json();
                setSelectedProduct(product);
                setActivePage('shop');
              }
            } catch (err) {
              console.error('Error opening product from chatbot:', err);
            }
          }}
        />
      )}
      
      {/* Global Chat Toasts */}
      <ChatToast 
        toasts={chatToasts}
        onDismiss={(id) => setChatToasts(prev => prev.filter(t => t.toastId !== id))}
        onClickToast={handleToastClick}
      />
    </div>
  );
}

function CartWrapper() {
  const { user } = useAuth();
  return (
    <CartProvider key={user?.id || 'guest'}>
      <MainApp />
    </CartProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartWrapper />
    </AuthProvider>
  );
}

export default App;

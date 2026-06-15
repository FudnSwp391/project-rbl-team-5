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
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ChatBot from "./components/chatbot/ChatBot";



function MainApp() {
  const [activePage, setActivePage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { user } = useAuth();

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home setActivePage={setActivePage} setSelectedProduct={setSelectedProduct} />;
      case 'shop':
        return <Shop selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />;
      case 'booking':
        return <Booking setActivePage={setActivePage} />;
      case 'cart':
        return <Cart setActivePage={setActivePage} />;
      case 'checkout':
        return <Checkout setActivePage={setActivePage} />;
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} theme={theme} setTheme={setTheme} />;
      case 'auth':
        return <Auth setActivePage={setActivePage} />;
      default:
        return <Home setActivePage={setActivePage} setSelectedProduct={setSelectedProduct} />;
    }
  };

  const isAdminDashboard = activePage === 'dashboard' && user && user.role === 'Admin';

  return (
    <div className="app-container">
      {!isAdminDashboard && <Navbar activePage={activePage} setActivePage={setActivePage} theme={theme} setTheme={setTheme} />}
      <main className={isAdminDashboard ? "" : "main-content"}>
        {renderPage()}
      </main>
      {!isAdminDashboard && <Footer />}
      {!isAdminDashboard && <ChatBot />}
    </div>
  );
}

function App() {
  return (

    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;

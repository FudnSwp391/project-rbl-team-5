import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { getProductImage } from '../../components/ProductCard';
import ProfileSettings from '../../components/ProfileSettings';
import { 
  LayoutDashboard, ShoppingBag, Calendar, Plus, Trash2, 
  Users, Sun, Moon, Eye, Search, Bell, Settings, HelpCircle, LogOut,
  MapPin, CreditCard, Pencil, Shield, ArrowLeft, MessageSquare, Tag, Send
} from 'lucide-react';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const AdminDashboard = ({ setActivePage, theme, setTheme, initialSubTab, setInitialSubTab }) => {
  const { user, token, updateAvatar, getAvatarUrl, logout } = useAuth();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const subTab = initialSubTab || 'stats';
  const setSubTab = setInitialSubTab;
  const [timeRange, setTimeRange] = useState('1Y');
  const [viewingUser, setViewingUser] = useState(null);

  // --- DATA STATES ---
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [techsList, setTechsList] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // --- CHAT SYSTEM STATES ---
  const [chatConversations, setChatConversations] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const fetchConversationsListRef = useRef(null);

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

      const resUsers = await fetch(`${API_BASE}/api/users/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataUsers = await resUsers.json();
      if (Array.isArray(dataUsers)) setUsersList(dataUsers);

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

  // --- WEBSOCKET CHAT LOGIC ---
  useEffect(() => {
    if (!user) return;
    socketRef.current = io(`${API_BASE}`);
    socketRef.current.emit('registerUser', user.id);

    socketRef.current.on('receiveMessage', (message) => {
      if (selectedBooking && message.bookingId === selectedBooking.id) {
        setChatMessages(prev => Array.isArray(prev) ? [...prev, message] : [message]);
      }
      if (fetchConversationsListRef.current) fetchConversationsListRef.current();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user, selectedBooking]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchConversationsList = useCallback(() => {
    if (bookingsList.length === 0) return;
    const chats = bookingsList.filter(b => b.status !== 'pending');
    setChatConversations(chats);
  }, [bookingsList]);

  useEffect(() => {
    fetchConversationsListRef.current = fetchConversationsList;
  }, [fetchConversationsList]);

  useEffect(() => {
    fetchConversationsList();
  }, [fetchConversationsList]);

  const handleSelectConversation = (booking) => {
    setSelectedBooking(booking);
    setChatMessages([]);
    if (socketRef.current) {
      socketRef.current.emit('joinBookingRoom', booking.id);
    }
    fetch(`${API_BASE}/api/messages/${booking.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChatMessages(data);
        } else {
          setChatMessages([]);
          console.error('Expected array of messages, got:', data);
        }
      })
      .catch(err => {
        console.error('Lỗi tải lịch sử chat:', err);
        setChatMessages([]);
      });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedBooking) return;
    const receiverId = selectedBooking.customerId;
    const messagePayload = {
      senderId: user.id,
      receiverId,
      bookingId: selectedBooking.id,
      text: newMessage
    };
    if (socketRef.current) {
      socketRef.current.emit('sendMessage', messagePayload);
      setNewMessage('');
    }
  };



  useEffect(() => {
    fetchData();
  }, [user, token, subTab]);

  const getTrendData = () => {
    switch (timeRange) {
      case '7D':
        return {
          title: "TOTAL REVENUE THIS WEEK",
          value: "74,500,000 VND",
          badge: "+ 8.5%",
          desc: "Weekly overview based on active repair appointments and old hardware trading.",
          xAxis: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
          yAxis: ["100M", "60M", "30M", "0"],
          areaPath: "M 40 180 L 113.33 160 L 186.66 170 L 260.00 130 L 333.33 140 L 406.66 90 L 480.00 70 L 480 180 L 40 180 Z",
          linePath: "M 40 180 L 113.33 160 L 186.66 170 L 260.00 130 L 333.33 140 L 406.66 90 L 480.00 70",
          dots: [
            {cx: 40, cy: 180}, {cx: 113.33, cy: 160}, {cx: 186.66, cy: 170}, 
            {cx: 260.00, cy: 130}, {cx: 333.33, cy: 140}, {cx: 406.66, cy: 90}, {cx: 480.00, cy: 70}
          ],
          repairShare: "32,780,000 VND (44%)",
          salesShare: "41,720,000 VND (56%)",
          newCustomers: "36",
          satisfaction: "99.1%"
        };
      case '30D':
        return {
          title: "TOTAL REVENUE THIS MONTH",
          value: "320,000,000 VND",
          badge: "+ 11.8%",
          desc: "Monthly performance overview tracking device reuse and repair success rates.",
          xAxis: ["Ngày 1", "Ngày 5", "Ngày 10", "Ngày 15", "Ngày 20", "Ngày 25", "Ngày 30"],
          yAxis: ["400M", "250M", "100M", "0"],
          areaPath: "M 40 170 L 113.33 140 L 186.66 150 L 260.00 110 L 333.33 120 L 406.66 75 L 480.00 50 L 480 180 L 40 180 Z",
          linePath: "M 40 170 L 113.33 140 L 186.66 150 L 260.00 110 L 333.33 120 L 406.66 75 L 480.00 50",
          dots: [
            {cx: 40, cy: 170}, {cx: 113.33, cy: 140}, {cx: 186.66, cy: 150}, 
            {cx: 260.00, cy: 110}, {cx: 333.33, cy: 120}, {cx: 406.66, cy: 75}, {cx: 480.00, cy: 50}
          ],
          repairShare: "140,800,000 VND (44%)",
          salesShare: "179,200,000 VND (56%)",
          newCustomers: "142",
          satisfaction: "98.5%"
        };
      case '1Y':
      default:
        return {
          title: "TOTAL REVENUE THIS YEAR",
          value: "2,840,000,000 VND",
          badge: "+ 14.2%",
          desc: "Overall analysis based on expansion of high-tech services and optimization of component sales.",
          xAxis: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
          yAxis: ["3B", "2B", "1B", "0"],
          areaPath: "M 40 180 L 80 150 L 120 165 L 160 120 L 200 135 L 240 100 L 280 115 L 320 80 L 360 95 L 400 65 L 440 78 L 480 50 L 480 180 L 40 180 Z",
          linePath: "M 40 180 L 80 150 L 120 165 L 160 120 L 200 135 L 240 100 L 280 115 L 320 80 L 360 95 L 400 65 L 440 78 L 480 50",
          dots: [
            {cx: 40, cy: 180}, {cx: 80, cy: 150}, {cx: 120, cy: 165}, {cx: 160, cy: 120}, 
            {cx: 200, cy: 135}, {cx: 240, cy: 100}, {cx: 280, cy: 115}, {cx: 320, cy: 80}, 
            {cx: 360, cy: 95}, {cx: 400, cy: 65}, {cx: 440, cy: 78}, {cx: 480, cy: 50}
          ],
          repairShare: "1,250,000,000 VND (44%)",
          salesShare: "1,590,000,000 VND (56%)",
          newCustomers: "1,204",
          satisfaction: "98.2%"
        };
    }
  };

  const trend = getTrendData();

  const handleLogout = () => {
    logout();
    setActivePage('home');
  };

  const handleDeleteUser = async (userId) => {
    if (userId === user.id) {
      alert("You cannot delete your own account.");
      return;
    }
    // Find the target user to check their role
    const targetUser = usersList.find(u => u.id === userId);
    if (targetUser && targetUser.role === 'admin') {
      alert("Cannot delete admin accounts.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user account? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("User account deleted successfully.");
        fetchData();
        if (viewingUser && viewingUser.id === userId) {
          setViewingUser(null);
        }
      } else {
        const d = await res.json();
        alert(d.message || "Failed to delete user.");
      }
    } catch (err) {
      alert("Error deleting user: " + err.message);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    const targetUser = usersList.find(u => u.id === userId);
    if (targetUser && targetUser.role === 'admin') {
      alert("Cannot change role of admin accounts.");
      return;
    }
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        alert(`Role updated to ${newRole} successfully.`);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.message || "Failed to update role.");
      }
    } catch (err) {
      alert("Error updating role: " + err.message);
    }
  };

  const handleAssignTechnician = async (bookingId, techId) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ technicianId: techId || null, status: techId ? 'assigned' : 'pending' })
      });
      if (res.ok) {
        alert('Phân công kỹ thuật viên thành công.');
        fetchData();
      }
    } catch {
      alert('Lỗi phân công.');
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
    <div className="dashboard-page admin-dashboard-layout animate-fade">
      <div className="dashboard-grid-layout">
        {/* Sidebar Nav */}
        <aside className="dashboard-sidebar glass-panel">
          <div className="sidebar-brand-logo" onClick={() => setActivePage('home')}>
            <div className="brand-icon-box">
              <LayoutDashboard className="brand-logo-icon" size={24} />
            </div>
            <div className="brand-text-wrapper">
              <h3>TechCycle</h3>
              <span>#ANALYTICS HUB</span>
            </div>
          </div>
          
          <nav className="sidebar-nav-menu">
            <button className={`sidebar-nav-btn ${subTab === 'stats' ? 'active' : ''}`} onClick={() => setSubTab('stats')}>
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'bookings' ? 'active' : ''}`} onClick={() => setSubTab('bookings')}>
              <Calendar size={18} />
              Analytics
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'products' ? 'active' : ''}`} onClick={() => setSubTab('products')}>
              <ShoppingBag size={18} />
              Assets
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'customers' ? 'active' : ''}`} onClick={() => setSubTab('customers')}>
              <Users size={18} />
              Reports
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'users' ? 'active' : ''}`} onClick={() => setSubTab('users')}>
              <Users size={18} />
              Team
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'marketing' ? 'active' : ''}`} onClick={() => setSubTab('marketing')}>
              <Tag size={18} />
              Marketing
            </button>
          </nav>

          <button className="new-report-btn" onClick={() => alert("Creating a new analytics report...")}>
            <Plus size={16} /> New Report
          </button>

          <div className="sidebar-bottom-nav">
            <button className="sidebar-nav-btn bottom-btn" onClick={() => alert("Contact TechCycle support at support@techcycle.vn")}>
              <HelpCircle size={18} />
              Help
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
            <div style={{ flex: 1 }}></div>

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
              
              <button className={`topbar-action-btn settings ${subTab === 'settings' ? 'active' : ''}`} onClick={() => setSubTab('settings')} title="Settings">
                <Settings size={20} />
              </button>
              
              <div className="topbar-divider"></div>

              <div 
                className="topbar-profile-widget" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setCustomAvatarUrl(user.avatar || '');
                  setShowAvatarModal(true);
                }}
                title="Thay đổi ảnh đại diện"
              >
                <div className="profile-info">
                  <h4>{user.username === 'admin' ? 'Admin TechCycle' : user.username}</h4>
                  <span>{user.username === 'admin' ? 'Administrator' : 'Eco Seller'}</span>
                </div>
                 <img src={getAvatarUrl(user.avatar, user.username)} alt={user.username} className="profile-avatar-circle" />
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

          {!loading && subTab === 'settings' && (
            <div className="settings-view animate-fade container py-4">
              <h2 className="mb-4 text-center" style={{ fontWeight: 800 }}>Account Settings</h2>
              <ProfileSettings />
            </div>
          )}

          {!loading && subTab === 'stats' && stats && (
            <div className="stats-view animate-fade">
              <div className="chart-card glass-panel main-trend-card">
                <div className="chart-header-row" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="trend-main-headings">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neutral-darkest)', margin: 0 }}>Xu Hướng Doanh Thu</h3>
                    <span className="trend-subtitle-tag" style={{ fontSize: '0.8rem', color: 'var(--neutral-medium)', display: 'block', marginTop: '4px' }}>
                      {timeRange === '7D' ? 'Thống kê 7 ngày gần nhất' : timeRange === '30D' ? 'Thống kê 30 ngày gần nhất' : 'Thống kê 12 tháng gần nhất (2024)'}
                    </span>
                  </div>

                  <div className="trend-time-pill-selectors">
                    <button className={timeRange === '7D' ? 'active' : ''} onClick={() => setTimeRange('7D')}>Tuần</button>
                    <button className={timeRange === '30D' ? 'active' : ''} onClick={() => setTimeRange('30D')}>Tháng</button>
                    <button className={timeRange === '1Y' ? 'active' : ''} onClick={() => setTimeRange('1Y')}>Năm</button>
                  </div>
                </div>

                <div className="svg-chart-container">
                  <svg viewBox="0 0 500 240" className="svg-chart">
                    <line x1="40" y1="30" x2="480" y2="30" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="80" x2="480" y2="80" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="130" x2="480" y2="130" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="40" y1="180" x2="480" y2="180" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                    
                    <text x="15" y="34" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[0]}</text>
                    <text x="15" y="84" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[1]}</text>
                    <text x="15" y="134" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[2]}</text>
                    <text x="15" y="184" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[3]}</text>

                    <defs>
                      <linearGradient id="chart-grad-emerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#006D44" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#006D44" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={trend.areaPath} fill="url(#chart-grad-emerald)" />

                    <path 
                      d={trend.linePath} 
                      fill="none" 
                      stroke="#006D44" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {trend.dots.map((dot, idx) => (
                      <circle key={idx} cx={dot.cx} cy={dot.cy} r="4.5" fill="#006D44" stroke="var(--white)" strokeWidth="2.5" />
                    ))}

                    {trend.xAxis.map((label, idx) => {
                      const spacing = (440) / (trend.xAxis.length - 1);
                      const xCoord = 40 + (idx * spacing);
                      return (
                        <text key={idx} x={xCoord} y="208" fontSize="9.5" fill="var(--neutral-medium)" fontWeight={600} textAnchor="middle">{label}</text>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="bottom-widgets-grid-layout">
                <div className="stats-card-widget glass-panel service-analysis">
                  <div className="widget-header-row">
                    <div>
                      <h3>Service Analysis</h3>
                      <p>Key revenue source allocation</p>
                    </div>
                    <span className="details-text-link" onClick={() => setSubTab('bookings')}>Details</span>
                  </div>

                  <div className="service-progress-list">
                    <div className="progress-item-bar">
                      <div className="progress-bar-labels">
                        <span className="progress-dot green"></span>
                        <span className="bar-label">Repair Services</span>
                        <span className="bar-value">{trend.repairShare}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill green" style={{ width: '44%' }}></div>
                      </div>
                    </div>

                    <div className="progress-item-bar">
                      <div className="progress-bar-labels">
                        <span className="progress-dot gray"></span>
                        <span className="bar-label">Product Sales</span>
                        <span className="bar-value">{trend.salesShare}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill gray" style={{ width: '56%' }}></div>
                      </div>
                    </div>
                  </div>

                  <hr className="widget-divider" />

                  <div className="widget-bottom-stats-row">
                    <div className="bottom-metric-item">
                      <span className="metric-label">NEW CUSTOMERS</span>
                      <h4>{trend.newCustomers}</h4>
                    </div>
                    <div className="bottom-metric-item">
                      <span className="metric-label">SATISFACTION RATE</span>
                      <h4 className="green-text">{trend.satisfaction}</h4>
                    </div>
                  </div>
                </div>

                <div className="stats-card-widget glass-panel recent-transactions">
                  <div className="widget-header-row">
                    <h3>Recent Transactions</h3>
                    <span className="three-dots-icon" onClick={() => alert("Opening historical transaction filters...")}>•••</span>
                  </div>

                  <div className="transactions-table-wrapper">
                    <table className="transactions-table">
                      <thead>
                        <tr>
                          <th>CUSTOMER</th>
                          <th>SERVICE</th>
                          <th>AMOUNT</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeRange === '7D' ? (
                          <>
                            <tr>
                              <td>Nguyen Huy</td>
                              <td>Keyboard Switch Repair</td>
                              <td><strong>1.5M VND</strong></td>
                              <td><span className="badge badge-completed">COMPLETED</span></td>
                            </tr>
                            <tr>
                              <td>Tran Minh</td>
                              <td>iPhone Trade-In</td>
                              <td><strong>12.2M VND</strong></td>
                              <td><span className="badge badge-pending">PENDING</span></td>
                            </tr>
                            <tr>
                              <td>Le Anh</td>
                              <td>SSD Upgrade 1TB</td>
                              <td><strong>3.2M VND</strong></td>
                              <td><span className="badge badge-completed">COMPLETED</span></td>
                            </tr>
                            <tr>
                              <td>Pham Van</td>
                              <td>Power Supply Unit</td>
                              <td><strong>0.8M VND</strong></td>
                              <td><span className="badge badge-completed" style={{ background: '#fee2e2', color: '#ef4444' }}>CANCELED</span></td>
                            </tr>
                          </>
                        ) : timeRange === '30D' ? (
                          <>
                            <tr>
                              <td>Nguyen Huy</td>
                              <td>Laptop Pro Repair</td>
                              <td><strong>4.5M VND</strong></td>
                              <td><span className="badge badge-completed">COMPLETED</span></td>
                            </tr>
                            <tr>
                              <td>Tran Minh</td>
                              <td>iPhone Trade-In</td>
                              <td><strong>12.2M VND</strong></td>
                              <td><span className="badge badge-pending">PENDING</span></td>
                            </tr>
                            <tr>
                              <td>Le Anh</td>
                              <td>Laptop Air Screen</td>
                              <td><strong>8.5M VND</strong></td>
                              <td><span className="badge badge-completed">COMPLETED</span></td>
                            </tr>
                            <tr>
                              <td>Pham Van</td>
                              <td>Component Sales</td>
                              <td><strong>0.8M VND</strong></td>
                              <td><span className="badge badge-completed" style={{ background: '#fee2e2', color: '#ef4444' }}>CANCELED</span></td>
                            </tr>
                          </>
                        ) : (
                          <>
                            <tr>
                              <td>Nguyen Huy</td>
                              <td>Laptop Pro Repair</td>
                              <td><strong>4.5M VND</strong></td>
                              <td><span className="badge badge-completed">COMPLETED</span></td>
                            </tr>
                            <tr>
                              <td>Tran Minh</td>
                              <td>iPhone Trade-In</td>
                              <td><strong>12.2M VND</strong></td>
                              <td><span className="badge badge-pending">PENDING</span></td>
                            </tr>
                            <tr>
                              <td>Le Anh</td>
                              <td>Server Maintenance</td>
                              <td><strong>35.0M VND</strong></td>
                              <td><span className="badge badge-completed">COMPLETED</span></td>
                            </tr>
                            <tr>
                              <td>Pham Van</td>
                              <td>Loose Components</td>
                              <td><strong>0.8M VND</strong></td>
                              <td><span className="badge badge-completed" style={{ background: '#fee2e2', color: '#ef4444' }}>CANCELED</span></td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="view-history-footer" onClick={() => alert("Redirecting to full transaction logs...")}>
                    <span>View all transaction history</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'bookings' && (
            <div className="bookings-view animate-fade">
              <h2>Repair Bookings & Staff Dispatch</h2>
              <p className="view-desc">Assign customer hardware inspection and repair requests to registered technicians.</p>

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
                          <select 
                            className="form-control tbl-select"
                            value={bk.technicianId || ''}
                            onChange={(e) => handleAssignTechnician(bk.id, e.target.value)}
                          >
                            <option value="">-- Unassigned --</option>
                            {techsList.map(t => (
                              <option key={t.id} value={t.id}>{t.username}</option>
                            ))}
                          </select>
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
                          <img src={getProductImage(prod)} alt={prod.name} className="tbl-prod-thumb" />
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

          {!loading && subTab === 'users' && (
            <div className="users-manager animate-fade">
              <h2>Staff & User Account Registry</h2>
              <p className="view-desc">Monitor accounts, inspect details, and remove unauthorized credentials from the system database.</p>
              
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email Login</th>
                      <th>Phone Number</th>
                      <th>Role Profile</th>
                      <th>Joined Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="tbl-user-cell">
                             <img src={getAvatarUrl(u.avatar, u.username)} alt={u.username} className="tbl-avatar-circle" />
                            <strong>{u.username}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || 'N/A'}</td>
                        <td>
                          <span className={`user-role-tag role-${u.role}`}>{u.role.toUpperCase()}</span>
                          {u.role !== 'admin' && u.id !== user.id && (
                            <select
                              className="role-change-select"
                              value={u.role}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              style={{
                                marginLeft: '8px',
                                padding: '3px 6px',
                                fontSize: '0.72rem',
                                borderRadius: '6px',
                                border: '1.5px solid var(--border-color)',
                                cursor: 'pointer',
                                background: 'var(--white)',
                                color: 'var(--neutral-darkest)',
                                fontWeight: 600
                              }}
                            >
                              <option value="customer">Customer</option>
                              <option value="technician">Technician</option>
                              <option value="seller">Seller</option>
                            </select>
                          )}
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td>
                          <div className="action-buttons-wrap">
                            <button 
                              className="view-item-btn"
                              onClick={() => setViewingUser(u)}
                              title="View account profile"
                            >
                              <Eye size={16} />
                            </button>
                            {u.id !== user.id && u.role !== 'admin' && (
                              <button 
                                className="delete-item-btn"
                                onClick={() => handleDeleteUser(u.id)}
                                title="Delete user account"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
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
                            src={getAvatarUrl(viewingUser.avatar, viewingUser.username)} 
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
                        <button className="btn btn-primary btn-sm btn-edit-profile" onClick={() => alert("Profile editing feature is managed by general user control panel.")}>
                          <Pencil size={14} /> Edit Profile
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
                      {usersList.filter(u => u.role === 'customer').map(c => {
                        const bookingsCount = bookingsList.filter(b => b.customerId === c.id).length;
                        const ordersCount = ordersList.filter(o => o.customerId === c.id).length;
                        return (
                          <tr key={c.id} onClick={() => setViewingUser(c)} style={{ cursor: 'pointer' }} className="customer-row-hover">
                            <td>
                              <div className="tbl-user-cell">
                                 <img src={getAvatarUrl(c.avatar, c.username)} alt={c.username} className="tbl-avatar-circle" />
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

          {!loading && subTab === 'chat' && (
            <div className="chat-view-layout glass-panel animate-fade">
              <div className="chat-conversations-sidebar">
                <h3>Repair Tickets</h3>
                <p className="chat-sub-lbl">Select a ticket to begin consultation</p>
                <div className="chat-conversations-list">
                  {chatConversations.map(conv => (
                    <div 
                      key={conv.id} 
                      className={`conv-item-card ${selectedBooking?.id === conv.id ? 'active' : ''}`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="conv-item-info">
                        <h4>{conv.deviceType}</h4>
                        <p className="conv-user-name">
                          Client: {conv.customerName}
                        </p>
                      </div>
                      <span className="conv-id">#{conv.id}</span>
                    </div>
                  ))}
                  {chatConversations.length === 0 && (
                    <p className="empty-text">No assigned repairs available to start messaging.</p>
                  )}
                </div>
              </div>

              <div className="chat-thread-panel">
                {selectedBooking ? (
                  <>
                    <div className="thread-header">
                      <div>
                        <h4>{selectedBooking.deviceType}</h4>
                        <p>#{selectedBooking.id} • Customer: {selectedBooking.customerName}</p>
                      </div>
                    </div>

                    <div className="chat-messages-thread">
                      {Array.isArray(chatMessages) && chatMessages.map(msg => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`chat-message-bubble ${isMe ? 'mine' : 'theirs'}`}>
                             {!isMe && <img src={getAvatarUrl(msg.senderAvatar, msg.senderName)} alt={msg.senderName} className="msg-avatar" />}
                            <div className="msg-bubble-content">
                              {!isMe && <span className="sender-name">{msg.senderName}</span>}
                              <p className="msg-text">{msg.text}</p>
                              <span className="msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleSendMessage}>
                      <input 
                        type="text" 
                        placeholder="Type your message..." 
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                      />
                      <button type="submit" className="chat-send-btn">
                        <Send size={18} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="no-chat-selected">
                    <p>Select a conversation from the sidebar to view chat logs.</p>
                  </div>
                )}
              </div>

              {selectedBooking && (
                <div className="chat-case-details-panel">
                  <h3>Repair Ticket</h3>
                  <hr className="details-divider" />
                  <div className="details-content">
                    <div className="details-device-header">
                      <h4>{selectedBooking.deviceType}</h4>
                      <span className="details-id">#{selectedBooking.id}</span>
                    </div>
                    
                    <div className="details-progress-stepper">
                      <div className={`stepper-step ${['assigned', 'inspecting', 'repairing', 'completed'].includes(selectedBooking.status) ? 'active' : ''}`}>
                        <div className="step-bullet">1</div>
                        <div className="step-info"><span className="step-name">Assigned</span></div>
                      </div>
                      <div className={`stepper-step ${['inspecting', 'repairing', 'completed'].includes(selectedBooking.status) ? 'active' : ''}`}>
                        <div className="step-bullet">2</div>
                        <div className="step-info"><span className="step-name">Inspect</span></div>
                      </div>
                      <div className={`stepper-step ${['repairing', 'completed'].includes(selectedBooking.status) ? 'active' : ''}`}>
                        <div className="step-bullet">3</div>
                        <div className="step-info"><span className="step-name">Repairing</span></div>
                      </div>
                      <div className={`stepper-step ${selectedBooking.status === 'completed' ? 'active' : ''}`}>
                        <div className="step-bullet">4</div>
                        <div className="step-info"><span className="step-name">Done</span></div>
                      </div>
                    </div>

                    <hr className="details-divider" />

                    <div className="details-row">
                      <span>Estimated Cost:</span>
                      <span className="details-cost-val">
                        {selectedBooking.cost > 0 ? `${selectedBooking.cost.toLocaleString('en-US')} VND` : 'Inspect pending'}
                      </span>
                    </div>

                    <div className="details-row-vertical">
                      <span>Customer Fault Report:</span>
                      <p className="details-issue-text">{selectedBooking.issueDescription}</p>
                    </div>

                    <div className="details-row-vertical">
                      <span>Technician Notes:</span>
                      <p className="details-notes-text">{selectedBooking.notes || 'No notes added yet.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {viewingUser && subTab === 'users' && (
        <div className="modal-backdrop" onClick={() => setViewingUser(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Registration Details</h3>
              <button className="close-btn" onClick={() => setViewingUser(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="user-profile-summary">
                 <img src={getAvatarUrl(viewingUser.avatar, viewingUser.username)} alt={viewingUser.username} className="modal-avatar" />
                <div className="profile-details-wrap">
                  <h4>{viewingUser.username}</h4>
                  <span className={`user-role-tag role-${viewingUser.role}`}>{viewingUser.role.toUpperCase()}</span>
                </div>
              </div>
              <hr className="modal-divider" />
              <div className="modal-info-grid">
                <div className="info-item"><strong>Account ID:</strong> <span>{viewingUser.id}</span></div>
                <div className="info-item"><strong>Email Address:</strong> <span>{viewingUser.email}</span></div>
                <div className="info-item"><strong>Phone Contact:</strong> <span>{viewingUser.phone || 'N/A'}</span></div>
                <div className="info-item"><strong>Joined System:</strong> <span>{new Date(viewingUser.createdAt).toLocaleString('en-US')}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setViewingUser(null)}>Close</button>
              {viewingUser.id !== user.id && viewingUser.role !== 'admin' && (
                <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm("Are you sure?")) handleDeleteUser(viewingUser.id); }} style={{ background: '#ef4444', color: '#fff' }}>
                  Delete Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {showAvatarModal && (
        <div className="modal-backdrop" onClick={() => setShowAvatarModal(false)} style={{ zIndex: 9999 }}>
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
                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>ĐƯỜNG DẪN ẢNH ĐẠI DIỆN (URL)</label>
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
                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>HOẶC CHỌN ẢNH CÓ SẴN (PRESETS)</label>
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
    </div>
  );
};

export default AdminDashboard;

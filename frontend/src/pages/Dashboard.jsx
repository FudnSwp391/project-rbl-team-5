import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { 
  LayoutDashboard, ShoppingBag, Calendar, MessageSquare, Plus, Trash2, 
  Send, Users, Tag,
  Sun, Moon, Eye, Search, Bell, Settings, HelpCircle, LogOut,
  MapPin, CreditCard, Pencil, Shield, ArrowLeft
} from 'lucide-react';
import './Dashboard.css';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const Dashboard = ({ setActivePage, theme, setTheme }) => {
  const { user, token } = useAuth();
  
  // Dashboard Sub-navigation tabs
  // Admin tabs: 'stats', 'bookings', 'products', 'users', 'customers'
  // Technician tabs: 'repairs', 'chat'
  // Customer tabs: 'overview', 'bookings', 'orders', 'chat'
  const [subTab, setSubTab] = useState('');

  // --- TIME RANGE STATE ---
  const [timeRange, setTimeRange] = useState('1Y'); // '7D', '30D', '1Y'

  // --- VIEW USER MODAL STATE ---
  const [viewingUser, setViewingUser] = useState(null);
  
  // Set default tab based on user role
  useEffect(() => {  
    if (user) {
      if (user.role === 'admin') setSubTab('stats'); // eslint-disable-line react-hooks/set-state-in-effect
      else if (user.role === 'technician') setSubTab('repairs');  
      else setSubTab('overview');  
    }
  }, [user]);

  // --- DATA STATES ---
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [techsList, setTechsList] = useState([]);
  const [, setLoading] = useState(true);
  const fetchConversationsListRef = useRef(null);

  // --- SELLER HOMEPAGE STATES ---
  const [estimatedValue, setEstimatedValue] = useState(null);
  const [valuationName, setValuationName] = useState('');
  const [valuationCondition, setValuationCondition] = useState('Grade A (Like New)');
  const [valuationCapacity, setValuationCapacity] = useState('128 GB');
  const [promoCodes, setPromoCodes] = useState([
    { code: 'CIGHENTER24', discount: '12', expiry: '15/06', status: 'active' },
    { code: 'TECHREVIEW', discount: '10', expiry: 'Hết hạn', status: 'expired' }
  ]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [newPromoActive, setNewPromoActive] = useState(true);
  const [newPromoExpiry, setNewPromoExpiry] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const fileInputRef = useRef(null);

  // --- FORM STATES FOR ADMIN PRODUCTS ---
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('AirConditioner');
  const [newProdCondition, setNewProdCondition] = useState('excellent');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [productSuccess, setProductSuccess] = useState('');

  // --- CHAT SYSTEM STATES ---
  const [chatConversations, setChatConversations] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // Fetch Dashboard Data helper
  const fetchData = async () => {
    if (!user || !token) return;
    setLoading(true);

    try {
      // 1. Fetch Bookings (All users need this, server filters automatically)
      const resBookings = await fetch(`${API_BASE}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataBookings = await resBookings.json();
      if (Array.isArray(dataBookings)) setBookingsList(dataBookings);
      else setBookingsList([]);

      // 2. Role specific fetches
      if (user.role === 'admin') {
        // Fetch stats
        const resStats = await fetch(`${API_BASE}/api/users/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataStats = await resStats.json();
        if (resStats.ok) setStats(dataStats);

        // Fetch users list
        const resUsers = await fetch(`${API_BASE}/api/users/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataUsers = await resUsers.json();
        if (Array.isArray(dataUsers)) setUsersList(dataUsers);
        else setUsersList([]);

        // Fetch all products
        const resProducts = await fetch(`${API_BASE}/api/products`);
        const dataProducts = await resProducts.json();
        if (Array.isArray(dataProducts)) setProductsList(dataProducts);
        else setProductsList([]);

        // Fetch technician list (for assignment dropdown)
        const resTechs = await fetch(`${API_BASE}/api/users/technicians`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataTechs = await resTechs.json();
        if (Array.isArray(dataTechs)) setTechsList(dataTechs);
        else setTechsList([]);

        // Fetch all orders for admin too (needed for customer lists)
        const resOrders = await fetch(`${API_BASE}/api/orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataOrders = await resOrders.json();
        if (Array.isArray(dataOrders)) setOrdersList(dataOrders);
        else setOrdersList([]);
      } 
      
      if (user.role === 'customer') {
        // Fetch customer orders
        const resOrders = await fetch(`${API_BASE}/api/orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataOrders = await resOrders.json();
        if (Array.isArray(dataOrders)) setOrdersList(dataOrders);
        else setOrdersList([]);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [user, token, subTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- WEBSOCKET CHAT LOGIC ---
  useEffect(() => {
    if (!user) return;
    // Create socket connection
    socketRef.current = io(`${API_BASE}`);
    
    // Register user ID
    socketRef.current.emit('registerUser', user.id);

    // Receive message
    socketRef.current.on('receiveMessage', (message) => {
      // Append if it belongs to selected conversation
      if (selectedBooking && message.bookingId === selectedBooking.id) {
        setChatMessages(prev => [...prev, message]);
      }
      
      // Update sidebar chat status immediately
      if (fetchConversationsListRef.current) fetchConversationsListRef.current();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user, selectedBooking]);

  // Auto Scroll Chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchConversationsList = useCallback(() => {
    // A customer or technician's chat conversations are derived from their repair bookings
    // Customer can talk about any booking. Technician can talk about bookings assigned to them.
    if (bookingsList.length === 0) return;
    const chats = bookingsList.filter(b => b.status !== 'pending'); // Can only chat once technician is assigned
    setChatConversations(chats);
  }, [bookingsList]);

  // Keep a ref to fetchConversationsList so the socket effect can call it without re-registering listeners
  useEffect(() => {
    fetchConversationsListRef.current = fetchConversationsList;
  }, [fetchConversationsList]);

  useEffect(() => {
    fetchConversationsList(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchConversationsList]);

  const handleSelectConversation = (booking) => {
    setSelectedBooking(booking);
    setChatMessages([]);

    // Join socket room
    if (socketRef.current) {
      socketRef.current.emit('joinBookingRoom', booking.id);
    }

    // Fetch history from DB
    fetch(`${API_BASE}/api/messages/${booking.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setChatMessages(data);
      })
      .catch(err => console.error('Lỗi tải lịch sử chat:', err));
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedBooking) return;

    const receiverId = user.role === 'customer' 
      ? selectedBooking.technicianId 
      : selectedBooking.customerId;

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

  // --- ADMIN ACTIONS ---
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
      alert('Không thể phân công.');
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

  // --- TECHNICIAN ACTIONS ---
  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        alert(`Đã cập nhật trạng thái sửa chữa: ${status}`);
        fetchData();
      }
    } catch {
      alert('Lỗi cập nhật trạng thái.');
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

  const handleDeleteUser = async (userId) => {
    if (userId === user.id) {
      alert("You cannot delete your own account.");
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

  const handleEstimateValue = (e) => {
    e.preventDefault();
    if (!valuationName.trim()) {
      alert(isSeller ? "Vui lòng nhập tên thiết bị." : "Please enter a device name.");
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
      alert(isSeller ? "Vui lòng nhập cả mã và tỷ lệ phần trăm giảm giá." : "Please enter both the code and the discount percentage.");
      return;
    }
    let formattedExpiry = '30/06';
    if (newPromoExpiry) {
      const parts = newPromoExpiry.split('-');
      if (parts.length === 3) {
        // parts are [YYYY, MM, DD]
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
    alert(isSeller ? `Mã khuyến mãi ${newCode.code} đã được tạo thành công!` : `Promo Code ${newCode.code} has been created successfully!`);
  };

  const handleDeletePromoCode = (codeToDelete) => {
    if (window.confirm(isSeller ? `Bạn có chắc chắn muốn xóa mã khuyến mãi ${codeToDelete}?` : `Are you sure you want to delete promo code ${codeToDelete}?`)) {
      setPromoCodes(prev => prev.filter(p => p.code !== codeToDelete));
    }
  };

  const trend = getTrendData();
  const isLargeDashboard = user && user.role === 'admin';
  const isSeller = user && user.role === 'admin' && user.email === 'seller@techcycle.vn';

  if (!user) {
    return (
      <div className="dashboard-page container text-center py-4">
        <h3>Please log in to access the dashboard.</h3>
      </div>
    );
  }

  const handleLogout = () => {
    setActivePage('home');
    window.location.reload();
  };

  return (
    <div className={`dashboard-page ${isLargeDashboard ? 'admin-dashboard-layout' : 'container'} ${isSeller ? 'seller-portal-layout' : ''} animate-fade`}>
      <div className="dashboard-grid-layout">
        {/* Sidebar Nav */}
        <aside className="dashboard-sidebar glass-panel">
          <div className="sidebar-brand-logo" onClick={() => setActivePage('home')}>
            <div className="brand-icon-box">
              <LayoutDashboard className="brand-logo-icon" size={24} />
            </div>
            <div className="brand-text-wrapper">
              <h3>TechCycle</h3>
              <span>{isSeller ? 'Seller Portal' : '#ANALYTICS HUB'}</span>
            </div>
          </div>
          
          <nav className="sidebar-nav-menu">
            {/* ADMIN & SELLER NAV */}
            {user.role === 'admin' && (
              isSeller ? (
                <>
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
                </>
              ) : (
                <>
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
                </>
              )
            )}

            {/* TECHNICIAN NAV */}
            {user.role === 'technician' && (
              <>
                <button className={`sidebar-nav-btn ${subTab === 'repairs' ? 'active' : ''}`} onClick={() => setSubTab('repairs')}>
                  <Calendar size={18} />
                  Assigned Repairs
                </button>
                <button className={`sidebar-nav-btn ${subTab === 'chat' ? 'active' : ''}`} onClick={() => setSubTab('chat')}>
                  <MessageSquare size={18} />
                  Customer Q&A
                </button>
              </>
            )}

            {/* CUSTOMER NAV */}
            {user.role === 'customer' && (
              <>
                <button className={`sidebar-nav-btn ${subTab === 'overview' ? 'active' : ''}`} onClick={() => setSubTab('overview')}>
                  <LayoutDashboard size={18} />
                  Overview
                </button>
                <button className={`sidebar-nav-btn ${subTab === 'bookings' ? 'active' : ''}`} onClick={() => setSubTab('bookings')}>
                  <Calendar size={18} />
                  Repair Status
                </button>
                <button className={`sidebar-nav-btn ${subTab === 'orders' ? 'active' : ''}`} onClick={() => setSubTab('orders')}>
                  <ShoppingBag size={18} />
                  Order History
                </button>
                <button className={`sidebar-nav-btn ${subTab === 'chat' ? 'active' : ''}`} onClick={() => setSubTab('chat')}>
                  <MessageSquare size={18} />
                  Technical Support
                </button>
              </>
            )}
          </nav>

          {user.role === 'admin' && (
            isSeller ? (
              <button className="new-report-btn seller-impact-btn" onClick={() => alert("Xuất báo cáo tác động...")}>
                Generate Impact Report
              </button>
            ) : (
              <button className="new-report-btn" onClick={() => alert("Creating a new analytics report...")}>
                <Plus size={16} /> New Report
              </button>
            )
          )}

          <div className="sidebar-bottom-nav">
            {isSeller && (
              <button className="sidebar-nav-btn bottom-btn" onClick={() => alert("Settings menu is managed by Eco Seller administration.")}>
                <Settings size={18} />
                Settings
              </button>
            )}
            <button className="sidebar-nav-btn bottom-btn" onClick={() => alert("Contact TechCycle support at support@techcycle.vn")}>
              <HelpCircle size={18} />
              {isSeller ? 'Help Center' : 'Help'}
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
          
          {/* Top Bar for Admin/Seller */}
          {isLargeDashboard && (
            <header className="dashboard-top-bar glass-panel">
              {isSeller ? (
                <h2 className="topbar-page-title">Bảng Điều Khiển</h2>
              ) : (
                <div className="topbar-search-box">
                  <Search size={18} className="search-icon" />
                  <input type="text" placeholder="Search data..." />
                </div>
              )}

              {isSeller && (
                <div className="topbar-search-box seller-search-box">
                  <Search size={18} className="search-icon" />
                  <input type="text" placeholder="Tìm kiếm sản phẩm..." />
                </div>
              )}

              <div className="topbar-actions-profile">
                <button className="topbar-action-btn theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle Light/Dark theme">
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <button className="topbar-action-btn notification" onClick={() => alert("No new notifications.")} title="Notifications">
                  <Bell size={20} />
                </button>
                
                {isSeller ? (
                  <button className="topbar-action-btn messages" onClick={() => setSubTab('chat')} title="Messages">
                    <MessageSquare size={20} />
                  </button>
                ) : (
                  <button className="topbar-action-btn settings" onClick={() => alert("Account settings are managed by your administrator.")} title="Settings">
                    <Settings size={20} />
                  </button>
                )}
                
                <div className="topbar-divider"></div>

                <div className="topbar-profile-widget">
                  <div className="profile-info">
                    <h4>{isSeller ? 'Nhân Viên Bán Hàng' : (user.username === 'admin' ? 'Admin TechCycle' : user.username)}</h4>
                    <span>{isSeller ? 'seller' : (user.username === 'admin' ? 'Administrator' : 'Eco Seller')}</span>
                  </div>
                  <img src={user.avatar} alt={user.username} className="profile-avatar-circle" />
                </div>
              </div>
            </header>
          )}

          {/* ==================================== */}
          {/* ADMIN SUB-VIEW: STATS (MOCK FIGMA)  */}
          {/* ==================================== */}
          {subTab === 'stats' && stats && (
            isSeller ? (
              <div className="seller-dashboard-view animate-fade">
                {/* 3 small stats cards */}
                <div className="seller-stats-summary-grid">
                  <div className="summary-stat-card glass-panel">
                    <div className="stat-data">
                      <span className="s-label">TỔNG DOANH THU</span>
                      <h3 className="s-val">245,890,000 VND</h3>
                      <span className="s-trend-up">+6% so với tháng trước</span>
                    </div>
                    {/* Mini bar chart */}
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
                              <>
                                <tr>
                                  <td className="prod-cell">
                                    <img src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=80" alt="iPhone 14 Pro" className="mini-prod-thumb" />
                                    <strong>iPhone 14 Pro (Refurbished)</strong>
                                  </td>
                                  <td>Điện thoại</td>
                                  <td>12 chiếc</td>
                                  <td>18,500,000 VND</td>
                                  <td><span className="badge badge-completed">Còn hàng</span></td>
                                  <td>
                                    <button className="table-edit-btn" onClick={() => alert("Chỉnh sửa thiết bị...")}>✏️</button>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="prod-cell">
                                    <img src="https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=80" alt="Macbook Air M1" className="mini-prod-thumb" />
                                    <strong>Macbook Air M1 (Used)</strong>
                                  </td>
                                  <td>Laptop</td>
                                  <td>03 chiếc</td>
                                  <td>14,200,000 VND</td>
                                  <td><span className="badge badge-completed">Còn hàng</span></td>
                                  <td>
                                    <button className="table-edit-btn" onClick={() => alert("Chỉnh sửa thiết bị...")}>✏️</button>
                                  </td>
                                </tr>
                              </>
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
                      <h3>Đơn Hàng Gần Đây</h3>
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

                    {/* Impact Report */}
                    <div className="stats-card-widget green-impact-card" style={{ background: 'linear-gradient(135deg, #006D44, #0F5B3F)', color: '#fff', padding: '24px', borderRadius: '20px' }}>
                      <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>Báo Cáo Tác Động</h3>
                      <p style={{ margin: '8px 0 16px 0', fontSize: '0.85rem', opacity: 0.9 }}>Bạn đã giúp tái chế được 18kg rác thải điện tử trong tháng này.</p>
                      <div className="progress-impact-bar">
                        <div className="bar-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                          <span>Hành trình xanh</span>
                          <span>82%</span>
                        </div>
                        <div className="impact-bar-track" style={{ background: 'rgba(255,255,255,0.2)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div className="impact-bar-fill" style={{ width: '82%', background: '#fff', height: '100%' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Promo Codes */}
                    <div className="stats-card-widget glass-panel promo-codes-widget">
                      <div className="widget-header-row" style={{ marginBottom: '12px' }}>
                        <h3>Mã Khuyến Mãi</h3>
                        <span className="toggle-icon">▼</span>
                      </div>
                      <div className="promos-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {promoCodes.map((p, idx) => (
                          <div key={idx} className="promo-code-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--neutral-lightest)', borderRadius: '8px', border: '1px solid var(--border-color)', opacity: p.status === 'active' ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="code-text" style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.9rem', color: p.status === 'active' ? '#006D44' : 'var(--neutral-medium)' }}>{p.code}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', marginTop: '2px' }}>
                                {p.status === 'active' ? `Giảm ${p.discount}% - Hết hạn: ${p.expiry || '15/06'}` : 'Hết hạn'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {p.status === 'active' ? (
                                <button className="copy-code-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }} onClick={() => { navigator.clipboard.writeText(p.code); alert(`Đã sao chép mã ${p.code}!`); }} title="Sao chép">📋</button>
                              ) : (
                                <span style={{ fontSize: '1.2rem' }} title="Hết hạn">⏰</span>
                              )}
                              <button className="delete-code-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', color: '#ef4444' }} onClick={() => handleDeletePromoCode(p.code)} title="Xóa mã">🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Promo Code Creation */}
                    <div className="stats-card-widget glass-panel create-promo-widget">
                      <h3>Tạo Mã Nhanh</h3>
                      <form onSubmit={handleCreatePromoCode} className="quick-code-form" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label-sm">Mã</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm" 
                            placeholder="TECH2024"
                            value={newPromoCode}
                            onChange={e => setNewPromoCode(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label-sm">% giảm giá</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm" 
                            placeholder="10"
                            value={newPromoDiscount}
                            onChange={e => setNewPromoDiscount(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label-sm">Hạn sử dụng</label>
                          <input 
                            type="date" 
                            className="form-control form-control-sm" 
                            value={newPromoExpiry}
                            onChange={e => setNewPromoExpiry(e.target.value)}
                          />
                        </div>
                        <div className="form-group-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label-sm" style={{ marginBottom: 0 }}>Trạng thái hoạt động</label>
                          <label className="switch-container">
                            <input 
                              type="checkbox" 
                              checked={newPromoActive}
                              onChange={e => setNewPromoActive(e.target.checked)}
                            />
                            <span className="switch-slider"></span>
                          </label>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm save-promo-btn" style={{ width: '100%', backgroundColor: '#006D44', border: 'none', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                          💾 Lưu
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="stats-view animate-fade">
                {/* Interactive Chart Dashboard Card */}
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
                      {/* Grid Lines */}
                      <line x1="40" y1="30" x2="480" y2="30" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="80" x2="480" y2="80" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="130" x2="480" y2="130" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="180" x2="480" y2="180" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
                      
                      {/* Axis Labels */}
                      <text x="15" y="34" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[0]}</text>
                      <text x="15" y="84" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[1]}</text>
                      <text x="15" y="134" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[2]}</text>
                      <text x="15" y="184" fontSize="9" fill="var(--neutral-medium)" fontWeight={600}>{trend.yAxis[3]}</text>

                      {/* Area Chart Gradient Fill */}
                      <defs>
                        <linearGradient id="chart-grad-emerald" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#006D44" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#006D44" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={trend.areaPath} fill="url(#chart-grad-emerald)" />

                      {/* Smooth Line Chart path */}
                      <path 
                        d={trend.linePath} 
                        fill="none" 
                        stroke="#006D44" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Mock indicator points on line chart */}
                      {trend.dots.map((dot, idx) => (
                        <circle key={idx} cx={dot.cx} cy={dot.cy} r="4.5" fill="#006D44" stroke="var(--white)" strokeWidth="2.5" />
                      ))}

                      {/* X labels */}
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

                {/* Bottom Layout Widgets Row */}
                <div className="bottom-widgets-grid-layout">
                  {/* 1. Service Analysis Card */}
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

                  {/* 2. Recent Transactions Card */}
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
            )
          )}

          {/* ======================================= */}
          {/* ADMIN SUB-VIEW: BOOKING / REPAIR DISPATCH */}
          {/* ======================================= */}
          {subTab === 'bookings' && user.role === 'admin' && (
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

          {/* ================================== */}
          {/* ADMIN SUB-VIEW: PRODUCTS MANAGER */}
          {/* ================================== */}
          {subTab === 'products' && user.role === 'admin' && (
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
                          <button 
                            className="delete-item-btn"
                            onClick={() => handleDeleteProduct(prod.id)}
                            title="Remove listing from marketplace"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================== */}
          {/* ADMIN SUB-VIEW: USERS MANAGEMENT */}
          {/* ================================== */}
          {subTab === 'users' && user.role === 'admin' && (
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
                            <img src={u.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.username}`} alt={u.username} className="tbl-avatar-circle" />
                            <strong>{u.username}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || 'N/A'}</td>
                        <td>
                          <span className={`user-role-tag role-${u.role}`}>{u.role.toUpperCase()}</span>
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
                            {u.id !== user.id && (
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

          {/* ================================== */}
          {/* SHARED SUB-VIEW: CUSTOMERS LIST */}
          {/* ================================== */}
          {subTab === 'customers' && (user.role === 'admin' || user.role === 'seller') && (
            viewingUser ? (
              <div className="customer-detail-view animate-fade">
                <div className="detail-header-row">
                  <button className="back-to-list-btn" onClick={() => setViewingUser(null)}>
                    <ArrowLeft size={16} /> Back to List
                  </button>
                  <h2>Chi tiết Khách hàng</h2>
                </div>

                <div className="row g-4 mb-4 profile-info-row">
                  {/* Left Column: Profile Card */}
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
                        <button className="btn btn-primary btn-sm btn-edit-profile" onClick={() => alert("Profile editing feature is managed by general user control panel.")}>
                          <Pencil size={14} /> Edit Profile
                        </button>
                        <button className="btn btn-outline btn-sm btn-send-message" onClick={() => { setSubTab('chat'); alert("Redirecting to Customer Q&A chat..."); }}>
                          <MessageSquare size={14} /> Send Message
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Personal Info Card */}
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

                {/* Middle Row: Addresses */}
                <div className="row g-4 mb-4 addresses-row">
                  {/* Shipping Address */}
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
                      <div className="address-card-footer mt-auto">
                        <span className="address-action-link" onClick={() => alert("Manage addresses is disabled.")}>MANAGE ADDRESS</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
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
                      <div className="address-card-footer mt-auto">
                        <span className="address-action-link" onClick={() => alert("Manage billing details is disabled.")}>MANAGE BILLING</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Order History */}
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
                          // Fallback High Fidelity Mock Orders
                          <>
                            <tr>
                              <td className="green-text font-bold">#ORD-5521</td>
                              <td>Solar-Powered Power Bank X1</td>
                              <td>12 May, 2024</td>
                              <td>
                                <span className="price-vnd-formatted">
                                  5,450,000<span className="price-vnd-label"> VND</span>
                                </span>
                              </td>
                              <td>
                                <span className="status-delivery-tag completed">DELIVERED</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="green-text font-bold">#ORD-5402</td>
                              <td>Bamboo Mechanical Keyboard</td>
                              <td>05 Apr, 2024</td>
                              <td>
                                <span className="price-vnd-formatted">
                                  2,250,000<span className="price-vnd-label"> VND</span>
                                </span>
                              </td>
                              <td>
                                <span className="status-delivery-tag completed">DELIVERED</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="green-text font-bold">#ORD-5211</td>
                              <td>Recycled Carbon Laptop Case</td>
                              <td>18 Jan, 2024</td>
                              <td>
                                <span className="price-vnd-formatted">
                                  1,650,000<span className="price-vnd-label"> VND</span>
                                </span>
                              </td>
                              <td>
                                <span className="status-delivery-tag completed">DELIVERED</span>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Grid: Repair History and Data Management */}
                <div className="row g-4 bottom-details-row">
                  {/* Repair History */}
                  <div className="col-lg-7">
                    <div className="repair-history-widget glass-panel h-100">
                      <div className="repair-history-header d-flex align-items-center gap-2 mb-3">
                        <Calendar size={16} className="header-icon" />
                        <h3 className="m-0">Repair History</h3>
                      </div>
                      <div className="repair-history-list d-flex flex-column gap-3">
                        {bookingsList.filter(b => b.customerId === viewingUser.id).length > 0 ? (
                          bookingsList.filter(b => b.customerId === viewingUser.id).map((b, idx) => (
                            <div key={b.id || idx} className="repair-history-item d-flex align-items-center gap-3 p-3">
                              <div className={`device-icon-box ${idx % 2 === 0 ? 'mac' : 'phone'}`}>
                                {b.deviceType.toLowerCase().includes('mac') || b.deviceType.toLowerCase().includes('laptop') ? '💻' : '📱'}
                              </div>
                              <div className="repair-item-details flex-grow-1">
                                <h4 className="m-0 fw-bold">{b.deviceType}</h4>
                                <p className="issue-text text-muted m-0">{b.issueDescription}</p>
                                <span className="repair-date text-muted" style={{ fontSize: '0.75rem' }}>
                                  📅 {new Date(b.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="repair-item-status">
                                <span className={`badge badge-${b.status}`}>
                                  {b.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          // Fallback High Fidelity Mock Repair History
                          <>
                            <div className="repair-history-item d-flex align-items-center gap-3 p-3">
                              <div className="device-icon-box mac">💻</div>
                              <div className="repair-item-details flex-grow-1">
                                <h4 className="m-0 fw-bold">MacBook Pro 14" (2023)</h4>
                                <p className="issue-text text-muted m-0">Battery degradation - Replacement needed</p>
                                <span className="repair-date text-muted" style={{ fontSize: '0.75rem' }}>📅 May 15, 2024</span>
                              </div>
                              <div className="repair-item-status">
                                <span className="badge badge-inspecting">INSPECTING</span>
                              </div>
                            </div>
                            <div className="repair-history-item d-flex align-items-center gap-3 p-3">
                              <div className="device-icon-box phone">📱</div>
                              <div className="repair-item-details flex-grow-1">
                                <h4 className="m-0 fw-bold">iPhone 13 Green</h4>
                                <p className="issue-text text-muted m-0">Screen crack - 120Hz OLED replacement</p>
                                <span className="repair-date text-muted" style={{ fontSize: '0.75rem' }}>📅 Jan 10, 2024</span>
                              </div>
                              <div className="repair-item-status">
                                <span className="badge badge-completed">COMPLETED</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Data Management */}
                  <div className="col-lg-5">
                    <div className="data-management-widget glass-panel h-100">
                      <div className="data-management-header d-flex align-items-center gap-2 mb-3">
                        <Shield size={16} className="red-text header-icon" />
                        <h3 className="m-0">Data Management</h3>
                      </div>
                      <div className="data-management-body d-flex flex-column gap-3">
                        <p className="desc-text text-muted m-0">
                          Manage customer privacy and data settings. Permanent removal of account data is irreversible and will erase all order history and repair records associated with this account.
                        </p>
                        
                        <div className="warning-box-container p-3 rounded">
                          <p className="warning-message text-danger fw-semibold m-0" style={{ fontSize: '0.8rem' }}>
                            Personal information will be removed. Transaction data will be anonymized for historical reports only. Action cannot be undone.
                          </p>
                        </div>

                        <button className="btn btn-danger btn-delete-data w-100" onClick={() => {
                          if (window.confirm("Are you sure you want to permanently delete this customer information? This action is irreversible.")) {
                            handleDeleteUser(viewingUser.id);
                          }
                        }}>
                          <Trash2 size={16} /> Delete Customer Information
                        </button>
                      </div>
                    </div>
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
                                <img src={c.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.username}`} alt={c.username} className="tbl-avatar-circle" />
                                <strong>{c.username}</strong>
                              </div>
                            </td>
                            <td>{c.email}</td>
                            <td>{c.phone || 'N/A'}</td>
                            <td>{new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td>
                              <span className="count-badge green">{bookingsCount} bookings</span>
                            </td>
                            <td>
                              <span className="count-badge blue">{ordersCount} orders</span>
                            </td>
                          </tr>
                        );
                      })}
                      {usersList.filter(u => u.role === 'customer').length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No customers registered yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ======================================= */}
          {/* TECHNICIAN SUB-VIEW: REPAIR ASSIGNMENTS */}
          {/* ======================================= */}
          {subTab === 'repairs' && user.role === 'technician' && (
            <div className="technician-repairs animate-fade">
              <h2>Technician Repair Schedule</h2>
              <p className="view-desc">Inspect designated malfunctioning appliances, diagnose repair costs, and report progress to customers.</p>

              <div className="bookings-cards-grid">
                {bookingsList.length === 0 ? (
                  <div className="glass-panel text-center py-4">No repair jobs assigned to you currently.</div>
                ) : (
                  bookingsList.map(bk => (
                    <div key={bk.id} className="repair-card glass-panel">
                      <div className="card-top-row">
                        <span className={`badge badge-${bk.status}`}>
                          {getStatusLabel(bk.status)}
                        </span>
                        <span className="booking-id-tag">#{bk.id}</span>
                      </div>
                      
                      <hr />

                      <div className="card-body">
                        <h4>{bk.deviceType}</h4>
                        <p className="card-issue"><strong>Malfunction reported:</strong> {bk.issueDescription}</p>
                        
                        <div className="card-details-row">
                          <div>
                            <span className="card-meta-lbl">Customer:</span>
                            <p><strong>{bk.customerName}</strong> ({bk.customerPhone})</p>
                          </div>
                          <div>
                            <span className="card-meta-lbl">Preferred Date:</span>
                            <p>{bk.preferredDate} ({bk.preferredTime})</p>
                          </div>
                        </div>

                        {bk.cost > 0 && (
                          <div className="card-cost-banner">
                            Estimated Cost: <strong>{bk.cost.toLocaleString('en-US')} VND</strong>
                          </div>
                        )}

                        {bk.notes && (
                          <div className="card-notes-banner">
                            <strong>Technician Notes:</strong> {bk.notes}
                          </div>
                        )}
                      </div>

                      <div className="card-actions">
                        <div className="status-selector-wrap">
                          <span>Set status:</span>
                          <select 
                            className="form-control inline-select"
                            value={bk.status}
                            onChange={(e) => handleUpdateBookingStatus(bk.id, e.target.value)}
                          >
                            <option value="assigned">Assigned</option>
                            <option value="inspecting">Inspecting</option>
                            <option value="repairing">Repairing</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setSubTab('chat');
                            handleSelectConversation(bk);
                          }}
                        >
                          <MessageSquare size={16} />
                          Chat with Customer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* CUSTOMER SUB-VIEW: OVERVIEW SUMMARY */}
          {/* ======================================= */}
          {subTab === 'overview' && user.role === 'customer' && (
            <div className="customer-overview animate-fade">
              <h2>Welcome back, {user.username}!</h2>
              <p className="view-desc">Track active appliance diagnostic requests and second-hand shop purchases.</p>

              <div className="customer-overview-panels">
                {/* Bookings shortcut list */}
                <div className="overview-subpanel glass-panel">
                  <div className="panel-header">
                    <h3>Active Repairs</h3>
                    <button className="btn btn-text" onClick={() => setSubTab('bookings')}>View All</button>
                  </div>
                  <div className="panel-body-list">
                    {bookingsList.slice(0, 2).map(bk => (
                      <div key={bk.id} className="mini-item">
                        <div className="mini-info">
                          <h4>{bk.deviceType}</h4>
                          <span className={`badge badge-${bk.status}`}>{getStatusLabel(bk.status)}</span>
                        </div>
                        <p>{bk.preferredDate}</p>
                      </div>
                    ))}
                    {bookingsList.length === 0 && <p className="empty-text">No active repair tickets found.</p>}
                  </div>
                </div>

                {/* Orders shortcut list */}
                <div className="overview-subpanel glass-panel">
                  <div className="panel-header">
                    <h3>Recent Purchases</h3>
                    <button className="btn btn-text" onClick={() => setSubTab('orders')}>View All</button>
                  </div>
                  <div className="panel-body-list">
                    {ordersList.slice(0, 2).map(ord => (
                      <div key={ord.id} className="mini-item">
                        <div className="mini-info">
                          <h4>Order {ord.invoiceNumber}</h4>
                          <span className="mini-price">{ord.totalAmount.toLocaleString('en-US')} VND</span>
                        </div>
                        <p>{new Date(ord.createdAt).toLocaleDateString('en-US')}</p>
                      </div>
                    ))}
                    {ordersList.length === 0 && <p className="empty-text">You haven't bought any items yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* CUSTOMER SUB-VIEW: BOOKING PROGRESS TRACKER */}
          {/* ======================================= */}
          {subTab === 'bookings' && user.role === 'customer' && (
            <div className="customer-bookings animate-fade">
              <h2>Track Appliance Repair Status</h2>
              <p className="view-desc">Monitor hardware inspections and consult directly with your assigned technician.</p>

              <div className="bookings-cards-grid">
                {bookingsList.length === 0 ? (
                  <div className="glass-panel text-center py-4">No repair schedules registered yet.</div>
                ) : (
                  bookingsList.map(bk => (
                    <div key={bk.id} className="repair-card glass-panel">
                      <div className="card-top-row">
                        <span className={`badge badge-${bk.status}`}>
                          {getStatusLabel(bk.status)}
                        </span>
                        <span className="booking-id-tag">#{bk.id}</span>
                      </div>
                      
                      <hr />

                      <div className="card-body">
                        <h4>{bk.deviceType}</h4>
                        <p className="card-issue"><strong>Reported Fault:</strong> {bk.issueDescription}</p>
                        
                        <div className="card-details-row">
                          <div>
                            <span className="card-meta-lbl">Assigned Tech:</span>
                            <p><strong>{bk.technicianName}</strong></p>
                          </div>
                          <div>
                            <span className="card-meta-lbl">Scheduled Date:</span>
                            <p>{bk.preferredDate} ({bk.preferredTime})</p>
                          </div>
                        </div>

                        {bk.cost > 0 && (
                          <div className="card-cost-banner">
                            Estimated Cost: <strong>{bk.cost.toLocaleString('en-US')} VND</strong>
                          </div>
                        )}

                        {bk.notes && (
                          <div className="card-notes-banner">
                            <strong>Technician Message:</strong> {bk.notes}
                          </div>
                        )}
                      </div>

                      {bk.technicianId && (
                        <div className="card-actions">
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSubTab('chat');
                              handleSelectConversation(bk);
                            }}
                          >
                            <MessageSquare size={16} />
                            Chat with Technician
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* CUSTOMER SUB-VIEW: ORDERS HISTORY */}
          {/* ======================================= */}
          {subTab === 'orders' && user.role === 'customer' && (
            <div className="customer-orders animate-fade">
              <h2>Purchase Order History</h2>
              <p className="view-desc">Review certified devices and products purchased from the TechCycle marketplace.</p>

              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Purchase Date</th>
                      <th>Purchased Devices</th>
                      <th>Total Amount</th>
                      <th>Payment Method</th>
                      <th>Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.map(ord => (
                      <tr key={ord.id}>
                        <td><strong>{ord.invoiceNumber}</strong></td>
                        <td>{new Date(ord.createdAt).toLocaleDateString('en-US')}</td>
                        <td>
                          {ord.items.map((i, idx) => (
                            <div key={idx} className="tbl-mini-item-name">• {i.name}</div>
                          ))}
                        </td>
                        <td><strong>{ord.totalAmount.toLocaleString('en-US')} VND</strong></td>
                        <td>{ord.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}</td>
                        <td>
                          <span className={`status-delivery-tag ${ord.status}`}>
                            {ord.status === 'pending' ? 'Preparing' : ord.status === 'shipping' ? 'In Transit' : 'Delivered'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================== */}
          {/* MULTI-ROLE SUB-VIEW: REAL-TIME CHAT  */}
          {/* ====================================== */}
          {subTab === 'chat' && (
            <div className="chat-view-layout glass-panel animate-fade">
              {/* Chat Sidebar: Conversation List (Column 1) */}
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
                          {user.role === 'customer' ? `Tech: ${conv.technicianName}` : `Client: ${conv.customerName}`}
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

              {/* Chat Thread Panel (Column 2) */}
              <div className="chat-thread-panel">
                {selectedBooking ? (
                  <>
                    {/* Thread Header */}
                    <div className="thread-header">
                      <div>
                        <h4>{selectedBooking.deviceType}</h4>
                        <p>#{selectedBooking.id} • {user.role === 'customer' ? `Technician: ${selectedBooking.technicianName}` : `Customer: ${selectedBooking.customerName}`}</p>
                      </div>
                    </div>

                    {/* Messages List */}
                    <div className="chat-messages-thread">
                      {chatMessages.map(msg => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`chat-message-bubble ${isMe ? 'mine' : 'theirs'}`}>
                            {!isMe && <img src={msg.senderAvatar} alt={msg.senderName} className="msg-avatar" />}
                            <div className="msg-content-wrapper">
                              {!isMe && <span className="msg-sender">{msg.senderName}</span>}
                              <div className="msg-bubble-text">{msg.text}</div>
                              <span className="msg-time">
                                {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Message input */}
                    <form onSubmit={handleSendMessage} className="chat-input-row">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Type your message here..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn btn-primary btn-send-chat">
                        <Send size={18} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="chat-placeholder text-center">
                    <MessageSquare size={48} className="placeholder-icon animate-pulse" />
                    <h3>Diagnostic Technical Support</h3>
                    <p>Select an active repair ticket from the left sidebar to start a chat session.</p>
                  </div>
                )}
              </div>

              {/* Case Details Sidebar (Column 3) */}
              {selectedBooking && (
                <div className="chat-case-details-panel">
                  <h3>Repair Ticket</h3>
                  <hr className="details-divider" />
                  <div className="details-content">
                    <div className="details-device-header">
                      <h4>{selectedBooking.deviceType}</h4>
                      <span className="details-id">#{selectedBooking.id}</span>
                    </div>
                    
                    {/* Stepper progress */}
                    <div className="details-progress-stepper">
                      <div className={`stepper-step ${['assigned', 'inspecting', 'repairing', 'completed'].includes(selectedBooking.status) ? 'active' : ''}`}>
                        <div className="step-bullet">1</div>
                        <div className="step-info">
                          <span className="step-name">Assigned</span>
                        </div>
                      </div>
                      <div className={`stepper-step ${['inspecting', 'repairing', 'completed'].includes(selectedBooking.status) ? 'active' : ''}`}>
                        <div className="step-bullet">2</div>
                        <div className="step-info">
                          <span className="step-name">Inspect</span>
                        </div>
                      </div>
                      <div className={`stepper-step ${['repairing', 'completed'].includes(selectedBooking.status) ? 'active' : ''}`}>
                        <div className="step-bullet">3</div>
                        <div className="step-info">
                          <span className="step-name">Repairing</span>
                        </div>
                      </div>
                      <div className={`stepper-step ${selectedBooking.status === 'completed' ? 'active' : ''}`}>
                        <div className="step-bullet">4</div>
                        <div className="step-info">
                          <span className="step-name">Done</span>
                        </div>
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

                    {/* Technician & Admin Controls */}
                    {(user.role === 'technician' || user.role === 'admin') && (
                      <div className="details-controls-section">
                        <hr className="details-divider" />
                        <h4>Update Ticket:</h4>
                        
                        <div className="form-group-sm">
                          <label className="form-label-sm">Repair Status</label>
                          <select 
                            className="form-control form-control-sm"
                            value={selectedBooking.status}
                            onChange={(e) => {
                              handleUpdateBookingStatus(selectedBooking.id, e.target.value);
                              setSelectedBooking(prev => ({ ...prev, status: e.target.value }));
                            }}
                          >
                            <option value="assigned">Assigned</option>
                            <option value="inspecting">Inspecting</option>
                            <option value="repairing">Repairing</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <div className="form-group-sm">
                          <label className="form-label-sm">Billed Cost (VND)</label>
                          <input 
                            type="number" 
                            className="form-control form-control-sm"
                            placeholder="Charged fees..."
                            defaultValue={selectedBooking.cost || ''}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              handleUpdateBookingCostNotes(selectedBooking.id, val, selectedBooking.notes);
                              setSelectedBooking(prev => ({ ...prev, cost: val }));
                            }}
                          />
                        </div>

                        <div className="form-group-sm">
                          <label className="form-label-sm">Technician Logs</label>
                          <textarea 
                            className="form-control form-control-sm"
                            rows="2"
                            placeholder="Repair diary/plan..."
                            defaultValue={selectedBooking.notes || ''}
                            onBlur={(e) => {
                              const val = e.target.value;
                              handleUpdateBookingCostNotes(selectedBooking.id, selectedBooking.cost, val);
                              setSelectedBooking(prev => ({ ...prev, notes: val }));
                            }}
                          ></textarea>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* User Details Modal */}
      {viewingUser && subTab !== 'customers' && (
        <div className="modal-backdrop" onClick={() => setViewingUser(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Registration Details</h3>
              <button className="close-btn" onClick={() => setViewingUser(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="user-profile-summary">
                <img src={viewingUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${viewingUser.username}`} alt={viewingUser.username} className="modal-avatar" />
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
              {viewingUser.id !== user.id && (
                <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm("Are you sure?")) handleDeleteUser(viewingUser.id); }} style={{ background: '#ef4444', color: '#fff' }}>
                  Delete Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

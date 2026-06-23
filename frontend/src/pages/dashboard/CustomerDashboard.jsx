import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { 
  LayoutDashboard, ShoppingBag, Calendar, MessageSquare,
  Sun, Moon, Search, Bell, HelpCircle, LogOut, Send, Settings, Image, Paperclip
} from 'lucide-react';
import ProfileSettings from '../../components/ProfileSettings';
import { useCart } from '../../context/CartContext';
import { getProductImage } from '../../components/ProductCard';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const CustomerDashboard = ({ setActivePage, theme, setTheme, initialSubTab, setInitialSubTab }) => {
  const { user, token, getAvatarUrl, logout } = useAuth();
  const { addToCart } = useCart();
  const subTab = initialSubTab || 'overview';
  const setSubTab = setInitialSubTab;
  // --- DATA STATES ---
  const [bookingsList, setBookingsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- RESCHEDULE STATES ---
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00 AM');

  // --- CHAT SYSTEM STATES ---
  const [chatConversations, setChatConversations] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const fetchConversationsListRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const resBookings = await fetch(`${API_BASE}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataBookings = await resBookings.json();
      if (Array.isArray(dataBookings)) setBookingsList(dataBookings);
      else setBookingsList([]);

      const resOrders = await fetch(`${API_BASE}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataOrders = await resOrders.json();
      if (Array.isArray(dataOrders)) setOrdersList(dataOrders);
      else setOrdersList([]);
    } catch (err) {
      console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchData();
  }, [user, token, subTab]);

  // --- WEBSOCKET CHAT LOGIC ---
  useEffect(() => {
    if (!user) return;
    socketRef.current = io(`${API_BASE}`);
    socketRef.current.emit('registerUser', user.id);

    socketRef.current.on('receiveMessage', (message) => {
      if (selectedBooking && message.bookingId === selectedBooking.id) {
        setChatMessages(prev => [...prev, message]);
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
      .then(data => setChatMessages(data))
      .catch(err => console.error('Lỗi tải lịch sử chat:', err));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedBooking) return;

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/upload-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ images: [reader.result] })
        });
        const data = await res.json();
        if (res.ok && data.urls && data.urls.length > 0) {
          const imageUrl = data.urls[0];
          const receiverId = user.role === 'customer' 
            ? selectedBooking.technicianId 
            : selectedBooking.customerId;
          if (socketRef.current) {
            socketRef.current.emit('sendMessage', {
              senderId: user.id,
              receiverId,
              bookingId: selectedBooking.id,
              text: `[IMG]${imageUrl}`
            });
          }
        } else {
          alert('Lỗi tải ảnh lên');
        }
      } catch (err) {
        console.error('Lỗi tải ảnh:', err);
      } finally {
        setIsUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
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

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này không?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'canceled' })
      });
      if (res.ok) {
        alert('Hủy lịch hẹn thành công');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Lỗi hủy lịch hẹn');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const handleSaveReschedule = async (orderId) => {
    if (!newDate) {
      alert('Vui lòng chọn ngày hẹn mới.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentDate: newDate,
          appointmentTime: newTime
        })
      });
      if (res.ok) {
        alert('Cập nhật lịch hẹn thành công');
        setEditingOrderId(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Lỗi cập nhật lịch hẹn');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const handleReorder = (order) => {
    order.items.forEach(item => {
      addToCart({
        id: item.productId || item.id,
        name: item.name,
        price: item.price,
        image: item.image || getProductImage(item.productId || item.id),
        condition: 'good'
      });
    });
    alert('Đã thêm các sản phẩm trong đơn hủy vào giỏ hàng. Vui lòng vào giỏ hàng để đặt lại.');
  };

  const [complaintText, setComplaintText] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintText.trim()) return;
    setIsSubmittingComplaint(true);
    try {
      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: complaintText })
      });
      if (res.ok) {
        alert('Đã gửi khiếu nại thành công. Chúng tôi sẽ phản hồi sớm nhất có thể.');
        setComplaintText('');
      } else {
        alert('Lỗi gửi khiếu nại');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.hash = '#/auth';
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'pending': return 'Đang chờ';
      case 'assigned': return 'Đã phân công';
      case 'inspecting': return 'Đang kiểm tra';
      case 'repairing': return 'Đang sửa chữa';
      case 'completed': return 'Hoàn thành';
      case 'canceled': return 'Đã hủy';
      case 'cancelled': return 'Đã hủy';
      case 'reserved': return 'Đã giữ chỗ';
      case 'waiting_payment': return 'Chờ thanh toán';
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
          </nav>

          <div className="sidebar-bottom-nav">
            <button className={`sidebar-nav-btn bottom-btn ${subTab === 'settings' ? 'active' : ''}`} onClick={() => setSubTab('settings')}>
              <Settings size={18} />
              Settings
            </button>
            <button className={`sidebar-nav-btn bottom-btn ${subTab === 'help' ? 'active' : ''}`} onClick={() => setSubTab('help')}>
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
          <header className="dashboard-top-bar glass-panel" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="topbar-actions-profile">
              <button className="topbar-action-btn theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle Light/Dark theme">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button className="topbar-action-btn notification" onClick={() => alert("No new notifications.")} title="Notifications">
                <Bell size={20} />
              </button>
              
              <div className="topbar-divider"></div>

              <div className="topbar-profile-widget">
                <div className="profile-info">
                  <h4>{user.username}</h4>
                  <span>Customer</span>
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

          {!loading && subTab === 'overview' && (
            <div className="customer-overview animate-fade">
              {/* Welcome Banner */}
              <div className="cust-welcome-banner" style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
                borderRadius: '16px',
                padding: '28px 32px',
                color: '#fff',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '160px', height: '160px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-40px', right: '80px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }}></div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Xin chào, {user.username}! 👋</h2>
                <p style={{ marginTop: '6px', opacity: 0.9, fontSize: '0.92rem' }}>Theo dõi yêu cầu sửa chữa và lịch sử mua hàng của bạn tại đây.</p>
              </div>

              {/* Quick Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F59E0B' }}>{bookingsList.length}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--neutral-medium)', marginTop: '4px' }}>Yêu cầu sửa chữa</div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{ordersList.length}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--neutral-medium)', marginTop: '4px' }}>Đơn hàng đã đặt</div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6366F1' }}>{ordersList.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString('en-US')}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--neutral-medium)', marginTop: '4px' }}>Tổng chi tiêu (VND)</div>
                </div>
              </div>

              <div className="customer-overview-panels">
                {/* Bookings shortcut list */}
                <div className="overview-subpanel glass-panel">
                  <div className="panel-header">
                    <h3>🔧 Sửa chữa gần đây</h3>
                    <button className="btn btn-text" onClick={() => setSubTab('bookings')}>Xem tất cả</button>
                  </div>
                  <div className="panel-body-list">
                    {bookingsList.slice(0, 3).map(bk => (
                      <div key={bk.id} className="mini-item">
                        <div className="mini-info">
                          <h4>{bk.device_type || bk.deviceType || 'Thiết bị'}</h4>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge badge-${bk.status}`}>{getStatusLabel(bk.status)}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--neutral-medium)' }}>🛠 {bk.technicianName || 'Chưa phân công'}</span>
                          </div>
                        </div>
                        <p>{bk.preferred_date || bk.preferredDate || ''}</p>
                      </div>
                    ))}
                    {bookingsList.length === 0 && <p className="empty-text">Chưa có yêu cầu sửa chữa nào.</p>}
                  </div>
                </div>

                {/* Orders shortcut list */}
                <div className="overview-subpanel glass-panel">
                  <div className="panel-header">
                    <h3>🛒 Đơn hàng gần đây</h3>
                    <button className="btn btn-text" onClick={() => setSubTab('orders')}>Xem tất cả</button>
                  </div>
                  <div className="panel-body-list">
                    {ordersList.slice(0, 3).map(ord => (
                      <div key={ord.id} className="mini-item">
                        <div className="mini-info">
                          <h4>Đơn {ord.invoiceNumber}</h4>
                          <span className="mini-price">{ord.totalAmount.toLocaleString('en-US')} VND</span>
                        </div>
                        <p>{new Date(ord.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    ))}
                    {ordersList.length === 0 && <p className="empty-text">Bạn chưa mua sản phẩm nào.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'bookings' && (
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

          {!loading && subTab === 'orders' && (
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
                      <th>Trạng thái lịch hẹn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.map(ord => (
                      <tr key={ord.id}>
                        <td>
                          <strong>{ord.invoiceNumber}</strong>
                          {ord.appointmentInfo?.appointmentDate && (
                            <div className="tbl-subtext" style={{ fontSize: '0.78rem', color: 'var(--neutral-medium)', marginTop: '4px' }}>
                              Hẹn: {ord.appointmentInfo.appointmentDate} ({ord.appointmentInfo.appointmentTime})
                            </div>
                          )}
                        </td>
                        <td>{new Date(ord.createdAt).toLocaleDateString('en-US')}</td>
                        <td>
                          {ord.items.map((i, idx) => (
                            <div key={idx} className="tbl-mini-item-name">• {i.name}</div>
                          ))}
                        </td>
                        <td><strong>{ord.totalAmount.toLocaleString('en-US')} VND</strong></td>
                        <td>{ord.paymentMethod === 'cod' ? 'Thanh toán tại cửa hàng (COD)' : ord.paymentMethod === 'vnpay' ? 'Thanh toán qua VNPay' : 'Chuyển khoản'}</td>
                        <td>
                          <span className={`status-delivery-tag ${ord.status}`}>
                            {ord.status === 'pending' ? 'Đang chờ' : ord.status === 'reserved' ? 'Đã hẹn (Đang giữ máy)' : ord.status === 'waiting_payment' ? 'Chờ thanh toán (Đang giữ máy)' : ord.status === 'completed' ? 'Thành công (Đã mua)' : ord.status === 'canceled' || ord.status === 'cancelled' ? 'Đã hủy' : ord.status}
                          </span>
                          
                          {editingOrderId === ord.id ? (
                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '200px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)' }}>Chọn ngày hẹn mới:</label>
                              <input 
                                type="date" 
                                value={newDate} 
                                onChange={e => setNewDate(e.target.value)} 
                                className="form-control" 
                                style={{ fontSize: '0.8rem', padding: '4px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
                              />
                              <label style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)' }}>Chọn giờ hẹn:</label>
                              <select 
                                value={newTime} 
                                onChange={e => setNewTime(e.target.value)} 
                                className="form-control" 
                                style={{ fontSize: '0.8rem', padding: '4px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                              >
                                <option value="09:00 AM">09:00 AM</option>
                                <option value="10:00 AM">10:00 AM</option>
                                <option value="11:00 AM">11:00 AM</option>
                                <option value="02:00 PM">02:00 PM</option>
                                <option value="03:00 PM">03:00 PM</option>
                                <option value="04:00 PM">04:00 PM</option>
                                <option value="05:00 PM">05:00 PM</option>
                              </select>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => handleSaveReschedule(ord.id)}>Lưu</button>
                                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => setEditingOrderId(null)}>Hủy</button>
                              </div>
                            </div>
                          ) : (
                            (ord.status === 'pending' || ord.status === 'reserved' || ord.status === 'waiting_payment') && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                <button 
                                  className="btn btn-outline btn-sm" 
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)', display: 'block', width: '100%', textAlign: 'center' }} 
                                  onClick={() => {
                                    setEditingOrderId(ord.id);
                                    setNewDate(ord.appointmentInfo?.appointmentDate || '');
                                    setNewTime(ord.appointmentInfo?.appointmentTime || '09:00 AM');
                                  }}
                                >
                                  Đổi lịch hẹn
                                </button>
                                <button 
                                  className="btn btn-outline btn-sm" 
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: '#ff6b6b', color: '#ff6b6b', display: 'block', width: '100%', textAlign: 'center' }} 
                                  onClick={() => handleCancelOrder(ord.id)}
                                >
                                  Hủy đơn hàng
                                </button>
                              </div>
                            )
                          )}
                          
                          {ord.status === 'canceled' && (
                            <button className="btn btn-primary btn-sm" style={{marginTop: '8px', display: 'block', padding: '4px 8px', fontSize: '0.8rem'}} onClick={() => handleReorder(ord)}>
                              Đặt lại
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                          Tech: {conv.technicianName}
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
                        <p>#{selectedBooking.id} • Technician: {selectedBooking.technicianName}</p>
                      </div>
                    </div>

                    <div className="chat-messages-thread">
                      {chatMessages.map(msg => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`chat-message-bubble ${isMe ? 'mine' : 'theirs'}`}>
                             {!isMe && <img src={getAvatarUrl(msg.senderAvatar, msg.senderName)} alt={msg.senderName} className="msg-avatar" />}
                            <div className="msg-bubble-content">
                              {!isMe && <span className="sender-name">{msg.senderName}</span>}
                              {msg.text && msg.text.startsWith('[IMG]') ? (
                                <img src={msg.text.replace('[IMG]', '')} alt="attachment" className="chat-image-attachment" onClick={() => window.open(msg.text.replace('[IMG]', ''), '_blank')} />
                              ) : (
                                <p className="msg-text">{msg.text}</p>
                              )}
                              <span className="msg-time">{new Date(msg.createdAt || msg.timestamp || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleSendMessage}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleImageUpload}
                      />
                      <button 
                        type="button" 
                        className="chat-attach-btn" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                      >
                        <Paperclip size={18} />
                      </button>
                      <input 
                        type="text" 
                        placeholder={isUploadingImage ? "Đang tải ảnh lên..." : "Type your message..."}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        disabled={isUploadingImage}
                      />
                      <button type="submit" className="chat-send-btn" disabled={isUploadingImage}>
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
                        {selectedBooking.cost > 0 ? `${selectedBooking.cost.toLocaleString('en-US')} VND` : 'Chờ kiểm tra báo giá'}
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

          {!loading && subTab === 'help' && (
            <div className="customer-settings animate-fade glass-panel" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
              <h2>Trợ Giúp & Khiếu Nại</h2>
              <p className="view-desc" style={{ marginBottom: '20px' }}>Gặp vấn đề với thiết bị hoặc đơn hàng? Hãy gửi khiếu nại hoặc yêu cầu hỗ trợ, chúng tôi sẽ xử lý ngay lập tức.</p>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nội dung khiếu nại</label>
                <textarea 
                  className="form-control" 
                  rows="6" 
                  placeholder="Mô tả chi tiết vấn đề của bạn (ví dụ: hàng nhận bị lỗi, nhân viên hỗ trợ chậm...)"
                  value={complaintText}
                  onChange={e => setComplaintText(e.target.value)}
                  style={{ width: '100%', padding: '15px', borderRadius: '8px', backgroundColor: 'var(--neutral-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', resize: 'vertical' }}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitComplaint} 
                disabled={isSubmittingComplaint || !complaintText.trim()}
              >
                {isSubmittingComplaint ? 'Đang gửi...' : 'Gửi Khiếu Nại'}
              </button>
            </div>
          )}

          {!loading && subTab === 'settings' && (
            <div className="settings-view animate-fade container py-4">
              <ProfileSettings />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CustomerDashboard;

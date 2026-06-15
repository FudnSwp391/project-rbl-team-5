import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { 
  LayoutDashboard, ShoppingBag, Calendar, MessageSquare,
  Sun, Moon, Search, Bell, HelpCircle, LogOut, Send
} from 'lucide-react';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const CustomerDashboard = ({ setActivePage, theme, setTheme, initialSubTab, setInitialSubTab }) => {
  const { user, token } = useAuth();
  const subTab = initialSubTab || 'overview';
  const setSubTab = setInitialSubTab;

  // --- DATA STATES ---
  const [bookingsList, setBookingsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = () => {
    setActivePage('home');
    window.location.reload();
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
    <div className="dashboard-page container animate-fade">
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

          {!loading && subTab === 'overview' && (
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
                            {!isMe && <img src={msg.senderAvatar} alt={msg.senderName} className="msg-avatar" />}
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
    </div>
  );
};

export default CustomerDashboard;

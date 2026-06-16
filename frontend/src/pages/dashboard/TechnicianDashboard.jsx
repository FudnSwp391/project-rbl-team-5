import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import ProfileSettings from '../../components/ProfileSettings';
import { 
  LayoutDashboard, ShoppingBag, MessageSquare, Plus,
  Sun, Moon, Search, Bell, Settings, HelpCircle, LogOut,
  CreditCard, Pencil, Wrench, Package, Send
} from 'lucide-react';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

const TechnicianDashboard = ({ setActivePage, theme, setTheme, initialSubTab, setInitialSubTab }) => {
  const { user, token, updateAvatar, getAvatarUrl, logout } = useAuth();
  const subTab = initialSubTab || 'overview';
  const setSubTab = setInitialSubTab;
  const [selectedCalDay, setSelectedCalDay] = useState(15);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // --- DATA STATES ---
  const [bookingsList, setBookingsList] = useState([]);
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
    logout();
    setActivePage('home');
  };

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

  const completedRepairs = bookingsList.filter(b => b.status === 'completed');
  const totalEarnings = 4820000 + completedRepairs.reduce((sum, b) => sum + (b.cost || 0), 0);
  const repairsDoneCount = 142 + completedRepairs.length;
  const pendingPayout = bookingsList.filter(b => b.status !== 'completed' && b.status !== 'canceled' && b.cost > 0).reduce((sum, b) => sum + (b.cost || 0), 0);

  const calTasks = {
    15: [
      { id: 1, title: 'Solar Inverter Refurbish', time: '09:00 AM', loc: 'District 4 Hub', priority: 'High Priority' },
      { id: 2, title: 'Battery Storage Inspection', time: '01:30 PM', loc: 'Site Alpha', priority: 'Standard' }
    ],
    18: [
      { id: 3, title: 'Wind Turbine Calibration', time: '10:00 AM', loc: 'Site Beta', priority: 'High Priority' },
      { id: 4, title: 'Grid Sync Testing', time: '03:00 PM', loc: 'District 4 Hub', priority: 'Standard' }
    ]
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
            <button className="sidebar-nav-btn" onClick={() => setActivePage('shop')}>
              <ShoppingBag size={18} />
              Marketplace
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'repairs' ? 'active' : ''}`} onClick={() => setSubTab('repairs')}>
              <Wrench size={18} />
              Repairs
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'overview' || subTab === '' ? 'active' : ''}`} onClick={() => setSubTab('overview')}>
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'inventory' ? 'active' : ''}`} onClick={() => setSubTab('inventory')}>
              <Package size={18} />
              Inventory
            </button>
          </nav>

          <button className="new-report-btn tech-book-btn" onClick={() => setActivePage('booking')}>
            <Plus size={16} /> Book Repair
          </button>

          <div className="sidebar-bottom-nav">
            <button className={`sidebar-nav-btn bottom-btn ${subTab === 'settings' ? 'active' : ''}`} onClick={() => setSubTab('settings')}>
              <Settings size={18} />
              Settings
            </button>
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

          {!loading && subTab === 'repairs' && (
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

          {!loading && subTab === 'overview' && (
            <div className="tech-dashboard-overview animate-fade">
              <div className="tech-overview-grid">
                <div className="tech-overview-col-left">
                  {/* Profile Widget */}
                  <div className="tech-profile-card glass-panel">
                    <div className="tech-profile-flex">
                      <div 
                        className="tech-avatar-wrapper"
                        style={{ cursor: 'pointer', position: 'relative' }}
                        onClick={() => {
                          setCustomAvatarUrl(user.avatar || '');
                          setShowAvatarModal(true);
                        }}
                        title="Thay đổi ảnh đại diện"
                      >
                        <img 
                          src={getAvatarUrl(user.avatar, user.username)} 
                          alt={user.username} 
                          className="tech-large-avatar" 
                        />
                        <span className="online-indicator-dot"></span>
                        <div 
                          className="avatar-edit-badge" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            backgroundColor: '#006D44',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--border-color)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          <Pencil size={12} />
                        </div>
                      </div>
                      <div className="tech-profile-details">
                        <div className="tech-name-row">
                          <h3>{user.full_name || "Alex Rivera"}</h3>
                          <span className="tech-senior-badge">SENIOR FIELD TECH</span>
                        </div>
                        <p className="tech-bio-text">
                          Specializing in Photovoltaic Array Optimization & Carbon Capture Maintenance. Leading regional sustainability targets since 2021.
                        </p>
                        <div className="tech-certs-row">
                          <span className="tech-cert-badge check-badge">
                            <span className="check-icon">✓</span> Solar Certification L3
                          </span>
                          <span className="tech-cert-badge link-badge">
                            <span className="link-icon">🔄</span> Grid Integration Expert
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Repair Schedule Widget */}
                  <div className="tech-schedule-card glass-panel">
                    <div className="schedule-header-row">
                      <h3>Repair Schedule</h3>
                      <div className="schedule-month-nav">
                        <button className="month-nav-btn">&lt;</button>
                        <span>October 2024</span>
                        <button className="month-nav-btn">&gt;</button>
                      </div>
                    </div>

                    <div className="calendar-grid">
                      <div className="cal-day-header">MON</div>
                      <div className="cal-day-header">TUE</div>
                      <div className="cal-day-header">WED</div>
                      <div className="cal-day-header">THU</div>
                      <div className="cal-day-header">FRI</div>
                      <div className="cal-day-header">SAT</div>
                      <div className="cal-day-header">SUN</div>

                      <div className={`calendar-cell ${selectedCalDay === 14 ? 'selected' : ''}`} onClick={() => setSelectedCalDay(14)}>
                        <span className="day-number">14</span>
                      </div>
                      <div className={`calendar-cell ${selectedCalDay === 15 ? 'selected' : ''}`} onClick={() => setSelectedCalDay(15)}>
                        <span className="day-number">15</span>
                        <span className="dot-indicator green-dot"></span>
                      </div>
                      <div className={`calendar-cell ${selectedCalDay === 16 ? 'selected' : ''}`} onClick={() => setSelectedCalDay(16)}>
                        <span className="day-number">16</span>
                      </div>
                      <div className={`calendar-cell ${selectedCalDay === 17 ? 'selected' : ''}`} onClick={() => setSelectedCalDay(17)}>
                        <span className="day-number">17</span>
                      </div>
                      <div className={`calendar-cell ${selectedCalDay === 18 ? 'selected' : ''}`} onClick={() => setSelectedCalDay(18)}>
                        <span className="day-number">18</span>
                        <div className="dots-row">
                          <span className="dot-indicator yellow-dot"></span>
                          <span className="dot-indicator yellow-dot"></span>
                        </div>
                      </div>
                      <div className={`calendar-cell ${selectedCalDay === 19 ? 'selected' : ''}`} onClick={() => setSelectedCalDay(19)}>
                        <span className="day-number">19</span>
                      </div>
                      <div className={`calendar-cell ${selectedCalDay === 20 ? 'selected' : ''}`} onClick={() => setSelectedCalDay(20)}>
                        <span className="day-number">20</span>
                      </div>
                    </div>

                    <div className="schedule-agenda-section">
                      <h4>UPCOMING FOR TODAY</h4>
                      <div className="agenda-tasks-list">
                        {calTasks[selectedCalDay] ? (
                          calTasks[selectedCalDay].map(task => (
                            <div key={task.id} className={`agenda-task-card priority-${task.priority.toLowerCase().replace(' ', '-')}`}>
                              <div className="task-main-info">
                                <h5>{task.title}</h5>
                                <p>{task.time} - {task.loc}</p>
                              </div>
                              <span className={`task-priority-badge ${task.priority.toLowerCase().replace(' ', '-')}`}>
                                {task.priority}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="empty-tasks-placeholder">
                            <p>No repair tasks scheduled for this day.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tech-overview-col-right">
                  {/* Performance Score Widget */}
                  <div className="tech-performance-card glass-panel">
                    <span className="card-lbl">Performance Score</span>
                    <div className="score-main-value">
                      <h2>98.4%</h2>
                    </div>
                    <span className="score-quarter-trend">+2.4% from last quarter</span>
                    <div className="score-progress-section">
                      <div className="score-progress-labels">
                        <span>Efficiency Target</span>
                        <strong>104 / 120 hrs</strong>
                      </div>
                      <div className="score-progress-bar-bg">
                        <div className="score-progress-bar-fill" style={{ width: '86.6%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Skill Inventory Widget */}
                  <div className="tech-skills-card glass-panel">
                    <h3>Skill Inventory</h3>
                    <div className="skills-levels-list">
                      <div className="skill-level-row">
                        <div className="skill-level-labels">
                          <span>Hardware Diagnostics</span>
                          <span className="skill-level-val master">Master</span>
                        </div>
                        <div className="skill-level-progress-bg">
                          <div className="skill-level-progress-fill master-fill" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                      <div className="skill-level-row">
                        <div className="skill-level-labels">
                          <span>Firmware Patching</span>
                          <span className="skill-level-val expert">Expert</span>
                        </div>
                        <div className="skill-level-progress-bg">
                          <div className="skill-level-progress-fill expert-fill" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                      <div className="skill-level-row">
                        <div className="skill-level-labels">
                          <span>Remote Calibration</span>
                          <span className="skill-level-val proficient">Proficient</span>
                        </div>
                        <div className="skill-level-progress-bg">
                          <div className="skill-level-progress-fill proficient-fill" style={{ width: '55%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Earnings Wallet Widget */}
                  <div className="tech-wallet-card glass-panel">
                    <div className="wallet-card-header">
                      <h3>Earnings Wallet</h3>
                      <CreditCard size={18} className="wallet-header-icon" />
                    </div>
                    <div className="wallet-balance-row">
                      <h2>{totalEarnings.toLocaleString('vi-VN')} VND</h2>
                    </div>
                    <div className="wallet-mini-stats-grid">
                      <div className="wallet-mini-stat-box">
                        <span>Repairs Done</span>
                        <h3>{repairsDoneCount}</h3>
                      </div>
                      <div className="wallet-mini-stat-box">
                        <span>Pending Payout</span>
                        <h3>{pendingPayout > 0 ? `${pendingPayout.toLocaleString('vi-VN')} VND` : '0 VND'}</h3>
                      </div>
                    </div>
                    <button className="wallet-action-btn" onClick={() => alert("Earnings and payouts details vault is opened.")}>
                      View Earnings Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'inventory' && (
            <div className="tech-inventory-section animate-fade">
              <h2>Parts & Tools Inventory</h2>
              <p className="view-desc">Manage your replacement parts stock levels and tools certifications.</p>
              <div className="bookings-cards-grid">
                <div className="glass-panel p-4" style={{ width: '100%' }}>
                  <h3 className="mb-3">Spare Parts Inventory</h3>
                  <div className="table-responsive">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Part ID</th>
                          <th>Name / Description</th>
                          <th>Category</th>
                          <th>Stock Level</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>#SP-492</strong></td>
                          <td>PV Inverter Replacement Capacitor</td>
                          <td>Electrical</td>
                          <td>12 units</td>
                          <td><span className="badge badge-completed">In Stock</span></td>
                        </tr>
                        <tr>
                          <td><strong>#SP-109</strong></td>
                          <td>Lithium Cell Fuse 12V</td>
                          <td>Battery Parts</td>
                          <td>4 units</td>
                          <td><span className="badge badge-inspecting">Low Stock</span></td>
                        </tr>
                        <tr>
                          <td><strong>#SP-038</strong></td>
                          <td>Temperature Sensor Probe</td>
                          <td>Sensors</td>
                          <td>25 units</td>
                          <td><span className="badge badge-completed">In Stock</span></td>
                        </tr>
                        <tr>
                          <td><strong>#SP-882</strong></td>
                          <td>Sync Converter Logic Board</td>
                          <td>Circuits</td>
                          <td>0 units</td>
                          <td><span className="badge badge-canceled">Out of Stock</span></td>
                        </tr>
                      </tbody>
                    </table>
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
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showAvatarModal && (
        <div className="modal-backdrop active" onClick={() => setShowAvatarModal(false)} style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ width: '450px', padding: '24px', position: 'relative' }}>
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
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-color)' }}
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
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', background: 'none', color: 'var(--text-color)' }}
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

export default TechnicianDashboard;

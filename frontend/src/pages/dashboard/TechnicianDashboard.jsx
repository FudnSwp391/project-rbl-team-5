import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import useInternalChat from '../../hooks/useInternalChat';
import useNotifications from '../../hooks/useNotifications';
import InternalChatPanel from '../../components/InternalChatPanel';
import NotificationBell from '../../components/NotificationBell';
import ProfileSettings from '../../components/ProfileSettings';
import { 
  LayoutDashboard, ShoppingBag, MessageSquare, Plus,
  Sun, Moon, Bell, Settings, HelpCircle, LogOut,
  CreditCard, Pencil, Wrench, Package
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

  const [usersList, setUsersList] = useState([]);

  // --- EDITING STATES FOR BOOKINGS ---
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [editCost, setEditCost] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingCostNotes, setIsSavingCostNotes] = useState(false);

  // --- INTERNAL CHAT HOOK ---
  const {
    selectedConversation: internalConversation,
    setSelectedConversation: setInternalConversation,
    chatMessages: internalMessages,
    newMessage: internalNewMessage,
    isUploadingImage: isInternalUploading,
    isLoading: isInternalLoading,
    unreadCount: internalUnreadCount,
    unreadSenders: internalUnreadSenders,
    typingUsers: internalTypingUsers,
    handleSelectStaff: handleSelectInternalStaff,
    handleSendMessage: handleSendInternalMessage,
    handleImageUpload: handleInternalImageUpload,
    handleTyping: handleInternalTyping,
    markChatViewActive: markInternalChatActive,
  } = useInternalChat(user, token);

  const handleGlobalEvent = useCallback((eventName, data) => {
    if (eventName === 'newOrder' || eventName === 'newBooking' || eventName === 'newOrderForSeller' || eventName === 'newBookingForSeller') {
      fetchData();
    }
  }, []);

  const { notifications, clearAllNotifications } = useNotifications(user, token, handleGlobalEvent);

  const internalStaffList = usersList.filter(u => u.role === 'admin' || u.role === 'seller');

  const fetchData = async (isInitial = false) => {
    if (!user || !token) return;
    if (isInitial) setLoading(true);
    try {
      const resBookings = await fetch(`${API_BASE}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataBookings = await resBookings.json();
      if (Array.isArray(dataBookings)) setBookingsList(dataBookings);
      else setBookingsList([]);

      const resUsers = await fetch(`${API_BASE}/api/users/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resUsers.ok) {
        const usersData = await resUsers.json();
        setUsersList(usersData);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [user, token]);


  useEffect(() => {
    if (setInternalConversation) {
      setInternalConversation(null);
    }
  }, [subTab, setInternalConversation]);

  useEffect(() => {
    markInternalChatActive(subTab === 'internal-chat');
  }, [subTab, markInternalChatActive]);

  const handleLogout = () => {
    logout();
    window.location.hash = '#/auth';
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
    setIsSavingCostNotes(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cost: cost ? Number(cost) : 0, notes })
      });
      if (res.ok) {
        alert('Cập nhật chi phí & ghi chú thành công.');
        setEditingBookingId(null);
        fetchData();
      } else {
        alert('Lỗi cập nhật.');
      }
    } catch {
      alert('Không thể cập nhật.');
    } finally {
      setIsSavingCostNotes(false);
    }
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
      case 'waiting_payment': return 'Chờ thanh toán';
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
              <span>#TRUNG TÂM PHÂN TÍCH</span>
            </div>
          </div>
          
          <nav className="sidebar-nav-menu">
            <button className="sidebar-nav-btn" onClick={() => setActivePage('shop')}>
              <ShoppingBag size={18} />
              Chợ thiết bị
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'repairs' ? 'active' : ''}`} onClick={() => setSubTab('repairs')}>
              <Wrench size={18} />
              Sửa chữa
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'overview' || subTab === '' ? 'active' : ''}`} onClick={() => setSubTab('overview')}>
              <LayoutDashboard size={18} />
              Bảng điều khiển
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'inventory' ? 'active' : ''}`} onClick={() => setSubTab('inventory')}>
              <Package size={18} />
              Kho linh kiện
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'internal-chat' ? 'active' : ''}`} onClick={() => setSubTab('internal-chat')} style={{ position: 'relative' }}>
              <MessageSquare size={18} />
              Tin nhắn
              {internalUnreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '6px', right: '10px',
                  background: '#ef4444', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 800,
                  padding: '1px 5px', borderRadius: '10px', minWidth: '18px',
                  textAlign: 'center', lineHeight: '16px'
                }}>{internalUnreadCount > 9 ? '9+' : internalUnreadCount}</span>
              )}
            </button>
          </nav>

          <button className="new-report-btn tech-book-btn" onClick={() => setActivePage('booking')}>
            <Plus size={16} /> Đặt lịch sửa chữa
          </button>

          <div className="sidebar-bottom-nav">
            <button className={`sidebar-nav-btn bottom-btn ${subTab === 'settings' ? 'active' : ''}`} onClick={() => setSubTab('settings')}>
              <Settings size={18} />
              Cài đặt
            </button>
            <button className="sidebar-nav-btn bottom-btn" onClick={() => alert("Liên hệ hỗ trợ TechCycle tại support@techcycle.vn")}>
              <HelpCircle size={18} />
              Hỗ trợ
            </button>
            <button className="sidebar-nav-btn bottom-btn logout" onClick={handleLogout}>
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>

          <div className="sidebar-copyright-text">
            <p>© 2026 TechCycle - quản lý hiệu suất & giải pháp kinh tế tuần hoàn.</p>
          </div>
        </aside>

        {/* Dashboard Main Content Area */}
        <main className="dashboard-main-content">
          <header className="dashboard-top-bar glass-panel">
            <h2 className="topbar-page-title">
              {subTab === 'repairs' ? 'Sửa chữa' : 
               subTab === 'inventory' ? 'Kho linh kiện' : 
               subTab === 'internal-chat' ? 'Tin nhắn nội bộ' : 
               subTab === 'settings' ? 'Cài đặt' : 'Bảng điều khiển'}
            </h2>

            <div style={{ flex: 1 }}></div>

            <div className="topbar-actions-profile">
              <button className="topbar-action-btn theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle Light/Dark theme">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <div style={{ position: 'relative' }}>
                <NotificationBell 
                  notifications={notifications} 
                  onClearAll={clearAllNotifications} 
                  onClickNotification={(notif) => {
                    if (notif.type === 'chat') setSubTab('internal-chat');
                  }} 
                />
              </div>
              
              <button className="topbar-action-btn messages" onClick={() => setSubTab('internal-chat')} title="Messages">
                <MessageSquare size={20} />
              </button>
              
              <div className="topbar-divider"></div>

              <div className="topbar-profile-widget">
                <div className="profile-info">
                  <h4>{user?.username || 'Kỹ thuật viên'}</h4>
                  <span>Thợ sửa chữa</span>
                </div>
                <div className="profile-avatar">
                  <img src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Tech&backgroundColor=e6f6ee"} alt="avatar" />
                </div>
              </div>
            </div>
          </header>

          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          )}

          {!loading && subTab === 'settings' && (
            <div className="settings-view animate-fade container py-4">
              <h2 className="mb-4 text-center" style={{ fontWeight: 800 }}>Cài Đặt Tài Khoản</h2>
              <ProfileSettings />
            </div>
          )}

          {!loading && subTab === 'repairs' && (
            <div className="technician-repairs animate-fade">
              <h2>Lịch Sửa Chữa Kỹ Thuật Viên</h2>
              <p className="view-desc">Kiểm tra thiết bị hỏng, chẩn đoán chi phí sửa chữa và báo cáo tiến độ cho khách hàng.</p>

              <div className="bookings-cards-grid">
                {bookingsList.length === 0 ? (
                  <div className="glass-panel text-center py-4">Hiện chưa có công việc sửa chữa nào được phân công cho bạn.</div>
                ) : (
                  bookingsList.map(bk => {
                    let displayDeviceType = bk.device_type || bk.deviceType || 'Thiết bị';
                    let displayIssue = bk.issue_description || bk.issueDescription || '';
                    if (displayIssue.startsWith('[')) {
                      const closeIdx = displayIssue.indexOf(']');
                      if (closeIdx > 0) {
                        displayDeviceType = displayIssue.substring(1, closeIdx);
                        displayIssue = displayIssue.substring(closeIdx + 1).trim();
                      }
                    }

                    const displayDate = bk.preferred_date 
                      ? new Date(bk.preferred_date).toLocaleDateString('vi-VN') 
                      : (bk.preferredDate || 'Chưa cập nhật');

                    let displayTime = bk.preferredTime || '';
                    if (!displayTime && bk.notes && bk.notes.includes('Khung giờ:')) {
                      const matchTime = bk.notes.match(/Khung giờ:\s*([^\r\n]+)/);
                      if (matchTime) {
                        displayTime = matchTime[1].trim();
                      }
                    }
                    const timeSuffix = displayTime ? ` (${displayTime})` : '';

                    return (
                      <div key={bk.id} className="repair-card glass-panel">
                        <div className="card-top-row">
                          <span className={`badge badge-${bk.status}`}>
                            {getStatusLabel(bk.status)}
                          </span>
                          <span className="booking-id-tag">#{bk.id}</span>
                        </div>
                        
                        <hr />

                        <div className="card-body">
                          <h4>{displayDeviceType}</h4>
                          <p className="card-issue"><strong>Lỗi báo cáo:</strong> {displayIssue}</p>
                          
                          <div className="card-details-row">
                            <div>
                              <span className="card-meta-lbl">Khách hàng:</span>
                              <p><strong>{bk.customerName}</strong> ({bk.customerPhone})</p>
                            </div>
                            <div>
                              <span className="card-meta-lbl">Ngày hẹn:</span>
                              <p>{displayDate}{timeSuffix}</p>
                            </div>
                          </div>

                          {editingBookingId === bk.id ? (
                            <div className="card-edit-details-form" style={{ marginTop: '15px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <div className="form-group" style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-medium)', marginBottom: '4px' }}>Chi phí dự kiến (VND):</label>
                                <input 
                                  type="number"
                                  className="form-control"
                                  style={{ width: '100%', padding: '6px', fontSize: '0.85rem', background: 'var(--neutral-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-color)' }}
                                  value={editCost}
                                  onChange={e => setEditCost(e.target.value)}
                                  placeholder="0"
                                  min="0"
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-medium)', marginBottom: '4px' }}>Ghi chú từ thợ:</label>
                                <textarea 
                                  className="form-control"
                                  rows={3}
                                  style={{ width: '100%', padding: '6px', fontSize: '0.85rem', background: 'var(--neutral-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-color)', resize: 'vertical' }}
                                  value={editNotes}
                                  onChange={e => setEditNotes(e.target.value)}
                                  placeholder="Nhập ghi chú cho khách hàng..."
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-primary btn-sm" 
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                                  disabled={isSavingCostNotes}
                                  onClick={() => handleUpdateBookingCostNotes(bk.id, editCost, editNotes)}
                                >
                                  {isSavingCostNotes ? 'Đang lưu...' : 'Lưu'}
                                </button>
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                                  onClick={() => setEditingBookingId(null)}
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {bk.cost > 0 ? (
                                <div className="card-cost-banner">
                                  Chi phí dự kiến: <strong>{bk.cost.toLocaleString('vi-VN')} VND</strong>
                                </div>
                              ) : (
                                <div className="card-cost-banner" style={{ opacity: 0.6 }}>
                                  Chi phí dự kiến: <strong>Chưa báo giá</strong>
                                </div>
                              )}

                              {bk.notes && !bk.notes.startsWith('Khung giờ:') && (
                                <div className="card-notes-banner">
                                  <strong>Ghi chú từ thợ:</strong> {bk.notes}
                                </div>
                              )}

                              <button 
                                className="btn btn-outline btn-sm"
                                style={{ marginTop: '10px', width: '100%', padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                onClick={() => {
                                  setEditingBookingId(bk.id);
                                  setEditCost(bk.cost > 0 ? String(bk.cost) : '');
                                  setEditNotes(bk.notes || '');
                                }}
                              >
                                ✏️ Báo giá & Ghi chú
                              </button>
                            </>
                          )}
                        </div>

                        <div className="card-actions">
                          <div className="status-selector-wrap">
                            <span>Cập nhật trạng thái:</span>
                            <select 
                              className="form-control inline-select"
                              value={bk.status}
                              onChange={(e) => handleUpdateBookingStatus(bk.id, e.target.value)}
                            >
                              <option value="assigned">Đã phân công</option>
                              <option value="inspecting">Đang kiểm tra</option>
                              <option value="repairing">Đang sửa chữa</option>
                              <option value="completed">Hoàn thành</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                          <h3>{user.full_name || user.username}</h3>
                          <span className="tech-senior-badge">KỸ THUẬT VIÊN CAO CẤP</span>
                        </div>
                        <p className="tech-bio-text">
                          Chuyên về tối ưu hóa hệ thống quang điện & bảo trì thu giữ carbon. Dẫn đầu mục tiêu phát triển bền vững khu vực từ 2021.
                        </p>
                        <div className="tech-certs-row">
                          <span className="tech-cert-badge check-badge">
                            <span className="check-icon">✓</span> Chứng chỉ năng lượng mặt trời L3
                          </span>
                          <span className="tech-cert-badge link-badge">
                            <span className="link-icon">🔄</span> Chuyên gia tích hợp lưới điện
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Repair Schedule Widget */}
                  <div className="tech-schedule-card glass-panel">
                    <div className="schedule-header-row">
                      <h3>Lịch Sửa Chữa</h3>
                      <div className="schedule-month-nav">
                        <button className="month-nav-btn">&lt;</button>
                        <span>Tháng 10, 2024</span>
                        <button className="month-nav-btn">&gt;</button>
                      </div>
                    </div>

                    <div className="calendar-grid">
                      <div className="cal-day-header">T2</div>
                      <div className="cal-day-header">T3</div>
                      <div className="cal-day-header">T4</div>
                      <div className="cal-day-header">T5</div>
                      <div className="cal-day-header">T6</div>
                      <div className="cal-day-header">T7</div>
                      <div className="cal-day-header">CN</div>

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
                      <h4>LỊCH TRÌNH HÔM NAY</h4>
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
                            <p>Không có công việc sửa chữa nào cho ngày này.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tech-overview-col-right">
                  {/* Performance Score Widget */}
                  <div className="tech-performance-card glass-panel">
                    <span className="card-lbl">Điểm Hiệu Suất</span>
                    <div className="score-main-value">
                      <h2>98.4%</h2>
                    </div>
                    <span className="score-quarter-trend">+2.4% so với quý trước</span>
                    <div className="score-progress-section">
                      <div className="score-progress-labels">
                        <span>Mục tiêu hiệu suất</span>
                        <strong>104 / 120 hrs</strong>
                      </div>
                      <div className="score-progress-bar-bg">
                        <div className="score-progress-bar-fill" style={{ width: '86.6%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Skill Inventory Widget */}
                  <div className="tech-skills-card glass-panel">
                    <h3>Kỹ Năng Chuyên Môn</h3>
                    <div className="skills-levels-list">
                      <div className="skill-level-row">
                        <div className="skill-level-labels">
                          <span>Chẩn đoán phần cứng</span>
                          <span className="skill-level-val master">Thành thạo</span>
                        </div>
                        <div className="skill-level-progress-bg">
                          <div className="skill-level-progress-fill master-fill" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                      <div className="skill-level-row">
                        <div className="skill-level-labels">
                          <span>Vá firmware</span>
                          <span className="skill-level-val expert">Chuyên gia</span>
                        </div>
                        <div className="skill-level-progress-bg">
                          <div className="skill-level-progress-fill expert-fill" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                      <div className="skill-level-row">
                        <div className="skill-level-labels">
                          <span>Hiệu chuẩn từ xa</span>
                          <span className="skill-level-val proficient">Thành thạo</span>
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
                      <h3>Ví Thu Nhập</h3>
                      <CreditCard size={18} className="wallet-header-icon" />
                    </div>
                    <div className="wallet-balance-row">
                      <h2>{totalEarnings.toLocaleString('vi-VN')} VND</h2>
                    </div>
                    <div className="wallet-mini-stats-grid">
                      <div className="wallet-mini-stat-box">
                        <span>Đã sửa xong</span>
                        <h3>{repairsDoneCount}</h3>
                      </div>
                      <div className="wallet-mini-stat-box">
                        <span>Chờ thanh toán</span>
                        <h3>{pendingPayout > 0 ? `${pendingPayout.toLocaleString('vi-VN')} VND` : '0 VND'}</h3>
                      </div>
                    </div>
                    <button className="wallet-action-btn" onClick={() => alert("Chi tiết thu nhập và thanh toán đã được mở.")}>
                      Xem Chi Tiết Thu Nhập
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'inventory' && (
            <div className="tech-inventory-section animate-fade">
              <h2>Kho Linh Kiện & Dụng Cụ</h2>
              <p className="view-desc">Quản lý tồn kho linh kiện thay thế và chứng nhận dụng cụ.</p>
              <div className="bookings-cards-grid">
                <div className="glass-panel p-4" style={{ width: '100%' }}>
                  <h3 className="mb-3">Kho Linh Kiện Thay Thế</h3>
                  <div className="table-responsive">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Mã linh kiện</th>
                          <th>Tên / Mô tả</th>
                          <th>Danh mục</th>
                          <th>Tồn kho</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>#SP-492</strong></td>
                          <td>Tụ điện thay thế biến tần PV</td>
                          <td>Điện tử</td>
                          <td>12 cái</td>
                          <td><span className="badge badge-completed">Còn hàng</span></td>
                        </tr>
                        <tr>
                          <td><strong>#SP-109</strong></td>
                          <td>Cầu chì pin Lithium 12V</td>
                          <td>Phụ kiện pin</td>
                          <td>4 cái</td>
                          <td><span className="badge badge-inspecting">Sắp hết</span></td>
                        </tr>
                        <tr>
                          <td><strong>#SP-038</strong></td>
                          <td>Đầu dò cảm biến nhiệt</td>
                          <td>Cảm biến</td>
                          <td>25 cái</td>
                          <td><span className="badge badge-completed">Còn hàng</span></td>
                        </tr>
                        <tr>
                          <td><strong>#SP-882</strong></td>
                          <td>Bo mạch logic bộ chuyển đổi đồng bộ</td>
                          <td>Mạch điện</td>
                          <td>0 cái</td>
                          <td><span className="badge badge-canceled">Hết hàng</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'internal-chat' && (
            <div className="animate-fade" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
              <InternalChatPanel
                staffList={internalStaffList}
                selectedConversation={internalConversation}
                chatMessages={internalMessages}
                newMessage={internalNewMessage}
                isLoading={isInternalLoading}
                isUploadingImage={isInternalUploading}
                typingUsers={internalTypingUsers}
                unreadSenders={internalUnreadSenders}
                onSelectStaff={handleSelectInternalStaff}
                onSendMessage={handleSendInternalMessage}
                onTyping={handleInternalTyping}
                onImageUpload={handleInternalImageUpload}
                userRole="technician"
              />
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

              <div className="form-group" style={{ textAlign: 'center', marginBottom: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #006D44', color: '#006D44', cursor: 'pointer', background: 'none', fontWeight: 'bold' }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setCustomAvatarUrl(ev.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                >
                  📤 Tải ảnh từ thiết bị
                </button>
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

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { getProductImage } from '../../components/ProductCard';
import ProfileSettings from '../../components/ProfileSettings';
import {
  LayoutDashboard, ShoppingBag, Calendar, Plus, Trash2,
  Users, Sun, Moon, Eye, Search, Bell, Settings, HelpCircle, LogOut,
  MapPin, CreditCard, Pencil, Shield, ArrowLeft, MessageSquare, Tag, Send, Image, Paperclip, X, Menu
} from 'lucide-react';
import InternalChatPanel from '../../components/InternalChatPanel';
import useInternalChat from '../../hooks/useInternalChat';
import useNotifications from '../../hooks/useNotifications';
import NotificationBell from '../../components/NotificationBell';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)) ? `${window.location.protocol}//${window.location.hostname}:5000` : '';

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
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [productsList, setProductsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [techsList, setTechsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- PAGINATION STATES ---
  const [ordersPage, setOrdersPage] = useState(1);
  const [bookingsPage, setBookingsPage] = useState(1);
  const itemsPerPage = 10;

  // --- FORM STATES FOR ADMIN PRODUCTS ---
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('AirConditioner');
  const [newProdCondition, setNewProdCondition] = useState('excellent');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [productSuccess, setProductSuccess] = useState('');
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);

  // --- FORM STATES FOR EDITING PRODUCTS ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('AirConditioner');
  const [editProdCondition, setEditProdCondition] = useState('excellent');
  const [editProdImage, setEditProdImage] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdStatus, setEditProdStatus] = useState('available');
  const [isEditImageHovered, setIsEditImageHovered] = useState(false);

  // --- FORM STATES FOR PROMO CODES ---
  const [promoCodes, setPromoCodes] = useState([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');
  const [newPromoActive, setNewPromoActive] = useState(true);
  const [newPromoExpiry, setNewPromoExpiry] = useState('');

  // --- FORM STATES FOR NOTIFICATIONS ---
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifImage, setNotifImage] = useState('');
  const [notifTargetRole, setNotifTargetRole] = useState('all');
  const [notifLink, setNotifLink] = useState('');

  // --- HERO BANNER MANAGEMENT ---
  const [heroBanners, setHeroBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // --- FEATURES SECTION MANAGEMENT ---
  const [featureItems, setFeatureItems] = useState([
    { featureIcon: 'cpu', featureTitle: 'Hệ thống chẩn đoán AI', featureDesc: 'Dự báo hư hỏng linh kiện chính xác và dự toán giá cả sửa chữa minh bạch, không phát sinh phụ phí.' },
    { featureIcon: 'recycle', featureTitle: 'Linh kiện chuẩn Eco', featureDesc: 'Ưu tiên sử dụng linh kiện tái chế chất lượng cao, linh kiện bóc máy chính hãng giúp giảm thiểu tác động carbon.' },
    { featureIcon: 'shield', featureTitle: 'Cam kết độ bền xanh', featureDesc: '100% thiết bị bán ra tại Cửa hàng Eco đều trải qua quy trình kiểm thử 24 bước nghiêm ngặt trước khi xuất xưởng.' }
  ]);
  const [featureSectionTitle, setFeatureSectionTitle] = useState('Vì sao TechCycle là lựa chọn hàng đầu?');
  const [featureSectionSubtitle, setFeatureSectionSubtitle] = useState('Lựa chọn bền vững');
  const [featureSectionDesc, setFeatureSectionDesc] = useState('Chúng tôi hướng đến xây dựng vòng đời công nghệ tuần hoàn bằng sự minh bạch và chuyên nghiệp hàng đầu.');
  const [featureSectionImage, setFeatureSectionImage] = useState('https://images.unsplash.com/photo-1604754742629-3e5728249d73?w=700');

  // --- CHAT SYSTEM STATES ---
  const {
    selectedConversation,
    chatMessages,
    newMessage,
    isUploadingImage,
    isLoading: chatLoading,
    unreadCount,
    unreadSenders,
    typingUsers,
    handleSelectStaff,
    handleSendMessage,
    handleImageUpload,
    handleTyping,
    markChatViewActive,
  } = useInternalChat(user, token);

  const internalStaffList = usersList.filter(u => u.role === 'seller' || u.role === 'technician');

  const handleGlobalEvent = useCallback((eventName, data) => {
    if (eventName === 'newOrder' || eventName === 'newBooking' || eventName === 'newOrderForSeller' || eventName === 'newBookingForSeller') {
      if (eventName === 'newOrder') setNewOrderCount(prev => prev + 1);
      if (eventName === 'newBooking') setNewBookingCount(prev => prev + 1);
      fetchData();
    }
  }, []);

  const { notifications, clearAllNotifications } = useNotifications(user, token, handleGlobalEvent);

  useEffect(() => {
    markChatViewActive(subTab === 'internal-chat');
  }, [subTab, markChatViewActive]);

  const fetchData = async (isInitial = false) => {
    if (!user || !token) return;
    if (isInitial) setLoading(true);
    if (isInitial) {
      setOrdersPage(1);
      setBookingsPage(1);
    }
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
      if (Array.isArray(dataUsers)) {
        const roleOrder = { 'admin': 1, 'seller': 2, 'technician': 3, 'customer': 4 };
        const sortedUsers = [...dataUsers].sort((a, b) => {
          const orderA = roleOrder[a.role?.toLowerCase()] || 99;
          const orderB = roleOrder[b.role?.toLowerCase()] || 99;
          return orderA - orderB;
        });
        setUsersList(sortedUsers);
      }

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

      const resPromos = await fetch(`${API_BASE}/api/promocodes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resPromos.ok) {
        const dataPromos = await resPromos.json();
        setPromoCodes(dataPromos);
      }

      // Fetch banners
      const resBanners = await fetch(`${API_BASE}/api/banners`);
      if (resBanners.ok) {
        const dataBanners = await resBanners.json();
        setHeroBanners(dataBanners);
      }

      // Fetch features
      const resFeatures = await fetch(`${API_BASE}/api/features`);
      if (resFeatures.ok) {
        const dataFeatures = await resFeatures.json();
        if (Array.isArray(dataFeatures) && dataFeatures.length > 0) {
          if (dataFeatures[0].sectionTitle) setFeatureSectionTitle(dataFeatures[0].sectionTitle);
          if (dataFeatures[0].sectionSubtitle) setFeatureSectionSubtitle(dataFeatures[0].sectionSubtitle);
          if (dataFeatures[0].sectionDesc) setFeatureSectionDesc(dataFeatures[0].sectionDesc);
          if (dataFeatures[0].sectionImage) setFeatureSectionImage(dataFeatures[0].sectionImage);
          setFeatureItems(dataFeatures.map(f => ({
            featureIcon: f.featureIcon || 'cpu',
            featureTitle: f.featureTitle || '',
            featureDesc: f.featureDesc || ''
          })));
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromoCode = async (e) => {
    e.preventDefault();
    if (!newPromoCode.trim() || !newPromoDiscount) {
      alert("Vui lòng nhập cả mã và tỷ lệ phần trăm giảm giá.");
      return;
    }

    const discountNum = parseInt(newPromoDiscount);
    if (isNaN(discountNum) || discountNum <= 0 || discountNum >= 100) {
      alert("Phần trăm giảm giá phải từ 1% đến 99%!");
      return;
    }

    let formattedExpiry = '2026-12-31';
    if (newPromoExpiry) {
      formattedExpiry = newPromoExpiry;
    }

    try {
      const res = await fetch(`${API_BASE}/api/promocodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: newPromoCode.toUpperCase().replace(/\s+/g, ''),
          discount: discountNum,
          expiry: formattedExpiry,
          status: newPromoActive ? 'active' : 'expired'
        })
      });

      if (res.ok) {
        const newCode = await res.json();
        setPromoCodes(prev => [newCode, ...prev]);
        setNewPromoCode('');
        setNewPromoDiscount('');
        setNewPromoExpiry('');
        alert(`Mã khuyến mãi ${newCode.code} đã được tạo thành công!`);
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi tạo mã.');
      }
    } catch (err) {
      alert('Lỗi kết nối.');
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: notif.id })
      });
      if (res.ok) {
        clearAllNotifications();
      }
    } catch (err) {
      console.error('Lỗi khi click thông báo:', err);
    }

    if (notif.type === 'chat') {
      setSubTab('chat');
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert("Vui lòng điền đầy đủ tiêu đề và nội dung thông báo.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          image: notifImage,
          targetRole: notifTargetRole
        })
      });
      if (res.ok) {
        const targetText = notifTargetRole === 'all' ? 'toàn bộ người dùng' :
          notifTargetRole === 'technician' ? 'các thợ kỹ thuật' : 'các seller';
        alert(`Thông báo đã được gửi thành công đến ${targetText}!`);
        setNotifTitle('');
        setNotifMessage('');
        setNotifImage('');
        setNotifTargetRole('all');
      } else {
        const errData = await res.json();
        alert(`Lỗi gửi thông báo: ${errData.message || 'Không xác định'}`);
      }
    } catch (err) {
      console.error('Lỗi gửi thông báo:', err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const handleDeletePromoCode = async (codeToDelete) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mã khuyến mãi ${codeToDelete}?`)) {
      try {
        const res = await fetch(`${API_BASE}/api/promocodes/${codeToDelete}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setPromoCodes(prev => prev.filter(p => p.code !== codeToDelete));
        }
      } catch (err) {
        alert('Lỗi xóa mã.');
      }
    }
  };

  // --- WEBSOCKET CHAT LOGIC ---
  useEffect(() => {
    if (!user) return;
    const socketRef = { current: io(`${API_BASE}`) };
    socketRef.current.emit('registerUser', user.id);

    socketRef.current.on('newOrderForSeller', (data) => {
      alert(`🔔 [HẸN XEM MÁY MỚI] ${data.message}`);
      fetchData(); // Reload dashboard and notifications
    });

    socketRef.current.on('newBookingForSeller', (data) => {
      alert(`🔔 [HẸN SỬA MÁY MỚI] ${data.message}`);
      fetchData(false); // Reload dashboard and notifications
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  useEffect(() => {
    fetchData(true);
  }, [user, token]);

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
            { cx: 40, cy: 180 }, { cx: 113.33, cy: 160 }, { cx: 186.66, cy: 170 },
            { cx: 260.00, cy: 130 }, { cx: 333.33, cy: 140 }, { cx: 406.66, cy: 90 }, { cx: 480.00, cy: 70 }
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
            { cx: 40, cy: 170 }, { cx: 113.33, cy: 140 }, { cx: 186.66, cy: 150 },
            { cx: 260.00, cy: 110 }, { cx: 333.33, cy: 120 }, { cx: 406.66, cy: 75 }, { cx: 480.00, cy: 50 }
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
            { cx: 40, cy: 180 }, { cx: 80, cy: 150 }, { cx: 120, cy: 165 }, { cx: 160, cy: 120 },
            { cx: 200, cy: 135 }, { cx: 240, cy: 100 }, { cx: 280, cy: 115 }, { cx: 320, cy: 80 },
            { cx: 360, cy: 95 }, { cx: 400, cy: 65 }, { cx: 440, cy: 78 }, { cx: 480, cy: 50 }
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
    window.location.hash = '#/auth';
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

  const updateCurrentBanner = (field, value) => {
    setHeroBanners(prev => prev.map((b, i) => i === currentBannerIndex ? { ...b, [field]: value } : b));
  };

  const handleSaveBanners = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ banners: heroBanners })
      });
      if (res.ok) {
        alert('💾 Lưu danh sách banner thành công!');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.message || 'Lỗi lưu banner.');
      }
    } catch (err) {
      alert('Lỗi lưu banner: ' + err.message);
    }
  };

  const handleSaveFeatures = async () => {
    try {
      const payload = featureItems.map(f => ({
        sectionSubtitle: featureSectionSubtitle,
        sectionTitle: featureSectionTitle,
        sectionDesc: featureSectionDesc,
        sectionImage: featureSectionImage,
        featureIcon: f.featureIcon,
        featureTitle: f.featureTitle,
        featureDesc: f.featureDesc
      }));
      const res = await fetch(`${API_BASE}/api/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ features: payload })
      });
      if (res.ok) {
        alert('💾 Lưu nội dung section thành công!');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.message || 'Lỗi lưu features.');
      }
    } catch (err) {
      alert('Lỗi lưu features: ' + err.message);
    }
  };

  const handleImageFilesChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + selectedImageFiles.length > 10) {
        alert("Bạn chỉ có thể tải lên tối đa 10 hình ảnh.");
        return;
      }

      const promises = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(base64s => {
        setSelectedImageFiles(prev => [...prev, ...base64s]);
      }).catch(err => {
        console.error("Lỗi đọc file:", err);
      });
    }
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setSelectedImageFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setProductSuccess('');
    if (!newProdName || !newProdPrice || !newProdDesc) {
      alert('Vui lòng điền đủ thông tin thiết bị.');
      return;
    }
    try {
      let finalUrls = [];
      if (selectedImageFiles.length > 0) {
        const uploadRes = await fetch(`${API_BASE}/api/upload-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ images: selectedImageFiles })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalUrls = uploadData.urls;
        } else {
          const errData = await uploadRes.json();
          alert(`Lỗi tải lên hình ảnh: ${errData.message || 'Không xác định'}`);
          return;
        }
      }

      if (newProdImage.trim()) {
        finalUrls.push(newProdImage.trim());
      }

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
          images: finalUrls,
          image: finalUrls[0] || undefined,
          description: newProdDesc
        })
      });
      if (res.ok) {
        setProductSuccess('Thêm thiết bị mới vào chợ đồ cũ thành công!');
        setNewProdName('');
        setNewProdPrice('');
        setNewProdDesc('');
        setNewProdImage('');
        setSelectedImageFiles([]);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.message || 'Lỗi thêm sản phẩm.');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi thêm sản phẩm.');
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
      let finalImageUrl = editProdImage;
      if (editProdImage && editProdImage.startsWith('data:image/')) {
        const uploadRes = await fetch(`${API_BASE}/api/upload-images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ images: [editProdImage] })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.urls && uploadData.urls.length > 0) {
            finalImageUrl = uploadData.urls[0];
          }
        } else {
          const errData = await uploadRes.json();
          alert(`Lỗi tải lên hình ảnh: ${errData.message || 'Không xác định'}`);
          return;
        }
      }

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
          image: finalImageUrl || undefined,
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

  const handleUpdateBookingDetails = async (bookingId, payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log('Booking details updated successfully.');
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Lỗi cập nhật lịch hẹn.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật lịch hẹn.');
    }
  };

  const handleConfirmOrderVisit = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/confirm-visit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Đã xác nhận khách hàng tới xem máy thành công!');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi xác nhận.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Hủy đơn hàng thành công!');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi hủy đơn hàng.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn sửa chữa này?')) return;
    await handleUpdateBookingDetails(bookingId, { status: 'cancelled' });
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
      case 'pending': return 'Đang chờ';
      case 'assigned': return 'Đã phân công';
      case 'inspecting': return 'Đang kiểm tra';
      case 'repairing': return 'Đang sửa chữa';
      case 'completed': return 'Hoàn thành';
      case 'canceled': return 'Đã hủy';
      case 'cancelled': return 'Đã hủy';
      case 'reserved': return 'Đã giữ chỗ';
      case 'active': return 'Đang hiển thị';
      case 'sold_out': return 'Đã bán';
      case 'waiting_payment': return 'Chờ thanh toán';
      default: return st;
    }
  };

  const totalOrderPages = Math.ceil(ordersList.length / itemsPerPage) || 1;
  const activeOrdersPage = ordersPage > totalOrderPages ? totalOrderPages : ordersPage;
  const currentOrders = ordersList.slice((activeOrdersPage - 1) * itemsPerPage, activeOrdersPage * itemsPerPage);

  const totalBookingPages = Math.ceil(bookingsList.length / itemsPerPage) || 1;
  const activeBookingsPage = bookingsPage > totalBookingPages ? totalBookingPages : bookingsPage;
  const currentBookings = bookingsList.slice((activeBookingsPage - 1) * itemsPerPage, activeBookingsPage * itemsPerPage);

  const totalPurchased = ordersList.filter(o => o.status === 'completed').length;
  const totalPending = ordersList.filter(o => ['pending', 'reserved', 'waiting_payment', 'confirmed'].includes(o.status)).length;
  const totalCanceled = ordersList.filter(o => ['canceled', 'cancelled'].includes(o.status)).length;

  const [showMobileSidebar, setShowMobileSidebar] = useState(false); // Default to false on mobile viewports

  const handleNavClick = (tab) => {
    setSubTab(tab);
    setShowMobileSidebar(false);
  };

  return (
    <div className="dashboard-page admin-dashboard-layout animate-fade">
      <div className="dashboard-grid-layout">

        {/* Sidebar Nav */}
        <aside className={`dashboard-sidebar glass-panel ${showMobileSidebar ? 'mobile-show' : 'mobile-hide'}`}>
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
            <button className={`sidebar-nav-btn ${subTab === 'stats' ? 'active' : ''}`} onClick={() => handleNavClick('stats')}>
              <LayoutDashboard size={18} />
              Bảng điều khiển
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'bookings' ? 'active' : ''}`} onClick={() => handleNavClick('bookings')}>
              <Calendar size={18} />
              Phân tích
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'products' ? 'active' : ''}`} onClick={() => handleNavClick('products')}>
              <ShoppingBag size={18} />
              Tài sản
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'customers' ? 'active' : ''}`} onClick={() => handleNavClick('customers')}>
              <Users size={18} />
              Báo cáo
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'users' ? 'active' : ''}`} onClick={() => handleNavClick('users')}>
              <Users size={18} />
              Nhóm
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'marketing' ? 'active' : ''}`} onClick={() => handleNavClick('marketing')}>
              <Tag size={18} />
              Tiếp thị
            </button>
          </nav>



          <div className="sidebar-bottom-nav">
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
            {/* Mobile Toggle Button for Sidebar Nav */}
            <button
              className="dashboard-sidebar-toggle-btn-mobile"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              title={showMobileSidebar ? "Ẩn thanh công cụ" : "Hiện thanh công cụ"}
            >
              {showMobileSidebar ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className="topbar-mobile-brand">
              <h3>Admin Console</h3>
            </div>

            <div style={{ flex: 1 }}></div>

            <div className="topbar-actions-profile">
              <button className="topbar-action-btn theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle Light/Dark theme">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <div style={{ position: 'relative' }}>
                <NotificationBell
                  notifications={notifications}
                  onClearAll={clearAllNotifications}
                  onClickNotification={handleNotificationClick}
                />
              </div>

              <button className="topbar-action-btn messages" onClick={() => setSubTab('chat')} title="Tin nhắn">
                <MessageSquare size={20} />
              </button>

              <button className={`topbar-action-btn settings ${subTab === 'settings' ? 'active' : ''}`} onClick={() => setSubTab('settings')} title="Cài đặt">
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
                  <span>Quản trị viên</span>
                </div>
                <img src={getAvatarUrl(user.avatar, user.username)} alt={user.username} className="profile-avatar-circle" />
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
                      <h3>Phân Tích Dịch Vụ</h3>
                      <p>Phân bổ nguồn doanh thu chính</p>
                    </div>
                    <span className="details-text-link" onClick={() => setSubTab('bookings')}>Chi tiết</span>
                  </div>

                  <div className="service-progress-list">
                    <div className="progress-item-bar">
                      <div className="progress-bar-labels">
                        <span className="progress-dot green"></span>
                        <span className="bar-label">Dịch vụ sửa chữa</span>
                        <span className="bar-value">{trend.repairShare}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill green" style={{ width: '44%' }}></div>
                      </div>
                    </div>

                    <div className="progress-item-bar">
                      <div className="progress-bar-labels">
                        <span className="progress-dot gray"></span>
                        <span className="bar-label">Bán sản phẩm</span>
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
                      <span className="metric-label">KHÁCH HÀNG MỚI</span>
                      <h4>{trend.newCustomers}</h4>
                    </div>
                    <div className="bottom-metric-item">
                      <span className="metric-label">TỶ LỆ HÀI LÒNG</span>
                      <h4 className="green-text">{trend.satisfaction}</h4>
                    </div>
                  </div>
                </div>

                <div className="stats-card-widget glass-panel recent-transactions">
                  <div className="widget-header-row">
                    <h3>Giao Dịch Gần Đây</h3>
                    <span className="three-dots-icon" onClick={() => alert("Đang mở bộ lọc giao dịch lịch sử...")}>•••</span>
                  </div>

                  <div className="transactions-table-wrapper">
                    <table className="transactions-table">
                      <thead>
                        <tr>
                          <th>KHÁCH HÀNG</th>
                          <th>DỊCH VỤ</th>
                          <th>SỐ TIỀN</th>
                          <th>TRẠNG THÁI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeRange === '7D' ? (
                          <>
                            <tr>
                              <td>Nguyen Huy</td>
                              <td>Sửa bàn phím cơ học</td>
                              <td><strong>1.5M VND</strong></td>
                              <td><span className="badge badge-completed">HOÀN THÀNH</span></td>
                            </tr>
                            <tr>
                              <td>Tran Minh</td>
                              <td>Đổi máy iPhone</td>
                              <td><strong>12.2M VND</strong></td>
                              <td><span className="badge badge-pending">ĐANG CHỞ</span></td>
                            </tr>
                            <tr>
                              <td>Le Anh</td>
                              <td>Nâng cấp SSD 1TB</td>
                              <td><strong>3.2M VND</strong></td>
                              <td><span className="badge badge-completed">HOÀN THÀNH</span></td>
                            </tr>
                            <tr>
                              <td>Pham Van</td>
                              <td>Bộ nguồn điện</td>
                              <td><strong>0.8M VND</strong></td>
                              <td><span className="badge badge-completed" style={{ background: '#fee2e2', color: '#ef4444' }}>ĐÃ HỦY</span></td>
                            </tr>
                          </>
                        ) : timeRange === '30D' ? (
                          <>
                            <tr>
                              <td>Nguyen Huy</td>
                              <td>Sửa Laptop Pro</td>
                              <td><strong>4.5M VND</strong></td>
                              <td><span className="badge badge-completed">HOÀN THÀNH</span></td>
                            </tr>
                            <tr>
                              <td>Tran Minh</td>
                              <td>Đổi máy iPhone</td>
                              <td><strong>12.2M VND</strong></td>
                              <td><span className="badge badge-pending">ĐANG CHỞ</span></td>
                            </tr>
                            <tr>
                              <td>Le Anh</td>
                              <td>Màn hình Laptop Air</td>
                              <td><strong>8.5M VND</strong></td>
                              <td><span className="badge badge-completed">HOÀN THÀNH</span></td>
                            </tr>
                            <tr>
                              <td>Pham Van</td>
                              <td>Bán linh kiện</td>
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
              {/* Section 1: Lịch Hẹn Xem Máy */}
              <div className="section-block-wrapper" style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px dashed var(--border-color)' }}>
                <h2>Lịch Hẹn Xem Máy (Mua Thiết Bị)</h2>
                <p className="view-desc">Quản lý danh sách khách hàng đặt lịch hẹn tới xem và kiểm tra máy trực tiếp tại cửa hàng.</p>

                {/* Thống kê lịch hẹn */}
                <div className="stats-summary-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Tổng khách đã mua</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{totalPurchased}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Đang chờ xem/Thanh toán</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{totalPending}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Đã hủy lịch/đơn</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{totalCanceled}</div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>Sản phẩm</th>
                        <th>Ngày & Giờ hẹn</th>
                        <th>Tổng thanh toán</th>
                        <th>Hình thức</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--neutral-medium)' }}>Chưa có lịch hẹn xem máy nào.</td>
                        </tr>
                      ) : (
                        currentOrders.map(o => (
                          <tr key={o.id}>
                            <td>
                              <strong>{o.appointmentInfo?.fullName || o.shippingInfo?.fullName || 'Khách hàng'}</strong>
                              <div className="tbl-subtext">{o.appointmentInfo?.phone || o.shippingInfo?.phone || ''}</div>
                            </td>
                            <td>
                              {o.items?.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.85rem' }}>• {item.name}</div>
                              ))}
                            </td>
                            <td>
                              <strong>{o.appointmentInfo?.appointmentDate || o.shippingInfo?.appointmentDate || 'Chưa hẹn ngày'}</strong>
                              <div className="tbl-subtext" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>{o.appointmentInfo?.appointmentTime || o.shippingInfo?.appointmentTime || ''}</div>
                            </td>
                            <td>
                              <strong>{(o.totalAmount || 0).toLocaleString('vi-VN')} VND</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem' }}>
                                {o.paymentMethod === 'cod' ? 'Thanh toán tại cửa hàng (COD)' : o.paymentMethod === 'vnpay' ? 'VNPay' : 'Chuyển khoản QR'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${o.status}`}>
                                {o.status === 'pending' ? 'Chờ xem máy' :
                                  o.status === 'confirmed' ? 'Đã xác nhận' :
                                    o.status === 'completed' ? 'Khách đã tới (Đã bán)' :
                                      o.status === 'cancelled' || o.status === 'canceled' ? 'Đã hủy' :
                                        o.status === 'reserved' ? 'Đã giữ máy' :
                                          o.status === 'waiting_payment' ? 'Chờ thanh toán (Đang giữ máy)' : o.status}
                              </span>
                            </td>
                            <td>
                              {(o.status === 'pending' || o.status === 'confirmed' || o.status === 'reserved' || o.status === 'waiting_payment') ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleConfirmOrderVisit(o.id)}
                                    style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    Xác nhận khách đã tới
                                  </button>
                                  <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleCancelOrder(o.id)}
                                    style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--neutral-medium)', fontSize: '0.85rem' }}>Không có thao tác</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalOrderPages > 1 && (
                  <div className="pagination-wrapper">
                    <button
                      disabled={activeOrdersPage === 1}
                      onClick={() => setOrdersPage(activeOrdersPage - 1)}
                      className="pagination-btn"
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setOrdersPage(page)}
                        className={`pagination-btn ${activeOrdersPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      disabled={activeOrdersPage === totalOrderPages}
                      onClick={() => setOrdersPage(activeOrdersPage + 1)}
                      className="pagination-btn"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>

              {/* Section 2: Phiếu Hẹn Sửa Chữa */}
              <div>
                <h2>Phiếu Hẹn Sửa Chữa (Dịch Vụ)</h2>
                <p className="view-desc">Danh sách tiếp nhận sửa chữa phần cứng thiết bị, gán kỹ thuật viên, chốt ngày hẹn trả máy và điền thông tin lỗi.</p>

                <div className="table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>Thiết bị & Lỗi</th>
                        <th>Ngày hẹn giao máy</th>
                        <th>Phân công thợ</th>
                        <th>Trạng thái</th>
                        <th>Chi phí & Ghi chú</th>
                        <th>Linh kiện & Báo lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingsList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--neutral-medium)' }}>Chưa có phiếu hẹn sửa chữa nào.</td>
                        </tr>
                      ) : (
                        currentBookings.map(bk => (
                          <tr key={bk.id}>
                            <td>
                              <strong>{bk.customerName}</strong>
                              <div className="tbl-subtext">{bk.customerPhone}</div>
                            </td>
                            <td>
                              <strong>{bk.deviceType || 'Thiết bị điện tử'}</strong>
                              <p className="tbl-desc" title={bk.issueDescription} style={{ fontSize: '0.8rem', color: 'var(--neutral-medium)', marginTop: '4px' }}>{bk.issueDescription}</p>
                            </td>
                            <td>
                              <strong>{bk.preferred_date || 'Chưa hẹn ngày'}</strong>
                              <div className="tbl-subtext">{bk.notes && bk.notes.includes('Khung giờ:') ? bk.notes : 'Khung giờ: Sáng'}</div>
                            </td>
                            <td>
                              <select
                                className="form-control"
                                value={bk.technicianId || ''}
                                onChange={(e) => {
                                  const techId = e.target.value ? Number(e.target.value) : null;
                                  handleUpdateBookingDetails(bk.id, { technicianId: techId });
                                }}
                                style={{ padding: '6px', fontSize: '0.85rem', width: '100%', minWidth: '120px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                              >
                                <option value="">Chưa phân công</option>
                                {techsList.map(t => (
                                  <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-control"
                                value={bk.status}
                                onChange={(e) => {
                                  handleUpdateBookingDetails(bk.id, { status: e.target.value });
                                }}
                                style={{ padding: '6px', fontSize: '0.85rem', width: '100%', minWidth: '120px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                              >
                                <option value="pending">Chờ xử lý</option>
                                <option value="assigned">Đã phân công</option>
                                <option value="inspecting">Đang kiểm tra</option>
                                <option value="repairing">Đang sửa chữa</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="canceled">Đã hủy</option>
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                                <input
                                  type="number"
                                  className="form-control"
                                  defaultValue={bk.cost || 0}
                                  onBlur={(e) => handleUpdateBookingDetails(bk.id, { cost: Number(e.target.value) })}
                                  placeholder="Chi phí (VND)"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                                <input
                                  type="text"
                                  className="form-control"
                                  defaultValue={bk.notes && !bk.notes.includes('Khung giờ:') ? bk.notes : ''}
                                  onBlur={(e) => handleUpdateBookingDetails(bk.id, { notes: e.target.value })}
                                  placeholder="Ghi chú kỹ thuật..."
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-medium)' }}>Chốt ngày nhận máy:</label>
                                  <input
                                    type="date"
                                    className="form-control"
                                    defaultValue={bk.pickup_date ? bk.pickup_date.split('T')[0] : ''}
                                    onChange={(e) => handleUpdateBookingDetails(bk.id, { pickupDate: e.target.value })}
                                    style={{ padding: '4px', fontSize: '0.8rem' }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
                                <textarea
                                  className="form-control"
                                  defaultValue={bk.replaced_parts || ''}
                                  onBlur={(e) => handleUpdateBookingDetails(bk.id, { replacedParts: e.target.value })}
                                  placeholder="Linh kiện thay thế..."
                                  rows="2"
                                  style={{ fontSize: '0.8rem', padding: '4px 8px', resize: 'vertical' }}
                                />
                                <textarea
                                  className="form-control"
                                  defaultValue={bk.fault_report || ''}
                                  onBlur={(e) => handleUpdateBookingDetails(bk.id, { faultReport: e.target.value })}
                                  placeholder="Báo lỗi chi tiết..."
                                  rows="2"
                                  style={{ fontSize: '0.8rem', padding: '4px 8px', resize: 'vertical' }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalBookingPages > 1 && (
                  <div className="pagination-wrapper">
                    <button
                      disabled={activeBookingsPage === 1}
                      onClick={() => setBookingsPage(activeBookingsPage - 1)}
                      className="pagination-btn"
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalBookingPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setBookingsPage(page)}
                        className={`pagination-btn ${activeBookingsPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      disabled={activeBookingsPage === totalBookingPages}
                      onClick={() => setBookingsPage(activeBookingsPage + 1)}
                      className="pagination-btn"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && subTab === 'products' && (
            <div className="products-manager animate-fade">
              <h2>Quản Lý Cửa Hàng & Kho Sản Phẩm</h2>
              <p className="view-desc">Đăng các thiết bị đã được tân trang hoặc quản lý các sản phẩm có sẵn trên chợ mua bán.</p>

              {/* Add form */}
              <form onSubmit={handleAddProduct} className="add-product-form glass-panel form-inline-custom">
                <h3>Đăng Bán Thiết Bị Đã Tân Trang</h3>
                {productSuccess && <div className="success-banner-alert">{productSuccess}</div>}

                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Tên thiết bị</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ví dụ: Tủ lạnh Samsung Inverter 488L"
                      value={newProdName}
                      onChange={e => setNewProdName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giá bán (VND)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Ví dụ: 15000000"
                      value={newProdPrice}
                      onChange={e => setNewProdPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Danh mục</label>
                    <select
                      className="form-control"
                      value={newProdCategory}
                      onChange={e => setNewProdCategory(e.target.value)}
                    >
                      <option value="AirConditioner">Điều hòa</option>
                      <option value="WashingMachine">Máy giặt</option>
                      <option value="Refrigerator">Tủ lạnh</option>
                      <option value="Microwave">Lò vi sóng</option>
                      <option value="Audio">Âm thanh</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Smartwatch">Đồng hồ thông minh</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chất lượng kiểm định</label>
                    <select
                      className="form-control"
                      value={newProdCondition}
                      onChange={e => setNewProdCondition(e.target.value)}
                    >
                      <option value="excellent">Như mới (99%)</option>
                      <option value="good">Rất tốt (&gt;90%)</option>
                      <option value="fair">Tốt (&gt;80%)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Hoặc nhập link hình ảnh</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://images.unsplash.com/..."
                      value={newProdImage}
                      onChange={e => setNewProdImage(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tải lên từ máy tính (Chọn nhiều ảnh, tối đa 10)</label>
                    <input
                      type="file"
                      className="form-control"
                      multiple
                      accept="image/*"
                      onChange={handleImageFilesChange}
                    />
                  </div>
                </div>

                {selectedImageFiles.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Hình ảnh đã chọn ({selectedImageFiles.length}/10):</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {selectedImageFiles.map((base64, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <img src={base64} alt={`Uploaded ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedImage(idx)}
                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Mô tả chi tiết</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Nhập chi tiết về pin, ngoại quan, tình trạng hao mòn, chi tiết bảo hành..."
                    value={newProdDesc}
                    onChange={e => setNewProdDesc(e.target.value)}
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Đăng bán sản phẩm
                </button>
              </form>

              {/* Product catalog list */}
              <div className="table-responsive" style={{ marginTop: '30px' }}>
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Hình ảnh</th>
                      <th>Tên thiết bị</th>
                      <th>Danh mục</th>
                      <th>Giá bán</th>
                      <th>Chất lượng</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
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
                        <td>{prod.price.toLocaleString('vi-VN')} VND</td>
                        <td>
                          <span className={`badge badge-${prod.condition}`}>
                            {getConditionLabel(prod.condition)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-dot ${prod.status}`}></span>
                          {prod.status === 'available' ? 'Còn hàng' : 'Đã bán'}
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
              <h2>Danh Sách Đăng Ký Tài Khoản & Nhân Viên</h2>
              <p className="view-desc">Giám sát các tài khoản, kiểm tra thông tin chi tiết và xóa thông tin xác thực chưa được ủy quyền khỏi cơ sở dữ liệu.</p>

              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Họ và Tên</th>
                      <th>Email đăng nhập</th>
                      <th>Số điện thoại</th>
                      <th>Vai trò</th>
                      <th>Ngày tham gia</th>
                      <th>Thao tác</th>
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
                              <option value="customer">Khách hàng</option>
                              <option value="technician">Kỹ thuật viên</option>
                              <option value="seller">Người bán</option>
                            </select>
                          )}
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td>
                          <div className="action-buttons-wrap">
                            <button
                              className="view-item-btn"
                              onClick={() => setViewingUser(u)}
                              title="Xem hồ sơ tài khoản"
                            >
                              <Eye size={16} />
                            </button>
                            {u.id !== user.id && u.role !== 'admin' && (
                              <button
                                className="delete-item-btn"
                                onClick={() => handleDeleteUser(u.id)}
                                title="Xóa tài khoản người dùng"
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
                    <ArrowLeft size={16} /> Quay lại danh sách
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
                          <span className="member-badge">🌟 THÀNH VIÊN VÀNG</span>
                        </div>
                        <div className="profile-meta-info">
                          <h3>{viewingUser.username}</h3>
                          <span className="role-pill">Khách hàng</span>
                          <span className="status-text">{viewingUser.gender === 'female' ? 'Nữ' : 'Nam'} • ID: #{viewingUser.id}</span>
                        </div>
                      </div>
                      <hr className="widget-divider" />
                      <div className="profile-card-actions">
                        <button className="btn btn-primary btn-sm btn-edit-profile" onClick={() => alert("Tính năng chỉnh sửa hồ sơ được quản lý bởi bảng điều khiển người dùng chung.")}>
                          <Pencil size={14} /> Chỉnh sửa hồ sơ
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-5">
                    <div className="personal-info-card-widget glass-panel h-100">
                      <div className="card-header d-flex align-items-center gap-2 mb-3">
                        <Users size={16} className="header-icon" />
                        <h3 className="m-0">THÔNG TIN CÁ NHÂN</h3>
                      </div>
                      <div className="info-list">
                        <div className="info-row">
                          <span className="info-label">MÃ TÀI KHOẢN</span>
                          <span className="info-value value-id">{viewingUser.id}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">ĐỊA CHỈ EMAIL</span>
                          <span className="info-value">{viewingUser.email}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">SỐ ĐIỆN THOẠI</span>
                          <span className="info-value">{viewingUser.phone || 'Chưa cung cấp'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">NGÀY ĐĂNG KÝ</span>
                          <span className="info-value">
                            {new Date(viewingUser.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
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
                          <h3 className="m-0">Địa chỉ giao hàng</h3>
                        </div>
                        <span className="badge badge-default-address">MẶC ĐỊNH</span>
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
                          <h3 className="m-0">Địa chỉ thanh toán</h3>
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
                    <h3 className="m-0">Lịch sử đơn hàng gần đây</h3>
                    <span className="view-all-link" onClick={() => alert("Chuyển hướng đến tất cả đơn hàng...")}>Xem tất cả</span>
                  </div>
                  <div className="table-responsive">
                    <table className="dashboard-table table">
                      <thead>
                        <tr>
                          <th>MÃ ĐƠN HÀNG</th>
                          <th>TÊN SẢN PHẨM</th>
                          <th>NGÀY</th>
                          <th>SỐ TIỀN</th>
                          <th>TRẠNG THÁI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordersList.filter(o => o.customerId === viewingUser.id).length > 0 ? (
                          ordersList.filter(o => o.customerId === viewingUser.id).map(o => (
                            <tr key={o.id}>
                              <td className="green-text font-bold">#{o.id.toUpperCase()}</td>
                              <td>{o.items.map(it => it.name).join(', ')}</td>
                              <td>{new Date(o.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                              <td>
                                <span className="price-vnd-formatted">
                                  {o.totalAmount.toLocaleString('vi-VN')}
                                  <span className="price-vnd-label"> VND</span>
                                </span>
                              </td>
                              <td>
                                <span className={`status-delivery-tag ${o.status}`}>
                                  {getStatusLabel(o.status).toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <>
                            <tr>
                              <td className="green-text font-bold">#ORD-5521</td>
                              <td>Solar-Powered Power Bank X1</td>
                              <td>12 Tháng 5, 2024</td>
                              <td>5,450,000 VND</td>
                              <td><span className="status-delivery-tag completed">ĐÃ GIAO THÀNH CÔNG</span></td>
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
                <h2>Sổ Khách Hàng</h2>
                <p className="view-desc">Danh sách khách hàng đăng ký. Hiển thị phiếu sửa chữa và đơn hàng.</p>

                <div className="table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>Địa chỉ email</th>
                        <th>Số điện thoại</th>
                        <th>Ngày tham gia</th>
                        <th>Yêu cầu sửa chữa</th>
                        <th>Đơn hàng đã đặt</th>
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
                            <td>{new Date(c.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td><span className="count-badge green">{bookingsCount} lịch hẹn</span></td>
                            <td><span className="count-badge blue">{ordersCount} đơn hàng</span></td>
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

              {/* Hero Banner Upload Section */}
              <div className="stats-card-widget glass-panel" style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>🎨 Quản Lý Banner Carousel Trang Chủ</h3>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#F59E0B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}
                    onClick={() => {
                      const newBanner = {
                        id: Date.now(),
                        badge: '🎯 NEW BANNER',
                        title: 'Tiêu đề banner mới',
                        titleHighlight: 'nổi bật',
                        subtitle: 'Mô tả ngắn của banner mới...',
                        image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800',
                        actionLink: ''
                      };
                      const updatedBanners = [...heroBanners, newBanner];
                      setHeroBanners(updatedBanners);
                      setCurrentBannerIndex(updatedBanners.length - 1);
                      alert('✅ Đã thêm banner mới vào carousel! Bạn có thể chỉnh sửa chi tiết ở biểu mẫu bên dưới.');
                    }}
                  >
                    ➕ Thêm Banner Mới
                  </button>
                </div>

                {/* Current Banners Preview */}
                {heroBanners.length > 0 && (
                  <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--neutral-lightest)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--neutral-dark)' }}>📸 Banner Carousel ({heroBanners.length} slides)</h4>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {heroBanners.map((banner, idx) => (
                        <div key={banner.id} style={{ position: 'relative', minWidth: '200px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: idx === currentBannerIndex ? '3px solid #F59E0B' : '2px solid var(--border-color)', cursor: 'pointer' }}
                          onClick={() => setCurrentBannerIndex(idx)}
                        >
                          <img src={banner.image} alt={`Banner ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            #{idx + 1}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = heroBanners.filter(b => b.id !== banner.id);
                              setHeroBanners(updated);
                              if (currentBannerIndex >= updated.length) {
                                setCurrentBannerIndex(Math.max(0, updated.length - 1));
                              }
                            }}
                            style={{ position: 'absolute', top: '8px', right: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                  <div className="hero-upload-area" style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '32px', background: 'var(--neutral-lightest)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', cursor: heroBanners[currentBannerIndex] ? 'pointer' : 'not-allowed', transition: 'all 0.3s', opacity: heroBanners[currentBannerIndex] ? 1 : 0.6 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!heroBanners[currentBannerIndex]) return;
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => updateCurrentBanner('image', ev.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    onClick={() => {
                      if (!heroBanners[currentBannerIndex]) return;
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => updateCurrentBanner('image', ev.target.result);
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    {heroBanners[currentBannerIndex]?.image ? (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <img src={heroBanners[currentBannerIndex].image} alt="Hero Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                        <button
                          onClick={(e) => { e.stopPropagation(); updateCurrentBanner('image', ''); }}
                          style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
                        <h4 style={{ marginBottom: '8px', color: 'var(--neutral-dark)' }}>Kéo thả hoặc nhấn để tải ảnh lên</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--neutral-medium)', marginBottom: '16px' }}>Hỗ trợ: JPG, PNG, GIF (tối đa 10MB)</p>
                        <button type="button" className="btn btn-primary" style={{ background: '#F59E0B', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold' }} disabled={!heroBanners[currentBannerIndex]}>
                          Chọn Ảnh
                        </button>
                      </>
                    )}
                  </div>

                  <div className="hero-settings" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label-sm">NHÃN NHỎ (BADGE)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="BADGE..."
                        disabled={!heroBanners[currentBannerIndex]}
                        value={heroBanners[currentBannerIndex]?.badge || ''}
                        onChange={e => updateCurrentBanner('badge', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-sm">TIÊU ĐỀ BANNER</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tái sinh thiết bị của bạn..."
                        disabled={!heroBanners[currentBannerIndex]}
                        value={heroBanners[currentBannerIndex]?.title || ''}
                        onChange={e => updateCurrentBanner('title', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-sm">CHỮ NỔI BẬT</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="với Trí tuệ Nhân tạo..."
                        disabled={!heroBanners[currentBannerIndex]}
                        value={heroBanners[currentBannerIndex]?.titleHighlight || ''}
                        onChange={e => updateCurrentBanner('titleHighlight', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-sm">MÔ TẢ NGẮN</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Hệ thống chẩn đoán lỗi bằng AI..."
                        disabled={!heroBanners[currentBannerIndex]}
                        value={heroBanners[currentBannerIndex]?.subtitle || ''}
                        onChange={e => updateCurrentBanner('subtitle', e.target.value)}
                      ></textarea>
                    </div>
                    <div className="form-group">
                      <label className="form-label-sm">LINK HÀNH ĐỘNG</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="/booking hoặc URL đầy đủ"
                        disabled={!heroBanners[currentBannerIndex]}
                        value={heroBanners[currentBannerIndex]?.actionLink || ''}
                        onChange={e => updateCurrentBanner('actionLink', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ background: '#10B981', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: 'auto' }}
                      onClick={handleSaveBanners}
                      disabled={heroBanners.length === 0}
                    >
                      💾 Lưu Banner
                    </button>
                  </div>
                </div>
              </div>

              {/* Features Section Editor */}
              <div className="stats-card-widget glass-panel" style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>📝 Chỉnh Sửa Section "Vì sao TechCycle"</h3>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#F59E0B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}
                    onClick={() => {
                      setFeatureItems(prev => [...prev, {
                        featureIcon: 'cpu',
                        featureTitle: 'Tiêu đề mới',
                        featureDesc: 'Mô tả tính năng mới...'
                      }]);
                    }}
                  >
                    ➕ Thêm Tính Năng
                  </button>
                </div>

                {/* Section-level fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label-sm">TIÊU ĐỀ PHỤ (SUBTITLE)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Lựa chọn bền vững"
                      value={featureSectionSubtitle}
                      onChange={e => setFeatureSectionSubtitle(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label-sm">TIÊU ĐỀ CHÍNH</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Vì sao TechCycle là lựa chọn hàng đầu?"
                      value={featureSectionTitle}
                      onChange={e => setFeatureSectionTitle(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label-sm">MÔ TẢ SECTION</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Chúng tôi hướng đến xây dựng..."
                    value={featureSectionDesc}
                    onChange={e => setFeatureSectionDesc(e.target.value)}
                  ></textarea>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label-sm">HÌNH ẢNH MINH HỌA SECTION (BÊN PHẢI)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div
                      className="hero-upload-area"
                      style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '24px', background: 'var(--neutral-lightest)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', cursor: 'pointer', transition: 'all 0.3s' }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setFeatureSectionImage(ev.target.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setFeatureSectionImage(ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      {featureSectionImage ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative', textAlign: 'center' }}>
                          <img src={featureSectionImage} alt="Features Section Visual" style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                          <button
                            onClick={(e) => { e.stopPropagation(); setFeatureSectionImage(''); }}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >×</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
                          <h5 style={{ marginBottom: '4px', color: 'var(--neutral-dark)' }}>Kéo thả hoặc click tải ảnh</h5>
                          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-medium)', marginBottom: '8px' }}>Hỗ trợ: JPG, PNG, WEBP</p>
                          <button type="button" className="btn btn-primary btn-sm" style={{ background: '#F59E0B', border: 'none', fontWeight: 'bold' }}>
                            Chọn Ảnh
                          </button>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <label className="form-label-sm" style={{ marginBottom: '8px' }}>ĐƯỜNG DẪN ẢNH (HOẶC BASE64)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập đường dẫn ảnh Unsplash hoặc Base64..."
                        value={featureSectionImage || ''}
                        onChange={e => setFeatureSectionImage(e.target.value)}
                      />
                      <p style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', marginTop: '8px' }}>
                        Khuyên dùng: Ảnh vuông hoặc ảnh ngang tỷ lệ 4:3 sắc nét (VD: Unsplash). Dùng nút bên trái để tải ảnh từ máy tính.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  {featureItems.map((item, idx) => (
                    <div key={idx} style={{ padding: '16px', background: 'var(--neutral-lightest)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--neutral-dark)' }}>Tính năng #{idx + 1}</span>
                        <button
                          onClick={() => setFeatureItems(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >🗑️ Xóa</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label-sm">ICON</label>
                          <select
                            className="form-control"
                            value={item.featureIcon}
                            onChange={e => {
                              const updated = [...featureItems];
                              updated[idx] = { ...updated[idx], featureIcon: e.target.value };
                              setFeatureItems(updated);
                            }}
                          >
                            <option value="cpu">🖥️ CPU (Chẩn đoán)</option>
                            <option value="recycle">♻️ Recycle (Tái chế)</option>
                            <option value="shield">🛡️ Shield (Bảo vệ)</option>
                            <option value="sparkles">✨ Sparkles (Nổi bật)</option>
                            <option value="check">✅ Check (Xác nhận)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label-sm">TIÊU ĐỀ TÍNH NĂNG</label>
                          <input
                            type="text"
                            className="form-control"
                            value={item.featureTitle}
                            onChange={e => {
                              const updated = [...featureItems];
                              updated[idx] = { ...updated[idx], featureTitle: e.target.value };
                              setFeatureItems(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: '8px' }}>
                        <label className="form-label-sm">MÔ TẢ</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={item.featureDesc}
                          onChange={e => {
                            const updated = [...featureItems];
                            updated[idx] = { ...updated[idx], featureDesc: e.target.value };
                            setFeatureItems(updated);
                          }}
                        ></textarea>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#10B981', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold' }}
                  onClick={handleSaveFeatures}
                  disabled={featureItems.length === 0}
                >
                  💾 Lưu Nội Dung Section
                </button>
              </div>

              <div className="seller-main-layout-grid" style={{ gridTemplateColumns: '1fr', display: 'grid', gap: '28px' }}>
                <div className="layout-col-left" style={{ width: '100%' }}>
                  <div className="stats-card-widget glass-panel">
                    <h3 className="mb-4">Danh Sách Mã Khuyến Mãi</h3>
                    <div className="promos-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
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

                <div className="layout-col-right" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
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
                          min="1"
                          max="99"
                          value={newPromoDiscount}
                          onChange={e => setNewPromoDiscount(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label-sm">HẠN SỬ DỤNG (NGÀY & GIỜ HẾT HẠN)</label>
                        <input
                          type="datetime-local"
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
                          <span className="switch-slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: newPromoActive ? '#F59E03' : '#ffffff', border: '1px solid #E5E7EB', borderRadius: '24px', transition: '0.4s' }}></span>
                        </label>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ background: '#006D44', color: '#fff', width: '100%', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
                        Tạo Mã Khuyến Mãi
                      </button>
                    </form>
                  </div>

                  <div className="stats-card-widget glass-panel">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📢 Gửi Thông Báo</h3>
                    <form onSubmit={handleCreateNotification} className="quick-code-form" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label-sm">ĐỐI TƯỢNG NHẬN</label>
                        <select
                          className="form-control"
                          value={notifTargetRole}
                          onChange={e => setNotifTargetRole(e.target.value)}
                        >
                          <option value="all">Toàn bộ người dùng</option>
                          <option value="technician">Thợ kỹ thuật</option>
                          <option value="seller">Người bán (Seller)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label-sm">TIÊU ĐỀ THÔNG BÁO</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Tiêu đề thông báo..."
                          value={notifTitle}
                          onChange={e => setNotifTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label-sm">NỘI DUNG CHI TIẾT</label>
                        <textarea
                          className="form-control"
                          rows="4"
                          placeholder="Nội dung gửi đến người dùng..."
                          value={notifMessage}
                          onChange={e => setNotifMessage(e.target.value)}
                          required
                        ></textarea>
                      </div>
                      <div className="form-group">
                        <label className="form-label-sm">ẢNH MINH HỌA (URL)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://example.com/image.jpg (tùy chọn)"
                          value={notifImage}
                          onChange={e => setNotifImage(e.target.value)}
                        />
                        {notifImage && (
                          <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={notifImage} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                      <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
                        Gửi Thông Báo
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'chat' && (
            <div className="animate-fade" style={{ height: 'calc(100vh - 160px)', minHeight: '520px' }}>
              <InternalChatPanel
                staffList={internalStaffList}
                selectedConversation={selectedConversation}
                chatMessages={chatMessages}
                newMessage={newMessage}
                isLoading={chatLoading}
                isUploadingImage={isUploadingImage}
                typingUsers={typingUsers}
                unreadSenders={unreadSenders}
                onSelectStaff={handleSelectStaff}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onImageUpload={handleImageUpload}
              />
            </div>
          )}
        </main>
      </div>

      {viewingUser && subTab === 'users' && createPortal(
        <div className="modal-backdrop" onClick={() => setViewingUser(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi Tiết Đăng Ký Tài Khoản</h3>
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
                <div className="info-item"><strong>ID Tài Khoản:</strong> <span>{viewingUser.id}</span></div>
                <div className="info-item"><strong>Địa chỉ Email:</strong> <span>{viewingUser.email}</span></div>
                <div className="info-item"><strong>Số điện thoại:</strong> <span>{viewingUser.phone || 'N/A'}</span></div>
                <div className="info-item"><strong>Ngày gia nhập:</strong> <span>{new Date(viewingUser.createdAt).toLocaleString('vi-VN')}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setViewingUser(null)}>Đóng</button>
              {viewingUser.id !== user.id && viewingUser.role !== 'admin' && (
                <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm("Bạn có chắc chắn muốn xóa?")) handleDeleteUser(viewingUser.id); }} style={{ background: '#ef4444', color: '#fff' }}>
                  Xóa tài khoản
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingProduct && createPortal(
        <div className="modal-backdrop" onClick={() => setEditingProduct(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ width: '680px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>Chỉnh Sửa Thiết Bị</h3>
              <button className="close-btn" onClick={() => setEditingProduct(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditProduct}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '20px' }}>
                {/* Left column: Image preview & File upload button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', alignSelf: 'flex-start', margin: 0 }}>Ảnh thiết bị</label>
                  <div
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setEditProdImage(ev.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    onMouseEnter={() => setIsEditImageHovered(true)}
                    onMouseLeave={() => setIsEditImageHovered(false)}
                    style={{
                      width: '100%',
                      height: '180px',
                      borderRadius: '12px',
                      border: `2px dashed ${isEditImageHovered ? '#006D44' : 'var(--border-color)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      background: isEditImageHovered ? 'rgba(0, 109, 68, 0.03)' : 'rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Click để chọn ảnh từ máy tính"
                  >
                    {editProdImage ? (
                      <>
                        <img
                          src={editProdImage}
                          alt="Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            background: 'rgba(0,0,0,0.15)',
                            display: 'block'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling && (e.target.nextSibling.style.display = 'none');
                            e.target.parentElement.querySelector('.img-error-placeholder') &&
                              (e.target.parentElement.querySelector('.img-error-placeholder').style.display = 'flex');
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          opacity: isEditImageHovered ? 1 : 0,
                          transition: 'opacity 0.2s ease-in-out',
                          pointerEvents: 'none'
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>📷</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Click để đổi ảnh</span>
                        </div>
                        <div className="img-error-placeholder" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-color)', opacity: 0.6, position: 'absolute', inset: 0, justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.8rem' }}>🖼️</span>
                          <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>Ảnh không tải được</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-color)', opacity: 0.6 }}>
                        <span style={{ fontSize: '1.8rem' }}>📷</span>
                        <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>Chọn ảnh</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #006D44',
                      color: '#006D44',
                      cursor: 'pointer',
                      background: 'none',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setEditProdImage(ev.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    📁 Tải ảnh từ file
                  </button>
                </div>

                {/* Right column: Form fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        <option value="AirConditioner">Điều hòa</option>
                        <option value="WashingMachine">Máy giặt</option>
                        <option value="Refrigerator">Tủ lạnh</option>
                        <option value="Microwave">Lò vi sóng</option>
                        <option value="Audio">Âm thanh</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Smartwatch">Đồng hồ thông minh</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Chất lượng kiểm định</label>
                      <select
                        className="form-control"
                        value={editProdCondition}
                        onChange={e => setEditProdCondition(e.target.value)}
                      >
                        <option value="excellent">Như mới (99%)</option>
                        <option value="good">Rất tốt (&gt;90%)</option>
                        <option value="fair">Tốt (&gt;80%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Đường dẫn ảnh (Image URL)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editProdImage && editProdImage.startsWith('data:image/') ? '[Tải lên từ file]' : editProdImage}
                        onChange={e => setEditProdImage(e.target.value)}
                        placeholder="Nhập đường dẫn ảnh..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>Trạng thái</label>
                      <select
                        className="form-control"
                        value={editProdStatus}
                        onChange={e => setEditProdStatus(e.target.value)}
                      >
                        <option value="available">Còn hàng</option>
                        <option value="sold">Đã bán</option>
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
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingProduct(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ backgroundColor: '#006D44', borderColor: '#006D44', color: '#fff' }}>Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showAvatarModal && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminDashboard;

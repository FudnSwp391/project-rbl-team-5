import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import {
  LayoutDashboard, ShoppingBag, Calendar, Plus, Trash2,
  Users, Sun, Moon, Search, Bell, Settings, HelpCircle, LogOut,
  MapPin, CreditCard, Pencil, Tag, ArrowLeft, MessageSquare, Send, Image, Paperclip, X, Menu
} from 'lucide-react';
import ProfileSettings from '../../components/ProfileSettings';
import { getProductImage } from '../../components/ProductCard';
import ChatPanel from '../../components/ChatPanel';
import InternalChatPanel from '../../components/InternalChatPanel';
import NotificationBell from '../../components/NotificationBell';
import useConsultationChat from '../../hooks/useConsultationChat';
import useInternalChat from '../../hooks/useInternalChat';
import useNotifications from '../../hooks/useNotifications';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)) ? `${window.location.protocol}//${window.location.hostname}:5000` : '';

const SellerDashboard = ({ setActivePage, theme, setTheme, initialSubTab, setInitialSubTab }) => {
  const { user, token, getAvatarUrl, logout } = useAuth();
  const subTab = initialSubTab || 'stats';
  const setSubTab = setInitialSubTab;
  const [viewingUser, setViewingUser] = useState(null);
  const fileInputRef = useRef(null);

  // --- DATA STATES ---
  const [stats, setStats] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [techsList, setTechsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CHAT SYSTEM STATES ---
  const [chatConversations, setChatConversations] = useState([]);
  const {
    selectedConversation,
    setSelectedConversation,
    chatMessages,
    newMessage,
    isUploadingImage,
    isLoading: chatLoading,
    unreadCount,
    unreadConversations,
    typingUsers,
    handleSelectConversation,
    handleSendMessage,
    handleImageUpload,
    handleTyping,
    markChatViewActive
  } = useConsultationChat(user, token);

  // --- INTERNAL CHAT HOOK ---
  const {
    selectedConversation: internalConversation,
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

  const internalStaffList = usersList.filter(u => u.role === 'admin' || u.role === 'technician');

  const handleGlobalEvent = useCallback((eventName, data) => {
    if (eventName === 'newOrder' || eventName === 'newBooking' || eventName === 'newOrderForSeller' || eventName === 'newBookingForSeller') {
      if (eventName === 'newOrder') setNewOrderCount(prev => prev + 1);
      if (eventName === 'newBooking') setNewBookingCount(prev => prev + 1);
      fetchData();
    }
  }, []);

  const { notifications, clearAllNotifications } = useNotifications(user, token, handleGlobalEvent);

  const socketRef = useRef(null);

  const handleAcceptConsultation = async (conversationId) => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Đã nhận tư vấn thành công!');
        fetchData();
        if (selectedConversation && selectedConversation.id === conversationId) {
          setSelectedConversation({
            ...selectedConversation,
            status: 'active',
            seller_id: user.id,
            sellerName: user.username,
            sellerAvatar: user.avatar
          });
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Lỗi nhận tư vấn');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  const handleStartCustomerChat = (customerId) => {
    const customerBookings = chatConversations.filter(b => b.customerId === customerId);
    if (customerBookings.length > 0) {
      const latestBooking = [...customerBookings].sort((a, b) => b.id - a.id)[0];
      handleSelectConversation(latestBooking);
      setSubTab('chat');
    } else {
      alert("Khách hàng này chưa có yêu cầu tư vấn nào.");
    }
  };

  useEffect(() => {
    if (subTab === 'chat') {
      markChatViewActive(true);
      markInternalChatActive(false);
    } else if (subTab === 'internal-chat') {
      markChatViewActive(false);
      markInternalChatActive(true);
    } else {
      markChatViewActive(false);
      markInternalChatActive(false);
    }
  }, [subTab, markChatViewActive, markInternalChatActive]);

  // --- PAGINATION STATES ---
  const [ordersPage, setOrdersPage] = useState(1);
  const [bookingsPage, setBookingsPage] = useState(1);
  const itemsPerPage = 10;

  // --- RESCHEDULE STATES ---
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00 AM');

  // --- SELLER HOMEPAGE STATES ---
  const [estimatedValue, setEstimatedValue] = useState(null);
  const [valuationName, setValuationName] = useState('');
  const [valuationCondition, setValuationCondition] = useState('Cấp A (Như mới)');
  const [valuationCapacity, setValuationCapacity] = useState('128 GB');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

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
  const [inventorySearch, setInventorySearch] = useState('');
  const [productsSearch, setProductsSearch] = useState('');
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
  const [notifImageFile, setNotifImageFile] = useState(null);

  const fetchData = async (isInitial = false) => {
    if (!user || !token) return;
    if (isInitial) setLoading(true);
    // Do not reset pagination on background refresh
    if (isInitial) {
      setOrdersPage(1);
      setBookingsPage(1);
    }
    try {
      const resBookings = await fetch(`${API_BASE}/api/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataBookings = await resBookings.json();
      if (Array.isArray(dataBookings)) {
        setBookingsList(dataBookings);
      }

      // 4. Fetch users for internal chat
      try {
        const resUsers = await fetch(`${API_BASE}/api/users/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resUsers.ok) {
          const usersData = await resUsers.json();
          setUsersList(usersData);
        }
      } catch (e) {
        console.error('Error fetching users:', e);
      }

      const resStats = await fetch(`${API_BASE}/api/users/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataStats = await resStats.json();
      if (resStats.ok) setStats(dataStats);

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



      // Fetch pending consultations and my active consultations
      const [resPending, resMyConvs] = await Promise.all([
        fetch(`${API_BASE}/api/conversations/pending`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/conversations/my`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const dataPending = await resPending.json();
      const dataMyConvs = await resMyConvs.json();

      let allConvs = [];
      if (Array.isArray(dataPending)) allConvs = [...allConvs, ...dataPending];
      if (Array.isArray(dataMyConvs)) allConvs = [...allConvs, ...dataMyConvs];

      // Deduplicate by ID just in case
      const uniqueConvs = Array.from(new Map(allConvs.map(item => [item.id, item])).values());
      // Sort: pending first, then by updated
      uniqueConvs.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      });

      setChatConversations(uniqueConvs);

    } catch (err) {
      console.error('Lỗi tải dữ liệu bảng điều khiển:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- WEBSOCKET CHAT LOGIC ---
  useEffect(() => {
    if (!user) return;
    const socketRefObj = { current: io(`${API_BASE}`) };
    socketRefObj.current.emit('registerUser', user.id);

    socketRefObj.current.on('newOrderForSeller', (data) => {
      alert(`🔔 [ĐƠN HÀNG MỚI] ${data.message}`);
      fetchData();
    });

    socketRefObj.current.on('newBookingForSeller', (data) => {
      alert(`🔔 [LỊCH HẸN MỚI] ${data.message}`);
      fetchData();
    });

    // Lắng nghe yêu cầu tư vấn mới từ Customer → cập nhật list ngay lập tức
    socketRefObj.current.on('newConsultationRequest', (newConv) => {
      setChatConversations(prev => {
        // Tránh trùng lặp
        if (prev.some(c => c.id === newConv.id)) return prev;
        // Thêm vào đầu danh sách (mới nhất trước)
        return [newConv, ...prev];
      });
    });

    return () => {
      if (socketRefObj.current) socketRefObj.current.disconnect();
    };
  }, [user]);

  useEffect(() => {
    fetchData(true);
  }, [user, token]);

  useEffect(() => {
    setSelectedConversation(null);
  }, [subTab, setSelectedConversation]);

  useEffect(() => {
    markInternalChatActive(subTab === 'internal-chat');
  }, [subTab, markInternalChatActive]);

  const handleLogout = () => {
    logout();
    window.location.hash = '#/auth';
  };

  const handleEstimateValue = (e) => {
    e.preventDefault();
    if (!valuationName.trim()) {
      alert("Vui lòng nhập tên thiết bị.");
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

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert("Vui lòng điền đầy đủ tiêu đề và nội dung thông báo.");
      return;
    }

    let imageUrl = notifImage;

    // If user uploaded a file, upload it first
    if (notifImageFile) {
      try {
        const formData = new FormData();
        formData.append('image', notifImageFile);

        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.imageUrl || uploadData.url;
        } else {
          alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
          return;
        }
      } catch (err) {
        console.error('Lỗi upload ảnh:', err);
        alert('Không thể tải ảnh lên.');
        return;
      }
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
          image: imageUrl
        })
      });
      if (res.ok) {
        alert("Thông báo đã được gửi thành công đến toàn bộ người dùng!");
        setNotifTitle('');
        setNotifMessage('');
        setNotifImage('');
        setNotifImageFile(null);
      } else {
        const errData = await res.json();
        alert(`Lỗi gửi thông báo: ${errData.message || 'Không xác định'}`);
      }
    } catch (err) {
      console.error('Lỗi gửi thông báo:', err);
      alert('Không thể kết nối đến máy chủ.');
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
      console.error('Lỗi click thông báo:', err);
    }

    if (notif.type === 'chat') {
      setSubTab('internal-chat');
    }
  };


  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNotifImageFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setNotifImage(previewUrl);
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
      console.error(err);
      alert('Lỗi kết nối');
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

  // --- PDF EXPORT ---
  const handleExportPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Calculate statistics
    const totalOrders = ordersList.length;
    const completedOrders = ordersList.filter(o => o.status === 'completed').length;
    const pendingOrders = ordersList.filter(o => ['pending', 'reserved', 'waiting_payment'].includes(o.status)).length;
    const canceledOrders = ordersList.filter(o => o.status === 'canceled' || o.status === 'cancelled').length;
    const totalRevenue = ordersList
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalProducts = productsList.length;
    const activeProducts = productsList.filter(p => p.status === 'available' || p.status === 'active').length;
    const soldProducts = productsList.filter(p => p.status === 'sold_out' || p.status === 'sold').length;
    const totalBookings = bookingsList.length;

    const getCategoryVN = (cat) => {
      switch (cat) {
        case 'AirConditioner': return 'Máy lạnh';
        case 'WashingMachine': return 'Máy giặt';
        case 'Refrigerator': return 'Tủ lạnh';
        case 'Audio': return 'Tai nghe';
        case 'Laptop': return 'Laptop';
        case 'Smartwatch': return 'Đồng hồ';
        default: return cat || 'Gia dụng';
      }
    };

    const getCondVN = (cond) => {
      switch (cond) {
        case 'excellent': return 'Như mới';
        case 'good': return 'Rất tốt';
        case 'fair': return 'Khá tốt';
        default: return cond || '-';
      }
    };

    const getStatusVN = (st) => {
      switch (st) {
        case 'pending': return 'Đang chờ';
        case 'completed': return 'Hoàn thành';
        case 'canceled': case 'cancelled': return 'Đã hủy';
        case 'reserved': return 'Đã giữ chỗ';
        case 'active': case 'available': return 'Còn hàng';
        case 'sold_out': case 'sold': return 'Đã bán';
        case 'waiting_payment': return 'Chờ thanh toán';
        case 'assigned': return 'Đã phân công';
        case 'inspecting': return 'Đang kiểm tra';
        case 'repairing': return 'Đang sửa chữa';
        case 'confirmed': return 'Đã xác nhận';
        default: return st || '-';
      }
    };

    // Build products table rows
    const productRows = productsList.map((p, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${p.name || '-'}</td>
        <td style="text-align:center">${getCategoryVN(p.category)}</td>
        <td style="text-align:center">${getCondVN(p.condition)}</td>
        <td style="text-align:right">${(p.price || 0).toLocaleString('vi-VN')} ₫</td>
        <td style="text-align:center">${getStatusVN(p.status)}</td>
      </tr>
    `).join('');

    // Build orders table rows (latest 20)
    const recentOrders = [...ordersList].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 20);
    const orderRows = recentOrders.map((o, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>#${o.invoiceNumber || o.id}</td>
        <td style="text-align:right">${(o.totalAmount || 0).toLocaleString('vi-VN')} ₫</td>
        <td style="text-align:center">${getStatusVN(o.status)}</td>
        <td style="text-align:center">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
      </tr>
    `).join('');

    // Build bookings table rows (latest 20)
    const recentBookings = [...bookingsList].sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)).slice(0, 20);
    const bookingRows = recentBookings.map((b, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>#${b.id}</td>
        <td>${b.device_type || b.deviceType || '-'}</td>
        <td style="text-align:center">${getStatusVN(b.status)}</td>
        <td style="text-align:center">${(b.appointment_date || b.created_at || b.createdAt) ? new Date(b.appointment_date || b.created_at || b.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
      </tr>
    `).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Kinh Doanh - TechCycle</title>
  <style>
    @page { size: A4; margin: 18mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', 'Be Vietnam Pro', system-ui, Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #006D44; padding-bottom: 12px; margin-bottom: 20px; }
    .header-left h1 { font-size: 20px; color: #006D44; margin-bottom: 2px; }
    .header-left p { font-size: 11px; color: #666; }
    .header-right { text-align: right; font-size: 10px; color: #888; }
    .header-right .shop-name { font-size: 13px; font-weight: 700; color: #333; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
    .stat-box { border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; text-align: center; }
    .stat-box .stat-number { font-size: 22px; font-weight: 800; color: #006D44; }
    .stat-box .stat-label { font-size: 10px; color: #777; text-transform: uppercase; margin-top: 2px; letter-spacing: 0.5px; }
    .stat-box.revenue .stat-number { color: #D97706; }
    .stat-box.pending .stat-number { color: #F59E0B; }
    .stat-box.canceled .stat-number { color: #EF4444; }

    .section-title { font-size: 14px; font-weight: 700; color: #006D44; margin: 20px 0 10px 0; padding-bottom: 4px; border-bottom: 1.5px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 16px; }
    th { background: #006D44; color: #fff; padding: 7px 8px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #f9fafb; }

    .footer { margin-top: 30px; padding-top: 12px; border-top: 1.5px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; }
    .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 200px; }
    .signature-box .sig-title { font-size: 11px; font-weight: 700; color: #333; margin-bottom: 50px; }
    .signature-box .sig-line { border-top: 1px solid #999; padding-top: 4px; font-size: 10px; color: #666; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>♻️ TechCycle</h1>
      <p>Nền tảng mua bán & sửa chữa thiết bị điện tử tân trang</p>
    </div>
    <div class="header-right">
      <div class="shop-name">${user?.username || 'Người bán'}</div>
      <div>Ngày xuất: ${dateStr} lúc ${timeStr}</div>
      <div>Email: ${user?.email || '-'}</div>
    </div>
  </div>

  <h2 style="text-align:center; font-size:16px; color:#1a1a1a; margin-bottom:18px;">BÁO CÁO TỔNG HỢP KINH DOANH</h2>

  <div class="stats-grid">
    <div class="stat-box revenue">
      <div class="stat-number">${totalRevenue.toLocaleString('vi-VN')} ₫</div>
      <div class="stat-label">Doanh thu (Hoàn thành)</div>
    </div>
    <div class="stat-box">
      <div class="stat-number">${totalOrders}</div>
      <div class="stat-label">Tổng đơn hàng</div>
    </div>
    <div class="stat-box pending">
      <div class="stat-number">${pendingOrders}</div>
      <div class="stat-label">Đang chờ xử lý</div>
    </div>
    <div class="stat-box canceled">
      <div class="stat-number">${canceledOrders}</div>
      <div class="stat-label">Đã hủy</div>
    </div>
  </div>

  <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
    <div class="stat-box">
      <div class="stat-number">${totalProducts}</div>
      <div class="stat-label">Tổng sản phẩm</div>
    </div>
    <div class="stat-box">
      <div class="stat-number">${activeProducts}</div>
      <div class="stat-label">Đang bán</div>
    </div>
    <div class="stat-box">
      <div class="stat-number">${totalBookings}</div>
      <div class="stat-label">Lịch hẹn sửa chữa</div>
    </div>
  </div>

  <div class="section-title">📦 Danh Sách Sản Phẩm Kho Hàng (${totalProducts} sản phẩm)</div>
  <table>
    <thead><tr><th style="width:30px">#</th><th>Tên thiết bị</th><th style="text-align:center">Danh mục</th><th style="text-align:center">Tình trạng</th><th style="text-align:right">Giá bán</th><th style="text-align:center">Trạng thái</th></tr></thead>
    <tbody>${productRows || '<tr><td colspan="6" style="text-align:center;color:#999">Không có sản phẩm</td></tr>'}</tbody>
  </table>

  <div class="section-title">🧾 Đơn Hàng Gần Đây (${Math.min(recentOrders.length, 20)} / ${totalOrders} đơn)</div>
  <table>
    <thead><tr><th style="width:30px">#</th><th>Mã đơn</th><th style="text-align:right">Tổng tiền</th><th style="text-align:center">Trạng thái</th><th style="text-align:center">Ngày tạo</th></tr></thead>
    <tbody>${orderRows || '<tr><td colspan="5" style="text-align:center;color:#999">Không có đơn hàng</td></tr>'}</tbody>
  </table>

  <div class="section-title">🔧 Lịch Hẹn Sửa Chữa Gần Đây (${Math.min(recentBookings.length, 20)} / ${totalBookings} phiếu)</div>
  <table>
    <thead><tr><th style="width:30px">#</th><th>Mã phiếu</th><th>Thiết bị</th><th style="text-align:center">Trạng thái</th><th style="text-align:center">Ngày hẹn</th></tr></thead>
    <tbody>${bookingRows || '<tr><td colspan="5" style="text-align:center;color:#999">Không có lịch hẹn</td></tr>'}</tbody>
  </table>

  <div class="signature-area">
    <div class="signature-box">
      <div class="sig-title">Người lập báo cáo</div>
      <div class="sig-line">${user?.username || '_______________'}</div>
    </div>
    <div class="signature-box">
      <div class="sig-title">Xác nhận của quản lý</div>
      <div class="sig-line">_______________</div>
    </div>
  </div>

  <div class="footer">
    <span>TechCycle © ${now.getFullYear()} — Báo cáo tự động</span>
    <span>Trang 1</span>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 400);
    } else {
      alert('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để xuất PDF.');
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

  const combinedItems = [
    ...ordersList.map(o => ({
      id: o.id,
      type: 'order',
      invoiceNumber: o.invoiceNumber || o.id,
      title: `Đơn #${o.invoiceNumber || o.id}`,
      status: o.status,
      amount: o.totalAmount,
      date: o.createdAt || new Date(),
    })),
    ...bookingsList.map(b => ({
      id: b.id,
      type: 'booking',
      title: `Lịch hẹn #${b.id}`,
      deviceType: b.device_type || b.deviceType || 'Thiết bị',
      status: b.status,
      date: b.created_at || b.createdAt || b.appointment_date || new Date(),
    }))
  ];

  combinedItems.sort((a, b) => new Date(b.date) - new Date(a.date));
  const [showMobileSidebar, setShowMobileSidebar] = useState(false); // Default to false on mobile viewports

  const handleNavClick = (tab) => {
    setSubTab(tab);
    setShowMobileSidebar(false);
  };

  const activeOrdersPage = ordersPage;
  const activeBookingsPage = bookingsPage;
  const safeOrdersList = Array.isArray(ordersList) ? ordersList : [];
  const safeBookingsList = Array.isArray(bookingsList) ? bookingsList : [];
  const totalOrderPages = Math.ceil(safeOrdersList.length / itemsPerPage) || 1;
  const totalBookingPages = Math.ceil(safeBookingsList.length / itemsPerPage) || 1;

  const ordersStartIdx = (activeOrdersPage - 1) * itemsPerPage;
  const currentOrders = safeOrdersList.slice(ordersStartIdx, ordersStartIdx + itemsPerPage);

  const bookingsStartIdx = (activeBookingsPage - 1) * itemsPerPage;
  const currentBookings = safeBookingsList.slice(bookingsStartIdx, bookingsStartIdx + itemsPerPage);

  const totalPurchased = safeOrdersList.filter(o => o && o.status === 'completed').length;
  const totalPending = safeOrdersList.filter(o => o && ['pending', 'reserved', 'waiting_payment'].includes(o.status)).length;
  const totalCanceled = safeOrdersList.filter(o => o && (o.status === 'canceled' || o.status === 'cancelled')).length;

  return (
    <div className="dashboard-page admin-dashboard-layout seller-portal-layout animate-fade">
      <div className="dashboard-grid-layout">

        {/* Sidebar Nav */}
        <aside className={`dashboard-sidebar glass-panel ${showMobileSidebar ? 'mobile-show' : 'mobile-hide'}`}>
          <div className="sidebar-brand-logo" onClick={() => setActivePage('home')}>
            <div className="brand-icon-box">
              <LayoutDashboard className="brand-logo-icon" size={24} />
            </div>
            <div className="brand-text-wrapper">
              <h3>TechCycle</h3>
              <span>Kênh Người Bán</span>
            </div>
          </div>

          <nav className="sidebar-nav-menu">
            <button className={`sidebar-nav-btn ${subTab === 'stats' ? 'active' : ''}`} onClick={() => handleNavClick('stats')}>
              <LayoutDashboard size={18} />
              Bảng điều khiển
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'products' ? 'active' : ''}`} onClick={() => handleNavClick('products')}>
              <ShoppingBag size={18} />
              Danh sách sản phẩm
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'add-product' ? 'active' : ''}`} onClick={() => handleNavClick('add-product')}>
              <Plus size={18} />
              Thêm sản phẩm
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'chat' ? 'active' : ''}`} onClick={() => handleNavClick('chat')}>
              <MessageSquare size={20} />
              <span>Hỗ trợ Tư vấn</span>
              {unreadCount > 0 && <span className="nav-badge" style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{unreadCount}</span>}
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'internal-chat' ? 'active' : ''}`} onClick={() => handleNavClick('internal-chat')}>
              <MessageSquare size={20} />
              <span>Tin nhắn nội bộ</span>
              {internalUnreadCount > 0 && <span className="nav-badge" style={{ background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{internalUnreadCount}</span>}
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'bookings' ? 'active' : ''}`} onClick={() => { handleNavClick('bookings'); setNewOrderCount(0); setNewBookingCount(0); }}>
              <Calendar size={18} />
              <span>Đơn hàng & Đặt lịch</span>
              {(newOrderCount + newBookingCount) > 0 && (
                <span className="notif-badge" style={{ backgroundColor: '#EF4444', color: 'white', padding: '2px 6px', borderRadius: '50%', fontSize: '0.75rem', marginLeft: 'auto', fontWeight: 'bold' }}>
                  {newOrderCount + newBookingCount}
                </span>
              )}
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'customers' ? 'active' : ''}`} onClick={() => handleNavClick('customers')}>
              <Users size={18} />
              Khách hàng
            </button>
            <button className={`sidebar-nav-btn ${subTab === 'marketing' ? 'active' : ''}`} onClick={() => handleNavClick('marketing')}>
              <Tag size={18} />
              Mã giảm giá
            </button>
          </nav>

          <button className="new-report-btn seller-impact-btn" onClick={() => { handleExportPDF(); setShowMobileSidebar(false); }} title="Xuất báo cáo tác động PDF">
            Xuất báo cáo tác động
          </button>

          <div className="sidebar-bottom-nav">
            <button className={`sidebar-nav-btn bottom-btn ${subTab === 'settings' ? 'active' : ''}`} onClick={() => handleNavClick('settings')}>
              <Settings size={18} />
              Cài đặt
            </button>
            <button className="sidebar-nav-btn bottom-btn" onClick={() => { alert("Liên hệ hỗ trợ TechCycle tại support@techcycle.vn"); setShowMobileSidebar(false); }}>
              <HelpCircle size={18} />
              Trung tâm hỗ trợ
            </button>
            <button className="sidebar-nav-btn bottom-btn logout" onClick={() => { handleLogout(); setShowMobileSidebar(false); }}>
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
              <h3>Seller Portal</h3>
            </div>

            <h2 className="topbar-page-title">
              {subTab === 'stats' ? 'Bảng điều khiển' :
                subTab === 'products' ? 'Danh sách sản phẩm' :
                  subTab === 'add-product' ? 'Thêm sản phẩm mới' :
                    subTab === 'bookings' ? 'Quản lý đơn hàng' :
                      subTab === 'customers' ? 'Quản lý khách hàng' :
                        subTab === 'marketing' ? 'Chương trình khuyến mãi' :
                          subTab === 'chat' ? 'Tin nhắn hỗ trợ' :
                            subTab === 'internal-chat' ? 'Tin nhắn nội bộ' :
                              subTab === 'settings' ? 'Cài đặt tài khoản' : 'Bảng điều khiển'}
            </h2>

            <div style={{ flex: 1 }}></div>

            <div className="topbar-actions-profile">
              <button className="topbar-action-btn theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Chuyển đổi sáng/tối">
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

              <div className="topbar-divider"></div>

              <div className="topbar-profile-widget">
                <div className="profile-info">
                  <h4>Nhân Viên Bán Hàng</h4>
                  <span>Người bán</span>
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
            <div className="seller-dashboard-view animate-fade">
              {/* 3 small stats cards */}
              <div className="seller-stats-summary-grid">
                <div className="summary-stat-card glass-panel">
                  <div className="stat-data">
                    <span className="s-label">TỔNG DOANH THU</span>
                    <h3 className="s-val">245,890,000 VND</h3>
                    <span className="s-trend-up">+6% so với tháng trước</span>
                  </div>
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
                </div>

                {/* Right Column */}
                <div className="layout-col-right">
                  {/* Recent Orders */}
                  <div className="stats-card-widget glass-panel recent-orders-widget">
                    <div className="widget-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3>Đơn Hàng & Lịch Hẹn Gần Đây</h3>
                      <span className="details-text-link" style={{ fontSize: '0.85rem', color: '#006D44', cursor: 'pointer', fontWeight: 600 }} onClick={() => setSubTab('bookings')}>Xem tất cả &gt;</span>
                    </div>
                    <div className="seller-orders-list">
                      {combinedItems.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)', textAlign: 'center', padding: '16px' }}>
                          Chưa có đơn hàng hoặc lịch hẹn nào.
                        </p>
                      ) : (
                        combinedItems.map(item => (
                          <div className="order-ticket-row" key={`${item.type}-${item.id}`} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                              <span className={`order-icon ${item.type === 'order' ? 'green' : 'orange'}`}>
                                {item.type === 'order' ? '🚚' : '🛠'}
                              </span>
                              <div className="order-info-text">
                                <strong>{item.title}</strong>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--neutral-medium)' }}>
                                  {item.type === 'order'
                                    ? `${(item.amount || 0).toLocaleString('vi-VN')} VND • ${getStatusLabel(item.status)}`
                                    : `${item.deviceType} • ${getStatusLabel(item.status)}`
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Actions on the right */}
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              {item.type === 'order' && (item.status === 'pending' || item.status === 'reserved') && (
                                <button
                                  className="btn btn-primary btn-sm confirm-now-btn"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#006D44', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                                  onClick={() => handleConfirmOrderVisit(item.id)}
                                >
                                  XÁC NHẬN
                                </button>
                              )}

                              {item.type === 'order' && (item.status === 'pending' || item.status === 'confirmed' || item.status === 'reserved') && (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                                  onClick={() => handleCancelOrder(item.id)}
                                >
                                  HỦY
                                </button>
                              )}

                              {item.type === 'booking' && (item.status === 'pending' || item.status === 'confirmed') && (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                                  onClick={() => handleCancelBooking(item.id)}
                                >
                                  HỦY
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Management list */}
              <div className="stats-card-widget glass-panel seller-inventory-widget" style={{ marginTop: '24px' }}>
                <div className="widget-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                  <h3>Quản Lý Kho Hàng</h3>
                  <div className="d-flex align-items-center gap-2" style={{ marginLeft: 'auto' }}>
                    <div className="search-input-wrapper" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        style={{
                          padding: '6px 12px 6px 30px',
                          fontSize: '0.85rem',
                          borderRadius: '20px',
                          border: '1px solid var(--border-color)',
                          width: '180px',
                          backgroundColor: 'var(--white)',
                          color: 'var(--neutral-darkest)'
                        }}
                      />
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-medium)' }} />
                    </div>
                    <button className="icon-btn" onClick={handleExportPDF} title="Xuất báo cáo PDF">📥</button>
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
                      {(() => {
                        const filtered = productsList.filter(prod =>
                          prod.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                          (prod.category || '').toLowerCase().includes(inventorySearch.toLowerCase())
                        );
                        return filtered.length > 0 ? (
                          filtered.map((prod, idx) => (
                            <tr key={prod.id || idx}>
                              <td className="prod-cell">
                                <img src={getProductImage(prod)} alt={prod.name} className="mini-prod-thumb" />
                                <strong>{prod.name}</strong>
                              </td>
                              <td>
                                {prod.category === 'AirConditioner' ? 'Máy lạnh' :
                                  prod.category === 'WashingMachine' ? 'Máy giặt' :
                                    prod.category === 'Refrigerator' ? 'Tủ lạnh' :
                                      prod.category === 'Audio' ? 'Tai nghe' :
                                        prod.category === 'Laptop' ? 'Laptop' :
                                          prod.category === 'Smartwatch' ? 'Đồng hồ' :
                                            prod.category || 'Gia dụng'}
                              </td>
                              <td>{idx === 0 ? '12' : idx === 1 ? '03' : '05'} chiếc</td>
                              <td>{prod.price.toLocaleString('en-US')} VND</td>
                              <td><span className={`badge badge-${prod.status === 'available' ? 'completed' : 'pending'}`}>{prod.status === 'available' ? 'Còn hàng' : 'Hết hàng'}</span></td>
                              <td>
                                <button className="table-edit-btn" onClick={() => {
                                  setSubTab('products');
                                  setEditingProduct(prod);
                                  setEditProdName(prod.name || '');
                                  setEditProdPrice(prod.price || '');
                                  setEditProdCategory(prod.category || 'AirConditioner');
                                  setEditProdCondition(prod.condition || 'excellent');
                                  setEditProdImage(prod.image || '');
                                  setEditProdDesc(prod.description || '');
                                  setEditProdStatus(prod.status || 'available');
                                }} title="Chỉnh sửa thiết bị">✏️</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy sản phẩm nào.</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!loading && subTab === 'add-product' && (
            <div className="products-manager animate-fade">
              <h2>Đăng Bán Thiết Bị Mới</h2>
              <p className="view-desc">Đăng bán thiết bị đã qua sử dụng hoặc được tân trang để tiếp cận người mua trên hệ thống TechCycle.</p>

              {/* Add form */}
              <form onSubmit={handleAddProduct} className="add-product-form glass-panel form-inline-custom">
                <h3>Thông Tin Thiết Bị Đăng Bán</h3>
                {productSuccess && <div className="success-banner-alert">{productSuccess}</div>}

                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Tên thiết bị</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ví dụ: Máy giặt Toshiba Inverter 9kg"
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
                      placeholder="Ví dụ: 6500000"
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
                      <option value="AirConditioner">Máy lạnh (Air Conditioner)</option>
                      <option value="WashingMachine">Máy giặt (Washing Machine)</option>
                      <option value="Refrigerator">Tủ lạnh (Refrigerator)</option>
                      <option value="Microwave">Lò vi sóng (Microwave)</option>
                      <option value="Audio">Thiết bị âm thanh (Audio)</option>
                      <option value="Laptop">Laptop & Máy tính</option>
                      <option value="Smartwatch">Đồng hồ thông minh</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tình trạng kiểm định</label>
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
                    <label className="form-label">Đường dẫn ảnh trực tuyến (Image URL)</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://images.unsplash.com/..."
                      value={newProdImage}
                      onChange={e => setNewProdImage(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hoặc tải lên từ máy tính (Tối đa 10 ảnh)</label>
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
                    <label className="form-label">Ảnh đã chọn ({selectedImageFiles.length}/10):</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {selectedImageFiles.map((base64, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <img src={base64} alt={`Selected ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    placeholder="Nhập thông tin chi tiết về sản phẩm, các hao mòn, chế độ bảo hành..."
                    value={newProdDesc}
                    onChange={e => setNewProdDesc(e.target.value)}
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#006D44', borderColor: '#006D44', color: '#fff' }}>
                  <Plus size={16} /> Đăng Bán Thiết Bị
                </button>
              </form>
            </div>
          )}

          {!loading && subTab === 'products' && (
            <div className="products-manager animate-fade">
              <h2>Quản Lý Sản Phẩm Trong Kho</h2>
              <p className="view-desc">Quản lý danh mục các thiết bị đang bán, chỉnh sửa hoặc gỡ thông tin thiết bị khi cần.</p>
              <div className="d-flex align-items-center justify-content-between" style={{ marginTop: '20px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Danh Sách Thiết Bị Đang Bán</h3>
                <div className="search-input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={productsSearch}
                    onChange={(e) => setProductsSearch(e.target.value)}
                    style={{
                      padding: '8px 16px 8px 36px',
                      fontSize: '0.9rem',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      width: '250px',
                      backgroundColor: 'var(--white)',
                      color: 'var(--neutral-darkest)'
                    }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-medium)' }} />
                </div>
              </div>

              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Hình ảnh</th>
                      <th>Tên thiết bị</th>
                      <th>Danh mục</th>
                      <th>Giá bán</th>
                      <th>Tình trạng</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = productsList.filter(prod =>
                        prod.name.toLowerCase().includes(productsSearch.toLowerCase()) ||
                        (prod.category || '').toLowerCase().includes(productsSearch.toLowerCase())
                      );
                      return filtered.length > 0 ? (
                        filtered.map(prod => (
                          <tr key={prod.id}>
                            <td>
                              <img src={getProductImage(prod)} alt={prod.name} className="tbl-prod-thumb" />
                            </td>
                            <td>
                              <strong>{prod.name}</strong>
                              <div className="tbl-subtext" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.description}</div>
                            </td>
                            <td>
                              {prod.category === 'AirConditioner' ? 'Máy lạnh' :
                                prod.category === 'WashingMachine' ? 'Máy giặt' :
                                  prod.category === 'Refrigerator' ? 'Tủ lạnh' :
                                    prod.category === 'Microwave' ? 'Lò vi sóng' :
                                      prod.category === 'Audio' ? 'Tai nghe' :
                                        prod.category === 'Laptop' ? 'Laptop' :
                                          prod.category === 'Smartwatch' ? 'Đồng hồ' :
                                            prod.category || 'Gia dụng'}
                            </td>
                            <td>{prod.price.toLocaleString('en-US')} VND</td>
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy sản phẩm nào.</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
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
                      {safeOrdersList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--neutral-medium)' }}>Chưa có lịch hẹn xem máy nào.</td>
                        </tr>
                      ) : (
                        currentOrders.filter(o => o && o.id).map(o => (
                          <tr key={o.id}>
                            <td>
                              <strong>{o.appointmentInfo?.fullName || o.shippingInfo?.fullName || 'Khách hàng'}</strong>
                              <div className="tbl-subtext">{o.appointmentInfo?.phone || o.shippingInfo?.phone || ''}</div>
                            </td>
                            <td>
                              {Array.isArray(o.items) && o.items.length > 0 ? (
                                o.items.map((item, idx) => (
                                  <div key={idx} style={{ fontSize: '0.85rem' }}>• {item?.name || 'Sản phẩm'}</div>
                                ))
                              ) : (
                                <div style={{ fontSize: '0.85rem', color: 'var(--neutral-medium)' }}>Không có sản phẩm</div>
                              )}
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
                                      o.status === 'cancelled' || o.status === 'cancelled' || o.status === 'canceled' ? 'Đã hủy' :
                                        o.status === 'reserved' ? 'Đã giữ máy' :
                                          o.status === 'waiting_payment' ? 'Chờ thanh toán (Đang giữ máy)' : o.status}
                              </span>
                            </td>
                            <td>
                              {editingOrderId === o.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                  <label style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', margin: 0 }}>Ngày hẹn mới:</label>
                                  <input
                                    type="date"
                                    value={newDate}
                                    onChange={e => setNewDate(e.target.value)}
                                    className="form-control"
                                    style={{ fontSize: '0.8rem', padding: '4px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                  />
                                  <label style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', margin: 0 }}>Giờ hẹn:</label>
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
                                    <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => handleSaveReschedule(o.id)}>Lưu</button>
                                    <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1 }} onClick={() => setEditingOrderId(null)}>Hủy</button>
                                  </div>
                                </div>
                              ) : (
                                (o.status === 'pending' || o.status === 'confirmed' || o.status === 'reserved' || o.status === 'waiting_payment') ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleConfirmOrderVisit(o.id)}
                                      style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                      Xác nhận khách đã tới
                                    </button>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        className="btn btn-outline-info btn-sm"
                                        onClick={() => {
                                          setEditingOrderId(o.id);
                                          setNewDate(o.appointmentInfo?.appointmentDate || '');
                                          setNewTime(o.appointmentInfo?.appointmentTime || '09:00 AM');
                                        }}
                                        style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1, borderColor: 'var(--primary)', color: 'var(--primary)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                                      >
                                        Đổi lịch
                                      </button>
                                      <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleCancelOrder(o.id)}
                                        style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1, borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                                      >
                                        Hủy
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--neutral-medium)', fontSize: '0.85rem' }}>Không có thao tác</span>
                                )
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
                      {safeBookingsList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--neutral-medium)' }}>Chưa có phiếu hẹn sửa chữa nào.</td>
                        </tr>
                      ) : (
                        currentBookings.filter(bk => bk && bk.id).map(bk => (
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
                              <div className="tbl-subtext">{typeof bk.notes === 'string' && bk.notes.includes('Khung giờ:') ? bk.notes : 'Khung giờ: Sáng'}</div>
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
                                {Array.isArray(techsList) && techsList.filter(t => t && t.id).map(t => (
                                  <option key={t.id} value={t.id}>{t.full_name || t.username || 'Kỹ thuật viên'}</option>
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
                                  defaultValue={typeof bk.notes === 'string' && !bk.notes.includes('Khung giờ:') ? bk.notes : ''}
                                  onBlur={(e) => handleUpdateBookingDetails(bk.id, { notes: e.target.value })}
                                  placeholder="Ghi chú kỹ thuật..."
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-medium)' }}>Chốt ngày nhận máy:</label>
                                  <input
                                    type="date"
                                    className="form-control"
                                    defaultValue={typeof bk.pickup_date === 'string' ? bk.pickup_date.split('T')[0] : ''}
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
                        <button className="btn btn-outline btn-sm btn-send-message" onClick={() => handleStartCustomerChat(viewingUser.id)}>
                          <MessageSquare size={14} /> Gửi tin nhắn
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
                      {techsList.map(c => {
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

              <div className="seller-main-layout-grid" style={{ gridTemplateColumns: '1fr', display: 'grid', gap: '28px' }}>
                {/* Left Column - List of active coupons */}
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

                {/* Right Column - Create Promo Code + Notification */}
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
                          placeholder="Nội dung gửi đến toàn bộ người dùng..."
                          value={notifMessage}
                          onChange={e => setNotifMessage(e.target.value)}
                          required
                        ></textarea>
                      </div>
                      <div className="form-group">
                        <label className="form-label-sm">ẢNH MINH HỌA</label>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          style={{ padding: '8px' }}
                        />
                        <small style={{ fontSize: '0.75rem', color: 'var(--neutral-medium)', marginTop: '4px', display: 'block' }}>
                          Hoặc nhập URL ảnh bên dưới
                        </small>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://example.com/image.jpg"
                          value={notifImageFile ? '' : notifImage}
                          onChange={e => setNotifImage(e.target.value)}
                          disabled={!!notifImageFile}
                          style={{ marginTop: '8px' }}
                        />
                        {notifImage && (
                          <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                            <img src={notifImage} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            <button
                              type="button"
                              onClick={() => { setNotifImage(''); setNotifImageFile(null); }}
                              style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
                            >
                              ×
                            </button>
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
              <ChatPanel
                conversations={chatConversations.filter(c => c.status !== 'internal')}
                selectedConversation={selectedConversation}
                chatMessages={chatMessages}
                newMessage={newMessage}
                isLoading={chatLoading}
                isUploadingImage={isUploadingImage}
                typingUsers={typingUsers}
                unreadConversations={unreadConversations}
                userRole="seller"
                onSelectConversation={handleSelectConversation}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onImageUpload={handleImageUpload}
                onAcceptConsultation={handleAcceptConsultation}
              />
            </div>
          )}

          {!loading && subTab === 'internal-chat' && (
            <div className="animate-fade" style={{ height: 'calc(100vh - 160px)', minHeight: '520px' }}>
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
                userRole="seller"
              />
            </div>
          )}
        </main>
      </div>

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
    </div>
  );
};

export default SellerDashboard;

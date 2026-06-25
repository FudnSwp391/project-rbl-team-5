import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname))
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : '';

/**
 * Custom hook quản lý toàn bộ logic WebSocket chat cho booking.
 * - Socket chỉ được tạo 1 lần khi user login, không recreate khi đổi booking.
 * - Tự động join/leave room khi chọn booking.
 * - Hỗ trợ: gửi text, gửi ảnh, typing indicator, unread count.
 *
 * @param {object} user - User object từ AuthContext
 * @param {string} token - JWT token từ AuthContext
 */
const useBookingChat = (user, token) => {
  const socketRef = useRef(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const selectedBookingRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatViewActiveRef = useRef(false);

  // --- Khởi tạo socket DUY NHẤT khi user login ---
  useEffect(() => {
    if (!user || !user.id) return;
    
    // Chỉ tạo socket mới nếu chưa có
    if (!socketRef.current) {
      const socket = io(API_BASE, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;
    }

    const socket = socketRef.current;
    socket.emit('registerUser', String(user.id));

    // Lắng nghe tin nhắn đến (khi đang trong booking room)
    socket.on('receiveMessage', (message) => {
      const currentBooking = selectedBookingRef.current;
      if (currentBooking && (
        Number(message.bookingId) === Number(currentBooking.id)
      )) {
        setChatMessages(prev => {
          // Tránh duplicate — thay thế optimistic message nếu có
          const withoutOptimistic = prev.filter(m =>
            !(m.id && String(m.id).startsWith('temp_')) ||
            m.text !== message.text
          );
          if (withoutOptimistic.some(m => m.id && m.id === message.id)) return withoutOptimistic;
          return [...withoutOptimistic, message];
        });
      } else {
        // Tin nhắn đến booking khác → tăng unread badge
        if (!chatViewActiveRef.current) {
          setUnreadCount(prev => prev + 1);
        }
      }
    });

    // Lắng nghe thông báo khi chưa vào booking room (cross-booking notification)
    socket.on('newMessageNotification', (message) => {
      const currentBooking = selectedBookingRef.current;
      // Chỉ tăng unread nếu không đang xem booking đó
      const isCurrentBooking = currentBooking && Number(message.bookingId) === Number(currentBooking.id);
      if (!isCurrentBooking && !chatViewActiveRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Lắng nghe typing indicator
    socket.on('userTyping', ({ bookingId, userId, username }) => {
      const currentBooking = selectedBookingRef.current;
      if (currentBooking && Number(bookingId) === Number(currentBooking.id) && String(userId) !== String(user.id)) {
        setTypingUsers(prev => {
          if (prev.includes(username)) return prev;
          return [...prev, username];
        });
      }
    });

    // FIX: xóa theo username (không phải userId)
    socket.on('userStopTyping', ({ bookingId, userId, username }) => {
      const currentBooking = selectedBookingRef.current;
      if (currentBooking && Number(bookingId) === Number(currentBooking.id)) {
        setTypingUsers(prev => prev.filter(u => u !== (username || String(userId))));
      }
    });

    // Auto-rejoin booking room sau khi socket reconnect
    socket.on('reconnect', () => {
      // Re-register user room
      socket.emit('registerUser', String(user.id));
      // Rejoin booking room nếu đang chọn booking
      if (selectedBookingRef.current) {
        socket.emit('joinBookingRoom', selectedBookingRef.current.id);
      }
    });

    return () => {
      clearTimeout(typingTimeoutRef.current); // FIX: cleanup typing timeout
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]); // Chỉ tạo lại khi user thay đổi

  // --- Đồng bộ selectedBooking vào ref để socket listener truy cập được ---
  useEffect(() => {
    selectedBookingRef.current = selectedBooking;
  }, [selectedBooking]);

  // --- Chọn 1 booking để chat ---
  const handleSelectConversation = useCallback(async (booking) => {
    if (selectedBookingRef.current?.id === booking.id) return;

    // Rời room cũ nếu có
    if (socketRef.current && selectedBookingRef.current) {
      socketRef.current.emit('leaveBookingRoom', `booking_${selectedBookingRef.current.id}`);
    }

    setSelectedBooking(booking);
    setChatMessages([]);
    setTypingUsers([]);
    setIsLoading(true);

    // Join room mới
    if (socketRef.current) {
      socketRef.current.emit('joinBookingRoom', booking.id);
    }

    // Load lịch sử tin nhắn từ API
    try {
      const res = await fetch(`${API_BASE}/api/messages/${booking.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setChatMessages(data);
      } else {
        setChatMessages([]);
        console.error('Expected array of messages, got:', data);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử chat:', err);
      setChatMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // --- Gửi tin nhắn văn bản ---
  const handleSendMessage = useCallback((e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedBookingRef.current) return;

    const booking = selectedBookingRef.current;
    const receiverId = user.role === 'customer'
      ? booking.technicianId
      : booking.customerId;

    if (!receiverId) {
      console.error('Không tìm thấy receiverId', booking);
      return;
    }

    const messagePayload = {
      senderId: Number(user.id),
      receiverId: Number(receiverId),
      bookingId: Number(booking.id),
      text: newMessage.trim(),
      senderName: user.username,
      senderAvatar: user.avatar || ''
    };

    // Optimistic update — hiện tin nhắn ngay trước khi server xác nhận
    const optimisticMsg = {
      id: `temp_${Date.now()}`,
      senderId: Number(user.id),
      receiverId: Number(receiverId),
      bookingId: Number(booking.id),
      text: newMessage.trim(),
      senderName: user.username,
      senderAvatar: user.avatar || '',
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, optimisticMsg]);

    if (socketRef.current) {
      socketRef.current.emit('sendMessage', messagePayload);
      // Dừng typing indicator
      socketRef.current.emit('stopTyping', {
        bookingId: Number(booking.id),
        userId: Number(user.id)
      });
    }
    setNewMessage('');
    setIsTyping(false);
  }, [newMessage, user]);

  // --- Gửi ảnh ---
  const handleImageUpload = useCallback(async (file) => {
    if (!file || !selectedBookingRef.current) return;

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
          const booking = selectedBookingRef.current;
          const receiverId = user.role === 'customer'
            ? booking.technicianId
            : booking.customerId;

          if (socketRef.current && receiverId) {
            socketRef.current.emit('sendMessage', {
              senderId: Number(user.id),
              receiverId: Number(receiverId),
              bookingId: Number(booking.id),
              text: `[IMG]${imageUrl}`,
              senderName: user.username,
              senderAvatar: user.avatar || ''
            });
          }
        } else {
          alert('Lỗi tải ảnh lên, vui lòng thử lại.');
        }
      } catch (err) {
        console.error('Lỗi tải ảnh:', err);
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  }, [token, user]);

  // --- Typing indicator ---
  const handleTyping = useCallback((value) => {
    setNewMessage(value);
    const booking = selectedBookingRef.current;
    if (!booking || !socketRef.current) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', {
        bookingId: Number(booking.id),
        userId: String(user.id),
        username: user.username
      });
    }

    // Reset timeout
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socketRef.current) {
        socketRef.current.emit('stopTyping', {
          bookingId: Number(booking.id),
          userId: String(user.id),
          username: user.username  // FIX: thêm username để server relay
        });
      }
    }, 1500);
  }, [isTyping, user]);

  // --- Đánh dấu đã xem tab chat ---
  const markChatViewActive = useCallback((active) => {
    chatViewActiveRef.current = active;
    window.isChatViewActive = active;
    if (active) setUnreadCount(0);
  }, []);

  // Sync to window object
  useEffect(() => {
    window.currentActiveChatBookingId = selectedBooking ? selectedBooking.id : null;
  }, [selectedBooking]);

  // Clear window state on unmount
  useEffect(() => {
    return () => {
      window.isChatViewActive = false;
      window.currentActiveChatBookingId = null;
    };
  }, []);

  return {
    selectedBooking,
    chatMessages,
    newMessage,
    isUploadingImage,
    isLoading,
    unreadCount,
    typingUsers,
    socketRef,
    handleSelectConversation,
    handleSendMessage,
    handleImageUpload,
    handleTyping,
    markChatViewActive,
    setSelectedBooking,
  };
};

export default useBookingChat;

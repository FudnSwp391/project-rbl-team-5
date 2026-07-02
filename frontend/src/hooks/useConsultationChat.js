import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname))
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : '';

/**
 * Custom hook quản lý logic WebSocket chat cho Tư vấn Khách hàng - Seller.
 */
const useConsultationChat = (user, token) => {
  const socketRef = useRef(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const selectedConvRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatViewActiveRef = useRef(false);

  useEffect(() => {
    if (!user || !user.id) return;
    
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

    socket.on('receiveMessage', (message) => {
      const currentConv = selectedConvRef.current;
      if (currentConv && (
        Number(message.conversationId) === Number(currentConv.id)
      )) {
        setChatMessages(prev => {
          const withoutOptimistic = prev.filter(m =>
            !(m.id && String(m.id).startsWith('temp_')) ||
            m.text !== message.text
          );
          if (withoutOptimistic.some(m => m.id && m.id === message.id)) return withoutOptimistic;
          return [...withoutOptimistic, message];
        });
      } else {
        if (!chatViewActiveRef.current) {
          setUnreadCount(prev => prev + 1);
        }
        if (message.conversationId) {
          setUnreadConversations(prev => {
            if (prev.includes(message.conversationId)) return prev;
            return [...prev, message.conversationId];
          });
        }
      }
    });

    socket.on('newMessageNotification', (message) => {
      const currentConv = selectedConvRef.current;
      const isCurrentConv = currentConv && Number(message.conversationId) === Number(currentConv.id);
      if (!isCurrentConv && !chatViewActiveRef.current) {
        setUnreadCount(prev => prev + 1);
      }
      if (!isCurrentConv && message.conversationId) {
        setUnreadConversations(prev => {
          if (prev.includes(message.conversationId)) return prev;
          return [...prev, message.conversationId];
        });
      }
    });

    socket.on('userTyping', ({ conversationId, userId, username }) => {
      const currentConv = selectedConvRef.current;
      if (currentConv && Number(conversationId) === Number(currentConv.id) && String(userId) !== String(user.id)) {
        setTypingUsers(prev => {
          if (prev.includes(username)) return prev;
          return [...prev, username];
        });
      }
    });

    socket.on('userStopTyping', ({ conversationId, userId, username }) => {
      const currentConv = selectedConvRef.current;
      if (currentConv && Number(conversationId) === Number(currentConv.id)) {
        setTypingUsers(prev => prev.filter(u => u !== (username || String(userId))));
      }
    });

    socket.on('reconnect', () => {
      socket.emit('registerUser', String(user.id));
      if (selectedConvRef.current) {
        socket.emit('joinConversationRoom', selectedConvRef.current.id);
      }
    });

    return () => {
      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  const handleSelectConversation = useCallback(async (conversation) => {
    if (selectedConvRef.current?.id === conversation.id) return;

    if (socketRef.current && selectedConvRef.current) {
      socketRef.current.emit('leaveConversationRoom', `conversation_${selectedConvRef.current.id}`);
    }

    setSelectedConversation(conversation);
    setChatMessages([]);
    setTypingUsers([]);
    setIsLoading(true);
    setUnreadConversations(prev => prev.filter(id => id !== conversation.id));

    if (socketRef.current) {
      socketRef.current.emit('joinConversationRoom', conversation.id);
    }

    try {
      const res = await fetch(`${API_BASE}/api/messages/${conversation.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setChatMessages(data);
      } else {
        setChatMessages([]);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử chat:', err);
      setChatMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleSendMessage = useCallback((e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConvRef.current) return;

    const conv = selectedConvRef.current;
    const receiverId = user.role.toLowerCase() === 'customer'
      ? conv.seller_id
      : conv.customer_id;

    const messagePayload = {
      senderId: Number(user.id),
      receiverId: receiverId ? Number(receiverId) : null,
      conversationId: Number(conv.id),
      text: newMessage.trim(),
      senderName: user.username,
      senderAvatar: user.avatar || ''
    };

    const optimisticMsg = {
      id: `temp_${Date.now()}`,
      ...messagePayload,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, optimisticMsg]);

    if (socketRef.current) {
      socketRef.current.emit('sendMessage', messagePayload);
      socketRef.current.emit('stopTyping', {
        conversationId: Number(conv.id),
        userId: Number(user.id),
        username: user.username
      });
    }
    setNewMessage('');
    setIsTyping(false);
  }, [newMessage, user]);

  const handleImageUpload = useCallback(async (file) => {
    if (!file || !selectedConvRef.current) return;

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
          const conv = selectedConvRef.current;
          const receiverId = user.role.toLowerCase() === 'customer'
            ? conv.seller_id
            : conv.customer_id;

          if (socketRef.current) {
            socketRef.current.emit('sendMessage', {
              senderId: Number(user.id),
              receiverId: receiverId ? Number(receiverId) : null,
              conversationId: Number(conv.id),
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

  const handleTyping = useCallback((value) => {
    setNewMessage(value);
    const conv = selectedConvRef.current;
    if (!conv || !socketRef.current) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', {
        conversationId: Number(conv.id),
        userId: String(user.id),
        username: user.username
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socketRef.current) {
        socketRef.current.emit('stopTyping', {
          conversationId: Number(conv.id),
          userId: String(user.id),
          username: user.username
        });
      }
    }, 1500);
  }, [isTyping, user]);

  const markChatViewActive = useCallback((active) => {
    chatViewActiveRef.current = active;
    window.isChatViewActive = active;
    if (active) setUnreadCount(0);
  }, []);

  return {
    selectedConversation,
    setSelectedConversation,
    chatMessages,
    newMessage,
    isUploadingImage,
    isLoading,
    unreadCount,
    unreadConversations,
    typingUsers,
    handleSelectConversation,
    handleSendMessage,
    handleImageUpload,
    handleTyping,
    markChatViewActive,
  };
};

export default useConsultationChat;

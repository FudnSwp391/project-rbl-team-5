import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname))
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : '';

export const useNotifications = (user, token, onGlobalEvent) => {
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);
  
  const onEventRef = useRef(onGlobalEvent);
  useEffect(() => {
    onEventRef.current = onGlobalEvent;
  }, [onGlobalEvent]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications?userId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [user, token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(API_BASE);
    socketRef.current.emit('registerUser', user.id);

    socketRef.current.on('newBellNotification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      if (onEventRef.current) onEventRef.current('newBellNotification', notif);
    });

    socketRef.current.on('newOrder', (data) => {
      if (onEventRef.current) onEventRef.current('newOrder', data);
    });

    socketRef.current.on('newBooking', (data) => {
      if (onEventRef.current) onEventRef.current('newBooking', data);
    });

    socketRef.current.on('newOrderForSeller', (data) => {
      alert(`🔔 [HẸN XEM MÁY MỚI] ${data.message}`);
      if (onEventRef.current) onEventRef.current('newOrderForSeller', data);
    });

    socketRef.current.on('newBookingForSeller', (data) => {
      alert(`🔔 [HẸN SỬA MÁY MỚI] ${data.message}`);
      if (onEventRef.current) onEventRef.current('newBookingForSeller', data);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    setNotifications,
    fetchNotifications,
    clearAllNotifications
  };
};

export default useNotifications;

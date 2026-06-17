import { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('techcycle_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';

  const getAvatarUrl = (avatar, username) => {
    if (!avatar || avatar.trim() === '' || avatar.startsWith('/avatars/')) {
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${username || 'placeholder'}`;
    }
    return avatar;
  };

  // Khai báo logout TRƯỚC useEffect để tránh ReferenceError
  const logout = useCallback(() => {
    localStorage.removeItem('techcycle_token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          const savedAvatar = localStorage.getItem(`techcycle_avatar_${userData.id}`);
          userData.avatar = savedAvatar || getAvatarUrl(userData.avatar, userData.username);
          setUser(userData);
        } else {
          // Token hết hạn hoặc không hợp lệ
          logout();
        }
      } catch (err) {
        console.error('Lỗi kiểm tra token:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, logout]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại.');
      }

      localStorage.setItem('techcycle_token', data.token);
      const savedAvatar = localStorage.getItem(`techcycle_avatar_${data.user.id}`);
      data.user.avatar = savedAvatar || getAvatarUrl(data.user.avatar, data.user.username);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (username, email, password, phone, role = 'customer') => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, phone, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại.');
      }

      localStorage.setItem('techcycle_token', data.token);
      const savedAvatar = localStorage.getItem(`techcycle_avatar_${data.user.id}`);
      data.user.avatar = savedAvatar || getAvatarUrl(data.user.avatar, data.user.username);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateAvatar = (newAvatar) => {
    if (user) {
      localStorage.setItem(`techcycle_avatar_${user.id}`, newAvatar);
      setUser(prev => prev ? { ...prev, avatar: newAvatar } : null);
    }
  };

  const updateProfile = async (username, email, description, phone) => {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, email, description, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Cập nhật thông tin thất bại.');
      }

      const savedAvatar = localStorage.getItem(`techcycle_avatar_${data.user.id}`);
      data.user.avatar = savedAvatar || getAvatarUrl(data.user.avatar, data.user.username);
      
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, updateAvatar, getAvatarUrl, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); // eslint-disable-line react-refresh/only-export-components

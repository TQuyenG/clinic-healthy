// client/src/contexts/AuthContext.js - ĐÃ FIX DUPLICATE QUERIES
// ✅ Fix: Thêm debounce, bỏ event listener gây loop

import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  
  // ✅ FIX: Thêm ref để track fetch status và prevent duplicate calls
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const FETCH_COOLDOWN = 2000; // 2 seconds cooldown

  // ============================================
  // HÀM ĐĂNG NHẬP
  // ============================================
  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post('http://localhost:3001/api/users/login', {
        email,
        password,
      });

      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      console.log('✅ Đăng nhập thành công:', userData.email);
      navigate('/dashboard');
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      throw error;
    }
  }, [navigate]);

  // ============================================
  // HÀM ĐĂNG XUẤT
  // ============================================
  const logout = useCallback(() => {
    console.log('🚪 Đang đăng xuất...');

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
    setIsAuthenticated(false);

    navigate('/login');
  }, [navigate]);

  // ============================================
  // HÀM LẤY THÔNG TIN USER TỪ TOKEN
  // ============================================
  const fetchUserProfile = useCallback(async (token, force = false) => {
    // ✅ FIX: Tránh fetch nhiều lần trong thời gian ngắn
    const now = Date.now();
    
    if (!force) {
      if (isFetchingRef.current) {
        console.log('⚠️ Already fetching, skipping...');
        return user; // Return current user
      }
      
      if (now - lastFetchTimeRef.current < FETCH_COOLDOWN) {
        console.log('⚠️ Fetch cooldown active, skipping...');
        return user;
      }
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      console.log('🔍 Fetching user profile...');
      
      const response = await axios.get('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);

      localStorage.setItem('user', JSON.stringify(userData));

      console.log('✅ Profile loaded:', userData.full_name);
      return userData;
      
    } catch (error) {
      console.error('❌ Lỗi lấy profile:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
      
      throw error;
    } finally {
      isFetchingRef.current = false;
    }
  }, [logout, user]);

  // ============================================
  // KIỂM TRA TOKEN KHI KHỞI ĐỘNG APP
  // ============================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token) {
          setLoading(false);
          return;
        }

        // Nếu có user trong localStorage, set luôn (tránh flash)
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setIsAuthenticated(true);
          } catch (e) {
            console.error('Lỗi parse user:', e);
          }
        }

        // Verify token với server (CHỈ 1 LẦN duy nhất)
        await fetchUserProfile(token, true);
        
      } catch (error) {
        console.error('Lỗi khởi tạo auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ FIX: Empty deps - CHỈ chạy 1 lần khi mount!

  // ✅ FIX: BỎ event listener authStateChanged (gây loop)
  // Không cần lắng nghe event nữa vì AuthContext đã là single source of truth
  // Tất cả components dùng useAuth() sẽ tự động nhận user mới khi state thay đổi

  // ============================================
  // HÀM CẬP NHẬT USER
  // ============================================
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev;
      
      const newUser = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(newUser));
      
      console.log('📝 User updated:', Object.keys(updates).join(', '));
      
      return newUser;
    });
  }, []);

  // ✅ FIX: Thêm refetch manual khi cần
  const refetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      return await fetchUserProfile(token, true);
    }
  }, [fetchUserProfile]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    fetchUserProfile,
    refetchUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
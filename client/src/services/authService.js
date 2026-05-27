import api from './api';

// Đăng ký
export const register = async (userData) => {
  try {
    const response = await api.post('/users/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Xác nhận email
export const verifyEmail = async (token) => {
  try {
    const response = await api.get(`/users/verify-email?token=${token}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Đăng nhập
export const login = async (credentials) => {
  try {
    const response = await api.post('/users/login', credentials);
    
    // Lưu token và user info vào localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Đăng xuất
export const logout = async () => {
  try {
    await api.post('/users/logout');
    
    // Xóa token và user info khỏi localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return { message: 'Đăng xuất thành công' };
  } catch (error) {
    // Vẫn xóa token dù API lỗi
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw error.response?.data || error;
  }
};

// Quên mật khẩu - Gửi OTP
export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/users/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Xác nhận OTP
export const verifyOTP = async (reset_token, otp) => {
  try {
    const response = await api.post('/users/verify-otp', { reset_token, otp });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Đặt lại mật khẩu
export const resetPassword = async (reset_token, new_password) => {
  try {
    const response = await api.post('/users/reset-password', { reset_token, new_password });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Lấy thông tin profile
export const getProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Cập nhật profile
export const updateProfile = async (userData) => {
  try {
    const response = await api.put('/users/profile', userData);
    
    // Cập nhật user info trong localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...currentUser, ...response.data.user }));
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Đổi mật khẩu
export const changePassword = async (passwordData) => {
  try {
    const response = await api.put('/users/change-password', passwordData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Lấy user từ localStorage
export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Lỗi parse user:', error);
    return null;
  }
};

// Lấy token từ localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Kiểm tra đã đăng nhập chưa
export const isAuthenticated = () => {
  return !!getToken();
};

// Thêm hàm gửi lại verification
export const resendVerification = async (email) => {
  try {
    const response = await api.post('/users/resend-verification', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Thêm hàm yêu cầu manual verification
export const requestManualVerification = async (email, reason) => {
  try {
    const response = await api.post('/users/request-manual-verification', { email, reason });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
// client/src/services/userService.js - COMPLETE VERSION
import api from './api';

const userService = {
  // ========== AUTH ==========
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  verifyEmail: (token) => api.get(`/users/verify-email?token=${token}`),
  forgotPassword: (email) => api.post('/users/forgot-password', { email }),
  verifyOTP: (data) => api.post('/users/verify-otp', data),
  resetPassword: (data) => api.post('/users/reset-password', data),

  // ========== PROFILE ==========
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),

  // ========== DOCTORS PUBLIC ==========
  getDoctors: (params = {}) => api.get('/users/doctors', { params }),
  getAllDoctorsPublic: (params = {}) => api.get('/users/doctors/public', { params }),
  getDoctorById: (userId) => api.get(`/users/doctors/${userId}`),
  getDoctorByCode: (code) => api.get(`/users/doctors/code/${code}`),

  // ========== ADMIN ROUTES ==========
  getAllUsers: () => api.get('/users/all'),
  // => DÒNG THÊM MỚI NÀY
  getAllDoctorsForAdmin: (params = { limit: 500 }) => api.get('/users/doctors/public', { params }),
  // <= HẾT DÒNG THÊM MỚI
  getUserStats: () => api.get('/users/stats'),
  searchUsers: (params) => api.get('/users/search', { params }),
  getUserById: (userId) => api.get(`/users/${userId}`),
  updateDoctorPublicProfile: (userId, data) => api.put(`/users/doctors/${userId}/public-profile`, data),
  updateUser: (userId, data) => api.put(`/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  toggleUserStatus: (userId, data) => api.put(`/users/${userId}/toggle-status`, data),
  getDoctorsBySpecialty: (specialtyId) => api.get(`/specialties/${specialtyId}/doctors`),

  // ✅ THÊM 2 HÀM MỚI NÀY VÀO CUỐI:
  
  // 1. Lấy thông tin role & kiểm tra hồ sơ thiếu
  getMyRoleInfo: () => api.get('/users/profile/role-info'),

  // 2. Cập nhật hồ sơ sức khỏe chi tiết (Bệnh nhân)
  updatePatientHealthInfo: (data) => api.put('/users/patient/health-info', data)
}; // <-- Đảm bảo các hàm nằm TRƯỚC dấu đóng ngoặc nhọn này

export default userService;
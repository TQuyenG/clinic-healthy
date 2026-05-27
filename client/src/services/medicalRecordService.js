// client/src/services/medicalRecordService.js
// PHIÊN BẢN CẬP NHẬT: Đã thêm getMyMedicalRecords

import axios from 'axios';

// Lấy API URL từ biến môi trường
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Tạo một instance axios đã cấu hình sẵn
const api = axios.create({
  baseURL: API_URL,
});

// Interceptor để tự động thêm token vào mỗi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// === TẠO & CẬP NHẬT (Dùng FormData) ===

/**
 * Tạo hồ sơ y tế mới (Gửi bằng FormData)
 */
const createMedicalRecord = (formData) => {
  return api.post('/medical-records', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Cập nhật hồ sơ y tế (Gửi bằng FormData)
 */
const updateMedicalRecord = (recordId, formData) => {
  return api.put(`/medical-records/${recordId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// === LẤY DỮ LIỆU & BẢO MẬT (Dùng JSON) ===

/**
 * Lấy chi tiết hồ sơ y tế (Khi đã đăng nhập)
 */
const getMedicalRecordById = (recordId) => {
  return api.get(`/medical-records/${recordId}`);
};

/**
 * BỔ SUNG: Lấy tất cả hồ sơ y tế của Bệnh nhân (đã đăng nhập)
 * Backend: exports.getMyMedicalRecords
 */
const getMyMedicalRecords = () => {
  return api.get('/medical-records/my-records');
};
// KẾT THÚC BỔ SUNG

/**
 * Xác thực mật khẩu của Patient/Admin trước khi xem
 */
const verifyUserPassword = (password) => {
  return api.post('/medical-records/verify-password', { password });
};

// === TRA CỨU CÔNG KHAI (Public) ===

/**
 * Tra cứu kết quả (Guest / Public)
 */
const lookupMedicalRecord = (appointment_code, lookup_code) => {
  // Không dùng 'api' vì đây là public, không cần token
  return axios.post(`${API_URL}/medical-records/lookup`, {
    appointment_code,
    lookup_code,
  });
};

/**
 * Gửi lại mã tra cứu (Guest / Public)
 */
const resendLookupCode = (appointment_code) => {
  // Không dùng 'api'
  return axios.post(`${API_URL}/medical-records/resend-code`, {
    appointment_code,
  });
};

// === ADMIN ===

/**
 * Lấy danh sách hồ sơ y tế (Admin / Staff)
 */
const getAdminMedicalRecords = (params) => {
  return api.get('/medical-records/admin/all', { params });
};

// /**
//  * Tiết lộ mã tra cứu (Admin) - Thực chất là RESET
//  */
// const revealLookupCode = (password, record_id) => {
//   return api.post('/medical-records/admin/reveal-code', {
//     password,
//     record_id,
//   });
// };

const inputVitals = (data) => {
  return api.post('/medical-records/staff/vitals', data);
};

const updateVitals = (appointmentId, data) => {
  return api.put(`/medical-records/staff/vitals/${appointmentId}`, data);
};

/**
 * Reset mã tra cứu (Admin / Staff) - Không cần mật khẩu
 */
const resetLookupCodeByAdmin = (record_id) => {
  return api.post('/medical-records/admin/reset-code', { record_id });
};




// Export tất cả các hàm
const medicalRecordService = {
  createMedicalRecord,
  updateMedicalRecord,
  getMedicalRecordById,
  getMyMedicalRecords,
  verifyUserPassword,
  lookupMedicalRecord,
  resendLookupCode,
  getAdminMedicalRecords,
  resetLookupCodeByAdmin,
  inputVitals,
  updateVitals,
};

export default medicalRecordService;
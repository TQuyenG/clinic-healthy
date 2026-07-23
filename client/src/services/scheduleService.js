// client/src/services/scheduleService.js - ✅ COMPLETE & FIXED
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper: Get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// ========================================
// PUBLIC SCHEDULES
// ========================================
export const getPublicSchedules = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules/public`, { params });
  return response.data;
};

// ========================================
// MY SCHEDULES (Doctor/Staff)
// ========================================
export const getMySchedules = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Alias cho getMySchedules - dùng chung cho cả admin và user
 * Frontend có thể gọi getSchedules() thay vì phân biệt getMySchedules/getAllSchedules
 */
export const getSchedules = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};
/**
 * Lấy lịch làm việc của một nhóm bác sĩ (Dùng cho Staff Management)
 * @param {Array<number>} userIds - Danh sách user_id của các bác sĩ.
 * @param {Object} params - Tham số lọc lịch (date_from, date_to).
 */
export const getDoctorsScheduleForStaff = async (userIds, params = {}) => {
  // Backend cần một chuỗi ID, ví dụ: user_id=1,2,3
  const userIdsString = userIds.join(','); 
  const response = await axios.get(`${API_BASE_URL}/schedules`, {
    headers: getAuthHeader(),
    params: {
      user_id: userIdsString, // Truyền danh sách ID qua query param
      ...params
    }
  });
  return response.data;
};

export const getScheduleDetail = async (scheduleId) => {
  const response = await axios.get(`${API_BASE_URL}/schedules/${scheduleId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Cập nhật lịch (Admin/Owner)
 */
export const updateSchedule = async (scheduleId, data) => {
  const response = await axios.put(
    `${API_BASE_URL}/schedules/${scheduleId}`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ========================================
// WORK HOURS STATS
// ========================================
export const getWorkHoursStats = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules/stats`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Lấy thống kê lịch làm việc (Admin)
 * Alias cho getWorkHoursStats + thêm logic cho admin
 */
export const getScheduleStatistics = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules/admin/statistics`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Export lịch làm việc ra file Excel
 */
export const exportSchedules = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules/export`, {
    headers: getAuthHeader(),
    params,
    responseType: 'blob' // Quan trọng: để download file
  });
  
  // Tạo link download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `schedules_${new Date().getTime()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  
  return response.data;
};

// ========================================
// OVERTIME - Doctor/Staff đăng ký tăng ca
// ========================================

/**
 * Lấy danh sách slot tăng ca còn trống
 * @param {Object} params - { date, month, year, date_from, date_to }
 */
export const getAvailableOvertimeSlots = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules/overtime/available-slots`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Đăng ký vào slot tăng ca có sẵn
 * @param {Object} data - { slot_id, reason }
 */
export const registerOvertimeSlot = async (data) => {
  const response = await axios.post(
    `${API_BASE_URL}/schedules/overtime/register-slot`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Tạo yêu cầu tăng ca mới (không dùng slot)
 * @param {Object} data - { date, start_time, end_time, reason }
 */
export const registerOvertime = async (data) => {
  const response = await axios.post(
    `${API_BASE_URL}/schedules/overtime`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ========================================
// LEAVE - Yêu cầu nghỉ phép
// ========================================
export const requestLeave = async (data) => {
  const response = await axios.post(
    `${API_BASE_URL}/schedules/leave`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ========================================
// ADMIN - Quản lý lịch
// ========================================

/**
 * Lấy tất cả lịch (Admin)
 */
export const getAllSchedules = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Lấy danh sách lịch chờ duyệt (Admin)
 */
export const getPendingSchedules = async () => {
  const response = await axios.get(`${API_BASE_URL}/schedules/pending`, {
    headers: getAuthHeader()
  });
  return response.data;
};

/**
 * Kiểm tra trùng lịch (Admin)
 */
export const checkScheduleConflict = async (params) => {
  const response = await axios.get(`${API_BASE_URL}/schedules/check-conflict`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Tạo lịch cố định đơn giản (Admin)
 */
export const createFixedSchedule = async (data) => {
  const response = await axios.post(
    `${API_BASE_URL}/schedules/fixed`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Tạo nhiều lịch cố định batch (Admin)
 */
export const createFixedScheduleBatch = async (data) => {
  const response = await axios.post(
    `${API_BASE_URL}/schedules/fixed/batch`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Tạo slot tăng ca (Admin)
 */
export const createOvertimeSlots = async (data) => {
  const response = await axios.post(
    `${API_BASE_URL}/schedules/overtime/create-slots`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Phê duyệt/Từ chối lịch (Admin)
 */
export const approveSchedule = async (scheduleId, data) => {
  const response = await axios.put(
    `${API_BASE_URL}/schedules/${scheduleId}/approve`,
    data,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Xóa lịch
 */
export const deleteSchedule = async (scheduleId) => {
  const response = await axios.delete(
    `${API_BASE_URL}/schedules/${scheduleId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

/**
 * Xóa nhiều lịch (Admin)
 */
export const batchDeleteSchedules = async (ids) => {
  const response = await axios.delete(
    `${API_BASE_URL}/schedules/batch`,
    {
      headers: getAuthHeader(),
      data: { ids }
    }
  );
  return response.data;
};

export default {
  // Public
  getPublicSchedules,
  
  // My Schedules
  getMySchedules,
  getSchedules, // Alias
  getScheduleDetail,
  getWorkHoursStats,
  getScheduleStatistics, // Admin stats
  updateSchedule,
  exportSchedules,
  
  // Overtime
  getAvailableOvertimeSlots,
  registerOvertimeSlot,
  registerOvertime,
  
  // Leave
  requestLeave,
  
  // Admin
  getAllSchedules,
  getPendingSchedules,
  checkScheduleConflict,
  createFixedSchedule,
  createFixedScheduleBatch,
  createOvertimeSlots,
  approveSchedule,
  deleteSchedule,
  batchDeleteSchedules
};
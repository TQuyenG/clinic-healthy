// client/src/services/auditService.js

import api from './api';

/**
 * Lấy danh sách audit logs (Staff Management)
 * @param {Object} params - { startDate, endDate, action_type, user_id, limit, offset }
 */
export const getAuditLogs = async (params = {}) => {
  try {
    const response = await api.get('/staff/audit-logs', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

/**
 * Lấy thống kê audit logs (Staff Management)
 * @param {Object} params - { startDate, endDate }
 */
export const getAuditStats = async (params = {}) => {
  try {
    const response = await api.get('/settings/audit-logs/stats', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    throw error;
  }
};

/**
 * Helper function để format action type thành tiếng Việt
 */
export const formatActionType = (actionType) => {
  const labels = {
    permission_change: 'Thay đổi phân quyền',
    staff_create: 'Thêm nhân viên',
    staff_update: 'Cập nhật nhân viên',
    staff_delete: 'Xóa nhân viên',
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    department_change: 'Chuyển phòng ban',
    work_status_change: 'Thay đổi trạng thái',
    system_setting_change: 'Thay đổi cài đặt hệ thống'
  };
  return labels[actionType] || actionType;
};

export default {
  getAuditLogs,
  getAuditStats,
  formatActionType
};

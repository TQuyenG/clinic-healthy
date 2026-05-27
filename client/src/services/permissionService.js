// client/src/services/permissionService.js
import api from './api';

const permissionService = {
  /**
   * Lấy permissions chi tiết của 1 staff
   */
  getStaffPermissions: async (staffId) => {
    try {
      const response = await api.get(`/permissions/staff/${staffId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cập nhật permissions của 1 staff
   * @param staffId 
   * @param permissions - Object { module: { action: true/false } }
   */
  updateStaffPermissions: async (staffId, permissions) => {
    try {
      const response = await api.put(`/permissions/staff/${staffId}`, {
        permissions
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy danh sách tất cả modules và permissions
   */
  getPermissionModules: async () => {
    try {
      const response = await api.get('/permissions/modules');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy lịch sử thay đổi permissions
   */
  getPermissionAuditLogs: async (staffId, limit = 50, offset = 0) => {
    try {
      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);
      params.append('limit', limit);
      params.append('offset', offset);

      const response = await api.get(`/permissions/audit-logs?${params}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default permissionService;

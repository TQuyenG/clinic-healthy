// client/src/services/specialtyService.js
import api from './api'; // Giả định bạn có file api.js cấu hình sẵn axios instance

const specialtyService = {
  // === PUBLIC METHODS ===

  /**
   * Lấy danh sách chuyên khoa cho người dùng công khai
   * @returns {Promise}
   */
  getPublicSpecialties: () => {
    return api.get('/specialties');
  },

  /**
   * Lấy chi tiết chuyên khoa bằng slug
   * @param {string} slug - Slug của chuyên khoa
   * @returns {Promise}
   */
  getSpecialtyBySlug: (slug) => {
    return api.get(`/specialties/${slug}`);
  },

  // === ADMIN METHODS ===

  /**
   * Lấy tất cả chuyên khoa cho trang quản trị
   * @returns {Promise}
   */
  getAdminSpecialties: () => {
    return api.get('/specialties/admin/all');
  },

  /**
   * Tạo một chuyên khoa mới
   * @param {object} specialtyData - Dữ liệu chuyên khoa { name, description, image_url, is_active }
   * @returns {Promise}
   */
  createSpecialty: (specialtyData) => {
    return api.post('/specialties', specialtyData);
  },

  /**
   * Cập nhật một chuyên khoa
   * @param {number|string} id - ID của chuyên khoa
   * @param {object} specialtyData - Dữ liệu cần cập nhật
   * @returns {Promise}
   */
  updateSpecialty: (id, specialtyData) => {
    return api.put(`/specialties/${id}`, specialtyData);
  },

  /**
   * Xóa một chuyên khoa
   * @param {number|string} id - ID của chuyên khoa
   * @returns {Promise}
   */
  deleteSpecialty: (id) => {
    return api.delete(`/specialties/${id}`);
  },
};

export default specialtyService;
// client/src/services/serviceCategoryService.js
import api from './api'; // Sử dụng axios instance đã được cấu hình sẵn

const serviceCategoryService = {

  // =================================================================
  // ========================= PUBLIC METHODS ========================
  // =================================================================

  /**
   * Lấy danh sách danh mục dịch vụ công khai (trạng thái active)
   * @returns {Promise} Promise object trả về response từ API
   */
  getPublicServiceCategories: () => {
    return api.get('/service-categories');
  },

  /**
   * Lấy chi tiết một danh mục bằng slug, bao gồm các dịch vụ con
   * @param {string} slug - Slug của danh mục
   * @returns {Promise}
   */
  getPublicCategoryBySlug: (slug) => {
    return api.get(`/service-categories/slug/${slug}`);
  },


  // =================================================================
  // ========================== ADMIN METHODS ========================
  // =================================================================

  /**
   * Lấy tất cả danh mục dịch vụ cho trang quản trị
   * @returns {Promise}
   */
  getAdminServiceCategories: () => {
    return api.get('/service-categories/admin/all');
  },

  /**
   * Lấy chi tiết một danh mục bằng ID (dùng cho form edit)
   * @param {number|string} id - ID của danh mục
   * @returns {Promise}
   */
  getCategoryById: (id) => {
    return api.get(`/service-categories/${id}`);
  },

  /**
   * Tạo một danh mục dịch vụ mới
   * @param {object} categoryData - Dữ liệu danh mục { name, description, image_url, is_active }
   * @returns {Promise}
   */
  createServiceCategory: (categoryData) => {
    return api.post('/service-categories', categoryData);
  },

  /**
   * Cập nhật một danh mục dịch vụ
   * @param {number|string} id - ID của danh mục
   * @param {object} categoryData - Dữ liệu cần cập nhật
   * @returns {Promise}
   */
  updateServiceCategory: (id, categoryData) => {
    return api.put(`/service-categories/${id}`, categoryData);
  },

  /**
   * Xóa một danh mục dịch vụ
   * @param {number|string} id - ID của danh mục
   * @returns {Promise}
   */
  deleteServiceCategory: (id) => {
    return api.delete(`/service-categories/${id}`);
  },
};

export default serviceCategoryService;
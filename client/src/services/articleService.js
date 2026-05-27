import api from './api';

const articleService = {
  // Lấy danh sách bài viết (Bác sĩ sẽ thấy bài của mình và các bài được duyệt)
  getArticles: (params) => api.get('/articles', { params }),
  getAdminStatistics: (params) => api.get('/articles/admin/statistics/overview', { params }),
  
  // Lấy chi tiết một bài viết cụ thể
  getArticleById: (id) => api.get(`/articles/${id}`),
  
  // Bác sĩ gửi bài viết mới để chờ phê duyệt
  createArticle: (data) => api.post('/articles', data),
  
  // Chỉnh sửa bài viết (thường là sửa bài bị từ chối hoặc bài nháp)
  updateArticle: (id, data) => api.put(`/articles/${id}`, data),
  
  // Xóa bài viết nháp
  deleteArticle: (id) => api.delete(`/articles/${id}`),
  
  // Các hàm phục vụ chức năng tìm kiếm/đề xuất thực thể y khoa
  getMedicines: (params) => api.get('/articles/medicines', { params }),
  getDiseases: (params) => api.get('/articles/diseases', { params })
};

export default articleService;
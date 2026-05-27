// client/src/services/communityService.js
import api from './api';

const communityService = {
  // PUBLIC & CÀI ĐẶT
  getGroups: (params = {}) => api.get('/community/groups', { params }),
  getGroupBySlug: (slug) => api.get(`/community/groups/${slug}`),
  getGroupPosts: (groupId, params = {}) => api.get(`/community/groups/${groupId}/posts`, { params }),
  getGroupSettings: () => api.get('/community/settings/group-creation'),
  toggleGroupSettings: () => api.put('/community/settings/group-creation/toggle'),

  // NHÓM CỦA TÔI
  getMyGroups: () => api.get('/community/my-groups'),
  createGroup: (data) => api.post('/community/groups', data),
  updateGroup: (id, data) => api.put(`/community/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/community/groups/${id}`),

  // THAM GIA / RỜI NHÓM
  joinGroup: (id, message = '') => api.post(`/community/groups/${id}/join`, { message }),
  leaveGroup: (id) => api.delete(`/community/groups/${id}/leave`),
  inviteMember: (groupId, userId) => api.post(`/community/groups/${groupId}/invite`, { user_id: userId }),

  // THÀNH VIÊN
  getGroupMembers: (groupId, params = {}) => api.get(`/community/groups/${groupId}/members`, { params }),
  muteMember: (groupId, userId, data) => api.put(`/community/groups/${groupId}/members/${userId}/mute`, data),
  unmuteMember: (groupId, userId) => api.put(`/community/groups/${groupId}/members/${userId}/unmute`),
  kickMember: (groupId, userId, data) => api.put(`/community/groups/${groupId}/members/${userId}/kick`, data),
  promoteMember: (groupId, userId, data) => api.put(`/community/groups/${groupId}/members/${userId}/promote`, data),
  getMemberPosts: (groupId, userId, params = {}) => api.get(`/community/groups/${groupId}/members/${userId}/posts`, { params }),

  // BÀI ĐĂNG
  createPost: (groupId, data) => api.post(`/community/groups/${groupId}/posts`, data),
  updatePost: (groupId, postId, data) => api.put(`/community/groups/${groupId}/posts/${postId}`, data),
  deletePost: (groupId, postId) => api.delete(`/community/groups/${groupId}/posts/${postId}`),
  approvePost: (postId) => api.put(`/community/posts/${postId}/approve`),
  rejectPost: (postId, reason = '') => api.put(`/community/posts/${postId}/reject`, { reason }),
  getPendingGroupPosts: (groupId) => api.get(`/community/groups/${groupId}/posts/pending`),
  getReportedGroupPosts: (groupId) => api.get(`/community/groups/${groupId}/posts/reported`),
  getMyGroupPosts: (groupId, params = {}) => api.get(`/community/groups/${groupId}/my-posts`, { params }),
  getGroupPostDetail: (groupSlug, postId) => api.get(`/community/groups/${groupSlug}/posts/${postId}`),

  // TƯƠNG TÁC & LƯU BÀI
  toggleLikePost: (postId) => api.post(`/community/posts/${postId}/like`),
  commentOnPost: (postId, content) => api.post(`/community/posts/${postId}/comment`, { content }),
  reportPost: (postId, reason) => api.post(`/community/posts/${postId}/report`, { reason }),
  
  // ✅ HÀM LƯU BÀI KHỚP VỚI ROUTE
  savePost: (postId) => api.post(`/community/posts/${postId}/save`),
  unsavePost: (postId) => api.delete(`/community/posts/${postId}/save`),
  getSavedPosts: (groupId, params = {}) => api.get(`/community/groups/${groupId}/saved`, { params }),

  // QUẢN TRỊ ADMIN
  adminGetAllGroups: (params = {}) => api.get('/community/admin/groups', { params }),
  adminApproveGroup: (id) => api.put(`/community/admin/groups/${id}/approve`),
  adminRejectGroup: (id, reason) => api.put(`/community/admin/groups/${id}/reject`, { reason }),
  adminWarnGroup: (id, reason) => api.post(`/community/admin/groups/${id}/warn`, { reason }),
  adminForceSuspendGroup: (id, reason) => api.put(`/community/admin/groups/${id}/force-suspend`, { reason }),
  adminForceActiveGroup: (id) => api.put(`/community/admin/groups/${id}/force-active`),
  adminForceDeleteGroup: (id) => api.delete(`/community/admin/groups/${id}/force-delete`),
};

export default communityService;
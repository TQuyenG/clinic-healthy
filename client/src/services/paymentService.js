// client/src/services/paymentService.js
import api from './api';

const paymentService = {
  // ========== PHẦN USER (GIỮ NGUYÊN) ==========
  
  createPayment: (data) => {
    return api.post('/payments', data);
  },

  createConsultationPayment: (data) => {
    return api.post('/payments/consultation', data);
  },

  getPaymentByAppointment: (appointmentId) => {
    return api.get(`/payments/appointment/${appointmentId}`);
  },

  getMyPayments: () => {
    return api.get('/payments/my-payments');
  },

  requestRefund: (data) => {
    return api.post('/payments/refund', data);
  },

  // ========== PHẦN ADMIN & STAFF (CẬP NHẬT MỚI) ==========

  /**
   * Lấy danh sách tất cả thanh toán (có lọc)
   */
  getAllPayments: (params) => {
    return api.get('/payments/all', { params });
  },

  /**
   * Lấy chi tiết 1 giao dịch theo ID
   */
  getPaymentById: (id) => {
    return api.get(`/payments/${id}`);
  },

  /**
   * Xác nhận thanh toán (khi khách trả tiền mặt/chuyển khoản)
   */
  confirmPayment: (id, transactionId) => {
    return api.put(`/payments/${id}/confirm`, { transaction_id: transactionId });
  },

  /**
   * Từ chối thanh toán
   */
  rejectPayment: (id, reason) => {
    return api.put(`/payments/${id}/reject`, { reason });
  },

  // --- CÁC HÀM MỚI DÀNH CHO QUẢN TRỊ HỆ THỐNG ---

  /**
   * Lấy cấu hình thanh toán (Bank info, VNPay Keys)
   */
  getPaymentConfig: () => {
    return api.get('/payments/config');
  },

  /**
   * Cập nhật cấu hình thanh toán
   */
  updatePaymentConfig: (data) => {
    return api.put('/payments/config', data);
  },

  /**
   * Đối soát: Gọi sang VNPay kiểm tra trạng thái thực tế
   */
  checkTransactionStatus: (id) => {
    return api.get(`/payments/${id}/check-status`);
  },

  /**
   * Duyệt thủ công (Dùng cho chuyển khoản ngân hàng)
   * @param {string} id - Payment ID
   * @param {object} data - { status: 'paid'|'failed', admin_note, provider_ref }
   */
  verifyManualPayment: (id, data) => {
    return api.put(`/payments/${id}/verify-manual`, data);
  },

  /**
   * Lấy dữ liệu thống kê doanh thu
   * @param {object} params - { type: 'monthly', year: 2025 }
   */
  getRevenueStatistics: (params) => {
    return api.get('/payments/statistics/revenue', { params });
  },

  // --- THÊM MỚI 2 HÀM CHO CHỨC NĂNG HOÀN TIỀN ---
  getRefundRequests: (params) => {
    return api.get('/payments/refunds', { params });
  },

  processRefundRequest: (id, formData) => {
    return api.put(`/payments/refunds/${id}/process`, formData);
  }
};

export default paymentService;
import axios from 'axios';
import api from './api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const appointmentService = {
  /**
   * Tạo lịch hẹn mới
   */
  createAppointment: (data) => {
    return api.post('/appointments', data);
  },

  /**
   * Lấy danh sách lịch hẹn của người dùng hiện tại
   */
  getMyAppointments: (params = {}) => {
    return api.get('/appointments/my-appointments', { params });
  },

  /**
   * SỬA: Đổi tên hàm để khớp với AppointmentDetailPage.js
   * Lấy chi tiết một lịch hẹn bằng CODE
   * Backend: exports.getAppointmentById
   */
  getAppointmentByCode: (code) => {
    // 'code' sẽ được truyền vào làm 'id' trong URL
    return api.get(`/appointments/${code}`);
  },

  getAppointmentById: (id) => {
    return api.get(`/appointments/${id}`);
  },

  /**
   * Cập nhật lịch hẹn (Hàm này có thể không được dùng, nhưng giữ lại)
   */
  updateAppointment: (id, data) => {
    return api.put(`/appointments/${id}`, data);
  },

  /**
   * Hủy lịch hẹn
   * Backend: exports.cancelAppointment
   */
  cancelAppointment: (code, reason) => {
    return api.put(`/appointments/${code}/cancel`, { reason });
  },

  /**
   * Lấy lịch trống của bác sĩ theo ngày (CẬP NHẬT MỚI: Thêm serviceId và appointmentType)
   * Phân biệt rõ lấy slot cho Online hay tính capacity cho Offline
   */
  getAvailableSlots: (doctorId, date, serviceId, appointmentType = 'offline') => {
    return api.get('/appointments/available-slots', {
      params: { 
        doctor_id: doctorId, 
        date: date,
        service_id: serviceId,
        appointment_type: appointmentType
      }
    });
  },

  /**
   * Admin/Staff: Lấy tất cả lịch hẹn
   */
  getAllAppointments: (params = {}) => {
    return api.get('/appointments/admin/all', { params });
  },

  /**
   * Dashboard admin/staff: thống kê tổng quan lịch hẹn
   */
  getAppointmentStatistics: (params = {}) => {
    return api.get('/appointments/admin/statistics/overview', { params });
  },

  /**
   * Staff: Lấy danh sách lịch hẹn thuộc các bác sĩ do Staff quản lý
   */
  getStaffManagedAppointments: (params = {}) => {
    return api.get('/appointments/staff/managed', { params });
  },

  /**
   * Admin/Staff: Xác nhận lịch hẹn
   */
  confirmAppointment: (id) => {
    return api.put(`/appointments/${id}/confirm`);
  },

  /**
   * Admin/Staff: Hoàn thành lịch hẹn (Logic cũ, có thể không dùng)
   */
  completeAppointment: (id) => {
    return api.put(`/appointments/${id}/complete`);
  },

  /**
   * Doctor: Lấy lịch hẹn của bác sĩ
   */
  getDoctorAppointments: (params = {}) => {
    return api.get('/appointments/doctor/my-appointments', { params });
  },

  // --- CÁC HÀM BỔ SUNG CHO AppointmentDetailPage.js ---

  /**
   * THÊM: Đổi lịch hẹn (cho AppointmentDetailPage)
   * Backend: exports.rescheduleAppointment
   */
  rescheduleAppointment: (code, payload) => {
    // payload = { new_date, new_start_time, ... }
    return api.put(`/appointments/${code}/reschedule`, payload);
  },

  /**
   * THÊM: Cập nhật chi tiết (Admin/BS) (cho AppointmentDetailPage)
   * Backend: exports.updateAppointmentDetails
   */
  updateAppointmentDetails: (code, payload) => {
    // payload = { status, appointment_address, ... }
    return api.put(`/appointments/${code}/details`, payload);
  },

  /**
   * Check-in tại quầy (FrontDesk)
   * type: 'payment' | 'clinical'
   */
  checkIn: (code, type) => {
    return api.put(`/appointments/${code}/check-in`, { type });
  },

  callQueueNumber: (code) => {
    // Timeout riêng cho hàm này (30 giây) vì có nhiều DB transaction
    return api.put(`/appointments/${code}/call-number`, {}, { timeout: 30000 });
  },

  callAgain: (code) => {
    return api.post(`/appointments/${code}/call-again`);
  },

  getCallLogs: (date) => {
    return api.get('/appointments/call-logs', { params: { date } });
  },

  getSlotsStatsToday: (serviceId, params = {}) => {
    return api.get(`/appointments/service/${serviceId}/slots-stats-today`, { params });
  },

  // ===== [MỚI] APPOINTMENT OPTIMIZATION: Service Indications & Edge Cases =====

  /**
   * Check-in lịch hẹn tại phòng khám (cấp STT động)
   * POST /api/appointments/:id/check-in
   * Body: { is_late?: bool, override_queue?: bool }
   */
  checkInAppointment: (appointmentId, data = {}) => {
    console.log(`[LOG] checkInAppointment: ${appointmentId}`, data);
    return api.put(`/appointments/${appointmentId}/check-in`, data);
  },

  /**
   * Bác sĩ chỉ định dịch vụ phụ (Siêu âm, Lấy máu...)
   * POST /api/appointments/:id/service-indications
   * Body: { indications: [{ service_name, service_code, order_sequence, dependencies }] }
   */
  addServiceIndications: (appointmentId, indications) => {
    console.log(`[LOG] addServiceIndications: ${appointmentId}`, indications);
    return api.post(`/appointments/${appointmentId}/service-indications`, { indications });
  },

  /**
   * Bệnh nhân quẹt mã tại phòng dịch vụ (check-in động)
   * PUT /api/appointments/:id/service-indications/:indication_id/check-in
   * Body: {}
   */
  checkInServiceRoom: (appointmentId, indicationId) => {
    console.log(`[LOG] checkInServiceRoom: ${appointmentId}, indication: ${indicationId}`);
    return api.put(`/appointments/${appointmentId}/service-indications/${indicationId}/check-in`, {});
  },

  /**
   * Hoàn thành dịch vụ cận lâm sàng
   * PATCH /api/appointments/:id/service-indications/:indication_id/complete
   * Body: { result: '...' }
   */
  completeServiceIndication: (appointmentId, indicationId, result) => {
    console.log(`[LOG] completeServiceIndication: ${appointmentId}, indication: ${indicationId}`);
    return api.patch(
      `/appointments/${appointmentId}/service-indications/${indicationId}/complete`,
      { result }
    );
  },

  /**
   * Bác sĩ đánh dấu vắng mặt (no-show) cho lịch Online
   * PATCH /api/appointments/:id/no-show
   * Body: { reason: '...' }
   */
  markNoShow: (appointmentId, reason) => {
    console.log(`[LOG] markNoShow: ${appointmentId}, reason: ${reason}`);
    return api.patch(`/appointments/${appointmentId}/no-show`, { reason });
  },

  /**
   * Lấy danh sách xếp hàng của bác sĩ (gọi số tiếp theo)
   * GET /api/appointments/doctor/:doctor_id/queue
   */
  getQueueForDoctor: (doctorId, date) => {
    console.log(`[LOG] getQueueForDoctor: ${doctorId}, date: ${date}`);
    return api.get(`/appointments/doctor/${doctorId}/queue`, { params: { date } });
  },

  /**
   * Ưu tiên khám của bệnh nhân chờ quá lâu
   * PUT /api/appointments/:id/prioritize-now
   * Body: {}
   */
  prioritizeNow: (appointmentId) => {
    console.log(`[LOG] prioritizeNow: ${appointmentId}`);
    return api.put(`/appointments/${appointmentId}/prioritize-now`, {});
  },

  /**
   * Staff lâm sàng: Lấy danh sách lịch hẹn theo ngày để nhập hồ sơ
   * params: { date, doctor_id, status, search }
   */
  getClinicalQueue: (params = {}) => {
    return api.get('/appointments/staff/clinical-queue', { params });
  },

  /**
   * Khôi phục mã lịch hẹn (Public)
   */
  recoverAppointmentCodes: (contact, date) => {
    // API này là public, không dùng 'api' (instance có token)
    return axios.post(`${API_URL}/appointments/recover-codes`, { contact, date });
  },

  /**
   * Đổi phương thức thanh toán
   * Route: PUT /api/appointments/:code/change-payment-method
   * Body: { payment_method: 'cash' | 'vnpay' | 'momo' | 'bank_transfer' }
   */
  changePaymentMethod: (code, payload, guestToken = null) => {
    const config = {};
    if (guestToken) {
      config.params = { token: guestToken };
    }
    return api.put(`/appointments/${code}/change-payment-method`, payload, config);
  },

  /**
   * Thu ngân cập nhật thanh toán tại quầy
   * Route: PUT /api/appointments/:id/payment
   * Note: :id backend hỗ trợ cả appointment code hoặc numeric id
   */
  updatePaymentInfo: (idOrCode, payload) => {
    return api.put(`/appointments/${idOrCode}/payment`, payload);
  }
  ,

    /**
     * Tạo lịch hẹn phụ (sub-service appointment)
     * Doctor chỉ định dịch vụ phụ cho bệnh nhân
     * POST /api/appointments/:parent_code/sub-service
     * mode: 'immediate' (làm ngay) | 'schedule' (đặt lịch)
     */
    createSubServiceAppointment: (parentCode, payload) => {
      return api.post(`/appointments/${parentCode}/sub-service`, payload);
    }
};

export default appointmentService;
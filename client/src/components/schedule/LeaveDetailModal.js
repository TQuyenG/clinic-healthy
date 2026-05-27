// client/src/components/schedule/LeaveDetailModal.js
// Component mới: Popup chi tiết đơn nghỉ (dành cho Admin)

import React from 'react';
import './LeaveDetailModal.css';
import CalendarView from './CalendarView'; // Tái sử dụng CalendarView
import { 
  FaTimes, 
  FaPaperPlane, 
  FaSpinner, 
  FaCheck, 
  FaTrashAlt, 
  FaCalendarAlt, 
  FaClock, 
  FaUser, 
  FaInfoCircle, 
  FaCalendarCheck 
} from 'react-icons/fa';

// Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};
const formatDateOnly = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};
const getLeaveTypeText = (type) => {
  const map = {
    full_day: 'Nghỉ cả ngày',
    single_shift: 'Nghỉ 1 ca',
    time_range: 'Nghỉ theo giờ',
    multiple_days: 'Nghỉ nhiều ngày'
  };
  return map[type] || type;
};

const LeaveDetailModal = ({ isOpen, onClose, leave, workShiftConfig, onApprove, onReject, loading }) => {
  if (!isOpen || !leave) return null;

  // Xác định tháng/năm để hiển thị lịch
  const calendarDate = new Date(leave.date_from);
  const calendarMonth = calendarDate.getMonth() + 1;
  const calendarYear = calendarDate.getFullYear();

  return (
    <div className="leave-detail-modal__overlay" onClick={onClose}>
      <div className="leave-detail-modal__content" onClick={(e) => e.stopPropagation()}>
        
        <div className="leave-detail-modal__header">
          <h2>Chi tiết đơn xin nghỉ</h2>
          <button className="leave-detail-modal__btn-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="leave-detail-modal__body">
          {/* Thông tin chính */}
          <div className="leave-detail-modal__info-grid">
            <div className="leave-detail-modal__info-item">
              <FaUser />
              <div>
                <label>Nhân viên</label>
                <span>{leave.user?.full_name || 'N/A'} ({leave.user_type})</span>
              </div>
            </div>
            <div className="leave-detail-modal__info-item">
              <FaCalendarAlt />
              <div>
                <label>Loại đơn</label>
                <span>{getLeaveTypeText(leave.leave_type)}</span>
              </div>
            </div>
            <div className="leave-detail-modal__info-item">
              <FaPaperPlane />
              <div>
                <label>Ngày gửi</label>
                <span>{formatDate(leave.requested_at)}</span>
              </div>
            </div>
            <div className="leave-detail-modal__info-item">
              <FaClock />
              <div>
                <label>Thời gian nghỉ</label>
                {leave.leave_type === 'multiple_days' && (
                  <span>{formatDateOnly(leave.date_from)} - {formatDateOnly(leave.date_to)}</span>
                )}
                {leave.leave_type === 'full_day' && (
                  <span>{formatDateOnly(leave.date_from)}</span>
                )}
                {leave.leave_type === 'single_shift' && (
                  <span>{formatDateOnly(leave.date_from)} (Ca: {leave.shift_name})</span>
                )}
                {leave.leave_type === 'time_range' && (
                  <span>{formatDateOnly(leave.date_from)} (Từ {leave.time_from.slice(0, 5)} đến {leave.time_to.slice(0, 5)})</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Lý do */}
          <div className="leave-detail-modal__reason">
            <label><FaInfoCircle /> Lý do</label>
            <p>{leave.reason}</p>
          </div>

          {/* Lịch xem trước */}
          <div className="leave-detail-modal__calendar-preview">
            <label><FaCalendarCheck /> Lịch xem trước (Tháng {calendarMonth}/{calendarYear})</label>
            <CalendarView
              month={calendarMonth}
              year={calendarYear}
              workShiftConfig={workShiftConfig}
              leaveRequests={[leave]} // Chỉ truyền đơn này (đang ở trạng thái pending)
              onDateClick={() => {}} // Không cho click
            />
          </div>
        </div>

        <div className="leave-detail-modal__footer">
          <button
            className="leave-detail-modal__button leave-detail-modal__button--danger"
            onClick={onReject}
            disabled={loading}
          >
            <FaTimes /> Từ chối
          </button>
          <button
            className="leave-detail-modal__button leave-detail-modal__button--approve"
            onClick={onApprove}
            disabled={loading}
          >
            {loading ? <FaSpinner className="fa-spin" /> : <FaCheck />}
            Duyệt đơn
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveDetailModal;
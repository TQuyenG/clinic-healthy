import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaEye,
  FaBan,
  FaCheckCircle,
  FaHospital,
  FaPlay,
  FaSyncAlt,
  FaUserMd,
  FaTimesCircle,
  FaMoneyBillWave,
  FaStar,
} from 'react-icons/fa';

const AppointmentActionButtons = ({ role = 'patient', appointment, detailPath, onAction, showMinimalActions = false }) => {
  const status = appointment?.status;
  const isUpcoming = Boolean(appointment?.isUpcoming || status === 'upcoming');
  const canCancel = status !== 'completed' && status !== 'cancelled';
  const canRefund = status === 'cancelled'
    && (appointment?.payment_status === 'paid_online' || appointment?.payment_status === 'paid_at_clinic');

  const triggerAction = (action) => {
    if (typeof onAction === 'function') {
      onAction(action, appointment);
    }
  };

  return (
    <div className="admin-appt-page-action-buttons">
      {detailPath && (
        <Link to={detailPath} className="admin-appt-page-btn-action btn-view" title="Chi tiết">
          <FaEye />
          <span className="amp-btn-label">Chi tiết</span>
        </Link>
      )}

      {/* Rating actions for patients: only show when a review already exists */}
      {role === 'patient' && status === 'completed' && appointment?.payment_status && ['paid_online', 'paid_at_clinic'].includes(appointment.payment_status) && appointment?.rating && (
        <Link 
          to={`/quan-ly-lich-hen?tab=feedbacks${appointment.id ? `&feedbackId=${appointment.id}` : ''}`}
          className="admin-appt-page-btn-action btn-view"
          title="Xem đánh giá"
        >
          <FaStar />
          <span className="amp-btn-label">Xem đánh giá</span>
        </Link>
      )}

      {role === 'doctor' ? (
        <>
          {status === 'pending' && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-confirm"
              onClick={() => triggerAction('confirm')}
              title="Xác nhận"
            >
              <FaCheckCircle />
              <span className="amp-btn-label">Xác nhận</span>
            </button>
          )}

          {!showMinimalActions && (status === 'confirmed' || isUpcoming) && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-confirm"
              onClick={() => triggerAction('checkin')}
              title="Check-in"
            >
              <FaHospital />
              <span className="amp-btn-label">Check-in</span>
            </button>
          )}

          {!showMinimalActions && (status === 'confirmed' || isUpcoming || status === 'in_progress') && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-complete"
              onClick={() => triggerAction('indications')}
              title="Chỉ định dịch vụ"
            >
              <FaPlay />
              <span className="amp-btn-label">Chỉ định</span>
            </button>
          )}

          {!showMinimalActions && (status === 'confirmed' || isUpcoming) && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-confirm"
              onClick={() => triggerAction('prioritize')}
              title="Ưu tiên ngay"
            >
              <FaSyncAlt />
              <span className="amp-btn-label">Ưu tiên</span>
            </button>
          )}

          {!showMinimalActions && (status === 'confirmed' || isUpcoming || status === 'in_progress') && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-complete"
              onClick={() => triggerAction('exam')}
              title="Khám bệnh"
            >
              <FaUserMd />
              <span className="amp-btn-label">Khám</span>
            </button>
          )}

          {canCancel && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-cancel"
              onClick={() => triggerAction('cancel')}
              title="Hủy"
            >
              <FaBan />
              <span className="amp-btn-label">Hủy</span>
            </button>
          )}

          {!showMinimalActions && (status === 'confirmed' || isUpcoming) && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-cancel"
              onClick={() => triggerAction('noshow')}
              title="Vắng mặt"
            >
              <FaTimesCircle />
              <span className="amp-btn-label">Vắng mặt</span>
            </button>
          )}

          {/* Doctor: see feedbacks if patient has rated */}
          {status === 'completed' && appointment?.rating && (
            <Link 
              to={`/quan-ly-lich-hen?tab=feedbacks${appointment.id ? `&feedbackId=${appointment.id}` : ''}`}
              className="admin-appt-page-btn-action btn-view"
              title="Xem feedback"
            >
              <FaStar />
              <span className="amp-btn-label">Feedback</span>
            </Link>
          )}
        </>
      ) : (
        <>
          {(status === 'pending' || status === 'confirmed' || isUpcoming) && (
            <button
              className="admin-appt-page-btn-action appointment-management-action-cancel"
              onClick={() => triggerAction('cancel')}
              title="Hủy"
            >
              <FaBan />
              <span className="amp-btn-label">Hủy</span>
            </button>
          )}

          {canRefund && (
            <button
              className="admin-appt-page-btn-action"
              onClick={() => triggerAction('refund')}
              title="Yêu cầu hoàn tiền"
              style={{ background: '#f59e0b', color: '#fff' }}
            >
              <FaMoneyBillWave />
              <span className="amp-btn-label">Hoàn tiền</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default AppointmentActionButtons;
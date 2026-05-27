// ===== [BƯỚC 3.1] APPOINTMENT RATING MODAL (2024-05-09) =====
// client/src/components/appointments/AppointmentRatingModal.js
// 
// Purpose: Interactive modal for patient to submit 1-5 star rating + review for completed appointment
// Usage: Imported in AppointmentDetailPage, shown when appointment.status === 'completed' && no rating yet
//
// Props:
// - show (boolean): Display modal
// - onClose (function): Close handler
// - onSubmit (function): Submit handler, returns { rating, review }
// - mode ('submit'|'view'): Display mode (editable vs read-only)
// - appointment (object): Appointment data { id, code, doctor, service, rating, review, status }
// - isSubmitting (boolean): Loading state during submission
//
// AC (Access Control):
// - Visible only for patients of the appointment
// - Only when status === 'completed' or 'passed'
// - Cannot re-rate if feedback already exists (button disabled)

import React, { useState, useEffect } from 'react';
import { FaStar, FaRegStar, FaSpinner, FaTimes, FaExclamationTriangle, FaCommentDots } from 'react-icons/fa';
import './AppointmentRatingModal.css';

const AppointmentRatingModal = ({
  show,
  onClose,
  onSubmit,
  mode = 'submit',
  appointment = null,
  isSubmitting = false,
  contextType = 'appointment'
}) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState('');

  const isViewMode = mode === 'view';
  const MAX_REVIEW_LENGTH = 1000;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (show) {
      if ((isViewMode || contextType === 'doctor') && appointment && appointment.rating) {
        setRating(appointment.rating || 0);
        setReview(appointment.review || '');
      } else {
        setRating(0);
        setReview('');
      }
      setError('');
    }
  }, [show, isViewMode, appointment]);

  if (!show) return null;

  // Normalize doctor/service naming for different appointment payload shapes
  const doctorName = appointment?.Doctor?.user?.full_name || appointment?.Doctor?.User?.full_name || appointment?.doctor?.full_name || appointment?.full_name || appointment?.user?.full_name || appointment?.doctor_name || 'N/A';
  const serviceName = contextType === 'doctor'
    ? (appointment?.specialty?.name || appointment?.specialty_name || 'Bác sĩ')
    : (contextType === 'consultation'
      ? (appointment?.service_name || appointment?.consultation_type || 'Tư vấn trực tuyến')
      : (appointment?.Service?.name || appointment?.service?.name || appointment?.service_name || 'N/A'));

  const modalTitle = isViewMode
    ? 'Đánh giá của bạn'
    : (contextType === 'doctor' ? 'Đánh giá bác sĩ' : 'Đánh giá lịch hẹn');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá (từ 1 đến 5)');
      return;
    }

    if (review.trim().length === 0) {
      setError('Vui lòng nhập nội dung đánh giá');
      return;
    }

    if (review.length > MAX_REVIEW_LENGTH) {
      setError(`Nội dung không vượt quá ${MAX_REVIEW_LENGTH} ký tự`);
      return;
    }

    // Clear error and submit
    setError('');
    onSubmit({ rating, review: review.trim() });
  };

  const handleReviewChange = (e) => {
    const text = e.target.value;
    setReview(text);
    if (text.length > MAX_REVIEW_LENGTH) {
      setError(`Nội dung vượt quá ${MAX_REVIEW_LENGTH} ký tự`);
    } else {
      setError('');
    }
  };

  return (
    <div className="appointment-rating-modal-overlay" onClick={onClose}>
      <div 
        className="appointment-rating-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          
          {/* ===== Modal Header ===== */}
          <div className="appointment-rating-modal-header">
            <h3 className="appointment-rating-modal-title">
                {isViewMode ? (
                  <><FaCommentDots style={{ marginRight: 8 }} /> Đánh giá của bạn</>
                ) : (
                  <><FaStar style={{ marginRight: 8 }} /> {modalTitle}</>
                )}
            </h3>
            <button
              type="button"
              className="appointment-rating-modal-btn-close"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Đóng"
            >
              <FaTimes size={16} />
            </button>
          </div>

          {/* ===== Modal Body ===== */}
          <div className="appointment-rating-modal-body">
            
            {/* Appointment Info */}
            {appointment && (
              <div className="appointment-rating-info">
                <div className="appointment-rating-info-row">
                  <span className="appointment-rating-label">{contextType === 'doctor' ? 'Bác sĩ:' : 'Bác sĩ:'}</span>
                  <span className="appointment-rating-value">{doctorName}</span>
                </div>
                <div className="appointment-rating-info-row">
                  <span className="appointment-rating-label">
                    {contextType === 'doctor' ? 'Chuyên khoa:' : (contextType === 'consultation' ? 'Dịch vụ:' : 'Dịch vụ:')}
                  </span>
                  <span className="appointment-rating-value">{serviceName}</span>
                </div>
                <div className="appointment-rating-info-row">
                  <span className="appointment-rating-label">
                    {contextType === 'doctor' ? 'Mã bác sĩ:' : (contextType === 'consultation' ? 'Mã tư vấn:' : 'Mã lịch hẹn:')}
                  </span>
                  <span className="appointment-rating-value">
                    {appointment?.code || appointment?.id}
                  </span>
                </div>
              </div>
            )}

            {/* Stars Rating */}
            <div className="appointment-rating-section">
              <label className="appointment-rating-section-label">
                {isViewMode 
                  ? 'Xếp hạng của bạn:' 
                  : (contextType === 'doctor' ? '🎯 Bạn cảm thấy hài lòng với bác sĩ này?' : (contextType === 'consultation' ? '🎯 Bạn cảm thấy hài lòng với buổi tư vấn này?' : '🎯 Bạn cảm thấy hài lòng với lịch hẹn này?'))}
              </label>
                <div className="appointment-rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`appointment-rating-star ${!isViewMode ? 'interactive' : ''}`}
                      onMouseEnter={() => !isViewMode && setHoverRating(star)}
                      onMouseLeave={() => !isViewMode && setHoverRating(0)}
                      onClick={() => !isViewMode && setRating(star)}
                      aria-label={`Chọn ${star} sao`}
                      style={{ background: 'transparent', border: 'none', padding: 4, cursor: !isViewMode ? 'pointer' : 'default' }}
                    >
                      {star <= (hoverRating || rating) ? (
                        <FaStar size={20} color="#FFD700" />
                      ) : (
                        <FaRegStar size={20} color="#CCC" />
                      )}
                    </button>
                  ))}
                </div>
              {rating > 0 && (
                <p className="appointment-rating-display">
                  ({rating}/5 sao)
                </p>
              )}
            </div>

            {/* Review Text */}
            <div className="appointment-rating-section">
              <label htmlFor="appointment-review-text" className="appointment-rating-section-label">
                💬 Nhận xét thêm (tùy chọn - tối đa {MAX_REVIEW_LENGTH} ký tự)
              </label>
              <textarea
                id="appointment-review-text"
                className="appointment-rating-textarea"
                placeholder={contextType === 'doctor'
                  ? 'Chia sẻ ý kiến của bạn về bác sĩ...'
                  : (contextType === 'consultation'
                    ? 'Chia sẻ ý kiến của bạn về buổi tư vấn, bác sĩ, dịch vụ...'
                    : 'Chia sẻ ý kiến của bạn về lịch hẹn, bác sĩ, dịch vụ...')}
                value={review}
                onChange={handleReviewChange}
                disabled={isViewMode || isSubmitting}
                maxLength={MAX_REVIEW_LENGTH}
                rows={5}
              />
              <div className="appointment-rating-char-count">
                {review.length}/{MAX_REVIEW_LENGTH}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="appointment-rating-error">
                <FaExclamationTriangle style={{ marginRight: 8 }} /> {error}
              </div>
            )}

          </div>

          {/* ===== Modal Footer ===== */}
          <div className="appointment-rating-modal-footer">
            <button
              type="button"
              className="appointment-rating-btn appointment-rating-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            {!isViewMode && (
              <button
                type="submit"
                className="appointment-rating-btn appointment-rating-btn-submit"
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="appointment-rating-spinner" />
                    Đang gửi...
                  </>
                ) : (
                  '✓ Gửi đánh giá'
                )}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default AppointmentRatingModal;

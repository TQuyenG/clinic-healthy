// client/src/components/schedule/LeaveRequestModal.js
// ĐÃ SỬA: Cập nhật CSS, Icons, và nhận prop 'loading'

import React, { useState, useEffect } from 'react';
import './LeaveRequestModal.css'; // Import CSS mới
import { FaTimes, FaExclamationTriangle, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import { MdOutlineMailOutline } from 'react-icons/md';

// SỬA LỖI: Nhận prop 'loading' từ MySchedulePage
const LeaveRequestModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    leave_type: 'full_day',
    date_from: '',
    date_to: '',
    shift_name: 'morning',
    time_from: '09:00',
    time_to: '11:00',
    reason: ''
  });

  const [errors, setErrors] = useState({});

  // Reset form khi modal được mở
  useEffect(() => {
    if (isOpen) {
      setFormData({
        leave_type: 'full_day',
        date_from: '',
        date_to: '',
        shift_name: 'morning',
        time_from: '09:00',
        time_to: '11:00',
        reason: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error khi user sửa
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.date_from) {
      newErrors.date_from = 'Vui lòng chọn ngày nghỉ';
    } else {
      // Check phải gửi trước 1 ngày
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dateFrom = new Date(formData.date_from);
      if (dateFrom < tomorrow) {
        newErrors.date_from = 'Phải gửi đơn trước ít nhất 1 ngày';
      }
    }

    if (formData.leave_type === 'multiple_days') {
      if (!formData.date_to) {
        newErrors.date_to = 'Vui lòng chọn ngày kết thúc';
      } else if (formData.date_from && formData.date_to < formData.date_from) {
        newErrors.date_to = 'Ngày kết thúc phải sau ngày bắt đầu';
      }
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Vui lòng nhập lý do xin nghỉ';
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Lý do phải có ít nhất 10 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate() || loading) { // Không gửi nếu đang loading
      return;
    }

    // Prepare data theo leave_type
    const submitData = {
      leave_type: formData.leave_type,
      date_from: formData.date_from,
      reason: formData.reason
    };

    if (formData.leave_type === 'multiple_days') {
      submitData.date_to = formData.date_to;
    } else if (formData.leave_type === 'single_shift') {
      submitData.shift_name = formData.shift_name;
    } else if (formData.leave_type === 'time_range') {
      submitData.time_from = `${formData.time_from}:00`;
      submitData.time_to = `${formData.time_to}:00`;
    }

    onSubmit(submitData);
  };

  return (
    // Sử dụng class name mới
    <div className="leave-request-modal__overlay" onClick={onClose}>
      <div className="leave-request-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="leave-request-modal__header">
          <h2><MdOutlineMailOutline /> Đơn xin nghỉ</h2>
          <button className="leave-request-modal__btn-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="leave-request-modal__body">
          {/* Loại nghỉ */}
          <div className="leave-request-modal__form-group">
            <label>Loại xin nghỉ *</label>
            <select 
              name="leave_type" 
              value={formData.leave_type}
              onChange={handleChange}
              className="leave-request-modal__form-control"
              disabled={loading}
            >
              <option value="full_day">Nghỉ cả ngày</option>
              <option value="single_shift">Nghỉ 1 ca (sáng/chiều/tối)</option>
              <option value="time_range">Nghỉ khoảng giờ cụ thể</option>
              <option value="multiple_days">Nghỉ nhiều ngày liên tục</option>
            </select>
          </div>

          {/* Ngày nghỉ */}
          {formData.leave_type !== 'multiple_days' && (
            <div className="leave-request-modal__form-group">
              <label>Ngày nghỉ *</label>
              <input
                type="date"
                name="date_from"
                value={formData.date_from}
                onChange={handleChange}
                className={`leave-request-modal__form-control ${errors.date_from ? 'leave-request-modal__form-control--error' : ''}`}
                disabled={loading}
              />
              {errors.date_from && <span className="leave-request-modal__error-text">{errors.date_from}</span>}
            </div>
          )}

          {/* Nhiều ngày */}
          {formData.leave_type === 'multiple_days' && (
            <div className="leave-request-modal__form-row">
              <div className="leave-request-modal__form-group">
                <label>Từ ngày *</label>
                <input
                  type="date"
                  name="date_from"
                  value={formData.date_from}
                  onChange={handleChange}
                  className={`leave-request-modal__form-control ${errors.date_from ? 'leave-request-modal__form-control--error' : ''}`}
                  disabled={loading}
                />
                {errors.date_from && <span className="leave-request-modal__error-text">{errors.date_from}</span>}
              </div>

              <div className="leave-request-modal__form-group">
                <label>Đến ngày *</label>
                <input
                  type="date"
                  name="date_to"
                  value={formData.date_to}
                  onChange={handleChange}
                  className={`leave-request-modal__form-control ${errors.date_to ? 'leave-request-modal__form-control--error' : ''}`}
                  disabled={loading}
                />
                {errors.date_to && <span className="leave-request-modal__error-text">{errors.date_to}</span>}
              </div>
            </div>
          )}

          {/* Chọn ca */}
          {formData.leave_type === 'single_shift' && (
            <div className="leave-request-modal__form-group">
              <label>Chọn ca *</label>
              <select 
                name="shift_name" 
                value={formData.shift_name}
                onChange={handleChange}
                className="leave-request-modal__form-control"
                disabled={loading}
              >
                <option value="morning">Ca sáng</option>
                <option value="afternoon">Ca chiều</option>
                <option value="evening">Ca tối</option>
              </select>
            </div>
          )}

          {/* Khoảng giờ */}
          {formData.leave_type === 'time_range' && (
            <div className="leave-request-modal__form-row">
              <div className="leave-request-modal__form-group">
                <label>Từ giờ *</label>
                <input
                  type="time"
                  name="time_from"
                  value={formData.time_from}
                  onChange={handleChange}
                  className="leave-request-modal__form-control"
                  disabled={loading}
                />
              </div>

              <div className="leave-request-modal__form-group">
                <label>Đến giờ *</label>
                <input
                  type="time"
                  name="time_to"
                  value={formData.time_to}
                  onChange={handleChange}
                  className="leave-request-modal__form-control"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Lý do */}
          <div className="leave-request-modal__form-group">
            <label>Lý do xin nghỉ *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className={`leave-request-modal__form-control ${errors.reason ? 'leave-request-modal__form-control--error' : ''}`}
              rows="4"
              placeholder="Nhập lý do xin nghỉ (ít nhất 10 ký tự)..."
              disabled={loading}
            />
            {errors.reason && <span className="leave-request-modal__error-text">{errors.reason}</span>}
          </div>

          {/* Warning */}
          <div className="leave-request-modal__warning-box">
            <FaExclamationTriangle style={{ color: "var(--color-primary-dark)", fontSize: "1.2rem" }} />
            <span><strong>Lưu ý:</strong> Phải gửi đơn xin nghỉ trước ít nhất 1 ngày. Đơn sẽ được gửi đến Admin/Quản lý để chờ duyệt.</span>
          </div>
        </form>

        {/* Buttons Footer */}
        <div className="leave-request-modal__footer">
          <button 
            type="button" 
            className="leave-request-modal__button leave-request-modal__button--secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button 
            type="submit" 
            className="leave-request-modal__button leave-request-modal__button--primary"
            onClick={handleSubmit} // Sửa: gọi handleSubmit
            disabled={loading} // Sửa: Dùng prop loading
          >
            {loading ? <FaSpinner className="fa-spin" /> : <FaPaperPlane />}
            {loading ? 'Đang gửi...' : 'Gửi đơn'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestModal;
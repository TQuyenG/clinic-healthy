// client/src/components/schedule/EditScheduleForm.js
import React, { useState } from 'react';
import { updateSchedule } from '../../services/scheduleService';
import './EditScheduleForm.css';

const EditScheduleForm = ({ schedule, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: schedule.date || '',
    start_time: schedule.start_time?.substring(0, 5) || '',
    end_time: schedule.end_time?.substring(0, 5) || '',
    status: schedule.status || 'available',
    reason: schedule.reason || '',
    schedule_type: schedule.schedule_type || 'fixed'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.date || !formData.start_time || !formData.end_time) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      alert('⚠️ Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn cập nhật lịch này?')) {
      return;
    }

    setLoading(true);
    try {
      await updateSchedule(schedule.id, formData);
      alert('✅ Cập nhật lịch thành công!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating schedule:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Không thể cập nhật lịch';
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-schedule-form">
      <div className="form-header">
        <h2>✏️ Chỉnh sửa lịch làm việc</h2>
        <p className="form-subtitle">
          Cập nhật thông tin lịch làm việc của{' '}
          <strong>{schedule.User?.full_name || 'N/A'}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Thông tin nhân viên */}
        <div className="info-box">
          <div className="info-row">
            <span className="info-label">👤 Nhân viên:</span>
            <span className="info-value">{schedule.User?.full_name || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">🏷️ Vai trò:</span>
            <span className="info-value">
              {schedule.User?.role === 'doctor' ? '👨‍⚕️ Bác sĩ' : '👔 Nhân viên'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">📋 Loại lịch:</span>
            <span className="info-value">
              {formData.schedule_type === 'fixed' ? 'Lịch cố định' :
               formData.schedule_type === 'overtime' ? 'Tăng ca' :
               formData.schedule_type === 'leave' ? 'Nghỉ phép' : 'Khác'}
            </span>
          </div>
        </div>

        {/* Ngày làm việc */}
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">📅</span>
            Ngày làm việc *
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="form-input"
            min={new Date().toISOString().split('T')[0]}
          />
          <small className="input-hint">
            💡 Chọn ngày làm việc mới
          </small>
        </div>

        {/* Giờ bắt đầu */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🕐</span>
              Giờ bắt đầu *
            </label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          {/* Giờ kết thúc */}
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🕐</span>
              Giờ kết thúc *
            </label>
            <input
              type="time"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
        </div>

        {/* Thời gian làm việc */}
        {formData.start_time && formData.end_time && (
          <div className="duration-display">
            <span className="duration-icon">⏱️</span>
            <span className="duration-text">
              Thời gian làm việc:{' '}
              <strong>
                {(() => {
                  const [startH, startM] = formData.start_time.split(':').map(Number);
                  const [endH, endM] = formData.end_time.split(':').map(Number);
                  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
                })()}
              </strong>
            </span>
          </div>
        )}

        {/* Trạng thái */}
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">🎯</span>
            Trạng thái *
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="form-select"
          >
            <option value="available">✅ Còn trống</option>
            <option value="booked">📅 Đã đặt</option>
            <option value="pending">⏳ Chờ duyệt</option>
            <option value="approved">✔️ Đã duyệt</option>
            <option value="rejected">❌ Từ chối</option>
            <option value="cancelled">🚫 Đã hủy</option>
          </select>
          <small className="input-hint">
            💡 Thay đổi trạng thái sẽ ảnh hưởng đến khả năng đặt lịch
          </small>
        </div>

        {/* Ghi chú/Lý do */}
        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">📝</span>
            Ghi chú / Lý do (tùy chọn)
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="VD: Thay đổi ca làm do có việc đột xuất..."
            rows="4"
            className="form-textarea"
            maxLength="500"
          />
          <div className="char-count">
            {formData.reason.length}/500 ký tự
          </div>
        </div>

        {/* Preview changes */}
        <div className="changes-preview">
          <h4>🔍 Thay đổi</h4>
          <div className="changes-content">
            {schedule.date !== formData.date && (
              <div className="change-item">
                <span className="change-label">Ngày:</span>
                <span className="change-old">{schedule.date}</span>
                <span className="change-arrow">→</span>
                <span className="change-new">{formData.date}</span>
              </div>
            )}
            {schedule.start_time?.substring(0, 5) !== formData.start_time && (
              <div className="change-item">
                <span className="change-label">Giờ bắt đầu:</span>
                <span className="change-old">{schedule.start_time?.substring(0, 5)}</span>
                <span className="change-arrow">→</span>
                <span className="change-new">{formData.start_time}</span>
              </div>
            )}
            {schedule.end_time?.substring(0, 5) !== formData.end_time && (
              <div className="change-item">
                <span className="change-label">Giờ kết thúc:</span>
                <span className="change-old">{schedule.end_time?.substring(0, 5)}</span>
                <span className="change-arrow">→</span>
                <span className="change-new">{formData.end_time}</span>
              </div>
            )}
            {schedule.status !== formData.status && (
              <div className="change-item">
                <span className="change-label">Trạng thái:</span>
                <span className="change-old">{schedule.status}</span>
                <span className="change-arrow">→</span>
                <span className="change-new">{formData.status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Đang lưu...
              </>
            ) : (
              <>
                <span>💾</span>
                Lưu thay đổi
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            ❌ Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditScheduleForm;
// client/src/components/schedule/CreateOvertimeSlotForm.js - COMPLETE WITH USER ASSIGNMENT
import React, { useState, useEffect } from 'react';
import { createOvertimeSlots } from '../../services/scheduleService';
import api from '../../services/api';
import { TIME_SLOTS } from '../../utils/constants';
import './CreateOvertimeSlotForm.css';

const CreateOvertimeSlotForm = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [mode, setMode] = useState('slots'); // 'slots' hoặc 'assign'
  
  const [formData, setFormData] = useState({
    date: '',
    start_time: '18:00',
    end_time: '20:00',
    max_slots: 5,
    description: '',
    assigned_user_id: null
  });

  useEffect(() => {
    if (mode === 'assign') {
      fetchUsers();
    }
  }, [mode]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/users/by-role', {
        params: { role: 'doctor,staff', limit: 100 }
      });

      if (response.data.success) {
        const allUsers = response.data.data || [];
        setUsers(allUsers.map(u => ({
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          avatar_url: u.avatar_url,
          specialty: u.doctorInfo?.Specialty?.name || null,
          displayName: u.role === 'doctor' ? `BS. ${u.full_name}` : u.full_name
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Không thể tải danh sách nhân viên');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setFormData(prev => ({
      ...prev,
      max_slots: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.date) {
      alert('⚠️ Vui lòng chọn ngày làm tăng ca');
      return;
    }

    // Validate date is in future
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      alert('⚠️ Không thể tạo slot tăng ca cho ngày trong quá khứ');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      alert('⚠️ Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }

    // Validate theo mode
    if (mode === 'slots') {
      if (formData.max_slots < 1 || formData.max_slots > 20) {
        alert('⚠️ Số lượng slot phải từ 1-20');
        return;
      }
    } else {
      if (!formData.assigned_user_id) {
        alert('⚠️ Vui lòng chọn nhân viên để chỉ định');
        return;
      }
    }

    // Confirm before creating
    const confirmMsg = mode === 'slots' 
      ? `
Bạn sắp tạo ${formData.max_slots} slot tăng ca:
📅 Ngày: ${new Date(formData.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
🕐 Giờ: ${formData.start_time} - ${formData.end_time}
${formData.description ? `📝 Mô tả: ${formData.description}` : ''}

⚡ Các slot này sẽ mở cho bác sĩ/nhân viên đăng ký.
Tất cả bác sĩ và nhân viên sẽ nhận được thông báo.

Bạn có chắc chắn muốn tạo?
      `.trim()
      : `
Bạn sắp chỉ định tăng ca trực tiếp:
👤 Người được chỉ định: ${users.find(u => u.id === parseInt(formData.assigned_user_id))?.displayName}
📅 Ngày: ${new Date(formData.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
🕐 Giờ: ${formData.start_time} - ${formData.end_time}
${formData.description ? `📝 Mô tả: ${formData.description}` : ''}

⚡ Lịch tăng ca sẽ được PHÊ DUYỆT TỰ ĐỘNG.
Người được chỉ định sẽ nhận thông báo ngay lập tức.

Bạn có chắc chắn muốn tạo?
      `.trim();

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        dates: [formData.date], // ✅ FIX: Backend expects array
        start_time: formData.start_time,
        end_time: formData.end_time,
        description: formData.description || null
      };

      if (mode === 'slots') {
        payload.max_slots = formData.max_slots;
      } else {
        payload.assigned_user_id = parseInt(formData.assigned_user_id);
      }

      const result = await createOvertimeSlots(payload);
      
      const successMsg = mode === 'slots'
        ? result.message || `✅ Đã tạo thành công ${formData.max_slots} slot tăng ca!`
        : result.message || `✅ Đã chỉ định ${users.find(u => u.id === parseInt(formData.assigned_user_id))?.full_name} tăng ca thành công!`;
      
      alert(successMsg);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating overtime slots:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    if (!formData.start_time || !formData.end_time) return 0;
    
    const [startHour, startMin] = formData.start_time.split(':').map(Number);
    const [endHour, endMin] = formData.end_time.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return (endMinutes - startMinutes) / 60;
  };

  const duration = calculateDuration();
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="create-overtime-form">
      <div className="form-header-card">
        <div className="header-icon">⚡</div>
        <div>
          <h2>Tạo Lịch Tăng Ca</h2>
          <p>Chọn cách tạo lịch tăng ca phù hợp</p>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="mode-selection">
        <div className="mode-header">
          <span className="mode-icon">🎯</span>
          <h3>Chọn cách tạo lịch</h3>
        </div>
        <div className="mode-options">
          <button
            type="button"
            className={`mode-btn ${mode === 'slots' ? 'active' : ''}`}
            onClick={() => setMode('slots')}
            disabled={loading}
          >
            <span className="mode-btn-icon">📋</span>
            <div className="mode-btn-content">
              <strong>Tạo Slot Trống</strong>
              <small>Để bác sĩ/nhân viên đăng ký</small>
            </div>
          </button>
          
          <button
            type="button"
            className={`mode-btn ${mode === 'assign' ? 'active' : ''}`}
            onClick={() => setMode('assign')}
            disabled={loading}
          >
            <span className="mode-btn-icon">👤</span>
            <div className="mode-btn-content">
              <strong>Chỉ Định Trực Tiếp</strong>
              <small>Chọn nhân viên cụ thể</small>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Ngày làm tăng ca */}
        <div className="form-section-modern">
          <label className="modern-label">
            <span className="label-icon">📅</span>
            Ngày làm tăng ca *
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={minDate}
            required
            className="modern-input"
          />
          <small className="input-hint">
            💡 Chỉ có thể tạo lịch cho ngày trong tương lai
          </small>
        </div>

        {/* Thời gian */}
        <div className="form-row-modern">
          <div className="form-section-modern">
            <label className="modern-label">
              <span className="label-icon">🕐</span>
              Giờ bắt đầu *
            </label>
            <select
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              required
              className="modern-select"
            >
              {TIME_SLOTS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div className="arrow-separator">→</div>

          <div className="form-section-modern">
            <label className="modern-label">
              <span className="label-icon">🕐</span>
              Giờ kết thúc *
            </label>
            <select
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              required
              className="modern-select"
            >
              {TIME_SLOTS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration info */}
        {duration > 0 && (
          <div className="duration-info">
            ⏱️ Thời lượng: <strong>{duration} giờ</strong>
          </div>
        )}
        {duration <= 0 && (
          <div className="duration-error">
            ⚠️ Giờ kết thúc phải sau giờ bắt đầu
          </div>
        )}

        {/* Conditional: Số lượng slot hoặc Chọn user */}
        {mode === 'slots' ? (
          <div className="form-section-modern">
            <label className="modern-label">
              <span className="label-icon">👥</span>
              Số lượng slot (người có thể đăng ký) *
            </label>
            <div className="slider-container">
              <input
                type="range"
                name="max_slots"
                value={formData.max_slots}
                onChange={handleSliderChange}
                min="1"
                max="20"
                className="modern-slider"
              />
              <div className="slider-value-display">
                <span className="slider-value">{formData.max_slots}</span>
                <span className="slider-unit">slot</span>
              </div>
            </div>
            <div className="slider-labels">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
            </div>
            <small className="input-hint">
              💡 Mỗi slot = 1 người có thể đăng ký. Khuyến nghị: 3-10 slot
            </small>
          </div>
        ) : (
          <div className="form-section-modern">
            <label className="modern-label">
              <span className="label-icon">👤</span>
              Chọn nhân viên để chỉ định *
            </label>
            {loadingUsers ? (
              <div className="loading-users">
                <span className="spinner-small"></span>
                Đang tải danh sách...
              </div>
            ) : (
              <select
                name="assigned_user_id"
                value={formData.assigned_user_id || ''}
                onChange={handleChange}
                required
                className="modern-select"
              >
                <option value="">-- Chọn nhân viên --</option>
                <optgroup label="Bác sĩ">
                  {users.filter(u => u.role === 'doctor').map(user => (
                    <option key={user.id} value={user.id}>
                      BS. {user.full_name} {user.specialty && `(${user.specialty})`}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Nhân viên">
                  {users.filter(u => u.role === 'staff').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}
            <small className="input-hint">
              💡 Người được chỉ định sẽ được PHÊ DUYỆT TỰ ĐỘNG
            </small>
          </div>
        )}

        {/* Mô tả */}
        <div className="form-section-modern">
          <label className="modern-label">
            <span className="label-icon">📝</span>
            Mô tả ca tăng ca (tùy chọn)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="VD: Tăng ca cuối tuần, cần hỗ trợ thêm nhân sự do lượng bệnh nhân tăng cao..."
            rows="4"
            className="modern-textarea"
            maxLength="500"
          />
          <div className="char-count">
            {formData.description.length}/500 ký tự
          </div>
        </div>

        {/* Preview */}
        <div className="preview-card">
          <h4>🔍 Xem trước</h4>
          <div className="preview-content">
            <div className="preview-item">
              <span className="preview-label">📅 Ngày:</span>
              <span className="preview-value">
                {formData.date 
                  ? new Date(formData.date).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Chưa chọn ngày'
                }
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">🕐 Giờ làm việc:</span>
              <span className="preview-value">
                {formData.start_time} - {formData.end_time}
                {duration > 0 && ` (${duration}h)`}
              </span>
            </div>
            {mode === 'slots' ? (
              <div className="preview-item">
                <span className="preview-label">👥 Số slot:</span>
                <span className="preview-value highlight">
                  {formData.max_slots} người có thể đăng ký
                </span>
              </div>
            ) : (
              <div className="preview-item">
                <span className="preview-label">👤 Người được chỉ định:</span>
                <span className="preview-value highlight">
                  {formData.assigned_user_id 
                    ? users.find(u => u.id === parseInt(formData.assigned_user_id))?.displayName
                    : 'Chưa chọn'}
                </span>
              </div>
            )}
            {formData.description && (
              <div className="preview-item full-width">
                <span className="preview-label">📝 Mô tả:</span>
                <span className="preview-value">{formData.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className={`info-box ${mode === 'assign' ? 'warning' : 'success'}`}>
          <div className="info-icon">ℹ️</div>
          <div>
            {mode === 'slots' ? (
              <>
                <strong>Lưu ý khi tạo slot tăng ca:</strong>
                <ul>
                  <li>Slot sẽ được tạo với trạng thái <strong>"Còn trống"</strong> (available)</li>
                  <li>Bác sĩ/nhân viên sẽ thấy và có thể đăng ký vào các slot này</li>
                  <li>Sau khi họ đăng ký, slot chuyển sang <strong>"Chờ duyệt"</strong> (pending)</li>
                  <li>Bạn cần <strong>phê duyệt</strong> yêu cầu trong tab "Chờ duyệt"</li>
                  <li>Tất cả bác sĩ và nhân viên sẽ nhận được <strong>thông báo</strong> ngay lập tức</li>
                </ul>
              </>
            ) : (
              <>
                <strong>Lưu ý khi chỉ định trực tiếp:</strong>
                <ul>
                  <li>Lịch tăng ca sẽ được <strong>PHÊ DUYỆT TỰ ĐỘNG</strong></li>
                  <li>Người được chỉ định sẽ nhận <strong>thông báo ngay lập tức</strong></li>
                  <li>Không cần qua bước chờ duyệt</li>
                  <li>Phù hợp cho trường hợp <strong>khẩn cấp</strong> hoặc đã thỏa thuận trước</li>
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Warning for high slot count */}
        {mode === 'slots' && formData.max_slots > 10 && (
          <div className="info-box warning">
            <div className="info-icon">⚠️</div>
            <div>
              <strong>Cảnh báo:</strong> Bạn đang tạo {formData.max_slots} slot. 
              Đây là số lượng khá lớn. Hãy chắc chắn rằng bạn thực sự cần nhiều người đến vậy.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="form-actions-modern">
          <button
            type="submit"
            className="btn-submit-modern"
            disabled={loading || duration <= 0}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Đang tạo...
              </>
            ) : (
              <>
                <span>⚡</span>
                {mode === 'slots' 
                  ? `Tạo ${formData.max_slots} Slot Tăng Ca`
                  : 'Chỉ Định Tăng Ca'
                }
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-cancel-modern"
            onClick={onCancel}
            disabled={loading}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOvertimeSlotForm;
// client/src/components/schedule/LeaveForm.js - FIXED VERSION
import React, { useState } from 'react';
import { LEAVE_REASONS } from '../../utils/constants';
import { requestLeave } from '../../services/scheduleService';
import './ScheduleForm.css';

const LeaveForm = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date_from: '',
    date_to: '',
    reason: '',
    reason_type: 'Việc gia đình'
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
    
    // ✅ Validation đầy đủ
    if (!formData.date_from || !formData.date_to || !formData.reason.trim()) {
      alert('⚠️ Vui lòng điền đầy đủ thông tin');
      return;
    }

    // ✅ Validate lý do tối thiểu 20 ký tự
    if (formData.reason.trim().length < 20) {
      alert('⚠️ Lý do phải có ít nhất 20 ký tự để Admin có thể xét duyệt');
      return;
    }

    // Validate ngày
    const startDate = new Date(formData.date_from);
    const endDate = new Date(formData.date_to);
    
    if (startDate > endDate) {
      alert('⚠️ Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      return;
    }

    // ✅ FIX: Validate phải đăng ký trước 3 NGÀY (không phải 1 ngày)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(0, 0, 0, 0);
    
    if (startDate < threeDaysLater) {
      alert('⚠️ Phải đăng ký nghỉ phép trước ít nhất 3 ngày để Admin có thời gian xếp lịch thay thế');
      return;
    }

    // ✅ Validate không nghỉ quá 30 ngày liên tục
    const days = calculateDays();
    if (days > 30) {
      alert('⚠️ Không thể nghỉ phép quá 30 ngày liên tục. Vui lòng chia thành nhiều đơn.');
      return;
    }

    // ✅ Confirmation dialog với preview đầy đủ
    const confirmMsg = `
🖐️ XÁC NHẬN ĐƠN XIN NGHỈ PHÉP

📅 Từ ngày: ${formatDateVN(startDate)}
📅 Đến ngày: ${formatDateVN(endDate)}
📊 Tổng số ngày: ${days} ngày

🏷️ Loại: ${formData.reason_type}
📝 Lý do: ${formData.reason.trim()}

⚠️ Lưu ý quan trọng:
- Đơn sẽ được gửi đến Admin xét duyệt
- Ngay cả khi đã có lịch làm việc hoặc lịch hẹn, bạn vẫn có thể xin nghỉ
- Admin sẽ xem xét và điều chỉnh lịch nếu cần thiết
- Bạn sẽ nhận thông báo khi có kết quả

Bạn có chắc chắn muốn gửi đơn xin nghỉ phép?
    `.trim();

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);
    try {
      const result = await requestLeave(formData);
      
      // ✅ FIX: Hiển thị đúng số ngày từ response
      const actualDays = result.total_days || days;
      
      let successMsg = `✅ Đã gửi đơn xin nghỉ phép ${actualDays} ngày thành công!\n\n`;
      successMsg += `📅 Từ ${formatDateVN(startDate)} đến ${formatDateVN(endDate)}\n\n`;
      successMsg += `⏳ Đơn đang chờ Admin phê duyệt. Bạn sẽ nhận thông báo khi có kết quả.\n\n`;
      
      // ✅ Hiển thị cảnh báo nếu có
      if (result.warnings) {
        if (result.warnings.existing_work_schedules > 0) {
          successMsg += `⚠️ Có ${result.warnings.existing_work_schedules} ngày đã có lịch làm việc.\n`;
        }
        if (result.warnings.existing_appointments > 0) {
          successMsg += `⚠️ Có ${result.warnings.existing_appointments} lịch hẹn đã được đặt.\n`;
        }
        if (result.warnings.existing_work_schedules > 0 || result.warnings.existing_appointments > 0) {
          successMsg += `\n✅ Admin sẽ xem xét và điều chỉnh lịch khi duyệt đơn của bạn.`;
        }
      }
      
      alert(successMsg);
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error requesting leave:', error);
      
      // ✅ FIX: Detailed error handling
      const errorData = error.response?.data;
      const errorMsg = errorData?.message || error.message;
      
      // ❌ Trùng đơn nghỉ phép
      if (errorData?.existing_leave_requests) {
        const duplicateDates = errorData.existing_leave_requests.map(l => l.dateVN).join(', ');
        alert(`❌ Không thể tạo đơn nghỉ phép vì đã có đơn nghỉ khác trong các ngày:\n\n${duplicateDates}\n\n💡 Hãy kiểm tra lại "Lịch sử yêu cầu" hoặc chọn khoảng thời gian khác.`);
      }
      // ❌ Lỗi đăng ký trước 3 ngày
      else if (errorMsg?.includes('3 ngày')) {
        alert('❌ Phải đăng ký nghỉ phép trước ít nhất 3 ngày để Admin có thời gian xếp lịch thay thế.');
      }
      // ❌ Lỗi khác
      else {
        alert(`❌ ${errorMsg || 'Có lỗi xảy ra khi gửi đơn'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Tính số ngày nghỉ
  const calculateDays = () => {
    if (formData.date_from && formData.date_to) {
      const start = new Date(formData.date_from);
      const end = new Date(formData.date_to);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  // Format date cho người Việt
  const formatDateVN = (date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Tính số cuối tuần
  const countWeekends = () => {
    if (!formData.date_from || !formData.date_to) return 0;
    
    let count = 0;
    const start = new Date(formData.date_from);
    const end = new Date(formData.date_to);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || day === 6) count++;
    }
    
    return count;
  };

  // ✅ FIX: Min date phải là 3 ngày sau
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const minDate = threeDaysLater.toISOString().split('T')[0];

  const days = calculateDays();
  const weekends = countWeekends();

  return (
    <div className="schedule-form leave-form-enhanced">
      <div className="form-header-enhanced">
        <div className="header-icon-large">🖐️</div>
        <div className="header-text">
          <h3 className="form-title">Đơn Xin Nghỉ Phép</h3>
          <p className="form-subtitle">Điền đầy đủ thông tin để gửi đơn xin nghỉ phép đến Admin</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Khoảng thời gian nghỉ */}
        <div className="form-section-enhanced">
          <h4 className="section-title">
            <span className="title-icon">📅</span>
            Khoảng thời gian nghỉ
          </h4>
          
          <div className="form-row">
            <div className="form-group">
              <label className="modern-label">
                Từ ngày *
                <span className="required-mark">(Phải trước ít nhất 3 ngày)</span>
              </label>
              <input
                type="date"
                name="date_from"
                value={formData.date_from}
                onChange={handleChange}
                min={minDate}
                required
                className="form-input modern-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="modern-label">
                Đến ngày *
              </label>
              <input
                type="date"
                name="date_to"
                value={formData.date_to}
                onChange={handleChange}
                min={formData.date_from || minDate}
                required
                className="form-input modern-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Thống kê ngày nghỉ */}
          {days > 0 && (
            <div className="leave-stats-card">
              <div className="stat-item primary">
                <span className="stat-icon">📊</span>
                <div className="stat-content">
                  <span className="stat-label">Tổng số ngày nghỉ</span>
                  <span className="stat-value">{days} ngày</span>
                </div>
              </div>
              
              {weekends > 0 && (
                <div className="stat-item info">
                  <span className="stat-icon">🎉</span>
                  <div className="stat-content">
                    <span className="stat-label">Bao gồm cuối tuần</span>
                    <span className="stat-value">{weekends} ngày</span>
                  </div>
                </div>
              )}

              {days > 5 && (
                <div className="stat-item warning">
                  <span className="stat-icon">⚠️</span>
                  <div className="stat-content">
                    <span className="stat-label">Nghỉ dài hạn</span>
                    <span className="stat-value">Cần lý do rõ ràng</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loại lý do */}
        <div className="form-section-enhanced">
          <h4 className="section-title">
            <span className="title-icon">🏷️</span>
            Loại lý do nghỉ phép
          </h4>
          
          <div className="form-group">
            <select
              name="reason_type"
              value={formData.reason_type}
              onChange={handleChange}
              required
              className="form-select modern-select"
              disabled={loading}
            >
              {LEAVE_REASONS.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <small className="form-hint">
              💡 Chọn loại lý do phù hợp nhất với tình huống của bạn
            </small>
          </div>
        </div>

        {/* Lý do chi tiết */}
        <div className="form-section-enhanced">
          <h4 className="section-title">
            <span className="title-icon">📝</span>
            Lý do chi tiết
          </h4>
          
          <div className="form-group">
            <label className="modern-label">
              Mô tả chi tiết lý do xin nghỉ *
              <span className="required-mark">(Tối thiểu 20 ký tự)</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Nhập lý do xin nghỉ phép một cách chi tiết và rõ ràng...&#10;&#10;Ví dụ:&#10;• Về quê chăm sóc người thân bị bệnh&#10;• Có việc gia đình đột xuất cần giải quyết&#10;• Khám sức khỏe định kỳ tại bệnh viện&#10;• Tham gia sự kiện quan trọng của gia đình"
              rows="6"
              required
              className="form-textarea modern-textarea"
              maxLength="1000"
              disabled={loading}
            />
            <div className="char-count-enhanced">
              <span className={formData.reason.length < 20 ? 'insufficient' : 'sufficient'}>
                {formData.reason.length}/1000 ký tự
              </span>
              {formData.reason.length < 20 && (
                <span className="warning-text">
                  ⚠️ Cần thêm {20 - formData.reason.length} ký tự
                </span>
              )}
              {formData.reason.length >= 20 && formData.reason.length < 50 && (
                <span className="success-text">✓ Đủ yêu cầu</span>
              )}
              {formData.reason.length >= 50 && (
                <span className="excellent-text">✓ Rất chi tiết</span>
              )}
            </div>
            <small className="form-hint">
              💡 Lý do càng chi tiết, cụ thể càng dễ được phê duyệt nhanh
            </small>
          </div>
        </div>

        {/* Preview thông tin */}
        {days > 0 && formData.reason.length >= 20 && (
          <div className="preview-section">
            <h4 className="section-title">
              <span className="title-icon">👁️</span>
              Xem trước đơn xin nghỉ
            </h4>
            <div className="preview-card-enhanced">
              <div className="preview-row">
                <span className="preview-label">📅 Thời gian:</span>
                <span className="preview-value">
                  {formatDateVN(new Date(formData.date_from))}
                  <br />
                  → {formatDateVN(new Date(formData.date_to))}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">📊 Tổng số ngày:</span>
                <span className="preview-value highlight">{days} ngày</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">🏷️ Loại:</span>
                <span className="preview-value">{formData.reason_type}</span>
              </div>
              <div className="preview-row full-width">
                <span className="preview-label">📝 Lý do:</span>
                <span className="preview-value reason-text">{formData.reason}</span>
              </div>
            </div>
          </div>
        )}

        {/* Lưu ý quan trọng */}
        <div className="form-section-enhanced">
          <div className="info-box-enhanced warning">
            <div className="info-icon">⚠️</div>
            <div className="info-content">
              <strong>Lưu ý quan trọng:</strong>
              <ul>
                <li>✓ Phải gửi yêu cầu trước <strong>ít nhất 3 ngày</strong></li>
                <li>✓ <strong>Được phép xin nghỉ</strong> ngay cả khi đã có lịch làm việc hoặc lịch hẹn</li>
                <li>✓ Admin sẽ xem xét và <strong>điều chỉnh lịch</strong> nếu duyệt đơn của bạn</li>
                <li>✓ Yêu cầu sẽ được gửi đến Admin để xét duyệt trong 24-48 giờ</li>
                <li>✓ Bạn sẽ nhận thông báo qua hệ thống khi có kết quả</li>
                <li>✓ Không thể hủy sau khi được phê duyệt</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="form-section-enhanced">
          <div className="tips-card-enhanced">
            <h4 className="tips-title">
              <span className="tips-icon">💡</span>
              Mẹo để đơn được duyệt nhanh
            </h4>
            <div className="tips-grid-enhanced">
              <div className="tip-item-enhanced">
                <span className="tip-icon">📅</span>
                <div className="tip-content">
                  <strong>Đăng ký sớm</strong>
                  <p>Gửi đơn trước 5-7 ngày để Admin có thời gian xếp lịch thay thế</p>
                </div>
              </div>
              <div className="tip-item-enhanced">
                <span className="tip-icon">📝</span>
                <div className="tip-content">
                  <strong>Lý do rõ ràng</strong>
                  <p>Viết lý do cụ thể, chi tiết, tránh mơ hồ hoặc chung chung</p>
                </div>
              </div>
              <div className="tip-item-enhanced">
                <span className="tip-icon">📞</span>
                <div className="tip-content">
                  <strong>Thông báo đồng nghiệp</strong>
                  <p>Báo trước với đồng nghiệp để họ có thể hỗ trợ trong thời gian bạn nghỉ</p>
                </div>
              </div>
              <div className="tip-item-enhanced">
                <span className="tip-icon">📄</span>
                <div className="tip-content">
                  <strong>Giấy tờ chứng minh</strong>
                  <p>Chuẩn bị giấy tờ liên quan (nếu có) để xuất trình khi cần</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions-enhanced">
          <button
            type="submit"
            className="btn-submit-enhanced"
            disabled={loading || !formData.reason.trim() || formData.reason.trim().length < 20}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Đang gửi đơn...
              </>
            ) : (
              <>
                <span className="btn-icon">📤</span>
                Gửi Đơn Xin Nghỉ Phép
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-cancel-enhanced"
            onClick={onCancel}
            disabled={loading}
          >
            <span className="btn-icon">✕</span>
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveForm;
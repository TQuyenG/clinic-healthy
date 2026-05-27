// client/src/components/schedule/OvertimeForm.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { getAvailableOvertimeSlots, registerOvertimeSlot } from '../../services/scheduleService';
import './OvertimeForm.css';

const OvertimeForm = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  useEffect(() => {
    fetchAvailableSlots();
  }, [filter]);

  const fetchAvailableSlots = async () => {
    setSlotsLoading(true);
    try {
      const params = {};
      
      if (filter === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (filter === 'week') {
        // ✅ FIX: Lấy slot trong 7 ngày tới
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);
        
        params.date_from = startDate.toISOString().split('T')[0];
        params.date_to = endDate.toISOString().split('T')[0];
      } else if (filter === 'month') {
        const now = new Date();
        params.month = now.getMonth() + 1;
        params.year = now.getFullYear();
      }

      const result = await getAvailableOvertimeSlots(params);
      setAvailableSlots(result.data || []);
      
      // ✅ Reset selected slot nếu không còn trong danh sách
      if (selectedSlot && !result.data?.find(s => s.id === selectedSlot.id)) {
        setSelectedSlot(null);
        alert('ℹ️ Slot bạn đã chọn không còn khả dụng. Vui lòng chọn slot khác.');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Không thể tải danh sách slot tăng ca';
      alert(`❌ ${errorMsg}`);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleRegister = async () => {
    // ✅ Validation
    if (!selectedSlot) {
      alert('⚠️ Vui lòng chọn slot tăng ca');
      return;
    }

    if (!reason.trim()) {
      alert('⚠️ Vui lòng nhập lý do đăng ký');
      return;
    }

    if (reason.trim().length < 10) {
      alert('⚠️ Lý do phải có ít nhất 10 ký tự');
      return;
    }

    // ✅ Confirmation dialog
    const confirmMsg = `
🎯 Xác nhận đăng ký tăng ca:

📅 Ngày: ${formatDate(selectedSlot.date)}
🕐 Giờ: ${selectedSlot.start_time?.substring(0, 5)} - ${selectedSlot.end_time?.substring(0, 5)}
📝 Lý do: ${reason.trim()}

Yêu cầu sẽ được gửi đến Admin để xét duyệt.
Bạn có chắc chắn muốn đăng ký?
    `.trim();

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);
    try {
      const result = await registerOvertimeSlot({
        slot_id: selectedSlot.id,
        reason: reason.trim()
      });
      
      // ✅ Success
      alert(result.message || '✅ Đăng ký tăng ca thành công! Chờ admin phê duyệt.');
      
      // Reset form
      setSelectedSlot(null);
      setReason('');
      
      // Refresh slots
      await fetchAvailableSlots();
      
      // Callback
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error registering slot:', error);
      
      // ✅ Detailed error handling
      const errorMsg = error.response?.data?.message || error.message;
      
      if (errorMsg?.includes('đã được đăng ký')) {
        alert('❌ Slot này đã được người khác đăng ký. Vui lòng chọn slot khác.');
        // Refresh slots để cập nhật
        await fetchAvailableSlots();
      } else if (errorMsg?.includes('không tìm thấy')) {
        alert('❌ Slot không tồn tại hoặc đã bị xóa.');
        await fetchAvailableSlots();
      } else if (errorMsg?.includes('đã có lịch')) {
        alert('❌ Bạn đã có lịch làm việc vào thời gian này.');
      } else {
        alert(`❌ ${errorMsg || 'Có lỗi xảy ra khi đăng ký'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Group slots by date
  const groupedSlots = availableSlots.reduce((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isToday = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (dateStr) => {
    const date = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  return (
    <div className="overtime-form-modern">
      {/* Header */}
      <div className="overtime-header">
        <div className="header-content">
          <div className="header-icon-large">⚡</div>
          <div>
            <h2>Đăng Ký Tăng Ca</h2>
            <p>Chọn slot tăng ca phù hợp và gửi yêu cầu đến Admin</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {[
          { value: 'all', label: 'Tất cả', icon: '📋' },
          { value: 'today', label: 'Hôm nay', icon: '📅' },
          { value: 'week', label: '7 ngày tới', icon: '📆' },
          { value: 'month', label: 'Tháng này', icon: '🗓️' }
        ].map(tab => (
          <button
            key={tab.value}
            className={`filter-tab ${filter === tab.value ? 'active' : ''}`}
            onClick={() => setFilter(tab.value)}
            disabled={slotsLoading}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Available Slots */}
      <div className="slots-container">
        <div className="slots-header">
          <h3>
            <span className="header-icon">⚡</span>
            Slot Tăng Ca Khả Dụng
            {!slotsLoading && (
              <span className="slots-count">({availableSlots.length} slot)</span>
            )}
          </h3>
          <button 
            className="btn-refresh"
            onClick={fetchAvailableSlots}
            disabled={slotsLoading}
          >
            {slotsLoading ? (
              <>
                <span className="spinner-icon">⏳</span>
                Đang tải...
              </>
            ) : (
              <>
                <span>🔄</span>
                Làm mới
              </>
            )}
          </button>
        </div>

        {slotsLoading ? (
          <div className="slots-loading">
            <div className="spinner"></div>
            <p>Đang tải danh sách slot tăng ca...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="empty-slots">
            <div className="empty-icon">📭</div>
            <h4>Không có slot tăng ca nào</h4>
            <p>
              {filter === 'today' 
                ? 'Không có slot tăng ca nào cho hôm nay.'
                : filter === 'week'
                ? 'Không có slot tăng ca nào trong 7 ngày tới.'
                : filter === 'month'
                ? 'Không có slot tăng ca nào trong tháng này.'
                : 'Hiện tại chưa có slot tăng ca khả dụng.'
              }
            </p>
            <p className="empty-hint">
              💡 Vui lòng quay lại sau hoặc liên hệ Admin để biết thêm thông tin.
            </p>
          </div>
        ) : (
          <div className="slots-list">
            {Object.keys(groupedSlots).sort().map(date => (
              <div key={date} className="date-group">
                <div className={`date-header ${isToday(date) ? 'today' : isTomorrow(date) ? 'tomorrow' : ''}`}>
                  <span className="date-icon">📅</span>
                  <span className="date-text">{formatDate(date)}</span>
                  {isToday(date) && <span className="today-badge">Hôm nay</span>}
                  {isTomorrow(date) && <span className="tomorrow-badge">Ngày mai</span>}
                  <span className="slot-count-badge">
                    {groupedSlots[date].length} slot
                  </span>
                </div>

                <div className="slots-grid">
                  {groupedSlots[date].map(slot => {
                    const isSelected = selectedSlot?.id === slot.id;
                    
                    return (
                      <div
                        key={slot.id}
                        className={`slot-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="slot-header">
                          <div className="slot-time">
                            <span className="time-icon">🕐</span>
                            <span className="time-range">
                              {slot.start_time?.substring(0, 5)} - {slot.end_time?.substring(0, 5)}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="selected-badge">
                              <span>✓</span> Đã chọn
                            </div>
                          )}
                        </div>

                        {slot.metadata?.description && (
                          <div className="slot-description">
                            <span className="desc-icon">📝</span>
                            {slot.metadata.description}
                          </div>
                        )}

                        <div className="slot-info">
                          <div className="info-tag">
                            <span className="tag-icon">👤</span>
                            Slot #{slot.metadata?.slot_number || 1}
                          </div>
                          <div className="info-tag success">
                            <span className="tag-icon">✓</span>
                            Còn trống
                          </div>
                        </div>

                        {slot.metadata?.created_by_name && (
                          <div className="slot-creator">
                            <span className="creator-icon">👨‍💼</span>
                            Tạo bởi: <strong>{slot.metadata.created_by_name}</strong>
                          </div>
                        )}

                        {isSelected && (
                          <div className="selected-indicator">
                            <span className="pulse-dot"></span>
                            Nhấn "Gửi Yêu Cầu" để đăng ký
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Slot & Reason */}
      {selectedSlot && (
        <div className="registration-section">
          <div className="selected-slot-info">
            <h4>
              <span className="section-icon">🎯</span>
              Slot đã chọn
            </h4>
            <div className="selected-details">
              <div className="detail-item">
                <span className="detail-label">📅 Ngày:</span>
                <span className="detail-value">
                  {formatDate(selectedSlot.date)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🕐 Giờ:</span>
                <span className="detail-value">
                  {selectedSlot.start_time?.substring(0, 5)} - {selectedSlot.end_time?.substring(0, 5)}
                </span>
              </div>
              {selectedSlot.metadata?.description && (
                <div className="detail-item full-width">
                  <span className="detail-label">📝 Mô tả:</span>
                  <span className="detail-value">
                    {selectedSlot.metadata.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="reason-section">
            <label className="reason-label">
              <span className="label-icon">📝</span>
              Lý do đăng ký tăng ca *
              <span className="required-mark">(Bắt buộc, tối thiểu 10 ký tự)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do bạn muốn đăng ký tăng ca...&#10;&#10;Ví dụ:&#10;• Muốn tăng thu nhập và có thêm kinh nghiệm&#10;• Có thể hỗ trợ đồng nghiệp trong thời gian này&#10;• Thời gian cá nhân linh hoạt vào ngày này&#10;• Muốn đóng góp nhiều hơn cho đội ngũ"
              rows="6"
              className="reason-textarea"
              maxLength="500"
              disabled={loading}
            />
            <div className="char-count">
              <span className={reason.length < 10 ? 'insufficient' : 'sufficient'}>
                {reason.length}/500 ký tự
              </span>
              {reason.length < 10 && (
                <span className="warning-text">⚠️ Cần thêm {10 - reason.length} ký tự</span>
              )}
            </div>
          </div>

          {/* Info Notice */}
          <div className="info-notice">
            <div className="notice-icon">ℹ️</div>
            <div>
              <strong>Lưu ý quan trọng:</strong>
              <ul>
                <li>✓ Yêu cầu sẽ được gửi đến Admin để xét duyệt</li>
                <li>✓ Bạn sẽ nhận thông báo khi có kết quả (duyệt/từ chối)</li>
                <li>✓ Không thể hủy sau khi được duyệt</li>
                <li>✓ Vui lòng đến đúng giờ nếu được duyệt</li>
                <li>✓ Lương tăng ca sẽ được tính theo quy định</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions-overtime">
            <button
              type="button"
              className="btn-submit-overtime"
              onClick={handleRegister}
              disabled={loading || !reason.trim() || reason.trim().length < 10}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Đang gửi yêu cầu...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Gửi Yêu Cầu Đăng Ký
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-cancel-overtime"
              onClick={onCancel}
              disabled={loading}
            >
              <span>✕</span>
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Quick Help */}
      {!selectedSlot && availableSlots.length > 0 && (
        <div className="quick-help">
          <div className="help-icon">💡</div>
          <div className="help-content">
            <h4>Hướng dẫn nhanh:</h4>
            <ol>
              <li>Chọn slot tăng ca phù hợp từ danh sách trên</li>
              <li>Nhập lý do đăng ký (tối thiểu 10 ký tự)</li>
              <li>Nhấn "Gửi Yêu Cầu" để gửi đến Admin</li>
              <li>Đợi thông báo kết quả phê duyệt</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeForm;
// client/src/components/ArrivalWindowSelector.js
// ===== COMPONENT: Chọn Khung Giờ Tiếp Nhận (Arrival Window) cho Offline Booking =====
// Sử dụng khi bệnh nhân đặt lịch OFFLINE (không cần exact time)
// Hiển thị các khung giờ: 08:00-08:30, 08:30-09:00... với sức chứa còn lại

import React, { useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import './ArrivalWindowSelector.css';

/**
 * Props:
 * - doctorId: ID bác sĩ được chọn
 * - serviceId: ID dịch vụ được chọn  
 * - date: Ngày khám (yyyy-mm-dd)
 * - onSelect: callback khi chọn khung giờ: (window) => {}
 * - loading: boolean
 */
const ArrivalWindowSelector = ({ doctorId, serviceId, date, onSelect, loading = false }) => {
  const [windows, setWindows] = useState([]);
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Tải danh sách khung giờ từ server
   * Tính toán sức chứa real-time cho mỗi khung
   */
  useEffect(() => {
    if (!doctorId || !serviceId || !date) {
      console.log('[DEBUG ArrivalWindowSelector] Missing params, skip fetch');
      return;
    }

    const fetchWindows = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`[LOG ArrivalWindowSelector] Fetching arrival windows for:`, {
          doctorId,
          serviceId,
          date,
          appointmentType: 'offline'
        });

        const response = await appointmentService.getAvailableSlots(
          doctorId,
          date,
          serviceId,
          'offline'  // Offline booking → Arrival Windows (mềm dẻo)
        );

        console.log('[DEBUG] API Response:', response.data);

        if (response.data.success && response.data.data) {
          // API trả về danh sách khung giờ (groups, không phải exact slots)
          const parsedWindows = response.data.data.map((window, idx) => ({
            id: `window_${idx}`,
            startTime: window.start_time,
            endTime: window.end_time,
            capacity: window.capacity || 0,
            available: window.available !== false,
            label: `${window.start_time} - ${window.end_time}` // VD: "08:00 - 08:30 (Còn 2 chỗ)"
          }));

          setWindows(parsedWindows);
          console.log(`✅ Loaded ${parsedWindows.length} arrival windows`);
        } else {
          setError('Không tìm thấy khung giờ khả dụng');
        }
      } catch (err) {
        console.error('[ERROR ArrivalWindowSelector]', err);
        setError(err.response?.data?.message || 'Lỗi tải khung giờ');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWindows();
  }, [doctorId, serviceId, date]);

  /**
   * Xử lý chọn khung giờ
   */
  const handleSelectWindow = (window) => {
    console.log('[LOG ArrivalWindowSelector] Selected window:', window);
    setSelectedWindow(window);
    onSelect?.(window);
  };

  if (isLoading || loading) {
    return <div className="arrival-window-loader">⏳ Đang tải khung giờ...</div>;
  }

  if (error) {
    return <div className="arrival-window-error">❌ {error}</div>;
  }

  if (windows.length === 0) {
    return (
      <div className="arrival-window-empty">
        📭 Không có khung giờ khả dụng vào ngày này
      </div>
    );
  }

  return (
    <div className="arrival-window-selector">
      <h3>📅 Chọn Khung Giờ Tiếp Nhận</h3>
      <p className="info-text">
        Vui lòng đến viện trong khung giờ bạn chọn để lấy Số Ưu Tiên
      </p>

      <div className="windows-grid">
        {windows.map((window) => (
          <div
            key={window.id}
            className={`window-card ${selectedWindow?.id === window.id ? 'selected' : ''} ${
              !window.available ? 'disabled' : ''
            }`}
            onClick={() => window.available && handleSelectWindow(window)}
          >
            <div className="window-time">⏰ {window.label}</div>
            <div className="window-capacity">
              {window.available ? (
                <>
                  <span className="capacity-number">Còn {window.capacity} chỗ</span>
                  {window.capacity > 0 && <span className="capacity-status">✓ Có sẵn</span>}
                </>
              ) : (
                <span className="capacity-full">Đầy</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedWindow && (
        <div className="selected-summary">
          <h4>✅ Thông tin chọn:</h4>
          <p>Khung giờ: <strong>{selectedWindow.label}</strong></p>
          <p className="hint">
            Sau khi đặt lịch, bạn sẽ nhận được Số Ưu Tiên (U-xxx) khi check-in tại Lễ tân
          </p>
        </div>
      )}
    </div>
  );
};

export default ArrivalWindowSelector;

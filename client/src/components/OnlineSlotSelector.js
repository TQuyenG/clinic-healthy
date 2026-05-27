// client/src/components/OnlineSlotSelector.js
// ===== COMPONENT: Chọn Slot Cố Định (Online Slots) cho Online Booking =====
// Sử dụng khi bệnh nhân đặt lịch ONLINE (Video/Chat)
// Hiển thị các slot 30 phút: 08:00am, 08:30am, 09:00am... với tình trạng từng slot

import React, { useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import './OnlineSlotSelector.css';

/**
 * Props:
 * - doctorId: ID bác sĩ
 * - serviceId: ID dịch vụ
 * - date: Ngày khám (yyyy-mm-dd)
 * - onSelect: callback khi chọn slot: (slot) => {}
 * - loading: boolean
 */
const OnlineSlotSelector = ({ doctorId, serviceId, date, onSelect, loading = false }) => {
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Tải danh sách slot Online (30 phút 1 slot, khóa cứng nếu paid)
   */
  useEffect(() => {
    if (!doctorId || !serviceId || !date) {
      console.log('[DEBUG OnlineSlotSelector] Missing params, skip fetch');
      return;
    }

    const fetchSlots = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`[LOG OnlineSlotSelector] Fetching online slots for:`, {
          doctorId,
          serviceId,
          date,
          appointmentType: 'online'
        });

        const response = await appointmentService.getAvailableSlots(
          doctorId,
          date,
          serviceId,
          'online'  // Online booking → Strict slots (30 phút, exact time)
        );

        console.log('[DEBUG] API Response:', response.data);

        if (response.data.success && response.data.data) {
          // API trả về danh sách slot: [{ start_time: "08:00", status: "available|booked" }]
          const parsedSlots = response.data.data.map((slot, idx) => ({
            id: `slot_${idx}`,
            startTime: slot.start_time,
            endTime: slot.end_time || 
              `${String((parseInt(slot.start_time.split(':')[0]) + 0)).padStart(2, '0')}:${
                String((parseInt(slot.start_time.split(':')[1]) + 30) % 60).padStart(2, '0')
              }`,
            status: slot.status || 'available', // available | booked
            available: slot.status === 'available',
            label: formatTimeLabel(slot.start_time)
          }));

          setSlots(parsedSlots);
          console.log(`✅ Loaded ${parsedSlots.length} online slots`);
        } else {
          setError('Không tìm thấy slot online khả dụng');
        }
      } catch (err) {
        console.error('[ERROR OnlineSlotSelector]', err);
        setError(err.response?.data?.message || 'Lỗi tải slot');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, serviceId, date]);

  /**
   * Format thời gian thành label dễ đọc
   * VD: "08:00" → "08:00 - 08:30 AM"
   */
  const formatTimeLabel = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const endMin = (minute + 30) % 60;
    const endHour = minute + 30 >= 60 ? displayHour + 1 : displayHour;
    
    return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} - ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${period}`;
  };

  /**
   * Xử lý chọn slot
   */
  const handleSelectSlot = (slot) => {
    console.log('[LOG OnlineSlotSelector] Selected slot:', slot);
    setSelectedSlot(slot);
    onSelect?.(slot);
  };

  if (isLoading || loading) {
    return <div className="online-slot-loader">⏳ Đang tải slot...</div>;
  }

  if (error) {
    return <div className="online-slot-error">❌ {error}</div>;
  }

  if (slots.length === 0) {
    return (
      <div className="online-slot-empty">
        📭 Không có slot online khả dụng vào ngày này
      </div>
    );
  }

  return (
    <div className="online-slot-selector">
      <h3>🎥 Chọn Slot Tư Vấn Online</h3>
      <p className="info-text">
        ⚠️ Mỗi slot là 30 phút cố định. Thanh toán 100% trước.
      </p>

      <div className="time-periods">
        {/* Nhóm theo Period: Sáng, Chiều, Tối */}
        {renderSlotsByPeriod(slots, selectedSlot, handleSelectSlot)}
      </div>

      {selectedSlot && (
        <div className="selected-summary-online">
          <h4>✅ Slot được chọn:</h4>
          <p>Thời gian: <strong>{selectedSlot.label}</strong></p>
          <p>Thời lượng: <strong>30 phút</strong></p>
          <p className="hint">
            Cần thanh toán 100% trước để khóa slot này. Hệ thống sẽ gửi link video call trước giờ.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Helper: Nhóm slot theo Period (Sáng, Chiều, Tối)
 */
const renderSlotsByPeriod = (slots, selectedSlot, onSelect) => {
  const periods = {
    'Sáng (06:00 - 12:00)': [],
    'Chiều (12:00 - 18:00)': [],
    'Tối (18:00 - 22:00)': []
  };

  slots.forEach(slot => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    if (hour < 12) periods['Sáng (06:00 - 12:00)'].push(slot);
    else if (hour < 18) periods['Chiều (12:00 - 18:00)'].push(slot);
    else periods['Tối (18:00 - 22:00)'].push(slot);
  });

  return Object.entries(periods).map(([periodLabel, periodSlots]) => {
    if (periodSlots.length === 0) return null;

    return (
      <div key={periodLabel} className="time-period">
        <h4>{periodLabel}</h4>
        <div className="slots-row">
          {periodSlots.map(slot => (
            <div
              key={slot.id}
              className={`slot-button ${selectedSlot?.id === slot.id ? 'selected' : ''} ${
                !slot.available ? 'disabled' : ''
              }`}
              onClick={() => slot.available && onSelect(slot)}
              title={slot.available ? 'Click để chọn' : 'Slot đã được đặt'}
            >
              <div className="slot-time">{slot.label}</div>
              <div className="slot-status">
                {slot.available ? '✓ Có sẵn' : '✗ Đã đặt'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  });
};

export default OnlineSlotSelector;

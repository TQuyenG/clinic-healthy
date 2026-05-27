// client/src/components/schedule/FlexibleScheduleEditor.js
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSpinner, FaCheck, FaExclamationTriangle, FaInfoCircle, FaClock } from 'react-icons/fa';
import moment from 'moment';
import './FlexibleScheduleEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const WEEK_DAYS = [
  { key: 'mon', label: 'T2' }, { key: 'tue', label: 'T3' }, { key: 'wed', label: 'T4' },
  { key: 'thu', label: 'T5' }, { key: 'fri', label: 'T6' }, { key: 'sat', label: 'T7' },
  { key: 'sun', label: 'CN' },
];

// Helper: Chia ca
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const splitShifts = (shiftsConfig) => {
  const slots = [];
  shiftsConfig.forEach(shift => {
    const start = timeToMinutes(shift.start_time);
    const end = timeToMinutes(shift.end_time);
    const duration = end - start;
    
    // Logic chia ca: làm tròn điểm giữa xuống 30p gần nhất
    const midPointMinutes = start + (duration / 2);
    const roundedMidPoint = Math.floor(midPointMinutes / 30) * 30;

    // Đảm bảo điểm giữa không trùng với điểm đầu hoặc cuối
    if (roundedMidPoint <= start || roundedMidPoint >= end) {
      // Nếu ca quá ngắn, không chia
      slots.push({
        shift_name: shift.display_name,
        slot_key: `${minutesToTime(start)}-${minutesToTime(end)}`,
        display: `${minutesToTime(start)} - ${minutesToTime(end)}`
      });
    } else {
      // Chia 2 ca
      slots.push({
        shift_name: shift.display_name,
        slot_key: `${minutesToTime(start)}-${minutesToTime(roundedMidPoint)}`,
        display: `${minutesToTime(start)} - ${minutesToTime(roundedMidPoint)}`
      });
      slots.push({
        shift_name: shift.display_name,
        slot_key: `${minutesToTime(roundedMidPoint)}-${minutesToTime(end)}`,
        display: `${minutesToTime(roundedMidPoint)} - ${minutesToTime(end)}`
      });
    }
  });
  return slots;
};


const FlexibleScheduleEditor = ({ isOpen, onClose, onSubmitted }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [workShifts, setWorkShifts] = useState([]);
  const [splitSlots, setSplitSlots] = useState([]);
  
  const [registration, setRegistration] = useState(null); // Bản ghi đăng ký từ DB
  const [scheduleType, setScheduleType] = useState('fixed'); // 'fixed' | 'flexible'
  const [selectedSlots, setSelectedSlots] = useState({}); // { mon: ["07:00-09:30"], ... }

  // Tải dữ liệu ban đầu
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Tải cấu hình ca (để chia slot)
      const shiftsResponse = await axios.get(`${API_URL}/work-shifts/config`, { headers });
      const activeShifts = shiftsResponse.data.data.filter(s => s.is_active);
      setWorkShifts(activeShifts);
      
      const splitted = splitShifts(activeShifts);
      setSplitSlots(splitted);

      // 2. Tải bản ghi đăng ký duy nhất của user
      const regResponse = await axios.get(`${API_URL}/schedules/my-schedule-registration`, { headers });
      const regData = regResponse.data.data;
      
      setRegistration(regData);
      
      // 3. Điền dữ liệu vào form
      if (regData.is_new) {
        setScheduleType('fixed');
        setSelectedSlots(generateFullSchedule(splitted));
      } else {
        setScheduleType(regData.schedule_type);
        setSelectedSlots(regData.schedule_type === 'flexible' ? (regData.weekly_schedule_json || {}) : generateFullSchedule(splitted));
      }
      
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Không thể tải dữ liệu đăng ký lịch.');
      onClose();
    } finally {
      setLoading(false);
    }
  };
  
  // Helper tạo lịch full-time
  const generateFullSchedule = (slots) => {
    const fullSchedule = {};
    const allSlotKeys = slots.map(s => s.slot_key);
    WEEK_DAYS.forEach(day => {
      fullSchedule[day.key] = [...allSlotKeys];
    });
    return fullSchedule;
  };
  
  // Xử lý logic full-time
  const isFullTime = useMemo(() => {
    if (scheduleType === 'fixed') return true;
    if (!splitSlots || splitSlots.length === 0) return false;
    
    const totalSlots = splitSlots.length;
    for (const day of WEEK_DAYS) {
      if ((selectedSlots[day.key]?.length || 0) !== totalSlots) {
        return false;
      }
    }
    return true;
  }, [selectedSlots, scheduleType, splitSlots]);

  // Tự động chuyển sang 'fixed' nếu chọn full
  useEffect(() => {
    if (scheduleType === 'flexible' && isFullTime) {
      toast.info('Bạn đã chọn tất cả các ca. Hệ thống sẽ chuyển sang đăng ký Lịch Cố Định.');
      setScheduleType('fixed');
    }
  }, [selectedSlots, isFullTime, scheduleType]);


  // Xử lý UI
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setScheduleType(newType);
    if (newType === 'fixed') {
      setSelectedSlots(generateFullSchedule(splitSlots));
    } else {
      // SỬA: Xóa các lựa chọn cũ để phá vỡ vòng lặp isFullTime
      setSelectedSlots({}); 
    }
  };

  const handleSlotToggle = (dayKey, slotKey) => {
    // Không cho sửa nếu đang là 'fixed'
    if (scheduleType === 'fixed') return;

    setSelectedSlots(prev => {
      const daySlots = prev[dayKey] || [];
      const newDaySlots = daySlots.includes(slotKey)
        ? daySlots.filter(s => s !== slotKey)
        : [...daySlots, slotKey];
      return { ...prev, [dayKey]: newDaySlots };
    });
  };

  // Gửi form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.confirm("Bạn có chắc muốn gửi đăng ký lịch làm việc này?") === false) {
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        schedule_type: scheduleType,
        weekly_schedule_json: scheduleType === 'flexible' ? selectedSlots : null
      };
      
      await axios.post(`${API_URL}/schedules/register-flexible`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Đã gửi đăng ký. Vui lòng chờ admin phê duyệt.');
      onSubmitted(); // Báo cho MySchedulePage
      onClose();

    } catch (error) {
      console.error('Error submitting flexible schedule:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi gửi đăng ký');
    } finally {
      setSubmitting(false);
    }
  };

  // Render thông báo trạng thái
  const renderStatusBanner = () => {
    if (!registration || registration.status === 'new') {
      return (
        <div className="schedule-editor__banner info">
          <FaInfoCircle /> Bạn đang đăng ký lịch làm việc lần đầu.
        </div>
      );
    }
    if (registration.status === 'pending') {
      return (
        <div className="schedule-editor__banner warning">
          <FaClock /> Đăng ký của bạn đang chờ phê duyệt. Mọi thay đổi sẽ cần duyệt lại.
        </div>
      );
    }
    if (registration.status === 'approved') {
      return (
        <div className="schedule-editor__banner success">
          <FaCheck /> Lịch làm việc của bạn đã được duyệt và có hiệu lực từ {registration.effective_date}.
        </div>
      );
    }
    if (registration.status === 'rejected') {
      return (
        <div className="schedule-editor__banner danger">
          <FaExclamationTriangle />
          Đăng ký trước đó đã bị từ chối: "{registration.reject_reason}". Vui lòng chỉnh sửa và gửi lại.
        </div>
      );
    }
    return null;
  };
  
  if (!isOpen) return null;

  return (
    <div className="schedule-editor__modal-overlay" onClick={onClose}>
      <div className="schedule-editor__modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="schedule-editor__title">Đăng ký Lịch Làm Việc Hàng Tuần</h2>
        <p className="schedule-editor__subtitle">
          Chọn các ca làm việc mong muốn. Lịch mới sẽ có hiệu lực vào ngày hôm sau khi được admin phê duyệt.
        </p>
        
        {loading ? (
          <div className="schedule-editor__loading"><FaSpinner className="fa-spin" /> Đang tải...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {renderStatusBanner()}
            
            {/* 1. Chọn Loại Lịch */}
            <div className="schedule-editor__form-group">
              <label className="schedule-editor__label">Loại lịch đăng ký</label>
              <div className="schedule-editor__radio-group">
                <label>
                  <input 
                    type="radio" 
                    value="fixed"
                    checked={scheduleType === 'fixed'}
                    onChange={handleTypeChange}
                  />
                  Lịch Cố Định (Full-time)
                </label>
                <label>
                  <input 
                    type="radio" 
                    value="flexible"
                    checked={scheduleType === 'flexible'}
                    onChange={handleTypeChange}
                  />
                  Lịch Linh Hoạt (Part-time)
                </label>
              </div>
            </div>

            {/* 2. Grid Chọn Lịch */}
            <div className="schedule-editor__grid-wrapper">
              <table className={`schedule-editor__grid-table ${scheduleType === 'fixed' ? 'disabled' : ''}`}>
                <thead>
                  <tr>
                    <th>Ca làm việc</th>
                    {WEEK_DAYS.map(day => <th key={day.key}>{day.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {splitSlots.map((slot, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{slot.shift_name}</strong>
                        <span>{slot.display}</span>
                      </td>
                      {WEEK_DAYS.map(day => (
                        <td key={day.key}>
                          <input
                            type="checkbox"
                            className="schedule-editor__slot-checkbox"
                            disabled={scheduleType === 'fixed'}
                            checked={(selectedSlots[day.key] || []).includes(slot.slot_key)}
                            onChange={() => handleSlotToggle(day.key, slot.slot_key)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 3. Nút Bấm */}
            <div className="schedule-editor__modal-footer">
              <button 
                type="button" 
                className="schedule-editor__button secondary" 
                onClick={onClose}
                disabled={submitting}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="schedule-editor__button primary"
                disabled={submitting}
              >
                {submitting ? <FaSpinner className="fa-spin" /> : <FaCheck />} 
                {registration?.status === 'new' ? 'Gửi Đăng Ký' : 'Gửi Cập Nhật'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FlexibleScheduleEditor;
// client/src/components/schedule/OvertimeEditor.js
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSpinner, FaCheck, FaExclamationTriangle, FaInfoCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import moment from 'moment';
import './OvertimeEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const WEEK_DAYS = [
  { key: 'mon', label: 'T2', value: 1 }, { key: 'tue', label: 'T3', value: 2 },
  { key: 'wed', label: 'T4', value: 3 }, { key: 'thu', label: 'T5', value: 4 },
  { key: 'fri', label: 'T6', value: 5 }, { key: 'sat', label: 'T7', value: 6 },
  { key: 'sun', label: 'CN', value: 0 },
];

// (Helpers chia ca - giống hệt FlexibleScheduleEditor)
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
    const midPointMinutes = start + (duration / 2);
    const roundedMidPoint = Math.floor(midPointMinutes / 30) * 30;

    if (roundedMidPoint <= start || roundedMidPoint >= end) {
      slots.push({
        shift_name: shift.display_name,
        slot_key: `${minutesToTime(start)}-${minutesToTime(end)}`,
        display: `${minutesToTime(start)} - ${minutesToTime(end)}`
      });
    } else {
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

// Props: isOpen, onClose, onSubmitted, userRole, targetUserId, adminProps
const OvertimeEditor = ({ isOpen, onClose, onSubmitted, userRole, targetUserId = null, adminProps = {} }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [splitSlots, setSplitSlots] = useState([]);
  const [permanentSchedule, setPermanentSchedule] = useState({}); // Lịch cố định/linh hoạt của user
  
  // State quản lý tuần
  const [weekStartDate, setWeekStartDate] = useState(moment().add(1, 'week').startOf('isoWeek').toDate());
  
  // State chọn slot
  const [selectedOvertime, setSelectedOvertime] = useState({}); // {"YYYY-MM-DD": ["17:00-19:00"], ...}
  const [reason, setReason] = useState('');

  const isAdmin = userRole === 'admin';
  const canSubmitForDoctor = userRole === 'staff' && !!targetUserId;
  const { userList = [], selectedUserId = null, onUserChange = () => {} } = adminProps;

  // Lấy danh sách 7 ngày trong tuần
  const currentWeekDays = useMemo(() => {
    const start = moment(weekStartDate);
    return WEEK_DAYS.map(day => {
      const date = moment(start).isoWeekday(day.value);
      return { ...day, date: date.format('YYYY-MM-DD') };
    });
  }, [weekStartDate]);
  
  // Tải dữ liệu
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);
  
  // Tải lại lịch cố định khi đổi tuần (hoặc đổi user nếu là admin)
  useEffect(() => {
    if (isOpen) {
      fetchPermanentSchedule();
    }
  }, [weekStartDate, selectedUserId]); // Thêm selectedUserId

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Tải cấu hình ca (để chia slot)
      const shiftsResponse = await axios.get(`${API_URL}/work-shifts/config`, { headers });
      const activeShifts = shiftsResponse.data.data.filter(s => s.is_active);
      setSplitSlots(splitShifts(activeShifts));
      
      // 2. Tải lịch cố định
      await fetchPermanentSchedule();
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Không thể tải dữ liệu ca làm việc.');
      onClose();
    } finally {
      setLoading(false);
    }
  };
  
  // Tải lịch cố định/linh hoạt của user (để tô mờ)
  const fetchPermanentSchedule = async () => {
    // Admin phải chọn user trước
    if (isAdmin && !selectedUserId) {
      setPermanentSchedule({});
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/schedules/my-schedule-registration`;
      
      // (Logic này phức tạp - Tạm thời user tự lấy lịch của mình)
      // (Để admin lấy lịch của user khác, cần API mới, tạm bỏ qua)
      if (isAdmin) {
         console.warn("Chức năng xem lịch cố định của user khác cho admin chưa được hỗ trợ");
         setPermanentSchedule({}); // Tạm set rỗng
         return;
      }
      
      const regResponse = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const regData = regResponse.data.data;

      if (regData.schedule_type === 'fixed') {
        // Nếu là fixed, tạo JSON full-time
        const shifts = await axios.get(`${API_URL}/work-shifts/config`, { headers: { Authorization: `Bearer ${token}` } });
        const slots = splitShifts(shifts.data.data.filter(s => s.is_active));
        const fullSchedule = {};
        const allSlotKeys = slots.map(s => s.slot_key);
        WEEK_DAYS.forEach(day => {
          fullSchedule[day.key] = [...allSlotKeys];
        });
        setPermanentSchedule(fullSchedule);
      } else {
        setPermanentSchedule(regData.weekly_schedule_json || {});
      }
      
    } catch (error) {
      console.error('Error fetching permanent schedule:', error);
    }
  };

  // Xử lý UI
  const handleSlotToggle = (dateKey, dayKey, slotKey) => {
    // Kiểm tra xem đã đăng ký cố định chưa
    const permanentDaySlots = permanentSchedule[dayKey] || [];
    if (permanentDaySlots.includes(slotKey)) {
      toast.info("Bạn đã đăng ký ca này trong lịch cố định.");
      return;
    }

    setSelectedOvertime(prev => {
      const dateSlots = prev[dateKey] || [];
      const newDateSlots = dateSlots.includes(slotKey)
        ? dateSlots.filter(s => s !== slotKey)
        : [...dateSlots, slotKey];
      return { ...prev, [dateKey]: newDateSlots };
    });
  };
  
  const handleWeekChange = (direction) => {
    const newStartDate = moment(weekStartDate).add(direction, 'weeks').toDate();
    setWeekStartDate(newStartDate);
    setSelectedOvertime({}); // Reset lựa chọn khi đổi tuần
  };

  // Gửi form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && !selectedUserId) {
      toast.error("Vui lòng chọn nhân viên/bác sĩ để đăng ký.");
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        slots: selectedOvertime,
        reason: reason || "Đăng ký tăng ca",
      };
      
      // Nếu admin đăng ký, thêm user_id
      if (isAdmin && selectedUserId) {
        payload.user_id_for_admin = selectedUserId;
      } else if (canSubmitForDoctor && targetUserId) {
        payload.target_user_id = targetUserId;
      }
      
      await axios.post(`${API_URL}/schedules/register-overtime`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Đã gửi yêu cầu tăng ca thành công.');
      onSubmitted(); 
      onClose();

    } catch (error) {
      console.error('Error submitting overtime:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi gửi đăng ký');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="schedule-editor__modal-overlay" onClick={onClose}>
      <div className="schedule-editor__modal-content large" onClick={e => e.stopPropagation()}>
        <h2 className="schedule-editor__title">Đăng ký Tăng Ca (Theo Tuần)</h2>
        <p className="schedule-editor__subtitle">
          Chọn các ca bạn muốn tăng cường. Ca tăng ca chỉ có hiệu lực trong tuần được chọn.
        </p>
        
        {loading ? (
          <div className="schedule-editor__loading"><FaSpinner className="fa-spin" /> Đang tải...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            {/* 1. Chọn Tuần */}
            <div className="schedule-editor__week-navigator">
              <button type="button" onClick={() => handleWeekChange(-1)}><FaChevronLeft /></button>
              <strong>Tuần từ {moment(weekStartDate).format('DD/MM')} - {moment(weekStartDate).add(6, 'days').format('DD/MM/YYYY')}</strong>
              <button type="button" onClick={() => handleWeekChange(1)}><FaChevronRight /></button>
            </div>
            
            {/* 1.5 (Admin only) Chọn User */}
            {isAdmin && (
              <div className="schedule-editor__form-group">
                <label className="schedule-editor__label">Đăng ký cho:</label>
                <select 
                  className="schedule-editor__form-control"
                  value={selectedUserId || ''}
                  onChange={(e) => onUserChange(e.target.value)}
                >
                  <option value="">-- Chọn nhân viên/bác sĩ --</option>
                  {userList.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Grid Chọn Lịch */}
            <div className="schedule-editor__grid-wrapper">
              <table className="schedule-editor__grid-table">
                <thead>
                  <tr>
                    <th>Ca làm việc</th>
                    {currentWeekDays.map(day => (
                      <th key={day.key}>{day.label} <small>({day.date.slice(8,10)}/{day.date.slice(5,7)})</small></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {splitSlots.map((slot, index) => (
                    <tr key={index}>
                      <td>
                        <strong>{slot.shift_name}</strong>
                        <span>{slot.display}</span>
                      </td>
                      {currentWeekDays.map(day => {
                        const isPermanent = (permanentSchedule[day.key] || []).includes(slot.slot_key);
                        const isSelected = (selectedOvertime[day.date] || []).includes(slot.slot_key);
                        
                        return (
                          <td 
                            key={day.key} 
                            className={`${isPermanent ? 'disabled permanent' : ''} ${isSelected ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="schedule-editor__slot-checkbox"
                              disabled={isPermanent}
                              checked={isSelected}
                              onChange={() => handleSlotToggle(day.date, day.key, slot.slot_key)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 3. Lý do */}
            <div className="schedule-editor__form-group">
              <label className="schedule-editor__label" htmlFor="overtime_reason">Lý do (Nếu có)</label>
              <input
                id="overtime_reason"
                type="text"
                className="schedule-editor__form-control"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Vd: Hỗ trợ đợt khám, Bù lịch nghỉ..."
              />
            </div>

            {/* 4. Nút Bấm */}
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
                disabled={submitting || (isAdmin && !selectedUserId)}
              >
                {submitting ? <FaSpinner className="fa-spin" /> : <FaCheck />} 
                {isAdmin ? 'Tạo Lịch Tăng Ca' : 'Gửi Yêu Cầu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OvertimeEditor;
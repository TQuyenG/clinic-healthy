// client/src/components/schedule/CalendarView.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH (Lần 8)
// 1. (FIX) Sửa logic conflict: Chỉ ẩn ca làm việc nếu 'start_time' nằm trong ca nghỉ.
// 2. (FIX) Giữ logic hiển thị đúng giờ nghỉ (theo ca/theo giờ).
// 3. (FIX) Thêm class màu cho các loại lịch (Tăng ca -> Tím).

import React, { useState, useEffect, useMemo } from 'react';
import './CalendarView.css';
import { FaExclamationTriangle, FaBusinessTime, FaUserClock, FaClock, FaUserCheck, FaClipboardList, FaStethoscope } from 'react-icons/fa';

// Bảng màu (Giữ nguyên)
const USER_COLORS = [
  { bg: '#dbeafe', border: '#93c5fd' }, // Xanh dương
  { bg: '#a0d9b5', border: '#81b997' }, // Xanh lá
  { bg: '#fde68a', border: '#f6d057' }, // Vàng
  { bg: '#ddd6fe', border: '#a78bfa' }, // Tím
  { bg: '#fbcfe8', border: '#f472b6' }, // Hồng
];

// Helper gán màu (giữ nguyên)
const getColorForUser = (userId, selectedUsers) => {
  if (!selectedUsers || selectedUsers.length === 0) {
    return null; 
  }
  const index = selectedUsers.findIndex(u => String(u.value) === String(userId));
  if (index === -1) {
    const hash = String(userId).split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return USER_COLORS[hash % USER_COLORS.length];
  }
  return USER_COLORS[index % USER_COLORS.length];
};

const toLocalDateKey = (dateValue) => {
  if (!dateValue) return '';
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnlyLocal = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
  }
  const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date(dateValue);
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

const getAppointmentKind = (appointment = {}) => {
  const rawType = String(appointment.appointment_type || appointment.type || '').toLowerCase();
  if (appointment.is_consultation || rawType.includes('consult')) return 'consultation';
  if (rawType.includes('service') || appointment.service_id || appointment.service_name) return 'service';
  return 'appointment';
};

const getAppointmentIcon = (appointmentKind) => {
  if (appointmentKind === 'consultation') return <FaStethoscope />;
  if (appointmentKind === 'service') return <FaClipboardList />;
  return <FaUserClock />;
};

const normalizeAppointment = (appointment = {}) => {
  const appointmentDate = appointment.date
    || appointment.appointment_date
    || (appointment.appointment_time ? String(appointment.appointment_time).split('T')[0] : null)
    || (appointment.started_at ? String(appointment.started_at).split('T')[0] : null);
  const appointmentStartTime = appointment.start_time
    || appointment.appointment_start_time
    || (appointment.appointment_time ? String(appointment.appointment_time).split('T')[1]?.substring(0, 5) : null)
    || (appointment.started_at ? String(appointment.started_at).split('T')[1]?.substring(0, 5) : null);
  const appointmentEndTime = appointment.end_time
    || appointment.appointment_end_time
    || (appointment.ended_at ? String(appointment.ended_at).split('T')[1]?.substring(0, 5) : null);
  const appointmentKind = getAppointmentKind(appointment);
  let normalizedEndTime = appointmentEndTime;

  if (!normalizedEndTime && appointmentStartTime) {
    const durationMinutes = Number(appointment.duration_minutes || appointment.duration || 0);
    if (durationMinutes > 0) {
      const [hours, minutes] = appointmentStartTime.split(':').map(Number);
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const totalMinutes = hours * 60 + minutes + durationMinutes;
        const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const endMinutes = totalMinutes % 60;
        normalizedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
      }
    }
  }

  return {
    ...appointment,
    appointment_date: appointmentDate,
    appointment_start_time: appointmentStartTime,
    appointment_end_time: normalizedEndTime,
    appointment_kind: appointmentKind,
    patient_name: appointment.Patient?.User?.full_name || appointment.Patient?.full_name || appointment.guest_name || appointment.patient_name || 'Bệnh nhân',
    service_name: appointment.Service?.name || appointment.service_name || appointment.consultation_type || (appointmentKind === 'consultation' ? 'Tư vấn' : null)
  };
};


// ===================================================================
// === LOGIC CHO LỊCH THÁNG (MONTH VIEW) ===
// (ĐÃ SỬA: Lỗi logic nghỉ đè lên lịch làm việc)
// ===================================================================
const MonthView = ({ 
  month, 
  year, 
  workShiftConfig = [], 
  schedules = [],
  overtimeSchedules = [],
  leaveRequests = [], 
  appointments = [], 
  showWorkSchedules = true,
  onDateClick 
}) => {
  const normalizedAppointments = useMemo(() => appointments.map(normalizeAppointment), [appointments]);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[DEBUG-MonthView] normalizedAppointments count:', normalizedAppointments.length, 'sample:', normalizedAppointments.slice(0,2));
  }
  
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();

  // (Các hàm check helper)
  const isDateOnLeave = (dateObj) => {
    const checkTime = dateObj.getTime();
    return leaveRequests.some(leave => {
      const dateFrom = new Date(leave.date_from).setHours(0,0,0,0);
      const dateTo = leave.date_to ? new Date(leave.date_to).setHours(0,0,0,0) : dateFrom;
      return checkTime >= dateFrom && checkTime <= dateTo;
    });
  };
  
  const isDateWithAppointment = (dateObj) => {
  const checkTime = dateObj.getTime();
  return normalizedAppointments.some(app => 
    parseDateOnlyLocal(app.appointment_date)?.setHours(0,0,0,0) === checkTime
  );
};
  
  const hasWorkSchedule = (dateObj) => {
    const checkTime = dateObj.getTime();
    return schedules.some(s => new Date(s.date).setHours(0,0,0,0) === checkTime);
  };
  
  const hasOvertime = (dateObj) => {
    const checkTime = dateObj.getTime();
    return overtimeSchedules.some(s => new Date(s.date).setHours(0,0,0,0) === checkTime);
  };

  // (Render)
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const days = [];
  const startDayIndex = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startDayIndex; i++) { days.push(null); }
  for (let date = 1; date <= daysInMonth; date++) { days.push(date); }

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="calendar-view__container">
      <div className="calendar-view__grid">
        {weekDays.map(day => (
          <div key={day} className="calendar-view__day-header">
            {day}
          </div>
        ))}

        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-view__day calendar-view__day--empty" />;
          }

          const dateObj = new Date(year, month - 1, date);
          const isLeave = isDateOnLeave(dateObj);
          // (SỬA FIX 2) Lịch làm việc chỉ hiện khi KHÔNG nghỉ và được bật
          const isWork = showWorkSchedules && !isLeave && hasWorkSchedule(dateObj);
          const hasAppt = isDateWithAppointment(dateObj);
          // (SỬA FIX 2) Tăng ca chỉ hiện khi KHÔNG nghỉ
          const hasOT = !isLeave && hasOvertime(dateObj);
          
          let dayClass = 'calendar-view__day';
          if (isLeave) dayClass += ' calendar-view__day--on-leave';
          else if ((showWorkSchedules && isWork) || hasOT) dayClass += ' calendar-view__day--working'; // Gộp cả 2
          
          if (dateObj.getTime() === today.getTime()) dayClass += ' calendar-view__day--today';
          
          const leaveInfo = isLeave ? leaveRequests.filter(l => {
             const dateFrom = new Date(l.date_from).setHours(0,0,0,0);
             const dateTo = l.date_to ? new Date(l.date_to).setHours(0,0,0,0) : dateFrom;
             return dateObj.getTime() >= dateFrom && dateObj.getTime() <= dateTo;
          }) : [];
          
           const appointmentInfo = hasAppt ? normalizedAppointments.filter(app => 
             parseDateOnlyLocal(app.appointment_date)?.setHours(0,0,0,0) === dateObj.getTime()
          ) : [];
           const consultationCount = appointmentInfo.filter(app => app.appointment_kind === 'consultation').length;
           const serviceCount = appointmentInfo.filter(app => app.appointment_kind === 'service').length;
           const genericCount = appointmentInfo.length - consultationCount - serviceCount;

          return (
            <div
              key={date}
              className={dayClass}
              onClick={() => onDateClick && onDateClick(dateObj, leaveInfo, appointmentInfo)}
            >
              <span className="calendar-view__date-number">{date}</span>
              <div className="calendar-view__status-icons">
                {showWorkSchedules && isWork && <FaBusinessTime className="calendar-view__icon-work" title="Lịch làm việc" />}
                {hasOT && <FaClock className="calendar-view__icon-overtime" title="Có tăng ca" />}
                {isLeave && <FaExclamationTriangle className="calendar-view__icon-leave" title="Nghỉ phép" />}
                {serviceCount > 0 && <FaUserCheck className="calendar-view__icon-appointment-service" title={`Có ${serviceCount} lịch hẹn dịch vụ`} />}
                {consultationCount > 0 && <FaUserClock className="calendar-view__icon-appointment-consultation" title={`Có ${consultationCount} lịch hẹn tư vấn`} />}
                {genericCount > 0 && <FaUserClock className="calendar-view__icon-appointment" title={`Có ${genericCount} lịch hẹn`} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chú thích (SỬA: Thêm Tăng ca) */}
      <div className="calendar-view__legend">
        <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--leave" />
          <span>Nghỉ phép</span>
        </div>
        <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--appointment-service" />
          <span>Lịch hẹn dịch vụ</span>
        </div>
        <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--appointment-consultation" />
          <span>Lịch hẹn tư vấn</span>
        </div>
        <div className="calendar-view__legend-item">
          <span className="calendar-view__legend-color calendar-view__legend-color--overtime" />
          <span>Tăng ca</span>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// === LOGIC CHO LỊCH TUẦN (WEEK VIEW) ===
// ===================================================================

// (Helpers: generateTimeSlots, getWeekDays, timeToMinutes - giữ nguyên)
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
};
const getWeekDays = (anchorDate) => {
  const sourceDate = anchorDate instanceof Date
    ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate(), 12)
    : new Date(anchorDate);
  const date = new Date(sourceDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diff, 12);
  monday.setHours(0, 0, 0, 0);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    week.push(nextDay);
  }
  return week;
};
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const rangesOverlap = (startA, endA, startB, endB) => startA < endB && endA > startB;

const getShiftRangeMinutes = (shiftName, workShiftConfig = []) => {
  const defaultShifts = {
    morning: { start_time: '07:00:00', end_time: '12:00:00' },
    afternoon: { start_time: '13:00:00', end_time: '17:00:00' },
    evening: { start_time: '17:00:00', end_time: '21:00:00' }
  };
  const shift = workShiftConfig.find(s => s.shift_name === shiftName) || defaultShifts[shiftName];
  if (!shift) return null;
  return {
    start: timeToMinutes(shift.start_time),
    end: timeToMinutes(shift.end_time)
  };
};

// (Component con TimeSlotColumn - giữ nguyên)
const TimeSlotColumn = ({ dayOfWeek, timeSlots, workShiftConfig, showWorkSchedules = true }) => {
  const isWorkingHour = (dayOfWeek, timeSlot, workShiftConfig) => {
    if (!showWorkSchedules || !workShiftConfig || workShiftConfig.length === 0) return false;
    const slotMinutes = timeToMinutes(timeSlot);
    return workShiftConfig.some(shift => {
      if (!shift.is_active || !shift.days_of_week.includes(dayOfWeek)) return false;
      const startMinutes = timeToMinutes(shift.start_time);
      const endMinutes = timeToMinutes(shift.end_time);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };
  return (
    <>
      {timeSlots.map(time => {
        const isWork = isWorkingHour(dayOfWeek, time, workShiftConfig);
        return (
          <div
            key={time}
            className={`week-calendar-view__time-slot ${isWork ? 'week-calendar-view__time-slot--working' : ''}`}
          ></div>
        );
      })}
    </>
  );
};


// (Helper tính toán xếp chồng - calculateOverlaps - giữ nguyên)
const calculateOverlaps = (events) => {
  const sortedEvents = events.map(e => ({
    ...e,
    start: e.startTime ? timeToMinutes(e.startTime) : 0,
    end: e.endTime ? timeToMinutes(e.endTime) : 1440,
  })).sort((a, b) => a.start - b.start); 

  const clusters = [];
  let currentCluster = [];
  
  for (const event of sortedEvents) {
    if (currentCluster.length > 0 && event.start >= currentCluster[currentCluster.length - 1].end) {
      clusters.push(currentCluster);
      currentCluster = [event];
    } else {
      currentCluster.push(event);
      currentCluster.sort((a, b) => a.end - b.end);
    }
  }
  clusters.push(currentCluster);
  
  const eventsWithLayout = [];
  for (const cluster of clusters.filter(c => c.length > 0)) {
    const columns = [[]]; 
    for (const event of cluster) {
      let placed = false;
      for (const col of columns) {
        if (col.length === 0 || event.start >= col[col.length - 1].end) {
          col.push(event);
          event.stackIndex = columns.indexOf(col);
          placed = true;
          break;
        }
      }
      if (!placed) {
        event.stackIndex = columns.length;
        columns.push([event]);
      }
    }
    
    const totalCols = columns.length;
    for (const col of columns) {
      for (const event of col) {
        event.totalInStack = totalCols;
        eventsWithLayout.push(event);
      }
    }
  }
  
  return eventsWithLayout;
};


const WeekView = ({
  currentDate,
  schedules = [], 
  overtimeSchedules = [], 
  leaveRequests = [],
  appointments = [],
  workShiftConfig = [],
  selectedUsers = [], 
  showWorkSchedules = true,
  onEventClick,
  onVisibleWeekStartChange
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const normalizedAppointments = useMemo(() => appointments.map(normalizeAppointment), [appointments]);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[DEBUG-WeekView] normalizedAppointments count:', normalizedAppointments.length, 'sample:', normalizedAppointments.slice(0,2));
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (onVisibleWeekStartChange && weekDays[0]) {
      onVisibleWeekStartChange(weekDays[0]);
    }
  }, [onVisibleWeekStartChange, weekDays]);

  // (SỬA) Xử lý dữ liệu event (FIX 2 & 3)
  const processedEventsByDay = useMemo(() => {
    const eventMap = new Map();

    // (FIX 2) TẠO LOOKUP SETS CHO LỊCH NGHỈ TRƯỚC
    const blockedAllDaySet = new Set(); // Key: "YYYY-MM-DD_UserID"
    const blockedIntervalMap = new Map(); // Key: "YYYY-MM-DD_UserID" -> [{ start: 420, end: 720 }]

    const addBlockedInterval = (key, start, end, allDay = false) => {
      if (!key) return;
      if (allDay) {
        blockedAllDaySet.add(key);
        return;
      }
      if (start == null || end == null) return;
      if (!blockedIntervalMap.has(key)) blockedIntervalMap.set(key, []);
      blockedIntervalMap.get(key).push({ start, end });
    };

    leaveRequests.forEach(event => {
      const dateFrom = parseDateOnlyLocal(event.date_from)?.setHours(0,0,0,0);
      const dateTo = event.date_to ? parseDateOnlyLocal(event.date_to)?.setHours(0,0,0,0) : dateFrom;
      let d = new Date(dateFrom);

        while (d.getTime() <= dateTo) {
        const dayStr = toLocalDateKey(d);
            const key = `${dayStr}_${event.user_id}`;
            
            if (event.leave_type === 'full_day' || event.leave_type === 'multiple_days') {
            addBlockedInterval(key, null, null, true); // Thêm vào set nghỉ cả ngày
            } else {
                // (FIX 3) Xử lý nghỉ một phần (theo ca hoặc theo giờ)
                let startTime = null, endTime = null;
                if (event.leave_type === 'time_range') {
                    startTime = event.time_from;
                    endTime = event.time_to;
                } else if (event.leave_type === 'single_shift') {
                    // Dùng workShiftConfig để tìm giờ
              const shiftRange = getShiftRangeMinutes(event.shift_name, workShiftConfig);
              if (shiftRange) {
                addBlockedInterval(key, shiftRange.start, shiftRange.end);
              }
                }
                
                if (startTime && endTime) {
              addBlockedInterval(key, timeToMinutes(startTime), timeToMinutes(endTime));
                }
            }
            d.setDate(d.getDate() + 1);
        }
    });

    // === BƯỚC 1: Lịch nghỉ (Luôn hiển thị) ===
    leaveRequests.forEach(event => {
        // (FIX 3) Lấy đúng giờ nghỉ
        let startTime = null, endTime = null, title = 'Nghỉ phép';
        switch (event.leave_type) {
            case 'time_range': startTime = event.time_from; endTime = event.time_to; title = 'Nghỉ (theo giờ)'; break;
            case 'single_shift':
                const shift = workShiftConfig.find(s => s.shift_name === event.shift_name);
                if (shift) { startTime = shift.start_time; endTime = shift.end_time; title = `Nghỉ ${shift.display_name}`; }
                break;
            // Mặc định (full_day, multiple_days) thì startTime/endTime là null (cả ngày)
        }
        
        const e = { id: `leave-${event.id}`, type: 'leave', startTime, endTime, title, subtitle: event.reason, icon: <FaExclamationTriangle />, user: event.user, raw: event };
        
        const dateFrom = new Date(event.date_from).setHours(0,0,0,0);
        const dateTo = event.date_to ? new Date(event.date_to).setHours(0,0,0,0) : dateFrom;
        let d = new Date(dateFrom);
        while (d.getTime() <= dateTo) {
            const dayKey = d.getTime();
            if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
            eventMap.get(dayKey).push(e);
            d.setDate(d.getDate() + 1);
        }
    });

    // === BƯỚC 2: Lịch làm việc (Fixed/Flexible) (KIỂM TRA CONFLICT + DEDUP) ===
    // (FIX) Deduplicate schedules: Chỉ giữ 1 schedule per doctor/date/time FRAME
    const scheduleDedupeMap = new Map(); // Key: `${user_id}_${date}_${start_time}_${end_time}`, Value: schedule
    schedules.forEach(event => {
        // Normalize: Xử lý trường hợp end_time có thể là undefined, null, hoặc chuỗi
        const endTime = (event.end_time && event.end_time.trim()) || 'NO_END';
        const dedupeKey = `${event.user_id}_${event.date}_${event.start_time}_${endTime}`;
        if (!scheduleDedupeMap.has(dedupeKey)) {
            // Giữ cái đầu tiên gặp được
            scheduleDedupeMap.set(dedupeKey, event);
        }
    });

    // Lặp qua schedules đã dedup
    for (const event of scheduleDedupeMap.values()) {
        const dayStr = toLocalDateKey(event.date);
        const key = `${dayStr}_${event.user_id}`;
      const scheduleStart = timeToMinutes(event.start_time);
      const scheduleEnd = timeToMinutes(event.end_time);
        
        // 1. Kiểm tra nghỉ cả ngày
      if (blockedAllDaySet.has(key)) continue; // Bỏ qua

      // 2. Kiểm tra xung đột với nghỉ/appointment theo khoảng thời gian
      if (blockedIntervalMap.has(key)) {
        const blockedIntervals = blockedIntervalMap.get(key);
        const isConflicting = blockedIntervals.some(block => 
          rangesOverlap(scheduleStart, scheduleEnd, block.start, block.end)
        );
        if (isConflicting) continue; // Bỏ qua
        }

        // Nếu không conflict, thêm event
        const e = { id: event.id, type: event.schedule_type === 'flexible' ? 'flexible' : 'schedule', startTime: event.start_time, endTime: event.end_time, title: 'Làm việc', subtitle: event.schedule_type === 'flexible' ? 'Linh hoạt' : 'Cố định', icon: <FaBusinessTime />, user: event.user, raw: event };
        const dayKey = new Date(event.date).setHours(0,0,0,0);
        if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
        eventMap.get(dayKey).push(e);
    }

    // === BƯỚC 3: Lịch tăng ca (KIỂM TRA CONFLICT) ===
    overtimeSchedules.forEach(event => {
        const dayStr = toLocalDateKey(event.date);
        const key = `${dayStr}_${event.user_id}`;
      const overtimeStart = timeToMinutes(event.start_time);
      const overtimeEnd = timeToMinutes(event.end_time);
        
        // 1. Kiểm tra nghỉ cả ngày
      if (blockedAllDaySet.has(key)) return; // Bỏ qua

      // 2. Kiểm tra xung đột với nghỉ/appointment theo khoảng thời gian
      if (blockedIntervalMap.has(key)) {
        const blockedIntervals = blockedIntervalMap.get(key);
        const isConflicting = blockedIntervals.some(block => 
          rangesOverlap(overtimeStart, overtimeEnd, block.start, block.end)
            );
            if (isConflicting) return; // Bỏ qua
        }

        // Nếu không conflict, thêm event
        const e = { id: `ot-${event.id}`, type: 'overtime', startTime: event.start_time, endTime: event.end_time, title: 'Tăng ca', subtitle: event.reason, icon: <FaClock />, user: event.user, raw: event };
        const dayKey = parseDateOnlyLocal(event.date)?.setHours(0,0,0,0);
        if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
        eventMap.get(dayKey).push(e);
    });
        
    // === BƯỚC 4: Lịch hẹn (Luôn hiển thị) ===
    normalizedAppointments.forEach(event => {
      const sTime = event.appointment_start_time;
      const eTime = event.appointment_end_time;
      const appDate = event.appointment_date;

      if (sTime && appDate) {
        const appointmentKind = event.appointment_kind || 'appointment';
        const appointmentIcon = getAppointmentIcon(appointmentKind);
            const e = { 
                id: `app-${event.id}`, 
                type: 'appointment', 
                startTime: sTime,  // <-- Dùng biến đã check
                endTime: eTime,    // <-- Dùng biến đã check
          title: appointmentKind === 'consultation' ? 'Lịch hẹn tư vấn' : (appointmentKind === 'service' ? 'Lịch hẹn dịch vụ' : 'Lịch hẹn'), 
          subtitle: event.service_name || event.patient_name || event.guest_name || 'Bệnh nhân', 
            icon: appointmentIcon, 
          user: event.user, 
          raw: event,
          appointmentKind
            };

            const dayKey = parseDateOnlyLocal(appDate)?.setHours(0,0,0,0);
            if (!eventMap.has(dayKey)) eventMap.set(dayKey, []);
            eventMap.get(dayKey).push(e);
        }
    });
        
    // 5. Tính toán layout
    const layoutMap = new Map();
    for (const [dayKey, events] of eventMap.entries()) {
       layoutMap.set(dayKey, calculateOverlaps(events));
    }
    
    return layoutMap;

  }, [schedules, overtimeSchedules, leaveRequests, appointments, weekDays, workShiftConfig]); 
  
  // (Hàm renderEventsForDay - giữ nguyên)
  const renderEventsForDay = (day) => {
    const dayStart = day.getTime();
    const totalDayMinutes = 1440;
    const eventsWithLayout = processedEventsByDay.get(dayStart) || [];
    
    return (
      <>
        {eventsWithLayout.map(event => {
          let top = 0, height = 100;
          if (event.startTime && event.endTime) {
             top = (event.start / totalDayMinutes) * 100;
             height = ((event.end - event.start) / totalDayMinutes) * 100;
             if (height < 0) height = 0;
          }
          // Determine which user to display on the event badge.
          // Priority:
          // 1. If a selectedUsers list exists and contains an id that matches this event (user_id/doctor_id/etc), prefer that selected user (so when manager selects a doctor we show the doctor's name/color)
          // 2. Otherwise use event.user if available
          // 3. Fallback to undefined (no badge)
          const findSelectedById = (id) => selectedUsers && selectedUsers.find(u => String(u.value) === String(id));

          let displayUser = null;
          // candidate ids from different event shapes
          const candidateIds = [event.user?.id, event.user_id, event.raw?.user_id, event.raw?.doctor_id, event.raw?.doctor?.id];
          for (const cid of candidateIds) {
            if (!cid) continue;
            const sel = findSelectedById(cid);
            if (sel) {
              displayUser = { id: sel.value, full_name: sel.label, avatar_url: sel.avatar };
              break;
            }
          }

          // If not matched to a selected user, prefer event.user if present
          if (!displayUser && event.user) {
            displayUser = event.user;
          }

          // For appointment events: ensure subtitle still shows patient name (event.subtitle) but badge shows doctor (displayUser) when available.
          // [FIX] Chỉ apply userColor cho schedule/flexible/overtime
          // Leave và appointment giữ màu cố định để dễ nhận biết loại sự kiện
          const TYPE_USES_USER_COLOR = ['schedule', 'flexible', 'overtime'];
          const rawUserColor = getColorForUser(displayUser?.id || event.user?.id, selectedUsers);
          const userColor = TYPE_USES_USER_COLOR.includes(event.type) ? rawUserColor : null;
           const appointmentPalette = {
            service: { bg: 'var(--color-appointment-service)', border: 'var(--color-appointment-service-border)' },
            consultation: { bg: 'var(--color-appointment-consultation)', border: 'var(--color-appointment-consultation-border)' },
            appointment: { bg: 'var(--color-appointment)', border: 'var(--color-appointment-border)' }
           };
           const appointmentKind = event.type === 'appointment' ? (event.appointmentKind || 'appointment') : null;
           const appointmentColor = appointmentKind ? appointmentPalette[appointmentKind] || appointmentPalette.appointment : null;

           // Render all events in a single vertical column per day (no horizontal split)
           const style = {
             top: `${top}%`,
             height: `${height}%`,
             left: `2px`,
             width: `calc(100% - 4px)`,
             '--event-color': userColor ? userColor.bg : (appointmentColor ? appointmentColor.bg : `var(--color-event)`),
             '--event-border': userColor ? userColor.border : (appointmentColor ? appointmentColor.border : `var(--color-event-border)`),
             zIndex: (event.type === 'appointment') ? 20 : (event.type === 'leave' ? 15 : 5)
           };
          
          let typeClass = `week-calendar-view__event--${event.type}`;
           if (appointmentKind) {
             typeClass += ` week-calendar-view__event--appointment-${appointmentKind}`;
           }
          if (userColor) {
             typeClass += ' week-calendar-view__event--custom-color';
          }
          
          return (
            <div
              key={event.id}
              className={`week-calendar-view__event ${typeClass}`}
              style={style}
              onClick={() => onEventClick && onEventClick({ ...event.raw, type: event.type })}
              title={event.subtitle ? `${event.title}: ${event.subtitle}` : event.title}
            >
              {/* Use the computed displayUser (selected doctor or fallback) for the badge/avatar. */}
              {(displayUser || event.user) && (
                 <div className="week-calendar-view__event-user">
                   <img 
                     src={(displayUser && displayUser.avatar_url) || event.user?.avatar_url || 'https://placehold.co/20x20/EBF4FF/76A9FA?text=U'} 
                     alt={(displayUser && displayUser.full_name) || event.user?.full_name || 'Người dùng'} 
                   />
                   <span>{(displayUser && displayUser.full_name) || event.user?.full_name || ''}</span>
                 </div>
              )}
              <span className="week-calendar-view__event-title">
                 {event.icon} {event.title}
              </span>
              <span className="week-calendar-view__event-time">
                {event.type === 'appointment'
                  ? (event.startTime ? `${event.startTime.slice(0, 5)}${event.endTime ? ` - ${event.endTime.slice(0, 5)}` : ''}` : 'Cả ngày')
                  : (event.subtitle && height > 40 ? event.subtitle.substring(0, 50) : (event.startTime ? `${event.startTime.slice(0, 5)} - ${event.endTime.slice(0, 5)}` : 'Cả ngày'))}
              </span>
            </div>
          );
        })}
      </>
    );
  };
  
  // (Hàm renderCurrentTimeLine - giữ nguyên)
  const renderCurrentTimeLine = (day, showMarker = true) => {
    if (day.getTime() !== today.getTime()) return null;
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const topPercent = (minutes / 1440) * 100;
    return (
      <div className="week-calendar-view__current-time-line" style={{ top: `${topPercent}%` }}>
         {showMarker && (
            <div className="week-calendar-view__current-time-marker">
              {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
         )}
      </div>
    );
  };

  // (SỬA FIX 1) Hàm renderLegend (Thêm các loại mới)
  const renderLegend = () => {
    const userLegend = selectedUsers.length > 1
      ? selectedUsers.map((user, index) => {
          const color = USER_COLORS[index % USER_COLORS.length];
          return (
            <div key={user.value} className="week-calendar-view__legend-item">
              <span 
                 className="week-calendar-view__legend-color" 
                 style={{ backgroundColor: color.bg, borderColor: color.border, border: '1px solid' }} 
              />
              <span>{user.label}</span>
            </div>
          );
        })
      : null;

    return (
      <>
        {userLegend}
        {showWorkSchedules && (
          <>
            <div className="week-calendar-view__legend-item">
              <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-schedule" />
              <span>Lịch làm việc (CĐ)</span>
            </div>
            <div className="week-calendar-view__legend-item">
              <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-flexible" />
              <span>Lịch linh hoạt</span>
            </div>
          </>
        )}
        <div className="week-calendar-view__legend-item">
          <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-overtime" />
          <span>Tăng ca</span>
        </div>
        <div className="week-calendar-view__legend-item">
          <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-appointment-service" />
          <span>Lịch hẹn dịch vụ</span>
        </div>
        <div className="week-calendar-view__legend-item">
          <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-appointment-consultation" />
          <span>Lịch hẹn tư vấn</span>
        </div>
        <div className="week-calendar-view__legend-item">
          <span className="week-calendar-view__legend-color week-calendar-view__legend-color--event-leave" />
          <span>Nghỉ phép</span>
        </div>
      </>
    );
  };

  return (
    <div className="week-calendar-view__container">
      <div className="week-calendar-view__scroll-wrapper">
        <div className="week-calendar-view__grid-wrapper">
          
          {/* (Header Row (T2, T3...) giữ nguyên) */}
          <div className="week-calendar-view__header-row week-calendar-view__header-row--days">
            <div className="week-calendar-view__time-axis-header"></div>
            {weekDays.map(day => {
              const isToday = day.getTime() === today.getTime();
              return (
                  <div key={day.toISOString()} className={`week-calendar-view__day-header ${isToday ? 'week-calendar-view__day-header--today' : ''}`}>
                    <span className="week-calendar-view__day-name">
                      {day.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </span>
                    <span className="week-calendar-view__day-number">
                      {day.getDate()}
                    </span>
                  </div>
                );
            })}
          </div>

          {/* (Body Row (Time + Slots) giữ nguyên) */}
          <div className="week-calendar-view__body-row">
            <div className="week-calendar-view__time-axis">
              {timeSlots.map(time => (
                (time.endsWith(':00')) ? (
                  <div key={time} className="week-calendar-view__time-label">
                    {time}
                  </div>
                ) : null
              ))}
            </div>
            
            {weekDays.map(day => {
              const isToday = day.getTime() === today.getTime();
              const dayOfWeek = day.getDay();
              return (
                <div 
                  key={day.toISOString()} 
                  className={`week-calendar-view__day-column ${isToday ? 'week-calendar-view__day-column--today' : ''}`}
                >
                  <TimeSlotColumn dayOfWeek={dayOfWeek} timeSlots={timeSlots} workShiftConfig={workShiftConfig} showWorkSchedules={showWorkSchedules} />
                  {renderEventsForDay(day)}
                  {renderCurrentTimeLine(day, true)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Chú thích */}
      <div className="week-calendar-view__legend">
        {renderLegend()}
      </div>
    </div>
  );
};
// ===================================================================
// === COMPONENT CHÍNH (Router) ===
// ===================================================================
const CalendarView = (props) => {
  const {
    viewMode = 'month', 
    schedules = [], 
    overtimeSchedules = [], 
    leaveRequests = [], 
    appointments = [],
    showWorkSchedules = true
  } = props;
  // Nếu có selectedUsers (ví dụ trưởng phòng chọn 1 nhân viên), lọc các mảng dữ liệu
  // để chỉ gửi các event của user được chọn xuống các view (Week/Month).
  const selectedUsers = props.selectedUsers || [];
  const filteredSchedules = schedules;
  const filteredOvertime = overtimeSchedules;
  const filteredLeaves = leaveRequests;
  const filteredAppointments = appointments;

  if (viewMode === 'week') {
    // Chuyển props của Lịch Tuần (gửi dữ liệu đã lọc)
    return <WeekView 
      currentDate={props.currentDate}
      schedules={filteredSchedules}
      overtimeSchedules={filteredOvertime} 
      leaveRequests={filteredLeaves}
      appointments={filteredAppointments}
      workShiftConfig={props.workShiftConfig}
      selectedUsers={props.selectedUsers}
      showWorkSchedules={showWorkSchedules}
      onEventClick={props.onEventClick}
      onVisibleWeekStartChange={props.onVisibleWeekStartChange}
    />;
  }

  // Mặc định là Lịch Tháng (gửi dữ liệu đã lọc)
  return <MonthView 
    month={props.month}
    year={props.year}
    workShiftConfig={props.workShiftConfig}
    schedules={filteredSchedules} 
    overtimeSchedules={filteredOvertime} 
    leaveRequests={filteredLeaves}
    appointments={filteredAppointments}
    showWorkSchedules={showWorkSchedules}
    onDateClick={props.onDateClick}
  />;
};

export default CalendarView;
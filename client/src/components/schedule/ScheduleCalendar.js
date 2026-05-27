// client/src/components/schedule/ScheduleCalendar.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaChevronLeft, 
  FaChevronRight,
  FaPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaUserClock,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLightbulb,
  FaMouse
} from 'react-icons/fa';
import './ScheduleCalendar.css';

const ScheduleCalendar = ({ 
  schedules = [], 
  onDateClick, 
  onEventClick, 
  editable = false,
  loading = false 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const getSchedulesForSlot = (date, hour) => {
    const dateStr = formatDate(date);
    const slotStartHour = hour;
    const slotEndHour = hour + 1;

    return schedules.filter(schedule => {
      if (schedule.date !== dateStr) return false;

      const scheduleStart = parseTimeToHour(schedule.start_time);
      const scheduleEnd = parseTimeToHour(schedule.end_time);

      return scheduleStart < slotEndHour && scheduleEnd > slotStartHour;
    });
  };

  const parseTimeToHour = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const getWeekDates = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#10b981',
      booked: '#667eea',
      pending: '#f59e0b',
      approved: '#4facfe',
      rejected: '#ef4444',
      cancelled: '#999'
    };
    return colors[status] || '#ccc';
  };

  const getStatusText = (status) => {
    const texts = {
      available: 'Còn trống',
      booked: 'Đã đặt',
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Bị từ chối',
      cancelled: 'Đã hủy'
    };
    return texts[status] || status;
  };

  const getTypeIcon = (type) => {
    const icons = {
      fixed: <FaCalendarAlt />,
      overtime: <FaClock />,
      leave: <FaUserClock />
    };
    return icons[type] || <FaCalendarAlt />;
  };

  const getTypeText = (type) => {
    const texts = {
      fixed: 'Cố định',
      overtime: 'Tăng ca',
      leave: 'Nghỉ phép'
    };
    return texts[type] || type;
  };

  const weekDates = useMemo(() => getWeekDates(), [currentDate]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateHeader = (date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const isSlotAvailable = (date, hour) => {
    const schedulesInSlot = getSchedulesForSlot(date, hour);
    return schedulesInSlot.length === 0 || 
           schedulesInSlot.some(s => s.status === 'available');
  };

  const scheduleStats = useMemo(() => {
    return {
      total: schedules.length,
      available: schedules.filter(s => s.status === 'available').length,
      booked: schedules.filter(s => s.status === 'booked').length,
      pending: schedules.filter(s => s.status === 'pending').length,
      approved: schedules.filter(s => s.status === 'approved').length,
      overtime: schedules.filter(s => s.schedule_type === 'overtime').length,
      leave: schedules.filter(s => s.schedule_type === 'leave').length,
    };
  }, [schedules]);

  return (
    <div className="schedule-calendar-container">
      {/* Header Controls */}
      <div className="schedule-calendar-header">
        <div className="schedule-calendar-header-left">
          <h2>
            <FaCalendarAlt className="schedule-calendar-header-icon" />
            Lịch Tổng Hợp
          </h2>
          <div className="schedule-calendar-current-week">
            Tuần {formatDateHeader(weekDates[0])} - {formatDateHeader(weekDates[6])}
          </div>
          {scheduleStats.total > 0 && (
            <div className="schedule-calendar-week-stats">
              <span className="schedule-calendar-stat-badge">
                <FaCalendarAlt /> {scheduleStats.total} lịch
              </span>
              {scheduleStats.pending > 0 && (
                <span className="schedule-calendar-stat-badge schedule-calendar-stat-warning">
                  <FaHourglassHalf /> {scheduleStats.pending} chờ duyệt
                </span>
              )}
              {scheduleStats.overtime > 0 && (
                <span className="schedule-calendar-stat-badge schedule-calendar-stat-info">
                  <FaClock /> {scheduleStats.overtime} tăng ca
                </span>
              )}
            </div>
          )}
        </div>

        <div className="schedule-calendar-header-controls">
          <button 
            className="schedule-calendar-btn-nav" 
            onClick={goToPreviousWeek}
          >
            <FaChevronLeft /> Tuần trước
          </button>
          <button 
            className="schedule-calendar-btn-today" 
            onClick={goToToday}
          >
            Hôm nay
          </button>
          <button 
            className="schedule-calendar-btn-nav" 
            onClick={goToNextWeek}
          >
            Tuần sau <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="schedule-calendar-loading">
          <div className="schedule-calendar-spinner"></div>
          <p>Đang tải lịch...</p>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && (
        <div className="schedule-calendar-grid">
          {/* Header Row - Days */}
          <div className="schedule-calendar-header-row">
            <div className="schedule-calendar-time-header">
              <FaClock className="schedule-calendar-time-header-icon" />
              Giờ
            </div>
            {weekDates.map((date, index) => (
              <div 
                key={index} 
                className={`schedule-calendar-day-header ${isToday(date) ? 'schedule-calendar-day-today' : ''} ${isPast(date) ? 'schedule-calendar-day-past' : ''}`}
              >
                <div className="schedule-calendar-day-name">{DAYS[date.getDay()]}</div>
                <div className="schedule-calendar-day-date">{formatDateHeader(date)}</div>
                {isToday(date) && (
                  <div className="schedule-calendar-today-indicator">Hôm nay</div>
                )}
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="schedule-calendar-body">
            {HOURS.map(hour => (
              <div key={hour} className="schedule-calendar-time-row">
                <div className="schedule-calendar-time-label">
                  <span className="schedule-calendar-time-text">{formatTime(hour)}</span>
                </div>

                {weekDates.map((date, dayIndex) => {
                  const schedulesInSlot = getSchedulesForSlot(date, hour);
                  const isCurrentDay = isToday(date);
                  const isPastSlot = isPast(date);
                  const slotKey = `${formatDate(date)}_${hour}`;
                  const isHovered = hoveredSlot === slotKey;
                  const canEdit = editable && !isPastSlot && isSlotAvailable(date, hour);

                  return (
                    <div 
                      key={dayIndex}
                      className={`schedule-calendar-time-slot 
                        ${isCurrentDay ? 'schedule-calendar-current-day' : ''} 
                        ${isPastSlot ? 'schedule-calendar-past-slot' : ''}
                        ${canEdit ? 'schedule-calendar-editable' : ''}
                        ${isHovered ? 'schedule-calendar-hovered' : ''}
                      `}
                      onClick={() => !isPastSlot && onDateClick?.(formatDate(date), hour)}
                      onMouseEnter={() => setHoveredSlot(slotKey)}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {schedulesInSlot.length > 0 ? (
                        <div className="schedule-calendar-schedules-container">
                          {schedulesInSlot.map((schedule) => {
                            const isFirstSlot = parseTimeToHour(schedule.start_time) >= hour && 
                                               parseTimeToHour(schedule.start_time) < hour + 1;
                            
                            return (
                              <div
                                key={schedule.id}
                                className={`schedule-calendar-schedule-item ${isFirstSlot ? 'schedule-calendar-first-slot' : 'schedule-calendar-continuation'}`}
                                style={{ 
                                  borderLeft: `4px solid ${getStatusColor(schedule.status)}`,
                                  background: `${getStatusColor(schedule.status)}15`
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick?.(schedule);
                                }}
                                title={`${schedule.user?.full_name || schedule.User?.full_name || 'Unknown'} - ${schedule.start_time?.substring(0, 5)} đến ${schedule.end_time?.substring(0, 5)}\n${getTypeText(schedule.schedule_type)} - ${getStatusText(schedule.status)}`}
                              >
                                {isFirstSlot && (
                                  <>
                                    <div className="schedule-calendar-schedule-header">
                                      <span className="schedule-calendar-schedule-icon">
                                        {getTypeIcon(schedule.schedule_type)}
                                      </span>
                                      <span className="schedule-calendar-schedule-name">
                                        {schedule.user?.full_name || schedule.User?.full_name || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="schedule-calendar-schedule-time">
                                      <FaClock /> {schedule.start_time?.substring(0, 5)} - {schedule.end_time?.substring(0, 5)}
                                    </div>
                                    <div className="schedule-calendar-schedule-meta">
                                      {schedule.schedule_type !== 'fixed' && (
                                        <span className="schedule-calendar-schedule-badge schedule-calendar-type-badge">
                                          {getTypeText(schedule.schedule_type)}
                                        </span>
                                      )}
                                      <span className={`schedule-calendar-schedule-badge schedule-calendar-status-badge schedule-calendar-status-${schedule.status}`}>
                                        {getStatusText(schedule.status)}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="schedule-calendar-empty-slot">
                          {canEdit && (
                            <div className="schedule-calendar-add-slot-indicator">
                              <FaPlus className="schedule-calendar-add-icon" />
                              <span className="schedule-calendar-add-text">Thêm lịch</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && schedules.length === 0 && (
        <div className="schedule-calendar-empty-state">
          <div className="schedule-calendar-empty-icon"><FaCalendarAlt /></div>
          <h3>Chưa có lịch làm việc nào</h3>
          <p>Không có lịch làm việc nào trong tuần này.</p>
          {editable && (
            <p className="schedule-calendar-empty-hint">
              <FaLightbulb /> Click vào ô giờ để thêm lịch mới
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="schedule-calendar-legend">
        <h4 className="schedule-calendar-legend-title">
          <FaInfoCircle className="schedule-calendar-legend-icon" />
          Chú thích:
        </h4>
        <div className="schedule-calendar-legend-items">
          {/* Status */}
          <div className="schedule-calendar-legend-group">
            <div className="schedule-calendar-legend-group-title">Trạng thái:</div>
            <div className="schedule-calendar-legend-item">
              <span className="schedule-calendar-legend-dot" style={{ background: '#10b981' }}></span>
              <span>Còn trống</span>
            </div>
            <div className="schedule-calendar-legend-item">
              <span className="schedule-calendar-legend-dot" style={{ background: '#667eea' }}></span>
              <span>Đã đặt</span>
            </div>
            <div className="schedule-calendar-legend-item">
              <span className="schedule-calendar-legend-dot" style={{ background: '#f59e0b' }}></span>
              <span>Chờ duyệt</span>
            </div>
            <div className="schedule-calendar-legend-item">
              <span className="schedule-calendar-legend-dot" style={{ background: '#4facfe' }}></span>
              <span>Đã duyệt</span>
            </div>
            <div className="schedule-calendar-legend-item">
              <span className="schedule-calendar-legend-dot" style={{ background: '#ef4444' }}></span>
              <span>Bị từ chối</span>
            </div>
            <div className="schedule-calendar-legend-item">
              <span className="schedule-calendar-legend-dot" style={{ background: '#999' }}></span>
              <span>Đã hủy</span>
            </div>
          </div>

          {/* Type */}
          <div className="schedule-calendar-legend-group">
            <div className="schedule-calendar-legend-group-title">Loại lịch:</div>
            <div className="schedule-calendar-legend-item">
              <FaCalendarAlt className="schedule-calendar-legend-icon-text" />
              <span>Cố định</span>
            </div>
            <div className="schedule-calendar-legend-item">
              <FaClock className="schedule-calendar-legend-icon-text" />
              <span>Tăng ca</span>
            </div>
            <div className="schedule-calendar-legend-item">
              <FaUserClock className="schedule-calendar-legend-icon-text" />
              <span>Nghỉ phép</span>
            </div>
          </div>
        </div>
      </div>

      {/* Helper Text */}
      <div className="schedule-calendar-helper">
        <div className="schedule-calendar-helper-item">
          <FaLightbulb className="schedule-calendar-helper-icon" />
          <span>Click vào lịch để xem chi tiết</span>
        </div>
        {editable && (
          <div className="schedule-calendar-helper-item">
            <FaPlus className="schedule-calendar-helper-icon" />
            <span>Click vào ô trống để thêm lịch mới</span>
          </div>
        )}
        <div className="schedule-calendar-helper-item">
          <FaMouse className="schedule-calendar-helper-icon" />
          <span>Hover để xem thông tin nhanh</span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
// client/src/components/schedule/ScheduleForm.js
import React, { useState, useEffect } from 'react';
import {
  FaCalendarAlt,
  FaUsers,
  FaClock,
  FaCheck,
  FaTimes,
  FaPlus,
  FaTrash,
  FaInfoCircle,
  FaChevronRight,
  FaChevronLeft,
  FaSave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSearch,
  FaFilter,
} from 'react-icons/fa';
import api from '../../services/api';
import { createFixedSchedule } from '../../services/scheduleService';
import './ScheduleForm.css';
import './RangeSelector.css';
import moment from 'moment';
import RangeSelector from './RangeSelector';

const ScheduleForm = ({ onSuccess, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ============ STATE ============
  const [selectedRangeType, setSelectedRangeType] = useState('week'); // week, month, year
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);

  const [weekSchedules, setWeekSchedules] = useState({});
  const [conflicts, setConflicts] = useState({});
  const [applyToAllSelected, setApplyToAllSelected] = useState(false);
  const [applyPresetScope, setApplyPresetScope] = useState('selected'); // 'selected' | 'all' | 'doctor' | 'staff'

  // ============ CONSTANTS ============
  const SHIFTS = [
    { value: 'morning', label: 'Sáng', time: '7:00 - 11:30', color: '#fef3c7', icon: <FaClock /> },
    { value: 'afternoon', label: 'Chiều', time: '13:00 - 17:30', color: '#dbeafe', icon: <FaClock /> },
    { value: 'evening', label: 'Tối', time: '18:00 - 21:00', color: '#e9d5ff', icon: <FaClock /> },
  ];

  const WEEKDAYS = [
    { day: 1, label: 'T2', fullLabel: 'Thứ 2' },
    { day: 2, label: 'T3', fullLabel: 'Thứ 3' },
    { day: 3, label: 'T4', fullLabel: 'Thứ 4' },
    { day: 4, label: 'T5', fullLabel: 'Thứ 5' },
    { day: 5, label: 'T6', fullLabel: 'Thứ 6' },
    { day: 6, label: 'T7', fullLabel: 'Thứ 7' },
    { day: 0, label: 'CN', fullLabel: 'Chủ nhật' },
  ];

  // ============ LIFECYCLE ============
  useEffect(() => {
    initializeTimeRanges();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchWeeksInMonth(selectedMonth);
    }
  }, [selectedMonth]);

  // ============ API CALLS ============
  const initializeTimeRanges = () => {
    // Years
    const years = [];
    const currentYear = moment().year();
    for (let i = 0; i < 3; i++) years.push(currentYear + i);
    setAvailableYears(years);
    setSelectedYear(currentYear);

    // Months
    fetchAvailableMonths();
  };

  const fetchAvailableMonths = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = moment().add(i, 'months');
      months.push({
        value: date.format('YYYY-MM'),
        label: date.format('Tháng MM/YYYY'),
        year: date.year(),
        month: date.month() + 1,
        weekCount: getWeeksInMonth(date),
      });
    }
    setAvailableMonths(months);
    setSelectedMonth(months[0]);
  };

  const getWeeksInMonth = (date) => {
    const start = date.clone().startOf('month').startOf('isoWeek');
    const end = date.clone().endOf('month');
    let count = 0;
    let cur = start.clone();
    while (cur.isSameOrBefore(end)) {
      count++;
      cur.add(1, 'week');
    }
    return count;
  };

  const fetchWeeksInMonth = (monthData) => {
    if (!monthData) return;
    const weeks = [];
    const startOfMonth = moment(`${monthData.value}-01`);
    const endOfMonth = startOfMonth.clone().endOf('month');
    const nextMonday = moment().add(1, 'week').startOf('isoWeek');

    let current = startOfMonth.clone().startOf('isoWeek');
    while (current.isSameOrBefore(endOfMonth)) {
      const weekEnd = current.clone().endOf('isoWeek');
      const isSelectable = weekEnd.isAfter(nextMonday);

      weeks.push({
        value: current.format('YYYY-[W]WW'),
        label: `Tuần ${current.isoWeek()} (${current.format('DD/MM')} - ${weekEnd.format('DD/MM')})`,
        // provide both old and new keys for compatibility
        start: current.format('YYYY-MM-DD'),
        end: weekEnd.format('YYYY-MM-DD'),
        start_date: current.format('YYYY-MM-DD'),
        end_date: weekEnd.format('YYYY-MM-DD'),
        week_number: current.isoWeek(),
        isSelectable,
      });
      current.add(1, 'week');
    }
    setAvailableWeeks(weeks);
  };

  const getWeeksForMonth = (monthValue) => {
    const weeks = [];
    const startOfMonth = moment(`${monthValue}-01`);
    const endOfMonth = startOfMonth.clone().endOf('month');
    let current = startOfMonth.clone().startOf('isoWeek');
    while (current.isSameOrBefore(endOfMonth)) {
      const weekEnd = current.clone().endOf('isoWeek');
      weeks.push({
        value: current.format('YYYY-[W]WW'),
        start_date: current.format('YYYY-MM-DD'),
        end_date: weekEnd.format('YYYY-MM-DD'),
        week_number: current.isoWeek(),
      });
      current.add(1, 'week');
    }
    return weeks;
  };

  const getWeeksForYear = (year) => {
    const weeks = [];
    let current = moment(`${year}-01-01`).startOf('isoWeek');
    const endOfYear = moment(`${year}-12-31`).endOf('day');
    while (current.isSameOrBefore(endOfYear)) {
      const weekEnd = current.clone().endOf('isoWeek');
      weeks.push({
        value: current.format('YYYY-[W]WW'),
        start_date: current.format('YYYY-MM-DD'),
        end_date: weekEnd.format('YYYY-MM-DD'),
        week_number: current.isoWeek(),
      });
      current.add(1, 'week');
    }
    return weeks;
  };

  const handleRangeTypeChange = (type) => {
    setSelectedRangeType(type);
    setSelectedWeeks([]);
    setSelectedMonths([]);
  };

  const handleWeekSelection = (week) => {
    if (selectedRangeType !== 'week') return;
    setSelectedWeeks((prev) => {
      const exists = prev.find((w) => w.value === week.value);
      let next;
      if (exists) next = prev.filter((w) => w.value !== week.value);
      else next = [...prev, week].sort((a, b) => moment(a.start).diff(moment(b.start)));

      // if user selected exactly one week, set selectedWeek for downstream compatibility
      if (next.length === 1) {
        const firstWeek = next[0];
        const normalizedWeek = {
          ...firstWeek,
          start_date: firstWeek.start_date || firstWeek.start,
          end_date: firstWeek.end_date || firstWeek.end,
          week_number: firstWeek.week_number || (firstWeek.value ? parseInt((firstWeek.value.match(/W(\d+)$/) || [])[1]) : undefined),
        };
        setSelectedWeek(normalizedWeek);
        initializeWeekSchedules(normalizedWeek);
      } else if (next.length === 0) {
        // cleared selection
        setSelectedWeek(null);
        setWeekSchedules({});
      }

      return next;
    });
  };

  const handleMonthSelection = (month) => {
    if (selectedRangeType !== 'month') return;
    setSelectedMonths((prev) => {
      const exists = prev.find((m) => m.value === month.value);
      if (exists) return prev.filter((m) => m.value !== month.value);
      return [...prev, month].sort((a, b) => moment(a.value).diff(moment(b.value)));
    });
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users/by-role', {
        params: { role: 'doctor,staff', limit: 200 },
      });
      if (data.success) {
        const userData = data.users.map((u) => ({
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          avatar_url: u.avatar_url,
          specialty: u.doctorInfo?.Specialty?.name,
          department: u.staffInfo?.department,
          displayName: u.role === 'doctor' ? `BS. ${u.full_name}` : u.full_name,
          displayRole:
            u.role === 'doctor'
              ? u.doctorInfo?.Specialty?.name || 'Bác sĩ'
              : u.staffInfo?.department || 'Nhân viên',
        }));
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Không thể tải danh sách nhân viên');
    }
  };

  const checkConflict = async (userId, date, shift) => {
    try {
      const { data } = await api.get('/schedules/check-conflict', {
        params: { user_id: userId, date, shift },
      });
      return data;
    } catch (error) {
      console.error('Error checking conflict:', error);
      return { has_conflict: false };
    }
  };

  // ============ HANDLERS ============
  const handleWeekSelect = (week) => {
    if (week.disabled) return;
    setSelectedWeek(week);
    initializeWeekSchedules(week);
  };

  const initializeWeekSchedules = (week) => {
    const schedules = {};
    const weekDates = WEEKDAYS.map(({ day }) =>
      moment(week.start_date).isoWeekday(day).format('YYYY-MM-DD')
    );

    selectedUsers.forEach((user) => {
      schedules[user.id] = {};
      weekDates.forEach((date) => {
        schedules[user.id][date] = [];
      });
    });

    setWeekSchedules(schedules);
    setConflicts({});
  };

  const handleUserSelect = (user) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
      const newSch = { ...weekSchedules };
      delete newSch[user.id];
      setWeekSchedules(newSch);
    } else {
      setSelectedUsers([...selectedUsers, user]);
      if (selectedWeek) {
        const newSch = { ...weekSchedules };
        newSch[user.id] = {};
        for (let i = 0; i < 7; i++) {
          const date = moment(selectedWeek.start_date).add(i, 'days').format('YYYY-MM-DD');
          newSch[user.id][date] = [];
        }
        setWeekSchedules(newSch);
      }
    }
  };

  const handleShiftToggle = async (userId, date, shift) => {
    const currentShifts = weekSchedules[userId]?.[date] || [];
    let newShifts;

    if (currentShifts.includes(shift)) {
      newShifts = currentShifts.filter((s) => s !== shift);
    } else {
      if (currentShifts.length >= 2) {
        alert('Không thể chọn quá 2 ca trong 1 ngày');
        return;
      }
      const conflict = await checkConflict(userId, date, shift);
      if (conflict.has_conflict) {
        const key = `${userId}-${date}-${shift}`;
        setConflicts((prev) => ({ ...prev, [key]: conflict.conflict }));
        alert(
          `Đã có lịch trùng:\n${conflict.conflict.schedule_type} - ${conflict.conflict.start_time} đến ${conflict.conflict.end_time}`
        );
        return;
      }
      newShifts = [...currentShifts, shift];
    }

    setWeekSchedules((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [date]: newShifts },
    }));
  };

  const applyShiftPreset = (presetKey) => {
    if (!selectedWeek) {
      alert('Vui lòng chọn một tuần làm mẫu trước khi áp dụng preset');
      return;
    }

    const presetMap = {
      sang_chieu: ['morning', 'afternoon'],
      sang_toi: ['morning', 'evening'],
      chieu_toi: ['afternoon', 'evening'],
    };

    const presetShifts = presetMap[presetKey] || [];

    // determine target users based on scope
    let targetUsers = [];
    if (applyPresetScope === 'selected') targetUsers = selectedUsers;
    else if (applyPresetScope === 'all') targetUsers = users;
    else if (applyPresetScope === 'doctor') targetUsers = users.filter((u) => u.role === 'doctor');
    else if (applyPresetScope === 'staff') targetUsers = users.filter((u) => u.role === 'staff');

    if (!targetUsers || targetUsers.length === 0) {
      alert('Không có nhân sự phù hợp trong phạm vi đã chọn');
      return;
    }

    // compute week dates (YYYY-MM-DD)
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = moment(selectedWeek.start_date).add(i, 'days').format('YYYY-MM-DD');
      weekDates.push(date);
    }

    setWeekSchedules((prev) => {
      const next = { ...prev };
      targetUsers.forEach((user) => {
        if (!next[user.id]) next[user.id] = {};
        weekDates.forEach((d) => {
          // set preset (max 2 shifts)
          next[user.id][d] = presetShifts.slice(0, 2);
        });
      });
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let toCreate = [];

      // If applyToAllSelected, replicate current weekSchedules across all selected ranges (weeks/months/years)
      if (applyToAllSelected) {
        // determine baseWeek: the currently displayed selectedWeek or a reasonable first-week fallback
        let baseWeek = selectedWeek;
        if (!baseWeek) {
          if (selectedRangeType === 'week' && Array.isArray(selectedWeeks) && selectedWeeks.length > 0) {
            baseWeek = selectedWeeks[0];
          } else if (selectedRangeType === 'month' && Array.isArray(selectedMonths) && selectedMonths.length > 0) {
            const possible = getWeeksForMonth(selectedMonths[0].value);
            baseWeek = possible && possible.length > 0 ? possible[0] : null;
          } else if (selectedRangeType === 'year' && selectedYear) {
            const possible = getWeeksForYear(selectedYear);
            baseWeek = possible && possible.length > 0 ? possible[0] : null;
          }
        }

        if (!baseWeek) {
          alert('Không có tuần gốc để nhân bản. Vui lòng chọn hoặc thiết lập một tuần gốc.');
          setLoading(false);
          return;
        }

        // build targetWeeks depending on range type
        let targetWeeks = [];
        if (selectedRangeType === 'week' && Array.isArray(selectedWeeks)) {
          targetWeeks = selectedWeeks;
        } else if (selectedRangeType === 'month' && Array.isArray(selectedMonths)) {
          selectedMonths.forEach((m) => {
            const weeks = getWeeksForMonth(m.value);
            if (Array.isArray(weeks)) targetWeeks.push(...weeks);
          });
        } else if (selectedRangeType === 'year' && selectedYear) {
          const weeks = getWeeksForYear(selectedYear);
          if (Array.isArray(weeks)) targetWeeks.push(...weeks);
        }

        // dedupe targetWeeks by start_date
        const seen = new Set();
        targetWeeks = targetWeeks.filter((w) => {
          if (!w || !w.start_date) return false;
          if (seen.has(w.start_date)) return false;
          seen.add(w.start_date);
          return true;
        });

        // avoid recreating for the base week (optional: skip if same start_date)
        const filteredTargets = targetWeeks.filter((tw) => tw.start_date !== baseWeek.start_date);

        // for each selected user, for each day offset in the base week, copy shifts to every target week
        selectedUsers.forEach((user) => {
          const baseUserSch = weekSchedules[user.id] || {};
          for (let i = 0; i < 7; i++) {
            const baseDate = moment(baseWeek.start_date).add(i, 'days').format('YYYY-MM-DD');
            const shifts = baseUserSch[baseDate] || [];
            shifts.forEach((shiftValue) => {
              const shiftInfo = SHIFTS.find((s) => s.value === shiftValue);
              if (!shiftInfo) return;
              const [start_time, end_time] = shiftInfo.time.split(' - ');

              filteredTargets.forEach((targetWeek) => {
                const targetDate = moment(targetWeek.start_date).add(i, 'days').format('YYYY-MM-DD');
                toCreate.push({
                  user_id: user.id,
                  date: targetDate,
                  start_time: start_time.trim(),
                  end_time: end_time.trim(),
                  is_recurring: false,
                  recurring_pattern: null,
                });
              });
            });
          }
        });
      } else {
        // default: only create based on current weekSchedules map
        selectedUsers.forEach((user) => {
          const userSch = weekSchedules[user.id] || {};
          Object.entries(userSch).forEach(([date, shifts]) => {
            shifts.forEach((shiftValue) => {
              const shiftInfo = SHIFTS.find((s) => s.value === shiftValue);
              if (!shiftInfo) return;
              const [start_time, end_time] = shiftInfo.time.split(' - ');
              toCreate.push({
                user_id: user.id,
                date,
                start_time: start_time.trim(),
                end_time: end_time.trim(),
                is_recurring: false,
                recurring_pattern: null,
              });
            });
          });
        });
      }

      if (toCreate.length === 0) {
        alert('Vui lòng chọn ít nhất 1 ca làm việc');
        setLoading(false);
        return;
      }

      const results = [];
      const errors = [];

      for (const sch of toCreate) {
        try {
          const res = await createFixedSchedule(sch);
          results.push(res);
        } catch (err) {
          errors.push({ date: sch.date, shift: sch.start_time, error: err.message });
        }
      }

      if (results.length > 0) {
        alert(
          `Thành công!\n\nĐã tạo: ${results.length}/${toCreate.length} lịch làm việc${
            errors.length > 0 ? `\n\nLỗi: ${errors.length} lịch không tạo được` : ''
          }`
        );
        if (onSuccess) onSuccess(results);
      } else {
        alert('Không thể tạo lịch nào. Vui lòng kiểm tra lại!');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Lỗi: ' + (error.message || 'Có lỗi xảy ra khi tạo lịch'));
    } finally {
      setLoading(false);
    }
  };

  const getTotalShifts = () => {
    let total = 0;
    Object.values(weekSchedules).forEach((userSch) => {
      Object.values(userSch).forEach((shifts) => (total += shifts.length));
    });
    return total;
  };

  const getUserShiftCount = (userId) => {
    if (!weekSchedules[userId]) return 0;
    return Object.values(weekSchedules[userId]).reduce((sum, s) => sum + s.length, 0);
  };

  // ============ RENDER HELPERS ============
  const filteredUsers = users.filter((user) => {
    const matchSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || user.role === filterRole;
    return matchSearch && matchRole;
  });

  const renderStep1 = () => (
    <div className="schedule-form-step">
      <div className="schedule-form-step-content">
        <div className="schedule-form-step-header">
          <h3>
            <FaCalendarAlt className="schedule-form-label-icon" />
            <span>Chọn thời gian</span>
          </h3>
          <p className="schedule-form-step-description">
            Chọn khoảng thời gian bạn muốn tạo lịch làm việc
          </p>
        </div>

        {/* Selected ranges summary (visible in step 1) */}
        <div className="schedule-form-selected-count">
          {selectedRangeType === 'week' && (
            <>
              <span className="count-badge">{selectedWeeks.length}</span>
              <span>tuần đã chọn</span>
            </>
          )}
          {selectedRangeType === 'month' && (
            <>
              <span className="count-badge">{selectedMonths.length}</span>
              <span>tháng đã chọn</span>
            </>
          )}
          {selectedRangeType === 'year' && (
            <>
              <span className="count-badge">{selectedYear}</span>
              <span>năm</span>
            </>
          )}
        </div>

        <div className="schedule-form-step-body">
          <RangeSelector
            selectedRangeType={selectedRangeType}
            onRangeTypeChange={handleRangeTypeChange}
            availableYears={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            availableWeeks={availableWeeks}
            selectedWeeks={selectedWeeks}
            onWeekSelect={handleWeekSelection}
            availableMonths={availableMonths}
            selectedMonths={selectedMonths}
            onMonthSelect={handleMonthSelection}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="schedule-form-step-content">
      <div className="schedule-form-step-header">
        <h3>
          <FaUsers className="schedule-form-label-icon" />
          Chọn nhân sự
        </h3>
        <p>Chọn bác sĩ/nhân viên cần tạo lịch</p>
      </div>

      <div className="schedule-form-user-selection">
        <div className="schedule-form-selected-users-box">
          <div className="schedule-form-box-header">
            <h4>
              <FaUsers /> Đã chọn ({selectedUsers.length})
            </h4>
            <button className="schedule-form-btn-add" onClick={() => setShowUserModal(true)}>
              <FaPlus /> Thêm nhân sự
            </button>
          </div>

          <div className="schedule-form-selected-users-list">
            {selectedUsers.length === 0 ? (
              <div className="schedule-form-empty-state">
                <p>Chưa có nhân viên nào được chọn</p>
                <button className="schedule-form-btn-add" onClick={() => setShowUserModal(true)}>
                  <FaPlus /> Thêm nhân sự
                </button>
              </div>
            ) : (
              selectedUsers.map((user) => (
                <div key={user.id} className="schedule-form-selected-user-tag">
                  <div className="schedule-form-user-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} />
                    ) : (
                      <div className="schedule-form-avatar-placeholder">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="schedule-form-user-info">
                    <span className="schedule-form-user-name">{user.displayName}</span>
                    <span className="schedule-form-user-role">{user.displayRole}</span>
                  </div>
                  <button className="schedule-form-btn-remove" onClick={() => handleUserSelect(user)}>
                    <FaTimes />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal chọn user */}
      {showUserModal && (
        <div className="schedule-form-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="schedule-form-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-form-modal-header">
              <h3>
                <FaPlus /> Thêm nhân sự vào lịch
              </h3>
              <button className="schedule-form-btn-close" onClick={() => setShowUserModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="schedule-form-modal-filters">
              <div className="schedule-form-search-wrapper">
                <FaSearch className="schedule-form-search-icon" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="schedule-form-search-input"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="schedule-form-filter-select"
              >
                <option value="all">
                  <FaFilter /> Tất cả
                </option>
                <option value="doctor">Bác sĩ</option>
                <option value="staff">Nhân viên</option>
              </select>
            </div>

            <div className="schedule-form-modal-body">
              <div className="schedule-form-user-list">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some((u) => u.id === user.id);
                  return (
                    <div
                      key={user.id}
                      className={`schedule-form-user-item ${isSelected ? 'schedule-form-user-selected' : ''}`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <input type="checkbox" checked={isSelected} onChange={() => {}} />
                      <div className="schedule-form-user-avatar">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} />
                        ) : (
                          <div className="schedule-form-avatar-placeholder">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="schedule-form-user-details">
                        <div className="schedule-form-user-name">{user.displayName}</div>
                        <div className="schedule-form-user-meta">
                          <span className="schedule-form-user-role-badge">{user.displayRole}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredUsers.length === 0 && (
                <div className="schedule-form-empty-state">
                  <p>Không tìm thấy nhân viên phù hợp</p>
                </div>
              )}
            </div>

            <div className="schedule-form-modal-footer">
              <button className="schedule-form-btn-cancel" onClick={() => setShowUserModal(false)}>
                <FaTimes /> Hủy
              </button>
              <button
                className="schedule-form-btn-submit"
                onClick={() => setShowUserModal(false)}
                disabled={selectedUsers.length === 0}
              >
                <FaCheck /> Xác nhận ({selectedUsers.length} người)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => {
    if (!selectedWeek || selectedUsers.length === 0) {
      return (
        <div className="schedule-form-step-content">
          <div className="schedule-form-empty-state">
            <p>Vui lòng chọn tuần và nhân sự trước</p>
            <button className="schedule-form-btn-add" onClick={() => setCurrentStep(currentStep - 1)}>
              <FaChevronLeft /> Quay lại
            </button>
          </div>
        </div>
      );
    }

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = moment(selectedWeek.start_date).add(i, 'days');
      weekDates.push({
        date: date.format('YYYY-MM-DD'),
        dayOfWeek: date.day(),
        display: date.format('DD/MM'),
        dayName: WEEKDAYS.find((w) => w.day === date.day())?.label || '',
      });
    }

    return (
      <div className="schedule-form-step-content">
        <div className="schedule-form-step-header">
          <h3>
            <FaCalendarAlt className="schedule-form-label-icon" />
            Thiết lập lịch tuần {selectedWeek.week_number}:{' '}
            {moment(selectedWeek.start_date).format('DD/MM')} -{' '}
            {moment(selectedWeek.end_date).format('DD/MM')}
          </h3>
          <p>Chọn ca làm việc cho từng ngày (tối đa 2 ca/ngày, không trùng ca)</p>
        </div>

        {/* Top summary: number of staff and legend (moved from bottom) */}
        <div className="schedule-form-top-summary">
          <div className="schedule-form-top-stats">
            <strong>Số nhân viên:</strong> {selectedUsers.length} người
          </div>

          <div className="schedule-form-top-legend">
            {SHIFTS.map((shift) => (
              <div key={shift.value} className="schedule-form-legend-item">
                <div className="schedule-form-legend-color" style={{ backgroundColor: shift.color }} />
                <span>
                  {shift.icon} {shift.label}: {shift.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preset controls: preset buttons + scope select */}
        <div className="schedule-form-preset-controls">
          <div className="schedule-form-presets">
            <button type="button" className="preset-btn" onClick={() => applyShiftPreset('sang_chieu')}>
              Sáng + Chiều
            </button>
            <button type="button" className="preset-btn" onClick={() => applyShiftPreset('sang_toi')}>
              Sáng + Tối
            </button>
            <button type="button" className="preset-btn" onClick={() => applyShiftPreset('chieu_toi')}>
              Chiều + Tối
            </button>
          </div>

          <div className="schedule-form-preset-scope">
            <label>Phạm vi áp dụng:</label>
            <select value={applyPresetScope} onChange={(e) => setApplyPresetScope(e.target.value)}>
              <option value="selected">Chỉ người đã chọn</option>
              <option value="all">Tất cả nhân sự</option>
              <option value="doctor">Tất cả bác sĩ</option>
              <option value="staff">Tất cả nhân viên</option>
            </select>
          </div>
        </div>

        <div className="schedule-form-week-schedule-table">
          <table>
            <thead>
              <tr>
                <th className="schedule-form-col-user">Nhân viên</th>
                {weekDates.map((day) => (
                  <th key={day.date} className="schedule-form-col-day">
                    <div className="schedule-form-day-header">
                      <span className="schedule-form-day-name">{day.dayName}</span>
                      <span className="schedule-form-day-date">{day.display}</span>
                    </div>
                  </th>
                ))}
                <th className="schedule-form-col-total">Tổng ca</th>
              </tr>
            </thead>
            <tbody>
              {selectedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="schedule-form-col-user">
                    <div className="schedule-form-user-cell">
                      <div className="schedule-form-user-avatar-sm">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} />
                        ) : (
                          user.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="schedule-form-user-info-sm">
                        <div className="schedule-form-user-name-sm">{user.displayName}</div>
                        <div className="schedule-form-user-role-sm">{user.displayRole}</div>
                      </div>
                    </div>
                  </td>
                  {weekDates.map((day) => {
                    const userShifts = weekSchedules[user.id]?.[day.date] || [];
                    return (
                      <td key={day.date} className="schedule-form-col-day">
                        <div className="schedule-form-shift-checkboxes">
                          {SHIFTS.map((shift) => {
                            const isChecked = userShifts.includes(shift.value);
                            const conflictKey = `${user.id}-${day.date}-${shift.value}`;
                            const hasConflict = !!conflicts[conflictKey];

                            return (
                              <label
                                key={shift.value}
                                className={`schedule-form-shift-checkbox ${
                                  isChecked ? 'schedule-form-shift-checked' : ''
                                } ${hasConflict ? 'schedule-form-shift-conflict' : ''}`}
                                title={`${shift.label} (${shift.time})`}
                                style={{
                                  backgroundColor: isChecked ? shift.color : 'transparent',
                                  borderColor: hasConflict
                                    ? '#ef4444'
                                    : isChecked
                                    ? shift.color
                                    : '#d1d5db',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleShiftToggle(user.id, day.date, shift.value)}
                                />
                                <span className="schedule-form-shift-label">{shift.label}</span>
                                {hasConflict && <FaExclamationTriangle className="schedule-form-conflict-icon" />}
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                  <td className="schedule-form-col-total">
                    <div className="schedule-form-total-badge">{getUserShiftCount(user.id)} ca</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {Object.keys(conflicts).length > 0 && (
          <div className="schedule-form-summary-conflict-bottom">
            <FaExclamationTriangle /> Có {Object.keys(conflicts).length} ca bị trùng. Vui lòng kiểm tra.
          </div>
        )}
      </div>
    );
  };

  const renderStep4 = () => {
    const totalShifts = getTotalShifts();

    return (
      <div className="schedule-form-step-content">
        <div className="schedule-form-step-header">
          <h3>
            <FaCheckCircle className="schedule-form-label-icon" />
            Xác nhận tạo lịch
          </h3>
          <p>Kiểm tra thông tin trước khi tạo lịch</p>
        </div>

        <div className="schedule-form-confirmation-summary">
          <div className="schedule-form-summary-section">
            <h4>
              <FaInfoCircle /> Tổng quan
            </h4>
            <div className="schedule-form-summary-grid">
              <div className="schedule-form-summary-row">
                <span className="schedule-form-label">Thời gian:</span>
                <span className="schedule-form-value">
                  {selectedRangeType === 'week' ? (
                    selectedWeek ? (
                      <>
                        Tuần {selectedWeek.week_number}{selectedWeek.year ? `, ${selectedWeek.year}` : ''}
                        <br />
                        <small>
                          ({moment(selectedWeek.start_date).format('DD/MM/YYYY')} -{' '}
                          {moment(selectedWeek.end_date).format('DD/MM/YYYY')})
                        </small>
                      </>
                    ) : (
                      `Đã chọn ${selectedWeeks.length} tuần`
                    )
                  ) : selectedRangeType === 'month' ? (
                    selectedMonths.length > 0 ? selectedMonths.map(m => m.label).join(', ') : 'Chưa chọn tháng'
                  ) : (
                    `Năm ${selectedYear}`
                  )}
                </span>
              </div>
              <div className="schedule-form-summary-row">
                <span className="schedule-form-label">Số nhân sự:</span>
                <span className="schedule-form-value">{selectedUsers.length} người</span>
              </div>
              <div className="schedule-form-summary-row">
                <span className="schedule-form-label">Tổng số ca:</span>
                <span className="schedule-form-value">{totalShifts} ca làm việc</span>
              </div>
            </div>
          </div>

          <div className="schedule-form-summary-section">
            <h4>
              <FaUsers /> Chi tiết nhân sự
            </h4>
            <div className="schedule-form-user-summary-list">
              {selectedUsers.map((user) => {
                const shiftCount = getUserShiftCount(user.id);
                const userSch = weekSchedules[user.id] || {};
                const workDays = Object.entries(userSch)
                  .filter(([, shifts]) => shifts.length > 0)
                  .map(([date]) => moment(date).format('DD/MM'))
                  .join(', ');

                return (
                  <div key={user.id} className="schedule-form-user-summary-card">
                    <div className="schedule-form-user-avatar">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} />
                      ) : (
                        user.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="schedule-form-user-summary-info">
                      <div className="schedule-form-user-name">{user.displayName}</div>
                      <div className="schedule-form-user-stats">
                        <span className="schedule-form-stat-badge">{shiftCount} ca</span>
                        <span className="schedule-form-stat-text">{workDays}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {Object.keys(conflicts).length > 0 && (
            <div className="schedule-form-summary-section schedule-form-conflict-section">
              <h4>
                <FaExclamationTriangle /> Cảnh báo trùng lịch
              </h4>
              <p>Không thể tạo lịch khi có ca bị trùng. Vui lòng quay lại và điều chỉnh.</p>
            </div>
          )}

          {/* Apply to all selected ranges option (weeks / months / year) */}
          {( (selectedRangeType === 'week' && Array.isArray(selectedWeeks) && selectedWeeks.length > 1) ||
            (selectedRangeType === 'month' && Array.isArray(selectedMonths) && selectedMonths.length > 0) ||
            (selectedRangeType === 'year' && selectedYear) ) && (
            <div className="schedule-form-summary-section">
              <label className="schedule-form-apply-all">
                <input
                  type="checkbox"
                  checked={applyToAllSelected}
                  onChange={(e) => setApplyToAllSelected(e.target.checked)}
                />
                <span>Áp dụng cấu hình cho tất cả khoảng đã chọn</span>
              </label>
              <small style={{ display: 'block', marginTop: '6px', color: '#6b7280' }}>
                Khi bật, cấu hình ca hiện tại sẽ được nhân bản sang tất cả tuần tương ứng trong khoảng bạn đã chọn (tuần/tháng/năm).
              </small>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div className="schedule-form-wrapper">
      <div className="schedule-form-header">
        <h2>
          <FaCalendarAlt /> Tạo lịch làm việc cố định
        </h2>
        <button className="schedule-form-btn-close" onClick={onCancel}>
          <FaTimes />
        </button>
      </div>

      <div className="schedule-form-steps">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`schedule-form-step ${currentStep === step ? 'schedule-form-step-active' : ''} ${
              currentStep > step ? 'schedule-form-step-completed' : ''
            }`}
            onClick={() => {
              if (step < currentStep || step === 1) setCurrentStep(step);
            }}
          >
            <div className="schedule-form-step-number">
              {currentStep > step ? <FaCheck /> : step}
            </div>
            <div className="schedule-form-step-info">
              <div className="schedule-form-step-title">
                {step === 1 && 'Chọn thời gian'}
                {step === 2 && 'Chọn nhân sự'}
                {step === 3 && 'Thiết lập lịch'}
                {step === 4 && 'Xác nhận'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="schedule-form-body">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      <div className="schedule-form-footer">
        <button className="schedule-form-btn-cancel" onClick={onCancel} disabled={loading}>
          <FaTimes /> Hủy
        </button>

        {currentStep > 1 && (
          <button
            className="schedule-form-btn-secondary"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={loading}
          >
            <FaChevronLeft /> Quay lại
          </button>
        )}

        {currentStep < 4 ? (
          <button
              className="schedule-form-btn-primary"
              onClick={() => {
                // Validate step 1: accept multi-week or multi-month selection depending on range type
                if (currentStep === 1) {
                  let hasSelection = false;
                  if (selectedRangeType === 'week') {
                    hasSelection = Array.isArray(selectedWeeks) && selectedWeeks.length > 0;
                  } else if (selectedRangeType === 'month') {
                    hasSelection = Array.isArray(selectedMonths) && selectedMonths.length > 0;
                  } else {
                    // year selection — always allowed as long as a year is chosen
                    hasSelection = !!selectedYear;
                  }

                  if (!hasSelection) {
                    alert('Vui lòng chọn ít nhất một khoảng thời gian (tuần/tháng/năm)');
                    return;
                  }

                  // If user selected multiple weeks, set the active selectedWeek to the first one
                  if (selectedRangeType === 'week' && Array.isArray(selectedWeeks) && selectedWeeks.length > 0 && !selectedWeek) {
                    const firstWeek = selectedWeeks[0];
                    // ensure it has start_date/end_date/week_number
                    const normalizedWeek = {
                      ...firstWeek,
                      start_date: firstWeek.start_date || firstWeek.start,
                      end_date: firstWeek.end_date || firstWeek.end,
                      week_number: firstWeek.week_number || (firstWeek.value ? parseInt(firstWeek.value.split('W')[1]) : undefined),
                    };
                    setSelectedWeek(normalizedWeek);
                    // initialize schedule slots for that week
                    initializeWeekSchedules(normalizedWeek);
                  }
                }

                if (currentStep === 2 && selectedUsers.length === 0) {
                  alert('Vui lòng chọn ít nhất 1 nhân viên');
                  return;
                }
                if (currentStep === 3 && getTotalShifts() === 0) {
                  alert('Vui lòng chọn ít nhất 1 ca làm việc');
                  return;
                }
                setCurrentStep(currentStep + 1);
              }}
              disabled={loading}
            >
              Tiếp tục <FaChevronRight />
            </button>
        ) : (
          <button
            className="schedule-form-btn-success"
            onClick={handleSubmit}
            disabled={loading || Object.keys(conflicts).length > 0}
          >
            {loading ? (
              <>
                <FaClock /> Đang tạo...
              </>
            ) : (
              <>
                <FaSave /> Xác nhận tạo lịch
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ScheduleForm;
// client/src/components/schedule/ScheduleApprovalTable.js
// (SỬA) Thêm cột Trạng thái, và ẩn/hiện nút ở cột Hành động

import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaCheck, FaTimes, FaSpinner, FaEye, FaUsers, FaUserMd, FaUserNurse,
  FaArchive, FaExclamationCircle, FaCheckCircle, FaTimesCircle, FaInfoCircle
} from 'react-icons/fa';
import moment from 'moment';
import './ScheduleApprovalTable.css';
// (MỚI) Import CSS của bảng nghỉ phép để dùng chung .badge
import './PendingLeaveTable.css'; 

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// (Modal con ScheduleDetailModal giữ nguyên)
const ScheduleDetailModal = ({ registration, onClose, workShiftConfig }) => {
  const scheduleData = registration.weekly_schedule_json;
  const scheduleType = scheduleData ? 'Linh hoạt' : 'Cố định';

  const splitSlots = React.useMemo(() => {
    if (!workShiftConfig) return [];
    const activeShifts = workShiftConfig.filter(s => s.is_active); 
    return splitShifts(activeShifts);
  }, [workShiftConfig]);

  return (
    <div className="schedule-editor__modal-overlay" onClick={onClose}>
      <div className="schedule-editor__modal-content large" onClick={e => e.stopPropagation()}>
        <h2 className="schedule-editor__title">Chi tiết Đăng ký Lịch</h2>
        <p><strong>Nhân viên:</strong> {registration.user.full_name}</p>
        <p><strong>Loại đăng ký:</strong> {scheduleType}</p>
        
        {scheduleType === 'Linh hoạt' ? (
          <div className="schedule-editor__grid-wrapper">
            <table className="schedule-editor__grid-table disabled">
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
                          disabled={true}
                          checked={(scheduleData[day.key] || []).includes(slot.slot_key)}
                          readOnly
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nhân viên này đăng ký làm việc theo Lịch Cố Định (Full-time).</p>
        )}
        
        <div className="schedule-editor__modal-footer">
          <button type="button" className="schedule-editor__button secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// (Helpers: WEEK_DAYS, timeToMinutes, minutesToTime, splitShifts - giữ nguyên)
const WEEK_DAYS = [
  { key: 'mon', label: 'T2' }, { key: 'tue', label: 'T3' }, { key: 'wed', label: 'T4' },
  { key: 'thu', label: 'T5' }, { key: 'fri', label: 'T6' }, { key: 'sat', label: 'T7' },
  { key: 'sun', label: 'CN' },
];
const timeToMinutes = (time) => {
  if (!time) return 0;
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
  if (!shiftsConfig) return slots;
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

// (Modal con RejectReasonModal - giữ nguyên)
const RejectReasonModal = ({ onSubmit, onCancel, loading }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="schedule-editor__modal-overlay" onClick={onCancel}>
      <div className="schedule-editor__modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="schedule-editor__title">Từ chối Đăng ký</h2>
        <div className="schedule-editor__form-group">
          <label className="schedule-editor__label">Lý do từ chối *</label>
          <textarea
            className="schedule-editor__form-control"
            rows="3"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Vui lòng nhập lý do từ chối..."
          />
        </div>
        <div className="schedule-editor__modal-footer">
          <button type="button" className="schedule-editor__button secondary" onClick={onCancel} disabled={loading}>
            Hủy
          </button>
          <button 
            type="button" 
            className="schedule-editor__button danger" 
            onClick={() => onSubmit(reason)}
            disabled={loading || !reason.trim()}
          >
            {loading ? <FaSpinner className="fa-spin" /> : 'Xác nhận Từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
};

// (MỚI) Helper StatusBadge (vay mượn từ PendingLeaveTable)
const StatusBadge = ({ status }) => {
  let text = 'N/A';
  let icon = <FaInfoCircle />;
  let className = 'secondary';
  switch (status) {
    case 'pending':
      text = 'Chờ duyệt'; icon = <FaExclamationCircle />; className = 'warning'; break;
    case 'approved':
      text = 'Đã duyệt'; icon = <FaCheckCircle />; className = 'success'; break;
    case 'rejected':
      text = 'Từ chối'; icon = <FaTimesCircle />; className = 'danger'; break;
    case 'cancelled':
      text = 'Đã hủy'; icon = <FaArchive />; className = 'secondary'; break;
    default:
      text = status;
  }
  return (
    <span className={`pending-leave-table__badge pending-leave-table__badge--${className}`}>
      {icon} {text}
    </span>
  );
};


// Component Bảng chính
// (SỬA) Bỏ props filter
const ScheduleApprovalTable = ({ 
  registrations, loading, onActionComplete, workShiftConfig
}) => {
  const [loadingId, setLoadingId] = useState(null); 
  const [showDetail, setShowDetail] = useState(null); 
  const [showReject, setShowReject] = useState(null); 

  const handleReview = async (id, action, reason = null) => {
    setLoadingId(id);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      let response;

      if (action === 'approve') {
        response = await axios.put(`${API_URL}/schedules/approve-registration/${id}`, {}, { headers });
        toast.success(response.data.message || 'Đã phê duyệt đăng ký.');
      } else {
        response = await axios.put(`${API_URL}/schedules/reject-registration/${id}`, { reason }, { headers });
        toast.success(response.data.message || 'Đã từ chối đăng ký.');
      }
      
      onActionComplete(); 
      
    } catch (error) {
      console.error(`Error ${action} registration:`, error);
      toast.error(error.response?.data?.message || 'Lỗi khi xử lý');
    } finally {
      setLoadingId(null);
      setShowReject(null);
    }
  };

  if (loading) {
    return <div className="schedule-editor__loading"><FaSpinner className="fa-spin" /> Đang tải...</div>;
  }
  
  if (registrations.length === 0) {
     return (
        <div className="schedule-approval-table__wrapper">
          <div className="schedule-editor__empty-state">Không có đơn đăng ký lịch linh hoạt nào.</div>
        </div>
     );
  }

  return (
    <div className="schedule-approval-table__wrapper">
      <table className="schedule-approval-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Vai trò</th>
            <th>Loại Đăng Ký</th>
            <th>Ngày gửi</th>
            <th>Chi tiết</th>
            {/* (MỚI) Thêm cột Trạng thái */}
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map(reg => {
            const isProcessing = loadingId === reg.id;
            const scheduleType = reg.weekly_schedule_json ? 'Linh hoạt' : 'Cố định';
            
            return (
              <tr key={reg.id}>
                <td>
                  <div className="schedule-approval-table__user">
                    <img src={reg.user.avatar_url || 'https://placehold.co/32x32/EBF4FF/76A9FA?text=U'} alt={reg.user.full_name} />
                    <span>{reg.user.full_name}</span>
                  </div>
                </td>
                <td>{reg.user.role === 'doctor' ? 'Bác sĩ' : 'Nhân viên'}</td>
                <td>
                  <span className={`schedule-approval-table__badge ${scheduleType === 'Linh hoạt' ? 'flexible' : 'fixed'}`}>
                    {scheduleType}
                  </span>
                </td>
                <td>{moment(reg.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                <td>
                  {scheduleType === 'Linh hoạt' ? (
                    <button className="action-btn view" onClick={() => setShowDetail(reg)}>
                      <FaEye /> Xem
                    </button>
                  ) : (
                    'N/A'
                  )}
                </td>
                {/* (MỚI) Thêm cột Trạng thái */}
                <td>
                  <StatusBadge status={reg.status} />
                </td>
                {/* (SỬA) Logic cột Hành động */}
                <td>
                  {reg.status === 'pending' ? (
                    <div className="schedule-approval-table__actions">
                      <button 
                        className="action-btn reject" 
                        onClick={() => setShowReject(reg)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <FaSpinner className="fa-spin" /> : <FaTimes />}
                      </button>
                      <button 
                        className="action-btn approve"
                        onClick={() => handleReview(reg.id, 'approve')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <FaSpinner className="fa-spin" /> : <FaCheck />}
                      </button>
                    </div>
                  ) : (
                     <span className="schedule-approval-table__status status--processed">
                      Đã xử lý
                     </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {showDetail && (
        <ScheduleDetailModal 
            registration={showDetail} 
            onClose={() => setShowDetail(null)} 
            workShiftConfig={workShiftConfig}
        />
        )}
      
      {showReject && (
        <RejectReasonModal
          loading={loadingId === showReject.id}
          onCancel={() => setShowReject(null)}
          onSubmit={(reason) => handleReview(showReject.id, 'reject', reason)}
        />
      )}
    </div>
  );
};

export default ScheduleApprovalTable;
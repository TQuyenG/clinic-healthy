// client/src/components/schedule/OvertimeApprovalTable.js
// (SỬA) Thêm cột Trạng thái, và ẩn/hiện nút ở cột Hành động

import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaCheck, FaTimes, FaSpinner, FaUsers, FaUserMd, FaUserNurse,
  FaArchive, FaExclamationCircle, FaCheckCircle, FaTimesCircle, FaInfoCircle
} from 'react-icons/fa';
import moment from 'moment';
import './OvertimeApprovalTable.css';
// (MỚI) Import CSS của bảng nghỉ phép để dùng chung .badge
import './PendingLeaveTable.css'; 

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// (Modal Từ chối - giữ nguyên)
const RejectReasonModal = ({ onSubmit, onCancel, loading }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="schedule-editor__modal-overlay" onClick={onCancel}>
      <div className="schedule-editor__modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="schedule-editor__title">Từ chối Ca Tăng Ca</h2>
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
const OvertimeApprovalTable = ({ 
  overtimes, loading, onActionComplete
}) => {
  const [loadingId, setLoadingId] = useState(null);
  const [showReject, setShowReject] = useState(null); 

  const handleReview = async (id, action, reason = null) => {
    setLoadingId(id);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`${API_URL}/schedules/review-overtime/${id}`, { action, reason }, { headers });
      
      toast.success(`Đã ${action === 'approve' ? 'phê duyệt' : 'từ chối'} ca tăng ca.`);
      onActionComplete(); // Tải lại
      
    } catch (error) {
      console.error(`Error ${action} overtime:`, error);
      toast.error(error.response?.data?.message || 'Lỗi khi xử lý');
    } finally {
      setLoadingId(null);
      setShowReject(null);
    }
  };

  if (loading) {
    return <div className="schedule-editor__loading"><FaSpinner className="fa-spin" /> Đang tải...</div>;
  }
  
  if (overtimes.length === 0) {
     return (
        <div className="schedule-approval-table__wrapper">
          <div className="schedule-editor__empty-state">Không có yêu cầu tăng ca nào.</div>
        </div>
     );
  }

  return (
    <div className="schedule-approval-table__wrapper">
      <table className="schedule-approval-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Ngày Tăng Ca</th>
            <th>Thời gian</th>
            <th>Lý do</th>
            <th>Ngày gửi</th>
            {/* (MỚI) Thêm cột Trạng thái */}
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {overtimes.map(ot => {
            const isProcessing = loadingId === ot.id;
            
            return (
              <tr key={ot.id}>
                <td>
                  <div className="schedule-approval-table__user">
                    <img src={ot.user.avatar_url || 'https://placehold.co/32x32/EBF4FF/76A9FA?text=U'} alt={ot.user.full_name} />
                    <span>{ot.user.full_name}</span>
                  </div>
                </td>
                <td>{moment(ot.date).format('DD/MM/YYYY')}</td>
                <td>
                  <span className="schedule-approval-table__badge overtime">
                    {ot.start_time.slice(0,5)} - {ot.end_time.slice(0,5)}
                  </span>
                </td>
                <td>{ot.reason}</td>
                <td>{moment(ot.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                {/* (MỚI) Thêm cột Trạng thái */}
                <td>
                  <StatusBadge status={ot.status} />
                </td>
                {/* (SỬA) Logic cột Hành động */}
                <td>
                  {ot.status === 'pending' ? (
                    <div className="schedule-approval-table__actions">
                      <button 
                        className="action-btn reject" 
                        onClick={() => setShowReject(ot)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <FaSpinner className="fa-spin" /> : <FaTimes />}
                      </button>
                      <button 
                        className="action-btn approve"
                        onClick={() => handleReview(ot.id, 'approve')}
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

export default OvertimeApprovalTable;
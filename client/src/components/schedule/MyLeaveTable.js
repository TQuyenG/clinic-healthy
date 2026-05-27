// client/src/components/schedule/MyLeaveTable.js
// Component Bảng mới (thay thế Card) cho MySchedulePage

import React from 'react';
import { 
  FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaArchive, FaInfoCircle, FaTimes, FaSpinner
} from 'react-icons/fa';
import { MdOutlineErrorOutline } from 'react-icons/md';
import './MyLeaveTable.css'; // File CSS mới

// Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const getLeaveTime = (leave) => {
  if (leave.leave_type === 'multiple_days') {
    return `${formatDate(leave.date_from)} - ${formatDate(leave.date_to)}`;
  }
  if (leave.leave_type === 'single_shift') {
    return `${formatDate(leave.date_from)} (Ca: ${leave.shift_name})`;
  }
  if (leave.leave_type === 'time_range') {
    return `${formatDate(leave.date_from)} (Từ ${leave.time_from?.slice(0, 5)} - ${leave.time_to?.slice(0, 5)})`;
  }
  return formatDate(leave.date_from);
};

// Helper cho Status Badge
const StatusBadge = ({ status }) => {
  let text = 'N/A';
  let icon = <FaInfoCircle />;
  let className = 'secondary';

  switch (status) {
    case 'pending':
      text = 'Chờ duyệt';
      icon = <FaExclamationCircle />;
      className = 'warning';
      break;
    case 'approved':
      text = 'Đã duyệt';
      icon = <FaCheckCircle />;
      className = 'success';
      break;
    case 'rejected':
      text = 'Từ chối';
      icon = <FaTimesCircle />;
      className = 'danger';
      break;
    case 'cancelled':
      text = 'Đã hủy';
      icon = <FaArchive />;
      className = 'secondary';
      break;
    default:
      text = status;
  }

  return (
    <span className={`my-leave-table__badge my-leave-table__badge--${className}`}>
      {icon} {text}
    </span>
  );
};


const MyLeaveTable = ({ leaves = [], loading, onRowClick, onCancelClick }) => {

  return (
    <div className="my-leave-table__container">
      <div className="my-leave-table__table-wrapper">
        <table className="my-leave-table__table">
          <thead>
            <tr>
              <th>Thời gian nghỉ</th>
              <th>Lý do</th>
              <th>Ngày gửi</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="my-leave-table__empty-state">
                    <MdOutlineErrorOutline />
                    <span>Không có đơn nào</span>
                  </div>
                </td>
              </tr>
            ) : (
              leaves.map(leave => (
                <tr key={leave.id} onClick={() => onRowClick(leave)} title="Xem chi tiết">
                  <td>{getLeaveTime(leave)}</td>
                  <td className="my-leave-table__reason-cell">
                    {leave.reason}
                  </td>
                  <td>{formatDate(leave.requested_at)}</td>
                  <td className="my-leave-table__status-cell">
                    <StatusBadge status={leave.status} />
                  </td>
                  <td className="my-leave-table__action-cell">
                    {leave.status === 'pending' && (
                      <button
                        className="my-leave-table__action-btn my-leave-table__action-btn--cancel"
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn Hàng click
                          onCancelClick(leave.id);
                        }}
                        disabled={loading}
                      >
                        {loading ? <FaSpinner className="fa-spin" /> : <FaTimes />}
                        Hủy
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyLeaveTable;
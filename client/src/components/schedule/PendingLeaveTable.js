// client/src/components/schedule/PendingLeaveTable.js
// (SỬA) ĐÃ BỎ BỘ LỌC VÀ TÌM KIẾM - CHỈ CÒN LÀ BẢNG HIỂN THỊ

import React from 'react'; // Bỏ useState, useMemo
import { 
  FaUserMd, FaUserNurse, FaSpinner, 
  FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaArchive, FaInfoCircle
  // (SỬA) Bỏ các icon filter
} from 'react-icons/fa';
import { MdOutlineErrorOutline } from 'react-icons/md';
import './PendingLeaveTable.css'; 

// Helpers (Giữ nguyên)
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

// (SỬA) Bỏ props filter
const PendingLeaveTable = ({ 
  leaves = [], 
  loading, 
  onRowClick
}) => {
  
  // (SỬA) Bỏ state 'searchTerm'
  // (SỬA) Bỏ 'filteredLeaves' useMemo

  return (
    <div className="pending-leave-table__container">
      
      {/* (SỬA) Đã xóa toàn bộ JSX của thanh filter và search */}
      
      {/* Bảng */}
      {loading ? (
        <div className="pending-leave-table__loading">
          <FaSpinner className="fa-spin" /> Đang tải dữ liệu...
        </div>
      ) : (
        <div className="pending-leave-table__table-wrapper">
          <table className="pending-leave-table__table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Thời gian nghỉ</th>
                <th>Lý do</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {/* (SỬA) Dùng prop 'leaves' trực tiếp */}
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="pending-leave-table__empty-state">
                      <MdOutlineErrorOutline />
                      {/* (SỬA) Bỏ logic 'searchTerm' */}
                      <span>Không có đơn nào</span>
                    </div>
                  </td>
                </tr>
              ) : (
                // (SỬA) Dùng prop 'leaves' trực tiếp
                leaves.map(leave => (
                  <tr key={leave.id} onClick={() => onRowClick(leave)} title="Xem chi tiết">
                    <td>
                      <div className="pending-leave-table__user-cell">
                        {leave.user_type === 'doctor' 
                          ? <FaUserMd title="Bác sĩ" /> 
                          : <FaUserNurse title="Nhân viên" />}
                        <span>{leave.user?.full_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{getLeaveTime(leave)}</td>
                    <td className="pending-leave-table__reason-cell">
                      {leave.reason}
                    </td>
                    <td>{formatDate(leave.requested_at)}</td>
                    <td className="pending-leave-table__status-cell">
                      <StatusBadge status={leave.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingLeaveTable;
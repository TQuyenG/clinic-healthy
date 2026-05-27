import React from 'react';
import PropTypes from 'prop-types';
import { FaClock, FaCheckCircle, FaSpinner, FaBan } from 'react-icons/fa';

const StatusBadge = ({ status, appointment }) => {
  const s = String(status || '').toLowerCase();

  const map = {
    pending: { text: 'Chờ xác nhận', cls: 'status-pending', icon: <FaClock /> },
    confirmed: { text: 'Đã xác nhận', cls: 'status-confirmed', icon: <FaCheckCircle /> },
    in_progress: { text: 'Đang khám', cls: 'status-in-progress', icon: <FaSpinner className="fa-spin" /> },
    completed: { text: 'Đã hoàn thành', cls: 'status-completed', icon: <FaCheckCircle /> },
    cancelled: { text: 'Đã hủy', cls: 'status-cancelled', icon: <FaBan /> }
  };

  const info = map[s] || map.pending;

  return (
    <div className={`status-badge ${info.cls}`} role="status" aria-label={info.text}>
      {info.icon}
      <span>{info.text}</span>
    </div>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
  appointment: PropTypes.object
};

export default StatusBadge;

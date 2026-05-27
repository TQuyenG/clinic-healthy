// client/src/components/Toast.js
import React, { useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';
import './Toast.css';

/**
 * Toast Component - Thông báo hiển thị ở góc màn hình, tự động tắt sau 3s
 * 
 * @param {string} type - Loại: 'success' (xanh), 'error' (đỏ), 'warning' (cam), 'info' (xanh dương)
 * @param {string} message - Nội dung thông báo
 * @param {boolean} show - Hiển thị hay ẩn
 * @param {function} onClose - Callback khi đóng
 * @param {number} duration - Thời gian hiển thị (ms), default 3000
 */
const Toast = ({ 
  type = 'info', 
  message = '', 
  show = false, 
  onClose = () => {}, 
  duration = 5000 
}) => {
  
  // Tự động đóng sau duration
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  // Icon theo loại thông báo
  const getIcon = () => {
    switch(type) {
      case 'success': return <FaCheckCircle className="toast__icon" />;
      case 'error': return <FaTimesCircle className="toast__icon" />;
      case 'warning': return <FaExclamationTriangle className="toast__icon" />;
      case 'info': return <FaInfoCircle className="toast__icon" />;
      default: return <FaInfoCircle className="toast__icon" />;
    }
  };

  const animationStyle = {
    animation: `slideInRight 0.3s ease, slideOutRight 0.3s ease ${Math.max(duration - 300, 0)}ms forwards`
  };

  return (
    <div className={`toast toast--${type}`} style={animationStyle}>
      {getIcon()}
      <span className="toast__message">{message}</span>
      <button 
        className="toast__close" 
        onClick={onClose}
        aria-label="Đóng"
      >
        <FaTimes />
      </button>
    </div>
  );
};

export default Toast;

// client/src/components/CustomAlert.js
import React, { useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';
import './CustomAlert.css';

/**
 * CustomAlert Component - Popup thông báo thay thế alert() và toast
 * 
 * @param {string} type - Loại thông báo: 'success', 'error', 'warning', 'info'
 * @param {string} title - Tiêu đề thông báo
 * @param {string} message - Nội dung chi tiết
 * @param {boolean} show - Hiển thị hay ẩn alert
 * @param {function} onClose - Callback khi đóng alert
 * @param {number} autoCloseDuration - Thời gian tự động đóng (ms), 0 = không tự động đóng
 */
const CustomAlert = ({ 
  type = 'info', 
  title = '', 
  message = '', 
  show = false, 
  onClose = () => {}, 
  autoCloseDuration = 5000 
}) => {
  
  // Tự động đóng sau autoCloseDuration
  useEffect(() => {
    if (show && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDuration, onClose]);

  if (!show) return null;

  // Icon theo loại thông báo
  const getIcon = () => {
    switch(type) {
      case 'success': return <FaCheckCircle className="custom-alert__icon" />;
      case 'error': return <FaTimesCircle className="custom-alert__icon" />;
      case 'warning': return <FaExclamationTriangle className="custom-alert__icon" />;
      case 'info': return <FaInfoCircle className="custom-alert__icon" />;
      default: return <FaInfoCircle className="custom-alert__icon" />;
    }
  };

  return (
    <div className="custom-alert-overlay" onClick={onClose}>
      <div 
        className={`custom-alert custom-alert--${type}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="custom-alert__close" 
          onClick={onClose}
          aria-label="Đóng"
        >
          <FaTimes />
        </button>
        
        <div className="custom-alert__header">
          {getIcon()}
          <h3 className="custom-alert__title">{title}</h3>
        </div>
        
        {message && (
          <p className="custom-alert__message">{message}</p>
        )}
        
        <div className="custom-alert__actions">
          <button 
            className={`custom-alert__btn custom-alert__btn--${type}`}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;

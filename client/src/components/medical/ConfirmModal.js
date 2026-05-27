// client/src/components/medical/ConfirmModal.js
// COMPONENT MỚI - Modal xác nhận (thay thế window.confirm)

import React from 'react';

// Import CSS
import './ConfirmModal.css';

// Import Icons
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaTimes, 
  FaExclamationTriangle 
} from 'react-icons/fa';

/**
 * Props:
 * - isOpen (boolean): Cờ để mở/đóng modal
 * - onClose (function): Hàm được gọi khi nhấn Hủy hoặc X
 * - onConfirm (function): Hàm được gọi khi nhấn Xác nhận
 * - title (string): Tiêu đề của modal
 * - message (string): Nội dung/câu hỏi xác nhận
 * - isLoading (boolean): (Optional) Trạng thái loading
 */
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isLoading = false }) => {

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    // Không tự động đóng, component cha sẽ quyết định
  };

  const handleClose = () => {
    if (!isLoading && onClose) {
      onClose();
    }
  };

  // Ngăn modal tự đóng khi nhấn vào nội dung
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="confirm-modal-overlay" 
      onClick={handleClose}
    >
      <div 
        className="confirm-modal-content" 
        onClick={handleModalContentClick}
      >
        
        {/* Header */}
        <div className="confirm-modal-header">
          <FaExclamationTriangle className="confirm-modal-header-icon" />
          <h2 className="confirm-modal-title">{title || 'Yêu cầu xác nhận'}</h2>
          <button 
            className="confirm-modal-btn-close" 
            onClick={handleClose}
            aria-label="Đóng"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Body */}
        <div className="confirm-modal-body">
          <p className="confirm-modal-text">
            {message || 'Bạn có chắc chắn muốn thực hiện hành động này?'}
          </p>
        </div>
        
        {/* Footer (Actions) */}
        <div className="confirm-modal-footer">
          <button
            className="confirm-modal-btn-secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            className="confirm-modal-btn-primary" // Nút này có thể đổi thành "btn-danger" nếu cần
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <FaSpinner className="confirm-modal-spin-icon" />
            ) : (
              <FaCheckCircle />
            )}
            Xác nhận
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default ConfirmModal;
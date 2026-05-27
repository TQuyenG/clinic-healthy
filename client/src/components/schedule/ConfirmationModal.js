// client/src/components/schedule/ConfirmationModal.js
// Component chung: Popup xác nhận hành động (Duyệt/Xóa/...)

import React from 'react';
import './ConfirmationModal.css';
import { FaTimes, FaCheck, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="confirmation-modal__overlay" onClick={onClose}>
      <div className="confirmation-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-modal__icon-wrapper">
          <FaExclamationTriangle />
        </div>
        
        <div className="confirmation-modal__header">
          <h2>{title || 'Xác nhận hành động'}</h2>
          <button className="confirmation-modal__btn-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="confirmation-modal__body">
          <p>{message || 'Bạn có chắc chắn muốn thực hiện hành động này?'}</p>
        </div>

        <div className="confirmation-modal__footer">
          <button
            className="confirmation-modal__button confirmation-modal__button--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            className="confirmation-modal__button confirmation-modal__button--confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <FaSpinner className="fa-spin" /> : <FaCheck />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
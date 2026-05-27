// client/src/components/auth/PasswordConfirmModal.js
// COMPONENT MỚI - Modal xác thực mật khẩu (Luồng 3)

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import medicalRecordService from '../../services/medicalRecordService';

// Import CSS
import './PasswordConfirmModal.css';

// Import Icons
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaTimes, 
  FaShieldAlt, 
  FaKey 
} from 'react-icons/fa';

/**
 * Props:
 * - isOpen (boolean): Cờ để mở/đóng modal
 * - onClose (function): Hàm được gọi khi đóng modal (nhấn Hủy hoặc X)
 * - onConfirm (function): Hàm được gọi khi xác thực mật khẩu thành công
 */
const PasswordConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Xử lý khi nhấn nút Xác nhận
  const handleConfirm = async () => {
    if (!password) {
      toast.warn('Vui lòng nhập mật khẩu của bạn');
      return;
    }

    try {
      setLoading(true);
      // Gọi API đã viết ở service (khớp với backend)
      const response = await medicalRecordService.verifyUserPassword(password);

      if (response.data.success) {
        toast.success('Xác thực thành công!');
        onConfirm(); // Gọi hàm onConfirm (để chuyển trang)
        handleClose(); // Tự động đóng modal
      }
    } catch (error) {
      console.error('Password verification error:', error);
      toast.error(error.response?.data?.message || 'Mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đóng modal và reset state
  const handleClose = () => {
    setPassword('');
    setLoading(false);
    onClose(); // Gọi hàm onClose (do component cha truyền vào)
  };

  // Ngăn modal tự đóng khi nhấn vào nội dung
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };

  // Xử lý nhấn Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleConfirm();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="password-confirm-modal-overlay" 
      onClick={handleClose}
    >
      <div 
        className="password-confirm-modal-content" 
        onClick={handleModalContentClick}
      >
        
        {/* Header */}
        <div className="password-confirm-modal-header">
          <FaShieldAlt className="password-confirm-modal-header-icon" />
          <h2 className="password-confirm-modal-title">Yêu cầu xác thực</h2>
          <button 
            className="password-confirm-modal-btn-close" 
            onClick={handleClose}
            aria-label="Đóng"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Body */}
        <div className="password-confirm-modal-body">
          <p className="password-confirm-modal-text">
            Để bảo mật, vui lòng nhập mật khẩu tài khoản của bạn để xem hồ sơ y tế.
          </p>
          <div className="password-confirm-modal-form-group">
            <label 
              htmlFor="password_confirm_input" 
              className="password-confirm-modal-label"
            >
              Mật khẩu
            </label>
            <div className="password-confirm-modal-input-wrapper">
              <FaKey className="password-confirm-modal-input-icon" />
              <input
                id="password_confirm_input"
                type="password"
                className="password-confirm-modal-input"
                placeholder="Nhập mật khẩu của bạn..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
          </div>
        </div>
        
        {/* Footer (Actions) */}
        <div className="password-confirm-modal-footer">
          <button
            className="password-confirm-modal-btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            className="password-confirm-modal-btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className="password-confirm-modal-spin-icon" />
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

export default PasswordConfirmModal;
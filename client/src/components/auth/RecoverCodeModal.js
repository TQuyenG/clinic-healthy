// client/src/components/auth/RecoverCodeModal.js
// COMPONENT MỚI - Modal khôi phục mã lịch hẹn (Quên mã)

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import appointmentService from '../../services/appointmentService';

// Import CSS
import './RecoverCodeModal.css';

// Import Icons
import { 
  FaSpinner, 
  FaCheckCircle, 
  FaTimes, 
  FaPaperPlane,
  FaCalendarAlt,
  FaEnvelope
} from 'react-icons/fa';

/**
 * Props:
 * - isOpen (boolean): Cờ để mở/đóng modal
 * - onClose (function): Hàm được gọi khi đóng modal (nhấn Hủy hoặc X)
 */
const RecoverCodeModal = ({ isOpen, onClose }) => {
  const [contact, setContact] = useState(''); // Có thể là email hoặc SĐT
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' }); // 'success' hoặc 'error'

  // Xử lý khi nhấn nút Gửi yêu cầu
  const handleSubmit = async () => {
    if (!contact || !date) {
      setMessage({ type: 'error', text: 'Vui lòng nhập Email/SĐT và Ngày khám.' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      // 1. Gọi API service chúng ta đã tạo
      const response = await appointmentService.recoverAppointmentCodes(contact, date);

      if (response.data.success) {
        // 2. Luôn hiển thị thông báo thành công (vì lý do bảo mật)
        setMessage({ type: 'success', text: response.data.message });
        // Không tự động đóng modal, để người dùng đọc thông báo
      }
    } catch (error) {
      console.error('Recover code error:', error);
      // Hiển thị thông báo chung (backend đã bảo mật)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Đã xảy ra lỗi, vui lòng thử lại.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đóng modal và reset state
  const handleClose = () => {
    setContact('');
    setDate('');
    setLoading(false);
    setMessage({ type: '', text: '' });
    onClose(); // Gọi hàm onClose (do component cha truyền vào)
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
      className="recover-code-modal-overlay" 
      onClick={handleClose}
    >
      <div 
        className="recover-code-modal-content" 
        onClick={handleModalContentClick}
      >
        
        {/* Header */}
        <div className="recover-code-modal-header">
          <h2 className="recover-code-modal-title">Quên Mã Lịch Hẹn?</h2>
          <button 
            className="recover-code-modal-btn-close" 
            onClick={handleClose}
            aria-label="Đóng"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Body */}
        <div className="recover-code-modal-body">
          <p className="recover-code-modal-text">
            Nhập Email hoặc SĐT bạn đã dùng để đặt lịch, cùng với ngày khám. Chúng tôi sẽ gửi lại mã lịch hẹn cho bạn.
          </p>
          
          {/* Form */}
          <div className="recover-code-modal-form-group">
            <label htmlFor="recover_contact_input">Email hoặc Số điện thoại *</label>
            <div className="recover-code-modal-input-wrapper">
              <FaEnvelope className="recover-code-modal-input-icon" />
              <input
                id="recover_contact_input"
                type="text"
                className="recover-code-modal-input"
                placeholder="Nhập email hoặc SĐT..."
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="recover-code-modal-form-group">
            <label htmlFor="recover_date_input">Ngày khám *</label>
            <div className="recover-code-modal-input-wrapper">
              <FaCalendarAlt className="recover-code-modal-input-icon" />
              <input
                id="recover_date_input"
                type="date"
                className="recover-code-modal-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Thông báo Success/Error */}
          {message.text && (
            <div className={`recover-code-modal-message ${message.type === 'error' ? 'error' : 'success'}`}>
              {message.text}
            </div>
          )}
          
        </div>
        
        {/* Footer (Actions) */}
        <div className="recover-code-modal-footer">
          <button
            className="recover-code-modal-btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            className="recover-code-modal-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className="recover-code-modal-spin-icon" />
            ) : (
              <FaPaperPlane />
            )}
            Gửi yêu cầu
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default RecoverCodeModal;
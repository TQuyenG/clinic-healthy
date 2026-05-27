// client/src/pages/LookupResultPage.js
// PHIÊN BẢN CẬP NHẬT: Thêm Modal "Quên mã lịch hẹn"

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import medicalRecordService from '../services/medicalRecordService';
import RecoverCodeModal from '../components/auth/RecoverCodeModal'; // BỔ SUNG

// Import CSS
import './LookupResultPage.css';

// Import Icons
import {
  FaSearch,
  FaSpinner,
  FaKey,
  FaHashtag,
  FaPaperPlane,
  FaExclamationTriangle,
  FaFileMedicalAlt,
  FaQuestionCircle // BỔ SUNG
} from 'react-icons/fa';

const LookupResultPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    appointment_code: '',
    lookup_code: ''
  });
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  
  // BỔ SUNG: State cho modal khôi phục
  const [showRecoverModal, setShowRecoverModal] = useState(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) {
      setError('');
    }
  };

  // Xử lý tra cứu (Giữ nguyên)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appointment_code || !formData.lookup_code) {
      setError('Vui lòng nhập cả Mã lịch hẹn và Mã tra cứu.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await medicalRecordService.lookupMedicalRecord(
        formData.appointment_code.trim(),
        formData.lookup_code.trim()
      );

      if (response.data.success) {
        toast.success('Tra cứu thành công! Đang tải kết quả...');
        const recordId = response.data.data.id;
        
        navigate(`/ket-qua-kham/${recordId}`);
      }
    } catch (error) {
      console.error('Lookup error:', error);
      const errorMsg = error.response?.data?.message || 'Lỗi máy chủ. Vui lòng thử lại.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi lại mã tra cứu (Giữ nguyên)
  const handleResendCode = async () => {
    if (!formData.appointment_code) {
      setError('Vui lòng nhập Mã lịch hẹn để gửi lại mã tra cứu.');
      return;
    }

    try {
      setResendLoading(true);
      setError('');
      
      const response = await medicalRecordService.resendLookupCode(
        formData.appointment_code.trim()
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error('Resend code error:', error);
      const errorMsg = error.response?.data?.message || 'Lỗi khi gửi lại mã.';
      setError(errorMsg);
    } finally {
      setResendLoading(false);
    }
  };
  
  // BỔ SUNG: Handlers cho modal khôi phục
  const handleOpenRecoverModal = () => {
    setShowRecoverModal(true);
  };
  
  const handleCloseRecoverModal = () => {
    setShowRecoverModal(false);
  };

  return (
    <>
      <div className="lookup-result-page-container">
        <div className="lookup-result-page-wrapper">
          
          <FaFileMedicalAlt className="lookup-result-page-main-icon" />
          
          <h1 className="lookup-result-page-title">Tra Cứu Kết Quả Khám Bệnh</h1>
          <p className="lookup-result-page-subtitle">
            Vui lòng nhập Mã lịch hẹn và Mã tra cứu (đã được gửi đến email của bạn) để xem kết quả.
          </p>

          <form className="lookup-result-page-form" onSubmit={handleSubmit}>
            
            {/* Mã lịch hẹn */}
            <div className="lookup-result-page-form-group">
              <label htmlFor="appointment_code">Mã lịch hẹn (VD: AP-1234)</label>
              <div className="lookup-result-page-input-wrapper">
                <FaHashtag className="lookup-result-page-input-icon" />
                <input
                  type="text"
                  id="appointment_code"
                  name="appointment_code"
                  className="lookup-result-page-input"
                  placeholder="Nhập mã lịch hẹn..."
                  value={formData.appointment_code}
                  onChange={handleFormChange}
                  autoFocus
                />
              </div>
            </div>
            
            {/* Mã tra cứu */}
            <div className="lookup-result-page-form-group">
              <label htmlFor="lookup_code">Mã tra cứu (Bảo mật)</label>
              <div className="lookup-result-page-input-wrapper">
                <FaKey className="lookup-result-page-input-icon" />
                <input
                  type="text"
                  id="lookup_code"
                  name="lookup_code"
                  className="lookup-result-page-input"
                  placeholder="Nhập mã tra cứu 10 ký tự..."
                  value={formData.lookup_code}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            
            {/* Thông báo lỗi */}
            {error && (
              <div className="lookup-result-page-error-box">
                <FaExclamationTriangle />
                <span>{error}</span>
              </div>
            )}

            {/* Nút Tra cứu */}
            <button
              type="submit"
              className="lookup-result-page-btn-primary"
              disabled={loading || resendLoading}
            >
              {loading ? (
                <FaSpinner className="lookup-result-page-spin-icon" />
              ) : (
                <FaSearch />
              )}
              Tra cứu kết quả
            </button>
            
            {/* Nút Gửi lại mã & Quên mã */}
            <div className="lookup-result-page-resend-wrapper">
              <span>Quên mã tra cứu?</span>
              <button
                type="button"
                className="lookup-result-page-btn-resend"
                onClick={handleResendCode}
                disabled={loading || resendLoading || !formData.appointment_code}
              >
                {resendLoading ? (
                  <FaSpinner className="lookup-result-page-spin-icon" />
                ) : (
                  <FaPaperPlane />
                )}
                Gửi lại mã tra cứu
              </button>
            </div>
            
            {/* BỔ SUNG: Nút Quên Mã Lịch Hẹn */}
            <div className="lookup-result-page-recover-wrapper">
              <button
                type="button"
                className="lookup-result-page-btn-recover"
                onClick={handleOpenRecoverModal}
              >
                <FaQuestionCircle />
                Quên mã lịch hẹn?
              </button>
            </div>
            
          </form>
        </div>
      </div>
      
      {/* BỔ SUNG: Render Modal Khôi phục */}
      <RecoverCodeModal
        isOpen={showRecoverModal}
        onClose={handleCloseRecoverModal}
      />
    </>
  );
};

export default LookupResultPage;
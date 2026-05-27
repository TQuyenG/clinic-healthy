// client/src/components/consultation/ConsultationList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import consultationService from '../../services/consultationService';
import { 
  FaComments, 
  FaVideo, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle,
  FaExclamationCircle,
  FaSpinner,
  FaStar,
  FaEye,
  FaCalendarAlt
} from 'react-icons/fa';
import './ConsultationList.css';

const ConsultationList = ({ type = 'patient', filters = {} }) => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchConsultations();
  }, [type, filters, currentPage]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 10,
        ...filters
      };

      let response;
      if (type === 'patient') {
        response = await consultationService.getMyConsultations(params);
      } else if (type === 'doctor') {
        response = await consultationService.getDoctorConsultations(params);
      }

      if (response.data.success) {
        setConsultations(response.data.data.consultations || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching consultations:', err);
      setError('Không thể tải danh sách tư vấn');
    } finally {
      setLoading(false);
    }
  };

  // Accept either status string or full consultation object
  const getStatusBadge = (sOrObj) => {
    const status = (sOrObj && typeof sOrObj === 'object') ? sOrObj.status : sOrObj;
    const statusConfig = consultationService.formatStatus(status);
    return (
      <span className={`status-badge status-${statusConfig.color}`}>
        <span className="status-icon">{statusConfig.icon}</span>
        {statusConfig.text}
      </span>
    );
  };

  const getConsultationTypeIcon = (consultationType) => {
    const typeConfig = consultationService.formatConsultationType(consultationType);
    return (
      <span className={`type-badge type-${typeConfig.color}`}>
        <span className="type-icon">{typeConfig.icon}</span>
        {typeConfig.text}
      </span>
    );
  };

  const handleViewDetail = (consultationId) => {
    navigate(`/tu-van/${consultationId}`);
  };

  const handleStartConsultation = async (consultationId, consultationType) => { // <-- Thêm consultationType
    try {
      await consultationService.startConsultation(consultationId);
      
      // SỬA LỖI: Điều hướng động
      if (consultationType === 'video') {
        navigate(`/tu-van/video/${consultationId}`);
      } else {
        navigate(`/tu-van/${consultationId}/chat`);
      }
      
    } catch (error) {
      console.error('Error starting consultation:', error);
      alert('Không thể bắt đầu tư vấn. Vui lòng thử lại.');
    }
  };

  const handleCancelConsultation = async (consultationId) => {
    if (!window.confirm('Bạn có chắc muốn hủy buổi tư vấn này?')) {
      return;
    }

    try {
      const reason = prompt('Vui lòng nhập lý do hủy:');
      if (!reason) return;

      await consultationService.cancelConsultation(consultationId, { cancel_reason: reason });
      alert('Đã hủy buổi tư vấn thành công');
      fetchConsultations();
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      alert('Không thể hủy tư vấn. Vui lòng thử lại.');
    }
  };

  if (loading && consultations.length === 0) {
    return (
      <div className="consultation-list-loading">
        <FaSpinner className="spinner" />
        <p>Đang tải danh sách tư vấn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="consultation-list-error">
        <FaExclamationCircle className="error-icon" />
        <p>{error}</p>
        <button onClick={fetchConsultations} className="btn-retry">
          Thử lại
        </button>
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <div className="consultation-list-empty">
        <FaCalendarAlt className="empty-icon" />
        <h3>Chưa có buổi tư vấn nào</h3>
        <p>Bạn chưa có lịch sử tư vấn. Hãy đặt lịch với bác sĩ ngay!</p>
        <button 
          onClick={() => navigate('/dich-vu?tab=consultation')} 
          className="btn-book-now"
        >
          Đặt lịch tư vấn
        </button>
      </div>
    );
  }

  return (
    <div className="consultation-list-container">
      <div className="consultations-grid">
        {consultations.map((consultation) => (
          <div key={consultation.id} className="consultation-card">
            <div className="consultation-header">
              <div className="consultation-type">
                {getConsultationTypeIcon(consultation.consultation_type)}
              </div>
              <div className="consultation-status">
                {getStatusBadge(consultation.status)}
              </div>
            </div>

            <div className="consultation-body">
              <div className="consultation-info">
                <h4 className="consultation-title">
                  {type === 'patient' 
                    ? `BS. ${consultation.Doctor?.User?.full_name || 'N/A'}`
                    : consultation.Patient?.User?.full_name || 'Bệnh nhân'}
                </h4>
                
                <div className="consultation-meta">
                  <div className="meta-item">
                    <FaClock />
                    <span>{consultationService.formatDateTime(consultation.appointment_time)}</span>
                  </div>
                  
                  {consultation.Doctor?.Specialty && (
                    <div className="meta-item">
                      <span className="specialty-tag">
                        {consultation.Doctor.Specialty.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="consultation-complaint">
                  <p>{consultation.chief_complaint?.substring(0, 100)}...</p>
                </div>
              </div>

              {consultation.Doctor?.avg_rating && (
                <div className="consultation-rating">
                  <FaStar className="rating-star" />
                  <span>{consultation.Doctor.avg_rating}</span>
                </div>
              )}
            </div>

            <div className="consultation-footer">
              <button 
                className="btn-view-detail"
                onClick={() => handleViewDetail(consultation.id)}
              >
                <FaEye /> Xem chi tiết
              </button>

              {consultation.status === 'confirmed' && 
               consultationService.canStartConsultation(consultation.appointment_time) && (
                <button 
                  className="btn-start"
                  onClick={() => handleStartConsultation(consultation.id, consultation.consultation_type)} // <-- Sửa ở đây
                >
                  {/* SỬA LỖI: Icon và Text động */}
                  {consultation.consultation_type === 'video' ? <FaVideo /> : <FaComments />}
                  Bắt đầu
                </button>
              )}

              {consultationService.canCancel(consultation.status) && (
                <button 
                  className="btn-cancel"
                  onClick={() => handleCancelConsultation(consultation.id)}
                >
                  <FaTimesCircle /> Hủy
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination-container">
          <button 
            className="btn-pagination"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Trước
          </button>
          
          <span className="pagination-info">
            Trang {currentPage} / {totalPages}
          </span>
          
          <button 
            className="btn-pagination"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default ConsultationList;
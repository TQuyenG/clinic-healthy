// client/src/components/consultation/RatingConsultationManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import consultationService from '../../services/consultationService';
import { FaStar, FaUserCircle, FaUserMd, FaFilter, FaToggleOn, FaToggleOff, FaExclamationTriangle } from 'react-icons/fa';
import './RatingConsultationManagement.css'; // File CSS mới

// Component render sao
const StarRating = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <FaStar 
        key={i} 
        className={i <= rating ? 'consultation-feedback-management-star-filled' : 'consultation-feedback-management-star-empty'} 
      />
    );
  }
  return <div className="consultation-feedback-management-star-rating">{stars}</div>;
};

export const RatingConsultationManagement = ({ initialType }) => { 
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    rating: 'all',
    status: 'all',
    type: initialType || 'chat', // <-- THÊM DÒNG NÀY
  });

  // Giữ nguyên logic hook (không thay đổi)
  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { ...filters, page: 1, limit: 100 };
      const response = await consultationService.getAllFeedbacks(params);
      if (response.data.success) {
        setFeedbacks(response.data.data.feedbacks);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      setError(err.response?.data?.message || 'Lỗi khi tải đánh giá');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // THÊM MỚI: Tự động cập nhật filter 'type' khi prop từ URL thay đổi
  useEffect(() => {
    if (initialType) {
      setFilters(prev => ({ ...prev, type: initialType }));
    }
  }, [initialType]);

  // Giữ nguyên logic hook (không thay đổi)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Giữ nguyên logic hook (không thay đổi)
  const handleToggleStatus = async (feedbackId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'approved' ? 'hidden' : 'approved';
      await consultationService.toggleFeedbackStatus(feedbackId, { status: newStatus });
      // Tải lại dữ liệu
      fetchFeedbacks(); 
    } catch (err) {
      console.error('Error toggling feedback status:', err);
      alert('Lỗi khi cập nhật trạng thái');
    }
  };

  // JSX được viết lại hoàn toàn
  return (
    <div className="consultation-feedback-management-container">
      
      {/* Header */}
      <h2 className="consultation-feedback-management-title">
        <FaStar /> Quản lý Đánh giá
      </h2>

      {/* Filters */}
      <div className="consultation-feedback-management-filters">
        <div className="consultation-feedback-management-filter-group">
          <label htmlFor="rating-filter"><FaFilter /> Lọc theo sao:</label>
          <select 
            id="rating-filter"
            name="rating" 
            value={filters.rating} 
            onChange={handleFilterChange}
            className="consultation-feedback-management-select"
          >
            <option value="all">Tất cả</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loading && (
        <div className="consultation-feedback-management-message-box">
          <div className="consultation-feedback-management-spinner"></div>
          Đang tải đánh giá...
        </div>
      )}

      {error && (
        <div className="consultation-feedback-management-message-box error">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {!loading && !error && feedbacks.length === 0 && (
        <div className="consultation-feedback-management-message-box">
          <FaExclamationTriangle /> Không tìm thấy đánh giá nào.
        </div>
      )}

      {!loading && !error && feedbacks.length > 0 && (
        <div className="consultation-feedback-management-grid">
          {feedbacks.map(fb => (
            <div key={fb.id} className="consultation-feedback-management-card">
              
              <div className="consultation-feedback-management-card-header">
                <StarRating rating={fb.rating} />
              </div>
              
              <p className="consultation-feedback-management-review-text">
                {fb.review || '(Không có nhận xét)'}
              </p>
              
              <div className="consultation-feedback-management-meta">
                <div className="consultation-feedback-management-user-info">
                  <FaUserCircle />
                  <span>{fb.patient?.full_name || 'Bệnh nhân ẩn'}</span>
                </div>
                <div className="consultation-feedback-management-user-info">
                  <FaUserMd />
                  <span>BS. {fb.doctor?.full_name || 'Bác sĩ ẩn'}</span>
                </div>
              </div>

              <div className="consultation-feedback-management-card-footer">
                <span className="consultation-feedback-management-timestamp">
                  Ngày: {new Date(fb.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RatingConsultationManagement;
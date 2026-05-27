// client/src/components/consultation/ReviewModal.js
import React, { useState, useEffect } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import './ReviewModal.css'; // File CSS sẽ được tạo ở bước 2

/**
 * Props:
 * - show: (boolean) Hiển thị modal
 * - onClose: (function) Hàm đóng modal
 * - onSubmit: (function) Hàm gửi đánh giá, trả về { rating, review }
 * - mode: ('submit' | 'view') Chế độ modal
 * - consultation: (object) Dữ liệu của buổi tư vấn (dùng cho chế độ 'view')
 */
const ReviewModal = ({ show, onClose, onSubmit, mode = 'submit', consultation = null }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const isViewMode = mode === 'view';

  // Khi modal mở, nếu là chế độ "view", hãy cập nhật state
  useEffect(() => {
    if (isViewMode && consultation) {
      setRating(consultation.rating || 0);
      setReview(consultation.review || '');
    } else {
      // Reset khi mở ở chế độ "submit"
      setRating(0);
      setReview('');
    }
  }, [show, isViewMode, consultation]);

  if (!show) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Vui lòng chọn số sao đánh giá (từ 1 đến 5)');
      return;
    }
    onSubmit({ rating, review });
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          
          <div className="review-modal-header">
            <h3 className="review-modal-title">
              {isViewMode ? 'Đánh giá của bạn' : 'Gửi đánh giá buổi tư vấn'}
            </h3>
            <button 
              type="button" 
              className="review-modal-btn-close-icon" 
              onClick={onClose}
            >
              &times;
            </button>
          </div>
          
          <div className="review-modal-body">
            <div className="review-modal-stars-section">
              <label className="review-modal-label">
                {isViewMode ? 'Xếp hạng của bạn:' : 'Bạn cảm thấy hài lòng?'}
              </label>
              <div className="review-modal-stars-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`review-modal-star-wrapper ${!isViewMode ? 'interactive' : ''}`}
                    onMouseEnter={() => !isViewMode && setHoverRating(star)}
                    onMouseLeave={() => !isViewMode && setHoverRating(0)}
                    onClick={() => !isViewMode && setRating(star)}
                  >
                    {star <= (hoverRating || rating) ? (
                      <FaStar size={28} /> // Thu nhỏ sao
                    ) : (
                      <FaRegStar size={28} /> // Thu nhỏ sao
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="review-modal-textarea-section">
              <label className="review-modal-label" htmlFor="reviewText">
                {isViewMode ? 'Nhận xét đã gửi:' : 'Nhận xét của bạn:'}
              </label>
              <textarea
                id="reviewText"
                rows="4" // Thu nhỏ
                placeholder={isViewMode ? '(Không có nhận xét)' : 'Buổi tư vấn rất hữu ích, bác sĩ tận tình...'}
                value={review}
                onChange={(e) => !isViewMode && setReview(e.target.value)}
                readOnly={isViewMode} // Chỉ đọc ở chế độ 'view'
                className="review-modal-textarea"
              />
            </div>
          </div>

          <div className="review-modal-footer">
            {isViewMode ? (
              <button 
                type="button" 
                className="review-modal-btn-primary"
                onClick={onClose}
              >
                Đóng
              </button>
            ) : (
              <>
                <button 
                  type="button" 
                  className="review-modal-btn-secondary"
                  onClick={onClose}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="review-modal-btn-primary"
                  disabled={rating === 0}
                >
                  Gửi đánh giá
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
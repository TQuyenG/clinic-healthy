// ===== [BƯỚC 3.2] APPOINTMENT FEEDBACK MANAGEMENT (Admin Panel) (2024-05-09) =====
// client/src/components/appointments/RatingManagement.js
//
// Purpose: Admin/Staff dashboard to view, filter, approve, and hide appointment feedbacks
// Used in: ConsultationRealtimeManagementPage (Đánh giá tab)
//
// Features:
// - List all appointment feedbacks with pagination
// - Filter by: doctor, rating (1-5), status (pending/approved/hidden)
// - View patient info, appointment details
// - Approve or hide feedback
// - Add admin notes
//
// AC (Access Control):
// - Admin: can manage all feedbacks
// - Staff: can only manage feedbacks of doctors they manage
// - Read-only for patients

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  FaStar, FaRegStar, FaCheck, FaEye, FaEyeSlash, FaSpinner,
  FaFilter, FaChevronLeft, FaChevronRight, FaEdit, FaSave, FaInbox
} from 'react-icons/fa';
import './RatingManagement.css';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const AppointmentFeedbackManagement = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState({});

  // Filters
  const [filters, setFilters] = useState({
    doctor_id: '',
    rating: '',
    status: 'all',
    page: 1,
    limit: 10
  });

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 10
  });

  // Edit mode
  const [editingId, setEditingId] = useState(null);
  const [editingNote, setEditingNote] = useState('');

  // Load feedbacks
  useEffect(() => {
    loadFeedbacks();
  }, [filters]);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.doctor_id) params.append('doctor_id', filters.doctor_id);
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.status !== 'all') params.append('status', filters.status);
      params.append('service_type', 'appointment');
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(
        `${API_URL}/appointments/admin/feedbacks?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setFeedbacks(response.data.data.feedbacks || []);
        setPagination(response.data.data.pagination || {});
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      toast.error('Lỗi khi tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1  // Reset to first page when filter changes
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleToggleStatus = async (feedbackId, currentStatus, adminNote = '') => {
    const newStatus = currentStatus === 'pending' ? 'approved' : 
                     currentStatus === 'approved' ? 'hidden' : 'approved';

    try {
      setSubmitting(prev => ({ ...prev, [feedbackId]: true }));

      const response = await axios.put(
        `${API_URL}/appointments/admin/feedbacks/${feedbackId}/toggle-status`,
        {
          status: newStatus,
          admin_note: adminNote
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        toast.success(`Feedback được ${newStatus === 'approved' ? 'phê duyệt' : 'ẩn'} thành công`);
        setEditingId(null);
        await loadFeedbacks();
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setSubmitting(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  const renderStars = (rating) => {
    return (
      <span className="appointment-feedback-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star}>
            {star <= rating ? (
              <FaStar size={14} color="#FFD700" />
            ) : (
              <FaRegStar size={14} color="#DDD" />
            )}
          </span>
        ))}
      </span>
    );
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'appointment-feedback-status-pending';
      case 'approved':
        return 'appointment-feedback-status-approved';
      case 'hidden':
        return 'appointment-feedback-status-hidden';
      default:
        return '';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Chờ duyệt';
      case 'approved':
        return 'Đã phê duyệt';
      case 'hidden':
        return 'Ẩn';
      default:
        return status;
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return (
      <div className="appointment-feedback-no-access">
        <p>Bạn không có quyền truy cập trang này</p>
      </div>
    );
  }

  return (
    <div className="appointment-feedback-management">
      {/* ===== HEADER ===== */}
      <div className="appointment-feedback-header">
        <h2><FaInbox style={{ marginRight: 8 }} /> Quản lý Đánh giá Lịch hẹn</h2>
        <p className="appointment-feedback-subtitle">
          Duyệt và quản lý đánh giá từ bệnh nhân về lịch hẹn phòng khám
        </p>
      </div>

      {/* ===== FILTERS ===== */}
      <div className="appointment-feedback-filters">
        <FaFilter className="appointment-feedback-filter-icon" />
        
        <div className="appointment-feedback-filter-group">
          <label>Xếp hạng:</label>
          <select 
            value={filters.rating}
            onChange={(e) => handleFilterChange('rating', e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
        </div>

        <div className="appointment-feedback-filter-group">
          <label>Trạng thái:</label>
          <select 
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="hidden">Ẩn</option>
          </select>
        </div>

        <div className="appointment-feedback-filter-group">
          <label>Kích thước trang:</label>
          <select 
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', e.target.value)}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* ===== LOADING ===== */}
      {loading && (
        <div className="appointment-feedback-loading">
          <FaSpinner className="appointment-feedback-spinner" />
          <p>Đang tải danh sách...</p>
        </div>
      )}

      {/* ===== FEEDBACK LIST ===== */}
      {!loading && feedbacks.length > 0 && (
        <div className="appointment-feedback-list">
          {feedbacks.map((feedback) => (
            <div key={feedback.id} className="appointment-feedback-card">
              
              {/* Card Header */}
              <div className="appointment-feedback-card-header">
                <div className="appointment-feedback-card-patient">
                  <h4>{feedback.patient?.full_name || 'N/A'}</h4>
                  <span className="appointment-feedback-date">
                    {new Date(feedback.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <span className={`appointment-feedback-status ${getStatusBadgeClass(feedback.status)}`}>
                  {getStatusLabel(feedback.status)}
                </span>
              </div>

              {/* Card Body */}
              <div className="appointment-feedback-card-body">
                
                {/* Appointment Info */}
                <div className="appointment-feedback-info">
                  <div className="appointment-feedback-info-col">
                    <span className="appointment-feedback-info-label">Mã lịch hẹn:</span>
                    <span className="appointment-feedback-info-value">
                      {feedback.appointment?.code || 'N/A'}
                    </span>
                  </div>
                  <div className="appointment-feedback-info-col">
                    <span className="appointment-feedback-info-label">Bác sĩ:</span>
                    <span className="appointment-feedback-info-value">
                      {feedback.doctor?.full_name || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="appointment-feedback-rating-section">
                  <span className="appointment-feedback-info-label">Xếp hạng:</span>
                  <div className="appointment-feedback-rating">
                    {renderStars(feedback.rating)}
                    <span className="appointment-feedback-rating-value">
                      ({feedback.rating}/5)
                    </span>
                  </div>
                </div>

                {/* Review */}
                <div className="appointment-feedback-review">
                  <p className="appointment-feedback-review-text">
                    {feedback.review || '(Không có nhận xét)'}
                  </p>
                </div>

                {/* Admin Note */}
                {editingId === feedback.id ? (
                  <div className="appointment-feedback-admin-note-edit">
                    <textarea
                      value={editingNote}
                      onChange={(e) => setEditingNote(e.target.value)}
                      placeholder="Ghi chú của admin..."
                      maxLength={500}
                    />
                    <div className="appointment-feedback-char-count">
                      {editingNote.length}/500
                    </div>
                  </div>
                ) : (
                  <div className="appointment-feedback-admin-note">
                    <strong>Ghi chú admin:</strong>
                    <p>{feedback.admin_note || '(Chưa có ghi chú)'}</p>
                  </div>
                )}

              </div>

              {/* Card Footer */}
              <div className="appointment-feedback-card-footer">
                {editingId === feedback.id ? (
                  <>
                    <button
                      className="appointment-feedback-btn appointment-feedback-btn-cancel"
                      onClick={() => {
                        setEditingId(null);
                        setEditingNote('');
                      }}
                      disabled={submitting[feedback.id]}
                    >
                      Hủy
                    </button>
                    <button
                      className="appointment-feedback-btn appointment-feedback-btn-save"
                      onClick={() => handleToggleStatus(feedback.id, feedback.status, editingNote)}
                      disabled={submitting[feedback.id]}
                    >
                      {submitting[feedback.id] ? (
                        <>
                          <FaSpinner className="appointment-feedback-spinner-small" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <FaSave /> Lưu
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {feedback.status === 'pending' && (
                      <>
                        <button
                          className="appointment-feedback-btn appointment-feedback-btn-edit"
                          onClick={() => {
                            setEditingId(feedback.id);
                            setEditingNote(feedback.admin_note || '');
                          }}
                        >
                          <FaEdit /> Thêm ghi chú & Duyệt
                        </button>
                        <button
                          className="appointment-feedback-btn appointment-feedback-btn-hide"
                          onClick={() => handleToggleStatus(feedback.id, 'pending')}
                          disabled={submitting[feedback.id]}
                        >
                          {submitting[feedback.id] ? (
                            <>
                              <FaSpinner className="appointment-feedback-spinner-small" />
                              Đang ẩn...
                            </>
                          ) : (
                            <>
                              <FaEyeSlash /> Ẩn
                            </>
                          )}
                        </button>
                      </>
                    )}
                    {feedback.status === 'approved' && (
                      <button
                        className="appointment-feedback-btn appointment-feedback-btn-hide"
                        onClick={() => handleToggleStatus(feedback.id, 'approved')}
                        disabled={submitting[feedback.id]}
                      >
                        {submitting[feedback.id] ? (
                          <>
                            <FaSpinner className="appointment-feedback-spinner-small" />
                            Đang ẩn...
                          </>
                        ) : (
                          <>
                            <FaEyeSlash /> Ẩn
                          </>
                        )}
                      </button>
                    )}
                    {feedback.status === 'hidden' && (
                      <button
                        className="appointment-feedback-btn appointment-feedback-btn-approve"
                        onClick={() => handleToggleStatus(feedback.id, 'hidden')}
                        disabled={submitting[feedback.id]}
                      >
                        {submitting[feedback.id] ? (
                          <>
                            <FaSpinner className="appointment-feedback-spinner-small" />
                            Đang duyệt...
                          </>
                        ) : (
                          <>
                            <FaCheck /> Phê duyệt
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!loading && feedbacks.length === 0 && (
        <div className="appointment-feedback-empty">
          <p><FaInbox style={{ marginRight: 8 }} /> Không có đánh giá nào</p>
        </div>
      )}

      {/* ===== PAGINATION ===== */}
      {pagination.totalPages > 1 && (
        <div className="appointment-feedback-pagination">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <FaChevronLeft /> Trước
          </button>
          <span className="appointment-feedback-page-info">
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Tiếp <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default AppointmentFeedbackManagement;

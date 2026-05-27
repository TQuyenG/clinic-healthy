// ===== [BƯỚC 4] APPOINTMENT FEEDBACK PUBLIC VIEW =====
// client/src/components/appointments/RatingPublic.js
//
// Purpose: Display reviewed appointment feedbacks in a public/managed view
// - Only show appointments WITH reviews (status = approved)
// - Filters: doctor, rating, service
// - Actions: Patient can edit/delete own feedback; Staff/Admin/Doctor can reply
// - Links: Click to go to doctor detail or appointment detail
//
// Used in: AppointmentManagementPage (feedback tab) or standalone feedback page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaStar, FaRegStar, FaSpinner, FaFilter, FaEdit, FaTrash,
  FaReply, FaChevronLeft, FaChevronRight, FaEye, FaUserMd
} from 'react-icons/fa';
import './RatingPublic.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const RatingPublic = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  
  const [filters, setFilters] = useState({
    doctor_id: '',
    rating: '',
    page: 1,
    limit: 10
  });

  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 10 });
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editReview, setEditReview] = useState('');
  const [replyingFeedbackId, setReplyingFeedbackId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Load feedbacks (only approved)
  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        service_type: 'appointment',
        status: 'approved',
        doctor_id: filters.doctor_id,
        rating: filters.rating,
        page: filters.page,
        limit: filters.limit
      });

      const response = await axios.get(`${API_URL}/appointments/admin/feedbacks?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

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

  useEffect(() => {
    loadFeedbacks();
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleEditStart = (feedback) => {
    setEditingFeedbackId(feedback.id);
    setEditRating(feedback.rating);
    setEditReview(feedback.review || '');
  };

  const handleEditSave = async () => {
    if (!editingFeedbackId) return;
    
    try {
      setActionLoading(editingFeedbackId);
      const response = await axios.put(
        `${API_URL}/appointments/feedbacks/${editingFeedbackId}`,
        { rating: editRating, review: editReview },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        toast.success('Cập nhật đánh giá thành công');
        setEditingFeedbackId(null);
        await loadFeedbacks();
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (feedbackId) => {
    if (!window.confirm('Xóa đánh giá này?')) return;
    
    try {
      setActionLoading(feedbackId);
      const response = await axios.delete(
        `${API_URL}/appointments/feedbacks/${feedbackId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        toast.success('Xóa đánh giá thành công');
        await loadFeedbacks();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi xóa');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReply = async (feedbackId) => {
    if (!replyText.trim()) return toast.error('Nhập phản hồi');
    
    try {
      setActionLoading(feedbackId);
      const response = await axios.put(
        `${API_URL}/appointments/admin/feedbacks/${feedbackId}/reply`,
        { reply: replyText },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        toast.success('Đã thêm phản hồi');
        setReplyingFeedbackId(null);
        setReplyText('');
        await loadFeedbacks();
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi thêm phản hồi');
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating, editable = false) => {
    if (editable) {
      return (
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setEditRating(star)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {star <= editRating ? (
                <FaStar size={18} color="#FFD700" />
              ) : (
                <FaRegStar size={18} color="#DDD" />
              )}
            </button>
          ))}
        </div>
      );
    }

    return (
      <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star}>
            {star <= rating ? (
              <FaStar size={14} color="#FFD700" />
            ) : (
              <FaRegStar size={14} color="#DDD" />
            )}
          </span>
        ))}
        <span style={{ marginLeft: '4px', fontSize: '13px', fontWeight: '600' }}>({rating}/5)</span>
      </span>
    );
  };

  const canManageFeedback = (feedback) => {
    if (user?.role === 'admin' || user?.role === 'staff') return true;
    if (user?.role === 'doctor' && feedback.doctor_id === user.id) return true;
    if (user?.role === 'patient' && feedback.patient_id === user.id) return true;
    return false;
  };

  const isPatientOfFeedback = (feedback) => feedback.patient_id === user?.id;
  const isStaffOrDoctor = ['staff', 'doctor', 'admin'].includes(user?.role);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="afp-container">
      {/* Filters */}
      <div className="afp-filters">
        <FaFilter /> 
        <select 
          className="afp-select" 
          value={filters.rating} 
          onChange={(e) => handleFilterChange('rating', e.target.value)}
        >
          <option value="">Tất cả xếp hạng</option>
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
        <select 
          className="afp-select" 
          value={filters.limit} 
          onChange={(e) => handleFilterChange('limit', e.target.value)}
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
        </select>
      </div>

      {/* Feedbacks list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {feedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Không có đánh giá nào</div>
        ) : (
          feedbacks.map(feedback => (
            <div key={feedback.id} className="afp-card">
              {/* Card Header */}
              <div className="afp-card-header">
                <div>
                  <strong>{feedback.patient?.full_name || 'Bệnh nhân'}</strong>
                  <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>
                    {new Date(feedback.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {renderStars(feedback.rating)}
              </div>

              {/* Card Body */}
              {editingFeedbackId === feedback.id ? (
                <div className="afp-edit-mode">
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Sửa đánh giá:</p>
                  <div style={{ marginBottom: '8px' }}>
                    {renderStars(feedback.rating, true)}
                  </div>
                  <textarea
                    value={editReview}
                    onChange={(e) => setEditReview(e.target.value)}
                    placeholder="Nhận xét..."
                    maxLength={1000}
                    style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'inherit', resize: 'vertical', minHeight: '70px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#999', textAlign: 'right', marginTop: '4px' }}>
                    {editReview.length}/1000
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      className="afp-btn afp-btn-save"
                      onClick={handleEditSave}
                      disabled={actionLoading === feedback.id}
                    >
                      <FaStar /> Lưu
                    </button>
                    <button 
                      className="afp-btn afp-btn-cancel"
                      onClick={() => setEditingFeedbackId(null)}
                      disabled={actionLoading === feedback.id}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="afp-card-body">
                  <p style={{ fontSize: '13px', color: '#333', margin: '6px 0' }}>
                    <strong>Lịch hẹn:</strong> {feedback.appointment?.code}
                  </p>
                  <p style={{ fontSize: '13px', color: '#333', margin: '6px 0' }}>
                    <strong>Bác sĩ:</strong> <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); navigate(`/bac-si/${feedback.doctor?.username}`); }}
                      style={{ color: '#0066cc', textDecoration: 'none' }}
                    >
                      {feedback.doctor?.full_name}
                    </a>
                  </p>
                  <p style={{ fontSize: '13px', color: '#333', margin: '6px 0' }}>
                    <strong>Dịch vụ:</strong> {feedback.appointment?.Service?.name}
                  </p>
                  <p style={{ fontSize: '13px', color: '#555', margin: '8px 0', fontStyle: 'italic', backgroundColor: '#f8f9fa', padding: '8px', borderLeft: '3px solid #0066cc', borderRadius: '2px' }}>
                    {feedback.review || '(Không có nhận xét)'}
                  </p>
                </div>
              )}

              {/* Card Footer */}
              <div className="afp-card-footer">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* View detail */}
                  <button
                    className="afp-btn afp-btn-primary"
                    onClick={() => navigate(`/lich-hen/${feedback.appointment?.code}`)}
                    title="Xem chi tiết"
                  >
                    <FaEye size={12} /> Chi tiết
                  </button>

                  {/* Patient: Edit/Delete */}
                  {isPatientOfFeedback(feedback) && (
                    <>
                      <button
                        className="afp-btn afp-btn-edit"
                        onClick={() => handleEditStart(feedback)}
                        disabled={actionLoading === feedback.id || editingFeedbackId === feedback.id}
                      >
                        <FaEdit size={12} /> Sửa
                      </button>
                      <button
                        className="afp-btn afp-btn-delete"
                        onClick={() => handleDelete(feedback.id)}
                        disabled={actionLoading === feedback.id || editingFeedbackId === feedback.id}
                      >
                        <FaTrash size={12} /> Xóa
                      </button>
                    </>
                  )}

                  {/* Staff/Doctor: Reply */}
                  {isStaffOrDoctor && (
                    <button
                      className="afp-btn afp-btn-reply"
                      onClick={() => setReplyingFeedbackId(replyingFeedbackId === feedback.id ? null : feedback.id)}
                      disabled={actionLoading === feedback.id}
                    >
                      <FaReply size={12} /> Trả lời
                    </button>
                  )}
                </div>

                {/* Reply form */}
                {replyingFeedbackId === feedback.id && isStaffOrDoctor && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Phản hồi..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        maxLength={500}
                        style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #d0d0d0', fontFamily: 'inherit' }}
                      />
                      <button
                        className="afp-btn afp-btn-send"
                        onClick={() => handleReply(feedback.id)}
                        disabled={actionLoading === feedback.id || !replyText.trim()}
                      >
                        Gửi
                      </button>
                    </div>
                  </div>
                )}

                {/* Show existing admin_note/reply */}
                {feedback.admin_note && !replyingFeedbackId === feedback.id && (
                  <div style={{ marginTop: '8px', fontSize: '12px', backgroundColor: '#f0f4f8', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #ff9800' }}>
                    <strong style={{ color: '#ff9800' }}>Phản hồi từ staff/bác sĩ:</strong>
                    <p style={{ margin: '4px 0 0 0', color: '#333' }}>{feedback.admin_note}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
            style={{ padding: '6px 10px', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}
          >
            <FaChevronLeft /> Trước
          </button>
          <span style={{ alignSelf: 'center', fontSize: '13px' }}>
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page === pagination.totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
            style={{ padding: '6px 10px', cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer', opacity: pagination.page === pagination.totalPages ? 0.5 : 1 }}
          >
            Sau <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default RatingPublic;

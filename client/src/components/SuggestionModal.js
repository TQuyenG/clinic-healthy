// client/src/components/SuggestionModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaPaperPlane, FaCheck, FaBan, FaExclamationTriangle, FaUserCircle, FaClock, FaInfoCircle } from 'react-icons/fa';
import './SuggestionModal.css';

const SuggestionModal = ({ entityType, mode, entity, suggestion, categories, onClose, onSuccess }) => {
  // mode: 'create' | 'update' | 'review'
  
  const API_BASE_URL = 'http://localhost:3001';
  const token = localStorage.getItem('token');
  const userRole = JSON.parse(localStorage.getItem('user'))?.role;

  const config = {
    medicine: {
      apiPath: 'medicines',
      title: 'Thuốc',
      fields: {
        name: { label: 'Tên thuốc', type: 'text', required: true },
        category_id: { label: 'Danh mục', type: 'select', required: false },
        composition: { label: 'Thành phần', type: 'textarea', required: false },
        uses: { label: 'Công dụng', type: 'textarea', required: false },
        side_effects: { label: 'Tác dụng phụ', type: 'textarea', required: false },
        manufacturer: { label: 'Nhà sản xuất', type: 'text', required: false },
        image_url: { label: 'URL hình ảnh', type: 'text', required: false }
      }
    },
    disease: {
      apiPath: 'diseases',
      title: 'Bệnh lý',
      fields: {
        name: { label: 'Tên bệnh lý', type: 'text', required: true },
        category_id: { label: 'Danh mục', type: 'select', required: false },
        symptoms: { label: 'Triệu chứng', type: 'textarea', required: false },
        treatments: { label: 'Phương pháp điều trị', type: 'textarea', required: false },
        description: { label: 'Mô tả', type: 'textarea', required: false }
      }
    }
  };

  const currentConfig = config[entityType];

  const [formData, setFormData] = useState({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [finalData, setFinalData] = useState({});

  useEffect(() => {
    if (mode === 'create') {
      // Khởi tạo form trống
      const initialData = {};
      Object.keys(currentConfig.fields).forEach(key => {
        initialData[key] = '';
      });
      setFormData(initialData);
    } else if (mode === 'update' && entity) {
      // Đề xuất cập nhật - load dữ liệu entity hiện tại
      setFormData(entity);
    } else if (mode === 'review' && suggestion) {
      // Admin review - load dữ liệu từ suggestion
      setFormData(suggestion.suggested_data || {});
      setReason(suggestion.reason || '');
      
      // Nếu là update, merge với dữ liệu cũ
      if (suggestion.suggestion_type === 'update' && suggestion[entityType]) {
        setFinalData({ ...suggestion[entityType], ...suggestion.suggested_data });
      } else {
        setFinalData(suggestion.suggested_data);
      }
    }
  }, [mode, entity, suggestion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (mode === 'review') {
      setFinalData({ ...finalData, [name]: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmitSuggestion = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        entity_type: entityType,
        suggestion_type: mode === 'create' ? 'create' : 'update',
        entity_id: mode === 'update' ? entity.id : null,
        suggested_data: formData,
        reason: mode === 'update' ? reason : null
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/articles/suggestions`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('Đã gửi đề xuất thành công! Admin sẽ xem xét.');
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action) => {
    // action: 'approve' | 'reject'
    
    if (action === 'reject' && !adminNote) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/articles/suggestions/${suggestion.id}/review`,
        {
          action,
          admin_note: adminNote,
          final_data: action === 'approve' ? finalData : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(response.data.message);
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const renderTitle = () => {
    if (mode === 'create') return `Đề xuất thêm ${currentConfig.title} mới`;
    if (mode === 'update') return `Đề xuất chỉnh sửa ${currentConfig.title}`;
    if (mode === 'review') {
      const type = suggestion.suggestion_type === 'create' ? 'Thêm mới' : 'Cập nhật';
      return `Đề xuất ${type} ${currentConfig.title}`;
    }
  };

  const getStatusBadge = () => {
    if (!suggestion || mode !== 'review') return null;
    
    const statusConfig = {
      pending: { label: 'Chờ duyệt', className: 'suggestion-status-pending' },
      approved: { label: 'Đã chấp thuận', className: 'suggestion-status-approved' },
      rejected: { label: 'Đã từ chối', className: 'suggestion-status-rejected' }
    };

    const config = statusConfig[suggestion.status];
    return (
      <span className={`suggestion-status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const isReadOnly = mode === 'review' && suggestion.status !== 'pending';
  const canEdit = mode === 'review' && userRole === 'admin' && suggestion.status === 'pending';

  return (
    <div className="suggestion-modal-overlay" onClick={onClose}>
      <div className="suggestion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="suggestion-modal-header">
          <div className="suggestion-modal-title-wrapper">
            <h2>{renderTitle()}</h2>
            {getStatusBadge()}
          </div>
          <button className="suggestion-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="suggestion-modal-body">
          {error && (
            <div className="suggestion-alert suggestion-alert-danger">
              <FaExclamationTriangle />
              <span>{error}</span>
            </div>
          )}

          {/* Hiển thị thông tin người đề xuất (chỉ admin review) */}
          {mode === 'review' && suggestion && (
            <div className="suggestion-info-card">
              <h4>
                <FaInfoCircle />
                <span>Thông tin đề xuất</span>
              </h4>
              <div className="suggestion-info-grid">
                <div className="suggestion-info-item">
                  <FaUserCircle />
                  <div>
                    <span className="suggestion-info-label">Người đề xuất</span>
                    <span className="suggestion-info-value">{suggestion.user?.full_name}</span>
                  </div>
                </div>
                <div className="suggestion-info-item">
                  <FaClock />
                  <div>
                    <span className="suggestion-info-label">Ngày đề xuất</span>
                    <span className="suggestion-info-value">
                      {new Date(suggestion.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
              {suggestion.suggestion_type === 'update' && (
                <div className="suggestion-entity-name">
                  <strong>{currentConfig.title} gốc:</strong> {suggestion[entityType]?.name}
                </div>
              )}
            </div>
          )}

          {/* Lý do (cho mode update) */}
          {mode === 'update' && (
            <div className="suggestion-form-group">
              <label className="suggestion-form-label">
                Lý do đề xuất chỉnh sửa
                <span className="suggestion-required">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                className="suggestion-textarea"
                placeholder="Vui lòng nêu rõ lý do cần chỉnh sửa..."
              />
            </div>
          )}

          {/* Hiển thị lý do nếu đang review */}
          {mode === 'review' && reason && (
            <div className="suggestion-reason-box">
              <strong>Lý do đề xuất:</strong>
              <p>{reason}</p>
            </div>
          )}

          {/* Form fields */}
          <form className="suggestion-form">
            {Object.entries(currentConfig.fields).map(([fieldName, fieldConfig]) => (
              <div key={fieldName} className="suggestion-form-group">
                <label className="suggestion-form-label">
                  {fieldConfig.label}
                  {fieldConfig.required && <span className="suggestion-required">*</span>}
                </label>
                
                {fieldConfig.type === 'select' ? (
                  <select
                    name={fieldName}
                    value={(canEdit ? finalData : formData)[fieldName] || ''}
                    onChange={handleChange}
                    required={fieldConfig.required}
                    disabled={isReadOnly}
                    className="suggestion-select"
                  >
                    <option value="">-- Chọn --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                ) : fieldConfig.type === 'textarea' ? (
                  <textarea
                    name={fieldName}
                    value={(canEdit ? finalData : formData)[fieldName] || ''}
                    onChange={handleChange}
                    required={fieldConfig.required}
                    disabled={isReadOnly}
                    rows={4}
                    className="suggestion-textarea"
                    placeholder={`Nhập ${fieldConfig.label.toLowerCase()}...`}
                  />
                ) : (
                  <input
                    type={fieldConfig.type}
                    name={fieldName}
                    value={(canEdit ? finalData : formData)[fieldName] || ''}
                    onChange={handleChange}
                    required={fieldConfig.required}
                    disabled={isReadOnly}
                    className="suggestion-input"
                    placeholder={`Nhập ${fieldConfig.label.toLowerCase()}...`}
                  />
                )}
              </div>
            ))}
          </form>

          {/* Admin note section */}
          {mode === 'review' && userRole === 'admin' && suggestion.status === 'pending' && (
            <div className="suggestion-form-group">
              <label className="suggestion-form-label">Ghi chú của admin (tùy chọn)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="suggestion-textarea"
                placeholder="Ghi chú cho người đề xuất..."
              />
            </div>
          )}

          {/* Hiển thị admin note nếu có */}
          {mode === 'review' && suggestion.admin_note && (
            <div className="suggestion-admin-note">
              <strong>Phản hồi từ {suggestion.admin?.full_name}:</strong>
              <p>{suggestion.admin_note}</p>
            </div>
          )}
        </div>

        <div className="suggestion-modal-footer">
          <button
            type="button"
            className="suggestion-btn suggestion-btn-secondary"
            onClick={onClose}
          >
            {mode === 'review' && isReadOnly ? 'Đóng' : 'Hủy'}
          </button>

          {mode !== 'review' && (
            <button
              type="button"
              className="suggestion-btn suggestion-btn-primary"
              onClick={handleSubmitSuggestion}
              disabled={loading || (mode === 'update' && !reason)}
            >
              <FaPaperPlane />
              <span>{loading ? 'Đang gửi...' : 'Gửi đề xuất'}</span>
            </button>
          )}

          {mode === 'review' && userRole === 'admin' && suggestion.status === 'pending' && (
            <>
              <button
                type="button"
                className="suggestion-btn suggestion-btn-danger"
                onClick={() => handleReview('reject')}
                disabled={loading}
              >
                <FaBan />
                <span>{loading ? 'Đang xử lý...' : 'Từ chối'}</span>
              </button>
              <button
                type="button"
                className="suggestion-btn suggestion-btn-success"
                onClick={() => handleReview('approve')}
                disabled={loading}
              >
                <FaCheck />
                <span>{loading ? 'Đang xử lý...' : 'Phê duyệt'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionModal;
// client/src/components/entity/SuggestionModal.js - VERSION 2.0 - HOÀN CHỈNH
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaPaperPlane, FaCheck, FaBan, FaExclamationTriangle, 
  FaUserCircle, FaClock, FaInfoCircle, FaImage, FaLink,
  FaThumbsUp, FaMeh, FaThumbsDown
} from 'react-icons/fa';
import './SuggestionModal.css';

const SuggestionModal = ({ entityType, mode, entity, suggestion, categories, onClose, onSuccess }) => {
  // mode: 'create' | 'update' | 'review'
  
  const API_BASE_URL = 'http://localhost:3001';
  const token = localStorage.getItem('token');
  const userRole = JSON.parse(localStorage.getItem('user'))?.role;

  // ============================================
  // CONFIG - ĐỊNH NGHĨA CÁC TRƯỜNG ĐẦY ĐỦ TỪ MODEL
  // ============================================
  const config = {
    medicine: {
      apiPath: 'medicines',
      title: 'Thuốc',
      fields: {
        name: { label: 'Tên thuốc', type: 'text', required: true },
        price: { label: 'Giá tiền (VNĐ)', type: 'number', required: true, min: 0 },
        category_id: { label: 'Danh mục', type: 'select', required: false },
        image_url: { label: 'URL hình ảnh', type: 'image', required: false },
        composition: { label: 'Thành phần', type: 'textarea', required: false },
        uses: { label: 'Công dụng', type: 'textarea', required: false },
        side_effects: { label: 'Tác dụng phụ', type: 'textarea', required: false },
        manufacturer: { label: 'Nhà sản xuất', type: 'text', required: false },
        description: { label: 'Mô tả', type: 'textarea', required: false },
        excellent_review_percent: { label: '% Đánh giá xuất sắc', type: 'number', required: false, min: 0, max: 100 },
        average_review_percent: { label: '% Đánh giá trung bình', type: 'number', required: false, min: 0, max: 100 },
        poor_review_percent: { label: '% Đánh giá kém', type: 'number', required: false, min: 0, max: 100 }
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

  // ============================================
  // STATE
  // ============================================
  const [formData, setFormData] = useState({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [finalData, setFinalData] = useState({});
  const [imagePreview, setImagePreview] = useState('');

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (mode === 'create') {
      // Khởi tạo form trống
      const initialData = {};
      Object.keys(currentConfig.fields).forEach(key => {
        const field = currentConfig.fields[key];
        initialData[key] = field.type === 'number' ? 0 : '';
      });
      setFormData(initialData);
    } else if (mode === 'update' && entity) {
      // Đề xuất cập nhật - load dữ liệu entity hiện tại
      setFormData(entity);
      if (entity.image_url) {
        setImagePreview(entity.image_url);
      }
    } else if (mode === 'review' && suggestion) {
      // Admin review - load dữ liệu từ suggestion
      setFormData(suggestion.suggested_data || {});
      setReason(suggestion.reason || '');
      
      if (suggestion.suggested_data?.image_url) {
        setImagePreview(suggestion.suggested_data.image_url);
      }
      
      // Nếu là update, merge với dữ liệu cũ
      if (suggestion.suggestion_type === 'update' && suggestion[entityType]) {
        setFinalData({ ...suggestion[entityType], ...suggestion.suggested_data });
      } else {
        setFinalData(suggestion.suggested_data);
      }
    }
  }, [mode, entity, suggestion, entityType]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = value;
    
    if (type === 'number') {
      newValue = parseFloat(value) || 0;
      const field = currentConfig.fields[name];
      if (field?.min !== undefined && newValue < field.min) newValue = field.min;
      if (field?.max !== undefined && newValue > field.max) newValue = field.max;
    }
    
    if (mode === 'review') {
      setFinalData({ ...finalData, [name]: newValue });
    } else {
      const newFormData = { ...formData, [name]: newValue };
      setFormData(newFormData);
      
      // Update image preview
      if (name === 'image_url') {
        setImagePreview(newValue);
      }
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

  // ============================================
  // RENDER HELPERS
  // ============================================
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

    const statusCfg = statusConfig[suggestion.status];
    return (
      <span className={`suggestion-status-badge ${statusCfg.className}`}>
        {statusCfg.label}
      </span>
    );
  };

  const renderField = (fieldName, fieldConfig, data, canEditField) => {
    const value = data[fieldName] ?? '';
    
    switch (fieldConfig.type) {
      case 'select':
        return (
          <select
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            disabled={!canEditField}
            className="suggestion-select"
          >
            <option value="">-- Chọn --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        );
        
      case 'textarea':
        return (
          <textarea
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            disabled={!canEditField}
            rows={4}
            className="suggestion-textarea"
            placeholder={`Nhập ${fieldConfig.label.toLowerCase()}...`}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            disabled={!canEditField}
            className="suggestion-input suggestion-input-number"
            min={fieldConfig.min}
            max={fieldConfig.max}
            step="0.01"
          />
        );
        
      case 'image':
        return (
          <div className="suggestion-image-wrapper">
            <input
              type="text"
              name={fieldName}
              value={value}
              onChange={handleChange}
              disabled={!canEditField}
              className="suggestion-input"
              placeholder="https://example.com/image.jpg"
            />
            {imagePreview && (
              <div className="suggestion-image-preview">
                <img 
                  src={imagePreview} 
                  alt="Preview"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <input
            type={fieldConfig.type}
            name={fieldName}
            value={value}
            onChange={handleChange}
            required={fieldConfig.required}
            disabled={!canEditField}
            className="suggestion-input"
            placeholder={`Nhập ${fieldConfig.label.toLowerCase()}...`}
          />
        );
    }
  };

  // Hiển thị so sánh dữ liệu cũ và mới (cho mode review với suggestion_type update)
  const renderComparison = () => {
    if (mode !== 'review' || suggestion.suggestion_type !== 'update') return null;
    
    const originalData = suggestion[entityType] || {};
    const suggestedData = suggestion.suggested_data || {};
    
    const changedFields = Object.keys(currentConfig.fields).filter(key => {
      return suggestedData[key] !== undefined && 
             suggestedData[key] !== originalData[key];
    });
    
    if (changedFields.length === 0) return null;
    
    return (
      <div className="suggestion-comparison">
        <h4>
          <FaInfoCircle /> Các trường được đề xuất thay đổi
        </h4>
        <div className="suggestion-comparison-table">
          <table>
            <thead>
              <tr>
                <th>Trường</th>
                <th>Giá trị cũ</th>
                <th>Giá trị mới</th>
              </tr>
            </thead>
            <tbody>
              {changedFields.map(fieldName => {
                const fieldConfig = currentConfig.fields[fieldName];
                const oldValue = originalData[fieldName] || '-';
                const newValue = suggestedData[fieldName] || '-';
                
                return (
                  <tr key={fieldName}>
                    <td className="suggestion-comparison-label">{fieldConfig.label}</td>
                    <td className="suggestion-comparison-old">
                      {typeof oldValue === 'string' && oldValue.length > 100 
                        ? oldValue.substring(0, 100) + '...' 
                        : oldValue}
                    </td>
                    <td className="suggestion-comparison-new">
                      {typeof newValue === 'string' && newValue.length > 100 
                        ? newValue.substring(0, 100) + '...' 
                        : newValue}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const isReadOnly = mode === 'review' && suggestion.status !== 'pending';
  const canEdit = mode === 'review' && userRole === 'admin' && suggestion.status === 'pending';

  // ============================================
  // RENDER
  // ============================================
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

          {/* Thông tin người đề xuất (chỉ admin review) */}
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

          {/* So sánh dữ liệu (cho update) */}
          {renderComparison()}

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
              <div key={fieldName} className={`suggestion-form-group ${fieldConfig.type === 'textarea' ? 'suggestion-form-group-full' : ''}`}>
                <label className="suggestion-form-label">
                  {fieldConfig.label}
                  {fieldConfig.required && <span className="suggestion-required">*</span>}
                </label>
                {renderField(
                  fieldName, 
                  fieldConfig, 
                  canEdit ? finalData : formData,
                  !isReadOnly
                )}
              </div>
            ))}
          </form>

          {/* Admin note section */}
          {mode === 'review' && userRole === 'admin' && suggestion.status === 'pending' && (
            <div className="suggestion-form-group suggestion-form-group-full">
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
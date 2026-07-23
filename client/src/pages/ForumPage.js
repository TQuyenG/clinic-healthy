// client/src/pages/ForumPage.js
import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import forumService from '../services/forumService';
import communityService from '../services/communityService';
import { FORUM_QUESTION_ROUTE } from '../utils/constants';
import './ForumPage.css';

import {
  FaSearch, FaQuestionCircle, FaEye, FaTags, FaStar, FaComments, FaArrowUp,
  FaArrowDown, FaExclamationTriangle, FaTimes, FaBookmark, FaHeart,
  FaRegBookmark, FaRegHeart, FaUsers, FaHospital, FaCheckCircle,
  FaInfoCircle, FaTimesCircle, FaBrain, FaDumbbell, FaStethoscope,
  FaAppleAlt, FaLeaf, FaRunning, FaTooth, FaBaby, FaVial, FaPills,
  FaShieldAlt, FaFilter, FaChevronDown, FaImage, FaPaperclip, FaUserSecret,
  FaClipboardCheck, FaCrown
} from 'react-icons/fa';

const GROUP_ICONS_MAP = {
  FaUsers: <FaUsers />, FaHeart: <FaHeart />, FaBrain: <FaBrain />,
  FaDumbbell: <FaDumbbell />, FaStethoscope: <FaStethoscope />, FaAppleAlt: <FaAppleAlt />,
  FaLeaf: <FaLeaf />, FaRunning: <FaRunning />, FaTooth: <FaTooth />,
  FaBaby: <FaBaby />, FaVial: <FaVial />, FaPills: <FaPills />
};

// ==========================================
// COMPONENT: CustomAlert
// ==========================================
const CustomAlert = ({ type = 'info', title = '', message = '', show = false, onClose = () => {}, autoCloseDuration = 5000 }) => {
  useEffect(() => {
    if (show && autoCloseDuration > 0) {
      const timer = setTimeout(() => onClose(), autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDuration, onClose]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <FaCheckCircle className="forumpage-alert-icon" />;
      case 'error': return <FaTimesCircle className="forumpage-alert-icon" />;
      case 'warning': return <FaExclamationTriangle className="forumpage-alert-icon" />;
      default: return <FaInfoCircle className="forumpage-alert-icon" />;
    }
  };

  return (
    <div className="forumpage-alert-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className={`forumpage-alert forumpage-alert--${type}`} onClick={(e) => e.stopPropagation()}>
        <button className="forumpage-alert-close" onClick={onClose} aria-label="Đóng"><FaTimes /></button>
        <div className="forumpage-alert-header">
          {getIcon()}
          <h3 className="forumpage-alert-title">{title}</h3>
        </div>
        {message && <p className="forumpage-alert-message">{message}</p>}
        <div className="forumpage-alert-actions">
          <button className={`forumpage-btn-primary forumpage-alert-btn--${type}`} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: ForumBanner
// ==========================================
const ForumBanner = () => {
  const [overview, setOverview] = useState({ totalQuestions: 0, totalAnswers: 0, topicCount: 0 });

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get('/forum/stats/overview');
        if (res.data && res.data.data) setOverview(res.data.data);
      } catch (error) {}
    };
    fetchOverview();
  }, []);

  return (
    <header className="forumpage-banner">
      <div className="forumpage-banner-bg"></div>
      <div className="forumpage-banner-inner forumpage-container">
        <div className="forumpage-banner-content">
          <div className="forumpage-banner-brand"><FaStar color="#FFC107" /> Cộng đồng đã kiểm duyệt</div>
          <h1 className="forumpage-banner-title">Diễn đàn sức khỏe</h1>
          <p className="forumpage-banner-desc">
            Hỏi đáp cùng cộng đồng, kết nối bác sĩ – bệnh nhân và lan tỏa kiến thức y khoa.
          </p>
          <div className="forumpage-banner-stats-row">
            <div className="forumpage-banner-stat-box">
              <span className="forumpage-banner-stat-val">{overview.totalQuestions.toLocaleString('vi-VN')}</span>
              <span className="forumpage-banner-stat-lbl">Câu hỏi</span>
            </div>
            <div className="forumpage-banner-stat-box">
              <span className="forumpage-banner-stat-val">{overview.totalAnswers.toLocaleString('vi-VN')}</span>
              <span className="forumpage-banner-stat-lbl">Câu trả lời</span>
            </div>
            <div className="forumpage-banner-stat-box">
              <span className="forumpage-banner-stat-val">{overview.topicCount}</span>
              <span className="forumpage-banner-stat-lbl">Chủ đề</span>
            </div>
          </div>
        </div>

        <div className="forumpage-banner-cards">
          <div className="forumpage-banner-action-card">
            <div className="forumpage-banner-action-icon"><FaHospital size={22} /></div>
            <div>
              <span className="forumpage-banner-action-label">TƯ VẤN BÁC SĨ</span>
              <strong className="forumpage-banner-action-value">Trực tuyến 24/7</strong>
              <span className="forumpage-banner-action-sub">Đội ngũ chuyên gia sẵn sàng hỗ trợ</span>
            </div>
          </div>
          <div className="forumpage-banner-action-card">
            <div className="forumpage-banner-action-icon forumpage-banner-action-icon--blue"><FaClipboardCheck size={22} /></div>
            <div>
              <span className="forumpage-banner-action-label">KIỂM DUYỆT DIỄN ĐÀN</span>
              <strong className="forumpage-banner-action-value">Nội dung được xét duyệt</strong>
              <span className="forumpage-banner-action-sub">Mọi câu hỏi qua kiểm duyệt y khoa</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ==========================================
// COMPONENT: FilterBar
// ==========================================
const FilterBar = ({
  searchTerm, setSearchTerm, handleSearch,
  selectedTopic, setSelectedTopic,
  selectedSpecialty, setSelectedSpecialty,
  topics, specialties,
  clearFilters,
  activeSearchTerm, selectedSpecialtyName,
  selectedTags, handleClearSearch, handleClearSpecialty, toggleFilterTag,
}) => {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const menuRef = useRef(null);
  const hasActiveFilters = !!(activeSearchTerm || selectedSpecialtyName || selectedTopic || selectedTags.length > 0);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowFilterMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <section className="forumpage-filterbar forumpage-container">
      {/* Search */}
      <form className="forumpage-filterbar-search" onSubmit={handleSearch}>
        <FaSearch className="forumpage-filterbar-search-icon" />
        <input
          type="text"
          placeholder="Tìm kiếm câu hỏi, triệu chứng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button type="button" className="forumpage-filterbar-clear-btn" onClick={() => { setSearchTerm(''); handleClearSearch(); }}>
            <FaTimes />
          </button>
        )}
        <button type="submit" className="forumpage-filterbar-search-btn">Tìm</button>
      </form>

      {/* Desktop selects */}
      <div className="forumpage-filterbar-selects">
        <div className="forumpage-filterbar-select-wrap">
          <select value={selectedTopic} onChange={(e) => { setSelectedTopic(e.target.value); }}>
            <option value="">Tất cả chủ đề</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.title}</option>
            ))}
          </select>
          <FaChevronDown className="forumpage-select-arrow" />
        </div>

        <div className="forumpage-filterbar-select-wrap">
          <select value={selectedSpecialty} onChange={(e) => { setSelectedSpecialty(e.target.value); }}>
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
            ))}
          </select>
          <FaChevronDown className="forumpage-select-arrow" />
        </div>

        {hasActiveFilters && (
          <button type="button" className="forumpage-filterbar-reset" onClick={clearFilters}>
            <FaTimes /> Xóa lọc
          </button>
        )}
      </div>

      {/* Mobile filter toggle */}
      <div className="forumpage-filterbar-mobile" ref={menuRef}>
        <button
          type="button"
          className={`forumpage-filterbar-toggle ${hasActiveFilters ? 'has-active' : ''}`}
          onClick={() => setShowFilterMenu(v => !v)}
        >
          <FaFilter />
          {hasActiveFilters && <span className="forumpage-filterbar-dot"></span>}
          <FaChevronDown style={{ transition: 'transform 0.2s', transform: showFilterMenu ? 'rotate(180deg)' : 'rotate(0)' }} />
        </button>

        {showFilterMenu && (
          <div className="forumpage-filterbar-dropdown">
            <div className="forumpage-filterbar-dropdown-group">
              <label>Chủ đề</label>
              <div className="forumpage-filterbar-select-wrap">
                <select value={selectedTopic} onChange={(e) => { setSelectedTopic(e.target.value); setShowFilterMenu(false); }}>
                  <option value="">Tất cả chủ đề</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <FaChevronDown className="forumpage-select-arrow" />
              </div>
            </div>
            <div className="forumpage-filterbar-dropdown-group">
              <label>Chuyên khoa</label>
              <div className="forumpage-filterbar-select-wrap">
                <select value={selectedSpecialty} onChange={(e) => { setSelectedSpecialty(e.target.value); setShowFilterMenu(false); }}>
                  <option value="">Tất cả chuyên khoa</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <FaChevronDown className="forumpage-select-arrow" />
              </div>
            </div>
            {hasActiveFilters && (
              <button type="button" className="forumpage-filterbar-reset forumpage-filterbar-reset--full" onClick={() => { clearFilters(); setShowFilterMenu(false); }}>
                <FaTimes /> Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="forumpage-filterbar-chips">
          {activeSearchTerm && (
            <button type="button" className="forumpage-filter-chip" onClick={handleClearSearch}>
              Từ khóa: <strong>{activeSearchTerm}</strong> <FaTimes />
            </button>
          )}
          {selectedTopic && (
            <button type="button" className="forumpage-filter-chip" onClick={() => setSelectedTopic('')}>
              Chủ đề: <strong>{topics.find(t => String(t.id) === String(selectedTopic))?.title}</strong> <FaTimes />
            </button>
          )}
          {selectedSpecialtyName && (
            <button type="button" className="forumpage-filter-chip" onClick={handleClearSpecialty}>
              Chuyên khoa: <strong>{selectedSpecialtyName}</strong> <FaTimes />
            </button>
          )}
          {selectedTags.map((tag) => (
            <button type="button" key={tag} className="forumpage-filter-chip forumpage-filter-chip--tag" onClick={() => toggleFilterTag(tag)}>
              #{tag} <FaTimes />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

// ==========================================
// COMPONENT: AskQuestionModal
// ==========================================
const AskQuestionModal = ({
  show, onClose, onSubmit,
  questionForm, setQuestionForm,
  topics, specialties,
  formTags, toggleTag, toggleSpecialty,
  previewImages, setPreviewImages,
  uploading, setUploading,
  previewFiles, setPreviewFiles,
  setAlert
}) => {
  if (!show) return null;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (previewImages.length + files.length > 5) {
      setAlert({ show: true, type: 'warning', title: 'Giới hạn upload', message: 'Chỉ được upload tối đa 5 ảnh' });
      return;
    }
    setUploading(true);
    try {
      const uploadedUrls = [];
      const newPreviews = [];
      for (const file of files) {
        newPreviews.push(URL.createObjectURL(file));
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/upload/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          uploadedUrls.push(data.url || data.imageUrl);
        }
      }
      setPreviewImages(prev => [...prev, ...uploadedUrls]);
      setQuestionForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    } catch (error) {
      setAlert({ show: true, type: 'error', title: 'Lỗi upload', message: 'Có lỗi khi upload ảnh. Vui lòng thử lại!' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    const newImages = previewImages.filter((_, i) => i !== index);
    setPreviewImages(newImages);
    setQuestionForm(prev => ({ ...prev, images: newImages }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (questionForm.attachments.length + files.length > 5) {
      setAlert({ show: true, type: 'warning', title: 'Giới hạn files', message: 'Chỉ được upload tối đa 5 files!' });
      return;
    }
    setUploading(true);
    try {
      const uploadedUrls = [];
      const uploadedFileNames = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/upload/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        });
        const data = await response.json();
        if (data.success && (data.url || data.imageUrl)) {
          uploadedUrls.push(data.url || data.imageUrl);
          uploadedFileNames.push(file.name);
        }
      }
      setQuestionForm(prev => ({ ...prev, attachments: [...prev.attachments, ...uploadedUrls] }));
      setPreviewFiles(prev => [...prev, ...uploadedFileNames]);
    } catch (error) {
      setAlert({ show: true, type: 'error', title: 'Lỗi upload', message: 'Không thể upload files. Vui lòng thử lại!' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = (index) => {
    setQuestionForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
    setPreviewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const selectedTopicObj = topics.find(t => String(t.id) === String(questionForm.topicId));

  return (
    <div className="forumpage-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="forumpage-modal forumpage-modal--ask" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="forumpage-modal__header">
          <div className="forumpage-modal__header-info">
            <FaQuestionCircle className="forumpage-modal__header-icon" />
            <div>
              <h2 className="forumpage-modal__title">Đặt câu hỏi y khoa</h2>
              <p className="forumpage-modal__subtitle">Câu hỏi sẽ được kiểm duyệt trước khi hiển thị</p>
            </div>
          </div>
          <button className="forumpage-modal__close" onClick={onClose}><FaTimes /></button>
        </div>

        <form className="forumpage-modal__form" onSubmit={onSubmit}>
          {/* Section 1: Nội dung chính */}
          <div className="forumpage-form-section">
            <div className="forumpage-form-section-title">
              <span className="forumpage-form-section-num">1</span> Nội dung câu hỏi
            </div>
            <div className="forumpage-form-group">
              <label>Tiêu đề câu hỏi <span className="forumpage-required">*</span></label>
              <input
                type="text"
                placeholder="Ví dụ: Đau đầu buổi sáng kéo dài 3 ngày có nguy hiểm không?"
                value={questionForm.title}
                onChange={(e) => setQuestionForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="forumpage-form-group">
              <label>Mô tả chi tiết <span className="forumpage-required">*</span></label>
              <textarea
                placeholder="Mô tả triệu chứng, thời gian, mức độ, tiền sử bệnh... càng chi tiết càng tốt để nhận tư vấn chính xác."
                value={questionForm.content}
                onChange={(e) => setQuestionForm(prev => ({ ...prev, content: e.target.value }))}
                rows="5"
                required
              />
            </div>
          </div>

          {/* Section 2: Phân loại */}
          <div className="forumpage-form-section">
            <div className="forumpage-form-section-title">
              <span className="forumpage-form-section-num">2</span> Phân loại câu hỏi
            </div>
            <div className="forumpage-form-row">
              <div className="forumpage-form-group">
                <label>Chủ đề <span className="forumpage-required">*</span></label>
                <div className="forumpage-filterbar-select-wrap">
                  <select
                    value={questionForm.topicId}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, topicId: e.target.value }))}
                    required
                  >
                    <option value="">-- Chọn chủ đề --</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>{topic.title}</option>
                    ))}
                  </select>
                  <FaChevronDown className="forumpage-select-arrow" />
                </div>
              </div>

              <div className="forumpage-form-group">
                <label>Chuyên khoa <span className="forumpage-form-label-optional">(không bắt buộc, chọn nhiều)</span></label>
                <div className="forumpage-specialty-chips">
                  {specialties.slice(0, 10).map((specialty) => {
                    const isSelected = questionForm.specialtyIds.includes(specialty.id);
                    return (
                      <button
                        key={specialty.id}
                        type="button"
                        className={`forumpage-specialty-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSpecialty(specialty.id)}
                      >
                        {specialty.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Tags */}
          <div className="forumpage-form-section">
            <div className="forumpage-form-section-title">
              <span className="forumpage-form-section-num">3</span> Thẻ tag <span className="forumpage-form-label-optional">(không bắt buộc)</span>
            </div>
            {formTags.length > 0 && (
              <div className="forumpage-form-group">
                <label>Chọn tag phổ biến</label>
                <div className="forumpage-tag-grid">
                  {formTags.slice(0, 20).map((tag) => {
                    const isSelected = questionForm.tagList.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        className={`forumpage-tag-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        <FaTags size={11} /> {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="forumpage-form-group">
              <label>Thêm tag khác <span className="forumpage-form-label-optional">(phân cách bằng dấu phẩy)</span></label>
              <input
                type="text"
                placeholder="Ví dụ: đau đầu, mất ngủ, stress"
                value={questionForm.tags}
                onChange={(e) => setQuestionForm(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>

          {/* Section 4: Upload ảnh và file */}
          <div className="forumpage-form-section">
            <div className="forumpage-form-section-title">
              <span className="forumpage-form-section-num">4</span> Đính kèm tài liệu <span className="forumpage-form-label-optional">(không bắt buộc)</span>
            </div>
            <div className="forumpage-upload-row">
              {/* Upload ảnh */}
              <div className="forumpage-form-group">
                <label><FaImage size={13} /> Ảnh minh họa <span className="forumpage-form-label-optional">(tối đa 5 ảnh)</span></label>
                <input
                  type="file"
                  id="forum-image-upload"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  disabled={uploading || previewImages.length >= 5}
                />
                <label
                  htmlFor="forum-image-upload"
                  className={`forumpage-upload-zone ${uploading || previewImages.length >= 5 ? 'disabled' : ''}`}
                >
                  <FaImage size={24} />
                  <span>{uploading ? 'Đang upload...' : 'Nhấn để chọn ảnh'}</span>
                  <span className="forumpage-upload-zone-sub">JPG, PNG, GIF – tối đa 5MB mỗi file</span>
                </label>
                {previewImages.length > 0 && (
                  <div className="forumpage-image-preview-grid">
                    {previewImages.map((url, index) => (
                      <div key={index} className="forumpage-image-preview-item">
                        <img
                          src={url && url.startsWith('http') ? url : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${url?.startsWith('/') ? '' : '/'}${url}`}
                          alt={`Preview ${index + 1}`}
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/100x100?text=Lỗi'; }}
                        />
                        <button type="button" className="forumpage-remove-image-btn" onClick={() => removeImage(index)}>
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload file */}
              <div className="forumpage-form-group">
                <label><FaPaperclip size={13} /> Files đính kèm <span className="forumpage-form-label-optional">(tối đa 5 files)</span></label>
                <input
                  type="file"
                  id="forum-file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading || questionForm.attachments.length >= 5}
                />
                <label
                  htmlFor="forum-file-upload"
                  className={`forumpage-upload-zone ${uploading || questionForm.attachments.length >= 5 ? 'disabled' : ''}`}
                >
                  <FaPaperclip size={24} />
                  <span>{uploading ? 'Đang upload...' : 'Nhấn để chọn file'}</span>
                  <span className="forumpage-upload-zone-sub">PDF, DOC, XLS – tối đa 5MB mỗi file</span>
                </label>
                {previewFiles.length > 0 && (
                  <div className="forumpage-file-preview-list">
                    {previewFiles.map((fileName, index) => (
                      <div key={index} className="forumpage-file-preview-item">
                        <FaPaperclip size={14} />
                        <span>{fileName}</span>
                        <button type="button" className="forumpage-remove-file-btn" onClick={() => removeFile(index)}>
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Tùy chọn ẩn danh */}
          {questionForm.topicId && selectedTopicObj?.requiresApproval && (
            <div className="forumpage-form-section forumpage-form-section--compact">
              <label className="forumpage-anonymous-toggle">
                <input
                  type="checkbox"
                  checked={questionForm.isAnonymous}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                />
                <FaUserSecret size={16} />
                <div>
                  <span className="forumpage-anonymous-label">Đặt câu hỏi ẩn danh</span>
                  <span className="forumpage-anonymous-sub">Tên của bạn sẽ được ẩn với cộng đồng, chỉ admin mới thấy</span>
                </div>
              </label>
            </div>
          )}

          {/* Footer */}
          <div className="forumpage-modal__actions">
            <button type="button" className="forumpage-btn-muted" onClick={onClose}>Hủy</button>
            <button type="submit" className="forumpage-btn-primary" disabled={uploading}>
              {uploading ? 'Đang xử lý...' : <><FaQuestionCircle /> Gửi câu hỏi</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: CreateGroupModal (Form tạo nhóm Popup)
// ==========================================
const CreateGroupModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '', description: '', privacy: 'public', specialty_id: '',
    doctor_id: '', requires_post_approval: true, icon: 'FaUsers',
    avatar_image: '', cover_image: ''
  });
  
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await api.get('/specialties');
        setSpecialties(response.data.specialties || response.data.data || []);
      } catch (err) { }
    };
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (!formData.specialty_id) {
      setDoctors([]);
      return;
    }
    const fetchDoctorsBySpecialty = async () => {
      try {
        const response = await api.get(`/users/doctors?status=active&specialty_id=${formData.specialty_id}`);
        setDoctors(response.data.doctors || response.data.data || []);
        setFormData(prev => ({ ...prev, doctor_id: '' }));
      } catch (err) { setDoctors([]); }
    };
    fetchDoctorsBySpecialty();
  }, [formData.specialty_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleGroupImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formUpload = new FormData();
      formUpload.append('image', file);
      const res = await api.post('/upload/image', formUpload, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        const url = res.data.url || res.data.imageUrl;
        setFormData(prev => ({ ...prev, [type]: url }));
      }
    } catch (error) {
      setError('Không thể upload ảnh, vui lòng thử lại!');
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Vui lòng nhập tên nhóm'); return; }

    setLoading(true);
    try {
      const payload = {
        name: formData.name, description: formData.description, privacy: formData.privacy,
        doctor_id: formData.doctor_id ? parseInt(formData.doctor_id) : null,
        requires_post_approval: formData.requires_post_approval,
        icon: formData.icon, avatar_image: formData.avatar_image, cover_image: formData.cover_image
      };
      const res = await communityService.createGroup(payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi tạo nhóm');
    } finally { setLoading(false); }
  };

  return (
    <div className="forumpage-modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="forumpage-modal forumpage-modal--ask" onClick={(e) => e.stopPropagation()}>
        <div className="forumpage-modal__header">
          <div className="forumpage-modal__header-info">
            <FaUsers className="forumpage-modal__header-icon" />
            <div>
              <h2 className="forumpage-modal__title">Tạo Nhóm Cộng Đồng</h2>
            </div>
          </div>
          <button className="forumpage-modal__close" onClick={onClose} disabled={loading || uploading}><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit} className="forumpage-modal__form">
          {error && <div className="forumpage-modal-error">{error}</div>}

          <div className="forumpage-form-section">
            <div className="forumpage-form-row">
              <div className="forumpage-form-group">
                <label>Tên Nhóm <span className="forumpage-required">*</span></label>
                <input type="text" name="name" placeholder="Ví dụ: Nhóm Hỗ Trợ Đái Tháo Đường" value={formData.name} onChange={handleChange} maxLength="255" required />
              </div>
            </div>
            <div className="forumpage-form-group">
              <label>Mô Tả Nhóm</label>
              <textarea name="description" rows="2" placeholder="Mục đích và đối tượng..." value={formData.description} onChange={handleChange} />
            </div>
          </div>

          <div className="forumpage-form-section">
            <div className="forumpage-upload-row">
              <div className="forumpage-form-group">
                <label>Icon / Ảnh đại diện</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                     {Object.keys(GROUP_ICONS_MAP).map(icKey => (
                        <button type="button" key={icKey} onClick={() => setFormData(prev => ({ ...prev, icon: icKey }))}
                          style={{ padding: '6px', borderRadius: '8px', border: formData.icon === icKey ? '2px solid #4CAF50' : '1px solid #ddd', background: formData.icon === icKey ? '#e8f5e9' : '#fff', cursor: 'pointer' }}>
                          {GROUP_ICONS_MAP[icKey]}
                        </button>
                     ))}
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <input type="file" id="group-avatar-file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleGroupImageUpload(e, 'avatar_image')} disabled={uploading} />
                      <label htmlFor="group-avatar-file" style={{ display: 'inline-flex', width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed #4CAF50', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', background: '#f1f8f4', overflow: 'hidden' }}>
                         {formData.avatar_image ? <img src={formData.avatar_image.startsWith('http') ? formData.avatar_image : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${formData.avatar_image}`} alt="" style={{width: '100%', height:'100%', objectFit:'cover'}} /> : GROUP_ICONS_MAP[formData.icon] || <FaUsers size={24} color="#4CAF50"/>}
                      </label>
                   </div>
                </div>
              </div>

              <div className="forumpage-form-group">
                <label>Ảnh bìa nhóm</label>
                <input type="file" id="group-cover-file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleGroupImageUpload(e, 'cover_image')} disabled={uploading} />
                <label htmlFor="group-cover-file" style={{ display: 'flex', height: '100px', borderRadius: '10px', border: '2px dashed #4CAF50', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', background: formData.cover_image ? `url(${formData.cover_image.startsWith('http') ? formData.cover_image : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${formData.cover_image}`}) center/cover` : '#f1f8f4', color: '#4CAF50' }}>
                   {!formData.cover_image && <span>{uploading ? 'Đang tải...' : 'Bấm chọn ảnh'}</span>}
                </label>
              </div>
            </div>
          </div>

          <div className="forumpage-form-section">
             <div className="forumpage-form-row">
               <div className="forumpage-form-group">
                  <label>Lọc bác sĩ theo chuyên khoa</label>
                  <div className="forumpage-filterbar-select-wrap">
                    <select name="specialty_id" value={formData.specialty_id} onChange={handleChange}>
                      <option value="">-- Không bắt buộc --</option>
                      {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <FaChevronDown className="forumpage-select-arrow" />
                  </div>
               </div>
               <div className="forumpage-form-group">
                  <label>Bác sĩ phụ trách</label>
                  <div className="forumpage-filterbar-select-wrap">
                    <select name="doctor_id" value={formData.doctor_id} onChange={handleChange}>
                      <option value="">-- Không có (Nhóm cộng đồng) --</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>BS. {d.user?.full_name}</option>)}
                    </select>
                    <FaChevronDown className="forumpage-select-arrow" />
                  </div>
               </div>
             </div>
          </div>
          
          <div className="forumpage-form-section">
             <div className="forumpage-form-row">
                <div className="forumpage-form-group">
                  <label>Quyền riêng tư</label>
                  <div className="forumpage-filterbar-select-wrap">
                    <select name="privacy" value={formData.privacy} onChange={handleChange}>
                      <option value="public">Công khai</option>
                      <option value="private">Riêng tư</option>
                      <option value="invite_only">Chỉ mời</option>
                    </select>
                    <FaChevronDown className="forumpage-select-arrow" />
                  </div>
                </div>
                <div className="forumpage-form-group" style={{justifyContent: 'center'}}>
                  <label className="forumpage-anonymous-toggle" style={{marginTop: '10px'}}>
                    <input type="checkbox" name="requires_post_approval" checked={formData.requires_post_approval} onChange={handleChange} />
                    <span className="forumpage-anonymous-label">Duyệt bài đăng trước khi hiển thị</span>
                  </label>
                </div>
             </div>
          </div>

          <div className="forumpage-modal__actions">
            <button type="button" className="forumpage-btn-muted" onClick={onClose} disabled={loading || uploading}>Hủy</button>
            <button type="submit" className="forumpage-btn-primary" disabled={loading || uploading}>
              {loading ? 'Đang tạo...' : 'Tạo Nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: ForumPage (Chính)
// ==========================================
const ForumPage = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const navigate = useNavigate();
  const location = useLocation();

  // ĐỒNG BỘ ACTIVE TAB VỚI URL ROUTER
  const currentPath = location.pathname;
  let initialTab = 'forum';
  if (currentPath.includes('/cong-dong')) initialTab = 'community';
  
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (currentPath.includes('/cong-dong')) setActiveTab('community');
    else setActiveTab('forum');
  }, [currentPath]);

  const handleTabChange = (tabName) => {
    if (tabName === 'forum') navigate('/dien-dan-suc-khoe');
    else if (tabName === 'community') navigate('/cong-dong');
  };

  useEffect(() => {
    if (location.state?.openAskModal) {
      setShowAskModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [groups, setGroups] = useState([]);

  const [groupSearch, setGroupSearch] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [membershipMap, setMembershipMap] = useState({});
  const [groupFilter, setGroupFilter] = useState('all');
  
  // STATE MỞ MODAL & POPUP
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [groupSettings, setGroupSettings] = useState({ allowUserCreateGroup: true });

  const [questions, setQuestions] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAskModal, setShowAskModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: '', id: null, title: '' });
  const [reportForm, setReportForm] = useState({ reason: '', description: '' });
  const [alert, setAlert] = useState({ show: false, type: 'info', title: '', message: '' });

  const defaultQuestionForm = {
    title: '', content: '', topicId: '', specialtyIds: [],
    tags: '', tagList: [], isAnonymous: false, images: [], attachments: []
  };
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [recentTags, setRecentTags] = useState([]);
  const [formTags, setFormTags] = useState([]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;
    const html = document.documentElement;
    const originalOverflow = body.style.overflow;
    if (showAskModal || showCreateGroupModal || showSuccessPopup) {
      body.style.overflow = 'hidden';
      body.classList.add('forumpage-modal-open');
      if (html) html.classList.add('forumpage-modal-open');
    } else {
      body.style.overflow = originalOverflow;
      body.classList.remove('forumpage-modal-open');
      if (html) html.classList.remove('forumpage-modal-open');
    }
    return () => {
      body.style.overflow = originalOverflow;
      body.classList.remove('forumpage-modal-open');
      if (html) html.classList.remove('forumpage-modal-open');
    };
  }, [showAskModal, showCreateGroupModal, showSuccessPopup]);

  const selectedSpecialtyName = useMemo(() => {
    if (!selectedSpecialty) return '';
    const specialty = specialties.find((item) => String(item.id) === String(selectedSpecialty));
    return specialty ? specialty.name : '';
  }, [selectedSpecialty, specialties]);

  const extractTagsFromQuestions = useCallback((questionList) => {
    const tagMap = new Map();
    questionList.forEach(q => {
      const tags = Array.isArray(q.tags) ? q.tags : [];
      tags.forEach(tag => {
        const t = tag.trim();
        if (t) tagMap.set(t, (tagMap.get(t) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);
  }, []);

  const fetchQuestions = useCallback(async ({ page, specialty, topic, search, tags } = {}) => {
    const targetPage = page ?? currentPage;
    const targetSpecialty = specialty ?? selectedSpecialty;
    const targetSearch = search ?? activeSearchTerm;
    const targetTags = Array.isArray(tags) ? tags : selectedTags;

    setLoading(true);
    try {
      const params = {
        page: targetPage, limit: 10,
        search: targetSearch,
        specialty: targetSpecialty,
        tags: targetTags,
      };
      const payload = await forumService.getPublicQuestions(params);
      if (payload.success) {
        const qs = payload.data?.questions || [];
        setQuestions(qs);
        const extracted = extractTagsFromQuestions(qs);
        if (extracted.length > 0) {
          setRecentTags(extracted);
          setFormTags(extracted);
        }
        const pagination = payload.data?.pagination || {};
        setTotalPages(pagination.totalPages || 1);
        if (typeof pagination.page === 'number' && pagination.page !== targetPage) setCurrentPage(pagination.page);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeSearchTerm, selectedSpecialty, selectedTags, extractTagsFromQuestions]);

  const fetchRecentTags = useCallback(async () => {
    try {
      const payload = await forumService.getPublicQuestions({ page: 1, limit: 50 });
      if (payload.success) {
        const qs = payload.data?.questions || [];
        const extracted = extractTagsFromQuestions(qs);
        if (extracted.length > 0) {
          setRecentTags(extracted);
          setFormTags(extracted);
        }
      }
    } catch (error) {}
  }, [extractTagsFromQuestions]);

  const fetchSpecialties = useCallback(async () => {
    try {
      const response = await api.get('/specialties');
      if (response.data.success) {
        setSpecialties(response.data.specialties || []);
      }
    } catch (error) {}
  }, []);

  const fetchTopics = useCallback(async () => {
    try {
      const response = await api.get('/forum/topics');
      if (response.data.success || response.data.data) setTopics(response.data.data || response.data || []);
    } catch (error) {}
  }, []);

  useEffect(() => {
    fetchSpecialties();
    fetchTopics();
    fetchRecentTags();
  }, [fetchSpecialties, fetchTopics, fetchRecentTags]);

  // Lấy cài đặt hệ thống (Quyền tạo nhóm)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await communityService.getGroupSettings();
        if(res.data.success) setGroupSettings(res.data.data);
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  const fetchGroupsData = useCallback(async () => {
    setGroupLoading(true);
    try {
      const params = { limit: 20, page: 1 };
      if (groupSearch) params.search = groupSearch;
      if (groupFilter !== 'all') params.type = groupFilter;
      const res = await communityService.getGroups(params);
      const list = res?.data?.data?.groups || res?.data?.groups || [];
      setGroups(list);
      if (user) {
        const map = {};
        list.forEach(g => { if (g.members?.some(m => m.user_id === user.id)) map[g.id] = true; });
        setMembershipMap(map);
      }
    } catch (e) {} finally { setGroupLoading(false); }
  }, [groupSearch, groupFilter, user]);

  useEffect(() => {
    if (activeTab === 'community') fetchGroupsData();
  }, [activeTab, fetchGroupsData]);


  useEffect(() => {
    if(activeTab === 'forum') {
      fetchQuestions({ page: currentPage, specialty: selectedSpecialty, topic: selectedTopic, search: activeSearchTerm, tags: selectedTags });
    }
  }, [currentPage, selectedSpecialty, selectedTopic, selectedTags, activeSearchTerm, activeTab, fetchQuestions]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveSearchTerm(searchTerm.trim());
    fetchQuestions({ page: 1, search: searchTerm.trim() });
  };

  const filteredTagOptions = useMemo(() => {
    const keyword = tagSearchTerm.trim().toLowerCase();
    if (!keyword) return recentTags;
    return recentTags.filter((tag) => tag.toLowerCase().includes(keyword));
  }, [recentTags, tagSearchTerm]);

  const toggleFilterTag = (tag) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag];
      fetchQuestions({ page: 1, search: activeSearchTerm, specialty: selectedSpecialty, topic: selectedTopic, tags: newTags });
      return newTags;
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm(''); setSelectedSpecialty(''); setSelectedTopic(''); setSelectedTags([]);
    setTagSearchTerm(''); setActiveSearchTerm(''); setCurrentPage(1);
    fetchQuestions({ page: 1, search: '', specialty: '', topic: '', tags: [] });
  };

  const handleClearSearch = useCallback(() => {
    setSearchTerm(''); setActiveSearchTerm(''); setCurrentPage(1);
    fetchQuestions({ page: 1, specialty: selectedSpecialty, search: '', tags: selectedTags });
  }, [fetchQuestions, selectedSpecialty, selectedTags]);

  const handleClearSpecialty = useCallback(() => {
    setSelectedSpecialty(''); setCurrentPage(1);
    fetchQuestions({ page: 1, search: activeSearchTerm, specialty: '', tags: selectedTags });
  }, [fetchQuestions, activeSearchTerm, selectedTags]);

  const toggleTag = (tag) => {
    setQuestionForm((prev) => {
      const newTags = prev.tagList.includes(tag) ? prev.tagList.filter((t) => t !== tag) : [...prev.tagList, tag];
      return { ...prev, tagList: newTags, tags: newTags.join(', ') };
    });
  };

  const toggleSpecialty = (specialtyId) => {
    setQuestionForm((prev) => {
      const id = Number(specialtyId);
      const newSpecialties = prev.specialtyIds.includes(id) ? prev.specialtyIds.filter((s) => s !== id) : [...prev.specialtyIds, id];
      return { ...prev, specialtyIds: newSpecialties };
    });
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!user) {
      setAlert({ show: true, type: 'warning', title: 'Yêu cầu đăng nhập', message: 'Vui lòng đăng nhập để đặt câu hỏi' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    if (!questionForm.topicId) {
      setAlert({ show: true, type: 'warning', title: 'Thiếu thông tin', message: 'Vui lòng chọn chủ đề cho câu hỏi' });
      return;
    }
    try {
      const manualTags = questionForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const combinedTags = Array.from(new Set([...questionForm.tagList, ...manualTags]));
      const response = await api.post('/forum/questions', {
        title: questionForm.title,
        content: questionForm.content,
        topicId: Number(questionForm.topicId),
        specialtyIds: questionForm.specialtyIds,
        tags: combinedTags,
        isAnonymous: questionForm.isAnonymous,
        images: questionForm.images,
        attachments: questionForm.attachments
      });
      if (response.data.success) {
        const statusMsg = response.data.data?.status === 'pending'
          ? 'Câu hỏi của bạn đã được gửi và đang chờ duyệt!'
          : 'Câu hỏi của bạn đã được đăng thành công!';
        setAlert({ show: true, type: 'success', title: 'Thành công!', message: statusMsg });
        setShowAskModal(false);
        setQuestionForm(defaultQuestionForm);
        setPreviewImages([]);
        setPreviewFiles([]);
        setCurrentPage(1);
        await fetchQuestions({ page: 1 });
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', title: 'Lỗi', message: 'Có lỗi xảy ra khi gửi câu hỏi. Vui lòng thử lại!' });
    }
  };

  const handleOpenReport = (type, id, title) => {
    if (!user) {
      setAlert({ show: true, type: 'warning', title: 'Yêu cầu đăng nhập', message: 'Bạn cần đăng nhập để báo cáo vi phạm' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    setReportTarget({ type, id, title });
    setReportForm({ reason: '', description: '' });
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportForm.reason) return setAlert({ show: true, type: 'warning', title: 'Thiếu thông tin', message: 'Vui lòng chọn lý do báo cáo' });
    try {
      const response = await api.post('/forum/reports', {
        entityType: reportTarget.type,
        entityId: reportTarget.id,
        reason: reportForm.reason,
        description: reportForm.description
      });
      if (response.data.success) {
        setShowReportModal(false);
        setReportForm({ reason: '', description: '' });
        setAlert({ show: true, type: 'success', title: 'Báo cáo thành công!', message: response.data.message || 'Báo cáo đã được gửi đến quản trị viên.' });
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', title: 'Lỗi', message: error.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo' });
    }
  };

  const handleLikeQuestion = async (questionId, e) => {
    e.stopPropagation();
    if (!user) {
      setAlert({ show: true, type: 'warning', title: 'Yêu cầu đăng nhập', message: 'Bạn cần đăng nhập để thích câu hỏi' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    try {
      const response = await api.post(`/forum/questions/${questionId}/like`);
      if (response.data.success) {
        setQuestions(prev => prev.map(q =>
          q.id === questionId ? { ...q, likesCount: response.data.data.likesCount, isLiked: response.data.data.liked } : q
        ));
      }
    } catch (error) {}
  };

  const handleSaveQuestion = async (questionId, e) => {
    e.stopPropagation();
    if (!user) {
      setAlert({ show: true, type: 'warning', title: 'Yêu cầu đăng nhập', message: 'Bạn cần đăng nhập để lưu câu hỏi' });
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    try {
      const response = await api.post(`/forum/questions/${questionId}/save`);
      if (response.data.success) {
        setQuestions(prev => prev.map(q =>
          q.id === questionId ? { ...q, savesCount: response.data.data.savesCount, isSaved: response.data.data.saved } : q
        ));
      }
    } catch (error) {}
  };

  const handleJoinGroup = async (group) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await communityService.joinGroup(group.id);
      setAlert({ show: true, type: 'success', title: 'Thành công', message: res?.data?.message || 'Tham gia nhóm thành công!' });
      setMembershipMap(prev => ({ ...prev, [group.id]: true }));
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members_count: (g.members_count || 0) + 1 } : g));
    } catch (e) {
      setAlert({ show: true, type: 'error', title: 'Lỗi', message: e?.response?.data?.message || 'Lỗi khi tham gia nhóm' });
    }
  };

  const handleViewGroup = (group) => { navigate(`/cong-dong/nhom/${group.slug}`); };
  const handleQuestionClick = (questionId) => { navigate(`${FORUM_QUESTION_ROUTE}/${questionId}`); };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Chưa cập nhật';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
    const now = new Date(); const diffMs = now - date;
    if (diffMs < 0) return date.toLocaleDateString('vi-VN');
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // CHECK QUYỀN TẠO NHÓM
  const userRole = user?.role?.name?.toLowerCase() || user?.role?.toLowerCase();
  const isPrivileged = ['admin', 'staff', 'doctor'].includes(userRole);
  const canCreateGroup = user && (isPrivileged || groupSettings.allowUserCreateGroup);

  return (
    <div className="forumpage-root">
      {/* HEADER BANNER CỐ ĐỊNH */}
      <ForumBanner />

      {/* TABS ĐIỀU HƯỚNG CỐ ĐỊNH (React Router) */}
      <div className="forumpage-main-tabs forumpage-container">
        <button className={`forumpage-main-tab ${activeTab === 'forum' ? 'active' : ''}`} onClick={() => handleTabChange('forum')}>
          <FaComments /> Diễn đàn Q&amp;A
        </button>
        <button className={`forumpage-main-tab ${activeTab === 'community' ? 'active' : ''}`} onClick={() => handleTabChange('community')}>
          <FaUsers /> Nhóm cộng đồng
        </button>
      </div>

      {/* NỘI DUNG THAY ĐỔI THEO TAB */}

      {/* 1. TAB: NHÓM CỘNG ĐỒNG */}
      {activeTab === 'community' && (
        <div className="forumpage-community-tab forumpage-container">
          <div className="forumpage-community-toolbar">
            <input type="text" placeholder="Tìm nhóm theo tên..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)} className="forumpage-community-search" />
            <div className="forumpage-community-filters">
              {[['all', 'Tất cả'], ['official', 'Chính thống ✓'], ['community', 'Cộng đồng']].map(([v, l]) => (
                <button key={v} className={`forumpage-community-filter-btn ${groupFilter === v ? 'active' : ''}`} onClick={() => setGroupFilter(v)}>{l}</button>
              ))}
            </div>
            {canCreateGroup && (
              <button className="forumpage-btn-primary" style={{ padding: '9px 18px', fontSize: '14px' }} onClick={() => setShowCreateGroupModal(true)}>
                + Tạo nhóm mới
              </button>
            )}
          </div>
          
          {groupLoading ? (
             <div className="forumpage-panel--loading"><div className="forumpage-spinner"></div>Đang tải nhóm...</div>
          ) : groups.length === 0 ? (
            <div className="forumpage-empty-state"><FaUsers size={48} /><h3>Chưa có nhóm nào</h3><p>Hãy là người đầu tiên tạo nhóm.</p></div>
          ) : (
            <div className="forumpage-groups-grid">
              {groups.map(g => (
                <div key={g.id} className="forumpage-group-card">
                  <div className="forumpage-group-cover" style={{ background: g.cover_image ? `url(${g.cover_image.startsWith('http') ? g.cover_image : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${g.cover_image}`}) center/cover` : 'linear-gradient(135deg,#4CAF50,#2E7D32)' }}>
                    <span className="forumpage-group-icon">{!g.cover_image && (GROUP_ICONS_MAP[g.icon] || <FaUsers />)}</span>
                    {g.type === 'official' && <span className="forumpage-group-official">✓ Chính thống</span>}
                  </div>
                  <div className="forumpage-group-body">
                    <h4>{g.name}</h4><p>{g.description || 'Nhóm cộng đồng sức khỏe'}</p>
                    <div className="forumpage-group-meta">
                      <span>{g.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                      <span><FaUsers /> {g.members_count || 0} thành viên</span>
                    </div>
                    <div className="forumpage-group-actions">
                      <button className="forumpage-btn-outline" onClick={() => handleViewGroup(g)}>Xem nhóm</button>
                      {!membershipMap[g.id] && g.privacy !== 'invite_only' && (
                        <button className="forumpage-btn-primary" onClick={() => handleJoinGroup(g)}>
                          {g.privacy === 'public' ? 'Tham gia' : 'Gửi yêu cầu'}
                        </button>
                      )}
                      {membershipMap[g.id] && <span className="forumpage-group-joined">✓ Đã tham gia</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. TAB: DIỄN ĐÀN Q&A (GIỮ NGUYÊN 100% GIAO DIỆN CŨ) */}
      {activeTab === 'forum' && (
        <>
          <FilterBar
            searchTerm={searchTerm} setSearchTerm={setSearchTerm} handleSearch={handleSearch}
            selectedTopic={selectedTopic} setSelectedTopic={(val) => { setSelectedTopic(val); setCurrentPage(1); fetchQuestions({ page: 1, search: activeSearchTerm, specialty: selectedSpecialty, topic: val, tags: selectedTags }); }}
            selectedSpecialty={selectedSpecialty} setSelectedSpecialty={(val) => { setSelectedSpecialty(val); setCurrentPage(1); fetchQuestions({ page: 1, search: activeSearchTerm, specialty: val, topic: selectedTopic, tags: selectedTags }); }}
            topics={topics} specialties={specialties} clearFilters={clearFilters} activeSearchTerm={activeSearchTerm}
            selectedSpecialtyName={selectedSpecialtyName} selectedTags={selectedTags}
            handleClearSearch={handleClearSearch} handleClearSpecialty={handleClearSpecialty} toggleFilterTag={toggleFilterTag}
          />

          <section className="forumpage-content forumpage-container">
            <main className="forumpage-feed">
              <div className="forumpage-create-card">
                <div className="forumpage-create-card__icon"><FaQuestionCircle /></div>
                <button type="button" className="forumpage-create-card__prompt" onClick={() => setShowAskModal(true)}>
                  Bạn đang có thắc mắc gì về sức khỏe? Đặt câu hỏi ngay...
                </button>
                <button type="button" className="forumpage-create-card__submit" onClick={() => setShowAskModal(true)}>Đặt câu hỏi</button>
              </div>

              {loading ? (
                <div className="forumpage-panel--loading"><div className="forumpage-spinner"></div>Đang tải dữ liệu...</div>
              ) : questions.length === 0 ? (
                <div className="forumpage-empty-state"><FaQuestionCircle size={56} /><h3>Chưa có câu hỏi nào phù hợp</h3><p>Hãy trở thành người đầu tiên chia sẻ câu hỏi về chủ đề này.</p><button className="forumpage-btn-outline" onClick={() => setShowAskModal(true)}>Đặt câu hỏi mới</button></div>
              ) : (
                <div className="forumpage-post-feed">
                  {questions.map((question) => {
                      const rawContent = (question.content || '').trim();
                      const preview = rawContent.length > 220 ? `${rawContent.substring(0, 220)}...` : rawContent;
                      const questionDate = question.createdAt || question.created_at || question.approvedAt || question.approved_at;
                      return (
                        <article key={question.id} className="forumpage-post-card" onClick={() => handleQuestionClick(question.id)}>
                          {/* Vote column */}
                          <div className="forumpage-post-card__vote" onClick={(e) => e.stopPropagation()}>
                            <button type="button"><FaArrowUp /></button>
                            <span>{question.answersCount || question.answerCount || 0}</span>
                            <button type="button"><FaArrowDown /></button>
                          </div>

                          {/* Body */}
                          <div className="forumpage-post-card__body">
                            <header className="forumpage-post-card__meta">
                              {question.topic && (
                                <span className="forumpage-post-card__topic">{question.topic.title}</span>
                              )}
                              <span className="dot">•</span>
                              <span className="forumpage-post-card__author">
                                {question.isAnonymous ? 'Ẩn danh' : (question.author?.full_name || question.author?.fullName || 'Người dùng')}
                              </span>
                              <span className="dot">•</span>
                              <span className="forumpage-post-card__time">{formatDate(questionDate)}</span>
                              {question.isPinned && (
                                <span className="forumpage-post-card__pinned"><FaStar /> Nổi bật</span>
                              )}
                            </header>

                            <h3 className="forumpage-post-card__title">{question.title}</h3>
                            {preview && <p className="forumpage-post-card__excerpt">{preview}</p>}

                            {Array.isArray(question.images) && question.images.length > 0 && (
                              <div className="forumpage-post-card__gallery">
                                {question.images.slice(0, 3).map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img && img.startsWith('http') ? img : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${img?.startsWith('/') ? '' : '/'}${img}`}
                                    alt={`Minh họa ${idx + 1}`}
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=Anh'; }}
                                  />
                                ))}
                                {question.images.length > 3 && <span className="forumpage-gallery-count">+{question.images.length - 3}</span>}
                              </div>
                            )}

                            <footer className="forumpage-post-card__footer">
                              <span className="forumpage-post-card__stat"><FaComments /> {question.answersCount || question.answerCount || 0}</span>
                              <span className="forumpage-post-card__stat"><FaEye /> {question.viewsCount || 0}</span>
                              {question.specialty && (
                                <span className="forumpage-post-card__specialty">{question.specialty.name}</span>
                              )}
                              <button
                                type="button"
                                className={`forumpage-post-card__action-btn ${question.isLiked ? 'active' : ''}`}
                                onClick={(e) => handleLikeQuestion(question.id, e)}
                                title={question.isLiked ? 'Bỏ thích' : 'Thích'}
                              >
                                {question.isLiked ? <FaHeart /> : <FaRegHeart />}
                                <span>{question.likesCount || 0}</span>
                              </button>
                              <button
                                type="button"
                                className={`forumpage-post-card__action-btn ${question.isSaved ? 'active' : ''}`}
                                onClick={(e) => handleSaveQuestion(question.id, e)}
                                title={question.isSaved ? 'Bỏ lưu' : 'Lưu'}
                              >
                                {question.isSaved ? <FaBookmark /> : <FaRegBookmark />}
                              </button>
                              <button
                                type="button"
                                className="forumpage-post-card__report-btn"
                                onClick={(e) => { e.stopPropagation(); handleOpenReport('question', question.id, question.title); }}
                                title="Báo cáo vi phạm"
                              >
                                <FaExclamationTriangle />
                              </button>
                            </footer>

                            {Array.isArray(question.tags) && question.tags.length > 0 && (
                              <div className="forumpage-post-card__tags">
                                {question.tags.slice(0, 5).map((tag, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    className="forumpage-post-card__tag-btn"
                                    onClick={(e) => { e.stopPropagation(); toggleFilterTag(tag); }}
                                  >
                                    #{tag}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                </div>
              )}

              {totalPages > 1 && !loading && (
                <div className="forumpage-pagination">
                  <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>← Trang trước</button>
                  <span>Trang <strong>{currentPage}</strong> / {totalPages}</span>
                  <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Trang sau →</button>
                </div>
              )}
            </main>

            <aside className="forumpage-sidebar">
              <div className="forumpage-sidebar-card">
                <h3><FaTags /> Tags phổ biến gần đây</h3>
                <p>Lọc nhanh theo chủ đề bạn quan tâm</p>
                <div className="forumpage-sidebar-search">
                  <FaSearch />
                  <input type="text" placeholder="Tìm tag..." value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)} />
                </div>
                <div className="forumpage-sidebar-tags">
                  {filteredTagOptions.length === 0 ? (
                    <span className="forumpage-sidebar-tags__empty">Không tìm thấy tag phù hợp</span>
                  ) : (
                    filteredTagOptions.map((tag) => (
                      <button key={tag} type="button" className={`forumpage-sidebar-tag ${selectedTags.includes(tag) ? 'active' : ''}`} onClick={() => toggleFilterTag(tag)}>
                        #{tag}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="forumpage-sidebar-card forumpage-sidebar-tips">
                <h3>💡 Mẹo đặt câu hỏi hay</h3>
                <ul>
                  <li>Nêu rõ triệu chứng, thời gian và mức độ ảnh hưởng.</li>
                  <li>Chia sẻ xét nghiệm hoặc hình ảnh để bác sĩ dễ tư vấn.</li>
                  <li>Chọn đúng chuyên khoa giúp câu hỏi được phản hồi nhanh.</li>
                </ul>
              </div>
            </aside>
          </section>
        </>
      )}

      {/* POPUP: Đặt Câu Hỏi */}
      <AskQuestionModal show={showAskModal} onClose={() => { setShowAskModal(false); setPreviewImages([]); setPreviewFiles([]); }} onSubmit={handleAskQuestion} questionForm={questionForm} setQuestionForm={setQuestionForm} topics={topics} specialties={specialties} formTags={formTags} toggleTag={toggleTag} toggleSpecialty={toggleSpecialty} previewImages={previewImages} setPreviewImages={setPreviewImages} uploading={uploading} setUploading={setUploading} previewFiles={previewFiles} setPreviewFiles={setPreviewFiles} setAlert={setAlert} />

      {/* POPUP: TẠO NHÓM MỚI */}
      {showCreateGroupModal && canCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onSuccess={() => {
            setShowCreateGroupModal(false);
            setShowSuccessPopup(true);
            if(activeTab === 'community') fetchGroupsData(); 
          }}
        />
      )}

      {/* POPUP THÔNG BÁO TẠO THÀNH CÔNG */}
      {showSuccessPopup && (
        <div className="forumpage-modal-overlay" style={{ zIndex: 2000 }}>
          <div className="forumpage-modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px 24px', borderRadius: '16px' }}>
            <FaCheckCircle color="#4CAF50" size={64} style={{ marginBottom: '16px' }} />
            <h2 style={{ margin: '0 0 12px', color: '#2E7D32', fontSize: '1.4rem' }}>Tạo nhóm thành công!</h2>
            <p style={{ color: '#555', marginBottom: '24px', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Nhóm cộng đồng của bạn đã được gửi đi. Nếu bạn không phải là Quản trị viên, nhóm sẽ nằm ở trạng thái <strong style={{ color: '#f57c00' }}>Chờ duyệt</strong> trước khi hiển thị công khai.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button className="forumpage-btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => { setShowSuccessPopup(false); handleTabChange('my_groups'); }}>
                <FaEye /> Xem nhóm chờ duyệt
              </button>
              <button className="forumpage-btn-muted" style={{ width: '100%', padding: '12px', justifyContent: 'center' }} onClick={() => setShowSuccessPopup(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: Báo cáo */}
      {showReportModal && (
        <div className="forumpage-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="forumpage-modal" onClick={(e) => e.stopPropagation()}>
            <header className="forumpage-modal__header">
              <div className="forumpage-modal__header-info">
                <FaExclamationTriangle className="forumpage-modal__header-icon" style={{ color: '#e74c3c' }} />
                <div>
                  <h2 className="forumpage-modal__title">Báo cáo vi phạm</h2>
                </div>
              </div>
              <button type="button" className="forumpage-modal__close" onClick={() => setShowReportModal(false)}><FaTimes /></button>
            </header>
            <form onSubmit={handleSubmitReport} className="forumpage-modal__form">
              <div className="forumpage-form-section">
                <div className="forumpage-form-group">
                  <label>Bạn đang báo cáo</label>
                  <div className="forumpage-report-target">"{reportTarget.title}"</div>
                </div>
                <div className="forumpage-form-group">
                  <label>Lý do báo cáo <span className="forumpage-required">*</span></label>
                  <div className="forumpage-filterbar-select-wrap">
                    <select value={reportForm.reason} onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })} required>
                      <option value="">-- Chọn lý do --</option>
                      <option value="spam">Spam / Quảng cáo</option>
                      <option value="inappropriate">Nội dung không phù hợp</option>
                      <option value="misleading">Thông tin sai lệch</option>
                      <option value="offensive">Xúc phạm / Thô tục</option>
                      <option value="other">Lý do khác</option>
                    </select>
                    <FaChevronDown className="forumpage-select-arrow" />
                  </div>
                </div>
                <div className="forumpage-form-group">
                  <label>Mô tả chi tiết <span className="forumpage-form-label-optional">(tùy chọn)</span></label>
                  <textarea rows="4" placeholder="Vui lòng mô tả rõ hơn về vấn đề..." value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} />
                </div>
              </div>
              <div className="forumpage-modal__actions">
                <button type="button" className="forumpage-btn-muted" onClick={() => setShowReportModal(false)}>Hủy</button>
                <button type="submit" className="forumpage-btn-primary">Gửi báo cáo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CustomAlert show={alert.show} type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} autoCloseDuration={5000} />
    </div>
  );
};

export default ForumPage;
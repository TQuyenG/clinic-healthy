// ArticleManagementPage.js — VERSION 9.0
// Layout 3 cột: [Ảnh bìa | Phân loại/Tags/Liên kết | Nội dung+Preview]
// AI spinner có animation (brain pulse + ring + dots)
// Tất cả popup khi đóng/click-outside → hiện confirm "Bạn muốn đóng?"
// Scroll lock body khi popup mở
// Bộ lọc cascade category_type → category_id (giống DoctorsListPage)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, FaTimes,
  FaSortAmountDown, FaSortAmountUp, FaCheck, FaBan, FaRedo,
  FaNewspaper, FaPills, FaDisease, FaFileAlt, FaCopy, FaHistory,
  FaPaperPlane, FaSave, FaSpinner, FaClock,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaUser,
  FaInfoCircle, FaImage, FaUpload, FaLink, FaTags, FaFileImport,
  FaFileExcel, FaFileCsv, FaMagic, FaAlignLeft, FaCog,
  FaHospital, FaStethoscope, FaLayerGroup, FaBookOpen,
  FaBrain, FaLanguage, FaListUl, FaWrench, FaRobot,
  FaExpandAlt, FaExternalLinkAlt, FaQuestionCircle,
} from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import { BiLoaderAlt } from 'react-icons/bi';
import usePermissions from '../hooks/usePermissions';
import './ArticleManagementPage.css';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const Portal = ({ children }) => (typeof document !== 'undefined' ? createPortal(children, document.body) : null);

function getColumnName(key) {
  const names = {
    id: 'ID', title: 'Tiêu đề', tags: 'Tags', category: 'Danh mục',
    status: 'Trạng thái', author: 'Tác giả', created_at: 'Ngày tạo', views: 'Lượt xem',
  };
  return names[key] || key;
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────
const ArticleManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE_URL = process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001';
  const { user: authUser, canAccessModule, hasPermission, isAdmin } = usePermissions();

  // ── STATE ──────────
  const [user, setUser] = useState({});
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [articleToHide, setArticleToHide] = useState(null);
  const [hideReason, setHideReason] = useState('');
  const [hidingArticle, setHidingArticle] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Close confirm popup — dùng chung cho mọi popup
  const [closeConfirm, setCloseConfirm] = useState({ visible: false, onConfirm: null, title: '', message: '' });

  // ── FILTERS — cascade như DoctorsListPage ──
  const [filters, setFilters] = useState({
    search: '', status: '', category_id: '', category_type: '', page: 1, limit: 10,
    sort_by: 'created_at', sort_order: 'DESC'
  });

  const initialFormData = useMemo(() => ({
    title: '', content: '', category_id: '', tags_json: [], source: '',
    entity_id: null, entity_type: null,
    specialty_id: '', is_medical_review_required: false, medical_reviewer_id: null
  }), []);

  const [formData, setFormData] = useState(initialFormData);
  const [coverImage, setCoverImage] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [imageUploadMethod, setImageUploadMethod] = useState('file');
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({ total: 0, draft: 0, pending: 0, approved: 0, rejected: 0, hidden: 0 });
  const [tagInput, setTagInput] = useState('');
  const [selectedCategoryType, setSelectedCategoryType] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [deleteArticleId, setDeleteArticleId] = useState(null);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [articleToReject, setArticleToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [showAdminEditWarning, setShowAdminEditWarning] = useState(false);
  const [editingApprovedArticle, setEditingApprovedArticle] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchingEntity, setSearchingEntity] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [assignedDoctor, setAssignedDoctor] = useState(null);
  const [showDoctorSelectionModal, setShowDoctorSelectionModal] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const selectedMedicalReviewer = useMemo(() => {
    if (assignedDoctor) return assignedDoctor;
    if (!formData.medical_reviewer_id) return null;
    return availableDoctors.find(doctor => String(doctor.id) === String(formData.medical_reviewer_id)) || null;
  }, [assignedDoctor, availableDoctors, formData.medical_reviewer_id]);
  const [showReportsPopup, setShowReportsPopup] = useState(false);
  const [articleToReport, setArticleToReport] = useState(null);
  const [reportItems, setReportItems] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // AI States
  const [showAISupportMenu, setShowAISupportMenu] = useState(false);
  const [selectedAIOption, setSelectedAIOption] = useState(null);
  const [customAIPrompt, setCustomAIPrompt] = useState('');
  const [aiPreviewData, setAiPreviewData] = useState(null);
  const [showAIWarning, setShowAIWarning] = useState(false);

  // Preview popup
  const [showPreviewPopup, setShowPreviewPopup] = useState(false);

  const DELETE_COUNTDOWN = 5;
  const HIDE_COUNTDOWN = 5;

  // ─────────────────────────────────────────
  // CLOSE CONFIRM HELPER
  // Dùng thay cho window.confirm — hiện popup đẹp hỏi xác nhận đóng
  // ─────────────────────────────────────────
  const askCloseConfirm = (title, message, onConfirm) => {
    setCloseConfirm({ visible: true, onConfirm, title, message });
  };
  const handleCloseConfirmOk = () => {
    closeConfirm.onConfirm?.();
    setCloseConfirm({ visible: false, onConfirm: null, title: '', message: '' });
  };
  const handleCloseConfirmCancel = () => {
    setCloseConfirm({ visible: false, onConfirm: null, title: '', message: '' });
  };

  // ─────────────────────────────────────────
  // HELPERS JSX
  // ─────────────────────────────────────────
  const getStatusText = (status) => {
    const m = {
      draft: 'Nháp', pending: 'Chờ duyệt', pending_medical: 'Chờ BS duyệt',
      approved: 'Đã duyệt', rejected: 'Từ chối', hidden: 'Đã ẩn',
      request_edit: 'Yêu cầu sửa', request_rewrite: 'Viết lại'
    };
    return m[status] || status;
  };

  const getStatusClass = (status) => {
    const m = {
      draft: 'article-mgmt-status-draft', pending: 'article-mgmt-status-pending',
      pending_medical: 'article-mgmt-status-pending', approved: 'article-mgmt-status-approved',
      rejected: 'article-mgmt-status-rejected', hidden: 'article-mgmt-status-hidden',
      request_edit: 'status-request-edit', request_rewrite: 'status-request-rewrite'
    };
    return m[status] || '';
  };

  const getCategoryIcon = (type) => {
    const m = { tin_tuc: <FaNewspaper />, thuoc: <FaPills />, benh_ly: <FaDisease /> };
    return m[type] || <FaFileAlt />;
  };

  const getFirstImageFromContent = useCallback((html) => {
    if (!html) return null;
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const img = doc.querySelector('img');
      const src = img?.getAttribute('src');
      if (src && (src.startsWith('http') || src.startsWith('/uploads')))
        return src.startsWith('/uploads') ? `${API_BASE_URL}${src}` : src;
      return null;
    } catch { return null; }
  }, [API_BASE_URL]);

  // ─────────────────────────────────────────
  // TOAST & CONFIRM
  // ─────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const showConfirm = (title, message, onConfirm, confirmText = 'Xác nhận', type = 'warning') => {
    setConfirmAction({ title, message, onConfirm, confirmText, type });
    setShowConfirmDialog(true);
  };
  const closeConfirmDialog = () => { setShowConfirmDialog(false); setConfirmAction(null); };
  const handleConfirm = () => { confirmAction?.onConfirm(); closeConfirmDialog(); };

  // ─────────────────────────────────────────
  // CKEDITOR UPLOAD ADAPTER
  // ─────────────────────────────────────────
  class MyUploadAdapter {
    constructor(loader) { this.loader = loader; }
    upload() {
      return this.loader.file.then(file => new Promise((resolve, reject) => {
        if (!file) return reject('Không có file');
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) return reject('Chỉ hỗ trợ JPEG/PNG/GIF/WEBP');
        if (file.size > 5 * 1024 * 1024) return reject('File quá lớn, tối đa 5MB');
        const fd = new FormData(); fd.append('upload', file);
        axios.post(`${API_BASE_URL}/api/upload/ckeditor-image`, fd, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
        }).then(r => { if (r.data.uploaded && r.data.url) resolve({ default: r.data.url }); else reject(r.data.message || 'Upload thất bại'); })
          .catch(e => reject(e.response?.data?.message || 'Lỗi server'));
      }));
    }
    abort() { }
  }
  function MyCustomUploadAdapterPlugin(editor) {
    try { const fr = editor.plugins.get('FileRepository'); if (fr) fr.createUploadAdapter = l => new MyUploadAdapter(l); } catch { }
  }

  // ─────────────────────────────────────────
  // LIFECYCLE & FETCH
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    if (isAdmin || canAccessModule('articles')) return;
    navigate('/404');
  }, [authUser, isAdmin]);

  useEffect(() => { fetchUserInfo(); fetchCategories(); }, []);
  useEffect(() => { fetchArticles(); }, [filters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status) {
      setFilters(prev => ({ ...prev, status, page: 1 }));
    }
  }, [location.search]);

  // Scroll lock — bao gồm cả closeConfirm popup (fix sidebar scroll bug)
  useEffect(() => {
    const anyOpen = showModal || showHidePopup || showRejectPopup || showAdminEditWarning
      || showSubmitConfirm || showDoctorSelectionModal || showAISupportMenu
      || showAIWarning || showPreviewPopup || closeConfirm.visible;
    
    if (anyOpen) {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollTop}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollTop);
      };
    }
  }, [showModal, showHidePopup, showRejectPopup, showAdminEditWarning,
    showSubmitConfirm, showDoctorSelectionModal, showAISupportMenu,
    showAIWarning, showPreviewPopup, closeConfirm.visible]);

  useEffect(() => {
    if (countdownSeconds > 0) { const t = setTimeout(() => setCountdownSeconds(p => p - 1), 1000); return () => clearTimeout(t); }
  }, [countdownSeconds]);

  useEffect(() => {
    if (!formData.specialty_id || !formData.is_medical_review_required) {
      setAvailableDoctors([]); setAssignedDoctor(null); setLoadingDoctors(false); return;
    }
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        console.log(`[ArticleManagementPage] Fetching doctors for specialty_id: ${formData.specialty_id}`);
        const r = await axios.get(`${API_BASE_URL}/api/specialties/${formData.specialty_id}/doctors`);
        
        console.log('[ArticleManagementPage] Response:', {
          status: r.status,
          success: r.data.success,
          doctorsCount: (r.data.doctors || r.data.data || []).length,
          response: r.data
        });
        
        if (r.data.success) {
          const docs = r.data.doctors || r.data.data || [];
          console.log('[ArticleManagementPage] Raw doctors:', docs);
          
          // Map về cấu trúc giống DoctorsListPage để hiện avatar, tên, pending_count
          const mapped = docs.map(d => ({
            id: d.id,
            user_id: d.user_id || d.user?.id || d.id,
            pending_count: d.pending_count || 0,
            specialty: d.specialty || { name: d.specialty_name || '' },
            user: {
              full_name: d.full_name || d.user?.full_name,
              avatar_url: d.avatar_url || d.user?.avatar_url,
            }
          }));
          
          console.log('[ArticleManagementPage] Mapped doctors:', mapped);
          setAvailableDoctors(mapped);

          if (formData.medical_reviewer_id) {
            const currentReviewer = mapped.find(doctor => String(doctor.id) === String(formData.medical_reviewer_id));
            if (currentReviewer) {
              setAssignedDoctor(currentReviewer);
            }
          }
        } else {
          console.warn('[ArticleManagementPage] Response success=false:', r.data);
          setAvailableDoctors([]);
        }
      } catch (e) {
        console.error('[ArticleManagementPage] fetchDoctors error:', e.message, e.response?.data);
        setAvailableDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, [formData.specialty_id, formData.is_medical_review_required]);

  const fetchUserInfo = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/users/profile`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (r.data.success) setUser(r.data.user);
    } catch { }
  };

  const fetchCategories = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/articles/categories`);
      if (r.data.success) setCategories(r.data.categories || []);
      const sr = await axios.get(`${API_BASE_URL}/api/specialties`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (sr.data?.success) setSpecialties(sr.data.specialties);
    } catch { }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
      const r = await axios.get(`${API_BASE_URL}/api/articles`, {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (r.data.success) {
        setArticles(r.data.articles || []);
        setPagination(r.data.pagination || {});
        if (r.data.stats) setStats(r.data.stats);
      }
    } catch { showToast('Không thể tải danh sách bài viết', 'error'); }
    finally { setLoading(false); }
  };

  // ─────────────────────────────────────────
  // FILTER HANDLERS — cascade category_type → category_id (như DoctorsListPage)
  // ─────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category_type') {
      // Khi đổi loại bài → reset category_id về '' (giống DoctorsListPage reset specialty_id)
      setFilters(prev => ({ ...prev, category_type: value, category_id: '', page: 1 }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    }
  };

  const clearFilters = () => setFilters({
    search: '', status: '', category_id: '', category_type: '', page: 1, limit: 10,
    sort_by: 'created_at', sort_order: 'DESC'
  });

  // ─────────────────────────────────────────
  // AI ANALYZE
  // ─────────────────────────────────────────
  const handleAIAnalyze = () => {
    if (!formData.title && !formData.content) {
      showToast('Nhập tiêu đề hoặc nội dung để AI hỗ trợ', 'warning');
      return;
    }
    setSelectedAIOption(null); setCustomAIPrompt(''); setShowAISupportMenu(true);
  };

  const handleAIOptionSelect = async (option) => {
    setSelectedAIOption(option);
    setAnalyzingAI(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/articles/ai-analyze`,
        {
          title: formData.title, content: formData.content, ai_task: option,
          custom_prompt: option === 'custom' ? customAIPrompt : undefined
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data.success) {
        setAiPreviewData(res.data.data);
        setShowAISupportMenu(false);
        setShowAIWarning(true);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'AI phân tích thất bại', 'error');
    } finally {
      setAnalyzingAI(false); setSelectedAIOption(null);
    }
  };

  const handleApplyAIChanges = () => {
    if (!aiPreviewData) return;
    const updates = aiPreviewData;
    if (updates.suggested_category_type) setSelectedCategoryType(updates.suggested_category_type);
    let finalCategoryId = updates.suggested_category_id || null;
    if (!finalCategoryId && updates.suggested_category_type) {
      const firstOfType = categories.find(c => c.category_type === updates.suggested_category_type);
      if (firstOfType) finalCategoryId = firstOfType.id;
    }
    setFormData(prev => ({
      ...prev,
      title: updates.suggested_title !== undefined ? updates.suggested_title : prev.title,
      content: updates.suggested_content !== undefined ? updates.suggested_content : prev.content,
      tags_json: updates.suggested_tags?.length ? updates.suggested_tags : prev.tags_json,
      specialty_id: updates.suggested_specialty_id || prev.specialty_id,
      category_type: updates.suggested_category_type || prev.category_type,
      category_id: finalCategoryId || prev.category_id
    }));
    setHasUnsavedChanges(true);
    showToast('Đã áp dụng gợi ý AI', 'success');
    setShowAIWarning(false); setAiPreviewData(null); setSelectedAIOption(null);
  };

  // ─────────────────────────────────────────
  // ENTITY SEARCH
  // ─────────────────────────────────────────
  const handleEntitySearch = async (term) => {
    setEntitySearch(term);
    if (!term || term.trim().length < 2) { setEntitySearchResults([]); return; }
    const eType = selectedCategoryType === 'thuoc' ? 'medicine' : selectedCategoryType === 'benh_ly' ? 'disease' : null;
    if (!eType) return;
    try {
      setSearchingEntity(true);
      const ep = eType === 'medicine'
        ? `/api/articles/medicines?search=${encodeURIComponent(term)}&limit=10&hidden=false`
        : `/api/articles/diseases?search=${encodeURIComponent(term)}&limit=10&hidden=false`;
      const r = await axios.get(`${API_BASE_URL}${ep}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (r.data.success) setEntitySearchResults(r.data.medicines || r.data.diseases || []);
    } catch { setEntitySearchResults([]); }
    finally { setSearchingEntity(false); }
  };

  const handleSelectEntity = (entity) => {
    setSelectedEntity(entity);
    setFormData(prev => ({
      ...prev, entity_id: entity.id,
      entity_type: selectedCategoryType === 'thuoc' ? 'medicine' : 'disease',
      title: prev.title || `Thông tin về ${entity.name}`,
      tags_json: prev.tags_json.length === 0 ? [entity.name, entity.Category?.name || ''].filter(Boolean) : prev.tags_json
    }));
    setEntitySearch(''); setEntitySearchResults([]); setHasUnsavedChanges(true);
    showToast(`Đã liên kết với ${entity.name}`, 'success');
  };

  const handleClearEntity = () => {
    setSelectedEntity(null);
    setFormData(prev => ({ ...prev, entity_id: null, entity_type: null }));
    setEntitySearch(''); setEntitySearchResults([]); setHasUnsavedChanges(true);
  };

  // ─────────────────────────────────────────
  // MODAL HANDLERS
  // ─────────────────────────────────────────
  const openCreateModal = () => {
    setEntitySearch(''); setEntitySearchResults([]); setSelectedEntity(null);
    setFormData(initialFormData); setSelectedCategoryType('');
    setCoverImage(null); setTempImageUrl(''); setImageUploadMethod('file');
    setAssignedDoctor(null); setAnalyzingAI(false); setAvailableDoctors([]);
    setModalType('create'); setSelectedArticle(null); setHasUnsavedChanges(false);
    setShowModal(true);
  };

  const handleOpenModal = (type, article = null) => {
    setEntitySearch(''); setEntitySearchResults([]); setSelectedEntity(null);
    setModalType(type); setHasUnsavedChanges(false);
    if (type === 'create') { openCreateModal(); return; }
    if (type === 'edit' && article) {
      if (article.status === 'approved' && user.role === 'admin') {
        setEditingApprovedArticle(article); setShowAdminEditWarning(true); return;
      }
      const a = articles.find(x => x.id === article.id);
      if (!a) { showToast('Không tìm thấy bài viết', 'error'); return; }
      setSelectedArticle(a);
      let linkedEntity = null;
      if (a.entity_type === 'medicine' && a.medicine) linkedEntity = a.medicine;
      else if (a.entity_type === 'disease' && a.disease) linkedEntity = a.disease;
      setSelectedEntity(linkedEntity);
      const cat = categories.find(c => c.id === a.category_id);
      setSelectedCategoryType(cat?.category_type || '');
      setFormData({
        title: a.title || '', content: a.content || '', category_id: a.category_id || '',
        tags_json: Array.isArray(a.tags_json) ? a.tags_json : [], source: a.source || '',
        entity_id: a.entity_id || null, entity_type: a.entity_type || null,
        specialty_id: a.specialty_id || '', is_medical_review_required: a.is_medical_review_required || false,
        medical_reviewer_id: a.medical_reviewer_id || null
      });
      const finalImg = a.cover_image_url || linkedEntity?.image_url || null;
      setCoverImage(finalImg); setTempImageUrl(finalImg || '');
      setImageUploadMethod(finalImg ? (finalImg.startsWith('http') ? 'url' : 'file') : 'file');
      setShowModal(true);
    }
  };

  // Đóng modal form chính — hỏi xác nhận nếu có thay đổi
  const handleCloseModal = () => {
    const doClose = () => {
      setShowModal(false); setModalType(''); setSelectedArticle(null); setHasUnsavedChanges(false);
      setEntitySearch(''); setEntitySearchResults([]); setSelectedEntity(null);
      setShowPreviewPopup(false);
    };
    if (hasUnsavedChanges) {
      askCloseConfirm(
        'Đóng form?',
        'Bạn có thay đổi chưa lưu. Đóng form sẽ mất toàn bộ nội dung đang chỉnh sửa.',
        doClose
      );
    } else {
      doClose();
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  const handleCategoryTypeChange = (e) => {
    const t = e.target.value;
    setSelectedCategoryType(t);
    setFormData(prev => ({ ...prev, category_id: '', entity_id: null, entity_type: null }));
    setSelectedEntity(null); setEntitySearch(''); setEntitySearchResults([]);
    setHasUnsavedChanges(true);
  };

  const handleCategoryChange = (e) => {
    setFormData(prev => ({ ...prev, category_id: e.target.value, entity_id: null, entity_type: null }));
    setSelectedEntity(null); setEntitySearch(''); setEntitySearchResults([]);
    setHasUnsavedChanges(true);
  };

  const handleCoverImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return showToast('Chỉ hỗ trợ JPEG/PNG/GIF/WEBP', 'error');
    if (file.size > 5 * 1024 * 1024) return showToast('File quá lớn, tối đa 5MB', 'error');
    try {
      setUploadingCover(true);
      const fd = new FormData(); fd.append('image', file);
      const r = await axios.post(`${API_BASE_URL}/api/upload/image`, fd, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' }
      });
      if (r.data.success) { setCoverImage(r.data.url); setTempImageUrl(r.data.url); showToast('Upload ảnh thành công', 'success'); setHasUnsavedChanges(true); }
    } catch { showToast('Upload ảnh thất bại', 'error'); }
    finally { setUploadingCover(false); }
  };

  const handleImageUrlSubmit = () => {
    if (!tempImageUrl.trim()) return showToast('Nhập URL ảnh', 'error');
    try { new URL(tempImageUrl); setCoverImage(tempImageUrl); showToast('Đã thêm ảnh từ URL', 'success'); setHasUnsavedChanges(true); }
    catch { showToast('URL không hợp lệ', 'error'); }
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (!t || formData.tags_json.includes(t)) return;
    setFormData(prev => ({ ...prev, tags_json: [...prev.tags_json, t] }));
    setTagInput(''); setHasUnsavedChanges(true);
  };
  const handleRemoveTag = (tag) => {
    setFormData(prev => ({ ...prev, tags_json: prev.tags_json.filter(t => t !== tag) }));
    setHasUnsavedChanges(true);
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.name.match(/\.docx?$/)) {
        const buf = await file.arrayBuffer();
        const r = await mammoth.convertToHtml({ arrayBuffer: buf });
        setFormData(prev => ({ ...prev, content: r.value }));
        showToast('Đã import từ Word', 'success');
      } else if (file.name.match(/\.xlsx?$/)) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const html = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]]);
        setFormData(prev => ({ ...prev, content: html }));
        showToast('Đã import từ Excel', 'success');
      } else showToast('Chỉ hỗ trợ file Word/Excel', 'error');
    } catch { showToast('Import thất bại', 'error'); }
  };

  // ─────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────
  const handleSubmit = async (e, isDraft = false, skipConfirm = false, confirmedSkip = false) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) return showToast('Nhập tiêu đề', 'warning');
    if (!formData.content.trim() && !isDraft) return showToast('Nhập nội dung', 'warning');
    if (!formData.category_id) return showToast('Chọn danh mục', 'warning');
    if ((selectedCategoryType === 'thuoc' || selectedCategoryType === 'benh_ly') && !formData.entity_id)
      return showToast(`Liên kết với ${selectedCategoryType === 'thuoc' ? 'thuốc' : 'bệnh lý'}`, 'error');
    if (!isDraft && formData.is_medical_review_required && !formData.medical_reviewer_id)
      return showToast('Vui lòng chọn bác sĩ phê duyệt', 'warning');

    const firstImg = getFirstImageFromContent(formData.content);
    let finalCover = coverImage || tempImageUrl;
    if (!finalCover && firstImg) { finalCover = firstImg; setCoverImage(firstImg); }
    if (!finalCover && !isDraft) return showToast('Bài viết chưa có ảnh bìa!', 'error');

    let finalContent = formData.content;
    if (finalCover && !finalContent.includes(finalCover))
      finalContent += `<figure class="image image-style-side"><img src="${finalCover}" alt="${formData.title}"></figure>`;

    if (!isDraft && !confirmedSkip) { setPendingSubmitData({ isDraft: false }); setShowSubmitConfirm(true); return; }

    try {
      setLoading(true);
      const data = {
        title: formData.title, content: finalContent, category_id: formData.category_id,
        tags_json: formData.tags_json, source: formData.source, isDraft,
        entity_id: formData.entity_id, entity_type: formData.entity_type,
        cover_image_url: finalCover, specialty_id: formData.specialty_id,
        is_medical_review_required: formData.is_medical_review_required,
        medical_reviewer_id: formData.medical_reviewer_id
      };
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const r = modalType === 'create'
        ? await axios.post(`${API_BASE_URL}/api/articles`, data, { headers })
        : await axios.put(`${API_BASE_URL}/api/articles/${selectedArticle.id}`, data, { headers });
      if (r.data.success) {
        showToast(isDraft ? 'Đã lưu nháp' : 'Gửi phê duyệt thành công', 'success');
        setShowModal(false); setHasUnsavedChanges(false); fetchArticles();
      }
    } catch (err) { showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error'); }
    finally { setLoading(false); }
  };

  // ─────────────────────────────────────────
  // DELETE / HIDE / DUPLICATE / SORT
  // ─────────────────────────────────────────
  const handleDelete = (id) => {
    setDeleteArticleId(id); setCountdownSeconds(DELETE_COUNTDOWN);
    showConfirm('Xác nhận xóa', 'Hành động này không thể hoàn tác.', () => performDelete(id), 'Xóa', 'danger');
  };
  const performDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/articles/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      showToast('Đã xóa', 'success'); fetchArticles();
    } catch { showToast('Không thể xóa', 'error'); }
    finally { setDeleteArticleId(null); setCountdownSeconds(0); }
  };
  const openHidePopup = (article) => {
    setArticleToHide(article); setHideReason('');
    setCountdownSeconds(article.status === 'hidden' ? 0 : HIDE_COUNTDOWN);
    setShowHidePopup(true);
  };
  const handleHideArticle = async (e) => {
    e.preventDefault();
    if (!hideReason.trim()) return showToast('Nhập lý do', 'error');
    if (countdownSeconds > 0) return;
    try {
      setHidingArticle(true);
      const ep = articleToHide.status === 'hidden' ? 'unhide' : 'hide';
      const r = await axios.post(`${API_BASE_URL}/api/articles/${articleToHide.id}/${ep}`,
        { reason: hideReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (r.data.success) {
        showToast(`Đã ${articleToHide.status === 'hidden' ? 'hiện' : 'ẩn'} bài viết`, 'success');
        setShowHidePopup(false); setArticleToHide(null); setHideReason(''); fetchArticles();
      }
    } catch { showToast('Có lỗi xảy ra', 'error'); }
    finally { setHidingArticle(false); }
  };
  const handleDuplicate = (article) => showConfirm('Nhân bản', `Nhân bản "${article.title}"?`, async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/articles/${article.id}/duplicate`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      showToast('Đã nhân bản', 'success'); fetchArticles();
    } catch { showToast('Không thể nhân bản', 'error'); }
  }, 'Nhân bản', 'info');
  const handleSortColumn = (col) => setFilters(prev => ({
    ...prev, sort_by: col,
    sort_order: prev.sort_by === col && prev.sort_order === 'DESC' ? 'ASC' : 'DESC'
  }));
  const handleEditArticle = (article) => {
    if (user.role === 'admin' && article.status === 'approved') {
      setEditingApprovedArticle(article); setShowAdminEditWarning(true); return;
    }
    handleOpenModal('edit', article);
  };
  const handleAdminEditChoice = async (choice) => {
    const article = editingApprovedArticle;
    if (choice === 'hide-first') {
      try {
        await axios.post(`${API_BASE_URL}/api/articles/${article.id}/hide`, { reason: 'Admin sửa bài' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Đã ẩn bài', 'success'); await fetchArticles();
        setTimeout(() => handleOpenModal('edit', article), 500);
      } catch { showToast('Lỗi ẩn bài', 'error'); }
    } else if (choice === 'direct') { handleOpenModal('edit', article); }
    setShowAdminEditWarning(false); setEditingApprovedArticle(null);
  };
  const handleRejectEditRequest = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return showToast('Nhập lý do', 'error');
    try {
      setRejecting(true);
      const r = await axios.post(
        `${API_BASE_URL}/api/articles/${articleToReject.id}/reject-edit-request`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (r.data.success) {
        showToast('Đã từ chối yêu cầu chỉnh sửa', 'success');
        setShowRejectPopup(false); setArticleToReject(null); setRejectReason(''); fetchArticles();
      }
    } catch (err) { showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error'); }
    finally { setRejecting(false); }
  };

  const canShowButton = (action, article, user) => {
    const isAuthor = article.author_id === user.id, isAdm = user.role === 'admin', status = article.status;
    const isMgr = user.role === 'staff' && user.staff?.department === 'content' && user.staff?.rank === 'manager';
    switch (action) {
      // Chỉ tác giả được chỉnh sửa bài của mình (và không phải lúc pending/pending_medical)
      case 'edit': return isAdm || (isAuthor && !['pending','pending_medical'].includes(status));
      case 'delete': return isAdm || (hasPermission('articles', 'delete') && (isMgr || (isAuthor && status === 'draft')));
      case 'hide': return isAdm || hasPermission('articles', 'hide') || isMgr;
      case 'history': case 'duplicate': return true;
      default: return false;
    }
  };

  const fetchArticleReports = async (article) => {
    if (!article?.id) return;
    setArticleToReport(article);
    setShowReportsPopup(true);
    setLoadingReports(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/api/articles/${article.id}/reports`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setReportItems(r.data.reports || []);
    } catch (error) {
      setReportItems([]);
      showToast(error.response?.data?.message || 'Không thể tải danh sách báo cáo', 'error');
    } finally {
      setLoadingReports(false);
    }
  };

  const exportToCSV = () => {
    const rows = articles.map(article => ({
      ID: article.id,
      'Tiêu đề': article.title,
      'Danh mục': article.category?.name || '',
      'Trạng thái': getStatusText(article.status),
      'Tác giả': article.author?.full_name || '',
      'Ngày tạo': new Date(article.created_at).toLocaleString('vi-VN'),
      'Lượt xem': article.views || 0,
      'Lượt thích': article.likes_count || 0,
      'Lượt báo cáo': article.report_count || 0
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(',')]
      .concat(rows.map(row => headers.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `articles-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Đã xuất file CSV', 'success');
  };
  const exportToExcel = () => {
    const rows = articles.map(article => ({
      ID: article.id,
      'Tiêu đề': article.title,
      'Danh mục': article.category?.name || '',
      'Trạng thái': getStatusText(article.status),
      'Tác giả': article.author?.full_name || '',
      'Ngày tạo': new Date(article.created_at).toLocaleString('vi-VN'),
      'Lượt xem': article.views || 0,
      'Lượt thích': article.likes_count || 0,
      'Lượt báo cáo': article.report_count || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Articles');
    XLSX.writeFile(workbook, `articles-${Date.now()}.xlsx`);
    showToast('Đã xuất file Excel', 'success');
  };
  const viewHistory = (id) => navigate(`/phe-duyet-bai-viet/${id}`);
  const openArticleReview = (article) => navigate(`/phe-duyet-bai-viet/${article.id}`);

  // ─────────────────────────────────────────
  // RENDER: ENTITY SEARCH SECTION (cột giữa)
  // ─────────────────────────────────────────
  const renderEntitySearchSection = () => {
    if ((selectedCategoryType !== 'thuoc' && selectedCategoryType !== 'benh_ly') || !formData.category_id) return null;
    return (
      <div className="article-mgmt-form-group">
        <label className="article-mgmt-form-label">
          <FaLink /> Liên kết {selectedCategoryType === 'thuoc' ? 'Thuốc' : 'Bệnh lý'}
        </label>
        {selectedEntity ? (
          <div className="article-mgmt-selected-entity">
            <div className="article-mgmt-entity-info">
              <h4>{selectedEntity.name}</h4>
              <span className="article-mgmt-entity-category">{selectedEntity.Category?.name}</span>
            </div>
            <button type="button" className="article-mgmt-btn-clear-entity" onClick={handleClearEntity}>
              <FaTimes /> Hủy
            </button>
          </div>
        ) : (
          <div className="article-mgmt-entity-search-box">
            <FaSearch />
            <input
              type="text"
              placeholder={`Tìm ${selectedCategoryType === 'thuoc' ? 'thuốc' : 'bệnh lý'}...`}
              value={entitySearch}
              onChange={e => handleEntitySearch(e.target.value)}
            />
            {searchingEntity && <BiLoaderAlt className="article-mgmt-spinner-icon" />}
            {entitySearchResults.length > 0 && (
              <div className="article-mgmt-entity-dropdown">
                {entitySearchResults.map(e => (
                  <div key={e.id} className="article-mgmt-entity-item" onClick={() => handleSelectEntity(e)}>
                    <h5>{e.name}</h5>
                    <span className="article-mgmt-entity-item-category">{e.Category?.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────
  // RENDER: PREVIEW POPUP
  // ─────────────────────────────────────────
  const renderPreviewPopup = () => {
    if (!showPreviewPopup) return null;
    const categoryName = categories.find(c => c.id === formData.category_id)?.name || '';
    const handleOverlayClick = () => {
      askCloseConfirm('Đóng xem trước?', 'Bạn muốn đóng popup xem trước?', () => setShowPreviewPopup(false));
    };
    return (
      <Portal>
        <div className="article-mgmt-preview-overlay" onClick={handleOverlayClick}>
          <div className="article-mgmt-preview-modal" onClick={e => e.stopPropagation()}>
          <div className="article-mgmt-preview-header">
            <h2><FaEye /> Xem trước bài viết</h2>
            <button className="article-mgmt-btn-close-modal" onClick={handleOverlayClick}><FaTimes /></button>
          </div>
          <div className="article-mgmt-preview-body">
            {(coverImage || tempImageUrl) && (
              <img src={coverImage || tempImageUrl} alt="Ảnh bìa" className="preview-cover" onError={e => e.target.style.display = 'none'} />
            )}
            <h1 className="preview-title">{formData.title || '(Chưa có tiêu đề)'}</h1>
            <div className="preview-meta">
              {categoryName && <span className="category-badge">{categoryName}</span>}
              {formData.tags_json?.map((tag, i) => (
                <span key={i} style={{ background: 'var(--g100)', color: 'var(--g700)', padding: '2px 8px', borderRadius: 'var(--rfull)', fontSize: 'var(--fs-xs)' }}>{tag}</span>
              ))}
              {formData.source && <span style={{ color: 'var(--n400)', fontSize: 'var(--fs-xs)' }}>Nguồn: {formData.source}</span>}
            </div>
            <div className="preview-content" dangerouslySetInnerHTML={{ __html: formData.content || '<p style="color:var(--n400)">(Chưa có nội dung)</p>' }} />
          </div>
          </div>
        </div>
      </Portal>
    );
  };

  // ─────────────────────────────────────────
  // RENDER: MODAL FORM — 3 PANEL LAYOUT
  // Cột trái (200px):  Ảnh bìa + Tham vấn y khoa
  // Cột giữa (260px):  Loại bài, Danh mục, Tags, Liên kết, Nguồn
  // Cột phải (1fr):    Import + CKEditor + nút Xem trước
  // ─────────────────────────────────────────
  const renderModal = () => {
    if (!showModal) return null;

    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget) handleCloseModal();
    };

    return (
      <Portal>
        <div className="article-mgmt-form-overlay" onClick={handleOverlayClick}>
          <div className="article-mgmt-form-container article-mgmt-form-container--wide">

          {/* ── Header ── */}
          <div className="article-mgmt-form-header">
            <h2>
              {modalType === 'create' ? <><FaPlus /> Tạo bài viết mới</> : <><FaEdit /> Chỉnh sửa bài viết</>}
            </h2>
            <div className="article-mgmt-header-right">
              <button type="button" className="btn-ai-assist" onClick={handleAIAnalyze} disabled={analyzingAI}>
                {analyzingAI
                  ? <><BiLoaderAlt className="ai-spin-icon" /> Đang phân tích...</>
                  : <><MdAutoAwesome /> AI Hỗ trợ</>
                }
              </button>
              <button className="article-mgmt-btn-close-modal" onClick={handleCloseModal}><FaTimes /></button>
            </div>
          </div>

          {/* ── Tiêu đề full-width ── */}
          <div className="article-mgmt-form-title-bar">
            <label className="article-mgmt-title-label required">
              <FaEdit /> Tiêu đề bài viết
            </label>
            <input
              type="text" name="title" value={formData.title}
              onChange={handleFormChange}
              placeholder="Nhập tiêu đề bài viết..."
              className="article-mgmt-title-input"
            />
          </div>

          {/* ══ 3 PANEL BODY ══ */}
          <div className="article-mgmt-three-panel">

            {/* ══ CỘT TRÁI: ẢNH BÌA ══ */}
            <div className="article-mgmt-panel article-mgmt-panel--left">

              {/* Ảnh bìa */}
              <div className="article-mgmt-panel-section">
                <div className="article-mgmt-panel-section-title"><FaImage /> Ảnh bìa</div>

                <div className="article-mgmt-cover-preview--vertical">
                  {(coverImage || tempImageUrl) ? (
                    <>
                      <img src={coverImage || tempImageUrl} alt="Ảnh bìa" onError={e => { e.target.style.display = 'none'; }} />
                      <button type="button" className="article-mgmt-btn-remove-image"
                        onClick={() => { setCoverImage(null); setTempImageUrl(''); }}>
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <div className="article-mgmt-cover-placeholder">
                      <FaImage />
                      <span>Chưa có ảnh</span>
                    </div>
                  )}
                </div>

                <div className="article-mgmt-image-upload-tabs">
                  <button type="button" className={`article-mgmt-tab-btn ${imageUploadMethod === 'file' ? 'active' : ''}`}
                    onClick={() => setImageUploadMethod('file')}>
                    <FaUpload /> Upload
                  </button>
                  <button type="button" className={`article-mgmt-tab-btn ${imageUploadMethod === 'url' ? 'active' : ''}`}
                    onClick={() => setImageUploadMethod('url')}>
                    <FaLink /> URL
                  </button>
                </div>

                {imageUploadMethod === 'file' ? (
                  <>
                    <input type="file" id="cover-upload" accept="image/*" onChange={handleCoverImageUpload} style={{ display: 'none' }} />
                    <label htmlFor="cover-upload" className="article-mgmt-upload-label">
                      {uploadingCover
                        ? <><BiLoaderAlt className="ai-spin-icon" /> Đang tải...</>
                        : <><FaUpload /> Chọn ảnh</>
                      }
                    </label>
                  </>
                ) : (
                  <div className="article-mgmt-url-input-group">
                    <input type="text" value={tempImageUrl}
                      onChange={e => setTempImageUrl(e.target.value)}
                      placeholder="https://..." className="article-mgmt-url-input" />
                    <button type="button" className="article-mgmt-btn-add-url" onClick={handleImageUrlSubmit}>OK</button>
                  </div>
                )}
                <p className="article-mgmt-cover-hint">JPEG/PNG/WEBP · Tối đa 5MB</p>
              </div>

              {/* Tham vấn y khoa */}
              <div className="article-mgmt-panel-section">
                <div className="article-mgmt-panel-section-title"><FaStethoscope /> Tham vấn y khoa</div>
                <div className="article-mgmt-medical-review-section">
                  <label className="article-mgmt-medical-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.is_medical_review_required}
                      onChange={e => { setFormData(prev => ({ ...prev, is_medical_review_required: e.target.checked })); setHasUnsavedChanges(true); }}
                    />
                    <span>Yêu cầu Bác sĩ tham vấn</span>
                  </label>
                  {formData.is_medical_review_required && (
                    <div className="article-mgmt-medical-details">
                      <div className="article-mgmt-form-group">
                        <label className="article-mgmt-form-label">Chuyên khoa</label>
                        <select
                          className="article-mgmt-form-select"
                          value={formData.specialty_id || ''}
                          onChange={e => { setFormData(prev => ({ ...prev, specialty_id: e.target.value })); setHasUnsavedChanges(true); }}
                        >
                          <option value="">-- Chọn chuyên khoa --</option>
                          {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      {formData.specialty_id ? (
                        <>
                          <button
                            type="button"
                            className="article-mgmt-btn-submit"
                            style={{ width: 'fit-content' }}
                            onClick={() => setShowDoctorSelectionModal(true)}
                          >
                            Chọn BS ({availableDoctors.length})
                          </button>
                          {selectedMedicalReviewer && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '8px 10px', background: 'var(--g50)', 
                              borderRadius: '8px', border: '1px solid var(--g200)',
                              marginTop: '6px'
                            }}>
                              <img 
                                src={selectedMedicalReviewer.user?.avatar_url || '/placeholder.jpg'} 
                                alt="Selected Doctor"
                                onError={e => e.target.src = '/placeholder.jpg'}
                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} 
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
                                <span style={{ fontSize: '12px', color: 'var(--n700)', fontWeight: '600' }}>
                                  BS. {selectedMedicalReviewer.user?.full_name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--n400)' }}>
                                  ({selectedMedicalReviewer.specialty?.name})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setAssignedDoctor(null); setFormData(prev => ({ ...prev, medical_reviewer_id: null })); }}
                                style={{ background: 'none', border: 'none', color: 'var(--g600)', cursor: 'pointer', fontSize: '16px' }}
                                title="Bỏ chọn"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══ CỘT GIỮA: PHÂN LOẠI, TAGS, LIÊN KẾT, NGUỒN ══ */}
            <div className="article-mgmt-panel article-mgmt-panel--middle">

              <div className="article-mgmt-panel-section">
                {/* Loại bài */}
                <div className="article-mgmt-form-group" style={{ marginBottom: 8 }}>
                  <label className="article-mgmt-form-label required"><FaLayerGroup /> Loại bài viết</label>
                  <select value={selectedCategoryType} onChange={handleCategoryTypeChange} className="article-mgmt-form-select">
                    <option value="">-- Chọn loại --</option>
                    <option value="tin_tuc">Tin tức</option>
                    <option value="thuoc">Thuốc</option>
                    <option value="benh_ly">Bệnh lý</option>
                  </select>
                </div>

                {/* Danh mục — cascade, chỉ hiện khi đã chọn loại */}
                {selectedCategoryType && (
                  <div className="article-mgmt-form-group" style={{ marginBottom: 8 }}>
                    <label className="article-mgmt-form-label required"><FaBookOpen /> Danh mục</label>
                    <select
                      name="category_id" value={formData.category_id}
                      onChange={handleCategoryChange} className="article-mgmt-form-select"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories
                        .filter(c => c.category_type === selectedCategoryType)
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                      }
                    </select>
                  </div>
                )}

                {/* Tags */}
                <div className="article-mgmt-form-group" style={{ marginBottom: 8 }}>
                  <label className="article-mgmt-form-label"><FaTags /> Tags</label>
                  <div className="article-mgmt-tags-input-wrapper">
                    <div className="article-mgmt-tags-display">
                      {formData.tags_json.map((tag, idx) => (
                        <span key={idx} className="article-mgmt-tag-item">
                          {tag}
                          <button type="button" className="article-mgmt-btn-remove-tag" onClick={() => handleRemoveTag(tag)}>
                            <FaTimes />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="article-mgmt-tags-input-group">
                      <input
                        type="text" value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        placeholder="Thêm tag, Enter để lưu..."
                        className="article-mgmt-tags-input"
                      />
                      <button type="button" onClick={handleAddTag} className="article-mgmt-btn-add-tag">Thêm</button>
                    </div>
                  </div>
                </div>

                {/* Liên kết thuốc / bệnh lý */}
                {renderEntitySearchSection()}

                {/* Nguồn tham khảo */}
                <div className="article-mgmt-form-group">
                  <label className="article-mgmt-form-label"><FaExternalLinkAlt /> Nguồn tham khảo</label>
                  <input
                    type="text" name="source" value={formData.source || ''}
                    onChange={handleFormChange} placeholder="https://..."
                    className="article-mgmt-form-input"
                  />
                </div>
              </div>
            </div>

            {/* ══ CỘT PHẢI: IMPORT + CKEditor ══ */}
            <div className="article-mgmt-panel article-mgmt-panel--right">

              {/* Import file bar */}
              <div className="article-mgmt-import-bar">
                <span className="article-mgmt-import-label"><FaFileImport /> Import:</span>
                <input type="file" accept=".doc,.docx,.xls,.xlsx" onChange={handleFileImport} className="article-mgmt-file-input" />
                <span style={{ fontSize: 10, color: 'var(--n400)', whiteSpace: 'nowrap' }}>Word / Excel</span>
                {/* Inline preview button removed per UX request (preview remains available in footer) */}
              </div>

              {/* CKEditor */}
              <div className="article-mgmt-editor-container">
                <div className="article-mgmt-editor-label required"><FaAlignLeft /> Nội dung bài viết</div>
                <div id="toolbar-container"></div>
                <div className="article-mgmt-editor-wrapper">
                  {DecoupledEditor ? (
                    <CKEditor
                      editor={DecoupledEditor}
                      data={formData.content}
                      onReady={(editor) => {
                        if (!editor?.ui?.view?.toolbar) return;
                        const container = document.querySelector('#toolbar-container');
                        const toolbar = editor.ui.view.toolbar.element;
                        if (container && toolbar) {
                          while (container.firstChild) container.removeChild(container.firstChild);
                          container.appendChild(toolbar);
                        }
                      }}
                      onChange={(event, editor) => {
                        setFormData(prev => ({ ...prev, content: editor.getData() }));
                        setHasUnsavedChanges(true);
                      }}
                      config={{
                        extraPlugins: [MyCustomUploadAdapterPlugin],
                        toolbar: [
                          'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', '|',
                          'fontSize', 'fontColor', 'fontBackgroundColor', '|',
                          'link', 'imageUpload', 'blockQuote', '|',
                          'alignment', 'bulletedList', 'numberedList', '|',
                          'insertTable', 'tableColumn', 'tableRow', 'mergeTableCells', '|',
                          'undo', 'redo'
                        ]
                      }}
                    />
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--n400)' }}>
                      <BiLoaderAlt className="ai-spin-icon" /> Đang tải trình soạn thảo...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>{/* end three-panel */}

          {/* ── Footer ── */}
          <div className="article-mgmt-form-footer">
            <button type="button" className="article-mgmt-btn-preview" onClick={() => setShowPreviewPopup(true)}>
              <FaEye /> Xem trước
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="article-mgmt-btn-submit article-mgmt-btn-secondary" onClick={handleCloseModal}>
              <FaTimes /> Hủy
            </button>
            <button type="button" className="article-mgmt-btn-submit article-mgmt-btn-secondary"
              onClick={e => handleSubmit(e, true)} disabled={loading}>
              {loading ? <BiLoaderAlt className="ai-spin-icon" /> : <FaSave />} Lưu nháp
            </button>
            <button type="button" className="article-mgmt-btn-submit article-mgmt-btn-primary"
              onClick={e => handleSubmit(e, false)} disabled={loading}>
              {loading ? <><BiLoaderAlt className="ai-spin-icon" /> Đang xử lý...</> : <><FaPaperPlane /> Gửi phê duyệt / Đăng</>}
            </button>
          </div>

          </div>
        </div>
      </Portal>
    );
  };

  // ─────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────
  return (
    <div className="article-mgmt-page">
      <div className="article-mgmt-container">

        {/* HEADER */}
        <div className="article-mgmt-header">
          <div className="article-mgmt-header-content">
            <div className="article-mgmt-title-section">
              <h1 className="article-mgmt-main-title"><FaNewspaper /> Quản lý bài viết</h1>
              <div className="article-mgmt-stats-inline">
                <span className="article-mgmt-stat-item">Tổng: <strong>{stats.total}</strong></span>
                <span className="article-mgmt-stat-item article-mgmt-stat-pending">Chờ duyệt: <strong>{stats.pending}</strong></span>
                <span className="article-mgmt-stat-item article-mgmt-stat-medical">Chờ BS: <strong>{stats.pending_medical || 0}</strong></span>
                <span className="article-mgmt-stat-item article-mgmt-stat-warning">Cần xử lý: <strong>{stats.action_required || 0}</strong></span>
                <span className="article-mgmt-stat-item article-mgmt-stat-danger">Báo cáo: <strong>{stats.reports || 0}</strong></span>
                <span className="article-mgmt-stat-item">Đã duyệt: <strong>{stats.approved}</strong></span>
              </div>
            </div>
            <button className="article-mgmt-btn-create" onClick={openCreateModal}>
              <FaPlus /> Tạo bài viết
            </button>
          </div>
        </div>

        {/* FILTERS — cascade category_type → category_id */}
        <div className="article-mgmt-filters">
          <div className="article-mgmt-filters-row">

            {/* Tìm kiếm */}
            <div className="article-mgmt-filter-search">
              <FaSearch />
              <input
                type="text" name="search" value={filters.search}
                onChange={handleFilterChange} placeholder="Tìm theo tiêu đề..."
              />
              {filters.search && (
                <button onClick={() => setFilters(prev => ({ ...prev, search: '', page: 1 }))}><FaTimes /></button>
              )}
            </div>

            {/* Loại bài — chọn trước */}
            <select
              name="category_type" value={filters.category_type}
              onChange={handleFilterChange} className="article-mgmt-filter-select"
            >
              <option value="">Tất cả loại</option>
              <option value="tin_tuc">Tin tức</option>
              <option value="thuoc">Thuốc</option>
              <option value="benh_ly">Bệnh lý</option>
            </select>

            {/* Danh mục — cascade, disable nếu chưa chọn loại */}
            <select
              name="category_id" value={filters.category_id}
              onChange={handleFilterChange} className="article-mgmt-filter-select"
              disabled={!filters.category_type}
            >
              <option value="">
                {filters.category_type ? 'Tất cả danh mục' : '-- Chọn loại trước --'}
              </option>
              {categories
                .filter(c => !filters.category_type || c.category_type === filters.category_type)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              }
            </select>

            {/* Trạng thái */}
            <select name="status" value={filters.status} onChange={handleFilterChange} className="article-mgmt-filter-select">
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="pending">Chờ duyệt</option>
              <option value="pending_medical">Chờ BS duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="hidden">Đã ẩn</option>
            </select>

            {/* Clear + Export */}
            {(filters.search || filters.status || filters.category_id || filters.category_type) && (
              <button className="article-mgmt-btn-export" onClick={clearFilters}><FaTimes /> Xóa lọc</button>
            )}
            <button className="article-mgmt-btn-export" onClick={exportToCSV}><FaFileCsv /> CSV</button>
            <button className="article-mgmt-btn-export" onClick={exportToExcel}><FaFileExcel /> Excel</button>
          </div>
        </div>

        <div className="article-mgmt-dashboard-grid">
          <button className="article-mgmt-dashboard-card required" onClick={() => setFilters(prev => ({ ...prev, status: '', page: 1 }))}>
            <span>Cần hành động</span>
            <strong>{stats.action_required || 0}</strong>
          </button>
          <button className="article-mgmt-dashboard-card pending" onClick={() => setFilters(prev => ({ ...prev, status: 'pending', page: 1 }))}>
            <span>Bài chờ duyệt</span>
            <strong>{stats.pending || 0}</strong>
          </button>
          <button className="article-mgmt-dashboard-card medical" onClick={() => setFilters(prev => ({ ...prev, status: 'pending_medical', page: 1 }))}>
            <span>Chờ bác sĩ</span>
            <strong>{stats.pending_medical || 0}</strong>
          </button>
          <button className="article-mgmt-dashboard-card edit" onClick={() => setFilters(prev => ({ ...prev, status: 'request_edit', page: 1 }))}>
            <span>Yêu cầu sửa</span>
            <strong>{stats.request_edit || 0}</strong>
          </button>
          <button className="article-mgmt-dashboard-card rewrite" onClick={() => setFilters(prev => ({ ...prev, status: 'request_rewrite', page: 1 }))}>
            <span>Yêu cầu viết lại</span>
            <strong>{stats.request_rewrite || 0}</strong>
          </button>
          <button className="article-mgmt-dashboard-card hidden" onClick={() => setFilters(prev => ({ ...prev, status: 'hidden', page: 1 }))}>
            <span>Bài bị ẩn</span>
            <strong>{stats.hidden || 0}</strong>
          </button>
          <button className="article-mgmt-dashboard-card reports" onClick={() => setFilters(prev => ({ ...prev, status: '', page: 1 }))}>
            <span>Tổng báo cáo</span>
            <strong>{stats.reports || 0}</strong>
          </button>
        </div>

        {/* TABLE */}
        <div className="article-mgmt-table-wrapper">
          <table className="article-mgmt-table">
            <thead>
              <tr>
                <th className="col-fixed col-title col-sortable" onClick={() => handleSortColumn('title')}>
                  Tiêu đề {filters.sort_by === 'title' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                </th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th>Tác giả</th>
                <th>Lượt xem</th>
                <th>Lượt thích</th>
                <th>Lượt báo cáo</th>
                <th className="col-sortable" onClick={() => handleSortColumn('created_at')}>
                  Ngày tạo {filters.sort_by === 'created_at' && (filters.sort_order === 'DESC' ? <FaSortAmountDown /> : <FaSortAmountUp />)}
                </th>
                <th className="col-fixed col-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="article-mgmt-text-center"><BiLoaderAlt className="ai-spin-icon" /> Đang tải...</td></tr>
              ) : articles.length === 0 ? (
                <tr><td colSpan="9" className="article-mgmt-text-center">Không có bài viết nào</td></tr>
              ) : articles.map(article => (
                <tr key={article.id}>
                  <td className="col-fixed col-title">
                    <div className="article-title-cell">
                      {getCategoryIcon(article.category?.category_type)}
                      <button type="button" className="article-title-link" title="Mở trang phê duyệt" onClick={() => openArticleReview(article)}>{article.title}</button>
                    </div>
                  </td>
                  <td><span className="category-badge">{article.category?.name || '-'}</span></td>
                  <td><span className={`article-mgmt-status-badge ${getStatusClass(article.status)}`}>{getStatusText(article.status)}</span></td>
                  <td><div className="author-cell"><FaUser /><span>{article.author?.full_name || '-'}</span></div></td>
                  <td>{article.views || 0}</td>
                  <td>{article.likes_count || 0}</td>
                  <td>
                    <button type="button" className="article-report-link" onClick={() => fetchArticleReports(article)}>
                      {article.report_count || 0}
                    </button>
                  </td>
                  <td>{new Date(article.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="col-fixed col-actions">
                    <div className="action-buttons">
                      {canShowButton('edit', article, user) && <button className="article-mgmt-btn-action article-mgmt-btn-edit" title="Chỉnh sửa" onClick={() => handleEditArticle(article)}><FaEdit /></button>}
                      {canShowButton('duplicate', article, user) && <button className="article-mgmt-btn-action article-mgmt-btn-duplicate" title="Nhân bản" onClick={() => handleDuplicate(article)}><FaCopy /></button>}
                      {canShowButton('history', article, user) && <button className="article-mgmt-btn-action article-mgmt-btn-history" title="Lịch sử" onClick={() => viewHistory(article.id)}><FaHistory /></button>}
                      {canShowButton('hide', article, user) && <button className="article-mgmt-btn-action article-mgmt-btn-hide" title={article.status === 'hidden' ? 'Hiện' : 'Ẩn'} onClick={() => openHidePopup(article)}>{article.status === 'hidden' ? <FaEye /> : <FaEyeSlash />}</button>}
                      {canShowButton('delete', article, user) && <button className="article-mgmt-btn-action btn-delete" title="Xóa" onClick={() => handleDelete(article.id)}><FaTrash /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <div className="article-mgmt-pagination">
            <button className="article-mgmt-btn-page" onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))} disabled={filters.page === 1}>← Trước</button>
            <div className="article-mgmt-page-numbers">
              {[...Array(Math.min(pagination.totalPages, 10))].map((_, i) => {
                const page = i + 1;
                return <button key={page} className={`article-mgmt-btn-page ${filters.page === page ? 'active' : ''}`} onClick={() => setFilters(p => ({ ...p, page }))}>{page}</button>;
              })}
            </div>
            <button className="article-mgmt-btn-page" onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} disabled={filters.page === pagination.totalPages}>Sau →</button>
          </div>
        )}

        {/* MODAL FORM */}
        {renderModal()}

        {showReportsPopup && articleToReport && (
          <Portal>
            <div className="article-mgmt-modal-overlay" onClick={() => setShowReportsPopup(false)}>
              <div className="article-mgmt-confirm-submit-modal article-mgmt-report-modal" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2><FaExclamationTriangle style={{ color: '#dc2626' }} /> Danh sách báo cáo</h2>
                <button className="article-mgmt-modal-close" onClick={() => setShowReportsPopup(false)}><FaTimes /></button>
              </div>
              <div className="article-mgmt-modal-body">
                <p className="article-mgmt-report-title">Bài viết: <strong>{articleToReport.title}</strong></p>
                {loadingReports ? (
                  <p className="article-mgmt-report-empty"><BiLoaderAlt className="ai-spin-icon" /> Đang tải báo cáo...</p>
                ) : reportItems.length === 0 ? (
                  <p className="article-mgmt-report-empty">Chưa có báo cáo nào.</p>
                ) : (
                  <div className="article-mgmt-report-list">
                    {reportItems.map(item => (
                      <div key={item.id} className="article-mgmt-report-item">
                        <div className="article-mgmt-report-item-head">
                          <strong>{item.user?.full_name || 'Ẩn danh'}</strong>
                          <span>{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                        <p>{item.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          </Portal>
        )}

        {/* PREVIEW POPUP */}
        {renderPreviewPopup()}

        {/* TOASTS */}
        <div className="article-mgmt-toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`article-mgmt-toast toast-${toast.type}`}>
              <div className="article-mgmt-toast-icon">
                {toast.type === 'success' && <FaCheckCircle />}
                {toast.type === 'error' && <FaTimesCircle />}
                {toast.type === 'warning' && <FaExclamationTriangle />}
                {toast.type === 'info' && <FaInfoCircle />}
              </div>
              <span className="article-mgmt-toast-message">{toast.message}</span>
              <button className="article-mgmt-toast-close" onClick={() => removeToast(toast.id)}><FaTimes /></button>
            </div>
          ))}
        </div>

        {/* CONFIRM DIALOG */}
        {showConfirmDialog && confirmAction && (
          <Portal>
            <div className="article-mgmt-confirm-overlay">
              <div className={`article-mgmt-confirm-dialog ${confirmAction.type}`}>
              <div className="article-mgmt-confirm-icon">
                {confirmAction.type === 'danger' && <FaExclamationTriangle />}
                {confirmAction.type === 'warning' && <FaExclamationTriangle />}
                {confirmAction.type === 'info' && <FaInfoCircle />}
              </div>
              <h3 className="article-mgmt-confirm-title">{confirmAction.title}</h3>
              <p className="article-mgmt-confirm-message">{confirmAction.message}</p>
              {deleteArticleId && countdownSeconds > 0 && (
                <div className="countdown-timer"><FaClock /><span>Vui lòng chờ {countdownSeconds} giây để xác nhận...</span></div>
              )}
              <div className="article-mgmt-confirm-actions">
                <button
                  className={`btn-confirm btn-${confirmAction.type === 'danger' ? 'danger' : confirmAction.type === 'warning' ? 'warning' : 'primary'}`}
                  onClick={handleConfirm}
                  disabled={deleteArticleId && countdownSeconds > 0}
                >
                  {deleteArticleId && countdownSeconds > 0 ? `Xác nhận (${countdownSeconds}s)` : confirmAction.confirmText}
                </button>
                <button className="btn-confirm article-mgmt-btn-cancel" onClick={closeConfirmDialog}>Quay lại</button>
              </div>
              </div>
            </div>
          </Portal>
        )}

        {/* HIDE POPUP */}
        {showHidePopup && articleToHide && (
          <Portal>
            <div className="article-mgmt-popup-overlay" onClick={() => {
              askCloseConfirm('Đóng form?', 'Bạn có muốn đóng form ẩn/hiện bài viết không?', () => {
                setShowHidePopup(false); setCountdownSeconds(0);
              });
            }}>
              <div className="article-mgmt-popup" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-popup-header">
                <div className="article-mgmt-popup-header-content">
                  {articleToHide.status === 'hidden' ? <FaEye className="article-mgmt-popup-icon" /> : <FaEyeSlash className="article-mgmt-popup-icon" />}
                  <h3>{articleToHide.status === 'hidden' ? 'Hiện bài viết' : 'Ẩn bài viết'}</h3>
                </div>
                <button onClick={() => {
                  askCloseConfirm('Đóng form?', 'Bạn có muốn đóng form ẩn/hiện bài viết không?', () => {
                    setShowHidePopup(false); setCountdownSeconds(0);
                  });
                }} className="article-mgmt-btn-close-popup"><FaTimes /></button>
              </div>
              <form onSubmit={handleHideArticle} className="article-mgmt-popup-body">
                <div className="article-mgmt-popup-warning">
                  <FaExclamationTriangle />
                  <div>
                    <p className="article-mgmt-warning-title">Lưu ý</p>
                    <p className="article-mgmt-warning-text">
                      {articleToHide.status === 'hidden' ? 'Bài viết sẽ được hiển thị công khai.' : 'Bài viết sẽ bị ẩn khỏi danh sách công khai.'}
                    </p>
                  </div>
                </div>
                <div className="article-mgmt-popup-info">
                  <label className="article-mgmt-popup-label">Bài viết:</label>
                  <p className="article-mgmt-article-title-display">{articleToHide.title}</p>
                </div>
                <div className="article-mgmt-popup-quick-reasons">
                  <label className="article-mgmt-popup-label">Lý do nhanh:</label>
                  <div className="article-mgmt-quick-reason-buttons">
                    {['Nội dung không phù hợp', 'Vi phạm chính sách', 'Thông tin sai lệch', 'Yêu cầu từ tác giả'].map((r, i) => (
                      <button key={i} type="button" onClick={() => setHideReason(r)} className={`btn-quick-reason ${hideReason === r ? 'active' : ''}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="article-mgmt-popup-form-group">
                  <label className="article-mgmt-popup-label">Lý do <span className="article-mgmt-required">*</span></label>
                  <textarea value={hideReason} onChange={e => setHideReason(e.target.value)}
                    placeholder={`Nhập lý do ${articleToHide.status === 'hidden' ? 'hiện' : 'ẩn'} bài viết...`}
                    maxLength={500} rows={4} className="article-mgmt-popup-textarea" required />
                  <small className="article-mgmt-char-count">{hideReason.length}/500</small>
                </div>
                <div className="article-mgmt-popup-footer">
                  {articleToHide?.status !== 'hidden' && countdownSeconds > 0 && (
                    <div className="countdown-notice"><FaClock /><span>Vui lòng chờ {countdownSeconds} giây...</span></div>
                  )}
                  <button type="button" onClick={() => {
                    askCloseConfirm('Đóng form?', 'Bạn có muốn đóng form ẩn/hiện bài viết không?', () => {
                      setShowHidePopup(false); setCountdownSeconds(0);
                    });
                  }} className="article-mgmt-btn-cancel" disabled={hidingArticle}>Hủy</button>
                  <button type="submit" className="article-mgmt-btn-submit btn-hide-confirm"
                    disabled={hidingArticle || !hideReason.trim() || (articleToHide?.status !== 'hidden' && countdownSeconds > 0)}>
                    {hidingArticle ? <><BiLoaderAlt className="ai-spin-icon" /> Đang xử lý...</>
                      : countdownSeconds > 0 ? <><FaEyeSlash /> Xác nhận ({countdownSeconds}s)</>
                        : <>{articleToHide?.status === 'hidden' ? <FaEye /> : <FaEyeSlash />} Xác nhận {articleToHide?.status === 'hidden' ? 'hiện' : 'ẩn'}</>
                    }
                  </button>
                </div>
              </form>
              </div>
            </div>
          </Portal>
        )}

        {/* POPUP TỪ CHỐI */}
        {showRejectPopup && articleToReject && (
          <Portal>
            <div className="article-mgmt-popup-overlay" onClick={() => {
              askCloseConfirm('Đóng form?', 'Bạn có muốn đóng form từ chối yêu cầu không?', () => {
                setShowRejectPopup(false); setRejectReason('');
              });
            }}>
              <div className="article-mgmt-popup" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-popup-header">
                <div className="article-mgmt-popup-header-content">
                  <FaBan className="article-mgmt-popup-icon" />
                  <h3>Từ chối yêu cầu chỉnh sửa</h3>
                </div>
                <button onClick={() => {
                  askCloseConfirm('Đóng form?', 'Bạn có muốn đóng form từ chối yêu cầu không?', () => {
                    setShowRejectPopup(false); setRejectReason('');
                  });
                }} className="article-mgmt-btn-close-popup"><FaTimes /></button>
              </div>
              <form onSubmit={handleRejectEditRequest} className="article-mgmt-popup-body">
                <div className="article-mgmt-popup-warning">
                  <FaExclamationTriangle />
                  <div>
                    <p className="article-mgmt-warning-title">Cảnh báo</p>
                    <p className="article-mgmt-warning-text">Yêu cầu chỉnh sửa sẽ bị từ chối. Tác giả sẽ nhận thông báo.</p>
                  </div>
                </div>
                <div className="article-mgmt-popup-info">
                  <label className="article-mgmt-popup-label">Bài viết:</label>
                  <p className="article-mgmt-article-title-display">{articleToReject.title}</p>
                </div>
                <div className="article-mgmt-popup-quick-reasons">
                  <label className="article-mgmt-popup-label">Lý do nhanh:</label>
                  <div className="article-mgmt-quick-reason-buttons">
                    {['Không cần thiết', 'Thông tin chưa đủ', 'Vi phạm quy định', 'Khác'].map((r, i) => (
                      <button key={i} type="button" onClick={() => setRejectReason(r)} className={`btn-quick-reason ${rejectReason === r ? 'active' : ''}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="article-mgmt-popup-form-group">
                  <label className="article-mgmt-popup-label">Lý do chi tiết <span className="article-mgmt-required">*</span></label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do từ chối..." maxLength={500} rows={4}
                    className="article-mgmt-popup-textarea" required />
                  <small className="article-mgmt-char-count">{rejectReason.length}/500</small>
                </div>
                <div className="article-mgmt-popup-footer">
                  <button type="button" onClick={() => {
                    askCloseConfirm('Đóng form?', 'Bạn có muốn đóng form từ chối yêu cầu không?', () => {
                      setShowRejectPopup(false); setRejectReason('');
                    });
                  }} className="article-mgmt-btn-cancel" disabled={rejecting}>Hủy</button>
                  <button type="submit" className="article-mgmt-btn-submit btn-reject-confirm"
                    disabled={rejecting || !rejectReason.trim()}>
                    {rejecting ? <><BiLoaderAlt className="ai-spin-icon" /> Đang xử lý...</> : <><FaBan /> Xác nhận từ chối</>}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </Portal>
        )}

        {/* DOCTOR SELECTION MODAL */}
        {showDoctorSelectionModal && (
          <Portal>
            <div className="article-mgmt-modal-overlay" onClick={() => {
              askCloseConfirm('Đóng?', 'Bạn có muốn đóng danh sách chọn bác sĩ không?', () => setShowDoctorSelectionModal(false));
            }}>
              <div className="article-mgmt-confirm-submit-modal" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2><FaUser style={{ color: '#3b82f6' }} /> Chọn Bác Sĩ Phê Duyệt</h2>
                <button className="article-mgmt-modal-close" onClick={() => {
                  askCloseConfirm('Đóng?', 'Bạn có muốn đóng danh sách chọn bác sĩ không?', () => setShowDoctorSelectionModal(false));
                }}><FaTimes /></button>
              </div>
              <div className="article-mgmt-modal-body">
                {loadingDoctors ? (
                  <p style={{ color: 'var(--n400)', fontSize: 'var(--fs-sm)' }}><BiLoaderAlt className="ai-spin-icon" /> Đang tải bác sĩ...</p>
                ) : availableDoctors.length === 0 ? (
                  <p style={{ color: 'var(--n400)', fontSize: 'var(--fs-sm)' }}>Không có bác sĩ nào trong chuyên khoa này</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {availableDoctors.map(doctor => (
                      <button key={doctor.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', border: '1.5px solid var(--n200)',
                        borderRadius: 8, cursor: 'pointer', background: 'var(--n0)',
                        fontFamily: 'var(--font)', transition: 'all .15s', textAlign: 'left', width: '100%'
                      }}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, medical_reviewer_id: doctor.id }));
                          setAssignedDoctor(doctor); 
                          setShowDoctorSelectionModal(false);
                          setHasUnsavedChanges(true);
                        }}>
                        <img src={doctor.user?.avatar_url || '/placeholder.jpg'} alt="Doctor"
                          onError={e => e.target.src = '/placeholder.jpg'}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <strong style={{ fontSize: 'var(--fs-sm)', color: 'var(--n800)' }}>BS. {doctor.user?.full_name}</strong>
                          <small style={{ fontSize: 'var(--fs-xs)', color: 'var(--n400)' }}>{doctor.specialty?.name}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="article-mgmt-modal-footer">
                <button type="button" className="article-mgmt-btn-cancel"
                  onClick={() => {
                    askCloseConfirm('Đóng?', 'Bạn có muốn đóng danh sách chọn bác sĩ không?', () => setShowDoctorSelectionModal(false));
                  }}>Hủy</button>
              </div>
              </div>
            </div>
          </Portal>
        )}

        {/* ADMIN EDIT WARNING */}
        {showAdminEditWarning && (
          <Portal>
            <div className="article-mgmt-modal-overlay" onClick={() => {
              askCloseConfirm('Đóng?', 'Bạn có muốn đóng cảnh báo này không?', () => setShowAdminEditWarning(false));
            }}>
              <div className="article-mgmt-warning-modal" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2><FaExclamationTriangle style={{ color: '#f59e0b' }} /> Cảnh báo: Sửa bài đã duyệt</h2>
                <button className="article-mgmt-modal-close" onClick={() => {
                  askCloseConfirm('Đóng?', 'Bạn có muốn đóng cảnh báo này không?', () => setShowAdminEditWarning(false));
                }}><FaTimes /></button>
              </div>
              <div className="article-mgmt-modal-body">
                <p>Bài viết <strong>"{editingApprovedArticle?.title}"</strong> đang <strong style={{ color: '#10b981' }}>hiển thị công khai</strong>. Bạn muốn:</p>
                <div className="article-mgmt-admin-edit-choices">
                  <button className="article-mgmt-choice-btn article-mgmt-hide-first-btn" onClick={() => handleAdminEditChoice('hide-first')}>
                    <FaEyeSlash />
                    <div><span>Ẩn bài viết trước, sau đó sửa</span><small>Khuyến nghị: Người dùng không thấy bài trong khi bạn sửa</small></div>
                  </button>
                  <button className="article-mgmt-choice-btn article-mgmt-direct-edit-btn" onClick={() => handleAdminEditChoice('direct')}>
                    <FaEdit />
                    <div><span>Sửa trực tiếp (không ẩn)</span><small>Lưu ý: Thay đổi sẽ hiển thị ngay cho người dùng</small></div>
                  </button>
                </div>
              </div>
              <div className="article-mgmt-modal-footer">
                <button className="btn article-mgmt-btn-secondary" onClick={() => setShowAdminEditWarning(false)}><FaTimes /> Hủy</button>
              </div>
              </div>
            </div>
          </Portal>
        )}

        {/* SUBMIT CONFIRM */}
        {showSubmitConfirm && (
          <Portal>
            <div className="article-mgmt-modal-overlay" onClick={() => {
              askCloseConfirm('Hủy gửi?', 'Bạn có muốn hủy việc gửi phê duyệt không?', () => setShowSubmitConfirm(false));
            }}>
              <div className="article-mgmt-confirm-submit-modal" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2><FaCheckCircle style={{ color: '#10b981' }} /> Xác nhận gửi phê duyệt</h2>
                <button className="article-mgmt-modal-close" onClick={() => {
                  askCloseConfirm('Hủy gửi?', 'Bạn có muốn hủy việc gửi phê duyệt không?', () => setShowSubmitConfirm(false));
                }}><FaTimes /></button>
              </div>
              <div className="article-mgmt-modal-body">
                <p>Bạn chắc chắn muốn <strong>gửi bài viết này để phê duyệt</strong>?</p>
                <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Sau khi gửi, bạn sẽ không thể chỉnh sửa cho đến khi admin phản hồi.</p>
              </div>
              <div className="article-mgmt-modal-footer">
                <button className="btn article-mgmt-btn-secondary" onClick={() => setShowSubmitConfirm(false)}><FaTimes /> Hủy</button>
                <button className="btn article-mgmt-btn-primary" onClick={() => { setShowSubmitConfirm(false); handleSubmit(null, false, false, true); }}>
                  <FaPaperPlane /> Xác nhận gửi
                </button>
              </div>
              </div>
            </div>
          </Portal>
        )}

        {/* AI SUPPORT MENU */}
        {showAISupportMenu && (
          <Portal>
            <div className="article-mgmt-modal-overlay" onClick={() => {
              if (!analyzingAI) {
                askCloseConfirm('Đóng AI?', 'Bạn có muốn đóng bảng AI hỗ trợ không?', () => {
                  setShowAISupportMenu(false); setSelectedAIOption(null);
                });
              }
            }}>
              <div className="article-mgmt-ai-modal" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2><MdAutoAwesome style={{ color: '#8b5cf6', fontSize: 18 }} /> Chọn chức năng AI hỗ trợ</h2>
                <button className="article-mgmt-modal-close" onClick={() => {
                  if (!analyzingAI) {
                    askCloseConfirm('Đóng AI?', 'Bạn có muốn đóng bảng AI hỗ trợ không?', () => {
                      setShowAISupportMenu(false); setSelectedAIOption(null);
                    });
                  }
                }}><FaTimes /></button>
              </div>

              <div className="article-mgmt-modal-body article-mgmt-modal-body-scrollable">

                {/* Trạng thái đang phân tích — Icon chuyển động */}
                {analyzingAI ? (
                  <div className="article-mgmt-ai-loading">
                    <div className="article-mgmt-ai-loading-anim">
                      {/* Ring + Brain icon pulse */}
                      <div className="article-mgmt-ai-icon-ring">
                        <FaBrain className="article-mgmt-ai-brain-icon" />
                      </div>
                      {/* Bouncing dots */}
                      <div className="article-mgmt-ai-loading-dots">
                        <span /><span /><span />
                      </div>
                    </div>
                    <p className="article-mgmt-ai-loading-text">AI đang phân tích nội dung...</p>
                    <p className="article-mgmt-ai-loading-subtext">Vui lòng chờ trong giây lát</p>
                  </div>
                ) : (
                  <>
                    <div className="article-mgmt-ai-option-container">
                      {[
                        { key: 'suggest_specialty', icon: <FaHospital />, label: 'Gợi ý chuyên khoa', desc: 'AI sẽ gợi ý chuyên khoa phù hợp nhất cho bài viết', color: '#0ea5e9' },
                        { key: 'classify_article', icon: <FaLayerGroup />, label: 'Phân loại bài viết', desc: 'Gợi ý tags, danh mục và thông tin liên quan', color: '#8b5cf6' },
                        { key: 'seo_optimize', icon: <FaSearch />, label: 'Tối ưu SEO & Tiêu đề', desc: 'Tối ưu hóa tiêu đề và nội dung để dễ tìm kiếm', color: '#f59e0b' },
                        { key: 'check_spelling', icon: <FaLanguage />, label: 'Kiểm tra chính tả & Ngữ pháp', desc: 'Sửa lỗi chính tả, cải thiện cách diễn đạt', color: '#10b981' },
                        { key: 'summarize', icon: <FaListUl />, label: 'Tóm tắt nội dung', desc: 'Tạo tóm tắt ngắn gọn từ nội dung bài viết', color: '#f97316' },
                        { key: 'rephrase', icon: <FaBrain />, label: 'Diễn đạt lại nội dung', desc: 'Viết lại bài viết với cách diễn đạt khác để dễ hiểu hơn', color: '#ec4899' },
                        { key: 'custom', icon: <FaWrench />, label: 'Tùy chỉnh (Custom)', desc: 'Nhập lệnh riêng của bạn', color: '#64748b' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => opt.key === 'custom' ? setSelectedAIOption('custom') : handleAIOptionSelect(opt.key)}
                          disabled={analyzingAI}
                          className={`article-mgmt-ai-option-button ${selectedAIOption === opt.key ? 'active' : ''}`}
                          style={{ '--ai-opt-color': opt.color }}
                        >
                          <span className="ai-opt-icon" style={{ color: opt.color }}>{opt.icon}</span>
                          <div>
                            <strong>{opt.label}</strong>
                            <small>{opt.desc}</small>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedAIOption === 'custom' && (
                      <div className="article-mgmt-custom-prompt-box">
                        <label className="article-mgmt-custom-prompt-label">Nhập lệnh AI:</label>
                        <textarea
                          value={customAIPrompt}
                          onChange={e => setCustomAIPrompt(e.target.value)}
                          placeholder="VD: Viết lại sang trọng hơn, tăng độ dài lên 50%..."
                          className="article-mgmt-custom-prompt-input"
                          rows={3}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="article-mgmt-modal-footer">
                <button type="button" className="article-mgmt-btn-cancel"
                  onClick={() => {
                    if (!analyzingAI) {
                      askCloseConfirm('Đóng AI?', 'Bạn có muốn đóng bảng AI hỗ trợ không?', () => {
                        setShowAISupportMenu(false); setSelectedAIOption(null); setCustomAIPrompt('');
                      });
                    }
                  }}
                  disabled={analyzingAI}>
                  Hủy
                </button>
                {selectedAIOption === 'custom' && !analyzingAI && (
                  <button type="button" className="btn article-mgmt-btn-primary"
                    onClick={() => handleAIOptionSelect('custom')} disabled={!customAIPrompt.trim()}>
                    <MdAutoAwesome /> Phân tích
                  </button>
                )}
              </div>
              </div>
            </div>
          </Portal>
        )}

        {/* AI WARNING POPUP */}
        {showAIWarning && aiPreviewData && (
          <Portal>
            <div className="article-mgmt-modal-overlay" onClick={() => {
              askCloseConfirm('Đóng?', 'Bạn có muốn bỏ qua gợi ý AI không?', () => setShowAIWarning(false));
            }}>
              <div className="article-mgmt-confirm-submit-modal" onClick={e => e.stopPropagation()}>
              <div className="article-mgmt-modal-header">
                <h2><FaExclamationTriangle style={{ color: '#f59e0b' }} /> Xác nhận áp dụng gợi ý AI</h2>
                <button className="article-mgmt-modal-close" onClick={() => {
                  askCloseConfirm('Đóng?', 'Bạn có muốn bỏ qua gợi ý AI không?', () => setShowAIWarning(false));
                }}><FaTimes /></button>
              </div>
              <div className="article-mgmt-modal-body">
                <div className="article-mgmt-ai-warning-alert">
                  <FaExclamationTriangle style={{ fontSize: '1.25rem', flexShrink: 0 }} />
                  <div><strong>Lưu ý:</strong> Những thay đổi sau đây sẽ được áp dụng. Hãy kiểm tra kỹ trước khi xác nhận.</div>
                </div>
                <div className="article-mgmt-ai-preview-grid">
                  {aiPreviewData.suggested_title && (
                    <div className="article-mgmt-ai-preview-item">
                      <div className="article-mgmt-ai-preview-item-label">Tiêu đề mới:</div>
                      <p className="article-mgmt-ai-preview-item-content">{aiPreviewData.suggested_title}</p>
                    </div>
                  )}
                  {aiPreviewData.suggested_tags?.length > 0 && (
                    <div className="article-mgmt-ai-preview-item">
                      <div className="article-mgmt-ai-preview-item-label">Tags gợi ý:</div>
                      <div className="article-mgmt-ai-tags-display">
                        {aiPreviewData.suggested_tags.map((tag, i) => (
                          <span key={i} className="article-mgmt-ai-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiPreviewData.suggested_specialty && (
                    <div className="article-mgmt-ai-preview-item">
                      <div className="article-mgmt-ai-preview-item-label">Chuyên khoa gợi ý:</div>
                      <p className="article-mgmt-ai-preview-item-content">{aiPreviewData.suggested_specialty}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="article-mgmt-modal-footer">
                <button type="button" className="article-mgmt-btn-cancel" onClick={() => setShowAIWarning(false)}>Không áp dụng</button>
                <button type="button" className="btn article-mgmt-btn-primary" onClick={handleApplyAIChanges} style={{ background: '#8b5cf6' }}>
                  <FaCheck /> Áp dụng thay đổi
                </button>
              </div>
              </div>
            </div>
          </Portal>
        )}

        {/* ══ CLOSE CONFIRM POPUP — layer cao nhất ══ */}
        {closeConfirm.visible && (
          <Portal>
            <div className="article-mgmt-close-confirm-overlay">
              <div className="article-mgmt-close-confirm-box">
                <FaQuestionCircle className="article-mgmt-close-confirm-icon" />
                <h3 className="article-mgmt-close-confirm-title">{closeConfirm.title}</h3>
                <p className="article-mgmt-close-confirm-msg">{closeConfirm.message}</p>
                <div className="article-mgmt-close-confirm-actions">
                  <button className="btn-close-confirm-cancel" onClick={handleCloseConfirmCancel}>Không, ở lại</button>
                  <button className="btn-close-confirm-ok" onClick={handleCloseConfirmOk}>Đóng</button>
                </div>
              </div>
            </div>
          </Portal>
        )}

      </div>
    </div>
  );
};

export default ArticleManagementPage;
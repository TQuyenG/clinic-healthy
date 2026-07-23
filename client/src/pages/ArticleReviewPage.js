// client/src/pages/ArticleReviewPage.js - VERSION 5.0 (Tích hợp phân quyền Bác sĩ)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendar, FaTag, FaLink, FaNewspaper,
  FaCheck, FaBan, FaHistory, FaCheckCircle, FaExclamationTriangle, 
  FaPaperPlane, FaCommentDots, FaSpinner, FaEyeSlash, FaEye, FaStethoscope, FaLock
} from 'react-icons/fa';
import usePermissions from '../hooks/usePermissions';
import './ArticleReviewPage.css';

const ArticleReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001';
  const { user, hasPermission, isAdmin } = usePermissions();

  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States cho Form và Popup
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [processingReview, setProcessingReview] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  // Popup Từ chối / Yêu cầu đính chính
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectActionType, setRejectActionType] = useState('reject'); // 'reject' hoặc 'request_rewrite'

  // Popup Ẩn/Hiện bài viết (Dành cho Admin)
  const [showHidePopup, setShowHidePopup] = useState(false);
  const [hideReason, setHideReason] = useState('');

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const openConfirm = (action, note = '') => {
    setConfirmAction({ action, note });
  };

  const axiosConfig = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

  useEffect(() => {
    fetchArticleData();
  }, [id]);

  const fetchArticleData = async () => {
    setLoading(true);
    try {
      const [artRes, comRes, histRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/articles/${id}`, axiosConfig),
        axios.get(`${API_BASE_URL}/api/articles/${id}/comments`, axiosConfig).catch(() => ({ data: { comments: [] } })),
        axios.get(`${API_BASE_URL}/api/articles/${id}/review-history`, axiosConfig).catch(() => ({ data: { history: [] } }))
      ]);

      if (artRes.data.success) setArticle(artRes.data.article);
      if (comRes.data?.success) setComments(comRes.data.comments);
      if (histRes.data?.success) setReviewHistory(histRes.data.history);
    } catch (error) {
      showToast('Không thể tải dữ liệu bài viết hoặc bạn không có quyền truy cập', 'error');
      navigate('/quan-ly-bai-viet');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HÀNH ĐỘNG PHÊ DUYỆT BÀI VIẾT
  // ============================================
  const handleReviewAction = async (action, note = '') => {
    setProcessingReview(true);
    try {
      const payload = { action, admin_note: note };
      await axios.post(`${API_BASE_URL}/api/articles/${id}/review`, payload, axiosConfig);
      
      showToast(action === 'approve' ? 'Đã duyệt bài viết thành công!' : 'Đã xử lý bài viết', 'success');
      setShowRejectPopup(false);
      setRejectReason('');
      setConfirmAction(null);
      fetchArticleData();
    } catch (error) {
      showToast('Lỗi: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setProcessingReview(false);
    }
  };

  // ============================================
  // HÀNH ĐỘNG ẨN/HIỆN (DÀNH CHO ADMIN)
  // ============================================
  const handleToggleHide = async (e) => {
    e.preventDefault();
    if (!hideReason.trim()) return showToast('Vui lòng nhập lý do', 'warning');
    setProcessingReview(true);
    try {
      const endpoint = article.status === 'hidden' ? 'unhide' : 'hide';
      await axios.post(`${API_BASE_URL}/api/articles/${id}/${endpoint}`, { reason: hideReason }, axiosConfig);
      showToast(`Đã ${article.status === 'hidden' ? 'hiện' : 'ẩn'} bài viết`, 'success');
      setShowHidePopup(false);
      setHideReason('');
      fetchArticleData();
    } catch (error) {
      showToast('Lỗi thao tác ẩn hiện', 'error');
    } finally {
      setProcessingReview(false);
    }
  };

  // ============================================
  // COMMENT TRAO ĐỔI NỘI BỘ
  // ============================================
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await axios.post(`${API_BASE_URL}/api/articles/${id}/comments`, { comment_text: commentText }, axiosConfig);
      setCommentText('');
      const comRes = await axios.get(`${API_BASE_URL}/api/articles/${id}/comments`, axiosConfig);
      if (comRes.data.success) setComments(comRes.data.comments);
    } catch (error) {
      showToast('Lỗi gửi comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}><FaSpinner className="fa-spin" /> Đang tải dữ liệu...</div>;
  if (!article) return <div style={{padding: '3rem', textAlign: 'center'}}>Không tìm thấy bài viết</div>;

  // PHÂN QUYỀN GIAO DIỆN NÚT BẤM
  const currentRole = String(user?.role || '').toLowerCase();
  const currentDoctorId = Number(user?.doctor?.id || user?.doctor_id || user?.role_info?.doctor_id || 0);
  const articleReviewerId = Number(article?.medical_reviewer_id || 0);
  const isDoctorReviewer = currentRole === 'doctor' && currentDoctorId > 0 && articleReviewerId > 0 && currentDoctorId === articleReviewerId;
  const isManagerOrAdmin = isAdmin || (currentRole === 'staff' && hasPermission('articles', 'approve'));
  const canReviewMedical = isAdmin || isDoctorReviewer;

  return (
    <div className="review-article-page">
      <div className="review-article-container">
        
        {/* HEADER */}
        <div className="review-article-header">
          <button className="review-article-btn-back" onClick={() => navigate('/quan-ly-bai-viet')}>
            <FaArrowLeft /> Trở về
          </button>
          <h1 className="review-article-title">Chi tiết Phê duyệt Bài viết</h1>
        </div>

        <div className="review-article-layout">
          
          {/* CỘT TRÁI: NỘI DUNG BÀI VIẾT */}
          <div className="review-article-content-card">
            {article.cover_image_url && <img src={article.cover_image_url} alt="Cover" className="review-article-preview-cover" />}
            
            {/* Warning for author: cannot edit while pending */}
            {(['pending', 'pending_medical'].includes(article.status)) && user?.id === article.author_id && (
              <div style={{
                background: '#dbeafe',
                borderLeft: '4px solid #3b82f6',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                  <FaLock style={{marginRight: '6px'}} /> Bài viết đang được phê duyệt
                </div>
                <p style={{ margin: 0, color: '#1e3a8a', lineHeight: '1.4' }}>
                  Bạn không thể chỉnh sửa bài viết trong lúc nó đang được phê duyệt. Hãy chờ phản hồi từ người duyệt.
                </p>
              </div>
            )}
            
            <h1 className="review-article-article-title">{article.title}</h1>
            
            <div className="review-article-meta">
              <span><FaUser /> Tác giả: <strong>{article.author?.full_name || 'Ẩn danh'}</strong></span>
              <span><FaNewspaper /> Danh mục: <strong>{article.category?.name || 'Không có'}</strong></span>
              <span><FaCalendar /> Ngày tạo: {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
            
            {article.tags_json && article.tags_json.length > 0 && (
              <div className="review-article-meta">
                <FaTag /> Tags: 
                {article.tags_json.map((tag, i) => <span key={i} className="meta-tag">{tag}</span>)}
              </div>
            )}

            <div className="review-article-html-content" dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>

          {/* CỘT PHẢI: SIDEBAR THAO TÁC & COMMENT */}
          <div className="review-article-sidebar">
            
            {/* THẺ TRẠNG THÁI */}
            <div className="review-article-status-card">
              <div className={`review-status-badge status-${article.status}`}>
                Trạng thái: {
                  article.status === 'pending_medical' ? 'Chờ Bác sĩ duyệt' :
                  article.status === 'pending' ? 'Chờ Trưởng phòng duyệt' :
                  article.status === 'approved' ? 'Đã Xuất bản' :
                  article.status === 'rejected' ? 'Bị Từ chối' : 
                  article.status === 'hidden' ? 'Đang Ẩn' : article.status
                }
              </div>

              {/* Thông báo lý do ẩn (cho tác giả) */}
              {article.status === 'hidden' && article.hidden_reason && user?.id === article.author_id && (
                <div style={{
                  background: '#fef3c7',
                  borderLeft: '4px solid #f59e0b',
                  padding: '12px',
                  borderRadius: '6px',
                  marginTop: '10px',
                  fontSize: '14px'
                }}>
                  <div style={{ fontWeight: '600', color: '#d97706', marginBottom: '6px' }}>
                    <FaExclamationTriangle style={{marginRight: '6px'}} /> Lý do bài bị ẩn:
                  </div>
                  <p style={{ margin: 0, color: '#92400e', lineHeight: '1.5' }}>{article.hidden_reason}</p>
                  <small style={{ display: 'block', marginTop: '8px', color: '#b45309' }}>
                    Bạn có thể chỉnh sửa bài viết và gửi lại để phê duyệt
                  </small>
                </div>
              )}

              {/* Thông tin Bác sĩ tham vấn */}
              {article.is_medical_review_required && article.medical_reviewer && (
                <div className="medical-review-badge">
                  <img src={article.medical_reviewer.avatar_url || '/placeholder.jpg'} alt="Doc" />
                  <div>
                    <div style={{fontSize: '0.8rem', color: '#059669'}}>Phụ trách tham vấn Y khoa:</div>
                    <strong>BS. {article.medical_reviewer.full_name}</strong>
                    {article.status === 'pending' || article.status === 'approved' ? 
                      <div style={{fontSize: '0.8rem', color: '#166534', marginTop: '4px'}}><FaCheckCircle/> Đã xác nhận chuyên môn</div> : 
                      <div style={{fontSize: '0.8rem', color: '#d97706', marginTop: '4px'}}><FaSpinner className="fa-spin"/> Đang chờ duyệt...</div>
                    }
                  </div>
                </div>
              )}

              {/* CÁC NÚT THAO TÁC (ROLE-BASED) */}
              <div className="review-article-actions-box">
                
                {/* Dành cho Bác sĩ */}
                {canReviewMedical && article.status === 'pending_medical' && (
                  <>
                    <button className="btn-review-action btn-approve-medical" onClick={() => openConfirm('approve')} disabled={processingReview}>
                      <FaStethoscope /> Xác nhận chuyên môn
                    </button>
                    <button className="btn-review-action btn-reject" onClick={() => { setRejectActionType('reject'); setShowRejectPopup(true); }}>
                      <FaBan /> Yêu cầu đính chính kiến thức
                    </button>
                  </>
                )}

                {/* Dành cho Admin/Manager */}
                {(isManagerOrAdmin || isAdmin) && article.status === 'pending' && (
                  <>
                    <button className="btn-review-action btn-approve-publish" onClick={() => openConfirm('approve')} disabled={processingReview}>
                      <FaCheckCircle /> Phê duyệt & Xuất bản
                    </button>
                    <button className="btn-review-action btn-reject" onClick={() => { setRejectActionType('reject'); setShowRejectPopup(true); }}>
                      <FaBan /> Từ chối bài viết
                    </button>
                    <button className="btn-review-action btn-reject" onClick={() => { setRejectActionType('request_rewrite'); setShowRejectPopup(true); }} style={{background: '#fff', color: '#b91c1c'}}>
                      <FaHistory /> Yêu cầu viết lại
                    </button>
                  </>
                )}

                {/* Nút Ẩn/Hiện bài dành cho Admin hoặc Content Manager */}
                {(isAdmin || (user?.role === 'staff' && user?.staff?.department === 'content' && user?.staff?.rank === 'manager') || hasPermission('articles', 'hide')) && (article.status === 'approved' || article.status === 'hidden') && (
                  <button className="btn-review-action btn-hide" onClick={() => setShowHidePopup(true)}>
                    {article.status === 'hidden' ? <><FaEye /> Hiện lại bài viết</> : <><FaEyeSlash /> Ẩn bài viết này</>}
                  </button>
                )}

              </div>
            </div>

            {/* TRAO ĐỔI NỘI BỘ (COMMENTS) */}
            <div className="review-article-comments-card">
              <h3><FaCommentDots /> Trao đổi nội bộ</h3>
              <div className="review-comment-list">
                {comments.length === 0 ? <p style={{color: '#94a3b8', fontStyle: 'italic'}}>Chưa có thảo luận nào.</p> : 
                  comments.map(c => (
                    <div key={c.id} className="review-comment-item">
                      <div className="review-comment-meta">
                        <span>{c.user?.full_name} ({c.user?.role})</span>
                        <span>{new Date(c.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <p className="review-comment-text">{c.comment_text}</p>
                    </div>
                  ))
                }
              </div>
              <form className="review-comment-form" onSubmit={handleSendComment}>
                <textarea rows="3" placeholder="Nhập ghi chú cho tác giả/người duyệt..." value={commentText} onChange={e => setCommentText(e.target.value)} required />
                <button type="submit" disabled={submittingComment}>{submittingComment ? 'Đang gửi...' : 'Gửi'}</button>
                <div style={{clear: 'both'}}></div>
              </form>
            </div>

          </div>
        </div>
      </div>

      {/* POPUPS */}
      {confirmAction && (
        <div className="review-modal-overlay">
          <div className="review-modal-content">
            <h2>Xác nhận hành động</h2>
            <p>Bạn chắc chắn muốn thực hiện thao tác này?</p>
            <div className="review-modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmAction(null)}>Hủy</button>
              <button className="btn-review-action btn-approve-publish" onClick={() => handleReviewAction(confirmAction.action, confirmAction.note)} disabled={processingReview}>
                {processingReview ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Popup Yêu cầu sửa / Từ chối */}
      {showRejectPopup && (
        <div className="review-modal-overlay">
          <div className="review-modal-content">
            <h2>{rejectActionType === 'reject' ? 'Lý do từ chối/đính chính' : 'Lý do yêu cầu viết lại'}</h2>
            <textarea placeholder="Nhập lý do chi tiết để tác giả có thể chỉnh sửa..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div className="review-modal-actions">
              <button className="btn-cancel" onClick={() => setShowRejectPopup(false)}>Hủy</button>
              <button className="btn-review-action btn-reject" style={{width: 'auto', padding: '0.6rem 1.5rem'}} onClick={() => handleReviewAction(rejectActionType, rejectReason)} disabled={!rejectReason.trim()}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Ẩn/Hiện */}
      {showHidePopup && (
        <div className="review-modal-overlay">
          <div className="review-modal-content">
            <h2>{article.status === 'hidden' ? 'Lý do hiện lại bài viết' : 'Lý do ẩn bài viết'}</h2>
            <textarea placeholder="Ghi chú cho hành động này..." value={hideReason} onChange={e => setHideReason(e.target.value)} />
            <div className="review-modal-actions">
              <button className="btn-cancel" onClick={() => setShowHidePopup(false)}>Hủy</button>
              <button className="btn-review-action btn-hide" style={{width: 'auto', padding: '0.6rem 1.5rem'}} onClick={handleToggleHide} disabled={!hideReason.trim()}>
                Thực thi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="article-review-toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`article-review-toast toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default ArticleReviewPage;
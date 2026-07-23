// client/src/pages/QuestionDetailPage.js
import React, {
  useState, useEffect, useContext, useCallback, useMemo, useRef,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import forumService from '../services/forumService';
import ForumBanner from '../components/ForumBanner';
import { FORUM_ROUTE } from '../utils/constants';
import './QuestionDetailPage.css';
import {
  FaArrowLeft, FaHeart, FaRegHeart, FaComments, FaShare, FaFlag,
  FaUserMd, FaReply, FaEye, FaBookmark, FaRegBookmark,
  FaCheckCircle, FaFileAlt, FaFilePdf, FaFileWord,
  FaFileExcel, FaImage, FaPaperclip,
  FaShieldAlt, FaTimes, FaInfoCircle,
} from 'react-icons/fa';

const REPLY_PREFIX = /^\[@reply:(\d+)\]\s*/i;
const ensureArray = (v) => (Array.isArray(v) ? v : []);

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return '–';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '–';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return date.toLocaleDateString('vi-VN');
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

// ────────────────────────────────────────────
// UserAvatar
// ────────────────────────────────────────────
const UserAvatar = ({ user, size = 32, isAnonymous = false }) => {
  const initial = isAnonymous ? 'A' : (user?.full_name?.charAt(0) || 'U');
  const avatarUrl = isAnonymous ? null : user?.avatar_url;
  return (
    <div className="qdp-avatar" style={{ width: size, height: size, minWidth: size, fontSize: size * 0.44 }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={user?.full_name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        : <span>{initial.toUpperCase()}</span>}
    </div>
  );
};

// ────────────────────────────────────────────
// ReportModal
// ────────────────────────────────────────────
const ReportModal = ({ show, onClose, reportData, setReportData, onSubmit }) => {
  if (!show) return null;
  return (
    <div className="qdp-modal-overlay" onClick={onClose}>
      <div className="qdp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qdp-modal-header">
          <h3><FaFlag style={{ color: '#e74c3c' }} /> Báo cáo vi phạm</h3>
          <button type="button" className="qdp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="qdp-modal-body">
          <label className="qdp-form-label">Lý do báo cáo</label>
          <div className="qdp-select-wrap">
            <select value={reportData.reason} onChange={(e) => setReportData({ ...reportData, reason: e.target.value })}>
              <option value="spam">Spam / Quảng cáo</option>
              <option value="offensive">Xúc phạm / Thô tục</option>
              <option value="misleading">Thông tin sai lệch</option>
              <option value="other">Lý do khác</option>
            </select>
          </div>
          <label className="qdp-form-label" style={{ marginTop: 14 }}>Mô tả thêm <span style={{ color: '#aaa', fontWeight: 400 }}>(tùy chọn)</span></label>
          <textarea
            className="qdp-textarea"
            rows={3}
            placeholder="Mô tả chi tiết..."
            value={reportData.description}
            onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
          />
        </div>
        <div className="qdp-modal-footer">
          <button type="button" className="qdp-btn-ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="qdp-btn-danger" onClick={onSubmit}>Gửi báo cáo</button>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────
// AnswerThread — đệ quy kiểu Reddit, clean indent
// ────────────────────────────────────────────
const AnswerThread = ({
  answer, depth = 0, user,
  activeReply, setActiveReply,
  replyDrafts, setReplyDrafts,
  replySubmitting,
  onLike, onReply, onReport,
}) => {
  const isDeleted = answer.isDeleted;
  const isReplying = activeReply === answer.id;
  const contentDisplay = isDeleted
    ? <i className="qdp-deleted-text">Bình luận đã bị xóa.</i>
    : answer.content.replace(REPLY_PREFIX, '');

  const isDoctor = answer.author?.role === 'doctor';
  // Optimistic like count: dùng state local để tránh nhảy số
  const [localLiked, setLocalLiked] = useState(!!answer.liked || !!answer.isLiked);
  const [localCount, setLocalCount] = useState(
    typeof answer.likesCount === 'number' ? answer.likesCount : 0
  );
  // Đồng bộ khi answer prop thay đổi (sau khi refetch)
  useEffect(() => {
    setLocalLiked(!!answer.liked || !!answer.isLiked);
    setLocalCount(typeof answer.likesCount === 'number' ? answer.likesCount : 0);
  }, [answer.liked, answer.isLiked, answer.likesCount]);

  const handleLocalLike = async () => {
    // Optimistic update trước
    const newLiked = !localLiked;
    const newCount = newLiked ? localCount + 1 : Math.max(0, localCount - 1);
    setLocalLiked(newLiked);
    setLocalCount(newCount);
    // Gọi API — nếu lỗi thì rollback
    try {
      await onLike('answer', answer.id);
    } catch {
      setLocalLiked(localLiked);
      setLocalCount(localCount);
    }
  };

  return (
    <div className={`qdp-thread-item ${depth > 0 ? 'qdp-thread-item--reply' : ''}`}>
      {/* Author row */}
      <div className="qdp-comment-header">
        <UserAvatar user={answer.author} size={30} />
        <span className={`qdp-comment-author ${isDoctor ? 'doctor' : ''}`}>
          {answer.author?.full_name || 'Người dùng'}
          {isDoctor && <span className="qdp-badge-doctor"><FaUserMd /> Bác sĩ</span>}
          {answer.isVerified && <span className="qdp-badge-verified"><FaCheckCircle /> Xác nhận</span>}
          {answer.isPinned && <span className="qdp-badge-pinned">📌 Nổi bật</span>}
        </span>
        <span className="qdp-comment-time">{formatRelativeTime(answer.createdAt)}</span>
      </div>

      {/* Content */}
      <div className={`qdp-comment-content ${isDeleted ? 'deleted' : ''}`}>{contentDisplay}</div>

      {/* Actions */}
      {!isDeleted && (
        <div className="qdp-comment-actions">
          <button
            type="button"
            className={`qdp-comment-action-btn ${localLiked ? 'liked' : ''}`}
            onClick={handleLocalLike}
          >
            {localLiked ? <FaHeart /> : <FaRegHeart />}
            <span>{localCount}</span>
          </button>
          <button
            type="button"
            className="qdp-comment-action-btn"
            onClick={() => setActiveReply(isReplying ? null : answer.id)}
          >
            <FaReply /> Phản hồi
          </button>
          <button
            type="button"
            className="qdp-comment-action-btn qdp-comment-action-btn--report"
            onClick={() => onReport('answer', answer.id)}
            title="Báo cáo"
          >
            <FaFlag />
          </button>
        </div>
      )}

      {/* Reply form */}
      {isReplying && (
        <div className="qdp-reply-form">
          <UserAvatar user={user} size={26} />
          <div className="qdp-reply-form-inner">
            <textarea
              className="qdp-textarea qdp-textarea--sm"
              placeholder={`Phản hồi ${answer.author?.full_name || ''}...`}
              rows={2}
              value={replyDrafts[answer.id] || ''}
              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [answer.id]: e.target.value }))}
              autoFocus
            />
            <div className="qdp-reply-form-footer">
              <button type="button" className="qdp-btn-ghost qdp-btn-xs" onClick={() => setActiveReply(null)}>Hủy</button>
              <button
                type="button"
                className="qdp-btn-primary qdp-btn-xs"
                disabled={replySubmitting[answer.id]}
                onClick={() => onReply(answer.id)}
              >
                {replySubmitting[answer.id] ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested replies — chỉ thụt lề bằng border-left, không dùng padding lồng nhau */}
      {answer.replies && answer.replies.length > 0 && (
        <div className="qdp-replies-block">
          {answer.replies.map((reply) => (
            <AnswerThread
              key={reply.id}
              answer={reply}
              depth={depth + 1}
              user={user}
              activeReply={activeReply}
              setActiveReply={setActiveReply}
              replyDrafts={replyDrafts}
              setReplyDrafts={setReplyDrafts}
              replySubmitting={replySubmitting}
              onLike={onLike}
              onReply={onReply}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────
// QuestionDetailPage — Main
// ────────────────────────────────────────────
const QuestionDetailPage = () => {
  const { id } = useParams();
  const authContext = useContext(AuthContext);
  const user = authContext?.user || JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySubmitting, setReplySubmitting] = useState({});
  const [activeReply, setActiveReply] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [sortBy, setSortBy] = useState('best');
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [lightboxImg, setLightboxImg] = useState(null);
  const composeRef = useRef(null);

  // Optimistic like state cho question
  const [qLiked, setQLiked] = useState(false);
  const [qLikeCount, setQLikeCount] = useState(0);

  const [reportData, setReportData] = useState({
    entityType: 'question', entityId: null, reason: 'spam', description: '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3000);
  };

  const fetchQuestionDetail = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const payload = await forumService.getQuestionDetail(id);
      if (payload.success) {
        const q = payload.data;
        setQuestion(q);
        setAnswers(q.answers || []);
        // Đồng bộ like state sau mỗi fetch
        setQLiked(!!q.liked || !!q.isLiked);
        setQLikeCount(typeof q.likesCount === 'number' ? q.likesCount : 0);
      }
    } catch (error) {
      navigate(FORUM_ROUTE);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { if (id) fetchQuestionDetail(true); }, [id, fetchQuestionDetail]);

  useEffect(() => {
    const handler = (e) => {
      const payload = e.detail || {};
      if (payload.entity_type === 'question' && String(payload.entity_id) === String(id)) {
        setQuestion((prev) => (prev ? { ...prev, ...payload } : prev));
        if (payload.interaction_type === 'comment') fetchQuestionDetail(false);
      }
    };
    window.addEventListener('forum:interaction', handler);
    return () => window.removeEventListener('forum:interaction', handler);
  }, [id, fetchQuestionDetail]);

  // Build threaded comment tree
  const buildThread = (flatAnswers) => {
    const map = new Map();
    flatAnswers.forEach((a) => map.set(a.id, { ...a, replies: [] }));
    const roots = [];
    flatAnswers.forEach((a) => {
      const match = a.content && a.content.match(REPLY_PREFIX);
      const parentId = match ? Number(match[1]) : null;
      if (parentId && map.has(parentId)) {
        map.get(parentId).replies.push(map.get(a.id));
      } else {
        roots.push(map.get(a.id));
      }
    });
    return roots;
  };

  const threadedAnswers = useMemo(() => {
    const tree = buildThread(answers);
    if (sortBy === 'best') return [...tree].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    if (sortBy === 'new') return [...tree].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sortBy === 'old') return [...tree].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return tree;
  }, [answers, sortBy]);

  const handleLike = async (targetType, targetId) => {
    if (!user) { showToast('Vui lòng đăng nhập', 'warning'); return; }
    if (targetType === 'question') {
      // Optimistic update ngay lập tức
      const newLiked = !qLiked;
      const newCount = newLiked ? qLikeCount + 1 : Math.max(0, qLikeCount - 1);
      setQLiked(newLiked);
      setQLikeCount(newCount);
      try {
        const res = await api.post(`/forum/questions/${id}/like`);
        if (res.data.success) {
          // Đồng bộ số thật từ server
          setQLiked(!!res.data.data.liked);
          setQLikeCount(res.data.data.likesCount ?? newCount);
        }
      } catch (e) {
        // Rollback nếu lỗi
        setQLiked(qLiked);
        setQLikeCount(qLikeCount);
      }
    } else {
      // Với answer: AnswerThread tự xử lý optimistic, đây chỉ gọi API
      try {
        const res = await api.post(`/forum/answers/${targetId}/like`);
        if (res.data.success) {
          // Cập nhật answers array để AnswerThread sync lại sau refetch
          setAnswers((prev) => prev.map((a) =>
            a.id === targetId
              ? { ...a, liked: res.data.data.liked, isLiked: res.data.data.liked, likesCount: res.data.data.likesCount }
              : a
          ));
        }
      } catch (e) { console.error(e); }
    }
  };

  const handleSave = async () => {
    if (!user) { showToast('Vui lòng đăng nhập', 'warning'); return; }
    try {
      const res = await api.post(`/forum/questions/${id}/save`);
      if (res.data.success) {
        setQuestion((prev) => ({ ...prev, saved: res.data.data.saved }));
        showToast(res.data.data.saved ? 'Đã lưu câu hỏi' : 'Đã bỏ lưu');
      }
    } catch (e) { showToast('Có lỗi xảy ra', 'error'); }
  };

  const handleSubmitAnswer = async () => {
    if (!user) { showToast('Vui lòng đăng nhập', 'warning'); return; }
    if (!answerContent.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/forum/questions/${id}/answers`, { content: answerContent });
      setAnswerContent('');
      showToast('Bình luận đã được gửi!');
      fetchQuestionDetail(false);
    } catch (e) { showToast('Lỗi gửi bình luận', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSubmitReply = async (parentId) => {
    const draft = replyDrafts[parentId];
    if (!user) { showToast('Vui lòng đăng nhập', 'warning'); return; }
    if (!draft?.trim()) return;
    setReplySubmitting((prev) => ({ ...prev, [parentId]: true }));
    try {
      await api.post(`/forum/questions/${id}/answers`, { content: `[@reply:${parentId}] ${draft}` });
      setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }));
      setActiveReply(null);
      showToast('Phản hồi đã được gửi!');
      fetchQuestionDetail(false);
    } catch (e) { showToast('Lỗi gửi phản hồi', 'error'); }
    finally { setReplySubmitting((prev) => ({ ...prev, [parentId]: false })); }
  };

  const handleReport = async () => {
    try {
      await api.post('/forum/reports', reportData);
      setShowReportModal(false);
      showToast('Đã gửi báo cáo');
    } catch (e) { showToast('Lỗi gửi báo cáo', 'error'); }
  };

  const openReport = (entityType, entityId) => {
    setReportData({ entityType, entityId, reason: 'spam', description: '' });
    setShowReportModal(true);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) { navigator.clipboard.writeText(url); showToast('Đã sao chép link!'); }
  };

  if (loading) return (
    <div className="qdp-root">
      <ForumBanner />
      <div className="qdp-loading">
        <div className="qdp-spinner" />
        <span>Đang tải nội dung...</span>
      </div>
    </div>
  );
  if (!question) return null;

  const getFileIcon = (url) => {
    const ext = url.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return { Icon: FaImage, color: '#FF6B6B' };
    if (ext === 'pdf') return { Icon: FaFilePdf, color: '#e74c3c' };
    if (['doc','docx'].includes(ext)) return { Icon: FaFileWord, color: '#2B579A' };
    if (['xls','xlsx'].includes(ext)) return { Icon: FaFileExcel, color: '#217346' };
    return { Icon: FaFileAlt, color: '#888' };
  };

  return (
    <div className="qdp-root">
      <ForumBanner />

      {/* Toast */}
      {toast.show && (
        <div className={`qdp-toast qdp-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="qdp-lightbox" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="preview" />
          <button type="button" className="qdp-lightbox-close"><FaTimes /></button>
        </div>
      )}

      <div className="qdp-container">
        {/* Back button only */}
        <div className="qdp-nav-row">
          <button type="button" className="qdp-back-btn" onClick={() => navigate(FORUM_ROUTE)}>
            <FaArrowLeft /> Quay lại diễn đàn
          </button>
        </div>

        {/* Main layout: 2 col (center + sidebar) */}
        <div className="qdp-layout">

        {/* ── CENTER: Post + Comments ── */}
        <main className="qdp-center">

            {/* ════ POST CARD ════ */}
            <article className="qdp-post">
              {/* Post meta */}
              <div className="qdp-post-meta">
                {question.topic && (
                  <span className="qdp-post-subreddit">
                    <img
                      src={question.topic.avatar || `https://ui-avatars.com/api/?name=${question.topic.title}&background=4CAF50&color=fff&size=20`}
                      alt={question.topic.title}
                      className="qdp-topic-icon"
                    />
                    {question.topic.title}
                  </span>
                )}
                <span className="qdp-meta-sep">•</span>
                <span className="qdp-post-author-line">
                  Đăng bởi{' '}
                  <UserAvatar user={question.author} size={18} isAnonymous={question.isAnonymous} />
                  <strong>{question.isAnonymous ? 'Ẩn danh' : (question.author?.full_name || 'Người dùng')}</strong>
                </span>
                <span className="qdp-meta-sep">•</span>
                <span className="qdp-post-time">{formatRelativeTime(question.createdAt)}</span>
                {ensureArray(question.specialties).map((sp) => (
                  <span key={sp.id} className="qdp-specialty-badge">{sp.name}</span>
                ))}
              </div>

              {/* Title */}
              <h1 className="qdp-post-title">{question.title}</h1>

              {/* Tags */}
              {ensureArray(question.tags).length > 0 && (
                <div className="qdp-post-tags">
                  {ensureArray(question.tags).map((t) => (
                    <span key={t} className="qdp-tag">#{t}</span>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="qdp-post-content">{question.content}</div>

              {/* Images */}
              {ensureArray(question.images).length > 0 && (
                <div className={`qdp-post-gallery count-${Math.min(ensureArray(question.images).length, 4)}`}>
                  {ensureArray(question.images).map((img, i) => (
                    <img
                      key={i}
                      src={img.startsWith('http') ? img : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${img.startsWith('/') ? '' : '/'}${img}`}
                      alt={`Hình ${i + 1}`}
                      className="qdp-gallery-img"
                      onClick={() => setLightboxImg(img.startsWith('http') ? img : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${img.startsWith('/') ? '' : '/'}${img}`)}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ))}
                </div>
              )}

              {/* Attachments */}
              {ensureArray(question.attachments).length > 0 && (
                <div className="qdp-attachments">
                  <div className="qdp-attachments-label"><FaPaperclip /> Tài liệu đính kèm</div>
                  <div className="qdp-attachments-list">
                    {ensureArray(question.attachments).map((file, idx) => {
                      const name = file.split('/').pop();
                      const { Icon, color } = getFileIcon(file);
                      return (
                        <a key={idx} href={file} target="_blank" rel="noopener noreferrer" className="qdp-attachment-item">
                          <Icon style={{ color }} />
                          <span>{name}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Post action bar */}
              <div className="qdp-post-actions">
                <button
                  type="button"
                  className={`qdp-action-pill qdp-action-pill--like ${qLiked ? 'active' : ''}`}
                  onClick={() => handleLike('question')}
                >
                  {qLiked ? <FaHeart /> : <FaRegHeart />}
                  <span>{qLikeCount} Thích</span>
                </button>

                <button type="button" className="qdp-action-pill" onClick={() => composeRef.current?.focus()}>
                  <FaComments /> <span>{answers.length} Bình luận</span>
                </button>
                <button type="button" className="qdp-action-pill" onClick={handleShare}>
                  <FaShare /> <span>Chia sẻ</span>
                </button>
                <button type="button" className={`qdp-action-pill ${question.saved ? 'active' : ''}`} onClick={handleSave}>
                  {question.saved ? <FaBookmark /> : <FaRegBookmark />}
                  <span>{question.saved ? 'Đã lưu' : 'Lưu'}</span>
                </button>
                <button type="button" className="qdp-action-pill qdp-action-pill--report" onClick={() => openReport('question', id)}>
                  <FaFlag /> <span className="qdp-action-label-hide">Báo cáo</span>
                </button>
                <div className="qdp-post-stats">
                  <span><FaEye /> {question.viewsCount || 0}</span>
                </div>
              </div>
            </article>

            {/* ════ COMPOSE ════ */}
            <div className="qdp-compose">
              <div className="qdp-compose-header">
                <UserAvatar user={user} size={34} />
                <span className="qdp-compose-label">
                  {user ? `Bình luận với tư cách ${user.full_name || 'bạn'}` : 'Đăng nhập để bình luận'}
                </span>
              </div>
              <textarea
                ref={composeRef}
                className="qdp-textarea"
                rows={4}
                placeholder="Chia sẻ ý kiến, kinh nghiệm hoặc lời khuyên của bạn..."
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                disabled={!user}
              />
              <div className="qdp-compose-footer">
                <span className="qdp-compose-hint"><FaInfoCircle /> Nội dung cần lịch sự, đúng sự thật.</span>
                <button
                  type="button"
                  className="qdp-btn-primary"
                  disabled={submitting || !user || !answerContent.trim()}
                  onClick={handleSubmitAnswer}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
                </button>
              </div>
            </div>

            {/* ════ COMMENTS ════ */}
            <div className="qdp-comments-section">
              {/* Sort bar */}
              <div className="qdp-sort-bar">
                <span className="qdp-sort-label">Sắp xếp:</span>
                {[['best', 'Tốt nhất'], ['new', 'Mới nhất'], ['old', 'Cũ nhất']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`qdp-sort-btn ${sortBy === val ? 'active' : ''}`}
                    onClick={() => setSortBy(val)}
                  >
                    {label}
                  </button>
                ))}
                <span className="qdp-comments-count">{answers.length} bình luận</span>
              </div>

              {/* Comment tree */}
              {threadedAnswers.length === 0 ? (
                <div className="qdp-empty-comments">
                  <FaComments size={36} />
                  <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>
              ) : (
                <div className="qdp-comment-list">
                  {threadedAnswers.map((ans) => (
                    <AnswerThread
                      key={ans.id}
                      answer={ans}
                      depth={0}
                      user={user}
                      activeReply={activeReply}
                      setActiveReply={setActiveReply}
                      replyDrafts={replyDrafts}
                      setReplyDrafts={setReplyDrafts}
                      replySubmitting={replySubmitting}
                      onLike={handleLike}
                      onReply={handleSubmitReply}
                      onReport={(type, eid) => openReport(type, eid)}
                    />
                  ))}
                </div>
              )}
            </div>

          </main>

          {/* ── RIGHT: Sidebar ── */}
          <aside className="qdp-sidebar">
            {/* About topic */}
            {question.topic && (
              <div className="qdp-widget">
                <div className="qdp-widget-header" style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)' }}>
                  <FaComments /> {question.topic.title}
                </div>
                <div className="qdp-widget-body">
                  {question.topic.description && (
                    <p className="qdp-widget-desc">{question.topic.description}</p>
                  )}
                  <div className="qdp-widget-stat-row">
                    <div className="qdp-widget-stat"><strong>{question.viewsCount || 0}</strong><span>Lượt xem</span></div>
                    <div className="qdp-widget-stat"><strong>{answers.length}</strong><span>Bình luận</span></div>
                    <div className="qdp-widget-stat"><strong>{qLikeCount}</strong><span>Thích</span></div>
                  </div>
                  <div className="qdp-widget-date">
                    Đăng: {question.createdAt ? new Date(question.createdAt).toLocaleDateString('vi-VN') : '–'}
                  </div>
                </div>
              </div>
            )}

            {/* Community rules */}
            <div className="qdp-widget">
              <div className="qdp-widget-header">
                <FaShieldAlt /> Quy tắc cộng đồng
              </div>
              <div className="qdp-widget-body">
                <ol className="qdp-rules-list">
                  <li>Mô tả triệu chứng đầy đủ, chính xác.</li>
                  <li>Không tự ý chẩn đoán hay kê đơn thuốc.</li>
                  <li>Giữ thái độ lịch sự, tôn trọng.</li>
                  <li>Không chia sẻ thông tin cá nhân nhạy cảm.</li>
                  <li>Nội dung y tế nên tham khảo chuyên gia.</li>
                </ol>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportData={reportData}
        setReportData={setReportData}
        onSubmit={handleReport}
      />
    </div>
  );
};

export default QuestionDetailPage;
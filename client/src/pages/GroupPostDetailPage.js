import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import communityService from '../services/communityService';
import { AuthContext } from '../contexts/AuthContext';
import { 
  FaArrowLeft, FaUserCircle, FaClock, FaHeart, FaRegHeart, 
  FaComment, FaShare, FaPaperPlane, FaUserMd, FaShieldAlt
} from 'react-icons/fa';
import './GroupPostDetailPage.css';

// Helper functions (tương tự CommunityGroupPage)
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `http://localhost:3001${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt), now = Date.now(), diff = now - d.getTime();
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return d.toLocaleDateString('vi-VN');
};

const GroupPostDetailPage = () => {
  const { groupSlug, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Lấy user hiện tại để comment

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States tương tác
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await communityService.getGroupPostDetail(groupSlug, postId);
        const postData = res.data.data || res.data.post || null;
        setPost(postData);
        
        // Cập nhật state tương tác
        if (postData) {
          setLikesCount(postData.likes_count || 0);
          setComments(Array.isArray(postData.comments_data) ? postData.comments_data : []);
          
          // Kiểm tra xem user hiện tại đã like chưa (nếu API có trả về liked_by)
          let likedBy = postData.liked_by || [];
          if (typeof likedBy === 'string') likedBy = JSON.parse(likedBy);
          if (user && likedBy.includes(user.id)) setLiked(true);
        }
      } catch (e) {
        setError(e.response?.data?.message || 'Không tìm thấy bài viết hoặc bạn không có quyền xem.');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [groupSlug, postId, user]);

  const handleLike = async () => {
    if (!user) return alert('Vui lòng đăng nhập để thích bài viết.');
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    try {
      await communityService.toggleLikePost(post.id);
    } catch (error) {
      // Revert if failed
      setLiked(liked);
      setLikesCount(prev => liked ? prev + 1 : prev - 1);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    
    setSubmittingComment(true);
    try {
      await communityService.commentOnPost(post.id, commentText.trim());
      // Thêm bình luận ảo vào UI ngay lập tức cho mượt
      const newComment = {
        id: Date.now(),
        content: commentText.trim(),
        author: { full_name: user.full_name, avatar_url: user.avatar_url },
        created_at: new Date().toISOString()
      };
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (error) {
      alert('Không thể gửi bình luận lúc này.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Đã sao chép liên kết bài viết!');
  };

  if (loading) return <div className="gpdp-wrapper"><div className="gpdp-loading">Đang tải bài viết...</div></div>;
  if (error) return <div className="gpdp-wrapper"><div className="gpdp-container"><button className="gpdp-back-btn" onClick={() => navigate(-1)}><FaArrowLeft /> Quay lại</button><div className="gpdp-error">{error}</div></div></div>;
  if (!post) return <div className="gpdp-wrapper"><div className="gpdp-error">Bài viết không tồn tại.</div></div>;

  const imageCount = post.images?.length || 0;
  const gridClass = `grid-${Math.min(imageCount, 4)}`;

  return (
    <div className="gpdp-wrapper">
      <div className="gpdp-container">
        
        <button className="gpdp-back-btn" onClick={() => navigate(`/cong-dong/nhom/${groupSlug}`)}>
          <FaArrowLeft /> Quay lại nhóm
        </button>

        <div className="gpdp-card">
          {/* Header */}
          <div className="gpdp-header">
            {post.is_anonymous ? (
               <div className="gpdp-avatar-ph"><FaUserCircle /></div>
            ) : post.author?.avatar_url ? (
              <img src={getImageUrl(post.author.avatar_url)} alt="avatar" className="gpdp-avatar" />
            ) : (
              <div className="gpdp-avatar-ph">{(post.author?.full_name || 'U')[0]}</div>
            )}
            <div>
              <div className="gpdp-author">
                {post.is_anonymous ? 'Thành viên ẩn danh' : post.author?.full_name}
                {!post.is_anonymous && post.author?.role === 'doctor' && (
                  <span style={{ marginLeft: 6, fontSize: 12, background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: 4 }}><FaUserMd/> Bác sĩ</span>
                )}
              </div>
              <div className="gpdp-time"><FaClock /> {formatTime(post.created_at)}</div>
            </div>
          </div>

          {/* Nội dung text */}
          <div className="gpdp-content">{post.content}</div>

          {/* Grid Hình ảnh */}
          {imageCount > 0 && (
            <div className={`gpdp-images ${gridClass}`}>
              {post.images.slice(0, 4).map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={getImageUrl(img)} alt="post-img" className="gpdp-img" onClick={() => window.open(getImageUrl(img), '_blank')} />
                  {idx === 3 && imageCount > 4 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}>
                      +{imageCount - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Thống kê Like/Comment */}
          <div className="gpdp-stats">
            <span>{likesCount} Lượt thích</span>
            <span>{comments.length} Bình luận</span>
          </div>

          {/* Nút Hành động */}
          <div className="gpdp-actions">
            <button className={`gpdp-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              {liked ? <FaHeart /> : <FaRegHeart />} Thích
            </button>
            <button className="gpdp-action-btn" onClick={() => document.getElementById('comment-input').focus()}>
              <FaComment /> Bình luận
            </button>
            <button className="gpdp-action-btn" onClick={handleShare}>
              <FaShare /> Chia sẻ
            </button>
          </div>

          {/* Khu vực Bình luận */}
          <div className="gpdp-comments-section">
            {/* Input Comment */}
            {user && (
               <form className="gpdp-comment-compose" onSubmit={handleCommentSubmit}>
                 <img src={getImageUrl(user.avatar_url, true)} className="gpdp-avatar" style={{ width: 36, height: 36 }} alt="Me" />
                 <div className="gpdp-comment-input-wrap">
                   <input 
                     id="comment-input"
                     type="text" 
                     placeholder="Viết bình luận..." 
                     value={commentText}
                     onChange={(e) => setCommentText(e.target.value)}
                     disabled={submittingComment}
                     autoComplete="off"
                   />
                   <button type="submit" className="gpdp-comment-submit" disabled={!commentText.trim() || submittingComment}>
                     <FaPaperPlane />
                   </button>
                 </div>
               </form>
            )}

            {/* Danh sách Comments */}
            <div className="gpdp-comment-list">
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>Chưa có bình luận nào. Hãy là người đầu tiên!</div>
              ) : (
                comments.map(c => {
                  // Phân loại role từ dữ liệu author
                  const role = c.author?.role?.toLowerCase() || '';
                  const isDoctor = role === 'doctor';
                  const isStaff = role === 'admin' || role === 'staff';
                  
                  // Xác định class cho màu bong bóng chat
                  const bubbleClass = isDoctor ? 'is-doctor' : (isStaff ? 'is-staff' : '');

                  return (
                    <div key={c.id || Math.random()}>
                      <div className="gpdp-comment-item">
                        <img src={getImageUrl(c.author?.avatar_url, true)} className="gpdp-avatar" style={{ width: 32, height: 32 }} alt="User" />
                        <div style={{ flex: 1 }}>
                          <div className={`gpdp-comment-bubble ${bubbleClass}`}>
                            <div className="gpdp-comment-author">
                              {c.author?.full_name || 'Người dùng'}
                              {/* HUY HIỆU DÀNH CHO DOCTOR VÀ STAFF */}
                              {isDoctor && <span className="gpdp-role-badge doctor"><FaUserMd /> BS</span>}
                              {isStaff && <span className="gpdp-role-badge staff"><FaShieldAlt /> QTV</span>}
                            </div>
                            <p className="gpdp-comment-text">{c.content}</p>
                          </div>
                          <div className="gpdp-comment-time">{formatTime(c.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupPostDetailPage;
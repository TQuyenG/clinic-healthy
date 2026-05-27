// client/src/pages/MyForumPage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import {
  FaBookmark,
  FaEdit,
  FaQuestionCircle,
  FaClock,
  FaTrash,
  FaCommentDots
} from 'react-icons/fa';
import './MyForumPage.css';

const MyForumPage = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('my-questions'); // 'my-questions' | 'saved' | 'answered'
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', title: '', message: '' });

  // Redirect nếu chưa login
  useEffect(() => {
    if (!user) {
      setAlert({
        show: true,
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Bạn cần đăng nhập để xem trang này'
      });
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [user, navigate]);

  // Fetch data theo tab
  useEffect(() => {
    if (!user) return;
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let data = [];
      let endpoint = '';

      if (activeTab === 'my-questions') endpoint = `/forum/questions?authorId=${user.id}`;
      else if (activeTab === 'saved') endpoint = '/forum/questions/saved';
      else if (activeTab === 'answered') endpoint = '/forum/questions/answered';

      const response = await api.get(endpoint);
      data = response.data.data?.questions || [];
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể lấy danh sách câu hỏi'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (id) => {
    navigate(`/dien-dan-suc-khoe/cau-hoi/${id}`);
  };

  const handleDeleteQuestion = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này vĩnh viễn?')) return;

    try {
      await api.delete(`/forum/questions/${id}`);
      setAlert({
        show: true,
        type: 'success',
        title: 'Thành công',
        message: 'Đã xóa câu hỏi'
      });
      fetchQuestions();
    } catch (error) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: error.response?.data?.message || 'Không thể xóa câu hỏi'
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (!user) return null;

  return (
    <div className="MyForum-page">
      <div className="MyForum-container">
        <header className="MyForum-header">
          <h1><FaQuestionCircle /> Diễn đàn cá nhân</h1>
          <p>Quản lý câu hỏi, bài viết đã lưu và các hoạt động của bạn</p>
        </header>

        <div className="MyForum-tabs">
          <button
            className={`MyForum-tab-btn ${activeTab === 'my-questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-questions')}
          >
            <FaEdit /> Của tôi
          </button>
          <button
            className={`MyForum-tab-btn ${activeTab === 'answered' ? 'active' : ''}`}
            onClick={() => setActiveTab('answered')}
          >
            <FaCommentDots /> Đã trả lời
          </button>
          <button
            className={`MyForum-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <FaBookmark /> Đã lưu
          </button>
        </div>

        <div className="MyForum-content">
          {loading ? (
            <div className="MyForum-state">
              <div className="MyForum-spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="MyForum-state">
              <FaQuestionCircle className="MyForum-empty-icon" />
              <div className="MyForum-empty-title">
                {activeTab === 'my-questions' && 'Bạn chưa có câu hỏi nào'}
                {activeTab === 'answered' && 'Bạn chưa trả lời câu hỏi nào'}
                {activeTab === 'saved' && 'Danh sách đã lưu trống'}
              </div>
              <p className="MyForum-empty-desc">
                {activeTab === 'my-questions' && 'Hãy chia sẻ thắc mắc của bạn với bác sĩ và cộng đồng ngay.'}
                {activeTab === 'answered' && 'Các câu hỏi bạn đã trả lời sẽ xuất hiện tại đây.'}
                {activeTab === 'saved' && 'Các bài viết bạn quan tâm sẽ xuất hiện tại đây.'}
              </p>
              {activeTab === 'my-questions' && (
                <button className="MyForum-btn-primary" onClick={() => navigate('/dien-dan', { state: { openAskModal: true } })}>
                  Tạo câu hỏi mới
                </button>
              )}
            </div>
          ) : (
            <div className="MyForum-list">
              {questions.map((q) => (
                <article
                  key={q.id}
                  className="MyForum-card"
                  onClick={() => handleQuestionClick(q.id)}
                >
                  <div className="MyForum-stats">
                    <div className="MyForum-stat-item highlight">
                      <span className="MyForum-stat-val">{q.answersCount || 0}</span>
                      <span className="MyForum-stat-lbl">Trả lời</span>
                    </div>
                    <div className="MyForum-stat-item">
                      <span className="MyForum-stat-val">{q.viewsCount || 0}</span>
                      <span className="MyForum-stat-lbl">Xem</span>
                    </div>
                  </div>

                  <div className="MyForum-card-body">
                    <h3 className="MyForum-card-title">{q.title}</h3>
                    
                    {q.content && (
                      <p className="MyForum-card-excerpt">
                        {q.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}...
                      </p>
                    )}

                    <div className="MyForum-meta">
                      <div className="MyForum-meta-item">
                        <FaClock /> {formatDate(q.created_at)}
                      </div>
                      
                      {q.specialty && (
                        <span className="MyForum-badge specialty">
                          {q.specialty.name}
                        </span>
                      )}
                      
                      {q.status && (
                        <span className={`MyForum-badge status-${q.status}`}>
                          {q.status === 'pending' && 'Chờ duyệt'}
                          {q.status === 'approved' && 'Đã duyệt'}
                          {q.status === 'rejected' && 'Từ chối'}
                          {q.status === 'hidden' && 'Đã ẩn'}
                        </span>
                      )}
                    </div>

                    {Array.isArray(q.tags) && q.tags.length > 0 && (
                      <div className="MyForum-tags">
                        {q.tags.map((tag, idx) => (
                          <span key={idx} className="MyForum-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {activeTab === 'my-questions' && (
                    <div className="MyForum-actions">
                      <button
                        className="MyForum-btn-delete"
                        onClick={(e) => handleDeleteQuestion(e, q.id)}
                        title="Xóa câu hỏi"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <CustomAlert
        show={alert.show}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, show: false })}
        autoCloseDuration={3000}
      />
    </div>
  );
};

export default MyForumPage;

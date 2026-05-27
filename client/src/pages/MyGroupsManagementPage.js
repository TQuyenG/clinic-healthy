// client/src/pages/MyGroupsManagementPage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import {
  FaUsers,
  FaCrown,
  FaEdit,
  FaTrash,
  FaClock,
  FaSearch,
  FaFilter
} from 'react-icons/fa';
import './MyGroupsManagementPage.css';

const CustomAlert = ({ type = 'info', title = '', message = '', show = false, onClose = () => {}, autoCloseDuration = 5000 }) => {
  useEffect(() => {
    if (show && autoCloseDuration > 0) {
      const timer = setTimeout(() => onClose(), autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDuration, onClose]);

  if (!show) return null;

  return (
    <div className="mygroupspage-alert-overlay" onClick={onClose}>
      <div className={`mygroupspage-alert mygroupspage-alert--${type}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="mygroupspage-alert-title">{title}</h3>
        {message && <p className="mygroupspage-alert-message">{message}</p>}
        <button className="mygroupspage-btn-primary" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
};

const MyGroupsManagementPage = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState('all'); // all | created | joined
  const [searchTerm, setSearchTerm] = useState('');
  const [myCreatedGroups, setMyCreatedGroups] = useState([]);
  const [myJoinedGroups, setMyJoinedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    if (!user) return;

    const fetchMyGroups = async () => {
      setLoading(true);
      try {
        const res = await communityService.getMyGroups();
        if (res.data.success) {
          setMyCreatedGroups(res.data.data.createdGroups || []);
          setMyJoinedGroups(res.data.data.joinedGroups || []);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setAlert({
          show: true,
          type: 'error',
          title: 'Lỗi',
          message: 'Không thể tải danh sách nhóm'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMyGroups();
  }, [user]);

  const handleViewGroup = (group) => {
    navigate(`/cong-dong/nhom/${group.slug}`);
  };

  const handleEditGroup = (group) => {
    navigate(`/cong-dong/nhom/${group.slug}/chinh-sua`);
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhóm này?')) return;
    try {
      const res = await communityService.deleteGroup(groupId);
      if (res.data.success) {
        setMyCreatedGroups(prev => prev.filter(g => g.id !== groupId));
        setAlert({
          show: true,
          type: 'success',
          title: 'Thành công',
          message: 'Nhóm đã được xóa'
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể xóa nhóm. Vui lòng thử lại'
      });
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!window.confirm('Bạn có chắc muốn rời khỏi nhóm này?')) return;
    try {
      const res = await communityService.leaveGroup(groupId);
      if (res.data.success) {
        setMyJoinedGroups(prev => prev.filter(g => g.id !== groupId));
        setAlert({
          show: true,
          type: 'success',
          title: 'Thành công',
          message: 'Bạn đã rời khỏi nhóm'
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể rời khỏi nhóm. Vui lòng thử lại'
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="mygroupspage-status-badge mygroupspage-status-active">✓ Đang hoạt động</span>;
      case 'pending':
        return <span className="mygroupspage-status-badge mygroupspage-status-pending">Đang chờ duyệt</span>;
      case 'suspended':
      case 'rejected':
        return <span className="mygroupspage-status-badge mygroupspage-status-rejected">❌ Bị từ chối/Đình chỉ</span>;
      default:
        return null;
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

  const normalizeText = (value) => String(value || '').toLowerCase();

  const filterGroup = (group) => {
    const search = normalizeText(searchTerm);
    if (!search) return true;
    return [group.name, group.description, group.slug].some((field) => normalizeText(field).includes(search));
  };

  const filteredCreatedGroups = myCreatedGroups.filter(filterGroup);
  const filteredJoinedGroups = myJoinedGroups.filter(filterGroup);

  const visibleCreated = activeFilter === 'all' || activeFilter === 'created';
  const visibleJoined = activeFilter === 'all' || activeFilter === 'joined';

  if (!user) {
    return (
      <div className="mygroupspage-page">
        <div className="mygroupspage-container mygroupspage-page--empty">
          <FaUsers className="mygroupspage-empty-icon" />
          <h3>Vui lòng đăng nhập</h3>
          <p>Bạn cần đăng nhập để xem nhóm của bạn</p>
          <button className="mygroupspage-btn-primary" onClick={() => navigate('/login')}>
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mygroupspage-page">
      <div className="mygroupspage-container">
        <header className="mygroupspage-header">
          <div className="mygroupspage-header-copy">
            <h1>Nhóm của tôi</h1>
            <p>Quản lý các nhóm bạn tạo và các nhóm mà bạn tham gia</p>
          </div>
        </header>

        <section className="mygroupspage-toolbar">
          <div className="mygroupspage-search-box">
            <FaSearch className="mygroupspage-search-icon" />
            <input
              type="text"
              className="mygroupspage-search-input"
              placeholder="Tìm kiếm nhóm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="mygroupspage-filter-group" role="tablist" aria-label="Bộ lọc nhóm">
            <button
              className={`mygroupspage-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <FaFilter /> Tất cả
            </button>
            <button
              className={`mygroupspage-filter-btn ${activeFilter === 'created' ? 'active' : ''}`}
              onClick={() => setActiveFilter('created')}
            >
              <FaCrown /> Nhóm tôi tạo
            </button>
            <button
              className={`mygroupspage-filter-btn ${activeFilter === 'joined' ? 'active' : ''}`}
              onClick={() => setActiveFilter('joined')}
            >
              <FaUsers /> Nhóm tôi tham gia
            </button>
          </div>
        </section>

        <main className="mygroupspage-content">
          {loading ? (
            <div className="mygroupspage-state">
              <div className="mygroupspage-spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {visibleCreated && (
                <section className="mygroupspage-section">
                  <div className="mygroupspage-section-head">
                    <h2><FaCrown /> Nhóm do tôi tạo ({filteredCreatedGroups.length})</h2>
                  </div>

                  {filteredCreatedGroups.length === 0 ? (
                    <div className="mygroupspage-empty-state-section">
                      <FaCrown size={28} />
                      <p>Bạn chưa tạo nhóm nào</p>
                      <button
                        className="mygroupspage-btn-primary"
                        onClick={() => navigate('/cong-dong', { state: { openCreateModal: true } })}
                      >
                        + Tạo nhóm mới
                      </button>
                    </div>
                  ) : (
                    <div className="mygroupspage-list">
                      {filteredCreatedGroups.map((group) => (
                        <article key={group.id} className="mygroupspage-card" onClick={() => handleViewGroup(group)}>
                          <div className="mygroupspage-card-stats">
                            <div className="mygroupspage-stat-item highlight">
                              <span className="mygroupspage-stat-val">{group.members_count || 0}</span>
                              <span className="mygroupspage-stat-lbl">Thành viên</span>
                            </div>
                            <div className="mygroupspage-stat-item">
                              <span className="mygroupspage-stat-val">{group.posts_count || 0}</span>
                              <span className="mygroupspage-stat-lbl">Bài viết</span>
                            </div>
                          </div>

                          <div className="mygroupspage-card-body">
                            <h3 className="mygroupspage-card-title">{group.name}</h3>
                            {group.description && (
                              <p className="mygroupspage-card-excerpt">{group.description.replace(/<[^>]*>?/gm, '').substring(0, 120)}...</p>
                            )}

                            <div className="mygroupspage-meta">
                              <div className="mygroupspage-meta-item"><FaClock /> {formatDate(group.created_at || group.createdAt)}</div>
                              {group.status && getStatusBadge(group.status)}
                              <span className="mygroupspage-badge">{group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                            </div>
                          </div>

                          <div className="mygroupspage-actions">
                            {group.status === 'active' ? (
                              <>
                                <button className="mygroupspage-btn-outline" onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }} title="Chỉnh sửa nhóm">
                                  <FaEdit />
                                </button>
                                <button className="mygroupspage-btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} title="Xóa nhóm">
                                  <FaTrash />
                                </button>
                              </>
                            ) : (
                              <button className="mygroupspage-btn-muted" disabled>
                                Chưa thể truy cập
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {visibleJoined && (
                <section className="mygroupspage-section">
                  <div className="mygroupspage-section-head">
                    <h2><FaUsers /> Nhóm tôi tham gia ({filteredJoinedGroups.length})</h2>
                  </div>

                  {filteredJoinedGroups.length === 0 ? (
                    <div className="mygroupspage-empty-state-section">
                      <FaUsers size={28} />
                      <p>Bạn chưa tham gia nhóm nào</p>
                      <button
                        className="mygroupspage-btn-primary"
                        onClick={() => navigate('/cong-dong')}
                      >
                        Khám phá nhóm
                      </button>
                    </div>
                  ) : (
                    <div className="mygroupspage-list">
                      {filteredJoinedGroups.map((group) => (
                        <article key={group.id} className="mygroupspage-card" onClick={() => handleViewGroup(group)}>
                          <div className="mygroupspage-card-stats">
                            <div className="mygroupspage-stat-item highlight">
                              <span className="mygroupspage-stat-val">{group.members_count || 0}</span>
                              <span className="mygroupspage-stat-lbl">Thành viên</span>
                            </div>
                            <div className="mygroupspage-stat-item">
                              <span className="mygroupspage-stat-val">{group.posts_count || 0}</span>
                              <span className="mygroupspage-stat-lbl">Bài viết</span>
                            </div>
                          </div>

                          <div className="mygroupspage-card-body">
                            <h3 className="mygroupspage-card-title">{group.name}</h3>
                            {group.description && (
                              <p className="mygroupspage-card-excerpt">{group.description.replace(/<[^>]*>?/gm, '').substring(0, 120)}...</p>
                            )}

                            <div className="mygroupspage-meta">
                              <div className="mygroupspage-meta-item"><FaClock /> {formatDate(group.created_at || group.createdAt)}</div>
                              {group.status && getStatusBadge(group.status)}
                              <span className="mygroupspage-badge">{group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                            </div>
                          </div>

                          <div className="mygroupspage-actions">
                            <button className="mygroupspage-btn-danger" onClick={(e) => { e.stopPropagation(); handleLeaveGroup(group.id); }} title="Rời khỏi nhóm">
                              <FaTrash />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
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

export default MyGroupsManagementPage;

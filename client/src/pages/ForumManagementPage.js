// client/src/pages/ForumManagementPage.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaCheckCircle, FaTimesCircle, FaEye, FaEyeSlash, FaSearch, FaFilter, 
  FaTrashAlt, FaTrash, FaComments, FaExclamationTriangle, FaClock, FaBan, 
  FaPlus, FaEdit, FaSave, FaTimes, FaToggleOn, FaToggleOff, 
  FaChevronDown, FaChevronUp, FaUsers, FaThList, FaTable, 
  FaThumbsUp, FaReply, FaUserMd, FaSync
} from 'react-icons/fa';
import api from '../services/api';
import forumService from '../services/forumService';
import useForumPermissions from '../hooks/useForumPermissions';
import { useAuth } from '../contexts/AuthContext';
import './ForumManagementPage.css';

const ForumManagementPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  // ✅ PHÂN CHIA: Quyền quản lý TOPIC (create/edit/delete) vs Quyền kiểm duyệt CÂU HỎI (moderate)
  const { 
    canCreateTopic, 
    canEditTopic, 
    canToggleTopic, 
    canDeleteTopic, 
    canModerateQuestions,
    hasAnyPermission 
  } = useForumPermissions();
  
  // Redirect if no permission
  useEffect(() => {
    if (hasAnyPermission === false) navigate('/dashboard');
  }, [hasAnyPermission, navigate]);

  // States
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, hidden: 0, reported: 0 });
  
  const [reports, setReports] = useState([]);
  const [reportStatusFilter, setReportStatusFilter] = useState('pending');
  
  const [expandedItem, setExpandedItem] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(null);
  
  const [viewMode, setViewMode] = useState('list'); // list | table
  // Sort state cho bảng câu hỏi
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc'); // desc: mới nhất lên đầu
  // Sort state cho bảng topic
  const [topicSortBy, setTopicSortBy] = useState('created_at');
  const [topicSortOrder, setTopicSortOrder] = useState('desc');
  // Bộ lọc chế độ duyệt topic
  const [topicFilterMode, setTopicFilterMode] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  
  // Topic Management States
  const [topics, setTopics] = useState([]);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState({
    title: '', description: '', requiresApproval: true, autoApprove: false, moderatorIds: []
  });
  
  // Question Form States
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    title: '', content: '', topicId: '', specialtyId: '', tags: [], images: []
  });
  
  const [specialties, setSpecialties] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // --- Derived Data ---
  // ✅ Filter topics: 
  // - Admin: thấy tất cả
  // - Manager (rank=manager) của CSKH/Content: thấy tất cả
  // - Staff: chỉ thấy topics được phân công làm moderator
  // --- Derived Data ---
  // ✅ Filter topics: Đồng bộ logic với Backend
  const myTopics = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'admin') {
      return topics;
    }
    
    if (currentUser.role === 'staff') {
      const staff = currentUser.staff || currentUser.role_info;
      const rank = staff?.rank;
      const department = staff?.department;
      const permissions = staff?.permissions;
      
      const isManager = rank === 'manager' && (department === 'support' || department === 'content');
      const hasForumPerms = permissions && permissions.forum && Array.isArray(permissions.forum) && permissions.forum.length > 0;
      
      if (isManager || hasForumPerms) {
        return topics; // Có quyền tổng -> Thấy tất cả topic
      }
      
      // Staff thường không có quyền tổng -> Chỉ thấy topics được phân công
      const userId = currentUser.id;
      return topics.filter(t => {
        const moderatorIds = Array.isArray(t.moderatorIds) ? t.moderatorIds : [];
        return moderatorIds.includes(userId);
      });
    }
    
    return [];
  }, [topics, currentUser]);

  const questionsToShow = useMemo(() => {
    let filtered = filteredQuestions;
    
    // Kiểm tra quyền tổng
    let hasGlobalAccess = false;
    if (currentUser?.role === 'admin') {
      hasGlobalAccess = true;
    } else if (currentUser?.role === 'staff') {
      const staff = currentUser.staff || currentUser.role_info;
      const rank = staff?.rank;
      const department = staff?.department;
      const permissions = staff?.permissions;
      
      const isManager = rank === 'manager' && (department === 'support' || department === 'content');
      const hasForumPerms = permissions && permissions.forum && Array.isArray(permissions.forum) && permissions.forum.length > 0;
      
      if (isManager || hasForumPerms) {
        hasGlobalAccess = true;
      }
    }

    if (activeTab === 'pending') filtered = filtered.filter(q => q.status === 'pending');
    else if (activeTab === 'approved') filtered = filtered.filter(q => q.status === 'approved');
    else if (activeTab === 'hidden') filtered = filtered.filter(q => q.status === 'hidden');
    else if (activeTab === 'reported') filtered = filtered.filter(q => q.status === 'reported');
    
    // NẾU KHÔNG CÓ QUYỀN TỔNG -> Lọc theo Topic được phân công
    if (!hasGlobalAccess) {
      const topicIds = myTopics.map(t => t.id);
      filtered = filtered.filter(q => topicIds.includes(q.topicId));
    }
    
    if (filterTopic !== 'all') {
      const topicId = parseInt(filterTopic);
      filtered = filtered.filter(q => q.topicId === topicId);
    }
    if (filterSpecialty !== 'all') filtered = filtered.filter(q => q.specialtyId === parseInt(filterSpecialty));
    
    // Sắp xếp theo sortBy/sortOrder
    filtered = [...filtered].sort((a, b) => {
      let vA = a[sortBy], vB = b[sortBy];
      if (sortBy === 'created_at' || sortBy === 'createdAt') {
        vA = new Date(a.created_at || a.createdAt);
        vB = new Date(b.created_at || b.createdAt);
      }
      if (vA == null) return 1;
      if (vB == null) return -1;
      if (vA < vB) return sortOrder === 'asc' ? -1 : 1;
      if (vA > vB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [filteredQuestions, activeTab, filterTopic, filterSpecialty, sortBy, sortOrder, myTopics, currentUser]);

  const reportsToShow = useMemo(() => {
    return reports.filter(r => (reportStatusFilter === 'all' || r.status === reportStatusFilter));
  }, [reports, reportStatusFilter]);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    console.log('[ForumManagement] Fetching forum data...');
    setLoading(true);
    try {
        const [qRes, rRes, tRes, specRes, contentStaff, supportStaff] = await Promise.all([
            api.get('/forum/questions', { params: { limit: 100 } }),
            forumService.getReports({ limit: 100 }),
            api.get('/forum/topics'),
            api.get('/specialties'),
            api.get('/staff', { params: { department: 'content', active: true } }),
            api.get('/staff', { params: { department: 'support', active: true } })
        ]);

        const allQ = qRes.data.data?.questions || [];
        setQuestions(allQ);
        setFilteredQuestions(allQ);
        
        // Stats
        setStats({
            total: allQ.length,
            pending: allQ.filter(q => q.status === 'pending').length,
            approved: allQ.filter(q => q.status === 'approved').length,
            hidden: allQ.filter(q => q.status === 'hidden').length,
            reported: allQ.filter(q => q.status === 'reported').length
        });

        setReports(rRes.data.reports || []);
        setTopics(tRes.data.data || tRes.data || []);
        setSpecialties(specRes.data.data || []);
        setStaffList([...(contentStaff.data.data || []), ...(supportStaff.data.data || [])]);

        console.log('[ForumManagement] Forum data loaded successfully');
    } catch (error) {
        console.error("[ForumManagement] Load data error", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredQuestions(questions.filter(q => 
      q.title?.toLowerCase().includes(term) || q.content?.toLowerCase().includes(term)
    ));
  }, [searchTerm, questions]);

  // --- Actions ---
  const handleApprove = async (id) => {
    if (window.confirm('Duyệt câu hỏi này?')) {
      try { 
        await forumService.approveQuestion(id); 
        alert('Duyệt câu hỏi thành công!');
        fetchData(); 
      } catch (e) { 
        alert('Lỗi: ' + (e.response?.data?.message || e.message)); 
      }
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Lý do từ chối:');
    if (reason) {
      try { 
        await forumService.rejectQuestion(id, reason); 
        alert('Từ chối câu hỏi thành công!');
        fetchData(); 
      } catch (e) { 
        alert('Lỗi: ' + (e.response?.data?.message || e.message)); 
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Xác nhận xóa câu hỏi này? Hành động không thể hoàn tác!')) {
      try {
        await api.delete(`/forum/questions/${id}`);
        alert('Xóa câu hỏi thành công!');
        fetchData();
      } catch (e) {
        alert('Lỗi: ' + (e.response?.data?.message || e.message));
      }
    }
  };

  // ✅ Alias cho tab Reports
  const handleDeleteQuestion = handleDelete;

  const handleUpdateQuestionStatus = async (questionId, newStatus) => {
    try {
      await api.put(`/forum/questions/${questionId}/status`, { status: newStatus });
      alert(`Đã cập nhật trạng thái thành "${newStatus}"!`);
      fetchData();
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  };

  const toggleExpand = async (id) => {
    if (expandedItem === id) {
      setExpandedItem(null); setExpandedDetails(null);
    } else {
      setExpandedItem(id);
      if (id.startsWith('q-')) {
        try {
          const res = await forumService.getQuestionDetail(parseInt(id.replace('q-', '')));
          setExpandedDetails(res.data || res);
        } catch (e) { console.error(e); }
      }
    }
  };

  // --- Topic Actions ---
  const handleTopicSubmit = async (e) => {
    e.preventDefault();
    if (!topicForm.title.trim()) return alert('Thiếu tiêu đề');
    
    console.log('[TopicSubmit] Submitting topic:', topicForm);
    console.log('[TopicSubmit] Moderators:', topicForm.moderatorIds);
    
    try {
      if (editingTopic) {
        console.log('[TopicSubmit] Updating topic:', editingTopic.id);
        await forumService.updateTopic(editingTopic.id, topicForm);
      } else {
        console.log('[TopicSubmit] Creating new topic');
        await forumService.createTopic(topicForm);
      }
      fetchData(); 
      setShowTopicForm(false);
    } catch (e) { 
      console.error('[TopicSubmit] Error submitting topic:', e);
      alert(e.message); 
    }
  };

  const handleToggleTopicStatus = async (topicId) => {
    try {
      await forumService.toggleTopicStatus(topicId);
      alert('Đã cập nhật trạng thái topic!');
      fetchData();
    } catch (e) {
      alert('Lỗi: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (window.confirm('Xác nhận xóa topic này? Hành động không thể hoàn tác!')) {
      try {
        await forumService.deleteTopic(topicId);
        alert('Xóa topic thành công!');
        fetchData();
      } catch (e) {
        alert('Lỗi: ' + (e.response?.data?.message || e.message));
      }
    }
  };

  // --- Question Actions ---
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!questionForm.title.trim()) return alert('Thiếu tiêu đề câu hỏi');
    if (!questionForm.content.trim()) return alert('Thiếu nội dung câu hỏi');
    if (!questionForm.topicId) return alert('Vui lòng chọn Topic');
    
    try {
      await forumService.createQuestion(questionForm);
      alert('Tạo câu hỏi thành công!');
      fetchData(); 
      setShowQuestionForm(false);
      setQuestionForm({ title: '', content: '', topicId: '', specialtyId: '', tags: [], images: [] });
    } catch (e) { 
      alert('Lỗi: ' + e.message); 
    }
  };

  // --- Render Helpers ---
  const renderBadge = (status) => {
    const map = {
      pending: { class: 'badge-pending', icon: <FaClock />, text: 'Chờ duyệt' },
      approved: { class: 'badge-approved', icon: <FaCheckCircle />, text: 'Đã duyệt' },
      hidden: { class: 'badge-hidden', icon: <FaEyeSlash />, text: 'Đã ẩn' },
      reported: { class: 'badge-reported', icon: <FaExclamationTriangle />, text: 'Bị báo cáo' }
    };
    const conf = map[status] || map.pending;
    return <span className={`ForumManagementPage-badge ${conf.class}`}>{conf.icon} {conf.text}</span>;
  };

  return (
    <div className="ForumManagementPage-container">
      <div className="ForumManagementPage-inner">
        {/* HEADER */}
        <div className="ForumManagementPage-header">
          <h2 className="ForumManagementPage-title"><FaComments /> Quản lý Diễn đàn</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {canModerateQuestions && (
              <button 
                className="ForumManagementPage-btn-create"
                onClick={() => setShowQuestionForm(true)}
              >
                <FaPlus /> Tạo câu hỏi
              </button>
            )}
            <button 
              className="ForumManagementPage-btn-refresh" 
              onClick={fetchData}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <FaSync style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> 
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="ForumManagementPage-stats-grid">
          <div className="ForumManagementPage-stat-card stat-pending">
            <div className="ForumManagementPage-stat-icon"><FaClock /></div>
            <div className="ForumManagementPage-stat-info"><p>Chờ duyệt</p><h3>{stats.pending}</h3></div>
          </div>
          <div className="ForumManagementPage-stat-card stat-approved">
            <div className="ForumManagementPage-stat-icon"><FaCheckCircle /></div>
            <div className="ForumManagementPage-stat-info"><p>Đã duyệt</p><h3>{stats.approved}</h3></div>
          </div>
          <div className="ForumManagementPage-stat-card stat-hidden">
            <div className="ForumManagementPage-stat-icon"><FaEyeSlash /></div>
            <div className="ForumManagementPage-stat-info"><p>Đã ẩn</p><h3>{stats.hidden}</h3></div>
          </div>
          <div className="ForumManagementPage-stat-card stat-reported">
            <div className="ForumManagementPage-stat-icon"><FaExclamationTriangle /></div>
            <div className="ForumManagementPage-stat-info"><p>Báo cáo</p><h3>{reports.filter(r => r.status === 'pending').length}</h3></div>
          </div>
        </div>

        {/* TABS */}
        <div className="ForumManagementPage-tabs">
          {[
            { id: 'all', icon: <FaThList />, label: 'Tất cả' },
            { id: 'pending', icon: <FaClock />, label: 'Chờ duyệt' },
            { id: 'approved', icon: <FaCheckCircle />, label: 'Đã duyệt' },
            { id: 'hidden', icon: <FaEyeSlash />, label: 'Đã ẩn' },
            { id: 'reports', icon: <FaExclamationTriangle />, label: 'Báo cáo' },
            { id: 'topics', icon: <FaUsers />, label: 'Topics' }
          ].map(tab => (
            <button 
              key={tab.id}
              className={`ForumManagementPage-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* TOOLBAR - Questions */}
        {activeTab !== 'topics' && activeTab !== 'reports' && (
            <div className="ForumManagementPage-toolbar">
                <div className="ForumManagementPage-search-wrapper">
                    <FaSearch className="ForumManagementPage-search-icon" />
                    <input 
                        className="ForumManagementPage-input" 
                        placeholder="Tìm kiếm..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select className="ForumManagementPage-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                </select>
                <select className="ForumManagementPage-select" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
                    <option value="all">-- Tất cả Topic --</option>
                    {myTopics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <div className="ForumManagementPage-view-toggle">
                    <button className={`ForumManagementPage-btn-view ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><FaThList/></button>
                    <button className={`ForumManagementPage-btn-view ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><FaTable/></button>
                </div>
            </div>
        )}

        {/* TOOLBAR - Topics */}
        {activeTab === 'topics' && (
            <div className="ForumManagementPage-toolbar">
                <div className="ForumManagementPage-search-wrapper">
                    <FaSearch className="ForumManagementPage-search-icon" />
                    <input 
                        className="ForumManagementPage-input" 
                        placeholder="Tìm kiếm topic..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="ForumManagementPage-view-toggle">
                    <button className={`ForumManagementPage-btn-view ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><FaThList/></button>
                    <button className={`ForumManagementPage-btn-view ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><FaTable/></button>
                </div>
                {canCreateTopic && (
                    <button 
                        className="ForumManagementPage-btn-create"
                        onClick={() => { 
                            setEditingTopic(null); 
                            setTopicForm({
                                title: '', 
                                description: '', 
                                requiresApproval: true, 
                                autoApprove: false, 
                                moderatorIds: []
                            });
                            setShowTopicForm(true); 
                        }}
                    >
                        <FaPlus style={{ marginRight: '4px' }} /> Tạo Topic
                    </button>
                )}
            </div>
        )}

        {/* CONTENT AREA */}
        
        {/* 1. VIEW MODE: LIST */}
        {viewMode === 'list' && !['topics', 'reports'].includes(activeTab) && (
            <div className="ForumManagementPage-list-container">
                {questionsToShow.map(q => (
                    <div key={q.id} className="ForumManagementPage-card">
                        <div className="ForumManagementPage-card-header" onClick={() => toggleExpand(`q-${q.id}`)}>
                            <div className="ForumManagementPage-card-title">
                                <h3>{q.title}</h3>
                                <div className="ForumManagementPage-card-meta">
                                    <span>{renderBadge(q.status)}</span>
                                    <span>• {q.author?.full_name || q.User?.full_name || 'Ẩn danh'}</span>
                                    <span>• {q.topic?.title || 'No topic'}</span>
                                    <span>• {new Date(q.created_at).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </div>
                            {expandedItem === `q-${q.id}` ? <FaChevronUp color="#999"/> : <FaChevronDown color="#999"/>}
                        </div>
                        
                        {expandedItem === `q-${q.id}` && (
                            <div className="ForumManagementPage-card-body">
                                <div className="ForumManagementPage-card-content">{q.content}</div>
                                {q.images?.length > 0 && (
                                    <div className="ForumManagementPage-img-grid">
                                        {q.images.map((img, i) => <img key={i} src={img} className="ForumManagementPage-img-thumb" alt=""/>)}
                                    </div>
                                )}
                                
                                <div className="ForumManagementPage-action-group">
                                    {canModerateQuestions && q.status === 'pending' && (
                                        <>
                                            <button className="ForumManagementPage-btn btn-primary" onClick={() => handleApprove(q.id)}><FaCheckCircle/> Duyệt</button>
                                            <button className="ForumManagementPage-btn btn-secondary" onClick={() => handleReject(q.id)}><FaTimesCircle/> Từ chối</button>
                                        </>
                                    )}
                                    {canModerateQuestions && (
                                        <button className="ForumManagementPage-btn btn-secondary" style={{color: '#E57373'}} onClick={() => handleDelete(q.id)}><FaTrashAlt/> Xóa</button>
                                    )}
                                </div>

                                {/* Expanded Details (Answers/Comments) */}
                                {expandedDetails && expandedDetails.answers && (
                                    <div className="ForumManagementPage-expanded-section">
                                        <div className="ForumManagementPage-sub-title"><FaReply/> Câu trả lời ({expandedDetails.answers.length})</div>
                                        {expandedDetails.answers.map(ans => (
                                            <div key={ans.id} className="ForumManagementPage-comment-item">
                                                <div className="ForumManagementPage-comment-header">
                                                    <span style={{fontWeight:600, color:'#333'}}>
                                                        {ans.author?.full_name} {ans.isVerified && <span className="ForumManagementPage-verified"><FaCheckCircle size={10}/></span>}
                                                    </span>
                                                    <span>{new Date(ans.created_at).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <div>{ans.content}</div>
                                                <div style={{fontSize:11, color:'#888', marginTop:4}}><FaThumbsUp size={10}/> {ans.likes_count || 0}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* 2. VIEW MODE: TABLE */}
        {viewMode === 'table' && !['topics', 'reports'].includes(activeTab) && (
            <div className="ForumManagementPage-table-wrapper">
                <table className="ForumManagementPage-table">
                    <thead>
                        <tr>
                            <th style={{width: 50, cursor:'pointer'}} onClick={() => {
                              setSortBy('id'); setSortOrder(sortBy==='id' && sortOrder==='asc' ? 'desc' : 'asc');
                            }}>ID {sortBy==='id' && (sortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
                            <th style={{cursor:'pointer'}} onClick={() => {
                              setSortBy('title'); setSortOrder(sortBy==='title' && sortOrder==='asc' ? 'desc' : 'asc');
                            }}>Tiêu đề {sortBy==='title' && (sortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
                            <th style={{cursor:'pointer'}} onClick={() => {
                              setSortBy('author'); setSortOrder(sortBy==='author' && sortOrder==='asc' ? 'desc' : 'asc');
                            }}>Tác giả</th>
                            <th style={{cursor:'pointer'}} onClick={() => {
                              setSortBy('status'); setSortOrder(sortBy==='status' && sortOrder==='asc' ? 'desc' : 'asc');
                            }}>Trạng thái {sortBy==='status' && (sortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
                            <th style={{cursor:'pointer'}} onClick={() => {
                              setSortBy('created_at'); setSortOrder(sortBy==='created_at' && sortOrder==='asc' ? 'desc' : 'asc');
                            }}>Ngày tạo {sortBy==='created_at' && (sortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
                            <th style={{textAlign:'right'}}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questionsToShow.map(q => (
                            <tr key={q.id}>
                                <td>{q.id}</td>
                                <td>
                                    <div style={{fontWeight:500}}>{q.title}</div>
                                    <div style={{fontSize:11, color:'#888'}}>{q.topic?.title || topics.find(t=>t.id===q.topicId)?.title || 'No topic'}</div>
                                </td>
                                <td>{q.author?.full_name || q.User?.full_name || 'Ẩn danh'}</td>
                                <td>{renderBadge(q.status)}</td>
                                <td>{new Date(q.created_at).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <div className="ForumManagementPage-action-group" style={{justifyContent:'flex-end'}}>
                                        <button 
                                            className="ForumManagementPage-btn-icon" 
                                            onClick={() => navigate(`/dien-dan-suc-khoe/cau-hoi/${q.id}`)} 
                                            title="Xem chi tiết"
                                        >
                                            <FaEye/>
                                        </button>
                                        {canModerateQuestions && q.status === 'pending' && (
                                            <>
                                                <button className="ForumManagementPage-btn-icon btn-approve" onClick={() => handleApprove(q.id)} title="Duyệt"><FaCheckCircle/></button>
                                                <button className="ForumManagementPage-btn-icon btn-reject" onClick={() => handleReject(q.id)} title="Từ chối"><FaTimesCircle/></button>
                                            </>
                                        )}
                                        {canModerateQuestions && (
                                            <button className="ForumManagementPage-btn-icon btn-reject" onClick={() => handleDelete(q.id)} title="Xóa"><FaTrashAlt/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* 3. VIEW: TOPICS - LIST MODE */}
        {activeTab === 'topics' && viewMode === 'list' && (
             <div className="ForumManagementPage-list-container">
                {myTopics.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                        <FaThList size={48} style={{marginBottom: '16px'}} />
                        <p>Chưa có chủ đề nào</p>
                    </div>
                ) : (
                    <>
                        {myTopics
                            .filter(topic => {
                                if (!searchTerm) return true;
                                const search = searchTerm.toLowerCase();
                                return topic.title?.toLowerCase().includes(search) || 
                                       topic.description?.toLowerCase().includes(search);
                            })
                            .map(topic => (
                            <div key={topic.id} className="ForumManagementPage-card">
                                <div className="ForumManagementPage-card-header">
                                    <div className="ForumManagementPage-card-title">
                                        <h3>{topic.title}</h3>
                                        <div className="ForumManagementPage-card-meta">
                                            {topic.autoApprove ? <span className="ForumManagementPage-badge badge-approved"><FaCheckCircle/> Tự động duyệt</span> : <span className="ForumManagementPage-badge badge-pending"><FaUserMd/> Duyệt thủ công</span>}
                                            <span>• {topic.description}</span>
                                        </div>
                                    </div>
                                    <div className="ForumManagementPage-action-group">
                                        {canEditTopic && (
                                            <button className="ForumManagementPage-btn-icon" onClick={() => { 
                                                setEditingTopic(topic); 
                                                const normalizedTopic = {
                                                    ...topic,
                                                    moderatorIds: Array.isArray(topic.moderatorIds) 
                                                        ? topic.moderatorIds 
                                                        : (Array.isArray(topic.moderator_ids) ? topic.moderator_ids : [])
                                                };
                                                setTopicForm(normalizedTopic); 
                                                setShowTopicForm(true); 
                                            }}><FaEdit/></button>
                                        )}
                                        {canToggleTopic && (
                                            <button 
                                                className="ForumManagementPage-btn-icon" 
                                                onClick={() => handleToggleTopicStatus(topic.id)}
                                                title={topic.isActive ? 'Ẩn' : 'Hiện'}
                                            >
                                                {topic.isActive ? <FaEyeSlash/> : <FaEye/>}
                                            </button>
                                        )}
                                        {canDeleteTopic && (
                                            <button 
                                                className="ForumManagementPage-btn-icon btn-reject" 
                                                onClick={() => handleDeleteTopic(topic.id)}
                                                title="Xóa"
                                            >
                                                <FaTrashAlt/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
             </div>
        )}

        {/* 3. VIEW: TOPICS - TABLE MODE */}
    {activeTab === 'topics' && viewMode === 'table' && (
      <div className="ForumManagementPage-table-container">
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <select className="ForumManagementPage-select" value={topicFilterMode} onChange={e=>setTopicFilterMode(e.target.value)}>
          <option value="all">-- Tất cả chế độ duyệt --</option>
          <option value="auto">Tự động duyệt</option>
          <option value="manual">Duyệt thủ công</option>
          </select>
        </div>
        <table className="ForumManagementPage-table">
          <thead>
            <tr>
              <th style={{cursor:'pointer'}} onClick={()=>{setTopicSortBy('title');setTopicSortOrder(topicSortBy==='title'&&topicSortOrder==='asc'?'desc':'asc')}}>Tiêu đề {topicSortBy==='title'&&(topicSortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
              <th style={{cursor:'pointer'}} onClick={()=>{setTopicSortBy('description');setTopicSortOrder(topicSortBy==='description'&&topicSortOrder==='asc'?'desc':'asc')}}>Mô tả {topicSortBy==='description'&&(topicSortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
              <th style={{cursor:'pointer'}} onClick={()=>{setTopicSortBy('autoApprove');setTopicSortOrder(topicSortBy==='autoApprove'&&topicSortOrder==='asc'?'desc':'asc')}}>Chế độ duyệt {topicSortBy==='autoApprove'&&(topicSortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
              <th>Người quản lý</th>
              <th style={{cursor:'pointer'}} onClick={()=>{setTopicSortBy('isActive');setTopicSortOrder(topicSortBy==='isActive'&&topicSortOrder==='asc'?'desc':'asc')}}>Trạng thái {topicSortBy==='isActive'&&(topicSortOrder==='asc'?<FaChevronUp/>:<FaChevronDown/>)}</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {[...myTopics]
              .filter(topic => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return topic.title?.toLowerCase().includes(search) || topic.description?.toLowerCase().includes(search);
              })
              .filter(topic => {
              if (topicFilterMode==='all') return true;
              if (topicFilterMode==='auto') return topic.autoApprove;
              if (topicFilterMode==='manual') return !topic.autoApprove;
              return true;
              })
              .sort((a,b)=>{
              let vA = a[topicSortBy], vB = b[topicSortBy];
              if(topicSortBy==='title'||topicSortBy==='description'){
                vA = vA?.toLowerCase()||''; vB = vB?.toLowerCase()||'';
              }
              if(topicSortBy==='created_at'||topicSortBy==='createdAt'){
                vA = new Date(a.created_at||a.createdAt); vB = new Date(b.created_at||b.createdAt);
              }
              if(topicSortBy==='autoApprove'||topicSortBy==='isActive'){
                vA = !!vA; vB = !!vB;
              }
              if(vA<vB) return topicSortOrder==='asc'?-1:1;
              if(vA>vB) return topicSortOrder==='asc'?1:-1;
              return 0;
              })
              .map(topic => (
              <tr key={topic.id}>
                <td>
                  <strong>{topic.title}</strong>
                </td>
                <td style={{maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {topic.description}
                </td>
                <td>
                  {topic.autoApprove ? (
                    <span className="ForumManagementPage-badge badge-approved">
                      <FaCheckCircle/> Tự động
                    </span>
                  ) : (
                    <span className="ForumManagementPage-badge badge-pending">
                      <FaUserMd/> Thủ công
                    </span>
                  )}
                </td>
                <td>
                  {(() => {
                    const moderatorIds = Array.isArray(topic.moderatorIds) ? topic.moderatorIds : (Array.isArray(topic.moderator_ids) ? topic.moderator_ids : []);
                    if (moderatorIds.length === 0) {
                      return <span style={{color: '#999', fontSize: '12px'}}>Chưa phân công</span>;
                    }
                    const moderators = staffList.filter(s => moderatorIds.includes(s.user_id));
                    if (moderators.length === 0) {
                      return <span style={{color: '#ff9800', fontSize: '12px'}}>Không tìm thấy ({moderatorIds.join(', ')})</span>;
                    }
                    return moderators.map((mod, idx) => (
                      <div key={mod.id} style={{fontSize: '12px', marginBottom: idx < moderators.length - 1 ? '4px' : '0'}}>
                        <FaUserMd style={{marginRight: '4px', color: '#4CAF50'}} />
                        {mod.User?.full_name || 'N/A'}
                      </div>
                    ));
                  })()}
                </td>
                <td>
                  {topic.isActive ? (
                    <span className="ForumManagementPage-badge badge-approved">
                      <FaCheckCircle/> Hoạt động
                    </span>
                  ) : (
                    <span className="ForumManagementPage-badge badge-hidden">
                      <FaEyeSlash/> Ẩn
                    </span>
                  )}
                </td>
                <td>
                  <div className="ForumManagementPage-action-group">
                    {canEditTopic && (
                      <button 
                        className="ForumManagementPage-btn-icon" 
                        onClick={() => { 
                          setEditingTopic(topic); 
                          const normalizedTopic = {
                            ...topic,
                            moderatorIds: Array.isArray(topic.moderatorIds) 
                              ? topic.moderatorIds 
                              : (Array.isArray(topic.moderator_ids) ? topic.moderator_ids : [])
                          };
                          setTopicForm(normalizedTopic); 
                          setShowTopicForm(true); 
                        }}
                        title="Sửa"
                      >
                        <FaEdit/>
                      </button>
                    )}
                    {canToggleTopic && (
                      <button 
                        className="ForumManagementPage-btn-icon" 
                        onClick={() => handleToggleTopicStatus(topic.id)}
                        title={topic.isActive ? 'Ẩn topic' : 'Hiện topic'}
                      >
                        {topic.isActive ? <FaEyeSlash/> : <FaEye/>}
                      </button>
                    )}
                    {canDeleteTopic && (
                      <button 
                        className="ForumManagementPage-btn-icon btn-reject" 
                        onClick={() => handleDeleteTopic(topic.id)}
                        title="Xóa"
                      >
                        <FaTrashAlt/>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

        {/* 4. VIEW: REPORTS */}
        {activeTab === 'reports' && (
            <div className="ForumManagementPage-list-container">
                 {reportsToShow.length === 0 ? (
                     <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                         <FaExclamationTriangle size={48} style={{marginBottom: '16px'}} />
                         <p>Không có báo cáo nào</p>
                     </div>
                 ) : (
                     reportsToShow.map(r => (
                         <div key={r.id} className="ForumManagementPage-card">
                             <div className="ForumManagementPage-card-header">
                                 <div className="ForumManagementPage-card-title">
                                     <h3 style={{color: '#E57373'}}>
                                         <FaExclamationTriangle/> Báo cáo #{r.id} - {r.entityType === 'question' ? 'Câu hỏi' : 'Câu trả lời'}
                                     </h3>
                                     <div className="ForumManagementPage-card-meta">
                                         <span>Lý do: <strong>{
                                             r.reason === 'spam' ? 'Spam' :
                                             r.reason === 'inappropriate' ? 'Không phù hợp' :
                                             r.reason === 'misleading' ? 'Sai lệch' :
                                             r.reason === 'offensive' ? 'Xúc phạm' : 'Khác'
                                         }</strong></span> • 
                                         <span>Bởi: {r.reporter?.full_name || 'N/A'}</span> •
                                         <span>{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                                     </div>
                                     {r.description && (
                                         <p style={{marginTop: '8px', color: '#666', fontSize: '0.9rem'}}>
                                             "{r.description}"
                                         </p>
                                     )}
                                 </div>
                                 {renderBadge(r.status)}
                             </div>
                             
                             {/* Thông tin nội dung bị báo cáo */}
                             <div style={{padding: '12px 16px', background: '#f9f9f9', borderRadius: '8px', marginTop: '12px'}}>
                                 <strong>Nội dung bị báo cáo:</strong>
                                 <p style={{marginTop: '8px', color: '#333'}}>
                                     {r.entityType === 'question' && r.question ? (
                                         <>
                                             <strong>{r.question.title}</strong>
                                             <br/>
                                             <small style={{color: '#666'}}>
                                                 {(r.question.content || '').substring(0, 200)}...
                                             </small>
                                         </>
                                     ) : r.entityType === 'answer' && r.answer ? (
                                         <small style={{color: '#666'}}>
                                             {(r.answer.content || '').substring(0, 200)}...
                                         </small>
                                     ) : (
                                         <em style={{color: '#999'}}>Nội dung đã bị xóa</em>
                                     )}
                                 </p>
                             </div>

                             {/* Hành động xử lý */}
                             {canModerateQuestions && r.status === 'pending' && (
                                 <div className="ForumManagementPage-card-footer" style={{marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
                                     {r.entityType === 'question' && r.question && (
                                         <>
                                             <button 
                                                 className="ForumManagementPage-btn-action" 
                                                 style={{background: '#FFA726', color: '#fff'}}
                                                 onClick={() => {
                                                     if (window.confirm('Ẩn câu hỏi này?')) {
                                                         handleUpdateQuestionStatus(r.question.id, 'hidden');
                                                     }
                                                 }}
                                                 title="Ẩn câu hỏi"
                                             >
                                                 <FaEyeSlash /> Ẩn
                                             </button>
                                             <button 
                                                 className="ForumManagementPage-btn-action" 
                                                 style={{background: '#EF5350', color: '#fff'}}
                                                 onClick={() => {
                                                     if (window.confirm('Xóa vĩnh viễn câu hỏi này?')) {
                                                         handleDeleteQuestion(r.question.id);
                                                     }
                                                 }}
                                                 title="Xóa câu hỏi"
                                             >
                                                 <FaTrash /> Xóa
                                             </button>
                                         </>
                                     )}
                                     <button 
                                         className="ForumManagementPage-btn-action" 
                                         style={{background: '#66BB6A', color: '#fff'}}
                                         onClick={() => {
                                             // TODO: Gọi API PUT /forum/reports/:id/handle với status='dismissed'
                                             alert('Chức năng đánh dấu "Đã xử lý" sẽ được bổ sung');
                                         }}
                                         title="Đánh dấu đã giải quyết"
                                     >
                                         <FaCheckCircle /> Đã xử lý
                                     </button>
                                     <button 
                                         className="ForumManagementPage-btn-action" 
                                         style={{background: '#BDBDBD', color: '#fff'}}
                                         onClick={() => {
                                             if (window.confirm('Bỏ qua báo cáo này?')) {
                                                 // TODO: Gọi API PUT /forum/reports/:id/handle với status='dismissed'
                                                 alert('Chức năng "Bỏ qua" sẽ được bổ sung');
                                             }
                                         }}
                                         title="Bỏ qua báo cáo"
                                     >
                                         <FaTimes /> Bỏ qua
                                     </button>
                                 </div>
                             )}
                         </div>
                     ))
                 )}
            </div>
        )}

      </div>

      {/* MODAL FORM TOPIC */}
      {showTopicForm && (
        <div className="ForumManagementPage-modal-overlay">
          <div className="ForumManagementPage-modal">
            <div className="ForumManagementPage-modal-header">
              <h2>{editingTopic ? 'Cập nhật Topic' : 'Tạo Topic Mới'}</h2>
              <button className="ForumManagementPage-btn-close" onClick={() => setShowTopicForm(false)}><FaTimes/></button>
            </div>
            <form onSubmit={handleTopicSubmit} className="ForumManagementPage-modal-body">
                <div className="ForumManagementPage-form-group">
                    <label className="ForumManagementPage-label">Tiêu đề</label>
                    <input className="ForumManagementPage-input" value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} required />
                </div>
                <div className="ForumManagementPage-form-group">
                    <label className="ForumManagementPage-label">Mô tả</label>
                    <textarea className="ForumManagementPage-input ForumManagementPage-textarea" value={topicForm.description} onChange={e => setTopicForm({...topicForm, description: e.target.value})} />
                </div>
                <div className="ForumManagementPage-form-group">
                    <label className="ForumManagementPage-toggle-row">
                        {topicForm.requiresApproval ? <FaToggleOn size={24} color="#4CAF50"/> : <FaToggleOff size={24} color="#ccc"/>}
                        <input type="checkbox" style={{display:'none'}} checked={topicForm.requiresApproval} onChange={e => setTopicForm({...topicForm, requiresApproval: e.target.checked, autoApprove: !e.target.checked})}/>
                        <span>Yêu cầu phê duyệt thủ công</span>
                    </label>
                </div>
                
                {topicForm.requiresApproval && (
                    <div className="ForumManagementPage-form-group">
                        <label className="ForumManagementPage-label">Moderators (Max 2)</label>
                        <div className="ForumManagementPage-mod-grid">
                            {staffList
                                .filter(s => {
                                    // ✅ Chỉ hiển thị staff có quyền moderate_questions
                                    const permissions = s.permissions?.forum || [];
                                    if (!Array.isArray(permissions) || !permissions.includes('moderate_questions')) {
                                        return false;
                                    }
                                    
                                    // ✅ LOẠI BỎ trưởng phòng CSKH/Content (họ đã có mọi quyền rồi)
                                    const rank = s.rank;
                                    const department = s.department;
                                    if (rank === 'manager' && (department === 'support' || department === 'content')) {
                                        return false; // Không hiển thị trưởng phòng
                                    }
                                    
                                    return true;
                                })
                                .map(s => {
                                    // ✅ Đảm bảo moderatorIds là array
                                    const moderatorIds = Array.isArray(topicForm.moderatorIds) ? topicForm.moderatorIds : [];
                                    const isSelected = moderatorIds.includes(s.user_id);
                                    
                                    return (
                                        <div key={s.id} 
                                             className={`ForumManagementPage-mod-item ${isSelected ? 'selected' : ''}`}
                                             onClick={() => {
                                                 const ids = isSelected 
                                                    ? moderatorIds.filter(id => id !== s.user_id)
                                                    : [...moderatorIds, s.user_id].slice(0, 2);
                                                 setTopicForm({...topicForm, moderatorIds: ids});
                                             }}
                                        >
                                            {isSelected ? <FaCheckCircle/> : <div style={{width:14}}/>}
                                            {s.User?.full_name}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                <div className="ForumManagementPage-modal-footer">
                    <button type="button" className="ForumManagementPage-btn btn-secondary" onClick={() => setShowTopicForm(false)}>Hủy</button>
                    <button type="submit" className="ForumManagementPage-btn-create"><FaSave/> Lưu</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM QUESTION */}
      {showQuestionForm && (
        <div className="ForumManagementPage-modal-overlay">
          <div className="ForumManagementPage-modal">
            <div className="ForumManagementPage-modal-header">
              <h2>Tạo câu hỏi mới</h2>
              <button className="ForumManagementPage-btn-close" onClick={() => setShowQuestionForm(false)}><FaTimes/></button>
            </div>
            <form onSubmit={handleQuestionSubmit} className="ForumManagementPage-modal-body">
                <div className="ForumManagementPage-form-group">
                    <label className="ForumManagementPage-label">Topic <span style={{color:'red'}}>*</span></label>
                    <select 
                      className="ForumManagementPage-input" 
                      value={questionForm.topicId} 
                      onChange={e => setQuestionForm({...questionForm, topicId: e.target.value})} 
                      required
                    >
                      <option value="">-- Chọn Topic --</option>
                      {topics.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                </div>
                
                <div className="ForumManagementPage-form-group">
                    <label className="ForumManagementPage-label">Tiêu đề <span style={{color:'red'}}>*</span></label>
                    <input 
                      className="ForumManagementPage-input" 
                      value={questionForm.title} 
                      onChange={e => setQuestionForm({...questionForm, title: e.target.value})} 
                      required 
                      placeholder="Nhập tiêu đề câu hỏi..."
                    />
                </div>
                
                <div className="ForumManagementPage-form-group">
                    <label className="ForumManagementPage-label">Nội dung <span style={{color:'red'}}>*</span></label>
                    <textarea 
                      className="ForumManagementPage-input ForumManagementPage-textarea" 
                      value={questionForm.content} 
                      onChange={e => setQuestionForm({...questionForm, content: e.target.value})} 
                      required
                      rows={6}
                      placeholder="Mô tả chi tiết câu hỏi của bạn..."
                    />
                </div>
                
                <div className="ForumManagementPage-form-group">
                    <label className="ForumManagementPage-label">Chuyên khoa (tùy chọn)</label>
                    <select 
                      className="ForumManagementPage-input" 
                      value={questionForm.specialtyId} 
                      onChange={e => setQuestionForm({...questionForm, specialtyId: e.target.value})}
                    >
                      <option value="">-- Không chọn --</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                </div>

                <div className="ForumManagementPage-modal-footer">
                    <button type="button" className="ForumManagementPage-btn btn-secondary" onClick={() => setShowQuestionForm(false)}>Hủy</button>
                    <button type="submit" className="ForumManagementPage-btn-create"><FaSave/> Tạo câu hỏi</button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ForumManagementPage;
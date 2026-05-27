// client/src/pages/CommunityGroupManagePage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import api from '../services/api';
import {
  FaSearch, FaCheck, FaTimes, FaGlobe, FaShieldAlt, 
  FaToggleOn, FaToggleOff, FaUsers, FaUserMd, FaFilter, 
  FaChevronDown, FaHeart, FaBrain, FaDumbbell, FaStethoscope, 
  FaAppleAlt, FaLeaf, FaRunning, FaTooth, FaBaby, FaVial, FaPills, FaClock,
  FaLockOpen, FaLock, FaEnvelope, FaExclamationTriangle, FaBan, FaTrash, FaPlay
} from 'react-icons/fa';
import './CommunityGroupManagePage.css';

const STATUS_CONFIG = {
  pending: { bg: '#fff8e1', color: '#f57c00', text: 'Chờ duyệt' },
  active: { bg: '#e8f5e9', color: '#2e7d32', text: 'Hoạt động' },
  suspended: { bg: '#ffebee', color: '#c62828', text: 'Từ chối / Đình chỉ' }
};

const PRIVACY_CONFIG = {
  public: { icon: <FaLockOpen />, label: 'Công khai', color: '#15803d' },
  private: { icon: <FaLock />, label: 'Riêng tư', color: '#b45309' },
  invite_only: { icon: <FaEnvelope />, label: 'Chỉ mời', color: '#4338ca' }
};

const GROUP_ICONS_MAP = {
  FaUsers: <FaUsers />, FaHeart: <FaHeart />, FaBrain: <FaBrain />,
  FaDumbbell: <FaDumbbell />, FaStethoscope: <FaStethoscope />, FaAppleAlt: <FaAppleAlt />,
  FaLeaf: <FaLeaf />, FaRunning: <FaRunning />, FaTooth: <FaTooth />,
  FaBaby: <FaBaby />, FaVial: <FaVial />, FaPills: <FaPills />
};

const CommunityGroupManagePage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  
  // Filters
  const [activeTab, setActiveTab] = useState('all'); 
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [dateSort, setDateSort] = useState('desc'); 

  // Settings
  const [isCreationAllowed, setIsCreationAllowed] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Action State (Dùng chung cho Warn, Reject, Suspend)
  const [actionState, setActionState] = useState({ id: null, type: '', reason: '' });

  const userRole = typeof user?.role === 'object' ? user?.role?.name?.toLowerCase() : user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff';
  const canApproveGroup = isAdmin || isStaff;

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await api.get('/specialties');
        setSpecialties(res.data.specialties || res.data.data || []);
      } catch (err) {}
    };
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchSettings = async () => {
      try {
        const res = await communityService.getGroupSettings();
        if (res.data.success) setIsCreationAllowed(res.data.data.allowUserCreateGroup);
      } catch (err) {}
    };
    fetchSettings();
  }, [isAdmin]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (activeTab !== 'all') params.status = activeTab;
      if (search.trim()) params.search = search.trim();
      
      const res = await communityService.adminGetAllGroups(params);
      let data = res?.data?.data?.groups || [];

      if (selectedSpecialty) {
        data = data.filter(g => g.doctor && String(g.doctor.specialty_id) === String(selectedSpecialty));
      }

      data.sort((a, b) => {
        const tA = new Date(a.created_at).getTime();
        const tB = new Date(b.created_at).getTime();
        return dateSort === 'desc' ? tB - tA : tA - tB;
      });

      setGroups(data);
    } catch (err) {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, selectedSpecialty, dateSort]);

  // ─── XỬ LÝ HÀNH ĐỘNG CỦA ADMIN ──────────────────────────────────────────────

  const handleToggleSetting = async () => {
    if (!window.confirm(`Bạn muốn ${isCreationAllowed ? 'KHÓA' : 'MỞ'} quyền tạo nhóm của người dùng?`)) return;
    setSettingsLoading(true);
    try {
      const res = await communityService.toggleGroupSettings();
      if(res.data.success) setIsCreationAllowed(res.data.data.allowUserCreateGroup);
    } catch(e) { alert('Lỗi khi thay đổi cài đặt hệ thống'); } 
    finally { setSettingsLoading(false); }
  };

  const executeAction = async () => {
    const { id, type, reason } = actionState;
    if (['reject', 'suspend', 'warn'].includes(type) && !reason.trim()) {
      return alert('Vui lòng nhập lý do!');
    }

    try {
      if (type === 'reject') {
        await communityService.adminRejectGroup(id, reason);
      } else if (type === 'suspend') {
        await communityService.adminForceSuspendGroup(id, reason);
      } else if (type === 'warn') {
        await communityService.adminWarnGroup(id, reason);
        alert('Đã gửi cảnh báo đến Trưởng nhóm!');
      }

      setActionState({ id: null, type: '', reason: '' });
      fetchGroups(); // Refresh data
    } catch (error) {
      alert(error?.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleQuickAction = async (id, type) => {
    try {
      if (type === 'approve') {
        await communityService.adminApproveGroup(id);
      } else if (type === 'active') {
        await communityService.adminForceActiveGroup(id);
      } else if (type === 'delete') {
        if (!window.confirm('Hành động này sẽ XÓA VĨNH VIỄN nhóm và toàn bộ bài viết. Tiếp tục?')) return;
        await communityService.adminForceDeleteGroup(id);
      }
      fetchGroups();
    } catch (error) {
      alert(error?.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const pendingCount = groups.filter(g => g.status === 'pending').length;

  return (
    <div className="cgmp-container">
      {/* HEADER */}
      <div className="cgmp-header">
        <div className="cgmp-header-text">
          <h1>Quản lý Nhóm Cộng Đồng</h1>
          <p>Phê duyệt và quản lý các nhóm do người dùng & bác sĩ tạo.</p>
        </div>
        {isAdmin && (
          <button 
            className={`cgmp-toggle-btn ${isCreationAllowed ? 'open' : 'locked'}`} 
            onClick={handleToggleSetting}
            disabled={settingsLoading}
          >
            {isCreationAllowed ? <FaToggleOn size={22} /> : <FaToggleOff size={22} />}
            <span>Quyền User tạo nhóm: <strong>{isCreationAllowed ? 'ĐANG MỞ' : 'ĐÃ KHÓA'}</strong></span>
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="cgmp-toolbar">
        <div className="cgmp-search-box">
          <FaSearch className="cgmp-icon-muted" />
          <input type="text" placeholder="Tìm tên nhóm, mô tả..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="cgmp-select-wrapper">
          <FaFilter className="cgmp-icon-muted" size={12}/>
          <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map(spec => <option key={spec.id} value={spec.id}>{spec.name}</option>)}
          </select>
          <FaChevronDown className="cgmp-arrow" />
        </div>
        <div className="cgmp-select-wrapper">
          <FaClock className="cgmp-icon-muted" size={13}/>
          <select value={dateSort} onChange={(e) => setDateSort(e.target.value)}>
            <option value="desc">Mới nhất</option>
            <option value="asc">Cũ nhất</option>
          </select>
          <FaChevronDown className="cgmp-arrow" />
        </div>

        <div className="cgmp-tabs">
          <button className={`cgmp-tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tất cả</button>
          <button className={`cgmp-tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            Chờ duyệt {activeTab === 'all' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
          <button className={`cgmp-tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>Hoạt động</button>
          <button className={`cgmp-tab-btn ${activeTab === 'suspended' ? 'active' : ''}`} onClick={() => setActiveTab('suspended')}>Từ chối/Đình chỉ</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="cgmp-table-card">
        {loading ? (
          <div className="cgmp-loading"><div className="cgmp-spinner"></div></div>
        ) : (
          <div className="cgmp-table-responsive">
            <table className="cgmp-table">
              <thead>
                <tr>
                  <th>Thông tin Nhóm</th>
                  <th>Nguồn gốc</th>
                  <th>Người tạo / Bác sĩ</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right', minWidth: '220px' }}>Thao tác Admin</th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr><td colSpan={5} className="cgmp-empty">Không có nhóm nào phù hợp.</td></tr>
                ) : (
                  groups.map(g => {
                    const statusUI = STATUS_CONFIG[g.status] || STATUS_CONFIG.active;
                    const privacyUI = PRIVACY_CONFIG[g.privacy] || PRIVACY_CONFIG.public;

                    return (
                      <tr key={g.id}>
                        {/* CỘT 1: THÔNG TIN */}
                        <td>
                          <div className="cgmp-info-cell">
                            <div className="cgmp-icon-box">
                              {g.avatar_image ? (
                                <img src={g.avatar_image.startsWith('http') ? g.avatar_image : `http://localhost:3001${g.avatar_image}`} alt="Avatar" onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <span>{GROUP_ICONS_MAP[g.icon] || <FaUsers />}</span>
                              )}
                            </div>
                            <div className="cgmp-info-content">
                              <span className="cgmp-group-name" title={g.name}>{g.name}</span>
                              <div className="cgmp-group-meta">
                                <span style={{ color: privacyUI.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  {privacyUI.icon} {privacyUI.label}
                                </span>
                                <span>•</span>
                                <span><FaUsers /> {g.members_count}</span>
                              </div>
                              <span className="cgmp-group-date">Tạo: {new Date(g.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </td>

                        {/* CỘT 2: NGUỒN GỐC */}
                        <td>
                          {g.type === 'official' ? (
                            <span className="cgmp-badge cgmp-badge-official"><FaShieldAlt /> Chính thống</span>
                          ) : (
                            <span className="cgmp-badge cgmp-badge-community"><FaGlobe /> Cộng đồng</span>
                          )}
                        </td>

                        {/* CỘT 3: NGƯỜI TẠO / BÁC SĨ */}
                        <td>
                          <div className="cgmp-creator-info">
                            <div><span className="cgmp-label">Tạo bởi:</span> {g.owner?.full_name || 'Ẩn danh'}</div>
                            <div>
                              <span className="cgmp-label">Bác sĩ PT:</span> 
                              {g.doctor?.user?.full_name ? <span className="cgmp-doc-name"><FaUserMd/> BS. {g.doctor.user.full_name}</span> : <span className="cgmp-no-doc">Không có</span>}
                            </div>
                          </div>
                        </td>

                        {/* CỘT 4: TRẠNG THÁI */}
                        <td>
                          <span className="cgmp-status-pill" style={{ background: statusUI.bg, color: statusUI.color }}>{statusUI.text}</span>
                          {(g.status === 'suspended' || g.status === 'rejected') && g.rejection_reason && (
                            <div className="cgmp-reject-reason" title={g.rejection_reason}>Lý do: {g.rejection_reason}</div>
                          )}
                        </td>

                        {/* CỘT 5: ACTION */}
                        <td style={{ position: 'relative', textAlign: 'right' }}>
                          <div className="cgmp-actions">
                            <button className="cgmp-btn cgmp-btn-view" title="Xem nhóm" onClick={() => navigate(`/cong-dong/nhom/${g.slug}`)}><FaSearch /></button>
                            
                            {/* Nút hành động theo trạng thái */}
                            {g.status === 'pending' && canApproveGroup && (
                              <>
                                <button className="cgmp-btn cgmp-btn-approve" title="Phê duyệt" onClick={() => handleQuickAction(g.id, 'approve')}><FaCheck /> Duyệt</button>
                                <button className="cgmp-btn cgmp-btn-reject-trigger" title="Từ chối" onClick={() => setActionState({ id: g.id, type: 'reject', reason: '' })}><FaTimes /> Từ chối</button>
                              </>
                            )}

                            {g.status === 'active' && isAdmin && (
                              <>
                                <button className="cgmp-btn cgmp-btn-warn" title="Gửi cảnh báo" onClick={() => setActionState({ id: g.id, type: 'warn', reason: '' })}><FaExclamationTriangle /></button>
                                <button className="cgmp-btn cgmp-btn-suspend" title="Khóa/Đình chỉ" onClick={() => setActionState({ id: g.id, type: 'suspend', reason: '' })}><FaBan /></button>
                                <button className="cgmp-btn cgmp-btn-delete" title="Xóa vĩnh viễn" onClick={() => handleQuickAction(g.id, 'delete')}><FaTrash /></button>
                              </>
                            )}

                            {g.status === 'suspended' && isAdmin && (
                              <>
                                <button className="cgmp-btn cgmp-btn-active" title="Mở khóa/Khôi phục" onClick={() => handleQuickAction(g.id, 'active')}><FaPlay /> Khôi phục</button>
                                <button className="cgmp-btn cgmp-btn-delete" title="Xóa vĩnh viễn" onClick={() => handleQuickAction(g.id, 'delete')}><FaTrash /></button>
                              </>
                            )}
                          </div>

                          {/* INLINE POPUP (Nhập lý do) */}
                          {actionState.id === g.id && (
                            <div className="cgmp-action-popup">
                              <p className="cgmp-popup-title">
                                {actionState.type === 'reject' && 'Lý do từ chối'}
                                {actionState.type === 'warn' && 'Nội dung cảnh báo'}
                                {actionState.type === 'suspend' && 'Lý do khóa nhóm'}
                              </p>
                              <input type="text" placeholder="Nhập lý do ở đây..." autoFocus value={actionState.reason} onChange={e => setActionState({...actionState, reason: e.target.value})} />
                              <div className="cgmp-popup-actions">
                                <button className="cgmp-btn cgmp-btn-confirm" onClick={executeAction}>Xác nhận</button>
                                <button className="cgmp-btn cgmp-btn-cancel" onClick={() => setActionState({id: null, type: '', reason: ''})}>Huỷ</button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityGroupManagePage;
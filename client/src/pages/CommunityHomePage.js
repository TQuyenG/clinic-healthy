// client/src/pages/CommunityHomePage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import api from '../services/api';
import {
  FaUsers, FaSearch, FaPlus, FaChevronLeft, FaChevronRight,
  FaCheckCircle, FaLock, FaEnvelope, FaLockOpen, FaTimes,
  FaUserMd, FaNewspaper, FaFilter, FaShieldAlt, FaSadTear,
  FaSpinner, FaCheckSquare, FaHeart, FaBrain, FaDumbbell,
  FaStethoscope, FaAppleAlt, FaLeaf, FaRunning, FaTooth,
  FaBaby, FaVial, FaPills, FaImage
} from 'react-icons/fa';
import './CommunityHomePage.css';

const GROUP_ICONS_MAP = {
  FaUsers: <FaUsers />, FaHeart: <FaHeart />, FaBrain: <FaBrain />,
  FaDumbbell: <FaDumbbell />, FaStethoscope: <FaStethoscope />, FaAppleAlt: <FaAppleAlt />,
  FaLeaf: <FaLeaf />, FaRunning: <FaRunning />, FaTooth: <FaTooth />,
  FaBaby: <FaBaby />, FaVial: <FaVial />, FaPills: <FaPills />
};

const CommunityHomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AuthContext);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); // State cho popup thành công
  const [createdGroupStatus, setCreatedGroupStatus] = useState(''); // State để lưu status của nhóm vừa tạo
  const [groupSettings, setGroupSettings] = useState({ allowUserCreateGroup: true });

  const LIMIT = 12;

  // Lấy danh sách nhóm
  const fetchGroups = async (pageNum = 1, searchText = '', type = '') => {
    try {
      setLoading(true);
      const params = { page: pageNum, limit: LIMIT };
      if (searchText) params.search = searchText;
      if (type) params.type = type;
      const response = await communityService.getGroups(params);
      setGroups(response.data.data ? response.data.data.groups : response.data.groups);
      setTotalGroups(response.data.data ? response.data.data.total : response.data.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Lỗi tải danh sách nhóm:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lấy cài đặt hệ thống (Quyền tạo nhóm)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await communityService.getGroupSettings();
        if (res.data.success) {
          setGroupSettings(res.data.data);
        }
      } catch (err) {}
    };
    fetchSettings();
    fetchGroups(1, search, typeFilter);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchGroups(1, search, typeFilter);
  };

  const handleTypeFilterChange = (type) => {
    setTypeFilter(type);
    setPage(1);
    fetchGroups(1, search, type);
  };

  const totalPages = Math.ceil(totalGroups / LIMIT);

  // Logic kiểm tra quyền tạo nhóm
  const role = user?.role?.name?.toLowerCase() || user?.role?.toLowerCase();
  const isPrivileged = ['admin', 'staff', 'doctor'].includes(role);
  const canCreateGroup = isAuthenticated && (isPrivileged || groupSettings.allowUserCreateGroup);

  return (
    <div className="chp-page">
      {/* HEADER */}
      <div className="chp-header">
        <FaUsers className="chp-header-icon" />
        <div className="chp-header-content">
          <h1>Cộng Đồng Y Tế</h1>
          <p>Tham gia nhóm cộng đồng, chia sẻ kinh nghiệm và học hỏi từ bác sĩ và cộng đồng</p>
        </div>
        {canCreateGroup && (
          <button className="chp-btn-primary" onClick={() => setShowCreateModal(true)}>
            <FaPlus /> Tạo Nhóm Mới
          </button>
        )}
      </div>

      {/* CONTROLS */}
      <div className="chp-controls">
        <form onSubmit={handleSearch} className="chp-search-form">
          <div className="chp-search-wrapper">
            <FaSearch className="chp-search-icon" />
            <input type="text" placeholder="Tìm kiếm nhóm..." value={search} onChange={(e) => setSearch(e.target.value)} className="chp-search-input" />
          </div>
          <button type="submit" className="chp-btn-secondary"><FaSearch /> Tìm</button>
        </form>

        <div className="chp-filter-tabs">
          <button className={`chp-filter-tab${!typeFilter ? ' chp-filter-tab--active' : ''}`} onClick={() => handleTypeFilterChange('')}><FaFilter /> Tất Cả</button>
          <button className={`chp-filter-tab${typeFilter === 'official' ? ' chp-filter-tab--active' : ''}`} onClick={() => handleTypeFilterChange('official')}><FaShieldAlt /> Chính Thức</button>
          <button className={`chp-filter-tab${typeFilter === 'community' ? ' chp-filter-tab--active' : ''}`} onClick={() => handleTypeFilterChange('community')}><FaUsers /> Cộng Đồng</button>
        </div>
      </div>

      {/* GROUP LIST */}
      {loading ? (
        <div className="chp-loading"><div className="chp-spinner"></div><p>Đang tải nhóm...</p></div>
      ) : groups.length === 0 ? (
        <div className="chp-empty">
          <div className="chp-empty-icon"><FaSadTear /></div>
          <p>Không có nhóm nào được tìm thấy</p>
          {canCreateGroup && <button className="chp-btn-primary" onClick={() => setShowCreateModal(true)}><FaPlus /> Tạo nhóm đầu tiên</button>}
        </div>
      ) : (
        <div className="chp-groups-grid">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} onJoinClick={() => navigate(`/cong-dong/nhom/${group.slug}`)} />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="chp-pagination">
          <button className="chp-btn-secondary" disabled={page === 1} onClick={() => fetchGroups(page - 1, search, typeFilter)}><FaChevronLeft /> Trước</button>
          <span className="chp-pagination-info">Trang {page} / {totalPages}</span>
          <button className="chp-btn-secondary" disabled={page === totalPages} onClick={() => fetchGroups(page + 1, search, typeFilter)}>Sau <FaChevronRight /></button>
        </div>
      )}

      {/* MODAL TẠO NHÓM */}
      {showCreateModal && canCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(status) => {
            setShowCreateModal(false);
            setCreatedGroupStatus(status); //  Lưu status
            setShowSuccessPopup(true); 
            fetchGroups(1, search, typeFilter);
          }}
        />
      )}

      {/* POPUP THÔNG BÁO TẠO THÀNH CÔNG */}
      {showSuccessPopup && (
        <div className="chp-modal-overlay" style={{ zIndex: 2000 }}>
          <div className="chp-modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px 24px', borderRadius: '16px' }}>
            <FaCheckCircle color="#4CAF50" size={64} style={{ marginBottom: '16px' }} />
            <h2 style={{ margin: '0 0 12px', color: '#2E7D32', fontSize: '1.4rem' }}>Tạo nhóm thành công!</h2>
            <p style={{ color: '#555', marginBottom: '24px', lineHeight: '1.6', fontSize: '0.95rem' }}>
              {/*  HIỂN THỊ CHỮ DỰA THEO STATUS */}
              {createdGroupStatus === 'active' 
                ? 'Nhóm cộng đồng của bạn đã được tạo thành công và đang hoạt động công khai.' 
                : 'Nhóm cộng đồng của bạn đã được gửi đi. Nhóm sẽ nằm ở trạng thái Chờ duyệt trước khi hiển thị công khai.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button className="chp-btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }} onClick={() => navigate('/cong-dong/cua-toi')}>
                <FaEye /> Xem nhóm
              </button>
              <button className="chp-btn-secondary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }} onClick={() => setShowSuccessPopup(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GroupCard = ({ group, onJoinClick }) => {
  const privacyConfig = {
    public: { icon: <FaLockOpen />, label: 'Công khai' },
    private: { icon: <FaLock />, label: 'Riêng tư' },
    invite_only: { icon: <FaEnvelope />, label: 'Lời mời' },
  };
  const privacy = privacyConfig[group.privacy] || privacyConfig.public;

  return (
    <div className="chp-group-card">
      <div className="chp-card-cover">
        {group.cover_image ? (
          <img src={group.cover_image.startsWith('http') ? group.cover_image : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${group.cover_image}`} alt={group.name} />
        ) : (
          <div className="chp-card-cover-placeholder" style={{ fontSize: '48px' }}>
            {GROUP_ICONS_MAP[group.icon] || <FaUsers />}
          </div>
        )}
        <div className={`chp-card-badge ${group.type === 'official' ? 'chp-badge-official' : 'chp-badge-community'}`}>
          {group.type === 'official' ? <><FaShieldAlt /> Chính Thức</> : <><FaUsers /> Cộng Đồng</>}
        </div>
      </div>
      <div className="chp-card-content">
        <h3 className="chp-card-name">{group.name}</h3>
        <p className="chp-card-desc">{group.description || 'Không có mô tả'}</p>
        {group.doctor && (
          <div className="chp-card-doctor">
            <img src={group.doctor.user?.avatar_url || '/default-avatar.png'} alt="Doctor" className="chp-doctor-avatar" />
            <div className="chp-doctor-info">
              <span className="chp-doctor-label">Bác sĩ phụ trách</span>
              <span className="chp-doctor-name">{group.doctor.user?.full_name}</span>
            </div>
          </div>
        )}
        <div className="chp-card-stats">
          <span className="chp-stat-item"><FaUsers /> {group.members_count} thành viên</span>
          <span className="chp-stat-item"><FaNewspaper /> {group.posts_count} bài đăng</span>
        </div>
        <div className="chp-card-privacy">{privacy.icon} {privacy.label}</div>
      </div>
      <button className="chp-btn-primary chp-btn-full" onClick={onJoinClick}>Xem Chi Tiết <FaChevronRight /></button>
    </div>
  );
};

const CreateGroupModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '', description: '', privacy: 'public', specialty_id: '', doctor_id: '', requires_post_approval: true, icon: 'FaUsers', avatar_image: '', cover_image: ''
  });
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSpecialties = async () => {
      try { const response = await api.get('/specialties'); setSpecialties(response.data.specialties || response.data.data || []); } catch (err) {}
    };
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (!formData.specialty_id) { setDoctors([]); return; }
    const fetchDoctorsBySpecialty = async () => {
      try { const response = await api.get(`/users/doctors?status=active&specialty_id=${formData.specialty_id}`); setDoctors(response.data.doctors || response.data.data || []); setFormData(prev => ({ ...prev, doctor_id: '' })); } catch (err) { setDoctors([]); }
    };
    fetchDoctorsBySpecialty();
  }, [formData.specialty_id]);

  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };

  const handleGroupImageUpload = async (e, type) => {
    const file = e.target.files[0]; if (!file) return; setUploading(true);
    try {
      const formUpload = new FormData(); formUpload.append('image', file);
      const res = await api.post('/upload/image', formUpload, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) { const url = res.data.url || res.data.imageUrl; setFormData(prev => ({ ...prev, [type]: url })); }
    } catch (error) { setError('Không thể upload ảnh, vui lòng thử lại!'); } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!formData.name.trim()) { setError('Vui lòng nhập tên nhóm'); return; }
    setLoading(true);
    try {
      const payload = { ...formData, doctor_id: formData.doctor_id ? parseInt(formData.doctor_id) : null };
      const res = await communityService.createGroup(payload);
      
      //  TRUYỀN status CỦA NHÓM LÊN COMPONENT CHA ĐỂ HIỂN THỊ ĐÚNG POPUP
      onSuccess(res.data.data.status); 
    } catch (err) { setError(err.response?.data?.message || 'Lỗi tạo nhóm'); } 
    finally { setLoading(false); }
  };

  return (
    <div className="chp-modal-overlay" onClick={onClose}>
      <div className="chp-modal chp-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="chp-modal-header">
          <h2><FaUsers style={{ marginRight: 8 }} />Tạo Nhóm Cộng Đồng</h2>
          <button className="chp-modal-close" onClick={onClose} disabled={loading || uploading}><FaTimes /></button>
        </div>
        <form onSubmit={handleSubmit} className="chp-modal-form">
          {error && <div className="chp-error-msg">{error}</div>}
          <div className="chp-form-section">
            <div className="chp-form-group">
              <label>Tên Nhóm <span className="chp-required">*</span></label>
              <input type="text" name="name" placeholder="Ví dụ: Nhóm Tư Vấn Sức Khỏe Tim Mạch" value={formData.name} onChange={handleChange} maxLength="255" required />
            </div>
            <div className="chp-form-group">
              <label>Mô Tả Nhóm</label>
              <textarea name="description" rows="2" placeholder="Mục đích và đối tượng..." value={formData.description} onChange={handleChange} />
            </div>
          </div>

          <div className="chp-form-row">
            <div className="chp-form-group">
              <label>Icon / Ảnh đại diện</label>
              <div className="chp-avatar-upload-wrap">
                <div className="chp-icon-grid">
                  {Object.keys(GROUP_ICONS_MAP).map(icKey => (
                    <button type="button" key={icKey} className={`chp-icon-btn ${formData.icon === icKey ? 'active' : ''}`} onClick={() => setFormData(prev => ({ ...prev, icon: icKey }))}>{GROUP_ICONS_MAP[icKey]}</button>
                  ))}
                </div>
                <div className="chp-avatar-uploader">
                  <input type="file" id="chp-avatar-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleGroupImageUpload(e, 'avatar_image')} disabled={uploading} />
                  <label htmlFor="chp-avatar-upload" className="chp-avatar-preview">
                    {formData.avatar_image ? <img src={formData.avatar_image.startsWith('http') ? formData.avatar_image : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${formData.avatar_image}`} alt="Avatar" /> : <div className="chp-avatar-placeholder">{GROUP_ICONS_MAP[formData.icon] || <FaUsers />}</div>}
                  </label>
                  <small>{uploading ? 'Đang tải...' : 'Tải lên Avatar'}</small>
                </div>
              </div>
            </div>
            <div className="chp-form-group">
              <label>Ảnh bìa nhóm (Cover)</label>
              <input type="file" id="chp-cover-upload" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleGroupImageUpload(e, 'cover_image')} disabled={uploading} />
              <label htmlFor="chp-cover-upload" className="chp-cover-preview" style={formData.cover_image ? { backgroundImage: `url(${formData.cover_image.startsWith('http') ? formData.cover_image : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${formData.cover_image}`})` } : {}}>
                {!formData.cover_image && <div className="chp-cover-placeholder"><FaImage size={24} /><span>{uploading ? 'Đang tải...' : 'Bấm để chọn ảnh bìa'}</span></div>}
              </label>
            </div>
          </div>

          <div className="chp-form-row">
            <div className="chp-form-group">
              <label>Lọc bác sĩ theo chuyên khoa</label>
              <select name="specialty_id" value={formData.specialty_id} onChange={handleChange}>
                <option value="">-- Chọn chuyên khoa (Không bắt buộc) --</option>
                {specialties.map(spec => <option key={spec.id} value={spec.id}>{spec.name}</option>)}
              </select>
            </div>
            <div className="chp-form-group">
              <label>Bác sĩ phụ trách</label>
              <select name="doctor_id" value={formData.doctor_id} onChange={handleChange}>
                <option value="">-- Không có bác sĩ (Nhóm cộng đồng) --</option>
                {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.user?.full_name} ({doc.title || 'Bác sĩ'})</option>)}
              </select>
              <small>Có thể bỏ trống. Bác sĩ sẽ tự động trở thành Quản lý.</small>
            </div>
          </div>

          <div className="chp-form-row">
            <div className="chp-form-group">
              <label>Quyền Riêng Tư</label>
              <select name="privacy" value={formData.privacy} onChange={handleChange}>
                <option value="public">Công khai — Ai cũng tham gia được</option><option value="private">Riêng tư — Cần phê duyệt</option><option value="invite_only">Chỉ qua lời mời</option>
              </select>
            </div>
            <div className="chp-form-group" style={{ justifyContent: 'center' }}>
              <label className="chp-form-checkbox"><input type="checkbox" name="requires_post_approval" checked={formData.requires_post_approval} onChange={handleChange} /><FaCheckSquare /> Duyệt bài đăng trước khi hiển thị</label>
            </div>
          </div>

          <div className="chp-modal-actions">
            <button type="button" className="chp-btn-secondary" onClick={onClose} disabled={loading || uploading}><FaTimes /> Hủy</button>
            <button type="submit" className="chp-btn-primary" disabled={loading || uploading}>{loading ? <><FaSpinner /> Đang tạo...</> : <><FaCheckCircle /> Tạo Nhóm</>}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunityHomePage;
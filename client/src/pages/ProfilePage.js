import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaUser, FaPhone, FaMapMarkerAlt, FaVenusMars, FaCalendar, 
  FaCheckCircle, FaTimesCircle, FaLock, FaArrowLeft, FaEdit, FaKey,
  FaBriefcase, FaFileAlt, FaIdCard, FaCamera, FaTrash, 
  FaGraduationCap, FaCertificate, FaAward, FaFlask, FaPlus, FaLink, FaSave, FaTimes
} from 'react-icons/fa';
import './ProfilePage.css';

const ProfilePage = () => {
  // ==================== STATE MANAGEMENT ====================
  const [user, setUser] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  
  // Form thông tin cơ bản
  const [formData, setFormData] = useState({
    full_name: '', phone: '', address: '', gender: '', dob: ''
  });
  
  // Form thông tin bác sĩ - Bổ sung 'workplace'
  const [doctorFormData, setDoctorFormData] = useState({
    specialty_id: '', experience_years: '', bio: '', title: '', position: '', workplace: '',
    education: [], certifications: [], work_experience: [], research: [], achievements: []
  });
  // Staff-specific fields
  const [staffJobDescription, setStaffJobDescription] = useState('');

  // States hiển thị form con
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [showWorkExpForm, setShowWorkExpForm] = useState(false);
  const [showResearchForm, setShowResearchForm] = useState(false);
  const [showAchievementForm, setShowAchievementForm] = useState(false);

  // States Edit Mode (Lưu index của item đang sửa, -1 là thêm mới)
  const [editEduIndex, setEditEduIndex] = useState(-1);
  const [editCertIndex, setEditCertIndex] = useState(-1);
  const [editWorkIndex, setEditWorkIndex] = useState(-1);
  const [editResIndex, setEditResIndex] = useState(-1);
  const [editAchIndex, setEditAchIndex] = useState(-1);

  // States dữ liệu form con
  const [educationForm, setEducationForm] = useState({ degree: '', institution: '', year: '', description: '' });
  const [certificationForm, setCertificationForm] = useState({ name: '', link: '' });
  const [workExpForm, setWorkExpForm] = useState({ position: '', hospital: '', department: '', period: '', description: '' });
  const [researchForm, setResearchForm] = useState({ title: '', authors: '', journal: '', year: '', link: '' });
  const [achievementForm, setAchievementForm] = useState({ title: '', link: '' });

  // State đổi mật khẩu, avatar, loading...
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchSpecialties();
  }, [navigate]);

  const fetchSpecialties = async () => {
    try {
      const res = await api.get('/specialties');
      if (res.data.success) setSpecialties(res.data.specialties);
    } catch (error) { console.error('Error fetching specialties:', error); }
  };

  const fetchProfile = async () => {
    try {
      const profileRes = await api.get('/users/profile');
      const userData = profileRes.data.user || profileRes.data;
      setUser(userData);
      if (userData.avatar_url) setAvatarPreview(userData.avatar_url);
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        address: userData.address || '',
        gender: userData.gender || '',
        dob: userData.dob ? userData.dob.split('T')[0] : ''
      });
      await fetchRoleInfo();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const fetchRoleInfo = async () => {
    try {
      const res = await api.get('/users/profile/role-info');
      if (res.data.success && res.data.user.roleData) {
        const roleData = res.data.user.roleData;
        const roleInfoData = res.data.user.role_info || roleData;
        setRoleInfo(roleInfoData);
        if (res.data.user.role === 'staff') {
          setStaffJobDescription(roleInfoData.job_description || roleData.job_description || '');
        }
        if (res.data.user.role === 'doctor') {
          setDoctorFormData({
            specialty_id: roleData.specialty_id || '',
            experience_years: roleData.experience_years || '',
            bio: roleData.bio || '',
            title: roleData.title || '',
            position: roleData.position || '',
            workplace: roleData.workplace || '', // Đảm bảo lấy workplace
            education: Array.isArray(roleData.education) ? roleData.education : [],
            certifications: Array.isArray(roleData.certifications) ? roleData.certifications : [],
            work_experience: Array.isArray(roleData.work_experience) ? roleData.work_experience : [],
            research: Array.isArray(roleData.research) ? roleData.research : [],
            achievements: Array.isArray(roleData.achievements) ? roleData.achievements : []
          });
        }
      }
    } catch (error) { console.error('Error fetching role info:', error); }
  };

  // ==================== GENERAL HANDLERS ====================
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleDoctorChange = (e) => setDoctorFormData({ ...doctorFormData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = { ...formData, dob: formData.dob || null, gender: formData.gender || null };
    try {
      const res = await api.put('/users/profile', dataToSend);
      if (res.data.success) { toast.success('Cập nhật thông tin thành công!'); await fetchProfile(); }
    } catch (error) { toast.error(error.response?.data?.message || 'Cập nhật thất bại!'); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('Mật khẩu mới không khớp!');
    if (passwordData.newPassword.length < 6) return toast.error('Mật khẩu quá ngắn!');
    try {
      const res = await api.put('/users/change-password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      if (res.data.success) { toast.success('Đổi mật khẩu thành công!'); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    } catch (error) { toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại!'); }
  };

  const handleDoctorInfoSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/users/profile', doctorFormData);
      if (res.data.success) { toast.success('Cập nhật thông tin chuyên môn thành công!'); await fetchRoleInfo(); }
    } catch (error) { toast.error(error.response?.data?.message || 'Cập nhật thất bại!'); }
  };

  const handleStaffInfoSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/users/profile', { job_description: staffJobDescription });
      if (res.data.success) {
        toast.success('Cập nhật mô tả công việc thành công!');
        await fetchRoleInfo();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại!');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error('Kích thước ảnh < 5MB!');
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const uploadAvatar = async () => {
    if (!avatarFile) return toast.error('Vui lòng chọn ảnh!');
    const formData = new FormData(); formData.append('image', avatarFile);
    setUploadingAvatar(true);
    try {
      const uploadRes = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (uploadRes.data.success) {
        await api.put('/users/profile', { avatar_url: uploadRes.data.url });
        toast.success('Cập nhật ảnh thành công!'); setAvatarFile(null); await fetchProfile();
      }
    } catch (error) { toast.error('Lỗi upload ảnh!'); } finally { setUploadingAvatar(false); }
  };
  const removeAvatar = async () => {
    if (!window.confirm('Xóa ảnh đại diện?')) return;
    try { await api.put('/users/profile', { avatar_url: null }); toast.success('Đã xóa ảnh!'); setAvatarPreview(null); setAvatarFile(null); await fetchProfile(); } 
    catch (error) { toast.error('Lỗi xóa ảnh!'); }
  };

  // ==================== ARRAY HANDLERS ====================
  
  const saveEducation = () => {
    if (!educationForm.degree || !educationForm.institution) return toast.error('Nhập đủ Bằng cấp & Trường!');
    let newArr = [...doctorFormData.education];
    if (editEduIndex >= 0) newArr[editEduIndex] = educationForm;
    else newArr.push(educationForm);
    setDoctorFormData({ ...doctorFormData, education: newArr });
    setEducationForm({ degree: '', institution: '', year: '', description: '' });
    setShowEducationForm(false); setEditEduIndex(-1);
  };
  const editEducation = (index) => { setEducationForm(doctorFormData.education[index]); setEditEduIndex(index); setShowEducationForm(true); };
  const deleteEducation = (index) => setDoctorFormData({ ...doctorFormData, education: doctorFormData.education.filter((_, i) => i !== index) });

  const saveCertification = () => {
    if (!certificationForm.name) return toast.error('Nhập tên chứng chỉ!');
    let newArr = [...doctorFormData.certifications];
    if (editCertIndex >= 0) newArr[editCertIndex] = certificationForm;
    else newArr.push(certificationForm);
    setDoctorFormData({ ...doctorFormData, certifications: newArr });
    setCertificationForm({ name: '', link: '' });
    setShowCertificationForm(false); setEditCertIndex(-1);
  };
  const editCertification = (index) => { setCertificationForm(doctorFormData.certifications[index]); setEditCertIndex(index); setShowCertificationForm(true); };
  const deleteCertification = (index) => setDoctorFormData({ ...doctorFormData, certifications: doctorFormData.certifications.filter((_, i) => i !== index) });

  const saveWorkExp = () => {
    if (!workExpForm.position) return toast.error('Nhập vị trí!');
    let newArr = [...doctorFormData.work_experience];
    if (editWorkIndex >= 0) newArr[editWorkIndex] = workExpForm;
    else newArr.push(workExpForm);
    setDoctorFormData({ ...doctorFormData, work_experience: newArr });
    setWorkExpForm({ position: '', hospital: '', department: '', period: '', description: '' });
    setShowWorkExpForm(false); setEditWorkIndex(-1);
  };
  const editWorkExp = (index) => { setWorkExpForm(doctorFormData.work_experience[index]); setEditWorkIndex(index); setShowWorkExpForm(true); };
  const deleteWorkExp = (index) => setDoctorFormData({ ...doctorFormData, work_experience: doctorFormData.work_experience.filter((_, i) => i !== index) });

  const saveResearch = () => {
    if (!researchForm.title) return toast.error('Nhập tiêu đề!');
    let newArr = [...doctorFormData.research];
    if (editResIndex >= 0) newArr[editResIndex] = researchForm;
    else newArr.push(researchForm);
    setDoctorFormData({ ...doctorFormData, research: newArr });
    setResearchForm({ title: '', authors: '', journal: '', year: '', link: '' });
    setShowResearchForm(false); setEditResIndex(-1);
  };
  const editResearch = (index) => { setResearchForm(doctorFormData.research[index]); setEditResIndex(index); setShowResearchForm(true); };
  const deleteResearch = (index) => setDoctorFormData({ ...doctorFormData, research: doctorFormData.research.filter((_, i) => i !== index) });

  const saveAchievement = () => {
    if (!achievementForm.title) return toast.error('Nhập tên thành tích!');
    let newArr = [...doctorFormData.achievements];
    if (editAchIndex >= 0) newArr[editAchIndex] = achievementForm;
    else newArr.push(achievementForm);
    setDoctorFormData({ ...doctorFormData, achievements: newArr });
    setAchievementForm({ title: '', link: '' });
    setShowAchievementForm(false); setEditAchIndex(-1);
  };
  const editAchievement = (index) => { setAchievementForm(doctorFormData.achievements[index]); setEditAchIndex(index); setShowAchievementForm(true); };
  const deleteAchievement = (index) => setDoctorFormData({ ...doctorFormData, achievements: doctorFormData.achievements.filter((_, i) => i !== index) });


  if (loading) return <div className="profile-page-loading"><div className="profile-page-spinner"></div><p>Đang tải...</p></div>;
  if (!user) return null;

  return (
    <div className="profile-page-container">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="profile-page-header">
        <button onClick={() => navigate(-1)} className="profile-page-btn-back"><FaArrowLeft /> Quay lại</button>
        <h1 className="profile-page-title"><FaUser /> Thông tin cá nhân</h1>
      </div>

      <div className="profile-page-content">
        {/* AVATAR */}
        <div className="profile-page-avatar-card">
          <div className="profile-page-avatar-wrapper">
            <div className="profile-page-avatar">
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : <FaUser className="profile-page-avatar-placeholder" size={60} />}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
            {!avatarFile ? (
              <button onClick={() => fileInputRef.current.click()} className="profile-page-btn-change-avatar"><FaCamera /> Chọn ảnh</button>
            ) : (
              <button onClick={uploadAvatar} disabled={uploadingAvatar} className="profile-page-btn-upload"><FaCheckCircle /> {uploadingAvatar ? 'Lưu...' : 'Lưu ảnh'}</button>
            )}
            {user.avatar_url && !avatarFile && <button onClick={removeAvatar} className="profile-page-btn-remove-avatar"><FaTrash /> Xóa ảnh</button>}
          </div>
          <div className="profile-page-user-basic">
            {user.is_verified ? <p className="profile-page-verified"><FaCheckCircle /> Đã xác thực</p> : <p className="profile-page-not-verified"><FaTimesCircle /> Chưa xác thực</p>}
            <div className={`profile-page-role-badge profile-page-role-${user.role}`}>{roleInfo?.role_name || roleInfo?.code || user.role.toUpperCase()}</div>
            {user.role === 'staff' && (
              <div style={{ marginTop: 12, width: '100%', display: 'grid', gap: 8 }}>
                <div className="profile-page-role-chip" style={{ background: '#eef7ff', color: '#0b5cab' }}>
                  Phòng ban: {roleInfo?.department || 'Chưa có'}
                </div>
                <div className="profile-page-role-chip" style={{ background: '#f6f1ff', color: '#6b21a8' }}>
                  Vai trò: {roleInfo?.role_name || roleInfo?.job_description || roleInfo?.code || 'Chưa có'}
                </div>
                <div className="profile-page-role-chip" style={{ background: '#f4f7f6', color: '#276749' }}>
                  Cấp bậc: {roleInfo?.rank === 'manager' ? 'Trưởng phòng' : 'Nhân viên'}
                </div>
              </div>
            )}
            <h2>{user.full_name || user.username}</h2>
            <span className="profile-page-user-email">{user.email}</span>
            
            {user.role === 'patient' && (
              <button 
                className="profile-page-btn-view-medical-avatar" 
                onClick={() => navigate('/ho-so-y-te?tab=health-profile')}
              >
                <FaFileAlt /> Xem hồ sơ y tế
              </button>
            )}
          </div>
        </div>

        {/* MAIN INFO */}
        <div className="profile-page-main-content">
          <div className="profile-page-main-forms">
            {/* BASIC INFO */}
            <div className="profile-page-form-card">
              <div className="profile-page-card-header"><h2><FaEdit /> Thông tin chung</h2></div>
              <form onSubmit={handleBasicInfoSubmit} className="profile-page-form">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">Họ và tên</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="profile-page-form-input" />
                </div>
                <div className="profile-page-form-row">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">Số điện thoại</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="profile-page-form-input" />
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">Giới tính</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="profile-page-form-select">
                      <option value="">-- Chọn --</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option>
                    </select>
                  </div>
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">Ngày sinh</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="profile-page-form-input" />
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">Địa chỉ</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} className="profile-page-form-textarea" rows="3"/>
                </div>
                <button type="submit" className="profile-page-btn-submit"><FaCheckCircle /> Cập nhật</button>
              </form>
            </div>

            {/* PASSWORD */}
            <div className="profile-page-form-card">
              <div className="profile-page-card-header profile-page-card-header-password"><h2><FaLock /> Bảo mật</h2></div>
              <form onSubmit={handlePasswordSubmit} className="profile-page-form">
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">Mật khẩu hiện tại</label>
                  <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="profile-page-form-input" required />
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">Mật khẩu mới</label>
                  <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="profile-page-form-input" required />
                </div>
                <div className="profile-page-form-group">
                  <label className="profile-page-form-label">Xác nhận mật khẩu</label>
                  <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="profile-page-form-input" required />
                </div>
                <button type="submit" className="profile-page-btn-submit"><FaCheckCircle /> Đổi mật khẩu</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* DOCTOR INFO */}
      {user.role === 'doctor' && roleInfo && (
        <div className="profile-page-doctor-container">
          <div className="profile-page-form-card">
            <div className="profile-page-card-header profile-page-card-header-doctor">
              <h2><FaIdCard /> Hồ sơ chuyên môn</h2>
            </div>
            
            <form onSubmit={handleDoctorInfoSubmit} className="profile-page-form">
              
              {/* 1. BASIC DOCTOR INFO */}
              <div className="profile-page-doctor-section">
                <h3 className="profile-page-section-title"><FaIdCard /> Thông tin cơ bản</h3>
                <div className="profile-page-grid">
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">Học hàm/Học vị</label>
                    <input type="text" name="title" value={doctorFormData.title} onChange={handleDoctorChange} placeholder="VD: Thạc sĩ, Bác sĩ" className="profile-page-form-input" />
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">Chức vụ</label>
                    <input type="text" name="position" value={doctorFormData.position} onChange={handleDoctorChange} placeholder="VD: Trưởng khoa" className="profile-page-form-input" />
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">Nơi công tác</label>
                    <input type="text" name="workplace" value={doctorFormData.workplace} onChange={handleDoctorChange} placeholder="VD: Bệnh viện Chợ Rẫy" className="profile-page-form-input" />
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">Chuyên khoa</label>
                    <select name="specialty_id" value={doctorFormData.specialty_id} onChange={handleDoctorChange} className="profile-page-form-select">
                      <option value="">-- Chọn --</option>
                      {specialties.map(spec => <option key={spec.id} value={spec.id}>{spec.name}</option>)}
                    </select>
                  </div>
                  <div className="profile-page-form-group">
                    <label className="profile-page-form-label">Kinh nghiệm (năm)</label>
                    <input type="number" name="experience_years" value={doctorFormData.experience_years} onChange={handleDoctorChange} className="profile-page-form-input" />
                  </div>
                  <div className="profile-page-form-group profile-page-col-full">
                    <label className="profile-page-form-label">Giới thiệu bản thân</label>
                    <textarea name="bio" value={doctorFormData.bio} onChange={handleDoctorChange} rows="2" className="profile-page-form-textarea" />
                  </div>
                </div>
              </div>

              {/* 2. EDUCATION */}
              <div className="profile-page-doctor-section">
                <div className="profile-page-section-header-row">
                  <h3 className="profile-page-section-title"><FaGraduationCap /> Học vấn</h3>
                  {!showEducationForm && <button type="button" onClick={() => {setShowEducationForm(true); setEditEduIndex(-1); setEducationForm({degree:'', institution:'', year:'', description:''})}} className="profile-page-btn-add-mini"><FaPlus /> Thêm</button>}
                </div>
                
                <div className="profile-page-items-grid">
                  {doctorFormData.education.map((edu, index) => (
                    <div key={index} className="profile-page-item-card">
                      <div className="profile-page-item-content">
                        <strong>{edu.degree}</strong>
                        <span>{edu.institution}</span>
                        <small>{edu.year}</small>
                      </div>
                      <div className="profile-page-item-actions">
                        <button type="button" onClick={() => editEducation(index)} className="profile-page-btn-icon-edit"><FaEdit /></button>
                        <button type="button" onClick={() => deleteEducation(index)} className="profile-page-btn-icon-delete"><FaTimes /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {showEducationForm && (
                  <div className="profile-page-add-form">
                    <div className="profile-page-grid">
                      <input type="text" value={educationForm.degree} onChange={(e) => setEducationForm({...educationForm, degree: e.target.value})} placeholder="Bằng cấp (VD: BS Đa khoa)" className="profile-page-form-input" />
                      <input type="text" value={educationForm.institution} onChange={(e) => setEducationForm({...educationForm, institution: e.target.value})} placeholder="Trường đào tạo" className="profile-page-form-input" />
                      <input type="text" value={educationForm.year} onChange={(e) => setEducationForm({...educationForm, year: e.target.value})} placeholder="Năm tốt nghiệp" className="profile-page-form-input" />
                      <input type="text" value={educationForm.description} onChange={(e) => setEducationForm({...educationForm, description: e.target.value})} placeholder="Mô tả thêm (tùy chọn)" className="profile-page-form-input profile-page-col-full" />
                    </div>
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={saveEducation} className="profile-page-btn-save-mini"><FaSave /> {editEduIndex >= 0 ? 'Cập nhật' : 'Lưu'}</button>
                      <button type="button" onClick={() => setShowEducationForm(false)} className="profile-page-btn-cancel-mini">Hủy</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. WORK EXPERIENCE */}
              <div className="profile-page-doctor-section">
                <div className="profile-page-section-header-row">
                  <h3 className="profile-page-section-title"><FaBriefcase /> Kinh nghiệm làm việc</h3>
                  {!showWorkExpForm && <button type="button" onClick={() => {setShowWorkExpForm(true); setEditWorkIndex(-1); setWorkExpForm({position:'', hospital:'', department:'', period:'', description:''})}} className="profile-page-btn-add-mini"><FaPlus /> Thêm</button>}
                </div>
                
                <div className="profile-page-items-grid">
                  {doctorFormData.work_experience.map((work, index) => (
                    <div key={index} className="profile-page-item-card">
                      <div className="profile-page-item-content">
                        <strong>{work.position}</strong>
                        <span>{work.hospital} - {work.department}</span>
                        <small>{work.period}</small>
                      </div>
                      <div className="profile-page-item-actions">
                        <button type="button" onClick={() => editWorkExp(index)} className="profile-page-btn-icon-edit"><FaEdit /></button>
                        <button type="button" onClick={() => deleteWorkExp(index)} className="profile-page-btn-icon-delete"><FaTimes /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {showWorkExpForm && (
                  <div className="profile-page-add-form">
                    <div className="profile-page-grid">
                      <input type="text" value={workExpForm.position} onChange={(e) => setWorkExpForm({...workExpForm, position: e.target.value})} placeholder="Vị trí (VD: BS điều trị)" className="profile-page-form-input" />
                      <input type="text" value={workExpForm.hospital} onChange={(e) => setWorkExpForm({...workExpForm, hospital: e.target.value})} placeholder="Nơi làm việc" className="profile-page-form-input" />
                      <input type="text" value={workExpForm.department} onChange={(e) => setWorkExpForm({...workExpForm, department: e.target.value})} placeholder="Khoa/Phòng" className="profile-page-form-input" />
                      <input type="text" value={workExpForm.period} onChange={(e) => setWorkExpForm({...workExpForm, period: e.target.value})} placeholder="Thời gian (VD: 2015-2020)" className="profile-page-form-input" />
                      <input type="text" value={workExpForm.description} onChange={(e) => setWorkExpForm({...workExpForm, description: e.target.value})} placeholder="Mô tả công việc" className="profile-page-form-input profile-page-col-full" />
                    </div>
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={saveWorkExp} className="profile-page-btn-save-mini"><FaSave /> {editWorkIndex >= 0 ? 'Cập nhật' : 'Lưu'}</button>
                      <button type="button" onClick={() => setShowWorkExpForm(false)} className="profile-page-btn-cancel-mini">Hủy</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. CERTIFICATIONS */}
              <div className="profile-page-doctor-section">
                <div className="profile-page-section-header-row">
                  <h3 className="profile-page-section-title"><FaCertificate /> Chứng chỉ</h3>
                  {!showCertificationForm && <button type="button" onClick={() => {setShowCertificationForm(true); setEditCertIndex(-1); setCertificationForm({name:'', link:''})}} className="profile-page-btn-add-mini"><FaPlus /> Thêm</button>}
                </div>

                <div className="profile-page-items-grid">
                  {doctorFormData.certifications.map((cert, index) => (
                    <div key={index} className="profile-page-item-card">
                      <div className="profile-page-item-content">
                        <strong>{cert.name}</strong>
                        {cert.link && <a href={cert.link} target="_blank" rel="noreferrer" className="profile-page-text-link">Xem link</a>}
                      </div>
                      <div className="profile-page-item-actions">
                        <button type="button" onClick={() => editCertification(index)} className="profile-page-btn-icon-edit"><FaEdit /></button>
                        <button type="button" onClick={() => deleteCertification(index)} className="profile-page-btn-icon-delete"><FaTimes /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {showCertificationForm && (
                  <div className="profile-page-add-form">
                    <div className="profile-page-grid">
                      <input type="text" value={certificationForm.name} onChange={(e) => setCertificationForm({...certificationForm, name: e.target.value})} placeholder="Tên chứng chỉ" className="profile-page-form-input profile-page-col-full" />
                      <input type="text" value={certificationForm.link} onChange={(e) => setCertificationForm({...certificationForm, link: e.target.value})} placeholder="Link chứng chỉ (Google Drive...)" className="profile-page-form-input profile-page-col-full" />
                    </div>
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={saveCertification} className="profile-page-btn-save-mini"><FaSave /> {editCertIndex >= 0 ? 'Cập nhật' : 'Lưu'}</button>
                      <button type="button" onClick={() => setShowCertificationForm(false)} className="profile-page-btn-cancel-mini">Hủy</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. RESEARCH */}
              <div className="profile-page-doctor-section">
                <div className="profile-page-section-header-row">
                  <h3 className="profile-page-section-title"><FaFlask /> Nghiên cứu</h3>
                  {!showResearchForm && <button type="button" onClick={() => {setShowResearchForm(true); setEditResIndex(-1); setResearchForm({title:'', authors:'', journal:'', year:'', link:''})}} className="profile-page-btn-add-mini"><FaPlus /> Thêm</button>}
                </div>
                <div className="profile-page-items-grid">
                  {doctorFormData.research.map((res, index) => (
                    <div key={index} className="profile-page-item-card">
                      <div className="profile-page-item-content">
                        <strong>{res.title}</strong>
                        <span>{res.journal} ({res.year})</span>
                      </div>
                      <div className="profile-page-item-actions">
                        <button type="button" onClick={() => editResearch(index)} className="profile-page-btn-icon-edit"><FaEdit /></button>
                        <button type="button" onClick={() => deleteResearch(index)} className="profile-page-btn-icon-delete"><FaTimes /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {showResearchForm && (
                  <div className="profile-page-add-form">
                    <div className="profile-page-grid">
                      <input type="text" value={researchForm.title} onChange={(e) => setResearchForm({...researchForm, title: e.target.value})} placeholder="Tiêu đề bài báo" className="profile-page-form-input profile-page-col-full" />
                      <input type="text" value={researchForm.authors} onChange={(e) => setResearchForm({...researchForm, authors: e.target.value})} placeholder="Tác giả" className="profile-page-form-input" />
                      <input type="text" value={researchForm.journal} onChange={(e) => setResearchForm({...researchForm, journal: e.target.value})} placeholder="Tạp chí" className="profile-page-form-input" />
                      <input type="text" value={researchForm.year} onChange={(e) => setResearchForm({...researchForm, year: e.target.value})} placeholder="Năm" className="profile-page-form-input" />
                      <input type="text" value={researchForm.link} onChange={(e) => setResearchForm({...researchForm, link: e.target.value})} placeholder="Link bài báo" className="profile-page-form-input profile-page-col-full" />
                    </div>
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={saveResearch} className="profile-page-btn-save-mini"><FaSave /> {editResIndex >= 0 ? 'Cập nhật' : 'Lưu'}</button>
                      <button type="button" onClick={() => setShowResearchForm(false)} className="profile-page-btn-cancel-mini">Hủy</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. ACHIEVEMENTS */}
              <div className="profile-page-doctor-section">
                <div className="profile-page-section-header-row">
                  <h3 className="profile-page-section-title"><FaAward /> Thành tích</h3>
                  {!showAchievementForm && <button type="button" onClick={() => {setShowAchievementForm(true); setEditAchIndex(-1); setAchievementForm({title:'', link:''})}} className="profile-page-btn-add-mini"><FaPlus /> Thêm</button>}
                </div>
                <div className="profile-page-items-grid">
                  {doctorFormData.achievements.map((ach, index) => (
                    <div key={index} className="profile-page-item-card">
                      <div className="profile-page-item-content">
                        <strong>{ach.title}</strong>
                        {ach.link && <a href={ach.link} target="_blank" rel="noreferrer" className="profile-page-text-link">Link</a>}
                      </div>
                      <div className="profile-page-item-actions">
                        <button type="button" onClick={() => editAchievement(index)} className="profile-page-btn-icon-edit"><FaEdit /></button>
                        <button type="button" onClick={() => deleteAchievement(index)} className="profile-page-btn-icon-delete"><FaTimes /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {showAchievementForm && (
                  <div className="profile-page-add-form">
                    <div className="profile-page-grid">
                      <input type="text" value={achievementForm.title} onChange={(e) => setAchievementForm({...achievementForm, title: e.target.value})} placeholder="Tên giải thưởng/thành tích" className="profile-page-form-input profile-page-col-full" />
                      <input type="text" value={achievementForm.link} onChange={(e) => setAchievementForm({...achievementForm, link: e.target.value})} placeholder="Link chứng minh (nếu có)" className="profile-page-form-input profile-page-col-full" />
                    </div>
                    <div className="profile-page-form-actions">
                      <button type="button" onClick={saveAchievement} className="profile-page-btn-save-mini"><FaSave /> {editAchIndex >= 0 ? 'Cập nhật' : 'Lưu'}</button>
                      <button type="button" onClick={() => setShowAchievementForm(false)} className="profile-page-btn-cancel-mini">Hủy</button>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="profile-page-btn-submit profile-page-btn-doctor" style={{marginTop: '1.5rem'}}><FaCheckCircle /> Cập nhật toàn bộ hồ sơ</button>
            </form>
          </div>
        </div>
      )}

      {/* STAFF INFO */}
      {user.role === 'staff' && (
        <div className="profile-page-doctor-container">
          <div className="profile-page-form-card">
            <div className="profile-page-card-header profile-page-card-header-staff">
              <h2><FaBriefcase /> Hồ sơ công việc</h2>
            </div>

            <form onSubmit={handleStaffInfoSubmit} className="profile-page-form" style={{padding: '16px'}}>
              <div className="profile-page-form-group profile-page-col-full">
                <label className="profile-page-form-label">Mô tả công việc</label>
                <textarea name="job_description" value={staffJobDescription} onChange={(e) => setStaffJobDescription(e.target.value)} rows={5} className="profile-page-form-textarea" />
              </div>
              <button type="submit" className="profile-page-btn-submit"><FaCheckCircle /> Cập nhật mô tả công việc</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
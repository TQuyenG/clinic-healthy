import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FaClock, FaEdit, FaEye, FaFileImage, FaFilter, FaImage, FaLink, FaSave, FaSearch, FaTimes, FaUpload, FaUserMd, FaUserCircle, FaSync } from 'react-icons/fa';
import api from '../services/api';
import userService from '../services/userService';
import usePermissions from '../hooks/usePermissions';
import './DoctorManagementPage.css';

const EMPTY_FORM = {
  full_name: '',
  phone: '',
  gender: '',
  dob: '',
  avatar_url: '',
  specialty_id: '',
  experience_years: '',
  bio: '',
  title: '',
  position: '',
  workplace: '',
  work_status: 'active'
};

const getImageSrc = (value) => {
  if (!value) return 'https://via.placeholder.com/300?text=Doctor';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  return `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}${value.startsWith('/') ? value : `/${value}`}`;
};

const statusLabel = {
  active: 'Đang làm việc',
  on_leave: 'Đang nghỉ',
  inactive: 'Ngừng hoạt động'
};

const DoctorManagementPage = () => {
  const { hasPermission } = usePermissions();
  const canEditDoctors = hasPermission('doctors', 'edit');

  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: '', specialty_id: '', min_experience: '', status: '', sort: 'name' });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalItems: 0, totalPages: 0 });
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [avatarUploadMode, setAvatarUploadMode] = useState('file');
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef(null);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [pagination.page, pagination.limit, filters]);

  const fetchSpecialties = async () => {
    try {
      const response = await api.get('/specialties');
      if (response.data.success) {
        setSpecialties(response.data.specialties || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách chuyên khoa:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        specialty_id: filters.specialty_id,
        min_experience: filters.min_experience
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await userService.getAllDoctorsPublic(params);
      if (response.data.success) {
        setDoctors(response.data.doctors || []);
        setPagination((prev) => ({
          ...prev,
          totalItems: response.data.pagination?.totalItems || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      }
    } catch (error) {
      console.error('Lỗi tải danh sách bác sĩ:', error);
      toast.error('Không thể tải danh sách bác sĩ');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const total = pagination.totalItems || doctors.length;
    const activeCount = doctors.filter((doctor) => doctor.work_status === 'active').length;
    return { total, activeCount };
  }, [doctors, pagination.totalItems]);

  const resetFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters({ search: '', specialty_id: '', min_experience: '' });
  };

  const openDetail = async (doctor) => {
    try {
      const response = await userService.getUserById(doctor.id);
      if (response.data.success) {
        setSelectedDoctor(response.data.user);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết bác sĩ:', error);
      toast.error('Không thể tải chi tiết bác sĩ');
    }
  };

  const openEdit = (doctor) => {
    setEditingDoctor(doctor);
    const initialAvatar = doctor.avatar_url || '';
    setAvatarUploadMode(/^https?:\/\//i.test(initialAvatar) ? 'url' : 'file');
    setTempAvatarUrl(initialAvatar);
    setFormData({
      full_name: doctor.full_name || '',
      phone: doctor.phone || '',
      gender: doctor.gender || '',
      dob: doctor.dob || '',
      avatar_url: doctor.avatar_url || '',
      specialty_id: doctor.specialty_id || '',
      experience_years: doctor.experience_years || '',
      bio: doctor.bio || '',
      title: doctor.title || '',
      position: doctor.position || '',
      workplace: doctor.workplace || '',
      work_status: doctor.work_status || 'active'
    });
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingDoctor(null);
    setFormData(EMPTY_FORM);
    setTempAvatarUrl('');
    setAvatarUploadMode('file');
    setUploadingAvatar(false);
  };

  const handleAvatarFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ');
      return;
    }

    try {
      setUploadingAvatar(true);
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      const response = await api.post('/upload/image', formDataUpload, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        const uploadedUrl = response.data.url || response.data.imageUrl;
        setFormData(prev => ({ ...prev, avatar_url: uploadedUrl }));
        setTempAvatarUrl(uploadedUrl);
        toast.success('Upload ảnh thành công');
      } else {
        toast.error('Không thể upload ảnh');
      }
    } catch (error) {
      console.error('Lỗi upload ảnh bác sĩ:', error);
      toast.error('Không thể upload ảnh');
    } finally {
      setUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleAvatarUrlSubmit = () => {
    const nextUrl = tempAvatarUrl.trim();
    if (!nextUrl) {
      toast.error('Vui lòng nhập URL ảnh');
      return;
    }
    try {
      new URL(nextUrl);
      setFormData(prev => ({ ...prev, avatar_url: nextUrl }));
      toast.success('Đã thêm ảnh từ URL');
    } catch (error) {
      toast.error('URL ảnh không hợp lệ');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingDoctor) return;

    try {
      setSaving(true);
      const response = await userService.updateDoctorPublicProfile(editingDoctor.id, formData);
      if (response.data.success) {
        toast.success('Đã cập nhật hồ sơ bác sĩ');
        closeEdit();
        await fetchDoctors();
      }
    } catch (error) {
      console.error('Lỗi cập nhật hồ sơ bác sĩ:', error);
      toast.error(error?.response?.data?.message || 'Không thể cập nhật hồ sơ bác sĩ');
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (nextPage) => {
    setPagination((prev) => ({ ...prev, page: nextPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSpecialty = (doctor) => {
    const specialtyName = doctor.specialty_name || 'Chưa phân chuyên khoa';
    if (!doctor.specialty_slug) return <span>{specialtyName}</span>;
    return (
      <a href={`/chuyen-khoa/${doctor.specialty_slug}`} onClick={(event) => event.preventDefault()}>
        {specialtyName}
      </a>
    );
  };

  return (
    <div className="doctor-management-page">
      <div className="doctor-management-page__header">
        <h1 className="doctor-management-page__title"><FaUserMd /> Danh sách bác sĩ</h1>
        <div className="doctor-management-page__header-actions">
          <button className="doctor-management-page__button doctor-management-page__button-secondary" onClick={() => { setPagination((prev) => ({ ...prev, page: 1 })); fetchDoctors(); }} title="Làm mới">
            <FaSync /> Làm mới
          </button>
        </div>
      </div>

      <div className="doctor-management-page__summary-grid">
        <div className="doctor-management-page__summary-card">
          <span>Tổng bác sĩ</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="doctor-management-page__summary-card">
          <span>Đang làm việc</span>
          <strong>{summary.activeCount}</strong>
        </div>
      </div>

      <div className="doctor-management-page__toolbar">
        <div className="doctor-management-page__search">
          <FaSearch />
          <input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Tìm theo tên, email hoặc số điện thoại"
          />
        </div>
        <div className="doctor-management-page__filters">
          <div className="doctor-management-page__filter">
            <FaFilter />
            <select
              value={filters.specialty_id}
              onChange={(event) => setFilters((prev) => ({ ...prev, specialty_id: event.target.value, page: 1 }))}
            >
              <option value="">Tất cả chuyên khoa</option>
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
              ))}
            </select>
          </div>
          <div className="doctor-management-page__filter">
            <FaClock />
            <select
              value={filters.min_experience}
              onChange={(event) => setFilters((prev) => ({ ...prev, min_experience: event.target.value, page: 1 }))}
            >
              <option value="">Kinh nghiệm bất kỳ</option>
              <option value="5">Từ 5 năm</option>
              <option value="10">Từ 10 năm</option>
              <option value="20">Từ 20 năm</option>
            </select>
          </div>
          <div className="doctor-management-page__filter">
            <FaFilter />
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang làm việc</option>
              <option value="on_leave">Đang nghỉ</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>
          <div className="doctor-management-page__filter">
            <FaFilter />
            <select
              value={filters.sort}
              onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value, page: 1 }))}
            >
              <option value="name">Tên (A-Z)</option>
              <option value="experience">Kinh nghiệm (cao → thấp)</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>
          <button className="doctor-management-page__reset" onClick={resetFilters}>Xóa lọc</button>
        </div>
      </div>

      <div className="doctor-management-page__table-shell">
        {loading ? (
          <div className="doctor-management-page__state">Đang tải danh sách bác sĩ...</div>
        ) : doctors.length === 0 ? (
          <div className="doctor-management-page__state">
            <FaUserMd />
            <h3>Không tìm thấy bác sĩ</h3>
            <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <table className="doctor-management-page__table">
            <thead>
              <tr>
                <th>Bác sĩ</th>
                <th>Chuyên khoa</th>
                <th>Chức vụ</th>
                <th>Kinh nghiệm</th>
                <th>Nơi công tác</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td>
                    <div className="doctor-management-page__person">
                      <img src={doctor.avatar_url} alt={doctor.full_name} onError={(event) => { event.currentTarget.src = 'https://via.placeholder.com/120?text=Doctor'; }} />
                      <div>
                        <strong>{doctor.title ? `${doctor.title}. ` : ''}{doctor.full_name}</strong>
                        <span>{doctor.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{renderSpecialty(doctor)}</td>
                  <td>{doctor.position || 'Chưa cập nhật'}</td>
                  <td>{doctor.experience_years || 0} năm</td>
                  <td>{doctor.workplace || 'Chưa cập nhật'}</td>
                  <td>
                    <span className={`doctor-management-page__badge doctor-management-page__badge--${doctor.work_status || 'inactive'}`}>
                      {statusLabel[doctor.work_status] || 'Chưa rõ'}
                    </span>
                  </td>
                  <td>
                    <div className="doctor-management-page__actions">
                      <button onClick={() => openDetail(doctor)}><FaEye /> Chi tiết</button>
                      {canEditDoctors && <button onClick={() => openEdit(doctor)}><FaEdit /> Sửa hồ sơ</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="doctor-management-page__pagination">
          <button disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>Trước</button>
          <span>Trang {pagination.page} / {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>Sau</button>
        </div>
      )}

      {showDetailModal && selectedDoctor && (
        <div className="doctor-management-page__modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="doctor-management-page__modal" onClick={(event) => event.stopPropagation()}>
            <div className="doctor-management-page__modal-header">
              <h3>Chi tiết bác sĩ</h3>
              <button onClick={() => setShowDetailModal(false)}><FaTimes /></button>
            </div>
            <div className="doctor-management-page__detail-grid">
              <div><span>Họ tên</span><strong>{selectedDoctor.full_name}</strong></div>
              <div><span>Email</span><strong>{selectedDoctor.email}</strong></div>
              <div><span>Điện thoại</span><strong>{selectedDoctor.phone || 'Chưa cập nhật'}</strong></div>
              <div><span>Ngày sinh</span><strong>{selectedDoctor.dob || 'Chưa cập nhật'}</strong></div>
              <div><span>Chuyên khoa</span><strong>{selectedDoctor.roleData?.specialty?.name || 'Chưa phân chuyên khoa'}</strong></div>
              <div><span>Kinh nghiệm</span><strong>{selectedDoctor.roleData?.experience_years || 0} năm</strong></div>
              <div><span>Chức vụ</span><strong>{selectedDoctor.roleData?.position || 'Chưa cập nhật'}</strong></div>
              <div><span>Nơi công tác</span><strong>{selectedDoctor.roleData?.workplace || 'Chưa cập nhật'}</strong></div>
              <div><span>Trạng thái</span><strong>{statusLabel[selectedDoctor.roleData?.work_status] || 'Chưa rõ'}</strong></div>
              <div><span>Tiểu sử</span><strong>{selectedDoctor.roleData?.bio || 'Chưa cập nhật'}</strong></div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingDoctor && (
        <div className="doctor-management-page__modal-backdrop" onClick={closeEdit}>
          <div className="doctor-management-page__modal doctor-management-page__modal--large" onClick={(event) => event.stopPropagation()}>
            <div className="doctor-management-page__modal-header">
              <h3>Chỉnh sửa hồ sơ bác sĩ</h3>
              <button onClick={closeEdit}><FaTimes /></button>
            </div>
            <form className="doctor-management-page__profile-form" onSubmit={handleSubmit}>
              <div className="doctor-management-page__profile-layout">
                <aside className="doctor-management-page__profile-side">
                  <div className="doctor-management-page__profile-avatar-wrap">
                    <img src={getImageSrc(formData.avatar_url || tempAvatarUrl)} alt={formData.full_name || 'Doctor'} className="doctor-management-page__profile-avatar" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300?text=Doctor'; }} />
                    <div className="doctor-management-page__profile-avatar-meta">
                      <button type="button" className={`doctor-management-page__avatar-mode ${avatarUploadMode === 'file' ? 'active' : ''}`} onClick={() => setAvatarUploadMode('file')}><FaFileImage /> Thiết bị</button>
                      <button type="button" className={`doctor-management-page__avatar-mode ${avatarUploadMode === 'url' ? 'active' : ''}`} onClick={() => setAvatarUploadMode('url')}><FaLink /> URL</button>
                    </div>
                    {avatarUploadMode === 'file' ? (
                      <>
                        <input ref={avatarFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFileUpload} />
                        <button type="button" className="doctor-management-page__avatar-action" onClick={() => avatarFileInputRef.current?.click()} disabled={uploadingAvatar}>
                          <FaUpload /> {uploadingAvatar ? 'Đang upload...' : 'Chọn ảnh từ thiết bị'}
                        </button>
                      </>
                    ) : (
                      <div className="doctor-management-page__avatar-url-box">
                        <input
                          type="url"
                          value={tempAvatarUrl}
                          onChange={(event) => setTempAvatarUrl(event.target.value)}
                          placeholder="https://..."
                        />
                        <button type="button" onClick={handleAvatarUrlSubmit}><FaLink /> Áp dụng URL</button>
                      </div>
                    )}
                  </div>
                </aside>

                <section className="doctor-management-page__profile-main">
                  <div className="doctor-management-page__profile-section">
                    <h4>Thông tin cơ bản</h4>
                    <div className="doctor-management-page__form-grid">
                      <label>
                        Họ tên
                        <input value={formData.full_name} onChange={(event) => setFormData((prev) => ({ ...prev, full_name: event.target.value }))} />
                      </label>
                      <label>
                        Điện thoại
                        <input value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} />
                      </label>
                      <label>
                        Ngày sinh
                        <input type="date" value={formData.dob || ''} onChange={(event) => setFormData((prev) => ({ ...prev, dob: event.target.value }))} />
                      </label>
                      <label>
                        Trạng thái
                        <select value={formData.work_status} onChange={(event) => setFormData((prev) => ({ ...prev, work_status: event.target.value }))}>
                          <option value="active">Đang làm việc</option>
                          <option value="on_leave">Đang nghỉ</option>
                          <option value="inactive">Ngừng hoạt động</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="doctor-management-page__profile-section">
                    <h4>Thông tin chuyên môn</h4>
                    <div className="doctor-management-page__form-grid">
                      <label>
                        Chuyên khoa
                        <select value={formData.specialty_id} onChange={(event) => setFormData((prev) => ({ ...prev, specialty_id: event.target.value }))}>
                          <option value="">Chưa phân chuyên khoa</option>
                          {specialties.map((specialty) => (
                            <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Kinh nghiệm (năm)
                        <input type="number" min="0" value={formData.experience_years} onChange={(event) => setFormData((prev) => ({ ...prev, experience_years: event.target.value }))} />
                      </label>
                      <label>
                        Học hàm / học vị
                        <input value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} />
                      </label>
                      <label>
                        Chức vụ
                        <input value={formData.position} onChange={(event) => setFormData((prev) => ({ ...prev, position: event.target.value }))} />
                      </label>
                      <label className="doctor-management-page__form-grid--full">
                        Nơi công tác
                        <input value={formData.workplace} onChange={(event) => setFormData((prev) => ({ ...prev, workplace: event.target.value }))} />
                      </label>
                      <label className="doctor-management-page__form-grid--full">
                        Tiểu sử
                        <textarea rows="5" value={formData.bio} onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))} />
                      </label>
                    </div>
                  </div>
                </section>
              </div>
              <div className="doctor-management-page__form-actions">
                <button type="button" onClick={closeEdit}>Hủy</button>
                <button type="submit" disabled={saving}><FaSave /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorManagementPage;
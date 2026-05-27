// client/src/pages/ServiceManagementPage.js
import React, { useState, useEffect } from 'react';
import serviceService from '../services/serviceService';
import serviceCategoryService from '../services/serviceCategoryService';
import userService from '../services/userService';
import specialtyService from '../services/specialtyService';
import appointmentService from '../services/appointmentService';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, 
  FaStethoscope, FaList, FaCheckCircle, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaImage, FaPauseCircle, FaBan, FaCalendarAlt, FaSpinner
} from 'react-icons/fa';
import './ServiceManagementPage.css';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import ServiceCategoryManagementPage from './ServiceCategoryManagementPage';

const getTodayDateValue = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().split('T')[0];
};

const ServiceManagementPage = () => {
  const { user } = useAuth();
  
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filterSpecialtyId, setFilterSpecialtyId] = useState('');
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [slotDoctors, setSlotDoctors] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // ✅ STATE LƯU TRỮ DỊCH VỤ ĐANG ĐƯỢC CHỈNH SỬA
  const [editingService, setEditingService] = useState(null);

  const [pauseModal, setPauseModal] = useState({
    isOpen: false,
    service: null,
    loadingStats: false,
    stats: {
      activeAppointments: 0,
      furthestDate: '...',
      doctorName: '...'
    }
  });
  
  const [uploadMode, setUploadMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const [filters, setFilters] = useState({ search: '', categoryId: '', status: '', page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, currentPage: 1 });
  const [slotStatsMap, setSlotStatsMap] = useState({}); // Map service.id → slot stats
  const [slotFilters, setSlotFilters] = useState({ date: getTodayDateValue(), doctorId: '' });
  
  const [selectedDoctors, setSelectedDoctors] = useState([]); 
  
  const [formData, setFormData] = useState({
    name: '', detailed_content: '', short_description: '', price: '', duration: 30,
    category_id: '', specialty_id: '', status: 'active', image_url: '', allow_doctor_choice: true
  });

  useEffect(() => {
    if (showForm || showConfirmClose || pauseModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showForm, showConfirmClose, pauseModal.isOpen]);

  useEffect(() => { fetchData(); }, [filters]);
  
  useEffect(() => { 
    fetchCategories(); 
    fetchSpecialties(); 
    fetchDoctors();     
  }, []);

  // Tab handling: sync with URL ?tab=services|categories
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedTab = searchParams.get('tab');
  const validTabs = ['services','categories'];
  const activeTab = validTabs.includes(requestedTab) ? requestedTab : 'services';

  const handleTabChange = (tabKey) => {
    const next = new URLSearchParams(location.search);
    next.set('tab', tabKey);
    navigate({ pathname: '/quan-ly-dich-vu', search: `?${next.toString()}` });
  };

  const fetchCategories = async () => {
    try {
      const response = await serviceCategoryService.getAdminServiceCategories();
      if (response.data?.success && Array.isArray(response.data.data)) {
        setCategories(response.data.data.filter(cat => cat.is_active));
      } else {
        setCategories([]);
      }
    } catch (error) { setCategories([]); }
  };

  const fetchSpecialties = async () => {
    try {
      const response = await specialtyService.getPublicSpecialties();
      if (response.data?.success && Array.isArray(response.data.specialties)) {
        setSpecialties(response.data.specialties);
      } else if (Array.isArray(response.data?.data)) {
        setSpecialties(response.data.data);
      }
    } catch (error) { console.error('Lỗi fetch chuyên khoa:', error); }
  };

  const fetchDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const response = await userService.getAllDoctorsPublic();
      let docs = [];
      if (Array.isArray(response.data?.doctors)) docs = response.data.doctors;
      else if (Array.isArray(response.data?.data)) docs = response.data.data;
      else if (Array.isArray(response.data)) docs = response.data;
      setDoctors(docs);
      setSlotDoctors(docs);
    } catch (error) { 
      toast.error('Không thể tải danh sách bác sĩ!');
      setDoctors([]); 
      setSlotDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleSpecialtyFilterChange = async (e) => {
    const specId = e.target.value;
    setFilterSpecialtyId(specId);
    
    setDoctorsLoading(true);
    try {
      if (!specId) {
        await fetchDoctors();
      } else {
        const response = await userService.getDoctorsBySpecialty(specId);
        if (response.data?.success && Array.isArray(response.data.data)) {
          setDoctors(response.data.data);
        } else {
          setDoctors([]);
        }
      }
    } catch (error) {
      toast.error('Lỗi khi lọc danh sách bác sĩ');
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      if (filters.search) params.search = filters.search;
      if (filters.categoryId) params.category_id = filters.categoryId;
      if (filters.status) params.status = filters.status;

      const response = await serviceService.getAdminServices(params);
      if (response.data?.success && Array.isArray(response.data.data)) {
        setServices(response.data.data);
        setPagination(response.data.pagination || { total: 0, totalPages: 0, currentPage: 1 });
      } else {
        setServices([]);
      }
    } catch (error) { 
      setServices([]);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchSlotStats = async (serviceId, selectedDate, selectedDoctorId) => {
    try {
      const params = { date: selectedDate };
      if (selectedDoctorId) {
        params.doctor_id = selectedDoctorId;
      }

      const response = await appointmentService.getSlotsStatsToday(serviceId, params);
      if (response.data?.success) {
        setSlotStatsMap(prev => ({ ...prev, [serviceId]: response.data.data || {} }));
      } else {
        setSlotStatsMap(prev => ({ ...prev, [serviceId]: {} }));
      }
    } catch (error) {
      console.error('Lỗi fetch slot stats:', error);
      setSlotStatsMap(prev => ({ ...prev, [serviceId]: {} }));
    }
  };

  useEffect(() => {
    if (!Array.isArray(services) || services.length === 0) {
      return;
    }

    setSlotStatsMap({});
    services.forEach(service => {
      if (service.id) {
        fetchSlotStats(service.id, slotFilters.date, slotFilters.doctorId);
      }
    });
  }, [services, slotFilters.date, slotFilters.doctorId]);

  const handleSlotFilterChange = (e) => {
    const { name, value } = e.target;
    setSlotFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getSlotStatsRows = (serviceId) => {
    const stats = slotStatsMap[serviceId];
    if (!stats) {
      return { loading: true, rows: [] };
    }

    const rows = Object.values(stats).filter(shift => (shift?.capacity || 0) > 0);
    return { loading: false, rows };
  };

  const renderSlotStatsCell = (serviceId) => {
    const { loading: isSlotLoading, rows } = getSlotStatsRows(serviceId);

    if (isSlotLoading) {
      return <span className="smp-slot-loading">Đang tải...</span>;
    }

    if (rows.length === 0) {
      return <span className="smp-slot-empty">Không có ca</span>;
    }

    return (
      <div className="smp-slot-lines">
        {rows.map((shift, idx) => (
          <div key={`${serviceId}-${shift.display_name || idx}`} className="smp-slot-line">
            <span className="smp-slot-shift">{shift.display_name || 'Ca'}</span>
            <span className="smp-slot-value">{shift.remaining || 0}/{shift.capacity || 0}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, price: rawValue ? parseInt(rawValue, 10) : '' }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch('http://localhost:3001/api/upload/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formDataUpload
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, image_url: data.url }));
        setImagePreview(data.url);
        toast.success('Upload ảnh thành công!');
      } else {
        toast.error(data.message || 'Upload ảnh thất bại');
      }
    } catch (error) {
      toast.error(`Có lỗi xảy ra khi upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước file không vượt quá 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
      await handleImageUpload(file);
    }
  };

  const handleDoctorToggle = (userId) => {
    const uid = Number(userId);
    if (!uid) return;
    setSelectedDoctors(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const resetForm = () => {
    setFormData({
      name: '', detailed_content: '', short_description: '', price: '', duration: 30,
      category_id: '', specialty_id: '', status: 'active', image_url: '', allow_doctor_choice: true
    });
    setSelectedDoctors([]);
    setIsEditing(false);
    setEditingService(null);
    setImagePreview('');
    setUploadMode('url');
    setFilterSpecialtyId(''); 
    fetchDoctors();
  };

  const openAddForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = async (service) => {
    setIsEditing(true);
    setEditingService(service); // Lưu lại bản gốc để truyền vào Popup Tạm ngưng
    setFormData({
      id: service.id, name: service.name, detailed_content: service.detailed_content || '', 
      short_description: service.short_description || '', price: service.price,
      duration: service.duration, category_id: service.category_id || '', specialty_id: service.specialty_id || '',
      status: service.status, image_url: service.image_url || '',
      allow_doctor_choice: service.allow_doctor_choice
    });
    setImagePreview(service.image_url || '');
    
    setFilterSpecialtyId('');
    fetchDoctors();

    if (service.doctors && Array.isArray(service.doctors)) {
      const assignedUserIds = service.doctors
        .map(d => getUserId(d))
        .filter(id => id !== null);
      setSelectedDoctors(assignedUserIds);
    } else {
      setSelectedDoctors([]);
    }
    
    setShowForm(true);
  };

  // =========================================================
  // LOGIC XỬ LÝ TẠM DỪNG DỊCH VỤ ĐỒNG BỘ
  // =========================================================

  const openPauseModal = async (service) => {
    setPauseModal({
      isOpen: true,
      service: service,
      loadingStats: true,
      stats: { activeAppointments: 0, furthestDate: '...', doctorName: '...' }
    });
    
    try {
      const response = await serviceService.getServicePauseStats(service.id);
      if (response.data?.success) {
        setPauseModal(prev => ({
          ...prev,
          loadingStats: false,
          stats: response.data.data
        }));
      }
    } catch (error) {
      toast.error('Lỗi khi tải thống kê lịch hẹn!');
      setPauseModal(prev => ({ ...prev, loadingStats: false }));
    }
  };

  const closePauseModal = () => {
    setPauseModal({ ...pauseModal, isOpen: false, service: null });
  };

  const handleSoftPause = async () => {
    try {
      const res = await serviceService.pauseService(pauseModal.service.id, 'soft');
      if (res.data?.success) {
        toast.success('Đã chuyển dịch vụ sang chế độ: Ngừng cung cấp mới. Lịch hẹn cũ vẫn diễn ra.');
        closePauseModal();
        setShowForm(false); // ✅ Tắt luôn Form Edit nếu đang mở
        resetForm();
        fetchData(); 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạm dừng dịch vụ');
    }
  };

  const handleHardPause = async () => {
    try {
      const res = await serviceService.pauseService(pauseModal.service.id, 'hard');
      if (res.data?.success) {
        toast.error('Đã tạm dừng dịch vụ và hệ thống đã hủy các lịch hẹn liên quan.');
        closePauseModal();
        setShowForm(false); // ✅ Tắt luôn Form Edit nếu đang mở
        resetForm();
        fetchData(); 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi hủy lịch hẹn');
    }
  };

  // =========================================================

  const handleCloseAttempt = () => { if (showForm) setShowConfirmClose(true); };
  const confirmCloseForm = () => { setShowConfirmClose(false); setShowForm(false); resetForm(); };
  const cancelCloseForm = () => { setShowConfirmClose(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.price === '' || !formData.category_id) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    const safeImageUrl = formData.image_url ? formData.image_url.trim() : null;

    try {
      const submitData = { 
        ...formData, 
        image_url: safeImageUrl,
        user_ids: selectedDoctors,
        status: formData.status // Truyền luôn status nếu bấm Mở lại
      };

      if (isEditing) {
        const res = await serviceService.updateService(formData.id, submitData);
        if (res.data.success) toast.success('Cập nhật dịch vụ thành công');
      } else {
        const res = await serviceService.createService(submitData);
        if (res.data.success) toast.success('Thêm dịch vụ mới thành công');
      }
      setShowForm(false); fetchData();
    } catch (error) { 
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại'); 
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${name}"?`)) {
      try {
        const res = await serviceService.deleteService(id);
        if (res.data.success) { toast.success('Đã xóa dịch vụ'); fetchData(); }
      } catch (error) { toast.error(error.response?.data?.message || 'Lỗi khi xóa dịch vụ'); }
    }
  };

  const getUserId = (doc) => {
    if (!doc) return null;
    if (doc.user_id) return Number(doc.user_id);
    if (doc.user?.id) return Number(doc.user.id);
    if (doc.id) return Number(doc.id);
    return null;
  };

  const getDoctorName = (doc) => {
    if (!doc) return 'Khuyết Danh';
    return doc.full_name || doc.user?.full_name || doc.name || 'Bác sĩ';
  };

  const getDoctorFilterId = (doc) => {
    if (!doc) return null;
    if (doc.id) return Number(doc.id);
    if (doc.doctor_id) return Number(doc.doctor_id);
    return null;
  };

  const getDoctorSpecialty = (doc) => {
    if (!doc) return '';
    if (doc.specialty_info?.name) return doc.specialty_info.name;
    if (doc.specialty?.name) return doc.specialty.name;
    if (doc.Specialty?.name) return doc.Specialty.name;
    if (doc.Doctor?.specialty?.name) return doc.Doctor.specialty.name;
    if (doc.Doctor?.Specialty?.name) return doc.Doctor.Specialty.name;
    if (doc.roleData?.Specialty?.name) return doc.roleData.Specialty.name;
    if (doc.roleData?.specialty?.name) return doc.roleData.specialty.name;
    if (doc.role_info?.specialty?.name) return doc.role_info.specialty.name;
    return ''; 
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:3001${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) return <div className="smp-page-container"><div className="smp-loading">Đang tải dữ liệu...</div></div>;

  const activeCount = Array.isArray(services) ? services.filter(s => s.status === 'active').length : 0;
  const categoryCount = Array.isArray(categories) ? categories.length : 0;

  // Render tabs + content
  const TabsHeader = (
    <div className="smp-tabs-header">
      <button className={`smp-tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => handleTabChange('services')}>Gói dịch vụ</button>
      <button className={`smp-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => handleTabChange('categories')}>Danh mục</button>
    </div>
  );

  return (
    <div className="smp-page-container">
      {TabsHeader}
      {activeTab === 'services' ? (
        <div className="smp-content-wrapper">
          
          <div className="smp-header">
            <div className="smp-header-title">
              <h1>Quản lý Dịch vụ Khám bệnh</h1>
              <p>Quản lý các dịch vụ thực hiện tại bệnh viện, danh mục và bác sĩ thực hiện</p>
            </div>
            <button className="smp-btn smp-btn-primary" onClick={openAddForm}><FaPlus /> Thêm dịch vụ mới</button>
          </div>

          <div className="smp-stats-grid">
            <div className="smp-stat-card"><div className="smp-stat-icon"><FaStethoscope /></div><div className="smp-stat-info"><h3>Tổng dịch vụ</h3><p>{pagination?.total || 0}</p></div></div>
            <div className="smp-stat-card"><div className="smp-stat-icon"><FaCheckCircle /></div><div className="smp-stat-info"><h3>Đang hoạt động</h3><p>{activeCount}</p></div></div>
            <div className="smp-stat-card"><div className="smp-stat-icon"><FaList /></div><div className="smp-stat-info"><h3>Danh mục</h3><p>{categoryCount}</p></div></div>
          </div>

          <div className="smp-toolbar">
            <div className="smp-search-box">
              <FaSearch className="smp-search-icon" />
              <input type="text" name="search" placeholder="Tìm kiếm theo tên dịch vụ..." value={filters.search} onChange={handleFilterChange} className="smp-search-input" />
            </div>
            <div className="smp-filters">
              <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="smp-filter-select">
                <option value="">Tất cả danh mục</option>
                {Array.isArray(categories) && categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <select name="status" value={filters.status} onChange={handleFilterChange} className="smp-filter-select">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>
            <div className="smp-slot-filters">
              <input
                type="date"
                name="date"
                value={slotFilters.date}
                onChange={handleSlotFilterChange}
                className="smp-filter-select"
                title="Lọc slot theo ngày"
              />
              <select
                name="doctorId"
                value={slotFilters.doctorId}
                onChange={handleSlotFilterChange}
                className="smp-filter-select"
                title="Lọc slot theo bác sĩ"
              >
                <option value="">Tất cả bác sĩ</option>
                {Array.isArray(slotDoctors) && slotDoctors.map(doctor => {
                  const doctorId = getDoctorFilterId(doctor);
                  if (!doctorId) return null;
                  return (
                    <option key={doctorId} value={doctorId}>
                      BS. {getDoctorName(doctor)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="smp-table-container">
            <table className="smp-table">
              <thead>
                <tr>
                  <th>ID</th><th>Tên dịch vụ & Mô tả</th><th>Hình ảnh</th><th>Danh mục</th>
                  <th>Bác sĩ thực hiện</th>
                  <th>Lịch hẹn</th>
                  <th>Slot còn lại/ca</th>
                  <th>Giá & Thời gian</th><th>Trạng thái</th><th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(services) && services.length > 0 ? (
                  services.map(service => (
                    <tr key={service.id}>
                      <td>#{service.id}</td>
                      <td>
                        <div className="smp-service-info">
                          <span className="smp-service-name">{service.name}</span>
                          {service.short_description && <span className="smp-service-desc">{service.short_description}</span>}
                        </div>
                      </td>
                      <td>{service.image_url ? <img src={getImageUrl(service.image_url)} alt="" className="smp-image-preview" /> : <div className="smp-no-image"><FaImage size={16} /></div>}</td>
                      <td><span className="smp-badge gray">{service.category?.name || 'Chưa phân loại'}</span></td>
                      <td>
                        <div className="smp-doctor-list">
                          {Array.isArray(service.doctors) && service.doctors.length > 0 ? (
                            <>
                              {service.doctors.slice(0, 2).map((doc, idx) => (
                                <span key={idx} className="smp-doctor-tag">BS. {getDoctorName(doc).split(' ').pop()}</span>
                              ))}
                              {service.doctors.length > 2 && <span className="smp-doctor-tag">+{service.doctors.length - 2}</span>}
                            </>
                          ) : <span className="smp-text-gray" style={{fontSize: '12px'}}>Tất cả</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: '#d97706', fontWeight: '500' }}>Đang chạy: {service.active_appointments || 0}</span>
                          <span style={{ color: '#16a34a', fontWeight: '500' }}>Đã xong: {service.completed_appointments || 0}</span>
                        </div>
                      </td>
                      <td>
                        {renderSlotStatsCell(service.id)}
                      </td>
                      <td>
                        <div style={{fontWeight: '600', color: 'var(--smp-primary)'}}>{service.price?.toLocaleString('vi-VN')} đ</div>
                        <div style={{fontSize: '12px', color: 'var(--smp-text-gray)'}}>{service.duration} phút</div>
                      </td>
                      <td><span className={`smp-badge ${service.status === 'active' ? 'success' : 'danger'}`}>{service.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}</span></td>
                      <td>
                        <div className="smp-actions">
                          <button className="smp-btn-icon edit" onClick={() => openEditForm(service)}><FaEdit /></button>
                          {service.status === 'active' && (
                            <button className="smp-btn-icon" style={{color: '#d97706', background: '#fef3c7'}} onClick={() => openPauseModal(service)} title="Tạm dừng dịch vụ">
                              <FaPauseCircle />
                            </button>
                          )}
                          <button className="smp-btn-icon delete" onClick={() => handleDelete(service.id, service.name)}><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : <tr><td colSpan="10" className="smp-empty-state">Không có dữ liệu.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ServiceCategoryManagementPage />
      )}

        {/* Modal Thêm/Sửa Dịch vụ */}
        {showForm && (
          <div className="smp-modal-overlay" onClick={handleCloseAttempt}>
            <div className="smp-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="smp-modal-header">
                <h2>{isEditing ? 'Chỉnh sửa Dịch vụ' : 'Thêm Dịch vụ mới'}</h2>
                <button type="button" className="smp-modal-close" onClick={handleCloseAttempt}><FaTimes /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="smp-modal-form">
                <div className="smp-modal-body">
                  <div className="smp-form-grid">
                    
                    <div className="smp-form-col">
                      <div className="smp-form-group">
                        <label className="smp-form-label">Tên dịch vụ <span>*</span></label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="smp-form-input" placeholder="VD: Khám tổng quát..." />
                      </div>
                      
                      <div className="smp-form-row">
                        <div className="smp-form-group">
                          <label className="smp-form-label">Danh mục <span>*</span></label>
                          <select name="category_id" value={formData.category_id} onChange={handleInputChange} required className="smp-form-select">
                            <option value="">-- Chọn danh mục --</option>
                            {Array.isArray(categories) && categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </div>

                        <div className="smp-form-group">
                          <label className="smp-form-label">Chuyên khoa ưu tiên</label>
                          <select name="specialty_id" value={formData.specialty_id || ''} onChange={handleInputChange} className="smp-form-select">
                            <option value="">-- Không giới hạn --</option>
                            {Array.isArray(specialties) && specialties.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                          </select>
                        </div>
                        
                        {/* ✅ THAY ĐỔI GIAO DIỆN TRẠNG THÁI TRONG FORM EDIT */}
                        <div className="smp-form-group">
                          <label className="smp-form-label">Trạng thái</label>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                              <span className={`smp-badge ${formData.status === 'active' ? 'success' : 'danger'}`} style={{ padding: '6px 12px', fontSize: '13px' }}>
                                {formData.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
                              </span>
                              
                              {formData.status === 'active' ? (
                                <button 
                                  type="button" 
                                  className="smp-btn smp-btn-outline" 
                                  style={{ padding: '4px 10px', fontSize: '12px', borderColor: '#d97706', color: '#d97706' }}
                                  onClick={() => openPauseModal(editingService)} // Mở đè popup Pause
                                >
                                  <FaPauseCircle /> Tạm dừng
                                </button>
                              ) : (
                                <button 
                                  type="button" 
                                  className="smp-btn smp-btn-outline" 
                                  style={{ padding: '4px 10px', fontSize: '12px', borderColor: '#16a34a', color: '#16a34a' }}
                                  onClick={() => setFormData(prev => ({...prev, status: 'active'}))} // Mở lại thì chỉ đổi state, chờ bấm Lưu
                                >
                                  <FaCheckCircle /> Mở lại
                                </button>
                              )}
                            </div>
                          ) : (
                            <select name="status" value={formData.status} onChange={handleInputChange} className="smp-form-select">
                              <option value="active">Đang hoạt động</option>
                              <option value="inactive">Tạm ngưng</option>
                            </select>
                          )}
                        </div>

                      </div>

                      <div className="smp-form-row">
                        <div className="smp-form-group">
                          <label className="smp-form-label">Giá dịch vụ (VNĐ) <span>*</span></label>
                          <input
                            type="text" 
                            name="price"
                            value={formData.price !== '' ? Number(formData.price).toLocaleString('vi-VN') : ''}
                            onChange={handlePriceChange}
                            required
                            className="smp-form-input"
                            placeholder="VD: 500.000"
                          />
                        </div>
                        <div className="smp-form-group">
                          <label className="smp-form-label">Thời gian (phút) <span>*</span></label>
                          <input type="number" name="duration" value={formData.duration} onChange={handleInputChange} required min="5" step="5" className="smp-form-input" />
                        </div>
                      </div>

                      <div className="smp-form-group">
                        <label className="smp-form-label">Mô tả ngắn</label>
                        <input type="text" name="short_description" value={formData.short_description} onChange={handleInputChange} className="smp-form-input" placeholder="Mô tả tóm tắt..." />
                        <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>Hiển thị ở danh sách dịch vụ và màn hình đặt lịch.</small>
                      </div>

                      <div className="smp-form-group">
                        <label className="smp-form-label">Nội dung chi tiết dịch vụ</label>
                        <textarea 
                          name="detailed_content" 
                          value={formData.detailed_content} 
                          onChange={handleInputChange} 
                          className="smp-form-textarea" 
                          placeholder="Mô tả chi tiết nội dung, quy trình..."
                        ></textarea>
                        <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>Dùng cho mô tả quy trình, lưu ý trước khám, và nội dung hướng dẫn bệnh nhân.</small>
                      </div>

                      <div className="smp-form-group" style={{ marginTop: '8px' }}>
                        <label className="smp-form-label">Quyền chọn bác sĩ</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                          <input type="checkbox" name="allow_doctor_choice" checked={!!formData.allow_doctor_choice} onChange={handleInputChange} />
                          Bệnh nhân được chọn bác sĩ khi đặt lịch
                        </label>
                      </div>
                    </div>

                    <div className="smp-form-col">
                      <div className="smp-form-group">
                        <label className="smp-form-label">Hình ảnh dịch vụ</label>
                        <div>
                          <div className="smp-upload-tabs">
                            <button type="button" className={`smp-upload-tab ${uploadMode === 'url' ? 'active' : ''}`} onClick={() => setUploadMode('url')}>URL Link</button>
                            <button type="button" className={`smp-upload-tab ${uploadMode === 'file' ? 'active' : ''}`} onClick={() => setUploadMode('file')}><FaImage/> File Thiết bị</button>
                          </div>
                          
                          {uploadMode === 'url' ? (
                            <input type="text" name="image_url" value={formData.image_url || ''} onChange={handleInputChange} className="smp-form-input" placeholder="https://..." />
                          ) : (
                            <div className="smp-upload-area" onClick={() => document.getElementById('smp-file-upload').click()}>
                              <FaImage className="smp-upload-icon" />
                              <p>{uploading ? 'Đang tải lên...' : 'Click để chọn ảnh từ máy (Max 5MB)'}</p>
                              <input type="file" id="smp-file-upload" hidden accept="image/*" onChange={handleFileSelect} />
                            </div>
                          )}

                          {(formData.image_url || imagePreview) && (
                            <img src={getImageUrl(imagePreview || formData.image_url)} className="smp-image-preview-large" alt="Preview" />
                          )}
                        </div>
                      </div>

                      <div className="smp-form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{ flex: 1, marginRight: '15px' }}>
                            <label className="smp-form-label">Lọc Bác sĩ theo Khoa</label>
                            <select 
                              className="smp-form-select" 
                              style={{ marginTop: '6px', padding: '8px' }}
                              value={filterSpecialtyId}
                              onChange={handleSpecialtyFilterChange}
                            >
                              <option value="">-- Tất cả chuyên khoa --</option>
                              {Array.isArray(specialties) && specialties.map(sp => (
                                <option key={sp.id} value={sp.id}>{sp.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div style={{ textAlign: 'right', marginTop: '5px' }}>
                            <div className="smp-badge success" style={{ fontSize: '11px', marginTop: '25px' }}>
                              Đã phân công: {selectedDoctors.length} BS
                            </div>
                          </div>
                        </div>

                        <div className="smp-checkbox-list">
                          {doctorsLoading ? (
                            <span style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                              Đang tải dữ liệu bác sĩ...
                            </span>
                          ) : Array.isArray(doctors) && doctors.length > 0 ? (
                            doctors.map(doctor => {
                              const userId = getUserId(doctor);
                              if (!userId) return null;

                              const docName = getDoctorName(doctor);
                              const docSpec = getDoctorSpecialty(doctor);
                              
                              return (
                                <label key={userId} className="smp-checkbox-item">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedDoctors.includes(userId)} 
                                    onChange={() => handleDoctorToggle(userId)} 
                                  />
                                  BS. {docName} {docSpec && <span style={{ color: '#199c56', fontWeight: '500' }}> - {docSpec}</span>}
                                </label>
                              );
                            })
                          ) : (
                            <span style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                              Không có bác sĩ nào
                            </span>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

                <div className="smp-modal-footer">
                  <button type="button" className="smp-btn smp-btn-outline" onClick={handleCloseAttempt}>Hủy bỏ</button>
                  <button type="submit" className="smp-btn smp-btn-primary">{isEditing ? 'Lưu thay đổi' : 'Tạo dịch vụ'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showConfirmClose && (
          <div className="smp-confirm-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="smp-confirm-box">
              <div className="smp-confirm-icon"><FaExclamationTriangle /></div>
              <h3 className="smp-confirm-title">Cảnh báo chưa lưu</h3>
              <p className="smp-confirm-text">Bạn có những thông tin chưa được lưu. Nếu đóng cửa sổ này, mọi thay đổi sẽ bị mất.</p>
              <div className="smp-confirm-actions">
                <button className="smp-btn smp-btn-outline" onClick={cancelCloseForm}>Tiếp tục chỉnh sửa</button>
                <button className="smp-btn smp-btn-danger" onClick={confirmCloseForm}>Đồng ý thoát</button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ POPUP QUẢN LÝ TẠM DỪNG DỊCH VỤ NẰM ĐÈ LÊN MỌI THỨ */}
        {pauseModal.isOpen && (
          <div className="smp-confirm-overlay" onClick={closePauseModal}>
            <div className="smp-confirm-box" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
              <div className="smp-confirm-icon" style={{ color: '#d97706' }}>
                <FaPauseCircle />
              </div>
              <h3 className="smp-confirm-title" style={{ fontSize: '18px' }}>Tạm dừng Dịch vụ</h3>
              
              {pauseModal.loadingStats ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <FaSpinner className="fa-spin" style={{ fontSize: '24px', color: '#d97706', marginBottom: '10px' }} />
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Đang tải số liệu lịch hẹn...</p>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'left', background: '#fffbeb', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fde68a' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#92400e' }}>
                      Hiện tại hệ thống đang có <strong>{pauseModal.stats.activeAppointments} lịch hẹn</strong> đăng ký dịch vụ này.
                    </p>
                    {pauseModal.stats.activeAppointments > 0 && (
                      <p style={{ margin: 0, fontSize: '13px', color: '#b45309', lineHeight: '1.6' }}>
                        <FaCalendarAlt style={{marginRight: '5px'}}/> Lịch xa nhất: <strong>{pauseModal.stats.furthestDate}</strong>
                        <br />
                        <FaStethoscope style={{marginRight: '5px', marginTop: '5px'}}/> Bác sĩ phụ trách: <strong>{pauseModal.stats.doctorName}</strong>
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      className="smp-btn smp-btn-outline" 
                      style={{ justifyContent: 'center', borderColor: '#d97706', color: '#d97706', padding: '12px' }}
                      onClick={handleSoftPause}
                    >
                      <strong>Ngừng cung cấp mới (Đề xuất)</strong>
                      <br/>
                      <span style={{ fontSize: '11px', fontWeight: 'normal' }}>Bệnh nhân không thể đặt thêm lịch, các lịch cũ vẫn diễn ra bình thường.</span>
                    </button>

                    <button 
                      className="smp-btn smp-btn-danger" 
                      style={{ justifyContent: 'center', padding: '12px' }}
                      onClick={handleHardPause}
                    >
                      <strong><FaBan style={{marginRight:'5px'}}/> Tạm dừng ngay & Hủy lịch</strong>
                      <br/>
                      <span style={{ fontSize: '11px', fontWeight: 'normal' }}>Ngừng hoàn toàn dịch vụ, hệ thống sẽ HỦY TOÀN BỘ lịch hẹn đang chờ.</span>
                    </button>
                  </div>
                </>
              )}
              
              <button className="smp-btn smp-btn-outline" style={{ marginTop: '15px', width: '100%' }} onClick={closePauseModal}>Hủy bỏ / Quay lại</button>
            </div>
          </div>
        )}
    </div>
  );
};

export default ServiceManagementPage;
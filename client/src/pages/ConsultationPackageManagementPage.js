// client/src/pages/ConsultationPackageManagementPage.js
// Trang quản lý Gói dịch vụ tư vấn - Integrated component (no wrapper needed)

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import consultationService from '../services/consultationService';
import specialtyService from '../services/specialtyService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaCog, FaEdit, FaSave, FaTimes, FaEye, FaPlus, FaSearch, FaFilter, 
  FaCheckCircle, FaTimesCircle, FaTrash, FaBox, FaCommentDots, 
  FaVideo, FaClipboardList, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaInfoCircle, FaUserMd, FaUsers
} from 'react-icons/fa';
import Select from 'react-select';
import '../components/consultation/ConsultationPackageManagement.css';

const ConsultationPackageManagementPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const toastOptions = { autoClose: 5000 };
  
  // Permission checks
  const hasPermission = (module, permission) => {
    if (isAdmin) return true;
    if (!user?.role_info?.permissions) return false;
    const modulePerms = user.role_info.permissions[module];
    if (!modulePerms) return false;
    return Array.isArray(modulePerms) ? modulePerms.includes(permission) : false;
  };

  const canCreate = isAdmin || hasPermission('consultation_pricing', 'create');
  const canEdit = isAdmin || hasPermission('consultation_pricing', 'edit');
  const canDelete = isAdmin || hasPermission('consultation_pricing', 'delete');
  const canHide = isAdmin || hasPermission('consultation_pricing', 'hide');
  const canSetPrice = isAdmin || hasPermission('consultation_pricing', 'set_price');

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState({});

  // Thêm state cho doctors
  const [allDoctors, setAllDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  
  // Thêm state cho specialties và filter
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState([]);

  const [createData, setCreateData] = useState({
    package_name: '',
    description: '',
    image_url: '',
    features: [],
    package_type: 'chat',
    duration_minutes: 30,
    price: 0,
    is_active: true,
    doctor_codes: []
  });
  const [imageUploadTab, setImageUploadTab] = useState('url');
  const [featureInput, setFeatureInput] = useState('');
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all'
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const specialtyOptions = specialties.map(spec => ({
    value: spec.id,
    label: spec.name
  }));

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        is_active: filters.status === 'all' ? undefined : filters.status === 'active',
        package_type: filters.type === 'all' ? undefined : filters.type
      };
      
      const response = await consultationService.getAllPackages(params);
      
      if (response.data.success) {
        const packagesData = response.data.data.packages || [];
        setPackages(packagesData);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total,
          totalPages: response.data.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Lỗi khi tải danh sách gói dịch vụ', toastOptions);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPackages();
    fetchDoctors();
    fetchSpecialties();
  }, [fetchPackages]);

  const fetchSpecialties = async () => {
    try {
      const specRes = await specialtyService.getPublicSpecialties();
      if (specRes.data.success) {
        setSpecialties(specRes.data.specialties || []);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const docRes = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/doctors/public`);
      
      if (docRes.data.success) {
        const rawDoctors = docRes.data.doctors || [];
        const doctorOptions = rawDoctors.map(doc => {
          const specialtyId = doc.specialty_id || null;
          let specialtyName = doc.specialty_name || '';
          if (specialtyName === 'Chưa phân chuyên khoa') {
            specialtyName = '';
          }
          
          return {
            value: doc.code,
            label: `BS. ${doc.full_name}${specialtyName ? ` - ${specialtyName}` : ''}`,
            code: doc.code,
            full_name: doc.full_name,
            specialtyId: specialtyId,
            specialtyName: specialtyName
          };
        });
        setAllDoctors(doctorOptions);
        setFilteredDoctors(doctorOptions);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  useEffect(() => {
    if (selectedSpecialtyFilter.length === 0) {
      setFilteredDoctors(allDoctors);
    } else {
      const selectedIds = selectedSpecialtyFilter.map(f => String(f.value));
      const filtered = allDoctors.filter(doc => {
        if (doc.specialtyId === null || doc.specialtyId === undefined) {
          return false;
        }
        return selectedIds.includes(String(doc.specialtyId));
      });
      setFilteredDoctors(filtered);
    }
  }, [selectedSpecialtyFilter, allDoctors]);

  const handleCreatePackage = async () => {
    try {
      if (!createData.package_name) {
        toast.warning('Vui lòng nhập tên gói dịch vụ', toastOptions);
        return;
      }
      if (!createData.package_type) {
         toast.warning('Vui lòng chọn hình thức tư vấn', toastOptions);
         return;
      }

      const dataToSend = {
        package_name: createData.package_name,
        description: createData.description,
        image_url: createData.image_url || null,
        features: createData.features || [],
        package_type: createData.package_type,
        duration_minutes: parseInt(createData.duration_minutes),
        price: parseInt(createData.price) || 0,
        is_active: true,
        doctor_codes: selectedDoctors.map(d => d.code)
      };

      const response = await consultationService.createPackage(dataToSend);
      
      if (response.data.success) {
        toast.success('Tạo gói dịch vụ mới thành công!', toastOptions);
        setShowCreateModal(false);
        resetCreateForm();
        fetchPackages();
      }
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error('Lỗi khi tạo gói dịch vụ: ' + (error.response?.data?.message || error.message), toastOptions);
    }
  };

  const handleUpdatePackage = async () => {
    try {
      if (!editData.package_name) {
        toast.warning('Vui lòng nhập tên gói dịch vụ', toastOptions);
        return;
      }
      
      const dataToSend = {
        package_name: editData.package_name,
        description: editData.description,
        image_url: editData.image_url || null,
        features: editData.features || [],
        package_type: editData.package_type,
        duration_minutes: parseInt(editData.duration_minutes),
        price: parseInt(editData.price) || 0,
        is_active: editData.is_active,
        doctor_codes: selectedDoctors.map(d => d.code)
      };

      const response = await consultationService.updatePackage(selectedPackage.id, dataToSend);
      
      if (response.data.success) {
        toast.success('Cập nhật gói dịch vụ thành công!', toastOptions);
        setShowEditModal(false);
        fetchPackages();
      }
    } catch (error) {
      console.error('Error updating package:', error);
      toast.error('Lỗi khi cập nhật: ' + (error.response?.data?.message || error.message), toastOptions);
    }
  };

  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`Bạn có chắc muốn xóa gói "${pkg.package_name}"?`)) {
      return;
    }

    try {
      await consultationService.deletePackage(pkg.id);
      toast.success('Xóa gói dịch vụ thành công!', toastOptions);
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Lỗi khi xóa: ' + (error.response?.data?.message || error.message), toastOptions);
    }
  };

  const handleToggleStatus = async (pkg) => {
    if (!window.confirm(`Bạn có chắc muốn ${pkg.is_active ? 'TẮT' : 'BẬT'} gói dịch vụ này?`)) {
      return;
    }

    try {
      await consultationService.updatePackage(pkg.id, {
        ...pkg,
        is_active: !pkg.is_active
      });
      fetchPackages();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Lỗi khi thay đổi trạng thái', toastOptions);
    }
  };

  const resetCreateForm = () => {
    setCreateData({
      package_name: '',
      description: '',
      package_type: 'chat',
      duration_minutes: 30,
      price: 0,
      is_active: true,
      doctor_codes: []
    });
    setSelectedDoctors([]);
    setSelectedSpecialtyFilter([]);
  };

  const openEditModal = (pkg) => {
    setSelectedPackage(pkg);
    setEditData({
      package_name: pkg.package_name || '',
      description: pkg.description || '',
      image_url: pkg.image_url || '',
      features: Array.isArray(pkg.features) ? pkg.features : [],
      package_type: pkg.package_type || 'chat',
      duration_minutes: pkg.duration_minutes || 30,
      price: pkg.price ?? 100000,
      notes: pkg.notes || '',
      is_active: Boolean(pkg.is_active)
    });
    
    if (pkg.doctor_codes) {
      let doctorCodes = [];
      if (typeof pkg.doctor_codes === 'string') {
        try {
          doctorCodes = JSON.parse(pkg.doctor_codes);
        } catch {
          doctorCodes = [];
        }
      } else if (Array.isArray(pkg.doctor_codes)) {
        doctorCodes = pkg.doctor_codes;
      }
      
      if (doctorCodes && doctorCodes.length > 0) {
        const selected = allDoctors.filter(d => doctorCodes.includes(d.code));
        setSelectedDoctors(selected);
      } else {
        setSelectedDoctors([]);
      }
    } else {
      setSelectedDoctors([]);
    }
    
    setSelectedSpecialtyFilter([]);
    setShowEditModal(true);
  };

  const selectAllFilteredDoctors = () => {
    if (selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0) {
      setSelectedDoctors([]);
    } else {
      setSelectedDoctors(filteredDoctors);
    }
  };

  const renderStats = () => {
    const total = pagination.total;
    const active = packages.filter(p => p.is_active).length;
    const chatEnabled = packages.filter(p => p.package_type === 'chat').length;
    const videoEnabled = packages.filter(p => p.package_type === 'video').length;

    return (
      <div className="cpm-stats">
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-primary">
            <FaBox className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{total}</div>
            <div className="cpm-stat-label">Tổng gói</div>
          </div>
        </div>
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-success">
            <FaCheckCircle className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{active}</div>
            <div className="cpm-stat-label">Hoạt động</div>
          </div>
        </div>
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-info">
            <FaCommentDots className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{chatEnabled}</div>
            <div className="cpm-stat-label">Chat</div>
          </div>
        </div>
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-warning">
            <FaVideo className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{videoEnabled}</div>
            <div className="cpm-stat-label">Video</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cpm-container" style={{ margin: '15px' }}>
      <div className="cpm-header">
        <div className="cpm-header-left">
          <FaClipboardList className="cpm-header-icon" />
          <h2>Quản lý gói dịch vụ</h2>
        </div>
        {canCreate && (
          <button 
            className="cpm-btn cpm-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> <span>Thêm mới</span>
          </button>
        )}
      </div>

      {renderStats()}

      <div className="cpm-filters">
        <div className="cpm-search-box">
          <FaSearch className="cpm-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="cpm-input"
          />
        </div>

        <div className="cpm-filter-group">
          <div className="cpm-select-wrapper">
             <FaFilter className="cpm-select-icon"/>
             <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="cpm-select"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
          </div>

          <div className="cpm-select-wrapper">
             <FaCog className="cpm-select-icon"/>
             <select 
                value={filters.type} 
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="cpm-select"
              >
                <option value="all">Tất cả hình thức</option>
                <option value="chat">Chat Realtime</option>
                <option value="video">Video Call</option>
              </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="cpm-loading">
          <div className="cpm-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          <div className="cpm-table-container">
            <div className="cpm-table-wrapper">
              <table className="cpm-table">
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>#</th>
                    <th style={{width: '60px'}}>Hình ảnh</th>
                    <th>Tên gói dịch vụ</th>
                    <th>Mã gói</th>
                    <th>Hình thức</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Chi phí</th>
                    <th style={{textAlign: 'center'}}>Bác sĩ</th>
                    <th style={{textAlign: 'right'}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="cpm-no-data">
                        <div className="cpm-no-data-content">
                          <FaExclamationTriangle />
                          <p>Không có dữ liệu</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    packages.map((pkg, index) => (
                      <tr key={pkg.id}>
                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td>
                          {pkg.image_url ? (
                            <img
                              src={pkg.image_url}
                              alt={pkg.package_name}
                              style={{ width: 52, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                            />
                          ) : (
                            <div style={{ width: 52, height: 36, background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8', border: '1px dashed #e2e8f0' }}>
                              No img
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="cpm-cell-primary">
                            <strong>{pkg.package_name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="cpm-code">{pkg.package_code}</span>
                        </td>
                        <td>
                          <div className="cpm-type-badge">
                            {pkg.package_type === 'chat' && <><FaCommentDots className="cpm-text-info"/> <span>Chat</span></>}
                            {pkg.package_type === 'video' && <><FaVideo className="cpm-text-warning"/> <span>Video</span></>}
                          </div>
                        </td>
                        <td>{pkg.duration_minutes}p</td>
                        <td>
                          {canHide ? (
                            <button
                              className={`cpm-status-badge ${pkg.is_active ? 'cpm-status-active' : 'cpm-status-inactive'}`}
                              onClick={() => handleToggleStatus(pkg)}
                            >
                              {pkg.is_active ? <FaCheckCircle /> : <FaTimesCircle />}
                              <span>{pkg.is_active ? 'Hoạt động' : 'Đã tắt'}</span>
                            </button>
                          ) : (
                            <div className={`cpm-status-badge ${pkg.is_active ? 'cpm-status-active' : 'cpm-status-inactive'}`}>
                              {pkg.is_active ? <FaCheckCircle /> : <FaTimesCircle />}
                              <span>{pkg.is_active ? 'Hoạt động' : 'Đã tắt'}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="cpm-price">
                             {parseFloat(pkg.price) === 0 ? 'Miễn phí' : `${parseFloat(pkg.price).toLocaleString()}đ`}
                          </div>
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <div className="cpm-doctor-count">
                            <FaUserMd style={{marginRight: '5px', color: '#22c55e'}} />
                            <span>
                              {pkg.doctor_codes && Array.isArray(pkg.doctor_codes) && pkg.doctor_codes.length > 0 
                                ? pkg.doctor_codes.length 
                                : 'Tất cả'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="cpm-actions">
                            <Link to={`/dich-vu?tab=consultation`} className="cpm-btn-icon cpm-text-info" title="Xem">
                              <FaEye />
                            </Link>
                            {canEdit && (
                              <button className="cpm-btn-icon cpm-text-warning" onClick={() => openEditModal(pkg)} title="Sửa">
                                <FaEdit />
                              </button>
                            )}
                            {canDelete && (
                              <button className="cpm-btn-icon cpm-text-danger" onClick={() => handleDeletePackage(pkg)} title="Xóa">
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="cpm-pagination">
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="cpm-page-btn"
              >
                <FaChevronLeft />
              </button>
              
              <span className="cpm-page-info">
                Trang <strong>{pagination.page}</strong> / {pagination.totalPages}
              </span>
              
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="cpm-page-btn"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {showDetailModal && selectedPackage && (
        <ModalWrapper title="Chi tiết gói dịch vụ" onClose={() => setShowDetailModal(false)}>
          <div className="cpm-detail-grid">
            <div className="cpm-detail-group">
              <label>Tên gói:</label>
              <div>{selectedPackage.package_name}</div>
            </div>
            <div className="cpm-detail-group">
              <label>Mã gói:</label>
              <span className="cpm-code">{selectedPackage.package_code}</span>
            </div>
            <div className="cpm-detail-group">
              <label>Trạng thái:</label>
              <span className={selectedPackage.is_active ? 'cpm-text-success' : 'cpm-text-danger'}>
                {selectedPackage.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
              </span>
            </div>
            <div className="cpm-divider"></div>
            <div className="cpm-detail-row">
               <span>Hình thức:</span>
               <strong>{selectedPackage.package_type.toUpperCase()}</strong>
            </div>
            <div className="cpm-detail-row">
               <span>Thời lượng:</span>
               <strong>{selectedPackage.duration_minutes} phút</strong>
            </div>
            <div className="cpm-detail-row">
               <span>Giá:</span>
               <strong className="cpm-text-primary">
                 {parseFloat(selectedPackage.price).toLocaleString()} VNĐ
               </strong>
            </div>
          </div>
          <div className="cpm-modal-footer">
            <button className="cpm-btn cpm-btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
          </div>
        </ModalWrapper>
      )}

      {showEditModal && selectedPackage && (
        <ModalWrapper title="Chỉnh sửa gói" onClose={() => setShowEditModal(false)}>
          <PackageForm 
            data={editData} 
            setData={setEditData} 
            onSubmit={handleUpdatePackage}
            onCancel={() => setShowEditModal(false)}
            isEdit={true}
            allDoctors={allDoctors}
            selectedDoctors={selectedDoctors}
            setSelectedDoctors={setSelectedDoctors}
            specialtyOptions={specialtyOptions}
            selectedSpecialtyFilter={selectedSpecialtyFilter}
            setSelectedSpecialtyFilter={setSelectedSpecialtyFilter}
            filteredDoctors={filteredDoctors}
            selectAllFilteredDoctors={selectAllFilteredDoctors}
            imageUploadTab={imageUploadTab}
            setImageUploadTab={setImageUploadTab}
            featureInput={featureInput}
            setFeatureInput={setFeatureInput}
            handleAddFeature={() => {
              if (!featureInput.trim()) return;
              setEditData(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }));
              setFeatureInput('');
            }}
            handleRemoveFeature={(idx) => setEditData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }))}
          />
        </ModalWrapper>
      )}

      {showCreateModal && (
        <ModalWrapper title="Thêm gói mới" onClose={() => setShowCreateModal(false)}>
          <PackageForm 
            data={createData} 
            setData={setCreateData} 
            onSubmit={handleCreatePackage}
            onCancel={() => { setShowCreateModal(false); resetCreateForm(); }}
            allDoctors={allDoctors}
            selectedDoctors={selectedDoctors}
            setSelectedDoctors={setSelectedDoctors}
            specialtyOptions={specialtyOptions}
            selectedSpecialtyFilter={selectedSpecialtyFilter}
            setSelectedSpecialtyFilter={setSelectedSpecialtyFilter}
            filteredDoctors={filteredDoctors}
            selectAllFilteredDoctors={selectAllFilteredDoctors}
            imageUploadTab={imageUploadTab}
            setImageUploadTab={setImageUploadTab}
            featureInput={featureInput}
            setFeatureInput={setFeatureInput}
            handleAddFeature={() => {
              if (!featureInput.trim()) return;
              setCreateData(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }));
              setFeatureInput('');
            }}
            handleRemoveFeature={(idx) => setCreateData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }))}
          />
        </ModalWrapper>
      )}
    </div>
  );
};

const PackageForm = ({ 
  data, setData, onSubmit, onCancel, isEdit, allDoctors, selectedDoctors, setSelectedDoctors,
  specialtyOptions, selectedSpecialtyFilter, setSelectedSpecialtyFilter, filteredDoctors, selectAllFilteredDoctors,
  imageUploadTab, setImageUploadTab, featureInput, setFeatureInput,
  handleAddFeature, handleRemoveFeature
}) => {
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = String(value).replace(/\D/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseCurrency = (value) => {
    if (!value) return '';
    return String(value).replace(/\./g, '').replace(/\D/g, '');
  };

  const handlePriceChange = (event) => {
    const numericValue = parseCurrency(event.target.value);
    setData({ ...data, price: numericValue });
  };

  const handleSpecialtyFilterChange = (selected) => {
    setSelectedSpecialtyFilter(selected || []);
  };

  const handleDoctorSelectChange = (selected) => {
    setSelectedDoctors(selected || []);
  };

  return (
    <div className="cpm-form">
      <div className="cpm-form-row">
        <div className="cpm-form-group full">
          <label>Tên gói <span className="cpm-req">*</span></label>
          <input className="cpm-input" value={data.package_name} onChange={e => setData({ ...data, package_name: e.target.value })} placeholder="Ví dụ: Tư vấn Online" />
        </div>
        <div className="cpm-form-group full">
          <label>Mô tả</label>
          <textarea className="cpm-input cpm-textarea" value={data.description} onChange={e => setData({ ...data, description: e.target.value })} rows="2" />
        </div>
      </div>

      {/* Ảnh đại diện */}
      <div className="cpm-form-row">
        <div className="cpm-form-group full">
          <label>Ảnh đại diện</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setImageUploadTab('url')}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                background: imageUploadTab === 'url' ? '#0ea5a4' : '#f1f5f9',
                color: imageUploadTab === 'url' ? '#fff' : '#475569',
                border: '1px solid #e2e8f0', fontWeight: 600
              }}
            >🔗 URL</button>
            <button
              type="button"
              onClick={() => setImageUploadTab('file')}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                background: imageUploadTab === 'file' ? '#0ea5a4' : '#f1f5f9',
                color: imageUploadTab === 'file' ? '#fff' : '#475569',
                border: '1px solid #e2e8f0', fontWeight: 600
              }}
            >📁 Tải lên</button>
          </div>
          {imageUploadTab === 'url' ? (
            <input
              className="cpm-input"
              type="text"
              placeholder="https://..."
              value={data.image_url || ''}
              onChange={e => setData({ ...data, image_url: e.target.value })}
            />
          ) : (
            <div
              onClick={() => document.getElementById('pkg-img-upload').click()}
              style={{
                border: '2px dashed #e2e8f0', borderRadius: 10, padding: 16,
                textAlign: 'center', cursor: 'pointer', background: '#fafbfc'
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Click để chọn ảnh</p>
              <input
                id="pkg-img-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append('image', file);
                  try {
                    const res = await axios.post(
                      `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/upload/image`,
                      fd, { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                    setData({ ...data, image_url: res.data.url });
                  } catch {
                    alert('Upload ảnh thất bại');
                  }
                }}
              />
            </div>
          )}
          {data.image_url && (
            <img
              src={data.image_url} alt="preview"
              style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8, marginTop: 8, border: '1px solid #e2e8f0' }}
            />
          )}
        </div>
      </div>

      {/* Tính năng nổi bật */}
      <div className="cpm-form-row">
        <div className="cpm-form-group full">
          <label>Tính năng nổi bật</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="cpm-input"
              type="text"
              placeholder="VD: Chat 24/7, Hỗ trợ tài liệu..."
              value={featureInput}
              onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); }}}
            />
            <button
              type="button"
              className="cpm-btn cpm-btn-primary"
              onClick={handleAddFeature}
              style={{ whiteSpace: 'nowrap' }}
            >+ Thêm</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {(data.features || []).map((f, i) => (
              <span key={i} style={{
                background: '#e0f7f7', color: '#0d8f8e',
                padding: '3px 10px', borderRadius: 20, fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 5
              }}>
                {f}
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0d8f8e', fontWeight: 700, fontSize: 14 }}
                >×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="cpm-form-row three-col">
        <div className="cpm-form-group">
          <label>Hình thức <span className="cpm-req">*</span></label>
          <select className="cpm-select" value={data.package_type} onChange={e => setData({ ...data, package_type: e.target.value })}>
            <option value="chat">Chat</option>
            <option value="video">Video Call</option>
          </select>
        </div>
        <div className="cpm-form-group">
          <label>Thời lượng (phút) <span className="cpm-req">*</span></label>
          <input type="number" className="cpm-input" value={data.duration_minutes} onChange={e => setData({ ...data, duration_minutes: e.target.value })} min="1" />
        </div>
        <div className="cpm-form-group">
          <label>Giá (VNĐ)</label>
          <div className="cpm-price-input-group">
            <input type="text" className="cpm-input" value={formatCurrency(data.price)} onChange={handlePriceChange} placeholder="0" />
            <span className="cpm-price-display">VNĐ</span>
          </div>
        </div>
      </div>

      {specialtyOptions.length > 0 && (
        <div className="cpm-form-group full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <label><FaFilter style={{ marginRight: '8px', color: '#22c55e' }} />Lọc bác sĩ theo chuyên khoa</label>
            {selectedSpecialtyFilter.length > 0 && <span className="cpm-text-muted" style={{ fontSize: '12px' }}>{selectedSpecialtyFilter.length} chuyên khoa</span>}
          </div>
          <Select isMulti options={specialtyOptions} value={selectedSpecialtyFilter} onChange={handleSpecialtyFilterChange} placeholder="Chọn chuyên khoa để lọc bác sĩ..." noOptionsMessage={() => 'Không tìm thấy chuyên khoa'} className="cpm-react-select" classNamePrefix="cpm-select" styles={{ control: (base) => ({...base, minHeight: '42px', borderColor: '#d1d5db', '&:hover': { borderColor: '#22c55e' } }), multiValue: (base) => ({...base, backgroundColor: '#e0f2fe', borderRadius: '6px' }), multiValueLabel: (base) => ({...base, color: '#0c4a6e', fontWeight: '500' }), multiValueRemove: (base) => ({...base, color: '#0284c7', ':hover': { backgroundColor: '#bae6fd', color: '#0369a1' } }) }} />
          <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>Chọn chuyên khoa để lọc danh sách bác sĩ bên dưới</small>
        </div>
      )}

      {filteredDoctors.length > 0 && (
        <div className="cpm-form-group full" style={{ marginTop: '-8px', marginBottom: '8px' }}>
          <button type="button" className="cpm-btn cpm-btn-secondary" onClick={selectAllFilteredDoctors} style={{padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <FaUsers />{selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0 ? 'Bỏ chọn tất cả' : `Chọn tất cả đã lọc (${filteredDoctors.length} bác sĩ)`}
          </button>
        </div>
      )}

      <div className="cpm-form-group full">
        <label><FaUserMd style={{ marginRight: '8px', color: '#22c55e' }} />Chọn bác sĩ thực hiện</label>
        <Select isMulti options={filteredDoctors} value={selectedDoctors} onChange={handleDoctorSelectChange} placeholder={filteredDoctors.length > 0 ? 'Chọn bác sĩ...' : 'Không có bác sĩ phù hợp'} noOptionsMessage={() => 'Không tìm thấy bác sĩ'} className="cpm-react-select" classNamePrefix="cpm-select" isDisabled={filteredDoctors.length === 0} styles={{ control: (base) => ({...base, minHeight: '42px', borderColor: '#d1d5db', '&:hover': { borderColor: '#22c55e'} }), multiValue: (base) => ({...base, backgroundColor: '#dcfce7', borderRadius: '6px' }), multiValueLabel: (base) => ({...base, color: '#14532d', fontWeight: '500' }), multiValueRemove: (base) => ({...base, color: '#16a34a', ':hover': { backgroundColor: '#bbf7d0', color: '#15803d' } }) }} />
        <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>{filteredDoctors.length > 0 ? 'Nếu không chọn, tất cả bác sĩ đều có thể thực hiện dịch vụ này' : 'Vui lòng chọn chuyên khoa để lọc bác sĩ'}</small>
      </div>

      <div className="cpm-modal-footer">
        <button className="cpm-btn cpm-btn-secondary" onClick={onCancel}><FaTimes/> Hủy</button>
        <button className="cpm-btn cpm-btn-primary" onClick={onSubmit}><FaSave/> Lưu</button>
      </div>
    </div>
  );
};

const ModalWrapper = ({ title, children, onClose }) => (
  <div className="cpm-modal-overlay" onClick={onClose}>
    <div className="cpm-modal-box" onClick={e => e.stopPropagation()}>
      <div className="cpm-modal-header">
        <h3>{title}</h3>
        <button onClick={onClose}><FaTimes /></button>
      </div>
      <div className="cpm-modal-body">{children}</div>
    </div>
  </div>
);

export default ConsultationPackageManagementPage;
// client/src/components/service/ServiceModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import serviceService from '../../services/serviceService';
import serviceCategoryService from '../../services/serviceCategoryService';
import specialtyService from '../../services/specialtyService';
import userService from '../../services/userService';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { 
  FaSave, 
  FaTimes, 
  FaInfoCircle, 
  FaImage,
  FaStethoscope,
  FaUserMd,
  FaFilter
} from 'react-icons/fa';
import './ServiceModal.css';

const ServiceModal = ({ isOpen, onClose, serviceId, onSuccess }) => {
  const isEditMode = Boolean(serviceId);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    specialty_id: '',
    price: '',
    duration: '',
    short_description: '',
    detailed_content: '',
    image_url: '',
    allow_doctor_choice: true,
    status: 'active',
    user_ids: []
  });

  const [categories, setCategories] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState('url');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState([]);

  const formatCurrency = (value) => {
    if (!value) return '';
    const numericValue = value.toString().replace(/\D/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseCurrency = (value) => {
    if (!value) return '';
    return value.toString().replace(/\./g, '');
  };

  useEffect(() => {
    if (!isOpen) return;

    setFormData({
      name: '',
      category_id: '',
      specialty_id: '',
      price: '',
      duration: '',
      short_description: '',
      detailed_content: '',
      image_url: '',
      allow_doctor_choice: true,
      status: 'active',
      user_ids: []
    });
    setSelectedDoctors([]);
    setSelectedSpecialtyFilter([]);
    setErrors({});
    setImagePreview('');
    setUploadMode('url');
    setLoading(true);

    const loadDependencies = async () => {
      try {
        const catRes = await serviceCategoryService.getAdminServiceCategories();
        if (catRes.data.success) {
          setCategories(catRes.data.data || []);
        }

        const specRes = await specialtyService.getPublicSpecialties();
        if (specRes.data.success) {
          setSpecialties(specRes.data.specialties || []);
        }

        // === BẮT ĐẦU SỬA LỖI ===

        // SỬA: Gọi đúng endpoint /api/users/doctors/public
        // Endpoint này được chứng minh là hoạt động ở file DoctorsListPage.js
        // Chúng ta dùng axios vì DoctorsListPage cũng dùng (và nó trả về data đúng)
        const docRes = await axios.get('http://localhost:3001/api/users/doctors/public');
        
        let doctorOptions = [];
        if (docRes.data.success) {
          // Endpoint /api/users/doctors/public trả về { success: true, doctors: [...] }
          const rawDoctors = docRes.data.doctors || []; 
          
          doctorOptions = rawDoctors.map(doc => {
            // Endpoint này trả về cấu trúc phẳng, nên ta đọc trực tiếp
            const specialtyId = doc.specialty_id || null;
            let specialtyName = doc.specialty_name || '';
            if (specialtyName === 'Chưa phân chuyên khoa') {
              specialtyName = '';
            }
            
            return {
              value: doc.id, // Lấy doc.id (chính là user_id)
              label: `BS. ${doc.full_name}${specialtyName ? ` - ${specialtyName}` : ''}`,
              specialtyId: specialtyId, // <-- Giờ sẽ có giá trị đúng (ví dụ: "5")
              specialtyName: specialtyName
            };
          });
          
          setAllDoctors(doctorOptions);
          setFilteredDoctors(doctorOptions);
        }

        if (isEditMode && serviceId) {
          const serviceRes = await serviceService.getServiceById(serviceId);
          
          if (serviceRes.data.success) {
            const service = serviceRes.data.data;

            let selectedDoctorOptions = [];
            if (service.doctors && Array.isArray(service.doctors) && service.doctors.length > 0) {
              selectedDoctorOptions = service.doctors.map(d => ({
                value: d.user.id,
                label: (() => {
                let specName = d.specialty?.name || '';
                if (specName === 'Chưa phân chuyên khoa') {
                  specName = '';
                }
                return `BS. ${d.user.full_name}${specName ? ` - ${specName}` : ''}`;
              })(),
                specialtyId: d.specialty?.id || null
              }));
            }

            setFormData({
              name: service.name || '',
              category_id: service.category_id || '',
              specialty_id: service.specialty_id || '',
              price: service.price || '',
              duration: service.duration || '',
              short_description: service.short_description || '',
              detailed_content: service.detailed_content || '',
              image_url: service.image_url || '',
              allow_doctor_choice: service.allow_doctor_choice !== undefined ? service.allow_doctor_choice : true,
              status: service.status || 'active',
              user_ids: selectedDoctorOptions.map(d => d.value)
            });
            setSelectedDoctors(selectedDoctorOptions);
            setImagePreview(service.image_url || '');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        toast.error('Không thể tải dữ liệu. Vui lòng thử lại.');
        setLoading(false);
      }
    };

    loadDependencies();
  }, [isOpen, serviceId, isEditMode]);

  useEffect(() => {
    if (selectedSpecialtyFilter.length === 0) {
      setFilteredDoctors(allDoctors);
    } else {
      // 1. Lấy danh sách ID đã chọn dưới dạng CHUỖI
      const selectedIds = selectedSpecialtyFilter.map(f => String(f.value));
      
      const filtered = allDoctors.filter(doc => {
        // 2. Kiểm tra cẩn thận null hoặc undefined
        if (doc.specialtyId === null || doc.specialtyId === undefined) {
          return false;
        }
        
        // 3. So sánh ID của bác sĩ (cũng dưới dạng CHUỖI)
        return selectedIds.includes(String(doc.specialtyId));
      });
      
      setFilteredDoctors(filtered);
    }
  }, [selectedSpecialtyFilter, allDoctors]);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Tên dịch vụ là bắt buộc';
        else if (value.trim().length < 3) error = 'Tên phải có ít nhất 3 ký tự';
        break;
      case 'category_id':
        if (!value) error = 'Vui lòng chọn danh mục';
        break;
      case 'price':
        const numericPrice = parseCurrency(value);
        if (!numericPrice) error = 'Giá là bắt buộc';
        else if (isNaN(numericPrice) || parseInt(numericPrice) < 0) error = 'Giá phải >= 0';
        break;
      case 'duration':
        if (!value) error = 'Thời lượng là bắt buộc';
        else if (isNaN(value) || parseInt(value) < 1) error = 'Thời lượng >= 1 phút';
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'price') {
      const numericValue = parseCurrency(value);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      const error = validateField(name, numericValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSpecialtyFilterChange = (selected) => {
    setSelectedSpecialtyFilter(selected || []);
  };

  const handleDoctorSelectChange = (selected) => {
    setSelectedDoctors(selected || []);
    setFormData(prev => ({
      ...prev,
      user_ids: (selected || []).map(d => d.value)
    }));
  };

  const selectAllFilteredDoctors = () => {
    if (selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0) {
      setSelectedDoctors([]);
      setFormData(prev => ({ ...prev, user_ids: [] }));
    } else {
      setSelectedDoctors(filteredDoctors);
      setFormData(prev => ({
        ...prev,
        user_ids: filteredDoctors.map(d => d.value)
      }));
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước file không được vượt quá 5MB');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      
      await handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      setUploading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch('http://localhost:3001/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, image_url: data.url }));
        setImagePreview(data.url);
        setSelectedImage(null);
        toast.success('✅ Upload ảnh thành công!');
      } else {
        toast.error(data.message || 'Upload ảnh thất bại');
      }
    } catch (error) {
      console.error('Error during upload:', error);
      toast.error(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect({ target: { files: [file] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_url: '' }));
    setSelectedImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    ['name', 'category_id', 'price', 'duration'].forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      const submitData = {
        ...formData,
        price: parseCurrency(formData.price),
        user_ids: formData.user_ids.length > 0 ? formData.user_ids : null
      };

      if (isEditMode) {
        await serviceService.updateService(serviceId, submitData);
        toast.success('✅ Cập nhật dịch vụ thành công!', {
          position: 'bottom-right',
          autoClose: 3000
        });
      } else {
        await serviceService.createService(submitData);
        toast.success('✅ Tạo dịch vụ mới thành công!', {
          position: 'bottom-right',
          autoClose: 3000
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra', {
        position: 'bottom-right'
      });
    }
  };

  if (!isOpen) return null;

  const specialtyOptions = specialties.map(spec => ({
    value: spec.id,
    label: spec.name
  }));

  return (
    <div className="service-modal-overlay" onClick={onClose}>
      <div className="service-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="service-modal-header">
          <h2>
            <FaUserMd />
            {isEditMode ? 'Chỉnh sửa Dịch vụ' : 'Tạo Dịch vụ mới'}
          </h2>
          <button onClick={onClose} className="service-modal-close-btn">
            <FaTimes />
          </button>
        </div>

        <div className="service-modal-body">
          {loading ? (
            <div className="service-modal-loading">
              <div className="service-modal-spinner"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="service-modal-form">
              <div className="service-modal-section">
                <h3 className="service-modal-section-title">
                  <FaInfoCircle />
                  Thông tin cơ bản
                </h3>

                <div className="service-modal-field">
                  <label htmlFor="name">
                    Tên dịch vụ <span className="service-modal-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="VD: Siêu âm tim Doppler màu"
                    className={errors.name ? 'service-modal-error' : ''}
                  />
                  {errors.name && <span className="service-modal-error-text">{errors.name}</span>}
                </div>

                <div className="service-modal-row">
                  <div className="service-modal-field">
                    <label htmlFor="category_id">
                      Danh mục <span className="service-modal-required">*</span>
                    </label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleSelectChange}
                      className={errors.category_id ? 'service-modal-error' : ''}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.category_id && <span className="service-modal-error-text">{errors.category_id}</span>}
                  </div>

                  <div className="service-modal-field">
                    <label htmlFor="specialty_id">Chuyên khoa của dịch vụ</label>
                    <select
                      id="specialty_id"
                      name="specialty_id"
                      value={formData.specialty_id}
                      onChange={handleSelectChange}
                    >
                      <option value="">-- Không chọn --</option>
                      {specialties.map(spec => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="service-modal-row">
                  <div className="service-modal-field">
                    <label htmlFor="price">
                      Giá <span className="service-modal-required">*</span>
                    </label>
                    <div className="service-modal-price-wrapper">
                      <input
                        type="text"
                        id="price"
                        name="price"
                        value={formatCurrency(formData.price)}
                        onChange={handleChange}
                        placeholder="500.000"
                        className={errors.price ? 'service-modal-error' : ''}
                      />
                      <span className="service-modal-price-currency">VNĐ</span>
                    </div>
                    {errors.price && <span className="service-modal-error-text">{errors.price}</span>}
                  </div>

                  <div className="service-modal-field">
                    <label htmlFor="duration">
                      Thời lượng <span className="service-modal-required">*</span>
                    </label>
                    <div className="service-modal-price-wrapper">
                      <input
                        type="number"
                        id="duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        min="1"
                        placeholder="30"
                        className={errors.duration ? 'service-modal-error' : ''}
                      />
                      <span className="service-modal-price-currency">phút</span>
                    </div>
                    {errors.duration && <span className="service-modal-error-text">{errors.duration}</span>}
                  </div>
                </div>

                <div className="service-modal-field">
                  <label htmlFor="short_description">Mô tả ngắn</label>
                  <textarea
                    id="short_description"
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleChange}
                    placeholder="Mô tả ngắn gọn về dịch vụ..."
                    rows="2"
                  />
                </div>

                <div className="service-modal-field">
                  <label htmlFor="detailed_content">Nội dung chi tiết</label>
                  <textarea
                    id="detailed_content"
                    name="detailed_content"
                    value={formData.detailed_content}
                    onChange={handleChange}
                    placeholder="Nội dung chi tiết về dịch vụ..."
                    rows="3"
                  />
                </div>

                <div className="service-modal-field">
                  <label>Hình ảnh</label>
                  <div className="service-modal-image-upload-group">
                    <div className="service-modal-upload-tabs">
                      <button
                        type="button"
                        className={`service-modal-upload-tab ${uploadMode === 'url' ? 'service-modal-active' : ''}`}
                        onClick={() => setUploadMode('url')}
                      >
                        URL Link
                      </button>
                      <button
                        type="button"
                        className={`service-modal-upload-tab ${uploadMode === 'file' ? 'service-modal-active' : ''}`}
                        onClick={() => setUploadMode('file')}
                      >
                        <FaImage /> Upload File
                      </button>
                    </div>

                    {uploadMode === 'url' ? (
                      <input
                        type="url"
                        name="image_url"
                        value={formData.image_url}
                        onChange={handleChange}
                        placeholder="https://example.com/image.jpg"
                        className="service-modal-input-url"
                      />
                    ) : (
                      <div>
                        <div 
                          className={`service-modal-upload-area ${uploading ? 'service-modal-uploading' : ''}`}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onClick={() => document.getElementById('serviceFileInput').click()}
                        >
                          <FaImage className="service-modal-upload-icon" />
                          <p className="service-modal-upload-text">
                            {uploading ? 'Đang upload...' : 'Kéo thả ảnh vào đây hoặc click để chọn'}
                          </p>
                          <p className="service-modal-upload-hint">PNG, JPG, JPEG (tối đa 5MB)</p>
                        </div>
                        <input
                          type="file"
                          id="serviceFileInput"
                          className="service-modal-file-input"
                          accept="image/*"
                          onChange={handleFileSelect}
                        />
                      </div>
                    )}

                    {(formData.image_url || imagePreview) && (
                      <div className="service-modal-image-preview">
                        <img 
                          src={imagePreview || formData.image_url} 
                          alt="Preview" 
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/200x120?text=Invalid+URL';
                          }}
                        />
                        <button
                          type="button"
                          className="service-modal-btn-remove-image"
                          onClick={handleRemoveImage}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="service-modal-section">
                <h3 className="service-modal-section-title">
                  <FaStethoscope />
                  Cấu hình bác sĩ
                </h3>

                {specialties.length > 0 && (
                  <div className="service-modal-field service-modal-specialty-filter-field">
                    <div className="service-modal-specialty-header">
                      <label>
                        <FaFilter />
                        Lọc bác sĩ theo chuyên khoa
                      </label>
                      {selectedSpecialtyFilter.length > 0 && (
                        <span className="service-modal-filter-count">
                          {selectedSpecialtyFilter.length} chuyên khoa
                        </span>
                      )}
                    </div>
                    <Select
                      isMulti
                      options={specialtyOptions}
                      value={selectedSpecialtyFilter}
                      onChange={handleSpecialtyFilterChange}
                      placeholder="Chọn chuyên khoa để lọc bác sĩ..."
                      className="service-modal-select"
                      classNamePrefix="select"
                      noOptionsMessage={() => "Không tìm thấy chuyên khoa"}
                    />
                    <span className="service-modal-helper">
                      <FaInfoCircle />
                      Chọn chuyên khoa để lọc danh sách bác sĩ bên dưới
                    </span>
                  </div>
                )}

                <div className="service-modal-field">
                  <div className="service-modal-doctor-header">
                    <label>
                      <FaUserMd />
                      Bác sĩ phụ trách {filteredDoctors.length > 0 && `(${filteredDoctors.length})`}
                    </label>
                    <button
                      type="button"
                      className="service-modal-select-all-btn"
                      onClick={selectAllFilteredDoctors}
                      disabled={filteredDoctors.length === 0}
                    >
                      {selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>
                  <Select
                    isMulti
                    options={filteredDoctors}
                    value={selectedDoctors}
                    onChange={handleDoctorSelectChange}
                    placeholder={filteredDoctors.length > 0 ? "Chọn bác sĩ..." : "Không có bác sĩ phù hợp"}
                    className="service-modal-select"
                    classNamePrefix="select"
                    noOptionsMessage={() => "Không tìm thấy bác sĩ"}
                    isDisabled={filteredDoctors.length === 0}
                  />
                  <span className="service-modal-helper">
                    <FaInfoCircle />
                    {filteredDoctors.length > 0 
                      ? "Chỉ định các bác sĩ có thể thực hiện dịch vụ này. (Nếu để trống = Không chọn bác sĩ nào)"
                      : "Vui lòng điều chỉnh bộ lọc chuyên khoa"
                    }
                  </span>
                </div>

                <div className="service-modal-toggle">
                  <div className="service-modal-toggle-wrapper">
                    <label className="service-modal-toggle-label">
                      <FaUserMd />
                      Cho phép bệnh nhân chọn bác sĩ
                    </label>
                    <label className="service-modal-switch">
                      <input
                        type="checkbox"
                        checked={formData.allow_doctor_choice}
                        onChange={(e) => setFormData(prev => ({ ...prev, allow_doctor_choice: e.target.checked }))}
                      />
                      <span className="service-modal-slider"></span>
                    </label>
                  </div>
                  <p className="service-modal-toggle-helper">
                    Cho phép bệnh nhân tự chọn bác sĩ khi đặt lịch
                  </p>
                </div>

                <div className="service-modal-field">
                  <label>Trạng thái</label>
                  <div className="service-modal-radio-group">
                    <label className="service-modal-radio">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={handleChange}
                      />
                      <span>Hoạt động</span>
                    </label>
                    <label className="service-modal-radio">
                      <input
                        type="radio"
                        name="status"
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={handleChange}
                      />
                      <span>Tạm ngưng</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="service-modal-footer">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="service-modal-btn service-modal-btn-cancel"
                >
                  <FaTimes />
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="service-modal-btn service-modal-btn-primary"
                  disabled={uploading}
                >
                  <FaSave />
                  {uploading ? 'Đang upload...' : (isEditMode ? 'Cập nhật' : 'Tạo mới')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceModal;
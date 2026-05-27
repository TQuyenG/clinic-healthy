// client/src/components/service/ServiceForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import serviceService from '../../services/serviceService';
import serviceCategoryService from '../../services/serviceCategoryService';
import userService from '../../services/userService';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { FaSave, FaArrowLeft, FaTimes, FaInfoCircle } from 'react-icons/fa';
import './ServiceForm.css';

const ServiceForm = () => {
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: '',
        duration: '',
        short_description: '',
        detailed_content: '',
        image_url: '',
        allow_doctor_choice: true,
        status: 'active',
        doctor_ids: []
    });

    const [categories, setCategories] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [catRes, docRes] = await Promise.all([
                    serviceCategoryService.getAdminServiceCategories(),
                    userService.getUsersByRole('doctor')
                ]);

                if (catRes.data.success) {
                    setCategories(catRes.data.data);
                }

                if (docRes.data.success) {
                    const rawDoctors = docRes.data.users || docRes.data.data || [];
                    const doctorOptions = rawDoctors
                        .map(doc => {
                            const doctorInfo = doc.Doctor || doc.doctorInfo;
                            const doctorId = doctorInfo?.id;
                            const specialtyName = doctorInfo?.Specialty?.name;

                            if (!doctorId) {
                                return {
                                    value: doc.id,
                                    label: `BS. ${doc.full_name}`,
                                    isUserIdFallback: true
                                };
                            }

                            return {
                                value: doctorId,
                                label: `BS. ${doc.full_name}${specialtyName ? ` - ${specialtyName}` : ''}`
                            };
                        })
                        .filter(opt => opt !== null);

                    setDoctors(doctorOptions);
                }

                if (isEditMode) {
                    const serviceRes = await serviceService.getServiceById(id);
                    if (serviceRes.data.success) {
                        const service = serviceRes.data.data;
                        setFormData({
                            name: service.name || '',
                            category_id: service.category_id || '',
                            price: service.price || '',
                            duration: service.duration || '',
                            short_description: service.short_description || '',
                            detailed_content: service.detailed_content || '',
                            image_url: service.image_url || '',
                            allow_doctor_choice: service.allow_doctor_choice !== undefined ? service.allow_doctor_choice : true,
                            status: service.status || 'active',
                            doctor_ids: []
                        });

                        if (service.doctors && service.doctors.length > 0) {
                            const selectedDoctorOptions = service.doctors.map(d => ({
                                value: d.id,
                                label: `BS. ${d.User?.full_name || 'N/A'}`
                            }));
                            setSelectedDoctors(selectedDoctorOptions);
                            setFormData(prev => ({
                                ...prev,
                                doctor_ids: service.doctors.map(d => d.id)
                            }));
                        }
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error('Error fetching dependencies:', err);
                toast.error('Không thể tải dữ liệu. Vui lòng thử lại.');
                setLoading(false);
            }
        };

        fetchDependencies();
    }, [id, isEditMode]);

    const validateField = (name, value) => {
        let error = '';

        switch (name) {
            case 'name':
                if (!value.trim()) {
                    error = 'Tên dịch vụ là bắt buộc';
                } else if (value.trim().length < 3) {
                    error = 'Tên dịch vụ phải có ít nhất 3 ký tự';
                } else if (value.trim().length > 255) {
                    error = 'Tên dịch vụ không được quá 255 ký tự';
                }
                break;
            case 'category_id':
                if (!value) error = 'Vui lòng chọn danh mục';
                break;
            case 'price':
                if (!value) {
                    error = 'Giá dịch vụ là bắt buộc';
                } else if (isNaN(value) || parseInt(value) < 0) {
                    error = 'Giá phải là số >= 0';
                }
                break;
            case 'duration':
                if (!value) {
                    error = 'Thời lượng là bắt buộc';
                } else if (isNaN(value) || parseInt(value) < 1) {
                    error = 'Thời lượng phải >= 1 phút';
                }
                break;
            default:
                break;
        }

        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleToggleChange = (e) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleDoctorSelectChange = (selectedOptions) => {
        setSelectedDoctors(selectedOptions || []);

        const validDoctorIds = selectedOptions
            ? selectedOptions
                .filter(opt => !opt.isUserIdFallback)
                .map(opt => opt.value)
            : [];

        const fallbackDoctors = selectedOptions
            ? selectedOptions.filter(opt => opt.isUserIdFallback)
            : [];

        if (fallbackDoctors.length > 0) {
            const doctorNames = fallbackDoctors.map(d => d.label).join(', ');
            toast.warning(
                `⚠️ ${fallbackDoctors.length} bác sĩ không thể gán (thiếu thông tin): ${doctorNames}`,
                { autoClose: 5000 }
            );
        }

        setFormData(prev => ({ ...prev, doctor_ids: validDoctorIds }));
    };

    const validateForm = () => {
        const newErrors = {};

        newErrors.name = validateField('name', formData.name);
        newErrors.category_id = validateField('category_id', formData.category_id);
        newErrors.price = validateField('price', formData.price);
        newErrors.duration = validateField('duration', formData.duration);

        const filteredErrors = Object.fromEntries(
            Object.entries(newErrors).filter(([_, v]) => v !== '')
        );

        setErrors(filteredErrors);
        return Object.keys(filteredErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('⚠️ Vui lòng kiểm tra lại các trường bắt buộc');
            return;
        }

        try {
            if (isEditMode) {
                await serviceService.updateService(id, formData);
                toast.success('✅ Cập nhật dịch vụ thành công!');
            } else {
                await serviceService.createService(formData);
                toast.success('✅ Tạo dịch vụ mới thành công!');
            }
            navigate('/quan-ly-dich-vu');
        } catch (err) {
            console.error('Submit error:', err.response?.data || err);
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        }
    };

    if (loading) {
        return (
            <div className="service-form-container">
                <div className="loading-wrapper">
                    <div className="spinner"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="service-form-container">
            <div className="form-header">
                <div className="header-content">
                    <h1>
                        <span className="header-icon">{isEditMode ? '✏️' : '➕'}</span>
                        {isEditMode ? 'Chỉnh Sửa Dịch Vụ' : 'Tạo Dịch Vụ Mới'}
                    </h1>
                    <p className="header-subtitle">
                        {isEditMode ? 'Cập nhật thông tin dịch vụ' : 'Điền thông tin để tạo dịch vụ mới'}
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate('/quan-ly-dich-vu')}>
                    <FaArrowLeft /> Quay lại
                </button>
            </div>

            <form onSubmit={handleSubmit} className="service-form">
                {/* SECTION 1: Thông tin cơ bản */}
                <div className="form-card">
                    <div className="card-header">
                        <h2>📋 Thông Tin Cơ Bản</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    Tên Dịch Vụ <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="VD: Siêu âm tim Doppler màu"
                                    className={errors.name ? 'input-error' : ''}
                                />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                                <small className="helper-text">Tối thiểu 3 ký tự, tối đa 255 ký tự</small>
                            </div>

                            <div className="form-group">
                                <label>
                                    Danh Mục <span className="required">*</span>
                                </label>
                                <select
                                    name="category_id"
                                    value={formData.category_id}
                                    onChange={handleSelectChange}
                                    className={errors.category_id ? 'input-error' : ''}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.category_id && <span className="error-text">{errors.category_id}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>
                                    Giá Dịch Vụ (VNĐ) <span className="required">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="VD: 500000"
                                    min="0"
                                    className={errors.price ? 'input-error' : ''}
                                />
                                {errors.price && <span className="error-text">{errors.price}</span>}
                                <small className="helper-text">Nhập số tiền (VNĐ)</small>
                            </div>

                            <div className="form-group">
                                <label>
                                    Thời Lượng (phút) <span className="required">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    placeholder="VD: 30"
                                    min="1"
                                    className={errors.duration ? 'input-error' : ''}
                                />
                                {errors.duration && <span className="error-text">{errors.duration}</span>}
                                <small className="helper-text">Thời gian thực hiện dự kiến</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>URL Hình Ảnh</label>
                            <input
                                type="url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                placeholder="https://example.com/image.jpg"
                            />
                            <small className="helper-text">Link hình ảnh đại diện cho dịch vụ</small>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: Mô tả */}
                <div className="form-card">
                    <div className="card-header">
                        <h2>📝 Mô Tả Dịch Vụ</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Mô Tả Ngắn</label>
                            <textarea
                                name="short_description"
                                value={formData.short_description}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Mô tả ngắn gọn về dịch vụ (hiển thị trên danh sách)"
                            />
                            <small className="helper-text">Tối đa 200 ký tự</small>
                        </div>

                        <div className="form-group">
                            <label>Nội Dung Chi Tiết</label>
                            <textarea
                                name="detailed_content"
                                value={formData.detailed_content}
                                onChange={handleChange}
                                rows="6"
                                placeholder="Mô tả chi tiết về dịch vụ, quy trình, lưu ý..."
                            />
                            <small className="helper-text">Mô tả đầy đủ về dịch vụ</small>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: Bác sĩ và cài đặt */}
                <div className="form-card">
                    <div className="card-header">
                        <h2>👨‍⚕️ Bác Sĩ Thực Hiện</h2>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label>Chọn Bác Sĩ</label>
                            <Select
                                isMulti
                                value={selectedDoctors}
                                onChange={handleDoctorSelectChange}
                                options={doctors}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                placeholder="Tìm kiếm và chọn bác sĩ..."
                                noOptionsMessage={() => "Không tìm thấy bác sĩ"}
                            />
                            <small className="helper-text">
                                <FaInfoCircle /> Chỉ bác sĩ có thông tin đầy đủ mới được gán
                            </small>
                        </div>

                        <div className="form-group toggle-group">
                            <div className="toggle-wrapper">
                                <label className="toggle-label">
                                    Cho phép bệnh nhân tự chọn bác sĩ
                                </label>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        name="allow_doctor_choice"
                                        checked={formData.allow_doctor_choice}
                                        onChange={handleToggleChange}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <small className="helper-text">
                                Khi bật, bệnh nhân có thể chọn bác sĩ khi đặt lịch
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Trạng Thái</label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="active"
                                        checked={formData.status === 'active'}
                                        onChange={handleChange}
                                    />
                                    <span className="radio-text">
                                        <span className="status-dot status-active"></span>
                                        Hoạt động
                                    </span>
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="status"
                                        value="inactive"
                                        checked={formData.status === 'inactive'}
                                        onChange={handleChange}
                                    />
                                    <span className="radio-text">
                                        <span className="status-dot status-inactive"></span>
                                        Tạm ngưng
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FORM ACTIONS */}
                <div className="form-actions">
                    <button type="button" className="btn btn-cancel" onClick={() => navigate('/quan-ly-dich-vu')}>
                        <FaTimes /> Hủy
                    </button>
                    <button type="submit" className="btn btn-primary">
                        <FaSave /> {isEditMode ? 'Cập nhật' : 'Tạo dịch vụ'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ServiceForm;
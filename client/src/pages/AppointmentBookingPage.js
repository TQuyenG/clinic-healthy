import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import serviceService from '../services/serviceService';
import serviceCategoryService from '../services/serviceCategoryService';
import appointmentService from '../services/appointmentService';
import {
  FaCalendarAlt, FaCheckCircle, FaSpinner, FaInfoCircle, FaSun, FaMoon, FaCloudSun,
  FaExclamationTriangle, FaWallet, FaCreditCard, FaTimes, FaComments, FaStethoscope, FaArrowLeft,
  FaUserClock, FaSearch, FaLayerGroup, FaChevronRight,
  FaTag, FaPercent, FaMoneyBillWave, FaTimesCircle
} from 'react-icons/fa';
import marketingService from '../services/marketingService';
import './AppointmentBookingPage.css';
import { normalizeUserList } from '../utils/normalizeUser';

const formatTimeDiff = (milliseconds) => {
  if (milliseconds < 0) return "đã qua";
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
};

const AppointmentBookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preSelectedServiceId = searchParams.get('service');
  const restoredBookingState = location.state?.returnState?.appointmentBooking || location.state?.appointmentBookingReturnState || null;

  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(true);

  const [formData, setFormData] = useState({
    serviceId: preSelectedServiceId ? parseInt(preSelectedServiceId) : '',
    specialtyFilter: '', 
    doctorId: '',
    date: '',
    time: '',
    bookingFor: 'self',
    name: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    relationship: '',
    reason: '',
  });

  const [errors, setErrors] = useState({});
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]); 
  const [doctors, setDoctors] = useState([]);        
  const [specialtiesFromDoctors, setSpecialtiesFromDoctors] = useState([]); 
  // [CẬP NHẬT] Đổi từ slot 30 phút sang lưu danh sách các Ca (Sức chứa Offline)
  const [availableShifts, setAvailableShifts] = useState({ morning: [], afternoon: [], evening: [] });

  const [loading, setLoading] = useState({
    services: false, doctors: false, slots: false, submit: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [warningModal, setWarningModal] = useState({
  isOpen: false, type: 'warning', title: '', message: '', details: ''
});

// ✅ VOUCHER STATE
const [voucherCode,    setVoucherCode]    = useState('');
const [voucherInfo,    setVoucherInfo]    = useState(null);  // { code, name, discount_type, discount_value, max_discount_amount, promotion_id }
const [voucherLoading, setVoucherLoading] = useState(false);
const [voucherError,   setVoucherError]   = useState('');
const [myVouchers,     setMyVouchers]     = useState([]); // Lưu danh sách voucher từ Ví

  const formatDateISO = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCheckinSlotLabel = (timeStr) => {
    if (!timeStr) return '';
    const [hourStr, minuteStr] = String(timeStr).slice(0, 5).split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(timeStr).slice(0, 5);
    const startLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const endLabel = `${String((hour + 1) % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return `${startLabel} - ${endLabel}`;
  };

  const getNextThreeDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsGuest(false);
        if (userData.role === 'patient') {
          setFormData(prev => ({
            ...prev,
            bookingFor: 'self',
            name: userData.full_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            gender: userData.gender || '',
            dob: userData.dob ? userData.dob.split('T')[0] : '',
              relationship: '',
            }));
          }

          // ✅ Tải danh sách voucher từ Ví của người dùng
          marketingService.getMyVouchers()
            .then(res => {
              if (res.success) {
                // Chỉ lấy những voucher chưa dùng và áp dụng được cho dịch vụ
                const available = res.vouchers.filter(v => {
                  const p = v.Promotion || v.promotion;
                  return !v.is_used && p && (p.apply_for === 'all' || p.apply_for === 'service');
                });
                setMyVouchers(available);
              }
            })
            .catch(e => console.error('Lỗi tải ví voucher:', e));

        } catch (error) { console.error('Parse user error:', error); }
      }

      const queryName = searchParams.get('name');
    const queryPhone = searchParams.get('phone');
    const queryEmail = searchParams.get('email');
    const queryDate = searchParams.get('date');
    if (queryName || queryPhone || queryEmail || queryDate) {
      setFormData(prev => ({
        ...prev,
        name: queryName || prev.name,
        phone: queryPhone || prev.phone,
        email: queryEmail || prev.email,
        date: queryDate || prev.date,
      }));
    }
    // ✅ Đọc voucher từ URL — khi navigate từ UserPromotionPage
    const queryVoucher = searchParams.get('voucher');
    if (queryVoucher) setVoucherCode(queryVoucher.toUpperCase());

    const loadAllServices = async () => {
      try {
        setLoading(prev => ({ ...prev, services: true }));
        const [serviceResponse, categoryResponse] = await Promise.all([
          serviceService.getPublicServices({ limit: 1000 }),
          serviceCategoryService.getPublicServiceCategories()
        ]);

        const serviceData = serviceResponse.data.success ? (serviceResponse.data.data || []) : [];
        setServices(serviceData);

        if (categoryResponse?.data?.success) {
          setServiceCategories(categoryResponse.data.data || []);
        }

        if (preSelectedServiceId) handleServiceChange(preSelectedServiceId, serviceData);
        const queriedSpecialty = searchParams.get('specialty');
        if (queriedSpecialty) {
          const matchingService = serviceData.find(s => s.specialty_id === parseInt(queriedSpecialty));
          if (matchingService) handleServiceChange(matchingService.id, serviceData);
        }

        if (restoredBookingState) {
          const restoredServiceId = restoredBookingState.serviceId || preSelectedServiceId || '';
          if (restoredServiceId) {
            await handleServiceChange(restoredServiceId, serviceData);
          }

          setFormData(prev => ({
            ...prev,
            ...restoredBookingState,
            serviceId: restoredServiceId ? parseInt(restoredServiceId) : prev.serviceId,
            doctorId: restoredBookingState.doctorId ? String(restoredBookingState.doctorId) : prev.doctorId,
          }));

          if (restoredBookingState.searchTerm) setSearchTerm(restoredBookingState.searchTerm);
          if (restoredBookingState.selectedCategory) setSelectedCategory(restoredBookingState.selectedCategory);
        }
      } catch (error) {
        toast.error('Không thể tải danh sách dịch vụ');
      } finally {
        setLoading(prev => ({ ...prev, services: false }));
      }
    };
    loadAllServices();
  }, [searchParams]);

  const handleServiceChange = async (serviceId, serviceList = services) => {
    setFormData(prev => ({ ...prev, serviceId, specialtyFilter: '', doctorId: '', date: '', time: '' }));
    setErrors(prev => ({ ...prev, serviceId: null, doctorId: null }));
    setAllDoctors([]);
    setDoctors([]);
    setSpecialtiesFromDoctors([]);
    setAvailableShifts({ morning: [], afternoon: [], evening: [] });
    if (!serviceId) return;

    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      const selectedService = serviceList.find(s => s.id === parseInt(serviceId));
      let doctorsData = [];
      if (selectedService && selectedService.allow_doctor_choice) {
        // Vẫn dùng axios do API này thuộc Service, không đổi
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        const response = await axios.get(`${API_URL}/services/${serviceId}/doctors`);
        if (response.data.success) doctorsData = response.data.doctors || [];
      } else if (selectedService && !selectedService.allow_doctor_choice) {
        toast.info('Dịch vụ này sẽ tự động phân công bác sĩ.');
      }
      const normalized = normalizeUserList(doctorsData, 'doctor');
      setAllDoctors(normalized);
      setDoctors(normalized);

      const specMap = new Map();
      normalized.forEach(d => {
        if (d.specialty?.id && d.specialty?.name) {
          specMap.set(d.specialty.id, { id: d.specialty.id, name: d.specialty.name });
        }
      });
      setSpecialtiesFromDoctors(Array.from(specMap.values()));
    } catch (error) {
      toast.error('Lỗi tải danh sách bác sĩ cho dịch vụ này.');
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

  const handleSpecialtyFilter = (specId) => {
    const newFilter = formData.specialtyFilter === specId ? '' : specId;
    setFormData(prev => ({ ...prev, specialtyFilter: newFilter, doctorId: '', date: '', time: '' }));
    setAvailableShifts({ morning: [], afternoon: [], evening: [] });
    if (newFilter) {
      setDoctors(allDoctors.filter(d => d.specialty?.id === newFilter));
    } else {
      setDoctors(allDoctors);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || String(service.category_id) === String(selectedCategory);
    const keyword = searchTerm.trim().toLowerCase();
    const matchesKeyword = !keyword || [service.name, service.description, service.code]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword));
    return matchesCategory && matchesKeyword;
  });

  const selectedServiceCategoryName = serviceCategories.find(category => String(category.id) === String(selectedCategory))?.name;

  // [CẬP NHẬT] Tính toán ca khám trực tiếp theo sức chứa offline
  useEffect(() => {
    const loadSlots = async () => {
      if (!formData.doctorId || !formData.date || !formData.serviceId) {
        setAvailableShifts({ morning: [], afternoon: [], evening: [] });
        return;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(formData.date); selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setAvailableShifts({ morning: [], afternoon: [], evening: [] });
        toast.error('Không thể chọn ngày trong quá khứ.');
        return;
      }
      try {
        setLoading(prev => ({ ...prev, slots: true }));
        console.log('[LOG] Loading offline shifts for', formData.doctorId, formData.date, formData.serviceId);
        const response = await appointmentService.getAvailableSlots(formData.doctorId, formData.date, formData.serviceId, 'offline');
        if (response.data.success) {
          const rawSlots = response.data.data.raw || [];
          const grouped = { morning: [], afternoon: [], evening: [] };
          rawSlots.forEach(slot => {
            if (slot.status === 'available') {
              if (!grouped[slot.shift_name]) grouped[slot.shift_name] = [];
              grouped[slot.shift_name].push({
                time: slot.time,
                shift_name: slot.shift_name
              });
            }
          });
          setAvailableShifts(grouped);
        } else {
          setAvailableShifts({ morning: [], afternoon: [], evening: [] });
          toast.info(response.data.message || 'Hôm nay bác sĩ không có ca khám.');
        }
      } catch (error) {
        console.error('Load slots error:', error);
        setAvailableShifts({ morning: [], afternoon: [], evening: [] });
        toast.error(error.response?.data?.message || 'Lỗi tải lịch.');
      } finally {
        setLoading(prev => ({ ...prev, slots: false }));
      }
    };
    loadSlots();
  }, [formData.doctorId, formData.date, formData.serviceId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (name === 'serviceId') handleServiceChange(value);
    if (name === 'doctorId' || name === 'date') {
      setFormData(prev => ({ ...prev, time: '' }));
      setErrors(prev => ({ ...prev, time: null }));
    }
    if (name === 'bookingFor') {
      if (value === 'self' && user) {
        setFormData(prev => ({
          ...prev, name: user.full_name || '', email: user.email || '',
          phone: user.phone || '', gender: user.gender || '',
          dob: user.dob ? user.dob.split('T')[0] : '', relationship: '',
        }));
      } else {
        setFormData(prev => ({ ...prev, name: '', email: '', phone: '', gender: '', dob: '', relationship: '' }));
      }
      setErrors(prev => ({ ...prev, name: null, email: null, phone: null, dob: null }));
    }
  };

  const handleShiftSelect = (shift) => {
     // Vì là Khám Offline nên chọn ca nào cũng được, không bị khóa lố giờ
     setFormData(prev => ({ ...prev, time: shift.time }));
     setErrors(prev => ({ ...prev, time: null }));
  };

  const nextThreeDays = getNextThreeDays();
  const selectedService = services.find(s => s.id === parseInt(formData.serviceId));
  const selectedDoctor = doctors.find(d => d.id === parseInt(formData.doctorId));
  const selectedDoctorProfileCode = selectedDoctor?.code || selectedDoctor?.raw?.code || selectedDoctor?.raw?.user_code || selectedDoctor?.raw?.doctor_code;
  const selectedDoctorCardImage = selectedDoctor?.avatar_url
    ? (selectedDoctor.avatar_url.startsWith('http')
      ? selectedDoctor.avatar_url
      : `http://localhost:3001${selectedDoctor.avatar_url.startsWith('/') ? '' : '/'}${selectedDoctor.avatar_url}`)
    : require('../assets/images/avatar-default.jpg');

  // ── Tính tiền sau giảm giá ──────────────────────────────────
  const calcDiscount = (price, info) => {
    if (!info || !price) return 0;
    let discount = 0;
    if (info.discount_type === 'percentage') {
      discount = (price * info.discount_value) / 100;
      if (info.max_discount_amount > 0) discount = Math.min(discount, info.max_discount_amount);
    } else {
      discount = info.discount_value;
    }
    return Math.min(discount, price);
  };

  const finalPrice    = selectedService?.price ? (selectedService.price - calcDiscount(selectedService.price, voucherInfo)) : 0;
  const discountAmount = selectedService?.price ? calcDiscount(selectedService.price, voucherInfo) : 0;

  // ── Validate voucher realtime ───────────────────────────────
  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) { setVoucherError('Vui lòng nhập mã voucher'); return; }
    if (!formData.serviceId) { setVoucherError('Vui lòng chọn dịch vụ trước khi áp mã'); return; }

    setVoucherLoading(true);
    setVoucherError('');
    setVoucherInfo(null);

    try {
      const res = await marketingService.validateVoucher({
        code,
        apply_for: 'service',
        order_value: selectedService?.price || 0,
      });
      if (res.success && res.promotion) {
        setVoucherInfo({
          code:                 res.promotion.code,
          name:                 res.promotion.name,
          promotion_id:         res.promotion.id,
          discount_type:        res.promotion.discount_type,
          discount_value:       res.promotion.discount_value,
          max_discount_amount:  res.promotion.max_discount_amount || 0,
        });
        toast.success(`Áp mã thành công: ${res.promotion.name}`);
      } else {
        setVoucherError(res.message || 'Mã không hợp lệ');
      }
    } catch (e) {
      setVoucherError(e.response?.data?.message || 'Mã không hợp lệ hoặc đã hết hạn');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setVoucherInfo(null);
    setVoucherError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.serviceId) newErrors.serviceId = 'Vui lòng chọn dịch vụ.';
    if (!formData.doctorId) newErrors.doctorId = 'Vui lòng chọn bác sĩ.';
    if (!formData.date) newErrors.date = 'Vui lòng chọn ngày khám.';
    if (!formData.time) newErrors.time = 'Vui lòng chọn thời gian checkin.';
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên.';
    if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email.';
    if (!formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại.';
    if (!formData.dob) newErrors.dob = 'Vui lòng chọn ngày sinh.';
    if (!isGuest && formData.bookingFor === 'other' && !formData.relationship.trim()) {
      newErrors.relationship = 'Vui lòng chọn mối quan hệ.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmBooking = () => {
    if (!validateForm()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }
    // Đối với Offline, không cần check chặn lùi giờ gắt gao như Online.
    // Hiển thị thẳng modal xác nhận.
    setShowConfirmModal(true);
  };

  const handleSubmitBooking = async (paymentMethod) => {
    if (!validateForm()) return;
    try {
      setLoading(prev => ({ ...prev, submit: true }));
      setShowConfirmModal(false);
      
      const payload = {
      service_id: formData.serviceId, doctor_id: formData.doctorId,
      appointment_date: formData.date, 
      appointment_start_time: formData.time,
      appointment_type: 'offline',
      reason: formData.reason,
      payment_method: paymentMethod, booking_for: formData.bookingFor,
      relative_name: formData.bookingFor === 'other' ? formData.name : null,
      relationship: formData.relationship || null,
      guest_name: formData.name,
      guest_email: formData.email, guest_phone: formData.phone,
      guest_gender: formData.gender, guest_dob: formData.dob,
      // ✅ Truyền voucher vào booking để backend lưu và consume sau khi paid
      voucher_code:    voucherInfo?.code         || null,
      promotion_id:    voucherInfo?.promotion_id  || null,
      discount_amount: discountAmount             || 0, 
    };
      
      const response = await appointmentService.createAppointment(payload);
      
      if (response.data.success) {
        toast.success('Đặt lịch thành công! Số Ưu tiên của bạn đã được ghi nhận.');
        const appointmentData = response.data.data;
        if (response.data.data.paymentRequired && response.data.data.paymentUrl) {
          window.location.href = response.data.data.paymentUrl;
        } else {
          navigate(`/lich-hen/${appointmentData.appointment.code}`);
        }
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errorMsg = error.response?.data?.message || 'Đặt lịch thất bại';
      toast.error(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  

  const renderError = (fieldName) => {
    if (errors[fieldName]) return <small className="abp-error-text">{errors[fieldName]}</small>;
    return null;
  };

  return (
    <div className="abp-root">
      <div className="abp-container">

        {/* TOP BAR */}
        <div className="abp-topbar">
          <button className="abp-back-btn" onClick={() => navigate(-1)} title="Quay lại">
            <FaArrowLeft /> Quay lại
          </button>
          <button className="abp-switch-btn" onClick={() => navigate('/dat-lich-tu-van')} title="Đặt lịch tư vấn">
            <FaComments /> Sang trang Tư vấn Online
          </button>
        </div>

        {/* CARD */}
        <div className="abp-card">

          {/* CARD HEADER */}
          <div className="abp-card-header">
            <div className="abp-card-header-icon"><FaUserClock /></div>
            <div className="abp-card-header-text">
              <h1>Đặt Lịch Khám Dịch Vụ</h1>
              <p>Đặt lịch khám trực tiếp tại viện theo khung giờ thuận tiện</p>
            </div>
          </div>

          {/* CARD BODY — 2 CỘT */}
          <div className="abp-card-body">

            {/* === CỘT TRÁI === */}
            <div className="abp-left-col">
              <h2 className="abp-section-title">
                <FaStethoscope /> Nội dung chi tiết đặt hẹn
              </h2>

              {/* CHỌN DỊCH VỤ */}
              <div className="abp-form-group">
                <label className="abp-label">
                  Dịch vụ khám <span className="abp-required">*</span>
                </label>
                <div className="abp-filter-toolbar">
                  <div className="abp-search-box">
                    <FaSearch className="abp-search-icon" />
                    <input
                      type="text"
                      className="abp-search-input"
                      placeholder="Tìm dịch vụ, mã dịch vụ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="abp-category-scroll" aria-label="Danh mục dịch vụ">
                    <button
                      type="button"
                      className={`abp-category-card ${selectedCategory === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('all')}
                    >
                      <span className="abp-category-card-icon"><FaLayerGroup /></span>
                      <span className="abp-category-card-name">Tất cả</span>
                    </button>
                    {serviceCategories.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        className={`abp-category-card ${String(selectedCategory) === String(category.id) ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <span className="abp-category-card-icon"><FaLayerGroup /></span>
                        <span className="abp-category-card-name">{category.name}</span>
                      </button>
                    ))}
                  </div>
                  {selectedServiceCategoryName && selectedCategory !== 'all' && (
                    <small className="abp-filter-hint">Đang lọc theo danh mục {selectedServiceCategoryName}.</small>
                  )}
                </div>
                <select
                  name="serviceId"
                  className={`abp-select ${errors.serviceId ? 'error' : ''}`}
                  value={formData.serviceId}
                  onChange={handleFormChange}
                >
                  <option value="">-- Chọn dịch vụ --</option>
                  {filteredServices.length === 0 && <option value="" disabled>Không tìm thấy dịch vụ phù hợp</option>}
                  {filteredServices.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.price?.toLocaleString('vi-VN')} VNĐ)
                    </option>
                  ))}
                </select>
                {renderError('serviceId')}
              </div>

              {/* BỘ LỌC CHUYÊN KHOA — chỉ hiện sau khi đã chọn dịch vụ và có bác sĩ */}
              {formData.serviceId && specialtiesFromDoctors.length > 0 && (
                <div className="abp-form-group">
                  <label className="abp-label">Lọc theo chuyên khoa</label>
                  <div className="abp-specialty-list">
                    {specialtiesFromDoctors.map(spec => (
                      <button
                        key={spec.id}
                        type="button"
                        className={`abp-specialty-btn ${formData.specialtyFilter === spec.id ? 'active' : ''}`}
                        onClick={() => handleSpecialtyFilter(spec.id)}
                      >
                        <span className="abp-spec-name">{spec.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CHỌN BÁC SĨ */}
              <div className="abp-form-group">
                <label className="abp-label">
                  Bác sĩ <span className="abp-required">*</span>
                </label>
                <select
                  name="doctorId"
                  className={`abp-select ${errors.doctorId ? 'error' : ''}`}
                  value={formData.doctorId}
                  onChange={handleFormChange}
                  disabled={!formData.serviceId || loading.doctors}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {loading.doctors && <option>Đang tải bác sĩ...</option>}
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      BS. {doctor.full_name}{doctor.specialty?.name ? ` (${doctor.specialty.name})` : ''}
                    </option>
                  ))}
                </select>
                {renderError('doctorId')}
                {selectedDoctor && (
                  <button
                    type="button"
                    className="abp-doctor-card"
                    onClick={() => selectedDoctorProfileCode && navigate(`/bac-si/${selectedDoctorProfileCode}`, {
                      state: {
                        returnTo: location.pathname + location.search,
                        returnState: {
                          appointmentBooking: {
                            ...formData,
                            searchTerm,
                            selectedCategory
                          }
                        }
                      }
                    })}
                  >
                    <img
                      className="abp-doctor-avatar"
                      src={selectedDoctorCardImage}
                      onError={(e) => { e.target.onerror = null; e.target.src = require('../assets/images/avatar-default.jpg'); }}
                      alt={selectedDoctor.full_name}
                    />
                    <div className="abp-doctor-info">
                      <span className="abp-doctor-name">BS. {selectedDoctor.full_name}</span>
                      <span className="abp-doctor-specialty">{selectedDoctor.specialty?.name || selectedDoctor.raw?.specialty?.name || 'Chưa cập nhật chuyên khoa'}</span>
                    </div>
                    <span className="abp-doctor-cta">
                      Xem hồ sơ <FaChevronRight />
                    </span>
                  </button>
                )}
                {!selectedService?.allow_doctor_choice && formData.serviceId && (
                  <small className="abp-info-text">
                    <FaInfoCircle /> Dịch vụ này sẽ được tự động phân công bác sĩ tại quầy.
                  </small>
                )}
              </div>

              {/* CHỌN NGÀY */}
              <div className="abp-form-group">
                <label className="abp-label">
                  Thời gian checkin <span className="abp-required">*</span>
                </label>
                <div className="abp-date-tabs">
                  {nextThreeDays.map(date => (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className={`abp-date-btn ${formData.date === formatDateISO(date) ? 'active' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, date: formatDateISO(date), time: '' }));
                        setErrors(prev => ({ ...prev, date: null }));
                      }}
                    >
                      <span className="abp-date-btn-day">{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                      <strong className="abp-date-btn-num">{date.getDate()}/{date.getMonth() + 1}</strong>
                    </button>
                  ))}
                  <input
                    type="date"
                    className={`abp-date-picker-input ${errors.date ? 'error' : ''}`}
                    value={formData.date}
                    min={formatDateISO(new Date())}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, date: e.target.value, time: '' }));
                      setErrors(prev => ({ ...prev, date: null }));
                    }}
                  />
                </div>
                {renderError('date')}
              </div>

              {/* TIME SLOTS (Ca khám trực tiếp) */}
              {formData.date && (
                <div className="abp-slots-area">
                  {/* [MỚI] Dòng giải thích Ưu tiên */}
                  <div className="abp-info-text" style={{marginBottom: '14px', background: '#e3f2fd', borderColor: '#90caf9', color: '#0c4a6e'}}>
                    <FaInfoCircle size={16}/> Chọn khung thời gian checkin để hệ thống giữ chỗ và hiển thị đúng giờ lên trang chi tiết lịch hẹn.
                  </div>

                  {loading.slots ? (
                    <div className="abp-loading-slots">
                      <FaSpinner className="abp-spin" /> Đang tải lịch...
                    </div>
                  ) : (
                    <>
                      {['morning', 'afternoon', 'evening'].map(pd => (
                        availableShifts[pd]?.length > 0 && (
                          <div key={pd} className="abp-slot-section">
                            <div className="abp-slot-section-label">
                              {pd === 'morning' ? <FaSun /> : pd === 'afternoon' ? <FaCloudSun /> : <FaMoon />}
                              {pd === 'morning' ? 'Buổi sáng' : pd === 'afternoon' ? 'Buổi chiều' : 'Buổi tối'}
                            </div>
                            <div className="abp-slot-grid">
                              {availableShifts[pd].map((shift, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`abp-slot-btn ${formData.time === shift.time ? 'active' : ''}`}
                                  onClick={() => handleShiftSelect(shift)}
                                >
                                  <strong>{shift.label || formatCheckinSlotLabel(shift.time)}</strong>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                      {!availableShifts.morning.length && !availableShifts.afternoon.length && !availableShifts.evening.length && (
                        <div className="abp-no-slots">
                          <FaExclamationTriangle /> Hôm nay bác sĩ đã kín lịch hoặc không có ca trực.
                        </div>
                      )}
                      {renderError('time')}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* === CỘT PHẢI === */}
            <div className="abp-right-col">
              <h2 className="abp-section-title">
                Thông tin khách hàng
              </h2>

              {/* ĐẶT LỊCH CHO */}
              {!isGuest && (
                <div className="abp-form-group">
                  <label className="abp-label">Đặt lịch cho</label>
                  <div className="abp-for-toggle">
                    <label className={`abp-for-option ${formData.bookingFor === 'self' ? 'active' : ''}`}>
                      <input type="radio" name="bookingFor" value="self" checked={formData.bookingFor === 'self'} onChange={handleFormChange} />
                      Bản thân
                    </label>
                    <label className={`abp-for-option ${formData.bookingFor === 'other' ? 'active' : ''}`}>
                      <input type="radio" name="bookingFor" value="other" checked={formData.bookingFor === 'other'} onChange={handleFormChange} />
                      Người thân
                    </label>
                  </div>
                </div>
              )}

              {!isGuest && formData.bookingFor === 'other' && (
                <div className="abp-form-group">
                  <label className="abp-label">Quan hệ với bệnh nhân <span className="abp-required">*</span></label>
                  <select className={`abp-select ${errors.relationship ? 'error' : ''}`} name="relationship" value={formData.relationship} onChange={handleFormChange}>
                    <option value="">-- Chọn --</option>
                    <option value="Vợ/chồng">Vợ/chồng</option>
                    <option value="Con">Con</option>
                    <option value="Cha/mẹ">Cha/mẹ</option>
                    <option value="Anh/chị/em">Anh/chị/em</option>
                    <option value="Người giám hộ">Người giám hộ</option>
                    <option value="Khác">Khác</option>
                  </select>
                  {renderError('relationship')}
                </div>
              )}

              <div className="abp-row-2col">
                <div className="abp-form-group">
                  <label className="abp-label">Họ và tên <span className="abp-required">*</span></label>
                  <input
                    className={`abp-input ${errors.name ? 'error' : ''}`}
                    type="text" name="name" placeholder="Nguyễn Văn A"
                    value={formData.name} onChange={handleFormChange}
                  />
                  {renderError('name')}
                </div>
                <div className="abp-form-group">
                  <label className="abp-label">Giới tính</label>
                  <select className="abp-select" name="gender" value={formData.gender} onChange={handleFormChange}>
                    <option value="">-- Chọn --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div className="abp-row-2col">
                <div className="abp-form-group">
                  <label className="abp-label">Ngày sinh <span className="abp-required">*</span></label>
                  <input
                    className={`abp-input ${errors.dob ? 'error' : ''}`}
                    type="date" name="dob" value={formData.dob} onChange={handleFormChange}
                  />
                  {renderError('dob')}
                </div>
                <div className="abp-form-group">
                  <label className="abp-label">Số điện thoại <span className="abp-required">*</span></label>
                  <input
                    className={`abp-input ${errors.phone ? 'error' : ''}`}
                    type="tel" name="phone" placeholder="0900 000 000"
                    value={formData.phone} onChange={handleFormChange}
                  />
                  {renderError('phone')}
                </div>
              </div>

              <div className="abp-form-group">
                <label className="abp-label">Email <span className="abp-required">*</span></label>
                <input
                  className={`abp-input ${errors.email ? 'error' : ''}`}
                  type="email" name="email" placeholder="example@email.com"
                  value={formData.email} onChange={handleFormChange}
                />
                {renderError('email')}
              </div>

              <div className="abp-form-group">
                <label className="abp-label">Lý do khám (Không bắt buộc)</label>
                <textarea
                  className="abp-textarea"
                  name="reason" placeholder="Nhập lý do khám..."
                  value={formData.reason} onChange={handleFormChange}
                />
              </div>

              {/* ✅ VOUCHER BOX */}
              {formData.serviceId && (
                <div className="abp-voucher-box">
                  <div className="abp-voucher-box__label">
                    <FaTag /> Mã ưu đãi / Voucher
                  </div>
                  {!voucherInfo ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="abp-voucher-input-row">
                        <input
                          className={`abp-input abp-voucher-input ${voucherError ? 'error' : ''}`}
                          placeholder="Nhập mã voucher (VD: SUMMER30)"
                          value={voucherCode}
                          onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                        />
                        <button
                          type="button"
                          className="abp-voucher-apply-btn"
                          onClick={handleApplyVoucher}
                          disabled={voucherLoading || !voucherCode.trim()}
                        >
                          {voucherLoading ? <FaSpinner className="abp-spin" /> : 'Áp dụng'}
                        </button>
                      </div>
                      
                      {/* ✅ Dropdown chọn nhanh từ Ví */}
                      {!isGuest && myVouchers.length > 0 && (
                        <select 
                          className="abp-select" 
                          style={{ borderColor: '#93c5fd', backgroundColor: '#eff6ff', color: '#1e3a8a', cursor: 'pointer' }}
                          value="" 
                          onChange={(e) => {
                            setVoucherCode(e.target.value);
                            setVoucherError('');
                          }}
                        >
                          <option value="" disabled>🎁 Hoặc chọn nhanh mã từ Ví của bạn...</option>
                          {myVouchers.map(v => {
                            const p = v.Promotion || v.promotion;
                            const discountText = p.discount_type === 'percentage' 
                              ? `Giảm ${p.discount_value}%` 
                              : `Giảm ${Number(p.discount_value).toLocaleString('vi-VN')}đ`;
                            return (
                              <option key={p.id} value={p.code}>
                                {p.code} - {p.name} ({discountText})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="abp-voucher-applied">
                      <div className="abp-voucher-applied__info">
                        <FaCheckCircle className="abp-voucher-applied__icon" />
                        <div>
                          <span className="abp-voucher-applied__name">{voucherInfo.name}</span>
                          <span className="abp-voucher-applied__disc">
                            {voucherInfo.discount_type === 'percentage'
                              ? `Giảm ${voucherInfo.discount_value}%${voucherInfo.max_discount_amount > 0 ? ` (tối đa ${Number(voucherInfo.max_discount_amount).toLocaleString('vi-VN')}đ)` : ''}`
                              : `Giảm ${Number(voucherInfo.discount_value).toLocaleString('vi-VN')}đ`
                            }
                          </span>
                        </div>
                      </div>
                      <button type="button" className="abp-voucher-remove-btn" onClick={handleRemoveVoucher} title="Xóa mã">
                        <FaTimesCircle />
                      </button>
                    </div>
                  )}
                  {voucherError && <small className="abp-error-text">{voucherError}</small>}

                  {/* Tóm tắt tiền */}
                  {selectedService?.price > 0 && (
                    <div className="abp-price-summary">
                      <div className="abp-price-row">
                        <span>Giá dịch vụ</span>
                        <span>{selectedService.price.toLocaleString('vi-VN')} VNĐ</span>
                      </div>
                      {voucherInfo && discountAmount > 0 && (
                        <div className="abp-price-row abp-price-row--disc">
                          <span><FaPercent /> Giảm giá</span>
                          <span>- {discountAmount.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                      )}
                      <div className="abp-price-row abp-price-row--total">
                        <span><FaMoneyBillWave /> Tổng thanh toán</span>
                        <strong>{finalPrice.toLocaleString('vi-VN')} VNĐ</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="abp-policy-row">
                <input type="checkbox" id="terms" defaultChecked />
                <span className="abp-policy-text">
                  Tôi hiểu rằng khi đến viện tôi sẽ được gọi theo Nhóm số Ưu tiên (U).
                </span>
              </div>

              <button
                type="button"
                className="abp-submit-btn"
                onClick={handleConfirmBooking}
                disabled={loading.submit}
              >
                {loading.submit ? <FaSpinner className="abp-spin" /> : <FaCheckCircle />}
                {loading.submit ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}
              </button>
            </div>

          </div>
        </div>

        {/* MODAL XÁC NHẬN */}
        {showConfirmModal && (
          <div className="abp-modal-overlay" onClick={() => setShowConfirmModal(false)}>
            <div className="abp-modal" onClick={e => e.stopPropagation()}>
              <div className="abp-modal-header">
                <h3><FaCheckCircle style={{ color: '#3aaa6f' }} /> Xác nhận thông tin</h3>
                <button className="abp-modal-close-btn" onClick={() => setShowConfirmModal(false)}><FaTimes /></button>
              </div>
              <div className="abp-modal-body">
                <div className="abp-confirm-row"><span>Dịch vụ</span><strong>{selectedService?.name}</strong></div>
                <div className="abp-confirm-row"><span>Bác sĩ</span><strong>{selectedDoctor ? `BS. ${selectedDoctor.full_name}` : 'Sẽ được phân công'}</strong></div>
                <div className="abp-confirm-row"><span>Ngày khám</span><strong>{formData.date}</strong></div>
                <div className="abp-confirm-row"><span>Thời gian checkin</span><strong>{formatCheckinSlotLabel(formData.time)}</strong></div>
                <div className="abp-confirm-row"><span>Khách hàng</span><strong>{formData.name}</strong></div>
                {voucherInfo && discountAmount > 0 && (
                <div className="abp-confirm-row" style={{ color: '#16a34a' }}>
                  <span>🎫 Voucher ({voucherInfo.code})</span>
                  <strong>- {discountAmount.toLocaleString('vi-VN')} VNĐ</strong>
                </div>
              )}
              <div className="abp-confirm-total">
                <span>Tổng thanh toán</span>
                <strong style={{ color: voucherInfo ? '#16a34a' : undefined }}>
                  {finalPrice.toLocaleString('vi-VN')} VNĐ
                </strong>
              </div>
              <small className="abp-confirm-hint">
                Bạn có thể đặt lịch trước và chọn phương thức thanh toán sau trong trang chi tiết lịch hẹn.
              </small>
              </div>
              <div className="abp-modal-footer">
                <button className="abp-btn-secondary" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                <button className="abp-btn-primary" onClick={() => handleSubmitBooking()} disabled={loading.submit}>
                  Xác nhận đặt lịch
                </button>
              </div>
            </div>
          </div>
        )}
        

      </div>
    </div>
  );
};

export default AppointmentBookingPage;
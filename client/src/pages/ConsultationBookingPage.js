// client/src/pages/ConsultationBookingPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import { toast } from 'react-toastify';
import userService from '../services/userService';
import specialtyService from '../services/specialtyService';
import marketingService from '../services/marketingService';
import {
  FaCalendarAlt, FaUser, FaStethoscope, FaComments, FaVideo,
  FaPaperclip, FaCheckCircle, FaArrowLeft, FaSun, FaMoon, FaCloudSun,
  FaWallet, FaCreditCard, FaTimes, FaExclamationTriangle, FaSearch, FaChevronRight,
  FaTag, FaPercent, FaMoneyBillWave, FaTimesCircle
} from 'react-icons/fa';
import './ConsultationBookingPage.css';

const Icons = {
  FaCalendarAlt,
  FaUser,
  FaStethoscope,
  FaComments,
  FaVideo,
  FaPaperclip,
  FaCheckCircle,
  FaArrowLeft,
  FaSun,
  FaMoon,
  FaCloudSun,
  FaWallet,
  FaCreditCard,
  FaTimes,
  FaExclamationTriangle,
  FaSearch,
  FaChevronRight,
  FaTag,
  FaPercent,
  FaMoneyBillWave,
  FaTimesCircle,
};

const formatTimeDiff = (milliseconds) => {
  if (milliseconds < 0) return "đã qua";
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
};

const ConsultationBookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const [voucherCode, setVoucherCode] = useState(searchParams.get('voucher')?.toUpperCase() || '');
  const [voucherInfo, setVoucherInfo] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [myVouchers, setMyVouchers] = useState([]); // Danh sách voucher từ Ví

  const { doctorId, consultationType } = location.state || {};

  const [loading, setLoading] = useState({ init: true, doctor: false, slots: false, submit: false });

  const [formData, setFormData] = useState({
    doctor_id: doctorId || '',
    specialty_id: '',
    consultation_pricing_id: null,
    appointment_time: '',
    date: '',
    time: '',
    chief_complaint: '',
    attachments: [],
    bookingFor: 'self',
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob ? user.dob.split('T')[0] : '',
    gender: user?.gender || ''
  });

  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [allPackages, setAllPackages] = useState([]);
  const [availableSlots, setAvailableSlots] = useState({ morning: [], afternoon: [], evening: [] });

  const [filterType, setFilterType] = useState(consultationType || 'chat');
  const [searchTerm, setSearchTerm] = useState('');

  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [warningModal, setWarningModal] = useState({ isOpen: false, type: '', title: '', message: '', details: '' });

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const getNextThreeDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  };
  const nextThreeDays = getNextThreeDays();
  const selectedDoctorProfileCode = selectedDoctor?.code || selectedDoctor?.user_code || selectedDoctor?.doctor_code || selectedDoctor?.roleData?.code;
  const selectedDoctorCardImage = selectedDoctor?.avatar_url
    ? (selectedDoctor.avatar_url.startsWith('http')
      ? selectedDoctor.avatar_url
      : `http://localhost:3001${selectedDoctor.avatar_url.startsWith('/') ? '' : '/'}${selectedDoctor.avatar_url}`)
    : require('../assets/images/avatar-default.jpg');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSpecialties = specialties.filter(s => {
    if (!normalizedSearch) return true;
    return [s.name, s.slug].filter(Boolean).some(value => String(value).toLowerCase().includes(normalizedSearch));
  });
  const filteredDoctors = doctors.filter(d => {
    if (!normalizedSearch) return true;
    return [d.fullName, d.specialty?.name].filter(Boolean).some(value => String(value).toLowerCase().includes(normalizedSearch));
  });
  const filteredPackages = allPackages.filter(p => {
    if (p.package_type !== filterType) return false;
    if (!normalizedSearch) return true;
    return [p.package_name, p.short_description, p.description].filter(Boolean).some(value => String(value).toLowerCase().includes(normalizedSearch));
  });

  useEffect(() => {
    const restoredBookingState = location.state?.returnState?.consultationBooking || location.state?.consultationBookingReturnState || null;
    if (!restoredBookingState) return;

    setFormData(prev => ({
      ...prev,
      ...restoredBookingState,
      doctor_id: restoredBookingState.doctor_id || prev.doctor_id,
      consultation_pricing_id: restoredBookingState.consultation_pricing_id ?? prev.consultation_pricing_id,
    }));

    if (restoredBookingState.filterType) {
      setFilterType(restoredBookingState.filterType);
    }
    if (restoredBookingState.searchTerm) {
      setSearchTerm(restoredBookingState.searchTerm);
    }
  }, [location.state]);

  const renderIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.FaStethoscope;
    return <IconComponent />;
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(prev => ({ ...prev, init: true }));
      try {
        const specRes = await specialtyService.getPublicSpecialties();
        let specData = [];
        if (specRes?.data?.specialties && Array.isArray(specRes.data.specialties)) specData = specRes.data.specialties;
        else if (specRes?.data && Array.isArray(specRes.data)) specData = specRes.data;
        else if (specRes?.specialties && Array.isArray(specRes.specialties)) specData = specRes.specialties;
        else if (Array.isArray(specRes)) specData = specRes;

        setSpecialties(specData || []);

        // ✅ Load voucher từ Ví nếu đã đăng nhập
        if (user) {
          marketingService.getMyVouchers()
            .then(res => {
              if (res.success) {
                const available = res.vouchers.filter(v => {
                  const p = v.Promotion || v.promotion;
                  return !v.is_used && p && (p.apply_for === 'all' || p.apply_for === 'consultation');
                });
                setMyVouchers(available);
              }
            })
            .catch(e => console.error('Lỗi tải ví voucher:', e));
        }

        if (doctorId) {
          await loadDoctorDetails(doctorId);
        }
        // If navigated with a packageId (from ServicesPage), load public packages and preselect
        const statePackageId = location.state?.packageId;
        try {
          const pkgRes = await consultationService.getAllPublicPackages({ limit: 200 });
          const pkgData = pkgRes?.data?.data || pkgRes?.data || [];
          setAllPackages(Array.isArray(pkgData) ? pkgData : []);
          if (statePackageId) {
            setFormData(prev => ({ ...prev, consultation_pricing_id: statePackageId }));
            // Try set filter type from package if available
            const selectedPkg = (Array.isArray(pkgData) ? pkgData : []).find(p => String(p.id) === String(statePackageId));
            if (selectedPkg && selectedPkg.consultation_type) setFilterType(selectedPkg.consultation_type);
          }
        } catch (e) {
          // ignore package load errors
        }
      } catch (error) {
        console.error("Init Error:", error);
      } finally {
        setLoading(prev => ({ ...prev, init: false }));
      }
    };
    initData();
  }, [doctorId]);

  const loadDoctorDetails = async (id) => {
    setLoading(prev => ({ ...prev, doctor: true }));
    try {
      const docRes = await userService.getUserById(id);
      const docData = docRes?.data?.user;
      setSelectedDoctor(docData);

      if (docData?.roleData?.specialty?.id) {
        setFormData(prev => ({
          ...prev,
          specialty_id: docData.roleData.specialty.id,
          doctor_id: id
        }));

        const docsInSpec = await userService.getDoctorsBySpecialty(docData.roleData.specialty.id);
        const doctorsData = docsInSpec?.data?.data || [];

        const safeDoctors = doctorsData.map(d => ({
          userId: d.user_id || d.user?.id || d.id,
          fullName: d.user?.full_name || d.full_name || 'Không tên'
        }));
        const uniqueDoctors = Array.from(new Map(safeDoctors.map(item => [item.userId, item])).values());
        setDoctors(uniqueDoctors);
      }

      const pkgRes = await consultationService.getDoctorPricing(id);
      const pkgData = pkgRes?.data?.data || pkgRes?.data || [];
      setAllPackages(Array.isArray(pkgData) ? pkgData : []);
    } catch (e) {
      setAllPackages([]);
    } finally {
      setLoading(prev => ({ ...prev, doctor: false }));
    }
  };

  const handleSpecialtyChange = async (specId) => {
    // Nếu click vào chuyên khoa đang active thì bỏ chọn
    const newSpecId = formData.specialty_id === specId ? '' : specId;
    setFormData(prev => ({
      ...prev,
      specialty_id: newSpecId,
      doctor_id: '',
      consultation_pricing_id: null,
      time: ''
    }));
    setSelectedDoctor(null);
    setAllPackages([]);
    setAvailableSlots({ morning: [], afternoon: [], evening: [] });
    setErrors(prev => ({ ...prev, specialty_id: '', doctor_id: '' }));

    if (!newSpecId) {
      setDoctors([]);
      return;
    }

    try {
      setLoading(prev => ({ ...prev, doctor: true }));
      const response = await userService.getDoctorsBySpecialty(newSpecId);
      const doctorsData = response?.data?.data || [];

      const safeDoctors = doctorsData.map(d => ({
        userId: d.user_id || d.user?.id || d.id,
        fullName: d.user?.full_name || d.full_name || 'Không tên'
      }));
      const uniqueDoctors = Array.from(new Map(safeDoctors.map(item => [item.userId, item])).values());
      setDoctors(uniqueDoctors);
    } catch (error) {
      setDoctors([]);
    } finally {
      setLoading(prev => ({ ...prev, doctor: false }));
    }
  };

  const handleDoctorSelect = (e) => {
    const newId = e.target.value;
    setFormData(prev => ({ ...prev, doctor_id: newId, consultation_pricing_id: null, date: '', time: '' }));
    if (newId) {
      loadDoctorDetails(newId);
    } else {
      setSelectedDoctor(null);
      setAllPackages([]);
    }
  };

  useEffect(() => {
    if (formData.doctor_id && formData.date && formData.consultation_pricing_id) {
      const loadSlots = async () => {
        setLoading(prev => ({ ...prev, slots: true }));
        try {
          const res = await consultationService.getAvailableSlots(
            formData.doctor_id,
            formData.date,
            formData.consultation_pricing_id
          );
          if (res?.data?.success) {
            const slots = res.data.data?.availableSlots || [];

            const normalized = (Array.isArray(slots) ? slots : []).map(s => {
              let isAvailable = true;
              if (Object.prototype.hasOwnProperty.call(s, 'isBusy')) isAvailable = !s.isBusy;
              else if (Object.prototype.hasOwnProperty.call(s, 'isAvailable')) isAvailable = !!s.isAvailable;
              else if (Object.prototype.hasOwnProperty.call(s, 'is_available')) isAvailable = !!s.is_available;
              else if (Object.prototype.hasOwnProperty.call(s, 'status')) isAvailable = s.status === 'available';
              else if (Object.prototype.hasOwnProperty.call(s, 'available')) isAvailable = !!s.available;
              return { ...s, isAvailable };
            });

            const grouped = { morning: [], afternoon: [], evening: [] };
            normalized.forEach(s => {
              const hour = parseInt((s.time || '').split(':')[0]);
              if (Number.isFinite(hour)) {
                if (hour < 12) grouped.morning.push(s);
                else if (hour < 17) grouped.afternoon.push(s);
                else grouped.evening.push(s);
              }
            });
            setAvailableSlots(grouped);
          }
        } catch (e) {
          setAvailableSlots({ morning: [], afternoon: [], evening: [] });
        } finally {
          setLoading(prev => ({ ...prev, slots: false }));
        }
      };
      loadSlots();
    }
  }, [formData.doctor_id, formData.date, formData.consultation_pricing_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'bookingFor') {
      if (value === 'self' && user) {
        setFormData(prev => ({
          ...prev, bookingFor: 'self',
          name: user.full_name, email: user.email, phone: user.phone,
          gender: user.gender, dob: user.dob ? user.dob.split('T')[0] : ''
        }));
      } else {
        setFormData(prev => ({ ...prev, bookingFor: 'other', name: '', email: '', phone: '', gender: '', dob: '' }));
      }
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.specialty_id) errs.specialty_id = 'Vui lòng chọn chuyên khoa';
    if (!formData.doctor_id) errs.doctor_id = 'Vui lòng chọn bác sĩ';
    if (!formData.consultation_pricing_id) errs.consultation_pricing_id = 'Vui lòng chọn gói tư vấn';
    if (!formData.date) errs.date = 'Vui lòng chọn ngày';
    if (!formData.time) errs.time = 'Vui lòng chọn giờ';
    if (!formData.chief_complaint || formData.chief_complaint.trim() === '') errs.chief_complaint = 'Vui lòng nhập lý do khám';
    if (!formData.name) errs.name = 'Nhập họ tên';
    if (!formData.phone) errs.phone = 'Nhập số điện thoại';

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      setWarningModal({
        isOpen: true, type: 'warning', title: 'Thông tin chưa đầy đủ',
        message: errs[firstKey],
        details: 'Vui lòng điền đầy đủ thông tin bắt buộc trước khi tiếp tục.'
      });
      return false;
    }
    return true;
  };

  // ── Tính tiền sau giảm ─────────────────────────────────────
  const selectedPackage    = allPackages.find(p => p.id === formData.consultation_pricing_id);
  const basePrice          = parseFloat(selectedPackage?.price || 0);

  const calcDiscount = (price, info) => {
    if (!info || !price) return 0;
    let d = info.discount_type === 'percentage'
      ? (price * info.discount_value) / 100
      : info.discount_value;
    if (info.max_discount_amount > 0) d = Math.min(d, info.max_discount_amount);
    return Math.min(d, price);
  };

  const discountAmount = calcDiscount(basePrice, voucherInfo);
  const finalPrice     = basePrice - discountAmount;

  // ── Validate voucher realtime ──────────────────────────────
  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) { setVoucherError('Vui lòng nhập mã voucher'); return; }
    if (!formData.consultation_pricing_id) { setVoucherError('Vui lòng chọn gói tư vấn trước'); return; }

    setVoucherLoading(true);
    setVoucherError('');
    setVoucherInfo(null);

    try {
      const res = await marketingService.validateVoucher({
        code,
        apply_for: 'consultation',
        order_value: basePrice,
      });
      if (res.success && res.promotion) {
        setVoucherInfo({
          code:                res.promotion.code,
          name:                res.promotion.name,
          promotion_id:        res.promotion.id,
          discount_type:       res.promotion.discount_type,
          discount_value:      res.promotion.discount_value,
          max_discount_amount: res.promotion.max_discount_amount || 0,
        });
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

  const handlePreSubmit = () => {
    if (!validateForm()) return;

    const selectedPackage = allPackages.find(p => p.id === formData.consultation_pricing_id);
    const isFree = selectedPackage && parseFloat(selectedPackage.price) === 0;

    if (isFree) {
      // For free packages, proceed to create consultation immediately
      handleFinalSubmit();
      return;
    }

    // For paid packages, create booking now (payment deferred to detail page)
    // Warn when booking within 6 hours
    const now = new Date();
    const apptTime = new Date(`${formData.date}T${formData.time}:00`);
    const diffHours = (apptTime - now) / 36e5;
    if (diffHours < 6) {
      setWarningModal({
        isOpen: true, type: 'danger', title: 'Cảnh báo gấp!',
        message: `Lịch hẹn chỉ còn ${formatTimeDiff(apptTime - now)}.`,
        details: 'Bạn sẽ KHÔNG THỂ HỦY hoặc HOÀN TIỀN sau khi lịch được tạo. Bạn chắc chắn muốn tiếp tục?'
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async (method) => {
    try {
      setLoading(prev => ({ ...prev, submit: true }));
      const appointment_time = formData.appointment_time || (formData.date && formData.time ? `${formData.date}T${formData.time}:00` : null);

      // Do NOT collect payment here. Create consultation and defer payment to detail page.
      const payload = {
        ...formData,
        appointment_time,
        payment_method: null,
        attachments: JSON.stringify(formData.attachments || []),
        // ✅ Truyền voucher
        voucher_code:  voucherInfo?.code         || null,
        promotion_id:  voucherInfo?.promotion_id  || null,
      };

      const res = await consultationService.createConsultation(payload);
      if (res.data.success) {
        setWarningModal({
          isOpen: true, type: 'success', title: 'Đặt lịch thành công',
          message: 'Bạn đã đặt lịch tư vấn thành công!',
          details: 'Vui lòng vào trang chi tiết tư vấn để thực hiện thanh toán online.',
          onConfirm: () => navigate(`/tu-van/${res.data.data.id}`)
        });
      }
    } catch (e) {
      const serverMsg = e.response?.data?.message || e.message || 'Lỗi đặt lịch';
      const status = e.response?.status;
      setWarningModal({
        isOpen: true, type: 'danger', title: status >= 500 ? 'Lỗi hệ thống' : 'Không thể đặt lịch',
        message: serverMsg,
        details: 'Vui lòng kiểm tra lại thông tin và thử lại.'
      });
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="consultation-booking-page">
      <div className="consultation-booking-container">

        {/* TOP BAR */}
        <div className="consultation-booking-topbar">
          <button className="consultation-booking-back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Quay lại
          </button>
          <button className="consultation-booking-switch-btn" onClick={() => navigate('/dat-lich-hen')}>
            <FaCalendarAlt /> Đặt lịch dịch vụ thường
          </button>
        </div>

        {/* CARD */}
        <div className="consultation-booking-card">

          {/* CARD HEADER */}
          <div className="consultation-booking-card-header">
            <div className="consultation-booking-card-header-icon"><FaComments /></div>
            <div className="consultation-booking-card-header-text">
              <h1>Đặt Lịch Tư Vấn Trực Tuyến</h1>
              <p>Vui lòng hoàn tất các thông tin dưới đây để đặt lịch</p>
            </div>
          </div>

          {/* CARD BODY — 2 CỘT */}
          <div className="consultation-booking-card-body">

            {/* === CỘT TRÁI === */}
            <div className="consultation-booking-left-col">
              <h2 className="consultation-booking-section-title">
                <FaStethoscope /> Nội dung chi tiết đặt hẹn
              </h2>

              {/* CHỌN CHUYÊN KHOA */}
              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">
                  Chuyên khoa <span className="consultation-booking-required">*</span>
                </label>
                <div className="consultation-booking-filter-toolbar">
                  <div className="consultation-booking-search-box">
                    <FaSearch className="consultation-booking-search-icon" />
                    <input
                      type="text"
                      className="consultation-booking-search-input"
                      placeholder="Tìm chuyên khoa, bác sĩ, gói dịch vụ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="consultation-booking-specialty-list">
                  {filteredSpecialties.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`consultation-booking-specialty-btn ${formData.specialty_id === s.id ? 'active' : ''} ${errors.specialty_id ? 'error' : ''}`}
                      onClick={() => handleSpecialtyChange(s.id)}
                    >
                      <span className="cb-spec-icon">{renderIcon(s.icon)}</span>
                      <span className="cb-spec-name">{s.name}</span>
                    </button>
                  ))}
                </div>
                {errors.specialty_id && <span className="consultation-booking-error-msg">{errors.specialty_id}</span>}
              </div>

              {/* CHỌN BÁC SĨ */}
              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">
                  Bác sĩ <span className="consultation-booking-required">*</span>
                </label>
                <select
                  name="doctor_id"
                  value={formData.doctor_id}
                  onChange={handleDoctorSelect}
                  className={`consultation-booking-select ${errors.doctor_id ? 'error' : ''}`}
                  disabled={!formData.specialty_id}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {filteredDoctors.map(d => (
                    <option key={d.userId} value={d.userId}>
                      BS. {d.fullName}
                    </option>
                  ))}
                </select>
                {errors.doctor_id && <span className="consultation-booking-error-msg">{errors.doctor_id}</span>}
              </div>

              {/* CARD BÁC SĨ ĐÃ CHỌN */}
              {selectedDoctor && (
                <button
                  type="button"
                  className="consultation-booking-doctor-card consultation-booking-doctor-card-clickable"
                    onClick={() => selectedDoctorProfileCode && navigate(`/bac-si/${selectedDoctorProfileCode}`, {
                      state: {
                        returnTo: location.pathname,
                        returnState: {
                          consultationBooking: {
                            ...formData,
                            filterType,
                            searchTerm
                          }
                        }
                      }
                    })}
                >
                  <img
                    className="consultation-booking-doctor-avatar"
                    src={selectedDoctorCardImage}
                    onError={(e) => { e.target.onerror = null; e.target.src = require('../assets/images/avatar-default.jpg'); }}
                    alt="avatar"
                  />
                  <div className="consultation-booking-doctor-info">
                    <span className="consultation-booking-doctor-name">BS. {selectedDoctor.full_name}</span>
                    <span className="consultation-booking-doctor-specialty">{selectedDoctor.roleData?.specialty?.name || selectedDoctor.specialty?.name || 'Chưa cập nhật chuyên khoa'}</span>
                  </div>
                  <span className="consultation-booking-doctor-cta">
                    Xem hồ sơ <FaChevronRight />
                  </span>
                </button>
              )}

              {/* HÌNH THỨC TƯ VẤN */}
              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">
                  Hình thức tư vấn <span className="consultation-booking-required">*</span>
                </label>
                <div className="consultation-booking-type-tabs">
                  <button
                    type="button"
                    className={`consultation-booking-type-btn ${filterType === 'chat' ? 'active' : ''}`}
                    onClick={() => setFilterType('chat')}
                  >
                    <FaComments /> Chat
                  </button>
                  <button
                    type="button"
                    className={`consultation-booking-type-btn ${filterType === 'video' ? 'active' : ''}`}
                    onClick={() => setFilterType('video')}
                  >
                    <FaVideo /> Video Call
                  </button>
                </div>
              </div>

              {/* GÓI DỊCH VỤ */}
              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">
                  Gói dịch vụ <span className="consultation-booking-required">*</span>
                </label>
                <div className="consultation-booking-pkg-list">
                  {filteredPackages.length === 0 ? (
                    <div className="consultation-booking-pkg-empty">
                      {normalizedSearch ? 'Không tìm thấy gói dịch vụ phù hợp.' : 'Bác sĩ chưa thiết lập gói dịch vụ này.'}
                    </div>
                  ) : (
                    filteredPackages.map(pkg => (
                      <label key={pkg.id} className={`consultation-booking-pkg-item ${formData.consultation_pricing_id === pkg.id ? 'selected' : ''}`}>
                        <input
                          type="radio" className="consultation-booking-pkg-radio" name="pkg"
                          checked={formData.consultation_pricing_id === pkg.id}
                          onChange={() => {
                            setFormData(prev => ({ ...prev, consultation_pricing_id: pkg.id }));
                            setErrors(prev => ({ ...prev, consultation_pricing_id: '' }));
                          }}
                        />
                        <div className="consultation-booking-pkg-info">
                          <span className="consultation-booking-pkg-name">{pkg.package_name}</span>
                          <span className="consultation-booking-pkg-duration">{pkg.duration_minutes} phút</span>
                        </div>
                        <div className="consultation-booking-pkg-price">{formatCurrency(pkg.price)}</div>
                      </label>
                    ))
                  )}
                </div>
                {errors.consultation_pricing_id && <span className="consultation-booking-error-msg">{errors.consultation_pricing_id}</span>}
              </div>

              {/* CHỌN NGÀY */}
              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">
                  Thời gian khám <span className="consultation-booking-required">*</span>
                </label>
                <div className="consultation-booking-date-tabs">
                  {nextThreeDays.map(d => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const dStr = `${year}-${month}-${day}`;
                    return (
                      <button key={dStr}
                        type="button"
                        className={`consultation-booking-date-btn ${formData.date === dStr ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, date: dStr, time: '' }))}
                      >
                        <span className="consultation-booking-date-btn-day">{d.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                        <strong className="consultation-booking-date-btn-num">{d.getDate()}/{d.getMonth() + 1}</strong>
                      </button>
                    );
                  })}
                  <input
                    type="date"
                    className="consultation-booking-date-picker-input"
                    min={(() => {
                      const today = new Date();
                      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    })()}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value, time: '' }))}
                  />
                </div>

                {/* TIME SLOTS */}
                {formData.date && (
                  <div className="consultation-booking-slots-area">
                    {loading.slots ? (
                      <div className="consultation-booking-loading-slots">
                        <FaSun className="consultation-booking-spin" /> Đang tải lịch...
                      </div>
                    ) : (
                      ['morning', 'afternoon', 'evening'].map(pd => (
                        availableSlots[pd]?.length > 0 && (
                          <div key={pd} className="consultation-booking-slot-section">
                            <div className="consultation-booking-slot-section-label">
                              {pd === 'morning' ? <FaSun /> : pd === 'afternoon' ? <FaCloudSun /> : <FaMoon />}
                              {pd === 'morning' ? 'Buổi sáng' : pd === 'afternoon' ? 'Buổi chiều' : 'Buổi tối'}
                            </div>
                            <div className="consultation-booking-slot-grid">
                              {availableSlots[pd].map(s => {
                                const slotDateTime = new Date(`${formData.date}T${s.time}:00`);
                                const isPast = slotDateTime.getTime() <= Date.now();
                                const disabled = !s.isAvailable || isPast;
                                return (
                                  <button key={s.time}
                                    type="button"
                                    className={`consultation-booking-slot-btn ${formData.time === s.time ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                                    onClick={() => !disabled && setFormData(prev => ({ ...prev, time: s.time }))}
                                    disabled={disabled}
                                  >
                                    {s.time}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )
                      ))
                    )}
                    {!availableSlots.morning.length && !availableSlots.afternoon.length && !availableSlots.evening.length &&
                      <div className="consultation-booking-no-slots">
                        <FaExclamationTriangle /> Không có lịch trống ngày này.
                      </div>
                    }
                  </div>
                )}
                {errors.time && <span className="consultation-booking-error-msg">{errors.time}</span>}
              </div>


            </div>

            {/* === CỘT PHẢI === */}
            <div className="consultation-booking-right-col">
              <h2 className="consultation-booking-section-title">
                <FaUser /> Thông tin khách hàng
              </h2>

              {/* ĐẶT LỊCH CHO */}
              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">Đặt lịch cho</label>
                <div className="consultation-booking-for-toggle">
                  <label className={`consultation-booking-for-option ${formData.bookingFor === 'self' ? 'active' : ''}`}>
                    <input type="radio" name="bookingFor" value="self" checked={formData.bookingFor === 'self'} onChange={handleInputChange} />
                    Bản thân
                  </label>
                  <label className={`consultation-booking-for-option ${formData.bookingFor === 'other' ? 'active' : ''}`}>
                    <input type="radio" name="bookingFor" value="other" checked={formData.bookingFor === 'other'} onChange={handleInputChange} />
                    Người thân
                  </label>
                </div>
              </div>

              <div className="consultation-booking-row-2col">
                <div className="consultation-booking-form-group">
                  <label className="consultation-booking-label">
                    Họ và tên <span className="consultation-booking-required">*</span>
                  </label>
                  <input
                    className={`consultation-booking-input ${errors.name ? 'error' : ''}`}
                    name="name" value={formData.name} onChange={handleInputChange}
                    placeholder="Nguyễn Văn A"
                  />
                  {errors.name && <span className="consultation-booking-error-msg">{errors.name}</span>}
                </div>
                <div className="consultation-booking-form-group">
                  <label className="consultation-booking-label">Giới tính</label>
                  <select className="consultation-booking-select" name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="">-- Chọn --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="consultation-booking-row-2col">
                <div className="consultation-booking-form-group">
                  <label className="consultation-booking-label">Ngày sinh</label>
                  <input type="date" className="consultation-booking-input" name="dob" value={formData.dob} onChange={handleInputChange} />
                </div>
                <div className="consultation-booking-form-group">
                  <label className="consultation-booking-label">
                    SĐT <span className="consultation-booking-required">*</span>
                  </label>
                  <input
                    className={`consultation-booking-input ${errors.phone ? 'error' : ''}`}
                    name="phone" value={formData.phone} onChange={handleInputChange}
                    placeholder="0900 000 000"
                  />
                  {errors.phone && <span className="consultation-booking-error-msg">{errors.phone}</span>}
                </div>
              </div>

              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">Email (Nhận kết quả)</label>
                <input
                  className="consultation-booking-input" name="email"
                  value={formData.email} onChange={handleInputChange}
                  placeholder="example@email.com"
                />
              </div>

              {/* LÝ DO KHÁM */}
              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">
                  Lý do khám / Triệu chứng <span className="consultation-booking-required">*</span>
                </label>
                <textarea
                  className="consultation-booking-textarea" rows="3" name="chief_complaint"
                  value={formData.chief_complaint} onChange={handleInputChange}
                  placeholder="Mô tả các triệu chứng hiện tại của bạn..."
                />
                {errors.chief_complaint && <span className="consultation-booking-error-msg">{errors.chief_complaint}</span>}
              </div>

              <div className="consultation-booking-form-group">
                <label className="consultation-booking-label">Tệp đính kèm (Hình ảnh / KQ Xét nghiệm)</label>
                <label className="consultation-booking-file-btn">
                  <FaPaperclip /> Chọn file đính kèm
                  <input type="file" hidden multiple />
                </label>
              </div>

              <div className="consultation-booking-policy-row">
                <input type="checkbox" defaultChecked />
                <span className="consultation-booking-policy-text">
                  Tôi đồng ý với <a href="#/" className="consultation-booking-policy-link">chính sách bảo mật</a> và <a href="#/" className="consultation-booking-policy-link">điều khoản sử dụng</a> của hệ thống.
                </span>
              </div>

              {/* ✅ VOUCHER BOX */}
              {formData.consultation_pricing_id && (
                <div className="cb-voucher-box">
                  <div className="cb-voucher-box__label"><FaTag /> Mã ưu đãi / Voucher</div>
                  {!voucherInfo ? (
                    <>
                      <div className="cb-voucher-input-row">
                        <input
                          className={`consultation-booking-input cb-voucher-input ${voucherError ? 'error' : ''}`}
                          placeholder="Nhập mã voucher..."
                          value={voucherCode}
                          onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                        />
                        <button
                          type="button"
                          className="cb-voucher-apply-btn"
                          onClick={handleApplyVoucher}
                          disabled={voucherLoading || !voucherCode.trim()}
                        >
                          {voucherLoading ? '...' : 'Áp dụng'}
                        </button>
                      </div>

                      {/* Dropdown chọn nhanh từ Ví */}
                      {user && myVouchers.length > 0 && (
                        <select
                          className="consultation-booking-input"
                          style={{ borderColor: '#93c5fd', backgroundColor: '#eff6ff', color: '#1e3a8a', cursor: 'pointer', marginTop: '10px' }}
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
                    </>
                  ) : (
                    <div className="cb-voucher-applied">
                      <div className="cb-voucher-applied__info">
                        <FaCheckCircle className="cb-voucher-applied__icon" />
                        <div>
                          <span className="cb-voucher-applied__name">{voucherInfo.name}</span>
                          <span className="cb-voucher-applied__disc">
                            {voucherInfo.discount_type === 'percentage'
                              ? `Giảm ${voucherInfo.discount_value}%${voucherInfo.max_discount_amount > 0 ? ` (tối đa ${Number(voucherInfo.max_discount_amount).toLocaleString('vi-VN')}đ)` : ''}`
                              : `Giảm ${Number(voucherInfo.discount_value).toLocaleString('vi-VN')}đ`
                            }
                          </span>
                        </div>
                      </div>
                      <button type="button" className="cb-voucher-remove-btn" onClick={handleRemoveVoucher}><FaTimesCircle /></button>
                    </div>
                  )}
                  {voucherError && <small style={{ color: '#dc2626', fontSize: 12, display: 'block', marginTop: 5 }}>{voucherError}</small>}

                  {basePrice > 0 && (
                    <div className="cb-price-summary">
                      <div className="cb-price-row">
                        <span>Giá gói</span>
                        <span>{basePrice.toLocaleString('vi-VN')} VNĐ</span>
                      </div>
                      {voucherInfo && discountAmount > 0 && (
                        <div className="cb-price-row cb-price-row--disc">
                          <span><FaPercent /> Giảm giá</span>
                          <span>- {discountAmount.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                      )}
                      <div className="cb-price-row cb-price-row--total">
                        <span><FaMoneyBillWave /> Tổng thanh toán</span>
                        <strong>{finalPrice.toLocaleString('vi-VN')} VNĐ</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button type="button" className="consultation-booking-submit-btn" onClick={handlePreSubmit} disabled={loading.submit}>
                {loading.submit ? 'Đang xử lý...' : <><FaCheckCircle /> Xác nhận đặt lịch</>}
              </button>
            </div>

          </div>
        </div>

        {/* MODAL XÁC NHẬN */}
        {showConfirmModal && (
          <div className="consultation-booking-modal-overlay">
            <div className="consultation-booking-modal">
              <div className="consultation-booking-modal-header">
                <h3><FaCheckCircle style={{ color: '#3aaa6f' }} /> Xác nhận thông tin</h3>
                <button className="consultation-booking-modal-close-btn" onClick={() => setShowConfirmModal(false)}><FaTimes /></button>
              </div>
              <div className="consultation-booking-modal-body">
                <div className="consultation-booking-confirm-row">
                  <span>Bác sĩ</span>
                  <strong>{selectedDoctor?.full_name}</strong>
                </div>
                <div className="consultation-booking-confirm-row">
                  <span>Gói khám</span>
                  <strong>{allPackages.find(p => p.id === formData.consultation_pricing_id)?.package_name}</strong>
                </div>
                <div className="consultation-booking-confirm-row">
                  <span>Thời gian</span>
                  <strong>{formData.time} — {formData.date}</strong>
                </div>
                <div className="consultation-booking-confirm-row">
                  <span>Khách hàng</span>
                  <strong>{formData.name}</strong>
                </div>
                {voucherInfo && discountAmount > 0 && (
                  <div className="consultation-booking-confirm-row" style={{ color: '#16a34a' }}>
                    <span>🎫 Voucher ({voucherInfo.code})</span>
                    <strong>- {discountAmount.toLocaleString('vi-VN')} VNĐ</strong>
                  </div>
                )}
                <div className="consultation-booking-confirm-total">
                  <span>Tổng thanh toán</span>
                  <strong style={{ color: voucherInfo && discountAmount > 0 ? '#16a34a' : undefined }}>
                    {finalPrice.toLocaleString('vi-VN')} VNĐ
                  </strong>
                </div>
                <small className="consultation-booking-confirm-hint">
                  Kiểm tra kỹ thông tin bác sĩ, gói dịch vụ và thời gian trước khi thanh toán để hoàn tất lịch tư vấn.
                </small>
              </div>
              <div className="consultation-booking-modal-footer">
                <button className="consultation-booking-btn-secondary" onClick={() => setShowConfirmModal(false)}>Hủy</button>
                <button className="consultation-booking-btn-primary" onClick={() => handleFinalSubmit()}>Xác nhận &amp; Tạo lịch</button>
              </div>
            </div>
          </div>
        )}


        {/* MODAL CẢNH BÁO */}
        {warningModal.isOpen && (
          <div className="consultation-booking-modal-overlay">
            <div className={`consultation-booking-modal ${warningModal.type || ''}`}>
              <div className={`consultation-booking-modal-header ${warningModal.type || ''}`}>
                <h3>
                  {warningModal.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                  {' '}{warningModal.title}
                </h3>
              </div>
              <div className="consultation-booking-modal-body">
                <p className="consultation-booking-modal-message">{warningModal.message}</p>
                {warningModal.details && <small className="consultation-booking-modal-details">{warningModal.details}</small>}
              </div>
              <div className="consultation-booking-modal-footer">
                {warningModal.onConfirm ? (
                  <button className="consultation-booking-btn-primary full" onClick={() => {
                    setWarningModal({ isOpen: false });
                    warningModal.onConfirm();
                  }}>OK</button>
                ) : warningModal.redirectBack ? (
                  <button className="consultation-booking-btn-primary full" onClick={() => {
                    setWarningModal({ isOpen: false });
                    navigate(-1);
                  }}>Về trang dịch vụ</button>
                ) : warningModal.type === 'warning' || warningModal.type === 'danger' ? (
                  <>
                    <button className="consultation-booking-btn-secondary" onClick={() => setWarningModal({ isOpen: false })}>Đóng</button>
                    {warningModal.type === 'danger' && (
                      <button className="consultation-booking-btn-danger" onClick={() => {
                        setWarningModal({ isOpen: false });
                        setShowConfirmModal(true);
                      }}>Tiếp tục</button>
                    )}
                  </>
                ) : (
                  <button className="consultation-booking-btn-primary full" onClick={() => setWarningModal({ isOpen: false })}>Đóng</button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ConsultationBookingPage;

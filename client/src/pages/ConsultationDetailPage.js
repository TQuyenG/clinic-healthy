// client/src/pages/ConsultationDetailPage.js
// ✅ REDESIGNED - Đồng bộ với AppointmentDetailPage

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import consultationService from '../services/consultationService';
import marketingService from '../services/marketingService';
import axios from 'axios';
import AppointmentRatingModal from '../components/appointments/AppointmentRatingModal';
import InRoomResultPanel from '../components/medical/InRoomResultPanel';
import {
  FaUserMd, FaUser, FaClock, FaMoneyBillWave, FaComments, FaStar,
  FaCheckCircle, FaTimesCircle, FaFileAlt, FaPaperclip, FaArrowLeft,
  FaVideo, FaCalendarCheck, FaExclamationTriangle, FaChevronDown, FaNotesMedical,
  FaInfoCircle, FaCreditCard, FaHospital, FaSpinner, FaCalendarAlt, FaPhone,
  FaEnvelope, FaBirthdayCake, FaStethoscope, FaClipboardList
} from 'react-icons/fa';
import './ConsultationDetailPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ConsultationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const autoOpenResultRef = useRef(false);
  const isResultView = searchParams.get('view') === 'result';
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [ratingTarget, setRatingTarget] = useState('consultation');
  const [ratingMode, setRatingMode] = useState('submit');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState('');
  const [hasConsultationRating, setHasConsultationRating] = useState(false);
  const [hasDoctorRating, setHasDoctorRating] = useState(false);
  const [doctorRating, setDoctorRating] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [calculatedFees, setCalculatedFees] = useState({ discount: 0, final: 0 });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showResultPanel, setShowResultPanel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [refundPolicy, setRefundPolicy] = useState(null);
// đã có API_URL ở trên cùng file, xóa dòng này

  useEffect(() => {
    fetchConsultationDetail();
    axios.get(`${API_URL}/settings/refund_policy`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => { if (res.data) setRefundPolicy(res.data); })
      .catch(() => {});
    fetchUserVouchers();
  }, [id]);

  const fetchUserVouchers = async () => {
  if (user?.role !== 'patient') return;
  try {
    const res = await marketingService.getUserVouchers();
      if (res.data?.success) {
        const activeVouchers = (res.data.data || []).filter(
          v => v.status === 'unused' && new Date(v.Promotion?.end_date) > new Date()
        );
        setVouchers(activeVouchers);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách voucher:', err);
    }
  };

  useEffect(() => {
    if (!consultation) return;
    const basePrice = parseFloat(consultation.total_fee || consultation.base_fee || 0);
    if (!selectedVoucher || !selectedVoucher.Promotion) {
      setCalculatedFees({ discount: 0, final: basePrice });
      return;
    }
    const promo = selectedVoucher.Promotion;
    let discountAmount = 0;
    if (promo.discount_type === 'fixed') {
      discountAmount = parseFloat(promo.discount_value);
    } else if (promo.discount_type === 'percentage') {
      discountAmount = (basePrice * parseFloat(promo.discount_value)) / 100;
      if (promo.max_discount_value) discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_value));
    }
    setCalculatedFees({ discount: discountAmount, final: Math.max(0, basePrice - discountAmount) });
  }, [selectedVoucher, consultation]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!consultation || autoOpenResultRef.current) return;
    if (searchParams.get('openResult') !== '1') return;
    const isDoctorOwner = user?.role === 'doctor' && (
      user?.id === consultation.doctor_id ||
      user?.id === consultation.doctor?.id ||
      user?.id === consultation.doctor?.user_id
    );
    if (!isDoctorOwner || !['confirmed', 'in_progress'].includes(consultation.status)) return;
    autoOpenResultRef.current = true;
    handleStartChat();
  }, [consultation, searchParams, user?.id, user?.role]);

  useEffect(() => {
    if (!loading && consultation && window.location.hash === '#ket-qua') {
      setTimeout(() => {
        document.getElementById('ket-qua')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [loading, consultation]);

  const fetchConsultationDetail = async () => {
    try {
      setLoading(true);
      const response = await consultationService.getConsultationById(id);
      if (response.data.success) {
        const consultationData = response.data.data;
        setConsultation(consultationData);
        setHasConsultationRating(Boolean(consultationData.rating));

        const base = parseFloat(consultationData.total_fee || consultationData.base_fee || 0);
        setCalculatedFees({ discount: 0, final: base });

        // Gọi doctor review song song, không blocking setLoading
        const doctorId = consultationData.doctor_id || consultationData.doctor?.id || consultationData.doctor?.user_id;
        if (user?.role === 'patient' && doctorId) {
          axios.get(`${API_URL}/statistics/doctor/${doctorId}/my-review`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }).then(doctorReviewRes => {
            const existingDoctorReview = doctorReviewRes.data?.data?.review || null;
            setDoctorRating(existingDoctorReview);
            setHasDoctorRating(Boolean(existingDoctorReview));
          }).catch(() => {
            setDoctorRating(null);
            setHasDoctorRating(false);
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false); // không chờ doctor review nữa
    }
  };

  const handleStartChat = async () => {
    try {
      await consultationService.startConsultation(id);
      const isDoctorEntering = user?.role === 'doctor' && (
        user?.id === consultation.doctor_id ||
        user?.id === consultation.doctor?.id ||
        user?.id === consultation.doctor?.user_id
      );
      const roomPath = consultation.consultation_type === 'video'
        ? `/tu-van/video/${id}`
        : `/tu-van/${id}/chat`;
      const suffix = isDoctorEntering && ['confirmed', 'in_progress'].includes(consultation.status) ? '?openResult=1' : '';
      navigate(roomPath + suffix);
    } catch (error) {
      alert('Lỗi bắt đầu: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitRating = async (ratingData) => {
    if (!consultation) return;
    try {
      setIsSubmittingRating(true);
      if (ratingTarget === 'doctor') {
        const doctorId = consultation.doctor_id || consultation.doctor?.id || consultation.doctor?.user_id;
        if (!doctorId) { alert('Không tìm thấy bác sĩ để đánh giá.'); return; }
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const response = hasDoctorRating
          ? await axios.put(`${API_URL}/statistics/doctor/${doctorId}/reviews`, ratingData, { headers })
          : await axios.post(`${API_URL}/statistics/doctor/${doctorId}/reviews`, ratingData, { headers });
        if (response.data?.success) {
          setRatingSuccessMsg('Đánh giá bác sĩ thành công! Cảm ơn bạn đã chia sẻ.');
          setHasDoctorRating(true);
          setDoctorRating(response.data?.data?.review || { ...ratingData, doctor_id: doctorId });
        } else { alert(response.data?.message || 'Lỗi gửi đánh giá bác sĩ'); return; }
      } else {
        const response = await consultationService.submitConsultationFeedback({
          consultation_id: consultation.id,
          rating: ratingData.rating,
          review: ratingData.review
        });
        if (response.data?.success) {
          setRatingSuccessMsg('Đánh giá tư vấn thành công! Cảm ơn bạn đã chia sẻ.');
          setHasConsultationRating(true);
        } else { alert(response.data?.message || 'Lỗi gửi đánh giá tư vấn'); return; }
      }
      setShowRatingModal(false);
      await fetchConsultationDetail();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi đánh giá');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!consultation || !consultation.id) return;
    const totalFee = parseFloat(consultation.total_fee || 0);
    if (totalFee === 0) {
      const confirmFree = window.confirm("Ca tư vấn này có chi phí là 0đ. Bạn có muốn xác nhận hoàn tất thủ tục miễn phí để vào phòng không?");
      if (!confirmFree) return;
      try {
        setLoading(true);
        const response = await consultationService.startConsultation(id);
        if (response.data?.success) { alert("Xác nhận thông tin thành công!"); window.location.reload(); }
        else alert(response.data?.message || "Không thể cập nhật trạng thái.");
      } catch (error) {
        alert(error.response?.data?.message || "Có lỗi xảy ra.");
      } finally { setLoading(false); }
      return;
    }
    navigate(`/thanh-toan-tu-van/${consultation.id}`);
  };

  if (loading) return (
    <div className="cdp-loading-screen">
      <FaSpinner className="cdp-spin" />
      <p>Đang tải dữ liệu...</p>
    </div>
  );
  if (!consultation) return (
    <div className="cdp-error-screen">
      <p>Không tìm thấy buổi tư vấn</p>
      <button onClick={() => navigate(-1)}>Quay lại</button>
    </div>
  );

  const isPatientOwner = user?.role === 'patient' && (
  user?.id === consultation.patient_id ||
  user?.id === consultation.patient?.id ||
  user?.id === consultation.patient?.user_id ||
  String(user?.id) === String(consultation.patient_id) ||
  String(user?.id) === String(consultation.patient?.user_id)
);
const isDoctorOwner = user?.role === 'doctor' && (
  user?.id === consultation.doctor_id ||
  user?.id === consultation.doctor?.id ||
  user?.id === consultation.doctor?.user_id ||
  String(user?.id) === String(consultation.doctor_id) ||
  String(user?.id) === String(consultation.doctor?.user_id)
);
  const canJoinRoom = consultation.status === 'confirmed' && consultationService.canStartConsultation(consultation.appointment_time);
  const isPaidConsultation =
    ['paid_online', 'paid_at_clinic', 'not_required'].includes(consultation.payment_status) ||
    parseFloat(consultation.total_fee || 0) === 0;
  const canJoinPaidRoom = canJoinRoom && isPaidConsultation;
  const canWriteResult = isDoctorOwner && ['confirmed', 'in_progress', 'completed'].includes(consultation.status);
  const statusMap = {
    pending:         { cls: 'status-pending',     label: 'Chờ duyệt' },
    pending_payment: { cls: 'status-pending',     label: 'Chờ thanh toán' },
    confirmed:       { cls: 'status-confirmed',   label: 'Đã xác nhận' },
    in_progress:     { cls: 'status-in-progress', label: 'Đang tư vấn' },
    completed:       { cls: 'status-completed',   label: 'Hoàn thành' },
    cancelled:       { cls: 'status-cancelled',   label: 'Đã hủy' },
    rejected:        { cls: 'status-cancelled',   label: 'Từ chối' },
  };
  const statusMeta = statusMap[consultation.status] || { cls: 'status-pending', label: consultation.status };

  const paymentMeta = (() => {
    if (consultation.payment_status === 'paid_online' || consultation.Payment?.status === 'paid')
      return { cls: 'payment-paid', text: 'Đã thanh toán online', icon: <FaCreditCard /> };
    if (consultation.payment_status === 'paid_at_clinic')
      return { cls: 'payment-at-clinic', text: 'Đã thanh toán tại quầy', icon: <FaHospital /> };
    if (consultation.payment_status === 'not_required')
      return { cls: 'payment-free', text: 'Miễn phí', icon: <FaCheckCircle /> };
    if (consultation.payment_status === 'refunded')
      return { cls: 'payment-refunded', text: 'Đã hoàn tiền', icon: <FaMoneyBillWave /> };
    return { cls: 'payment-pending', text: 'Chưa thanh toán', icon: <FaExclamationTriangle /> };
  })();

  const serviceLabel = consultation?.package?.name || consultation?.consultation_pricing?.name || consultation?.specialty_name || 'Tư vấn trực tuyến';
  const serviceCode = consultation?.consultation_code || consultation?.id;

  const attachments = (() => {
    const a = consultation.attachments;
    if (!a) return [];
    if (Array.isArray(a)) return a;
    try { const p = typeof a === 'string' ? JSON.parse(a) : a; return Array.isArray(p) ? p : []; }
    catch { return []; }
  })();

  const doctorFiles = (() => {
    const d = consultation.doctor_files;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    try { const p = typeof d === 'string' ? JSON.parse(d) : d; return Array.isArray(p) ? p : []; }
    catch { return []; }
  })();

  const ratingModalPayload = ratingTarget === 'doctor' && doctorRating
    ? { ...consultation, code: serviceCode, rating: doctorRating.rating, review: doctorRating.review }
    : { ...consultation, code: serviceCode, service_name: serviceLabel };

  const calculateConsultationRefundPreview = () => {
    if (!consultation) return null;
    const now = new Date();
    const appointmentTime = new Date(consultation.appointment_time);
    const hoursDiff = (appointmentTime - now) / 3600000;
    const isPaid = ['paid_online', 'paid_at_clinic'].includes(consultation.payment_status);
    const price = parseFloat(consultation.total_fee || 0);
    if (!isPaid || price === 0) {
      return { hoursLeft: hoursDiff.toFixed(1), percent: 0, amount: 0,
        message: 'Lịch tư vấn chưa thanh toán hoặc miễn phí. Thao tác hủy sẽ không phát sinh hoàn tiền.' };
    }
    let refundPercent = 0;
    if (refundPolicy) {
      const rules = refundPolicy['consultation']?.rules || [];
      const sortedRules = [...rules].sort((a, b) => b.hours_before - a.hours_before);
      for (const rule of sortedRules) {
        if (hoursDiff >= rule.hours_before) { refundPercent = rule.refund_percent; break; }
      }
    } else {
      if (hoursDiff >= 24) refundPercent = 100;
      else if (hoursDiff >= 6) refundPercent = 50;
    }
    const refundAmount = Math.round(price * refundPercent / 100);
    return { hoursLeft: hoursDiff.toFixed(1), percent: refundPercent, amount: refundAmount,
      message: hoursDiff > 0
        ? `Thời gian còn lại đến giờ tư vấn: ${hoursDiff.toFixed(1)} giờ. Áp dụng quy định hoàn trả:`
        : 'Đã quá giờ tư vấn.' };
  };

  const handleCancelClick = () => setShowCancelModal(true);

  const handleRescheduleOpen = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow.toISOString().split('T')[0]);
    setRescheduleTime('');
    setRescheduleReason('');
    setAvailableSlots([]);
    setShowRescheduleModal(true);
  };

  const handleRescheduleDateChange = async (date) => {
    setRescheduleDate(date);
    setRescheduleTime('');
    setAvailableSlots([]);
    if (!date || !consultation?.consultation_pricing_id) return;
    try {
      setLoadingSlots(true);
      const res = await consultationService.getAvailableSlots(
        consultation.doctor_id, date, consultation.consultation_pricing_id
      );
      if (res.data?.success) setAvailableSlots(res.data.data.availableSlots);
    } catch { setAvailableSlots([]); }
    finally { setLoadingSlots(false); }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      alert('Vui lòng chọn ngày và giờ mới'); return;
    }
    try {
      setSubmittingReschedule(true);
      await consultationService.rescheduleConsultation(id, {
        new_appointment_time: `${rescheduleDate}T${rescheduleTime}:00`,
        reason: rescheduleReason
      });
      setShowRescheduleModal(false);
      setRatingSuccessMsg('✅ Đổi lịch thành công! Lịch mới đã được xác nhận. Thông báo đã gửi đến bác sĩ và quản trị viên.');
      fetchConsultationDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi đổi lịch');
    } finally { setSubmittingReschedule(false); }
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) { alert('Vui lòng nhập lý do hủy'); return; }
    try {
      setSubmitting(true);
      await consultationService.cancelConsultation(id, { reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
      fetchConsultationDetail();
    } catch { alert('Lỗi hủy tư vấn'); }
    finally { setSubmitting(false); }
  };

  // ===== ĐẾM NGƯỢC TỚI GIỜ HẸN =====
  const getCountdown = () => {
    if (!consultation?.appointment_time) return null;
    if (!['confirmed', 'pending'].includes(consultation.status)) return null;
    const diffSeconds = Math.floor((new Date(consultation.appointment_time).getTime() - nowTs) / 1000);
    if (diffSeconds <= 0 && diffSeconds > -600) return { type: 'now', text: '⏰ Đã tới giờ hẹn!' };
    if (diffSeconds <= 0) return null;
    const h = Math.floor(diffSeconds / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    const timeStr = h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return { type: 'counting', text: `⏳ Còn ${timeStr} tới giờ hẹn` };
  };
  const countdown = getCountdown();
  // ===== KẾT THÚC ĐẾM NGƯỢC =====

  return (
    <div className="cdp-page">
      <div className="cdp-wrapper">

        {/* ===== HEADER ===== */}
        <div className="cdp-header">
          <div className="cdp-header-left">
            <button className="cdp-btn-back" onClick={() => navigate(-1)}>
              <FaArrowLeft /> Quay lại
            </button>
            <h1 className="cdp-title">Chi tiết tư vấn: <span>{serviceCode}</span></h1>
          </div>
          <span className={`cdp-status-pill ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        </div>

        {/* ===== LAYOUT GRID ===== */}
        <div className="cdp-grid">

          {/* ===== MAIN COLUMN ===== */}
          <div className="cdp-col-main">

            {/* --- Thông tin lịch hẹn --- */}
            <div className="cdp-card">
              <div className="cdp-card-title">
                <FaCalendarAlt /> Thông tin lịch hẹn
              </div>
              <div className="cdp-info-grid">
                <div className="cdp-info-item">
                  <span className="cdp-info-label"><FaStethoscope /> Dịch vụ</span>
                  <span className="cdp-info-value">{serviceLabel}</span>
                </div>
                <div className="cdp-info-item">
                  <span className="cdp-info-label">Loại hình</span>
                  <span className="cdp-info-value">
                    <span className={`cdp-type-tag ${consultation.consultation_type}`}>
                      {consultation.consultation_type === 'chat' ? <FaComments /> : <FaVideo />}
                      {consultation.consultation_type?.toUpperCase()}
                    </span>
                  </span>
                </div>
                <div className="cdp-info-item">
                  <span className="cdp-info-label"><FaClock /> Thời gian hẹn</span>
                  <span className="cdp-info-value">
                    {new Date(consultation.appointment_time).toLocaleString('vi-VN')}
                  </span>
                </div>

                {/* Đếm ngược */}
                {countdown && (
                  <div className="cdp-info-item" style={{ gridColumn: '1 / -1' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontWeight: 700,
                        fontSize: 15,
                        background: countdown.type === 'now' ? '#d4edda' : '#fff3cd',
                        color: countdown.type === 'now' ? '#155724' : '#856404',
                        border: `1px solid ${countdown.type === 'now' ? '#28a745' : '#ffc107'}`,
                        animation: countdown.type === 'now' ? 'cdp-pulse 1.2s infinite' : 'none',
                      }}
                    >
                      {countdown.text}
                    </span>
                  </div>
                )}

                <div className="cdp-info-item">
                  <span className="cdp-info-label"><FaClock /> Thời lượng</span>
                  <span className="cdp-info-value">{consultation.duration_minutes} phút</span>
                </div>
                {consultation.started_at && (
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Bắt đầu lúc</span>
                    <span className="cdp-info-value">
                      {new Date(consultation.started_at).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* --- Bác sĩ & Bệnh nhân --- */}
            <div className="cdp-two-col">
              {/* Bác sĩ */}
              <div className="cdp-card">
                <div className="cdp-card-title">
                  <FaUserMd /> Bác sĩ
                </div>
                <div className="cdp-person-row">
                  <img
                    src={consultation.doctor?.avatar_url || '/default-avatar.png'}
                    alt="Doctor"
                    className="cdp-avatar"
                  />
                  <div className="cdp-person-info">
                    <strong>{consultation.doctor?.full_name || 'N/A'}</strong>
                    <span className="cdp-person-sub">
                      {consultation.doctor?.Doctor?.Specialty?.name || 'Chuyên khoa'}
                    </span>
                    {consultation.doctor?.phone && (
                      <span className="cdp-person-meta"><FaPhone /> {consultation.doctor.phone}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bệnh nhân */}
              <div className="cdp-card">
                <div className="cdp-card-title">
                  <FaUser /> Bệnh nhân
                </div>
                <div className="cdp-info-grid">
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Họ và tên</span>
                    <span className="cdp-info-value">{consultation.patient?.full_name || 'N/A'}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label"><FaEnvelope /> Email</span>
                    {(() => {
                      const email = consultation.patient?.email;
                      const maskEmail = (e) => {
                        if (!e || typeof e !== 'string') return 'N/A';
                        const parts = e.split('@');
                        if (parts.length !== 2) return 'N/A';
                        const local = parts[0];
                        const domain = parts[1];
                        if (local.length <= 2) return '***@' + domain;
                        return `${local.slice(0,1)}***${local.slice(-1)}@${domain}`;
                      };
                      const canSeeEmail = (user?.role === 'admin') || isPatientOwner || isDoctorOwner;
                      return (
                        <span className="cdp-info-value">{email ? (canSeeEmail ? email : maskEmail(email)) : 'N/A'}</span>
                      );
                    })()}
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label"><FaPhone /> Điện thoại</span>
                    <span className="cdp-info-value">{consultation.patient?.phone || 'N/A'}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label"><FaBirthdayCake /> Sinh nhật</span>
                    <span className="cdp-info-value">
                      {consultation.patient?.dob
                        ? new Date(consultation.patient.dob).toLocaleDateString('vi-VN')
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* --- Hồ sơ y tế --- */}
            <div className="cdp-card">
              <div className="cdp-card-title">
                <FaFileAlt /> Hồ sơ y tế
              </div>

              <div className="cdp-medical-block">
                <span className="cdp-medical-label">Triệu chứng chính</span>
                <p className="cdp-medical-text">{consultation.chief_complaint || 'Chưa cập nhật'}</p>
              </div>

              {consultation.medical_history && (
                <div className="cdp-medical-block">
                  <span className="cdp-medical-label">Tiền sử bệnh</span>
                  <p className="cdp-medical-text">{consultation.medical_history}</p>
                </div>
              )}

              {consultation.status === 'completed' && consultation.diagnosis && (
                <div className="cdp-result-box" id="ket-qua">
                  <div className="cdp-result-header">
                    <FaCheckCircle /> Kết luận của bác sĩ
                  </div>
                  <div className="cdp-result-body">
                    <div className="cdp-result-item">
                      <span className="cdp-medical-label">Chẩn đoán</span>
                      <p className="cdp-medical-text">{consultation.diagnosis}</p>
                    </div>
                    {consultation.treatment_plan && (
                      <div className="cdp-result-item">
                        <span className="cdp-medical-label">Hướng điều trị</span>
                        <p className="cdp-medical-text">{consultation.treatment_plan}</p>
                      </div>
                    )}
                    {consultation.prescription_data && (
                      <div className="cdp-result-item">
                        <span className="cdp-medical-label">Đơn thuốc</span>
                        <pre className="cdp-pre">{JSON.stringify(consultation.prescription_data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(attachments.length > 0 || doctorFiles.length > 0) && (
                <div className="cdp-files-block">
                  <span className="cdp-medical-label"><FaPaperclip /> File đính kèm</span>
                  <div className="cdp-file-chips">
                    {attachments.map((f, i) => (
                      <a key={`p-${i}`} href={f.url} target="_blank" rel="noreferrer" className="cdp-file-chip patient">
                        {f.name || f.filename || `file-${i + 1}`} (BN)
                      </a>
                    ))}
                    {doctorFiles.map((f, i) => (
                      <a key={`d-${i}`} href={f.url} target="_blank" rel="noreferrer" className="cdp-file-chip doctor">
                        {f.name || f.filename || `file-${i + 1}`} (BS)
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>{/* end col-main */}

          {/* ===== SIDEBAR COLUMN ===== */}
          <div className="cdp-col-side">

            {/* --- Thanh toán --- */}
            <div className="cdp-card">
              <div className="cdp-card-title">
                <FaMoneyBillWave /> Thanh toán
              </div>
              <div className="cdp-pay-row">
                <span>Giá dịch vụ</span>
                <span>{parseFloat(consultation.base_fee || 0).toLocaleString('vi-VN')}đ</span>
              </div>
              
              {parseFloat(consultation.discount_amount || 0) > 0 && (
                <div className="cdp-pay-row" style={{ color: '#16a34a' }}>
                  <span>Giảm giá (voucher)</span>
                  <span>-{parseFloat(consultation.discount_amount || 0).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="cdp-pay-row total">
                <span>Tổng cộng</span>
                <span className="cdp-pay-total">{parseFloat(consultation.total_fee || 0).toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="cdp-pay-row">
                <span>Phương thức</span>
                <span>{(consultation.Payment?.method || consultation.payment_method || 'N/A').toUpperCase()}</span>
              </div>
              <div className="cdp-pay-status-row">
                <span className={`cdp-pay-pill ${paymentMeta.cls}`}>
                  {paymentMeta.icon} {paymentMeta.text}
                </span>
              </div>

              {paymentMeta.cls === 'payment-pending' &&
                consultation.status !== 'cancelled' &&
                consultation.status !== 'completed' && (
                <div className="cdp-pay-action">
                  {parseFloat(consultation.total_fee || 0) > 0 ? (
                    <button className="cdp-btn-main full" onClick={handleCreatePayment}>
                      <FaCreditCard /> Thanh toán online
                    </button>
                  ) : (
                    <button className="cdp-btn-main full" onClick={handleCreatePayment}>
                      <FaCheckCircle /> Xác nhận miễn phí (0đ)
                    </button>
                  )}
                </div>
              )}

              {consultation.payment_due_at && (
                <div className="cdp-pay-due">
                  <span>Hạn thanh toán: {new Date(consultation.payment_due_at).toLocaleString('vi-VN')}</span>
                  <span>Còn lại: {(() => {
                    const diff = new Date(consultation.payment_due_at).getTime() - nowTs;
                    if (diff <= 0) return 'Đã quá hạn';
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
                  })()}</span>
                </div>
              )}
            </div>

            {/* --- Kết quả khám (Doctor/Admin) --- */}
            {!isResultView && (isDoctorOwner || user?.role === 'admin') && (
              <div className="cdp-card">
                <div className="cdp-card-title">
                  <FaNotesMedical /> Kết quả khám
                </div>
              <button
                type="button"
                onClick={consultation.status === 'completed'
                  ? () => setShowResultPanel(true)
                  : handleStartChat
                }
                className="cdp-btn-main full"
              >
                <FaNotesMedical />
                {consultation.status === 'completed'
                  ? (consultation.diagnosis ? 'Cập nhật kết quả khám' : 'Nhập kết quả khám')
                  : (consultation.diagnosis ? 'Mở phòng để cập nhật kết quả' : 'Mở phòng để nhập kết quả')
                }
              </button>
              {!canWriteResult && consultation.status !== 'completed' && (
                <p className="cdp-hint">
                  <FaInfoCircle />
                  Có thể nhập kết quả khi ca tư vấn ở trạng thái đã xác nhận hoặc đang diễn ra.
                </p>
              )}
            </div>
          )}

            {/* --- Thao tác --- */}
              {!isResultView && (
              <div className="cdp-card">
                <div className="cdp-card-title">
                  <FaClipboardList /> Thao tác
                </div>

              {(user?.role === 'patient' || user?.role === 'doctor' || user?.role === 'admin') && canJoinPaidRoom && (
                <button className="cdp-btn-main full" onClick={handleStartChat}>
                  {consultation.consultation_type === 'video' ? <FaVideo /> : <FaComments />}
                  Vào phòng tư vấn
                </button>
              )}

              {!isPaidConsultation && consultation.status === 'confirmed' && (
                <div className="cdp-alert alert-warning">
                  <FaExclamationTriangle />
                  Chưa thể vào phòng tư vấn do chưa thanh toán.
                </div>
              )}

              {['pending', 'confirmed', 'upcoming'].includes(consultation.status) &&
                isPatientOwner && (
                <button
                  className="cdp-btn-main full"
                  style={{ background: '#3b82f6' }}
                  onClick={consultation.is_rescheduled ? undefined : handleRescheduleOpen}
                  disabled={consultation.is_rescheduled}
                  style={{ background: '#3b82f6', opacity: consultation.is_rescheduled ? 0.5 : 1, cursor: consultation.is_rescheduled ? 'not-allowed' : 'pointer' }}
                >
                  <FaCalendarAlt /> Đổi lịch
                </button>
              )}

              {['pending', 'confirmed', 'upcoming'].includes(consultation.status) &&
                (isPatientOwner || isDoctorOwner || user?.role === 'admin' || user?.role === 'staff') && (
                <button className="cdp-btn-danger full" onClick={handleCancelClick}>
                  <FaTimesCircle /> Hủy tư vấn
                </button>
              )}

              <div className="cdp-hints-block">
                <p className="cdp-hint"><FaInfoCircle /> Chỉ vào phòng khi tư vấn đã xác nhận và đến giờ hẹn.</p>
                <p className="cdp-hint"><FaInfoCircle /> Hủy tư vấn cần nhập lý do để hệ thống xử lý hoàn tiền nếu có.</p>
              </div>
            </div>
            )}{/* end !isResultView Thao tác */}

            {/* --- Đánh giá (Patient only, completed) --- */}
            {consultation.status === 'completed' && isPatientOwner && (
              <div className="cdp-card">
                <div className="cdp-card-title">
                  <FaStar /> {hasConsultationRating || hasDoctorRating ? 'Xem đánh giá' : 'Đánh giá dịch vụ'}
                </div>
                <p className="cdp-hint" style={{ marginBottom: 12 }}>
                  {hasConsultationRating || hasDoctorRating
                    ? 'Bạn có thể xem hoặc cập nhật đánh giá của mình.'
                    : 'Chia sẻ cảm nhận để giúp chúng tôi cải thiện dịch vụ.'}
                </p>
                <div className="cdp-rating-wrap">
                  <button
                    className="cdp-btn-rating full"
                    onClick={() => setShowRatingMenu(prev => !prev)}
                  >
                    <FaStar />
                    {hasConsultationRating || hasDoctorRating ? 'Xem đánh giá' : 'Viết đánh giá'}
                    <FaChevronDown style={{ marginLeft: 'auto' }} />
                  </button>
                  {showRatingMenu && (
                    <div className="cdp-rating-dropdown">
                      <button
                        className="cdp-rating-option"
                        onClick={() => {
                          setShowRatingMenu(false);
                          setRatingTarget('consultation');
                          setRatingMode(hasConsultationRating ? 'view' : 'submit');
                          setShowRatingModal(true);
                        }}
                      >
                        <FaStar /> {hasConsultationRating ? 'Xem đánh giá Tư vấn' : 'Đánh giá Tư vấn'}
                      </button>
                      <button
                        className="cdp-rating-option"
                        onClick={() => {
                          setShowRatingMenu(false);
                          setRatingTarget('doctor');
                          setRatingMode(hasDoctorRating ? 'view' : 'submit');
                          setShowRatingModal(true);
                        }}
                      >
                        <FaUserMd /> {hasDoctorRating ? 'Xem đánh giá Bác sĩ' : 'Đánh giá Bác sĩ'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            

          </div>{/* end col-side */}
          
        </div>{/* end grid */}
      </div>

      {/* ── RESCHEDULE MODAL ── */}
      {showRescheduleModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
          onClick={() => setShowRescheduleModal(false)}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'28px', maxWidth:'500px', width:'94%', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:40, height:40, background:'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <FaCalendarAlt style={{ color:'#fff' }} />
                </div>
                <div>
                  <h3 style={{ margin:0, fontSize:'1.05rem', fontWeight:700 }}>Đổi lịch tư vấn</h3>
                  <p style={{ margin:0, fontSize:'0.78rem', color:'#6b7280' }}>{consultation.consultation_code}</p>
                </div>
              </div>
              <button onClick={() => setShowRescheduleModal(false)}
                style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#9ca3af' }}>✕</button>
            </div>

            {/* QUY TẮC */}
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'14px', marginBottom:'18px' }}>
              <p style={{ margin:'0 0 8px', fontWeight:700, fontSize:'0.85rem', color:'#1e40af', display:'flex', alignItems:'center', gap:'6px' }}>
                <FaInfoCircle /> Quy tắc đổi lịch
              </p>
              <ul style={{ margin:0, paddingLeft:'18px', fontSize:'0.82rem', color:'#1e3a8a', lineHeight:'1.8' }}>
                <li>Chỉ được đổi lịch <strong>1 lần duy nhất</strong> cho mỗi buổi tư vấn</li>
                <li>Phải đổi trước ít nhất <strong>24 giờ</strong> so với giờ hẹn hiện tại</li>
                <li>Lịch mới phải cách thời điểm hiện tại ít nhất <strong>2 giờ</strong></li>
                
              </ul>
            </div>

            {/* Lịch hiện tại */}
            <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:'8px', padding:'10px 14px', marginBottom:'18px', fontSize:'0.85rem', color:'#92400e', display:'flex', alignItems:'center', gap:'8px' }}>
              <FaClock style={{ flexShrink:0 }} />
              Lịch hiện tại: <strong>{new Date(consultation.appointment_time).toLocaleString('vi-VN')}</strong>
            </div>

            {/* Chọn ngày */}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontWeight:600, fontSize:'0.85rem', color:'#374151', marginBottom:'6px' }}>
                Chọn ngày mới *
              </label>
              <input type="date" value={rescheduleDate}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                onChange={e => handleRescheduleDateChange(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1.5px solid #d1d5db', fontSize:'0.9rem', boxSizing:'border-box' }}
              />
            </div>

            {/* Chọn giờ */}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontWeight:600, fontSize:'0.85rem', color:'#374151', marginBottom:'8px' }}>
                Chọn giờ mới *
                {availableSlots.length > 0 && (
                  <span style={{ marginLeft:8, fontWeight:400, fontSize:'0.78rem', color:'#6b7280' }}>
                    (⬜ trống — có thể chọn &nbsp;|&nbsp; 🚫 bận — không thể chọn)
                  </span>
                )}
              </label>
              {loadingSlots ? (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'#6b7280', fontSize:'0.85rem', padding:'10px 0' }}>
                  <FaSpinner style={{ animation:'cdp-spin 1s linear infinite' }} /> Đang tải khung giờ...
                </div>
              ) : availableSlots.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
                  {availableSlots.map(slot => (
                    <button key={slot.time}
                      disabled={slot.isBusy}
                      onClick={() => !slot.isBusy && setRescheduleTime(slot.time)}
                      title={slot.isBusy ? 'Khung giờ này đã có lịch' : `Chọn ${slot.time}`}
                      style={{
                        padding:'9px 4px', borderRadius:'8px', fontSize:'0.82rem', fontWeight:600,
                        cursor: slot.isBusy ? 'not-allowed' : 'pointer',
                        border: rescheduleTime === slot.time
                          ? '2px solid #3b82f6'
                          : slot.isBusy ? '1.5px solid #fca5a5' : '1.5px solid #d1fae5',
                        background: rescheduleTime === slot.time
                          ? '#eff6ff'
                          : slot.isBusy ? '#fef2f2' : '#f0fdf4',
                        color: rescheduleTime === slot.time
                          ? '#1d4ed8'
                          : slot.isBusy ? '#9ca3af' : '#065f46',
                        textDecoration: slot.isBusy ? 'line-through' : 'none',
                        position:'relative', transition:'all 0.15s'
                      }}>
                      {slot.time}
                      {slot.isBusy && <span style={{ display:'block', fontSize:'0.65rem', marginTop:'2px' }}>Bận</span>}
                    </button>
                  ))}
                </div>
              ) : rescheduleDate ? (
                <div style={{ padding:'12px', background:'#fef2f2', borderRadius:'8px', color:'#991b1b', fontSize:'0.85rem', textAlign:'center' }}>
                  Không có khung giờ nào trong ngày này
                </div>
              ) : (
                <div style={{ padding:'12px', background:'#f0f9ff', borderRadius:'8px', color:'#0369a1', fontSize:'0.85rem', textAlign:'center' }}>
                  Vui lòng chọn ngày để xem khung giờ
                </div>
              )}
            </div>

            {/* Lý do */}
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontWeight:600, fontSize:'0.85rem', color:'#374151', marginBottom:'6px' }}>
                Lý do đổi lịch <span style={{ fontWeight:400, color:'#9ca3af' }}>(tuỳ chọn)</span>
              </label>
              <textarea value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)}
                placeholder="VD: Bận công việc đột xuất, có việc gia đình..."
                rows={3}
                style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1.5px solid #d1d5db', fontSize:'0.88rem', resize:'none', boxSizing:'border-box' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setShowRescheduleModal(false)}
                style={{ flex:1, padding:'0.65rem', borderRadius:'8px', border:'1.5px solid #d1d5db', background:'#fff', fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }}>
                Huỷ
              </button>
              <button onClick={handleRescheduleSubmit}
                disabled={submittingReschedule || !rescheduleDate || !rescheduleTime}
                style={{
                  flex:2, padding:'0.65rem', borderRadius:'8px', border:'none',
                  background: (!rescheduleDate || !rescheduleTime) ? '#bfdbfe' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                  color:'#fff', fontWeight:700, fontSize:'0.88rem',
                  cursor: (!rescheduleDate || !rescheduleTime || submittingReschedule) ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'
                }}>
                {submittingReschedule
                  ? <><FaSpinner style={{ animation:'cdp-spin 1s linear infinite' }} /> Đang xử lý...</>
                  : <><FaCalendarCheck /> Xác nhận đổi lịch</>}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
          onClick={() => setShowCancelModal(false)}>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'28px', maxWidth:'520px', width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ margin:0, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:'8px' }}>
                <FaExclamationTriangle style={{ color:'#f59e0b' }} /> Xác nhận hủy tư vấn
              </h3>
              <button onClick={() => setShowCancelModal(false)} style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#6b7280' }}>✕</button>
            </div>
            <p style={{ marginBottom:'16px', fontSize:'1rem' }}>
              Bạn có chắc chắn muốn hủy tư vấn <strong style={{ color:'#d32f2f' }}>{consultation.consultation_code}</strong> không?
            </p>
            {(() => {
              const preview = calculateConsultationRefundPreview();
              if (!preview) return null;
              const isNoRefund = preview.amount === 0;
              return (
                <div style={{ background: isNoRefund ? '#f5f5f5' : '#edf7ed', border:`1px solid ${isNoRefund ? '#e0e0e0' : '#c8e6c9'}`, borderRadius:'8px', padding:'14px', marginBottom:'16px' }}>
                  <p style={{ margin:'0 0 8px 0', fontWeight:600, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'6px' }}>
                    <FaInfoCircle style={{ color: isNoRefund ? '#9e9e9e' : '#4caf50' }} /> Kiểm tra điều kiện hoàn tiền:
                  </p>
                  <p style={{ margin:'0 0 8px 0', fontSize:'0.88rem', color:'#424242' }}>{preview.message}</p>
                  {!isNoRefund && (
                    <div style={{ fontSize:'0.85rem', background:'#fff', padding:'10px', borderRadius:'6px', border:'1px dashed #a5d6a7' }}>
                      <div>• Tổng tiền đã thanh toán: <strong>{parseFloat(consultation.total_fee||0).toLocaleString('vi-VN')} VNĐ</strong></div>
                      <div>• Tỷ lệ hoàn trả: <strong style={{ color:'#2e7d32' }}>{preview.percent}%</strong></div>
                      <div>• Dự kiến hoàn: <strong style={{ color:'#d32f2f' }}>{preview.amount.toLocaleString('vi-VN')} VNĐ</strong></div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontWeight:600, display:'block', marginBottom:'6px', fontSize:'0.9rem' }}>
                <FaNotesMedical style={{ marginRight:'6px', color:'#0288d1' }} /> Vui lòng nhập lý do hủy *
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ghi rõ lý do hủy tư vấn để hệ thống xử lý hoàn tiền chuẩn xác..."
                rows={4}
                style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc', resize:'none', fontSize:'0.9rem', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setShowCancelModal(false)} disabled={submitting}
                style={{ padding:'0.6rem 1.2rem', borderRadius:'8px', border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontWeight:600 }}>
                Đóng
              </button>
              <button onClick={handleCancelConfirm} disabled={submitting || !cancelReason.trim()}
                style={{ padding:'0.6rem 1.2rem', borderRadius:'8px', border:'none', background: submitting || !cancelReason.trim() ? '#fca5a5' : '#dc2626', color:'#fff', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:'6px' }}>
                {submitting ? <FaSpinner className="cdp-spin" /> : <FaCheckCircle />} Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATING SUCCESS MODAL */}
      {ratingSuccessMsg && (
        <div className="cdp-overlay">
          <div className="cdp-success-modal">
            <div className="cdp-success-icon">✓</div>
            <h3>Gửi đánh giá thành công!</h3>
            <p>{ratingSuccessMsg}</p>
            <button onClick={() => setRatingSuccessMsg('')}>Đóng</button>
          </div>
        </div>
      )}

      {showResultPanel && (
        <InRoomResultPanel
          consultationCode={consultation.consultation_code}
          consultationId={consultation.id}
          onClose={() => setShowResultPanel(false)}
        />
      )}

      <AppointmentRatingModal
        show={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
        mode={ratingMode}
        appointment={ratingModalPayload}
        isSubmitting={isSubmittingRating}
        contextType={ratingTarget === 'doctor' ? 'doctor' : 'consultation'}
      />
    </div>
  );
};

export default ConsultationDetailPage;
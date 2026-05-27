// client/src/pages/AppointmentDetailPage.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH
// - Tích hợp luồng Hồ sơ Y tế (Medical Record)
// - Tích hợp Modal Xác thực Mật khẩu (PasswordConfirmModal)
// - Thay thế axios bằng service và localStorage bằng useAuth

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

// Import CSS
import './AppointmentDetailPage.css';

// Import Service và Components mới
import appointmentService from '../services/appointmentService';
import paymentService from '../services/paymentService';
import medicalRecordService from '../services/medicalRecordService';
import systemService from '../services/systemService'; // THÊM DÒNG NÀY
import { useAuth } from '../contexts/AuthContext';
import PasswordConfirmModal from '../components/auth/PasswordConfirmModal';
// ===== [BƯỚC 3] IMPORT RATING MODAL (2024-05-09) =====
import AppointmentRatingModal from '../components/appointments/AppointmentRatingModal'; 

// Import Icons từ React-Icons
import {
  FaCalendarAlt, FaUserMd, FaHospital, FaClock, FaMoneyBillWave, FaUser,
  FaEnvelope, FaPhone, FaCheckCircle, FaExclamationTriangle, FaArrowLeft,
  FaTimes, FaNotesMedical, FaEdit, FaCreditCard, FaSpinner, FaInfoCircle,
  FaTimesCircle, FaBan, FaVideo, FaHeart, FaMapMarkerAlt, FaStar, FaShieldAlt,
  FaSave, FaPaperPlane, FaSearch, FaStethoscope
} from 'react-icons/fa';
import StatusBadge from '../components/StatusBadge';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const AppointmentDetailPage = () => {
  // Lấy ID từ URL (đã được cấu hình là 'code' trong App.js)
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const guestToken = searchParams.get('token');
  const openRefundParam = searchParams.get('openRefund') === '1';
  const autoOpenedRefundModal = useRef(false);

  // Dùng useAuth để lấy user
  const { user } = useAuth(); 

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Countdown
  const [timeUntilAppointment, setTimeUntilAppointment] = useState(null);
  const [paymentTimeRemaining, setPaymentTimeRemaining] = useState(null);

  // Modals
  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  
  // THÊM STATE LƯU CẤU HÌNH HOÀN TIỀN PHỤC VỤ TÍNH TOÁN DYNAMIC
  const [refundPolicy, setRefundPolicy] = useState(null);

  // Tự động gọi lấy cấu hình hoàn tiền từ Database khi vừa vào trang
  useEffect(() => {
    axios.get(`${API_URL}/system/settings/refund_policy`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      if (res.data) setRefundPolicy(res.data);
    })
    .catch(err => console.error('Lỗi tải cấu hình hoàn tiền:', err));
  }, []);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  // Draft / Result saving states
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftMedicalRecord, setDraftMedicalRecord] = useState(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [medicalEditorText, setMedicalEditorText] = useState('');

  // Draft medical record save (inline while in_progress)
  const saveDraftMedicalRecord = async (recordPayload = {}) => {
    if (!appointment || !appointment.id) return toast.error('Không tìm thấy lịch hẹn');
    try {
      setIsSavingDraft(true);
      const payload = { ...recordPayload, appointment_id: appointment.id, is_draft: true };
      let res;
      if (appointment.MedicalRecord && appointment.MedicalRecord.id) {
        res = await medicalRecordService.updateMedicalRecord(appointment.MedicalRecord.id, payload);
      } else {
        // create expects FormData for files; but for simple JSON fields backend should accept JSON as well
        res = await medicalRecordService.createMedicalRecord(payload);
      }
      if (res.data && res.data.success) {
        setDraftMedicalRecord(res.data.data);
        setIsDraftSaved(true);
        toast.success('Lưu nháp thành công');
        await loadAppointment();
      } else {
        toast.error('Lưu nháp không thành công');
      }
    } catch (err) {
      console.error('Save draft error', err);
      toast.error(err.response?.data?.message || 'Lỗi khi lưu nháp');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const sendFinalMedicalRecord = async (recordPayload = {}) => {
    if (!appointment || !appointment.id) return toast.error('Không tìm thấy lịch hẹn');
    try {
      setSubmitting(true);
      const payload = { ...recordPayload, appointment_id: appointment.id, is_draft: false };
      let res;
      if (appointment.MedicalRecord && appointment.MedicalRecord.id) {
        res = await medicalRecordService.updateMedicalRecord(appointment.MedicalRecord.id, payload);
      } else {
        res = await medicalRecordService.createMedicalRecord(payload);
      }
      if (res.data && res.data.success) {
        toast.success('Kết quả đã gửi cho bệnh nhân');
        await loadAppointment();
      } else {
        toast.error('Gửi kết quả không thành công');
      }
    } catch (err) {
      console.error('Send final record error', err);
      toast.error(err.response?.data?.message || 'Lỗi khi gửi kết quả');
    } finally {
      setSubmitting(false);
    }
  };
  
  // State cho modal đổi phương thức thanh toán
  const [showChangePaymentModal, setShowChangePaymentModal] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('cash');
  const [changingPayment, setChangingPayment] = useState(false);
  
  // State cho modal mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Admin/Doctor update states
  const [adminStatus, setAdminStatus] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [adminCancelReason, setAdminCancelReason] = useState('');
  const [showAdminCancelModal, setShowAdminCancelModal] = useState(false);

  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // --- State Hoàn tiền ---

  const [showRefundModal, setShowRefundModal] = useState(false);
  // ... các state cũ ...
  const [refundPolicyText, setRefundPolicyText] = useState('');
  // Payment reminder
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);

  // ===== [BƯỚC 3] RATING MODAL STATE (2024-05-09) =====
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasRating, setHasRating] = useState(false);
  const [hasDoctorRating, setHasDoctorRating] = useState(false);
  const [doctorRating, setDoctorRating] = useState(null);
  const [ratingTarget, setRatingTarget] = useState('appointment');
  const [ratingMode, setRatingMode] = useState('submit');
  const [showRatingMenu, setShowRatingMenu] = useState(false);

  // Thêm useEffect này để lấy cấu hình khi mở Modal
  useEffect(() => {
    if (showRefundModal) {
      paymentService.getPaymentConfig()
        .then(res => {
          if (res.data.success && res.data.data) {
             // Giả sử backend trả về trường `refund_policy_text` trong json, hoặc bạn tự định nghĩa text mặc định nếu chưa có
             const config = res.data.data;
             // Nếu trong config có text thì lấy, không thì dùng mặc định
             setRefundPolicyText(config.refund_policy_desc || null);
          }
        })
        .catch(err => console.error(err));
    }
  }, [showRefundModal]);

  useEffect(() => {
    if (!appointment || autoOpenedRefundModal.current || !openRefundParam) return;

    const canOpenRefund =
      appointment.status === 'cancelled' &&
      (appointment.payment_status === 'paid_online' || appointment.payment_status === 'paid_at_clinic');

    if (canOpenRefund) {
      autoOpenedRefundModal.current = true;
      setShowRefundModal(true);
    }
  }, [appointment, openRefundParam]);
  const [refundData, setRefundData] = useState({ 
    bankName: '', 
    accountNumber: '', 
    accountHolder: '', 
    reason: '' 
  });

  // Lấy cấu hình hoàn tiền khi vào trang
  useEffect(() => {
    systemService.getRefundPolicy()
      .then(data => {
        if (data) setRefundPolicy(data);
      })
      .catch(err => console.error('Lỗi lấy cấu hình hoàn tiền:', err));
  }, []);

  // ========== INIT ==========
  useEffect(() => {
    // Không cần load user từ localStorage nữa vì đã có useAuth()
    // Chỉ chạy loadAppointment khi 'user' đã được load (nếu không phải guest)
    if (guestToken || user) {
      loadAppointment();
    }
  }, [code, guestToken, user]); // Thêm 'user' vào dependency

  // Countdown timer
  useEffect(() => {
    if (!appointment) return;

    const interval = setInterval(() => {
      updateCountdowns();
    }, 1000);

    return () => clearInterval(interval);
  }, [appointment]);

  // Sync editor text when appointment loads
  useEffect(() => {
    if (!appointment) return;
    const existing = appointment.MedicalRecord?.result || appointment.MedicalRecord?.notes || '';
    setMedicalEditorText(existing);
  }, [appointment?.MedicalRecord]);

  // ========== LOAD DATA ==========
  const loadAppointment = async () => {
    try {
      setLoading(true);
      let response;

      if (guestToken) {
        // Guest dùng token (API này không đổi)
        response = await axios.get(`${API_URL}/appointments/guest/${guestToken}`);
      } else {
        // User đã đăng nhập
        if (!user) {
          // Chờ user load xong
          return; 
        }

        // Dùng service và `code`
        // Hàm getAppointmentByCode đã bao gồm include: MedicalRecord
        response = await appointmentService.getAppointmentByCode(code);
      }

      if (response.data.success) {
        const apptData = response.data.data;
        setAppointment(apptData);
        // Cập nhật state cho form admin
        setAdminStatus(apptData.status);
        setAdminAddress(apptData.appointment_address || '');
        
        // ===== [BƯỚC 3] CHECK IF APPOINTMENT HAS RATING (2024-05-09) =====
        // If appointment completed and patient is owner or guest, check if has rating
        // Rating would come from ConsultationFeedback where appointment_id = id and service_type = 'appointment'
        // For now, check if apptData has rating field or ConsultationFeedback
        const hasExistingRating = apptData.rating || (apptData.ConsultationFeedback && apptData.ConsultationFeedback.length > 0);
        setHasRating(!!hasExistingRating);

        const doctorId = apptData.doctor_id || apptData.Doctor?.user?.id || apptData.Doctor?.User?.id;
        if (!guestToken && user && user.role === 'patient' && doctorId) {
          try {
            const doctorReviewRes = await axios.get(`${API_URL}/statistics/doctor/${doctorId}/my-review`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const existingDoctorReview = doctorReviewRes.data?.data?.review || null;
            setDoctorRating(existingDoctorReview);
            setHasDoctorRating(Boolean(existingDoctorReview));
          } catch (doctorReviewError) {
            setDoctorRating(null);
            setHasDoctorRating(false);
          }
        }
        
        // Auto-open rating modal if: completed, no rating yet, and patient is viewing
        const isPatientViewing = !guestToken && user && user.role === 'patient';
        if (apptData.status === 'completed' && !hasExistingRating && isPatientViewing) {
          // Don't auto-open immediately, just set state; user can click button
          // setShowRatingModal(true);
        }
      }
    } catch (error) {
      console.error('Load appointment error:', error);
      toast.error(error.response?.data?.message || 'Không thể tải thông tin lịch hẹn');
      
      if (error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== [BƯỚC 3] RATING SUBMISSION HANDLER (2024-05-09) =====
  const handleSubmitRating = async (ratingData) => {
    if (!appointment) return toast.error('Không tìm thấy lịch hẹn');
    
    try {
      setIsSubmittingRating(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const doctorId = appointment.doctor_id || appointment.Doctor?.user?.id || appointment.Doctor?.User?.id;

      const response = ratingTarget === 'doctor'
        ? await axios.post(`${API_URL}/statistics/doctor/${doctorId}/reviews`, ratingData, { headers })
        : await axios.put(`${API_URL}/appointments/${appointment.code}/submit-rating`, ratingData, { headers });

      if (response.data.success) {
        toast.success(ratingTarget === 'doctor' ? 'Cảm ơn bạn đã đánh giá bác sĩ!' : 'Cảm ơn đánh giá của bạn! Sẽ được duyệt sớm.');
        setShowRatingModal(false);
        if (ratingTarget === 'doctor') {
          setHasDoctorRating(true);
          setDoctorRating(response.data.data?.review || { ...ratingData, doctor_id: doctorId });
        } else {
          setHasRating(true);
        }
        await loadAppointment(); // Reload để cập nhật UI
      } else {
        toast.error(response.data.message || 'Lỗi khi gửi đánh giá');
      }
    } catch (error) {
      console.error('Rating submission error:', error);
      toast.error(error.response?.data?.message || 'Lỗi server khi gửi đánh giá');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleOpenResultEntry = () => {
    const consultationEntryId = appointment?.consultation_id
      || appointment?.consultation_code
      || appointment?.Consultation?.id
      || appointment?.Consultation?.consultation_code
      || appointment?.consultation?.id
      || appointment?.consultation?.consultation_code;

    if (appointment?.appointment_type === 'online' && consultationEntryId) {
      navigate(`/tu-van/${consultationEntryId}?openResult=1`);
      return;
    }

    navigate(`/nhap-ket-qua/${appointment.code}?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
  };

  const loadAvailableSlotsForReschedule = async (date) => {
    if (!appointment) return;
    try {
      setLoadingSlots(true);
      // API này là public, có thể giữ nguyên axios
      const response = await axios.get(
        `${API_URL}/appointments/available-slots`,
        {
          params: {
            doctor_id: appointment.doctor_id,
            date: date,
            service_id: appointment.service_id
          }
        }
      );

      if (response.data.success) {
        const allSlots = [
          ...response.data.data.grouped.morning,
          ...response.data.data.grouped.afternoon,
          ...response.data.data.grouped.evening
        ].filter(slot => slot.status === 'available');
        
        setAvailableSlots(allSlots);
      }
    } catch (error) {
      console.error('Load slots error:', error);
      toast.error('Không thể tải lịch trống');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const parseAppointmentDateTime = (dateStr, timeStr = '00:00:00') => {
    if (!dateStr) return null;

    const safeDate = String(dateStr).split('T')[0];
    const safeTime = String(timeStr || '00:00:00').slice(0, 8);
    const [year, month, day] = safeDate.split('-').map(Number);
    const [hours, minutes, seconds] = safeTime.split(':').map(Number);

    if (!year || !month || !day) return null;

    return new Date(
      year,
      month - 1,
      day,
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
      Number.isFinite(seconds) ? seconds : 0
    );
  };

  const isOnlinePaymentMethod = (method) => {
    return ['vnpay', 'momo', 'bank_transfer', 'online'].includes((method || '').toLowerCase());
  };

  const isCashPaymentMethod = (method) => {
    return (method || '').toLowerCase() === 'cash';
  };

  const getPaymentMethodSelection = (method) => {
    return isCashPaymentMethod(method) ? 'cash' : 'online';
  };

  const mapSelectionToBackendMethod = (selection, currentMethod) => {
    if (selection === 'cash') return 'cash';
    if (isOnlinePaymentMethod(currentMethod)) return currentMethod;
    return 'bank_transfer';
  };

  // ========== COUNTDOWN LOGIC ==========
  const updateCountdowns = () => {
    if (!appointment) return;
    const now = new Date();
    const appointmentDateTime = parseAppointmentDateTime(
      appointment.appointment_date,
      appointment.appointment_start_time
    );
    if (!appointmentDateTime) return;
    const paymentDeadline = appointment.payment_hold_until ? new Date(appointment.payment_hold_until) : null;

    // Time until appointment
    const diffMs = appointmentDateTime.getTime() - now.getTime();
    if (diffMs > 0 && appointment.status === 'confirmed') {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeUntilAppointment({ days, hours, minutes, seconds });
    } else {
      setTimeUntilAppointment(null);
    }

    // Payment time remaining
    if (paymentDeadline && appointment.payment_status === 'unpaid') {
      const paymentDiffMs = paymentDeadline.getTime() - now.getTime();
      if (paymentDiffMs > 0) {
        const hours = Math.floor(paymentDiffMs / (1000 * 60 * 60));
        const minutes = Math.floor((paymentDiffMs % (1000 * 60 * 60)) / (1000 * 60));
        setPaymentTimeRemaining({ hours, minutes });
      } else {
        setPaymentTimeRemaining(null);
        // (Có thể tự động hủy nếu hết giờ)
      }
    }
  };

  // ========== BUSINESS LOGIC ==========
  const canCancelAppointment = () => {
    if (!appointment) return false;
    const isPassed = !!appointment.isPassed || appointment.status === 'passed';
    if (['cancelled', 'completed', 'in_progress'].includes(appointment.status) || isPassed) return false;
    const now = new Date();
    const appointmentDateTime = parseAppointmentDateTime(
      appointment.appointment_date,
      appointment.appointment_start_time
    );
    if (!appointmentDateTime) return false;
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    // UI chỉ khóa mờ nút khi đã qua giờ hẹn, validation chính xác (mấy tiếng) sẽ do Backend quyết định và báo lỗi Toast.
    return hoursDiff > 0; 
  };

  const canRescheduleAppointment = () => {
    if (!appointment) return false;
    const isPassed = !!appointment.isPassed || appointment.status === 'passed';
    if (['cancelled', 'completed', 'in_progress'].includes(appointment.status) || isPassed) return false;
    if ((appointment.reschedule_count || 0) >= 3) return false;
    const now = new Date();
    const appointmentDateTime = parseAppointmentDateTime(
      appointment.appointment_date,
      appointment.appointment_start_time
    );
    if (!appointmentDateTime) return false;
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  const needPayment = () => {
    return appointment && appointment.payment_status === 'unpaid' && appointment.status !== 'cancelled';
  };

  const renderRefundRules = () => {
    if (!refundPolicy) return "Thời gian cho phép hủy lịch và tỷ lệ hoàn tiền tuân theo quy định của phòng khám.";
    
    // Tách riêng logic online và offline
    const policyType = appointment?.appointment_type === 'online' ? 'consultation' : 'appointment';
    const rules = refundPolicy[policyType]?.rules || [];
    
    if (rules.length === 0) return "Thời gian cho phép hủy lịch và tỷ lệ hoàn tiền tuân theo quy định của phòng khám.";

    // Sắp xếp các mốc thời gian từ lớn đến nhỏ (vd: 48h, 24h, 0h)
    const sortedRules = [...rules].sort((a, b) => b.hours_before - a.hours_before);
    
    return (
      <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', color: '#555' }}>
        {sortedRules.map((rule, idx) => (
          <li key={idx} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
            Hủy trước <strong>{rule.hours_before} giờ</strong>: Hoàn <strong>{rule.refund_percent}%</strong>
          </li>
        ))}
      </ul>
    );
  };

  // Hàm tính toán quyền lợi hoàn tiền thời gian thực hiển thị lên Form Hủy
  const calculateRefundPreview = () => {
    if (!appointment) return null;
    
    const now = new Date();
    const appointmentDateTime = parseAppointmentDateTime(
      appointment.appointment_date,
      appointment.appointment_start_time
    );
    if (!appointmentDateTime) return null;
    
    // Tính số giờ chênh lệch từ hiện tại đến giờ khám
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Kiểm tra trạng thái lịch hẹn đã thanh toán thực tế chưa
    const isPaid = ['paid_online', 'paid_at_clinic', 'paid'].includes(appointment.payment_status);
    const price = appointment.Service?.price || 0;
    
    // Trường hợp chưa thanh toán hoặc dịch vụ 0đ
    if (!isPaid || price === 0) {
      return {
        hoursLeft: hoursDiff.toFixed(1),
        percent: 0,
        amount: 0,
        message: "Lịch hẹn chưa thanh toán hoặc miễn phí. Thao tác hủy lịch sẽ không phát sinh hoàn tiền."
      };
    }
    
    let refundPercent = 0;
    // Đọc mảng cấu hình rules từ database đã cấu hình ở Admin
    if (refundPolicy) {
      const policyType = appointment.appointment_type === 'online' ? 'consultation' : 'appointment';
      const rules = refundPolicy[policyType]?.rules || [];
      // Sắp xếp mốc thời gian từ lớn đến nhỏ để check điều kiện
      const sortedRules = [...rules].sort((a, b) => b.hours_before - a.hours_before);
      
      for (const rule of sortedRules) {
        if (hoursDiff >= rule.hours_before) {
          refundPercent = rule.refund_percent;
          break;
        }
      }
    } else {
      // Fallback dự phòng nếu chưa load kịp cấu hình từ database
      if (hoursDiff >= 24) refundPercent = 100;
      else if (hoursDiff >= 6) refundPercent = 50;
    }
    
    const refundAmount = Math.round((price * refundPercent) / 100);
    
    return {
      hoursLeft: hoursDiff.toFixed(1),
      percent: refundPercent,
      amount: refundAmount,
      message: hoursDiff > 0 
        ? `Thời gian từ hiện tại đến giờ khám còn: ${hoursDiff.toFixed(1)} giờ. Áp dụng quy định hoàn trả:`
        : `Lịch hẹn đã quá giờ quy định.`
    };
  };

  // ========== HANDLERS ==========

  // Handler Hủy lịch
  const handleCancelClick = () => {
    if (!canCancelAppointment()) {
      toast.error('Chỉ có thể hủy lịch hẹn trước ít nhất 6 tiếng');
      return;
    }
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy');
      return;
    }
    try {
      setSubmitting(true);
      // Dùng service
      await appointmentService.cancelAppointment(code, cancelReason);
      
      toast.success('Đã hủy lịch hẹn thành công');
      setShowCancelModal(false);
      setCancelReason('');
      loadAppointment();
      
    } catch (error) {
      console.error('Cancel appointment error:', error);
      toast.error(error.response?.data?.message || 'Không thể hủy lịch hẹn');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Đổi lịch
  const handleRescheduleClick = () => {
    if (!canRescheduleAppointment()) {
      if ((appointment.reschedule_count || 0) >= 3) {
        toast.error('Bạn đã đổi lịch tối đa 3 lần');
      } else {
        toast.error('Chỉ có thể đổi lịch hẹn trước 24 tiếng (1 ngày)');
      }
      return;
    }
    setNewDate('');
    setNewTime('');
    setAvailableSlots([]);
    setShowRescheduleModal(true);
  };

  const handleNewDateChange = (date) => {
    setNewDate(date);
    setNewTime('');
    setAvailableSlots([]);
    if (date) {
      loadAvailableSlotsForReschedule(date);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!newDate || !newTime) {
      toast.error('Vui lòng chọn ngày và giờ mới');
      return;
    }
    try {
      setSubmitting(true);
      
      const payload = {
        new_date: newDate,
        new_start_time: newTime,
        new_service_id: appointment.service_id,
        new_doctor_id: appointment.doctor_id,
      };

      // Dùng service
      await appointmentService.rescheduleAppointment(code, payload);
      
      toast.success('Đổi lịch hẹn thành công!');
      setShowRescheduleModal(false);
      loadAppointment();

    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error(error.response?.data?.message || 'Không thể đổi lịch hẹn');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Thanh toán
  const handlePaymentClick = () => {
  // Truyền kèm amount thực tế từ Payment record (đã trừ discount)
  const paymentAmount = appointment.Payment?.amount 
    ? parseFloat(appointment.Payment.amount) 
    : appointment.Service?.price;
  const servicePrice = appointment.Service?.price || 0;
  const hasDiscount = paymentAmount && paymentAmount < servicePrice;

  navigate(`/thanh-toan/${code}${guestToken ? `?token=${guestToken}` : ''}`, {
    state: {
      preAppliedAmount: paymentAmount,       // Số tiền thực cần thanh toán
      originalAmount: servicePrice,          // Giá gốc (để hiển thị gạch ngang)
      discountAmount: hasDiscount ? (servicePrice - paymentAmount) : 0,
      promotionId: appointment.Payment?.promotion_id || null
    }
  });
};


  // Handler Cập nhật của Admin
  const handleAdminUpdate = async () => {
    if (adminStatus === 'cancelled' && !adminCancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy (khi Admin/BS hủy)');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Dùng service
      await appointmentService.updateAppointmentDetails(code, {
          status: adminStatus,
          appointment_address: adminAddress,
          cancel_reason: adminCancelReason,
      });

      toast.success('Cập nhật lịch hẹn thành công!');
      loadAppointment();
      
    } catch (error) {
      console.error('Admin update error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!nextStatus || !appointment) return;

    if (nextStatus === 'cancelled' && !adminCancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy (khi Admin/BS hủy)');
      return;
    }

    try {
      setSubmitting(true);
      setAdminStatus(nextStatus);

      await appointmentService.updateAppointmentDetails(code, {
        status: nextStatus,
        appointment_address: adminAddress,
        cancel_reason: adminCancelReason,
      });

      toast.success('Cập nhật lịch hẹn thành công!');
      loadAppointment();
    } catch (error) {
      console.error('Status update error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraftMedicalRecord = () => {
    return saveDraftMedicalRecord({
      result: medicalEditorText,
      notes: medicalEditorText
    });
  };

  const handleSendMedicalRecord = () => {
    return sendFinalMedicalRecord({
      result: medicalEditorText,
      notes: medicalEditorText
    });
  };

  // Handler cho luồng Hồ sơ Y tế (MỚI)
  const handleViewMedicalRecord = () => {
    // Mở modal
    setShowPasswordModal(true);
  };
  
  const handlePasswordConfirm = () => {
    // Mật khẩu đã được xác thực bởi Modal
    setShowPasswordModal(false);
    
    // Điều hướng đến trang xem kết quả
    navigate(`/ket-qua-kham/${appointment.MedicalRecord.id}`);
  };

  const handleRefundSubmit = async () => {
    if (!refundData.bankName || !refundData.accountNumber || !refundData.accountHolder || !refundData.reason) {
      toast.warning('Vui lòng điền đầy đủ thông tin nhận tiền và lý do.');
      return;
    }
    try {
      setSubmitting(true);
      // Gộp thông tin ngân hàng thành chuỗi để gửi API cũ (hoặc gửi object nếu API mới hỗ trợ)
      const bankInfoString = `${refundData.bankName} - STK: ${refundData.accountNumber} - Tên: ${refundData.accountHolder.toUpperCase()}`;
      
      await paymentService.requestRefund({
        appointment_id: appointment.id,
        reason: refundData.reason,
        bank_info: bankInfoString
      });
      
      toast.success('Gửi yêu cầu thành công. Chúng tôi sẽ phản hồi trong 24h.');
      setShowRefundModal(false);
      loadAppointment();
    } catch (error) {
      toast.error('Lỗi khi gửi yêu cầu hoàn tiền.');
    } finally {
      setSubmitting(false);
    }
  };

  // ========== PAYMENT REMINDER ==========
  useEffect(() => {
    if (!appointment) return;
    try {
      const PAYMENT_REMINDER_MINUTES = 30; // mặc định nhắc 30 phút trước
      if (
        appointment.payment_status === 'unpaid' &&
        appointment.status === 'confirmed' &&
        isOnlinePaymentMethod(appointment.payment_method)
      ) {
        const apptDate = parseAppointmentDateTime(
          appointment.appointment_date,
          appointment.appointment_start_time
        );
        if (!apptDate) return;
        const now = new Date();
        const diffMin = (apptDate.getTime() - now.getTime()) / 60000;
        const shownKey = `paymentReminderShown_${appointment.code}`;
        if (diffMin > 0 && diffMin <= PAYMENT_REMINDER_MINUTES && !sessionStorage.getItem(shownKey)) {
          setShowPaymentReminder(true);
          sessionStorage.setItem(shownKey, '1');
        }
      }
    } catch (err) {
      console.error('Payment reminder check error:', err);
    }
  }, [appointment]);

  // Handler đổi phương thức thanh toán
  const handleChangePaymentMethod = async (shouldRedirectToPayment = false) => {
    if (!newPaymentMethod) {
      toast.warning('Vui lòng chọn phương thức thanh toán');
      return;
    }

    const nextPaymentMethod = mapSelectionToBackendMethod(newPaymentMethod, appointment.payment_method);

    if (nextPaymentMethod === appointment.payment_method) {
      toast.info('Phương thức thanh toán không thay đổi');
      return;
    }

    try {
      setChangingPayment(true);
      const response = await appointmentService.changePaymentMethod(code, {
        payment_method: nextPaymentMethod
      }, guestToken);

      if (response.data.success) {
        toast.success('Đổi phương thức thanh toán thành công!');
        setShowChangePaymentModal(false);
        await loadAppointment();

        if (shouldRedirectToPayment && nextPaymentMethod !== 'cash') {
          navigate(`/thanh-toan/${code}${guestToken ? `?token=${guestToken}` : ''}`);
        }
      }
    } catch (error) {
      console.error('Change payment error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi đổi phương thức thanh toán');
    } finally {
      setChangingPayment(false);
    }
  };

  // ========== HELPERS (Format) ==========
  const getStatusInfo = (status) => {
    const info = {
      pending: { text: 'Chờ xác nhận', class: 'status-pending', icon: <FaClock /> },
      confirmed: { text: 'Đã xác nhận', class: 'status-confirmed', icon: <FaCheckCircle /> },
      in_progress: { text: 'Đang khám', class: 'status-in-progress', icon: <FaSpinner className="fa-spin" /> },
      completed: { text: 'Đã hoàn thành', class: 'status-completed', icon: <FaCheckCircle /> },
      cancelled: { text: 'Đã hủy', class: 'status-cancelled', icon: <FaBan /> }
    };
    return info[status] || info.pending;
  };

  // Hàm map trạng thái sang hiển thị
  const getPaymentStatusInfo = (status) => {
    const info = {
      // 1. Chưa thanh toán (Màu vàng/cam)
      unpaid: { 
          text: 'Chưa thanh toán', 
          class: 'payment-pending', // CSS màu vàng
          icon: <FaClock /> 
      },
      pending: { text: 'Chưa thanh toán', class: 'payment-pending', icon: <FaClock /> },
      
      // 2. Đã thanh toán ONLINE (Màu xanh) - Dành cho VNPay/MoMo
      paid_online: { 
          text: 'Đã thanh toán Online', 
          class: 'payment-paid', // CSS màu xanh
          icon: <FaCheckCircle /> 
      },
      
      // 3. Đã thanh toán TẠI QUẦY (Màu xanh) - Dành cho Thu ngân thu tiền [QUAN TRỌNG]
      paid_at_clinic: { 
          text: 'Đã thanh toán tại quầy', // Sửa text cho đúng thực tế
          class: 'payment-paid',          // Dùng chung class màu xanh với Online để thể hiện đã xong
          icon: <FaHospital />            // Dùng icon Bệnh viện để phân biệt với Online
      },
      
      // 4. Các trạng thái khác
      paid: { text: 'Đã thanh toán', class: 'payment-paid', icon: <FaCheckCircle /> },
      refunded: { text: 'Đã hoàn tiền', class: 'payment-refunded', icon: <FaMoneyBillWave /> },
      not_required: { text: 'Miễn phí', class: 'payment-free', icon: <FaCheckCircle /> }
    };
    
    // Nếu không tìm thấy trạng thái thì mặc định là unpaid
    return info[status] || info.unpaid;
  };

  const formatDate = (dateStr) => {
    const date = parseAppointmentDateTime(dateStr);
    if (!date) return 'N/A';
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : 'N/A';
  const formatCheckinRange = (startTime, endTime, appointmentType) => {
    if (!startTime) return 'N/A';

    const startLabel = formatTime(startTime);
    if (endTime) return `${startLabel} - ${formatTime(endTime)}`;

    if (appointmentType === 'offline') {
      const [hours, minutes] = String(startTime).slice(0, 5).split(':').map(Number);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        const endHour = String((hours + 1) % 24).padStart(2, '0');
        const endMinute = String(minutes).padStart(2, '0');
        return `${startLabel} - ${endHour}:${endMinute}`;
      }
    }

    return startLabel;
  };
  const formatDateTime = (dateStr) => {
     if (!dateStr) return 'N/A';
     return new Date(dateStr).toLocaleString('vi-VN');
  }

  // ========== RENDER ==========
  if (loading || (!guestToken && !user)) { // Chờ cả loading và user (nếu ko phải guest)
    return (
      <div className="appointment-detail-page-container">
        <div className="appointment-detail-page-loading">
          <FaSpinner className="fa-spin" />
          <span>Đang tải thông tin lịch hẹn...</span>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="appointment-detail-page-container">
        <div className="appointment-detail-page-wrapper">
          <div className="appointment-detail-page-notfound">
            <div className="notfound-illustration" aria-hidden>
              <FaTimesCircle />
            </div>
            <h2>Không tìm thấy lịch hẹn</h2>
            <p className="notfound-sub">Lịch hẹn không tồn tại hoặc bạn không có quyền xem.</p>

            <div className="notfound-actions">
              <button
                className="btn-home"
                onClick={() => navigate('/')}
                aria-label="Về trang chủ"
              >
                <FaArrowLeft />
                <span>Về trang chủ</span>
              </button>

              <button
                className="appointment-detail-page-btn-action btn-secondary"
                onClick={() => navigate(-1)}
                aria-label="Quay lại"
                style={{ marginLeft: 12 }}
              >
                <FaArrowLeft /> Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Lấy thông tin đã format
  const statusInfo = getStatusInfo(appointment.status);
  const paymentInfo = getPaymentStatusInfo(appointment.payment_status);
  
  // Check quyền
  const isPatient = user && user.role === 'patient';
  const isAdminOrDoctor = user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'staff');
  const isOwner = isPatient && user.id === appointment.Patient?.user_id;
  const sharedHealthHistory = (() => {
    const raw = appointment?.Patient?.medical_history;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (error) { return null; }
    }
    return raw;
  })();
  const canViewSharedHealthProfile = Boolean(sharedHealthHistory?.share_with_doctors);
  const doctorProfileCode = appointment?.Doctor?.user?.code
    || appointment?.Doctor?.User?.code
    || appointment?.Doctor?.code
    || appointment?.doctor_code;

  return (
    <div className="appointment-detail-page-container">
      <div className="appointment-detail-page-wrapper">
        {/* Header */}
        <div className="appointment-detail-page-header">
          <div className="appointment-detail-page-header-left">
            <button className="appointment-detail-page-btn-back" onClick={() => navigate(-1)}>
              <FaArrowLeft />
              Quay lại
            </button>
            <h1 className="appointment-detail-page-title">
              Chi tiết lịch hẹn: {appointment.code}
            </h1>
          </div>
          <div>
            <StatusBadge status={appointment.status} appointment={appointment} />
          </div>
        </div>

        {/* Content */}
        <div className="appointment-detail-page-content-grid">
          
          {/* CỘT BÊN TRÁI (Thông tin chính) */}
          <div className="appointment-detail-page-main-col">
          
            {/* Countdown Alert */}
            {timeUntilAppointment && (
              <div className="appointment-detail-page-alert alert-info">
                <FaClock />
                <span>
                  Lịch hẹn sẽ diễn ra sau: 
                  <strong> {timeUntilAppointment.days} ngày, {timeUntilAppointment.hours} giờ, {timeUntilAppointment.minutes} phút</strong>
                </span>
              </div>
            )}

            {/* Payment Warning */}
            {needPayment() && paymentTimeRemaining && isOnlinePaymentMethod(appointment.payment_method) && (
              <>
                {/* Critical alert when < 10 minutes left */}
                {paymentTimeRemaining.hours === 0 && paymentTimeRemaining.minutes < 10 && (
                  <div className="appointment-detail-page-alert alert-danger" style={{
                    animation: 'blink 1s infinite',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    <FaExclamationTriangle style={{fontSize: '1.5em', marginRight: '10px'}} />
                    <div>
                      <strong>⏰ HẠNG CẤP: Thanh toán trong {paymentTimeRemaining.minutes} phút!</strong>
                      <p style={{marginTop: '5px', fontSize: '0.9em'}}>
                        Nếu không thanh toán, lịch hẹn sẽ bị tự động hủy.
                      </p>
                    </div>
                  </div>
                )}

                {/* Normal warning alert */}
                {!(paymentTimeRemaining.hours === 0 && paymentTimeRemaining.minutes < 10) && (
                  <div className="appointment-detail-page-alert alert-warning">
                    <FaExclamationTriangle />
                    <div>
                      <strong>Chưa thanh toán!</strong> Vui lòng thanh toán trong 
                      <strong> {paymentTimeRemaining.hours} giờ {paymentTimeRemaining.minutes} phút</strong> để giữ lịch.
                    </div>
                    <button 
                      className="appointment-detail-page-btn-action btn-payment-small"
                      onClick={handlePaymentClick}
                    >
                      <FaCreditCard />
                      Thanh toán
                    </button>
                  </div>
                )}

                {/* Critical button when < 10 minutes */}
                {paymentTimeRemaining.hours === 0 && paymentTimeRemaining.minutes < 10 && (
                  <button 
                    className="appointment-detail-page-btn-action btn-payment-small"
                    style={{
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      marginTop: '10px',
                      animation: 'pulse 1.5s infinite'
                    }}
                    onClick={handlePaymentClick}
                  >
                    <FaCreditCard />
                    THANH TOÁN NGAY
                  </button>
                )}
              </>
            )}

            {/* Payment reminder popup (nếu cần) */}
            {showPaymentReminder && (
              <div className="abp-modal-overlay" onClick={() => setShowPaymentReminder(false)}>
                <div className="abp-modal" onClick={e => e.stopPropagation()}>
                  <div className="abp-modal-header">
                    <h3><FaExclamationTriangle style={{ color: '#f57c00' }} /> Nhắc thanh toán</h3>
                    <button className="abp-modal-close-btn" onClick={() => setShowPaymentReminder(false)}><FaTimes /></button>
                  </div>
                  <div className="abp-modal-body">
                    <p>
                      Lịch hẹn <strong>{appointment.code}</strong> chưa được thanh toán. Vui lòng thanh toán trước <strong>30 phút</strong> để khi đến viện bạn có thể check-in và nhận số ưu tiên.
                    </p>
                  </div>
                  <div className="abp-modal-footer">
                    <button className="abp-btn-secondary" onClick={() => setShowPaymentReminder(false)}>Nhắc sau</button>
                    <button className="abp-btn-primary" onClick={() => { setShowPaymentReminder(false); handlePaymentClick(); }}>Thanh toán ngay</button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Hủy lịch */}
            {appointment.status === 'cancelled' && (
              <div className="appointment-detail-page-alert alert-danger">
                <FaBan />
                <span>
                  Lịch đã hủy lúc: {formatDateTime(appointment.cancelled_at)}
                  {appointment.cancel_reason && (
                    <span className="appointment-detail-page-reason-text">Lý do: {appointment.cancel_reason}</span>
                  )}
                </span>
              </div>
            )}

            {/* Hoàn thành */}
            {appointment.status === 'completed' && (
              <div className="appointment-detail-page-alert alert-success">
                <FaCheckCircle />
                <span>
                  Lịch hẹn đã hoàn thành lúc: {formatDateTime(appointment.completed_at)}
                </span>
              </div>
            )}


            {/* Thông tin lịch hẹn */}
            <div className="appointment-detail-page-card">
              <h2 className="appointment-detail-page-card-title">
                <FaCalendarAlt />
                Thông tin lịch hẹn
              </h2>
              <div className="appointment-detail-page-info-grid">
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaNotesMedical /> Dịch vụ</div>
                  <div className="appointment-detail-page-info-value">{appointment.Service?.name}</div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaHeart /> Chuyên khoa</div>
                  <div className="appointment-detail-page-info-value">{appointment.Specialty?.name || 'Đa khoa'}</div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaUserMd /> Bác sĩ</div>
                  <div className="appointment-detail-page-info-value doctor-value">
                    <span>BS. {appointment.Doctor?.user?.full_name || appointment.Doctor?.User?.full_name || 'Chưa cập nhật'}</span>
                    {doctorProfileCode && (
                      <Link
                        to={`/bac-si/${doctorProfileCode}`}
                        state={{
                          returnTo: location.pathname + location.search,
                          returnState: {
                            appointmentDetail: {
                              code,
                              token: guestToken
                            }
                          }
                        }}
                        className="appointment-detail-page-inline-link"
                        rel="noopener noreferrer"
                      >
                        Xem hồ sơ bác sĩ
                      </Link>
                    )}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaHospital /> Hình thức</div>
                  <div className="appointment-detail-page-info-value">
                    {appointment.appointment_type === 'online' ? <FaVideo /> : <FaHospital />}
                    {appointment.appointment_type === 'online' ? ' Trực tuyến' : ' Trực tiếp'}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaCalendarAlt /> Ngày khám</div>
                  <div className="appointment-detail-page-info-value">{formatDate(appointment.appointment_date)}</div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaClock /> Thời gian checkin</div>
                  <div className="appointment-detail-page-info-value">
                    {formatCheckinRange(appointment.appointment_start_time, appointment.appointment_end_time, appointment.appointment_type)}
                  </div>
                </div>
                
                {/* Hiển thị địa chỉ khám */}
                <div className="appointment-detail-page-info-item full-width">
                  <div className="appointment-detail-page-info-label"><FaMapMarkerAlt /> Địa chỉ khám</div>
                  <div className="appointment-detail-page-info-value">
                    {appointment.appointment_address || 'Tầng 1, Tòa nhà Easy Medify, 123 Đường Sức Khỏe, Quận 1, TP. HCM'}
                  </div>
                </div>

              </div>
              {appointment.reason && (
                <div className="appointment-detail-page-reason-box">
                  <strong>Lý do khám:</strong> {appointment.reason}
                </div>
              )}
            </div>

            {/* Thông tin bệnh nhân */}
            <div className="appointment-detail-page-card">
              <h2 className="appointment-detail-page-card-title">
                <FaUser />
                Thông tin bệnh nhân
              </h2>
              <div className="appointment-detail-page-info-grid">
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaUser /> Họ tên</div>
                  <div className="appointment-detail-page-info-value">
                    {/* Sửa .user thành .User (viết hoa chữ U) */}
                    {appointment.Patient?.User?.full_name || appointment.guest_name || 'N/A'}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaEnvelope /> Email</div>
                  <div className="appointment-detail-page-info-value">
                    {/* Sửa .user thành .User (viết hoa chữ U) */}
                    {appointment.Patient?.User?.email || appointment.guest_email || 'N/A'}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label"><FaPhone /> Số điện thoại</div>
                  <div className="appointment-detail-page-info-value">
                  {/* Sửa .user thành .User (viết hoa chữ U) */}
                  {appointment.Patient?.User?.phone || appointment.guest_phone || 'N/A'}
                </div>
                </div>
              </div>
            </div>
            
            {/* Khung Kết quả khám - Khi đã hoàn thành */}
            {(appointment.status === 'completed' || appointment.status === 'passed') && (
              <div className="appointment-detail-page-card">
                <h2 className="appointment-detail-page-card-title">
                  <FaNotesMedical />
                  Kết quả khám
                </h2>
                
                {!appointment.MedicalRecord && (
                  <p className="appointment-detail-page-rating-text">
                    Bác sĩ đang cập nhật kết quả. Vui lòng quay lại sau.
                  </p>
                )}
                
                {isOwner && appointment.MedicalRecord && (
                   <button 
                     className="appointment-detail-page-btn-action btn-primary"
                     onClick={handleViewMedicalRecord}
                   >
                     <FaShieldAlt /> Xem chi tiết hồ sơ y tế (Bảo mật)
                   </button>
                )}

                {isAdminOrDoctor && appointment.MedicalRecord && (
                  <button 
                    type="button"
                    onClick={handleOpenResultEntry}
                    className="appointment-detail-page-btn-action btn-primary"
                  >
                    <FaEdit /> Xem & Chỉnh sửa kết quả
                  </button>
                )}
              </div>
            )}

          </div>
          
          {/* CỘT BÊN PHẢI (Thanh toán & Thao tác) */}
          <div className="appointment-detail-page-sidebar-col">
            
            {/* ADMIN STATUS CARD - Quản lý trạng thái khám (dành cho bác sĩ/staff) */}
            {isAdminOrDoctor && (
              <div className="appointment-detail-page-card admin-status-card">
                <h2 className="appointment-detail-page-card-title">
                  <FaStethoscope /> Quản lý trạng thái khám
                </h2>
                
                {/* Status Stepper - Option A UI */}
                {(appointment.status === 'confirmed' || appointment.status === 'in_progress' || appointment.status === 'completed' || appointment.status === 'passed') && (
                  <div className="appointment-detail-page-status-stepper">
                    {/* Step 1: Xác nhận */}
                    <div className={`stepper-step ${appointment.status !== 'pending' ? 'completed' : 'active'}`}>
                      <div className="stepper-circle">
                        {appointment.status !== 'pending' ? <FaCheckCircle /> : '1'}
                      </div>
                      <div className="stepper-label">Xác nhận</div>
                    </div>
                    <div className="stepper-line"></div>
                    
                    {/* Step 2: Đang khám */}
                    <div className={`stepper-step ${(appointment.status === 'in_progress' || appointment.status === 'completed' || appointment.status === 'passed') ? (appointment.status === 'in_progress' ? 'active' : 'completed') : 'pending'}`}>
                      <div className="stepper-circle">
                        {(appointment.status === 'completed' || appointment.status === 'passed') ? <FaCheckCircle /> : (appointment.status === 'in_progress' ? <FaSpinner className="spin" /> : '2')}
                      </div>
                      <div className="stepper-label">Đang khám</div>
                    </div>
                    <div className="stepper-line"></div>
                    
                    {/* Step 3: Hoàn thành */}
                    <div className={`stepper-step ${(appointment.status === 'completed' || appointment.status === 'passed') ? 'completed' : 'pending'}`}>
                      <div className="stepper-circle">
                        {(appointment.status === 'completed' || appointment.status === 'passed') ? <FaCheckCircle /> : '3'}
                      </div>
                      <div className="stepper-label">Hoàn thành</div>
                    </div>
                  </div>
                )}
                
                {/* Status Buttons */}
                <div className="appointment-detail-page-button-group" style={{ marginTop: '16px' }}>
                  {appointment.status === 'confirmed' && (
                    <>
                      <button
                        className="appointment-detail-page-btn-action btn-start-exam"
                        onClick={() => handleStatusChange('in_progress')}
                      >
                        <FaCheckCircle /> Đã vào
                      </button>
                    </>
                  )}
                  {appointment.status === 'in_progress' && (
                    <>
                      <button
                        className="appointment-detail-page-btn-action btn-complete"
                        onClick={() => handleStatusChange('completed')}
                      >
                        <FaCheckCircle /> Hoàn thành khám
                      </button>
                    </>
                  )}
                </div>

                {canViewSharedHealthProfile && isAdminOrDoctor && (
                  <div style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      className="appointment-detail-page-btn-action btn-secondary"
                      onClick={() => navigate(`/ho-so-suc-khoe-cong-khai/${appointment.code}`)}
                    >
                      <FaInfoCircle /> Xem hồ sơ sức khỏe chia sẻ
                    </button>
                  </div>
                )}
                
                {isAdminOrDoctor && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                    <button
                      type="button"
                      onClick={handleOpenResultEntry}
                      className="appointment-detail-page-btn-action btn-primary"
                      style={{ width: '100%', display: 'inline-flex', justifyContent: 'center' }}
                    >
                      <FaNotesMedical /> {appointment.MedicalRecord ? 'Nhập / cập nhật kết quả khám' : 'Nhập kết quả khám'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Thanh toán */}
            <div className="appointment-detail-page-card">
              <h2 className="appointment-detail-page-card-title">
                <FaMoneyBillWave />
                Thanh toán
              </h2>
              <div className="appointment-detail-page-info-grid payment-grid">
                <div className="appointment-detail-page-info-item">
                <div className="appointment-detail-page-info-label">Giá dịch vụ</div>
                <div className="appointment-detail-page-info-value price">
                  {/* Hiển thị giá gốc bị gạch ngang nếu có giảm giá */}
                  {appointment.Payment && parseFloat(appointment.Payment.amount) < parseFloat(appointment.Service?.price) ? (
                    <>
                      <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.85rem', marginRight: 6 }}>
                        {appointment.Service?.price?.toLocaleString('vi-VN')} VNĐ
                      </span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>
                        {parseFloat(appointment.Payment.amount).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </>
                  ) : (
                    <>{appointment.Service?.price?.toLocaleString('vi-VN')} VNĐ</>
                  )}
                </div>
              </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label">Phương thức</div>
                  <div className="appointment-detail-page-info-value">
                    {isCashPaymentMethod(appointment.payment_method) ? (
                      <>
                        <FaHospital style={{ marginRight: 6 }} />
                        Thanh toán tại quầy
                      </>
                    ) : (
                      <>
                        <FaCreditCard style={{ marginRight: 6 }} />
                        Thanh toán online
                      </>
                    )}
                  </div>
                </div>
                <div className="appointment-detail-page-info-item">
                  <div className="appointment-detail-page-info-label">Trạng thái</div>
                  <div className={`appointment-detail-page-payment-status ${paymentInfo.class}`}>
                    {paymentInfo.icon}
                    {paymentInfo.text}
                  </div>
                </div>
                {appointment.payment_hold_until && appointment.payment_status === 'unpaid' && (
                  <div className="appointment-detail-page-info-item">
                    <div className="appointment-detail-page-info-label">Hạn thanh toán</div>
                    <div className="appointment-detail-page-info-value" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                      {new Date(appointment.payment_hold_until).toLocaleString('vi-VN')}
                      {paymentTimeRemaining && (
                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#f57c00' }}>
                          Còn {paymentTimeRemaining.hours}h {paymentTimeRemaining.minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {needPayment() && isOnlinePaymentMethod(appointment.payment_method) && (
                <button
                  className="appointment-detail-page-btn-action btn-payment"
                  onClick={handlePaymentClick}
                >
                  <FaCreditCard />
                  Thanh toán ngay
                </button>
              )}
              {needPayment() && (
                <div className="appointment-detail-page-info-box" style={{
                  backgroundColor: '#fff8e1',
                  border: '1px solid #ffe082',
                  borderRadius: '6px',
                  padding: '12px',
                  marginTop: '12px'
                }}>
                  <p style={{ fontSize: '0.92rem', margin: 0, color: '#7c4700' }}>
                    <FaInfoCircle style={{ marginRight: '8px' }} />
                    <strong>Lưu ý:</strong>
                    {isCashPaymentMethod(appointment.payment_method)
                      ? ' Vui lòng có mặt trước lịch hẹn 30 phút để đóng tiền và check-in.'
                      : ' Lịch hẹn đang chờ thanh toán online. Nếu chưa thanh toán ngay, vui lòng hoàn tất trước thời gian checkin để tránh ảnh hưởng lịch hẹn.'}
                  </p>
                </div>
              )}
              {needPayment() && appointment.status === 'pending' && (
                <button
                  className="appointment-detail-page-btn-action btn-secondary"
                  onClick={() => {
                    setNewPaymentMethod(getPaymentMethodSelection(appointment.payment_method));
                    setShowChangePaymentModal(true);
                  }}
                  style={{ marginTop: '10px' }}
                >
                  <FaEdit />
                  {appointment.payment_method ? 'Đổi phương thức thanh toán' : 'Chọn phương thức thanh toán'}
                </button>
              )}
              {/* --- [BẮT ĐẦU] CODE THÊM NÚT HOÀN TIỀN --- */}
              {appointment.status === 'cancelled' && 
               (appointment.payment_status === 'paid_online' || appointment.payment_status === 'paid_at_clinic') && (
                <div style={{ marginTop: '15px', borderTop: '1px dashed #ddd', paddingTop: '15px' }}>
                  <div className="alert alert-warning" style={{ fontSize: '0.9rem', padding: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaExclamationTriangle className="text-warning" /> 
                    <span>Lịch đã hủy nhưng bạn đã thanh toán.</span>
                  </div>
                  
                  <button
                    className="appointment-detail-page-btn-action"
                    style={{ backgroundColor: '#f59e0b', color: 'white' }}
                    onClick={() => setShowRefundModal(true)} 
                  >
                    <FaMoneyBillWave /> Yêu cầu hoàn tiền
                  </button>
                </div>
              )}
              {/* --- [KẾT THÚC] --- */}
            </div>

            {/* Thao tác (Chỉ chủ sở hữu hoặc guest mới thấy) */}
            {(isOwner || guestToken) && ['pending', 'confirmed'].includes(appointment.status) && (
              <div className="appointment-detail-page-card">
                <h2 className="appointment-detail-page-card-title">
                  <FaEdit />
                  Thao tác
                </h2>
                <div className="appointment-detail-page-action-buttons">
                  <button
                    className="appointment-detail-page-btn-action btn-reschedule"
                    onClick={handleRescheduleClick}
                    disabled={!canRescheduleAppointment()}
                    title={
                      !canRescheduleAppointment() 
                      ? "Chỉ có thể đổi lịch trước 24 tiếng và tối đa 3 lần" 
                      : "Đổi lịch hẹn (còn " + (3 - (appointment.reschedule_count || 0)) + " lần)"
                    }
                  >
                    <FaEdit />
                    Đổi lịch
                  </button>

                  <button
                    className="appointment-detail-page-btn-action btn-cancel"
                    onClick={handleCancelClick}
                    disabled={!canCancelAppointment()}
                    title={!canCancelAppointment() ? "Đã quá thời gian cho phép hủy lịch" : "Hủy lịch hẹn"}
                  >
                    <FaTimes />
                    Hủy lịch
                  </button>
                </div>
                <div className="appointment-detail-page-action-notes">
                  <p><FaInfoCircle /> Đổi lịch trước 24 tiếng (còn {3 - (appointment.reschedule_count || 0)}/3 lần)</p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '8px' }}>
                    <FaInfoCircle style={{ marginTop: '4px', marginRight: '6px', color: '#1890ff' }} />
                    <div>
                      <span style={{ fontWeight: 600, color: '#333' }}>Quy định hủy lịch & hoàn tiền:</span>
                      {renderRefundRules()}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Nút đánh giá */}
            {isOwner && appointment.status === 'completed' && (
              <div className="appointment-detail-page-card">
                 <h2 className="appointment-detail-page-card-title">
                  <FaStar />
                  {hasRating || hasDoctorRating ? 'Xem đánh giá' : 'Đánh giá'}
                </h2>
                <p className="appointment-detail-page-rating-text">
                  {hasRating || hasDoctorRating
                    ? 'Bạn có thể xem đánh giá của lịch hẹn hoặc bác sĩ ở đây.'
                    : 'Vui lòng chia sẻ cảm nhận của bạn để giúp chúng tôi cải thiện dịch vụ.'}
                </p>
                <div style={{ position: 'relative' }}>
                  <button
                    className="appointment-detail-page-btn-action btn-rating"
                    onClick={() => setShowRatingMenu(prev => !prev)}
                    aria-haspopup="true"
                    aria-expanded={showRatingMenu}
                  >
                    <FaStar />
                    {hasRating || hasDoctorRating ? 'Xem đánh giá' : 'Viết đánh giá'}
                  </button>

                  {showRatingMenu && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      background: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: 8,
                      boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                      padding: 8,
                      zIndex: 40,
                      minWidth: 200
                    }}>
                      <button
                        className="appointment-detail-page-btn-action"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 6 }}
                        onClick={() => {
                          setShowRatingMenu(false);
                          setRatingTarget('appointment');
                          setRatingMode(hasRating ? 'view' : 'submit');
                          setShowRatingModal(true);
                        }}
                      >
                        <FaStar /> {hasRating ? 'Xem đánh giá Lịch hẹn' : 'Đánh giá Lịch hẹn'}
                      </button>

                      <button
                        className="appointment-detail-page-btn-action"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
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

            {/* Khung Quản lý địa chỉ & Thông tin bổ sung */}
            {isAdminOrDoctor && (
              <div className="appointment-detail-page-card admin-card">
                <h2 className="appointment-detail-page-card-title">
                  <FaShieldAlt />
                  Thông tin quản lý
                </h2>
                
                {/* Cập nhật địa chỉ */}
                <div className="appointment-detail-page-form-group">
                  <label htmlFor="adminAddress"><FaMapMarkerAlt /> Cập nhật địa chỉ khám</label>
                  <textarea 
                    id="adminAddress"
                    className="appointment-detail-page-form-control"
                    value={adminAddress}
                    onChange={(e) => setAdminAddress(e.target.value)}
                    placeholder="Nhập địa chỉ khám (nếu cần thay đổi)..."
                    rows={3}
                  />
                </div>

                {/* Nút hủy lịch (nếu cần) */}
                {['pending', 'confirmed', 'in_progress'].includes(appointment.status) && (
                  <button
                    className="appointment-detail-page-btn-action btn-cancel"
                    onClick={() => setShowAdminCancelModal(true)}
                    style={{ marginTop: '10px' }}
                  >
                    <FaBan /> Hủy lịch (Admin)
                  </button>
                )}
              </div>
            )}
            
          </div>
        </div>

      </div>
      
      {/* ===== MODALS ===== */}
      
      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="appointment-detail-page-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="appointment-detail-page-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="appointment-detail-page-modal-header">
              <h2><FaExclamationTriangle /> Xác nhận hủy lịch hẹn</h2>
              <button className="appointment-detail-page-btn-close" onClick={() => setShowCancelModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="appointment-detail-page-modal-body" style={{ padding: '20px' }}>
              <p className="appointment-detail-page-modal-text" style={{ fontSize: '1.05rem', marginBottom: '15px' }}>
                Bạn có chắc chắn muốn hủy lịch hẹn <strong style={{ color: '#d32f2f' }}>{appointment.code}</strong> không?
              </p>
              
              {/* Box hiển thị nhắc nhở & tính toán số tiền hoàn trả thực tế tự động */}
              {(() => {
                const preview = calculateRefundPreview();
                if (!preview) return null;
                const isNoRefund = preview.amount === 0;
                return (
                  <div style={{
                    backgroundColor: isNoRefund ? '#f5f5f5' : '#edf7ed',
                    border: `1px solid ${isNoRefund ? '#e0e0e0' : '#c8e6c9'}`,
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 600, color: isNoRefund ? '#616161' : '#1e4620', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaInfoCircle style={{ color: isNoRefund ? '#9e9e9e' : '#4caf50' }} /> Kiểm tra điều kiện hoàn tiền phòng khám:
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#424242', lineHeight: '1.4' }}>
                      {preview.message}
                    </p>
                    {!isNoRefund && (
                      <div style={{ fontSize: '0.88rem', color: '#1e4620', paddingLeft: '5px', backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px dashed #a5d6a7' }}>
                        <div style={{ marginBottom: '4px' }}>• Tổng số tiền đã thanh toán: <strong>
                          {(appointment.Payment?.amount 
                            ? parseFloat(appointment.Payment.amount) 
                            : appointment.Service?.price
                          )?.toLocaleString('vi-VN')} VNĐ
                        </strong></div>
                        <div style={{ marginBottom: '4px' }}>• Tỷ lệ hoàn trả quy định: <strong style={{ color: '#2e7d32', fontSize: '1.05rem' }}>{preview.percent}%</strong></div>
                        <div>• Số tiền hoàn lại dự kiến: <strong style={{ color: '#d32f2f', fontSize: '1.1rem' }}>{preview.amount.toLocaleString('vi-VN')} VNĐ</strong></div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="appointment-detail-page-form-group">
                <label htmlFor="cancelReason" style={{ fontWeight: 600, marginBottom: '6px', display: 'block', color: '#333' }}>
                  <FaNotesMedical style={{ marginRight: '6px', color: '#0288d1' }} /> Vui lòng nhập lý do hủy lịch của bạn *
                </label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="appointment-detail-page-form-control"
                  placeholder="Vui lòng ghi rõ lý do hủy lịch hẹn (Ví dụ: Trùng lịch trình, Đổi ngày khám khác...) để phòng khám xử lý hoàn tiền chuẩn xác nhất..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'none' }}
                />
              </div>
            </div>
            <div className="appointment-detail-page-modal-footer">
              <button
                className="appointment-detail-page-btn-modal btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={submitting}
              >
                Đóng
              </button>
              <button
                className="appointment-detail-page-btn-modal btn-danger"
                onClick={handleCancelConfirm}
                disabled={submitting || !cancelReason.trim()}
              >
                {submitting ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <div className="appointment-detail-page-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="appointment-detail-page-modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="appointment-detail-page-modal-header">
              <h2><FaEdit /> Đổi lịch hẹn</h2>
              <button className="appointment-detail-page-btn-close" onClick={() => setShowRescheduleModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="appointment-detail-page-modal-body">
              <div className="appointment-detail-page-current-appointment">
                <strong>Lịch hiện tại:</strong> {formatDate(appointment.appointment_date)} | Thời gian checkin: {formatCheckinRange(appointment.appointment_start_time, appointment.appointment_end_time, appointment.appointment_type)}
              </div>
              <div className="appointment-detail-page-form-grid">
                <div className="appointment-detail-page-form-group">
                  <label htmlFor="newDate"><FaCalendarAlt /> Chọn ngày mới *</label>
                  <input
                    type="date"
                    id="newDate"
                    value={newDate}
                    onChange={(e) => handleNewDateChange(e.target.value)}
                    min={new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="appointment-detail-page-form-control"
                  />
                </div>
              </div>

              {newDate && (
                <div className="appointment-detail-page-form-group">
                  <label><FaClock /> Chọn giờ mới *</label>
                  {loadingSlots ? (
                    <div className="appointment-detail-page-loading-small">
                      <FaSpinner className="fa-spin" /> Đang tải lịch trống...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="appointment-detail-page-empty-small">
                      <FaCalendarAlt />
                      <p>Không có lịch trống trong ngày này. Vui lòng chọn ngày khác.</p>
                    </div>
                  ) : (
                    <div className="appointment-detail-page-slot-grid">
                      {availableSlots.map(slot => (
                        <button
                          key={slot.time}
                          className={`appointment-detail-page-slot-button ${newTime === slot.time ? 'selected' : ''}`}
                          onClick={() => setNewTime(slot.time)}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="appointment-detail-page-modal-footer">
              <button
                className="appointment-detail-page-btn-modal btn-secondary"
                onClick={() => setShowRescheduleModal(false)}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                className="appointment-detail-page-btn-modal btn-primary"
                onClick={handleRescheduleConfirm}
                disabled={submitting || !newDate || !newTime}
              >
                {submitting ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
                Xác nhận đổi lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác thực Mật khẩu */}
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />

      {/* ===== [BƯỚC 3] APPOINTMENT RATING MODAL (2024-05-09) ===== */}
      <AppointmentRatingModal
        show={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
        mode={ratingMode}
        appointment={ratingTarget === 'doctor' && doctorRating ? { ...appointment, rating: doctorRating.rating, review: doctorRating.review } : appointment}
        isSubmitting={isSubmittingRating}
        contextType={ratingTarget}
      />

      {/* MODAL HOÀN TIỀN */}
      {showRefundModal && appointment && (
        <div className="appointment-detail-page-modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="appointment-detail-page-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="appointment-detail-page-modal-header">
              <h2><FaMoneyBillWave /> Yêu cầu hoàn tiền</h2>
              <button className="appointment-detail-page-btn-close" onClick={() => setShowRefundModal(false)}>
                <FaTimes />
              </button>
            </div>

            {/* PHÂN NHÁNH: Đã gửi yêu cầu → xem, Chưa gửi → form */}
            {appointment.RefundRequest ? (
              <>
                <div className="appointment-detail-page-modal-body">
                  {/* Hiển thị trạng thái yêu cầu đã gửi */}
                  <div className="appointment-detail-page-info-box" style={{
                    backgroundColor: appointment.RefundRequest.status === 'completed' ? '#f0fdf4'
                      : appointment.RefundRequest.status === 'rejected' ? '#fef2f2' : '#fff8e1',
                    border: `1px solid ${appointment.RefundRequest.status === 'completed' ? '#bbf7d0'
                      : appointment.RefundRequest.status === 'rejected' ? '#fecaca' : '#ffe082'}`,
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem',
                      color: appointment.RefundRequest.status === 'completed' ? '#047857'
                        : appointment.RefundRequest.status === 'rejected' ? '#b91c1c' : '#7c4700'
                    }}>
                      {appointment.RefundRequest.status === 'completed' && <><FaCheckCircle style={{ marginRight: '8px' }} />Yêu cầu hoàn tiền đã được xử lý xong.</>}
                      {appointment.RefundRequest.status === 'rejected' && <><FaTimesCircle style={{ marginRight: '8px' }} />Yêu cầu hoàn tiền đã bị từ chối.</>}
                      {appointment.RefundRequest.status === 'pending' && <><FaClock style={{ marginRight: '8px' }} />Yêu cầu hoàn tiền đang chờ xử lý.</>}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gap: '8px', fontSize: '0.92rem' }}>
                    <div><strong>Ngân hàng:</strong> {appointment.RefundRequest.bank_info || '---'}</div>
                    <div><strong>Lý do:</strong> {appointment.RefundRequest.reason || '---'}</div>
                    <div><strong>Ngày gửi:</strong> {new Date(appointment.RefundRequest.created_at || appointment.RefundRequest.createdAt).toLocaleString('vi-VN')}</div>
                    {appointment.RefundRequest.admin_note && (
                      <div><strong>Ghi chú từ phòng khám:</strong> {appointment.RefundRequest.admin_note}</div>
                    )}
                  </div>
                </div>

                <div className="appointment-detail-page-modal-footer">
                  {/* Chỉ cho chỉnh sửa nếu còn pending */}
                  {appointment.RefundRequest.status === 'pending' && (
                    <button
                      className="appointment-detail-page-btn-modal btn-primary"
                      onClick={() => {
                        // Điền lại form từ data cũ để chỉnh sửa
                        const raw = appointment.RefundRequest.bank_info || '';
                        const stkMatch = raw.match(/STK:\s*([^\s-]+)/i);
                        const tenMatch = raw.match(/Tên:\s*([^-\n]+)/i);
                        const bankMatch = raw.match(/^([^-]+)\s*-/i);
                        setRefundData({
                          bankName: bankMatch ? bankMatch[1].trim() : '',
                          accountNumber: stkMatch ? stkMatch[1].trim() : '',
                          accountHolder: tenMatch ? tenMatch[1].trim() : '',
                          reason: appointment.RefundRequest.reason || ''
                        });
                        // Tạm thời xóa RefundRequest khỏi state để hiện form (không gọi API)
                        setAppointment(prev => ({ ...prev, RefundRequest: null }));
                      }}
                    >
                      <FaEdit /> Chỉnh sửa yêu cầu
                    </button>
                  )}
                  <button
                    className="appointment-detail-page-btn-modal btn-secondary"
                    onClick={() => setShowRefundModal(false)}
                  >
                    Đóng
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="appointment-detail-page-modal-body">
                  <div className="appointment-detail-page-info-box" style={{
                    backgroundColor: '#fff8e1',
                    border: '1px solid #ffe082',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: 0, color: '#7c4700' }}>
                      <FaExclamationTriangle style={{ marginRight: '8px' }} />
                      Lịch hẹn <strong>{appointment.code}</strong> đã bị hủy và đã thanh toán. Bạn có thể gửi yêu cầu hoàn tiền tại đây.
                    </p>
                  </div>

                  <div className="appointment-detail-page-form-group">
                    <label htmlFor="refundBankName"><FaHospital /> Ngân hàng nhận tiền *</label>
                    <input
                      id="refundBankName"
                      type="text"
                      className="appointment-detail-page-form-control"
                      value={refundData.bankName}
                      onChange={(e) => setRefundData({ ...refundData, bankName: e.target.value })}
                      placeholder="Ví dụ: Vietcombank"
                    />
                  </div>

                  <div className="appointment-detail-page-form-group">
                    <label htmlFor="refundAccountNumber"><FaCreditCard /> Số tài khoản *</label>
                    <input
                      id="refundAccountNumber"
                      type="text"
                      className="appointment-detail-page-form-control"
                      value={refundData.accountNumber}
                      onChange={(e) => setRefundData({ ...refundData, accountNumber: e.target.value })}
                      placeholder="Nhập số tài khoản nhận tiền"
                    />
                  </div>

                  <div className="appointment-detail-page-form-group">
                    <label htmlFor="refundAccountHolder"><FaUser /> Chủ tài khoản *</label>
                    <input
                      id="refundAccountHolder"
                      type="text"
                      className="appointment-detail-page-form-control"
                      value={refundData.accountHolder}
                      onChange={(e) => setRefundData({ ...refundData, accountHolder: e.target.value })}
                      placeholder="Nhập tên chủ tài khoản"
                    />
                  </div>

                  <div className="appointment-detail-page-form-group">
                    <label htmlFor="refundReason"><FaNotesMedical /> Lý do hoàn tiền *</label>
                    <textarea
                      id="refundReason"
                      className="appointment-detail-page-form-control"
                      value={refundData.reason}
                      onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                      placeholder="Nhập lý do bạn muốn hoàn tiền..."
                    />
                  </div>

                  {refundPolicyText && (
                    <div className="appointment-detail-page-info-box" style={{
                      backgroundColor: '#f1f8e9',
                      border: '1px solid #c8e6c9',
                      borderRadius: '6px',
                      padding: '12px',
                      marginTop: '12px'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.92rem', color: '#4e6b2f' }}>
                        <FaInfoCircle style={{ marginRight: '8px' }} />
                        <strong>Quy định hoàn tiền:</strong> {refundPolicyText}
                      </p>
                    </div>
                  )}
                </div>

                <div className="appointment-detail-page-modal-footer">
                  <button
                    className="appointment-detail-page-btn-modal btn-secondary"
                    onClick={() => setShowRefundModal(false)}
                    disabled={submitting}
                  >
                    Đóng
                  </button>
                  <button
                    className="appointment-detail-page-btn-modal btn-primary"
                    onClick={handleRefundSubmit}
                    disabled={submitting}
                  >
                    {submitting ? <FaSpinner className="fa-spin" /> : <FaMoneyBillWave />}
                    Gửi yêu cầu hoàn tiền
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL HỦY (ADMIN CANCEL) */}
      {showAdminCancelModal && (
        <div className="appointment-detail-page-modal-overlay" onClick={() => setShowAdminCancelModal(false)}>
          <div className="appointment-detail-page-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="appointment-detail-page-modal-header">
              <h2><FaBan /> Hủy lịch hẹn (Admin)</h2>
              <button className="appointment-detail-page-btn-close" onClick={() => setShowAdminCancelModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="appointment-detail-page-modal-body">
              <p className="appointment-detail-page-modal-text">
                Hủy lịch hẹn <strong>{appointment.code}</strong> bắt buộc phải có lý do.
              </p>
              <div className="appointment-detail-page-form-group">
                <label htmlFor="adminCancelReasonModal"><FaNotesMedical /> Lý do hủy *</label>
                <textarea
                  id="adminCancelReasonModal"
                  value={adminCancelReason}
                  onChange={(e) => setAdminCancelReason(e.target.value)}
                  className="appointment-detail-page-form-control"
                  placeholder="Nhập lý do hủy lịch hẹn từ phía Admin..."
                  rows={4}
                />
              </div>
            </div>
            <div className="appointment-detail-page-modal-footer">
              <button
                className="appointment-detail-page-btn-modal btn-secondary"
                onClick={() => { setShowAdminCancelModal(false); setAdminCancelReason(''); }}
                disabled={submitting}
              >
                Hủy bỏ
              </button>
              <button
                className="appointment-detail-page-btn-modal btn-danger"
                onClick={() => { handleStatusChange('cancelled').then(() => setShowAdminCancelModal(false)); }}
                disabled={submitting || !adminCancelReason.trim()}
              >
                {submitting ? <FaSpinner className="fa-spin" /> : <FaBan />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI PHƯƠNG THỨC THANH TOÁN */}
      {showChangePaymentModal && (
        <div className="appointment-detail-page-modal-overlay" onClick={() => setShowChangePaymentModal(false)}>
          <div className="appointment-detail-page-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="appointment-detail-page-modal-header">
              <h2><FaMoneyBillWave /> Đổi phương thức thanh toán</h2>
              <button className="appointment-detail-page-btn-close" onClick={() => setShowChangePaymentModal(false)}><FaTimes /></button>
            </div>
            
            <div className="appointment-detail-page-modal-body">
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Chọn hoặc đổi phương thức thanh toán cho lịch hẹn chưa thanh toán.
              </p>
              
              <div className="appointment-detail-page-form-group">
                <label>Phương thức thanh toán *</label>
                <select 
                  className="appointment-detail-page-form-control"
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                >
                  <option value="cash">Thanh toán tại quầy</option>
                  <option value="online">Thanh toán online</option>
                </select>
              </div>

              <div className="appointment-detail-page-info-box" style={{ 
                backgroundColor: '#f1f8e9', 
                border: '1px solid #c8e6c9', 
                borderRadius: '6px', 
                padding: '12px',
                marginTop: '15px'
              }}>
                <p style={{ fontSize: '0.9rem', margin: '0', color: '#558b2f' }}>
                  <FaInfoCircle style={{ marginRight: '8px' }} />
                  <strong>Lưu ý:</strong> 
                  {newPaymentMethod === 'cash' 
                    ? ' Bạn sẽ thanh toán tại quầy. Vui lòng có mặt trước 30 phút để đóng tiền và check-in.'
                    : ' Bạn chọn thanh toán online. Nếu chưa thanh toán ngay, hệ thống sẽ tiếp tục nhắc để bạn hoàn tất trước thời gian checkin.'}
                </p>
              </div>
            </div>

            <div className="appointment-detail-page-modal-footer">
              <button 
                className="appointment-detail-page-btn-modal btn-secondary" 
                onClick={() => setShowChangePaymentModal(false)}
                disabled={changingPayment}
              >
                Hủy bỏ
              </button>
              <button 
                className="appointment-detail-page-btn-modal btn-primary"
                onClick={() => handleChangePaymentMethod(newPaymentMethod === 'online')}
                disabled={changingPayment}
              >
                {changingPayment
                  ? <FaSpinner className="fa-spin" />
                  : (newPaymentMethod === 'online' ? 'Xác nhận & Thanh toán ngay' : 'Xác nhận')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AppointmentDetailPage;
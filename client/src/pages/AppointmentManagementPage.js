// client/src/pages/AppointmentManagementPage.js
// PHIÊN BẢN CẬP NHẬT HOÀN CHỈNH (ĐÃ FIX LỖI UNDEFINED PHONE)
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppointmentActionButtons from '../components/appointments/AppointmentActionButtons';
import appointmentService from '../services/appointmentService';
import medicalRecordService from '../services/medicalRecordService'; 
import ConfirmModal from '../components/medical/ConfirmModal';
import { toast } from 'react-toastify';
import CheckinTab from '../components/appointments/CheckinTab';
import './AppointmentManagementPage.css';

import {
  FaCalendarAlt, FaClock, FaUserMd, FaCheckCircle, FaTimesCircle, 
  FaHourglassHalf, FaEye, FaBan, FaFilter, FaSearch, FaDownload, 
  FaPhone, FaEnvelope, FaSpinner, FaTimes,
  FaChevronDown, FaChevronUp, FaChevronRight, FaLock, FaSyncAlt, FaCheck,
  FaHospital, FaPlay, FaNotesMedical, FaMoneyBillWave, FaClipboardCheck,
  FaStethoscope, FaFileAlt, FaList, FaCreditCard, FaUniversity, FaGlobe,
  FaFileExcel, FaLink
} from 'react-icons/fa';

// StatusBadge inline component
const StatusBadge = ({ status, appointment }) => {
  const s = String(status || '').toLowerCase();
  const map = {
    pending: { text: 'Chờ xác nhận', cls: 'amp-status-pending', icon: <FaHourglassHalf /> },
    confirmed: { text: 'Đã xác nhận', cls: 'amp-status-confirmed', icon: <FaCheckCircle /> },
    in_progress: { text: 'Đang khám', cls: 'amp-status-in-progress', icon: <FaSpinner /> },
    waiting_result: { text: 'Chờ kết quả', cls: 'amp-status-waiting-result', icon: <FaHourglassHalf /> },
    completed: { text: 'Đã hoàn thành', cls: 'amp-status-completed', icon: <FaCheckCircle /> },
    cancelled: { text: 'Đã hủy', cls: 'amp-status-cancelled', icon: <FaTimes /> }
  };
  const info = map[s] || map.pending;
  return (
    <div className={`admin-appt-page-status-badge ${info.cls}`} role="status" aria-label={info.text}>
      <span className="amp-me-1">{info.icon}</span>
      <span>{info.text}</span>
    </div>
  );
};

const getPatientUser = (patient) => patient?.user || patient?.User || null;
const getAppointmentPatientName = (appointment) => getPatientUser(appointment?.Patient)?.full_name || appointment?.guest_name || 'Khách vãng lai';
const getAppointmentPatientPhone = (appointment) => getPatientUser(appointment?.Patient)?.phone || appointment?.guest_phone || 'N/A';
const getAppointmentPatientEmail = (appointment) => getPatientUser(appointment?.Patient)?.email || appointment?.guest_email || 'N/A';
const getAppointmentSourceLabel = (appointment) => {
  const context = appointment?.booking_context || {};
  if (context.source === 'front_desk_online') return 'Lễ tân đặt hộ';
  if (context.source === 'front_desk_walkin') return 'Khách tại quầy';
  if (context.booking_for === 'other') {
    return `Người thân${context.relationship ? ` - ${context.relationship}` : ''}`;
  }
  if (appointment?.patient_id) return 'Bản thân';
  if (!appointment?.patient_id && appointment?.guest_name) return 'Khách tại quầy';
  return 'Không rõ';
};

const getSubServiceRequirementLabel = (appointment) => {
  const context = appointment?.booking_context || {};
  if (!context.parent_code) return null;
  return context.required ? 'Bắt buộc' : 'Tùy chọn';
};

const getLinkedAppointmentSummary = (appointment) => {
  const context = appointment?.booking_context || {};
  const serviceIndications = Array.isArray(appointment?.service_indications) ? appointment.service_indications : [];
  const linkedChildren = serviceIndications.filter((item) => (
    item?.type === 'sub_appointment' || item?.linked_appointment_code || item?.appointment_code
  ));

  return {
    isChild: Boolean(context.parent_code),
    parentCode: context.parent_code || null,
    required: Boolean(context.required),
    linkedChildren,
  };
};

const formatLinkedMode = (mode) => {
  if (mode === 'immediate') return 'Khám ngay';
  if (mode === 'schedule') return 'Đặt lịch phụ';
  return 'Liên kết';
};

const AppointmentManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); 
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // --- 1. Lấy danh sách bác sĩ nếu là Staff ---
  useEffect(() => {
    const fetchAssignedDoctors = async () => {
      if (user && user.role === 'staff') {
        try {
          const token = localStorage.getItem('token');
          const profileRes = await axios.get('http://localhost:3001/api/staff/my-profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (profileRes.data.success) {
            const staffId = profileRes.data.data.id;
            const doctorsRes = await axios.get(`http://localhost:3001/api/staff/${staffId}/doctors`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (doctorsRes.data.success) {
              console.log('DEBUG assignedDoctors:', doctorsRes.data.data);
              setAssignedDoctors(doctorsRes.data.data || []);
            }
          }
        } catch (error) {
          console.error("Lỗi lấy danh sách bác sĩ:", error);
        }
      }
    };
    fetchAssignedDoctors();
  }, [user]);

  // Helper function để nhóm bác sĩ theo specialty
  const groupDoctorsBySpecialty = (doctors) => {
    const groups = {};
    doctors.forEach(doctor => {
      const specialty = doctor.specialty?.name || doctor.Specialty?.name || 'Chưa phân loại';
      if (!groups[specialty]) {
        groups[specialty] = [];
      }
      groups[specialty].push(doctor);
    });
    return groups;
  };

  const doctorGroups = groupDoctorsBySpecialty(assignedDoctors);

  // Khi chọn bác sĩ -> Gọi lại hàm lấy dữ liệu
  useEffect(() => {
    fetchAllAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId]); 
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    status: 'all',
    date: '',
    doctor: '',
    search: '',
    sortBy: 'newest', // newest, oldest, code
    service: '', // Lọc theo dịch vụ

    paymentStatus: 'all' // unpaid, paid_online, paid_at_clinic, all
  });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' hoặc 'checkin'
  
  // State cho hàng mở rộng
  const [expandedRow, setExpandedRow] = useState(null); 
  
  // State cho nút reset code
  const [isResettingCode, setIsResettingCode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // State cho modal payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'cash',
    paid_at: new Date().toISOString().slice(0, 16)
  });

  useEffect(() => {
    if (showPaymentModal) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [showPaymentModal]);

  const normalizeStatusFilter = (status) => {
    switch (status) {
      case 'upcoming':
        return 'confirmed';
      case 'waiting_exam':
        return 'in_progress';
      case 'passed':
        return 'completed';
      case 'waiting_result':
        return 'waiting_result';
      default:
        return status;
    }
  };

  useEffect(() => {
    const allowedStatuses = new Set(['all', 'pending', 'confirmed', 'upcoming', 'waiting_pay', 'waiting_exam', 'waiting_result', 'in_progress', 'completed', 'passed', 'cancelled']);
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const nextFilters = {};

    if (status && allowedStatuses.has(status)) {
      nextFilters.status = status === 'waiting_pay' ? 'waiting_pay' : normalizeStatusFilter(status);
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      nextFilters.date = date;
    }

    // Xử lý filters từ navigation state (từ CalendarView click)
    if (location.state?.filters) {
      const stateFilters = location.state.filters;
      if (stateFilters.doctor_id) {
        setSelectedDoctorId(stateFilters.doctor_id);
      }
      if (stateFilters.appointment_date && /^\d{4}-\d{2}-\d{2}$/.test(stateFilters.appointment_date)) {
        nextFilters.date = stateFilters.appointment_date;
      }
    }

    if (Object.keys(nextFilters).length > 0) {
      setFilters((previousFilters) => ({
        ...previousFilters,
        ...nextFilters
      }));
    }
  }, [location.search, location.state]);

  useEffect(() => {
    fetchAllAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, appointments, sortConfig]);

  // --- 2. Lấy dữ liệu & Sắp xếp Mới nhất trước ---
  const fetchAllAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDoctorId) params.doctor_id = selectedDoctorId;
      
      let response;
      // Role-aware fetching:
      // - patient: only their appointments
      // - doctor: doctor's own appointments
      // - staff (clinical): staff-managed doctors' appointments
      // - admin / other staff: all appointments
      if (user?.role === 'patient') {
        response = await appointmentService.getMyAppointments(params);
      } else if (user?.role === 'doctor') {
        response = await appointmentService.getDoctorAppointments(params);
      } else if (user?.role === 'staff' && user?.department === 'clinical') {
        response = await appointmentService.getStaffManagedAppointments(params);
      } else {
        response = await appointmentService.getAllAppointments(params);
      }
      
      if (response.data.success) {
        // SẮP XẾP: Theo ngày tạo giảm dần (Lịch hẹn vừa tạo lên đầu)
        const sortedAppointments = (response.data.data || []).sort((a, b) => {
          // Primary: Sort by created_at descending (newest created first)
          const createdA = new Date(a.created_at);
          const createdB = new Date(b.created_at);
          
          if (isNaN(createdA.getTime()) && isNaN(createdB.getTime())) return 0;
          if (isNaN(createdA.getTime())) return 1;
          if (isNaN(createdB.getTime())) return -1;

          return createdB.getTime() - createdA.getTime();
        });
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Lỗi khi tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentAction = async (action, appointment) => {
    if (!appointment) return;
    switch (action) {
      case 'confirm':
        openActionModal(appointment, 'confirm');
        break;
      case 'cancel':
        openActionModal(appointment, 'cancel');
        break;
      case 'checkin':
        try {
          setIsSubmitting(true);
          if (appointment.id) {
            await appointmentService.checkInAppointment(appointment.id, {});
          } else if (appointment.code) {
            await appointmentService.checkIn(appointment.code, 'clinical');
          }
          toast.success('Check-in thành công');
          fetchAllAppointments();
        } catch (err) {
          console.error('Check-in error', err);
          toast.error('Không thể check-in');
        } finally {
          setIsSubmitting(false);
        }
        break;
      default:
        console.warn('Unhandled appointment action:', action);
        break;
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];
    if (filters.status !== 'all') {
      if (filters.status === 'waiting_pay') {
        filtered = filtered.filter(apt => apt.payment_status === 'unpaid');
      } else {
        filtered = filtered.filter(apt => apt.status === normalizeStatusFilter(filters.status));
      }
    }
    if (filters.date) {
      filtered = filtered.filter(apt => apt.appointment_date === filters.date);
    }
    if (filters.doctor) {
      filtered = filtered.filter(apt => 
        apt.Doctor?.user?.full_name?.toLowerCase().includes(filters.doctor.toLowerCase())
      );
    }
    if (filters.service) {
      filtered = filtered.filter(apt => 
        apt.Service?.name?.toLowerCase().includes(filters.service.toLowerCase())
      );
    }

    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(apt => apt.payment_status === filters.paymentStatus);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.code?.toLowerCase().includes(searchLower) ||
        (getAppointmentPatientName(apt))?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.email || apt.guest_email)?.toLowerCase().includes(searchLower) ||
        (apt.Patient?.user?.phone || apt.guest_phone)?.includes(filters.search)
      );
    }

    // Sắp xếp
    if (filters.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (filters.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (filters.sortBy === 'code') {
      filtered.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    }

    const compareText = (left, right) => String(left || '').localeCompare(String(right || ''), 'vi', { sensitivity: 'base' });
    const compareDateTime = (left, right) => {
      const leftDate = new Date(`${left?.appointment_date || ''}T${left?.appointment_start_time || '00:00:00'}`);
      const rightDate = new Date(`${right?.appointment_date || ''}T${right?.appointment_start_time || '00:00:00'}`);
      const leftTime = leftDate.getTime();
      const rightTime = rightDate.getTime();
      if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
      if (Number.isNaN(leftTime)) return 1;
      if (Number.isNaN(rightTime)) return -1;
      return leftTime - rightTime;
    };

    const sortMultiplier = sortConfig.direction === 'asc' ? 1 : -1;
    const sortValueMap = {
      code: (apt) => apt.code,
      patient: (apt) => getAppointmentPatientName(apt),
      service: (apt) => apt.Service?.name,
      doctor: (apt) => apt.Doctor?.user?.full_name,
      date: (apt) => `${apt.appointment_date || ''}T${apt.appointment_start_time || '00:00:00'}`,
      status: (apt) => apt.status,
      payment: (apt) => apt.payment_status,
      medical: (apt) => apt.medical_record_status,
      created_at: (apt) => apt.created_at
    };

    filtered.sort((left, right) => {
      const getter = sortValueMap[sortConfig.key];
      if (!getter) return 0;

      if (sortConfig.key === 'date' || sortConfig.key === 'created_at') {
        const base = compareDateTime({ appointment_date: getter(left)?.split('T')[0], appointment_start_time: getter(left)?.split('T')[1] || '00:00:00' }, { appointment_date: getter(right)?.split('T')[0], appointment_start_time: getter(right)?.split('T')[1] || '00:00:00' });
        return base * sortMultiplier;
      }

      return compareText(getter(left), getter(right)) * sortMultiplier;
    });

    setFilteredAppointments(filtered);
  };

  const handleSortColumn = (key) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });

    if (key === 'sortBy') {
      if (value === 'newest') {
        setSortConfig({ key: 'created_at', direction: 'desc' });
      } else if (value === 'oldest') {
        setSortConfig({ key: 'created_at', direction: 'asc' });
      } else if (value === 'code') {
        setSortConfig({ key: 'code', direction: 'asc' });
      }
    }
  };

  const resetFilters = () => {
    setFilters({ 
      status: 'all', 
      date: '', 
      doctor: '', 
      search: '', 
      sortBy: 'newest',
      service: '',

      paymentStatus: 'all'
    });
    setSortConfig({ key: 'created_at', direction: 'desc' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr.slice(0, 5);
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return <FaChevronDown style={{ opacity: 0.25, marginLeft: 6 }} />;
    return sortConfig.direction === 'asc'
      ? <FaChevronUp style={{ marginLeft: 6 }} />
      : <FaChevronDown style={{ marginLeft: 6 }} />;
  };

  // --- Logic Modal Action ---
  const openActionModal = (appointment, type) => {
    setSelectedAppointment(appointment);
    setActionType(type);
    setShowActionModal(true);
  };
  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedAppointment(null);
    setActionType('');
    setActionReason('');
  };
  const handleConfirmAction = async () => {
    if (!selectedAppointment) return;
    const appointmentCode = selectedAppointment.code;
    try {
      setIsSubmitting(true);
      switch (actionType) {
        case 'confirm':
          await appointmentService.confirmAppointment(appointmentCode);
          toast.success('Xác nhận lịch hẹn thành công');
          break;
        case 'cancel':
          if (!actionReason.trim()) {
            toast.warn('Vui lòng nhập lý do hủy lịch');
            setIsSubmitting(false);
            return;
          }
          await appointmentService.cancelAppointment(appointmentCode, actionReason);
          toast.success('Hủy lịch hẹn thành công');
          break;
        default:
          break;
      }
      fetchAllAppointments();
      closeActionModal();
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Logic Expand & Reset Code ---
  const toggleResultRow = (recordId) => {
    if (expandedRow === recordId) {
      setExpandedRow(null); 
    } else {
      setExpandedRow(recordId); 
    }
  };

  const handleResetCodeClick = (recordId) => {
    if (isResettingCode) return;
    setSelectedRecordId(recordId);
    setShowConfirmModal(true); 
  };

  // --- Logic Payment Modal ---
  const openPaymentModal = (appointment) => {
    setSelectedAppointment(appointment);
    setPaymentData({
      payment_method: 'cash',
      paid_at: new Date().toISOString().slice(0, 16)
    });
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAppointment(null);
    setPaymentData({
      payment_method: 'cash',
      paid_at: new Date().toISOString().slice(0, 16)
    });
  };

  const handleConfirmPayment = async () => {
    if (!selectedAppointment) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:3001/api/appointments/${selectedAppointment.id}/payment`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Cập nhật trạng thái thanh toán thành công');
      fetchAllAppointments();
      closePaymentModal();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error(error.response?.data?.message || 'Có lỗi khi cập nhật thanh toán');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleConfirmReset = async () => {
    if (!selectedRecordId) return;
    try {
      setIsResettingCode(true); 
      const response = await medicalRecordService.resetLookupCodeByAdmin(selectedRecordId);
      if (response.data.success) {
        toast.success(
          <div>
            <strong>{response.data.message}</strong><br /> 
            Mã mới: <strong style={{ color: '#D9534F' }}>{response.data.newLookupCode}</strong>
          </div>,
          { autoClose: 10000 }
        );
        fetchAllAppointments();
      }
    } catch (error) {
      console.error('Reset code error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi reset mã');
    } finally {
      setIsResettingCode(false);
      setShowConfirmModal(false); 
      setSelectedRecordId(null);
    }
  };

  // --- Helper Helpers ---
  // Accept either a status string or full appointment object (to use computed flags)
  const getStatusBadge = (sOrApt) => {
    const apt = (sOrApt && typeof sOrApt === 'object') ? sOrApt : null;
    const status = apt ? apt.status : sOrApt;
    return <StatusBadge status={status} appointment={apt} />;
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    let text, className, icon;
    switch (paymentStatus) {
      case 'unpaid':
        text = 'Chưa thanh toán'; className = 'amp-payment-unpaid'; icon = <FaClock className="amp-me-1"/>; break;
      case 'paid_online':
        text = 'Đã thanh toán'; className = 'amp-payment-paid-online'; icon = <FaCheckCircle className="amp-me-1"/>; break;
      case 'paid_at_clinic':
        text = 'Thanh toán tại quầy'; className = 'amp-payment-paid-clinic'; icon = <FaHospital className="amp-me-1"/>; break;
      case 'refunded':
        text = 'Đã hoàn tiền'; className = 'amp-payment-refunded'; icon = <FaTimesCircle className="amp-me-1"/>; break;
      case 'not_required':
        text = 'Miễn phí'; className = 'amp-payment-not-required'; icon = <FaCheckCircle className="amp-me-1"/>; break;
      default:
        text = 'Không rõ'; className = 'amp-payment-unpaid'; icon = <FaClock className="amp-me-1"/>; break;
    }
    return <span className={`amp-payment-status-badge ${className}`}>{icon}{text}</span>;
  };

  const getMedicalRecordBadge = (status) => {
    if (status === 'has_record') {
      return <span className="amp-medical-record-badge amp-has-record"><FaCheckCircle className="amp-me-1"/>Có Kết quả khám</span>;
    }
    return <span className="amp-medical-record-badge amp-no-record"><FaTimes className="amp-me-1"/>Chưa có</span>;
  };
  
  const getStats = () => {
    const total = appointments.length;
    // Tính toán dựa trên danh sách filteredAppointments để số liệu khớp với bộ lọc
    const filteredTotal = filteredAppointments.length;
    
    const filteredPending = filteredAppointments.filter(a => a.status === 'pending').length;
    const filteredConfirmed = filteredAppointments.filter(a => a.status === 'confirmed').length;
    const filteredInProgress = filteredAppointments.filter(a => a.status === 'in_progress').length;
    const filteredWaitingResult = filteredAppointments.filter(a => a.status === 'waiting_result').length;
    const filteredCompleted = filteredAppointments.filter(a => a.status === 'completed').length;
    const filteredCancelled = filteredAppointments.filter(a => a.status === 'cancelled').length;
    
    return { 
      total, 
      filteredTotal, 
      filteredPending, 
      filteredConfirmed,
      filteredInProgress,
      filteredWaitingResult,
      filteredCompleted,
      filteredCancelled
    };
  };

  const exportToCSV = () => {
    const headers = ["Mã Lịch Hẹn", "Bệnh nhân", "Liên hệ", "Email", "Dịch vụ", "Bác sĩ", "Ngày Khám", "Giờ Khám", "Trạng thái"];
    const rows = filteredAppointments.map(apt => [
      `"${apt.code}"`,
      `"${getAppointmentPatientName(apt) || 'Khách'}"`,
      `"${apt.Patient?.user?.phone || apt.guest_phone || 'N/A'}"`,
      `"${apt.Patient?.user?.email || apt.guest_email || 'N/A'}"`,
      `"${apt.Service?.name || 'N/A'}"`,
      `"${apt.Doctor?.user?.full_name || 'N/A'}"`,
      apt.appointment_date,
      formatTime(apt.appointment_start_time),
      apt.status 
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    const data = filteredAppointments.map(apt => ({
      'Mã Lịch Hẹn': apt.code || '',
      'Bệnh nhân': getAppointmentPatientName(apt) || 'Khách',
      'Liên hệ': apt.Patient?.user?.phone || apt.guest_phone || 'N/A',
      'Email': apt.Patient?.user?.email || apt.guest_email || 'N/A',
      'Dịch vụ': apt.Service?.name || 'N/A',
      'Bác sĩ': apt.Doctor?.user?.full_name || 'N/A',
      'Ngày Khám': apt.appointment_date || '',
      'Giờ Khám': formatTime(apt.appointment_start_time),
      'Trạng thái': apt.status || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LichHen');
    XLSX.writeFile(workbook, `appointments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="admin-appt-page-container">
        <div className="admin-appt-page-loading">
          <FaSpinner className="amp-fa-spin" />
          <span>Đang tải danh sách lịch hẹn...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-appt-page-container">
        <div className="admin-appt-page-wrapper">
          
          {/* Header */}
          <div className="appointment-management-header">
            <div className="appointment-management-header-content">
              <h1>Quản lý lịch hẹn</h1>
              <p>Quản lý và theo dõi tất cả lịch hẹn của bệnh nhân</p>
            </div>
            <div className="appointment-management-header-actions">
              {user && user.role === 'staff' && (
                <select 
                  className="appointment-management-doctor-selector"
                  value={selectedDoctorId} 
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  style={{ zIndex: 1000, position: 'relative' }}
                >
                  <option value="">-- Tất cả Bác sĩ --</option>
                  {Object.entries(doctorGroups).map(([specialty, doctors]) => (
                    <optgroup key={specialty} label={specialty}>
                      {doctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.user?.full_name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              <button className="appointment-management-btn appointment-management-btn-export" onClick={exportToCSV}>
                <FaDownload /> Xuất CSV
              </button>
              <button className="appointment-management-btn appointment-management-btn-export appointment-management-btn-export-secondary" onClick={exportToExcel}>
                <FaFileExcel /> Xuất Excel
              </button>
            </div>
          </div>
          
          {/* Stats Grid - Trạng thái lịch hẹn */}
          <div className="appointment-management-stats-grid">
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-total"><FaCalendarAlt /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Tổng Lịch Hẹn</span>
                <span className="appointment-management-stat-value">{stats.filteredTotal}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-pending"><FaHourglassHalf /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Chờ Xác Nhận</span>
                <span className="appointment-management-stat-value">{stats.filteredPending}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-confirmed"><FaCheckCircle /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đã Xác Nhận</span>
                <span className="appointment-management-stat-value">{stats.filteredConfirmed}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-in-progress"><FaPlay /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đang Khám</span>
                <span className="appointment-management-stat-value">{stats.filteredInProgress}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-waiting-result"><FaHourglassHalf /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Chờ Kết Quả</span>
                <span className="appointment-management-stat-value">{stats.filteredWaitingResult}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-completed"><FaCheck /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đã Hoàn Thành</span>
                <span className="appointment-management-stat-value">{stats.filteredCompleted}</span>
              </div>
            </div>
            <div className="appointment-management-stat-card">
              <div className="appointment-management-stat-icon appointment-management-icon-cancelled"><FaBan /></div>
              <div className="appointment-management-stat-info">
                <span className="appointment-management-stat-label">Đã Hủy</span>
                <span className="appointment-management-stat-value">{stats.filteredCancelled}</span>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '20px', gap: '5px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'appointments' ? '#4caf50' : 'transparent',
                color: activeTab === 'appointments' ? '#fff' : '#6b7280',
                fontWeight: activeTab === 'appointments' ? '600' : '500',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: activeTab === 'appointments' ? '3px solid #4caf50' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <FaList style={{ marginRight: '8px' }} /> Danh sách lịch hẹn
            </button>
            {(user && (user.role === 'admin' || user.role === 'staff')) && (
            <button
              type="button"
              onClick={() => setActiveTab('checkin')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'checkin' ? '#4caf50' : 'transparent',
                color: activeTab === 'checkin' ? '#fff' : '#6b7280',
                fontWeight: activeTab === 'checkin' ? '600' : '500',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: activeTab === 'checkin' ? '3px solid #4caf50' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <FaClipboardCheck style={{ marginRight: '8px' }} /> Tiếp đón / Check-in
            </button>
            )}
          </div>

            {/* Tab Content */}
            {activeTab === 'appointments' && (
            <>
              {/* APPOINTMENTS TAB */}
              <div className="appointment-management-filter-panel"> 
            {/* Hàng 1: Tìm kiếm + Nút Đặt lại */}
            <div className="appointment-management-filter-grid appointment-management-filter-row-1">
              <div className="appointment-management-filter-group" style={{ flex: 1 }}>
                <label><FaSearch /> Tìm kiếm nhanh</label>
                <input 
                  type="text" 
                  placeholder="Mã lịch, tên bệnh nhân, email, sĐT..." 
                  value={filters.search} 
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="appointment-management-filter-group" style={{ flex: 1 }}>
                <label><FaUserMd /> Bác sĩ</label>
                <input type="text" placeholder="Tên bác sĩ..." value={filters.doctor} onChange={(e) => handleFilterChange('doctor', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="appointment-management-filter-group" style={{ flex: 1 }}>
                <label><FaHospital /> Dịch vụ</label>
                <input type="text" placeholder="Tên dịch vụ..." value={filters.service} onChange={(e) => handleFilterChange('service', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="appointment-management-filter-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px', gap: '1rem', justifyContent: 'space-between' }}>
                <button className="appointment-management-btn appointment-management-btn-reset" onClick={resetFilters}>
                  <FaSyncAlt /> Đặt lại
                </button>
                <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  Hiển thị <strong>{filteredAppointments.length}</strong> / {appointments.length} lịch hẹn
                </div>
              </div>
            </div>

            {/* Hàng 2: Các dropdown lọc */}
            <div className="appointment-management-filter-grid appointment-management-filter-row-2">
              <div className="appointment-management-filter-group">
                <label><FaFilter /> Trạng thái</label>
                <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="in_progress">Đang khám</option>
                  <option value="waiting_result">Chờ Kết Quả</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Hủy</option>
                </select>
              </div>
              <div className="appointment-management-filter-group">
                <label><FaCheckCircle /> Thanh toán</label>
                <select value={filters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="paid_online">Đã thanh toán (Online)</option>
                  <option value="paid_at_clinic">Thanh toán tại quầy</option>
                </select>
              </div>
              <div className="appointment-management-filter-group">
                <label><FaCalendarAlt /> Ngày khám</label>
                <input type="date" value={filters.date} onChange={(e) => handleFilterChange('date', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="admin-appt-page-table-container">
            <table className="admin-appt-page-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>STT</th>
                  <th onClick={() => handleSortColumn('code')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'code' ? 'is-sorted' : ''}`}>Mã Lịch Hẹn {renderSortIndicator('code')}</th>
                  <th onClick={() => handleSortColumn('patient')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'patient' ? 'is-sorted' : ''}`}>Bệnh nhân {renderSortIndicator('patient')}</th>
                  <th onClick={() => handleSortColumn('service')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'service' ? 'is-sorted' : ''}`}>Dịch vụ {renderSortIndicator('service')}</th>
                  <th onClick={() => handleSortColumn('doctor')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'doctor' ? 'is-sorted' : ''}`}>Bác sĩ {renderSortIndicator('doctor')}</th>
                  <th onClick={() => handleSortColumn('date')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'date' ? 'is-sorted' : ''}`}>Ngày &amp; Giờ {renderSortIndicator('date')}</th>
                  <th onClick={() => handleSortColumn('status')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'status' ? 'is-sorted' : ''}`}>Trạng thái {renderSortIndicator('status')}</th>
                  <th onClick={() => handleSortColumn('payment')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'payment' ? 'is-sorted' : ''}`}>Thanh toán {renderSortIndicator('payment')}</th>
                  <th onClick={() => handleSortColumn('medical')} className={`admin-appt-page-sortable-th ${sortConfig.key === 'medical' ? 'is-sorted' : ''}`}>Kết quả khám {renderSortIndicator('medical')}</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((apt, index) => {
                    const medicalRecord = apt.MedicalRecord;
                    const isExpanded = expandedRow === medicalRecord?.id;
                    const linkedSummary = getLinkedAppointmentSummary(apt);
                    return (
                      <React.Fragment key={apt.id}>
                        <tr className={isExpanded ? 'amp-row-expanded' : ''}>
                            <td data-label="STT" style={{ width: '50px', textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                          <td data-label="Mã Lịch Hẹn">{apt.code}</td>
                          
                          {/* SỬA LỖI: KIỂM TRA KỸ DỮ LIỆU BỆNH NHÂN */}
                          <td data-label="Bệnh nhân">
                            <div className="admin-appt-page-patient-info">
                              <span className="amp-fw-bold text-wrap">{getAppointmentPatientName(apt)}</span>
                              <div className="amp-text-muted amp-small">
                                <span className="frdeskpage-badge frdeskpage-badge-gray">{getAppointmentSourceLabel(apt)}</span>
                                {getSubServiceRequirementLabel(apt) && (
                                  <span
                                    className="frdeskpage-badge"
                                    style={{
                                      marginLeft: '6px',
                                      background: apt.booking_context?.required ? '#fee2e2' : '#e2e8f0',
                                      color: apt.booking_context?.required ? '#b91c1c' : '#334155',
                                    }}
                                  >
                                    {getSubServiceRequirementLabel(apt)}
                                  </span>
                                )}
                              </div>
                              <div className="amp-text-muted amp-small">
                                {getPatientUser(apt.Patient) ? (
                                  <>
                                    <div className="amp-d-flex amp-align-items-center">
                                      <FaPhone className="amp-me-1" size={10}/> {getAppointmentPatientPhone(apt)}
                                    </div>
                                    <div className="amp-d-flex amp-align-items-center amp-mt-1">
                                      <FaEnvelope className="amp-me-1" size={10}/> {getAppointmentPatientEmail(apt)}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="amp-d-flex amp-align-items-center">
                                      <FaPhone className="amp-me-1" size={10}/> {apt.guest_phone || 'N/A'}
                                    </div>
                                    <div className="amp-d-flex amp-align-items-center amp-mt-1">
                                      <FaEnvelope className="amp-me-1" size={10}/> {apt.guest_email || 'N/A'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td data-label="Dịch vụ" className="text-wrap">
                            <div className="admin-appt-page-service-cell">
                              <div className="admin-appt-page-service-name">{apt.Service?.name || 'N/A'}</div>
                              {linkedSummary.isChild && linkedSummary.parentCode && (
                                <div className="admin-appt-page-linked-meta">
                                  <span className="admin-appt-page-linked-chip admin-appt-page-linked-chip-child">
                                    <FaLink /> Lịch phụ
                                  </span>
                                  <span className="admin-appt-page-linked-text">
                                    Thuộc lịch cha {linkedSummary.parentCode}
                                  </span>
                                </div>
                              )}
                              {!linkedSummary.isChild && linkedSummary.linkedChildren.length > 0 && (
                                <div className="admin-appt-page-linked-meta">
                                  <span className="admin-appt-page-linked-chip admin-appt-page-linked-chip-parent">
                                    <FaLink /> {linkedSummary.linkedChildren.length} lịch phụ
                                  </span>
                                  <span className="admin-appt-page-linked-text">
                                    Có chỉ định / lịch phụ liên kết
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td data-label="Bác sĩ">
                            <div className="admin-appt-page-doctor-info">
                              <span>{apt.Doctor?.user?.full_name || 'Đang cập nhật'}</span>
                              {apt.Doctor?.Specialty && <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>{apt.Doctor.Specialty.name || apt.Specialty?.name}</div>}
                            </div>
                          </td>
                          
                          <td data-label="Ngày & Giờ">
                            <div className="admin-appt-page-datetime-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                              <span className="amp-fw-bold">{new Date(apt.appointment_date).toLocaleDateString('vi-VN')}</span>
                              <span className="amp-text-primary">{formatTime(apt.appointment_start_time)}</span>
                            </div>
                          </td>
                          
                          <td data-label="Trạng thái">
                            {getStatusBadge(apt)}
                          </td>
                          
                          <td data-label="Thanh toán">
                            {getPaymentStatusBadge(apt.payment_status)}
                            {apt.payment_method && (
                              <div className="payment-method-info">
                                <small className="amp-text-muted">
                                  {apt.payment_method === 'cash' ? <>&nbsp;<FaMoneyBillWave /> Tiền mặt</> :
                                   apt.payment_method === 'card' ? <>&nbsp;<FaCreditCard /> Thẻ</> :
                                   apt.payment_method === 'bank_transfer' ? <>&nbsp;<FaUniversity /> Chuyển khoản</> :
                                   apt.payment_method === 'online' ? <>&nbsp;<FaGlobe /> Online</> :
                                   apt.payment_method}
                                </small>
                              </div>
                            )}
                            {apt.paid_at && (
                              <div className="paid-date-info">
                                <small className="amp-text-success">
                                  {new Date(apt.paid_at).toLocaleDateString('vi-VN')}
                                </small>
                              </div>
                            )}
                          </td>
                          
                          <td data-label="Kết quả khám">
                            {getMedicalRecordBadge(apt.medical_record_status || 'no_record')}
                          </td>

                          <td data-label="Thao tác">
                            <div className="admin-appt-page-action-buttons">
                              {(() => {
                                const isPaid = apt.payment_status === 'paid_online' || 
                                               apt.payment_status === 'paid_at_clinic' || 
                                               apt.Payment?.status === 'paid';

                                // KIỂM TRA QUYỀN LÂM SÀNG
                                const isClinicalStaff = user?.role === 'staff' && 
                                  (user?.department === 'clinical' || user?.staff?.department === 'clinical' || user?.role_info?.department === 'clinical');

                                return (
                                  <>
                                    {/* Preserve 'Lập HS' button for clinical staff */}
                                    {isClinicalStaff && apt.appointment_type === 'offline' && 
                                     (apt.status === 'confirmed' || apt.status === 'in_progress' || isPaid) && 
                                     (!apt.medical_record_status || apt.medical_record_status === 'no_record') && (
                                      <button 
                                        className="admin-appt-page-btn-action appointment-management-action-medical" 
                                        onClick={() => navigate(`/ho-so-y-te/nhap-moi?appointment_code=${apt.code}`)} 
                                        title="Lập hồ sơ & Đo sinh hiệu"
                                      > 
                                        <FaNotesMedical />
                                        <span className="amp-btn-label">Lập HS</span>
                                      </button>
                                    )}

                                    {/* Button: Xem kết quả cho bệnh nhân khi trạng thái Đang khám */}
                                    {user?.role === 'patient' && apt.status === 'in_progress' && (
                                      <button
                                        className="admin-appt-page-btn-action appointment-management-action-view"
                                        onClick={() => navigate(`/lich-hen/${apt.code}`)}
                                        title="Xem kết quả"
                                      >
                                        <FaEye />
                                        <span className="amp-btn-label">Xem kết quả</span>
                                      </button>
                                    )}

                                    <AppointmentActionButtons
                                      role={user?.role === 'patient' ? 'patient' : 'doctor'}
                                      appointment={apt}
                                      detailPath={`/lich-hen/${apt.code}`}
                                      onAction={handleAppointmentAction}
                                      showMinimalActions={true}
                                    />
                                  </>
                                );
                              })()}
                              
                              {medicalRecord && (
                                <button
                                  className="admin-appt-page-btn-action amp-btn-reset"
                                  onClick={() => handleResetCodeClick(medicalRecord.id)}
                                  title="Reset Mã Tra Cứu"
                                  disabled={isResettingCode}
                                >
                                  {isResettingCode ? <FaSpinner className="amp-fa-spin" /> : <FaSyncAlt />}
                                  <span className="amp-btn-label">Reset</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {isExpanded && medicalRecord && (
                          <tr className="admin-appt-page-expanded-row">
                            <td colSpan="10">
                              <div className="admin-appt-page-result-content">
                                <p className="mb-2"><strong>Mã Hồ Sơ:</strong> {medicalRecord.record_code}</p>
                                <p className="mb-2"><strong>Mã Tra Cứu:</strong> <span className="amp-text-danger amp-fw-bold">{medicalRecord.lookup_code}</span> <FaLock size={12} className="amp-text-danger"/></p>
                                <p className="mb-2"><strong>Kết Luận:</strong> {medicalRecord.diagnosis || 'Chưa có kết luận'}</p>
                                {(linkedSummary.isChild || linkedSummary.linkedChildren.length > 0) && (
                                  <div className="admin-appt-page-linked-section">
                                    <div className="admin-appt-page-linked-title">
                                      <FaLink /> Liên kết lịch hẹn
                                    </div>
                                    {linkedSummary.isChild && linkedSummary.parentCode && (
                                      <p className="admin-appt-page-linked-note mb-2">
                                        Lịch này là lịch phụ của <strong>{linkedSummary.parentCode}</strong>
                                      </p>
                                    )}
                                    {!linkedSummary.isChild && linkedSummary.linkedChildren.length > 0 && (
                                      <div className="admin-appt-page-linked-list">
                                        {linkedSummary.linkedChildren.map((link) => (
                                          <div key={link.id || `${link.linked_appointment_code || link.appointment_code || 'link'}-${link.service_name || ''}`} className="admin-appt-page-linked-item">
                                            <div className="admin-appt-page-linked-item-main">
                                              <span className="admin-appt-page-linked-code">{link.linked_appointment_code || link.appointment_code || 'N/A'}</span>
                                              <span className="admin-appt-page-linked-service">{link.service_name || 'Dịch vụ phụ'}</span>
                                            </div>
                                            <div className="admin-appt-page-linked-item-meta">
                                              <span>{link.required ? 'Bắt buộc' : 'Tùy chọn'}</span>
                                              <span>{formatLinkedMode(link.mode)}</span>
                                              <StatusBadge status={link.status} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <Link to={`/ho-so-kham-benh/${medicalRecord.record_code}`} className="amp-small amp-text-decoration-none amp-fw-bold">
                                  Xem chi tiết hồ sơ <FaChevronRight size={10} className="ms-1"/>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="text-center py-4 amp-text-muted">Không tìm thấy lịch hẹn nào theo bộ lọc.</td>
                  </tr>
                )}
              </tbody>
            </table>
              </div>
          </>
          )}

          {activeTab === 'checkin' && (
            <CheckinTab />
          )}
        </div>
        
        {/* Modal Action */}
        {showActionModal && selectedAppointment && (
          <div className="admin-appt-page-modal-overlay">
            <div className="admin-appt-page-modal-content">
              <div className="admin-appt-page-modal-header">
                <h5>{actionType === 'confirm' ? 'Xác nhận Lịch Hẹn' : 'Hủy Lịch Hẹn'}</h5>
                <button className="amp-close-btn" onClick={closeActionModal}><FaTimes /></button>
              </div>
              <div className="admin-appt-page-modal-body">
                <div className="admin-appt-page-appointment-summary">
                  <p><strong>Mã:</strong> {selectedAppointment.code}</p>
                  <p><strong>Bệnh nhân:</strong> {getAppointmentPatientName(selectedAppointment)}</p>
                  <p><strong>Đặt cho:</strong> {getAppointmentSourceLabel(selectedAppointment)}</p>
                  {getSubServiceRequirementLabel(selectedAppointment) && (
                    <p><strong>Yêu cầu:</strong> {getSubServiceRequirementLabel(selectedAppointment)}</p>
                  )}
                  <p><strong>Thời gian:</strong> {new Date(selectedAppointment.appointment_date).toLocaleDateString('vi-VN')} lúc {formatTime(selectedAppointment.appointment_start_time)}</p>
                </div>
                {actionType === 'confirm' ? (
                  <p className="admin-appt-page-confirmation-text amp-text-success amp-fw-bold">Bạn có chắc chắn muốn xác nhận lịch hẹn này?</p>
                ) : (
                  <p className="admin-appt-page-confirmation-text amp-text-danger">Lịch hẹn sẽ bị hủy bỏ. Bệnh nhân sẽ nhận được thông báo.</p>
                )}
                {actionType === 'cancel' && (
                  <div className="admin-appt-page-form-group">
                    <label htmlFor="cancelReason">Lý do hủy lịch *</label>
                    <textarea 
                      id="cancelReason" value={actionReason} onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Nhập lý do hủy lịch..." rows="4" required
                    />
                  </div>
                )}
              </div>
              <div className="admin-appt-page-modal-footer">
                <button className="admin-appt-page-btn amp-btn-secondary" onClick={closeActionModal} disabled={isSubmitting}>Đóng</button>
                <button 
                  className={`admin-appt-page-btn ${actionType === 'cancel' ? 'amp-btn-danger' : 'amp-btn-primary'}`}
                  onClick={handleConfirmAction} disabled={isSubmitting}
                >
                  {isSubmitting ? <FaSpinner className="amp-fa-spin" /> : (actionType === 'confirm' ? 'Xác nhận' : 'Hủy lịch')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal Reset Code */}
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmReset}
          title="Xác nhận Reset Mã Tra Cứu"
          message={'Bạn có chắc chắn muốn reset mã tra cứu cho hồ sơ này?\nMã cũ sẽ bị vô hiệu hóa và một mã MỚI sẽ được tạo, đồng thời gửi đến email của bệnh nhân.'}
          isLoading={isResettingCode}
        />

        {/* Modal Payment */}
        {showPaymentModal && selectedAppointment && createPortal(
          <div
            onClick={closePaymentModal}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2147483647,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '640px',
                maxHeight: '90vh',
                overflow: 'hidden',
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f0fdf4'
              }}>
                <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#166534' }}>Xác nhận thanh toán tại quầy</h5>
                <button className="amp-close-btn" onClick={closePaymentModal}><FaTimes /></button>
              </div>
              <div style={{ padding: '16px', overflowY: 'auto' }}>
                <div className="admin-appt-page-appointment-summary">
                  <p><strong>Mã:</strong> {selectedAppointment.code}</p>
                  <p><strong>Bệnh nhân:</strong> {getAppointmentPatientName(selectedAppointment)}</p>
                  <p><strong>Đặt cho:</strong> {getAppointmentSourceLabel(selectedAppointment)}</p>
                  {getSubServiceRequirementLabel(selectedAppointment) && (
                    <p><strong>Yêu cầu:</strong> {getSubServiceRequirementLabel(selectedAppointment)}</p>
                  )}
                  <p><strong>Dịch vụ:</strong> {selectedAppointment.Service?.name}</p>
                  <p><strong>Số tiền:</strong> {selectedAppointment.Service?.price?.toLocaleString('vi-VN')} đ</p>
                </div>
                <div className="admin-appt-page-form-group">
                  <label htmlFor="paymentMethod">Phương thức thanh toán</label>
                  <select 
                    id="paymentMethod" 
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                    className="form-control"
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="card">Thẻ</option>
                    <option value="transfer">Chuyển khoản</option>
                  </select>
                </div>
                <div className="admin-appt-page-form-group">
                  <label htmlFor="paidAt">Thời gian thanh toán</label>
                  <input 
                    type="datetime-local" 
                    id="paidAt"
                    value={paymentData.paid_at}
                    onChange={(e) => setPaymentData({...paymentData, paid_at: e.target.value})}
                    className="form-control"
                  />
                </div>
              </div>
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid #e5e7eb',
                background: '#f9fafb',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button className="admin-appt-page-btn amp-btn-secondary" onClick={closePaymentModal} disabled={isSubmitting}>
                  Đóng
                </button>
                <button 
                  className="admin-appt-page-btn amp-btn-primary"
                  onClick={handleConfirmPayment} 
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#28a745' }}
                >
                  {isSubmitting ? <FaSpinner className="amp-fa-spin" /> : 'Xác nhận thanh toán'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
};

export default AppointmentManagementPage;
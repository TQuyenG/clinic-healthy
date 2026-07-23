// Path: client/src/components/consultation/ConsultationRealtimeList.js
// ✅ REALTIME LIST - COMPACT THEME & FIXED MODAL - NO EMOJI ICONS

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import consultationService from '../../services/consultationService';
import { 
  FaSearch, FaCheckCircle, FaTimesCircle, FaEye, FaMoneyBillWave,
  FaFileExport, FaSpinner, FaCalendarTimes, FaComments,
  FaClock, FaBan, FaCheck, FaHourglassHalf, FaStar, FaExclamationTriangle
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './ConsultationRealtimeList.css';

export const ConsultationRealtimeList = ({ initialType, doctorId, role }) => {
  const { user } = useAuth();
  const isSystemStaff = user?.department === 'system' || user?.staff?.department === 'system';
  const isStaff = ['staff', 'admin'].includes(user?.role);
  
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    doctor_id: '',
    service: '',
    paymentStatus: 'all',
    date: '',
    search: '',
    sortBy: 'newest',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

 // Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [refundPolicy, setRefundPolicy] = useState(null);

  // Modal Duyệt
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);

  // Modal Từ chối
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/settings/refund_policy`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (data) setRefundPolicy(data); })
      .catch(() => {});
  }, []);

  const getPatientName = (item) =>
    item?.patient?.full_name ||
    item?.Patient?.full_name ||
    item?.Patient?.User?.full_name ||
    item?.appointment?.patient?.full_name ||
    item?.appointment?.Patient?.full_name ||
    item?.appointment?.Patient?.User?.full_name ||
    item?.patient_name ||
    'N/A';

  const getPatientEmail = (item) =>
    item?.patient?.email ||
    item?.Patient?.email ||
    item?.Patient?.User?.email ||
    item?.appointment?.patient?.email ||
    item?.appointment?.Patient?.email ||
    item?.appointment?.Patient?.User?.email ||
    item?.patient_email ||
    'N/A';

  const getDoctorName = (item) =>
    item?.doctor?.full_name ||
    item?.Doctor?.full_name ||
    item?.Doctor?.user?.full_name ||
    item?.Doctor?.User?.full_name ||
    item?.appointment?.doctor?.full_name ||
    item?.appointment?.Doctor?.full_name ||
    item?.appointment?.Doctor?.user?.full_name ||
    item?.appointment?.Doctor?.User?.full_name ||
    item?.doctor_name ||
    user?.full_name ||
    user?.username ||
    'N/A';

  const getDoctorEmail = (item) =>
    item?.doctor?.email ||
    item?.Doctor?.email ||
    item?.Doctor?.user?.email ||
    item?.Doctor?.User?.email ||
    item?.appointment?.doctor?.email ||
    item?.appointment?.Doctor?.email ||
    item?.appointment?.Doctor?.user?.email ||
    item?.appointment?.Doctor?.User?.email ||
    item?.doctor_email ||
    user?.email ||
    'N/A';

  const getPaymentStatus = (item) => item?.payment_status || 'unpaid';

  const getServiceName = (item) =>
    item?.package?.name ||
    item?.consultation_pricing?.name ||
    item?.ConsultationPricing?.name ||
    item?.appointment?.Service?.name ||
    item?.service_name ||
    'Tư vấn trực tuyến';

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        doctor_id: doctorId || filters.doctor_id,
        // Truyền type lên API, không chỉ lọc client-side
        type: initialType && initialType !== 'all' ? initialType : undefined
      };

      let response;
      let dataList = [];
      let paginationData = null;

      if (role === 'patient' || user?.role === 'patient') {
        response = await consultationService.getMyConsultations(params);
        if (response.data.success) {
          dataList = response.data.data;
          paginationData = response.data.pagination;
        }
      } else if (user?.role === 'doctor') {
        response = await consultationService.getDoctorConsultations(params);
        if (response.data.success) {
          dataList = response.data.data;
          paginationData = response.data.pagination;
        }
      } else if (user?.role === 'staff') {
        response = await consultationService.getAllConsultationsRealtime(params);
        if (response.data.success) {
          dataList = response.data.data.consultations;
          paginationData = response.data.data.pagination;
        }
      } else {
        response = await consultationService.getAllConsultationsRealtime(params);
        if (response.data.success) {
          dataList = response.data.data.consultations;
          paginationData = response.data.data.pagination;
        }
      }

      setConsultations(Array.isArray(dataList) ? dataList : []);
      if (paginationData) setPagination(paginationData);

    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, doctorId, role, user]);

  useEffect(() => {
    if (initialType) {
      setFilters(prev => ({ ...prev, page: 1 }));
    }
  }, [initialType]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Tự reload khi consultation được complete từ phòng chat
  useEffect(() => {
    const handleReload = () => fetchConsultations();
    window.addEventListener('consultation:reload_list', handleReload);
    return () => window.removeEventListener('consultation:reload_list', handleReload);
  }, [fetchConsultations]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (sOrObj) => {
    const status = (sOrObj && typeof sOrObj === 'object') ? sOrObj.status : sOrObj;
    const config = {
      pending:     { class: 'crl-badge-warn',    icon: <FaHourglassHalf />, text: 'Chờ xác nhận' },
      confirmed:   { class: 'crl-badge-info',    icon: <FaCheckCircle />,   text: 'Đã xác nhận' },
      in_progress: { class: 'crl-badge-success', icon: <FaSpinner className="spin" />, text: 'Đang diễn ra' },
      completed:   { class: 'crl-badge-success', icon: <FaCheck />,         text: 'Hoàn thành' },
      cancelled:   { class: 'crl-badge-danger',  icon: <FaTimesCircle />,   text: 'Đã hủy' },
      rejected:    { class: 'crl-badge-danger',  icon: <FaBan />,           text: 'Từ chối' },
      expired:     { class: 'crl-badge-muted',   icon: <FaClock />,         text: 'Hết hạn' },
    };
    const item = config[status] || config.pending;
    return (
      <span className={`crl-status-badge ${item.class}`}>
        {item.icon} {item.text}
      </span>
    );
  };

  const getPaymentBadge = (item) => {
    const map = {
      unpaid:        { text: 'Chưa thanh toán',     className: 'unpaid' },
      paid_online:   { text: 'Đã thanh toán',        className: 'paid' },
      paid_at_clinic:{ text: 'Thanh toán tại quầy', className: 'paid' },
      not_required:  { text: 'Miễn phí',             className: 'free' },
      refunded:      { text: 'Đã hoàn tiền',         className: 'refunded' },
    };
    const info = map[getPaymentStatus(item)] || map.unpaid;
    return <span className={`crl-payment-badge ${info.className}`}>{info.text}</span>;
  };

  // Actions
  const handleApprove = (code) => {
  setApproveTarget(code);
  setIsApproveModalOpen(true);
};

const handleReject = (code) => {
  setRejectTarget(code);
  setIsRejectModalOpen(true);
};

  // Helper lấy message lỗi đúng từ response
  const getErrMsg = (error) =>
    error?.response?.data?.message || error?.message || 'Có lỗi xảy ra';

  const handleApproveConfirmed = async () => {
    setIsApproveModalOpen(false);
    setActionLoading(approveTarget);
    try {
      await consultationService.adminApproveConsultation(approveTarget);
      fetchConsultations();
    } catch (error) {
      alert('❌ ' + getErrMsg(error));
    } finally {
      setActionLoading(null);
      setApproveTarget(null);
    }
  };

  const handleRejectConfirmed = async () => {
    if (!rejectReason.trim()) return;
    setIsRejectModalOpen(false);
    setActionLoading(rejectTarget);
    try {
      await consultationService.adminRejectConsultation(rejectTarget, { reason: rejectReason.trim() });
      fetchConsultations();
    } catch (error) {
      alert('❌ ' + getErrMsg(error));
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const handleRefund = async (consultation) => {
    if (!window.confirm(`Xác nhận hoàn tiền ${consultation.total_fee?.toLocaleString()}đ?`)) return;
    const reason = window.prompt('Lý do hoàn tiền (bắt buộc):');
    if (!reason?.trim()) return;
    setActionLoading(consultation.consultation_code);
    try {
      await consultationService.processRefundAdmin(consultation.consultation_code, {
        refund_amount: consultation.total_fee,
        refund_reason: reason.trim()
      });
      fetchConsultations();
    } catch (error) {
      alert('❌ ' + getErrMsg(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelConfirmed = (consultation) => {
    setSelectedConsultation(consultation);
    setIsCancelModalOpen(true);
    setCancelReason('');
  };

  const handleSubmitCancel = async () => {
    if (!selectedConsultation) return;
    const isPaid = parseFloat(selectedConsultation.total_fee) > 0;
    if (isPaid && !cancelReason.trim()) {
      alert('Cần nhập lý do cho tư vấn có phí.');
      return;
    }
    setActionLoading(selectedConsultation.consultation_code);
    setIsCancelModalOpen(false);
    try {
      const isPatient = role === 'patient' || user?.role === 'patient';
      if (isPatient) {
        await consultationService.cancelConsultation(selectedConsultation.id, { 
          reason: cancelReason.trim() || 'Bệnh nhân hủy' 
        });
      } else {
        await consultationService.adminCancelConfirmedConsultation(selectedConsultation.consultation_code, { 
          reason: cancelReason.trim() || 'Admin hủy' 
        });
      }
      fetchConsultations();
    } catch (error) { alert(getErrMsg(error)); } 
    finally {
      setActionLoading(null);
      setSelectedConsultation(null);
    }
  };

  const isPatientRole = role === 'patient' || user?.role === 'patient';
  const isAdminOrStaffRole = ['admin', 'staff'].includes(user?.role);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatTime = (datetime) => {
    if (!datetime) return 'N/A';
    return new Date(datetime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const canJoinRoom = (item) => (item?.status === 'confirmed' || item?.status === 'in_progress') && consultationService.canStartConsultation(item?.appointment_time);
  const canDoctorJoinRoom = (item) => item?.status === 'in_progress' || (item?.status === 'confirmed' && consultationService.canStartConsultation(item?.appointment_time));
  const canCancelByPatient = (item) => ['pending', 'pending_payment', 'confirmed'].includes(item?.status);
  const canPayNow = (item) => item?.status === 'pending_payment';
  const isCompleted = (item) => item?.status === 'completed';

  const calculateRefundPreview = (consultation) => {
    if (!consultation) return null;
    const now = new Date();
    const appointmentTime = new Date(consultation.appointment_time);
    const hoursDiff = (appointmentTime - now) / 3600000;
    const isPaid = ['paid_online', 'paid_at_clinic'].includes(consultation.payment_status);
    const price = parseFloat(consultation.total_fee || 0);
    if (!isPaid || price === 0) {
      return { percent: 0, amount: 0, hoursDiff,
        message: 'Lịch chưa thanh toán hoặc miễn phí. Hủy sẽ không phát sinh hoàn tiền.' };
    }
    let refundPercent = 0;
    if (refundPolicy) {
      const rules = refundPolicy['consultation']?.rules || [];
      const sorted = [...rules].sort((a, b) => b.hours_before - a.hours_before);
      for (const rule of sorted) {
        if (hoursDiff >= rule.hours_before) { refundPercent = rule.refund_percent; break; }
      }
    } else {
      if (hoursDiff >= 24) refundPercent = 100;
      else if (hoursDiff >= 6) refundPercent = 50;
    }
    const refundAmount = Math.round(price * refundPercent / 100);
    return { percent: refundPercent, amount: refundAmount, hoursDiff,
      message: hoursDiff > 0
        ? `Còn ${hoursDiff.toFixed(1)} giờ đến giờ hẹn.`
        : 'Đã quá giờ tư vấn.' };
  };

  const filteredConsultations = consultations
    .filter((item) => {
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (initialType && initialType !== 'all' && item.consultation_type && item.consultation_type !== initialType) return false;
      if (filters.paymentStatus !== 'all' && getPaymentStatus(item) !== filters.paymentStatus) return false;
      if (filters.date && item.appointment_time) {
        const selected = new Date(filters.date).toLocaleDateString('en-CA');
        const actual = new Date(item.appointment_time).toLocaleDateString('en-CA');
        if (selected !== actual) return false;
      }
      if (filters.doctor_id && String(item.doctor_id || item.doctor?.id || '') !== String(filters.doctor_id)) return false;
      if (filters.service) {
        const serviceText = getServiceName(item).toLowerCase();
        if (!serviceText.includes(filters.service.toLowerCase())) return false;
      }
      if (filters.search) {
        const keyword = filters.search.toLowerCase();
        const haystack = [
          item.consultation_code,
          getPatientName(item),
          getPatientEmail(item),
          getDoctorName(item),
          getDoctorEmail(item),
          getServiceName(item),
          item.chief_complaint,
        ].join(' ').toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (filters.sortBy === 'oldest') {
        return new Date(left.created_at || left.appointment_time) - new Date(right.created_at || right.appointment_time);
      }
      if (filters.sortBy === 'code') {
        return String(left.consultation_code || '').localeCompare(String(right.consultation_code || ''));
      }
      return new Date(right.created_at || right.appointment_time) - new Date(left.created_at || left.appointment_time);
    });

  return (
    <div className="crl-container">
      {/* Filters */}
      <div className="crl-filters">
        <div className="crl-filter-group">
          <select className="crl-select" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select className="crl-select" value={filters.paymentStatus} onChange={e => handleFilterChange('paymentStatus', e.target.value)}>
            <option value="all">Tất cả thanh toán</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="paid_online">Đã thanh toán</option>
            <option value="paid_at_clinic">Tại quầy</option>
            <option value="not_required">Miễn phí</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>
          <input type="date" className="crl-input" value={filters.date} onChange={e => handleFilterChange('date', e.target.value)} />
          <select className="crl-select" value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="code">Theo mã</option>
          </select>
        </div>
        <div className="crl-search-group">
          <div className="crl-search-box">
            <FaSearch className="crl-search-icon" />
            <input
              type="text"
              className="crl-search-input"
              placeholder="Tìm mã, bệnh nhân, bác sĩ..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
          <button className="crl-btn-export" title="Xuất dữ liệu">
            <FaFileExport />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="crl-loading">
          <FaSpinner className="spin" style={{ marginRight: 6 }} /> Đang tải...
        </div>
      ) : (
        <>
          <div className="crl-table-wrapper">
            <table className="crl-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Dịch vụ</th>
                  <th>Ngày &amp; Giờ</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  {!isSystemStaff && <th className="text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredConsultations.length === 0 ? (
                  <tr>
                    <td colSpan={isSystemStaff ? 8 : 9} className="text-center">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredConsultations.map((item, index) => (
                    <tr key={item.id}>
                      <td><span className="crl-stt">{index + 1}</span></td>
                      <td><span className="crl-code">{item.consultation_code}</span></td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{getPatientName(item)}</strong>
                          <span>{getPatientEmail(item)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{getDoctorName(item)}</strong>
                          <span>{getDoctorEmail(item)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="crl-info-cell">
                          <strong>{getServiceName(item)}</strong>
                          <span className={`crl-mini-badge ${item.consultation_type}`}>
                            {item.consultation_type === 'video' ? 'Video call' : 'Chat realtime'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="crl-date-cell">
                          <strong>{formatDate(item.appointment_time)}</strong>
                          <span>{formatTime(item.appointment_time)}</span>
                        </div>
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        <div className="crl-payment-cell">
                          {getPaymentBadge(item)}
                          {item.payment_method && (
                            <small style={{ fontSize: '10px', color: '#999' }}>
                              {item.payment_method.toUpperCase()}
                            </small>
                          )}
                        </div>
                      </td>
                      {!isSystemStaff && (
                        <td className="text-right">
                          <div className="crl-actions">
                            {actionLoading === item.consultation_code ? (
                              <FaSpinner className="spin" />
                            ) : (
                              <>
                                <button
                                  className="crl-btn-action view"
                                  onClick={() => navigate(`/tu-van/${item.id}`)}
                                  title="Xem chi tiết"
                                >
                                  <FaEye /> <span>Chi tiết</span>
                                </button>

                                {isPatientRole ? (
                                  <>
                                    {canJoinRoom(item) && (
                                      <button
                                        className="crl-btn-action success"
                                        onClick={() => navigate(item.consultation_type === 'video' ? `/tu-van/video/${item.id}` : `/tu-van/${item.id}/chat`)}
                                        title="Vào phòng"
                                      >
                                        <FaCheck /> <span>Vào phòng</span>
                                      </button>
                                    )}
                                    {canPayNow(item) && (
                                      <button
                                        className="crl-btn-action warning"
                                        onClick={() => navigate(`/thanh-toan/${item.id}`)}
                                        title="Thanh toán ngay"
                                      >
                                        <FaMoneyBillWave /> <span>Thanh toán</span>
                                      </button>
                                    )}
                                    {canCancelByPatient(item) && (
                                      <button
                                        className="crl-btn-action danger"
                                        onClick={() => handleCancelConfirmed(item)}
                                        title="Hủy lịch"
                                      >
                                        <FaCalendarTimes /> <span>Hủy</span>
                                      </button>
                                    )}
                                    {isCompleted(item) && (
                                      <>
                                        <button
                                          className="crl-btn-action info"
                                          onClick={() => navigate(`/tu-van/${item.id}`)}
                                          title={item.rating ? 'Xem đánh giá' : 'Đánh giá'}
                                        >
                                          <FaStar /> <span>{item.rating ? 'Xem đánh giá' : 'Đánh giá'}</span>
                                        </button>
                                        {item.consultation_type === 'chat' && (
                                          <button
                                            className="crl-btn-action view"
                                            onClick={() => navigate(`/tu-van/${item.id}/chat`)}
                                            title="Xem lại cuộc trò chuyện"
                                          >
                                            <FaComments /> <span>Xem lại chat</span>
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {item.status === 'pending' && (isAdminOrStaffRole || user?.role === 'doctor') && (
                                      <>
                                        <button
                                          className="crl-btn-action success"
                                          onClick={() => handleApprove(item.consultation_code)}
                                          title="Duyệt"
                                        >
                                          <FaCheckCircle /> <span>Duyệt</span>
                                        </button>
                                        <button
                                          className="crl-btn-action danger"
                                          onClick={() => handleReject(item.consultation_code)}
                                          title="Từ chối"
                                        >
                                          <FaTimesCircle /> <span>Từ chối</span>
                                        </button>
                                      </>
                                    )}
                                    {canDoctorJoinRoom(item) && (
                                      <button
                                        className="crl-btn-action success"
                                        onClick={() => navigate(item.consultation_type === 'video' ? `/tu-van/video/${item.id}` : `/tu-van/${item.id}/chat`)}
                                        title="Vào phòng"
                                      >
                                        <FaCheck /> <span>Vào phòng</span>
                                      </button>
                                    )}
                                    {item.status === 'completed' && item.consultation_type === 'chat' && (
                                      <button
                                        className="crl-btn-action view"
                                        onClick={() => navigate(`/tu-van/${item.id}/chat`)}
                                        title="Xem lại cuộc trò chuyện"
                                      >
                                        <FaComments /> <span>Xem lại chat</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="crl-pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Trước
              </button>
              <span>{pagination.page} / {pagination.totalPages}</span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Phê Duyệt */}
      {isApproveModalOpen && (
        <div className="crl-modal-overlay" onClick={() => setIsApproveModalOpen(false)}>
          <div className="crl-modal" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 460, borderRadius: 16, padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>
                <FaCheckCircle style={{ color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                  Phê duyệt lịch tư vấn
                </h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
                  Mã: <strong>{approveTarget}</strong>
                </p>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '24px', background: '#fff' }}>
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 10, padding: '14px 16px', marginBottom: 24,
                display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <FaCheckCircle style={{ color: '#16a34a', marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534', lineHeight: 1.6 }}>
                  Sau khi phê duyệt, bệnh nhân và bác sĩ sẽ nhận thông báo xác nhận lịch hẹn.
                  Trạng thái sẽ chuyển sang <strong>Đã xác nhận</strong>.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setIsApproveModalOpen(false)} style={{
                  padding: '10px 20px', borderRadius: 8, border: '1.5px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', fontWeight: 600,
                  fontSize: '0.9rem', color: '#374151'
                }}>
                  Huỷ bỏ
                </button>
                <button onClick={handleApproveConfirmed} style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#fff', cursor: 'pointer', fontWeight: 700,
                  fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(22,163,74,0.35)'
                }}>
                  <FaCheckCircle /> Xác nhận duyệt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ Chối */}
      {isRejectModalOpen && (
        <div className="crl-modal-overlay" onClick={() => setIsRejectModalOpen(false)}>
          <div className="crl-modal" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 480, borderRadius: 16, padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>
                <FaTimesCircle style={{ color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                  Từ chối lịch tư vấn
                </h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
                  Mã: <strong>{rejectTarget}</strong>
                </p>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '24px', background: '#fff' }}>
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '14px 16px', marginBottom: 20,
                display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <FaExclamationTriangle style={{ color: '#dc2626', marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b', lineHeight: 1.6 }}>
                  Bệnh nhân sẽ nhận thông báo từ chối kèm lý do bạn nhập bên dưới.
                  Hành động này <strong>không thể hoàn tác</strong>.
                </p>
              </div>

              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8, fontSize: '0.9rem', color: '#374151' }}>
                Lý do từ chối <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="VD: Bác sĩ bận đột xuất, khung giờ không còn phù hợp..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: `1.5px solid ${rejectReason.trim() ? '#d1d5db' : '#fca5a5'}`,
                  resize: 'none', fontSize: '0.9rem',
                  boxSizing: 'border-box', outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              {!rejectReason.trim() && (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                  Vui lòng nhập lý do từ chối
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setIsRejectModalOpen(false)} style={{
                  padding: '10px 20px', borderRadius: 8, border: '1.5px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', fontWeight: 600,
                  fontSize: '0.9rem', color: '#374151'
                }}>
                  Huỷ bỏ
                </button>
                <button onClick={handleRejectConfirmed} disabled={!rejectReason.trim()} style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: !rejectReason.trim()
                    ? '#fca5a5'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#fff', cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: rejectReason.trim() ? '0 2px 8px rgba(220,38,38,0.35)' : 'none',
                  transition: 'all 0.2s'
                }}>
                  <FaTimesCircle /> Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Lịch */}
      {isCancelModalOpen && selectedConsultation && (() => {
        const preview = calculateRefundPreview(selectedConsultation);
        const isNoRefund = !preview || preview.amount === 0;
        return (
          <div className="crl-modal-overlay" onClick={() => setIsCancelModalOpen(false)}>
            <div className="crl-modal" onClick={e => e.stopPropagation()}
              style={{ maxWidth: 520, borderRadius: 12, padding: 28 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ margin:0, fontSize:'1.1rem', display:'flex', alignItems:'center', gap:8 }}>
                  <FaExclamationTriangle style={{ color:'#f59e0b' }} /> Xác nhận hủy tư vấn
                </h3>
                <button onClick={() => setIsCancelModalOpen(false)}
                  style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#6b7280' }}>✕</button>
              </div>

              <p style={{ marginBottom:16, fontSize:'1rem' }}>
                Bạn có chắc chắn muốn hủy tư vấn{' '}
                <strong style={{ color:'#d32f2f' }}>{selectedConsultation.consultation_code}</strong> không?
              </p>

              {preview && (
                <div style={{ background: isNoRefund ? '#f5f5f5' : '#edf7ed',
                  border:`1px solid ${isNoRefund ? '#e0e0e0' : '#c8e6c9'}`,
                  borderRadius:8, padding:14, marginBottom:16 }}>
                  <p style={{ margin:'0 0 8px 0', fontWeight:600, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:6 }}>
                    <FaExclamationTriangle style={{ color: isNoRefund ? '#9e9e9e' : '#4caf50' }} />
                    Kiểm tra điều kiện hoàn tiền:
                  </p>
                  <p style={{ margin:'0 0 8px 0', fontSize:'0.88rem', color:'#424242' }}>{preview.message}</p>
                  {!isNoRefund && (
                    <div style={{ fontSize:'0.85rem', background:'#fff', padding:10, borderRadius:6, border:'1px dashed #a5d6a7' }}>
                      <div>• Tổng tiền đã thanh toán: <strong>{parseFloat(selectedConsultation.total_fee||0).toLocaleString('vi-VN')} VNĐ</strong></div>
                      <div>• Tỷ lệ hoàn trả: <strong style={{ color:'#2e7d32' }}>{preview.percent}%</strong></div>
                      <div>• Dự kiến hoàn: <strong style={{ color:'#d32f2f' }}>{preview.amount.toLocaleString('vi-VN')} VNĐ</strong></div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <label style={{ fontWeight:600, display:'block', marginBottom:6, fontSize:'0.9rem' }}>
                  Vui lòng nhập lý do hủy *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Ghi rõ lý do hủy tư vấn để hệ thống xử lý hoàn tiền chuẩn xác..."
                  rows={4}
                  style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #ccc',
                    resize:'none', fontSize:'0.9rem', boxSizing:'border-box' }}
                />
              </div>

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={() => setIsCancelModalOpen(false)}
                  style={{ padding:'0.6rem 1.2rem', borderRadius:8, border:'1px solid #d1d5db',
                    background:'#fff', cursor:'pointer', fontWeight:600 }}>
                  Đóng
                </button>
                <button onClick={handleSubmitCancel}
                  disabled={!cancelReason.trim()}
                  style={{ padding:'0.6rem 1.2rem', borderRadius:8, border:'none',
                    background: !cancelReason.trim() ? '#fca5a5' : '#dc2626',
                    color:'#fff', cursor:'pointer', fontWeight:600,
                    display:'flex', alignItems:'center', gap:6 }}>
                  <FaTimesCircle /> Xác nhận hủy
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
// client/src/pages/DoctorConsultationManagementPage.js
// ✅ TRANG QUẢN LÝ TƯ VẤN (BÁC SĨ/ADMIN) - COMPACT THEME

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt, FaFilter, FaCheckCircle, FaTimesCircle,
  FaComments, FaEye, FaCalendarTimes, FaHistory, FaVideo,
  FaStar, FaUserInjured, FaStethoscope, FaSync, FaHourglassHalf, FaCheck,
  FaBan, FaSearch, FaMoneyBillWave
} from 'react-icons/fa';
import './DoctorConsultationManagementPage.css';

const STATUS_META = {
  pending: { text: 'Chờ xác nhận', className: 'warning', icon: <FaHourglassHalf /> },
  confirmed: { text: 'Đã xác nhận', className: 'info', icon: <FaCheckCircle /> },
  in_progress: { text: 'Đang diễn ra', className: 'success', icon: <FaCheck /> },
  completed: { text: 'Hoàn thành', className: 'success', icon: <FaCheckCircle /> },
  cancelled: { text: 'Đã hủy', className: 'danger', icon: <FaBan /> },
  rejected: { text: 'Từ chối', className: 'danger', icon: <FaTimesCircle /> },
};

const PAYMENT_META = {
  unpaid: { text: 'Chưa thanh toán', className: 'unpaid' },
  paid_online: { text: 'Đã thanh toán', className: 'paid' },
  paid_at_clinic: { text: 'Thanh toán tại quầy', className: 'paid' },
  not_required: { text: 'Miễn phí', className: 'free' },
  refunded: { text: 'Đã hoàn tiền', className: 'refunded' },
};

const getPatientName = (consultation) => consultation?.patient?.full_name || consultation?.Patient?.User?.full_name || consultation?.patient_name || 'N/A';
const getPatientEmail = (consultation) => consultation?.patient?.email || consultation?.Patient?.User?.email || consultation?.patient_email || 'N/A';
const getDoctorName = (consultation) => consultation?.doctor?.full_name || consultation?.Doctor?.user?.full_name || consultation?.doctor_name || 'N/A';
const getDoctorEmail = (consultation) => consultation?.doctor?.email || consultation?.Doctor?.user?.email || consultation?.doctor_email || 'N/A';
const getPaymentStatus = (consultation) => consultation?.payment_status || 'unpaid';
const getPaymentMeta = (consultation) => PAYMENT_META[getPaymentStatus(consultation)] || PAYMENT_META.unpaid;
const getStatusMeta = (consultation) => STATUS_META[consultation?.status] || { text: consultation?.status || 'Không rõ', className: 'warning', icon: <FaHourglassHalf /> };

const DoctorConsultationManagementPage = ({ isAdminView = false }) => {
  const navigate = useNavigate();
  
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    date: '',
    paymentStatus: 'all',
    search: '',
    sortBy: 'newest',
    page: 1,
    limit: 20
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      const res = isAdminView
        ? await consultationService.getAllConsultationsRealtime(params)
        : await consultationService.getDoctorConsultations(params);

      if (res.data.success) {
        const data = isAdminView
          ? res.data.data.consultations
          : res.data.data;
        setConsultations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdminView, filters.page, filters.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleConfirm = async (consultationId) => {
    if (!window.confirm('Xác nhận chấp nhận buổi tư vấn này?')) return;
    try {
      await consultationService.confirmConsultation(consultationId);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xác nhận tư vấn');
    }
  };

  // Khôi phục lại hàm handleReject đã bị mất do dán nhầm
  const handleReject = async (consultationId) => {
    const reason = prompt('Lý do từ chối (bắt buộc):');
    if (!reason) return;
    try {
      await consultationService.cancelConsultation(consultationId, { reason, cancelled_by: 'doctor' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi từ chối tư vấn');
    }
  };

  // Khôi phục lại hàm handleStartConsultation chuẩn
  const handleStartConsultation = async (consultationId, consultationType) => {
    try {
      await consultationService.startConsultation(consultationId);
      if (consultationType === 'video') {
        navigate(`/tu-van/video/${consultationId}`);
      } else {
        navigate(`/tu-van/${consultationId}/chat`);
      }
    } catch (error) {
      alert('Lỗi bắt đầu tư vấn: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelConfirmed = async (consultation) => {
    const now = new Date();
    const apptTime = new Date(consultation.appointment_time);
    if ((apptTime - now) / 36e5 < 24) {
      alert('Không thể hủy lịch hẹn còn dưới 24h.');
      return;
    }
    const reason = prompt('Lý do hủy lịch (bắt buộc):');
    if (!reason) return;

    try {
      await consultationService.cancelConsultation(consultation.id, { reason, cancelled_by: 'doctor' });
      alert('Đã hủy lịch hẹn.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi hủy lịch');
    }
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredConsultations = consultations
    .filter((consultation) => {
      if (filters.status !== 'all' && consultation.status !== filters.status) return false;
      if (filters.type !== 'all' && consultation.consultation_type !== filters.type) return false;
      if (filters.date && consultation.appointment_time) {
        const appointmentDate = new Date(consultation.appointment_time).toISOString().slice(0, 10);
        if (appointmentDate !== filters.date) return false;
      }
      if (filters.paymentStatus !== 'all' && getPaymentStatus(consultation) !== filters.paymentStatus) return false;
      if (filters.search) {
        const keyword = filters.search.toLowerCase();
        const haystack = [
          consultation?.consultation_code,
          getPatientName(consultation),
          getPatientEmail(consultation),
          getDoctorName(consultation),
          getDoctorEmail(consultation),
          consultation?.chief_complaint,
        ].join(' ').toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (filters.sortBy === 'oldest') {
        return new Date(left.appointment_time) - new Date(right.appointment_time);
      }
      if (filters.sortBy === 'code') {
        return String(left.consultation_code || '').localeCompare(String(right.consultation_code || ''));
      }
      return new Date(right.created_at || right.appointment_time) - new Date(left.created_at || left.appointment_time);
    });

  const statusStats = filteredConsultations.reduce((acc, item) => {
    acc[item.status || 'pending'] = (acc[item.status || 'pending'] || 0) + 1;
    return acc;
  }, {});

  // Render Action Buttons
  const getActionButtons = (consultation) => {
    return (
      <div className="dcm-actions">
        <button className="dcm-btn dcm-btn-icon info" onClick={() => navigate(`/tu-van/${consultation.id}`)} title="Xem chi tiết">
          <FaEye />
        </button>

        {consultation.status === 'pending' && (
          <>
            <button className="dcm-btn dcm-btn-icon success" onClick={() => handleConfirm(consultation.id)} title="Chấp nhận">
              <FaCheckCircle />
            </button>
            <button className="dcm-btn dcm-btn-icon danger" onClick={() => handleReject(consultation.id)} title="Từ chối">
              <FaTimesCircle />
            </button>
          </>
        )}

        {consultation.status === 'confirmed' && (
          <button className="dcm-btn dcm-btn-icon danger" onClick={() => handleCancelConfirmed(consultation)} title="Hủy lịch">
            <FaCalendarTimes />
          </button>
        )}

        {/* Nút Bắt đầu / Tham gia */}
        {consultation.status === 'confirmed' && consultationService.canStartConsultation(consultation.appointment_time) && (
          <button 
            className="dcm-btn dcm-btn-primary" 
            onClick={() => handleStartConsultation(consultation.id, consultation.consultation_type)}
          >
            <FaComments /> Bắt đầu
          </button>
        )}
        
        {consultation.status === 'in_progress' && (
          <button 
            className="dcm-btn dcm-btn-success"
            onClick={() => {
              if (consultation.consultation_type === 'video') navigate(`/tu-van/video/${consultation.id}`);
              else navigate(`/tu-van/${consultation.id}/chat`);
            }}
          >
            {consultation.consultation_type === 'video' ? <FaVideo/> : <FaComments/>} Tham gia
          </button>
        )}

        {consultation.status === 'completed' && !consultation.diagnosis && (
          <button
            className="dcm-btn dcm-btn-primary"
            style={{ background: '#dc2626', position: 'relative' }}
            onClick={() => navigate(`/tu-van/video/${consultation.id}?openResult=1`)}
            title="Chưa nhập kết quả"
          >
            <span style={{
              position: 'absolute', top: -6, right: -6,
              width: 10, height: 10, borderRadius: '50%',
              background: '#ff4444', border: '2px solid #fff'
            }} />
            <FaStethoscope /> Nhập kết quả
          </button>
        )}

        {consultation.status === 'completed' && consultation.diagnosis && (
          <button
            className="dcm-btn dcm-btn-icon warning"
            onClick={() => navigate(`/tu-van/${consultation.id}`)}
            title="Xem lịch sử"
          >
            <FaHistory />
          </button>
        )}
      </div>
    );
  };

  const getStatusBadge = (consultation) => {
    const status = consultationService.formatStatus(consultation);
    return (
      <span className={`dcm-badge ${status.color}`}>
        {status.icon} {status.text}
      </span>
    );
  };

  return (
    <div className="dcm-page">
      {/* Header */}
      <div className="dcm-header">
        <h1 className="dcm-title">
          <FaStethoscope /> {isAdminView ? 'Quản lý Tư vấn (Admin)' : 'Lịch Tư vấn của tôi'}
        </h1>
        <div className="dcm-header-actions">
          <button className="dcm-btn dcm-btn-secondary" onClick={fetchData}><FaSync/> Làm mới</button>
        </div>
      </div>

      {/* Stats Cards */}
      {(stats || filteredConsultations.length > 0) && (
        <div className="dcm-stats-grid">
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon blue"><FaCalendarAlt /></div>
            <div className="dcm-stat-info">
              <h3>{filteredConsultations.length}</h3>
              <p>Tổng lịch</p>
            </div>
          </div>
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon green"><FaHourglassHalf /></div>
            <div className="dcm-stat-info">
              <h3>{statusStats.pending || 0}</h3>
              <p>Chờ xác nhận</p>
            </div>
          </div>
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon yellow"><FaCheckCircle /></div>
            <div className="dcm-stat-info">
              <h3>{statusStats.confirmed || 0}</h3>
              <p>Đã xác nhận</p>
            </div>
          </div>
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon purple"><FaVideo /></div>
            <div className="dcm-stat-info">
              <h3>{statusStats.in_progress || 0}</h3>
              <p>Đang diễn ra</p>
            </div>
          </div>
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon blue"><FaCheck /></div>
            <div className="dcm-stat-info">
              <h3>{statusStats.completed || 0}</h3>
              <p>Hoàn thành</p>
            </div>
          </div>
          <div className="dcm-stat-card">
            <div className="dcm-stat-icon yellow"><FaBan /></div>
            <div className="dcm-stat-info">
              <h3>{statusStats.cancelled || 0}</h3>
              <p>Đã hủy</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="dcm-filters">
        <div className="dcm-filter-group">
          <div className="dcm-search-box">
            <FaSearch className="dcm-search-icon" />
            <input
              className="dcm-input dcm-search-input"
              placeholder="Tìm mã, bệnh nhân, bác sĩ, email..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
          <select className="dcm-select" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="in_progress">Đang diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          
          <select className="dcm-select" value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
            <option value="all">Tất cả loại hình</option>
            <option value="chat">Chat</option>
            <option value="video">Video Call</option>
            <option value="offline">Tại viện</option>
          </select>

          <input type="date" className="dcm-input" value={filters.date} onChange={e => handleFilterChange('date', e.target.value)} />
          
          <button 
            className="dcm-btn dcm-btn-secondary"
            onClick={() => setFilters({ status: 'all', type: 'all', date: '', paymentStatus: 'all', search: '', sortBy: 'newest', page: 1, limit: 20 })}
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dcm-table-wrapper">
        {loading ? (
          <div className="dcm-loading">Đang tải...</div>
        ) : filteredConsultations.length === 0 ? (
          <div className="dcm-empty"><FaCalendarAlt /> Chưa có lịch tư vấn nào</div>
        ) : (
          <table className="dcm-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Bệnh nhân</th>
                <th>Bác sĩ</th>
                <th>Loại hình</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsultations.map(item => (
                <tr key={item.id}>
                  <td><span className="dcm-code">{item.consultation_code}</span></td>
                  <td>
                    <div className="dcm-info-cell">
                      <strong>{getPatientName(item)}</strong>
                      <span>{getPatientEmail(item)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="dcm-info-cell">
                      <strong>{getDoctorName(item)}</strong>
                      <span>{getDoctorEmail(item)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`dcm-type ${item.consultation_type}`}>
                      {item.consultation_type === 'chat' ? <FaComments/> : <FaVideo/>} 
                      {item.consultation_type === 'chat' ? ' Chat' : ' Video'}
                    </span>
                  </td>
                  <td>{formatDateTime(item.appointment_time)}</td>
                  <td>
                    <span className={`dcm-badge ${getStatusMeta(item).className}`}>
                      {getStatusMeta(item).icon} {getStatusMeta(item).text}
                    </span>
                  </td>
                  <td>
                    <span className={`dcm-payment-badge ${getPaymentMeta(item).className}`}>
                      <FaMoneyBillWave /> {getPaymentMeta(item).text}
                    </span>
                  </td>
                  <td className="text-right">{getActionButtons(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DoctorConsultationManagementPage;
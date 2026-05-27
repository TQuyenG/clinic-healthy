// client/src/pages/DoctorMedicalRecordsPage.js
// Trang quản lý hồ sơ bệnh nhân dành cho Bác sĩ
// Data source: getDoctorAppointments → appointments + MedicalRecord (included)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import appointmentService from '../services/appointmentService';
import consultationService from '../services/consultationService';
import medicalRecordService from '../services/medicalRecordService'; // THÊM DÒNG NÀY
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './DoctorMedicalRecordsPage.css';

import {
  FaFileMedicalAlt, FaSearch, FaUserInjured, FaCalendarAlt,
  FaEdit, FaEye, FaSpinner, FaCommentMedical, FaVideo,
  FaComments, FaFilter, FaStethoscope, FaNotesMedical,
  FaCheckCircle, FaExclamationTriangle, FaClock, FaHashtag,
  FaHospital, FaTimes, FaPlus, FaTimesCircle, FaSyncAlt,
  FaChevronDown, FaClipboardList, FaPills
} from 'react-icons/fa';

const SHOWN_STATUSES = ['confirmed', 'in_progress', 'completed'];

const STATUS_MAP = {
  confirmed:   { label: 'Đã xác nhận', cls: 'dmrp-s-confirmed'  },
  upcoming:    { label: 'Sắp tới',     cls: 'dmrp-s-upcoming'   },
  in_progress: { label: 'Đang khám',   cls: 'dmrp-s-inprogress' },
  completed:   { label: 'Hoàn thành',  cls: 'dmrp-s-completed'  },
  passed:      { label: 'Đã qua',      cls: 'dmrp-s-passed'     },
};

const DoctorMedicalRecordsPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isStaff = user?.role === 'staff';

  const [activeTab, setActiveTab]             = useState('appointments');
  const [appointments, setAppointments]       = useState([]);
  const [consultations, setConsultations]     = useState([]);
  const [apptLoading, setApptLoading]         = useState(true);
  const [consultLoading, setConsultLoading]   = useState(false);
  const [search, setSearch]                   = useState('');
  const [statusFilter, setStatusFilter]       = useState('');
  const [recordFilter, setRecordFilter]       = useState('');
  const [consultStatusFilter, setConsultStatusFilter] = useState('completed');
  const [showFilterMenu, setShowFilterMenu]   = useState(false);

  // === THÊM 7 DÒNG MỚI ===
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [vitalsTab, setVitalsTab] = useState('input'); // 'input' = staff nhập, 'result' = doctor xem
  const [vitalsData, setVitalsData] = useState({
    blood_pressure: '', temperature: '', weight: '', 
    height: '', heart_rate: '', spo2: '', clinical_note: ''
  });
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [viewRecordLoading, setViewRecordLoading] = useState(false);
  const [viewRecordData, setViewRecordData] = useState(null); // data record đầy đủ khi xem
  // === KẾT THÚC THÊM ===

  const loadAppointments = useCallback(async () => {
    setApptLoading(true);
    try {
      let res;
      if (isStaff) {
        // SỬA: Truyền date: 'all' để lấy toàn bộ lịch hẹn khám dịch vụ
        res = await appointmentService.getClinicalQueue({ date: 'all', limit: 500 });
      } else {
        res = await appointmentService.getDoctorAppointments({ limit: 500 });
      }
      if (res.data.success) {
        const relevant = (res.data.data || []).filter(a => SHOWN_STATUSES.includes(a.status));
        setAppointments(relevant);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách lịch hẹn');
    } finally {
      setApptLoading(false);
    }
  }, [isStaff]);

  const loadConsultations = useCallback(async () => {
    setConsultLoading(true);
    try {
      const res = await consultationService.getDoctorConsultations({ limit: 100 });
      if (res.data.success) {
        setConsultations(res.data.consultations || res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách tư vấn');
    } finally {
      setConsultLoading(false);
    }
  }, []);

  // === THÊM 2 FUNCTION HANDLER MỚI ===
  const openVitalsModal = async (appt, defaultTab = null) => {
    setSelectedAppointment(appt);
    setViewRecordData(null);
    // Điền vitals cũ nếu đã có
    if (appt.MedicalRecord?.vitals_json) {
      setVitalsData(prev => ({
        ...prev,
        ...appt.MedicalRecord.vitals_json,
        clinical_note: appt.MedicalRecord.clinical_note || ''
      }));
    } else {
      setVitalsData({ blood_pressure: '', temperature: '', weight: '', height: '', heart_rate: '', spo2: '', clinical_note: '' });
    }
    // Nếu có record và đang xem tab result → load data đầy đủ từ API
    const tab = defaultTab || (isStaff ? 'input' : 'result');
    setVitalsTab(tab);
    if (tab === 'result' && appt.MedicalRecord?.id) {
      setViewRecordLoading(true);
      try {
        const res = await medicalRecordService.getMedicalRecordById(appt.MedicalRecord.id);
        if (res.data.success) setViewRecordData(res.data.data);
      } catch (err) {
        toast.error('Không thể tải hồ sơ y tế');
      } finally {
        setViewRecordLoading(false);
      }
    }
    setShowVitalsModal(true);
  };

  const handleSaveVitals = async () => {
    if (!selectedAppointment) return;
    setVitalsLoading(true);
    try {
      const payload = {
        appointment_id: selectedAppointment.id,
        ...vitalsData
      };

      if (selectedAppointment.MedicalRecord?.id) {
        // Cập nhật vitals đã có
        await medicalRecordService.updateVitals(selectedAppointment.id, payload);
        toast.success('Cập nhật chỉ số sinh tồn thành công');
      } else {
        // Tạo mới record với vitals
        await medicalRecordService.inputVitals(payload);
        toast.success('Lưu chỉ số sinh tồn thành công');
      }
      setShowVitalsModal(false);
      loadAppointments(); // Reload lại danh sách
    } catch (err) {
      console.error(err);
      toast.error('Lỗi lưu chỉ số sinh tồn: ' + err.message);
    } finally {
      setVitalsLoading(false);
    }
  };
  // === KẾT THÚC THÊM ===

  useEffect(() => {
    // 1. Tự động load danh sách Khám dịch vụ ngay khi mở trang
    if (activeTab === 'appointments') {
      loadAppointments();
    } 
    // 2. Chặn Staff gọi API của Bác sĩ bên tab Tư vấn để tránh lỗi 403 Forbidden
    else if (activeTab === 'consultations' && consultations.length === 0) {
      if (!isStaff) { 
        loadConsultations();
      }
    }
  }, [activeTab, loadAppointments, loadConsultations, consultations.length, isStaff]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const name = a.Patient?.User?.full_name || a.Patient?.user?.full_name || a.guest_name || '';
      const code = a.code || '';
      const diag = a.MedicalRecord?.diagnosis || '';
      const matchSearch = !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        code.toLowerCase().includes(search.toLowerCase()) ||
        diag.toLowerCase().includes(search.toLowerCase());
      let matchStatus = true;
      if (statusFilter) {
        if (statusFilter === 'upcoming') matchStatus = !!a.isUpcoming;
        else if (statusFilter === 'passed') matchStatus = !!a.isPassed;
        else matchStatus = a.status === statusFilter;
      }
      const hasRecord   = !!a.MedicalRecord;
      const matchRecord = !recordFilter ||
        (recordFilter === 'has'  && hasRecord)  ||
        (recordFilter === 'none' && !hasRecord);
      return matchSearch && matchStatus && matchRecord;
    });
  }, [appointments, search, statusFilter, recordFilter]);

  const filteredConsultations = useMemo(() => {
    return consultations.filter(c => {
      const name = c.Patient?.user?.full_name || c.Patient?.User?.full_name || '';
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !consultStatusFilter || c.status === consultStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [consultations, search, consultStatusFilter]);

  const stats = useMemo(() => ({
    total:     appointments.length,
    hasRecord: appointments.filter(a => !!a.MedicalRecord).length,
    noRecord:  appointments.filter(a => !a.MedicalRecord && (a.status === 'completed' || a.isPassed)).length,
  }), [appointments]);

  const getPatientName = (a) =>
    a.Patient?.User?.full_name || a.Patient?.user?.full_name || a.guest_name || 'Khách vãng lai';

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getConsultTypeIcon = (type) => {
    if (type === 'video') return <FaVideo    className="dmrp-type-icon dmrp-type-video"   />;
    if (type === 'chat')  return <FaComments className="dmrp-type-icon dmrp-type-chat"    />;
    return                       <FaHospital className="dmrp-type-icon dmrp-type-offline" />;
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setRecordFilter(''); setConsultStatusFilter('');
  };

  const hasActiveFilter = search || statusFilter || recordFilter || consultStatusFilter;

  return (
    <div className="dmrp-page">
      <div className="dmrp-wrapper">

        {/* HEADER */}
        <div className="dmrp-header">
          <div className="dmrp-header-left">
            <div className="dmrp-header-icon"><FaFileMedicalAlt /></div>
            <div>
              <h1 className="dmrp-title">Hồ Sơ Bệnh Nhân</h1>
              <p className="dmrp-subtitle">Quản lý kết quả khám & tư vấn của bệnh nhân bạn phụ trách</p>
            </div>
          </div>
          <div className="dmrp-header-stats">
            <div className="dmrp-stat-chip">
              <FaClipboardList /><span>{stats.total} lịch hẹn</span>
            </div>
            <div className="dmrp-stat-chip dmrp-chip-green">
              <FaCheckCircle /><span>{stats.hasRecord} có hồ sơ</span>
            </div>
            {stats.noRecord > 0 && (
              <div className="dmrp-stat-chip dmrp-chip-orange">
                <FaExclamationTriangle /><span>{stats.noRecord} chưa nhập</span>
              </div>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="dmrp-tabs">
          <button className={`dmrp-tab ${activeTab === 'appointments' ? 'dmrp-tab-active' : ''}`} onClick={() => setActiveTab('appointments')}>
            <FaStethoscope /> Khám dịch vụ <span className="dmrp-tab-count">{stats.total}</span>
          </button>
          <button className={`dmrp-tab ${activeTab === 'consultations' ? 'dmrp-tab-active' : ''}`} onClick={() => setActiveTab('consultations')}>
            <FaCommentMedical /> Tư vấn <span className="dmrp-tab-count">{consultations.length}</span>
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="dmrp-toolbar">
          <div className="dmrp-search-box">
            <FaSearch className="dmrp-search-icon" />
            <input type="text" placeholder="Tìm tên bệnh nhân, mã lịch hẹn, chẩn đoán..." value={search} onChange={e => setSearch(e.target.value)} className="dmrp-search-input" />
            {search && <button className="dmrp-search-clear" onClick={() => setSearch('')}><FaTimes /></button>}
          </div>

          <div className="dmrp-filter-wrap">
            <button
              className={`dmrp-filter-btn ${showFilterMenu ? 'dmrp-filter-btn-active' : ''} ${hasActiveFilter ? 'dmrp-filter-btn-has' : ''}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <FaFilter /> Bộ lọc
              {hasActiveFilter && <span className="dmrp-filter-dot" />}
              <FaChevronDown className={showFilterMenu ? 'dmrp-chevron-up' : ''} />
            </button>

            {showFilterMenu && (
              <div className="dmrp-filter-panel">
                {activeTab === 'appointments' && (
                  <>
                    <div className="dmrp-filter-group">
                      <div className="dmrp-filter-group-label">Trạng thái lịch hẹn</div>
                      <div className="dmrp-filter-chips">
                        {[{val:'',label:'Tất cả'},{val:'confirmed',label:'Đã xác nhận'},{val:'upcoming',label:'Sắp tới'},{val:'in_progress',label:'Đang khám'},{val:'completed',label:'Hoàn thành'},{val:'passed',label:'Đã qua'}].map(o => (
                          <button key={o.val} className={`dmrp-chip-btn ${statusFilter === o.val ? 'dmrp-chip-active' : ''}`} onClick={() => setStatusFilter(o.val)}>{o.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="dmrp-filter-group">
                      <div className="dmrp-filter-group-label">Tình trạng hồ sơ y tế</div>
                      <div className="dmrp-filter-chips">
                        {[{val:'',label:'Tất cả'},{val:'has',label:'✅ Đã có hồ sơ'},{val:'none',label:'⚠️ Chưa nhập hồ sơ'}].map(o => (
                          <button key={o.val} className={`dmrp-chip-btn ${recordFilter === o.val ? 'dmrp-chip-active' : ''}`} onClick={() => setRecordFilter(o.val)}>{o.label}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {activeTab === 'consultations' && (
                  <div className="dmrp-filter-group">
                    <div className="dmrp-filter-group-label">Trạng thái tư vấn</div>
                    <div className="dmrp-filter-chips">
                      {[{val:'',label:'Tất cả'},{val:'pending',label:'Chờ xác nhận'},{val:'confirmed',label:'Đã xác nhận'},{val:'in_progress',label:'Đang diễn ra'},{val:'completed',label:'Hoàn thành'},{val:'cancelled',label:'Đã hủy'}].map(o => (
                        <button key={o.val} className={`dmrp-chip-btn ${consultStatusFilter === o.val ? 'dmrp-chip-active' : ''}`} onClick={() => setConsultStatusFilter(o.val)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                )}
                {hasActiveFilter && (
                  <button className="dmrp-clear-filter-btn" onClick={clearFilters}><FaTimesCircle /> Xóa tất cả bộ lọc</button>
                )}
              </div>
            )}
          </div>

          <button className="dmrp-refresh-btn" onClick={activeTab === 'appointments' ? loadAppointments : loadConsultations} title="Làm mới">
            <FaSyncAlt />
          </button>
        </div>

        {hasActiveFilter && (
          <div className="dmrp-result-bar">
            Tìm thấy <strong>{activeTab === 'appointments' ? filteredAppointments.length : filteredConsultations.length}</strong> kết quả
            <button className="dmrp-clear-link" onClick={clearFilters}>Xóa bộ lọc</button>
          </div>
        )}

        {/* TAB: KHÁM DỊCH VỤ */}
        {activeTab === 'appointments' && (
          <div className="dmrp-list">
            {apptLoading ? (
              <div className="dmrp-loading"><FaSpinner className="dmrp-spin" /><span>Đang tải...</span></div>
            ) : filteredAppointments.length === 0 ? (
              <div className="dmrp-empty"><FaExclamationTriangle /><h3>Không tìm thấy lịch hẹn nào</h3><p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div>
            ) : filteredAppointments.map(appt => {
              const hasRecord = !!appt.MedicalRecord;
              const canEnter  = (appt.status === 'completed' || appt.isPassed || appt.status === 'in_progress');
              const ss        = STATUS_MAP[appt.status] || { label: appt.status, cls: 'dmrp-s-default' };

              return (
                <div key={appt.id} className={`dmrp-card ${hasRecord ? 'dmrp-card-has-record' : canEnter ? 'dmrp-card-needs-record' : 'dmrp-card-default'}`}>
                  <div className="dmrp-card-header">
                    <div className="dmrp-card-code"><FaHashtag />{appt.code}</div>
                    <div className="dmrp-card-meta">
                      <FaCalendarAlt /> {formatDate(appt.appointment_date)}
                      {appt.appointment_start_time && <span className="dmrp-time">{appt.appointment_start_time.slice(0,5)}</span>}
                    </div>
                    <span className={`dmrp-badge ${ss.cls}`}>{ss.label}</span>
                    <span className={`dmrp-badge ${hasRecord ? 'dmrp-rs-has' : 'dmrp-rs-none'}`}>
                      {hasRecord ? '✅ Đã có hồ sơ' : '⚠️ Chưa nhập hồ sơ'}
                    </span>
                  </div>

                  <div className="dmrp-card-body">
                    <div className="dmrp-info-col">
                      <div className="dmrp-info-label"><FaUserInjured /> Bệnh nhân</div>
                      <div className="dmrp-patient-name">{getPatientName(appt)}</div>
                      {(appt.Patient?.User?.phone || appt.Patient?.user?.phone) && (
                        <div className="dmrp-patient-phone">{appt.Patient?.User?.phone || appt.Patient?.user?.phone}</div>
                      )}
                    </div>

                    <div className="dmrp-info-col">
                      <div className="dmrp-info-label"><FaStethoscope /> Dịch vụ</div>
                      <div className="dmrp-info-value">{appt.Service?.name || <span className="dmrp-empty-text">N/A</span>}</div>
                    </div>

                    <div className="dmrp-info-col dmrp-info-col-wide">
                      <div className="dmrp-info-label"><FaNotesMedical /> Chẩn đoán</div>
                      <div className="dmrp-info-value">
                        {hasRecord
                          ? <span className="dmrp-diagnosis">{appt.MedicalRecord.diagnosis}</span>
                          : <span className="dmrp-empty-text">Chưa có hồ sơ y tế</span>
                        }
                      </div>
                      {hasRecord && appt.MedicalRecord.prescription_json?.length > 0 && (
                        <div className="dmrp-rx-note"><FaPills /> {appt.MedicalRecord.prescription_json.length} loại thuốc</div>
                      )}
                    </div>

                    {hasRecord && appt.MedicalRecord.follow_up_date && (
                      <div className="dmrp-info-col">
                        <div className="dmrp-info-label"><FaClock /> Tái khám</div>
                        <div className="dmrp-followup-date">{formatDate(appt.MedicalRecord.follow_up_date)}</div>
                      </div>
                    )}
                  </div>

                  <div className="dmrp-card-footer">
                    <div className="dmrp-footer-left">
                      {!hasRecord && canEnter && (
                        <span className="dmrp-alert-note"><FaExclamationTriangle /> Cần nhập kết quả khám</span>
                      )}
                    </div>
                    <div className="dmrp-footer-actions">
                      <button className="dmrp-btn dmrp-btn-sm dmrp-btn-ghost" onClick={() => navigate(`/lich-hen/${appt.code}`)}>
                        <FaEye /> Lịch hẹn
                      </button>
                      
                      {/* Staff: nút nhập vitals (ẩn nếu đã nhập rồi, muốn sửa thì vào xem hồ sơ) */}
                      {isStaff && canEnter && !appt.MedicalRecord?.vitals_json && (
                        <button className="dmrp-btn dmrp-btn-sm dmrp-btn-vitals" onClick={() => openVitalsModal(appt, 'input')}>
                          <FaEdit /> Nhập Vitals
                        </button>
                      )}

                      {hasRecord ? (
                        <>
                          {/* Cả staff lẫn doctor đều xem được hồ sơ qua modal */}
                          <button className="dmrp-btn dmrp-btn-sm dmrp-btn-view" onClick={() => openVitalsModal(appt, 'result')}>
                            <FaEye /> Xem hồ sơ
                          </button>
                          {/* Chỉ doctor/admin mới được cập nhật kết quả khám */}
                          {!isStaff && (
                            <button className="dmrp-btn dmrp-btn-sm dmrp-btn-edit" onClick={() => navigate(`/nhap-ket-qua/${appt.code}?record_id=${appt.MedicalRecord.id}`)}>
                              <FaEdit /> Cập nhật
                            </button>
                          )}
                        </>
                      ) : canEnter && !isStaff ? (
                        <button className="dmrp-btn dmrp-btn-sm dmrp-btn-new" onClick={() => navigate(`/nhap-ket-qua/${appt.code}`)}>
                          <FaPlus /> Nhập hồ sơ
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: TƯ VẤN */}
        {activeTab === 'consultations' && (
          <div className="dmrp-list">
            {consultLoading ? (
              <div className="dmrp-loading"><FaSpinner className="dmrp-spin" /><span>Đang tải...</span></div>
            ) : filteredConsultations.length === 0 ? (
              <div className="dmrp-empty"><FaExclamationTriangle /><h3>Không tìm thấy phiên tư vấn nào</h3><p>Thử thay đổi bộ lọc.</p></div>
            ) : filteredConsultations.map(c => {
              const cStatusMap = {
                pending:     { label: 'Chờ xác nhận', cls: 'dmrp-s-upcoming'   },
                confirmed:   { label: 'Đã xác nhận',  cls: 'dmrp-s-confirmed'  },
                in_progress: { label: 'Đang diễn ra', cls: 'dmrp-s-inprogress' },
                completed:   { label: 'Hoàn thành',   cls: 'dmrp-s-completed'  },
                cancelled:   { label: 'Đã hủy',       cls: 'dmrp-s-cancelled'  },
              };
              const cs = cStatusMap[c.status] || { label: c.status, cls: 'dmrp-s-default' };

              return (
                <div key={c.id} className="dmrp-card dmrp-card-consult">
                  <div className="dmrp-card-header">
                    <div className="dmrp-card-code">
                      {getConsultTypeIcon(c.type)}
                      {c.type === 'video' ? 'Video' : c.type === 'chat' ? 'Chat' : 'Tại viện'}
                      <span className="dmrp-card-id">#{c.id}</span>
                    </div>
                    <div className="dmrp-card-meta"><FaCalendarAlt /> {formatDateTime(c.appointment_time || c.created_at)}</div>
                    <span className={`dmrp-badge ${cs.cls}`}>{cs.label}</span>
                  </div>

                  <div className="dmrp-card-body">
                    <div className="dmrp-info-col">
                      <div className="dmrp-info-label"><FaUserInjured /> Bệnh nhân</div>
                      <div className="dmrp-patient-name">{c.Patient?.user?.full_name || c.Patient?.User?.full_name || 'N/A'}</div>
                    </div>
                    <div className="dmrp-info-col">
                      <div className="dmrp-info-label"><FaClipboardList /> Gói tư vấn</div>
                      <div className="dmrp-info-value">{c.ConsultationPricing?.package_name || 'Tư vấn thường'}</div>
                    </div>
                    <div className="dmrp-info-col">
                      <div className="dmrp-info-label"><FaClock /> Thời lượng</div>
                      <div className="dmrp-info-value">{c.duration_minutes ? `${c.duration_minutes} phút` : <span className="dmrp-empty-text">N/A</span>}</div>
                    </div>
                    {c.ConsultationFeedback && (
                      <div className="dmrp-info-col">
                        <div className="dmrp-info-label">Đánh giá</div>
                        <div className="dmrp-rating">{'⭐'.repeat(c.ConsultationFeedback.rating)} ({c.ConsultationFeedback.rating}/5)</div>
                      </div>
                    )}
                  </div>

                  <div className="dmrp-card-footer">
                    <div className="dmrp-footer-left" />
                    <div className="dmrp-footer-actions">
                      <button className="dmrp-btn dmrp-btn-sm dmrp-btn-view" onClick={() => navigate(`/tu-van/${c.id}`)}>
                        <FaEye /> Xem chi tiết
                      </button>
                      {c.status === 'in_progress' && (
                        <button className="dmrp-btn dmrp-btn-sm dmrp-btn-join" onClick={() => navigate(c.type === 'video' ? `/tu-van/${c.id}/video` : `/tu-van/${c.id}/chat`)}>
                          {c.type === 'video' ? <FaVideo /> : <FaComments />} Vào phòng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* === MODAL NHẬP VITALS === */}
        {showVitalsModal && selectedAppointment && (
          <div className="dmrp-modal-overlay" onClick={() => setShowVitalsModal(false)}>
            <div className="dmrp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dmrp-modal-header">
                <h2>Chỉ số sinh tồn - {getPatientName(selectedAppointment)}</h2>
                <button className="dmrp-modal-close" onClick={() => setShowVitalsModal(false)}>
                  <FaTimes />
                </button>
              </div>

              {/* === TABS === */}
              <div className="dmrp-modal-tabs">
                <button 
                  className={`dmrp-tab-btn ${vitalsTab === 'input' ? 'active' : ''}`}
                  onClick={() => setVitalsTab('input')}
                  disabled={!isStaff}
                >
                  📝 Nhập Vitals (Staff)
                </button>
                <button 
                  className={`dmrp-tab-btn ${vitalsTab === 'result' ? 'active' : ''}`}
                  onClick={() => setVitalsTab('result')}
                  disabled={!selectedAppointment.MedicalRecord}
                >
                  ✅ Kết quả Khám (Doctor)
                </button>
              </div>

              {/* === TAB 1: NHẬP VITALS === */}
              {vitalsTab === 'input' && isStaff && (
                <div className="dmrp-modal-body">
                  {/* Thông tin bệnh nhân (chỉ đọc) */}
                  <div className="dmrp-vitals-patient-info">
                    <div className="dmrp-vitals-patient-row">
                      <span className="dmrp-vitals-patient-name">{getPatientName(selectedAppointment)}</span>
                      {selectedAppointment.queue_number && (
                        <span className="dmrp-vitals-stt">STT: <strong>#{selectedAppointment.queue_number}</strong></span>
                      )}
                      <span className="dmrp-vitals-code">Mã: {selectedAppointment.code}</span>
                    </div>
                    {(selectedAppointment.Patient?.User?.phone || selectedAppointment.guest_phone) && (
                      <div className="dmrp-vitals-patient-row">
                        <span>📞 {selectedAppointment.Patient?.User?.phone || selectedAppointment.guest_phone}</span>
                        {(selectedAppointment.Patient?.User?.email || selectedAppointment.guest_email) && (
                          <span>✉️ {selectedAppointment.Patient?.User?.email || selectedAppointment.guest_email}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SINH HIỆU CHÍNH */}
                  <div className="dmrp-form-section-title">🩺 Sinh hiệu</div>

                  <div className="dmrp-form-row">
                    <div className="dmrp-form-group">
                      <label>Huyết áp — HA (mmHg)</label>
                      <input type="text" placeholder="VD: 120/80"
                        value={vitalsData.blood_pressure}
                        onChange={(e) => setVitalsData({...vitalsData, blood_pressure: e.target.value})} />
                      <span className="dmrp-form-hint">Tâm thu / Tâm trương</span>
                    </div>
                    <div className="dmrp-form-group">
                      <label>Nhịp tim — M (lần/phút)</label>
                      <input type="number" placeholder="78"
                        value={vitalsData.heart_rate}
                        onChange={(e) => setVitalsData({...vitalsData, heart_rate: e.target.value})} />
                      <span className="dmrp-form-hint">Đếm 1 phút, ghi đều/không đều</span>
                    </div>
                  </div>

                  <div className="dmrp-form-row">
                    <div className="dmrp-form-group">
                      <label>Nhịp thở — Th (lần/phút)</label>
                      <input type="number" placeholder="16"
                        value={vitalsData.respiratory_rate || ''}
                        onChange={(e) => setVitalsData({...vitalsData, respiratory_rate: e.target.value})} />
                    </div>
                    <div className="dmrp-form-group">
                      <label>Nhiệt độ — T (°C)</label>
                      <input type="number" placeholder="36.8" step="0.1"
                        value={vitalsData.temperature}
                        onChange={(e) => setVitalsData({...vitalsData, temperature: e.target.value})} />
                      <span className="dmrp-form-hint">Đo miệng / nách / tai</span>
                    </div>
                  </div>

                  <div className="dmrp-form-row">
                    <div className="dmrp-form-group">
                      <label>Cân nặng — CN (kg)</label>
                      <input type="number" placeholder="65" step="0.1"
                        value={vitalsData.weight}
                        onChange={(e) => setVitalsData({...vitalsData, weight: e.target.value})} />
                    </div>
                    <div className="dmrp-form-group">
                      <label>Chiều cao — CC (cm)</label>
                      <input type="number" placeholder="165" step="0.1"
                        value={vitalsData.height}
                        onChange={(e) => setVitalsData({...vitalsData, height: e.target.value})} />
                    </div>
                  </div>

                  {/* BMI tự động */}
                  {vitalsData.weight && vitalsData.height && (
                    <div className="dmrp-bmi-auto">
                      BMI tự tính: <strong>
                        {(parseFloat(vitalsData.weight) / Math.pow(parseFloat(vitalsData.height) / 100, 2)).toFixed(1)}
                      </strong> kg/m²
                    </div>
                  )}

                  <div className="dmrp-form-group">
                    <label>SpO2 (%)</label>
                    <input type="number" placeholder="98" min="0" max="100"
                      value={vitalsData.spo2}
                      onChange={(e) => setVitalsData({...vitalsData, spo2: e.target.value})} />
                    <span className="dmrp-form-hint">Đo bằng máy pulse oximeter</span>
                  </div>

                  {/* TIỀN SỬ & DỊ ỨNG */}
                  <div className="dmrp-form-section-title">📋 Tiền sử & Dị ứng</div>

                  <div className="dmrp-form-group">
                    <label>Tiền sử bệnh</label>
                    <textarea placeholder="Bệnh mãn tính (tiểu đường, tăng huyết áp, hen suyễn...), phẫu thuật trước đây, thuốc đang uống..."
                      value={vitalsData.medical_history || ''}
                      onChange={(e) => setVitalsData({...vitalsData, medical_history: e.target.value})}
                      rows="3" />
                  </div>

                  <div className="dmrp-form-group">
                    <label>Dị ứng</label>
                    <input type="text" placeholder="Thuốc, thức ăn, hóa chất..."
                      value={vitalsData.allergy || ''}
                      onChange={(e) => setVitalsData({...vitalsData, allergy: e.target.value})} />
                  </div>

                  {/* THÔNG TIN ĐO */}
                  <div className="dmrp-form-section-title">🕐 Thông tin đo</div>

                  <div className="dmrp-form-row">
                    <div className="dmrp-form-group">
                      <label>Thời gian đo</label>
                      <input type="datetime-local"
                        value={vitalsData.measured_at || new Date().toISOString().slice(0,16)}
                        onChange={(e) => setVitalsData({...vitalsData, measured_at: e.target.value})} />
                    </div>
                    <div className="dmrp-form-group">
                      <label>Người thực hiện</label>
                      <input type="text" placeholder="Tên điều dưỡng"
                        value={vitalsData.measured_by || user?.full_name || ''}
                        onChange={(e) => setVitalsData({...vitalsData, measured_by: e.target.value})} />
                    </div>
                  </div>

                  <div className="dmrp-form-group">
                    <label>Ghi chú lâm sàng</label>
                    <textarea placeholder="Bệnh nhân khàn tiếng, ho, sốt nhẹ, dấu hiệu bất thường..."
                      value={vitalsData.clinical_note}
                      onChange={(e) => setVitalsData({...vitalsData, clinical_note: e.target.value})}
                      rows="3" />
                  </div>
                </div>
              )}

              {/* === TAB 2: KẾT QUẢ KHÁM === */}
              {vitalsTab === 'result' && (
                <div className="dmrp-modal-body dmrp-result-readonly">
                  {viewRecordLoading ? (
                    <div className="dmrp-loading"><FaSpinner className="dmrp-spin" /><span>Đang tải hồ sơ...</span></div>
                  ) : !viewRecordData && !selectedAppointment.MedicalRecord ? (
                    <div className="dmrp-empty"><FaExclamationTriangle /><p>Chưa có hồ sơ y tế cho lịch hẹn này.</p></div>
                  ) : (() => {
                    // Ưu tiên dùng data đầy đủ từ API, fallback về data trong appointment
                    const rec = viewRecordData || selectedAppointment.MedicalRecord;
                    const vitals = rec.vitals_json || {};
                    const bmi = (vitals.weight && vitals.height)
                      ? (parseFloat(vitals.weight) / Math.pow(parseFloat(vitals.height) / 100, 2)).toFixed(1)
                      : null;
                    return (
                      <>
                        {/* Thông tin bệnh nhân */}
                        <div className="dmrp-result-section">
                          <h4>👤 Thông tin bệnh nhân</h4>
                          <div className="dmrp-result-grid">
                            <div className="dmrp-result-item">
                              <span className="dmrp-result-label">Họ tên:</span>
                              <span className="dmrp-result-value">{getPatientName(selectedAppointment)}</span>
                            </div>
                            <div className="dmrp-result-item">
                              <span className="dmrp-result-label">Mã lịch hẹn:</span>
                              <span className="dmrp-result-value">{selectedAppointment.code}</span>
                            </div>
                            {selectedAppointment.queue_number && (
                              <div className="dmrp-result-item">
                                <span className="dmrp-result-label">STT khám:</span>
                                <span className="dmrp-result-value dmrp-stt">#{selectedAppointment.queue_number}</span>
                              </div>
                            )}
                            <div className="dmrp-result-item">
                              <span className="dmrp-result-label">Dịch vụ:</span>
                              <span className="dmrp-result-value">{selectedAppointment.Service?.name || 'N/A'}</span>
                            </div>
                            {(selectedAppointment.Patient?.User?.phone || selectedAppointment.guest_phone) && (
                              <div className="dmrp-result-item">
                                <span className="dmrp-result-label">SĐT:</span>
                                <span className="dmrp-result-value">{selectedAppointment.Patient?.User?.phone || selectedAppointment.guest_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chỉ số sinh tồn */}
                        <div className="dmrp-result-section">
                          <h4>🩺 Chỉ số sinh tồn</h4>
                          {Object.keys(vitals).length === 0 ? (
                            <p className="dmrp-empty-text">Chưa đo chỉ số sinh tồn</p>
                          ) : (
                            <div className="dmrp-result-grid">
                              {vitals.blood_pressure && <div className="dmrp-result-item"><span className="dmrp-result-label">Huyết áp:</span><span className="dmrp-result-value">{vitals.blood_pressure} mmHg</span></div>}
                              {vitals.heart_rate && <div className="dmrp-result-item"><span className="dmrp-result-label">Nhịp tim:</span><span className="dmrp-result-value">{vitals.heart_rate} lần/phút</span></div>}
                              {vitals.respiratory_rate && <div className="dmrp-result-item"><span className="dmrp-result-label">Nhịp thở:</span><span className="dmrp-result-value">{vitals.respiratory_rate} lần/phút</span></div>}
                              {vitals.temperature && <div className="dmrp-result-item"><span className="dmrp-result-label">Nhiệt độ:</span><span className="dmrp-result-value">{vitals.temperature}°C</span></div>}
                              {vitals.weight && <div className="dmrp-result-item"><span className="dmrp-result-label">Cân nặng:</span><span className="dmrp-result-value">{vitals.weight} kg</span></div>}
                              {vitals.height && <div className="dmrp-result-item"><span className="dmrp-result-label">Chiều cao:</span><span className="dmrp-result-value">{vitals.height} cm</span></div>}
                              {bmi && <div className="dmrp-result-item"><span className="dmrp-result-label">BMI:</span><span className="dmrp-result-value">{bmi} kg/m²</span></div>}
                              {vitals.spo2 && <div className="dmrp-result-item"><span className="dmrp-result-label">SpO2:</span><span className="dmrp-result-value">{vitals.spo2}%</span></div>}
                              {vitals.measured_by && <div className="dmrp-result-item"><span className="dmrp-result-label">Người đo:</span><span className="dmrp-result-value">{vitals.measured_by}</span></div>}
                              {vitals.measured_at && <div className="dmrp-result-item dmrp-result-item-full"><span className="dmrp-result-label">Thời gian đo:</span><span className="dmrp-result-value">{new Date(vitals.measured_at).toLocaleString('vi-VN')}</span></div>}
                            </div>
                          )}
                        </div>

                        {/* Ghi chú lâm sàng (staff nhập) */}
                        {rec.clinical_note && (
                          <div className="dmrp-result-section">
                            <h4>📋 Ghi chú lâm sàng (điều dưỡng)</h4>
                            <p className="dmrp-result-note">{rec.clinical_note}</p>
                          </div>
                        )}

                        {/* Kết quả khám bác sĩ — chỉ hiện nếu record_stage = completed */}
                        {rec.record_stage === 'completed' || rec.diagnosis ? (
                          <>
                            <div className="dmrp-result-section dmrp-doctor-section">
                              <h4>👨‍⚕️ Kết quả khám (Bác sĩ)</h4>
                              {rec.diagnosis && <div className="dmrp-result-item dmrp-result-item-full"><span className="dmrp-result-label">Chẩn đoán:</span><span className="dmrp-result-value">{rec.diagnosis}</span></div>}
                              {rec.symptoms && <div className="dmrp-result-item dmrp-result-item-full"><span className="dmrp-result-label">Triệu chứng:</span><span className="dmrp-result-value">{rec.symptoms}</span></div>}
                              {rec.treatment_plan && <div className="dmrp-result-item dmrp-result-item-full"><span className="dmrp-result-label">Hướng điều trị:</span><span className="dmrp-result-value">{rec.treatment_plan}</span></div>}
                              {rec.advice && <div className="dmrp-result-item dmrp-result-item-full"><span className="dmrp-result-label">Lời khuyên:</span><span className="dmrp-result-value">{rec.advice}</span></div>}
                              {rec.follow_up_date && <div className="dmrp-result-item"><span className="dmrp-result-label">Ngày tái khám:</span><span className="dmrp-result-value">{new Date(rec.follow_up_date).toLocaleDateString('vi-VN')}</span></div>}
                            </div>
                            {rec.prescription_json?.length > 0 && (
                              <div className="dmrp-result-section">
                                <h4><FaPills /> Đơn thuốc</h4>
                                <div className="dmrp-rx-list">
                                  {rec.prescription_json.map((drug, i) => (
                                    <div key={i} className="dmrp-rx-item">
                                      <span className="dmrp-rx-name">{drug.name || drug.medicine_name}</span>
                                      {drug.dosage && <span className="dmrp-rx-detail">{drug.dosage}</span>}
                                      {drug.frequency && <span className="dmrp-rx-detail">{drug.frequency}</span>}
                                      {drug.duration && <span className="dmrp-rx-detail">{drug.duration}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="dmrp-result-section dmrp-doctor-section dmrp-pending-doctor">
                            <h4>👨‍⚕️ Kết quả khám (Bác sĩ)</h4>
                            <p className="dmrp-empty-text">⏳ Bác sĩ chưa nhập kết quả khám</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="dmrp-modal-footer">
                {vitalsTab === 'input' && isStaff && (
                  <>
                    <button 
                      className="dmrp-btn dmrp-btn-secondary"
                      onClick={() => setShowVitalsModal(false)}
                    >
                      Hủy
                    </button>
                    <button 
                      className="dmrp-btn dmrp-btn-primary"
                      onClick={handleSaveVitals}
                      disabled={vitalsLoading}
                    >
                      {vitalsLoading ? <FaSpinner className="dmrp-spin" /> : '💾'} Lưu Vitals
                    </button>
                  </>
                )}
                {vitalsTab === 'result' && (
                  <button 
                    className="dmrp-btn dmrp-btn-secondary"
                    onClick={() => setShowVitalsModal(false)}
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* === KẾT THÚC MODAL === */}
      </div>
    </div>
  );
};

export default DoctorMedicalRecordsPage;
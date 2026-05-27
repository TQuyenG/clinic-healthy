// client/src/pages/MyMedicalRecordsPage.js
// FILE MỚI - Trang "Hồ sơ y tế của tôi" (Cho Patient)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import medicalRecordService from '../services/medicalRecordService';
import PasswordConfirmModal from '../components/auth/PasswordConfirmModal';

// Import CSS
import './MyMedicalRecordsPage.css';

// Import Icons
import {
  FaFileMedicalAlt,
  FaSpinner,
  FaArrowRight,
  FaUserMd,
  FaCalendarAlt,
  FaHashtag,
  FaExclamationTriangle,
  FaShieldAlt,
  FaCheckCircle,
  FaNotesMedical,
  FaArrowLeft,
  FaClipboardList,
  FaUser
} from 'react-icons/fa';

const MyMedicalRecordsPage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // State tabs, search, filter
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'health'
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [recordType, setRecordType] = useState('offline'); // 'offline' | 'online' | 'all'

  // State cho modal bảo mật
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  useEffect(() => {
    const loadMyRecords = async () => {
      try {
        setLoading(true);
        // 1. Gọi API chúng ta vừa tạo trong service
        const response = await medicalRecordService.getMyMedicalRecords();

        if (response.data.success) {
          setRecords(response.data.data);
        } else {
          toast.error(response.data.message || 'Không thể tải hồ sơ');
        }
      } catch (error) {
        console.error('Error loading medical records:', error);
        toast.error(error.response?.data?.message || 'Lỗi khi tải hồ sơ y tế');
      } finally {
        setLoading(false);
      }
    };

    loadMyRecords();
  }, []);

  // 2. Mở modal khi nhấn "Xem chi tiết" - cả 2 loại đều yêu cầu mật khẩu
  const handleViewClick = (recordId) => {
      setSelectedRecordId(recordId);
      setShowPasswordModal(true);
  };

  // 3. Xử lý khi mật khẩu được xác nhận thành công
  const handlePasswordConfirm = () => {
      setShowPasswordModal(false);
      if (selectedRecordId) {
        if (String(selectedRecordId).startsWith('consultation_')) {
          const consultationId = String(selectedRecordId).replace('consultation_', '');
          navigate(`/ket-qua-tu-van/${consultationId}`);
        } else {
          navigate(`/ket-qua-kham/${selectedRecordId}`);
        }
      }
      setSelectedRecordId(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="MyMedicalRecordsPage-container">
        <div className="MyMedicalRecordsPage-loading-container">
          <FaSpinner className="MyMedicalRecordsPage-spin-icon" />
          <span>Đang tải hồ sơ y tế của bạn...</span>
        </div>
      </div>
    );
  }

  // Lọc records theo search
  const filteredRecords = records.filter(record => {
    const keyword = searchText.toLowerCase();
    const code = (record.Appointment?.code || '').toLowerCase();
    const doctor = (record.Doctor?.user?.full_name || '').toLowerCase();
    const matchSearch = !keyword || code.includes(keyword) || doctor.includes(keyword);
    const recType = record.record_type || record.Appointment?.appointment_type || 'offline';
    const matchType = recordType === 'all' ? true : recType === recordType;
    return matchSearch && matchType;
  });

  const offlineCount = records.filter(r => (r.record_type || r.Appointment?.appointment_type || 'offline') === 'offline').length;
  const onlineCount = records.filter(r => (r.record_type || r.Appointment?.appointment_type || 'offline') === 'online').length;

  return (
    <>
      {/* ── STICKY HEADER (đồng bộ với MedicalRecordViewPage) ── */}
      <header className="MyMedicalRecordsPage-header">
        <div className="MyMedicalRecordsPage-header-top">
          <button className="MyMedicalRecordsPage-btn-back" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Quay lại
          </button>

          <div className="MyMedicalRecordsPage-brand">
            <div className="MyMedicalRecordsPage-brand-logo">
              <FaNotesMedical />
            </div>
            <span className="MyMedicalRecordsPage-brand-name">Hồ Sơ Y Tế</span>
          </div>

          {records.length > 0 && (
            <span className="MyMedicalRecordsPage-count-badge">
              <FaCheckCircle />
              {records.length} hồ sơ
            </span>
          )}
        </div>

        {/* ---- TABS ---- */}
        <nav className="MyMedicalRecordsPage-tabs">
          <button
            className={`MyMedicalRecordsPage-tab${activeTab === 'records' ? ' MyMedicalRecordsPage-tab--active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            <FaClipboardList /> Hồ sơ khám bệnh
          </button>
          <button
            className={`MyMedicalRecordsPage-tab${activeTab === 'health' ? ' MyMedicalRecordsPage-tab--active' : ''}`}
            onClick={() => navigate('/ho-so-y-te?tab=health-profile')}
          >
            <FaUser /> Sức khỏe cá nhân
          </button>
        </nav>
      </header>

      <div className="MyMedicalRecordsPage-container">
        <div className="MyMedicalRecordsPage-wrapper">

          {/* ---- TAB: HỒ SƠ KHÁM BỆNH ---- */}
          {activeTab === 'records' && (
            <>
              {/* Search + Filter */}
              <div className="MyMedicalRecordsPage-toolbar">
                <div className="MyMedicalRecordsPage-search-wrap">
                  <FaHashtag className="MyMedicalRecordsPage-search-icon" />
                  <input
                    type="text"
                    className="MyMedicalRecordsPage-search-input"
                    placeholder="Tìm theo mã lịch hẹn, bác sĩ..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>
                <select
                  className="MyMedicalRecordsPage-filter-select"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="completed">Đã hoàn thành</option>
                </select>
              </div>

              <div className="MyMedicalRecordsPage-type-tabs">
                <button
                  className={`MyMedicalRecordsPage-type-tab ${recordType === 'offline' ? 'active' : ''}`}
                  onClick={() => setRecordType('offline')}
                >
                  Hồ sơ khám tại viện ({offlineCount})
                </button>
                <button
                  className={`MyMedicalRecordsPage-type-tab ${recordType === 'online' ? 'active' : ''}`}
                  onClick={() => setRecordType('online')}
                >
                  Hồ sơ tư vấn online ({onlineCount})
                </button>
                <button
                  className={`MyMedicalRecordsPage-type-tab ${recordType === 'all' ? 'active' : ''}`}
                  onClick={() => setRecordType('all')}
                >
                  Tất cả ({records.length})
                </button>
              </div>

              {/* Kết quả lọc */}
              {searchText && (
                <p className="MyMedicalRecordsPage-result-count">
                  Tìm thấy <strong>{filteredRecords.length}</strong> kết quả
                </p>
              )}

              {/* Danh sách hồ sơ */}
              <div className="MyMedicalRecordsPage-records-list">
                {filteredRecords.length === 0 ? (
                  <div className="MyMedicalRecordsPage-empty-state">
                    <div className="MyMedicalRecordsPage-empty-icon">
                      <FaExclamationTriangle />
                    </div>
                    <h3>Không tìm thấy hồ sơ</h3>
                    <p>
                      {searchText
                        ? 'Không có hồ sơ nào khớp với từ khóa tìm kiếm.'
                        : 'Bạn chưa có bất kỳ hồ sơ khám bệnh nào được lưu trữ.'}
                    </p>
                  </div>
                ) : (
                  filteredRecords.map(record => (
                    <div key={record.id} className="MyMedicalRecordsPage-record-card">
                      <div className="MyMedicalRecordsPage-card-header">
                        <div className="MyMedicalRecordsPage-card-code">
                          <FaHashtag />
                          {record.Appointment?.code || 'N/A'}
                        </div>
                        <div className="MyMedicalRecordsPage-card-header-right">
                          <div className={`MyMedicalRecordsPage-type-badge ${record.record_type === 'online' ? 'online' : 'offline'}`}>
                            {record.record_type === 'online' ? 'Tư vấn online' : 'Khám tại viện'}
                          </div>
                          <div className="MyMedicalRecordsPage-card-status">
                          <span className="MyMedicalRecordsPage-card-status-dot" />
                          Đã hoàn thành
                          </div>
                        </div>
                      </div>
                      <div className="MyMedicalRecordsPage-card-body">
                        <div className="MyMedicalRecordsPage-info-item">
                          <FaCalendarAlt />
                          <span className="MyMedicalRecordsPage-info-label">Ngày khám:</span>
                          <span className="MyMedicalRecordsPage-info-value">
                            {formatDate(record.Appointment?.appointment_date || record.created_at)}
                          </span>
                        </div>
                        <div className="MyMedicalRecordsPage-info-item">
                          <FaUserMd />
                          <span className="MyMedicalRecordsPage-info-label">Bác sĩ:</span>
                          <span className="MyMedicalRecordsPage-info-value MyMedicalRecordsPage-doctor-name">
                            {record.Doctor?.user?.full_name || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="MyMedicalRecordsPage-card-footer">
                        {record.record_type === 'online' ? (
                          <span className="MyMedicalRecordsPage-security-note">
                            <FaCheckCircle />
                            Kết quả tư vấn online
                          </span>
                        ) : (
                          <span className="MyMedicalRecordsPage-security-note">
                            <FaShieldAlt />
                            Cần xác thực để xem
                          </span>
                        )}
                        <button
                          className="MyMedicalRecordsPage-btn-view"
                          onClick={() => handleViewClick(record.id)}
                        >
                          {record.record_type === 'online' ? <FaFileMedicalAlt /> : <FaShieldAlt />}
                          Xem chi tiết
                          <FaArrowRight />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ---- TAB: SỨC KHỎE CÁ NHÂN ---- */}
          {activeTab === 'health' && null}

        </div>
      </div>

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
      />
    </>
  );
 
};

export default MyMedicalRecordsPage;
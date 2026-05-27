// client/src/pages/SharedHealthProfilePage.js
// Trang xem hồ sơ sức khỏe chia sẻ cho bác sĩ / admin / staff

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaInfoCircle, FaNotesMedical, FaUserMd, FaWeight, FaRuler, FaTint, FaPhone, FaHistory, FaHeartbeat, FaCalculator } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import appointmentService from '../services/appointmentService';
import './HealthProfilePage.css';

const SharedHealthProfilePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await appointmentService.getAppointmentByCode(code);
        if (!res?.data?.success) {
          toast.error('Không tìm thấy lịch hẹn');
          navigate(-1);
          return;
        }
        setAppointment(res.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể tải hồ sơ công khai');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code, navigate]);

  const sharedHistory = useMemo(() => {
    const raw = appointment?.Patient?.medical_history;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (error) { return null; }
    }
    return raw;
  }, [appointment]);

  const bmi = useMemo(() => {
    const height = parseFloat(sharedHistory?.height);
    const weight = parseFloat(sharedHistory?.weight);
    if (!height || !weight) return null;
    const heightM = height / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  }, [sharedHistory]);

  if (loading) {
    return (
      <div className="HealthProfilePage-loading">
        <div className="HealthProfilePage-spinner" />
        <p>Đang tải hồ sơ chia sẻ...</p>
      </div>
    );
  }

  if (!sharedHistory?.share_with_doctors) {
    return (
      <div className="HealthProfilePage-page">
        <div className="HealthProfilePage-header">
          <button className="HealthProfilePage-btn-back" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Quay lại
          </button>
          <div className="HealthProfilePage-header-content">
            <h1><FaInfoCircle /> Hồ sơ chưa được chia sẻ</h1>
            <p className="HealthProfilePage-subtitle">Bệnh nhân chưa bật chia sẻ hồ sơ sức khỏe cho bác sĩ đang khám.</p>
          </div>
        </div>
      </div>
    );
  }

  const infoRows = [
    { label: 'Chiều cao', value: sharedHistory?.height ? `${sharedHistory.height} cm` : '--', icon: FaRuler },
    { label: 'Cân nặng', value: sharedHistory?.weight ? `${sharedHistory.weight} kg` : '--', icon: FaWeight },
    { label: 'Nhóm máu', value: sharedHistory?.blood_type || '--', icon: FaTint },
    { label: 'Liên hệ khẩn cấp', value: sharedHistory?.emergency_contact || '--', icon: FaPhone },
  ];

  return (
    <div className="HealthProfilePage-page">
      <div className="HealthProfilePage-header">
        <button className="HealthProfilePage-btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Quay lại
        </button>
        <div className="HealthProfilePage-header-content">
          <h1><FaNotesMedical /> Hồ sơ sức khỏe chia sẻ</h1>
          <p className="HealthProfilePage-subtitle">
            Dùng cho bác sĩ đang khám để xem nhanh các chỉ số y tế cơ bản và tiền sử liên quan.
          </p>
        </div>
        <div className="HealthProfilePage-completion-badge HealthProfilePage-complete">Đang công khai</div>
      </div>

      <div className="HealthProfilePage-completion-card">
        <div className="HealthProfilePage-completion-header">
          <h3>Thông tin hồ sơ</h3>
          <span className="HealthProfilePage-completion-badge HealthProfilePage-complete">Cho bác sĩ</span>
        </div>
        <div className="HealthProfilePage-section-content" style={{ padding: 0 }}>
          <div><strong>Người bệnh:</strong> {appointment?.Patient?.user?.full_name || appointment?.guest_name || '--'}</div>
          <div><strong>Bác sĩ điều trị:</strong> {appointment?.Doctor?.user?.full_name || '--'}</div>
          <div><strong>Người xem:</strong> {user?.full_name || user?.email || '--'}</div>
        </div>
      </div>

      <div className="HealthProfilePage-section">
        <div className="HealthProfilePage-section-header">
          <h2><FaUserMd /> Chỉ số cơ bản</h2>
        </div>
        <div className="HealthProfilePage-section-content">
          <div className="HealthProfilePage-form-row">
            {infoRows.map((item) => {
              const Icon = item.icon;
              return (
                <div className="HealthProfilePage-form-group" key={item.label}>
                  <label><Icon /> {item.label}</label>
                  <input type="text" value={item.value} readOnly />
                </div>
              );
            })}
          </div>
          {bmi && (
            <div className="HealthProfilePage-bmi-display">
              <div className="HealthProfilePage-bmi-icon"><FaCalculator /></div>
              <div className="HealthProfilePage-bmi-info">
                <div className="HealthProfilePage-bmi-label">Chỉ số BMI</div>
                <div className="HealthProfilePage-bmi-value">{bmi}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="HealthProfilePage-section">
        <div className="HealthProfilePage-section-header">
          <h2><FaHistory /> Tiền sử y tế</h2>
        </div>
        <div className="HealthProfilePage-section-content">
          <div className="HealthProfilePage-form-group HealthProfilePage-full">
            <label><FaHeartbeat /> Dị ứng</label>
            <textarea rows="2" value={sharedHistory?.allergies || '--'} readOnly />
          </div>
          <div className="HealthProfilePage-form-group HealthProfilePage-full">
            <label><FaHeartbeat /> Bệnh lý nền / mạn tính</label>
            <textarea rows="2" value={sharedHistory?.chronic_diseases || '--'} readOnly />
          </div>
          <div className="HealthProfilePage-form-group HealthProfilePage-full">
            <label><FaNotesMedical /> Thuốc đang dùng</label>
            <textarea rows="2" value={sharedHistory?.current_medications || '--'} readOnly />
          </div>
          <div className="HealthProfilePage-form-group HealthProfilePage-full">
            <label><FaNotesMedical /> Lịch sử tiêm chủng</label>
            <textarea rows="2" value={sharedHistory?.vaccination_history || '--'} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedHealthProfilePage;

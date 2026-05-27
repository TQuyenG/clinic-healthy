// client/src/pages/HealthProfilePage.js
// Trang Hồ sơ sức khỏe cá nhân của bệnh nhân

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import {
  FaUserMd, FaWeight, FaRuler, FaTint, FaIdCard, FaAllergies,
  FaHeartbeat, FaPhone, FaSave, FaEdit, FaCheckCircle, FaExclamationTriangle,
  FaArrowLeft, FaCalculator, FaHistory, FaNotesMedical, FaInfoCircle,
  FaToggleOn, FaToggleOff, FaTimes
} from 'react-icons/fa';
import './HealthProfilePage.css';

const HealthProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileStatus, setProfileStatus] = useState({
    complete: false,
    completionRate: 0,
    missingFields: []
  });
  const [showShareConfirmModal, setShowShareConfirmModal] = useState(false);
  const [pendingShareValue, setPendingShareValue] = useState(false);
  const [shareToggleLoading, setShareToggleLoading] = useState(false);

  const [healthData, setHealthData] = useState({
    height: '',
    weight: '',
    blood_type: '',
    health_insurance: '',
    allergies: '',
    chronic_diseases: '',
    emergency_contact: '',
    family_history: '',
    current_medications: '',
    vaccination_history: '',
    smoking_status: 'no',
    alcohol_consumption: 'no',
    exercise_frequency: 'rarely',
    share_with_doctors: false
  });

  const [bmi, setBmi] = useState(null);

  useEffect(() => {
    loadHealthProfile();
  }, []);

  useEffect(() => {
    calculateBMI();
  }, [healthData.height, healthData.weight]);

  const loadHealthProfile = async () => {
    setLoading(true);
    try {
      const res = await userService.getMyRoleInfo();
      if (res.data.success) {
        const { missing_profile, missing_fields, roleData } = res.data.user;

        if (roleData?.medical_history) {
          const medHistory = typeof roleData.medical_history === 'string'
            ? JSON.parse(roleData.medical_history)
            : roleData.medical_history;
          setHealthData(prev => ({ ...prev, ...medHistory }));
        }

        const totalFields = Object.keys(healthData).length;
        const filledFields = Object.values(healthData).filter(v => v && v.toString().trim() !== '').length;
        const rate = Math.round((filledFields / totalFields) * 100);

        setProfileStatus({
          complete: !missing_profile,
          completionRate: rate,
          missingFields: missing_fields || []
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Không thể tải hồ sơ sức khỏe');
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    const h = parseFloat(healthData.height);
    const w = parseFloat(healthData.weight);
    if (h > 0 && w > 0) {
      const heightInMeters = h / 100;
      const bmiValue = (w / (heightInMeters * heightInMeters)).toFixed(1);
      setBmi(bmiValue);
    } else {
      setBmi(null);
    }
  };

  const getBMIStatus = () => {
    if (!bmi) return null;
    const value = parseFloat(bmi);
    if (value < 18.5) return { label: 'Thiếu cân', color: '#fbbf24', icon: FaExclamationTriangle };
    if (value < 25)   return { label: 'Bình thường', color: '#22c55e', icon: FaCheckCircle };
    if (value < 30)   return { label: 'Thừa cân', color: '#f97316', icon: FaExclamationTriangle };
    return { label: 'Béo phì', color: '#ef4444', icon: FaExclamationTriangle };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await userService.updatePatientHealthInfo(healthData);
      if (res.data.success) {
        toast.success('Cập nhật hồ sơ sức khỏe thành công!');
        setEditing(false);
        loadHealthProfile();
      }
    } catch (error) {
      toast.error('Lỗi cập nhật hồ sơ');
    }
  };

  const handleInputChange = (field, value) => {
    setHealthData(prev => ({ ...prev, [field]: value }));
  };

  const openShareConfirmModal = (nextValue) => {
    setPendingShareValue(nextValue);
    setShowShareConfirmModal(true);
  };

  const confirmShareToggle = async () => {
    try {
      setShareToggleLoading(true);
      const payload = { ...healthData, share_with_doctors: pendingShareValue };
      const res = await userService.updatePatientHealthInfo(payload);
      if (res.data.success) {
        toast.success(pendingShareValue ? 'Đã bật chia sẻ công khai cho bác sĩ' : 'Đã tắt chia sẻ công khai');
        setShowShareConfirmModal(false);
        setEditing(false);
        await loadHealthProfile();
      }
    } catch (error) {
      console.error('Toggle share profile error:', error);
      toast.error('Không thể cập nhật trạng thái chia sẻ');
    } finally {
      setShareToggleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="HealthProfilePage-loading">
        <div className="HealthProfilePage-spinner"></div>
        <p>Đang tải hồ sơ...</p>
      </div>
    );
  }

  const bmiStatus = getBMIStatus();

  return (
    <div className="HealthProfilePage-page">

      {/* Header */}
      <div className="HealthProfilePage-header">
        <button className="HealthProfilePage-btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Quay lại
        </button>
        <div className="HealthProfilePage-header-content">
          <h1><FaNotesMedical /> Hồ sơ sức khỏe cá nhân</h1>
          <p className="HealthProfilePage-subtitle">Thông tin y tế giúp bác sĩ tư vấn và điều trị hiệu quả hơn</p>
        </div>
        {!editing && (
          <button className="HealthProfilePage-btn-edit" onClick={() => setEditing(true)}>
            <FaEdit /> Chỉnh sửa
          </button>
        )}
      </div>

      {/* Completion Status */}
      <div className="HealthProfilePage-completion-card">
        <div className="HealthProfilePage-completion-header">
          <h3>Độ hoàn thiện hồ sơ</h3>
          <span className={`HealthProfilePage-completion-badge ${profileStatus.complete ? 'HealthProfilePage-complete' : 'HealthProfilePage-incomplete'}`}>
            {profileStatus.completionRate}%
          </span>
        </div>
        <div className="HealthProfilePage-completion-bar">
          <div
            className="HealthProfilePage-completion-fill"
            style={{ width: `${profileStatus.completionRate}%` }}
          ></div>
        </div>
        {profileStatus.missingFields.length > 0 && (
          <p className="HealthProfilePage-missing-fields-note">
            <FaInfoCircle /> Còn thiếu: {profileStatus.missingFields.join(', ')}
          </p>
        )}
      </div>

      <div className="HealthProfilePage-section" style={{ marginTop: '1rem' }}>
        <div className="HealthProfilePage-section-header">
          <h2><FaInfoCircle /> Chia sẻ hồ sơ cho bác sĩ</h2>
        </div>
        <div className="HealthProfilePage-section-content">
          <div className="HealthProfilePage-form-group HealthProfilePage-full">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Cho phép bác sĩ đang khám xem hồ sơ sức khỏe của tôi</div>
                <small style={{ color: '#6b7280', display: 'block', marginTop: '0.35rem' }}>
                  Khi bật, bác sĩ có thể xem nhanh các chỉ số cơ bản và tiền sử bệnh để hỗ trợ chẩn đoán.
                </small>
              </div>
              <button
                type="button"
                className="HealthProfilePage-btn-save"
                onClick={() => openShareConfirmModal(!healthData.share_with_doctors)}
                disabled={shareToggleLoading}
                style={{ minWidth: '240px' }}
              >
                {healthData.share_with_doctors ? <FaToggleOff /> : <FaToggleOn />}
                {healthData.share_with_doctors ? 'Tắt chia sẻ công khai' : 'Bật chia sẻ công khai'}
              </button>
            </div>
          </div>
          {healthData.share_with_doctors && (
            <div className="HealthProfilePage-completion-card" style={{ marginTop: '0.75rem', borderColor: '#22c55e' }}>
              <div className="HealthProfilePage-completion-header">
                <h3>Trạng thái chia sẻ</h3>
                <span className="HealthProfilePage-completion-badge HealthProfilePage-complete">Đang công khai</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Thông tin cơ bản */}
        <div className="HealthProfilePage-section">
          <div className="HealthProfilePage-section-header">
            <h2><FaUserMd /> Thông tin cơ bản</h2>
          </div>
          <div className="HealthProfilePage-section-content">
            <div className="HealthProfilePage-form-row">
              <div className="HealthProfilePage-form-group">
                <label><FaRuler /> Chiều cao (cm) <span className="HealthProfilePage-required">*</span></label>
                <input
                  type="number"
                  value={healthData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder="VD: 170"
                  disabled={!editing}
                  required
                />
              </div>
              <div className="HealthProfilePage-form-group">
                <label><FaWeight /> Cân nặng (kg) <span className="HealthProfilePage-required">*</span></label>
                <input
                  type="number"
                  value={healthData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="VD: 65"
                  disabled={!editing}
                  required
                />
              </div>
              <div className="HealthProfilePage-form-group">
                <label><FaTint /> Nhóm máu</label>
                <select
                  value={healthData.blood_type}
                  onChange={(e) => handleInputChange('blood_type', e.target.value)}
                  disabled={!editing}
                >
                  <option value="">-- Chọn --</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
            </div>

            {/* BMI Display */}
            {bmi && bmiStatus && (
              <div className="HealthProfilePage-bmi-display" style={{ borderColor: bmiStatus.color }}>
                <div className="HealthProfilePage-bmi-icon" style={{ color: bmiStatus.color }}>
                  <FaCalculator />
                </div>
                <div className="HealthProfilePage-bmi-info">
                  <div className="HealthProfilePage-bmi-label">Chỉ số BMI</div>
                  <div className="HealthProfilePage-bmi-value" style={{ color: bmiStatus.color }}>{bmi}</div>
                </div>
                <div className="HealthProfilePage-bmi-status" style={{ color: bmiStatus.color }}>
                  <bmiStatus.icon />
                  <span>{bmiStatus.label}</span>
                </div>
              </div>
            )}

            <div className="HealthProfilePage-form-row">
              <div className="HealthProfilePage-form-group HealthProfilePage-full">
                <label><FaIdCard /> Số thẻ BHYT</label>
                <input
                  type="text"
                  value={healthData.health_insurance}
                  onChange={(e) => handleInputChange('health_insurance', e.target.value)}
                  placeholder="VD: SV1234567890..."
                  disabled={!editing}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tiền sử bệnh */}
        <div className="HealthProfilePage-section">
          <div className="HealthProfilePage-section-header">
            <h2><FaHistory /> Tiền sử bệnh lý</h2>
          </div>
          <div className="HealthProfilePage-section-content">

            {/* Dị ứng - highlight vàng cảnh báo */}
            <div className="HealthProfilePage-form-group HealthProfilePage-full HealthProfilePage-highlight">
              <label><FaAllergies /> Tiền sử dị ứng</label>
              <textarea
                rows="2"
                value={healthData.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                placeholder="VD: Dị ứng penicillin, hải sản..."
                disabled={!editing}
              />
            </div>

            {/* Bệnh lý nền - highlight vàng cảnh báo */}
            <div className="HealthProfilePage-form-group HealthProfilePage-full HealthProfilePage-highlight">
              <label><FaHeartbeat /> Bệnh lý nền / Mạn tính</label>
              <textarea
                rows="2"
                value={healthData.chronic_diseases}
                onChange={(e) => handleInputChange('chronic_diseases', e.target.value)}
                placeholder="VD: Tiểu đường type 2, cao huyết áp..."
                disabled={!editing}
              />
            </div>

            <div className="HealthProfilePage-form-group HealthProfilePage-full">
              <label><FaNotesMedical /> Tiền sử gia đình</label>
              <textarea
                rows="2"
                value={healthData.family_history}
                onChange={(e) => handleInputChange('family_history', e.target.value)}
                placeholder="VD: Gia đình có người bị ung thư, tim mạch..."
                disabled={!editing}
              />
            </div>

            <div className="HealthProfilePage-form-group HealthProfilePage-full">
              <label><FaNotesMedical /> Thuốc đang dùng</label>
              <textarea
                rows="2"
                value={healthData.current_medications}
                onChange={(e) => handleInputChange('current_medications', e.target.value)}
                placeholder="VD: Metformin 500mg (2 lần/ngày)..."
                disabled={!editing}
              />
            </div>

            <div className="HealthProfilePage-form-group HealthProfilePage-full">
              <label><FaNotesMedical /> Lịch sử tiêm chủng</label>
              <textarea
                rows="2"
                value={healthData.vaccination_history}
                onChange={(e) => handleInputChange('vaccination_history', e.target.value)}
                placeholder="VD: Đã tiêm COVID-19 (3 mũi), cúm (hàng năm)..."
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        {/* Lối sống */}
        <div className="HealthProfilePage-section">
          <div className="HealthProfilePage-section-header">
            <h2><FaHeartbeat /> Thói quen sinh hoạt</h2>
          </div>
          <div className="HealthProfilePage-section-content">
            <div className="HealthProfilePage-form-row">
              <div className="HealthProfilePage-form-group">
                <label>Tình trạng hút thuốc</label>
                <select
                  value={healthData.smoking_status}
                  onChange={(e) => handleInputChange('smoking_status', e.target.value)}
                  disabled={!editing}
                >
                  <option value="no">Không hút</option>
                  <option value="former">Đã bỏ</option>
                  <option value="occasional">Thỉnh thoảng</option>
                  <option value="regular">Thường xuyên</option>
                </select>
              </div>
              <div className="HealthProfilePage-form-group">
                <label>Uống rượu/bia</label>
                <select
                  value={healthData.alcohol_consumption}
                  onChange={(e) => handleInputChange('alcohol_consumption', e.target.value)}
                  disabled={!editing}
                >
                  <option value="no">Không uống</option>
                  <option value="occasional">Thỉnh thoảng</option>
                  <option value="moderate">Vừa phải</option>
                  <option value="frequent">Thường xuyên</option>
                </select>
              </div>
              <div className="HealthProfilePage-form-group">
                <label>Tần suất tập luyện</label>
                <select
                  value={healthData.exercise_frequency}
                  onChange={(e) => handleInputChange('exercise_frequency', e.target.value)}
                  disabled={!editing}
                >
                  <option value="rarely">Hiếm khi</option>
                  <option value="1-2">1-2 lần/tuần</option>
                  <option value="3-4">3-4 lần/tuần</option>
                  <option value="daily">Hàng ngày</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Liên hệ khẩn cấp */}
        <div className="HealthProfilePage-section">
          <div className="HealthProfilePage-section-header">
            <h2><FaPhone /> Liên hệ khẩn cấp</h2>
          </div>
          <div className="HealthProfilePage-section-content">
            {/* Emergency contact - highlight đỏ */}
            <div className="HealthProfilePage-form-group HealthProfilePage-full HealthProfilePage-emergency">
              <label><FaPhone /> Người thân (Họ tên - SĐT)</label>
              <input
                type="text"
                value={healthData.emergency_contact}
                onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                placeholder="VD: Nguyễn Văn A - 0912345678"
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        {editing && (
          <div className="HealthProfilePage-actions">
            <button type="button" className="HealthProfilePage-btn-cancel" onClick={() => {
              setEditing(false);
              loadHealthProfile();
            }}>
              Hủy
            </button>
            <button type="submit" className="HealthProfilePage-btn-save">
              <FaSave /> Lưu hồ sơ
            </button>
          </div>
        )}
      </form>

      {showShareConfirmModal && (
        <div className="HealthProfilePage-modal-overlay" onClick={() => !shareToggleLoading && setShowShareConfirmModal(false)}>
          <div className="HealthProfilePage-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="HealthProfilePage-modal-header">
              <h3>
                {pendingShareValue ? 'Bật chia sẻ công khai' : 'Tắt chia sẻ công khai'}
              </h3>
              <button type="button" className="HealthProfilePage-modal-close" onClick={() => setShowShareConfirmModal(false)} disabled={shareToggleLoading}>
                <FaTimes />
              </button>
            </div>
            <div className="HealthProfilePage-modal-body">
              <p>
                {pendingShareValue
                  ? 'Bác sĩ đang khám sẽ có thể xem hồ sơ sức khỏe của bạn. Hãy đảm bảo các thông tin đã cập nhật là chính xác.'
                  : 'Bác sĩ sẽ không còn nhìn thấy hồ sơ sức khỏe công khai của bạn từ các trang khám bệnh.'}
              </p>
            </div>
            <div className="HealthProfilePage-modal-actions">
              <button type="button" className="HealthProfilePage-btn-cancel" onClick={() => setShowShareConfirmModal(false)} disabled={shareToggleLoading}>
                Hủy
              </button>
              <button type="button" className="HealthProfilePage-btn-save" onClick={confirmShareToggle} disabled={shareToggleLoading}>
                {shareToggleLoading ? 'Đang cập nhật...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthProfilePage;
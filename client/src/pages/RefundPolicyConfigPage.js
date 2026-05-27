// client/src/pages/RefundPolicyConfigPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import systemService from '../services/systemService';
import { 
  FaSave, FaPlus, FaTrash, FaShieldAlt, 
  FaUserMd, FaLaptopMedical, FaCog, FaHospital
} from 'react-icons/fa';
import './RefundPolicyConfigPage.css'; // Import file CSS mới

const RefundPolicyConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [policy, setPolicy] = useState({
    enable_refund: true,
    min_cancel_hours: 6,
    processing_time_text: '3-5 ngày làm việc',
    consultation: { booking_fee: 0, rules: [] },
    appointment: { booking_fee: 0, rules: [] },
    system_fault: {
      doctor_cancel_refund: 100,
      tech_issue_refund: 100,
      auto_compensate: false
    }
  });

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const data = await systemService.getRefundPolicy();
      setPolicy(prev => ({
        ...prev,
        ...data,
        consultation: { ...prev.consultation, ...(data.consultation || {}) },
        appointment: { ...prev.appointment, ...(data.appointment || {}) },
        system_fault: { ...prev.system_fault, ...(data.system_fault || {}) }
      }));
    } catch (error) {
      toast.error('Lỗi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await systemService.updateRefundPolicy(policy);
      toast.success('Đã lưu cấu hình chính sách!');
    } catch (error) {
      toast.error('Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (type, index, field, value) => {
    const newRules = [...policy[type].rules];
    newRules[index][field] = Number(value);
    setPolicy({ ...policy, [type]: { ...policy[type], rules: newRules } });
  };
  const addRule = (type) => {
    setPolicy({ ...policy, [type]: { ...policy[type], rules: [...policy[type].rules, { hours_before: 0, refund_percent: 0 }] } });
  };
  const removeRule = (type, index) => {
    const newRules = policy[type].rules.filter((_, i) => i !== index);
    setPolicy({ ...policy, [type]: { ...policy[type], rules: newRules } });
  };

  // --- RENDER SECTIONS ---

  // 1. Phần Lỗi Hệ Thống (Guarantee) - Giao diện thân thiện
  const renderSystemFaultSection = () => (
    <div className="refund-policy-config-card">
      <div className="refund-policy-config-card-header" style={{ color: '#1d4ed8' }}>
        <FaShieldAlt /> Cam Kết Bảo Vệ Quyền Lợi Khách Hàng
      </div>
      <div className="refund-policy-config-card-body">
        <div className="refund-policy-config-guarantee-box">
          <div className="refund-policy-config-guarantee-title">
            Các trường hợp hoàn tiền 100% (Không trừ phí)
          </div>
          <div className="refund-policy-config-guarantee-grid">
            {/* Box 1 */}
            <div className="refund-policy-config-guarantee-item">
              <div className="refund-policy-config-guarantee-label">
                <FaUserMd className="text-success"/> Bác sĩ / Admin hủy lịch
              </div>
              <div className="refund-policy-config-guarantee-desc">
                Do bác sĩ bận đột xuất hoặc phòng khám thay đổi lịch.
              </div>
              <div className="refund-policy-config-input-group">
                <span className="refund-policy-config-rule-text me-2">Hoàn lại:</span>
                <input type="text" className="refund-policy-config-input-small" value="100" disabled />
                <span className="refund-policy-config-rule-text ms-1">% + Phí giữ chỗ</span>
              </div>
            </div>

            {/* Box 2 */}
            <div className="refund-policy-config-guarantee-item">
              <div className="refund-policy-config-guarantee-label">
                <FaLaptopMedical className="text-danger"/> Sự cố Kỹ thuật
              </div>
              <div className="refund-policy-config-guarantee-desc">
                Lỗi kết nối, Video call không hoạt động, Bác sĩ vắng mặt.
              </div>
              <div className="refund-policy-config-input-group">
                <span className="refund-policy-config-rule-text me-2">Hoàn lại:</span>
                <input type="text" className="refund-policy-config-input-small" value="100" disabled />
                <span className="refund-policy-config-rule-text ms-1">% + Phí giữ chỗ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. Phần Khách Hàng Hủy (Logic cũ) - Giao diện nhỏ gọn
  const renderPatientFaultSection = (title, type, icon) => (
    <div className="refund-policy-config-card">
      <div className="refund-policy-config-card-header">
        {icon} {title} (Khách hàng hủy)
      </div>
      <div className="refund-policy-config-card-body">
        {/* Booking Fee */}
        <div className="refund-policy-config-booking-fee">
          <label className="refund-policy-config-label">Phí giữ chỗ cố định (Không hoàn)</label>
          <div className="refund-policy-config-input-group">
            <input 
              type="number" 
              className="refund-policy-config-input-text has-addon" 
              style={{width: '120px'}}
              value={policy[type].booking_fee}
              onChange={(e) => setPolicy({...policy, [type]: {...policy[type], booking_fee: Number(e.target.value)}})}
            />
            <span className="refund-policy-config-addon">VNĐ</span>
          </div>
        </div>

        {/* Rules */}
        <label className="refund-policy-config-label">Mốc thời gian hủy & Tỷ lệ hoàn</label>
        {policy[type].rules.map((rule, index) => (
          <div key={index} className="refund-policy-config-rule-row">
            <span className="refund-policy-config-rule-text">Trước</span>
            <input 
              type="number" className="refund-policy-config-input-small"
              value={rule.hours_before}
              onChange={(e) => updateRule(type, index, 'hours_before', e.target.value)}
            />
            <span className="refund-policy-config-rule-text">giờ, hoàn</span>
            <input 
              type="number" className="refund-policy-config-input-small"
              style={{color: '#059669'}}
              value={rule.refund_percent}
              onChange={(e) => updateRule(type, index, 'refund_percent', e.target.value)}
            />
            <span className="refund-policy-config-rule-text">%</span>
            <button className="refund-policy-config-btn-trash" onClick={() => removeRule(type, index)}>
              <FaTrash />
            </button>
          </div>
        ))}
        <button className="refund-policy-config-btn-add" onClick={() => addRule(type)}>
          <FaPlus style={{fontSize: '0.7rem', marginRight: '4px'}}/> Thêm mốc thời gian
        </button>
      </div>
    </div>
  );

  if (loading) return <div className="p-4 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="refund-policy-config-wrapper">
      {/* Header */}
      <div className="refund-policy-config-header">
        <div className="refund-policy-config-title">
          <FaCog /> Cấu Hình Chính Sách Hoàn Tiền
        </div>
        <button 
          className="refund-policy-config-btn-save" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : <><FaSave /> Lưu Cấu Hình</>}
        </button>
      </div>
      
      {/* Cấu hình chung */}
      <div className="refund-policy-config-card">
        <div className="refund-policy-config-card-body">
          <div className="refund-policy-config-general-row">
            <div className="refund-policy-config-toggle-wrapper">
               <label className="refund-policy-config-switch">
                  <input 
                    type="checkbox" 
                    checked={policy.enable_refund}
                    onChange={(e) => setPolicy({...policy, enable_refund: e.target.checked})}
                  />
                  <span className="refund-policy-config-slider"></span>
               </label>
               <span style={{fontWeight: 600}}>Kích hoạt hoàn tiền tự động</span>
            </div>
            
            <div className="refund-policy-config-input-group" style={{ margin: '0 15px' }}>
              <span className="refund-policy-config-rule-text me-2">Cho phép khách hủy trước:</span>
              <input 
                type="number" 
                className="refund-policy-config-input-small" 
                value={policy.min_cancel_hours !== undefined ? policy.min_cancel_hours : 6}
                onChange={(e) => setPolicy({...policy, min_cancel_hours: Number(e.target.value)})}
              />
              <span className="refund-policy-config-rule-text ms-1">giờ</span>
            </div>

            <div className="refund-policy-config-input-group">
              <span className="refund-policy-config-rule-text me-2">TG xử lý hiển thị:</span>
              <input 
                type="text" 
                className="refund-policy-config-input-text" 
                value={policy.processing_time_text}
                onChange={(e) => setPolicy({...policy, processing_time_text: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cam kết hệ thống */}
      {renderSystemFaultSection()}

      {/* Cấu hình chi tiết 2 cột */}
      <div className="refund-policy-config-grid">
        {renderPatientFaultSection('Lịch Khám Tại Viện', 'appointment', <FaHospital />)}
        {renderPatientFaultSection('Tư Vấn Trực Tuyến', 'consultation', <FaLaptopMedical />)}
      </div>
    </div>
  );
};

export default RefundPolicyConfigPage;
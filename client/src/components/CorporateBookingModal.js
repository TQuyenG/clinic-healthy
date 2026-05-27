// client/src/components/CorporateBookingModal.js
// Modal để đăng ký nhân viên vào corporate booking window

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaSpinner, FaCheckCircle } from 'react-icons/fa';
import corporateService from '../services/corporateService';
import '../styles/CorporateBookingModal.css';

const CorporateBookingModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Nhập mã, 2: Chọn slot, 3: Điền info, 4: Xác nhận
  const [windowCode, setWindowCode] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [corporateWindow, setCorporateWindow] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // 🔍 Tìm window bằng mã
  const handleSearchWindow = async () => {
    if (!windowCode.trim()) {
      toast.warning('Vui lòng nhập mã doanh nghiệp');
      return;
    }

    try {
      setSearchLoading(true);
      console.log('[CorporateBookingModal] 🔍 Tìm window:', windowCode);
      
      const response = await corporateService.getWindowByCode(windowCode);
      if (response.data.success) {
        setCorporateWindow(response.data.data);
        setStep(2);
        console.log('[CorporateBookingModal] ✅ Tìm thấy window:', response.data.data);
      }
    } catch (error) {
      console.error('[CorporateBookingModal] ❌ Lỗi:', error.message);
      toast.error(error.response?.data?.message || 'Không tìm thấy corporate window');
    } finally {
      setSearchLoading(false);
    }
  };

  // ✏️ Cập nhật form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    console.log(`[CorporateBookingModal] 📝 ${name} = ${value}`);
  };

  // 📝 Tiếp tục sang bước 3 (điền info)
  const handleSelectSlot = () => {
    if (!formData.date || !formData.time) {
      toast.warning('Vui lòng chọn ngày và giờ');
      return;
    }
    console.log('[CorporateBookingModal] ➡️ Di sang bước 3 (điền info)');
    setStep(3);
  };

  // ✅ Đăng ký
  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.warning('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setSubmitting(true);
      console.log('[CorporateBookingModal] 📤 Gửi đăng ký:', formData);

      const response = await corporateService.registerToWindow(windowCode, formData);
      
      if (response.data.success) {
        console.log('[CorporateBookingModal] ✅ Đăng ký thành công');
        toast.success('Đăng ký thành công! Vui lòng tiếp tục thanh toán.');
        setStep(4);
        
        // Callback để cha component xử lý (ví dụ: tạo appointment tự động)
        if (onSuccess) {
          onSuccess({
            corp_window: corporateWindow.window_id,
            corp_code: corporateWindow.corp_code,
            participant: formData
          });
        }
      }
    } catch (error) {
      console.error('[CorporateBookingModal] ❌ Lỗi đăng ký:', error.message);
      toast.error(error.response?.data?.message || 'Lỗi khi đăng ký');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="corp-booking-modal-overlay" onClick={onClose}>
      <div className="corp-booking-modal" onClick={e => e.stopPropagation()}>
        <div className="corp-booking-modal-header">
          <h3>Đăng ký khám sức khỏe doanh nghiệp</h3>
          <button className="corp-booking-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="corp-booking-modal-body">
          {/* 🔍 BƯỚC 1: Nhập mã doanh nghiệp */}
          {step === 1 && (
            <div className="corp-booking-step">
              <h4>Bước 1: Nhập mã doanh nghiệp</h4>
              <p>Vui lòng nhập mã hoặc link được cung cấp bởi doanh nghiệp của bạn</p>
              <div className="corp-booking-form-group">
                <input
                  type="text"
                  placeholder="Ví dụ: CW-2026-05-COMPANY001"
                  value={windowCode}
                  onChange={e => setWindowCode(e.target.value)}
                  className="corp-booking-input"
                  disabled={searchLoading}
                />
              </div>
              <button
                onClick={handleSearchWindow}
                disabled={searchLoading || !windowCode.trim()}
                className="corp-booking-btn corp-booking-btn-primary"
              >
                {searchLoading ? <><FaSpinner className="fa-spin" /> Đang tìm...</> : 'Tìm kiếm'}
              </button>
            </div>
          )}

          {/* 📅 BƯỚC 2: Chọn ngày/giờ */}
          {step === 2 && corporateWindow && (
            <div className="corp-booking-step">
              <h4>Bước 2: Chọn ngày và giờ khám</h4>
              <p className="corp-booking-text">
                🏢 {corporateWindow.service_info?.name} | Còn {corporateWindow.available_slots} chỗ
              </p>

              <div className="corp-booking-form-group">
                <label>Ngày khám *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  min={corporateWindow.start_date}
                  max={corporateWindow.end_date}
                  className="corp-booking-input"
                />
                <small>Khoảng: {corporateWindow.start_date} đến {corporateWindow.end_date}</small>
              </div>

              <div className="corp-booking-form-group">
                <label>Giờ khám *</label>
                <select
                  name="time"
                  value={formData.time}
                  onChange={handleFormChange}
                  className="corp-booking-input"
                >
                  <option value="">-- Chọn giờ --</option>
                  {corporateWindow.time_slots && corporateWindow.time_slots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSelectSlot}
                className="corp-booking-btn corp-booking-btn-primary"
              >
                Tiếp tục
              </button>
              <button
                onClick={() => { setStep(1); setCorporateWindow(null); }}
                className="corp-booking-btn corp-booking-btn-secondary"
              >
                Quay lại
              </button>
            </div>
          )}

          {/* 👤 BƯỚC 3: Điền thông tin */}
          {step === 3 && (
            <div className="corp-booking-step">
              <h4>Bước 3: Thông tin cá nhân</h4>

              <div className="corp-booking-form-group">
                <label>Họ tên *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="corp-booking-input"
                />
              </div>

              <div className="corp-booking-form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="corp-booking-input"
                />
              </div>

              <div className="corp-booking-form-group">
                <label>Số điện thoại *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="0912345678"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="corp-booking-input"
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={submitting}
                className="corp-booking-btn corp-booking-btn-primary"
              >
                {submitting ? <><FaSpinner className="fa-spin" /> Đang xử lý...</> : 'Xác nhận đăng ký'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="corp-booking-btn corp-booking-btn-secondary"
              >
                Quay lại
              </button>
            </div>
          )}

          {/* ✅ BƯỚC 4: Thành công */}
          {step === 4 && (
            <div className="corp-booking-step corp-booking-success">
              <FaCheckCircle className="corp-booking-success-icon" />
              <h4>Đăng ký thành công!</h4>
              <p>Thông tin của bạn đã được ghi nhận. Bạn sẽ nhận được email xác nhận và hướng dẫn thanh toán.</p>
              <button
                onClick={onClose}
                className="corp-booking-btn corp-booking-btn-primary"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorporateBookingModal;

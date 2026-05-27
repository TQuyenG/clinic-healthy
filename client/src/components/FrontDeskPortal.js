// client/src/components/FrontDeskPortal.js
// ===== COMPONENT: Giao Diện Lễ Tân (Front Desk Portal) =====
// Chức năng:
// 1. Check-in bệnh nhân (Tự động cấp STT U/N)
// 2. Xử lý late arrival (Tước priority nếu cần)
// 3. Ưu tiên khám (nếu chờ quá 30p)
// 4. Đổi bác sĩ trong tình huống khẩn cấp

import React, { useState, useEffect } from 'react';
import appointmentService from '../services/appointmentService';
import './FrontDeskPortal.css';

/**
 * Props:
 * - date: Ngày hiện tại (yyyy-mm-dd)
 * - onAppointmentCheckIn: callback sau check-in thành công
 */
const FrontDeskPortal = ({ date = null, onAppointmentCheckIn }) => {
  const [activeTab, setActiveTab] = useState('check-in'); // check-in | late-arrival | prioritize | urgent
  const [appointmentCode, setAppointmentCode] = useState('');
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isLate, setIsLate] = useState(false);
  const [overrideQueue, setOverrideQueue] = useState(false);
  const [error, setError] = useState(null);

  const currentDate = date || new Date().toISOString().split('T')[0];

  /**
   * TAB 1: Check-in bệnh nhân
   * - Quẹt mã QR hoặc nhập mã hẹn
   * - Tự động phát hiện late arrival
   * - Cấp STT với logic xen kẽ 2U+1N
   */
  const handleCheckIn = async (e) => {
    e?.preventDefault();
    if (!appointmentCode.trim()) {
      setError('Vui lòng nhập mã appointment');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      console.log(`[LOG FrontDeskPortal] Check-in: ${appointmentCode}`);

      const response = await appointmentService.checkInAppointment(appointmentCode, {
        is_late: isLate,
        override_queue: overrideQueue
      });

      console.log('[DEBUG] Check-in response:', response.data);

      if (response.data.success) {
        setMessage({
          type: 'success',
          title: '✅ Check-in Thành Công!',
          text: `Số thứ tự: ${response.data.data.queue_number}`,
          details: response.data.data.late_arrival
            ? `⚠️ Late arrival: ${response.data.data.late_minutes} phút`
            : ''
        });

        onAppointmentCheckIn?.(response.data.data);

        // Reset form
        setAppointmentCode('');
        setIsLate(false);
        setOverrideQueue(false);
      }
    } catch (err) {
      console.error('[ERROR FrontDeskPortal] Check-in error:', err);
      setError(err.response?.data?.message || 'Lỗi check-in');
    } finally {
      setLoading(false);
    }
  };

  /**
   * TAB 2: Ưu tiên khám (bệnh nhân chờ > 30p)
   */
  const handlePrioritizeNow = async (e) => {
    e?.preventDefault();
    if (!appointmentCode.trim()) {
      setError('Vui lòng nhập mã appointment');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      console.log(`[LOG FrontDeskPortal] Prioritize: ${appointmentCode}`);

      const response = await appointmentService.prioritizeNow(appointmentCode);

      if (response.data.success) {
        setMessage({
          type: 'success',
          title: '🚀 Ưu Tiên Khám Thành Công!',
          text: `Bệnh nhân được xếp để khám ngay`,
          details: `Thời gian chờ: ${response.data.data.wait_time} phút`
        });

        setAppointmentCode('');
      }
    } catch (err) {
      console.error('[ERROR FrontDeskPortal] Prioritize error:', err);
      setError(err.response?.data?.message || 'Lỗi ưu tiên');
    } finally {
      setLoading(false);
    }
  };

  /**
   * TAB 3: Bác sĩ xin nghỉ gấp - Chuyển bệnh nhân (future implementation)
   */
  const handleUrgentLeave = async (e) => {
    e?.preventDefault();
    console.log('[LOG] FEATURE COMING: Handle urgent doctor leave');
    setMessage({
      type: 'info',
      title: '⏳ Tính năng sắp có',
      text: 'Chuyển bệnh nhân khi bác sĩ xin nghỉ gấp'
    });
  };

  return (
    <div className="front-desk-portal">
      <div className="portal-header">
        <h2>🏥 Giao Diện Lễ Tân</h2>
        <p>Ngày: {new Date(currentDate).toLocaleDateString('vi-VN')}</p>
      </div>

      {/* Tabs */}
      <div className="portal-tabs">
        <button
          className={`tab-button ${activeTab === 'check-in' ? 'active' : ''}`}
          onClick={() => setActiveTab('check-in')}
        >
          📱 Check-in
        </button>
        <button
          className={`tab-button ${activeTab === 'prioritize' ? 'active' : ''}`}
          onClick={() => setActiveTab('prioritize')}
        >
          🚀 Ưu Tiên Khám
        </button>
        <button
          className={`tab-button ${activeTab === 'urgent' ? 'active' : ''}`}
          onClick={() => setActiveTab('urgent')}
        >
          ⚠️ Khẩn Cấp
        </button>
      </div>

      {/* Content */}
      <div className="portal-content">
        {/* TAB: CHECK-IN */}
        {activeTab === 'check-in' && (
          <div className="tab-pane active">
            <h3>📋 Check-in Bệnh Nhân</h3>
            <p className="tab-description">
              Quẹt mã QR trên phiếu hẹn hoặc nhập mã appointment. Hệ thống tự động cấp số.
            </p>

            <form onSubmit={handleCheckIn} className="form-group">
              <div className="form-field">
                <label>Mã Appointment / Mã QR:</label>
                <input
                  type="text"
                  placeholder="VD: AP-0105-2345 hoặc scan QR"
                  value={appointmentCode}
                  onChange={(e) => setAppointmentCode(e.target.value.toUpperCase())}
                  className="form-input"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="form-field checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isLate}
                    onChange={(e) => setIsLate(e.target.checked)}
                    disabled={loading}
                  />
                  ⏰ Bệnh nhân đến trễ
                </label>
              </div>

              {isLate && (
                <div className="form-field checkbox-group warning">
                  <label>
                    <input
                      type="checkbox"
                      checked={overrideQueue}
                      onChange={(e) => setOverrideQueue(e.target.checked)}
                      disabled={loading}
                    />
                    ⚠️ Ghi đè: Vẫn cấp số Ưu Tiên
                  </label>
                  <p className="hint">Bỏ qua nếu được phép bác sĩ/admin</p>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !appointmentCode.trim()}
              >
                {loading ? '⏳ Đang xử lý...' : '✓ Check-in'}
              </button>
            </form>

            {/* Thông báo late check-in */}
            <div className="info-box">
              <p>
                <strong>❓ Làm thế nào để phát hiện late arrival?</strong><br/>
                Nếu bệnh nhân đến sau {currentDate} 15 phút so với appointment_start_time, 
                hệ thống sẽ cảnh báo. Lễ tân có thể chọn tước priority hoặc ghi đè để cấp U.
              </p>
            </div>
          </div>
        )}

        {/* TAB: PRIORITIZE NOW */}
        {activeTab === 'prioritize' && (
          <div className="tab-pane active">
            <h3>🚀 Ưu Tiên Khám</h3>
            <p className="tab-description">
              Dùng khi bệnh nhân chờ quá 30 phút. Hệ thống sẽ xếp bệnh nhân lên ngay phía dưới bệnh nhân đang khám.
            </p>

            <form onSubmit={handlePrioritizeNow} className="form-group">
              <div className="form-field">
                <label>Mã Appointment:</label>
                <input
                  type="text"
                  placeholder="VD: AP-0105-2345"
                  value={appointmentCode}
                  onChange={(e) => setAppointmentCode(e.target.value.toUpperCase())}
                  className="form-input"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn-warning"
                disabled={loading || !appointmentCode.trim()}
              >
                {loading ? '⏳ Đang xử lý...' : '🚀 Ưu Tiên Khám Ngay'}
              </button>
            </form>

            <div className="info-box warning">
              <p>
                <strong>📌 Chỉ dùng khi:</strong><br/>
                • Bệnh nhân chờ quá 30 phút<br/>
                • Khác phòng đã rảnh (có bác sĩ sẵn sàng khám nhanh)<br/>
                • Bệnh nhân phàn nàn hoặc là case cấp cứu
              </p>
            </div>
          </div>
        )}

        {/* TAB: URGENT */}
        {activeTab === 'urgent' && (
          <div className="tab-pane active">
            <h3>⚠️ Xử Lý Tình Huống Khẩn Cấp</h3>

            <button onClick={handleUrgentLeave} className="btn btn-danger">
              🏥 Bác sĩ Xin Nghỉ Gấp? (Coming Soon)
            </button>

            <div className="info-box danger">
              <p>
                <strong>🆘 Các tình huống khẩn cấp:</strong><br/>
                • Bác sĩ đột ngột bệnh → Chuyển tất cả bệnh nhân sang bác sĩ khác<br/>
                • Bệnh nhân cấp cứu vừa đến → Ưu tiên tuyệt đối (bypass queue)<br/>
                • Phòng khám hỏng → Chuyển sang phòng dự phòng
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error">
          <strong>❌ Lỗi:</strong> {error}
          <button className="close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {message && (
        <div className={`alert alert-${message.type}`}>
          <strong>{message.title}</strong><br/>
          {message.text}
          {message.details && <div className="detail-text">{message.details}</div>}
          <button className="close-btn" onClick={() => setMessage(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default FrontDeskPortal;

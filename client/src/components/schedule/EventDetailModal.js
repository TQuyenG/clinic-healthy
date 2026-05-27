// client/src/components/schedule/EventDetailModal.js
import React from 'react';
import { FaTimes, FaCalendarAlt, FaClock, FaUserMd, FaUser, FaPhone, FaEnvelope, FaFileAlt, FaCheckCircle } from 'react-icons/fa';
import './EventDetailModal.css';

const EventDetailModal = ({ isOpen, event, eventType, onClose, onDetailClick }) => {
  if (!isOpen || !event) return null;

  const renderContent = () => {
    switch (eventType) {
      case 'appointment':
      case 'service':
        return (
          <>
            <div className="edm-section">
              <h3 className="edm-section-title">Thông tin lịch hẹn</h3>
              <div className="edm-info-row">
                <label>Mã lịch:</label>
                <span>{event.code || event.appointment_code || 'N/A'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaCalendarAlt /> Ngày:</label>
                <span>{event.appointment_date || event.date || 'N/A'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaClock /> Giờ:</label>
                <span>
                  {event.appointment_start_time || event.start_time || 'N/A'}
                  {event.appointment_end_time || event.end_time ? ` - ${event.appointment_end_time || event.end_time}` : ''}
                </span>
              </div>
              <div className="edm-info-row">
                <label>Dịch vụ:</label>
                <span>{event.Service?.name || event.service_name || 'Dịch vụ khám'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaUserMd /> Bác sĩ:</label>
                <span>{event.Doctor?.user?.full_name || event.doctor_name || 'N/A'}</span>
              </div>
            </div>

            <div className="edm-section">
              <h3 className="edm-section-title">Thông tin bệnh nhân</h3>
              <div className="edm-info-row">
                <label><FaUser /> Tên:</label>
                <span>{event.Patient?.user?.full_name || event.guest_name || 'Khách vãng lai'}</span>
              </div>
              {event.Patient?.user?.phone && (
                <div className="edm-info-row">
                  <label><FaPhone /> Điện thoại:</label>
                  <span>{event.Patient.user.phone}</span>
                </div>
              )}
              {event.Patient?.user?.email && (
                <div className="edm-info-row">
                  <label><FaEnvelope /> Email:</label>
                  <span>{event.Patient.user.email}</span>
                </div>
              )}
            </div>

            <div className="edm-section">
              <h3 className="edm-section-title">Trạng thái</h3>
              <div className="edm-info-row">
                <label><FaCheckCircle /> Tình trạng:</label>
                <span className={`edm-status edm-status-${event.status || 'pending'}`}>
                  {event.statusText || event.status || 'Chờ xác nhận'}
                </span>
              </div>
            </div>
          </>
        );

      case 'consultation':
        return (
          <>
            <div className="edm-section">
              <h3 className="edm-section-title">Thông tin tư vấn</h3>
              <div className="edm-info-row">
                <label>Mã tư vấn:</label>
                <span>{event.consultation_code || event.code || 'N/A'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaCalendarAlt /> Ngày:</label>
                <span>{event.date || 'N/A'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaClock /> Giờ:</label>
                <span>
                  {event.start_time || 'N/A'}
                  {event.end_time ? ` - ${event.end_time}` : ''}
                </span>
              </div>
              <div className="edm-info-row">
                <label>Loại tư vấn:</label>
                <span>{event.consultation_type === 'video' ? 'Video Call' : 'Chat'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaUserMd /> Bác sĩ:</label>
                <span>{event.doctor?.full_name || 'N/A'}</span>
              </div>
            </div>

            <div className="edm-section">
              <h3 className="edm-section-title">Thông tin bệnh nhân</h3>
              <div className="edm-info-row">
                <label><FaUser /> Tên:</label>
                <span>{event.patient?.full_name || 'N/A'}</span>
              </div>
              {event.patient?.phone && (
                <div className="edm-info-row">
                  <label><FaPhone /> Điện thoại:</label>
                  <span>{event.patient.phone}</span>
                </div>
              )}
            </div>

            <div className="edm-section">
              <h3 className="edm-section-title">Trạng thái</h3>
              <div className="edm-info-row">
                <label><FaCheckCircle /> Tình trạng:</label>
                <span className={`edm-status edm-status-${event.status || 'pending'}`}>
                  {event.status || 'Chờ xác nhận'}
                </span>
              </div>
            </div>
          </>
        );

      case 'leave':
        return (
          <>
            <div className="edm-section">
              <h3 className="edm-section-title">Thông tin lịch nghỉ</h3>
              <div className="edm-info-row">
                <label><FaCalendarAlt /> Từ ngày:</label>
                <span>{event.date_from || event.date || 'N/A'}</span>
              </div>
              {event.date_to && (
                <div className="edm-info-row">
                  <label><FaCalendarAlt /> Đến ngày:</label>
                  <span>{event.date_to}</span>
                </div>
              )}
              {event.time_from && (
                <div className="edm-info-row">
                  <label><FaClock /> Thời gian:</label>
                  <span>
                    {event.time_from}
                    {event.time_to ? ` - ${event.time_to}` : ''}
                  </span>
                </div>
              )}
              <div className="edm-info-row">
                <label><FaFileAlt /> Lý do:</label>
                <span>{event.reason || 'Không có ghi chú'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaCheckCircle /> Trạng thái:</label>
                <span className={`edm-status edm-status-${event.status || 'pending'}`}>
                  {event.status === 'approved' ? 'Đã duyệt' : event.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                </span>
              </div>
            </div>
          </>
        );

      case 'overtime':
        return (
          <>
            <div className="edm-section">
              <h3 className="edm-section-title">Thông tin tăng ca</h3>
              <div className="edm-info-row">
                <label><FaCalendarAlt /> Ngày:</label>
                <span>{event.date || 'N/A'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaClock /> Thời gian:</label>
                <span>
                  {event.start_time || 'N/A'}
                  {event.end_time ? ` - ${event.end_time}` : ''}
                </span>
              </div>
              <div className="edm-info-row">
                <label><FaFileAlt /> Ghi chú:</label>
                <span>{event.notes || 'Không có ghi chú'}</span>
              </div>
              <div className="edm-info-row">
                <label><FaCheckCircle /> Trạng thái:</label>
                <span className={`edm-status edm-status-${event.status || 'pending'}`}>
                  {event.status === 'approved' ? 'Đã duyệt' : event.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                </span>
              </div>
            </div>
          </>
        );

      default:
        return <div>Không có thông tin</div>;
    }
  };

  return (
    <div className="edm-overlay" onClick={onClose}>
      <div className="edm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edm-header">
          <h2 className="edm-title">Chi tiết {
            eventType === 'service' || eventType === 'appointment' ? 'lịch hẹn' :
            eventType === 'consultation' ? 'tư vấn' :
            eventType === 'leave' ? 'lịch nghỉ' :
            eventType === 'overtime' ? 'tăng ca' : 'sự kiện'
          }</h2>
          <button className="edm-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="edm-content">
          {renderContent()}
        </div>

        <div className="edm-footer">
          <button className="edm-btn-close" onClick={onClose}>Đóng</button>
          {onDetailClick && (
            <button className="edm-btn-detail" onClick={() => onDetailClick(event, eventType)}>
              Chi tiết
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;

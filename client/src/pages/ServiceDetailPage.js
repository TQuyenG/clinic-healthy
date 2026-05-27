// client/src/pages/ServiceDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import CorporateBookingModal from '../components/CorporateBookingModal';
import {
  FaTag,
  FaClock,
  FaUserMd,
  FaArrowLeft,
  FaInfoCircle,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaHospital,
  FaCheckCircle,
  FaStar,
  FaStethoscope,
  FaClipboardList,
  FaShieldAlt,
  FaHeartbeat,
  FaBriefcase
} from 'react-icons/fa';
import './ServiceDetailPage.css';

const ServiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCorporateModal, setShowCorporateModal] = useState(false);

  useEffect(() => {
    fetchServiceDetail();
  }, [id]);

  const fetchServiceDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/services/${id}`);
      if (response.data.success) {
        setService(response.data.data);
      } else {
        throw new Error(response.data.message || 'Không thể tải thông tin dịch vụ.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      toast.error(`Lỗi: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBookServiceWithType = (appointmentType) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.warning('Vui lòng đăng nhập để đặt lịch khám.');
      navigate('/login', { state: { from: '/dat-lich-tu-van' } });
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'patient') {
        toast.error('Chỉ bệnh nhân mới có thể đặt lịch khám.');
        return;
      }
      navigate('/dat-lich-tu-van', { state: {
        consultationType: appointmentType === 'online' ? 'video' : 'chat',
        returnTo: location.pathname + location.search,
        returnState: { serviceDetail: { id } }
      } });
    } catch {
      toast.error('Lỗi xác thực. Vui lòng đăng nhập lại.');
      navigate('/login');
    }
  };

  const doctors = service?.doctors || [];
  const singleDoctor = doctors.length === 1 ? doctors[0] : null;

  // ─── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="servicedetail-page">
        <div className="servicedetail-container">
          <div className="servicedetail-loading">
            <div className="servicedetail-spinner" />
            <p>Đang tải thông tin dịch vụ...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────
  if (error || !service) {
    return (
      <div className="servicedetail-page">
        <div className="servicedetail-container">
          <div className="servicedetail-error-container">
            <div className="servicedetail-error-icon"><FaInfoCircle /></div>
            <h2>{error ? 'Có lỗi xảy ra' : 'Không tìm thấy dịch vụ'}</h2>
            <p>{error || 'Dịch vụ này không tồn tại hoặc đã bị xóa.'}</p>
            <button className="servicedetail-btn-back-err" onClick={() => {
              const returnTo = location.state?.returnTo;
              const returnState = location.state?.returnState;
              if (returnTo) navigate(returnTo, { state: returnState }); else navigate('/dich-vu');
            }}>
              <FaArrowLeft /> Quay lại danh sách dịch vụ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────
  return (
    <div className="servicedetail-page">
      <div className="servicedetail-container">

        {/* Back button */}
        <button className="servicedetail-back-btn" onClick={() => {
          const returnTo = location.state?.returnTo;
          const returnState = location.state?.returnState;
          if (returnTo) navigate(returnTo, { state: returnState }); else navigate('/dich-vu');
        }}>
          <FaArrowLeft /> Quay lại danh sách dịch vụ
        </button>

        <div className="servicedetail-layout">

          {/* ══ LEFT: Main content ══════════════════════════════ */}
          <div className="servicedetail-main">

            {/* Hero card */}
            <div className="servicedetail-hero">
              <div className="servicedetail-image-wrap">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="servicedetail-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/900x400?text=Dịch+vụ+y+tế';
                    }}
                  />
                ) : (
                  <div className="servicedetail-image-placeholder">
                    <FaHospital />
                    <p>Chưa có hình ảnh</p>
                  </div>
                )}

                <span className={`servicedetail-status-badge ${service.status === 'active' ? 'active' : 'inactive'}`}>
                  <span className="servicedetail-status-dot" />
                  {service.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>

              <div className="servicedetail-hero-body">
                {service.category?.name && (
                  <span className="servicedetail-category-badge">
                    <FaTag /> {service.category.name}
                  </span>
                )}
                <h1 className="servicedetail-title">{service.name}</h1>
                {service.short_description && (
                  <p className="servicedetail-short-desc">{service.short_description}</p>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div className="servicedetail-stats-row">
              <div className="servicedetail-stat-card">
                <div className="servicedetail-stat-icon"><FaClock /></div>
                <div>
                  <p className="servicedetail-stat-label">Thời gian</p>
                  <p className="servicedetail-stat-value">{service.duration} phút</p>
                </div>
              </div>

              {service.category?.name && (
                <div className="servicedetail-stat-card">
                  <div className="servicedetail-stat-icon"><FaClipboardList /></div>
                  <div>
                    <p className="servicedetail-stat-label">Danh mục</p>
                    <p className="servicedetail-stat-value">{service.category.name}</p>
                  </div>
                </div>
              )}

              {service.specialty?.name && (
                <div className="servicedetail-stat-card">
                  <div className="servicedetail-stat-icon"><FaStethoscope /></div>
                  <div>
                    <p className="servicedetail-stat-label">Chuyên khoa</p>
                    <p className="servicedetail-stat-value">{service.specialty.name}</p>
                  </div>
                </div>
              )}

              {service.allow_doctor_choice && (
                <div className="servicedetail-stat-card">
                  <div className="servicedetail-stat-icon"><FaShieldAlt /></div>
                  <div>
                    <p className="servicedetail-stat-label">Tự chọn bác sĩ</p>
                    <p className="servicedetail-stat-value">Có hỗ trợ</p>
                  </div>
                </div>
              )}
            </div>

            {/* Doctor section */}
            {singleDoctor && (
              <div className="servicedetail-doctor-card">
                {singleDoctor.user?.avatar ? (
                  <img
                    src={singleDoctor.user.avatar}
                    alt={singleDoctor.user.full_name}
                    className="servicedetail-doctor-avatar"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="servicedetail-doctor-avatar-placeholder">
                    <FaUserMd />
                  </div>
                )}
                <div>
                  <p className="servicedetail-doctor-badge">Bác sĩ phụ trách</p>
                  <h3 className="servicedetail-doctor-name">
                    BS. {singleDoctor.user?.full_name || 'N/A'}
                  </h3>
                  {singleDoctor.specialty?.name && (
                    <p className="servicedetail-doctor-specialty">
                      Chuyên khoa: {singleDoctor.specialty.name}
                    </p>
                  )}
                  {singleDoctor.experience_years && (
                    <span className="servicedetail-doctor-exp">
                      <FaStar /> {singleDoctor.experience_years} năm kinh nghiệm
                    </span>
                  )}
                </div>
              </div>
            )}

            {doctors.length > 1 && (
              <div className="servicedetail-doctors-multi">
                <FaUserMd />
                <span>
                  Dịch vụ có <strong>{doctors.length} bác sĩ</strong> thực hiện — bạn có thể chọn bác sĩ khi đặt lịch.
                </span>
              </div>
            )}

            {/* Detailed content */}
            {service.detailed_content && (
              <div className="servicedetail-content-card">
                <div className="servicedetail-section-header">
                  <FaInfoCircle />
                  <h3>Thông tin chi tiết dịch vụ</h3>
                </div>
                <div
                  className="servicedetail-rich-content"
                  dangerouslySetInnerHTML={{ __html: service.detailed_content }}
                />
              </div>
            )}

            {/* Features */}
            <div className="servicedetail-content-card">
              <div className="servicedetail-section-header">
                <FaHeartbeat />
                <h3>Điểm nổi bật</h3>
              </div>
              <div className="servicedetail-features-grid">
                <div className="servicedetail-feature-item">
                  <FaCheckCircle />
                  Đội ngũ bác sĩ chuyên khoa giàu kinh nghiệm
                </div>
                <div className="servicedetail-feature-item">
                  <FaCheckCircle />
                  Trang thiết bị hiện đại, đạt tiêu chuẩn quốc tế
                </div>
                <div className="servicedetail-feature-item">
                  <FaCheckCircle />
                  Quy trình khám chữa bệnh chuyên nghiệp
                </div>
                <div className="servicedetail-feature-item">
                  <FaCheckCircle />
                  Hỗ trợ đặt lịch linh hoạt, thuận tiện
                </div>
                <div className="servicedetail-feature-item">
                  <FaCheckCircle />
                  Bảo mật thông tin bệnh nhân tuyệt đối
                </div>
                {service.allow_doctor_choice && (
                  <div className="servicedetail-feature-item">
                    <FaCheckCircle />
                    Tự do lựa chọn bác sĩ theo ý muốn
                  </div>
                )}
              </div>
            </div>

          </div>{/* end .servicedetail-main */}

          {/* ══ RIGHT: Sidebar ══════════════════════════════════ */}
          <div className="servicedetail-sidebar">
            <div className="servicedetail-booking-card">

              {/* Green header with price */}
              <div className="servicedetail-booking-header">
                <h3><FaCalendarAlt /> Đặt lịch khám</h3>
                <div className="servicedetail-price-block">
                  <p className="servicedetail-price-label">Giá dịch vụ</p>
                  <p className="servicedetail-price-value">
                    <FaMoneyBillWave />
                    {service.price?.toLocaleString('vi-VN')}
                    <span className="servicedetail-price-unit">VNĐ</span>
                  </p>
                </div>
              </div>

              {/* Detail rows */}
              <div className="servicedetail-booking-body">
                <div className="servicedetail-detail-row">
                  <span className="servicedetail-detail-label">
                    <FaClock /> Thời gian
                  </span>
                  <span className="servicedetail-detail-value">{service.duration} phút</span>
                </div>

                {service.category?.name && (
                  <div className="servicedetail-detail-row">
                    <span className="servicedetail-detail-label">
                      <FaTag /> Danh mục
                    </span>
                    <span className="servicedetail-detail-value">{service.category.name}</span>
                  </div>
                )}

                {singleDoctor && (
                  <div className="servicedetail-detail-row">
                    <span className="servicedetail-detail-label">
                      <FaUserMd /> Bác sĩ
                    </span>
                    <span className="servicedetail-detail-value">
                      BS. {singleDoctor.user?.full_name}
                    </span>
                  </div>
                )}

                {doctors.length > 1 && (
                  <div className="servicedetail-detail-row">
                    <span className="servicedetail-detail-label">
                      <FaUserMd /> Bác sĩ
                    </span>
                    <span className="servicedetail-detail-value">Chọn khi đặt lịch</span>
                  </div>
                )}

                <div className="servicedetail-detail-row">
                  <span className="servicedetail-detail-label">
                    <FaHospital /> Hình thức
                  </span>
                  <span className="servicedetail-detail-value">Trực tiếp / Online</span>
                </div>

                <button className="servicedetail-btn-book" onClick={() => handleBookServiceWithType('offline')}>
                  <FaCalendarAlt /> Đặt lịch ngay
                </button>
                <button className="servicedetail-btn-book servicedetail-btn-book-secondary" onClick={() => handleBookServiceWithType('online')}>
                  <FaClock /> Đặt lịch tư vấn online
                </button>

                {service.is_corp && (
                  <button 
                    className="servicedetail-btn-book servicedetail-btn-book-corporate"
                    onClick={() => setShowCorporateModal(true)}
                    title="Đặt lịch khám cho doanh nghiệp, trường học, hoặc sự kiện"
                  >
                    <FaBriefcase /> Đặt lịch - Công ty/Tổ chức
                  </button>
                )}

                <div className="servicedetail-note-box">
                  <FaInfoCircle />
                  <p>Vui lòng đăng nhập để đặt lịch. Bạn có thể chọn thời gian và bác sĩ phù hợp khi đặt lịch.</p>
                </div>
              </div>

            </div>
          </div>

        </div>{/* end .servicedetail-layout */}
      </div>

      {/* Corporate Booking Modal */}
      <CorporateBookingModal 
        isOpen={showCorporateModal}
        onClose={() => setShowCorporateModal(false)}
        onSuccess={(data) => {
          console.log('[ServiceDetailPage] Corporate booking success:', data);
          toast.success('Bạn sẽ được chuyển hướng để hoàn tất đặt lịch và thanh toán...');
          setTimeout(() => {
            setShowCorporateModal(false);
            // TODO: Tạo appointment tự động dựa trên corporate window data
            // Hoặc chuyển sang trang thanh toán
          }, 1500);
        }}
      />
    </div>
  );
};

export default ServiceDetailPage;
// client/src/pages/ConsultationHomePage.js
// - Màu sắc: Trắng + Xanh lá (#20bf6b)
// - Responsive: Laptop, iPad, Mobile
// - Giao diện thân thiện người dùng, tối ưu hóa bệnh nhân
// - Tên class CSS: consultation-home-page-*

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import consultationService from '../services/consultationService';
import { 
  FaComments, 
  FaVideo, 
  FaArrowRight,
  FaStar,
  FaUserMd,
  FaShieldAlt,
  FaBolt,
  FaWallet,
  FaClock,
  FaSearch,      
  FaCheckCircle,
  FaFilter,
  FaSort,
  FaCircle
} from 'react-icons/fa';
import './ConsultationHomePage.css';

const ConsultationHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [topRatedDoctors, setTopRatedDoctors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedConsultationType, setSelectedConsultationType] = useState('all');
  const [selectedRating, setSelectedRating] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [bannerSettings, setBannerSettings] = useState(null);
  const [methodsSettings, setMethodsSettings] = useState([]);
  const [whyChooseSettings, setWhyChooseSettings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      try {
        const doctorsResponse = await userService.getAllDoctorsPublic({
          limit: 12,
          is_online: true
        });
        console.log('Available doctors:', doctorsResponse.data);
        setAvailableDoctors(doctorsResponse.data.doctors || []);
      } catch (error) {
        console.error('Error fetching available doctors:', error);
        setAvailableDoctors([]);
      }

      try {
        const topDoctorsResponse = await userService.getAllDoctorsPublic({
          limit: 6,
          sort_by: 'rating',
          order: 'desc'
        });
        console.log('Top rated doctors:', topDoctorsResponse.data);
        setTopRatedDoctors(topDoctorsResponse.data.doctors || []);
      } catch (error) {
        console.error('Error fetching top rated doctors:', error);
        setTopRatedDoctors([]);
      }

      if (user) {
        try {
          if (user.role === 'patient') {
            const statsResponse = await consultationService.getPatientStats();
            setStats(statsResponse.data.stats);
          } else if (user.role === 'doctor') {
            const statsResponse = await consultationService.getDoctorStats();
            setStats(statsResponse.data.stats);
          }
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      }

      try {
        const systemService = require('../services/systemService').default;
        const systemSettings = await systemService.getConsultationSettings();
        setBannerSettings(systemSettings.data.banner);
        setMethodsSettings(systemSettings.data.methods);
        setWhyChooseSettings(systemSettings.data.whyChoose);
      } catch (error) {
        console.log('Using default settings');
        setDefaultSettings();
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setDefaultSettings();
    } finally {
      setLoading(false);
    }
  };

  const setDefaultSettings = () => {
    setBannerSettings({
      title: 'Tư Vấn Sức Khỏe Online',
      subtitle: 'Kết nối với bác sĩ chuyên khoa trong vài phút. Chat, video call - đơn giản và nhanh chóng!',
      badge_text: 'Nền Tảng Tư Vấn Y Tế #1',
      primary_color: '#20bf6b',
      secondary_color: '#199c56'
    });

    setMethodsSettings([
      {
        id: 'quick-chat',
        name: 'Chat Nhanh',
        subtitle: 'Tư vấn tức thì',
        description: 'Kết nối ngay với bác sĩ đang online, không cần đặt lịch trước',
        icon: 'bolt',
        color: '#667eea',
        price: 50000,
        duration: 15,
        enabled: true,
        badge: 'Nhanh nhất',
        features: [
          'Phản hồi trong 2 phút',
          'Không cần đặt lịch',
          'Phí từ 50K/15 phút',
          'Phù hợp vấn đề đơn giản'
        ]
      },
      {
        id: 'chat',
        name: 'Tư Vấn Chat Real-time',
        subtitle: 'Đặt lịch trước',
        description: 'Đặt lịch và tư vấn chi tiết với bác sĩ chuyên khoa qua chat',
        icon: 'comments',
        color: '#4facfe',
        price: 100000,
        duration: 30,
        enabled: true,
        badge: 'Phổ biến',
        features: [
          'Chọn bác sĩ và thời gian',
          'Tư vấn chi tiết 30 phút',
          'Gửi ảnh, file đính kèm',
          'Phí từ 100K/30 phút'
        ]
      },
      {
        id: 'video',
        name: 'Video Call',
        subtitle: 'Gặp mặt trực tiếp',
        description: 'Tư vấn trực tiếp qua video HD với bác sĩ chuyên khoa',
        icon: 'video',
        color: '#f093fb',
        price: 300000,
        duration: 30,
        enabled: true,
        badge: 'Chuyên sâu',
        features: [
          'Video HD 1-1 với bác sĩ',
          'Khám và tư vấn chi tiết',
          'Chia sẻ màn hình, hình ảnh',
          'Phí từ 300K/30 phút'
        ]
      }
    ]);

    setWhyChooseSettings([
      {
        id: 'professional',
        icon: 'usermd',
        title: 'Đội Ngũ Chuyên Nghiệp',
        description: 'Hơn 100+ bác sĩ có chứng chỉ hành nghề, kinh nghiệm lâu năm',
        color: '#20bf6b'
      },
      {
        id: 'fast',
        icon: 'bolt',
        title: 'Phản Hồi Nhanh',
        description: 'Kết nối với bác sĩ trong vài phút, tư vấn 24/7',
        color: '#20bf6b'
      },
      {
        id: 'secure',
        icon: 'shield',
        title: 'Bảo Mật Tuyệt Đối',
        description: 'Thông tin y tế được mã hóa và bảo vệ theo tiêu chuẩn quốc tế',
        color: '#20bf6b'
      },
      {
        id: 'affordable',
        icon: 'wallet',
        title: 'Chi Phí Hợp Lý',
        description: 'Giá cả minh bạch, đa dạng gói tư vấn phù hợp mọi túi tiền',
        color: '#20bf6b'
      }
    ]);
  };

  const handleConsultationType = (methodId) => {
    if (!user) {
      navigate('/login', { state: { from: '/dich-vu?tab=consultation' } });
      return;
    }
    navigate('/tu-van/chon-bac-si', { state: { consultationType: methodId } });
  };

  const handleQuickChat = () => {
    if (!user) {
      navigate('/login', { state: { from: '/dich-vu?tab=consultation' } });
      return;
    }
    if (window.openChatbot) {
      window.openChatbot();
    } else {
      setTimeout(() => {
        if (window.openChatbot) {
          window.openChatbot();
        }
      }, 500);
    }
  };

  const handleViewDoctorProfile = (doctor) => {
    // Route expects doctor code (slug). Try common fallbacks.
    const code = doctor?.code || doctor?.user_code || doctor?.doctor_code || doctor?.id || doctor?.User?.code || doctor?.User?.user_code;
    if (!code) {
      console.warn('No doctor code available for profile link, using id fallback');
    }
    navigate(`/bac-si/${code}`);
  };

  const handleBookConsultation = (doctorId, type) => {
    if (!user) {
      navigate('/login', { state: { from: '/dich-vu?tab=consultation' } });
      return;
    }
    navigate('/tu-van/dat-lich', { 
      state: { 
        doctorId, 
        consultationType: type 
      } 
    });
  };

  const getIcon = (iconName) => {
    switch(iconName) {
      case 'usermd':
        return <FaUserMd />;
      case 'bolt':
        return <FaBolt />;
      case 'shield':
        return <FaShieldAlt />;
      case 'wallet':
        return <FaWallet />;
      case 'comments':
        return <FaComments />;
      case 'video':
        return <FaVideo />;
      case 'clock':
        return <FaClock />;
      default:
        return <FaCheckCircle />;
    }
  };

  const filteredDoctors = availableDoctors.filter((doctor) => {
    let matchSearch = true;
    let matchType = true;
    let matchRating = true;
    let matchPrice = true;
    let matchAvailability = true;

    if (searchQuery) {
      matchSearch = doctor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (doctor.Doctor?.Specialty?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    }

    if (selectedRating) {
      const rating = doctor.Doctor?.avg_rating || 0;
      matchRating = rating >= parseInt(selectedRating);
    }

    if (selectedAvailability !== 'all') {
      matchAvailability = doctor.is_online === (selectedAvailability === 'online');
    }

    return matchSearch && matchType && matchRating && matchPrice && matchAvailability;
  });

  if (loading) {
    return (
      <div className="consultation-home-page">
        <div className="consultation-home-loading">
          <div className="consultation-home-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="consultation-home-page">
      <div className="consultation-home-container">
        {/* HERO BANNER */}
        <section className="consultation-home-banner">
          <div className="consultation-home-banner-content">
            <span className="consultation-home-banner-badge">
              {bannerSettings?.badge_text || '✨ Nền Tảng Tư Vấn Y Tế #1'}
            </span>
            <h1 className="consultation-home-banner-title">
              {bannerSettings?.title || 'Tư Vấn Sức Khỏe Online'}
            </h1>
            <p className="consultation-home-banner-subtitle">
              {bannerSettings?.subtitle || 'Kết nối với bác sĩ chuyên khoa trong vài phút. Chat, video call - đơn giản và nhanh chóng!'}
            </p>
          </div>
        </section>

        {/* STATS */}
        {stats && (
          <section className="consultation-home-stats">
            <div className="consultation-home-stat-card">
              <div className="consultation-home-stat-icon">
                <FaCheckCircle />
              </div>
              <div className="consultation-home-stat-value">
                {stats.total_consultations || 0}
              </div>
              <p className="consultation-home-stat-label">Tư vấn thành công</p>
            </div>

            <div className="consultation-home-stat-card">
              <div className="consultation-home-stat-icon">
                <FaUserMd />
              </div>
              <div className="consultation-home-stat-value">
                {stats.total_doctors || 0}+
              </div>
              <p className="consultation-home-stat-label">Bác sĩ</p>
            </div>

            <div className="consultation-home-stat-card">
              <div className="consultation-home-stat-icon">
                <FaStar />
              </div>
              <div className="consultation-home-stat-value">
                {(stats.avg_rating || 4.8).toFixed(1)}
              </div>
              <p className="consultation-home-stat-label">Đánh giá trung bình</p>
            </div>

            <div className="consultation-home-stat-card">
              <div className="consultation-home-stat-icon">
                <FaClock />
              </div>
              <div className="consultation-home-stat-value">
                {stats.avg_response_time || '2 phút'}
              </div>
              <p className="consultation-home-stat-label">Thời gian phản hồi</p>
            </div>
          </section>
        )}

        {/* CONSULTATION METHODS TABS */}
        <section className="consultation-home-methods-tabs">
          {methodsSettings.map((method) => (
            <button
              key={method.id}
              className={`consultation-home-tab ${selectedConsultationType === method.id ? 'consultation-home-tab-active' : ''}`}
              onClick={() => setSelectedConsultationType(method.id)}
            >
              <span className="consultation-home-tab-label">{method.name}</span>
              <span className="consultation-home-tab-desc">{method.subtitle}</span>
            </button>
          ))}
        </section>

        {/* METHODS CARDS */}
        <section className="consultation-home-methods-grid">
          {methodsSettings.map((method) => (
            <div key={method.id} className="consultation-home-method-card">
              <span className="consultation-home-method-badge">
                {method.badge}
              </span>
              <div className="consultation-home-method-icon">
                {getIcon(method.icon)}
              </div>
              <h3 className="consultation-home-method-title">
                {method.name}
              </h3>
              <p className="consultation-home-method-subtitle">
                {method.subtitle}
              </p>
              <p className="consultation-home-method-description">
                {method.description}
              </p>
              {method.features && (
                <ul className="consultation-home-method-features">
                  {method.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              )}
              <div className="consultation-home-method-price">
                {(method.price || 0).toLocaleString('vi-VN')} ₫
                <span className="consultation-home-method-price-unit">
                  /{method.duration} phút
                </span>
              </div>
              <button
                className="consultation-home-method-btn"
                onClick={() => handleConsultationType(method.id)}
              >
                {getIcon(method.icon)}
                Bắt đầu ngay
              </button>
            </div>
          ))}
        </section>

        {/* DOCTORS LIST SECTION */}
        {availableDoctors && availableDoctors.length > 0 && (
          <section className="consultation-home-doctors-section">
            <div className="consultation-home-section-header">
              <h2 className="consultation-home-section-title">
                <FaUserMd className="consultation-home-section-title-icon" />
                Bác Sĩ Đang Trực Tuyến
              </h2>
              <p className="consultation-home-section-subtitle">
                {filteredDoctors.length} bác sĩ phù hợp với lựa chọn của bạn
              </p>
            </div>

            {/* Filter Bar */}
            <div className="consultation-home-filter-bar">
              <div className="consultation-home-filter-item">
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                >
                  <option value="">Tất cả đánh giá</option>
                  <option value="5">⭐⭐⭐⭐⭐ - 5 sao</option>
                  <option value="4">⭐⭐⭐⭐ - 4+ sao</option>
                  <option value="3">⭐⭐⭐ - 3+ sao</option>
                </select>
              </div>

              <div className="consultation-home-filter-item">
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                >
                  <option value="all">Tất cả bác sĩ</option>
                  <option value="online">Đang trực tuyến</option>
                  <option value="offline">Không trực tuyến</option>
                </select>
              </div>

              <div className="consultation-home-search-box">
                <FaSearch className="consultation-home-search-icon" />
                <input
                  type="text"
                  placeholder="Tìm bác sĩ, chuyên khoa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Doctors Grid */}
            {filteredDoctors.length > 0 ? (
              <div className="consultation-home-doctors-grid">
                {filteredDoctors.map((doctor) => (
                  <div key={doctor.id} className="consultation-home-doctor-card">
                    <div className="consultation-home-doctor-avatar-section">
                      <img
                        src={doctor.avatar_url || '/default-avatar.png'}
                        alt={doctor.full_name}
                        className="consultation-home-doctor-avatar"
                      />
                      {doctor.is_online && (
                        <span className="consultation-home-online-badge">
                          <span className="consultation-home-pulse-dot"></span>
                          Online
                        </span>
                      )}
                    </div>

                    <div className="consultation-home-doctor-info">
                      <h3 className="consultation-home-doctor-name">
                        {doctor.full_name}
                      </h3>
                      <p className="consultation-home-doctor-specialty">
                        {doctor.Doctor?.Specialty?.name || 'Đa khoa'}
                      </p>

                      <div className="consultation-home-doctor-rating">
                        <FaStar className="consultation-home-star" />
                        <span className="consultation-home-rating-text">
                          {(doctor.Doctor?.avg_rating || 4.5).toFixed(1)}
                        </span>
                        <span className="consultation-home-rating-count">
                          ({doctor.Doctor?.total_reviews || 0})
                        </span>
                      </div>

                      <div className="consultation-home-experience">
                        <FaUserMd style={{ fontSize: '10px' }} />
                        <span>{doctor.Doctor?.experience_years || 0}+ năm kinh nghiệm</span>
                      </div>

                      <div className="consultation-home-pricing">
                        <span className="consultation-home-price-label">Chat: 100K</span>
                        <span className="consultation-home-price-value">/30 phút</span>
                      </div>
                    </div>

                    <div className="consultation-home-doctor-actions">
                      <button
                        className="consultation-home-action-btn consultation-home-btn-profile"
                        onClick={() => handleViewDoctorProfile(doctor)}
                        title="Xem hồ sơ"
                      >
                        Hồ sơ
                      </button>
                      <button
                        className="consultation-home-action-btn consultation-home-btn-chat"
                        onClick={() => handleBookConsultation(doctor.id, 'chat')}
                        title="Đặt lịch Chat"
                      >
                        <FaComments />
                        Chat
                      </button>
                      <button
                        className="consultation-home-action-btn consultation-home-btn-video"
                        onClick={() => handleBookConsultation(doctor.id, 'video')}
                        title="Đặt lịch Video"
                      >
                        <FaVideo />
                        Video
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="consultation-home-empty-state">
                <div className="consultation-home-empty-icon">
                  <FaSearch />
                </div>
                <h4 className="consultation-home-empty-title">
                  Không tìm thấy bác sĩ
                </h4>
                <p className="consultation-home-empty-text">
                  Vui lòng thay đổi tiêu chí tìm kiếm của bạn
                </p>
              </div>
            )}

            <div className="consultation-home-load-more-section">
              <button className="consultation-home-btn-load-more">
                Xem thêm bác sĩ
                <FaArrowRight />
              </button>
            </div>
          </section>
        )}

        {/* TOP RATED DOCTORS */}
        {topRatedDoctors && topRatedDoctors.length > 0 && (
          <section className="consultation-home-top-doctors-section">
            <div className="consultation-home-section-header">
              <h2 className="consultation-home-section-title">
                <FaStar className="consultation-home-section-title-icon" />
                Bác Sĩ Được Yêu Thích Nhất
              </h2>
              <p className="consultation-home-section-subtitle">
                Được đánh giá cao bởi hàng nghìn bệnh nhân
              </p>
            </div>

            <div className="consultation-home-top-doctors-grid">
              {topRatedDoctors.map((doctor, index) => (
                <div key={doctor.id} className="consultation-home-top-doctor-card">
                  <div className="consultation-home-top-doctor-rank">
                    #{index + 1}
                  </div>

                  <div className="consultation-home-top-doctor-avatar-wrapper">
                    <img
                      src={doctor.avatar_url || '/default-avatar.png'}
                      alt={doctor.full_name}
                      className="consultation-home-top-doctor-avatar"
                    />
                    {index < 3 && (
                      <div className="consultation-home-top-star-badge">
                        <FaStar />
                      </div>
                    )}
                  </div>

                  <h4 className="consultation-home-top-doctor-name">
                    {doctor.full_name}
                  </h4>
                  <p className="consultation-home-top-doctor-specialty">
                    {doctor.Doctor?.Specialty?.name || 'Đa khoa'}
                  </p>

                  <div className="consultation-home-top-rating-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FaStar
                        key={i}
                        className={i < Math.round(doctor.Doctor?.avg_rating || 4.5) ? 'consultation-home-star-filled' : 'consultation-home-star-empty'}
                      />
                    ))}
                  </div>
                  <span className="consultation-home-rating-value">
                    {(doctor.Doctor?.avg_rating || 4.5).toFixed(1)}/5
                  </span>
                  <span className="consultation-home-review-count">
                    ({doctor.Doctor?.total_reviews || 0} đánh giá)
                  </span>

                  <button
                    className="consultation-home-btn-top-doctor"
                    onClick={() => handleViewDoctorProfile(doctor)}
                  >
                    Xem chi tiết
                    <FaArrowRight />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WHY CHOOSE US */}
        <section className="consultation-home-why-choose-section">
          <div className="consultation-home-section-header">
            <h2 className="consultation-home-section-title">
              <FaCheckCircle className="consultation-home-section-title-icon" />
              Tại Sao Chọn Chúng Tôi?
            </h2>
            <p className="consultation-home-section-subtitle">
              Cam kết mang đến dịch vụ tư vấn y tế tốt nhất
            </p>
          </div>

          <div className="consultation-home-features-grid">
            {whyChooseSettings.map((feature) => (
              <div key={feature.id} className="consultation-home-feature-card">
                <div className="consultation-home-feature-icon">
                  {getIcon(feature.icon)}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="consultation-home-cta-section">
          <div className="consultation-home-cta-background">
            <div className="consultation-home-cta-shape consultation-home-cta-shape-1"></div>
            <div className="consultation-home-cta-shape consultation-home-cta-shape-2"></div>
          </div>

          <div className="consultation-home-cta-content">
            <h2 className="consultation-home-cta-title">
              Sẵn Sàng Bắt Đầu?
            </h2>
            <p className="consultation-home-cta-description">
              Đừng chần chừ! Kết nối ngay với bác sĩ chuyên khoa trong vài phút. 
              Sức khỏe của bạn là ưu tiên hàng đầu!
            </p>
            <div className="consultation-home-cta-buttons">
              <button
                className="consultation-home-cta-btn consultation-home-cta-btn-primary"
                onClick={handleQuickChat}
              >
                <FaBolt /> Chat Nhanh Ngay
              </button>
              <button
                className="consultation-home-cta-btn consultation-home-cta-btn-secondary"
                onClick={() => navigate('/tu-van/chon-bac-si')}
              >
                <FaUserMd /> Chọn Bác Sĩ
              </button>
            </div>
            <p className="consultation-home-cta-note">
              <FaCheckCircle /> Đã có hơn 50,000+ lượt tư vấn thành công
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ConsultationHomePage;
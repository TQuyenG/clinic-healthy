/* * File: AboutPage.js
 * Mô tả: Trang "Về chúng tôi" - Fix tràn Mobile, Chia 50/50, 3 Thumbnails trượt
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './AboutPage.css';

// Component hỗ trợ cuộn ngang với nút bấm và Loop
const ScrollWrapper = ({ children, className }) => {
  const scrollRef = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        setCanScroll(scrollRef.current.scrollWidth > scrollRef.current.clientWidth + 5);
      }
    };
    checkScroll();
    setTimeout(checkScroll, 500); 
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children]);

  const handleScroll = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    const maxScroll = container.scrollWidth - container.clientWidth;
    let newScroll = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

    // Xử lý vòng lặp (Loop)
    if (direction === 'right' && Math.ceil(container.scrollLeft) >= maxScroll - 10) {
      newScroll = 0;
    } else if (direction === 'left' && container.scrollLeft <= 10) {
      newScroll = maxScroll;
    }
    container.scrollTo({ left: newScroll, behavior: 'smooth' });
  };

  return (
    <div className="scroll-wrapper-container">
      {canScroll && (
        <button className="scroll-arrow left" onClick={() => handleScroll('left')}>
          <FaIcons.FaChevronLeft />
        </button>
      )}
      <div className={`scroll-content ${className || ''}`} ref={scrollRef}>
        {children}
      </div>
      {canScroll && (
        <button className="scroll-arrow right" onClick={() => handleScroll('right')}>
          <FaIcons.FaChevronRight />
        </button>
      )}
    </div>
  );
};

const AboutPage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [aboutData, setAboutData] = useState({
    banner: {}, mission: {}, vision: {}, milestones: [],
    stats: [], values: [], leadership: [], achievements: [], facilities: []
  });
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);

  // State quản lý tab đang được chọn trong phần Lịch sử
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);

  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchAboutData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings/about');
        if (response.data) {
          setAboutData(response.data);
          setError(null);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu về:', error);
        setError('Không thể tải thông tin. Vui lòng thử lại sau.');
      }
    };

    const fetchSpecialties = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/specialties');
        const data = await response.json();
        if (data.success && data.specialties) setSpecialties(data.specialties);
      } catch (error) {}
    };

    const fetchDoctors = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/users/doctors?limit=6&random=true');
        const data = await response.json();
        if (data.success && data.doctors) {
          const { normalizeUserList } = await import('../utils/normalizeUser');
          setDoctors(normalizeUserList(data.doctors || [], 'doctor'));
        }
      } catch (error) {}
    };

    fetchAboutData();
    fetchSpecialties();
    fetchDoctors();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.15 }
    );

    const sections = document.querySelectorAll('.aboutpage-animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  // Hàm chuyển đổi Milestone
  const handleNextMilestone = () => {
    if (aboutData.milestones.length > 0) {
      setActiveMilestoneIndex((prev) => (prev + 1) % aboutData.milestones.length);
    }
  };

  const handlePrevMilestone = () => {
    if (aboutData.milestones.length > 0) {
      setActiveMilestoneIndex((prev) => (prev - 1 + aboutData.milestones.length) % aboutData.milestones.length);
    }
  };

  // Logic lấy đúng 3 khung ảnh, ảnh chính luôn ở đầu tiên
  const visibleThumbnails = aboutData.milestones.length > 0 
    ? [
        activeMilestoneIndex,
        (activeMilestoneIndex + 1) % aboutData.milestones.length,
        (activeMilestoneIndex + 2) % aboutData.milestones.length,
      ].slice(0, Math.min(3, aboutData.milestones.length))
    : [];

  if (error) {
    return (
      <div className="aboutpage-container">
        <section className="aboutpage-hero">
          <p className="aboutpage-error-text">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="aboutpage-container">
      {/* 1. Banner */}
      <section className="aboutpage-hero" 
        style={{ backgroundImage: `url(${aboutData.banner?.image || 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1920&h=600&fit=crop'})` }}>
        <div className="aboutpage-hero-overlay"></div>
        <div className="aboutpage-hero-content">
          <div className="aboutpage-hero-badge">
            <FaIcons.FaHospital />
            <span>Về chúng tôi</span>
          </div>
          <h1 className="aboutpage-hero-title">{aboutData.banner?.title || 'Easy Medify'}</h1>
          <h2 className="aboutpage-hero-subtitle">{aboutData.banner?.subtitle || 'Đồng hành cùng sức khỏe cộng đồng'}</h2>
          <p className="aboutpage-hero-description">
            {aboutData.banner?.description || 'Với hơn 15 năm kinh nghiệm, chúng tôi tự hào là đơn vị tiên phong trong việc cung cấp dịch vụ y tế chất lượng cao.'}
          </p>
        </div>
      </section>

      {/* 2. Sứ mệnh & Tầm nhìn */}
      <section className="aboutpage-section-container aboutpage-animate-section" id="mission-vision">
        <div className="aboutpage-section-content">
          {aboutData.mission && aboutData.mission.title && (
            <div className="aboutpage-zigzag-row">
              <div className="aboutpage-zigzag-image">
                <img src={aboutData.mission.image || 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=400&fit=crop'} alt="Sứ mệnh" />
                <div className="aboutpage-zigzag-icon">
                  {iconMap[aboutData.mission.icon] ? React.createElement(iconMap[aboutData.mission.icon]) : <FaIcons.FaLeaf />}
                </div>
              </div>
              <div className="aboutpage-zigzag-text">
                <span className="aboutpage-section-badge">Sứ mệnh</span>
                <h2 className="aboutpage-section-title-left">{aboutData.mission.title}</h2>
                <p className="aboutpage-section-desc">{aboutData.mission.description}</p>
              </div>
            </div>
          )}

          {aboutData.vision && aboutData.vision.title && (
            <div className="aboutpage-zigzag-row reverse">
              <div className="aboutpage-zigzag-image">
                <img src={aboutData.vision.image || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop'} alt="Tầm nhìn" />
                <div className="aboutpage-zigzag-icon">
                  {iconMap[aboutData.vision.icon] ? React.createElement(iconMap[aboutData.vision.icon]) : <FaIcons.FaEye />}
                </div>
              </div>
              <div className="aboutpage-zigzag-text">
                <span className="aboutpage-section-badge">Tầm nhìn</span>
                <h2 className="aboutpage-section-title-left">{aboutData.vision.title}</h2>
                <p className="aboutpage-section-desc">{aboutData.vision.description}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Lịch sử phát triển (Chia 50/50 & Chỉ hiện 3 Thumbnail) */}
      {aboutData.milestones && aboutData.milestones.length > 0 && (
        <section className="aboutpage-section-container bg-light aboutpage-animate-section" id="timeline">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Lịch sử phát triển</h2>
            
            <div className="aboutpage-gallery-container">
              {/* Bên trái: Ảnh lớn chiếm 50% */}
              <div className="aboutpage-gallery-main">
                <button className="gallery-nav-btn left" onClick={handlePrevMilestone}>
                  <FaIcons.FaChevronLeft />
                </button>
                
                {aboutData.milestones[activeMilestoneIndex] && (
                  <img 
                    key={`main-${activeMilestoneIndex}`}
                    src={aboutData.milestones[activeMilestoneIndex].image} 
                    alt={aboutData.milestones[activeMilestoneIndex].title} 
                    className="gallery-main-image"
                  />
                )}

                <button className="gallery-nav-btn right" onClick={handleNextMilestone}>
                  <FaIcons.FaChevronRight />
                </button>
              </div>

              {/* Bên phải: Nội dung & 3 Ảnh nhỏ chiếm 50% */}
              <div className="aboutpage-gallery-info">
                {aboutData.milestones[activeMilestoneIndex] && (
                  <div className="aboutpage-gallery-text" key={`text-${activeMilestoneIndex}`}>
                    <span className="gallery-year">{aboutData.milestones[activeMilestoneIndex].year}</span>
                    <h3 className="gallery-title">{aboutData.milestones[activeMilestoneIndex].title}</h3>
                    <p className="gallery-desc">{aboutData.milestones[activeMilestoneIndex].description}</p>
                  </div>
                )}

                <div className="aboutpage-gallery-thumbnails-wrapper">
                  <div className="aboutpage-gallery-thumbnails">
                    {/* Render chính xác 3 ảnh */}
                    {visibleThumbnails.map((idx, index) => {
                      const milestone = aboutData.milestones[idx];
                      return (
                        <div 
                          key={`thumb-${idx}`}
                          className={`gallery-thumb ${index === 0 ? 'active' : ''}`} // Ảnh đầu tiên (index 0) là ảnh chính
                          onClick={() => setActiveMilestoneIndex(idx)}
                        >
                          <img src={milestone.image} alt={milestone.year} />
                          <div className="gallery-thumb-overlay">
                            <span>{milestone.year}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Giá trị cốt lõi */}
      {aboutData.values && aboutData.values.length > 0 && (
        <section className="aboutpage-section-container aboutpage-animate-section" id="values">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Giá trị cốt lõi</h2>
            <ScrollWrapper className="aboutpage-values-mini-row">
              {aboutData.values.map((value, index) => {
                const Icon = iconMap[value.icon] || iconMap.FaHeart;
                return (
                  <div key={index} className="aboutpage-value-mini-card">
                    <div className="aboutpage-value-mini-icon"><Icon /></div>
                    <h3 className="aboutpage-value-mini-title">{value.title}</h3>
                    <p className="aboutpage-value-mini-desc">{value.description}</p>
                  </div>
                );
              })}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 5. Đội ngũ điều hành */}
      {aboutData.leadership && aboutData.leadership.length > 0 && (
        <section className="aboutpage-section-container bg-light aboutpage-animate-section" id="leadership">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Đội ngũ điều hành</h2>
            <ScrollWrapper className="aboutpage-horizontal-grid leader-grid">
              {aboutData.leadership.map((leader, index) => (
                <div key={index} className="aboutpage-mini-card">
                  <div className="aboutpage-mini-img-wrapper">
                    <img src={leader.image} alt={leader.name} />
                  </div>
                  <div className="aboutpage-mini-info">
                    <h3 className="aboutpage-mini-name">{leader.name}</h3>
                    <p className="aboutpage-mini-position">{leader.position}</p>
                  </div>
                </div>
              ))}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 6. Giải thưởng & Chứng nhận */}
      {aboutData.achievements && aboutData.achievements.length > 0 && (
        <section className="aboutpage-section-container aboutpage-animate-section" id="achievements">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Giải thưởng & Chứng nhận</h2>
            <ScrollWrapper className="aboutpage-horizontal-grid achievement-grid">
              {aboutData.achievements.map((achievement, index) => {
                const Icon = iconMap[achievement.icon] || iconMap.FaTrophy;
                return (
                  <div key={index} className="aboutpage-mini-card">
                    {achievement.image ? (
                      <div className="aboutpage-mini-img-wrapper achievement">
                        <img src={achievement.image} alt={achievement.title} />
                      </div>
                    ) : (
                      <div className="aboutpage-mini-icon-large"><Icon /></div>
                    )}
                    <div className="aboutpage-mini-info center">
                      <h3 className="aboutpage-mini-name">{achievement.title}</h3>
                      <span className="aboutpage-mini-year">{achievement.year}</span>
                    </div>
                  </div>
                );
              })}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 7. Trang thiết bị hiện đại */}
      {aboutData.facilities && aboutData.facilities.length > 0 && (
        <section className="aboutpage-section-container bg-light aboutpage-animate-section" id="facilities">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Trang thiết bị hiện đại</h2>
            <ScrollWrapper className="aboutpage-horizontal-grid facility-grid">
              {aboutData.facilities.map((facility, index) => {
                const Icon = iconMap[facility.icon] || iconMap.FaBuilding;
                return (
                  <div key={index} className="aboutpage-mini-card">
                    {facility.image && (
                      <div className="aboutpage-mini-img-wrapper facility">
                        <img src={facility.image} alt={facility.title} />
                        <div className="aboutpage-facility-badge"><Icon /></div>
                      </div>
                    )}
                    <div className="aboutpage-mini-info center">
                      <h3 className="aboutpage-mini-name">{facility.title}</h3>
                    </div>
                  </div>
                );
              })}
            </ScrollWrapper>
            <div className="aboutpage-section-footer">
              <Link to="/trang-thiet-bi" className="aboutpage-btn-outline">
                Xem chi tiết trang thiết bị <FaIcons.FaArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 8. Bác sĩ tiêu biểu */}
      {doctors.length > 0 && (
        <section className="aboutpage-section-container aboutpage-animate-section" id="doctors">
          <div className="aboutpage-section-content">
            <h2 className="aboutpage-section-title">Bác sĩ tiêu biểu</h2>
            <ScrollWrapper className="aboutpage-horizontal-grid doctor-grid">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="aboutpage-mini-card">
                  <div className="aboutpage-mini-img-wrapper">
                    <img src={doctor.avatar_url} alt={doctor.full_name} />
                  </div>
                  <div className="aboutpage-mini-info">
                    <h3 className="aboutpage-mini-name">{doctor.full_name}</h3>
                    <p className="aboutpage-mini-specialty"><FaIcons.FaStethoscope /> {doctor.specialty_name}</p>
                    <p className="aboutpage-mini-year"><FaIcons.FaAward /> {doctor.experience_years} năm kinh nghiệm</p>
                  </div>
                </div>
              ))}
            </ScrollWrapper>
            <div className="aboutpage-section-footer">
              <Link to="/bac-si" className="aboutpage-btn-outline">Xem tất cả bác sĩ <FaIcons.FaArrowRight /></Link>
            </div>
          </div>
        </section>
      )}

      {/* 9. Thống kê nổi bật */}
      {aboutData.stats && aboutData.stats.length > 0 && (
        <section className="aboutpage-stats-banner">
          <div className="aboutpage-section-content">
            <ScrollWrapper className="aboutpage-stats-grid">
              {aboutData.stats.map((stat, index) => (
                <div key={index} className="aboutpage-stat-item">
                  <h4>{stat.number}</h4>
                  <p>{stat.label}</p>
                </div>
              ))}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 10. CTA */}
      <section className="aboutpage-cta-section">
        <div className="aboutpage-cta-content">
          <h2 className="aboutpage-cta-title">Sẵn sàng chăm sóc sức khỏe của bạn?</h2>
          <p className="aboutpage-cta-text">
            Đặt lịch khám ngay hôm nay để được tư vấn và chăm sóc bởi đội ngũ y bác sĩ chuyên nghiệp.
          </p>
          <div className="aboutpage-cta-buttons">
            <Link to="/dat-lich-hen" className="aboutpage-btn-primary">
              <FaIcons.FaCalendarAlt /> Đặt lịch khám
            </Link>
            <Link to="/lien-he" className="aboutpage-btn-secondary">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
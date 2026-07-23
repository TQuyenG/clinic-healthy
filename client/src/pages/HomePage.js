/* * Tệp: HomePage.js
 * Mô tả: Trang chủ với chức năng Lướt ngang và FIX lỗi hiển thị thông tin bác sĩ
 */
import EventPopup from '../components/common/EventPopup';
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import serviceService from '../services/serviceService';
import consultationService from '../services/consultationService';
import './HomePage.css';

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

const HomePage = () => {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitalServices, setHospitalServices] = useState([]);
  const [consultationServices, setConsultationServices] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeSettings, setHomeSettings] = useState({
    bannerSlides: [], features: [], aboutSection: {}, testimonials: [], bookingSection: {}
  });
  const [formData, setFormData] = useState({
    email: '', specialty: '', date: '', name: '', phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);

  const [showEventPopup, setShowEventPopup] = useState(false);
  const [popupEventData, setPopupEventData] = useState(null);
  const [bannerAdEvent, setBannerAdEvent] = useState(null);
  const [showBannerAdPopup, setShowBannerAdPopup] = useState(false);

  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchHomeSettings = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/settings/home`);
        if (response.data) setHomeSettings(response.data);
      } catch (error) {
        setError('Không thể tải dữ liệu trang chủ. Vui lòng thử lại sau.');
      }
    };

    const fetchPopupEvent = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/marketing/events/popup`);
        if (response.data && response.data.success && response.data.event) {
          const event = response.data.event;
          const frequency = event.popup_config?.frequency || 'once_per_day';
          const storageKey = `seen_event_${event.id}`;
          let shouldShow = false;

          if (frequency === 'always') shouldShow = true;
          else if (frequency === 'once_per_session') shouldShow = !sessionStorage.getItem(storageKey);
          else if (frequency === 'once_per_day') {
            const lastSeen = localStorage.getItem(storageKey);
            shouldShow = !lastSeen || (Date.now() - parseInt(lastSeen)) > 86400000;
          }

          if (shouldShow) {
            setTimeout(() => {
              setPopupEventData(event);
              setShowEventPopup(true);
              frequency === 'once_per_session' 
                ? sessionStorage.setItem(storageKey, 'true')
                : localStorage.setItem(storageKey, Date.now().toString());
            }, 1500);
          }
        }
      } catch (err) {}
    };
    fetchPopupEvent();

    const fetchSpecialties = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/specialties`);
        const data = await response.json();
        if (data.success && data.specialties) {
          const specialtiesWithIcons = data.specialties.map(spec => ({
            ...spec, iconName: spec.icon || 'FaStethoscope'
          }));
          setSpecialties(specialtiesWithIcons.slice(0, 6));
        }
      } catch (error) {}
    };

    // ĐÃ SỬA: Hàm fetchDoctors dùng axios và không qua normalizeUserList để giữ đủ dữ liệu
    const fetchDoctors = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/doctors`, {
          params: { limit: 3, random: true }
        });
        
        if (response.data.success && response.data.doctors) {
          setDoctors(response.data.doctors);
        } else {
          setDoctors([]);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu bác sĩ:', error);
        setDoctors([]);
      }
    };

    const fetchHospitalServices = async () => {
      try {
        const response = await serviceService.getPublicServices({ limit: 6 });
        if (response.data.success && response.data.data) setHospitalServices(response.data.data.slice(0, 6));
      } catch (error) {}
    };

    const fetchConsultationServices = async () => {
      try {
        const response = await consultationService.getAllPublicPackages({ limit: 6 });
        if (response.data && response.data.success && response.data.data) {
          setConsultationServices(response.data.data.slice(0, 6));
        }
      } catch (error) {}
    };

    const fetchBannerAdEvent = async () => {
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/marketing/events/banner-ad`);
          if (res.data?.event) {
            setBannerAdEvent(res.data.event);
            // Hiện popup sau 2 giây nếu chưa đóng trong session
            const dismissedKey = `banner_ad_dismissed_${res.data.event.id}`;
            if (!sessionStorage.getItem(dismissedKey)) {
              setTimeout(() => setShowBannerAdPopup(true), 2000);
            }
          }
        } catch {}
      };
    fetchBannerAdEvent();

    fetchHomeSettings();
    fetchBannerAdEvent();
    fetchSpecialties();
    fetchDoctors();
    fetchHospitalServices();
    fetchConsultationServices();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
        });
      }, { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.homepage-animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  useEffect(() => {
    if (!homeSettings.bannerSlides || homeSettings.bannerSlides.length <= 1) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % homeSettings.bannerSlides.length);
    }, 6000);
    return () => clearInterval(slideInterval);
  }, [homeSettings.bannerSlides]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.name || !formData.phone || !formData.email || !formData.specialty || !formData.date) {
        alert('Vui lòng điền đầy đủ thông tin');
        setIsSubmitting(false);
        return;
      }
      const queryParams = new URLSearchParams({ ...formData }).toString();
      navigate(`/dat-lich-hen?${queryParams}`);
    } catch (error) {
      alert('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % homeSettings.bannerSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + homeSettings.bannerSlides.length) % homeSettings.bannerSlides.length);
  const goToSlide = (index) => setCurrentSlide(index);

  if (error) {
    return (
      <main className="homepage-main">
        <section className="homepage-banner-slider">
          <p className="homepage-error-text">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="homepage-main">
      {/* 1. Banner Slides */}
      <section className="homepage-banner-slider">
        {(homeSettings.bannerSlides || []).map((slide, index) => {
          const isPrevious = index === (currentSlide - 1 + homeSettings.bannerSlides.length) % homeSettings.bannerSlides.length;
          const isActive = index === currentSlide;
          return (
            <div key={index} className={`homepage-banner-slide ${isActive ? 'active' : isPrevious ? 'previous' : ''}`} style={{ backgroundImage: `url(${slide.image})` }}>
              <div className="homepage-banner-overlay"></div>
              <div className="homepage-banner-content">
                <div className="homepage-banner-badge">
                  <FaIcons.FaHeart className="homepage-badge-icon" />
                  <span>Chăm sóc sức khỏe toàn diện</span>
                </div>
                <h1>{slide.title}</h1>
                <h2>{slide.subtitle}</h2>
                <p>{slide.description}</p>
                <div className="homepage-banner-buttons">
                  <Link to={slide.buttonLink || '/book-appointment'} className="homepage-btn homepage-btn-primary" style={{ background: slide.buttonColor || '#10b981' }}>
                    {slide.buttonIcon && iconMap[slide.buttonIcon] && React.createElement(iconMap[slide.buttonIcon])}
                    {slide.buttonText || 'Đặt lịch ngay'}
                  </Link>
                  <Link to="/about" className="homepage-btn homepage-btn-secondary">Tìm hiểu thêm <FaIcons.FaArrowRight /></Link>
                </div>
              </div>
            </div>
          );
        })}
        {homeSettings.bannerSlides && homeSettings.bannerSlides.length > 1 && (
          <>
            <button className="homepage-slider-btn homepage-prev" onClick={prevSlide}><FaIcons.FaChevronLeft /></button>
            <button className="homepage-slider-btn homepage-next" onClick={nextSlide}><FaIcons.FaChevronRight /></button>
            <div className="homepage-slider-dots">
              {homeSettings.bannerSlides.map((_, index) => (
                <button key={index} className={`homepage-dot ${index === currentSlide ? 'active' : ''}`} onClick={() => goToSlide(index)}></button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 2. Tính năng nổi bật */}
      <section className="homepage-section-container homepage-features-section homepage-animate-section" id="features">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Tính năng nổi bật</h2>
          <ScrollWrapper className="homepage-features-grid">
            {(homeSettings.features || []).map((feature, index) => {
              const Icon = iconMap[feature.icon] || FaIcons.FaStethoscope;
              return (
                <div key={index} className={`homepage-feature-card ${isVisible.features ? 'fade-in' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="homepage-feature-icon" style={{ backgroundColor: feature.iconBgColor || '#4CAF50' }}>
                    <Icon />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              );
            })}
          </ScrollWrapper>
        </div>
        
      </section>

      

      {homeSettings.aboutSection && homeSettings.aboutSection.title && (
        <section className="homepage-section-container homepage-intro-section homepage-animate-section" id="intro">
          <div className="homepage-container">
            <h2 className="homepage-section-title">{homeSettings.aboutSection.title}</h2>
            <div className="homepage-intro-content">
              <div className={`homepage-intro-image ${isVisible.intro ? 'slide-in-left' : ''}`}>
                <img src={homeSettings.aboutSection.image} alt={homeSettings.aboutSection.alt || 'Về chúng tôi'} />
                {homeSettings.aboutSection.yearsExperience && (
                  <div className="homepage-intro-badge">
                    <FaIcons.FaTrophy />
                    <div>
                      <h4>{homeSettings.aboutSection.yearsExperience}</h4>
                      <p>Năm kinh nghiệm</p>
                    </div>
                  </div>
                )}
              </div>
              <div className={`homepage-intro-text ${isVisible.intro ? 'slide-in-right' : ''}`}>
                {(homeSettings.aboutSection.highlights || []).map((highlight, index) => {
                  const Icon = iconMap[highlight.icon] || FaIcons.FaCheckCircle;
                  return (
                    <div key={index} className="homepage-intro-item">
                      <Icon className="homepage-check-icon" />
                      <div><h4>{highlight.title}</h4><p>{highlight.description}</p></div>
                    </div>
                  );
                })}
                <Link to={homeSettings.aboutSection.buttonLink || '/about'} className="homepage-btn homepage-btn-outline">
                  {homeSettings.aboutSection.buttonText || 'Xem thêm'} <FaIcons.FaArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3.5a. Dịch vụ khám tại viện */}
      {hospitalServices.length > 0 && (
        <section className="homepage-section-container homepage-hospital-services-section homepage-animate-section" id="hospital-services">
          <div className="homepage-container">
            <h2 className="homepage-section-title">Dịch vụ khám tại viện</h2>
            <ScrollWrapper className="homepage-services-grid">
              {hospitalServices.map((service, index) => (
                <div key={service.id} className={`homepage-service-card ${isVisible['hospital-services'] ? 'fade-in' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="homepage-service-image-wrapper">
                    {service.image && service.image.trim() ? (
                      <><img src={service.image} alt={service.name} className="homepage-service-image"/>
                        <div className="homepage-service-overlay-info">
                          <div className="homepage-service-price-overlay">{service.price ? service.price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ'}</div>
                          {service.duration && <div className="homepage-service-duration-overlay">{service.duration} phút</div>}
                        </div>
                      </>
                    ) : (<div className="homepage-service-image-placeholder"><FaIcons.FaStethoscope className="placeholder-icon" /></div>)}
                  </div>
                  <div className="homepage-service-content">
                    <h3>{service.name}</h3><p className="homepage-service-description">{service.description}</p>
                    <button className="homepage-service-btn" onClick={() => navigate(`/dich-vu/${service.id}`)}>Xem chi tiết <FaIcons.FaArrowRight /></button>
                  </div>
                </div>
              ))}
            </ScrollWrapper>
            {hospitalServices.length > 9 && (
              <div className="homepage-section-footer">
                <Link to="/dich-vu" className="homepage-btn homepage-btn-outline">Xem tất cả dịch vụ <FaIcons.FaArrowRight /></Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3.5b. Dịch vụ tư vấn trực tuyến */}
      {consultationServices.length > 0 && (
        <section className="homepage-section-container homepage-consultation-services-section homepage-animate-section" id="consultation-services">
          <div className="homepage-container">
            <h2 className="homepage-section-title">Dịch vụ tư vấn trực tuyến</h2>
            <ScrollWrapper className="homepage-services-grid">
              {consultationServices.map((service, index) => {
                const packageName = service.name || service.package_name;
                const packageType = service.package_type;
                let iconClass = 'FaComments';
                if (service.icon && service.icon.startsWith('Fa')) iconClass = service.icon;
                else if (packageType === 'chat') iconClass = 'FaComments';
                else if (packageType === 'video') iconClass = 'FaVideo';
                else if (packageType === 'offline') iconClass = 'FaStethoscope';
                
                return (
                  <div key={service.id} className={`homepage-service-card ${isVisible['consultation-services'] ? 'fade-in' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="homepage-service-image-wrapper">
                      <div className="homepage-service-image-placeholder">
                        {iconClass && iconClass.startsWith('Fa') ? React.createElement(FaIcons[iconClass], { className: 'placeholder-icon' }) : <FaIcons.FaComments className="placeholder-icon" />}
                      </div>
                      <div className="homepage-service-overlay-info">
                        <div className="homepage-service-price-overlay">{service.price === 0 ? 'Miễn phí' : (service.price ? service.price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ')}</div>
                      </div>
                    </div>
                    <div className="homepage-service-content">
                      <h3>{packageName}</h3><p className="homepage-service-description">{service.description}</p>
                      <button className="homepage-service-btn homepage-service-btn-consultation" onClick={() => navigate(`/tu-van?type=${service.id}`)}>Đặt ngay <FaIcons.FaArrowRight /></button>
                    </div>
                  </div>
                );
              })}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 4. Chuyên khoa nổi bật */}
      <section className="homepage-section-container homepage-specialties-section homepage-animate-section" id="specialties">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Chuyên khoa nổi bật</h2>
          <ScrollWrapper className="homepage-specialties-grid">
            {specialties.map((specialty, index) => {
              const IconComponent = iconMap[specialty.iconName] || FaIcons.FaStethoscope;
              return (
              <div key={specialty.id} className={`homepage-specialty-card ${isVisible.specialties ? 'fade-in' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="homepage-specialty-icon"><IconComponent /></div>
                <h3>{specialty.name}</h3><p>{specialty.description}</p>
                <Link to={`/chuyen-khoa/${specialty.slug}`} className="homepage-specialty-link">Xem chi tiết <FaIcons.FaArrowRight /></Link>
              </div>
            );
            })}
          </ScrollWrapper>
        </div>
      </section>

      {/* 5. Bác sĩ nổi bật */}
      <section className="homepage-section-container homepage-doctors-section homepage-animate-section" id="doctors">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Bác sĩ nổi bật</h2>
          {doctors.length > 0 ? (
            <>
              <ScrollWrapper className="homepage-doctors-grid">
                {doctors.map((doctor, index) => (
                  <div key={doctor.id} className={`homepage-doctor-card ${isVisible.doctors ? 'scale-in' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="homepage-doctor-image-wrapper">
                      <img src={doctor.avatar_url} alt={doctor.full_name} className="homepage-doctor-image" />
                      <div className="homepage-doctor-rating"><FaIcons.FaStar /><span>5.0</span></div>
                    </div>
                    <div className="homepage-doctor-info">
                      <h3>{doctor.full_name}</h3>
                      <p className="homepage-doctor-specialty"><FaIcons.FaStethoscope /> {doctor.specialty_name}</p>
                      <p className="homepage-doctor-experience"><FaIcons.FaAward /> {doctor.experience_years} năm kinh nghiệm</p>
                      <Link to={`/bac-si/${doctor.code}`} className="homepage-doctor-link">Xem hồ sơ <FaIcons.FaArrowRight /></Link>
                    </div>
                  </div>
                ))}
              </ScrollWrapper>
            </>
          ) : (
            <p className="homepage-loading-text">Đang tải dữ liệu bác sĩ...</p>
          )}
        </div>
      </section>

      {/* 6. Đánh giá từ bệnh nhân */}
      <section className="homepage-section-container homepage-testimonials-section homepage-animate-section" id="testimonials">
        <div className="homepage-container">
          <h2 className="homepage-section-title">Đánh giá từ bệnh nhân</h2>
          <ScrollWrapper className="homepage-testimonials-grid">
            {(homeSettings.testimonials || []).map((testimonial, index) => (
              <div key={index} className={`homepage-testimonial-card ${isVisible.testimonials ? 'fade-in' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                <FaIcons.FaQuoteLeft className="homepage-quote-icon" />
                <p className="homepage-testimonial-text">{testimonial.comment}</p>
                <div className="homepage-testimonial-author">
                  <img src={testimonial.avatar} alt={testimonial.name} />
                  <div><h4>{testimonial.name}</h4><p>{testimonial.role}</p></div>
                </div>
              </div>
            ))}
          </ScrollWrapper>
        </div>
      </section>

      {/* 7. Đặt lịch khám bệnh */}
      {homeSettings.bookingSection && homeSettings.bookingSection.title && (
        <section className="homepage-section-container homepage-booking-section homepage-animate-section" id="booking">
          {/* Nội dung Form giữ nguyên */}
        </section>
      )}
      
      {showEventPopup && popupEventData && (
        <EventPopup data={popupEventData} onClose={() => setShowEventPopup(false)} />
      )}
      {showBannerAdPopup && bannerAdEvent && (
        <EventPopup
          data={bannerAdEvent}
          onClose={() => {
            setShowBannerAdPopup(false);
            sessionStorage.setItem(`banner_ad_dismissed_${bannerAdEvent.id}`, '1');
          }}
        />
      )}
    </main>
  );
};

export default HomePage;
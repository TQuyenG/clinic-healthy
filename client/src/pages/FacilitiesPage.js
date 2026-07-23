/* * Tệp: FacilitiesPage.js
 * Mô tả: Trang "Cơ sở vật chất" - Banner đầu tiên, Thống kê thứ 2, Icon Tiện ích to hơn
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './FacilitiesPage.css';

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

const FacilitiesPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [facilitiesData, setFacilitiesData] = useState({
    banner: {}, amenities: [], facilities: [], gallery: [], stats: []
  });
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);

  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchFacilitiesData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/settings/facilities`);
        if (response.data) {
          setFacilitiesData(response.data);
          setError(null);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu cơ sở vật chất:', error);
        setError('Không thể tải thông tin cơ sở vật chất. Vui lòng thử lại sau.');
      }
    };
    fetchFacilitiesData();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      }, { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.facilitiespage-animate-section');
    sections.forEach(section => observer.observe(section));
    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  if (error) {
    return (
      <div className="facilitiespage-page">
        <section className="facilitiespage-hero"><p>{error}</p></section>
      </div>
    );
  }

  return (
    <div className="facilitiespage-page">
      
      {/* 1. Banner (Trải đầy màn hình 100vh và nằm đầu tiên) */}
      <section className="facilitiespage-hero"
        style={{ 
          background: facilitiesData.banner?.image 
            ? `linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(46, 125, 50, 0.8) 100%), url(${facilitiesData.banner.image})` 
            : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
        <div className="facilitiespage-container">
          <div className="facilitiespage-hero-badge">
            <FaIcons.FaBuilding />
            <span>Cơ sở vật chất</span>
          </div>
          <h1>{facilitiesData.banner?.title || 'Không Gian Y Tế Hiện Đại'}</h1>
          <p className="facilitiespage-hero-subtitle">
            {facilitiesData.banner?.subtitle || facilitiesData.banner?.description || 
              'Không gian sạch sẽ, tiện nghi và thân thiện mang lại sự thoải mái tối đa.'}
          </p>
        </div>
      </section>

      {/* 2. Thống kê (Chuyển xuống ngay dưới Banner) */}
      {facilitiesData.stats && facilitiesData.stats.length > 0 && (
        <section className="facilitiespage-stats-top facilitiespage-animate-section" id="stats">
          <div className="facilitiespage-container">
            <div className="facilitiespage-stats-wrap-grid">
              {facilitiesData.stats.map((stat, index) => (
                <div key={index} className="facilitiespage-stat-item-top">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Tiện ích */}
      {facilitiesData.amenities && facilitiesData.amenities.length > 0 && (
        <section className="facilitiespage-section-container bg-light facilitiespage-animate-section" id="amenities">
          <div className="facilitiespage-container">
            <h2 className="facilitiespage-section-title">Tiện ích dành cho bạn</h2>
            <ScrollWrapper className="facilitiespage-amenities-grid">
              {facilitiesData.amenities.map((amenity, index) => {
                const Icon = iconMap[amenity.icon] || iconMap.FaWifi;
                return (
                  <div key={index} className="facilitiespage-amenity-item">
                    <div className="facilitiespage-amenity-icon"><Icon /></div>
                    <span>{amenity.name}</span>
                  </div>
                );
              })}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 4. Các khu vực chính */}
      {facilitiesData.facilities && facilitiesData.facilities.length > 0 && (
        <section className="facilitiespage-section-container facilitiespage-animate-section" id="facilities">
          <div className="facilitiespage-container">
            <h2 className="facilitiespage-section-title">Các khu vực chính</h2>
            <ScrollWrapper className="facilitiespage-facilities-grid">
              {facilitiesData.facilities.map((facility, index) => {
                const Icon = iconMap[facility.icon] || iconMap.FaClinicMedical;
                return (
                  <div key={index} className="facilitiespage-facility-card">
                    <div className="facilitiespage-facility-image" onClick={() => setSelectedImage(facility.image)}>
                      <img src={facility.image} alt={facility.title} />
                      <div className="facilitiespage-facility-overlay"><span><FaIcons.FaEye /> Xem chi tiết</span></div>
                    </div>
                    <div className="facilitiespage-facility-content">
                      <div className="facilitiespage-facility-icon"><Icon /></div>
                      <h3>{facility.title}</h3>
                      <p>{facility.description}</p>
                    </div>
                  </div>
                );
              })}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 5. Thư viện hình ảnh */}
      {facilitiesData.gallery && facilitiesData.gallery.length > 0 && (
        <section className="facilitiespage-section-container bg-light facilitiespage-animate-section" id="gallery">
          <div className="facilitiespage-container">
            <h2 className="facilitiespage-section-title">Thư viện hình ảnh</h2>
            <ScrollWrapper className="facilitiespage-gallery-grid">
              {facilitiesData.gallery.map((item, index) => (
                <div key={index} className="facilitiespage-gallery-item" onClick={() => setSelectedImage(item.url)}>
                  <img src={item.url} alt={item.title} />
                  <div className="facilitiespage-gallery-caption">{item.title}</div>
                </div>
              ))}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="facilitiespage-image-modal" onClick={() => setSelectedImage(null)}>
          <div className="facilitiespage-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Preview" />
            <button className="facilitiespage-modal-close" onClick={() => setSelectedImage(null)}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesPage;
/* * Tệp: EquipmentPage.js
 * Mô tả: Trang "Trang thiết bị y tế" - ĐÃ FIX LỖI HIGHLIGHT TẤT CẢ DANH MỤC
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './EquipmentPage.css';

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
    setTimeout(checkScroll, 2000); 
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

const EquipmentPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [equipmentData, setEquipmentData] = useState({
    banner: {},
    stats: [],
    categories: [],
    equipment: [],
    quality: []
  });
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchEquipmentData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/settings/equipment`);
        if (response.data) {
          setEquipmentData(response.data);
          setError(null);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu trang thiết bị:', error);
        setError('Không thể tải thông tin trang thiết bị. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipmentData();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.equipmentpage-animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  // LOGIC BỘ LỌC ĐÃ SỬA: Chuẩn hóa kiểu dữ liệu
  const safeActiveCat = String(activeCategory).trim();
  const filteredEquipment = safeActiveCat === 'all' 
    ? (equipmentData.equipment || [])
    : (equipmentData.equipment || []).filter(item => {
        // Hỗ trợ lọc cả theo id hoặc name từ database
        const itemCat = String(item.category || item.category_id || '').trim();
        return itemCat === safeActiveCat;
      });

  if (loading) {
    return (
      <div className="equipmentpage-page">
        <section className="equipmentpage-hero">
          <div className="equipmentpage-container"><p>Đang tải dữ liệu...</p></div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="equipmentpage-page">
        <section className="equipmentpage-hero">
          <div className="equipmentpage-container"><p className="equipmentpage-error-text">{error}</p></div>
        </section>
      </div>
    );
  }

  return (
    <div className="equipmentpage-page">
      
      {/* 1. Banner Full Màn Hình */}
      <section className="equipmentpage-hero"
        style={{ 
          background: equipmentData.banner?.image 
            ? `linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(46, 125, 50, 0.8) 100%), url(${equipmentData.banner.image})` 
            : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
        <div className="equipmentpage-container">
          <div className="equipmentpage-hero-badge">
            <FaIcons.FaMicroscope />
            <span>Trang thiết bị hiện đại</span>
          </div>
          <h1>{equipmentData.banner?.title || 'Trang Thiết Bị Y Tế'}</h1>
          <p className="equipmentpage-hero-subtitle">
            {equipmentData.banner?.subtitle || equipmentData.banner?.description || 
              'Đầu tư trang thiết bị hiện đại từ các thương hiệu hàng đầu thế giới, đảm bảo chẩn đoán và điều trị chính xác, hiệu quả.'}
          </p>
        </div>
      </section>

      {/* 2. Thống kê */}
      {equipmentData.stats && equipmentData.stats.length > 0 && (
        <section className="equipmentpage-stats-top equipmentpage-animate-section" id="stats">
          <div className="equipmentpage-container">
            <div className="equipmentpage-stats-wrap-grid">
              {equipmentData.stats.map((stat, index) => (
                <div key={index} className="equipmentpage-stat-item-top">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Gộp chung Danh mục & Danh sách thiết bị */}
      <section className="equipmentpage-section-container bg-light equipmentpage-animate-section" id="equipment">
        <div className="equipmentpage-container">
          <h2 className="equipmentpage-section-title">Danh sách thiết bị</h2>
          
          {/* Bộ lọc danh mục */}
          {equipmentData.categories && equipmentData.categories.length > 0 && (
            <ScrollWrapper className="equipmentpage-categories-filter">
              <button
                className={`equipmentpage-category-btn ${safeActiveCat === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                <FaIcons.FaThLarge />
                <span>Tất cả</span>
              </button>
              {equipmentData.categories.map((cat, index) => {
                const Icon = iconMap[cat.icon] || iconMap.FaStethoscope;
                
                // ĐÃ SỬA: Nếu không có id, dùng name làm định danh để không bị trùng lặp ""
                const catIdentifier = String(cat.id || cat.name || index).trim();
                
                return (
                  <button
                    key={catIdentifier}
                    className={`equipmentpage-category-btn ${safeActiveCat === catIdentifier ? 'active' : ''}`}
                    onClick={() => setActiveCategory(catIdentifier)}
                  >
                    <Icon />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </ScrollWrapper>
          )}

          {/* Danh sách thiết bị */}
          {filteredEquipment && filteredEquipment.length > 0 ? (
            <ScrollWrapper key={safeActiveCat} className="equipmentpage-equipment-grid">
              {filteredEquipment.map((item, index) => {
                const imageUrl = item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage%3C/text%3E%3C/svg%3E';
                
                // ĐẢM BẢO KEY DUY NHẤT ĐỂ RENDER ĐÚNG ẢNH SAU KHI LỌC
                const uniqueKey = item.name ? `${item.name}-${index}` : index;
                
                return (
                  <div key={uniqueKey} className="equipmentpage-equipment-card">
                    <div className="equipmentpage-equipment-image" onClick={() => setSelectedImage(imageUrl)}>
                      <img 
                        src={imageUrl} 
                        alt={item.alt || item.name} 
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                      />
                      <div className="equipmentpage-equipment-overlay">
                        <span><FaIcons.FaEye /> Xem chi tiết</span>
                      </div>
                      {item.year && (
                        <div className="equipmentpage-equipment-badge">{item.year}</div>
                      )}
                    </div>
                    
                    <div className="equipmentpage-equipment-content">
                      <h3>{item.name}</h3>
                      
                      {(item.brand || item.origin) && (
                        <div className="equipmentpage-equipment-meta">
                          {item.brand && <span className="equipmentpage-brand">Hãng: {item.brand}</span>}
                          {item.origin && <span className="equipmentpage-origin">Xuất xứ: {item.origin}</span>}
                        </div>
                      )}

                      {item.features && Array.isArray(item.features) && item.features.length > 0 && (
                        <div className="equipmentpage-equipment-features">
                          <h4>Tính năng nổi bật:</h4>
                          <ul>
                            {item.features.map((feature, idx) => (
                              <li key={idx}><FaIcons.FaCheckCircle className="check-icon"/> {feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.applications && Array.isArray(item.applications) && item.applications.length > 0 && (
                        <div className="equipmentpage-equipment-applications">
                          <h4>Ứng dụng:</h4>
                          <div className="equipmentpage-application-tags">
                            {item.applications.map((app, idx) => (
                              <span key={idx} className="equipmentpage-app-tag">{app}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </ScrollWrapper>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <FaIcons.FaInfoCircle style={{ fontSize: '2rem', color: '#4CAF50', marginBottom: '10px' }} />
              <p>Không có thiết bị nào thuộc danh mục này.</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Cam kết chất lượng */}
      {equipmentData.quality && equipmentData.quality.length > 0 && (
        <section className="equipmentpage-section-container equipmentpage-animate-section" id="quality">
          <div className="equipmentpage-container">
            <h2 className="equipmentpage-section-title">Cam kết chất lượng</h2>
            <ScrollWrapper className="equipmentpage-quality-grid">
              {equipmentData.quality.map((item, index) => (
                <div key={index} className="equipmentpage-quality-card">
                  <div className="equipmentpage-quality-icon"><FaIcons.FaShieldAlt /></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 5. CTA */}
      <section className="equipmentpage-section-container equipmentpage-equipment-cta">
        <div className="equipmentpage-container">
          <h2>Trải nghiệm dịch vụ</h2>
          <p>Đặt lịch khám ngay hôm nay để được sử dụng các trang thiết bị hiện đại nhất</p>
          <button 
            className="equipmentpage-btn-primary" 
            onClick={() => window.location.href = '/book-appointment'}
          >
            <FaIcons.FaCalendarAlt style={{ marginRight: '8px' }}/> Đặt lịch khám
          </button>
        </div>
      </section>

      {/* Image Modal (Phóng to ảnh) */}
      {selectedImage && (
        <div className="equipmentpage-image-modal" onClick={() => setSelectedImage(null)}>
          <div className="equipmentpage-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Preview" />
            <button className="equipmentpage-modal-close" onClick={() => setSelectedImage(null)}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentPage;
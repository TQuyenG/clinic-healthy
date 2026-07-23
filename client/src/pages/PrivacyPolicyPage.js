/* * Tệp: PrivacyPolicyPage.js
 * Mô tả: Trang Chính sách bảo mật đồng bộ UI/UX (Xanh dịu, Banner 100vh, Lướt ngang, Card nhỏ cuộn trong)
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './PrivacyPolicyPage.css';

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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const PrivacyPolicyPage = () => {
  const [privacyData, setPrivacyData] = useState({
    hero: { title: '', subtitle: '', last_updated: '' },
    sections: [],
    contact_email: '',
    contact_phone: '',
    contact_address: ''
  });
  const [loading, setLoading] = useState(true);
  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchPrivacyData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/privacy`);
        if (response.data) {
          setPrivacyData(response.data);
        }
      } catch (error) {
        console.error('Error fetching privacy data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyData();
  }, []);

  if (loading) {
    return (
      <div className="privacy-policy-page">
        <section className="privacy-hero">
          <div className="privacy-container"><p>Đang tải dữ liệu...</p></div>
        </section>
      </div>
    );
  }

  return (
    <div className="privacy-policy-page">
      {/* 1. Hero Banner Full Màn Hình */}
      <section className="privacy-hero">
        <div className="privacy-container">
          <div className="privacy-hero-badge">
            <FaIcons.FaShieldAlt />
            <span>Cam kết bảo mật</span>
          </div>
          <h1>{privacyData.hero?.title || 'Chính sách bảo mật'}</h1>
          <p className="privacy-hero-subtitle">
            {privacyData.hero?.subtitle || 'Chúng tôi cam kết bảo vệ quyền riêng tư và bảo mật thông tin cá nhân của bạn.'}
          </p>
          {privacyData.hero?.last_updated && (
            <p className="privacy-last-updated">Cập nhật lần cuối: {privacyData.hero.last_updated}</p>
          )}
        </div>
      </section>

      {/* 2. Nội dung chính sách (Lướt ngang) */}
      {privacyData.sections && privacyData.sections.length > 0 && (
        <section className="privacy-section-container">
          <div className="privacy-container">
            <h2 className="privacy-section-title">Nội dung chính sách</h2>
            <ScrollWrapper className="privacy-sections-grid">
              {privacyData.sections.map((section, index) => {
                const Icon = iconMap[section.icon] || FaIcons.FaDatabase;
                return (
                  <div key={index} className="privacy-section-card">
                    <div className="privacy-card-header">
                      <Icon className="privacy-card-icon" />
                      <h2>{section.title}</h2>
                    </div>
                    <div className="privacy-card-content">
                      {section.items && section.items.map((item, idx) => (
                        <div key={idx} className="privacy-item">
                          <h3>{item.subtitle}</h3>
                          <p>{item.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </ScrollWrapper>
          </div>
        </section>
      )}

      {/* 3. Liên hệ & Cập nhật */}
      <section className="privacy-section-container bg-light">
        <div className="privacy-container">
          <div className="privacy-footer-grid">
            
            {/* Hộp liên hệ */}
            <div className="privacy-contact-box">
              <FaIcons.FaHeadset className="privacy-contact-icon" />
              <h2>Liên hệ với chúng tôi</h2>
              <p>Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật, vui lòng liên hệ:</p>
              <div className="privacy-contact-info">
                {privacyData.contact_email && (
                  <div className="privacy-contact-item">
                    <FaIcons.FaEnvelope />
                    <span><strong>Email:</strong> <a href={`mailto:${privacyData.contact_email}`}>{privacyData.contact_email}</a></span>
                  </div>
                )}
                {privacyData.contact_phone && (
                  <div className="privacy-contact-item">
                    <FaIcons.FaPhone />
                    <span><strong>Điện thoại:</strong> <a href={`tel:${privacyData.contact_phone}`}>{privacyData.contact_phone}</a></span>
                  </div>
                )}
                {privacyData.contact_address && (
                  <div className="privacy-contact-item">
                    <FaIcons.FaMapMarkerAlt />
                    <span><strong>Địa chỉ:</strong> {privacyData.contact_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thông báo cập nhật */}
            <div className="privacy-updates-box">
              <FaIcons.FaExclamationTriangle className="privacy-updates-icon" />
              <div>
                <h3>Thông báo về cập nhật</h3>
                <p>
                  Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian. 
                  Chúng tôi sẽ thông báo cho bạn về các thay đổi quan trọng qua email 
                  hoặc thông báo trên website. Vui lòng xem lại chính sách định kỳ.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
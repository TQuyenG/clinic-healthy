/* * Tệp: TermsPage.js
 * Mô tả: Trang Điều khoản dịch vụ đồng bộ UI/UX (Xanh dịu, Banner 100vh, Lướt ngang, Card nhỏ cuộn trong)
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './TermsPage.css';

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

const TermsPage = () => {
  const [termsData, setTermsData] = useState({
    hero: { title: '', subtitle: '', effective_date: '' },
    intro: { title: '', content: '' },
    sections: [],
    contact_email: '',
    contact_phone: ''
  });
  const [loading, setLoading] = useState(true);
  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchTermsData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/terms`);
        if (response.data) {
          setTermsData(response.data);
        }
      } catch (error) {
        console.error('Error fetching terms data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTermsData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleAgree = () => {
    alert('Cảm ơn bạn đã đồng ý với điều khoản dịch vụ của chúng tôi!');
  };

  if (loading) {
    return (
      <div className="terms-page">
        <section className="terms-hero">
          <div className="terms-container"><p>Đang tải dữ liệu...</p></div>
        </section>
      </div>
    );
  }

  return (
    <div className="terms-page">
      {/* 1. Hero Banner Full Màn Hình */}
      <section className="terms-hero">
        <div className="terms-container">
          <div className="terms-hero-badge">
            <FaIcons.FaFileContract />
            <span>Cam kết dịch vụ</span>
          </div>
          <h1>{termsData.hero?.title || 'Điều khoản dịch vụ'}</h1>
          <p className="terms-hero-subtitle">
            {termsData.hero?.subtitle || 'Vui lòng đọc kỹ các điều khoản trước khi sử dụng dịch vụ của chúng tôi.'}
          </p>
          {termsData.hero?.effective_date && (
            <p className="terms-last-updated">Ngày có hiệu lực: {termsData.hero.effective_date}</p>
          )}
        </div>
      </section>

      {/* 2. Giới thiệu (Văn bản ngang) */}
      {termsData.intro && termsData.intro.title && (
        <section className="terms-section-container">
          <div className="terms-container">
            <div className="terms-intro-box">
              <FaIcons.FaInfoCircle className="terms-intro-icon" />
              <h2>{termsData.intro.title}</h2>
              <p>{termsData.intro.content}</p>
            </div>
          </div>
        </section>
      )}

      {/* 3. Nội dung các điều khoản (Lướt ngang) */}
      {termsData.sections && termsData.sections.length > 0 && (
        <section className="terms-section-container bg-light">
          <div className="terms-container">
            <h2 className="terms-section-title">Chi tiết điều khoản</h2>
            <ScrollWrapper className="terms-sections-grid">
              {termsData.sections.map((section, index) => {
                const Icon = iconMap[section.icon] || FaIcons.FaGavel;
                return (
                  <div key={index} className="terms-section-card">
                    <div className="terms-card-header">
                      <Icon className="terms-card-icon" />
                      <h2>{section.title}</h2>
                    </div>
                    <div className="terms-card-content">
                      {section.items && section.items.map((item, idx) => (
                        <div key={idx} className="terms-item">
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

      {/* 4. Chấp nhận điều khoản & Liên hệ */}
      <section className="terms-section-container">
        <div className="terms-container">
          <div className="terms-footer-grid">
            
            {/* Box Chấp nhận */}
            <div className="terms-acceptance-box">
              <FaIcons.FaUserCheck className="terms-acceptance-icon" />
              <h2>Chấp nhận điều khoản</h2>
              <p>
                Bằng việc tạo tài khoản hoặc sử dụng bất kỳ dịch vụ nào của chúng tôi, 
                bạn xác nhận rằng đã đọc, hiểu và đồng ý với tất cả các điều khoản nêu trên.
              </p>
              <div className="terms-acceptance-buttons">
                <button className="terms-btn-primary" onClick={handleAgree}>
                  <FaIcons.FaCheck style={{marginRight: '6px'}}/> Tôi đồng ý
                </button>
                <button className="terms-btn-outline" onClick={handlePrint}>
                  <FaIcons.FaPrint style={{marginRight: '6px'}}/> In điều khoản
                </button>
              </div>
            </div>

            {/* Box Liên hệ hỗ trợ */}
            <div className="terms-contact-box">
              <FaIcons.FaHeadset className="terms-contact-icon" />
              <h2>Cần hỗ trợ?</h2>
              <p>Nếu bạn có bất kỳ thắc mắc nào về điều khoản dịch vụ, vui lòng liên hệ trực tiếp với đội ngũ hỗ trợ pháp lý của chúng tôi.</p>
              <div className="terms-contact-info">
                {termsData.contact_email && (
                  <div className="terms-contact-item">
                    <FaIcons.FaEnvelope />
                    <span><strong>Email:</strong> <a href={`mailto:${termsData.contact_email}`}>{termsData.contact_email}</a></span>
                  </div>
                )}
                {termsData.contact_phone && (
                  <div className="terms-contact-item">
                    <FaIcons.FaPhone />
                    <span><strong>Tổng đài:</strong> <a href={`tel:${termsData.contact_phone}`}>{termsData.contact_phone}</a></span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
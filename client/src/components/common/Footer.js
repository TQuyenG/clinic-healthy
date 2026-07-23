// client/src/components/common/Footer.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaYoutube,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaClock,
  FaHeart,
  FaChevronDown
} from 'react-icons/fa';
import axios from 'axios';
import './Footer.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [expandedSections, setExpandedSections] = useState({
    links: false,
    contact: false,
    services: false
  });
  
  const [footerData, setFooterData] = useState({
    about_title: 'Easy Medify',
    about_description: 'Hệ thống y tế hàng đầu, mang đến dịch vụ chăm sóc sức khỏe chất lượng cao.',
    address: '123 Đường Sức Khỏe, Q.1, TP.HCM',
    hotline: '1900 1234',
    email: 'contact@easymedify.vn',
    working_hours: 'T2 - T7: 7:00 - 20:00\nChủ nhật: 8:00 - 17:00',
    social_facebook: '',
    social_twitter: '',
    social_instagram: '',
    social_youtube: '',
    copyright_text: 'Easy Medify. Tất cả quyền được bảo lưu.',
    privacy_link: '/privacy-policy',
    terms_link: '/terms'
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/header-nav-footer`);
        if (response.data && response.data.footer) {
          setFooterData(response.data.footer);
        }
      } catch (error) {
        console.error('Error fetching footer data:', error);
      }
    };

    fetchFooterData();
  }, []);

  return (
    <footer className="footer-component">
      <div className="footer-component__container">
        {/* Về chúng tôi */}
        <div className="footer-component__section">
          <h3 className="footer-component__title">{footerData.about_title}</h3>
          <p className="footer-component__description">
            {footerData.about_description}
          </p>
          <div className="footer-component__social-links">
            {footerData.social_facebook && (
              <a 
                href={footerData.social_facebook} 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Facebook"
                className="footer-component__social-link"
              >
                <FaFacebook />
              </a>
            )}
            {footerData.social_twitter && (
              <a 
                href={footerData.social_twitter} 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Twitter"
                className="footer-component__social-link"
              >
                <FaTwitter />
              </a>
            )}
            {footerData.social_instagram && (
              <a 
                href={footerData.social_instagram} 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Instagram"
                className="footer-component__social-link"
              >
                <FaInstagram />
              </a>
            )}
            {footerData.social_youtube && (
              <a 
                href={footerData.social_youtube} 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="YouTube"
                className="footer-component__social-link"
              >
                <FaYoutube />
              </a>
            )}
          </div>
        </div>

        {/* Liên kết nhanh */}
        <div className="footer-component__section footer-component__section--collapsible">
          <h3 
            className="footer-component__title footer-component__title--collapsible"
            onClick={() => toggleSection('links')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleSection('links')}
          >
            <span>Liên kết nhanh</span>
            <span className={`footer-component__toggle-icon ${expandedSections.links ? 'expanded' : ''}`}>
              <FaChevronDown />
            </span>
          </h3>
          <ul className={`footer-component__links ${expandedSections.links ? 'expanded' : ''}`}>
            <li className="footer-component__links-item">
              <Link to="/about" className="footer-component__link">Giới thiệu</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/services" className="footer-component__link">Dịch vụ</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/doctors" className="footer-component__link">Đội ngũ bác sĩ</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/articles" className="footer-component__link">Cẩm nang y tế</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/book-appointment" className="footer-component__link">Đặt lịch khám</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/contact" className="footer-component__link">Liên hệ</Link>
            </li>
          </ul>
        </div>

        {/* Thông tin liên hệ */}
        <div className="footer-component__section footer-component__section--collapsible">
          <h3 
            className="footer-component__title footer-component__title--collapsible"
            onClick={() => toggleSection('contact')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleSection('contact')}
          >
            <span>Thông tin liên hệ</span>
            <span className={`footer-component__toggle-icon ${expandedSections.contact ? 'expanded' : ''}`}>
              <FaChevronDown />
            </span>
          </h3>
          <ul className={`footer-component__contact-info ${expandedSections.contact ? 'expanded' : ''}`}>
            <li className="footer-component__contact-item">
              <FaMapMarkerAlt className="footer-component__contact-icon" />
              <span>{footerData.address}</span>
            </li>
            <li className="footer-component__contact-item">
              <FaPhone className="footer-component__contact-icon" />
              <span>Hotline: {footerData.hotline}</span>
            </li>
            <li className="footer-component__contact-item">
              <FaEnvelope className="footer-component__contact-icon" />
              <span>{footerData.email}</span>
            </li>
            <li className="footer-component__contact-item">
              <FaClock className="footer-component__contact-icon" />
              <span style={{ whiteSpace: 'pre-line' }}>{footerData.working_hours}</span>
            </li>
          </ul>
        </div>

        {/* Dịch vụ */}
        <div className="footer-component__section footer-component__section--collapsible">
          <h3 
            className="footer-component__title footer-component__title--collapsible"
            onClick={() => toggleSection('services')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleSection('services')}
          >
            <span>Dịch vụ nổi bật</span>
            <span className={`footer-component__toggle-icon ${expandedSections.services ? 'expanded' : ''}`}>
              <FaChevronDown />
            </span>
          </h3>
          <ul className={`footer-component__links ${expandedSections.services ? 'expanded' : ''}`}>
            <li className="footer-component__links-item">
              <Link to="/specialties/noi-khoa" className="footer-component__link">Nội khoa</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/specialties/nhi-khoa" className="footer-component__link">Nhi khoa</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/specialties/san-phu-khoa" className="footer-component__link">Sản phụ khoa</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/specialties/rang-ham-mat" className="footer-component__link">Răng hàm mặt</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/specialties/tai-mui-hong" className="footer-component__link">Tai mũi họng</Link>
            </li>
            <li className="footer-component__links-item">
              <Link to="/emergency" className="footer-component__link">Cấp cứu 24/7</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-component__bottom">
        <div className="footer-component__bottom-container">
          <p className="footer-component__copyright">
            <span>© {currentYear} {footerData.copyright_text}</span>
            <span className="footer-component__divider">|</span>
            <Link to={footerData.privacy_link} className="footer-component__copyright-link">
              Chính sách bảo mật
            </Link>
            <span className="footer-component__divider">|</span>
            <Link to={footerData.terms_link} className="footer-component__copyright-link">
              Điều khoản sử dụng
            </Link>
          </p>
          <p className="footer-component__made-with-love">
            Được phát triển với <FaHeart className="footer-component__heart-icon" /> tại Việt Nam
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
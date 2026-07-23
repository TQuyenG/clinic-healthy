/* 
 * Tệp: SystemSettingsPage.js - PHẦN 1: SETUP & TAB HOME
 * Mô tả: Import, setup, Toast, IconPicker, và toàn bộ TAB HOME đầy đủ
 * 
 * Cập nhật: 
 * - Loại bỏ header dính cứng (không còn top: 60px, sidebar bắt đầu từ top: 0).
 * - Di chuyển sidebar sang bên phải màn hình (right: 0 thay vì left: 0).
 * - Sidebar thu gọn khi không hover (width: var(--sidebar-width-closed)), mở rộng khi hover (width: var(--sidebar-width-open)).
 * - Sidebar chỉ chứa: Header (title và icon), Actions (Lưu tất cả và Export), và TabList (các tab xếp dọc).
 * - Các TabPanel (nội dung chính của từng tab) được di chuyển ra ngoài sidebar, vào phần main-content để tránh bị ẩn khi sidebar thu gọn.
 * - Container điều chỉnh padding-right để chừa chỗ cho sidebar thu gọn (padding: 20px 80px 40px 20px;).
 * - Sửa lỗi "bị nhầm sidebar cho hết content tab nên không hiện gì cả" bằng cách tách TabPanel ra ngoài.
 * - Sidebar hoạt động như floating panel (fixed, luôn giữ vị trí, mở rộng khi hover giống popup hoặc bong bóng chat).
 * - Không còn header dính trên cùng; tất cả nội dung nằm trong body bình thường.
 */

/* 
 * File: SystemSettingsPage.js - CẬP NHẬT VỚI CÁC TAB MỚI
 * Mô tả: Quản lý nội dung hệ thống với 9 tabs
 * Tabs: Home, About, Facilities, Equipment, Header/Nav/Footer, Contact, Privacy, Terms
 */

import React, { useState, useEffect, useRef } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import axios from 'axios';
import { FaSave, FaTrash, FaPlus, FaSpinner, FaChevronDown, FaChevronUp, FaTimes, FaDownload, FaFileExcel, FaFileCsv, FaCheckCircle, FaExclamationCircle, FaHome, FaInfoCircle, FaBuilding, FaTools, FaCog, FaBars, FaEnvelope, FaShieldAlt, FaFileContract, FaPhone, FaClock, FaMapMarkerAlt, FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLink, FaDatabase, FaUserCheck, FaUserShield, FaLock, FaComments, FaHistory, FaFilter, FaSearch, FaStethoscope } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as FiIcons from 'react-icons/fi';
import * as AiIcons from 'react-icons/ai';
import * as BsIcons from 'react-icons/bs';
import * as BiIcons from 'react-icons/bi';
import * as GiIcons from 'react-icons/gi';
import * as HiIcons from 'react-icons/hi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as TbIcons from 'react-icons/tb';
import * as XLSX from 'xlsx';
import SystemAuditTab from '../components/SystemAuditTab';
import usePermissions from '../hooks/usePermissions';
import 'react-tabs/style/react-tabs.css';
import './SystemSettingsPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Danh sách icon - MỞ RỘNG với nhiều thư viện
const iconLibraries = [
  { name: 'Font Awesome', prefix: 'Fa', icons: FaIcons },
  { name: 'Material Design', prefix: 'Md', icons: MdIcons },
  { name: 'Feather', prefix: 'Fi', icons: FiIcons },
  { name: 'Ant Design', prefix: 'Ai', icons: AiIcons },
  { name: 'Bootstrap', prefix: 'Bs', icons: BsIcons },
  { name: 'BoxIcons', prefix: 'Bi', icons: BiIcons },
  { name: 'Game Icons', prefix: 'Gi', icons: GiIcons },
  { name: 'Heroicons', prefix: 'Hi', icons: HiIcons },
  { name: 'Ionicons', prefix: 'Io', icons: IoIcons },
  { name: 'Remix Icon', prefix: 'Ri', icons: RiIcons },
  { name: 'Tabler Icons', prefix: 'Tb', icons: TbIcons }
];

const iconList = iconLibraries.flatMap(lib => 
  Object.keys(lib.icons)
    .filter(key => key.startsWith(lib.prefix) && typeof lib.icons[key] === 'function')
    .slice(0, 50) // Giới hạn mỗi thư viện 50 icons để tránh quá nhiều
    .map(icon => ({ name: icon, library: lib.name }))
);

const iconMap = {
  ...FaIcons,
  ...MdIcons,
  ...FiIcons,
  ...AiIcons,
  ...BsIcons,
  ...BiIcons,
  ...GiIcons,
  ...HiIcons,
  ...IoIcons,
  ...RiIcons,
  ...TbIcons
};

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`sys-settings-toast sys-settings-toast-${type}`}>
      {type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
      <span>{message}</span>
      <button onClick={onClose} className="sys-settings-toast-close">
        <FaTimes />
      </button>
    </div>
  );
};

// Custom Icon Picker Component
const CustomIconPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLibrary, setSelectedLibrary] = useState('all');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredIcons = iconList.filter(icon => {
    const matchSearch = icon.name.toLowerCase().includes(search.toLowerCase());
    const matchLibrary = selectedLibrary === 'all' || icon.library === selectedLibrary;
    return matchSearch && matchLibrary;
  });

  const handleSelectIcon = (iconName) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="sys-settings-icon-picker" ref={pickerRef}>
      <button type="button" className="sys-settings-btn sys-settings-btn-secondary-sm" onClick={() => setIsOpen(!isOpen)}>
        {value && iconMap[value] ? (
          <>
            {React.createElement(iconMap[value], { size: 16 })} {value}
          </>
        ) : (
          'Chọn Icon'
        )}
      </button>
      {isOpen && (
        <div className="sys-settings-icon-picker-modal" onClick={(e) => e.stopPropagation()}>
          <div style={{ marginBottom: '12px' }}>
            <input 
              type="text" 
              placeholder="Tìm icon..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="sys-settings-input" 
              onClick={(e) => e.stopPropagation()} 
              style={{ marginBottom: '8px' }}
            />
            <select 
              value={selectedLibrary} 
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className="sys-settings-select"
              style={{ marginBottom: '8px' }}
            >
              <option value="all">Tất cả thư viện</option>
              {iconLibraries.map(lib => (
                <option key={lib.name} value={lib.name}>{lib.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {filteredIcons.length} icons
            </span>
            <button type="button" className="sys-settings-btn sys-settings-btn-danger-sm" onClick={() => setIsOpen(false)} style={{ marginLeft: '8px' }}>
              <FaTimes />
            </button>
          </div>
          <div className="sys-settings-icon-picker-grid">
            {filteredIcons.slice(0, 50).map((icon, index) => (
              <div key={index} className="sys-settings-icon-picker-item" onClick={() => handleSelectIcon(icon.name)} title={icon.name}>
                {React.createElement(iconMap[icon.name], { size: 18 })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple textarea wrapper - no toolbar, just plain textarea
const RichTextArea = ({ value, onChange, placeholder, rows = 5 }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="sys-settings-textarea"
    />
  );
};

// Main Component
const SystemSettingsPage = () => {
  // Default data structures
  const defaultHomeData = {
    bannerSlides: [],
    features: [],
    aboutSection: { 
      image: '', alt: '', title: '', yearsExperience: '', highlights: [],
      buttonText: 'Xem thêm', buttonLink: '/about'
    },
    testimonials: [],
    bookingSection: {
      title: 'Đặt lịch khám bệnh', description: '', features: [],
      hotline: '1900 xxxx', email: 'contact@easymedify.vn', address: '123 Đường ABC, TP.HCM'
    }
  };

  const defaultAboutData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    mission: { image: '', alt: '', icon: 'FaLeaf', title: '', description: '' },
    vision: { image: '', alt: '', icon: 'FaHeartbeat', title: '', description: '' },
    milestones: [], stats: [], values: [], leadership: [], achievements: [], facilities: []
  };

  const defaultFacilitiesData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    amenities: [], facilities: [], gallery: [], stats: []
  };

  const defaultEquipmentData = {
    banner: { image: '', alt: '', title: '', subtitle: '', description: '' },
    stats: [], categories: [], equipment: [], quality: []
  };

  const defaultHeaderNavFooterData = {
    header: {
      phone: '1900 1234',
      email: 'contact@easymedify.vn',
      working_hours: 'T2-T7: 7:00-20:00 | CN: 8:00-17:00',
      welcome_text: 'Chào mừng bạn đến với Easy Medify'
    },
    navbar: {
      logo_image: '',
      logo_text: 'Easy Medify',
      search_placeholder: 'Tìm kiếm...'
    },
    footer: {
      about_title: 'Easy Medify',
      about_description: 'Hệ thống y tế hàng đầu, mang đến dịch vụ chăm sóc sức khỏe chất lượng cao với đội ngũ bác sĩ giàu kinh nghiệm và trang thiết bị hiện đại.',
      address: '123 Đường Sức Khỏe, Q.1, TP.HCM',
      hotline: '1900 1234',
      email: 'contact@easymedify.vn',
      working_hours: 'T2 - T7: 7:00 - 20:00\nChủ nhật: 8:00 - 17:00',
      social_facebook: 'https://facebook.com',
      social_twitter: 'https://twitter.com',
      social_instagram: 'https://instagram.com',
      social_youtube: 'https://youtube.com',
      copyright_text: 'Easy Medify. Tất cả quyền được bảo lưu.',
      privacy_link: '/privacy',
      terms_link: '/terms'
    }
  };

  const defaultContactData = {
    hero: {
      title: 'Liên hệ với chúng tôi',
      subtitle: 'Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn',
      background_image: '',
      banner_images: [],
      banner_color: '',
      banner_interval: 4000
    },
    info_cards: [
      { icon: 'FaPhone', title: 'Điện thoại', details: ['Hotline: (028) 3822 1234', 'Cấp cứu: (028) 3822 9999'], color: '#4CAF50' },
      { icon: 'FaEnvelope', title: 'Email', details: ['info@easymedify.vn', 'support@easymedify.vn'], color: '#2196F3' },
      { icon: 'FaMapMarkerAlt', title: 'Địa chỉ', details: ['123 Nguyễn Huệ', 'Quận 1, TP.HCM'], color: '#FF5722' },
      { icon: 'FaClock', title: 'Giờ làm việc', details: ['Thứ 2 - Thứ 7: 7:00 - 20:00', 'Chủ nhật: 8:00 - 17:00'], color: '#9C27B0' }
    ],
    departments: [
      { name: 'Khoa Nội', phone: '(028) 3822 1235' },
      { name: 'Khoa Ngoại', phone: '(028) 3822 1236' }
    ],
    faqs: [
      { question: 'Làm thế nào để đặt lịch khám?', answer: 'Bạn có thể đặt lịch qua hotline, website, hoặc trực tiếp tại bệnh viện.' }
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=...',
    directions: ['🚇 Gần ga metro Bến Thành (300m)', '🚌 Các tuyến bus: 03, 14, 36, 93']
  };

  const defaultPrivacyData = {
    hero: {
      title: 'Chính sách bảo mật',
      subtitle: 'Chúng tôi cam kết bảo vệ quyền riêng tư và bảo mật thông tin cá nhân của bạn',
      last_updated: '06/10/2025'
    },
    sections: [
      {
        icon: 'FaDatabase',
        title: 'Thông tin chúng tôi thu thập',
        items: [
          { subtitle: 'Thông tin cá nhân', content: 'Họ và tên, ngày tháng năm sinh, giới tính, số CMND/CCCD...' }
        ]
      }
    ],
    contact_email: 'privacy@easymedify.vn',
    contact_phone: '(028) 3822 1234',
    contact_address: '123 Nguyễn Huệ, Quận 1, TP.HCM'
  };

  const defaultTermsData = {
    hero: {
      title: 'Điều khoản dịch vụ',
      subtitle: 'Vui lòng đọc kỹ các điều khoản trước khi sử dụng dịch vụ của chúng tôi',
      effective_date: '01/01/2025'
    },
    intro: {
      title: 'Chào mừng đến với Phòng khám Đa khoa',
      content: 'Các điều khoản dịch vụ này điều chỉnh việc bạn sử dụng website và dịch vụ y tế của chúng tôi.'
    },
    sections: [],
    contact_email: 'legal@easymedify.vn',
    contact_phone: '(028) 3822 1234'
  };

  const defaultServicesPageData = {
    hospital_hero: {
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000',
      title: 'Dịch Vụ Y Tế Chuyên Sâu',
      subtitle: 'Trải nghiệm quy trình khám chữa bệnh hiện đại, tận tâm tại bệnh viện.'
    },
    consultation_hero: {
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000',
      title: 'Bác Sĩ Trực Tuyến 24/7',
      subtitle: 'Kết nối ngay với chuyên gia y tế qua Video / Chat — mọi lúc, mọi nơi.'
    },
    hero_stats: [
      { num: '500+', lbl: 'Bác sĩ' },
      { num: '200+', lbl: 'Dịch vụ' },
      { num: '50k+', lbl: 'Bệnh nhân' },
      { num: '4.9★', lbl: 'Đánh giá' }
    ],
    consultation_steps: [
      { num: '01', icon: 'FaUserPlus',      label: 'Chọn Bác sĩ',     desc: 'Tìm bác sĩ phù hợp với chuyên khoa và nhu cầu của bạn.' },
      { num: '02', icon: 'FaCalendarCheck', label: 'Đặt Lịch hẹn',    desc: 'Chọn khung giờ trống, xác nhận thông tin và thanh toán.' },
      { num: '03', icon: 'FaVideo',          label: 'Bắt đầu Tư vấn', desc: 'Tham gia phòng tư vấn qua Video hoặc Chat đúng giờ hẹn.' }
    ],
    why_choose: [
      { icon: 'FaUserMd',    title: '500+ Bác Sĩ Giỏi',  desc: 'Đội ngũ chuyên gia đầu ngành từ các bệnh viện lớn.', color: '#0ea5a4' },
      { icon: 'FaBolt',      title: 'Kết Nối Tức Thì',    desc: 'Không xếp hàng, kết nối bác sĩ chỉ sau vài giây.',  color: '#f39c12' },
      { icon: 'FaShieldAlt', title: 'Bảo Mật Tuyệt Đối', desc: 'Hồ sơ bệnh án được mã hóa chuẩn quốc tế.',          color: '#3b82f6' },
      { icon: 'FaWallet',    title: 'Chi Phí Hợp Lý',     desc: 'Tiết kiệm chi phí đi lại và thời gian chờ đợi.',    color: '#8b5cf6' }
    ],
    hospital_cta: { title: 'Cần hỗ trợ chọn dịch vụ?', subtitle: 'Đội ngũ tư vấn sẵn sàng giúp bạn 24/7.', phone: '1900 1234' },
    consultation_cta: { title: 'Sẵn sàng gặp bác sĩ ngay hôm nay?', subtitle: 'Đặt lịch chỉ mất 2 phút.' }
  };

  // State
  const [homeData, setHomeData] = useState(defaultHomeData);
  const [aboutData, setAboutData] = useState(defaultAboutData);
  const [facilitiesData, setFacilitiesData] = useState(defaultFacilitiesData);
  const [equipmentData, setEquipmentData] = useState(defaultEquipmentData);
  const [headerNavFooterData, setHeaderNavFooterData] = useState(defaultHeaderNavFooterData);
  const [contactData, setContactData] = useState(defaultContactData);

  // === UPLOAD ẢNH BANNER HELPER ===
  const [bannerUploading, setBannerUploading] = useState({});

  const uploadBannerImage = async (file, onSuccess, uploadKey) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Chỉ chấp nhận ảnh JPG, PNG, GIF, WEBP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File quá lớn! Giới hạn 10MB');
      return;
    }
    setBannerUploading(prev => ({ ...prev, [uploadKey]: true }));
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/upload/image`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        }
      );
      const data = await res.json();
      if (data.success && data.url) {
        onSuccess(data.url);
      } else {
        alert('Upload thất bại: ' + (data.message || 'Lỗi không xác định'));
      }
    } catch (err) {
      alert('Lỗi upload: ' + err.message);
    } finally {
      setBannerUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };
  const [privacyData, setPrivacyData] = useState(defaultPrivacyData);
  const [termsData, setTermsData] = useState(defaultTermsData);
  const [servicesPageData, setServicesPageData] = useState(defaultServicesPageData);
  
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [openSections, setOpenSections] = useState({
    home: { bannerSlides: true, features: true, aboutSection: true, testimonials: true, bookingSection: true },
    about: { banner: true, mission: true, milestones: true, stats: true, values: true, leadership: true, achievements: true, facilities: true },
    facilities: { banner: true, amenities: true, facilities: true, gallery: true, stats: true },
    equipment: { banner: true, stats: true, categories: true, equipment: true, quality: true },
    headerNavFooter: { header: true, navbar: true, footer: true },
    contact: { hero: true, info_cards: true, departments: true, faqs: true, map: true, social: true, branches: true },
    privacy: { hero: true, sections: true, contact: true },
    terms: { hero: true, intro: true, sections: true, contact: true },
    servicesPage: { hospital_hero: true, consultation_hero: true, hero_stats: true, consultation_steps: true, why_choose: true, cta: true }
  });
  const [imageOptions, setImageOptions] = useState({});

  // 🔐 Permissions - IT department can view all, but edit requires specific permissions
  const { isAdmin, hasPermission } = usePermissions();
  
  const canEditHome = isAdmin || hasPermission('system_settings', 'edit_home');
  const canEditAbout = isAdmin || hasPermission('system_settings', 'edit_about');
  const canEditFacilities = isAdmin || hasPermission('system_settings', 'edit_facilities');
  const canEditEquipment = isAdmin || hasPermission('system_settings', 'edit_equipment');
  const canEditHeaderFooter = isAdmin || hasPermission('system_settings', 'edit_header_footer');
  const canEditContact = isAdmin || hasPermission('system_settings', 'edit_contact');
  const canEditPrivacy = isAdmin || hasPermission('system_settings', 'edit_privacy');
  const canEditTerms = isAdmin || hasPermission('system_settings', 'edit_terms');
  const canEditServicesPage = isAdmin || hasPermission('system_settings', 'edit_services_page');
  const canViewAuditLogs = isAdmin || hasPermission('system_settings', 'view_audit_logs');

  // Toast Management
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Toggle Section
  const toggleSection = (tab, section) => {
    setOpenSections(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [section]: !prev[tab][section] }
    }));
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Vui lòng đăng nhập lại.');
        
        const headers = { Authorization: `Bearer ${token}` };
        const [homeRes, aboutRes, facilitiesRes, equipmentRes, headerNavFooterRes, contactRes, privacyRes, termsRes, servicesPageRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/settings/home`, { headers }),
          axios.get(`${API_BASE_URL}/settings/about`, { headers }),
          axios.get(`${API_BASE_URL}/settings/facilities`, { headers }),
          axios.get(`${API_BASE_URL}/settings/equipment`, { headers }),
          axios.get(`${API_BASE_URL}/settings/header-nav-footer`, { headers }),
          axios.get(`${API_BASE_URL}/settings/contact`, { headers }),
          axios.get(`${API_BASE_URL}/settings/privacy`, { headers }),
          axios.get(`${API_BASE_URL}/settings/terms`, { headers }),
          axios.get(`${API_BASE_URL}/settings/services_page`, { headers })
        ]);

        setHomeData({ ...defaultHomeData, ...(homeRes.data || {}) });
        setAboutData({ ...defaultAboutData, ...(aboutRes.data || {}) });
        setFacilitiesData({ ...defaultFacilitiesData, ...(facilitiesRes.data || {}) });
        setEquipmentData({ ...defaultEquipmentData, ...(equipmentRes.data || {}) });
        setHeaderNavFooterData({ ...defaultHeaderNavFooterData, ...(headerNavFooterRes.data || {}) });
        setContactData({ ...defaultContactData, ...(contactRes.data || {}) });
        setPrivacyData({ ...defaultPrivacyData, ...(privacyRes.data || {}) });
        setTermsData({ ...defaultTermsData, ...(termsRes.data || {}) });
        setServicesPageData({ ...defaultServicesPageData, ...(servicesPageRes.data || {}) });
        
        addToast('Tải dữ liệu thành công!', 'success');
      } catch (err) {
        addToast('Lỗi khi tải dữ liệu: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sticky Tab Bar on Scroll - Di chuyển lên 10px khi scroll
  useEffect(() => {
    const handleScroll = () => {
      const tabBar = document.querySelector('.sys-settings-tab-bar');
      if (tabBar) {
        if (window.scrollY > 10) {
          tabBar.classList.add('scrolled');
        } else {
          tabBar.classList.remove('scrolled');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Array Handlers
  const handleArrayChange = (setter, arrayKey, index, field, value) => {
    setter(prev => {
      const newArray = [...(prev[arrayKey] || [])];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayKey]: newArray };
    });
  };

  const addArrayItem = (setter, arrayKey, defaultItem) => {
    setter(prev => ({
      ...prev,
      [arrayKey]: [...(prev[arrayKey] || []), { ...defaultItem }]
    }));
  };

  const removeArrayItem = (setter, arrayKey, index) => {
    setter(prev => ({
      ...prev,
      [arrayKey]: (prev[arrayKey] || []).filter((_, i) => i !== index)
    }));
  };

  // Image Upload
  const handleArrayImageUpload = async (setter, arrayKey, index, field, file) => {
    if (!file) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      addToast('Vui lòng đăng nhập lại để upload ảnh.', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      const imageUrl = response.data.url;
      handleArrayChange(setter, arrayKey, index, field, imageUrl);
      addToast('Upload ảnh thành công!', 'success');
    } catch (err) {
      console.error('Upload error:', err);
      addToast('Lỗi upload ảnh: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleSingleImageUpload = async (setter, path, file) => {
    if (!file) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      addToast('Vui lòng đăng nhập lại để upload ảnh.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      const imageUrl = response.data.url;
      const keys = path.split('.');
      
      setter(prev => {
        const newData = { ...prev };
        let current = newData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = imageUrl;
        return newData;
      });
      
      addToast('Upload ảnh thành công!', 'success');
    } catch (err) {
      console.error('Upload error:', err);
      addToast('Lỗi upload ảnh: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleImageOptionChange = (key, option) => {
    setImageOptions(prev => ({ ...prev, [key]: option }));
  };

  // Save Data
  const saveData = async (endpoint, data, successMessage) => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Vui lòng đăng nhập lại.');
      
      await axios.put(`${API_BASE_URL}/settings/${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      addToast(successMessage, 'success');
    } catch (err) {
      addToast('Lỗi khi lưu dữ liệu: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export Functions
  const exportToJSON = (data, filename) => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast(`Xuất ${filename}.json thành công!`, 'success');
  };

  const exportToExcel = (data, filename) => {
    try {
      const wb = XLSX.utils.book_new();
      
      const flattenData = (obj, prefix = '') => {
        let result = {};
        for (let key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(result, flattenData(obj[key], `${prefix}${key}.`));
          } else if (Array.isArray(obj[key])) {
            result[`${prefix}${key}`] = JSON.stringify(obj[key]);
          } else {
            result[`${prefix}${key}`] = obj[key];
          }
        }
        return result;
      };

      const flatData = [flattenData(data)];
      const ws = XLSX.utils.json_to_sheet(flatData);
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}.xlsx`);
      addToast(`Xuất ${filename}.xlsx thành công!`, 'success');
    } catch (err) {
      addToast('Lỗi khi xuất Excel: ' + err.message, 'error');
    }
  };

  const exportToCSV = (data, filename) => {
    try {
      const flattenData = (obj, prefix = '') => {
        let result = {};
        for (let key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(result, flattenData(obj[key], `${prefix}${key}.`));
          } else if (Array.isArray(obj[key])) {
            result[`${prefix}${key}`] = JSON.stringify(obj[key]);
          } else {
            result[`${prefix}${key}`] = obj[key];
          }
        }
        return result;
      };

      const flatData = flattenData(data);
      const headers = Object.keys(flatData).join(',');
      const values = Object.values(flatData).map(v => `"${v}"`).join(',');
      const csv = `${headers}\n${values}`;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addToast(`Xuất ${filename}.csv thành công!`, 'success');
    } catch (err) {
      addToast('Lỗi khi xuất CSV: ' + err.message, 'error');
    }
  };

  const exportAllData = (format) => {
    const allData = {
      home: homeData,
      about: aboutData,
      facilities: facilitiesData,
      equipment: equipmentData,
      headerNavFooter: headerNavFooterData,
      contact: contactData,
      privacy: privacyData,
      terms: termsData,
      servicesPage: servicesPageData,
      exportedAt: new Date().toISOString()
    };

    const filename = `system_settings_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'json':
        exportToJSON(allData, filename);
        break;
      case 'excel':
        exportToExcel(allData, filename);
        break;
      case 'csv':
        exportToCSV(allData, filename);
        break;
      default:
        addToast('Định dạng không hợp lệ!', 'error');
    }
  };

  // Loading State
  if (loading && !homeData.bannerSlides) {
    return (
      <div className="sys-settings-loading">
        <FaSpinner className="sys-settings-spinner" /> Đang tải dữ liệu...
      </div>
    );
  }

  // Render
  return (
    <div className="sys-settings-container">
      {/* Toast Container */}
      <div className="sys-settings-toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>

      {/* Main Content */}
      <div className="sys-settings-main-content">
        <Tabs>
          {/* Header Section */}
          <div className="sys-settings-header">
            <div className="sys-settings-header-left">
              <div className="sys-settings-header-icon">
                <FaCog />
              </div>
              <h1 className="sys-settings-header-title">Cài đặt Hệ thống</h1>
            </div>
          </div>

          {/* Sticky Tab Bar */}
          <div className="sys-settings-tab-bar">
            <TabList className="sys-settings-tab-list-horizontal">
              {canEditHeaderFooter && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaBars />
                  <span>Header/Nav/Footer</span>
                </Tab>
              )}
              {canEditHome && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaHome />
                  <span>Home</span>
                </Tab>
              )}
              {canEditAbout && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaInfoCircle />
                  <span>About</span>
                </Tab>
              )}
              {canEditFacilities && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaBuilding />
                  <span>Facilities</span>
                </Tab>
              )}
              {canEditEquipment && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaTools />
                  <span>Equipment</span>
                </Tab>
              )}
              {canEditContact && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaEnvelope />
                  <span>Contact</span>
                </Tab>
              )}
              {canEditPrivacy && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaShieldAlt />
                  <span>Privacy</span>
                </Tab>
              )}
              {canEditTerms && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaFileContract />
                  <span>Terms</span>
                </Tab>
              )}
              
              {canEditServicesPage && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaStethoscope />
                  <span>Dịch vụ</span>
                </Tab>
              )}

              {/* Tab Lịch sử - CHỈ HIỂN THỊ NẾU CÓ QUYỀN */}
              {canViewAuditLogs && (
                <Tab className="sys-settings-tab-horizontal">
                  <FaHistory />
                  <span>Lịch sử</span>
                </Tab>
              )}
            </TabList>

            {/* Action Buttons - Bên phải thanh tab */}
            <div className="sys-settings-header-actions">
              <button 
                onClick={async () => {
                  await Promise.all([
                    saveData('home', homeData, 'Lưu Home thành công!'),
                    saveData('about', aboutData, 'Lưu About thành công!'),
                    saveData('facilities', facilitiesData, 'Lưu Facilities thành công!'),
                    saveData('equipment', equipmentData, 'Lưu Equipment thành công!'),
                    saveData('header-nav-footer', headerNavFooterData, 'Lưu Header/Nav/Footer thành công!'),
                    saveData('contact', contactData, 'Lưu Contact thành công!'),
                    saveData('privacy', privacyData, 'Lưu Privacy thành công!'),
                    saveData('terms', termsData, 'Lưu Terms thành công!'),
                    saveData('services_page', servicesPageData, 'Lưu Trang Dịch vụ thành công!')
                  ]);
                }}
                className="sys-settings-btn sys-settings-btn-primary"
                disabled={loading}
              >
                <FaSave /> Lưu Tất cả
              </button>

              <div className="sys-settings-export-dropdown">
                <button className="sys-settings-btn sys-settings-btn-secondary">
                  <FaDownload /> Xuất dữ liệu
                </button>
                <div className="sys-settings-export-menu">
                  <button onClick={() => exportAllData('json')}>
                    <FaFileCsv /> Xuất JSON
                  </button>
                  <button onClick={() => exportAllData('excel')}>
                    <FaFileExcel /> Xuất Excel
                  </button>
                  <button onClick={() => exportAllData('csv')}>
                    <FaFileCsv /> Xuất CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Panels Content */}
          <div className="sys-settings-content-area">

          {/* ==================== TAB HEADER/NAV/FOOTER ==================== */}
        {canEditHeaderFooter && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: HEADER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('headerNavFooter', 'header')}>
              <h3 className="sys-settings-section-title">1. Header</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('header-nav-footer', headerNavFooterData, 'Lưu Header thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.headerNavFooter.header ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.headerNavFooter.header && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Thông tin Header
                    </h4>

                    <label className="sys-settings-label">Số điện thoại Hotline</label>
                    <input type="text" value={headerNavFooterData.header?.phone || ''} placeholder="1900 1234"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        header: { ...prev.header, phone: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Email liên hệ</label>
                    <input type="email" value={headerNavFooterData.header?.email || ''} placeholder="contact@easymedify.vn"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        header: { ...prev.header, email: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Giờ làm việc</label>
                    <input type="text" value={headerNavFooterData.header?.working_hours || ''} placeholder="T2-T7: 7:00-20:00 | CN: 8:00-17:00"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        header: { ...prev.header, working_hours: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Text chào mừng (chạy)</label>
                    <input type="text" value={headerNavFooterData.header?.welcome_text || ''} placeholder="Chào mừng bạn đến với Easy Medify"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        header: { ...prev.header, welcome_text: e.target.value }
                      }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: NAVBAR */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('headerNavFooter', 'navbar')}>
              <h3 className="sys-settings-section-title">2. Navbar</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('header-nav-footer', headerNavFooterData, 'Lưu Navbar thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.headerNavFooter.navbar ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.headerNavFooter.navbar && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Cấu hình Navbar
                    </h4>

                    <label className="sys-settings-label">Logo (ảnh)</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['navbar-logo'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('navbar-logo', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['navbar-logo'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('navbar-logo', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['navbar-logo'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setHeaderNavFooterData, 'navbar.logo_image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={headerNavFooterData.navbar?.logo_image || ''} placeholder="https://example.com/logo.png"
                        onChange={(e) => setHeaderNavFooterData(prev => ({ 
                          ...prev, 
                          navbar: { ...prev.navbar, logo_image: e.target.value }
                        }))}
                        className="sys-settings-input" />
                    )}
                    {headerNavFooterData.navbar?.logo_image && (
                      <img src={headerNavFooterData.navbar.logo_image} alt="Logo" className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Text Logo (hiển thị bên cạnh logo)</label>
                    <input type="text" value={headerNavFooterData.navbar?.logo_text || ''} placeholder="Easy Medify"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        navbar: { ...prev.navbar, logo_text: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Placeholder thanh tìm kiếm</label>
                    <input type="text" value={headerNavFooterData.navbar?.search_placeholder || ''} placeholder="Tìm kiếm..."
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        navbar: { ...prev.navbar, search_placeholder: e.target.value }
                      }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: FOOTER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('headerNavFooter', 'footer')}>
              <h3 className="sys-settings-section-title">3. Footer</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('header-nav-footer', headerNavFooterData, 'Lưu Footer thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.headerNavFooter.footer ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.headerNavFooter.footer && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {/* Card 1: Thông tin chung */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Về chúng tôi (Footer)
                    </h4>

                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={headerNavFooterData.footer?.about_title || ''} placeholder="Easy Medify"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, about_title: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <textarea 
                      value={headerNavFooterData.footer?.about_description || ''} 
                      placeholder="Hệ thống y tế hàng đầu..."
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, about_description: e.target.value }
                      }))}
                      rows={5}
                      className="sys-settings-textarea"
                    />
                  </div>

                  {/* Card 2: Thông tin liên hệ */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Thông tin liên hệ
                    </h4>

                    <label className="sys-settings-label">Địa chỉ</label>
                    <input type="text" value={headerNavFooterData.footer?.address || ''} placeholder="123 Đường Sức Khỏe, Q.1, TP.HCM"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, address: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Hotline</label>
                    <input type="text" value={headerNavFooterData.footer?.hotline || ''} placeholder="1900 1234"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, hotline: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Email</label>
                    <input type="email" value={headerNavFooterData.footer?.email || ''} placeholder="contact@easymedify.vn"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, email: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Giờ làm việc (có thể xuống dòng với \n)</label>
                    <RichTextArea 
                      value={headerNavFooterData.footer?.working_hours || ''} 
                      placeholder="T2 - T7: 7:00 - 20:00&#10;Chủ nhật: 8:00 - 17:00"
                      onChange={(val) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, working_hours: val }
                      }))}
                      rows={4} />
                  </div>

                  {/* Card 3: Mạng xã hội */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Mạng xã hội
                    </h4>

                    <label className="sys-settings-label">
                      <FaFacebook style={{ marginRight: '5px' }} /> Facebook URL
                    </label>
                    <input type="url" value={headerNavFooterData.footer?.social_facebook || ''} placeholder="https://facebook.com/..."
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, social_facebook: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">
                      <FaTwitter style={{ marginRight: '5px' }} /> Twitter URL
                    </label>
                    <input type="url" value={headerNavFooterData.footer?.social_twitter || ''} placeholder="https://twitter.com/..."
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, social_twitter: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">
                      <FaInstagram style={{ marginRight: '5px' }} /> Instagram URL
                    </label>
                    <input type="url" value={headerNavFooterData.footer?.social_instagram || ''} placeholder="https://instagram.com/..."
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, social_instagram: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">
                      <FaYoutube style={{ marginRight: '5px' }} /> Youtube URL
                    </label>
                    <input type="url" value={headerNavFooterData.footer?.social_youtube || ''} placeholder="https://youtube.com/..."
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, social_youtube: e.target.value }
                      }))}
                      className="sys-settings-input" />
                  </div>

                  {/* Card 4: Copyright & Links */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Copyright & Liên kết
                    </h4>

                    <label className="sys-settings-label">Text Copyright</label>
                    <input type="text" value={headerNavFooterData.footer?.copyright_text || ''} placeholder="Easy Medify. Tất cả quyền được bảo lưu."
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, copyright_text: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Link Chính sách bảo mật</label>
                    <input type="text" value={headerNavFooterData.footer?.privacy_link || ''} placeholder="/privacy"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, privacy_link: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Link Điều khoản sử dụng</label>
                    <input type="text" value={headerNavFooterData.footer?.terms_link || ''} placeholder="/terms"
                      onChange={(e) => setHeaderNavFooterData(prev => ({ 
                        ...prev, 
                        footer: { ...prev.footer, terms_link: e.target.value }
                      }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

        </TabPanel>
        )}

        {/* ==================== TAB HOME - ĐẦY ĐỦ ==================== */}
        {canEditHome && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER SLIDES */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'bannerSlides')}>
              <h3 className="sys-settings-section-title">1. Banner Slides (Tối đa 4)</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Banner Slides thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if ((homeData.bannerSlides || []).length < 4) {
                      addArrayItem(setHomeData, 'bannerSlides', { 
                        image: '', alt: '', title: '', subtitle: '', description: '', 
                        buttonText: 'Đặt lịch ngay', buttonLink: '/book-appointment',
                        buttonIcon: 'FaCalendarAlt', buttonColor: '#10b981'
                      });
                    }
                  }}
                  className="sys-settings-btn sys-settings-btn-primary"
                  disabled={(homeData.bannerSlides || []).length >= 4}
                >
                  <FaPlus /> Thêm
                </button>
                {openSections.home.bannerSlides ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.bannerSlides && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(homeData.bannerSlides || []).slice(0, 4).map((slide, index) => {
                    const key = `home-bannerSlides-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Slide {index + 1}
                        </h4>
                        
                        <label className="sys-settings-label">Chọn cách thêm ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload file
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            Nhập URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setHomeData, 'bannerSlides', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={slide.image || ''} placeholder="https://example.com/image.jpg"
                            onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {slide.image && (
                          <img src={slide.image} alt={slide.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={slide.alt || ''} placeholder="Mô tả ảnh"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={slide.title || ''} placeholder="Tiêu đề chính"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Phụ đề</label>
                        <input type="text" value={slide.subtitle || ''} placeholder="Phụ đề"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'subtitle', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <RichTextArea 
                          value={slide.description || ''} 
                          placeholder="Mô tả chi tiết"
                          onChange={(val) => handleArrayChange(setHomeData, 'bannerSlides', index, 'description', val)}
                          rows={4} />
                        
                        <label className="sys-settings-label">Text nút CTA</label>
                        <input type="text" value={slide.buttonText || ''} placeholder="Đặt lịch ngay"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonText', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Link nút CTA</label>
                        <input type="text" value={slide.buttonLink || ''} placeholder="/book-appointment"
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonLink', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Icon nút CTA</label>
                        <CustomIconPicker value={slide.buttonIcon || ''} 
                          onChange={(icon) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonIcon', icon)} />
                        
                        <label className="sys-settings-label">Màu nút CTA</label>
                        <input type="color" value={slide.buttonColor || '#10b981'}
                          onChange={(e) => handleArrayChange(setHomeData, 'bannerSlides', index, 'buttonColor', e.target.value)}
                          style={{ width: '100%', height: '40px', border: '2px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }} />
                        
                        <button type="button" onClick={() => removeArrayItem(setHomeData, 'bannerSlides', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa Slide
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

           {/* SECTION 2: TÍNH NĂNG NỔI BẬT */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'features')}>
              <h3 className="sys-settings-section-title">2. Tính năng nổi bật</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Tính năng thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setHomeData, 'features', { 
                    icon: 'FaStethoscope', 
                    title: '', 
                    description: '', 
                    iconBgColor: '#10b981' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.home.features ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.features && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(homeData.features || []).map((feature, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Tính năng {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={feature.icon || ''} 
                        onChange={(icon) => handleArrayChange(setHomeData, 'features', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Màu nền icon</label>
                      <input type="color" value={feature.iconBgColor || '#10b981'}
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'iconBgColor', e.target.value)}
                        style={{ width: '100%', height: '40px', border: '2px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={feature.title || ''} placeholder="Tiêu đề tính năng"
                        onChange={(e) => handleArrayChange(setHomeData, 'features', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <RichTextArea 
                        value={feature.description || ''} 
                        placeholder="Mô tả tính năng"
                        onChange={(val) => handleArrayChange(setHomeData, 'features', index, 'description', val)}
                        rows={4} />
                      
                      <button type="button" onClick={() => removeArrayItem(setHomeData, 'features', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: VỀ CHÚNG TÔI */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'aboutSection')}>
              <h3 className="sys-settings-section-title">3. Về chúng tôi</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Về chúng tôi thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.home.aboutSection ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.aboutSection && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Thông tin chung
                    </h4>

                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['aboutSection'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('aboutSection', 'upload')} />
                        Upload file
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['aboutSection'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('aboutSection', 'url')} />
                        Nhập URL
                      </label>
                    </div>
                    {(imageOptions['aboutSection'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setHomeData, 'aboutSection.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={homeData.aboutSection?.image || ''} placeholder="https://example.com/image.jpg"
                        onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {homeData.aboutSection?.image && (
                      <img src={homeData.aboutSection.image} alt={homeData.aboutSection.alt || ''} className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={homeData.aboutSection?.alt || ''} placeholder="Mô tả ảnh"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề section</label>
                    <input type="text" value={homeData.aboutSection?.title || ''} placeholder="Về chúng tôi"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Số năm kinh nghiệm</label>
                    <input type="text" value={homeData.aboutSection?.yearsExperience || ''} placeholder="15+"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, yearsExperience: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Điểm nổi bật (mỗi dòng: Icon|Tiêu đề|Mô tả)</label>
                    <RichTextArea 
                      value={(homeData.aboutSection?.highlights || []).map(h => `${h.icon}|${h.title}|${h.description}`).join('\n')}
                      onChange={(val) => {
                        const lines = val.split('\n').filter(line => line.trim());
                        const highlights = lines.map(line => {
                          const [icon, title, description] = line.split('|');
                          return { 
                            icon: icon?.trim() || 'FaCheckCircle', 
                            title: title?.trim() || '', 
                            description: description?.trim() || '' 
                          };
                        });
                        setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, highlights }}));
                      }}
                      placeholder="FaCheckCircle|Đội ngũ bác sĩ giàu kinh nghiệm|Các chuyên gia y tế được đào tạo bài bản"
                      rows={6}
                    />
                    
                    <label className="sys-settings-label">Text nút "Xem thêm"</label>
                    <input type="text" value={homeData.aboutSection?.buttonText || ''} placeholder="Xem thêm"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, buttonText: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Link nút</label>
                    <input type="text" value={homeData.aboutSection?.buttonLink || ''} placeholder="/about"
                      onChange={(e) => setHomeData(prev => ({ ...prev, aboutSection: { ...prev.aboutSection, buttonLink: e.target.value }}))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: ĐÁNH GIÁ TỪ BỆNH NHÂN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'testimonials')}>
              <h3 className="sys-settings-section-title">4. Đánh giá từ bệnh nhân</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Đánh giá thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setHomeData, 'testimonials', { 
                    name: '', 
                    role: '', 
                    comment: '', 
                    avatar: '', 
                    alt: '', 
                    rating: 5 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.home.testimonials ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.testimonials && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(homeData.testimonials || []).map((testimonial, index) => {
                    const key = `home-testimonials-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Đánh giá {index + 1}
                        </h4>

                        <label className="sys-settings-label">Ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setHomeData, 'testimonials', index, 'avatar', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={testimonial.avatar || ''} placeholder="https://example.com/avatar.jpg"
                            onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'avatar', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {testimonial.avatar && (
                          <img src={testimonial.avatar} alt={testimonial.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={testimonial.alt || ''} placeholder="Ảnh bệnh nhân"
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tên</label>
                        <input type="text" value={testimonial.name || ''} placeholder="Nguyễn Văn A"
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'name', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Vai trò</label>
                        <input type="text" value={testimonial.role || ''} placeholder="Bệnh nhân"
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'role', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Nội dung đánh giá</label>
                        <RichTextArea 
                          value={testimonial.comment || ''} 
                          placeholder="Dịch vụ tuyệt vời..."
                          onChange={(val) => handleArrayChange(setHomeData, 'testimonials', index, 'comment', val)}
                          rows={4} />
                        
                        <label className="sys-settings-label">Đánh giá (1-5 sao)</label>
                        <input type="number" min="1" max="5" value={testimonial.rating || 5}
                          onChange={(e) => handleArrayChange(setHomeData, 'testimonials', index, 'rating', parseInt(e.target.value))}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setHomeData, 'testimonials', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: ĐẶT LỊCH KHÁM BỆNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('home', 'bookingSection')}>
              <h3 className="sys-settings-section-title">5. Đặt lịch khám bệnh</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('home', homeData, 'Lưu Đặt lịch khám thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.home.bookingSection ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.home.bookingSection && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Thông tin đặt lịch
                    </h4>

                    <label className="sys-settings-label">Tiêu đề section</label>
                    <input type="text" value={homeData.bookingSection?.title || ''} placeholder="Đặt lịch khám bệnh"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <RichTextArea 
                      value={homeData.bookingSection?.description || ''} 
                      placeholder="Đặt lịch nhanh chóng..."
                      onChange={(val) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, description: val }}))}
                      rows={4} />
                    
                    <label className="sys-settings-label">Tính năng (mỗi dòng: Icon|Text)</label>
                    <RichTextArea 
                      value={(homeData.bookingSection?.features || []).map(f => `${f.icon}|${f.text}`).join('\n')}
                      onChange={(val) => {
                        const lines = val.split('\n').filter(line => line.trim());
                        const features = lines.map(line => {
                          const [icon, text] = line.split('|');
                          return { 
                            icon: icon?.trim() || 'FaCheckCircle', 
                            text: text?.trim() || '' 
                          };
                        });
                        setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, features }}));
                      }}
                      placeholder="FaCheckCircle|Xác nhận nhanh qua email"
                      rows={5}
                    />
                    
                    <label className="sys-settings-label">Hotline</label>
                    <input type="text" value={homeData.bookingSection?.hotline || ''} placeholder="1900 xxxx"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, hotline: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Email</label>
                    <input type="email" value={homeData.bookingSection?.email || ''} placeholder="contact@easymedify.vn"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, email: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Địa chỉ</label>
                    <input type="text" value={homeData.bookingSection?.address || ''} placeholder="123 Đường ABC, TP.HCM"
                      onChange={(e) => setHomeData(prev => ({ ...prev, bookingSection: { ...prev.bookingSection, address: e.target.value }}))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>
        </TabPanel>
        )}

        {/* ==================== TAB ABOUT - ĐẦY ĐỦ ==================== */}
        {canEditAbout && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Banner thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.about.banner ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Banner About
                    </h4>

                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['about-banner'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('about-banner', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['about-banner'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('about-banner', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['about-banner'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setAboutData, 'banner.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={aboutData.banner?.image || ''} placeholder="https://example.com/banner.jpg"
                        onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {aboutData.banner?.image && (
                      <img src={aboutData.banner.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={aboutData.banner?.alt || ''} placeholder="Banner về chúng tôi"
                      onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={aboutData.banner?.title || ''} placeholder="Easy Medify"
                      onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <input type="text" value={aboutData.banner?.subtitle || ''} placeholder="Đồng hành cùng sức khỏe..."
                      onChange={(e) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, subtitle: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <RichTextArea 
                      value={aboutData.banner?.description || ''} 
                      placeholder="Với hơn 15 năm kinh nghiệm..."
                      onChange={(val) => setAboutData(prev => ({ ...prev, banner: { ...prev.banner, description: val }}))}
                      rows={5} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: SỨ MỆNH & TẦM NHÌN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'mission')}>
              <h3 className="sys-settings-section-title">2. Sứ mệnh & Tầm nhìn</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Sứ mệnh & Tầm nhìn thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.about.mission ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.mission && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {/* SỨ MỆNH */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Sứ mệnh
                    </h4>

                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['mission-image'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('mission-image', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['mission-image'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('mission-image', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['mission-image'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setAboutData, 'mission.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={aboutData.mission?.image || ''} placeholder="https://example.com/mission.jpg"
                        onChange={(e) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {aboutData.mission?.image && (
                      <img src={aboutData.mission.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={aboutData.mission?.alt || ''} placeholder="Sứ mệnh của chúng tôi"
                      onChange={(e) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Icon</label>
                    <CustomIconPicker value={aboutData.mission?.icon || 'FaLeaf'} 
                      onChange={(icon) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, icon }}))} />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={aboutData.mission?.title || ''} placeholder="Sứ mệnh"
                      onChange={(e) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <RichTextArea 
                      value={aboutData.mission?.description || ''} 
                      placeholder="Nâng cao chất lượng cuộc sống..."
                      onChange={(val) => setAboutData(prev => ({ ...prev, mission: { ...prev.mission, description: val }}))}
                      rows={5} />
                  </div>

                  {/* TẦM NHÌN */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#10b981', fontWeight: 'bold' }}>
                      Tầm nhìn
                    </h4>

                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['vision-image'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('vision-image', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['vision-image'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('vision-image', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['vision-image'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setAboutData, 'vision.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={aboutData.vision?.image || ''} placeholder="https://example.com/vision.jpg"
                        onChange={(e) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {aboutData.vision?.image && (
                      <img src={aboutData.vision.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={aboutData.vision?.alt || ''} placeholder="Tầm nhìn của chúng tôi"
                      onChange={(e) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Icon</label>
                    <CustomIconPicker value={aboutData.vision?.icon || 'FaHeartbeat'} 
                      onChange={(icon) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, icon }}))} />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={aboutData.vision?.title || ''} placeholder="Tầm nhìn"
                      onChange={(e) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <RichTextArea 
                      value={aboutData.vision?.description || ''} 
                      placeholder="Trở thành hệ thống y tế hàng đầu..."
                      onChange={(val) => setAboutData(prev => ({ ...prev, vision: { ...prev.vision, description: val }}))}
                      rows={5} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: LỊCH SỬ PHÁT TRIỂN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'milestones')}>
              <h3 className="sys-settings-section-title">3. Lịch sử phát triển</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Lịch sử phát triển thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'milestones', { 
                    year: '', 
                    title: '', 
                    description: '', 
                    image: '', 
                    alt: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.about.milestones ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.milestones && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.milestones || []).map((milestone, index) => {
                    const key = `about-milestones-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Mốc {index + 1}
                        </h4>

                        <label className="sys-settings-label">Năm (không trùng)</label>
                        <input type="text" value={milestone.year || ''} placeholder="2009"
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'year', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={milestone.title || ''} placeholder="Thành lập công ty"
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <RichTextArea 
                          value={milestone.description || ''} 
                          placeholder="Bắt đầu hành trình..."
                          onChange={(val) => handleArrayChange(setAboutData, 'milestones', index, 'description', val)}
                          rows={4} />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setAboutData, 'milestones', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={milestone.image || ''} placeholder="https://example.com/image.jpg"
                            onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {milestone.image && (
                          <img src={milestone.image} alt={milestone.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={milestone.alt || ''} placeholder="Mô tả ảnh"
                          onChange={(e) => handleArrayChange(setAboutData, 'milestones', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'milestones', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: THỐNG KÊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'stats')}>
              <h3 className="sys-settings-section-title">4. Thống kê</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Thống kê thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'stats', { 
                    number: '', 
                    label: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.about.stats ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.stats && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.stats || []).map((stat, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thống kê {index + 1}
                      </h4>

                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="15+"
                        onChange={(e) => handleArrayChange(setAboutData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Năm phát triển"
                        onChange={(e) => handleArrayChange(setAboutData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setAboutData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: NGUYÊN TẮC HOẠT ĐỘNG */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'values')}>
              <h3 className="sys-settings-section-title">5. Nguyên tắc hoạt động</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Nguyên tắc thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'values', { 
                    icon: 'FaHeart', 
                    title: '', 
                    description: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.about.values ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.values && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.values || []).map((value, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Giá trị {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={value.icon || ''} 
                        onChange={(icon) => handleArrayChange(setAboutData, 'values', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={value.title || ''} placeholder="Chuyên nghiệp"
                        onChange={(e) => handleArrayChange(setAboutData, 'values', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <RichTextArea 
                        value={value.description || ''} 
                        placeholder="Luôn đặt bệnh nhân lên hàng đầu..."
                        onChange={(val) => handleArrayChange(setAboutData, 'values', index, 'description', val)}
                        rows={4} />
                      
                      <button type="button" onClick={() => removeArrayItem(setAboutData, 'values', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 6: ĐỘI NGŨ ĐIỀU HÀNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'leadership')}>
              <h3 className="sys-settings-section-title">6. Đội ngũ điều hành</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Đội ngũ điều hành thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'leadership', { 
                    name: '', 
                    position: '', 
                    description: '', 
                    image: '', 
                    alt: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.about.leadership ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.leadership && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.leadership || []).map((leader, index) => {
                    const key = `about-leadership-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Lãnh đạo {index + 1}
                        </h4>

                        <label className="sys-settings-label">Tên</label>
                        <input type="text" value={leader.name || ''} placeholder="TS. Nguyễn Văn A"
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'name', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Chức vụ</label>
                        <input type="text" value={leader.position || ''} placeholder="Giám đốc điều hành"
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'position', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <RichTextArea 
                          value={leader.description || ''} 
                          placeholder="Hơn 20 năm kinh nghiệm..."
                          onChange={(val) => handleArrayChange(setAboutData, 'leadership', index, 'description', val)}
                          rows={4} />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setAboutData, 'leadership', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={leader.image || ''} placeholder="https://example.com/leader.jpg"
                            onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {leader.image && (
                          <img src={leader.image} alt={leader.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={leader.alt || ''} placeholder="Ảnh lãnh đạo"
                          onChange={(e) => handleArrayChange(setAboutData, 'leadership', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'leadership', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 7: GIẢI THƯỞNG & CHỨNG NHẬN */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'achievements')}>
              <h3 className="sys-settings-section-title">7. Giải thưởng & Chứng nhận</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Giải thưởng thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'achievements', { 
                    icon: 'FaTrophy', 
                    title: '', 
                    year: '',
                    image: '',
                    alt: ''
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.about.achievements ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.achievements && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.achievements || []).map((achievement, index) => {
                    const key = `about-achievements-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Thành tựu {index + 1}
                        </h4>

                        <label className="sys-settings-label">Hình ảnh giải thưởng</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setAboutData, 'achievements', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={achievement.image || ''} placeholder="https://example.com/award.jpg"
                            onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {achievement.image && (
                          <img src={achievement.image} alt={achievement.alt || achievement.title} className="sys-settings-preview-img" />
                        )}

                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={achievement.alt || ''} placeholder="Mô tả ảnh giải thưởng"
                          onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'alt', e.target.value)}
                          className="sys-settings-input" />

                        <label className="sys-settings-label">Icon</label>
                        <CustomIconPicker value={achievement.icon || ''} 
                          onChange={(icon) => handleArrayChange(setAboutData, 'achievements', index, 'icon', icon)} />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={achievement.title || ''} placeholder="Top 10 Phòng khám xuất sắc"
                          onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Năm</label>
                        <input type="text" value={achievement.year || ''} placeholder="2023"
                          onChange={(e) => handleArrayChange(setAboutData, 'achievements', index, 'year', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'achievements', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 8: TRANG THIẾT BỊ HIỆN ĐẠI */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('about', 'facilities')}>
              <h3 className="sys-settings-section-title">8. Trang thiết bị hiện đại</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('about', aboutData, 'Lưu Trang thiết bị thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setAboutData, 'facilities', { 
                    icon: 'FaBuilding', 
                    title: '', 
                    description: '',
                    image: '',
                    alt: ''
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.about.facilities ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.about.facilities && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(aboutData.facilities || []).map((facility, index) => {
                    const key = `about-facilities-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Cơ sở {index + 1}
                        </h4>

                        <label className="sys-settings-label">Hình ảnh thiết bị</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setAboutData, 'facilities', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={facility.image || ''} placeholder="https://example.com/equipment.jpg"
                            onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {facility.image && (
                          <img src={facility.image} alt={facility.alt || facility.title} className="sys-settings-preview-img" />
                        )}

                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={facility.alt || ''} placeholder="Mô tả ảnh thiết bị"
                          onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'alt', e.target.value)}
                          className="sys-settings-input" />

                        <label className="sys-settings-label">Icon</label>
                        <CustomIconPicker value={facility.icon || ''} 
                          onChange={(icon) => handleArrayChange(setAboutData, 'facilities', index, 'icon', icon)} />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={facility.title || ''} placeholder="Phòng khám hiện đại"
                          onChange={(e) => handleArrayChange(setAboutData, 'facilities', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <RichTextArea 
                          value={facility.description || ''} 
                          placeholder="Trang bị đầy đủ..."
                          onChange={(val) => handleArrayChange(setAboutData, 'facilities', index, 'description', val)}
                          rows={4} />
                        
                        <button type="button" onClick={() => removeArrayItem(setAboutData, 'facilities', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

        </TabPanel>
        )}

        {/* ==================== TAB FACILITIES - ĐẦY ĐỦ ==================== */}
        {canEditFacilities && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Banner thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.facilities.banner ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Banner Facilities
                    </h4>

                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['facilities-banner'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('facilities-banner', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['facilities-banner'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('facilities-banner', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['facilities-banner'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setFacilitiesData, 'banner.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={facilitiesData.banner?.image || ''} placeholder="https://example.com/banner.jpg"
                        onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {facilitiesData.banner?.image && (
                      <img src={facilitiesData.banner.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={facilitiesData.banner?.alt || ''} placeholder="Banner cơ sở vật chất"
                      onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={facilitiesData.banner?.title || ''} placeholder="Cơ sở vật chất"
                      onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <input type="text" value={facilitiesData.banner?.subtitle || ''} placeholder="Không gian hiện đại..."
                      onChange={(e) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, subtitle: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <RichTextArea 
                      value={facilitiesData.banner?.description || ''} 
                      placeholder="Được thiết kế để mang lại..."
                      onChange={(val) => setFacilitiesData(prev => ({ ...prev, banner: { ...prev.banner, description: val }}))}
                      rows={5} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: TIỆN ÍCH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'amenities')}>
              <h3 className="sys-settings-section-title">2. Tiện ích</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Tiện ích thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'amenities', { 
                    icon: 'FaWifi', 
                    name: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.amenities ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.amenities && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.amenities || []).map((amenity, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Tiện ích {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={amenity.icon || ''} 
                        onChange={(icon) => handleArrayChange(setFacilitiesData, 'amenities', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tên tiện ích</label>
                      <input type="text" value={amenity.name || ''} placeholder="Wifi miễn phí"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'amenities', index, 'name', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'amenities', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: CÁC KHU VỰC CHÍNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'facilities')}>
              <h3 className="sys-settings-section-title">3. Các khu vực chính</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Khu vực thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'facilities', { 
                    icon: 'FaBuilding', 
                    title: '', 
                    description: '', 
                    image: '', 
                    alt: '', 
                    features: [] 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.facilities ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.facilities && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.facilities || []).map((facility, index) => {
                    const key = `facilities-facilities-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Khu vực {index + 1}
                        </h4>

                        <label className="sys-settings-label">Icon</label>
                        <CustomIconPicker value={facility.icon || ''} 
                          onChange={(icon) => handleArrayChange(setFacilitiesData, 'facilities', index, 'icon', icon)} />
                        
                        <label className="sys-settings-label">Tiêu đề</label>
                        <input type="text" value={facility.title || ''} placeholder="Phòng khám"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Mô tả</label>
                        <RichTextArea 
                          value={facility.description || ''} 
                          placeholder="Phòng khám được thiết kế..."
                          onChange={(val) => handleArrayChange(setFacilitiesData, 'facilities', index, 'description', val)}
                          rows={4} />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setFacilitiesData, 'facilities', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={facility.image || ''} placeholder="https://example.com/facility.jpg"
                            onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {facility.image && (
                          <img src={facility.image} alt={facility.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={facility.alt || ''} placeholder="Ảnh phòng khám"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'facilities', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tính năng (mỗi dòng 1 tính năng)</label>
                        <RichTextArea 
                          value={(facility.features || []).join('\n')} 
                          placeholder="Trang bị đầy đủ..."
                          onChange={(val) => handleArrayChange(setFacilitiesData, 'facilities', index, 'features', val.split('\n').filter(f => f.trim()))}
                          rows={5}
                        />
                        
                        <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'facilities', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: THƯ VIỆN HÌNH ẢNH */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'gallery')}>
              <h3 className="sys-settings-section-title">4. Thư viện hình ảnh</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Thư viện thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'gallery', { 
                    url: '', 
                    title: '', 
                    alt: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.gallery ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.gallery && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.gallery || []).map((item, index) => {
                    const key = `facilities-gallery-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Ảnh {index + 1}
                        </h4>

                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setFacilitiesData, 'gallery', index, 'url', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={item.url || ''} placeholder="https://example.com/gallery.jpg"
                            onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'url', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {item.url && (
                          <img src={item.url} alt={item.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Tiêu đề ảnh</label>
                        <input type="text" value={item.title || ''} placeholder="Phòng chờ"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'title', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={item.alt || ''} placeholder="Hình ảnh phòng chờ"
                          onChange={(e) => handleArrayChange(setFacilitiesData, 'gallery', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'gallery', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: THỐNG KÊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('facilities', 'stats')}>
              <h3 className="sys-settings-section-title">5. Thống kê</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('facilities', facilitiesData, 'Lưu Thống kê thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setFacilitiesData, 'stats', { 
                    number: '', 
                    label: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.facilities.stats ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.facilities.stats && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(facilitiesData.stats || []).map((stat, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thống kê {index + 1}
                      </h4>

                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="2000m²"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Diện tích"
                        onChange={(e) => handleArrayChange(setFacilitiesData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setFacilitiesData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </TabPanel>
        )}

        {/* ==================== TAB EQUIPMENT - ĐẦY ĐỦ ==================== */}
        {canEditEquipment && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: BANNER */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'banner')}>
              <h3 className="sys-settings-section-title">1. Banner</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Banner thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.equipment.banner ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.banner && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Banner Equipment
                    </h4>

                    <label className="sys-settings-label">Hình ảnh</label>
                    <div className="sys-settings-image-options">
                      <label>
                        <input type="radio" checked={(imageOptions['equipment-banner'] || 'upload') === 'upload'} 
                          onChange={() => handleImageOptionChange('equipment-banner', 'upload')} />
                        Upload
                      </label>
                      <label>
                        <input type="radio" checked={(imageOptions['equipment-banner'] || 'upload') === 'url'} 
                          onChange={() => handleImageOptionChange('equipment-banner', 'url')} />
                        URL
                      </label>
                    </div>
                    {(imageOptions['equipment-banner'] || 'upload') === 'upload' ? (
                      <input type="file" accept="image/*"
                        onChange={(e) => handleSingleImageUpload(setEquipmentData, 'banner.image', e.target.files[0])}
                        className="sys-settings-file-input" />
                    ) : (
                      <input type="text" value={equipmentData.banner?.image || ''} placeholder="https://example.com/banner.jpg"
                        onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, image: e.target.value }}))}
                        className="sys-settings-input" />
                    )}
                    {equipmentData.banner?.image && (
                      <img src={equipmentData.banner.image} alt="" className="sys-settings-preview-img" />
                    )}
                    
                    <label className="sys-settings-label">Alt Text</label>
                    <input type="text" value={equipmentData.banner?.alt || ''} placeholder="Banner trang thiết bị"
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, alt: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={equipmentData.banner?.title || ''} placeholder="Trang thiết bị y tế"
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, title: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <input type="text" value={equipmentData.banner?.subtitle || ''} placeholder="Đầu tư trang thiết bị hiện đại..."
                      onChange={(e) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, subtitle: e.target.value }}))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Mô tả</label>
                    <RichTextArea 
                      value={equipmentData.banner?.description || ''} 
                      placeholder="Từ các thương hiệu hàng đầu..."
                      onChange={(val) => setEquipmentData(prev => ({ ...prev, banner: { ...prev.banner, description: val }}))}
                      rows={5} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: THỐNG KÊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'stats')}>
              <h3 className="sys-settings-section-title">2. Thống kê</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Thống kê thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'stats', { 
                    number: '', 
                    label: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.stats ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.stats && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.stats || []).map((stat, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thống kê {index + 1}
                      </h4>

                      <label className="sys-settings-label">Số liệu</label>
                      <input type="text" value={stat.number || ''} placeholder="50+"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'number', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Nhãn</label>
                      <input type="text" value={stat.label || ''} placeholder="Thiết bị hiện đại"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'stats', index, 'label', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'stats', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: DANH MỤC THIẾT BỊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'categories')}>
              <h3 className="sys-settings-section-title">3. Danh mục thiết bị</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Danh mục thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'categories', { 
                    id: '', 
                    name: '', 
                    icon: 'FaStethoscope' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.categories ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.categories && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.categories || []).map((category, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Danh mục {index + 1}
                      </h4>

                      <label className="sys-settings-label">ID danh mục</label>
                      <input type="text" value={category.id || ''} placeholder="diagnostic"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'id', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Tên danh mục</label>
                      <input type="text" value={category.name || ''} placeholder="Thiết bị chẩn đoán"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'categories', index, 'name', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={category.icon || ''} 
                        onChange={(icon) => handleArrayChange(setEquipmentData, 'categories', index, 'icon', icon)} />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'categories', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: DANH SÁCH THIẾT BỊ */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'equipment')}>
              <h3 className="sys-settings-section-title">4. Danh sách thiết bị</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Danh sách thiết bị thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'equipment', { 
                    name: '', 
                    category: '', 
                    brand: '', 
                    origin: '', 
                    year: '', 
                    image: '', 
                    alt: '', 
                    features: [], 
                    applications: [] 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.equipment ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.equipment && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.equipment || []).map((item, index) => {
                    const key = `equipment-equipment-${index}`;
                    const option = imageOptions[key] || 'upload';
                    return (
                      <div key={index} className="sys-settings-card">
                        <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                          Thiết bị {index + 1}
                        </h4>

                        <label className="sys-settings-label">Tên thiết bị</label>
                        <input type="text" value={item.name || ''} placeholder="Máy MRI 3.0 Tesla"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'name', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Danh mục</label>
                        <select value={item.category || ''} 
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'category', e.target.value)}
                          className="sys-settings-input">
                          <option value="">-- Chọn danh mục --</option>
                          {(equipmentData.categories || []).map((cat, catIndex) => (
                            <option key={catIndex} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        
                        <label className="sys-settings-label">Hãng</label>
                        <input type="text" value={item.brand || ''} placeholder="Siemens"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'brand', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Xuất xứ</label>
                        <input type="text" value={item.origin || ''} placeholder="Đức"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'origin', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Năm</label>
                        <input type="text" value={item.year || ''} placeholder="2023"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'year', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Hình ảnh</label>
                        <div className="sys-settings-image-options">
                          <label>
                            <input type="radio" checked={option === 'upload'} 
                              onChange={() => handleImageOptionChange(key, 'upload')} />
                            Upload
                          </label>
                          <label>
                            <input type="radio" checked={option === 'url'} 
                              onChange={() => handleImageOptionChange(key, 'url')} />
                            URL
                          </label>
                        </div>
                        {option === 'upload' ? (
                          <input type="file" accept="image/*"
                            onChange={(e) => handleArrayImageUpload(setEquipmentData, 'equipment', index, 'image', e.target.files[0])}
                            className="sys-settings-file-input" />
                        ) : (
                          <input type="text" value={item.image || ''} placeholder="https://example.com/equipment.jpg"
                            onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'image', e.target.value)}
                            className="sys-settings-input" />
                        )}
                        {item.image && (
                          <img src={item.image} alt={item.alt || ''} className="sys-settings-preview-img" />
                        )}
                        
                        <label className="sys-settings-label">Alt Text</label>
                        <input type="text" value={item.alt || ''} placeholder="Ảnh thiết bị"
                          onChange={(e) => handleArrayChange(setEquipmentData, 'equipment', index, 'alt', e.target.value)}
                          className="sys-settings-input" />
                        
                        <label className="sys-settings-label">Tính năng (mỗi dòng 1 tính năng)</label>
                        <RichTextArea 
                          value={(item.features || []).join('\n')} 
                          placeholder="Độ phân giải cao..."
                          onChange={(val) => handleArrayChange(setEquipmentData, 'equipment', index, 'features', val.split('\n').filter(f => f.trim()))}
                          rows={5}
                        />
                        
                        <label className="sys-settings-label">Ứng dụng (mỗi dòng 1 ứng dụng)</label>
                        <RichTextArea 
                          value={(item.applications || []).join('\n')} 
                          placeholder="Chẩn đoán ung thư..."
                          onChange={(val) => handleArrayChange(setEquipmentData, 'equipment', index, 'applications', val.split('\n').filter(a => a.trim()))}
                          rows={5}
                        />
                        
                        <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'equipment', index)}
                          className="sys-settings-btn sys-settings-btn-danger" 
                          style={{ marginTop: '16px', width: '100%' }}>
                          <FaTrash /> Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: CAM KẾT CHẤT LƯỢNG */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('equipment', 'quality')}>
              <h3 className="sys-settings-section-title">5. Cam kết chất lượng</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('equipment', equipmentData, 'Lưu Cam kết thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setEquipmentData, 'quality', { 
                    title: '', 
                    description: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.equipment.quality ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.equipment.quality && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(equipmentData.quality || []).map((item, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Cam kết {index + 1}
                      </h4>

                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={item.title || ''} placeholder="Nhập khẩu chính hãng"
                        onChange={(e) => handleArrayChange(setEquipmentData, 'quality', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Mô tả</label>
                      <RichTextArea 
                        value={item.description || ''} 
                        placeholder="100% thiết bị nhập khẩu..."
                        onChange={(val) => handleArrayChange(setEquipmentData, 'quality', index, 'description', val)}
                        rows={4} />
                      
                      <button type="button" onClick={() => removeArrayItem(setEquipmentData, 'quality', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </TabPanel>
        )}

        {/* ==================== TAB CONTACT ==================== */}
        {canEditContact && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: HERO */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('contact', 'hero')}>
              <h3 className="sys-settings-section-title">1. Hero Section</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('contact', contactData, 'Lưu Hero thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.contact.hero ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.contact.hero && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {/* Card 1: Nội dung text */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Nội dung Hero
                    </h4>
                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={contactData.hero?.title || ''} placeholder="Liên hệ với chúng tôi"
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        hero: { ...prev.hero, title: e.target.value }
                      }))}
                      className="sys-settings-input" />

                    <label className="sys-settings-label">Phụ đề</label>
                    <input type="text" value={contactData.hero?.subtitle || ''} placeholder="Chúng tôi luôn sẵn sàng lắng nghe..."
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        hero: { ...prev.hero, subtitle: e.target.value }
                      }))}
                      className="sys-settings-input" />
                  </div>

                  {/* Card 2: Banner - upload file hoặc link + màu */}
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Banner nền (ảnh đơn hoặc màu)
                    </h4>

                    {/* Preview ảnh đơn */}
                    {contactData.hero?.background_image && (
                      <div style={{ marginBottom: '12px', position: 'relative' }}>
                        <img
                          src={contactData.hero.background_image}
                          alt="Banner preview"
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e5e7eb' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => setContactData(prev => ({ ...prev, hero: { ...prev.hero, background_image: '' } }))}
                          style={{ position: 'absolute', top: '6px', right: '6px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                      </div>
                    )}

                    {/* Chọn cách thêm ảnh đơn */}
                    <label className="sys-settings-label">Ảnh nền đơn</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <label style={{
                        flex: 1, padding: '9px 12px', background: '#f0fdf4', border: '2px dashed #4caf50',
                        borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                        fontSize: '0.82rem', color: '#2d9b6f', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        opacity: bannerUploading['bg_single'] ? 0.6 : 1
                      }}>
                        {bannerUploading['bg_single'] ? '⏳ Đang tải...' : '📁 Upload file'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={bannerUploading['bg_single']}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) uploadBannerImage(file, (url) => {
                              setContactData(prev => ({ ...prev, hero: { ...prev.hero, background_image: url } }));
                            }, 'bg_single');
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      value={contactData.hero?.background_image || ''}
                      placeholder="Hoặc dán link ảnh: https://..."
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        hero: { ...prev.hero, background_image: e.target.value }
                      }))}
                      className="sys-settings-input"
                    />

                    {/* Màu nền */}
                    <label className="sys-settings-label" style={{ marginTop: '14px' }}>
                      Màu nền banner (dùng khi không có ảnh)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="color"
                        value={contactData.hero?.banner_color || '#1e7a55'}
                        onChange={(e) => setContactData(prev => ({
                          ...prev,
                          hero: { ...prev.hero, banner_color: e.target.value }
                        }))}
                        style={{ width: '56px', height: '40px', border: '2px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        value={contactData.hero?.banner_color || ''}
                        placeholder="#1e7a55 hoặc rgb(...)"
                        onChange={(e) => setContactData(prev => ({
                          ...prev,
                          hero: { ...prev.hero, banner_color: e.target.value }
                        }))}
                        className="sys-settings-input"
                        style={{ flex: 1 }}
                      />
                      {contactData.hero?.banner_color && (
                        <button type="button"
                          onClick={() => setContactData(prev => ({ ...prev, hero: { ...prev.hero, banner_color: '' } }))}
                          style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', flexShrink: 0 }}>
                          Xóa
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '8px', lineHeight: '1.5' }}>
                      * Ưu tiên: Slideshow &gt; Ảnh đơn &gt; Màu nền &gt; Gradient mặc định
                    </p>
                  </div>

                  {/* Card 3: Slideshow nhiều ảnh */}
                  <div className="sys-settings-card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{ color: '#667eea', fontWeight: 'bold' }}>
                        Slideshow nhiều ảnh ({(contactData.hero?.banner_images || []).length} ảnh)
                      </h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Nút upload nhiều file cùng lúc */}
                        <label style={{
                          padding: '8px 14px', background: '#f0fdf4', border: '2px solid #4caf50',
                          borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem',
                          color: '#2d9b6f', fontWeight: '700',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          opacity: bannerUploading['slideshow_bulk'] ? 0.6 : 1
                        }}>
                          {bannerUploading['slideshow_bulk'] ? '⏳ Đang tải...' : <><FaPlus /> Upload ảnh</>}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            disabled={bannerUploading['slideshow_bulk']}
                            onChange={async (e) => {
                              const files = Array.from(e.target.files);
                              if (!files.length) return;
                              setBannerUploading(prev => ({ ...prev, slideshow_bulk: true }));
                              const urls = [];
                              for (const file of files) {
                                await new Promise(resolve => {
                                  uploadBannerImage(file, (url) => { urls.push(url); resolve(); }, `slide_${Date.now()}`);
                                });
                              }
                              if (urls.length > 0) {
                                setContactData(prev => ({
                                  ...prev,
                                  hero: {
                                    ...prev.hero,
                                    banner_images: [...(prev.hero?.banner_images || []), ...urls]
                                  }
                                }));
                              }
                              setBannerUploading(prev => ({ ...prev, slideshow_bulk: false }));
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {/* Nút thêm bằng link */}
                        <button
                          type="button"
                          onClick={() => setContactData(prev => ({
                            ...prev,
                            hero: { ...prev.hero, banner_images: [...(prev.hero?.banner_images || []), ''] }
                          }))}
                          className="sys-settings-btn sys-settings-btn-primary"
                          style={{ fontSize: '0.82rem' }}
                        >
                          <FaPlus /> Thêm link
                        </button>
                      </div>
                    </div>

                    {(contactData.hero?.banner_images || []).length === 0 && (
                      <p style={{ color: '#9ca3af', fontSize: '0.85rem', fontStyle: 'italic', padding: '12px 0' }}>
                        Chưa có ảnh slideshow. Nhấn <strong>"Upload ảnh"</strong> để chọn file từ máy, hoặc <strong>"Thêm link"</strong> để dán URL. Từ 2 ảnh trở lên sẽ tự chạy slideshow.
                      </p>
                    )}

                    {/* Preview dạng grid */}
                    {(contactData.hero?.banner_images || []).length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        {(contactData.hero?.banner_images || []).map((imgUrl, idx) => (
                          <div key={idx} style={{ border: '2px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', position: 'relative', background: '#f8fafc' }}>
                            {/* Preview ảnh */}
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={`Slide ${idx + 1}`}
                                style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                                onError={e => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div style={{ display: imgUrl ? 'none' : 'flex', height: '110px', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.8rem', flexDirection: 'column', gap: '4px' }}>
                              🖼️<span>Chưa có ảnh</span>
                            </div>
                            {/* Badge số thứ tự */}
                            <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                              #{idx + 1}
                            </span>
                            {/* Nút xóa */}
                            <button
                              type="button"
                              onClick={() => {
                                const newImgs = (contactData.hero?.banner_images || []).filter((_, i) => i !== idx);
                                setContactData(prev => ({ ...prev, hero: { ...prev.hero, banner_images: newImgs } }));
                              }}
                              style={{ position: 'absolute', top: '6px', right: '6px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >✕</button>
                            {/* Input URL bên dưới */}
                            <div style={{ padding: '8px', display: 'flex', gap: '6px', alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                              <input
                                type="url"
                                value={imgUrl}
                                placeholder="Dán link ảnh..."
                                onChange={(e) => {
                                  const newImgs = [...(contactData.hero?.banner_images || [])];
                                  newImgs[idx] = e.target.value;
                                  setContactData(prev => ({ ...prev, hero: { ...prev.hero, banner_images: newImgs } }));
                                }}
                                style={{ flex: 1, fontSize: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '5px', padding: '5px 8px', outline: 'none' }}
                              />
                              {/* Upload đổi ảnh */}
                              <label style={{ cursor: 'pointer', color: '#4caf50', fontSize: '0.85rem', flexShrink: 0 }} title="Đổi ảnh">
                                📁
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) uploadBannerImage(file, (url) => {
                                      const newImgs = [...(contactData.hero?.banner_images || [])];
                                      newImgs[idx] = url;
                                      setContactData(prev => ({ ...prev, hero: { ...prev.hero, banner_images: newImgs } }));
                                    }, `slide_${idx}`);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Slider thời gian chuyển ảnh */}
                    {(contactData.hero?.banner_images || []).length > 1 && (
                      <div style={{ marginTop: '8px', padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <label className="sys-settings-label">
                          ⏱️ Thời gian chuyển ảnh: <strong style={{ color: '#667eea' }}>{((contactData.hero?.banner_interval || 4000) / 1000).toFixed(1)}s</strong>
                        </label>
                        <input
                          type="range"
                          min="2000" max="10000" step="500"
                          value={contactData.hero?.banner_interval || 4000}
                          onChange={(e) => setContactData(prev => ({
                            ...prev,
                            hero: { ...prev.hero, banner_interval: parseInt(e.target.value) }
                          }))}
                          style={{ width: '100%', accentColor: '#667eea', marginTop: '6px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                          <span>2s (nhanh)</span><span>6s</span><span>10s (chậm)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: INFO CARDS */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('contact', 'info_cards')}>
              <h3 className="sys-settings-section-title">2. Thẻ thông tin liên hệ</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('contact', contactData, 'Lưu Thẻ thông tin thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setContactData, 'info_cards', { 
                    icon: 'FaPhone', 
                    title: '', 
                    details: [],
                    color: '#4CAF50'
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.contact.info_cards ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.contact.info_cards && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(contactData.info_cards || []).map((card, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Thẻ {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={card.icon || ''} 
                        onChange={(icon) => handleArrayChange(setContactData, 'info_cards', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={card.title || ''} placeholder="Điện thoại"
                        onChange={(e) => handleArrayChange(setContactData, 'info_cards', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Chi tiết (mỗi dòng 1 item)</label>
                      <RichTextArea 
                        value={(card.details || []).join('\n')} 
                        placeholder="Hotline: (028) 3822 1234&#10;Cấp cứu: (028) 3822 9999"
                        onChange={(val) => handleArrayChange(setContactData, 'info_cards', index, 'details', val.split('\n').filter(d => d.trim()))}
                        rows={5}
                      />
                      
                      <label className="sys-settings-label">Màu sắc icon</label>
                      <input type="color" value={card.color || '#4CAF50'}
                        onChange={(e) => handleArrayChange(setContactData, 'info_cards', index, 'color', e.target.value)}
                        style={{ width: '100%', height: '40px', border: '2px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer' }} />
                      
                      <button type="button" onClick={() => removeArrayItem(setContactData, 'info_cards', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: DEPARTMENTS */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('contact', 'departments')}>
              <h3 className="sys-settings-section-title">3. Liên hệ các khoa</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('contact', contactData, 'Lưu Các khoa thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setContactData, 'departments', { 
                    name: '', 
                    phone: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.contact.departments ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.contact.departments && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(contactData.departments || []).map((dept, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Khoa {index + 1}
                      </h4>

                      <label className="sys-settings-label">Tên khoa</label>
                      <input type="text" value={dept.name || ''} placeholder="Khoa Nội"
                        onChange={(e) => handleArrayChange(setContactData, 'departments', index, 'name', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Số điện thoại</label>
                      <input type="text" value={dept.phone || ''} placeholder="(028) 3822 1235"
                        onChange={(e) => handleArrayChange(setContactData, 'departments', index, 'phone', e.target.value)}
                        className="sys-settings-input" />
                      
                      <button type="button" onClick={() => removeArrayItem(setContactData, 'departments', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: FAQs */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('contact', 'faqs')}>
              <h3 className="sys-settings-section-title">4. Câu hỏi thường gặp</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('contact', contactData, 'Lưu FAQs thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setContactData, 'faqs', { 
                    question: '', 
                    answer: '' 
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.contact.faqs ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.contact.faqs && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(contactData.faqs || []).map((faq, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        FAQ {index + 1}
                      </h4>

                      <label className="sys-settings-label">Câu hỏi</label>
                      <input type="text" value={faq.question || ''} placeholder="Làm thế nào để đặt lịch khám?"
                        onChange={(e) => handleArrayChange(setContactData, 'faqs', index, 'question', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Câu trả lời</label>
                      <RichTextArea 
                        value={faq.answer || ''} 
                        placeholder="Bạn có thể đặt lịch qua..."
                        onChange={(val) => handleArrayChange(setContactData, 'faqs', index, 'answer', val)}
                        rows={4} />
                      
                      <button type="button" onClick={() => removeArrayItem(setContactData, 'faqs', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: MAP */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('contact', 'map')}>
              <h3 className="sys-settings-section-title">5. Bản đồ & Hướng dẫn</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('contact', contactData, 'Lưu Bản đồ thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.contact.map ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.contact.map && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Google Map Embed
                    </h4>

                    <label className="sys-settings-label">URL Google Map Embed</label>
                    <RichTextArea 
                      value={contactData.map_embed || ''} 
                      placeholder="https://www.google.com/maps/embed?pb=..."
                      onChange={(val) => setContactData(prev => ({ ...prev, map_embed: val }))}
                      rows={5} />
                    
                    <label className="sys-settings-label">Hướng dẫn đi lại (mỗi dòng 1 item)</label>
                    <RichTextArea 
                      value={(contactData.directions || []).join('\n')} 
                      placeholder="🚇 Gần ga metro Bến Thành (300m)&#10;🚌 Các tuyến bus: 03, 14, 36, 93"
                      onChange={(val) => setContactData(prev => ({ 
                        ...prev, 
                        directions: val.split('\n').filter(d => d.trim())
                      }))}
                      rows={5}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

        {/* SECTION 6: SOCIAL LINKS */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('contact', 'social')}>
              <h3 className="sys-settings-section-title">6. Mạng xã hội</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => { e.stopPropagation(); saveData('contact', contactData, 'Lưu Mạng xã hội thành công!'); }}
                  className="sys-settings-section-save-inline" type="button">
                  <FaSave /> Lưu
                </button>
                {openSections.contact?.social ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.contact?.social && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>Liên kết mạng xã hội</h4>
                    <label className="sys-settings-label">Facebook URL</label>
                    <input type="url" value={contactData.social_links?.facebook || ''} placeholder="https://facebook.com/page"
                      onChange={(e) => setContactData(prev => ({ ...prev, social_links: { ...prev.social_links, facebook: e.target.value } }))}
                      className="sys-settings-input" />
                    <label className="sys-settings-label">Instagram URL</label>
                    <input type="url" value={contactData.social_links?.instagram || ''} placeholder="https://instagram.com/page"
                      onChange={(e) => setContactData(prev => ({ ...prev, social_links: { ...prev.social_links, instagram: e.target.value } }))}
                      className="sys-settings-input" />
                    <label className="sys-settings-label">YouTube URL</label>
                    <input type="url" value={contactData.social_links?.youtube || ''} placeholder="https://youtube.com/channel"
                      onChange={(e) => setContactData(prev => ({ ...prev, social_links: { ...prev.social_links, youtube: e.target.value } }))}
                      className="sys-settings-input" />
                    <label className="sys-settings-label">Zalo URL</label>
                    <input type="url" value={contactData.social_links?.zalo || ''} placeholder="https://zalo.me/..."
                      onChange={(e) => setContactData(prev => ({ ...prev, social_links: { ...prev.social_links, zalo: e.target.value } }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 7: BRANCHES */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('contact', 'branches')}>
              <h3 className="sys-settings-section-title">7. Cơ sở chi nhánh</h3>
              <div className="sys-settings-section-actions">
                <button onClick={(e) => { e.stopPropagation(); saveData('contact', contactData, 'Lưu Chi nhánh thành công!'); }}
                  className="sys-settings-section-save-inline" type="button"><FaSave /> Lưu</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); addArrayItem(setContactData, 'branches', { name: '', address: '', phone: '', hours: '', map_embed: '', is_main: false }); }}
                  className="sys-settings-btn sys-settings-btn-primary"><FaPlus /> Thêm</button>
                {openSections.contact?.branches ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.contact?.branches && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(contactData.branches || []).map((branch, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>Chi nhánh {index + 1}</h4>
                      <label className="sys-settings-label">Tên cơ sở</label>
                      <input type="text" value={branch.name || ''} placeholder="Cơ sở chính - Quận 1"
                        onChange={(e) => handleArrayChange(setContactData, 'branches', index, 'name', e.target.value)}
                        className="sys-settings-input" />
                      <label className="sys-settings-label">Địa chỉ</label>
                      <input type="text" value={branch.address || ''} placeholder="123 Nguyễn Huệ, Q.1, TP.HCM"
                        onChange={(e) => handleArrayChange(setContactData, 'branches', index, 'address', e.target.value)}
                        className="sys-settings-input" />
                      <label className="sys-settings-label">Số điện thoại</label>
                      <input type="text" value={branch.phone || ''} placeholder="(028) 3822 1234"
                        onChange={(e) => handleArrayChange(setContactData, 'branches', index, 'phone', e.target.value)}
                        className="sys-settings-input" />
                      <label className="sys-settings-label">Giờ làm việc</label>
                      <input type="text" value={branch.hours || ''} placeholder="T2-T7: 7:00-20:00 | CN: 8:00-17:00"
                        onChange={(e) => handleArrayChange(setContactData, 'branches', index, 'hours', e.target.value)}
                        className="sys-settings-input" />
                      <label className="sys-settings-label">Google Map Embed URL</label>
                      <input type="url" value={branch.map_embed || ''} placeholder="https://www.google.com/maps/embed?pb=..."
                        onChange={(e) => handleArrayChange(setContactData, 'branches', index, 'map_embed', e.target.value)}
                        className="sys-settings-input" />
                      <label className="sys-settings-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={branch.is_main || false}
                          onChange={(e) => handleArrayChange(setContactData, 'branches', index, 'is_main', e.target.checked)} />
                        Đây là cơ sở chính
                      </label>
                      <button type="button" onClick={() => removeArrayItem(setContactData, 'branches', index)}
                        className="sys-settings-btn sys-settings-btn-danger" style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

        </TabPanel>
        )}

        {/* ==================== TAB PRIVACY ==================== */}
        {canEditPrivacy && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: HERO */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('privacy', 'hero')}>
              <h3 className="sys-settings-section-title">1. Hero Section</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('privacy', privacyData, 'Lưu Hero thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.privacy.hero ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.privacy.hero && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Hero Privacy
                    </h4>

                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={privacyData.hero?.title || ''} placeholder="Chính sách bảo mật"
                      onChange={(e) => setPrivacyData(prev => ({ 
                        ...prev, 
                        hero: { ...prev.hero, title: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <RichTextArea 
                      value={privacyData.hero?.subtitle || ''} 
                      placeholder="Chúng tôi cam kết bảo vệ..."
                      onChange={(val) => setPrivacyData(prev => ({ 
                        ...prev, 
                        hero: { ...prev.hero, subtitle: val }
                      }))}
                      rows={4} />
                    
                    <label className="sys-settings-label">Cập nhật lần cuối</label>
                    <input type="text" value={privacyData.hero?.last_updated || ''} placeholder="06/10/2025"
                      onChange={(e) => setPrivacyData(prev => ({ 
                        ...prev, 
                        hero: { ...prev.hero, last_updated: e.target.value }
                      }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: SECTIONS */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('privacy', 'sections')}>
              <h3 className="sys-settings-section-title">2. Các phần nội dung</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('privacy', privacyData, 'Lưu Nội dung thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setPrivacyData, 'sections', { 
                    icon: 'FaDatabase', 
                    title: '', 
                    items: []
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.privacy.sections ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.privacy.sections && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(privacyData.sections || []).map((section, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Section {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={section.icon || ''} 
                        onChange={(icon) => handleArrayChange(setPrivacyData, 'sections', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={section.title || ''} placeholder="Thông tin chúng tôi thu thập"
                        onChange={(e) => handleArrayChange(setPrivacyData, 'sections', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Các mục (format: Subtitle|Content, mỗi dòng 1 mục)</label>
                      <RichTextArea 
                        value={(section.items || []).map(item => `${item.subtitle}|${item.content}`).join('\n')}
                        onChange={(val) => {
                          const lines = val.split('\n').filter(line => line.trim());
                          const items = lines.map(line => {
                            const [subtitle, content] = line.split('|');
                            return { 
                              subtitle: subtitle?.trim() || '', 
                              content: content?.trim() || '' 
                            };
                          });
                          handleArrayChange(setPrivacyData, 'sections', index, 'items', items);
                        }}
                        placeholder="Thông tin cá nhân|Họ và tên, ngày sinh..."
                        rows={7}
                      />
                      
                      <button type="button" onClick={() => removeArrayItem(setPrivacyData, 'sections', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: CONTACT */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('privacy', 'contact')}>
              <h3 className="sys-settings-section-title">3. Thông tin liên hệ</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('privacy', privacyData, 'Lưu Liên hệ thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.privacy.contact ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.privacy.contact && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Liên hệ Privacy
                    </h4>

                    <label className="sys-settings-label">Email liên hệ</label>
                    <input type="email" value={privacyData.contact_email || ''} placeholder="privacy@easymedify.vn"
                      onChange={(e) => setPrivacyData(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Số điện thoại</label>
                    <input type="text" value={privacyData.contact_phone || ''} placeholder="(028) 3822 1234"
                      onChange={(e) => setPrivacyData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Địa chỉ</label>
                    <input type="text" value={privacyData.contact_address || ''} placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
                      onChange={(e) => setPrivacyData(prev => ({ ...prev, contact_address: e.target.value }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

        </TabPanel>
        )}

        {/* ==================== TAB TERMS ==================== */}
        {canEditTerms && (
        <TabPanel className="sys-settings-tab-panel">
          
          {/* SECTION 1: HERO */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('terms', 'hero')}>
              <h3 className="sys-settings-section-title">1. Hero Section</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('terms', termsData, 'Lưu Hero thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.terms.hero ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.terms.hero && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Hero Terms
                    </h4>

                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={termsData.hero?.title || ''} placeholder="Điều khoản dịch vụ"
                      onChange={(e) => setTermsData(prev => ({ 
                        ...prev, 
                        hero: { ...prev.hero, title: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Phụ đề</label>
                    <RichTextArea 
                      value={termsData.hero?.subtitle || ''} 
                      placeholder="Vui lòng đọc kỹ các điều khoản..."
                      onChange={(val) => setTermsData(prev => ({ 
                        ...prev, 
                        hero: { ...prev.hero, subtitle: val }
                      }))}
                      rows={4} />
                    
                    <label className="sys-settings-label">Có hiệu lực từ</label>
                    <input type="text" value={termsData.hero?.effective_date || ''} placeholder="01/01/2025"
                      onChange={(e) => setTermsData(prev => ({ 
                        ...prev, 
                        hero: { ...prev.hero, effective_date: e.target.value }
                      }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: INTRO */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('terms', 'intro')}>
              <h3 className="sys-settings-section-title">2. Giới thiệu</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('terms', termsData, 'Lưu Giới thiệu thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.terms.intro ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.terms.intro && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Intro Terms
                    </h4>

                    <label className="sys-settings-label">Tiêu đề</label>
                    <input type="text" value={termsData.intro?.title || ''} placeholder="Chào mừng đến với Phòng khám Đa khoa"
                      onChange={(e) => setTermsData(prev => ({ 
                        ...prev, 
                        intro: { ...prev.intro, title: e.target.value }
                      }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Nội dung</label>
                    <RichTextArea 
                      value={termsData.intro?.content || ''} 
                      placeholder="Các điều khoản dịch vụ này điều chỉnh..."
                      onChange={(val) => setTermsData(prev => ({ 
                        ...prev, 
                        intro: { ...prev.intro, content: val }
                      }))}
                      rows={5} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 3: SECTIONS */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('terms', 'sections')}>
              <h3 className="sys-settings-section-title">3. Các phần nội dung</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('terms', termsData, 'Lưu Nội dung thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                <button type="button" onClick={(e) => { 
                  e.stopPropagation(); 
                  addArrayItem(setTermsData, 'sections', { 
                    icon: 'FaUserCheck', 
                    title: '', 
                    items: []
                  }); 
                }}
                  className="sys-settings-btn sys-settings-btn-primary">
                  <FaPlus /> Thêm
                </button>
                {openSections.terms.sections ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.terms.sections && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  {(termsData.sections || []).map((section, index) => (
                    <div key={index} className="sys-settings-card">
                      <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                        Section {index + 1}
                      </h4>

                      <label className="sys-settings-label">Icon</label>
                      <CustomIconPicker value={section.icon || ''} 
                        onChange={(icon) => handleArrayChange(setTermsData, 'sections', index, 'icon', icon)} />
                      
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" value={section.title || ''} placeholder="Chấp nhận điều khoản"
                        onChange={(e) => handleArrayChange(setTermsData, 'sections', index, 'title', e.target.value)}
                        className="sys-settings-input" />
                      
                      <label className="sys-settings-label">Các mục (format: Subtitle|Content, mỗi dòng 1 mục)</label>
                      <RichTextArea 
                        value={(section.items || []).map(item => `${item.subtitle}|${item.content}`).join('\n')}
                        onChange={(val) => {
                          const lines = val.split('\n').filter(line => line.trim());
                          const items = lines.map(line => {
                            const [subtitle, content] = line.split('|');
                            return { 
                              subtitle: subtitle?.trim() || '', 
                              content: content?.trim() || '' 
                            };
                          });
                          handleArrayChange(setTermsData, 'sections', index, 'items', items);
                        }}
                        placeholder="Đồng ý sử dụng|Bằng việc sử dụng dịch vụ..."
                        rows={7}
                      />
                      
                      <button type="button" onClick={() => removeArrayItem(setTermsData, 'sections', index)}
                        className="sys-settings-btn sys-settings-btn-danger" 
                        style={{ marginTop: '16px', width: '100%' }}>
                        <FaTrash /> Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: CONTACT */}
          <section className="sys-settings-section">
            <div className="sys-settings-section-header" onClick={() => toggleSection('terms', 'contact')}>
              <h3 className="sys-settings-section-title">4. Thông tin liên hệ</h3>
              <div className="sys-settings-section-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveData('terms', termsData, 'Lưu Liên hệ thành công!');
                  }}
                  className="sys-settings-section-save-inline"
                  type="button"
                >
                  <FaSave /> Lưu
                </button>
                {openSections.terms.contact ? <FaChevronUp /> : <FaChevronDown />}
              </div>
            </div>
            {openSections.terms.contact && (
              <div className="sys-settings-section-content">
                <div className="sys-settings-grid">
                  <div className="sys-settings-card">
                    <h4 style={{ marginBottom: '12px', color: '#667eea', fontWeight: 'bold' }}>
                      Liên hệ Terms
                    </h4>

                    <label className="sys-settings-label">Email liên hệ</label>
                    <input type="email" value={termsData.contact_email || ''} placeholder="legal@easymedify.vn"
                      onChange={(e) => setTermsData(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="sys-settings-input" />
                    
                    <label className="sys-settings-label">Số điện thoại</label>
                    <input type="text" value={termsData.contact_phone || ''} placeholder="(028) 3822 1234"
                      onChange={(e) => setTermsData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      className="sys-settings-input" />
                  </div>
                </div>
              </div>
            )}
          </section>

        </TabPanel>
        )}

        {/* ==================== TAB DỊCH VỤ (SERVICES PAGE) ==================== */}
        {canEditServicesPage && (
          <TabPanel className="sys-settings-tab-panel">

            {/* SECTION 1: HERO TAB BỆNH VIỆN */}
            <section className="sys-settings-section">
              <div className="sys-settings-section-header" onClick={() => toggleSection('servicesPage', 'hospital_hero')}>
                <h3 className="sys-settings-section-title">1. Hero — Tab Khám tại Bệnh viện</h3>
                <div className="sys-settings-section-actions">
                  <button onClick={(e) => { e.stopPropagation(); saveData('services_page', servicesPageData, 'Lưu thành công!'); }}
                    className="sys-settings-section-save-inline" type="button"><FaSave /> Lưu</button>
                  {openSections.servicesPage.hospital_hero ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
              {openSections.servicesPage.hospital_hero && (
                <div className="sys-settings-section-content">
                  <div className="sys-settings-grid">
                    <div className="sys-settings-card">
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" className="sys-settings-input"
                        value={servicesPageData.hospital_hero?.title || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, hospital_hero: { ...prev.hospital_hero, title: e.target.value } }))} />

                      <label className="sys-settings-label">Mô tả phụ</label>
                      <input type="text" className="sys-settings-input"
                        value={servicesPageData.hospital_hero?.subtitle || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, hospital_hero: { ...prev.hospital_hero, subtitle: e.target.value } }))} />

                      <label className="sys-settings-label">URL ảnh nền</label>
                      <input type="text" className="sys-settings-input"
                        value={servicesPageData.hospital_hero?.image || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, hospital_hero: { ...prev.hospital_hero, image: e.target.value } }))} />
                      <label className="sys-settings-label">Hoặc upload ảnh</label>
                      <input type="file" accept="image/*" onChange={(e) => {
                        if (e.target.files[0]) uploadBannerImage(e.target.files[0], (url) =>
                          setServicesPageData(prev => ({ ...prev, hospital_hero: { ...prev.hospital_hero, image: url } })), 'hosp_hero');
                      }} className="sys-settings-input" />
                      {servicesPageData.hospital_hero?.image && (
                        <img src={servicesPageData.hospital_hero.image} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 2: HERO TAB TƯ VẤN */}
            <section className="sys-settings-section">
              <div className="sys-settings-section-header" onClick={() => toggleSection('servicesPage', 'consultation_hero')}>
                <h3 className="sys-settings-section-title">2. Hero — Tab Tư vấn Trực tuyến</h3>
                <div className="sys-settings-section-actions">
                  <button onClick={(e) => { e.stopPropagation(); saveData('services_page', servicesPageData, 'Lưu thành công!'); }}
                    className="sys-settings-section-save-inline" type="button"><FaSave /> Lưu</button>
                  {openSections.servicesPage.consultation_hero ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
              {openSections.servicesPage.consultation_hero && (
                <div className="sys-settings-section-content">
                  <div className="sys-settings-grid">
                    <div className="sys-settings-card">
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" className="sys-settings-input"
                        value={servicesPageData.consultation_hero?.title || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, consultation_hero: { ...prev.consultation_hero, title: e.target.value } }))} />

                      <label className="sys-settings-label">Mô tả phụ</label>
                      <input type="text" className="sys-settings-input"
                        value={servicesPageData.consultation_hero?.subtitle || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, consultation_hero: { ...prev.consultation_hero, subtitle: e.target.value } }))} />

                      <label className="sys-settings-label">URL ảnh nền</label>
                      <input type="text" className="sys-settings-input"
                        value={servicesPageData.consultation_hero?.image || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, consultation_hero: { ...prev.consultation_hero, image: e.target.value } }))} />
                      <label className="sys-settings-label">Hoặc upload ảnh</label>
                      <input type="file" accept="image/*" onChange={(e) => {
                        if (e.target.files[0]) uploadBannerImage(e.target.files[0], (url) =>
                          setServicesPageData(prev => ({ ...prev, consultation_hero: { ...prev.consultation_hero, image: url } })), 'con_hero');
                      }} className="sys-settings-input" />
                      {servicesPageData.consultation_hero?.image && (
                        <img src={servicesPageData.consultation_hero.image} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 3: SỐ LIỆU HERO */}
            <section className="sys-settings-section">
              <div className="sys-settings-section-header" onClick={() => toggleSection('servicesPage', 'hero_stats')}>
                <h3 className="sys-settings-section-title">3. Số liệu nổi bật (Hero Stats)</h3>
                <div className="sys-settings-section-actions">
                  <button onClick={(e) => { e.stopPropagation(); saveData('services_page', servicesPageData, 'Lưu thành công!'); }}
                    className="sys-settings-section-save-inline" type="button"><FaSave /> Lưu</button>
                  {openSections.servicesPage.hero_stats ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
              {openSections.servicesPage.hero_stats && (
                <div className="sys-settings-section-content">
                  <div className="sys-settings-grid">
                    {(servicesPageData.hero_stats || []).map((stat, idx) => (
                      <div key={idx} className="sys-settings-card">
                        <label className="sys-settings-label">Số ({idx + 1})</label>
                        <input type="text" className="sys-settings-input" value={stat.num || ''}
                          placeholder="500+" onChange={(e) => {
                            const arr = [...(servicesPageData.hero_stats || [])];
                            arr[idx] = { ...arr[idx], num: e.target.value };
                            setServicesPageData(prev => ({ ...prev, hero_stats: arr }));
                          }} />
                        <label className="sys-settings-label">Nhãn</label>
                        <input type="text" className="sys-settings-input" value={stat.lbl || ''}
                          placeholder="Bác sĩ" onChange={(e) => {
                            const arr = [...(servicesPageData.hero_stats || [])];
                            arr[idx] = { ...arr[idx], lbl: e.target.value };
                            setServicesPageData(prev => ({ ...prev, hero_stats: arr }));
                          }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 4: QUY TRÌNH 3 BƯỚC */}
            <section className="sys-settings-section">
              <div className="sys-settings-section-header" onClick={() => toggleSection('servicesPage', 'consultation_steps')}>
                <h3 className="sys-settings-section-title">4. Quy trình 3 bước (Tab Tư vấn)</h3>
                <div className="sys-settings-section-actions">
                  <button onClick={(e) => { e.stopPropagation(); saveData('services_page', servicesPageData, 'Lưu thành công!'); }}
                    className="sys-settings-section-save-inline" type="button"><FaSave /> Lưu</button>
                  {openSections.servicesPage.consultation_steps ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
              {openSections.servicesPage.consultation_steps && (
                <div className="sys-settings-section-content">
                  <div className="sys-settings-grid">
                    {(servicesPageData.consultation_steps || []).map((step, idx) => (
                      <div key={idx} className="sys-settings-card">
                        <label className="sys-settings-label">Số thứ tự</label>
                        <input type="text" className="sys-settings-input" value={step.num || ''}
                          onChange={(e) => { const arr = [...(servicesPageData.consultation_steps || [])]; arr[idx] = { ...arr[idx], num: e.target.value }; setServicesPageData(prev => ({ ...prev, consultation_steps: arr })); }} />
                        <label className="sys-settings-label">Tiêu đề bước</label>
                        <input type="text" className="sys-settings-input" value={step.label || ''}
                          onChange={(e) => { const arr = [...(servicesPageData.consultation_steps || [])]; arr[idx] = { ...arr[idx], label: e.target.value }; setServicesPageData(prev => ({ ...prev, consultation_steps: arr })); }} />
                        <label className="sys-settings-label">Mô tả</label>
                        <textarea rows={2} className="sys-settings-textarea" value={step.desc || ''}
                          onChange={(e) => { const arr = [...(servicesPageData.consultation_steps || [])]; arr[idx] = { ...arr[idx], desc: e.target.value }; setServicesPageData(prev => ({ ...prev, consultation_steps: arr })); }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 5: CAM KẾT (WHY CHOOSE) */}
            <section className="sys-settings-section">
              <div className="sys-settings-section-header" onClick={() => toggleSection('servicesPage', 'why_choose')}>
                <h3 className="sys-settings-section-title">5. Cam kết — Tại sao chọn chúng tôi</h3>
                <div className="sys-settings-section-actions">
                  <button onClick={(e) => { e.stopPropagation(); saveData('services_page', servicesPageData, 'Lưu thành công!'); }}
                    className="sys-settings-section-save-inline" type="button"><FaSave /> Lưu</button>
                  {openSections.servicesPage.why_choose ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
              {openSections.servicesPage.why_choose && (
                <div className="sys-settings-section-content">
                  <div className="sys-settings-grid">
                    {(servicesPageData.why_choose || []).map((item, idx) => (
                      <div key={idx} className="sys-settings-card">
                        <label className="sys-settings-label">Tiêu đề ({idx + 1})</label>
                        <input type="text" className="sys-settings-input" value={item.title || ''}
                          onChange={(e) => { const arr = [...(servicesPageData.why_choose || [])]; arr[idx] = { ...arr[idx], title: e.target.value }; setServicesPageData(prev => ({ ...prev, why_choose: arr })); }} />
                        <label className="sys-settings-label">Mô tả</label>
                        <textarea rows={2} className="sys-settings-textarea" value={item.desc || ''}
                          onChange={(e) => { const arr = [...(servicesPageData.why_choose || [])]; arr[idx] = { ...arr[idx], desc: e.target.value }; setServicesPageData(prev => ({ ...prev, why_choose: arr })); }} />
                        <label className="sys-settings-label">Màu icon</label>
                        <input type="color" value={item.color || '#0ea5a4'}
                          onChange={(e) => { const arr = [...(servicesPageData.why_choose || [])]; arr[idx] = { ...arr[idx], color: e.target.value }; setServicesPageData(prev => ({ ...prev, why_choose: arr })); }} />
                      </div>
                    ))}
                  </div>
                  <button type="button" className="sys-settings-btn sys-settings-btn-secondary" style={{ marginTop: 12 }}
                    onClick={() => setServicesPageData(prev => ({ ...prev, why_choose: [...(prev.why_choose || []), { icon: 'FaCheckCircle', title: '', desc: '', color: '#0ea5a4' }] }))}>
                    <FaPlus /> Thêm mục
                  </button>
                </div>
              )}
            </section>

            {/* SECTION 6: CTA BANNERS */}
            <section className="sys-settings-section">
              <div className="sys-settings-section-header" onClick={() => toggleSection('servicesPage', 'cta')}>
                <h3 className="sys-settings-section-title">6. Banner kêu gọi hành động (CTA)</h3>
                <div className="sys-settings-section-actions">
                  <button onClick={(e) => { e.stopPropagation(); saveData('services_page', servicesPageData, 'Lưu thành công!'); }}
                    className="sys-settings-section-save-inline" type="button"><FaSave /> Lưu</button>
                  {openSections.servicesPage.cta ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
              {openSections.servicesPage.cta && (
                <div className="sys-settings-section-content">
                  <div className="sys-settings-grid">
                    <div className="sys-settings-card">
                      <h4 style={{ marginBottom: 12, color: '#667eea', fontWeight: 'bold' }}>Tab Bệnh viện</h4>
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" className="sys-settings-input" value={servicesPageData.hospital_cta?.title || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, hospital_cta: { ...prev.hospital_cta, title: e.target.value } }))} />
                      <label className="sys-settings-label">Mô tả phụ</label>
                      <input type="text" className="sys-settings-input" value={servicesPageData.hospital_cta?.subtitle || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, hospital_cta: { ...prev.hospital_cta, subtitle: e.target.value } }))} />
                      <label className="sys-settings-label">Số điện thoại</label>
                      <input type="text" className="sys-settings-input" value={servicesPageData.hospital_cta?.phone || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, hospital_cta: { ...prev.hospital_cta, phone: e.target.value } }))} />
                    </div>
                    <div className="sys-settings-card">
                      <h4 style={{ marginBottom: 12, color: '#667eea', fontWeight: 'bold' }}>Tab Tư vấn</h4>
                      <label className="sys-settings-label">Tiêu đề</label>
                      <input type="text" className="sys-settings-input" value={servicesPageData.consultation_cta?.title || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, consultation_cta: { ...prev.consultation_cta, title: e.target.value } }))} />
                      <label className="sys-settings-label">Mô tả phụ</label>
                      <input type="text" className="sys-settings-input" value={servicesPageData.consultation_cta?.subtitle || ''}
                        onChange={(e) => setServicesPageData(prev => ({ ...prev, consultation_cta: { ...prev.consultation_cta, subtitle: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              )}
            </section>

          </TabPanel>
        )}

        {/* ==================== TAB LỊCH SỬ (SYSTEM AUDIT) ==================== */}
        {canViewAuditLogs && (
          <TabPanel className="sys-settings-tab-panel">
            <SystemAuditTab />
          </TabPanel>
        )}

          </div> {/* End of sys-settings-content-area */}
        </Tabs>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
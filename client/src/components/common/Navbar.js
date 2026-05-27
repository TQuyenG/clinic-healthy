// client/src/components/common/Navbar.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaSearch, FaUser, FaBars, FaTimes, FaSignOutAlt, FaChevronDown,
  FaTachometerAlt, FaCalendarAlt, FaUserMd, FaNewspaper, FaPills,
  FaHeartbeat, FaCogs, FaInfoCircle, FaBuilding, FaMicroscope, 
  FaSignInAlt, FaUserPlus, FaBookmark, FaStethoscope, FaComments,
  FaEye, FaFolder, FaArrowRight, FaSpinner, FaPhone
} from 'react-icons/fa';

import NotificationDropdown from './NotificationDropdown';
import './Navbar.css';
import { useAuth } from '../../contexts/AuthContext'; 

// Component riêng để hiển thị avatar người dùng
const UserAvatar = ({ user, userProfile }) => {
  const [isImageError, setIsImageError] = useState(false);

  const currentUser = userProfile || user;

  if (!currentUser) {
    return (
      <div className="navbar-user-avatar-placeholder">
        <FaUser />
      </div>
    );
  }

  if (currentUser.avatar_url && !isImageError) {
    return (
      <>
        <img 
          src={currentUser.avatar_url} 
          alt={currentUser.full_name || currentUser.email} 
          className="navbar-user-avatar"
          onError={() => setIsImageError(true)}
        />
        <div className="navbar-user-avatar-placeholder" style={{ display: 'none' }}>
          {currentUser.full_name?.charAt(0)?.toUpperCase() || 
           currentUser.email?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </>
    );
  }

  const initial = currentUser.full_name?.charAt(0)?.toUpperCase() || 
                 currentUser.email?.charAt(0)?.toUpperCase() || 'U';
  
  return (
    <div className="navbar-user-avatar-placeholder">
      {initial}
    </div>
  );
};

const Navbar = () => {
  const { user: authUser, logout: authLogout, isAuthenticated } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // State quản lý popup logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [userProfile, setUserProfile] = useState(null);
  const [unreadConsultationCount, setUnreadConsultationCount] = useState(0);
  const [specialties, setSpecialties] = useState([]);
  const [categories, setCategories] = useState({
    tin_tuc: [], thuoc: [], benh_ly: []
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeMobileColumn, setActiveMobileColumn] = useState(null);
  const [navbarData, setNavbarData] = useState({
    logo_image: '', logo_text: 'Easy Medify'
  });
  
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    if (authUser) {
      const token = localStorage.getItem('token');
      if (token) {
        fetchUserProfile(token);
      }
    } else {
      setUserProfile(null);
    }
  }, [authUser]); 

  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUserProfile(null);
      }
    };

    window.addEventListener('authStateChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    fetchSpecialties();
    fetchCategories();
    fetchNavbarData();

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success || response.data.user) {
        const profileData = response.data.user || response.data;
        setUserProfile(profileData);
        
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { 
          ...currentUser, 
          avatar_url: profileData.avatar_url, 
          full_name: profileData.full_name 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        window.dispatchEvent(new Event('authStateChanged'));
      }
    } catch (error) {
      console.error('Lỗi khi lấy profile:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        authLogout();
      }
    }
  };

  const fetchNavbarData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/header-nav-footer`);
      if (response.data && response.data.navbar) {
        const navbar = response.data.navbar;
        
        if (navbar.logo_image && !navbar.logo_image.startsWith('http')) {
          if (!navbar.logo_image.startsWith('/')) {
            navbar.logo_image = '/' + navbar.logo_image;
          }
        }
        
        setNavbarData(navbar);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu navbar:', error);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/specialties`);
      if (response.data.success) setSpecialties(response.data.specialties || []);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách chuyên khoa:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/categories`);
      if (response.data.success) {
        const cats = response.data.categories || [];
        setCategories({
          tin_tuc: cats.filter(c => c.category_type === 'tin_tuc'),
          thuoc: cats.filter(c => c.category_type === 'thuoc'),
          benh_ly: cats.filter(c => c.category_type === 'benh_ly')
        });
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách danh mục:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim().length < 1) {
      setSearchResults(null);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/articles/search/global?q=${encodeURIComponent(query)}`);
        if (response.data.success) {
          setSearchResults(response.data.results);
        }
      } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchResults(false);
      setSearchQuery('');
      closeAllDropdowns();
    }
  };

  const handleResultClick = (type, item) => {
    setShowSearchResults(false);
    setSearchQuery('');
    closeAllDropdowns();
    
    const typeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
    
    switch(type) {
      case 'medicines':
        navigate(`/tra-cuu-thuoc/${item.slug}`);
        break;
      case 'diseases':
        navigate(`/tra-cuu-benh-ly/${item.slug}`);
        break;
      case 'articles':
        if (item.category_type && typeMap[item.category_type]) {
          navigate(`/${typeMap[item.category_type]}/${item.slug}`);
        } else {
          navigate(`/bai-viet/${item.slug}`);
        }
        break;
      case 'categories':
        if (item.category_type && typeMap[item.category_type]) {
          navigate(`/${typeMap[item.category_type]}/${item.slug}`);
        } else {
          navigate(`/danh-muc/${item.slug}`);
        }
        break;
      case 'specialties':
        navigate(`/chuyen-khoa/${item.slug}`);
        break;
      case 'doctors':
        navigate(`/bac-si/${item.code}`);
        break;
      default:
        break;
    }
  };

  // Mở modal xác nhận đăng xuất
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    closeAllDropdowns();
  };

  // Xác nhận đăng xuất
  const confirmLogout = () => {
    authLogout();
    setShowLogoutModal(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
    if (name !== 'user') setActiveMobileColumn(null);
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
    setActiveMobileColumn(null);
    setIsMenuOpen(false);
    document.body.style.overflow = 'unset';
  };

  const toggleMobileColumn = (column) => {
    setActiveMobileColumn(activeMobileColumn === column ? null : column);
  };

  const currentUser = authUser || userProfile;

  return (
    <nav className="navbar-main">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeAllDropdowns}>
          {navbarData.logo_image && (
            <img 
              src={navbarData.logo_image} 
              alt={navbarData.logo_text || 'Logo'}
              className="navbar-logo-img"
              onError={(e) => {
                e.target.style.display = 'none';
                const span = e.target.parentElement?.querySelector('.navbar-logo-text');
                if (span) span.style.display = 'block';
              }}
            />
          )}
          <span className="navbar-logo-text" style={{ display: navbarData.logo_image ? 'inline' : 'block' }}>
            {navbarData.logo_text}
          </span>
        </Link>

        {/* Mobile menu button */}
        <button 
          className="navbar-mobile-menu-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Search Container */}
        <div className="navbar-search-container">
          <div className="navbar-search" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="navbar-search-bar">
              <FaSearch />
              <input
                type="text"
                placeholder="Tìm kiếm bài viết, bác sĩ..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              />
              {isSearching && <FaSpinner className="navbar-spinner" />}
            </form>

            {showSearchResults && searchQuery.length >= 1 && (
              <div className="navbar-search-dropdown">
                {isSearching ? (
                  <div className="navbar-loading">
                    <FaSpinner />
                    <p>Đang tìm kiếm...</p>
                  </div>
                ) : searchResults ? (
                  <>
                    {/* MEDICINES SECTION */}
                    {searchResults.medicines && searchResults.medicines.length > 0 && (
                      <div className="navbar-search-section">
                        <div className="navbar-search-section-header">
                          <h3><FaPills /> Thuốc ({searchResults.medicines.length})</h3>
                          <button 
                            className="navbar-search-view-all"
                            onClick={() => {
                              navigate(`/tim-kiem?q=${encodeURIComponent(searchQuery)}&type=medicines`);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            Xem tất cả <FaArrowRight />
                          </button>
                        </div>
                        {searchResults.medicines.slice(0, 5).map(medicine => (
                          <div 
                            key={medicine.id} 
                            className="navbar-search-item navbar-search-medicine"
                            onClick={() => handleResultClick('medicines', medicine)}
                          >
                            {medicine.image_url && (
                              <img src={medicine.image_url} alt={medicine.name} className="navbar-search-thumb" />
                            )}
                            <div className="navbar-search-item-content">
                              <strong>{medicine.name}</strong>
                              <p>
                                {medicine.uses ? `${medicine.uses.substring(0, 60)}...` : 
                                 medicine.composition ? `Thành phần: ${medicine.composition.substring(0, 60)}...` : 
                                 medicine.manufacturer ? `NSX: ${medicine.manufacturer}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* DISEASES SECTION */}
                    {searchResults.diseases && searchResults.diseases.length > 0 && (
                      <div className="navbar-search-section">
                        <div className="navbar-search-section-header">
                          <h3><FaHeartbeat /> Bệnh lý ({searchResults.diseases.length})</h3>
                          <button 
                            className="navbar-search-view-all"
                            onClick={() => {
                              navigate(`/tim-kiem?q=${encodeURIComponent(searchQuery)}&type=diseases`);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            Xem tất cả <FaArrowRight />
                          </button>
                        </div>
                        {searchResults.diseases.slice(0, 5).map(disease => (
                          <div 
                            key={disease.id} 
                            className="navbar-search-item navbar-search-disease"
                            onClick={() => handleResultClick('diseases', disease)}
                          >
                            <div className="navbar-search-item-content">
                              <strong>{disease.name}</strong>
                              <p>
                                {disease.symptoms ? `Triệu chứng: ${disease.symptoms.substring(0, 60)}...` : 
                                 disease.treatments ? `Điều trị: ${disease.treatments.substring(0, 60)}...` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ARTICLES SECTION */}
                    {searchResults.articles && searchResults.articles.length > 0 && (
                      <div className="navbar-search-section">
                        <div className="navbar-search-section-header">
                          <h3><FaNewspaper /> Bài viết ({searchResults.articles.length})</h3>
                          <button 
                            className="navbar-search-view-all"
                            onClick={() => {
                              navigate(`/tim-kiem?q=${encodeURIComponent(searchQuery)}&type=articles`);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            Xem tất cả <FaArrowRight />
                          </button>
                        </div>
                        {searchResults.articles.slice(0, 5).map(article => (
                          <div 
                            key={article.id} 
                            className="navbar-search-item"
                            onClick={() => handleResultClick('articles', article)}
                          >
                            <div className="navbar-search-item-content">
                              <strong>{article.title}</strong>
                              {article.category && <p>Danh mục: {article.category}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.categories && searchResults.categories.length > 0 && (
                      <div className="navbar-search-section">
                        <div className="navbar-search-section-header">
                          <h3><FaFolder /> Danh mục ({searchResults.categories.length})</h3>
                          <button 
                            className="navbar-search-view-all"
                            onClick={() => {
                              navigate(`/tim-kiem?q=${encodeURIComponent(searchQuery)}&type=categories`);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            Xem tất cả <FaArrowRight />
                          </button>
                        </div>
                        {searchResults.categories.slice(0, 5).map((cat, index) => (
                          <div 
                            key={cat.id ?? index}
                            className="navbar-search-item"
                            onClick={() => handleResultClick('categories', cat)}
                          >
                            <div className="navbar-search-item-content">
                              <strong>{cat.name}</strong>
                              <p>{cat.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.specialties && searchResults.specialties.length > 0 && (
                      <div className="navbar-search-section">
                        <div className="navbar-search-section-header">
                          <h3><FaStethoscope /> Chuyên khoa ({searchResults.specialties.length})</h3>
                          <button 
                            className="navbar-search-view-all"
                            onClick={() => {
                              navigate(`/tim-kiem?q=${encodeURIComponent(searchQuery)}&type=specialties`);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            Xem tất cả <FaArrowRight />
                          </button>
                        </div>
                        {searchResults.specialties.slice(0, 5).map(sp => (
                          <div 
                            key={sp.id} 
                            className="navbar-search-item"
                            onClick={() => handleResultClick('specialties', sp)}
                          >
                            <div className="navbar-search-item-content">
                              <strong>{sp.name}</strong>
                              <p>{sp.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.doctors && searchResults.doctors.length > 0 && (
                      <div className="navbar-search-section">
                        <div className="navbar-search-section-header">
                          <h3><FaUserMd /> Bác sĩ ({searchResults.doctors.length})</h3>
                          <button 
                            className="navbar-search-view-all"
                            onClick={() => {
                              navigate(`/tim-kiem?q=${encodeURIComponent(searchQuery)}&type=doctors`);
                              setShowSearchResults(false);
                              setSearchQuery('');
                            }}
                          >
                            Xem tất cả <FaArrowRight />
                          </button>
                        </div>
                        {searchResults.doctors.slice(0, 5).map(doctor => (
                          <div 
                            key={doctor.id} 
                            className="navbar-search-item"
                            onClick={() => handleResultClick('doctors', doctor)}
                          >
                            <div className="navbar-search-item-content">
                              <strong>
                                {doctor.title && `${doctor.title} `}
                                {doctor.name}
                              </strong>
                              <p>
                                {doctor.specialty && `${doctor.specialty}`}
                                {doctor.specialty && doctor.experience && ' - '}
                                {doctor.experience && `${doctor.experience} năm kinh nghiệm`}
                              </p>
                              {doctor.workplace && (
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                  {doctor.workplace}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!searchResults.medicines || searchResults.medicines.length === 0) &&
                     (!searchResults.diseases || searchResults.diseases.length === 0) &&
                     (!searchResults.articles || searchResults.articles.length === 0) &&
                     (!searchResults.specialties || searchResults.specialties.length === 0) &&
                     (!searchResults.doctors || searchResults.doctors.length === 0) && (
                      <div className="navbar-no-results">
                        <FaSearch />
                        <p>Không tìm thấy kết quả</p>
                        <span>Thử tìm kiếm với từ khóa khác</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="navbar-no-results">
                    <FaSearch />
                    <p>Không tìm thấy kết quả</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile overlay */}
        <div 
          className={`navbar-mobile-overlay ${isMenuOpen ? 'active' : ''}`}
          onClick={closeAllDropdowns}
        ></div>

        {/* Center section - Navigation Menu */}
        <div className={`navbar-center ${isMenuOpen ? 'active' : ''}`}>
          <div className="navbar-nav-menu">

            <div className="navbar-nav-item">
              <button 
                className="navbar-nav-link"
                onClick={() => toggleDropdown('about')}
              >
                Giới thiệu
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'about' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu ${activeDropdown === 'about' ? 'show' : ''}`}>
                <Link to="/gioi-thieu" onClick={closeAllDropdowns}>
                  <FaInfoCircle /> Về chúng tôi
                </Link>
                <Link to="/dich-vu" onClick={closeAllDropdowns}>
                  <FaCogs /> Dịch vụ
                </Link>
                <Link to="/co-so-vat-chat" onClick={closeAllDropdowns}>
                  <FaBuilding /> Cơ sở vật chất
                </Link>
                <Link to="/trang-thiet-bi" onClick={closeAllDropdowns}>
                  <FaMicroscope /> Trang thiết bị
                </Link>
                <Link to="/lien-he" onClick={closeAllDropdowns}>
                  <FaPhone /> Liên hệ
                </Link>
              </div>
            </div>

            <div className="navbar-nav-item navbar-mega">
              <button 
                className="navbar-nav-link"
                onClick={() => toggleDropdown('medical')}
              >
                Đội ngũ y tế
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'medical' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu ${activeDropdown === 'medical' ? 'show' : ''}`}>
                <div className="navbar-mega-menu-grid">
                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'specialties' ? 'active' : ''}`}>
                    <Link 
                      to="/chuyen-khoa"
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('specialties');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="navbar-column-header"
                    >
                      <FaStethoscope /> Chuyên khoa
                    </Link>
                    {specialties.length > 0 && (
                      <div className="navbar-column-items">
                        {specialties.slice(0, 8).map(sp => (
                          <Link 
                            key={sp.id} 
                            to={`/chuyen-khoa/${sp.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {sp.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'doctors' ? 'active' : ''}`}>
                    <Link 
                      to="/bac-si"
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('doctors');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="navbar-column-header"
                    >
                      <FaUserMd /> Bác sĩ
                    </Link>
                    <div className="navbar-column-items">
                      <Link to="/bac-si" onClick={closeAllDropdowns}>
                        Tất cả bác sĩ
                      </Link>
                      <Link to="/bac-si?min_experience=5" onClick={closeAllDropdowns}>
                        Bác sĩ 5+ năm kinh nghiệm
                      </Link>
                      <Link to="/bac-si?min_experience=10" onClick={closeAllDropdowns}>
                        Bác sĩ 10+ năm kinh nghiệm
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="navbar-nav-item navbar-mega">
              <button 
                className="navbar-nav-link"
                onClick={() => toggleDropdown('articles')}
              >
                Cẩm nang y tế
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'articles' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu ${activeDropdown === 'articles' ? 'show' : ''}`}>
                <div className="navbar-mega-menu-grid">
                  <div className="navbar-mega-menu-column">
                    <Link 
                      to="/dien-dan-suc-khoe"
                      className="navbar-column-header"
                      onClick={closeAllDropdowns}
                    >
                      <FaComments /> Diễn đàn sức khỏe
                    </Link>
                  </div>
                  
                  {/* ===== CỘT TRA CỨU THUỐC ===== */}
                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'medicine-lookup' ? 'active' : ''}`}>
                    <Link 
                      to="/thuoc"
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('medicine-lookup');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="navbar-column-header"
                    >
                      <FaPills /> Danh mục thuốc
                    </Link>
                    {categories.thuoc && categories.thuoc.length > 0 && (
                      <div className="navbar-column-items">
                        <Link to="/tra-cuu-thuoc" onClick={closeAllDropdowns} className="navbar-dropdown-footer">
                          Tra cứu thuốc
                        </Link>
                        {categories.thuoc.slice(0, 5).map((cat, index) => (
                          <Link 
                            key={cat.id ?? index}
                            to={`/thuoc/${cat.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* ===== CỘT TRA CỨU BỆNH LÝ ===== */}
                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'disease-lookup' ? 'active' : ''}`}>
                    <Link 
                      to="/benh-ly"
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('disease-lookup');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="navbar-column-header"
                    >
                      <FaHeartbeat /> Danh mục bệnh lý
                    </Link>
                    {categories.benh_ly && categories.benh_ly.length > 0 && (
                      <div className="navbar-column-items">
                        <Link to="/tra-cuu-benh-ly" onClick={closeAllDropdowns} className="navbar-dropdown-footer">
                          Tra cứu bệnh lý
                        </Link>
                        {categories.benh_ly.slice(0, 5).map((cat, index) => (
                          <Link 
                            key={cat.id ?? index}
                            to={`/benh-ly/${cat.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'news' ? 'active' : ''}`}>
                    <Link 
                      to="/tin-tuc" 
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('news');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="navbar-column-header"
                    >
                      <FaNewspaper /> Tin tức
                    </Link>
                    {categories.tin_tuc && categories.tin_tuc.length > 0 && (
                      <div className="navbar-column-items">
                        {categories.tin_tuc.slice(0, 5).map((cat, index) => (
                          <Link 
                            key={cat.id ?? index}
                            to={`/tin-tuc/${cat.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {cat.name}
                          </Link>
                        ))}
                        <Link to="/bai-viet" onClick={closeAllDropdowns} className="navbar-dropdown-footer">
                          Xem tất cả bài viết
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="navbar-nav-item">
              <Link 
                to="/tra-cuu-ket-qua" 
                className="navbar-nav-link"
                onClick={closeAllDropdowns}
              >
                Tra cứu kết quả
              </Link>
            </div>

          </div>
        </div>
        
        <div className="navbar-right">
          {(isAuthenticated || authUser) && <NotificationDropdown />}

          <div className="navbar-nav-item navbar-user-dropdown">
            <button 
              className="navbar-user-btn"
              onClick={() => toggleDropdown('user')}
            >
              <UserAvatar user={currentUser} userProfile={userProfile} />
            </button>

            <div className={`navbar-dropdown-menu navbar-dropdown-menu-right ${activeDropdown === 'user' ? 'show' : ''}`}>
              {(isAuthenticated || authUser) ? (
                <>
                  <div className="navbar-dropdown-user-info">
                    <strong>{currentUser?.full_name || currentUser?.email || 'User'}</strong>
                    <span>{currentUser?.role || 'Người dùng'}</span>
                  </div>
                  <div className="navbar-dropdown-divider"></div>
                  <Link to="/dashboard" onClick={closeAllDropdowns}>
                    <FaTachometerAlt /> Dashboard
                  </Link>
                  <Link to="/ho-so-nguoi-dung" onClick={closeAllDropdowns}>
                    <FaUser /> Thông tin cá nhân
                  </Link>
                  <Link
                    to={['admin', 'staff'].includes(currentUser?.role)
                      ? '/quan-ly-lich-hen'
                      : (currentUser?.role === 'doctor' ? '/lich-hen-cua-toi' : '/dat-lich-hen')}
                    onClick={closeAllDropdowns}
                  >
                    <FaCalendarAlt />
                    {['admin', 'staff'].includes(currentUser?.role)
                      ? 'Quản lý lịch hẹn'
                      : (currentUser?.role === 'doctor' ? 'Lịch hẹn của tôi' : 'Đặt lịch hẹn')}
                  </Link>
                  <Link to="/bai-viet-da-luu" onClick={closeAllDropdowns}>
                    <FaBookmark /> Bài viết đã lưu
                  </Link>
                  <div className="navbar-dropdown-divider"></div>
                  <button onClick={handleLogoutClick} className="navbar-dropdown-logout">
                    <FaSignOutAlt /> Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeAllDropdowns}>
                    <FaSignInAlt /> Đăng nhập
                  </Link>
                  <Link to="/register" onClick={closeAllDropdowns} className="navbar-dropdown-register">
                    <FaUserPlus /> Đăng ký ngay
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận đăng xuất */}
      {showLogoutModal && (
        <div className="navbar-logout-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="navbar-logout-modal" onClick={(e) => e.stopPropagation()}>
            <FaSignOutAlt className="navbar-logout-icon" />
            <h3>Xác nhận đăng xuất</h3>
            <p>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</p>
            <div className="navbar-logout-actions">
              <button className="btn-cancel" onClick={() => setShowLogoutModal(false)}>
                Hủy
              </button>
              <button className="btn-confirm" onClick={confirmLogout}>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
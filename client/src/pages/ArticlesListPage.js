// client/src/pages/ArticlesListPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaSearch, FaEye, FaCalendar, FaTimes, FaTags, 
  FaChevronRight, FaChevronLeft, FaBars, FaNewspaper, FaHeartbeat, FaPills
} from 'react-icons/fa';
import './ArticlesListPage.css';

// Helper xử lý URL thông minh cho quảng cáo/banner
const formatAdLink = (url) => {
  if (!url) return "#";
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

const ArticlesListPage = ({ type, categoryData }) => { 
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const API_BASE_URL = 'http://localhost:3001';
  
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const navScrollRef = useRef(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    tag: searchParams.get('tag') || '',
    letter: searchParams.get('letter') || '', 
    page: parseInt(searchParams.get('page')) || 1,
    limit: 14
  });

  const [searchInput, setSearchInput] = useState(filters.search);
  const activeCategoryId = categoryData ? categoryData.id : null; 

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Lấy dữ liệu ban đầu
  useEffect(() => {
    fetchInitialData();
  }, [type, activeCategoryId]);

  useEffect(() => {
    fetchArticles();
    updateUrlParams();
  }, [filters, type, activeCategoryId]);

  useEffect(() => {
    if (categoryData) {
      setFilters(prev => ({ ...prev, page: 1, search: '', tag: '', letter: '' }));
      setSearchInput('');
    }
  }, [categoryData]);

  // XỬ LÝ AUTO-SCROLL THANH MENU XANH
  useEffect(() => {
    let animationFrameId;
    const scrollElement = navScrollRef.current;

    const scrollStep = () => {
      if (scrollElement && !isNavHovered) {
        scrollElement.scrollLeft += 1.5; // Tốc độ trượt
        // Nếu cuộn đến cuối, quay lại đầu
        if (Math.ceil(scrollElement.scrollLeft) >= scrollElement.scrollWidth - scrollElement.clientWidth) {
          scrollElement.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isNavHovered]);

  const scrollNavBy = (amount) => {
    if (navScrollRef.current) {
      navScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const fetchInitialData = async () => {
    try {
      const [catsRes, tagsRes, popRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/articles/categories`),
        axios.get(`${API_BASE_URL}/api/articles/tags/all`),
        axios.get(`${API_BASE_URL}/api/articles/public?limit=5&sort_by=views&sort_order=DESC${type ? `&category_type=${type}` : ''}${activeCategoryId ? `&category_id=${activeCategoryId}` : ''}`)
      ]);
      if (catsRes.data.success) setCategories(catsRes.data.categories || []);
      if (tagsRes.data.success) setAvailableTags((tagsRes.data.tags || []).slice(0, 15));
      if (popRes.data.success) setPopularArticles(popRes.data.articles || []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu ban đầu:', error);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.append('category_type', type);
      if (activeCategoryId) params.append('category_id', activeCategoryId);
      if (filters.search) params.append('search', filters.search);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.letter) params.append('letter', filters.letter);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(`${API_BASE_URL}/api/articles/public?${params.toString()}`);
      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Lỗi tải bài viết:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUrlParams = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.letter) params.set('letter', filters.letter);
    if (filters.page > 1) params.set('page', filters.page);
    setSearchParams(params);
  };

  const handleCategoryClick = (cat) => {
    setIsMenuOpen(false); // Đóng menu nếu đang mở
    if (!cat) {
      const route = type ? `/${type.replace('_', '-')}` : '/bai-viet';
      navigate(route);
    } else {
      const routeType = cat.category_type === 'tin_tuc' ? 'tin-tuc' :
                        cat.category_type === 'thuoc' ? 'thuoc' :
                        cat.category_type === 'benh_ly' ? 'benh-ly' : 'danh-muc';
      navigate(`/${routeType}/${cat.slug}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const clearAllFilters = () => {
    setFilters(prev => ({ ...prev, search: '', tag: '', letter: '', page: 1 }));
    setSearchInput('');
  };

  const getCategoryTypeUrl = (article) => {
    const typeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
    return `/${typeMap[article.category?.category_type] || 'tin-tuc'}/${article.slug}`;
  };

  const getFirstImage = (html) => {
    if (!html) return '/placeholder.jpg';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : '/placeholder.jpg';
  };

  const truncateContent = (html, maxLength = 160) => {
    if (!html) return '';
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const currentCategories = type ? categories.filter(c => c.category_type === type) : categories;
  const getBreadcrumbItems = () => {
    const items = [
      { label: 'Trang chủ', url: '/' },
      { label: 'Bài viết', url: '/bai-viet' }
    ];
    const typeLabels = { 'tin_tuc': 'Tin tức', 'thuoc': 'Thuốc', 'benh_ly': 'Bệnh lý' };
    const typeUrls = { 'tin_tuc': '/tin-tuc', 'thuoc': '/thuoc', 'benh_ly': '/benh-ly' };

    if (type) {
      if (categoryData) {
        items.push({ label: typeLabels[type], url: typeUrls[type] });
        items.push({ label: categoryData.name, url: null });
      } else {
        items.push({ label: typeLabels[type], url: null });
      }
    } else if (categoryData) {
      items.push({ label: categoryData.name, url: null });
    }

    if (filters.tag) items.push({ label: `Tag: ${filters.tag}`, url: null });
    if (filters.search) items.push({ label: `Tìm kiếm: ${filters.search}`, url: null });

    return items;
  };

  // --- TÁCH LAYOUT BÁO CHÍ (1 Hero + 2 Dọc + 3 Ngang + List) ---
  const heroMain = articles.length > 0 ? articles[0] : null;       
  const heroRight = articles.slice(1, 3);                          
  const heroBottom = articles.slice(3, 6);                         
  const listArticles = articles.slice(6);                          

  const currentBanner = categoryData?.banner_image_url 
    ? categoryData 
    : categories.find(c => c.banner_image_url);

  const currentSidebarAd = categoryData?.sidebar_ad_image_url 
    ? categoryData 
    : categories.find(c => c.sidebar_ad_image_url);

  return (
    <div className="article-list-page-wrapper">
      
      <div className="article-list-container">
        <Breadcrumb items={getBreadcrumbItems()} />
      </div>

      {/* --- THANH MENU XANH LÁ (MARQUEE CUỘN & MŨI TÊN) --- */}
      <div 
        className="article-list-green-navbar"
        onMouseEnter={() => setIsNavHovered(true)}
        onMouseLeave={() => setIsNavHovered(false)}
      >
        <div className="article-list-container article-list-marquee-wrapper">
          {/* Mũi tên trái */}
          {isNavHovered && (
            <button className="article-list-nav-arrow left" onClick={() => scrollNavBy(-300)}>
              <FaChevronLeft />
            </button>
          )}

          <div className="article-list-nav-scroll" ref={navScrollRef}>
            <button 
              className={`article-list-nav-btn ${!activeCategoryId ? 'active' : ''}`}
              onClick={() => handleCategoryClick(null)}
            >
              TẤT CẢ
            </button>
            {/* LƯU Ý: Sử dụng 'categories' (TOÀN BỘ) thay vì 'currentCategories' để thanh ngang không bao giờ bị thiếu danh mục */}
            {categories.map(cat => (
              <button 
                key={cat.id} 
                className={`article-list-nav-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Mũi tên phải */}
          {isNavHovered && (
            <button className="article-list-nav-arrow right" onClick={() => scrollNavBy(300)}>
              <FaChevronRight />
            </button>
          )}
        </div>
      </div>

      {/* --- BANNER TRÀN VIỀN (FULL WIDTH 100VW) --- */}
      {(!filters.search && !filters.tag && !filters.letter && currentBanner) && (
        <div className="article-list-full-banner">
          <a href={formatAdLink(currentBanner.banner_target_link)} target="_blank" rel="noreferrer">
            <img 
              src={currentBanner.banner_image_url} 
              alt="Banner Y Tế" 
              onError={(e) => e.target.style.display = 'none'} 
            />
          </a>
        </div>
      )}

      <div className="article-list-container">
        
        {/* --- HEADER: TITLE, TABS CON, SEARCH & MEGA MENU --- */}
        <div className="article-list-header-section">
          
          <h1 className="article-list-main-title">
            {categoryData ? categoryData.name : (type === 'tin_tuc' ? 'TIN TỨC Y TẾ' : type === 'thuoc' ? 'DANH MỤC THUỐC' : type === 'benh_ly' ? 'TỪ ĐIỂN BỆNH LÝ' : 'TẤT CẢ BÀI VIẾT')} 
            <FaChevronRight />
          </h1>
          
          <div className="article-list-sub-tabs">
            {currentCategories.filter(c => c.id !== activeCategoryId).slice(0, 4).map(cat => (
              <button 
                key={cat.id} 
                className="article-list-tab-item"
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="article-list-header-actions">
            <form className="article-list-search-mini" onSubmit={handleSearchSubmit}>
              <input 
                type="text" 
                placeholder="Tìm bài viết..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit"><FaSearch /></button>
            </form>

            <div className="article-list-mega-wrapper">
              <button 
                className={`article-list-menu-toggle-btn ${isMenuOpen ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <FaTimes /> : <FaBars />} DANH MỤC
              </button>

              {/* BẢNG MEGA MENU ẨN */}
              {isMenuOpen && (
                <div className="article-list-mega-menu">
                  <div className="article-list-mega-col">
                    <h3><FaNewspaper /> Tin tức Y tế</h3>
                    <ul>
                      {categories.filter(c => c.category_type === 'tin_tuc').map(cat => (
                        <li key={cat.id} onClick={() => handleCategoryClick(cat)}>{cat.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="article-list-mega-col">
                    <h3><FaHeartbeat /> Tra cứu Bệnh lý</h3>
                    <ul>
                      {categories.filter(c => c.category_type === 'benh_ly').map(cat => (
                        <li key={cat.id} onClick={() => handleCategoryClick(cat)}>{cat.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="article-list-mega-col">
                    <h3><FaPills /> Từ điển Thuốc</h3>
                    <ul>
                      {categories.filter(c => c.category_type === 'thuoc').map(cat => (
                        <li key={cat.id} onClick={() => handleCategoryClick(cat)}>{cat.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {(type === 'thuoc' || type === 'benh_ly') && (
          <div className="article-list-alphabet-filter">
            <button
              className={`article-list-alphabet-btn ${!filters.letter ? 'article-list-active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, letter: '', page: 1 }))}
            >
              Tất cả A-Z
            </button>
            {alphabet.map(letter => (
              <button
                key={letter}
                className={`article-list-alphabet-btn ${filters.letter === letter ? 'article-list-active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, letter: letter, page: 1 }))}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {(filters.tag || filters.search || filters.letter) && (
          <div className="article-list-filter-alert">
            <p>Đang hiển thị kết quả cho: <strong>{filters.tag ? `#${filters.tag}` : filters.letter ? `Chữ cái ${filters.letter}` : `"${filters.search}"`}</strong></p>
            <button onClick={clearAllFilters}><FaTimes /> Bỏ lọc</button>
          </div>
        )}

        {loading ? (
          <div className="article-list-loading">Đang tải bài viết...</div>
        ) : articles.length === 0 ? (
          <div className="article-list-empty">Không tìm thấy bài viết nào phù hợp.</div>
        ) : (
          <div className="article-list-layout-grid">
            
            {/* --- CỘT TRÁI (NỘI DUNG CHÍNH) --- */}
            <div className="article-list-main-content">
              
              {heroMain && (
                <div className="article-list-magazine-top">
                  
                  {/* Khối Trên: 1 Lớn + 2 Nhỏ */}
                  <div className="article-list-hero-split">
                    
                    <div className="article-list-hero-main" onClick={() => navigate(getCategoryTypeUrl(heroMain))}>
                      <div className="article-list-hero-main-img">
                        <img src={getFirstImage(heroMain.content)} alt={heroMain.title} />
                      </div>
                      <h2 className="article-list-hero-main-title">{heroMain.title}</h2>
                      <div className="article-list-meta">
                        <span>{heroMain.category?.name}</span>
                        <span>• <FaCalendar /> {new Date(heroMain.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <p className="article-list-hero-main-excerpt">{truncateContent(heroMain.content, 220)}</p>
                    </div>

                    <div className="article-list-hero-side">
                      {heroRight.map(article => (
                        <div key={article.id} className="article-list-side-item" onClick={() => navigate(getCategoryTypeUrl(article))}>
                          <div className="article-list-side-img">
                            <img src={getFirstImage(article.content)} alt={article.title} />
                          </div>
                          <div className="article-list-side-info">
                            <h4 className="article-list-side-title">{article.title}</h4>
                            <div className="article-list-meta">
                              <span>{article.category?.name}</span>
                              <span>• {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Khối Dưới: 3 Xếp Ngang */}
                  {heroBottom.length > 0 && (
                    <div className="article-list-hero-bottom">
                      {heroBottom.map(article => (
                        <div key={article.id} className="article-list-bottom-item" onClick={() => navigate(getCategoryTypeUrl(article))}>
                          <div className="article-list-bottom-img">
                            <img src={getFirstImage(article.content)} alt={article.title} />
                          </div>
                          <h4 className="article-list-bottom-title">{article.title}</h4>
                          <div className="article-list-meta">
                            <span>{article.category?.name}</span>
                            <span>• {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* Danh sách List dọc */}
              {listArticles.length > 0 && (
                <div className="article-list-vertical-list">
                  {listArticles.map(article => (
                    <div key={article.id} className="article-list-item-card" onClick={() => navigate(getCategoryTypeUrl(article))}>
                      <div className="article-list-item-img">
                        <img src={getFirstImage(article.content)} alt={article.title} />
                      </div>
                      <div className="article-list-item-info">
                        <h3 className="article-list-item-title">{article.title}</h3>
                        <div className="article-list-meta">
                          <span>{article.category?.name}</span>
                          <span>• {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="article-list-item-excerpt">{truncateContent(article.content, 180)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Phân trang */}
              {pagination.totalPages > 1 && (
                <div className="article-list-pagination">
                  <button
                    onClick={() => { setFilters(prev => ({...prev, page: prev.page - 1})); window.scrollTo(0,0); }}
                    disabled={filters.page === 1}
                  >
                    Trước
                  </button>
                  <div className="article-list-page-numbers">
                    {[...Array(pagination.totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        className={filters.page === i + 1 ? 'article-list-active' : ''}
                        onClick={() => { setFilters(prev => ({...prev, page: i + 1})); window.scrollTo(0,0); }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setFilters(prev => ({...prev, page: prev.page + 1})); window.scrollTo(0,0); }}
                    disabled={filters.page === pagination.totalPages}
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>

            {/* --- CỘT PHẢI (SIDEBAR) --- */}
            <div className="article-list-sidebar">
              
              {/* QUẢNG CÁO SIDEBAR */}
              {currentSidebarAd && (
                <div className="article-list-ad-box">
                  <a href={formatAdLink(currentSidebarAd.sidebar_ad_target_link)} target="_blank" rel="noreferrer">
                    <img 
                      src={currentSidebarAd.sidebar_ad_image_url} 
                      alt="Quảng cáo" 
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </a>
                </div>
              )}

              <div className="article-list-widget">
                <h3 className="article-list-widget-title">ĐỌC NHIỀU NHẤT</h3>
                <div className="article-list-popular-container">
                  {popularArticles.map((article, index) => (
                    <div key={article.id} className="article-list-popular-item" onClick={() => navigate(getCategoryTypeUrl(article))}>
                      <span className="article-list-popular-rank">{index + 1}</span>
                      <div className="article-list-popular-content">
                        <h4>{article.title}</h4>
                        <span><FaEye /> {article.views} lượt xem</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="article-list-widget">
                <h3 className="article-list-widget-title"><FaTags /> TỪ KHÓA BÀI VIẾT</h3>
                <div className="article-list-tags-cloud">
                  {availableTags.map((tag, idx) => (
                    <button 
                      key={idx} 
                      className={`article-list-tag-btn ${filters.tag === tag ? 'active' : ''}`}
                      onClick={() => setFilters(prev => ({...prev, tag: tag, page: 1, search: '', letter: ''}))}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticlesListPage;
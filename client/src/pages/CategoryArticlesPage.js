// client/src/pages/CategoryArticlesPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { FaSearch, FaEye, FaCalendar, FaFolder, FaChevronRight, FaTags } from 'react-icons/fa';
import './ArticlesListPage.css'; // Dùng chung CSS với trang danh sách chính

const CategoryArticlesPage = ({ category, categoryType }) => {
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';

  // --- STATE DỮ LIỆU BÀI VIẾT ---
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  
  // --- STATE DỮ LIỆU SIDEBAR ---
  const [popularArticles, setPopularArticles] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  // --- LỌC (GIỮ NGUYÊN LOGIC CŨ) ---
  const [letterFilter, setLetterFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // 1. Tải dữ liệu Sidebar (chạy 1 lần khi load danh mục)
  useEffect(() => {
    if (category) {
      fetchSidebarData();
    }
  }, [category]);

  // 2. Tải bài viết khi đổi trang, đổi danh mục hoặc đổi lọc chữ cái
  useEffect(() => {
    if (category) {
      fetchArticles();
    }
  }, [category, page, letterFilter, searchInput]);

  const fetchSidebarData = async () => {
    try {
      const [popRes, tagsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/articles/public?category_id=${category.id}&limit=5&sort_by=views&sort_order=DESC`),
        axios.get(`${API_BASE_URL}/api/articles/tags/all`)
      ]);
      if (popRes.data.success) setPopularArticles(popRes.data.articles || []);
      if (tagsRes.data.success) setAvailableTags((tagsRes.data.tags || []).slice(0, 15));
    } catch (error) {
      console.error('Lỗi khi tải sidebar:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = {
        category_id: category.id,
        page,
        limit: 12 // 1 Hero + 3 Sub + 8 List
      };
      
      if (letterFilter) params.letter = letterFilter;
      if (searchInput) params.search = searchInput;
      
      const response = await axios.get(`${API_BASE_URL}/api/articles/public`, { params });

      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1); // Reset về trang 1 khi search
  };

  // --- UTILS ---
  const getCategoryTypeUrl = (article) => {
    const typeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
    return `/${typeMap[article.category?.category_type] || 'tin-tuc'}/${article.slug}`;
  };

  const truncateContent = (html, maxLength = 150) => {
    if (!html) return '';
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getFirstImage = (html) => {
    if (!html) return '/placeholder.jpg';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : '/placeholder.jpg';
  };

  // --- BREADCRUMB ---
  const breadcrumbItems = [
    { label: 'Trang chủ', url: '/' },
    { label: 'Bài viết', url: '/bai-viet' },
    { 
      label: categoryType === 'tin-tuc' ? 'Tin tức' : categoryType === 'thuoc' ? 'Thuốc' : 'Bệnh lý',
      url: `/${categoryType}`
    },
    { label: category?.name, url: null }
  ];

  // --- TÁCH DỮ LIỆU LAYOUT ---
  const heroArticle = articles.length > 0 ? articles[0] : null;
  const subArticles = articles.slice(1, 4); 
  const listArticles = articles.slice(4);

  if (loading && articles.length === 0) {
    return (
      <div className="article-list-loading">
        <div className="article-list-spinner"></div>
        <p>Đang tải chuyên mục {category?.name}...</p>
      </div>
    );
  }

  return (
    <div className="article-list-page-wrapper">
      
      {/* 1. Breadcrumb (Đồng bộ) */}
      <div className="article-list-container">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className="article-list-container">
        
        {/* 2. Tiêu đề danh mục & Khung Search */}
        <div className="article-list-header-section" style={{ borderBottom: 'none', marginBottom: '1rem' }}>
          <h1 className="article-list-main-title">
            <FaFolder style={{ marginRight: '8px' }} /> {category?.name}
          </h1>
          
          <div style={{ flex: 1 }}></div>

          <form className="article-list-search-mini" onSubmit={handleSearchSubmit}>
            <input 
              type="text" 
              placeholder={`Tìm trong ${category?.name}...`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit"><FaSearch /></button>
          </form>
        </div>

        {/* Mô tả danh mục nếu có */}
        {category?.description && (
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '1rem' }}>
            {category.description}
          </p>
        )}

        {/* 3. BỘ LỌC CHỮ CÁI (Chỉ dùng cho Thuốc / Bệnh lý - Kế thừa logic cũ) */}
        {(categoryType === 'thuoc' || categoryType === 'benh-ly') && (
          <div className="article-list-sub-tabs" style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
            <button
              className={`article-list-tab-item ${!letterFilter ? 'active' : ''}`}
              onClick={() => { setLetterFilter(''); setPage(1); }}
            >
              Tất cả A-Z
            </button>
            {alphabet.map(letter => (
              <button
                key={letter}
                className={`article-list-tab-item ${letterFilter === letter ? 'active' : ''}`}
                onClick={() => { setLetterFilter(letter); setPage(1); }}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* 4. MAIN CONTENT LAYOUT BÁO CHÍ (Cột trái 8, Cột phải 4) */}
        <div className="article-list-layout-grid">
          
          {/* --- CỘT TRÁI --- */}
          <div className="article-list-main-content">
            {articles.length === 0 ? (
              <div className="article-list-empty">
                Chưa có bài viết nào trong chuyên mục "{category?.name}".
              </div>
            ) : (
              <>
                {/* Vùng Hero + 3 bài nhỏ */}
                {heroArticle && (
                  <div className="article-list-magazine-top">
                    <div className="article-list-hero-card" onClick={() => navigate(getCategoryTypeUrl(heroArticle))}>
                      <img src={getFirstImage(heroArticle.content)} alt={heroArticle.title} />
                      <div className="article-list-hero-content">
                        <h2 className="article-list-hero-title">{heroArticle.title}</h2>
                        <div className="article-list-meta">
                          <span>{category?.name}</span>
                          <span>• <FaCalendar /> {new Date(heroArticle.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="article-list-hero-excerpt">{truncateContent(heroArticle.content, 200)}</p>
                      </div>
                    </div>

                    {subArticles.length > 0 && (
                      <div className="article-list-sub-grid">
                        {subArticles.map(article => (
                          <div key={article.id} className="article-list-sub-card" onClick={() => navigate(getCategoryTypeUrl(article))}>
                            <img src={getFirstImage(article.content)} alt={article.title} />
                            <h4 className="article-list-sub-title">{article.title}</h4>
                            <span className="article-list-sub-category">{category?.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Danh sách List dọc các bài cũ hơn */}
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
                            <span>{category?.name}</span>
                            <span>• {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <p className="article-list-item-excerpt">{truncateContent(article.content, 180)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Phân trang (Giữ nguyên logic pagination cũ) */}
                {pagination.totalPages > 1 && (
                  <div className="article-list-pagination">
                    <button onClick={() => { setPage(page - 1); window.scrollTo(0,0); }} disabled={page === 1}>
                      Trước
                    </button>
                    <div className="article-list-page-numbers">
                      {[...Array(pagination.totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          className={page === i + 1 ? 'article-list-active' : ''}
                          onClick={() => { setPage(i + 1); window.scrollTo(0,0); }}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setPage(page + 1); window.scrollTo(0,0); }} disabled={page === pagination.totalPages}>
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* --- CỘT PHẢI (SIDEBAR) --- */}
          <div className="article-list-sidebar">
            <div className="article-list-ad-box">
              <img src="https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2024/4/25/an-oc-17140228307611084227367.jpg" alt="Quảng cáo" />
            </div>

            {/* Đọc nhiều nhất (Chỉ lấy trong category này) */}
            <div className="article-list-widget">
              <h3 className="article-list-widget-title">XEM NHIỀU TRONG MỤC</h3>
              <div className="article-list-popular-container">
                {popularArticles.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Chưa có dữ liệu</p>
                ) : (
                  popularArticles.map((article, index) => (
                    <div key={article.id} className="article-list-popular-item" onClick={() => navigate(getCategoryTypeUrl(article))}>
                      <span className="article-list-popular-rank">{index + 1}</span>
                      <div className="article-list-popular-content">
                        <h4>{article.title}</h4>
                        <span><FaEye /> {article.views} lượt xem</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tags tiêu biểu */}
            <div className="article-list-widget">
              <h3 className="article-list-widget-title"><FaTags /> TỪ KHÓA NỔI BẬT</h3>
              <div className="article-list-tags-cloud">
                {availableTags.map((tag, idx) => (
                  <button 
                    key={idx} 
                    className="article-list-tag-btn"
                    onClick={() => navigate(`/bai-viet?tag=${encodeURIComponent(tag)}`)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryArticlesPage;
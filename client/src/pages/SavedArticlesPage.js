// client/src/pages/SavedArticlesPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaBookmark, FaEye, FaCalendar, FaUser, FaFilter, 
  FaTimes, FaNewspaper, FaThumbsUp, FaArrowRight
} from 'react-icons/fa';
import './SavedArticlesPage.css';

const SavedArticlesPage = () => {
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';

  // States
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  
  // Filter states
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('saved_date'); // saved_date, views, likes, created_at

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSavedArticles();
  }, [page, categoryFilter, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categories`);
      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSavedArticles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort_by: sortBy
      });

      if (categoryFilter) {
        params.append('category_id', categoryFilter);
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/articles/saved?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setArticles(response.data.articles || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setSortBy('saved_date');
    setPage(1);
  };

  const getCategoryTypeUrl = (article) => {
    const typeMap = {
      'tin_tuc': 'tin-tuc',
      'thuoc': 'thuoc',
      'benh_ly': 'benh-ly'
    };
    return `/${typeMap[article.category?.category_type]}/${article.slug}`;
  };

  const truncateContent = (html, maxLength = 150) => {
    const text = html.replace(/<[^>]*>/g, '');
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getFirstImageFromContent = (html) => {
    if (!html) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    return img ? img.src : null;
  };

  if (loading) {
    return (
      <div className="saved-articles-page">
        <div className="saved-articles-container">
          <div className="saved-articles-loading">
            <div className="saved-articles-spinner"></div>
            <p>Đang tải bài viết đã lưu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-articles-page">
      <div className="saved-articles-container">
        {/* HEADER */}
        <div className="saved-articles-header">
          <div className="saved-articles-header-content">
            <div className="saved-articles-title-section">
              <div>
                <h1 className="saved-articles-icon-title">
                  <FaBookmark /> Bài viết đã lưu
                </h1>
                <p className="saved-articles-subtitle">
                  Danh sách bài viết bạn đã đánh dấu để đọc sau
                </p>
              </div>
            </div>
            
            {pagination.total > 0 && (
              <div className="saved-articles-count-badge">
                <FaNewspaper />
                <span>{pagination.total} bài viết</span>
              </div>
            )}
          </div>
        </div>

        {/* FILTERS */}
        {articles.length > 0 && (
          <div className="saved-articles-filters">
            <div className="saved-articles-filters-header">
              <h3 className="saved-articles-filters-title">
                <FaFilter /> Bộ lọc
              </h3>
              {(categoryFilter || sortBy !== 'saved_date') && (
                <button 
                  className="saved-articles-btn-clear"
                  onClick={handleClearFilters}
                >
                  <FaTimes /> Xóa bộ lọc
                </button>
              )}
            </div>

            <div className="saved-articles-filters-grid">
              <div className="saved-articles-filter-group">
                <label className="saved-articles-filter-label">Danh mục</label>
                <select 
                  className="saved-articles-filter-select"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="saved-articles-filter-group">
                <label className="saved-articles-filter-label">Sắp xếp theo</label>
                <select 
                  className="saved-articles-filter-select"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="saved_date">Mới lưu nhất</option>
                  <option value="created_at">Mới xuất bản nhất</option>
                  <option value="views">Nhiều lượt xem nhất</option>
                  <option value="likes">Nhiều lượt thích nhất</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ARTICLES GRID */}
        {articles.length === 0 ? (
          <div className="saved-articles-empty">
            <FaBookmark className="saved-articles-empty-icon" />
            <h3>Chưa có bài viết nào được lưu</h3>
            <p>Hãy lưu những bài viết yêu thích để xem lại sau</p>
            <button 
              className="saved-articles-btn-explore"
              onClick={() => navigate('/bai-viet')}
            >
              <FaNewspaper /> Khám phá bài viết
            </button>
          </div>
        ) : (
          <>
            <div className="saved-articles-grid">
              {articles.map(article => (
                <div 
                  key={article.id} 
                  className="saved-articles-card"
                  onClick={() => navigate(getCategoryTypeUrl(article))}
                >
                  {/* Card Header */}
                  <div className="saved-articles-card-header">
                    <span className="saved-articles-category-badge">
                      <FaNewspaper />
                      {article.category?.name || 'Chưa phân loại'}
                    </span>
                    <FaBookmark className="saved-articles-saved-icon" />
                  </div>

                  {/* Card Body */}
                  <div className="saved-articles-card-body">
                    <h3 className="saved-articles-card-title">
                      {article.title}
                    </h3>

                    <p className="saved-articles-card-excerpt">
                      {truncateContent(article.content)}
                    </p>

                    {/* Card Footer */}
                    <div className="saved-articles-card-footer">
                      <div className="saved-articles-card-meta">
                        <span className="saved-articles-meta-item">
                          <FaUser />
                          {article.author?.full_name || 'Ẩn danh'}
                        </span>
                        <span className="saved-articles-meta-item">
                          <FaCalendar />
                          {new Date(article.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="saved-articles-card-stats">
                        <span className="saved-articles-stat-item">
                          <FaEye />
                          {article.views || 0}
                        </span>
                        {article.likes_count > 0 && (
                          <span className="saved-articles-stat-item">
                            <FaThumbsUp />
                            {article.likes_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            {pagination.totalPages > 1 && (
              <div className="saved-articles-pagination">
                <span className="saved-articles-pagination-info">
                  Trang {pagination.currentPage} / {pagination.totalPages}
                </span>

                <button
                  className="saved-articles-btn-page"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Trước
                </button>

                <div className="saved-articles-page-numbers">
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.totalPages;
                    const currentPage = page;
                    
                    // Always show first page
                    pages.push(1);
                    
                    // Show pages around current page
                    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                      if (!pages.includes(i)) {
                        pages.push(i);
                      }
                    }
                    
                    // Always show last page
                    if (totalPages > 1 && !pages.includes(totalPages)) {
                      pages.push(totalPages);
                    }
                    
                    return pages.map((pageNum, index) => {
                      // Add ellipsis
                      if (index > 0 && pageNum - pages[index - 1] > 1) {
                        return (
                          <React.Fragment key={`ellipsis-${pageNum}`}>
                            <span style={{ padding: '0.5rem' }}>...</span>
                            <button
                              className={`saved-articles-btn-page ${page === pageNum ? 'active' : ''}`}
                              onClick={() => setPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        );
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`saved-articles-btn-page ${page === pageNum ? 'active' : ''}`}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    });
                  })()}
                </div>

                <button
                  className="saved-articles-btn-page"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SavedArticlesPage;
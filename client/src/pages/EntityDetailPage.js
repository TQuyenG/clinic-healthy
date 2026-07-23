// client/src/pages/EntityDetailPage.js - VERSION 3.0 - FLASHCARD STYLE
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaCalendar, FaTag, FaArrowRight, FaArrowLeft, FaIndustry, FaImage, 
  FaEyeSlash, FaExclamationTriangle, FaThumbsUp, FaThumbsDown, FaMeh, 
  FaLink, FaClock, FaFlask, FaMedkit, FaPills, FaNotesMedical,
  FaChevronLeft, FaChevronRight, FaBookMedical, FaNewspaper
} from 'react-icons/fa';
import './EntityDetailPage.css';

const EntityDetailPage = ({ entityType }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001';
  const containerRef = useRef(null);
  
  const [entity, setEntity] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [relatedEntities, setRelatedEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [history, setHistory] = useState([]); // Lưu lịch sử để quay lại

  const config = {
    medicine: {
      title: 'Thông tin Thuốc',
      apiPath: 'medicines',
      publicPath: 'tra-cuu-thuoc',
      listPath: 'tra-cuu-thuoc',
      breadcrumb: 'Tra cứu thuốc',
      articlePath: 'thuoc',
      icon: FaPills
    },
    disease: {
      title: 'Thông tin Bệnh lý',
      apiPath: 'diseases',
      publicPath: 'tra-cuu-benh-ly',
      listPath: 'tra-cuu-benh-ly',
      breadcrumb: 'Tra cứu bệnh lý',
      articlePath: 'benh-ly',
      icon: FaNotesMedical
    }
  };

  const currentConfig = config[entityType];

  useEffect(() => {
    fetchEntity();
    // Thêm slug hiện tại vào history khi load trang
    setHistory(prev => {
      if (prev[prev.length - 1] !== slug) {
        return [...prev, slug];
      }
      return prev;
    });
  }, [slug, entityType]);

  // Swipe handling for touch devices
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startX = 0;
    let endX = 0;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [history, relatedEntities]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, relatedEntities]);

  const fetchEntity = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}/slug/${slug}`
      );

      if (response.data.success) {
        const fetchedEntity = response.data[entityType]; 
        
        if (!fetchedEntity) {
          setEntity(null);
          return;
        }
        
        setEntity(fetchedEntity);
        setRelatedArticles(response.data.relatedArticles?.slice(0, 5) || []);
        
        if (fetchedEntity.category_id) {
          const relatedResponse = await axios.get(
            `${API_BASE_URL}/api/articles/${currentConfig.apiPath}?category_id=${fetchedEntity.category_id}&limit=6&hidden=false`
          );
          if (relatedResponse.data.success) {
            setRelatedEntities(
              relatedResponse.data[currentConfig.apiPath]
                .filter(e => e.id !== fetchedEntity.id)
                .slice(0, 5)
            );
          }
        }
      }
    } catch (error) {
      console.error('Error fetching entity:', error);
      if (error.response && error.response.status === 404) {
        setEntity(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomEntity = async () => {
    try {
      setNavigationLoading(true);
      // Fetch 1 entity ngẫu nhiên bằng cách lấy random offset
      const countResponse = await axios.get(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}?limit=1&hidden=false`
      );
      
      if (countResponse.data.success && countResponse.data.pagination) {
        const total = countResponse.data.pagination.totalItems;
        const randomOffset = Math.floor(Math.random() * total);
        
        const randomResponse = await axios.get(
          `${API_BASE_URL}/api/articles/${currentConfig.apiPath}?limit=1&page=${randomOffset + 1}&hidden=false`
        );
        
        if (randomResponse.data.success) {
          const entities = randomResponse.data[currentConfig.apiPath];
          if (entities && entities.length > 0) {
            // Tránh lặp lại entity hiện tại
            if (entities[0].slug !== slug) {
              return entities[0];
            } else {
              // Thử lại nếu trùng
              return fetchRandomEntity();
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching random entity:', error);
      return null;
    } finally {
      setNavigationLoading(false);
    }
  };

  const handleNext = async () => {
    // Ưu tiên chọn từ relatedEntities nếu có
    if (relatedEntities.length > 0) {
      const randomIndex = Math.floor(Math.random() * relatedEntities.length);
      const nextEntity = relatedEntities[randomIndex];
      navigate(`/${currentConfig.publicPath}/${nextEntity.slug}`);
      return;
    }
    
    // Nếu không có related, fetch random
    const randomEntity = await fetchRandomEntity();
    if (randomEntity) {
      navigate(`/${currentConfig.publicPath}/${randomEntity.slug}`);
    }
  };

  const handlePrev = () => {
    // Quay lại entity trước đó trong history
    if (history.length > 1) {
      const prevSlug = history[history.length - 2];
      setHistory(prev => prev.slice(0, -1)); // Xóa slug hiện tại khỏi history
      navigate(`/${currentConfig.publicPath}/${prevSlug}`);
    } else {
      // Nếu không có history, quay về danh sách
      navigate(`/${currentConfig.listPath}`);
    }
  };

  // Get info items for left panel
  const getInfoItems = () => {
    if (!entity) return [];
    
    const items = [];
    
    if (entityType === 'medicine') {
      if (entity.composition) {
        items.push({ icon: FaFlask, label: 'Thành phần', value: entity.composition, type: 'normal' });
      }
      if (entity.uses) {
        items.push({ icon: FaMedkit, label: 'Công dụng', value: entity.uses, type: 'highlight' });
      }
      if (entity.side_effects) {
        items.push({ icon: FaExclamationTriangle, label: 'Tác dụng phụ', value: entity.side_effects, type: 'warning' });
      }
      if (entity.manufacturer) {
        items.push({ icon: FaIndustry, label: 'Nhà sản xuất', value: entity.manufacturer, type: 'normal' });
      }
      if (entity.Category) {
        items.push({ icon: FaTag, label: 'Danh mục', value: entity.Category.name, type: 'normal' });
      }
      if (entity.description) {
        items.push({ icon: FaNotesMedical, label: 'Mô tả', value: entity.description, type: 'normal' });
      }
    } else {
      if (entity.symptoms) {
        items.push({ icon: FaExclamationTriangle, label: 'Triệu chứng', value: entity.symptoms, type: 'warning' });
      }
      if (entity.treatments) {
        items.push({ icon: FaMedkit, label: 'Điều trị', value: entity.treatments, type: 'highlight' });
      }
      if (entity.Category) {
        items.push({ icon: FaTag, label: 'Danh mục', value: entity.Category.name, type: 'normal' });
      }
      if (entity.description) {
        items.push({ icon: FaNotesMedical, label: 'Mô tả', value: entity.description, type: 'normal' });
      }
    }
    
    return items;
  };

  if (loading) {
    return (
      <div className="entity-detail-page">
        <div className="entity-detail-loading">
          <div className="entity-detail-loading-spinner"></div>
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="entity-detail-page">
        <div className="entity-detail-empty">
          <FaExclamationTriangle />
          <h3>Không tìm thấy thông tin</h3>
          <p>Dữ liệu bạn yêu cầu không tồn tại hoặc đã bị xóa.</p>
          <button 
            className="entity-detail-btn-back"
            onClick={() => navigate(`/${currentConfig.listPath}`)}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Trang chủ', url: '/' },
    { label: currentConfig.breadcrumb, url: `/${currentConfig.listPath}` },
    { label: entity.name, url: null }
  ];

  const infoItems = getInfoItems();

  return (
    <div className="entity-detail-page" ref={containerRef}>
      <Breadcrumb items={breadcrumbItems} />

      {/* Hidden Warning */}
      {entity.hidden && (
        <div className="entity-detail-hidden-warning">
          <FaEyeSlash />
          <div>
            <strong>Nội dung này đang bị ẩn</strong>
            {entity.hidden_reason && <p>Lý do: {entity.hidden_reason}</p>}
          </div>
        </div>
      )}

      {/* Main Flashcard Container */}
      <div className="entity-detail-flashcard">
        {/* Navigation Arrow Left - Quay lại */}
        <button 
          className="entity-detail-nav-btn entity-detail-nav-prev" 
          onClick={handlePrev}
          title="Quay lại (hoặc về danh sách)"
          disabled={navigationLoading}
        >
          <FaChevronLeft />
        </button>

        {/* Left Column - Info Items with Lines */}
        <div className="entity-detail-left-column">
          {infoItems.slice(0, Math.ceil(infoItems.length / 2)).map((item, index) => (
            <div 
              key={index} 
              className={`entity-detail-info-item entity-detail-info-${item.type}`}
              style={{ '--item-index': index }}
            >
              <div className="entity-detail-info-content">
                <div className="entity-detail-info-header">
                  <item.icon />
                  <span className="entity-detail-info-label">{item.label}:</span>
                </div>
                <p className="entity-detail-info-value">{item.value}</p>
              </div>
              <div className="entity-detail-info-line entity-detail-info-line-left"></div>
            </div>
          ))}
        </div>

        {/* Center - Image Card */}
        <div className="entity-detail-center">
          <div className="entity-detail-image-card">
            {entity.image_url ? (
              <img 
                src={entity.image_url} 
                alt={entity.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="entity-detail-image-placeholder" style={{ display: entity.image_url ? 'none' : 'flex' }}>
              <FaImage />
              <span>Ảnh</span>
            </div>
          </div>
          
          {/* Title below image */}
          <h1 className="entity-detail-title">{entity.name}</h1>
          
          {/* Meta info */}
          <div className="entity-detail-meta">
            <span><FaCalendar /> {new Date(entity.created_at).toLocaleDateString('vi-VN')}</span>
            {entity.Category && <span><FaTag /> {entity.Category.name}</span>}
          </div>
        </div>

        {/* Right side info items */}
        <div className="entity-detail-right-info">
          {infoItems.slice(Math.ceil(infoItems.length / 2)).map((item, index) => (
            <div 
              key={index} 
              className={`entity-detail-info-item entity-detail-info-${item.type}`}
              style={{ '--item-index': index }}
            >
              <div className="entity-detail-info-line entity-detail-info-line-right"></div>
              <div className="entity-detail-info-content">
                <div className="entity-detail-info-header">
                  <item.icon />
                  <span className="entity-detail-info-label">{item.label}:</span>
                </div>
                <p className="entity-detail-info-value">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrow Right - Random tiếp theo */}
        <button 
          className={`entity-detail-nav-btn entity-detail-nav-next ${navigationLoading ? 'loading' : ''}`}
          onClick={handleNext}
          title="Xem ngẫu nhiên"
          disabled={navigationLoading}
        >
          {navigationLoading ? <div className="entity-detail-btn-spinner"></div> : <FaChevronRight />}
        </button>
      </div>

      {/* Bottom Section - Related Content */}
      <div className="entity-detail-bottom">
        {/* Related Entities */}
        {relatedEntities.length > 0 && (
          <div className="entity-detail-related-box">
            <h3>
              <FaPills />
              {entityType === 'medicine' ? 'Thuốc liên quan' : 'Bệnh lý liên quan'}
            </h3>
            <div className="entity-detail-related-list">
              {relatedEntities.map(e => (
                <button 
                  key={e.id}
                  className="entity-detail-related-item"
                  onClick={() => navigate(`/${currentConfig.publicPath}/${e.slug}`)}
                >
                  <span className="entity-detail-related-name">{e.name}</span>
                  <FaArrowRight />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="entity-detail-articles-box">
            <h3>
              <FaNewspaper />
              Bài viết liên quan
            </h3>
            <div className="entity-detail-articles-list">
              {relatedArticles.map(article => (
                <div 
                  key={article.id}
                  className="entity-detail-article-item"
                  onClick={() => navigate(`/bai-viet/${article.slug}`)}
                >
                  <h4>{article.title}</h4>
                  <span><FaCalendar /> {new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Swipe Hint for Mobile */}
      <div className="entity-detail-swipe-hint">
        <FaChevronLeft />
        <span>Vuốt để xem thêm</span>
        <FaChevronRight />
      </div>
    </div>
  );
};

export default EntityDetailPage; 
// client/src/pages/ServiceCategoryDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTag, FaCalendarAlt, FaChevronRight } from 'react-icons/fa';
import './ServiceCategoryDetailPage.css';

const ServiceCategoryDetailPage = () => {
  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { slug } = useParams();

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/service-categories/slug/${slug}`);
        if (response.data.success) {
          setCategory(response.data.data);
          setServices(response.data.data.services || []);
        } else {
          throw new Error(response.data.message || 'Không tìm thấy danh mục.');
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        setError(errorMessage);
        toast.error(`Lỗi: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCategoryDetails();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="category-detail-page">
        <div className="category-detail-loading">
          <div className="category-detail-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-detail-page">
        <div className="category-detail-error">
          Lỗi: {error}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="category-detail-page">
        <div className="category-detail-error">
          Không tìm thấy thông tin danh mục.
        </div>
      </div>
    );
  }

  return (
    <div className="category-detail-page">
      {/* HEADER SECTION */}
      <section 
        className="category-detail-header" 
        style={{ 
          backgroundImage: category.image_url ? `url(${category.image_url})` : 'none'
        }}
      >
        <div className="category-detail-header-overlay"></div>
        <div className="category-detail-header-content">
          <div className="category-detail-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="category-detail-breadcrumb-separator">
              <FaChevronRight />
            </span>
            <Link to="/dich-vu">Dịch vụ</Link>
            <span className="category-detail-breadcrumb-separator">
              <FaChevronRight />
            </span>
            <span className="category-detail-breadcrumb-current">
              {category.name}
            </span>
          </div>
          <h1 className="category-detail-title">{category.name}</h1>
          <p className="category-detail-description">{category.description}</p>
        </div>
      </section>

      {/* SERVICES LIST SECTION */}
      <main className="category-detail-services-container">
        <h2 className="category-detail-services-title">
          Các dịch vụ trong danh mục
        </h2>
        
        {services.length > 0 ? (
          <div className="category-detail-services-grid">
            {services.map(service => (
              <div key={service.id} className="category-detail-service-card">
                <Link 
                  to={`/dich-vu/${service.id}`} 
                  className="category-detail-service-link"
                >
                  <img 
                    src={service.image_url || 'https://via.placeholder.com/400x250?text=Service'} 
                    alt={service.name} 
                    className="category-detail-service-image"
                  />
                  <div className="category-detail-service-content">
                    <h3 className="category-detail-service-name">
                      {service.name}
                    </h3>
                    <p className="category-detail-service-desc">
                      {service.short_description}
                    </p>
                    <div className="category-detail-service-footer">
                      <span className="category-detail-service-price">
                        <FaTag />
                        {new Intl.NumberFormat('vi-VN').format(service.price)} VNĐ
                      </span>
                      <span className="category-detail-btn-book">
                        <FaCalendarAlt />
                        Đặt lịch
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="category-detail-no-services">
            <div className="category-detail-empty-icon">📋</div>
            <h3>Chưa có dịch vụ nào</h3>
            <p>Danh mục này chưa có dịch vụ nào được thêm vào.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ServiceCategoryDetailPage;
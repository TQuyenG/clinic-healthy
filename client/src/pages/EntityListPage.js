// client/src/pages/EntityListPage.js - VERSION 2.0 - HOÀN CHỈNH
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaSearch, FaTimes, FaCalendar, FaImage, FaIndustry,
  FaSortAmountDown, FaSortAmountUp, FaSort
} from 'react-icons/fa';
import './EntityListPage.css';

const EntityListPage = ({ entityType }) => {
  const navigate = useNavigate();
  const API_BASE_URL = 'http://localhost:3001';
  
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    search: '',
    category_id: '',
    letter: '',
    sort_by: 'created_at',
    sort_order: 'DESC'
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const config = {
    medicine: {
      title: 'Tra cứu Thuốc',
      apiPath: 'medicines',
      publicPath: 'tra-cuu-thuoc',
      breadcrumb: 'Tra cứu thuốc'
    },
    disease: {
      title: 'Tra cứu Bệnh lý',
      apiPath: 'diseases',
      publicPath: 'tra-cuu-benh-ly',
      breadcrumb: 'Tra cứu bệnh lý'
    }
  };

  const currentConfig = config[entityType];

  useEffect(() => {
    fetchCategories();
  }, [entityType]);

  useEffect(() => {
    fetchEntities();
  }, [filters, entityType]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/categories`);
      if (response.data.success) {
        setCategories(response.data.categories.filter(c => 
          c.category_type === (entityType === 'medicine' ? 'thuoc' : 'benh_ly')
        ));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(
        Object.entries({ ...filters, hidden: 'false' }).filter(([_, v]) => v !== '')
      ).toString();

      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${currentConfig.apiPath}?${params}`
      );

      if (response.data.success) {
        setEntities(response.data[currentConfig.apiPath] || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    const newOrder = filters.sort_by === field && filters.sort_order === 'ASC' ? 'DESC' : 'ASC';
    setFilters({ ...filters, sort_by: field, sort_order: newOrder, page: 1 });
  };

  const breadcrumbItems = [
    { label: 'Trang chủ', url: '/' },
    { label: currentConfig.breadcrumb, url: null }
  ];

  return (
    <div className="entity-list-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="entity-list-header">
        <h1>{currentConfig.title}</h1>
        <p className="entity-list-subtitle">
          {pagination.totalItems || 0} {entityType === 'medicine' ? 'loại thuốc' : 'bệnh lý'}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="entity-list-filters">
        <div className="entity-list-search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
          {filters.search && (
            <button 
              className="entity-list-search-clear"
              onClick={() => setFilters({ ...filters, search: '', page: 1 })}
            >
              <FaTimes />
            </button>
          )}
        </div>

        <select
          value={filters.category_id}
          onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}
          className="entity-list-select"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={`${filters.sort_by}-${filters.sort_order}`}
          onChange={(e) => {
            const [sort_by, sort_order] = e.target.value.split('-');
            setFilters({ ...filters, sort_by, sort_order, page: 1 });
          }}
          className="entity-list-select"
        >
          <option value="created_at-DESC">Mới nhất</option>
          <option value="created_at-ASC">Cũ nhất</option>
          <option value="name-ASC">Tên A-Z</option>
          <option value="name-DESC">Tên Z-A</option>
        </select>
      </div>

      {/* Alphabet Filter */}
      <div className="entity-list-alphabet-filter">
        <button
          className={`entity-list-alphabet-btn ${!filters.letter ? 'active' : ''}`}
          onClick={() => setFilters({ ...filters, letter: '', page: 1 })}
        >
          Tất cả
        </button>
        {alphabet.map(letter => (
          <button
            key={letter}
            className={`entity-list-alphabet-btn ${filters.letter === letter ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, letter, page: 1 })}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="entity-list-loading">
          <div className="entity-list-loading-spinner"></div>
          <span>Đang tải...</span>
        </div>
      ) : entities.length === 0 ? (
        <div className="entity-list-empty">Không tìm thấy kết quả</div>
      ) : (
        <div className="entity-list-grid">
          {entities.map(entity => (
            <div 
              key={entity.id} 
              className="entity-list-card"
              onClick={() => navigate(`/${currentConfig.publicPath}/${entity.slug}`)}
            >
              {/* Image for Medicine */}
              {entityType === 'medicine' && (
                <div className="entity-list-card-image">
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
                  <div className="entity-list-card-image-placeholder" style={{ display: entity.image_url ? 'none' : 'flex' }}>
                    <FaImage />
                  </div>
                </div>
              )}
              
              <div className="entity-list-card-header">
                <h3>{entity.name}</h3>
                {entity.Category && (
                  <span className="entity-list-card-category">{entity.Category.name}</span>
                )}
              </div>
              
              <div className="entity-list-card-body">
                {entityType === 'medicine' ? (
                  <>
                    {entity.composition && (
                      <p>
                        <strong>Thành phần:</strong>{' '}
                        {entity.composition.length > 80 
                          ? entity.composition.substring(0, 80) + '...'
                          : entity.composition}
                      </p>
                    )}
                    {entity.uses && (
                      <p>
                        <strong>Công dụng:</strong>{' '}
                        {entity.uses.length > 80 
                          ? entity.uses.substring(0, 80) + '...'
                          : entity.uses}
                      </p>
                    )}
                    {entity.manufacturer && (
                      <p className="entity-list-manufacturer">
                        <FaIndustry /> {entity.manufacturer}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {entity.symptoms && (
                      <p>
                        <strong>Triệu chứng:</strong>{' '}
                        {entity.symptoms.length > 80 
                          ? entity.symptoms.substring(0, 80) + '...'
                          : entity.symptoms}
                      </p>
                    )}
                    {entity.treatments && (
                      <p>
                        <strong>Điều trị:</strong>{' '}
                        {entity.treatments.length > 80 
                          ? entity.treatments.substring(0, 80) + '...'
                          : entity.treatments}
                      </p>
                    )}
                  </>
                )}
              </div>
              
              <div className="entity-list-card-footer">
                <span>
                  <FaCalendar />
                  {new Date(entity.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="entity-list-pagination">
          <button
            onClick={() => setFilters({ ...filters, page: 1 })}
            disabled={filters.page === 1}
          >
            Đầu
          </button>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
          >
            Trước
          </button>
          <div className="entity-list-page-numbers">
            {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (filters.page <= 3) {
                pageNum = i + 1;
              } else if (filters.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = filters.page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  className={filters.page === pageNum ? 'active' : ''}
                  onClick={() => setFilters({ ...filters, page: pageNum })}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page === pagination.totalPages}
          >
            Sau
          </button>
          <button
            onClick={() => setFilters({ ...filters, page: pagination.totalPages })}
            disabled={filters.page === pagination.totalPages}
          >
            Cuối
          </button>
        </div>
      )}
    </div>
  );
};

export default EntityListPage; 
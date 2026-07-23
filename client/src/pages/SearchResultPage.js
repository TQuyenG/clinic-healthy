// client/src/pages/SearchResultPage.js
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import { 
  FaSearch, FaSpinner, FaPills, FaHeartbeat, FaNewspaper,
  FaImage, FaIndustry, FaCalendar, FaExclamationCircle,
  FaFolder, FaStethoscope, FaUserMd, FaThLarge
} from 'react-icons/fa';
import './SearchResultPage.css';

const SearchResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001';
  
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  
  const [results, setResults] = useState({
    medicines: [],
    diseases: [],
    articles: [],
    categories: [],
    specialties: [],
    doctors: []
  });
  const [displayCounts, setDisplayCounts] = useState({
    medicines: 5,
    diseases: 5,
    articles: 5,
    categories: 5,
    specialties: 5,
    doctors: 5
  });
  const [totalCounts, setTotalCounts] = useState({
    medicines: 0,
    diseases: 0,
    articles: 0,
    categories: 0,
    specialties: 0,
    doctors: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState({
    medicines: false,
    diseases: false,
    articles: false,
    categories: false,
    specialties: false,
    doctors: false
  });
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (query) {
      fetchSearchResults();
    }
  }, [query]);

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/search/global?q=${encodeURIComponent(query)}`
      );
      
      if (response.data.success) {
        setResults(response.data.results);
        setTotalCounts({
          medicines: response.data.results.medicines?.length || 0,
          diseases: response.data.results.diseases?.length || 0,
          articles: response.data.results.articles?.length || 0,
          categories: response.data.results.categories?.length || 0,
          specialties: response.data.results.specialties?.length || 0,
          doctors: response.data.results.doctors?.length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = (resultType) => {
    setDisplayCounts(prev => ({
      ...prev,
      [resultType]: prev[resultType] + 5
    }));
  };

  const handleItemClick = (resultType, item) => {
    const typeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
    
    switch(resultType) {
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

  const breadcrumbItems = [
    { label: 'Trang chủ', url: '/' },
    { label: 'Tìm kiếm', url: null }
  ];

  const shouldShowSection = (sectionType) => {
    if (activeTab === 'all') return totalCounts[sectionType] > 0;
    return activeTab === sectionType;
  };

  const tabs = [
    { id: 'all', label: 'Tất cả', icon: FaThLarge, count: Object.values(totalCounts).reduce((a, b) => a + b, 0) },
    { id: 'medicines', label: 'Thuốc', icon: FaPills, count: totalCounts.medicines },
    { id: 'diseases', label: 'Bệnh lý', icon: FaHeartbeat, count: totalCounts.diseases },
    { id: 'articles', label: 'Bài viết', icon: FaNewspaper, count: totalCounts.articles },
    { id: 'doctors', label: 'Bác sĩ', icon: FaUserMd, count: totalCounts.doctors },
    { id: 'specialties', label: 'Chuyên khoa', icon: FaStethoscope, count: totalCounts.specialties },
    { id: 'categories', label: 'Danh mục', icon: FaFolder, count: totalCounts.categories }
  ];

  if (loading) {
    return (
      <div className="search-result-page">
        <Breadcrumb items={breadcrumbItems} />
        <div className="search-result-loading">
          <FaSpinner className="search-result-spinner" />
          <p>Đang tìm kiếm...</p>
        </div>
      </div>
    );
  }

  const totalResults = totalCounts.medicines + totalCounts.diseases + totalCounts.articles + 
                       totalCounts.categories + totalCounts.specialties + totalCounts.doctors;

  return (
    <div className="search-result-page">
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
      <div className="search-result-header">
        <div className="search-result-header-icon">
          <FaSearch />
        </div>
        <h1>Kết quả tìm kiếm cho: "<span>{query}</span>"</h1>
        <p className="search-result-count">
          Tìm thấy <strong>{totalResults}</strong> kết quả
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="search-result-empty">
          <FaExclamationCircle />
          <h2>Không tìm thấy kết quả</h2>
          <p>Vui lòng thử từ khóa khác hoặc kiểm tra lại chính tả</p>
        </div>
      ) : (
        <>
          {/* TABS */}
          <div className="search-result-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`search-result-tab ${activeTab === tab.id ? 'active' : ''} ${tab.count === 0 ? 'disabled' : ''}`}
                onClick={() => tab.count > 0 && setActiveTab(tab.id)}
                disabled={tab.count === 0}
              >
                <tab.icon className="search-result-tab-icon" />
                <span className="search-result-tab-label">{tab.label}</span>
                <span className="search-result-tab-count">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="search-result-content">
            
            {/* MEDICINES SECTION */}
            {shouldShowSection('medicines') && results.medicines && results.medicines.length > 0 && (
              <div className="search-result-section">
                <div className="search-result-section-header">
                  <FaPills />
                  <h2>Thuốc ({totalCounts.medicines})</h2>
                </div>
                
                <div className="search-result-grid medicine-grid">
                  {results.medicines.slice(0, displayCounts.medicines).map(medicine => (
                    <div 
                      key={medicine.id}
                      className="search-result-card search-result-medicine"
                      onClick={() => handleItemClick('medicines', medicine)}
                    >
                      <div className="search-result-card-content">
                        <h3>{medicine.name}</h3>
                        {medicine.category && (
                          <span className="search-result-card-category">{medicine.category}</span>
                        )}
                        {medicine.uses && (
                          <p className="search-result-card-description">
                            <strong>Công dụng:</strong> {medicine.uses}
                          </p>
                        )}
                        {medicine.manufacturer && (
                          <div className="search-result-card-manufacturer">
                            <FaIndustry />
                            <span>{medicine.manufacturer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {displayCounts.medicines < totalCounts.medicines && (
                  <button 
                    className="search-result-load-more"
                    onClick={() => handleLoadMore('medicines')}
                    disabled={loadingMore.medicines}
                  >
                    {loadingMore.medicines ? <FaSpinner className="search-result-spinner" /> : 'Xem thêm'}
                  </button>
                )}
              </div>
            )}

            {/* DISEASES SECTION */}
            {shouldShowSection('diseases') && results.diseases && results.diseases.length > 0 && (
              <div className="search-result-section">
                <div className="search-result-section-header">
                  <FaHeartbeat />
                  <h2>Bệnh lý ({totalCounts.diseases})</h2>
                </div>
                
                <div className="search-result-grid disease-grid">
                  {results.diseases.slice(0, displayCounts.diseases).map(disease => (
                    <div 
                      key={disease.id}
                      className="search-result-card search-result-disease"
                      onClick={() => handleItemClick('diseases', disease)}
                    >
                      <div className="search-result-card-content">
                        <h3>{disease.name}</h3>
                        {disease.category && (
                          <span className="search-result-card-category">{disease.category}</span>
                        )}
                        {disease.symptoms && (
                          <p className="search-result-card-description">
                            <strong>Triệu chứng:</strong> {disease.symptoms}
                          </p>
                        )}
                        {disease.treatments && (
                          <p className="search-result-card-description">
                            <strong>Điều trị:</strong> {disease.treatments}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {displayCounts.diseases < totalCounts.diseases && (
                  <button 
                    className="search-result-load-more"
                    onClick={() => handleLoadMore('diseases')}
                    disabled={loadingMore.diseases}
                  >
                    {loadingMore.diseases ? <FaSpinner className="search-result-spinner" /> : 'Xem thêm'}
                  </button>
                )}
              </div>
            )}

            {/* ARTICLES SECTION */}
            {shouldShowSection('articles') && results.articles && results.articles.length > 0 && (
              <div className="search-result-section">
                <div className="search-result-section-header">
                  <FaNewspaper />
                  <h2>Bài viết ({totalCounts.articles})</h2>
                </div>
                
                <div className="search-result-list">
                  {results.articles.slice(0, displayCounts.articles).map(article => (
                    <div 
                      key={article.id}
                      className="search-result-item"
                      onClick={() => handleItemClick('articles', article)}
                    >
                      <div className="search-result-item-content">
                        <h3>{article.title}</h3>
                        {article.category && (
                          <span className="search-result-item-category">{article.category}</span>
                        )}
                        {article.created_at && (
                          <p className="search-result-item-date">
                            <FaCalendar /> {new Date(article.created_at).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {displayCounts.articles < totalCounts.articles && (
                  <button 
                    className="search-result-load-more"
                    onClick={() => handleLoadMore('articles')}
                    disabled={loadingMore.articles}
                  >
                    {loadingMore.articles ? <FaSpinner className="search-result-spinner" /> : 'Xem thêm'}
                  </button>
                )}
              </div>
            )}

            {/* DOCTORS SECTION */}
            {shouldShowSection('doctors') && results.doctors && results.doctors.length > 0 && (
              <div className="search-result-section">
                <div className="search-result-section-header">
                  <FaUserMd />
                  <h2>Bác sĩ ({totalCounts.doctors})</h2>
                </div>
                
                <div className="search-result-list">
                  {results.doctors.slice(0, displayCounts.doctors).map(doctor => (
                    <div 
                      key={doctor.id}
                      className="search-result-item"
                      onClick={() => handleItemClick('doctors', doctor)}
                    >
                      <div className="search-result-item-content">
                        <h3>
                          {doctor.title && `${doctor.title} `}
                          {doctor.name}
                        </h3>
                        {doctor.specialty && (
                          <span className="search-result-item-category">{doctor.specialty}</span>
                        )}
                        {doctor.position && (
                          <p className="search-result-item-description">
                            <strong>Chức vụ:</strong> {doctor.position}
                          </p>
                        )}
                        {doctor.workplace && (
                          <p className="search-result-item-description">
                            <strong>Nơi công tác:</strong> {doctor.workplace}
                          </p>
                        )}
                        {doctor.experience && (
                          <p className="search-result-item-description">
                            <strong>Kinh nghiệm:</strong> {doctor.experience} năm
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {displayCounts.doctors < totalCounts.doctors && (
                  <button 
                    className="search-result-load-more"
                    onClick={() => handleLoadMore('doctors')}
                    disabled={loadingMore.doctors}
                  >
                    {loadingMore.doctors ? <FaSpinner className="search-result-spinner" /> : 'Xem thêm'}
                  </button>
                )}
              </div>
            )}

            {/* SPECIALTIES SECTION */}
            {shouldShowSection('specialties') && results.specialties && results.specialties.length > 0 && (
              <div className="search-result-section">
                <div className="search-result-section-header">
                  <FaStethoscope />
                  <h2>Chuyên khoa ({totalCounts.specialties})</h2>
                </div>
                
                <div className="search-result-list">
                  {results.specialties.slice(0, displayCounts.specialties).map(specialty => (
                    <div 
                      key={specialty.id}
                      className="search-result-item"
                      onClick={() => handleItemClick('specialties', specialty)}
                    >
                      <div className="search-result-item-content">
                        <h3>{specialty.name}</h3>
                        {specialty.description && (
                          <p className="search-result-item-description">{specialty.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {displayCounts.specialties < totalCounts.specialties && (
                  <button 
                    className="search-result-load-more"
                    onClick={() => handleLoadMore('specialties')}
                    disabled={loadingMore.specialties}
                  >
                    {loadingMore.specialties ? <FaSpinner className="search-result-spinner" /> : 'Xem thêm'}
                  </button>
                )}
              </div>
            )}

            {/* CATEGORIES SECTION */}
            {shouldShowSection('categories') && results.categories && results.categories.length > 0 && (
              <div className="search-result-section">
                <div className="search-result-section-header">
                  <FaFolder />
                  <h2>Danh mục ({totalCounts.categories})</h2>
                </div>
                
                <div className="search-result-list">
                  {results.categories.slice(0, displayCounts.categories).map((category, index) => (
                    <div 
                      key={category.id ?? index}
                      className="search-result-item"
                      onClick={() => handleItemClick('categories', category)}
                    >
                      <div className="search-result-item-content">
                        <h3>{category.name}</h3>
                        {category.description && (
                          <p className="search-result-item-description">{category.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {displayCounts.categories < totalCounts.categories && (
                  <button 
                    className="search-result-load-more"
                    onClick={() => handleLoadMore('categories')}
                    disabled={loadingMore.categories}
                  >
                    {loadingMore.categories ? <FaSpinner className="search-result-spinner" /> : 'Xem thêm'}
                  </button>
                )}
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default SearchResultPage;
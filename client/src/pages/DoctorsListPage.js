import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaTimes, FaFilter, FaUserMd, FaClock, FaComments, FaVideo } from 'react-icons/fa';
import * as Icons from 'react-icons/fa'; // IMPORT TẤT CẢ ICON
import './DoctorsListPage.css';

const DoctorsListPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    specialty_id: '',
    min_experience: '',
    search: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({});
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => { fetchSpecialties(); }, []);
  useEffect(() => { fetchDoctors(); }, [filters]);

  const fetchSpecialties = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/specialties`);
      if (response.data.success) setSpecialties(response.data.specialties || []);
    } catch (error) { console.error('Error fetching specialties:', error); }
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(Object.entries(filters).filter(([_, v]) => v !== '')).toString();
      const response = await axios.get(`${API_BASE_URL}/users/doctors/public?${params}`);
      if (response.data.success) {
        // Lấy trực tiếp data, không dùng normalizeUserList để giữ nguyên thông tin chuyên khoa
        setDoctors(response.data.doctors || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) { 
      setDoctors([]); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleFilterChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  const clearFilters = () => setFilters({ specialty_id: '', min_experience: '', search: '', page: 1, limit: 12 });
  const handlePageChange = (newPage) => { setFilters(prev => ({ ...prev, page: newPage })); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Hàm render icon chuyên khoa động
  const renderIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.FaStethoscope;
    return <IconComponent />;
  };

  if (loading && filters.page === 1) {
    return (
      <div className="doctors-list-page">
        <div className="doctors-list-page__loading">
          <div className="doctors-list-page__spinner"></div>
          <p className="doctors-list-page__loading-text">Đang tải danh sách bác sĩ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doctors-list-page">
      <div className="doctors-list-page__header">
        <h1 className="doctors-list-page__title">Danh sách Bác sĩ - Chuyên gia</h1>
        <p className="doctors-list-page__subtitle">Đội ngũ bác sĩ chuyên môn cao, tận tâm với bệnh nhân</p>
      </div>

      <div className="doctors-list-page__filters">
        <div className="doctors-list-page__filters-header">
          <h3 className="doctors-list-page__filters-title"><FaFilter /> Bộ lọc tìm kiếm</h3>
          {(filters.specialty_id || filters.min_experience || filters.search) && (
            <button className="doctors-list-page__btn-clear" onClick={clearFilters}><FaTimes /> Xóa lọc</button>
          )}
        </div>

        <div className="doctors-list-page__filters-grid">
          <div className="doctors-list-page__filter-item">
            <label className="doctors-list-page__filter-label">Tìm kiếm</label>
            <div className="doctors-list-page__search-box">
              <FaSearch className="doctors-list-page__search-icon" />
              <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Tên bác sĩ..." className="doctors-list-page__filter-input" />
            </div>
          </div>

          <div className="doctors-list-page__filter-item">
            <label className="doctors-list-page__filter-label">Chuyên khoa</label>
            <select name="specialty_id" value={filters.specialty_id} onChange={handleFilterChange} className="doctors-list-page__filter-select">
              <option value="">Tất cả chuyên khoa</option>
              {specialties.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
          </div>

          <div className="doctors-list-page__filter-item">
            <label className="doctors-list-page__filter-label">Kinh nghiệm tối thiểu</label>
            <select name="min_experience" value={filters.min_experience} onChange={handleFilterChange} className="doctors-list-page__filter-select">
              <option value="">Tất cả</option>
              <option value="5">Trên 5 năm</option>
              <option value="10">Trên 10 năm</option>
              <option value="20">Trên 20 năm</option>
            </select>
          </div>
        </div>
      </div>

      {doctors.length === 0 ? (
        <div className="doctors-list-page__empty">
          <FaUserMd size={48} color="#cbd5e1" />
          <h3 className="doctors-list-page__empty-title">Không tìm thấy kết quả</h3>
          <p className="doctors-list-page__empty-text">Vui lòng thử lại với từ khóa khác</p>
        </div>
      ) : (
        <>
          <div className="doctors-list-page__grid">
            {doctors.map(doctor => (
              <div key={doctor.id} className="doctors-list-page__card">
                <div className="doctors-list-page__card-inner" onClick={() => navigate(`/bac-si/${doctor.code}`)}>
                  <div className="doctors-list-page__avatar-wrapper">
                    <img src={doctor.avatar_url} alt={doctor.full_name} className="doctors-list-page__avatar" onError={(e) => { e.target.src = 'https://via.placeholder.com/200?text=Doctor'; }} />
                  </div>

                  <div className="doctors-list-page__info">
                    <h3 className="doctors-list-page__name">
                      {doctor.title ? `${doctor.title}. ` : ''}{doctor.full_name}
                    </h3>

                    {doctor.experience_years > 0 && (
                      <div className="doctors-list-page__exp">
                        <FaClock /> {doctor.experience_years} năm kinh nghiệm
                      </div>
                    )}

                    <div className="doctors-list-page__details-list">
                      <div className="doctors-list-page__detail-item">
                        <span className="detail-label">Chuyên khoa:</span>
                        {doctor.specialty_slug ? (
                          <Link to={`/chuyen-khoa/${doctor.specialty_slug}`} className="detail-link specialty-icon-inline" onClick={(e) => e.stopPropagation()}>
                            {renderIcon(doctor.specialty_icon)} {doctor.specialty_name}
                          </Link>
                        ) : (
                          <span className="detail-text specialty-icon-inline">
                            {renderIcon(doctor.specialty_icon)} {doctor.specialty_name}
                          </span>
                        )}
                      </div>

                      {doctor.position && (
                        <div className="doctors-list-page__detail-item">
                          <span className="detail-label">Chức vụ:</span>
                          <span className="detail-text">{doctor.position}</span>
                        </div>
                      )}

                      {doctor.workplace && (
                        <div className="doctors-list-page__detail-item">
                          <span className="detail-label">Nơi công tác:</span>
                          <span className="detail-text highlight">{doctor.workplace}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 2 NÚT ĐẶT LỊCH TƯ VẤN CHAT / VIDEO CALL */}
                <div className="doctors-list-page__actions">
                  <button 
                    className="doctors-list-page__btn-book chat-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/dat-lich-tu-van', { 
                        state: { doctorId: doctor.id, consultationType: 'chat' } 
                      });
                    }}
                  >
                    <FaComments /> Tư vấn Chat
                  </button>
                  
                  <button 
                    className="doctors-list-page__btn-book video-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/dat-lich-tu-van', { 
                        state: { doctorId: doctor.id, consultationType: 'video' } 
                      });
                    }}
                  >
                    <FaVideo /> Video Call
                  </button>
                </div>

              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="doctors-list-page__pagination">
              <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1} className="doctors-list-page__pagination-btn">Trước</button>
              <div className="doctors-list-page__page-numbers">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button key={i + 1} className={`doctors-list-page__pagination-btn ${filters.page === i + 1 ? 'doctors-list-page__pagination-btn--active' : ''}`} onClick={() => handlePageChange(i + 1)}>{i + 1}</button>
                ))}
              </div>
              <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === pagination.totalPages} className="doctors-list-page__pagination-btn">Sau</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorsListPage;
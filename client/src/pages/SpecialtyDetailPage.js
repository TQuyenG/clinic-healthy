import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import * as Icons from 'react-icons/fa'; // Import toàn bộ icon để map
import { normalizeUserList } from '../utils/normalizeUser';
import './SpecialtyDetailPage.css';

const SpecialtyDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [specialty, setSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchSpecialtyDetail();
  }, [slug]);

  const fetchSpecialtyDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/specialties/slug/${slug}`);
      if (response.data.success) {
        setSpecialty(response.data.specialty);
        setDoctors(normalizeUserList(response.data.doctors || [], 'doctor'));
      }
    } catch (error) {
      console.error('Error fetching specialty:', error);
      if (error.response?.status === 404) navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  // Hàm hiển thị Icon động
  const renderIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.FaStethoscope;
    return <IconComponent />;
  };

  if (loading) return (
    <div className="specialty-detail-page"><div className="specialty-detail-page__loading"><div className="specialty-detail-page__spinner"></div><p>Đang tải...</p></div></div>
  );

  if (!specialty) return null;

  return (
    <div className="specialty-detail-page">
      <Breadcrumb items={[{ label: 'Trang chủ', url: '/' }, { label: 'Chuyên khoa', url: '/chuyen-khoa' }, { label: specialty.name, url: null }]} />

      <button onClick={() => {
        const returnTo = location.state?.returnTo;
        const returnState = location.state?.returnState;
        if (returnTo) navigate(returnTo, { state: returnState }); else navigate('/chuyen-khoa');
      }} className="specialty-detail-page__btn-back">
        <Icons.FaArrowLeft /> Quay lại danh sách
      </button>

      <div className="specialty-detail-page__header">
        <div className="specialty-detail-page__icon-large">
          {renderIcon(specialty.icon)}
        </div>
        <div className="specialty-detail-page__info">
          <h1 className="specialty-detail-page__name">{specialty.name}</h1>
          {specialty.description && <p className="specialty-detail-page__description">{specialty.description}</p>}
          <div className="specialty-detail-page__meta">
            <Icons.FaUser /> <span>{specialty.doctor_count} bác sĩ</span>
          </div>
        </div>
      </div>

      <div className="specialty-detail-page__doctors-section">
        <h2 className="specialty-detail-page__doctors-title">Đội ngũ bác sĩ</h2>
        <div className="specialty-detail-page__doctors-grid">
          {doctors.map(doctor => (
            <div key={doctor.id} className="specialty-detail-page__doctor-card" onClick={() => navigate(`/bac-si/${doctor.code}`, { state: {
              returnTo: location.pathname + location.search,
              returnState: { specialty: { slug } }
            } })}>
              <div className="specialty-detail-page__doctor-avatar">
                <img src={doctor.avatar_url} alt={doctor.full_name} onError={(e) => e.target.src = 'https://via.placeholder.com/200?text=Doctor'} />
              </div>
              <div className="specialty-detail-page__doctor-info">
                <h3 className="specialty-detail-page__doctor-name">{doctor.full_name}</h3>
                <span className="specialty-detail-page__doctor-code">Mã: {doctor.code}</span>
                <div className="specialty-detail-page__doctor-experience">
                  <Icons.FaAward /> <span>{doctor.experience_years} năm KN</span>
                </div>
                <button className="specialty-detail-page__btn-view"><Icons.FaEye /> Xem</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpecialtyDetailPage;
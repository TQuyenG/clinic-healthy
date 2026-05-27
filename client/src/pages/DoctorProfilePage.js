import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Breadcrumb from '../components/Breadcrumb';
import AppointmentRatingModal from '../components/appointments/AppointmentRatingModal';
import { 
  FaPhone, FaEnvelope, FaArrowLeft, FaComments, FaVideo,
  FaGraduationCap, FaBriefcase, FaAward, FaFlask, FaCertificate, FaLink,
  FaMapMarkerAlt, FaUserMd, FaStar, FaRegStar, FaSpinner, FaEdit, FaTrash, FaChartBar
} from 'react-icons/fa';
import * as Icons from 'react-icons/fa'; // IMPORT TẤT CẢ ICON
import './DoctorProfilePage.css';

const DoctorProfilePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [doctorStats, setDoctorStats] = useState({ avg_rating: 0, total_reviews: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [doctorReviews, setDoctorReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [modalReview, setModalReview] = useState({ rating: 0, review: '' });
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchDoctorProfile();
  }, [code]);

  useEffect(() => {
    if (doctor?.id) {
      loadDoctorReviews();
    }
  }, [doctor?.id, user?.id]);

  const fetchDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users/doctors/${code}`);
      if (response.data.success) {
        setDoctor(response.data.doctor);
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
      if (error.response?.status === 404) {
        navigate('/404');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorReviews = async () => {
    try {
      setReviewLoading(true);

      const [statsRes, reviewsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/statistics/doctor/${doctor.id}/unified?service_type=doctor`),
        axios.get(`${API_BASE_URL}/statistics/doctor/${doctor.id}/reviews?service_type=doctor&page=1&limit=6`),
      ]);

      if (statsRes.data?.success) {
        setDoctorStats(statsRes.data.data || {});
      }

      if (reviewsRes.data?.success) {
        setDoctorReviews(reviewsRes.data.data?.reviews || []);
        setPagination(reviewsRes.data.data?.pagination || null);
      }

      if (user?.id) {
        try {
          const myReviewRes = await axios.get(`${API_BASE_URL}/statistics/doctor/${doctor.id}/my-review`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setMyReview(myReviewRes.data?.data?.review || null);
          if (myReviewRes.data?.data?.review) {
            setModalReview({
              rating: myReviewRes.data.data.review.rating || 0,
              review: myReviewRes.data.data.review.review || ''
            });
          }
        } catch (error) {
          setMyReview(null);
        }
      }
    } catch (error) {
      console.error('Error loading doctor reviews:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const openReviewModal = () => {
    if (myReview) {
      setModalReview({
        rating: myReview.rating || 0,
        review: myReview.review || ''
      });
    } else {
      setModalReview({ rating: 0, review: '' });
    }
    setShowReviewModal(true);
  };

  const handleSubmitDoctorReview = async ({ rating, review }) => {
    try {
      setReviewActionLoading(true);
      const token = localStorage.getItem('token');
      const payload = { rating, review };
      const headers = { Authorization: `Bearer ${token}` };

      if (myReview) {
        await axios.put(`${API_BASE_URL}/statistics/doctor/${doctor.id}/reviews`, payload, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/statistics/doctor/${doctor.id}/reviews`, payload, { headers });
      }

      setShowReviewModal(false);
      await loadDoctorReviews();
    } catch (error) {
      console.error('Error submitting doctor review:', error);
      alert(error.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setReviewActionLoading(false);
    }
  };

  const handleDeleteDoctorReview = async () => {
    if (!window.confirm('Bạn muốn xóa đánh giá của mình?')) return;
    try {
      setReviewActionLoading(true);
      await axios.delete(`${API_BASE_URL}/statistics/doctor/${doctor.id}/reviews`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMyReview(null);
      await loadDoctorReviews();
    } catch (error) {
      console.error('Error deleting doctor review:', error);
      alert(error.response?.data?.message || 'Không thể xóa đánh giá');
    } finally {
      setReviewActionLoading(false);
    }
  };

  const renderStars = (rating) => {
    const value = Number(rating) || 0;
    return (
      <div className="doctor-profile-page-review-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= value ? <FaStar key={star} /> : <FaRegStar key={star} />
        ))}
      </div>
    );
  };

  const renderIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.FaStethoscope;
    return <IconComponent />;
  };

  const breadcrumbItems = doctor ? [
    { label: 'Trang chủ', url: '/' },
    { label: 'Đội ngũ bác sĩ', url: '/bac-si' },
    { label: doctor.full_name, url: null }
  ] : [];

  const handleBack = () => {
    const returnTo = location.state?.returnTo;
    const returnState = location.state?.returnState;

    if (returnTo) {
      navigate(returnTo, { state: returnState });
      return;
    }

    navigate(-1);
  };

  if (loading) return (
    <div className="doctor-profile-page-loading">
      <div className="doctor-profile-page-spinner"></div>
      <p>Đang tải thông tin...</p>
    </div>
  );
  
  if (!doctor) return null;

  return (
    <div className="doctor-profile-page-wrapper">
      <div className="doctor-profile-page-container">
        <div className="doctor-profile-page-top-nav">
          <Breadcrumb items={breadcrumbItems} />
          <button onClick={handleBack} className="doctor-profile-page-btn-back">
            <FaArrowLeft /> Quay lại
          </button>
        </div>

        <div className="doctor-profile-page-layout">
          {/* LEFT SIDEBAR */}
          <aside className="doctor-profile-page-sidebar">
            <div className="doctor-profile-page-sidebar-card">
              <div className="doctor-profile-page-avatar-wrapper">
                <img 
                  src={doctor.avatar_url} 
                  alt={doctor.full_name} 
                  onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Doctor'} 
                />
                {doctor.experience_years > 0 && (
                  <div className="doctor-profile-page-exp-badge">
                    <span className="doctor-profile-page-exp-number">{doctor.experience_years}+</span>
                    <span className="doctor-profile-page-exp-text">Năm</span>
                  </div>
                )}
              </div>

              <div className="doctor-profile-page-main-info">
                <div className="doctor-profile-page-title-upper">
                  {doctor.title || 'Bác sĩ'}
                </div>
                <h1 className="doctor-profile-page-name-main">
                  {doctor.full_name}
                </h1>
                
                <div className="doctor-profile-page-badges">
                  <span className="doctor-profile-page-badge doctor-profile-page-code-badge">Mã: {doctor.code}</span>
                </div>

                {doctor.specialty?.name && (
                  <div className="doctor-profile-page-specialty-tag">
                    {renderIcon(doctor.specialty.icon)} {doctor.specialty.name}
                  </div>
                )}
              </div>

              <div className="doctor-profile-page-contact-list">
                {doctor.email && (
                  <div className="doctor-profile-page-contact-item">
                    <div className="doctor-profile-page-contact-icon"><FaEnvelope /></div>
                    <div className="doctor-profile-page-contact-detail">
                      <span className="doctor-profile-page-label">Email</span>
                      <a href={`mailto:${doctor.email}`} className="doctor-profile-page-value">{doctor.email}</a>
                    </div>
                  </div>
                )}

                {doctor.phone && (
                  <div className="doctor-profile-page-contact-item">
                    <div className="doctor-profile-page-contact-icon"><FaPhone /></div>
                    <div className="doctor-profile-page-contact-detail">
                      <span className="doctor-profile-page-label">Số điện thoại</span>
                      <a href={`tel:${doctor.phone}`} className="doctor-profile-page-value">{doctor.phone}</a>
                    </div>
                  </div>
                )}

                {doctor.position && (
                  <div className="doctor-profile-page-contact-item">
                    <div className="doctor-profile-page-contact-icon"><FaUserMd /></div>
                    <div className="doctor-profile-page-contact-detail">
                      <span className="doctor-profile-page-label">Chức vụ</span>
                      <span className="doctor-profile-page-value">{doctor.position}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS (ĐÃ CẬP NHẬT 2 NÚT) */}
              <div className="doctor-profile-page-booking-actions">
                <button
                  className="doctor-profile-page-btn-book chat-btn"
                  onClick={() => navigate('/dat-lich-tu-van', { 
                    state: {
                      doctorId: doctor.id,
                      consultationType: 'chat',
                      returnTo: location.pathname,
                      returnState: location.state?.returnState || null
                    } 
                  })}
                >
                  <FaComments /> Đặt lịch Tư vấn Chat
                </button>

                <button
                  className="doctor-profile-page-btn-book video-btn"
                  onClick={() => navigate('/dat-lich-tu-van', { 
                    state: {
                      doctorId: doctor.id,
                      consultationType: 'video',
                      returnTo: location.pathname,
                      returnState: location.state?.returnState || null
                    } 
                  })}
                >
                  <FaVideo /> Đặt lịch Video Call
                </button>
              </div>

            </div>
          </aside>

          {/* RIGHT MAIN CONTENT */}
          <main className="doctor-profile-page-content">
            
            <section className="doctor-profile-page-content-card">
              <div className="doctor-profile-page-card-header">
                <h2 className="doctor-profile-page-card-title"><FaUserMd /> Giới thiệu</h2>
              </div>
              <div className="doctor-profile-page-card-body">
                <p className="doctor-profile-page-bio-text">
                  {doctor.bio || `Bác sĩ ${doctor.full_name} là một chuyên gia trong lĩnh vực ${doctor.specialty?.name || 'y khoa'}, luôn tận tâm với nghề và hết lòng vì người bệnh.`}
                </p>
              </div>
            </section>

            <section className="doctor-profile-page-content-card">
              <div className="doctor-profile-page-card-header doctor-profile-page-card-header-rating">
                <h2 className="doctor-profile-page-card-title"><FaChartBar /> Đánh giá bác sĩ</h2>
                <div className="doctor-profile-page-rating-summary">
                  <div className="doctor-profile-page-rating-score">
                    <FaStar /> {Number(doctorStats.avg_rating || 0).toFixed(1)}
                  </div>
                  <div className="doctor-profile-page-rating-total">{doctorStats.total_reviews || 0} lượt đánh giá</div>
                </div>
              </div>
              <div className="doctor-profile-page-card-body">
                <div className="doctor-profile-page-rating-actions">
                  {user?.role === 'patient' && (
                    <button className="doctor-profile-page-rating-btn primary" onClick={openReviewModal}>
                      <FaStar /> {myReview ? 'Sửa đánh giá của bạn' : 'Đánh giá bác sĩ'}
                    </button>
                  )}
                  {myReview && (
                    <button className="doctor-profile-page-rating-btn danger" onClick={handleDeleteDoctorReview} disabled={reviewActionLoading}>
                      {reviewActionLoading ? <FaSpinner className="spin" /> : <FaTrash />} Xóa đánh giá của tôi
                    </button>
                  )}
                </div>

                {myReview && (
                  <div className="doctor-profile-page-my-review">
                    <div className="doctor-profile-page-my-review-head">
                      <strong>Đánh giá của bạn</strong>
                      {renderStars(myReview.rating)}
                    </div>
                    {myReview.review && <p>{myReview.review}</p>}
                  </div>
                )}

                {reviewLoading ? (
                  <div className="doctor-profile-page-reviews-loading"><FaSpinner className="spin" /> Đang tải đánh giá...</div>
                ) : (
                  <div className="doctor-profile-page-reviews-list">
                    {doctorReviews.length === 0 ? (
                      <div className="doctor-profile-page-reviews-empty">Chưa có đánh giá nào cho bác sĩ này.</div>
                    ) : (
                      doctorReviews.map((reviewItem) => (
                        <article key={reviewItem.id} className="doctor-profile-page-review-card">
                          <div className="doctor-profile-page-review-head">
                            <div>
                              <strong>{reviewItem.patient?.full_name || 'Bệnh nhân'}</strong>
                              <div className="doctor-profile-page-review-date">{new Date(reviewItem.created_at).toLocaleDateString('vi-VN')}</div>
                            </div>
                            {renderStars(reviewItem.rating)}
                          </div>
                          {reviewItem.review && <p className="doctor-profile-page-review-text">{reviewItem.review}</p>}
                        </article>
                      ))
                    )}
                  </div>
                )}
              </div>
            </section>

            {doctor.education && doctor.education.length > 0 && (
              <section className="doctor-profile-page-content-card">
                <div className="doctor-profile-page-card-header">
                  <h2 className="doctor-profile-page-card-title"><FaGraduationCap /> Quá trình đào tạo</h2>
                </div>
                <div className="doctor-profile-page-card-body">
                  <div className="doctor-profile-page-timeline">
                    {doctor.education.map((edu, index) => (
                      <div key={index} className="doctor-profile-page-timeline-item">
                        <div className="doctor-profile-page-timeline-marker"></div>
                        <div className="doctor-profile-page-timeline-content">
                          <span className="doctor-profile-page-timeline-year">{edu.year}</span>
                          <h3 className="doctor-profile-page-timeline-title">{edu.degree}</h3>
                          <p className="doctor-profile-page-timeline-subtitle">{edu.institution}</p>
                          {edu.description && <p className="doctor-profile-page-timeline-desc">{edu.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {doctor.work_experience && doctor.work_experience.length > 0 && (
              <section className="doctor-profile-page-content-card">
                <div className="doctor-profile-page-card-header">
                  <h2 className="doctor-profile-page-card-title"><FaBriefcase /> Kinh nghiệm làm việc</h2>
                </div>
                <div className="doctor-profile-page-card-body">
                  <div className="doctor-profile-page-timeline">
                    {doctor.work_experience.map((work, index) => (
                      <div key={index} className="doctor-profile-page-timeline-item">
                        <div className="doctor-profile-page-timeline-marker work"></div>
                        <div className="doctor-profile-page-timeline-content">
                          <span className="doctor-profile-page-timeline-year">{work.period}</span>
                          <h3 className="doctor-profile-page-timeline-title">{work.position}</h3>
                          <p className="doctor-profile-page-timeline-subtitle">
                            <FaMapMarkerAlt style={{marginRight: '4px'}}/>
                            {work.hospital} {work.department ? `- ${work.department}` : ''}
                          </p>
                          {work.description && <p className="doctor-profile-page-timeline-desc">{work.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {(doctor.certifications?.length > 0 || doctor.achievements?.length > 0) && (
              <div className="doctor-profile-page-grid-two-cols">
                {doctor.certifications?.length > 0 && (
                  <section className="doctor-profile-page-content-card h-full">
                    <div className="doctor-profile-page-card-header">
                      <h2 className="doctor-profile-page-card-title"><FaCertificate /> Chứng chỉ</h2>
                    </div>
                    <div className="doctor-profile-page-card-body">
                      <ul className="doctor-profile-page-compact-list">
                        {doctor.certifications.map((cert, index) => (
                          <li key={index}>
                            <span className="doctor-profile-page-list-bullet"></span>
                            <span className="doctor-profile-page-list-text">{cert.name}</span>
                            {cert.link && <a href={cert.link} target="_blank" rel="noreferrer" className="doctor-profile-page-link-btn"><FaLink /></a>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {doctor.achievements?.length > 0 && (
                  <section className="doctor-profile-page-content-card h-full">
                    <div className="doctor-profile-page-card-header">
                      <h2 className="doctor-profile-page-card-title"><FaAward /> Thành tích</h2>
                    </div>
                    <div className="doctor-profile-page-card-body">
                      <ul className="doctor-profile-page-compact-list gold">
                        {doctor.achievements.map((ach, index) => (
                          <li key={index}>
                            <span className="doctor-profile-page-list-icon-mini"><FaAward /></span>
                            <span className="doctor-profile-page-list-text">{ach.title}</span>
                            {ach.link && <a href={ach.link} target="_blank" rel="noreferrer" className="doctor-profile-page-link-btn"><FaLink /></a>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
              </div>
            )}

            {doctor.research && doctor.research.length > 0 && (
              <section className="doctor-profile-page-content-card">
                <div className="doctor-profile-page-card-header">
                  <h2 className="doctor-profile-page-card-title"><FaFlask /> Nghiên cứu khoa học</h2>
                </div>
                <div className="doctor-profile-page-card-body">
                  <div className="doctor-profile-page-research-list">
                    {doctor.research.map((res, index) => (
                      <div key={index} className="doctor-profile-page-research-item">
                        <div className="doctor-profile-page-research-icon"><FaFlask /></div>
                        <div className="doctor-profile-page-research-info">
                          <h4>{res.title}</h4>
                          <p>
                            <span className="res-journal">{res.journal}</span>
                            <span className="res-separator">•</span>
                            <span className="res-year">{res.year}</span>
                          </p>
                          {res.authors && <p className="res-authors">TG: {res.authors}</p>}
                        </div>
                        {res.link && <a href={res.link} target="_blank" rel="noreferrer" className="doctor-profile-page-research-link">Xem</a>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

          </main>
        </div>

        <AppointmentRatingModal
          show={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleSubmitDoctorReview}
          mode={myReview ? 'submit' : 'submit'}
          appointment={doctor}
          isSubmitting={reviewActionLoading}
          contextType="doctor"
        />
      </div>
    </div>
  );
};

export default DoctorProfilePage;
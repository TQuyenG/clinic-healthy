/**
 * ServicesPage — REDESIGN v4
 * Fixes:
 *  - Fetch availableDoctors từ /consultations/chon-bac-si (đã có trong consultationService)
 *  - Map đúng field package_name từ ConsultationPricing
 *  - Type toggle Chat/Video có logic thực sự
 *  - Đánh giá nổi bật cho cả 2 tab (dùng /services/ratings hoặc fallback)
 *  - Bác sĩ tiêu biểu hiện ở cả tab hospital (lấy từ /users/doctors/public)
 *  - Doctor profile navigate bằng code (không phải id)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import serviceCategoryService from '../services/serviceCategoryService';
import consultationService from '../services/consultationService';
import { toast } from 'react-toastify';
import {
  FaSearch, FaStar, FaClock, FaArrowRight, FaComments, FaVideo,
  FaUserMd, FaShieldAlt, FaBolt, FaWallet, FaCheckCircle,
  FaStethoscope, FaLaptopMedical, FaTimes, FaCalendarCheck,
  FaFileMedical, FaUserPlus, FaTag, FaFilter, FaChevronDown,
  FaChevronUp, FaSortAmountDown, FaHospital, FaAward, FaHeartbeat,
  FaAngleRight, FaPhoneAlt, FaRegClock, FaMapMarkerAlt,
  FaRegStar, FaQuoteLeft
} from 'react-icons/fa';
import './ServicesPage.css';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtPrice = (n) =>
  n ? `${parseInt(n).toLocaleString('vi-VN')}₫` : 'Miễn phí';

const getIcon = (name) => {
  const map = {
    bolt: <FaBolt />, comments: <FaComments />, video: <FaVideo />,
    usermd: <FaUserMd />, shield: <FaShieldAlt />, wallet: <FaWallet />,
  };
  return map[name] || <FaCheckCircle />;
};

const FaLayerGroup = () => (
  <svg viewBox="0 0 512 512" fill="currentColor" style={{ width: '1em', height: '1em' }}>
    <path d="M12.41 148.02l232.94 105.67c6.8 3.09 14.49 3.09 21.29 0l232.94-105.67c16.55-7.51 16.55-32.52 0-40.03L266.65 2.31a25.607 25.607 0 0 0-21.29 0L12.41 107.98c-16.55 7.51-16.55 32.53 0 40.04zm487.18 88.28l-58.09-26.33-161.64 73.27c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.51 209.97l-58.1 26.33c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.09 14.49 3.09 21.29 0L499.59 276.3c16.55-7.5 16.55-32.5 0-40zm0 127.8l-57.87-26.23-161.86 73.37c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.29 337.87 12.41 364.1c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.09 14.49 3.09 21.29 0L499.59 404.1c16.55-7.5 16.55-32.5 0-40z" />
  </svg>
);

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="sp-skeleton-card">
    <div className="sp-skeleton-img" />
    <div className="sp-skeleton-body">
      <div className="sp-skeleton-line sp-skeleton-line--title" />
      <div className="sp-skeleton-line" />
      <div className="sp-skeleton-line sp-skeleton-line--short" />
    </div>
  </div>
);

const SkeletonDocCard = () => (
  <div className="sp-skeleton-doc">
    <div className="sp-skeleton-avatar" />
    <div className="sp-skeleton-line sp-skeleton-line--title" style={{ width: '60%', margin: '0 auto' }} />
    <div className="sp-skeleton-line" style={{ width: '80%', margin: '0 auto' }} />
    <div className="sp-skeleton-line sp-skeleton-line--short" style={{ width: '50%', margin: '0 auto' }} />
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────── */
const ServicesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const heroRef = useRef(null);

  const initialTab = new URLSearchParams(location.search).get('tab') || 'hospital';

  /* ── State ─────────────────────────────────────────────────────────────── */
  const [activeTab,         setActiveTab]         = useState(initialTab);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [loading,           setLoading]           = useState(true);
  const [loadingDoctors,    setLoadingDoctors]    = useState(false);
  const [categories,        setCategories]        = useState([]);
  const [allServices,       setAllServices]       = useState([]);
  const [availableDoctors,  setAvailableDoctors]  = useState([]);
  const [featuredDoctors,   setFeaturedDoctors]   = useState([]);  // for hospital tab
  const [selectedCategory,  setSelectedCategory]  = useState('all');
  const [sortBy,            setSortBy]            = useState('default');
  const [priceRange,        setPriceRange]        = useState('all');
  const [showFilters,       setShowFilters]       = useState(false);
  const [packages,          setPackages]          = useState([]);
  const [activePackageType, setActivePackageType] = useState('all'); // 'all' | 'chat' | 'video'
  const [whyChooseSettings, setWhyChooseSettings] = useState([]);
  const [servicesPageSettings, setServicesPageSettings] = useState(null);
  const [scrolled,          setScrolled]          = useState(false);
  const [reviews,           setReviews]           = useState([]);
  const [reviewIndex,       setReviewIndex]       = useState(0);
  const [currentPage,       setCurrentPage]       = useState(1);
  const ITEMS_PER_PAGE = 9;
  const [doctorPage,    setDoctorPage]    = useState(1);
  const DOCTORS_PER_PAGE = 4;
  const [pkgPage,       setPkgPage]       = useState(1);
  const PKGS_PER_PAGE = 6;
  const [conDoctorPage, setConDoctorPage] = useState(1);
  const CON_DOCTORS_PER_PAGE = 4;
  const reviewTimerRef = useRef(null);

  /* ── Parallax ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      if (heroRef.current) {
        heroRef.current.style.backgroundPositionY = `${window.scrollY * 0.35}px`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Fetch services page settings từ API ─────────────────────────────── */
  useEffect(() => {
    const fetchServicesSettings = async () => {
      try {
        const res = await api.get('/settings/services_page');
        const data = res?.data || {};
        setServicesPageSettings(data);
        if (data.why_choose?.length) {
          setWhyChooseSettings(data.why_choose.map((w, i) => ({ ...w, id: i + 1 })));
        } else {
          setWhyChooseSettings([
            { id: 1, icon: 'usermd', title: '500+ Bác Sĩ Giỏi',  desc: 'Đội ngũ chuyên gia đầu ngành từ các bệnh viện lớn.', color: '#0ea5a4' },
            { id: 2, icon: 'bolt',   title: 'Kết Nối Tức Thì',    desc: 'Không xếp hàng, kết nối bác sĩ chỉ sau vài giây.',  color: '#f39c12' },
            { id: 3, icon: 'shield', title: 'Bảo Mật Tuyệt Đối', desc: 'Hồ sơ bệnh án được mã hóa chuẩn quốc tế.',          color: '#3b82f6' },
            { id: 4, icon: 'wallet', title: 'Chi Phí Hợp Lý',     desc: 'Tiết kiệm chi phí đi lại và thời gian chờ đợi.',    color: '#8b5cf6' },
          ]);
        }
      } catch {
        setWhyChooseSettings([
          { id: 1, icon: 'usermd', title: '500+ Bác Sĩ Giỏi',  desc: 'Đội ngũ chuyên gia đầu ngành từ các bệnh viện lớn.', color: '#0ea5a4' },
          { id: 2, icon: 'bolt',   title: 'Kết Nối Tức Thì',    desc: 'Không xếp hàng, kết nối bác sĩ chỉ sau vài giây.',  color: '#f39c12' },
          { id: 3, icon: 'shield', title: 'Bảo Mật Tuyệt Đối', desc: 'Hồ sơ bệnh án được mã hóa chuẩn quốc tế.',          color: '#3b82f6' },
          { id: 4, icon: 'wallet', title: 'Chi Phí Hợp Lý',     desc: 'Tiết kiệm chi phí đi lại và thời gian chờ đợi.',    color: '#8b5cf6' },
        ]);
      }
    };
    fetchServicesSettings();
  }, []);

  /* ── Fetch doctors ─────────────────────────────────────────────────────── */
  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      // API /consultations/chon-bac-si trả về { success, data: [...Doctor with user, specialty] }
      const res = await consultationService.getAvailableDoctors({ limit: 50 });
      const docs = res?.data?.data || res?.data?.doctors || [];
      // Normalize: đảm bảo mỗi doc có full_name, avatar_url, specialty, code ở top level
      const normalized = (Array.isArray(docs) ? docs : []).map(d => ({
        ...d,
        full_name:  d.user?.full_name  || d.full_name  || 'Bác sĩ',
        avatar_url: d.user?.avatar_url || d.avatar_url || null,
        specialty_name: d.specialty?.name || 'Đa khoa',
        code: d.code || null,
      }));
      setAvailableDoctors(normalized);
    } catch (err) {
      console.error('Error fetching available doctors:', err);
      setAvailableDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  const fetchFeaturedDoctors = useCallback(async () => {
    try {
      // For hospital tab: lấy bác sĩ nổi bật (public endpoint)
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const res = await api.get('/users/doctors/public', { params: { limit: 6 } });
      const docs = res?.data?.doctors || [];
      setFeaturedDoctors(Array.isArray(docs) ? docs.slice(0, 6) : []);
    } catch {
      setFeaturedDoctors([]);
    }
  }, []);

  /* ── Fetch reviews ─────────────────────────────────────────────────────── */
  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get('/appointments/public-ratings', {
        params: { limit: 20 }
      });
      const data = res?.data?.data || [];
      if (Array.isArray(data) && data.length) setReviews(data);
    } catch {
      setReviews([]);
    }
  }, []);

  /* ── Fetch main data by tab ─────────────────────────────────────────────── */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'hospital') {
          const [catRes, allRes] = await Promise.all([
            serviceCategoryService.getPublicServiceCategories(),
            api.get('/services', { params: { limit: 100 } }),
          ]);
          if (catRes.data?.success)  setCategories(catRes.data.data || []);
          if (allRes.data?.success)  setAllServices(allRes.data.data || []);
          fetchFeaturedDoctors();
        } else {
          // Consultation tab
          const pkgRes = await consultationService.getAllPublicPackages({ limit: 50 });
          // Response: { success, data: [...] } hoặc { success, data: { packages: [...] } }
          const rawPkgs = pkgRes?.data?.data || pkgRes?.data?.packages || pkgRes?.data || [];
          const pkgArr  = Array.isArray(rawPkgs) ? rawPkgs : [];

          const mapped = pkgArr.map(p => ({
            id:          p.id,
            // ✅ FIX: API trả về package_name, không phải name/title
            name:        p.package_name || p.name || `Gói ${p.id}`,
            subtitle:    p.description || '',
            description: p.notes || p.description || '',
            // ✅ FIX: API trả về package_type: 'chat' | 'video' | 'offline'
            package_type: p.package_type || 'chat',
            icon:         p.package_type === 'video' ? 'video' : 'comments',
            color:        p.package_type === 'video' ? '#6c63ff' : '#0ea5a4',
            price:        parseFloat(p.price) || 0,
            duration:     p.duration_minutes || 30,
            features:     p.features || [],
            is_active:    p.is_active !== false,
          })).filter(p => p.is_active);

          setPackages(mapped);
          fetchDoctors();
        }
      } catch (err) {
        toast.error('Không thể tải dữ liệu dịch vụ.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, fetchDoctors, fetchFeaturedDoctors]);
// Tách riêng — chỉ gọi 1 lần khi mount
useEffect(() => {
  fetchReviews();
}, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-advance review carousel ──────────────────────────────────────── */
  useEffect(() => {
    if (!reviews.length) return;
    reviewTimerRef.current = setInterval(() => {
      setReviewIndex(i => (i + 1) % reviews.length);
    }, 4500);
    return () => clearInterval(reviewTimerRef.current);
  }, [reviews]);

  /* ── Handlers ─────────────────────────────────────────────────────────── */
    useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, priceRange, sortBy]);
    useEffect(() => { setPkgPage(1); }, [activePackageType, searchTerm]);
    useEffect(() => { setConDoctorPage(1); }, [searchTerm]);

    const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('default');
    setShowFilters(false);
    setActivePackageType('all');
    setCurrentPage(1);
    setDoctorPage(1);
    navigate(`/dich-vu?tab=${tab}`, { replace: true });
  };

  const handleBooking = (type, doctorId = null) => {
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } });
    if (type === 'quick-chat') {
      window.openChatbot ? window.openChatbot() : toast.info('Chatbot đang cập nhật.');
      return;
    }
    navigate('/dat-lich-tu-van', { state: { doctorId, consultationType: type } });
  };

  /* ── Filter logic ─────────────────────────────────────────────────────── */
  const filteredServices = (() => {
    let r = [...allServices];
    if (searchTerm) r = r.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.short_description?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCategory !== 'all') r = r.filter(s => String(s.category_id) === String(selectedCategory));
    if (priceRange === 'low')  r = r.filter(s => s.price < 500000);
    if (priceRange === 'mid')  r = r.filter(s => s.price >= 500000 && s.price < 2000000);
    if (priceRange === 'high') r = r.filter(s => s.price >= 2000000);
    if (sortBy === 'price-asc')  r.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') r.sort((a, b) => b.price - a.price);
    return r;
  })();

 const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
  const pagedServices = filteredServices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filteredPackages = packages.filter(p => {
    if (activePackageType === 'all') return true;
    return p.package_type === activePackageType;
  });
  const totalPkgPages = Math.ceil(filteredPackages.length / PKGS_PER_PAGE);
  const pagedPackages = filteredPackages.slice(
    (pkgPage - 1) * PKGS_PER_PAGE,
    pkgPage * PKGS_PER_PAGE
  );

  const filteredDoctors = availableDoctors.filter(d => {
    if (!searchTerm) return true;
    const name = d.full_name || d.user?.full_name || '';
    const spec = d.Doctor?.Specialty?.name || d.specialty?.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           spec.toLowerCase().includes(searchTerm.toLowerCase());
  });
  const totalConDoctorPages = Math.ceil(filteredDoctors.length / CON_DOCTORS_PER_PAGE);
  const pagedConDoctors = filteredDoctors.slice(
    (conDoctorPage - 1) * CON_DOCTORS_PER_PAGE,
    conDoctorPage * CON_DOCTORS_PER_PAGE
  );

  const filteredFeatured = featuredDoctors.filter(d => {
    if (!searchTerm) return true;
    const name = d.full_name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalDoctorPages = Math.ceil(filteredFeatured.length / DOCTORS_PER_PAGE);
  const pagedFeatured = filteredFeatured.slice(
    (doctorPage - 1) * DOCTORS_PER_PAGE,
    doctorPage * DOCTORS_PER_PAGE
  );

  const s = servicesPageSettings;
  const bannerConfig = {
    hospital: {
      title:    s?.hospital_hero?.title    || 'Dịch Vụ Y Tế Chuyên Sâu',
      subtitle: s?.hospital_hero?.subtitle || 'Trải nghiệm quy trình khám chữa bệnh hiện đại, tận tâm tại bệnh viện.',
      image:    s?.hospital_hero?.image    || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000',
    },
    consultation: {
      title:    s?.consultation_hero?.title    || 'Bác Sĩ Trực Tuyến 24/7',
      subtitle: s?.consultation_hero?.subtitle || 'Kết nối ngay với chuyên gia y tế qua Video / Chat — mọi lúc, mọi nơi.',
      image:    s?.consultation_hero?.image    || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000',
    },
  };

  /* ─────────────────────────────────────────────────────────────────────────
     SHARED: Doctor card component
  ─────────────────────────────────────────────────────────────────────────── */
  const DoctorCard = ({ doc, type = 'consultation', index = 0 }) => {
    // Normalize fields — consultation API và hospital API có cấu trúc khác nhau
    const fullName    = doc.full_name || doc.user?.full_name || 'Bác sĩ';
    const avatar      = doc.avatar_url || doc.user?.avatar || null;
    const specName    = doc.specialty_name || doc.Doctor?.Specialty?.name || doc.specialty?.name || 'Đa khoa';
    const expYears    = doc.Doctor?.experience_years || doc.experience_years || 0;
    const avgRating   = doc.Doctor?.avg_rating || doc.avg_rating || null;
    const totalReviews= doc.Doctor?.total_reviews || doc.total_reviews || 0;
    const title       = doc.Doctor?.title || doc.title || '';
    const doctorCode  = doc.Doctor?.code || doc.code || null;
    const doctorId    = doc.Doctor?.id || doc.id;

    const avatarSrc = avatar
      ? avatar
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0ea5a4&color=fff&size=120`;

    const goProfile = () => {
      if (doctorCode) navigate(`/bac-si/${doctorCode}`);
      else navigate(`/bac-si/${doctorId}`);
    };

    return (
      <div className="sp-doc-card" style={{ animationDelay: `${index * 0.08}s` }}>
        {/* Avatar */}
        <div className="sp-doc-avatar-wrap" onClick={goProfile} style={{ cursor: 'pointer' }}>
          <img
            className="sp-doc-avatar"
            src={avatarSrc}
            alt={fullName}
            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=BS&background=0ea5a4&color=fff&size=120`; }}
          />
          {type === 'consultation' && <span className="sp-doc-online-dot" title="Đang trực tuyến" />}
        </div>

        {/* Info */}
        <div className="sp-doc-info">
          <h4 className="sp-doc-name" onClick={goProfile} style={{ cursor: 'pointer' }}>
            {title ? `${title} ` : ''}{fullName}
          </h4>
          <span className="sp-doc-spec">{specName}</span>
          {expYears > 0 && (
            <span className="sp-doc-exp"><FaClock /> {expYears} năm KN</span>
          )}
          {avgRating && (
            <div className="sp-doc-rating">
              <FaStar />
              <strong>{parseFloat(avgRating).toFixed(1)}</strong>
              <span>({totalReviews} đánh giá)</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sp-doc-actions">
          {type === 'consultation' ? (
            <>
              <button className="sp-doc-btn sp-doc-btn--chat" onClick={() => handleBooking('chat', doc.id || doc.doctor_id)}>
                <FaComments /> Chat
              </button>
              <button className="sp-doc-btn sp-doc-btn--video" onClick={() => handleBooking('video', doc.id || doc.doctor_id)}>
                <FaVideo /> Video
              </button>
              <button className="sp-doc-btn sp-doc-btn--profile" onClick={goProfile}>
                Hồ sơ
              </button>
            </>
          ) : (
            <>
              <button className="sp-doc-btn sp-doc-btn--book" onClick={() => navigate(`/dat-lich-hen?doctor=${doctorCode || doctorId}`)}>
                <FaCalendarCheck /> Đặt lịch
              </button>
              <button className="sp-doc-btn sp-doc-btn--profile" onClick={goProfile}>
                Xem hồ sơ
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     SHARED: Reviews carousel
  ─────────────────────────────────────────────────────────────────────────── */
  const ReviewsSection = () => {
    if (!reviews.length) return null;
    return (
      <section className="sp-section sp-reviews-section">
        <div className="sp-section-head">
          <div>
            <span className="sp-section-eyebrow"><FaStar /> Phản hồi</span>
            <h2 className="sp-section-title">Bệnh Nhân Nói Gì?</h2>
          </div>
          <div className="sp-reviews-nav">
            <button
              className="sp-reviews-nav-btn"
              onClick={() => { setReviewIndex(i => (i - 1 + reviews.length) % reviews.length); clearInterval(reviewTimerRef.current); }}
            >‹</button>
            <button
              className="sp-reviews-nav-btn"
              onClick={() => { setReviewIndex(i => (i + 1) % reviews.length); clearInterval(reviewTimerRef.current); }}
            >›</button>
          </div>
        </div>

        <div className="sp-reviews-track">
          {reviews.map((rv, i) => {
            const offset     = i - reviewIndex;
            const total      = reviews.length;
            const normalized = ((offset % total) + total) % total;
            let pos = 'hidden';
            if (normalized === 0) pos = 'active';
            else if (normalized === 1) pos = 'next';
            else if (normalized === total - 1) pos = 'prev';
            return (
              <div key={rv.id} className={`sp-review-card sp-review-card--${pos}`}>
                <FaQuoteLeft className="sp-review-quote-icon" />
                <div className="sp-review-stars">
                  {[...Array(5)].map((_, si) => (
                    <FaStar key={si} className={si < (rv.rating || 5) ? 'sp-star--on' : 'sp-star--off'} />
                  ))}
                </div>
                <p className="sp-review-text">{rv.review || 'Dịch vụ rất tốt, bác sĩ tận tâm.'}</p>
                <div className="sp-review-author">
                  <div className="sp-review-avatar">
                    {(rv.patient?.full_name || 'B').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="sp-review-name">{rv.patient?.full_name || 'Bệnh nhân'}</span>
                    {rv.doctor?.full_name && (
                      <span className="sp-review-doctor">BS. {rv.doctor.full_name}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sp-reviews-dots">
          {reviews.map((_, i) => (
            <button
              key={i}
              className={`sp-reviews-dot ${i === reviewIndex ? 'sp-reviews-dot--active' : ''}`}
              onClick={() => { setReviewIndex(i); clearInterval(reviewTimerRef.current); }}
            />
          ))}
        </div>
      </section>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="sp-root">

      {/* ════ HERO ════════════════════════════════════════════════════════ */}
      <section
        className="sp-hero"
        ref={heroRef}
        style={{ backgroundImage: `url(${bannerConfig[activeTab].image})` }}
      >
        <div className="sp-hero-overlay" />

        <div className="sp-hero-badge">
          <FaAward /> Được chứng nhận ISO 9001
        </div>

        <div className="sp-hero-content">
          <p className="sp-hero-eyebrow">
            {activeTab === 'hospital'
              ? <><FaHospital /> Khám tại Bệnh viện</>
              : <><FaLaptopMedical /> Tư vấn trực tuyến</>}
          </p>
          <h1 className="sp-hero-title">{bannerConfig[activeTab].title}</h1>
          <p className="sp-hero-sub">{bannerConfig[activeTab].subtitle}</p>

          <div className="sp-search-wrap">
            <FaSearch className="sp-search-ico" />
            <input
              className="sp-search-input"
              type="text"
              placeholder={activeTab === 'hospital' ? 'Tìm gói khám, xét nghiệm...' : 'Tìm bác sĩ, chuyên khoa...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="sp-search-clear" onClick={() => setSearchTerm('')}>
                <FaTimes />
              </button>
            )}
            <button className="sp-search-btn">Tìm kiếm</button>
          </div>

          <div className="sp-hero-stats">
            {(servicesPageSettings?.hero_stats || [
              { num: '500+', lbl: 'Bác sĩ' },
              { num: '200+', lbl: 'Dịch vụ' },
              { num: '50k+', lbl: 'Bệnh nhân' },
              { num: '4.9★', lbl: 'Đánh giá' },
            ]).map(stat => (
              <div key={stat.lbl} className="sp-hero-stat">
                <strong>{stat.num}</strong>
                <span>{stat.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ STICKY TABS ═════════════════════════════════════════════════ */}
      <div className={`sp-tab-bar ${scrolled ? 'sp-tab-bar--stuck' : ''}`}>
        <div className="sp-tab-inner">
          <button
            className={`sp-tab ${activeTab === 'hospital' ? 'sp-tab--active' : ''}`}
            onClick={() => handleTabChange('hospital')}
          >
            <FaStethoscope />
            <span>Khám tại Bệnh viện</span>
          </button>
          <button
            className={`sp-tab ${activeTab === 'consultation' ? 'sp-tab--active' : ''}`}
            onClick={() => handleTabChange('consultation')}
          >
            <FaLaptopMedical />
            <span>Tư vấn Trực tuyến</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: HOSPITAL
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'hospital' && (
        <div className="sp-page-body sp-fade-up">

          {/* ── Danh mục dịch vụ ── */}
          <section className="sp-section">
            <div className="sp-section-head">
              <div>
                <span className="sp-section-eyebrow"><FaFileMedical /> Danh mục</span>
                <h2 className="sp-section-title">Danh Mục Dịch Vụ</h2>
              </div>
            </div>

            {loading ? (
              <div className="sp-cat-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="sp-skeleton-cat" style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            ) : (
              <div className="sp-cat-grid">
                <button
                  className={`sp-cat-card ${selectedCategory === 'all' ? 'sp-cat-card--active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  <div className="sp-cat-icon-wrap"><FaLayerGroup /></div>
                  <span className="sp-cat-name">Tất cả</span>
                  <span className="sp-cat-count">{allServices.length} dịch vụ</span>
                </button>

                {categories.map((cat, i) => {
                  const count = allServices.filter(s => String(s.category_id) === String(cat.id)).length;
                  return (
                    <button
                      key={cat.id}
                      className={`sp-cat-card ${String(selectedCategory) === String(cat.id) ? 'sp-cat-card--active' : ''}`}
                      onClick={() => { setSelectedCategory(cat.id); setShowFilters(true); }}
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <div className="sp-cat-icon-wrap"><FaFileMedical /></div>
                      <span className="sp-cat-name">{cat.name}</span>
                      <span className="sp-cat-count">{count} dịch vụ</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Bộ lọc & danh sách dịch vụ ── */}
          <section className="sp-section">
            <div className="sp-filter-toolbar">
              <div className="sp-filter-toolbar-left">
                <h3 className="sp-filter-count">
                  <span className="sp-filter-count-num">{filteredServices.length}</span> dịch vụ
                  {selectedCategory !== 'all' && (
                    <span className="sp-filter-active-tag">
                      {categories.find(c => String(c.id) === String(selectedCategory))?.name}
                      <button onClick={() => setSelectedCategory('all')}><FaTimes /></button>
                    </span>
                  )}
                  {priceRange !== 'all' && (
                    <span className="sp-filter-active-tag">
                      {priceRange === 'low' ? 'Dưới 500k' : priceRange === 'mid' ? '500k–2tr' : 'Trên 2tr'}
                      <button onClick={() => setPriceRange('all')}><FaTimes /></button>
                    </span>
                  )}
                </h3>
              </div>
              <div className="sp-filter-toolbar-right">
                <div className="sp-select-wrap">
                  <FaSortAmountDown />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="default">Mặc định</option>
                    <option value="price-asc">Giá tăng dần</option>
                    <option value="price-desc">Giá giảm dần</option>
                  </select>
                </div>
                <button
                  className={`sp-filter-toggle-btn ${showFilters ? 'sp-filter-toggle-btn--open' : ''}`}
                  onClick={() => setShowFilters(v => !v)}
                >
                  <FaFilter />
                  Bộ lọc
                  {showFilters ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            </div>

            <div className={`sp-filter-panel ${showFilters ? 'sp-filter-panel--open' : ''}`}>
              <div className="sp-filter-panel-inner">
                <div className="sp-filter-row">
                  <div className="sp-filter-group">
                    <label className="sp-filter-label">Danh mục</label>
                    <div className="sp-filter-chips">
                      <button
                        className={`sp-fchip ${selectedCategory === 'all' ? 'sp-fchip--active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                      >Tất cả</button>
                      {categories.map(c => (
                        <button
                          key={c.id}
                          className={`sp-fchip ${String(selectedCategory) === String(c.id) ? 'sp-fchip--active' : ''}`}
                          onClick={() => setSelectedCategory(c.id)}
                        >{c.name}</button>
                      ))}
                    </div>
                  </div>

                  <div className="sp-filter-group">
                    <label className="sp-filter-label">Mức giá</label>
                    <div className="sp-filter-chips">
                      {[
                        { v: 'all', l: 'Tất cả' },
                        { v: 'low', l: 'Dưới 500k' },
                        { v: 'mid', l: '500k – 2tr' },
                        { v: 'high', l: 'Trên 2tr' },
                      ].map(({ v, l }) => (
                        <button
                          key={v}
                          className={`sp-fchip ${priceRange === v ? 'sp-fchip--active' : ''}`}
                          onClick={() => setPriceRange(v)}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  className="sp-filter-clear-btn"
                  onClick={() => { setSelectedCategory('all'); setPriceRange('all'); setSortBy('default'); }}
                >
                  <FaTimes /> Xóa bộ lọc
                </button>
              </div>
            </div>

            {loading ? (
              <div className="sp-service-grid">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="sp-empty-state">
                <FaSearch className="sp-empty-icon" />
                <h4>Không tìm thấy dịch vụ phù hợp</h4>
                <p>Hãy thử thay đổi từ khóa hoặc điều chỉnh bộ lọc.</p>
                <button
                  className="sp-btn-outline"
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setPriceRange('all'); }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="sp-service-grid">
                {pagedServices.map((svc, i) => (
                  <div key={svc.id} className="sp-service-card" style={{ animationDelay: `${(i % 6) * 0.07}s` }}>
                    <div className="sp-service-img-wrap">
                      <img
                        src={svc.image_url || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=60'}
                        alt={svc.name}
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=60'; }}
                      />
                      <div className="sp-service-img-overlay" />
                      <span className="sp-service-price-tag">{fmtPrice(svc.price)}</span>
                      {svc.code && <span className="sp-service-code-tag">{svc.code}</span>}
                    </div>

                    <div className="sp-service-body">
                      <div className="sp-service-category-label">
                        <FaTag /> {svc.category?.name || categories.find(c => String(c.id) === String(svc.category_id))?.name || 'Dịch vụ'}
                      </div>
                      <h4 className="sp-service-name">{svc.name}</h4>
                      <p className="sp-service-desc">
                        {(svc.short_description || svc.description || 'Dịch vụ y tế chuyên nghiệp, tận tâm với bệnh nhân.').slice(0, 95)}...
                      </p>

                      <div className="sp-service-meta">
                        {svc.duration && <span><FaRegClock /> {svc.duration} phút</span>}
                        <span><FaHeartbeat /> Chuyên nghiệp</span>
                      </div>

                      <div className="sp-service-actions">
                        <Link to={`/dich-vu/${svc.id}`} className="sp-btn-detail">
                          Chi tiết <FaAngleRight />
                        </Link>
                        <Link to={`/dat-lich-hen?service=${svc.id}`} className="sp-btn-book">
                          Đặt lịch
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
              <div className="sp-pagination">
                <button
                  className="sp-page-btn sp-page-btn--nav"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>

                {(() => {
                  const pages = [];
                  const delta = 2;
                  const left  = Math.max(1, currentPage - delta);
                  const right = Math.min(totalPages, currentPage + delta);

                  if (left > 1) {
                    pages.push(
                      <button key={1} className="sp-page-btn" onClick={() => setCurrentPage(1)}>1</button>
                    );
                    if (left > 2) pages.push(<span key="l-ellipsis" className="sp-page-ellipsis">…</span>);
                  }

                  for (let p = left; p <= right; p++) {
                    pages.push(
                      <button
                        key={p}
                        className={`sp-page-btn ${p === currentPage ? 'sp-page-btn--active' : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >{p}</button>
                    );
                  }

                  if (right < totalPages) {
                    if (right < totalPages - 1) pages.push(<span key="r-ellipsis" className="sp-page-ellipsis">…</span>);
                    pages.push(
                      <button key={totalPages} className="sp-page-btn" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                    );
                  }

                  return pages;
                })()}

                <button
                  className="sp-page-btn sp-page-btn--nav"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>

                <span className="sp-page-info">{currentPage} / {totalPages}</span>
              </div>
            )}
          </section>

          {/* ── Bác sĩ tiêu biểu (hospital tab) ── */}
          <section className="sp-section">
            <div className="sp-section-head">
              <div>
                <span className="sp-section-eyebrow"><FaUserMd /> Đội ngũ</span>
                <h2 className="sp-section-title">Bác Sĩ Tiêu Biểu</h2>
              </div>
              <Link to="/bac-si" className="sp-link-more">
                Xem tất cả <FaArrowRight />
              </Link>
            </div>

            {loadingDoctors ? (
              <div className="sp-doc-grid">
                {[...Array(6)].map((_, i) => <SkeletonDocCard key={i} />)}
              </div>
            ) : filteredFeatured.length === 0 ? (
              <div className="sp-empty-state">
                <FaUserMd className="sp-empty-icon" />
                <h4>Chưa có dữ liệu bác sĩ</h4>
                <p>Đội ngũ bác sĩ sẽ sớm được cập nhật.</p>
              </div>
            ) : (
              <>
                <div className="sp-doc-grid">
                  {pagedFeatured.map((doc, i) => (
                    <DoctorCard key={doc.id} doc={doc} type="hospital" index={i} />
                  ))}
                </div>

                {totalDoctorPages > 1 && (
                  <div className="sp-pagination">
                    <button
                      className="sp-page-btn sp-page-btn--nav"
                      onClick={() => setDoctorPage(p => Math.max(1, p - 1))}
                      disabled={doctorPage === 1}
                    >‹</button>

                    {(() => {
                      const pages = [];
                      const delta = 2;
                      const left  = Math.max(1, doctorPage - delta);
                      const right = Math.min(totalDoctorPages, doctorPage + delta);
                      if (left > 1) {
                        pages.push(<button key={1} className="sp-page-btn" onClick={() => setDoctorPage(1)}>1</button>);
                        if (left > 2) pages.push(<span key="l-ellipsis" className="sp-page-ellipsis">…</span>);
                      }
                      for (let p = left; p <= right; p++) {
                        pages.push(
                          <button
                            key={p}
                            className={`sp-page-btn ${p === doctorPage ? 'sp-page-btn--active' : ''}`}
                            onClick={() => setDoctorPage(p)}
                          >{p}</button>
                        );
                      }
                      if (right < totalDoctorPages) {
                        if (right < totalDoctorPages - 1) pages.push(<span key="r-ellipsis" className="sp-page-ellipsis">…</span>);
                        pages.push(<button key={totalDoctorPages} className="sp-page-btn" onClick={() => setDoctorPage(totalDoctorPages)}>{totalDoctorPages}</button>);
                      }
                      return pages;
                    })()}

                    <button
                      className="sp-page-btn sp-page-btn--nav"
                      onClick={() => setDoctorPage(p => Math.min(totalDoctorPages, p + 1))}
                      disabled={doctorPage === totalDoctorPages}
                    >›</button>

                    <span className="sp-page-info">{doctorPage} / {totalDoctorPages}</span>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Đánh giá nổi bật ── */}
          <ReviewsSection />

          {/* ── CTA Banner ── */}
          <section className="sp-cta-banner">
            <div className="sp-cta-inner">
              <div className="sp-cta-text">
                <h3>{s?.hospital_cta?.title || 'Cần hỗ trợ chọn dịch vụ?'}</h3>
                <p>{s?.hospital_cta?.subtitle || 'Đội ngũ tư vấn của chúng tôi sẵn sàng giúp bạn 24/7.'}</p>
              </div>
              <div className="sp-cta-actions">
                <a href={`tel:${(s?.hospital_cta?.phone || '19001234').replace(/\s/g, '')}`} className="sp-cta-btn sp-cta-btn--phone">
                  <FaPhoneAlt /> {s?.hospital_cta?.phone || '1900 1234'}
                </a>
                <button className="sp-cta-btn sp-cta-btn--chat" onClick={() => window.openChatbot?.()}>
                  <FaComments /> Chat ngay
                </button>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: CONSULTATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'consultation' && (
        <div className="sp-page-body sp-fade-up">

          {/* ── Quy trình 3 bước ── */}
          <section className="sp-section sp-section--center">
            <span className="sp-section-eyebrow"><FaCalendarCheck /> Quy trình</span>
            <h2 className="sp-section-title">Đặt Lịch Tư Vấn Chỉ 3 Bước</h2>
            <p className="sp-section-sub">Nhanh chóng — Tiện lợi — Bảo mật</p>

            <div className="sp-steps-row">
              {(servicesPageSettings?.consultation_steps || [
              { num: '01', icon: 'FaUserPlus',      label: 'Chọn Bác sĩ',     desc: 'Tìm bác sĩ phù hợp với chuyên khoa và nhu cầu của bạn.' },
              { num: '02', icon: 'FaCalendarCheck', label: 'Đặt Lịch hẹn',    desc: 'Chọn khung giờ trống, xác nhận thông tin và thanh toán.' },
              { num: '03', icon: 'FaVideo',          label: 'Bắt đầu Tư vấn', desc: 'Tham gia phòng tư vấn qua Video hoặc Chat đúng giờ hẹn.' },
            ]).map((step, i) => {
              const StepIcon = { FaUserPlus, FaCalendarCheck, FaVideo }[step.icon] || FaCalendarCheck;
              return (
                <React.Fragment key={step.num}>
                  <div className="sp-step-card">
                    <div className="sp-step-num">{step.num}</div>
                    <div className="sp-step-icon-wrap"><StepIcon /></div>
                    <h4 className="sp-step-label">{step.label}</h4>
                    <p className="sp-step-desc">{step.desc}</p>
                  </div>
                  {i < 2 && <div className="sp-step-arrow"><FaArrowRight /></div>}
                </React.Fragment>
              );
            })}
            </div>
          </section>

          {/* ── Gói tư vấn ── */}
          <section className="sp-section">
            <div className="sp-section-head">
              <div>
                <span className="sp-section-eyebrow"><FaLaptopMedical /> Gói dịch vụ</span>
                <h2 className="sp-section-title">Chọn Gói Tư Vấn</h2>
              </div>
              <div className="sp-type-toggle">
                {[
                  { v: 'all',   l: 'Tất cả' },
                  { v: 'chat',  l: <><FaComments /> Chat</> },
                  { v: 'video', l: <><FaVideo /> Video</> },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    className={`sp-type-btn ${activePackageType === v ? 'sp-type-btn--active' : ''}`}
                    onClick={() => { setActivePackageType(v); setPkgPage(1); }}
                  >{l}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="sp-service-grid">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="sp-empty-state">
                <FaLaptopMedical className="sp-empty-icon" />
                <h4>Chưa có gói tư vấn</h4>
                <p>Các gói dịch vụ sẽ sớm được cập nhật.</p>
              </div>
            ) : (
              <>
                <div className="sp-service-grid">
                  {pagedPackages.map((m, i) => {
                    const isFree = !m.price || m.price === 0;
                    const imgUrl = m.image_url
                      || (m.package_type === 'video'
                        ? 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=60'
                        : 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=400&q=60');
                    return (
                      <div key={m.id} className="sp-service-card" style={{ animationDelay: `${(i % 6) * 0.07}s` }}>
                        {/* Image */}
                        <div className="sp-service-img-wrap">
                          <img src={imgUrl} alt={m.name}
                            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=400&q=60'; }} />
                          <div className="sp-service-img-overlay" />
                          {/* Price tag */}
                          <span className="sp-service-price-tag" style={{ background: isFree ? 'linear-gradient(135deg,#22c55e,#16a34a)' : undefined }}>
                            {isFree ? 'Miễn phí' : `${parseInt(m.price).toLocaleString('vi-VN')}₫`}
                          </span>
                          {/* Type badge */}
                          <span className="sp-service-code-tag" style={{ background: m.package_type === 'video' ? '#ede9fe' : '#e0f7f7', color: m.package_type === 'video' ? '#6c63ff' : '#0d8f8e' }}>
                            {m.package_type === 'video' ? '📹 Video' : '💬 Chat'}
                          </span>
                        </div>

                        {/* Body */}
                        <div className="sp-service-body">
                          <div className="sp-service-category-label">
                            <FaLaptopMedical /> Tư vấn trực tuyến
                          </div>
                          <h4 className="sp-service-name">{m.name}</h4>
                          <p className="sp-service-desc">
                            {(m.description || m.subtitle || 'Tư vấn trực tuyến với bác sĩ chuyên khoa.').slice(0, 95)}...
                          </p>

                          <div className="sp-service-meta">
                            <span><FaRegClock /> {m.duration} phút</span>
                            {m.features?.length > 0 && (
                              <span><FaCheckCircle /> {m.features.length} tính năng</span>
                            )}
                          </div>

                          <div className="sp-service-actions">
                            <button
                              className="sp-btn-detail"
                              onClick={() => navigate(`/goi-tu-van/${m.id}`)}
                            >
                              Chi tiết <FaAngleRight />
                            </button>
                            <button
                              className="sp-btn-book"
                              onClick={() => {
                                if (!user) return navigate('/login', { state: { from: location.pathname + location.search } });
                                navigate('/dat-lich-tu-van', { state: { packageId: m.id, consultationType: m.package_type } });
                              }}
                            >
                              Đặt lịch
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination gói tư vấn */}
                {totalPkgPages > 1 && (
                  <div className="sp-pagination">
                    <button className="sp-page-btn sp-page-btn--nav"
                      onClick={() => setPkgPage(p => Math.max(1, p - 1))}
                      disabled={pkgPage === 1}>‹</button>
                    {[...Array(totalPkgPages)].map((_, idx) => {
                      const p = idx + 1;
                      return (
                        <button key={p}
                          className={`sp-page-btn ${p === pkgPage ? 'sp-page-btn--active' : ''}`}
                          onClick={() => setPkgPage(p)}>{p}</button>
                      );
                    })}
                    <button className="sp-page-btn sp-page-btn--nav"
                      onClick={() => setPkgPage(p => Math.min(totalPkgPages, p + 1))}
                      disabled={pkgPage === totalPkgPages}>›</button>
                    <span className="sp-page-info">{pkgPage} / {totalPkgPages}</span>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Bác sĩ tiêu biểu (consultation tab) ── */}
          <section className="sp-section">
            <div className="sp-section-head">
              <div>
                <span className="sp-section-eyebrow"><FaUserMd /> Đội ngũ</span>
                <h2 className="sp-section-title">Bác Sĩ Trực Tuyến</h2>
              </div>
              <Link to="/bac-si" className="sp-link-more">
                Xem tất cả <FaArrowRight />
              </Link>
            </div>

            {searchTerm && (
              <p className="sp-search-result-label">
                Kết quả: <strong>"{searchTerm}"</strong> — {filteredDoctors.length} bác sĩ
              </p>
            )}

            {loadingDoctors ? (
              <div className="sp-doc-grid">
                {[...Array(4)].map((_, i) => <SkeletonDocCard key={i} />)}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="sp-empty-state">
                <FaUserMd className="sp-empty-icon" />
                <h4>Chưa có bác sĩ trực tuyến</h4>
                <p>Đội ngũ bác sĩ sẽ sớm cập nhật.</p>
              </div>
            ) : (
              <>
                <div className="sp-doc-grid">
                  {pagedConDoctors.map((doc, i) => (
                    <DoctorCard key={doc.id || i} doc={doc} type="consultation" index={i} />
                  ))}
                </div>

                {totalConDoctorPages > 1 && (
                  <div className="sp-pagination">
                    <button className="sp-page-btn sp-page-btn--nav"
                      onClick={() => setConDoctorPage(p => Math.max(1, p - 1))}
                      disabled={conDoctorPage === 1}>‹</button>
                    {[...Array(totalConDoctorPages)].map((_, idx) => {
                      const p = idx + 1;
                      return (
                        <button key={p}
                          className={`sp-page-btn ${p === conDoctorPage ? 'sp-page-btn--active' : ''}`}
                          onClick={() => setConDoctorPage(p)}>{p}</button>
                      );
                    })}
                    <button className="sp-page-btn sp-page-btn--nav"
                      onClick={() => setConDoctorPage(p => Math.min(totalConDoctorPages, p + 1))}
                      disabled={conDoctorPage === totalConDoctorPages}>›</button>
                    <span className="sp-page-info">{conDoctorPage} / {totalConDoctorPages}</span>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Why Choose ── */}
          <section className="sp-why-section">
            <div className="sp-why-inner">
              <span className="sp-section-eyebrow sp-eyebrow--light"><FaShieldAlt /> Cam kết</span>
              <h2 className="sp-why-title">Tại Sao Chọn Chúng Tôi?</h2>
              <div className="sp-why-grid">
                {whyChooseSettings.map((w, i) => (
                  <div key={w.id} className="sp-why-card" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="sp-why-icon" style={{ color: w.color }}>{getIcon(w.icon)}</div>
                    <h4 className="sp-why-label">{w.title}</h4>
                    <p className="sp-why-desc">{w.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Đánh giá nổi bật ── */}
          <ReviewsSection />

          {/* ── CTA ── */}
          <section className="sp-cta-banner sp-cta-banner--consultation">
            <div className="sp-cta-inner">
              <div className="sp-cta-text">
                <h3>{s?.consultation_cta?.title || 'Sẵn sàng gặp bác sĩ ngay hôm nay?'}</h3>
                <p>{s?.consultation_cta?.subtitle || 'Đặt lịch chỉ mất 2 phút. Tư vấn bắt đầu trong 15 phút.'}</p>
              </div>
              <div className="sp-cta-actions">
                <button className="sp-cta-btn sp-cta-btn--primary" onClick={() => handleBooking('chat')}>
                  <FaComments /> Đặt lịch Chat
                </button>
                <button className="sp-cta-btn sp-cta-btn--video" onClick={() => handleBooking('video')}>
                  <FaVideo /> Đặt lịch Video
                </button>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
};

export default ServicesPage;
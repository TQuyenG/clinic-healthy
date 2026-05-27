/**
 * ServicesPage — REDESIGN
 * Aesthetic : "Premium Medical" — Trắng tinh / Teal sâu / Vàng ánh gold
 * Font      : Cormorant Garamond (display) + Plus Jakarta Sans (body)
 * Motion    : fade-up stagger, shimmer skeleton, tab slide, card float
 * Logic     : giữ nguyên 100% data flow từ bản gốc
 */

import React, { useState, useEffect, useRef } from 'react';
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
  FaAngleRight, FaMapMarkerAlt, FaPhoneAlt, FaRegClock
} from 'react-icons/fa';
import './ServicesPage.css';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
const fmtPrice = (n) =>
  n ? `${parseInt(n).toLocaleString('vi-VN')}₫` : 'Miễn phí';

const getIcon = (name) => {
  const map = {
    bolt: <FaBolt />, comments: <FaComments />, video: <FaVideo />,
    usermd: <FaUserMd />, shield: <FaShieldAlt />, wallet: <FaWallet />,
  };
  return map[name] || <FaCheckCircle />;
};

/* Skeleton card */
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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const ServicesPage = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const heroRef   = useRef(null);

  const initialTab = new URLSearchParams(location.search).get('tab') || 'hospital';

  /* ── State ── */
  const [activeTab,        setActiveTab]        = useState(initialTab);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [loading,          setLoading]          = useState(true);
  const [categories,       setCategories]       = useState([]);
  const [allServices,      setAllServices]      = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy,           setSortBy]           = useState('default');
  const [priceRange,       setPriceRange]       = useState('all');
  const [showFilters,      setShowFilters]      = useState(false);
  const [methodsSettings,  setMethodsSettings]  = useState([]);
  const [whyChooseSettings,setWhyChooseSettings]= useState([]);
  const [scrolled,         setScrolled]         = useState(false);

  /* ── Parallax hero on scroll ── */
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

  /* ── Default static settings ── */
  const setDefaultSettings = () => {
    setMethodsSettings([
      {
        id: 'quick-chat', name: 'Chat Nhanh AI', subtitle: 'Hỗ trợ sơ bộ tức thì',
        description: 'Dành cho các câu hỏi ngắn, tư vấn sơ bộ không cần đặt lịch.',
        icon: 'bolt', color: '#f39c12',
        price: 0, features: ['Không cần đặt lịch', 'Phản hồi ngay lập tức', 'AI hỗ trợ 24/7'],
      },
      {
        id: 'chat', name: 'Tư Vấn Chat', subtitle: 'Chi tiết & riêng tư',
        description: 'Trao đổi chuyên sâu về bệnh lý với bác sĩ chuyên khoa qua chat bảo mật.',
        icon: 'comments', color: '#0ea5a4',
        price: 100000, features: ['Chọn bác sĩ chuyên khoa', 'Gửi file đính kèm', 'Lưu lịch sử hội thoại'],
      },
      {
        id: 'video', name: 'Video Call 1:1', subtitle: 'Trực quan như tại viện',
        description: 'Gặp mặt bác sĩ qua video chất lượng cao, chẩn đoán chính xác hơn.',
        icon: 'video', color: '#6c63ff',
        price: 300000, features: ['Video HD sắc nét', 'Tương tác trực tiếp', 'Kê đơn điện tử'],
      },
    ]);
    setWhyChooseSettings([
      { id: 1, icon: 'usermd',   title: '500+ Bác Sĩ Giỏi',    desc: 'Đội ngũ chuyên gia đầu ngành từ các bệnh viện lớn.',          color: '#0ea5a4' },
      { id: 2, icon: 'bolt',     title: 'Kết Nối Tức Thì',      desc: 'Không xếp hàng, kết nối bác sĩ chỉ sau vài giây.',           color: '#f39c12' },
      { id: 3, icon: 'shield',   title: 'Bảo Mật Tuyệt Đối',   desc: 'Hồ sơ bệnh án được mã hóa chuẩn quốc tế.',                  color: '#3b82f6' },
      { id: 4, icon: 'wallet',   title: 'Chi Phí Hợp Lý',       desc: 'Tiết kiệm chi phí đi lại và thời gian chờ đợi.',             color: '#8b5cf6' },
    ]);
  };

  /* ── Fetch data ── */
  useEffect(() => {
    setDefaultSettings();
    const fetchData = async () => {
      try {
        setLoading(true);
        if (activeTab === 'hospital') {
          const [catRes, allRes] = await Promise.all([
            serviceCategoryService.getPublicServiceCategories(),
            api.get('/services', { params: { limit: 100 } }),
          ]);
          if (catRes.data.success)  setCategories(catRes.data.data || []);
          if (allRes.data.success)  setAllServices(allRes.data.data || []);
        } else {
          try {
            const pkgRes = await consultationService.getAllPublicPackages({ limit: 100 });
            const packages = pkgRes?.data?.data || pkgRes?.data || [];
            const pkgMethods = (Array.isArray(packages) ? packages : []).map(p => ({
              id: p.id,
              name: p.name || p.title || `Gói ${p.id}`,
              subtitle: p.short_description || '',
              description: p.description || '',
              icon: p.icon || 'comments',
              color: p.color || '#0ea5a4',
              price: p.price || 0,
              duration: p.duration_minutes || 30,
              features: p.features || [],
            }));
            if (pkgMethods.length) setMethodsSettings(pkgMethods);
          } catch {}
        }
      } catch {
        toast.error('Không thể tải dữ liệu dịch vụ.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  /* ── Tab change ── */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm(''); setSelectedCategory('all');
    setSortBy('default'); setShowFilters(false);
    navigate(`/dich-vu?tab=${tab}`, { replace: true });
  };

  /* ── Booking ── */
  const handleBooking = (type, doctorId = null) => {
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } });
    if (type === 'quick-chat') {
      window.openChatbot ? window.openChatbot() : toast.info('Chatbot đang cập nhật.');
      return;
    }
    navigate('/dat-lich-tu-van', { state: { doctorId, consultationType: type } });
  };

  /* ── Filtered services ── */
  const getFilteredServices = () => {
    let r = [...allServices];
    if (searchTerm) r = r.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCategory !== 'all') r = r.filter(s => s.category_id === parseInt(selectedCategory));
    if (priceRange === 'low')  r = r.filter(s => s.price < 500000);
    if (priceRange === 'mid')  r = r.filter(s => s.price >= 500000 && s.price < 2000000);
    if (priceRange === 'high') r = r.filter(s => s.price >= 2000000);
    if (sortBy === 'price-asc')  r.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') r.sort((a, b) => b.price - a.price);
    return r;
  };

  const getFilteredDoctors = () => {
    let r = [...availableDoctors];
    if (searchTerm) r = r.filter(d =>
      d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.Doctor?.Specialty?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return r;
  };

  const filteredServices = getFilteredServices();
  const filteredDoctors  = getFilteredDoctors();

  const bannerConfig = {
    hospital: {
      title: 'Dịch Vụ Y Tế Chuyên Sâu',
      subtitle: 'Trải nghiệm quy trình khám chữa bệnh hiện đại, tận tâm tại bệnh viện.',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000',
    },
    consultation: {
      title: 'Bác Sĩ Trực Tuyến 24/7',
      subtitle: 'Kết nối ngay với chuyên gia y tế qua Video / Chat — mọi lúc, mọi nơi.',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000',
    },
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="sp-root">

      {/* ════════ HERO BANNER ════════ */}
      <section
        className="sp-hero"
        ref={heroRef}
        style={{ backgroundImage: `url(${bannerConfig[activeTab].image})` }}
      >
        <div className="sp-hero-overlay" />

        {/* Floating badge */}
        <div className="sp-hero-badge">
          <FaAward /> Được chứng nhận ISO 9001
        </div>

        <div className="sp-hero-content">
          <p className="sp-hero-eyebrow">
            {activeTab === 'hospital' ? <><FaHospital /> Khám tại Bệnh viện</> : <><FaLaptopMedical /> Tư vấn trực tuyến</>}
          </p>
          <h1 className="sp-hero-title">{bannerConfig[activeTab].title}</h1>
          <p className="sp-hero-sub">{bannerConfig[activeTab].subtitle}</p>

          {/* Search bar */}
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

          {/* Quick stats */}
          <div className="sp-hero-stats">
            {[
              { num: '500+', lbl: 'Bác sĩ' },
              { num: '200+', lbl: 'Dịch vụ' },
              { num: '50k+', lbl: 'Bệnh nhân' },
              { num: '4.9★', lbl: 'Đánh giá' },
            ].map(s => (
              <div key={s.lbl} className="sp-hero-stat">
                <strong>{s.num}</strong>
                <span>{s.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ STICKY TABS ════════ */}
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
                {/* All chip */}
                <button
                  className={`sp-cat-card ${selectedCategory === 'all' ? 'sp-cat-card--active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  <div className="sp-cat-icon-wrap">
                    <FaLayerGroup />
                  </div>
                  <span className="sp-cat-name">Tất cả</span>
                  <span className="sp-cat-count">{allServices.length} dịch vụ</span>
                </button>

                {categories.map((cat, i) => {
                  const count = allServices.filter(s => s.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      className={`sp-cat-card ${String(selectedCategory) === String(cat.id) ? 'sp-cat-card--active' : ''}`}
                      onClick={() => { setSelectedCategory(cat.id); setShowFilters(true); }}
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <div className="sp-cat-icon-wrap">
                        <FaFileMedical />
                      </div>
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
            {/* Filter toolbar */}
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
                </h3>
              </div>
              <div className="sp-filter-toolbar-right">
                {/* Sort */}
                <div className="sp-select-wrap">
                  <FaSortAmountDown />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="default">Mặc định</option>
                    <option value="price-asc">Giá tăng dần</option>
                    <option value="price-desc">Giá giảm dần</option>
                  </select>
                </div>
                {/* Filter toggle */}
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

            {/* Filter panel */}
            <div className={`sp-filter-panel ${showFilters ? 'sp-filter-panel--open' : ''}`}>
              <div className="sp-filter-panel-inner">
                <div className="sp-filter-group">
                  <label className="sp-filter-label">Danh mục</label>
                  <div className="sp-filter-chips">
                    <button className={`sp-fchip ${selectedCategory === 'all' ? 'sp-fchip--active' : ''}`} onClick={() => setSelectedCategory('all')}>Tất cả</button>
                    {categories.map(c => (
                      <button key={c.id} className={`sp-fchip ${String(selectedCategory) === String(c.id) ? 'sp-fchip--active' : ''}`} onClick={() => setSelectedCategory(c.id)}>
                        {c.name}
                      </button>
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
                      <button key={v} className={`sp-fchip ${priceRange === v ? 'sp-fchip--active' : ''}`} onClick={() => setPriceRange(v)}>{l}</button>
                    ))}
                  </div>
                </div>

                <button className="sp-filter-clear-btn" onClick={() => { setSelectedCategory('all'); setPriceRange('all'); setSortBy('default'); }}>
                  <FaTimes /> Xóa bộ lọc
                </button>
              </div>
            </div>

            {/* Service grid */}
            {loading ? (
              <div className="sp-service-grid">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="sp-empty-state">
                <FaSearch className="sp-empty-icon" />
                <h4>Không tìm thấy dịch vụ phù hợp</h4>
                <p>Hãy thử thay đổi từ khóa hoặc điều chỉnh bộ lọc.</p>
                <button className="sp-btn-outline" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setPriceRange('all'); }}>
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="sp-service-grid">
                {filteredServices.map((svc, i) => (
                  <div
                    key={svc.id}
                    className="sp-service-card"
                    style={{ animationDelay: `${(i % 6) * 0.07}s` }}
                  >
                    {/* Image */}
                    <div className="sp-service-img-wrap">
                      <img
                        src={svc.image_url || `https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=60`}
                        alt={svc.name}
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=60'; }}
                      />
                      <div className="sp-service-img-overlay" />
                      <span className="sp-service-price-tag">{fmtPrice(svc.price)}</span>
                      {svc.code && <span className="sp-service-code-tag">{svc.code}</span>}
                    </div>

                    {/* Body */}
                    <div className="sp-service-body">
                      <div className="sp-service-category-label">
                        <FaTag /> {svc.category?.name || categories.find(c => c.id === svc.category_id)?.name || 'Dịch vụ'}
                      </div>
                      <h4 className="sp-service-name">{svc.name}</h4>
                      <p className="sp-service-desc">{svc.description?.slice(0, 90) || 'Dịch vụ y tế chuyên nghiệp, tận tâm với bệnh nhân.'}...</p>

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
          </section>

          {/* ── CTA Banner ── */}
          <section className="sp-cta-banner">
            <div className="sp-cta-inner">
              <div className="sp-cta-text">
                <h3>Cần hỗ trợ chọn dịch vụ?</h3>
                <p>Đội ngũ tư vấn của chúng tôi sẵn sàng giúp bạn 24/7.</p>
              </div>
              <div className="sp-cta-actions">
                <a href="tel:19001234" className="sp-cta-btn sp-cta-btn--phone">
                  <FaPhoneAlt /> 1900 1234
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
              {[
                { num: '01', Icon: FaUserPlus,     label: 'Chọn Bác sĩ',    desc: 'Tìm bác sĩ phù hợp với chuyên khoa và nhu cầu của bạn.' },
                { num: '02', Icon: FaCalendarCheck, label: 'Đặt Lịch hẹn',  desc: 'Chọn khung giờ trống, xác nhận thông tin và thanh toán.' },
                { num: '03', Icon: FaVideo,          label: 'Bắt đầu Tư vấn', desc: 'Tham gia phòng tư vấn qua Video hoặc Chat đúng giờ hẹn.' },
              ].map((s, i) => (
                <React.Fragment key={s.num}>
                  <div className="sp-step-card">
                    <div className="sp-step-num">{s.num}</div>
                    <div className="sp-step-icon-wrap">
                      <s.Icon />
                    </div>
                    <h4 className="sp-step-label">{s.label}</h4>
                    <p className="sp-step-desc">{s.desc}</p>
                  </div>
                  {i < 2 && <div className="sp-step-arrow"><FaArrowRight /></div>}
                </React.Fragment>
              ))}
            </div>
          </section>

          {/* ── Gói tư vấn ── */}
          <section className="sp-section">
            <div className="sp-section-head">
              <div>
                <span className="sp-section-eyebrow"><FaLaptopMedical /> Gói dịch vụ</span>
                <h2 className="sp-section-title">Chọn Gói Tư Vấn</h2>
              </div>
              {/* Type filter */}
              <div className="sp-type-toggle">
                <button className="sp-type-btn sp-type-btn--active"><FaComments /> Chat</button>
                <button className="sp-type-btn"><FaVideo /> Video</button>
              </div>
            </div>

            <div className="sp-methods-grid">
              {methodsSettings.map((m, i) => {
                const isFree = !m.price || m.price === 0;
                return (
                  <div
                    key={m.id}
                    className="sp-method-card"
                    style={{ '--m-color': m.color, animationDelay: `${i * 0.1}s` }}
                  >
                    {/* Top accent line */}
                    <div className="sp-method-accent" />

                    {/* Icon */}
                    <div className="sp-method-icon">
                      {getIcon(m.icon)}
                    </div>

                    <h3 className="sp-method-name">{m.name}</h3>
                    <p className="sp-method-subtitle">{m.subtitle}</p>
                    <p className="sp-method-desc">{m.description}</p>

                    {/* Price */}
                    <div className="sp-method-price">
                      {isFree
                        ? <><span className="sp-method-price-num">Miễn phí</span></>
                        : <><span className="sp-method-price-num">{parseInt(m.price).toLocaleString('vi-VN')}₫</span><span className="sp-method-price-per">/{m.duration || 30} phút</span></>
                      }
                    </div>

                    {/* Features */}
                    <ul className="sp-method-features">
                      {(m.features || []).map((f, fi) => (
                        <li key={fi}><FaCheckCircle /> {f}</li>
                      ))}
                    </ul>

                    <button
                      className="sp-method-cta"
                      onClick={() => {
                        if (typeof m.id === 'number' || /^\d+$/.test(String(m.id))) {
                          navigate('/dat-lich-tu-van', { state: { packageId: m.id } });
                        } else {
                          handleBooking(m.id);
                        }
                      }}
                    >
                      Chọn gói này <FaAngleRight />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Danh sách bác sĩ ── */}
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

            {searchTerm && (
              <p className="sp-search-result-label">
                Kết quả cho: <strong>"{searchTerm}"</strong> — {filteredDoctors.length} bác sĩ
              </p>
            )}

            {filteredDoctors.length === 0 ? (
              <div className="sp-empty-state">
                <FaUserMd className="sp-empty-icon" />
                <h4>Chưa có bác sĩ trực tuyến</h4>
                <p>Đội ngũ bác sĩ sẽ sớm cập nhật.</p>
              </div>
            ) : (
              <div className="sp-doc-grid">
                {filteredDoctors.map((doc, i) => (
                  <div key={doc.id} className="sp-doc-card" style={{ animationDelay: `${i * 0.08}s` }}>
                    {/* Avatar */}
                    <div className="sp-doc-avatar-wrap">
                      <img
                        className="sp-doc-avatar"
                        src={doc.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.full_name || 'BS')}&background=0ea5a4&color=fff&size=120`}
                        alt={doc.full_name}
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=BS&background=0ea5a4&color=fff&size=120`; }}
                      />
                      <span className="sp-doc-online-dot" title="Đang trực tuyến" />
                    </div>

                    {/* Info */}
                    <div className="sp-doc-info">
                      <h4 className="sp-doc-name">{doc.full_name}</h4>
                      <span className="sp-doc-spec">{doc.Doctor?.Specialty?.name || 'Đa khoa'}</span>
                      {doc.Doctor?.experience_years > 0 && (
                        <span className="sp-doc-exp"><FaClock /> {doc.Doctor.experience_years} năm KN</span>
                      )}
                      <div className="sp-doc-rating">
                        <FaStar />
                        <strong>{(doc.Doctor?.avg_rating || 5.0).toFixed(1)}</strong>
                        <span>({doc.Doctor?.total_reviews || 0} đánh giá)</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="sp-doc-actions">
                      <button className="sp-doc-btn sp-doc-btn--chat" onClick={() => handleBooking('chat', doc.id)}>
                        <FaComments /> Chat
                      </button>
                      <button className="sp-doc-btn sp-doc-btn--video" onClick={() => handleBooking('video', doc.id)}>
                        <FaVideo /> Video
                      </button>
                      <button className="sp-doc-btn sp-doc-btn--profile" onClick={() => navigate(`/bac-si/${doc.id}`)}>
                        Hồ sơ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                    <div className="sp-why-icon" style={{ color: w.color }}>
                      {getIcon(w.icon)}
                    </div>
                    <h4 className="sp-why-label">{w.title}</h4>
                    <p className="sp-why-desc">{w.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA Book now ── */}
          <section className="sp-cta-banner sp-cta-banner--consultation">
            <div className="sp-cta-inner">
              <div className="sp-cta-text">
                <h3>Sẵn sàng gặp bác sĩ ngay hôm nay?</h3>
                <p>Đặt lịch chỉ mất 2 phút. Tư vấn bắt đầu trong 15 phút.</p>
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

/* Missing import shim */
const FaLayerGroup = () => <svg viewBox="0 0 512 512" fill="currentColor" style={{width:'1em',height:'1em'}}><path d="M12.41 148.02l232.94 105.67c6.8 3.09 14.49 3.09 21.29 0l232.94-105.67c16.55-7.51 16.55-32.52 0-40.03L266.65 2.31a25.607 25.607 0 0 0-21.29 0L12.41 107.98c-16.55 7.51-16.55 32.53 0 40.04zm487.18 88.28l-58.09-26.33-161.64 73.27c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.51 209.97l-58.1 26.33c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.09 14.49 3.09 21.29 0L499.59 276.3c16.55-7.5 16.55-32.5 0-40zm0 127.8l-57.87-26.23-161.86 73.37c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.29 337.87 12.41 364.1c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.09 14.49 3.09 21.29 0L499.59 404.1c16.55-7.5 16.55-32.5 0-40z"/></svg>;

export default ServicesPage;
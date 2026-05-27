// client/src/pages/ContactPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import * as Icons from 'react-icons/fa';
import './ContactPage.css';

const ContactPage = () => {
  const [contactData, setContactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeBranch, setActiveBranch] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  // === HERO SLIDESHOW ===
  const [heroSlide, setHeroSlide] = useState(0);
  const heroTimerRef = useRef(null);

  // === TÌM BỆNH VIỆN GẦN NHẤT ===
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [nearbySearched, setNearbySearched] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const defaultData = {
    hero: {
      title: 'Liên hệ với chúng tôi',
      subtitle: 'Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn 24/7',
      background_image: '',
      banner_images: [],
      banner_color: '',
      banner_interval: 4000
    },
    info_cards: [
      { icon: 'FaPhone', title: 'Điện thoại', details: ['Hotline: 1900 1234'], color: '#10b981' },
      { icon: 'FaEnvelope', title: 'Email', details: ['contact@easymedify.vn'], color: '#3b82f6' },
      { icon: 'FaMapMarkerAlt', title: 'Địa chỉ', details: ['123 Nguyễn Huệ, Q.1, TP.HCM'], color: '#f59e0b' },
      { icon: 'FaClock', title: 'Giờ làm việc', details: ['T2-T7: 7:00-20:00'], color: '#8b5cf6' }
    ],
    branches: [],
    departments: [],
    faqs: [],
    map_embed: '',
    directions: [],
    social_links: {},
    ratings: { overall: 4.8, total_reviews: 0, breakdown: [] }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/settings/contact');
        setContactData({ ...defaultData, ...(res.data || {}) });
      } catch {
        setContactData(defaultData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // === SLIDESHOW AUTO PLAY ===
  const getBannerImages = useCallback(() => {
    const d = contactData || defaultData;
    const imgs = d.hero?.banner_images || [];
    if (imgs.length > 0) return imgs;
    if (d.hero?.background_image) return [d.hero.background_image];
    return [];
  }, [contactData]);

  useEffect(() => {
    const images = getBannerImages();
    if (images.length <= 1) return;
    const interval = contactData?.hero?.banner_interval || 4000;
    heroTimerRef.current = setInterval(() => {
      setHeroSlide(prev => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(heroTimerRef.current);
  }, [contactData, getBannerImages]);

  // === TÌM BỆNH VIỆN GẦN NHẤT (Nominatim OSM - miễn phí) ===
  const findNearbyHospitals = () => {
    setNearbyError('');
    setNearbyHospitals([]);
    setNearbySearched(false);
    setNearbyLoading(true);

    if (!navigator.geolocation) {
      setNearbyError('Trình duyệt không hỗ trợ định vị. Vui lòng cấp quyền vị trí.');
      setNearbyLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Overpass API (OSM) - hoàn toàn miễn phí, không cần key
          const overpassQuery = `
            [out:json][timeout:15];
            (
              node["amenity"="hospital"](around:5000,${latitude},${longitude});
              node["amenity"="clinic"](around:5000,${latitude},${longitude});
              way["amenity"="hospital"](around:5000,${latitude},${longitude});
            );
            out center 10;
          `;
          const res = await fetch(
            `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
          );
          const json = await res.json();
          const elements = json.elements || [];

          const hospitals = elements.map(el => {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            const tags = el.tags || {};
            const dist = getDistanceKm(latitude, longitude, lat, lon);
            return {
              id: el.id,
              name: tags['name'] || tags['name:vi'] || 'Bệnh viện / Phòng khám',
              address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
                .filter(Boolean).join(', ') || 'Không có địa chỉ',
              phone: tags['phone'] || tags['contact:phone'] || '',
              emergency: tags['emergency'] === 'yes' || tags['emergency_phone'] || tags['phone:emergency'] || '',
              website: tags['website'] || tags['contact:website'] || '',
              type: tags['amenity'] === 'hospital' ? 'Bệnh viện' : 'Phòng khám',
              lat,
              lon,
              distKm: dist.toFixed(1)
            };
          }).filter(h => h.lat && h.lon)
            .sort((a, b) => parseFloat(a.distKm) - parseFloat(b.distKm));

          setNearbyHospitals(hospitals.slice(0, 8));
          setNearbySearched(true);
        } catch {
          setNearbyError('Không thể tải dữ liệu bệnh viện. Vui lòng thử lại.');
        } finally {
          setNearbyLoading(false);
        }
      },
      (err) => {
        const msgs = {
          1: 'Bạn đã từ chối cấp quyền vị trí. Vui lòng cho phép trong cài đặt trình duyệt.',
          2: 'Không xác định được vị trí. Vui lòng thử lại.',
          3: 'Hết thời gian định vị. Vui lòng thử lại.'
        };
        setNearbyError(msgs[err.code] || 'Lỗi định vị không xác định.');
        setNearbyLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const openDirections = (hospital) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lon}&travelmode=driving`,
      '_blank'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormStatus({ type: '', message: '' });

    try {
      await api.post('/contact/send', formData);
      setFormStatus({ type: 'success', message: '✅ Tin nhắn đã được gửi thành công! Chúng tôi sẽ phản hồi sớm nhất.' });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setFormStatus({ type: '', message: '' }), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
      setFormStatus({ type: 'error', message: `❌ ${msg}` });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (score) => {
    return [1, 2, 3, 4, 5].map(i => (
      <Icons.FaStar
        key={i}
        className={i <= Math.round(score) ? 'contact-page-star-filled' : 'contact-page-star-empty'}
      />
    ));
  };

  const DynamicIcon = ({ name, ...props }) => {
    const IconComp = Icons[name] || Icons.FaPhone;
    return <IconComp {...props} />;
  };

  if (loading) {
    return (
      <div className="contact-page-loading">
        <div className="contact-page-loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  const data = contactData || defaultData;
  const branches = data.branches || [];
  const currentBranch = branches[activeBranch] || null;

  return (
    <div className="contact-page-root">

      {/* ===== HERO ===== */}
      <section className="contact-page-hero">
        {/* Slideshow nền */}
        {(() => {
          const images = getBannerImages();
          if (images.length > 0) {
            return images.map((img, i) => (
              <div
                key={i}
                className={`contact-page-hero-slide ${i === heroSlide ? 'active' : ''}`}
                style={{ backgroundImage: `url(${img})` }}
              />
            ));
          }
          // Nếu không có ảnh nhưng có banner_color → dùng màu
          if (data.hero?.banner_color) {
            return (
              <div
                className="contact-page-hero-slide active"
                style={{ background: data.hero.banner_color }}
              />
            );
          }
          return null;
        })()}

        {/* Dot indicators slideshow */}
        {getBannerImages().length > 1 && (
          <div className="contact-page-hero-dots">
            {getBannerImages().map((_, i) => (
              <button
                key={i}
                className={`contact-page-hero-dot ${i === heroSlide ? 'active' : ''}`}
                onClick={() => { clearInterval(heroTimerRef.current); setHeroSlide(i); }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="contact-page-hero-orb contact-page-hero-orb-1" />
        <div className="contact-page-hero-orb contact-page-hero-orb-2" />
        <div className="contact-page-hero-orb contact-page-hero-orb-3" />
        <div className="contact-page-hero-overlay" />
        <div className="contact-page-hero-content">
          <div className="contact-page-hero-badge">
            <Icons.FaHeadset /> Hỗ trợ 24/7
          </div>
          <h1>{data.hero?.title || 'Liên hệ với chúng tôi'}</h1>
          <p>{data.hero?.subtitle || ''}</p>
          <div className="contact-page-hero-actions">
            <button
              className="contact-page-hero-btn-primary"
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Icons.FaPaperPlane /> Gửi tin nhắn
            </button>
            <a
              href={`tel:${(data.info_cards?.[0]?.details?.[0] || '').replace(/[^0-9]/g, '')}`}
              className="contact-page-hero-btn-secondary"
            >
              <Icons.FaPhone /> Gọi ngay
            </a>
            <button
              className="contact-page-hero-btn-nearby"
              onClick={findNearbyHospitals}
            >
              <Icons.FaMapMarkerAlt /> Bệnh viện gần tôi
            </button>
          </div>
        </div>
        <div className="contact-page-hero-scroll">
          <div className="contact-page-hero-scroll-dot" />
        </div>
      </section>

      {/* ===== INFO CARDS ===== */}
      <section className="contact-page-info-section">
        <div className="contact-page-container">
          <div className="contact-page-info-grid">
            {(data.info_cards || []).map((card, i) => (
              <div
                key={i}
                className="contact-page-info-card contact-page-glass-card"
                style={{ '--card-accent': card.color || '#2d9b6f' }}
              >
                <div className="contact-page-info-icon" style={{ background: card.color }}>
                  <DynamicIcon name={card.icon} />
                </div>
                <h3>{card.title}</h3>
                <div className="contact-page-info-details">
                  {(card.details || []).map((d, j) => <p key={j}>{d}</p>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BỆNH VIỆN GẦN NHẤT ===== */}
      <section className="contact-page-nearby-section">
        <div className="contact-page-container">
          <div className="contact-page-section-header">
            <h2><Icons.FaHospital /> Tìm bệnh viện / phòng khám gần nhất</h2>
            <p>Sử dụng vị trí của bạn để tìm cơ sở y tế gần nhất kèm chỉ đường</p>
          </div>

          {!nearbySearched && !nearbyLoading && (
            <div className="contact-page-nearby-cta contact-page-glass-card">
              <div className="contact-page-nearby-cta-icon">
                <Icons.FaMapMarkerAlt />
              </div>
              <div className="contact-page-nearby-cta-text">
                <h3>Tìm cơ sở y tế gần bạn</h3>
                <p>Cho phép truy cập vị trí để xem danh sách bệnh viện & phòng khám trong bán kính 5km, kèm hotline khẩn cấp và chỉ đường.</p>
              </div>
              <button
                className="contact-page-nearby-btn"
                onClick={findNearbyHospitals}
              >
                <Icons.FaLocationArrow /> Xác định vị trí của tôi
              </button>
            </div>
          )}

          {nearbyLoading && (
            <div className="contact-page-nearby-loading contact-page-glass-card">
              <div className="contact-page-loading-spinner" />
              <p>Đang xác định vị trí và tìm kiếm...</p>
            </div>
          )}

          {nearbyError && (
            <div className="contact-page-nearby-error contact-page-glass-card">
              <Icons.FaExclamationCircle />
              <p>{nearbyError}</p>
              <button className="contact-page-nearby-btn" onClick={findNearbyHospitals}>
                <Icons.FaRedo /> Thử lại
              </button>
            </div>
          )}

          {nearbySearched && nearbyHospitals.length === 0 && !nearbyLoading && (
            <div className="contact-page-nearby-empty contact-page-glass-card">
              <Icons.FaSearch />
              <p>Không tìm thấy bệnh viện nào trong bán kính 5km. Hãy thử tìm kiếm ở bán kính rộng hơn.</p>
              <button className="contact-page-nearby-btn" onClick={findNearbyHospitals}>
                <Icons.FaRedo /> Tìm lại
              </button>
            </div>
          )}

          {nearbyHospitals.length > 0 && (
            <>
              <div className="contact-page-nearby-results-header">
                <span className="contact-page-nearby-count">
                  <Icons.FaCheckCircle /> Tìm thấy {nearbyHospitals.length} cơ sở y tế gần bạn
                </span>
                <button className="contact-page-nearby-refresh" onClick={findNearbyHospitals}>
                  <Icons.FaRedo /> Tìm lại
                </button>
              </div>
              <div className="contact-page-nearby-grid">
                {nearbyHospitals.map(h => (
                  <div
                    key={h.id}
                    className={`contact-page-nearby-card contact-page-glass-card ${selectedHospital?.id === h.id ? 'selected' : ''}`}
                    onClick={() => setSelectedHospital(h)}
                  >
                    <div className="contact-page-nearby-card-header">
                      <span className={`contact-page-nearby-type ${h.type === 'Bệnh viện' ? 'hospital' : 'clinic'}`}>
                        {h.type === 'Bệnh viện' ? <Icons.FaHospital /> : <Icons.FaClinicMedical />}
                        {h.type}
                      </span>
                      <span className="contact-page-nearby-dist">
                        <Icons.FaMapMarkerAlt /> {h.distKm} km
                      </span>
                    </div>
                    <h4 className="contact-page-nearby-name">{h.name}</h4>
                    <p className="contact-page-nearby-address">
                      <Icons.FaMapPin /> {h.address}
                    </p>
                    {h.phone && (
                      <a href={`tel:${h.phone}`} className="contact-page-nearby-phone" onClick={e => e.stopPropagation()}>
                        <Icons.FaPhone /> {h.phone}
                      </a>
                    )}
                    {h.emergency && (
                      <div className="contact-page-nearby-emergency">
                        <Icons.FaAmbulance /> Khẩn cấp: {h.emergency}
                      </div>
                    )}
                    <div className="contact-page-nearby-actions">
                      <button
                        className="contact-page-nearby-directions"
                        onClick={(e) => { e.stopPropagation(); openDirections(h); }}
                      >
                        <Icons.FaDirections /> Chỉ đường
                      </button>
                      {h.website && (
                      <a
                        href={h.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-page-nearby-website"
                        onClick={e => e.stopPropagation()}
                      >
                        <Icons.FaGlobe /> Website
                      </a>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===== RATINGS ===== */}
      {data.ratings && data.ratings.overall > 0 && (
        <section className="contact-page-ratings-section">
          <div className="contact-page-container">
            <div className="contact-page-ratings-wrapper contact-page-glass-card">
              <div className="contact-page-ratings-left">
                <div className="contact-page-ratings-score">{data.ratings.overall}</div>
                <div className="contact-page-ratings-stars">{renderStars(data.ratings.overall)}</div>
                <p>{data.ratings.total_reviews?.toLocaleString()} đánh giá</p>
              </div>
              <div className="contact-page-ratings-right">
                {(data.ratings.breakdown || []).map((item, i) => (
                  <div key={i} className="contact-page-rating-bar">
                    <span className="contact-page-rating-label">{item.label}</span>
                    <div className="contact-page-rating-track">
                      <div className="contact-page-rating-fill" style={{ width: `${(item.score / 5) * 100}%` }} />
                    </div>
                    <span className="contact-page-rating-val">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== BRANCHES + MAP ===== */}
      {branches.length > 0 && (
        <section className="contact-page-branches-section">
          <div className="contact-page-container">
            <div className="contact-page-section-header">
              <h2><Icons.FaMapMarkerAlt /> Cơ sở của chúng tôi</h2>
              <p>Chọn cơ sở gần bạn nhất</p>
            </div>
            <div className="contact-page-branches-layout">
              <div className="contact-page-branches-list">
                {branches.map((branch, i) => (
                  <div
                    key={i}
                    className={`contact-page-branch-card contact-page-glass-card ${activeBranch === i ? 'contact-page-branch-card-active' : ''}`}
                    onClick={() => setActiveBranch(i)}
                  >
                    {branch.is_main && (
                      <span className="contact-page-branch-badge">Cơ sở chính</span>
                    )}
                    <h4><Icons.FaHospital /> {branch.name}</h4>
                    <p><Icons.FaMapMarkerAlt /> {branch.address}</p>
                    <p><Icons.FaPhone /> {branch.phone}</p>
                    <p><Icons.FaClock /> {branch.hours}</p>
                  </div>
                ))}
              </div>
              <div className="contact-page-map-container contact-page-glass-card">
                {currentBranch?.map_embed ? (
                  <iframe
                    src={currentBranch.map_embed}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '360px' }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={currentBranch.name}
                  />
                ) : data.map_embed ? (
                  <iframe
                    src={data.map_embed}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '360px' }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Bản đồ"
                  />
                ) : (
                  <div className="contact-page-map-placeholder">
                    <Icons.FaMapMarkerAlt />
                    <p>Chưa có bản đồ</p>
                  </div>
                )}
                {data.directions?.length > 0 && (
                  <div className="contact-page-directions">
                    <h4><Icons.FaRoute /> Hướng dẫn đi lại</h4>
                    <ul>
                      {data.directions.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== MAP đơn lẻ nếu không có branches ===== */}
      {branches.length === 0 && data.map_embed && (
        <section className="contact-page-map-single-section">
          <div className="contact-page-container">
            <div className="contact-page-map-single contact-page-glass-card">
              <iframe
                src={data.map_embed}
                width="100%"
                height="420"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Bản đồ"
              />
              {data.directions?.length > 0 && (
                <div className="contact-page-directions">
                  <h4><Icons.FaRoute /> Hướng dẫn đi lại</h4>
                  <ul>{data.directions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== FORM + DEPARTMENTS ===== */}
      <section className="contact-page-contact-section" ref={formRef}>
        <div className="contact-page-container">
          <div className="contact-page-contact-grid">

            {/* FORM */}
            <div className="contact-page-form-wrapper contact-page-glass-card">
              <div className="contact-page-form-header">
                <Icons.FaPaperPlane className="contact-page-form-icon" />
                <div>
                  <h2>Gửi tin nhắn</h2>
                  <p>Chúng tôi sẽ phản hồi trong vòng 24 giờ</p>
                </div>
              </div>

              {formStatus.message && (
                <div className={`contact-page-form-alert contact-page-form-alert-${formStatus.type}`}>
                  {formStatus.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="contact-page-form">
                <div className="contact-page-form-group">
                  <label>Họ và tên <span className="contact-page-required">*</span></label>
                  <div className="contact-page-input-wrap">
                    <Icons.FaUser className="contact-page-input-icon" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                </div>

                <div className="contact-page-form-row">
                  <div className="contact-page-form-group">
                    <label>Email <span className="contact-page-required">*</span></label>
                    <div className="contact-page-input-wrap">
                      <Icons.FaEnvelope className="contact-page-input-icon" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        placeholder="example@email.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="contact-page-form-group">
                    <label>Số điện thoại</label>
                    <div className="contact-page-input-wrap">
                      <Icons.FaPhone className="contact-page-input-icon" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="0912 345 678"
                      />
                    </div>
                  </div>
                </div>

                <div className="contact-page-form-group">
                  <label>Chủ đề <span className="contact-page-required">*</span></label>
                  <div className="contact-page-input-wrap">
                    <Icons.FaTag className="contact-page-input-icon" />
                    <select
                      value={formData.subject}
                      onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                      required
                    >
                      <option value="">-- Chọn chủ đề --</option>
                      <option value="Đặt lịch khám">Đặt lịch khám</option>
                      <option value="Tư vấn dịch vụ">Tư vấn dịch vụ</option>
                      <option value="Phản ánh / Khiếu nại">Phản ánh / Khiếu nại</option>
                      <option value="Hỗ trợ kỹ thuật">Hỗ trợ kỹ thuật</option>
                      <option value="Hợp tác / Đối tác">Hợp tác / Đối tác</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="contact-page-form-group">
                  <label>Nội dung <span className="contact-page-required">*</span></label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder="Mô tả chi tiết vấn đề bạn cần hỗ trợ..."
                    required
                  />
                </div>

                <button type="submit" className="contact-page-submit-btn" disabled={submitting}>
                  {submitting
                    ? <><Icons.FaSpinner className="contact-page-spin" /> Đang gửi...</>
                    : <><Icons.FaPaperPlane /> Gửi tin nhắn</>
                  }
                </button>
              </form>
            </div>

            {/* DEPARTMENTS + SOCIAL */}
            <div className="contact-page-side-col">
              {data.departments?.length > 0 && (
                <div className="contact-page-dept-wrapper contact-page-glass-card">
                  <h3><Icons.FaHospital /> Liên hệ các khoa</h3>
                  <div className="contact-page-dept-list">
                    {data.departments.map((dept, i) => (
                      <div key={i} className="contact-page-dept-item">
                        <div className="contact-page-dept-info">
                          <Icons.FaStethoscope />
                          <span>{dept.name}</span>
                        </div>
                        <a href={`tel:${dept.phone}`} className="contact-page-dept-phone">
                          <Icons.FaPhone /> {dept.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.social_links && Object.values(data.social_links).some(v => v) && (
                <div className="contact-page-social-wrapper contact-page-glass-card">
                  <h3><Icons.FaShareAlt /> Kết nối với chúng tôi</h3>
                  <div className="contact-page-social-links">
                    {data.social_links.facebook && (
                      <a
                        href={data.social_links.facebook}
                        target="_blank" rel="noopener noreferrer"
                        className="contact-page-social-btn contact-page-social-fb"
                      >
                        <Icons.FaFacebook /> Facebook
                      </a>
                    )}
                    {data.social_links.instagram && (
                      <a
                        href={data.social_links.instagram}
                        target="_blank" rel="noopener noreferrer"
                        className="contact-page-social-btn contact-page-social-ig"
                      >
                        <Icons.FaInstagram /> Instagram
                      </a>
                    )}
                    {data.social_links.youtube && (
                      <a
                        href={data.social_links.youtube}
                        target="_blank" rel="noopener noreferrer"
                        className="contact-page-social-btn contact-page-social-yt"
                      >
                        <Icons.FaYoutube /> YouTube
                      </a>
                    )}
                    {data.social_links.zalo && (
                      <a
                        href={data.social_links.zalo}
                        target="_blank" rel="noopener noreferrer"
                        className="contact-page-social-btn contact-page-social-zalo"
                      >
                        <Icons.FaCommentDots /> Zalo
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      {data.faqs?.length > 0 && (
        <section className="contact-page-faq-section">
          <div className="contact-page-container">
            <div className="contact-page-section-header">
              <h2><Icons.FaQuestionCircle /> Câu hỏi thường gặp</h2>
              <p>Tìm câu trả lời nhanh cho các thắc mắc phổ biến</p>
            </div>
            <div className="contact-page-faq-list">
              {data.faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`contact-page-faq-item ${activeFaq === i ? 'contact-page-faq-item-active' : ''}`}
                >
                  <button
                    className="contact-page-faq-question"
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  >
                    <span>{faq.question}</span>
                    <Icons.FaChevronDown
                      className={`contact-page-faq-arrow ${activeFaq === i ? 'contact-page-faq-arrow-rotated' : ''}`}
                    />
                  </button>
                  <div className={`contact-page-faq-answer ${activeFaq === i ? 'contact-page-faq-answer-open' : ''}`}>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ContactPage;
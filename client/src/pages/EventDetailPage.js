// EventDetailPage.js — Redesigned v2
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeCanvas } from 'qrcode.react';
import {
  FaCalendarAlt, FaMapMarkerAlt, FaArrowLeft, FaEye, FaShareAlt,
  FaUsers, FaClock, FaTag, FaCheckCircle, FaTimesCircle,
  FaVideo, FaWifi, FaLayerGroup, FaChevronLeft, FaChevronRight,
  FaTicketAlt, FaGift, FaInfoCircle, FaExternalLinkAlt
} from 'react-icons/fa';
import { MdOutlineEventAvailable, MdOutlineEventBusy } from 'react-icons/md';
import './EventDetailPage.css';

/* ── Helpers ── */
const typeLabels  = { event: 'Sự kiện', promotion: 'Khuyến mãi', news: 'Tin tức', notification: 'Thông báo' };
const formatLabel = { offline: 'Offline', online: 'Online', hybrid: 'Hybrid' };
const categoryLabel = {
  workshop: 'Hội thảo', free_exam: 'Khám miễn phí', blood_donation: 'Hiến máu',
  livestream: 'Livestream', webinar: 'Webinar', vaccination: 'Tiêm chủng',
  promotion: 'Khuyến mãi', launch: 'Ra mắt', charity: 'Thiện nguyện',
  internal: 'Nội bộ', minigame: 'Mini-game', course: 'Khóa học'
};

function pad(n) { return String(n).padStart(2, '0'); }

/* ── Countdown hook ── */
function useCountdown(targetDate) {
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0, started: false, ended: false });
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setCd({ d: 0, h: 0, m: 0, s: 0, started: true, ended: false }); return; }
      setCd({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
        started: false, ended: false
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return cd;
}

/* ── Main Component ── */
const EventDetailPage = () => {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [event,          setEvent]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [selectedImg,    setSelectedImg]    = useState(null);
  const [galleryIdx,     setGalleryIdx]     = useState(0);
  const [lightbox,       setLightbox]       = useState(false);
  const [showRegModal,   setShowRegModal]   = useState(false);
  const [regForm,        setRegForm]        = useState({ guest_name: '', guest_email: '', guest_phone: '', attendee_count: 1 });
  const [regLoading,     setRegLoading]     = useState(false);
  const [regResult,      setRegResult]      = useState(null);
  const [relatedEvents,  setRelatedEvents]  = useState([]);
  const [activeSection,  setActiveSection]  = useState('info');

  const countdown = useCountdown(event?.start_date);
  const heroRef   = useRef(null);

  /* fetch */
  useEffect(() => { fetchEvent(); }, [slug]);

  const fetchEvent = async () => {
    try {
      const r = await api.get(`/marketing/events/${slug}`);
      if (r.data.success) {
        const ev = r.data.event;
        setEvent(ev);
        setSelectedImg(ev.banner_url || ev.thumbnail);
        fetchRelated(ev.event_type, ev.id);
      }
    } catch { setError('Không tìm thấy sự kiện hoặc sự kiện đã kết thúc.'); }
    finally  { setLoading(false); }
  };

  const fetchRelated = async (type, excludeId) => {
    try {
      const r = await api.get('/marketing/events', { params: { event_type: type, limit: 4, page: 1 } });
      if (r.data.success) setRelatedEvents(r.data.events.filter(e => e.id !== excludeId).slice(0, 3));
    } catch {}
  };

  /* share */
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép link!');
    }
  };

  /* register */
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    try {
      const res = await api.post('/marketing/events/register', { event_id: event.id, ...regForm });
      setRegResult(res.data);
    } catch (err) {
      setRegResult({ success: false, message: err.response?.data?.message || 'Đăng ký thất bại' });
    } finally { setRegLoading(false); }
  };

  /* gallery */
  const allImages = event
    ? [event.banner_url, event.thumbnail, ...(event.gallery || [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
    : [];

  const prevImg = () => {
    const idx = Math.max(0, galleryIdx - 1);
    setGalleryIdx(idx); setSelectedImg(allImages[idx]);
  };
  const nextImg = () => {
    const idx = Math.min(allImages.length - 1, galleryIdx + 1);
    setGalleryIdx(idx); setSelectedImg(allImages[idx]);
  };

  /* derived */
  if (loading) return (
    <div className="edp2-splash">
      <div className="edp2-splash__ring" />
      <p>Đang tải sự kiện...</p>
    </div>
  );
  if (error) return (
    <div className="edp2-error-page">
      <div className="edp2-error-page__icon">🗓️</div>
      <h2>{error}</h2>
      <Link to="/su-kien" className="edp2-btn edp2-btn--primary">Xem tất cả sự kiện</Link>
    </div>
  );
  if (!event) return null;

  const now         = new Date();
  const isEnded     = new Date(event.end_date) < now;
  const isOngoing   = new Date(event.start_date) <= now && !isEnded;
  const slotsLeft   = event.registration_limit ? event.registration_limit - (event.registration_count || 0) : null;
  const canRegister = !isEnded
    && (!event.registration_close_at || new Date(event.registration_close_at) > now)
    && (slotsLeft === null || slotsLeft > 0);
  const progress    = event.registration_limit
    ? Math.min(100, Math.round(((event.registration_count || 0) / event.registration_limit) * 100))
    : null;

  return (
    <div className="edp2-page">

      {/* ── BREADCRUMB ── */}
      <div className="edp2-breadcrumb">
        <div className="edp2-breadcrumb__inner">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/su-kien">Sự kiện</Link>
          <span>/</span>
          <span className="edp2-breadcrumb__current">{event.title}</span>
        </div>
      </div>

      {/* ── HERO IMAGE ── */}
      <div className="edp2-hero" ref={heroRef}>
        <img
          className="edp2-hero__img"
          src={selectedImg || '/images/event-placeholder.jpg'}
          alt={event.title}
          onError={e => (e.target.src = '/images/event-placeholder.jpg')}
          onClick={() => setLightbox(true)}
        />
        <div className="edp2-hero__overlay" />

        {/* Gallery nav arrows */}
        {allImages.length > 1 && (
          <>
            <button className="edp2-hero__arrow edp2-hero__arrow--left"  onClick={e => { e.stopPropagation(); prevImg(); }}><FaChevronLeft /></button>
            <button className="edp2-hero__arrow edp2-hero__arrow--right" onClick={e => { e.stopPropagation(); nextImg(); }}><FaChevronRight /></button>
            <div className="edp2-hero__dots">
              {allImages.map((_, i) => (
                <button key={i} className={`edp2-hero__dot ${i === galleryIdx ? 'edp2-hero__dot--active' : ''}`}
                  onClick={e => { e.stopPropagation(); setGalleryIdx(i); setSelectedImg(allImages[i]); }} />
              ))}
            </div>
          </>
        )}

        {/* Status pill */}
        <div className="edp2-hero__badges">
          <span className={`edp2-status-pill edp2-status-pill--${isEnded ? 'ended' : isOngoing ? 'ongoing' : 'upcoming'}`}>
            {isEnded ? <><MdOutlineEventBusy /> Đã kết thúc</> : isOngoing ? <><FaCheckCircle /> Đang diễn ra</> : <><MdOutlineEventAvailable /> Sắp diễn ra</>}
          </span>
          <span className={`edp2-type-pill edp2-type-pill--${event.event_type}`}>
            {typeLabels[event.event_type] || event.event_type}
          </span>
          {event.format && (
            <span className="edp2-format-pill">
              {event.format === 'online' ? <FaWifi /> : event.format === 'hybrid' ? <FaLayerGroup /> : <FaMapMarkerAlt />}
              {formatLabel[event.format]}
            </span>
          )}
        </div>

        <button className="edp2-btn-share-hero" onClick={handleShare}><FaShareAlt /> Chia sẻ</button>
      </div>

      {/* ── THUMBNAIL STRIP ── */}
      {allImages.length > 1 && (
        <div className="edp2-thumbstrip">
          <div className="edp2-thumbstrip__inner">
            {allImages.map((img, i) => (
              <button key={i} className={`edp2-thumbstrip__item ${i === galleryIdx ? 'edp2-thumbstrip__item--active' : ''}`}
                onClick={() => { setGalleryIdx(i); setSelectedImg(img); }}>
                <img src={img} alt={`thumb-${i}`} onError={e => (e.target.parentElement.style.display = 'none')} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="edp2-layout">

        {/* ── LEFT: CONTENT ── */}
        <div className="edp2-main">

          {/* Back */}
          <button className="edp2-btn-back" onClick={() => navigate('/su-kien')}>
            <FaArrowLeft /> Quay lại danh sách
          </button>

          {/* Title block */}
          <div className="edp2-title-block">
            <h1 className="edp2-title">{event.title}</h1>
            <div className="edp2-meta-row">
              <span className="edp2-meta-chip">
                <FaCalendarAlt />
                {new Date(event.start_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                {' → '}
                {new Date(event.end_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              {event.location && (
                <span className="edp2-meta-chip">
                  <FaMapMarkerAlt /> {event.location}
                </span>
              )}
              <span className="edp2-meta-chip edp2-meta-chip--view">
                <FaEye /> {(event.views || 0).toLocaleString()} lượt xem
              </span>
              {event.event_category && (
                <span className="edp2-meta-chip edp2-meta-chip--cat">
                  <FaTag /> {categoryLabel[event.event_category] || event.event_category}
                </span>
              )}
            </div>
            {event.tags?.length > 0 && (
              <div className="edp2-tags">
                {event.tags.map((tag, i) => <span key={i} className="edp2-tag">#{tag}</span>)}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="edp2-tabs">
            {[['info', 'ℹ️ Thông tin'], ['detail', '📄 Chi tiết'], ['online', '🎥 Tham gia']].map(([key, label]) => {
              if (key === 'online' && event.format === 'offline') return null;
              return (
                <button key={key} className={`edp2-tab ${activeSection === key ? 'edp2-tab--active' : ''}`}
                  onClick={() => setActiveSection(key)}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tab: Thông tin */}
          {activeSection === 'info' && (
            <div className="edp2-section">
              {event.description && (
                <div className="edp2-desc-card">
                  <div className="edp2-desc-card__icon"><FaInfoCircle /></div>
                  <div>
                    <div className="edp2-desc-card__label">Mô tả ngắn</div>
                    <p className="edp2-desc-card__text">{event.description}</p>
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="edp2-info-grid">
                <div className="edp2-info-item">
                  <FaClock className="edp2-info-item__icon" />
                  <div>
                    <div className="edp2-info-item__label">Thời gian bắt đầu</div>
                    <div className="edp2-info-item__value">{new Date(event.start_date).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
                <div className="edp2-info-item">
                  <FaClock className="edp2-info-item__icon edp2-info-item__icon--red" />
                  <div>
                    <div className="edp2-info-item__label">Thời gian kết thúc</div>
                    <div className="edp2-info-item__value">{new Date(event.end_date).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
                {event.location && (
                  <div className="edp2-info-item">
                    <FaMapMarkerAlt className="edp2-info-item__icon edp2-info-item__icon--orange" />
                    <div>
                      <div className="edp2-info-item__label">Địa điểm</div>
                      <div className="edp2-info-item__value">{event.location}</div>
                    </div>
                  </div>
                )}
                {event.format && (
                  <div className="edp2-info-item">
                    <FaLayerGroup className="edp2-info-item__icon edp2-info-item__icon--blue" />
                    <div>
                      <div className="edp2-info-item__label">Hình thức</div>
                      <div className="edp2-info-item__value">{formatLabel[event.format]}</div>
                    </div>
                  </div>
                )}
                {event.registration_limit && (
                  <div className="edp2-info-item">
                    <FaUsers className="edp2-info-item__icon edp2-info-item__icon--purple" />
                    <div>
                      <div className="edp2-info-item__label">Số chỗ</div>
                      <div className="edp2-info-item__value">{event.registration_count || 0} / {event.registration_limit} người</div>
                    </div>
                  </div>
                )}
                {event.is_fee_required && (
                  <div className="edp2-info-item">
                    <FaTag className="edp2-info-item__icon edp2-info-item__icon--gold" />
                    <div>
                      <div className="edp2-info-item__label">Phí tham gia</div>
                      <div className="edp2-info-item__value edp2-info-item__value--fee">
                        {event.fee_amount > 0
                          ? Number(event.fee_amount).toLocaleString('vi-VN') + ' ₫'
                          : 'Miễn phí'}
                      </div>
                    </div>
                  </div>
                )}
                {event.gift_config?.has_gift && (
                  <div className="edp2-info-item">
                    <FaGift className="edp2-info-item__icon edp2-info-item__icon--pink" />
                    <div>
                      <div className="edp2-info-item__label">Quà tặng</div>
                      <div className="edp2-info-item__value">Có quà khi Check-in 🎁</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Slot progress */}
              {progress !== null && (
                <div className="edp2-progress-block">
                  <div className="edp2-progress-block__header">
                    <span>Đã đăng ký</span>
                    <span className="edp2-progress-block__count">{event.registration_count || 0} / {event.registration_limit}</span>
                  </div>
                  <div className="edp2-progress-bar">
                    <div className="edp2-progress-bar__fill" style={{ width: `${progress}%`,
                      background: progress >= 90 ? '#ef4444' : progress >= 70 ? '#f59e0b' : '#16a34a' }} />
                  </div>
                  <div className="edp2-progress-block__footer">
                    {slotsLeft <= 0
                      ? <span className="edp2-text--red">🔴 Hết chỗ</span>
                      : slotsLeft <= 10
                        ? <span className="edp2-text--amber">⚠️ Còn {slotsLeft} chỗ — Đăng ký sớm!</span>
                        : <span className="edp2-text--green">🟢 Còn {slotsLeft} chỗ trống</span>}
                  </div>
                </div>
              )}

              {/* Registration deadline */}
              {event.registration_close_at && (
                <div className="edp2-deadline-banner">
                  <FaClock />
                  <span>Hạn đăng ký: <strong>{new Date(event.registration_close_at).toLocaleString('vi-VN')}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Tab: Chi tiết */}
          {activeSection === 'detail' && (
            <div className="edp2-section">
              <div
                className="edp2-html-content"
                dangerouslySetInnerHTML={{ __html: event.content || `<p>${event.description || 'Chưa có nội dung chi tiết.'}</p>` }}
              />
            </div>
          )}

          {/* Tab: Tham gia Online */}
          {activeSection === 'online' && event.format !== 'offline' && (
            <div className="edp2-section">
              {event.online_config?.link ? (
                <div className="edp2-online-card">
                  <div className="edp2-online-card__header">
                    <FaVideo /> Thông tin tham gia {event.format === 'online' ? 'Online' : 'Hybrid'}
                  </div>
                  <a href={event.online_config.link} target="_blank" rel="noreferrer" className="edp2-btn edp2-btn--primary edp2-btn--lg">
                    <FaExternalLinkAlt /> Tham gia ngay
                  </a>
                  {event.online_config.password && (
                    <div className="edp2-online-card__pass">
                      🔑 Mật khẩu: <code>{event.online_config.password}</code>
                    </div>
                  )}
                  {event.online_config.platform && (
                    <div className="edp2-online-card__platform">Nền tảng: <strong>{event.online_config.platform}</strong></div>
                  )}
                </div>
              ) : (
                <div className="edp2-empty-tab">Link tham gia sẽ được cập nhật trước khi sự kiện diễn ra.</div>
              )}
            </div>
          )}

          {/* Related */}
          {relatedEvents.length > 0 && (
            <div className="edp2-related">
              <h3 className="edp2-related__title">Sự kiện liên quan</h3>
              <div className="edp2-related__grid">
                {relatedEvents.map(ev => (
                  <Link key={ev.id} to={`/su-kien/${ev.slug || ev.id}`} className="edp2-related-card">
                    <div className="edp2-related-card__img-wrap">
                      <img src={ev.thumbnail || ev.banner_url || '/images/event-placeholder.jpg'} alt={ev.title}
                        onError={e => (e.target.src = '/images/event-placeholder.jpg')} />
                    </div>
                    <div className="edp2-related-card__body">
                      <span className={`edp2-type-pill edp2-type-pill--${ev.event_type} edp2-type-pill--sm`}>
                        {typeLabels[ev.event_type]}
                      </span>
                      <p className="edp2-related-card__title">{ev.title}</p>
                      <span className="edp2-related-card__date">
                        <FaCalendarAlt /> {new Date(ev.start_date).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: STICKY SIDEBAR ── */}
        <aside className="edp2-sidebar">

          {/* Countdown */}
          {!isEnded && !countdown.started && (
            <div className="edp2-sidebar-card edp2-countdown-card">
              <div className="edp2-countdown-card__label">
                {isOngoing ? '🔴 Đang diễn ra' : '⏳ Bắt đầu sau'}
              </div>
              {!isOngoing && (
                <div className="edp2-countdown">
                  {[['Ngày', countdown.d], ['Giờ', countdown.h], ['Phút', countdown.m], ['Giây', countdown.s]].map(([u, v]) => (
                    <div key={u} className="edp2-countdown__unit">
                      <span className="edp2-countdown__num">{pad(v)}</span>
                      <span className="edp2-countdown__label">{u}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Register CTA */}
          <div className="edp2-sidebar-card edp2-reg-card">
            {isEnded ? (
              <div className="edp2-reg-card__ended">
                <FaTimesCircle /> Sự kiện đã kết thúc
              </div>
            ) : canRegister ? (
              <>
                {slotsLeft !== null && slotsLeft <= 20 && slotsLeft > 0 && (
                  <div className="edp2-reg-card__urgency">🔥 Chỉ còn {slotsLeft} chỗ!</div>
                )}
                <button className="edp2-btn edp2-btn--primary edp2-btn--lg edp2-btn--full"
                  onClick={() => setShowRegModal(true)}>
                  <FaTicketAlt /> Đăng ký tham gia
                </button>
                {event.is_fee_required && (
                  <div className="edp2-reg-card__fee">
                    {event.fee_amount > 0
                      ? `Phí: ${Number(event.fee_amount).toLocaleString('vi-VN')} ₫`
                      : '✅ Miễn phí tham gia'}
                  </div>
                )}
              </>
            ) : (
              <div className="edp2-reg-card__full"><FaTimesCircle /> Đã hết chỗ đăng ký</div>
            )}

            {!user && canRegister && (
              <p className="edp2-reg-card__hint">Bạn có thể đăng ký không cần tài khoản.</p>
            )}
          </div>

          {/* Quick info */}
          <div className="edp2-sidebar-card edp2-quick-info">
            <h4 className="edp2-quick-info__title">Thông tin nhanh</h4>
            <ul className="edp2-quick-info__list">
              <li><FaCalendarAlt className="qi-icon" /><div><span>Bắt đầu</span><strong>{new Date(event.start_date).toLocaleDateString('vi-VN')}</strong></div></li>
              <li><FaClock        className="qi-icon" /><div><span>Kết thúc</span><strong>{new Date(event.end_date).toLocaleDateString('vi-VN')}</strong></div></li>
              {event.location && <li><FaMapMarkerAlt className="qi-icon qi-icon--red" /><div><span>Địa điểm</span><strong>{event.location}</strong></div></li>}
              <li><FaLayerGroup   className="qi-icon qi-icon--blue" /><div><span>Hình thức</span><strong>{formatLabel[event.format] || '—'}</strong></div></li>
              {event.registration_limit && (
                <li><FaUsers className="qi-icon qi-icon--purple" /><div><span>Sức chứa</span><strong>{event.registration_limit} người</strong></div></li>
              )}
              {event.event_category && (
                <li><FaTag className="qi-icon qi-icon--gold" /><div><span>Danh mục</span><strong>{categoryLabel[event.event_category] || event.event_category}</strong></div></li>
              )}
            </ul>
          </div>

          {/* Share */}
          <div className="edp2-sidebar-card">
            <button className="edp2-btn edp2-btn--outline edp2-btn--full" onClick={handleShare}>
              <FaShareAlt /> Chia sẻ sự kiện
            </button>
          </div>
        </aside>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div className="edp2-lightbox" onClick={() => setLightbox(false)}>
          <button className="edp2-lightbox__close" onClick={() => setLightbox(false)}>✕</button>
          <img src={selectedImg} alt="lightbox" onClick={e => e.stopPropagation()} />
          {allImages.length > 1 && (
            <>
              <button className="edp2-lightbox__prev" onClick={e => { e.stopPropagation(); prevImg(); }}><FaChevronLeft /></button>
              <button className="edp2-lightbox__next" onClick={e => { e.stopPropagation(); nextImg(); }}><FaChevronRight /></button>
            </>
          )}
        </div>
      )}

      {/* ── REGISTER MODAL ── */}
      {showRegModal && (
        <div className="edp2-modal-overlay" onClick={() => { setShowRegModal(false); setRegResult(null); }}>
          <div className="edp2-modal" onClick={e => e.stopPropagation()}>
            <button className="edp2-modal__close" onClick={() => { setShowRegModal(false); setRegResult(null); }}>✕</button>
            <h3 className="edp2-modal__title">Đăng ký tham gia</h3>
            <p className="edp2-modal__sub">{event.title}</p>

            {regResult ? (
              <div className="edp2-reg-result">
                <div className="edp2-reg-result__icon">{regResult.success ? '✅' : '❌'}</div>
                <p className={`edp2-reg-result__msg ${regResult.success ? 'edp2-reg-result__msg--success' : 'edp2-reg-result__msg--fail'}`}>
                  {regResult.message}
                </p>
                {regResult.success && regResult.qr_code && (
                  <div className="edp2-ticket-box">
                    <div className="edp2-ticket-box__label">🎫 VÉ ĐIỆN TỬ CỦA BẠN</div>
                    <div className="edp2-ticket-box__qr">
                      <QRCodeCanvas value={regResult.qr_code} size={160} level="H" />
                    </div>
                    <code className="edp2-ticket-box__code">{regResult.qr_code}</code>
                    <p className="edp2-ticket-box__hint">Đưa mã này cho Lễ tân khi đến tham gia sự kiện.</p>
                  </div>
                )}
                <div className="edp2-reg-result__actions">
                  <button className="edp2-btn edp2-btn--ghost" onClick={() => { setShowRegModal(false); setRegResult(null); }}>Đóng</button>
                  {regResult.success && (
                    <button className="edp2-btn edp2-btn--primary" onClick={() => navigate('/su-kien?tab=my-tickets')}>
                      🎫 Xem vé của tôi
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="edp2-reg-form">
                {[
                  { label: 'Họ và tên *',  key: 'guest_name',  type: 'text',  placeholder: 'Nguyễn Văn A',       required: true },
                  { label: 'Email *',       key: 'guest_email', type: 'email', placeholder: 'email@example.com',  required: true },
                  { label: 'Số điện thoại', key: 'guest_phone', type: 'tel',   placeholder: '0901234567',         required: false },
                ].map(({ label, key, type, placeholder, required }) => (
                  <div key={key} className="edp2-field">
                    <label className="edp2-field__label">{label}</label>
                    <input className="edp2-field__input" type={type} placeholder={placeholder} required={required}
                      value={regForm[key]} onChange={e => setRegForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="edp2-field">
                  <label className="edp2-field__label">Số người đi cùng</label>
                  <input className="edp2-field__input" type="number" min="1" max="10"
                    value={regForm.attendee_count}
                    onChange={e => setRegForm(p => ({ ...p, attendee_count: parseInt(e.target.value) || 1 }))} />
                </div>
                <div className="edp2-reg-form__actions">
                  <button type="button" className="edp2-btn edp2-btn--ghost" onClick={() => setShowRegModal(false)}>Hủy</button>
                  <button type="submit" disabled={regLoading} className="edp2-btn edp2-btn--primary">
                    {regLoading ? 'Đang xử lý...' : 'Xác nhận đăng ký'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;
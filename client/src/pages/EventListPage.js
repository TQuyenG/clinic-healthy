// EventListPage.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaTh, FaList, FaEye, FaMouse, FaTicketAlt, FaQrcode } from 'react-icons/fa';
import { QRCodeCanvas } from 'qrcode.react';
import './EventListPage.css';

const typeLabels = {
  event: 'Sự kiện',
  promotion: 'Khuyến mãi',
  news: 'Tin tức',
  notification: 'Thông báo'
};

const EventListPage = () => {
  const location = useLocation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('all');
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null); // Lưu vé đang hiển thị QR

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    event_type: 'all',
    status: '',
    sort_by: 'start_date',
    order: 'DESC',
    format: '',
    event_category: ''
  });
  const [viewMode, setViewMode] = useState('grid');
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, total_pages: 0 });

  // Tự động nhận diện nếu URL là ?tab=my-tickets
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'my-tickets' && user) {
      setActiveTab('my-tickets');
    }
  }, [location, user]);

  useEffect(() => { 
    if (activeTab === 'all') {
      fetchEvents(); 
    } else if (activeTab === 'my-tickets' && user) {
      fetchMyTickets();
    }
  }, [searchTerm, filters, pagination.page, activeTab]);

  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await api.get('/marketing/events/my-registrations');
      if (response.data.success) {
        setMyTickets(response.data.registrations);
      }
    } catch (error) {
      console.error('Lỗi tải vé:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/marketing/events', {
        params: { search: searchTerm, page: pagination.page, limit: pagination.limit, ...filters }
      });
      if (response.data.success) {
        setEvents(response.data.events);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          total_pages: response.data.total_pages
        }));
      }
    } catch (error) {
      console.error('Lỗi tải sự kiện:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    if (now < start) return { text: 'Sắp diễn ra', cls: 'upcoming' };
    if (now > end) return { text: 'Đã kết thúc', cls: 'ended' };
    return { text: 'Đang diễn ra', cls: 'ongoing' };
  };

  const renderPagination = () => {
    if (pagination.total_pages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= pagination.total_pages; i++) {
      const show = i === 1 || i === pagination.total_pages ||
        (i >= pagination.page - 1 && i <= pagination.page + 1);
      const ellipsis = i === pagination.page - 2 || i === pagination.page + 2;
      if (show) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`elp-pagination__num ${pagination.page === i ? 'elp-pagination__num--active' : ''}`}
          >{i}</button>
        );
      } else if (ellipsis) {
        pages.push(<span key={i} className="elp-pagination__ellipsis">…</span>);
      }
    }
    return (
      <div className="elp-pagination">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="elp-pagination__btn"
        >← Trước</button>
        <div className="elp-pagination__numbers">{pages}</div>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.total_pages}
          className="elp-pagination__btn"
        >Sau →</button>
      </div>
    );
  };

  return (
    <div className="elp-page">
      {/* Hero Header */}
      <div className="elp-hero">
        <div className="elp-hero__inner">
          <h1 className="elp-hero__title">Tin tức & Sự kiện</h1>
          <p className="elp-hero__sub">Cập nhật những thông tin y tế và chương trình ưu đãi mới nhất</p>
        </div>
      </div>

      <div className="elp-container">
        
        {/* === TABS NAVIGATION === */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
          <button 
            onClick={() => setActiveTab('all')}
            style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '1.05rem', fontWeight: 700, color: activeTab === 'all' ? '#16a34a' : '#6b7280', borderBottom: activeTab === 'all' ? '3px solid #16a34a' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🌟 Khám phá sự kiện
          </button>
          {user && (
            <button 
              onClick={() => setActiveTab('my-tickets')}
              style={{ background: 'none', border: 'none', padding: '12px 16px', fontSize: '1.05rem', fontWeight: 700, color: activeTab === 'my-tickets' ? '#16a34a' : '#6b7280', borderBottom: activeTab === 'my-tickets' ? '3px solid #16a34a' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaTicketAlt /> Vé của tôi
            </button>
          )}
        </div>

        {/* === TAB 1: KHÁM PHÁ SỰ KIỆN === */}
        {activeTab === 'all' && (
          <>
            <div className="elp-controls">
          <form onSubmit={handleSearch} className="elp-search">
            <input
              className="elp-search__input"
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="elp-search__btn"><FaSearch /></button>
          </form>

          <div className="elp-filters">
            <select
              className="elp-filter-select"
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            >
              <option value="start_date">Ngày diễn ra</option>
              <option value="created_at">Ngày tạo</option>
              <option value="views">Lượt xem</option>
              <option value="clicks">Lượt nhấp</option>
            </select>

            <select
              className="elp-filter-select"
              value={filters.format || ''}
              onChange={(e) => handleFilterChange('format', e.target.value)}
            >
              <option value="">Tất cả hình thức</option>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>

            <select
              className="elp-filter-select"
              value={filters.event_category || ''}
              onChange={(e) => handleFilterChange('event_category', e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              <option value="workshop">Hội thảo</option>
              <option value="free_exam">Khám miễn phí</option>
              <option value="blood_donation">Hiến máu</option>
              <option value="livestream">Livestream</option>
              <option value="vaccination">Tiêm chủng</option>
              <option value="promotion">Khuyến mãi</option>
              <option value="charity">Thiện nguyện</option>
            </select>

            <select
              className="elp-filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="ended">Đã kết thúc</option>
            </select>

            <select
              className="elp-filter-select"
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            >
              <option value="start_date">Ngày diễn ra</option>
              <option value="created_at">Ngày tạo</option>
              <option value="views">Lượt xem</option>
              <option value="clicks">Lượt nhấp</option>
            </select>

            <div className="elp-view-toggle">
              <button
                className={`elp-view-toggle__btn ${viewMode === 'grid' ? 'elp-view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Dạng lưới"
              ><FaTh /></button>
              <button
                className={`elp-view-toggle__btn ${viewMode === 'list' ? 'elp-view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
              ><FaList /></button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="elp-loading-wrap">
            <div className="elp-spinner" />
            <p className="elp-loading-wrap__text">Đang tải sự kiện...</p>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className={`elp-${viewMode}`}>
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div key={event.id} className={`elp-card elp-card--${viewMode}`}>
                    <div className="elp-card__image-wrap">
                      <img
                        className="elp-card__img"
                        src={event.thumbnail || event.banner_url || '/images/event-placeholder.jpg'}
                        alt={event.title}
                        onError={(e) => (e.target.src = '/images/event-placeholder.jpg')}
                      />
                      <div className="elp-card__date-badge">
                        <span className="elp-card__date-badge__day">
                          {new Date(event.start_date).getDate()}
                        </span>
                        <span className="elp-card__date-badge__month">
                          Th{new Date(event.start_date).getMonth() + 1}
                        </span>
                      </div>
                      <span className={`elp-card__status-tag elp-card__status-tag--${status.cls}`}>
                        {status.text}
                      </span>
                    </div>

                    <div className="elp-card__body">
                      <span className={`elp-type-tag elp-type-tag--${event.event_type}`}>
                        {typeLabels[event.event_type] || event.event_type}
                      </span>

                      <Link to={`/su-kien/${event.slug || event.id}`} className="elp-card__title-link">
                        <h3 className="elp-card__title">{event.title}</h3>
                      </Link>

                      <div className="elp-card__meta">
                        <span className="elp-card__meta-item">
                          <FaCalendarAlt className="elp-card__meta-icon" />
                          {new Date(event.start_date).toLocaleDateString('vi-VN')}
                        </span>
                        {event.location && (
                          <span className="elp-card__meta-item">
                            <FaMapMarkerAlt className="elp-card__meta-icon" />
                            {event.location}
                          </span>
                        )}
                      </div>

                      <p className="elp-card__desc">
                        {event.description?.substring(0, 110)}
                        {event.description?.length > 110 ? '...' : ''}
                      </p>

                      <div className="elp-card__footer">
                        <div className="elp-card__stats">
                          <span className="elp-card__stat">
                            <FaEye className="elp-card__stat-icon" /> {event.views || 0}
                          </span>
                          <span className="elp-card__stat">
                            <FaMouse className="elp-card__stat-icon" /> {event.clicks || 0}
                          </span>
                        </div>
                        <Link to={`/su-kien/${event.slug || event.id}`} className="elp-card__read-more">
                          Xem chi tiết →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {renderPagination()}

            <p className="elp-results-info">
              Hiển thị {events.length} / {pagination.total} sự kiện
            </p>
          </>
        ) : (
          <div className="elp-empty">
            <div className="elp-empty__icon">📭</div>
            <h3 className="elp-empty__title">Không tìm thấy sự kiện nào</h3>
            <p className="elp-empty__sub">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}
        </>
        )} {/* Kết thúc Tab Khám Phá */}

        {/* === TAB 2: VÉ CỦA TÔI === */}
        {activeTab === 'my-tickets' && (
          <div className="elp-my-tickets">
            {loadingTickets ? (
              <div className="elp-loading-wrap"><div className="elp-spinner" /><p className="elp-loading-wrap__text">Đang tải vé của bạn...</p></div>
            ) : myTickets.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {myTickets.map(reg => (
                  <div key={reg.id} style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                    {/* Đường cắt cuống vé */}
                    <div style={{ position: 'absolute', top: '50%', left: '-10px', width: '20px', height: '20px', background: '#f9fafb', borderRadius: '50%', transform: 'translateY(-50%)', borderRight: '1px solid #d1fae5' }}></div>
                    <div style={{ position: 'absolute', top: '50%', right: '-10px', width: '20px', height: '20px', background: '#f9fafb', borderRadius: '50%', transform: 'translateY(-50%)', borderLeft: '1px solid #d1fae5' }}></div>
                    
                    <div style={{ borderBottom: '1px dashed #d1fae5', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px' }}>
                          {reg.event?.format === 'online' ? 'Sự kiện Online' : 'Sự kiện Offline'}
                        </span>
                        <h3 style={{ margin: '10px 0 5px', fontSize: '1.1rem', color: '#111827' }}>{reg.event?.title}</h3>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                          <FaCalendarAlt /> {new Date(reg.event?.start_date).toLocaleDateString('vi-VN')}
                        </div>
                        <Link
                          to={`/su-kien/${reg.event?.slug || reg.event?.id}`}
                          style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px' }}
                        >
                          <FaEye style={{ fontSize: '0.7rem' }} /> Xem chi tiết sự kiện
                        </Link>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Người tham gia</div>
                        <div style={{ fontWeight: 700, color: '#374151' }}>{reg.guest_name || user?.full_name}</div>
                        {reg.attendee_count > 1 && <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>+ {reg.attendee_count - 1} người đi cùng</div>}
                      </div>
                      
                      <button 
                        onClick={() => setSelectedTicket(reg)}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', width: '44px', height: '44px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(22,163,74,0.2)' }}
                        title="Hiển thị mã QR"
                      >
                        <FaQrcode />
                      </button>
                    </div>
                    
                    {reg.checked_in && (
                      <div style={{ marginTop: '16px', background: '#f0fdf4', color: '#15803d', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
                        ✅ Đã Check-in ({new Date(reg.checked_in_at).toLocaleTimeString('vi-VN')})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="elp-empty">
                <div className="elp-empty__icon">🎫</div>
                <h3 className="elp-empty__title">Bạn chưa có vé nào</h3>
                <p className="elp-empty__sub">Hãy chọn một sự kiện hấp dẫn và đăng ký tham gia nhé!</p>
              </div>
            )}
          </div>
        )}

        {/* === MODAL HIỂN THỊ MÃ QR === */}
        {selectedTicket && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setSelectedTicket(null)}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 30, maxWidth: 360, width: '100%', textAlign: 'center', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedTicket(null)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
              
              <h3 style={{ margin: '0 0 5px', fontSize: '1.1rem', color: '#111827', textTransform: 'uppercase' }}>Vé Điện Tử</h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>{selectedTicket.event?.title}</p>
              
              <div style={{ display: 'inline-block', padding: '15px', background: '#fff', borderRadius: '12px', border: '2px solid #16a34a', marginBottom: '20px' }}>
                <QRCodeCanvas value={selectedTicket.qr_code} size={200} level={"H"} />
              </div>
              
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.3rem', color: '#15803d', letterSpacing: 3, marginBottom: '10px' }}>
                {selectedTicket.qr_code}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>
                Đưa mã này cho Lễ tân khi đến sự kiện để Check-in và nhận quà.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


export default EventListPage;
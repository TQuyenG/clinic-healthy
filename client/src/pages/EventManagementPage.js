// EventManagementPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import systemService from '../services/systemService'; // Import thêm service hệ thống
import usePermissions from '../hooks/usePermissions';
import {
  FaPlus, FaEdit, FaTrash, FaEye, FaCopy,
  FaToggleOn, FaToggleOff, FaFileExport, FaImage,
  FaTimes, FaList, FaTh, FaColumns,
  FaCalendarCheck, FaFire, FaClock, FaArchive , FaVideo,
  FaMapMarkerAlt // Thêm icon bản đồ
} from 'react-icons/fa';
import './EventManagementPage.css';

const WORKFLOW_STATUSES = {
  draft:     { label: 'Nháp',        color: '#6b7280', bg: '#f3f4f6' },
  pending:   { label: 'Chờ duyệt',   color: '#d97706', bg: '#fef3c7' },
  approved:  { label: 'Đã duyệt',    color: '#059669', bg: '#d1fae5' },
  scheduled: { label: 'Lên lịch',    color: '#2563eb', bg: '#dbeafe' },
  ongoing:   { label: 'Đang diễn ra',color: '#16a34a', bg: '#dcfce7' },
  ended:     { label: 'Kết thúc',    color: '#9ca3af', bg: '#f3f4f6' },
  cancelled: { label: 'Đã hủy',      color: '#dc2626', bg: '#fee2e2' },
  postponed: { label: 'Tạm hoãn',    color: '#7c3aed', bg: '#ede9fe' },
};

const EVENT_CATEGORIES = {
  workshop:      'Hội thảo sức khỏe',
  free_exam:     'Khám miễn phí',
  blood_donation:'Hiến máu',
  livestream:    'Livestream bác sĩ',
  webinar:       'Webinar tư vấn',
  vaccination:   'Tiêm chủng',
  promotion:     'Chương trình giảm giá',
  launch:        'Ra mắt chuyên khoa',
  charity:       'Thiện nguyện',
  internal:      'Nội bộ',
  minigame:      'Mini game',
  course:        'Khóa học sức khỏe',
};

const EventManagementPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreateEvent = hasPermission('events_vouchers', 'create_event');
  const canEditEvent = hasPermission('events_vouchers', 'edit_event');
  const canDeleteEvent = hasPermission('events_vouchers', 'delete_event');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    event_type: 'all',
    sortBy: 'createdAt',
    startDate: '',
    endDate: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4; // Bắt buộc phải là 4 vì bạn có 4 tab
  const [branches, setBranches] = useState([]); // State lưu danh sách chi nhánh từ hệ thống

  const [formData, setFormData] = useState({
    title: '', description: '', content: '', event_type: 'event',
    start_date: '', end_date: '', location: '',
    thumbnail: '', banner_url: '', gallery: [],
    is_popup: false, is_active: true,
    popup_config: { delay: 0, frequency: 'once_per_day', display_pages: ['home'] },
    cta_config: { text: 'Xem chi tiết', type: 'internal', link: '' },
    status: 'draft',
    event_category: 'workshop',
    format: 'offline',
    online_config: { link: '', password: '', livestream_url: '' },
    registration_limit: '',
    registration_open_at: '',
    registration_close_at: '',
    priority: 'normal',
    tags: '',
    // --- THÊM TRƯỜNG MỚI GIAI ĐOẠN 1 ---
    offline_config: { branch: '', map_url: '' },
    is_fee_required: false,
    fee_amount: 0,
    is_guest_allowed: false,
    gift_config: { has_gift: false, type: 'voucher', note: '' }
  });

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

 const [statsData, setStatsData] = useState({ total: 0, ongoing: 0, upcoming: 0, ended: 0 });
  const [activeView, setActiveView] = useState('list'); // 'list' | 'grid' | 'kanban'

 useEffect(() => {
    fetchEvents();
    fetchBranches();
  }, [
    filters.search, 
    filters.event_type, 
    filters.sortBy, 
    filters.startDate, 
    filters.endDate, 
    pagination.page
  ]); //

  const fetchBranches = async () => {
    try {
      const res = await systemService.getContactSettings(); // Lấy cấu hình liên hệ từ hệ thống
      if (res && res.branches) {
        setBranches(res.branches); // Cập nhật mảng chi nhánh thực tế
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách chi nhánh:", error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/marketing/events', {
        params: { page: pagination.page, limit: pagination.limit, ...filters }
      });
      if (response.data.success) {
  setEvents(response.data.events);
  // Đổi totalCount thành total để khớp với Controller của Backend
  setPagination(prev => ({ ...prev, total: response.data.total || 0 })); //


        // Also fetch stats
        const statsRes = await api.get('/marketing/events/stats');
        if (statsRes.data.success) {
          const s = statsRes.data.stats;
          setStatsData({
            total:    s.total_events   || 0,
            ongoing:  s.active_events  || 0,
            upcoming: 0,
            ended:    (s.total_events - s.active_events) || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false); // <--- THÊM DÒNG NÀY ĐỂ TẮT CHỮ "ĐANG TẢI..."
      setUploadingImages(false);
    }
  };

  // Hàm xử lý upload ảnh
  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    try {
      setUploadingImages(true);

      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/upload/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        const uploadedUrl = data.url;
        setFormData(prev => ({ ...prev, [fieldName]: uploadedUrl }));
      } else {
        alert(data.message || 'Upload ảnh thất bại');
      }
    } catch (error) {
      console.error('Error during upload:', error);
      alert(`Có lỗi xảy ra: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  // Hàm xóa ảnh trong Gallery
  const handleRemoveGalleryImage = (index) => {
    const newGallery = [...formData.gallery];
    newGallery.splice(index, 1);
    setFormData({ ...formData, gallery: newGallery });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingEvent ? !canEditEvent : !canCreateEvent) {
      alert('Bạn chưa có quyền thao tác với sự kiện này.');
      return;
    }
    try {
      if (editingEvent) {
        await api.put(`/marketing/events/${editingEvent.id}`, formData);
      } else {
        await api.post('/marketing/events', formData);
      }
      setShowModal(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      const msg = error?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
      alert(`❌ Lỗi: ${msg}`);
    }
  };

  const handleEdit = (event) => {
    if (!canEditEvent) return;
    setEditingEvent(event);
    setCurrentStep(1); // Reset lại bước 1
    setFormData({
      title: event.title,
      description: event.description || '',
      content: event.content || '',
      event_type: event.event_type,
      // Chuyển đổi sang định dạng YYYY-MM-DDTHH:mm để hiển thị đúng trong ô datetime-local
      start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
      location: event.location || '',
      thumbnail: event.thumbnail || '',
      banner_url: event.banner_url || '',
      gallery: event.gallery || [],
      is_popup: event.is_popup,
      is_banner_ad: event.is_banner_ad || false,
      banner_ad_config: event.banner_ad_config || { label: 'Sự kiện nổi bật', cta_text: 'Tìm hiểu ngay', badge: '' },
      is_active: event.is_active,
      popup_config: event.popup_config || { delay: 0, frequency: 'once_per_day', display_pages: ['home'] },
      cta_config: event.cta_config || { text: 'Xem chi tiết', type: 'internal', link: '' },
      status: event.status || 'draft',
      event_category: event.event_category || 'workshop',
      format: event.format || 'offline',
      online_config: event.online_config || { link: '', password: '', livestream_url: '' },
      registration_limit: event.registration_limit || '',
      // Cắt chuỗi lấy đúng chuẩn YYYY-MM-DDTHH:mm cho thẻ input datetime-local
      registration_open_at: event.registration_open_at ? new Date(event.registration_open_at).toISOString().slice(0, 16) : '',
      registration_close_at: event.registration_close_at ? new Date(event.registration_close_at).toISOString().slice(0, 16) : '',
      priority: event.priority || 'normal',
      tags: Array.isArray(event.tags) ? event.tags.join(', ') : '',
      offline_config: event.offline_config || { branch: '', map_url: '' },
      is_fee_required: event.is_fee_required || false,
      fee_amount: event.fee_amount || 0,
      is_guest_allowed: event.is_guest_allowed || false,
      gift_config: event.gift_config || { has_gift: false, type: 'voucher', note: '' }
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
    try {
      await api.delete(`/marketing/events/${id}`);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleToggleStatus = async (id) => {
    if (!canEditEvent) return;
    try {
      await api.put(`/marketing/events/${id}/toggle`);
      fetchEvents();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDuplicate = async (id) => {
    if (!canCreateEvent) return;
    try {
      await api.post(`/marketing/events/${id}/duplicate`);
      fetchEvents();
    } catch (error) {
      console.error('Error duplicating event:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/marketing/events/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `events-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setCurrentStep(1); // Reset lại bước 1
    setFormData({
      title: '', description: '', content: '', event_type: 'event',
      start_date: '', end_date: '', location: '',
      thumbnail: '', banner_url: '', gallery: [],
      is_popup: false, is_banner_ad: false, is_active: true,
    banner_ad_config: { label: 'Sự kiện nổi bật', cta_text: 'Tìm hiểu ngay', badge: '' },
      popup_config: { delay: 0, frequency: 'once_per_day', display_pages: ['home'] },
      cta_config: { text: 'Xem chi tiết', type: 'internal', link: '' },
      status: 'draft',
      event_category: 'workshop',
      format: 'offline',
      online_config: { link: '', password: '', livestream_url: '' },
      registration_limit: '',
      registration_open_at: '',
      registration_close_at: '',
      priority: 'normal',
      tags: '',
      offline_config: { branch: '', map_url: '' },
      is_fee_required: false,
      fee_amount: 0,
      is_guest_allowed: false,
      gift_config: { has_gift: false, type: 'voucher', note: '' }
    });
  };

  const typeLabels = { event: 'Sự kiện', promotion: 'Khuyến mãi', news: 'Tin tức', notification: 'Thông báo' };
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="emp-page">
      {/* Header */}
      <div className="emp-header">
        <h1 className="emp-header__title">Quản lý Sự kiện & Tiếp thị</h1>
        <div className="emp-header__actions">
          <div className="emp-view-tabs">
            <button className={`emp-view-tab ${activeView === 'list'   ? 'emp-view-tab--active' : ''}`} onClick={() => setActiveView('list')}><FaList /> Bảng</button>
            <button className={`emp-view-tab ${activeView === 'grid'   ? 'emp-view-tab--active' : ''}`} onClick={() => setActiveView('grid')}><FaTh /> Lưới</button>
            <button className={`emp-view-tab ${activeView === 'kanban' ? 'emp-view-tab--active' : ''}`} onClick={() => setActiveView('kanban')}><FaColumns /> Kanban</button>
          </div>
          <button onClick={handleExport} className="emp-btn emp-btn--secondary">
            <FaFileExport /> Xuất
          </button>
          {canCreateEvent && (
            <button onClick={() => { resetForm(); setShowModal(true); }} className="emp-btn emp-btn--primary">
              <FaPlus /> Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="emp-stats-row">
        <div className="emp-stat-card">
          <div className="emp-stat-card__icon emp-stat-card__icon--blue"><FaCalendarCheck /></div>
          <div>
            <div className="emp-stat-card__label">Tổng sự kiện</div>
            <div className="emp-stat-card__num">{statsData.total}</div>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-card__icon emp-stat-card__icon--green"><FaFire /></div>
          <div>
            <div className="emp-stat-card__label">Đang diễn ra</div>
            <div className="emp-stat-card__num">{statsData.ongoing}</div>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-card__icon emp-stat-card__icon--amber"><FaClock /></div>
          <div>
            <div className="emp-stat-card__label">Sắp diễn ra</div>
            <div className="emp-stat-card__num">{statsData.upcoming}</div>
          </div>
        </div>
        <div className="emp-stat-card">
          <div className="emp-stat-card__icon emp-stat-card__icon--gray"><FaArchive /></div>
          <div>
            <div className="emp-stat-card__label">Đã kết thúc</div>
            <div className="emp-stat-card__num">{statsData.ended}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="emp-filter-bar">
        <input
          className="emp-filter-bar__input"
          type="text"
          placeholder="Tìm tiêu đề..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="emp-filter-bar__select"
          value={filters.event_type}
          onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
        >
          <option value="all">Tất cả loại</option>
          <option value="event">Sự kiện</option>
          <option value="promotion">Khuyến mãi</option>
          <option value="news">Tin tức</option>
          <option value="notification">Thông báo</option>
        </select>
        <select
          className="emp-filter-bar__select"
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
        >
          <option value="createdAt">Mới nhất</option>
          <option value="views">Nhiều lượt xem</option>
          <option value="clicks">Nhiều lượt click</option>
        </select>
        <div className="emp-filter-bar__date-group">
          <input
            type="date"
            className="emp-filter-bar__select"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <span className="emp-filter-bar__date-sep">→</span>
          <input
            type="date"
            className="emp-filter-bar__select"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="emp-loading">Đang tải...</div>
      ) : (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Thời gian</th>
                <th>Xem</th>
                <th>Click</th>
                <th>Trạng thái</th>
                <th>Workflow</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={event.id} className={i > 0 ? 'emp-table__divider' : ''}>
                  <td>
                    <img
                      src={event.thumbnail || '/images/placeholder.jpg'}
                      alt={event.title}
                      className="emp-table__thumb"
                      onError={(e) => (e.target.src = '/images/placeholder.jpg')}
                    />
                  </td>
                  <td>
                    <span className="emp-table__title">{event.title}</span>
                    {event.location && <span className="emp-table__sub">{event.location}</span>}
                  </td>
                  <td>
                    <span className={`emp-badge emp-badge--${event.event_type}`}>
                      {typeLabels[event.event_type] || event.event_type}
                    </span>
                  </td>
                  <td>
                    <span className="emp-table__title" style={{ fontWeight: 400, fontSize: 12 }}>
                      {new Date(event.start_date).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="emp-table__sub">
                      → {new Date(event.end_date).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td>{event.views || 0}</td>
                  <td>{event.clicks || 0}</td>
                  <td>
                    {canEditEvent ? (
                      <button
                        onClick={() => handleToggleStatus(event.id)}
                        className={`emp-toggle ${event.is_active ? 'emp-toggle--on' : 'emp-toggle--off'}`}
                      >
                        {event.is_active ? <FaToggleOn /> : <FaToggleOff />}
                        {event.is_active ? 'Bật' : 'Tắt'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Chỉ xem</span>
                    )}
                  </td>
                  <td>
                    {event.status && WORKFLOW_STATUSES[event.status] ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: WORKFLOW_STATUSES[event.status].color,
                        background: WORKFLOW_STATUSES[event.status].bg
                      }}>
                        {WORKFLOW_STATUSES[event.status].label}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="emp-actions">
                      <button
                        className="emp-action-btn"
                        title="Xem chi tiết (Public)"
                        onClick={() => navigate(`/su-kien/${event.slug}`)}
                      >
                        <FaEye />
                      </button>
                      <button
                        className="emp-action-btn"
                        title="Điều phối & Check-in (Command Center)"
                        style={{ color: '#7c3aed', borderColor: '#ddd6fe' }} // Thêm chút màu tím nổi bật
                        onClick={() => navigate(`/su-kien/${event.id}/dieu-phoi`)}
                      >
                        <FaVideo />
                      </button>
                      {canEditEvent && (
                        <button
                          className="emp-action-btn"
                          title="Sửa"
                          onClick={() => handleEdit(event)}
                        >
                          <FaEdit />
                        </button>
                      )}
                      {canCreateEvent && (
                        <button
                          className="emp-action-btn"
                          title="Nhân bản"
                          onClick={() => handleDuplicate(event.id)}
                        >
                          <FaCopy />
                        </button>
                      )}
                      {canDeleteEvent && (
                        <button
                          className="emp-action-btn emp-action-btn--delete"
                          title="Xóa"
                          onClick={() => handleDelete(event.id)}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="emp-pagination">
              <button
                className="emp-pagination__btn"
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
              >← Trước</button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
                  className={`emp-pagination__btn ${pagination.page === i + 1 ? 'emp-pagination__btn--active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="emp-pagination__btn"
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === totalPages}
              >Sau →</button>
            </div>
          )}
        </div>
      )}

      {/* Kanban View */}
      {activeView === 'kanban' && !loading && (
        <div className="emp-kanban">
          {Object.entries(WORKFLOW_STATUSES).map(([statusKey, { label, color, bg }]) => {
            const colEvents = events.filter(e => (e.status || 'draft') === statusKey);
            return (
              <div key={statusKey} className="emp-kanban-col">
                <div className="emp-kanban-col__header" style={{ background: bg, color }}>
                  {label}
                  <span className="emp-kanban-col__count" style={{ color }}>{colEvents.length}</span>
                </div>
                <div className="emp-kanban-col__body">
                  {colEvents.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: '0.7rem', padding: '20px 0' }}>Trống</div>
                  )}
                  {colEvents.map(event => (
                    <div key={event.id} className="emp-kanban-card" onClick={() => handleEdit(event)}>
                      <div className="emp-kanban-card__title">{event.title}</div>
                      <div className="emp-kanban-card__meta">
                        <span>{EVENT_CATEGORIES[event.event_category] || event.event_type}</span>
                        <span>{new Date(event.start_date).toLocaleDateString('vi-VN')}</span>
                        <span>👁 {event.views || 0} · 🖱 {event.clicks || 0}</span>
                      </div>
                      <div className="emp-kanban-card__actions" onClick={e => e.stopPropagation()}>
                        <button className="emp-kanban-card__btn" onClick={() => navigate(`/su-kien/${event.slug}`)}>Xem</button>
                        <button className="emp-kanban-card__btn" style={{color: '#7c3aed'}} onClick={() => navigate(`/su-kien/${event.id}/dieu-phoi`)}>Điều phối</button>
                        {canEditEvent && <button className="emp-kanban-card__btn" onClick={() => handleEdit(event)}>Sửa</button>}
                        {canDeleteEvent && <button className="emp-kanban-card__btn emp-kanban-card__btn--danger" onClick={() => handleDelete(event.id)}>Xóa</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="emp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal__header">
              <h2 className="emp-modal__title">
                {editingEvent ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
              </h2>
              <button className="emp-modal__close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Wizard Progress Bar */}
              <div className="emp-wizard-header">
                <div className={`emp-wizard-step ${currentStep >= 1 ? 'active' : ''}`}>1. Cơ bản</div>
                <div className={`emp-wizard-step ${currentStep >= 2 ? 'active' : ''}`}>2. Thời gian & Địa điểm</div>
                <div className={`emp-wizard-step ${currentStep >= 3 ? 'active' : ''}`}>3. Đăng ký & Vé</div>
                <div className={`emp-wizard-step ${currentStep >= 4 ? 'active' : ''}`}>4. Quảng cáo & Xác nhận</div>
              </div>

              <div className="emp-modal__body">
                {/* === BƯỚC 1: THÔNG TIN CƠ BẢN === */}
                {currentStep === 1 && (
                  <div className="emp-wizard-content slide-in">
                    <div className="emp-form-group">
                      <label className="emp-form-label emp-form-label--required">Tên chiến dịch / Sự kiện</label>
                      <input
                        className="emp-form-input emp-form-input--large"
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="VD: Tuần lễ khám sức khỏe miễn phí người cao tuổi..."
                      />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Loại hình tổ chức</label>
                      <div className="emp-type-cards">
                        <div className={`emp-type-card ${formData.event_category === 'free_exam' ? 'selected' : ''}`} onClick={() => setFormData({...formData, event_category: 'free_exam'})}><span className="icon">🩺</span> Khám miễn phí</div>
                        <div className={`emp-type-card ${formData.event_category === 'workshop' ? 'selected' : ''}`} onClick={() => setFormData({...formData, event_category: 'workshop'})}><span className="icon">🎤</span> Hội thảo</div>
                        <div className={`emp-type-card ${formData.event_category === 'vaccination' ? 'selected' : ''}`} onClick={() => setFormData({...formData, event_category: 'vaccination'})}><span className="icon">💉</span> Tiêm chủng</div>
                        <div className={`emp-type-card ${formData.event_category === 'promotion' ? 'selected' : ''}`} onClick={() => setFormData({...formData, event_category: 'promotion', event_type: 'promotion'})}><span className="icon">🎁</span> Khuyến mãi</div>
                        <div className={`emp-type-card ${formData.event_category === 'livestream' ? 'selected' : ''}`} onClick={() => setFormData({...formData, event_category: 'livestream'})}><span className="icon">📺</span> Livestream</div>
                        <div className={`emp-type-card ${!['free_exam', 'workshop', 'vaccination', 'promotion', 'livestream'].includes(formData.event_category) ? 'selected' : ''}`} onClick={() => setFormData({...formData, event_category: 'charity', event_type: 'event'})}><span className="icon">📌</span> Khác...</div>
                      </div>
                      {!['free_exam', 'workshop', 'vaccination', 'promotion', 'livestream'].includes(formData.event_category) && (
                        <div className="emp-smart-box slide-down" style={{marginTop: '10px', padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px'}}>
                          <label className="emp-form-label">Chọn danh mục khác:</label>
                          <select className="emp-form-select" value={formData.event_category} onChange={(e) => setFormData({ ...formData, event_category: e.target.value })}>
                            <option value="charity">❤️ Thiện nguyện / CSR</option>
                            <option value="blood_donation">🩸 Hiến máu nhân đạo</option>
                            <option value="course">📚 Khóa học / Đào tạo</option>
                            <option value="webinar">💻 Webinar (Hội thảo Online)</option>
                            <option value="launch">🚀 Khai trương / Ra mắt</option>
                            <option value="minigame">🎯 Minigame / Cuộc thi</option>
                            <option value="internal">🏢 Sự kiện nội bộ</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* KHU VỰC HÌNH ẢNH */}
                    <div className="emp-form-row">
                      <div className="emp-form-group">
                        <label className="emp-form-label">Ảnh đại diện (Thumbnail)</label>
                        <input className="emp-upload-input-file" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'thumbnail')} />
                        {formData.thumbnail && <img src={formData.thumbnail} alt="Thumb" className="emp-preview-mini" style={{width: '60px', height: '60px', objectFit: 'cover', marginTop: '5px', borderRadius: '4px'}} />}
                      </div>
                      <div className="emp-form-group">
                        <label className="emp-form-label">Ảnh bìa chính (Banner)</label>
                        <input className="emp-upload-input-file" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner_url')} />
                        {formData.banner_url && <img src={formData.banner_url} alt="Banner" className="emp-preview-mini" style={{width: '100%', height: '60px', objectFit: 'cover', marginTop: '5px', borderRadius: '4px'}} />}
                      </div>
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Album hình ảnh (Gallery - Có thể chọn nhiều)</label>
                      <input className="emp-upload-input-file" type="file" accept="image/*" multiple onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        setUploadingImages(true);
                        try {
                          for (const file of files) {
                            const fData = new FormData();
                            fData.append('image', file);
                            const token = localStorage.getItem('token');
                            const response = await fetch('http://localhost:3001/api/upload/image', {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}` },
                              body: fData
                            });
                            const data = await response.json();
                            if (data.success && data.url) {
                              setFormData(prev => ({ ...prev, gallery: [...prev.gallery, data.url] }));
                            }
                          }
                        } catch (err) {
                          alert('Lỗi upload ảnh gallery: ' + err.message);
                        } finally {
                          setUploadingImages(false);
                          e.target.value = null;
                        }
                      }} />
                      <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px'}}>
                        {formData.gallery.map((img, idx) => (
                          <div key={idx} style={{position: 'relative'}}>
                            <img src={img} alt={`Gal ${idx}`} style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px'}} />
                            <button type="button" onClick={() => handleRemoveGalleryImage(idx)} style={{position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '15px', height: '15px', fontSize: '10px', cursor: 'pointer'}}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Mô tả ngắn</label>
                      <textarea className="emp-form-textarea" rows="2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Tóm tắt sự kiện..." />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Nội dung chi tiết</label>
                      <textarea className="emp-form-textarea" rows="5" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Thông tin chi tiết về chương trình..." />
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Mô tả ngắn gọn (Hiển thị ở trang danh sách)</label>
                      <textarea className="emp-form-textarea" rows="2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="VD: Dành riêng cho bệnh nhân từ 50 tuổi trở lên..."></textarea>
                    </div>
                  </div>
                )}

                {/* === BƯỚC 2: THỜI GIAN & ĐỊA ĐIỂM === */}
                {currentStep === 2 && (
                  <div className="emp-wizard-content slide-in">
                    <div className="emp-form-row">
                      <div className="emp-form-group">
                        <label className="emp-form-label emp-form-label--required">Thời gian bắt đầu sự kiện</label>
                        <input 
                          className="emp-form-input" 
                          type="datetime-local" 
                          value={formData.start_date} 
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} 
                        />
                      </div>
                      <div className="emp-form-group">
                        <label className="emp-form-label emp-form-label--required">Thời gian kết thúc dự kiến</label>
                        <input 
                          className="emp-form-input" 
                          type="datetime-local" 
                          value={formData.end_date} 
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="emp-form-group">
                      <label className="emp-form-label">Hình thức tổ chức</label>
                      <div className="emp-format-selector">
                        <label><input type="radio" name="format" value="offline" checked={formData.format === 'offline'} onChange={(e) => setFormData({...formData, format: e.target.value})} /> Tổ chức tại viện (Offline)</label>
                        <label><input type="radio" name="format" value="online" checked={formData.format === 'online'} onChange={(e) => setFormData({...formData, format: e.target.value})} /> Trực tuyến (Online)</label>
                      </div>
                    </div>

                    {formData.format === 'offline' ? (
                      <div className="emp-smart-box">
                        <div className="emp-form-group">
                          <label className="emp-form-label">Cơ sở / Địa điểm tổ chức</label>
                          <select 
                            className="emp-form-select" 
                            style={{fontWeight: 'bold'}}
                            value={formData.offline_config?.branch || ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              // Nếu chọn chi nhánh trong hệ thống, tự động lấy địa chỉ của chi nhánh đó làm location
                              const selectedBranch = branches.find(b => b.name === val);
                              setFormData({
                                ...formData, 
                                location: selectedBranch ? selectedBranch.address : (val === 'other' ? '' : formData.location),
                                offline_config: {
                                  ...formData.offline_config, 
                                  branch: val
                                }
                              });
                            }}
                          >
                            <option value="">-- Chọn chi nhánh bệnh viện --</option>
                            {/* Đổ dữ liệu động từ hệ thống */}
                            {branches.map((b, idx) => (
                              <option key={idx} value={b.name}>{b.name}</option>
                            ))}
                            <option value="other" style={{color: '#2563eb', fontWeight: '800'}}>📍 Tổ chức tại địa điểm khác ngoài viện</option>
                          </select>
                        </div>

                        {/* Nếu chọn địa điểm ngoài -> Hiện ô nhập địa chỉ tự do */}
                        {formData.offline_config?.branch === 'other' && (
                          <div className="emp-form-group slide-down" style={{marginTop: '12px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #3b82f6'}}>
                            <label className="emp-form-label emp-form-label--required">Nhập địa chỉ cụ thể nơi tổ chức</label>
                            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                              <FaMapMarkerAlt style={{color: '#ef4444', fontSize: '1.2rem'}}/>
                              <input 
                                className="emp-form-input" 
                                type="text" 
                                value={formData.location} 
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                                placeholder="VD: Nhà văn hóa Thanh Niên, Số 4 Phạm Ngọc Thạch..."
                                required
                                autoFocus
                              />
                            </div>
                          </div>
                        )}

                        <div className="emp-form-group" style={{marginTop: '10px'}}>
                          <label className="emp-form-label">Vị trí khu vực Check-in (Chi tiết)</label>
                          <input 
                            className="emp-form-input" 
                            type="text" 
                            value={formData.offline_config?.checkin_area || ''} 
                            onChange={(e) => setFormData({ ...formData, offline_config: {...formData.offline_config, checkin_area: e.target.value} })} 
                            placeholder="VD: Quầy sảnh chính / Khu vực hội trường lầu 2..." 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="emp-smart-box online">
                        <div className="emp-form-group">
                          <label className="emp-form-label">Link Zoom / Google Meet / Livestream</label>
                          <input className="emp-form-input" type="text" value={formData.online_config?.link || ''} onChange={(e) => setFormData({...formData, online_config: {...formData.online_config, link: e.target.value}})} placeholder="https://meet.google.com/..." />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* === BƯỚC 3: ĐĂNG KÝ THAM GIA === */}
                {currentStep === 3 && (
                  <div className="emp-wizard-content slide-in">
                    
                    {/* BỔ SUNG: Cấu hình thời gian Mở / Đóng đăng ký */}
                    <div className="emp-form-row" style={{marginBottom: '15px'}}>
                      <div className="emp-form-group">
                        <label className="emp-form-label">Bắt đầu nhận đăng ký từ</label>
                        <input 
                          className="emp-form-input" 
                          type="datetime-local" 
                          value={formData.registration_open_at} 
                          onChange={(e) => setFormData({ ...formData, registration_open_at: e.target.value })} 
                        />
                      </div>
                      <div className="emp-form-group">
                        <label className="emp-form-label">Tự động khóa đăng ký lúc</label>
                        <input 
                          className="emp-form-input" 
                          type="datetime-local" 
                          value={formData.registration_close_at} 
                          onChange={(e) => setFormData({ ...formData, registration_close_at: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="emp-form-row">
                      <div className="emp-form-group">
                        <label className="emp-form-label">Giới hạn số lượng vé / người</label>
                        <input className="emp-form-input" type="number" min="0" value={formData.registration_limit} onChange={(e) => setFormData({ ...formData, registration_limit: e.target.value })} placeholder="Để trống nếu không giới hạn" />
                      </div>
                      <div className="emp-form-group">
                        <label className="emp-checkbox-label" style={{marginTop: '25px'}}>
                          <input type="checkbox" checked={formData.is_guest_allowed} onChange={(e) => setFormData({ ...formData, is_guest_allowed: e.target.checked })} />
                          Cho phép mang theo người thân
                        </label>
                      </div>
                    </div>

                    <div className="emp-smart-box">
                      <div className="emp-form-group">
                        <label className="emp-checkbox-label emp-text-primary">
                          <input type="checkbox" checked={formData.is_fee_required} onChange={(e) => setFormData({ ...formData, is_fee_required: e.target.checked })} />
                          Sự kiện có thu phí tham gia
                        </label>
                      </div>
                      {formData.is_fee_required && (
                        <div className="emp-form-group slide-down">
                          <label className="emp-form-label">Giá vé / Phí tham gia (VNĐ)</label>
                          <input className="emp-form-input" type="number" min="0" value={formData.fee_amount} onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })} placeholder="VD: 150000" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* === BƯỚC 4: QUÀ TẶNG & XUẤT BẢN === */}
                {currentStep === 4 && (
                  <div className="emp-wizard-content slide-in">

                    {/* --- QUÀ TẶNG --- */}
                    <div className="emp-smart-box gift-box">
                      <div className="emp-form-group">
                        <label className="emp-checkbox-label">
                          <input type="checkbox" checked={formData.gift_config?.has_gift || false} onChange={(e) => setFormData({ ...formData, gift_config: { ...formData.gift_config, has_gift: e.target.checked } })} />
                          🎁 Có phát quà khi Check-in thành công
                        </label>
                      </div>
                      {formData.gift_config?.has_gift && (
                        <div className="emp-form-row slide-down">
                          <div className="emp-form-group">
                            <label className="emp-form-label">Loại quà tặng</label>
                            <select className="emp-form-select" value={formData.gift_config?.type || 'voucher'} onChange={(e) => setFormData({...formData, gift_config: {...formData.gift_config, type: e.target.value}})}>
                              <option value="voucher">Voucher / Mã giảm giá</option>
                              <option value="medicine">Thuốc / Thực phẩm chức năng</option>
                              <option value="document">Tài liệu sức khỏe</option>
                            </select>
                          </div>
                          <div className="emp-form-group">
                            <label className="emp-form-label">Ghi chú cho Lễ tân</label>
                            <input className="emp-form-input" type="text" value={formData.gift_config?.note || ''} onChange={(e) => setFormData({...formData, gift_config: {...formData.gift_config, note: e.target.value}})} placeholder="VD: Tặng 1 hộp sâm + 1 voucher" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* --- QUẢNG CÁO TRANG CHỦ --- */}
                    <div className="emp-smart-box" style={{marginTop: '20px', border: '2px solid #f59e0b', borderRadius: '12px', padding: '20px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'}}>
                      <h4 style={{margin: '0 0 16px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        📢 Quảng cáo Banner Trang chủ
                      </h4>
                      <div className="emp-form-group">
                        <label className="emp-checkbox-label" style={{fontWeight: 600, color: '#b45309'}}>
                          <input
                            type="checkbox"
                            checked={formData.is_banner_ad || false}
                            onChange={(e) => setFormData({ ...formData, is_banner_ad: e.target.checked })}
                          />
                          🔥 Hiển thị sự kiện này như Banner quảng cáo nổi bật trên trang chủ
                        </label>
                        <p style={{fontSize: '12px', color: '#92400e', marginTop: '6px', marginLeft: '22px'}}>
                          Sự kiện sẽ xuất hiện dưới dạng banner lớn bên dưới slider trang chủ, thu hút người dùng click vào.
                        </p>
                      </div>

                      {formData.is_banner_ad && (
                        <div className="emp-form-row slide-down" style={{marginTop: '12px'}}>
                          <div className="emp-form-group">
                            <label className="emp-form-label">Nhãn phụ (Badge)</label>
                            <input
                              className="emp-form-input"
                              type="text"
                              value={formData.banner_ad_config?.badge || ''}
                              onChange={(e) => setFormData({...formData, banner_ad_config: {...formData.banner_ad_config, badge: e.target.value}})}
                              placeholder="VD: HOT · Miễn phí · Giới hạn"
                            />
                          </div>
                          <div className="emp-form-group">
                            <label className="emp-form-label">Tiêu đề nhãn banner</label>
                            <input
                              className="emp-form-input"
                              type="text"
                              value={formData.banner_ad_config?.label || ''}
                              onChange={(e) => setFormData({...formData, banner_ad_config: {...formData.banner_ad_config, label: e.target.value}})}
                              placeholder="VD: Sự kiện nổi bật"
                            />
                          </div>
                          <div className="emp-form-group">
                            <label className="emp-form-label">Nút CTA</label>
                            <input
                              className="emp-form-input"
                              type="text"
                              value={formData.banner_ad_config?.cta_text || ''}
                              onChange={(e) => setFormData({...formData, banner_ad_config: {...formData.banner_ad_config, cta_text: e.target.value}})}
                              placeholder="VD: Đăng ký ngay · Tìm hiểu ngay"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* --- TRẠNG THÁI & POPUP --- */}
                    <div className="emp-form-row" style={{marginTop: '20px'}}>
                      <div className="emp-form-group">
                        <label className="emp-form-label">Trạng thái phát hành</label>
                        <select className="emp-form-select emp-select-status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                          <option value="draft">Lưu nháp (Chưa hiện)</option>
                          <option value="approved">Đăng công khai ngay</option>
                        </select>
                      </div>
                      <div className="emp-form-group">
                        <label className="emp-checkbox-label" style={{marginTop: '25px'}}>
                          <input type="checkbox" checked={formData.is_popup} onChange={(e) => setFormData({ ...formData, is_popup: e.target.checked })} />
                          Hiển thị Pop-up trên trang chủ
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="emp-modal__footer">
                {currentStep > 1 ? (
                  <button type="button" className="emp-btn emp-btn--secondary" onClick={(e) => { e.preventDefault(); prevStep(); }}>← Quay lại</button>
                ) : (
                  <button type="button" className="emp-btn emp-btn--ghost" onClick={(e) => { e.preventDefault(); setShowModal(false); }}>Hủy</button>
                )}
                
                {currentStep < 4 ? (
                  <button type="button" className="emp-btn emp-btn--primary" onClick={(e) => { e.preventDefault(); nextStep(); }}>Tiếp tục →</button>
                ) : (
                  <button type="submit" className="emp-btn emp-btn--primary" style={{backgroundColor: '#059669'}} disabled={editingEvent ? !canEditEvent : !canCreateEvent}>
                    {editingEvent ? '💾 Hoàn tất cập nhật' : '🚀 Tạo sự kiện ngay'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagementPage;
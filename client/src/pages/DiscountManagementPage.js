// client/src/pages/DiscountManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import marketingService from '../services/marketingService';
import api from '../services/api';
import { toast } from 'react-toastify';
import usePermissions from '../hooks/usePermissions';
import './DiscountManagementPage.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INIT_FORM = {
  code: '', name: '', description: '', image_url: '',
  voucher_type: 'normal', // 'normal' | 'wheel' | 'exchange'
  discount_type: 'percentage', discount_value: 0,
  usage_limit: 100, min_order_value: 0, max_discount_amount: 0,
  start_date: '', end_date: '',
  apply_for: 'all', applicable_ids: [],
  is_active: true,
  // game
  is_game_reward: false, game_type: 'none', game_probability: 0,
  reward_type: 'voucher', external_code: '', reward_image_url: '',
  // exchange
  is_exchange_reward: false, exchange_points: 0, exchange_limit: -1,
};

const STATUS_MAP = {
  running:   { label: 'Đang chạy',    cls: 'dmp-badge dmp-badge--green' },
  upcoming:  { label: 'Chưa bắt đầu', cls: 'dmp-badge dmp-badge--blue'  },
  expired:   { label: 'Hết hạn',      cls: 'dmp-badge dmp-badge--red'   },
  exhausted: { label: 'Hết lượt',     cls: 'dmp-badge dmp-badge--gray'  },
};

const TYPE_TAB = [
  { key: 'vouchers',  label: 'Voucher',    icon: '🎫' },
  { key: 'wheel',     label: 'Vòng Quay',  icon: '🎡' },
  { key: 'exchange',  label: 'Đổi Điểm',   icon: '⭐' },
];

const WHEEL_COLORS_DEFAULT = ['#16a34a','#d97706','#2563eb','#ea580c','#7c3aed','#db2777','#0891b2','#65a30d'];

const INIT_WHEEL_FORM = {
  name: '', description: '', banner_url: '',
  start_date: '', end_date: '',
  spins_per_day: 3, cost_per_spin: 10,
  prizes: [
    { label: 'Voucher 10%', promotion_id: '', reward_type: 'voucher', external_code: '', reward_image_url: '', probability: 20, quantity: -1, color: '#16a34a', is_miss: false },
    { label: 'Voucher 5%',  promotion_id: '', reward_type: 'voucher', external_code: '', reward_image_url: '', probability: 30, quantity: -1, color: '#d97706', is_miss: false },
    { label: 'Mất lượt',    promotion_id: '', reward_type: 'voucher', external_code: '', reward_image_url: '', probability: 50, quantity: -1, color: '#94a3b8', is_miss: true  },
  ],
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const DiscountManagementPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreateVoucher = hasPermission('events_vouchers', 'create_voucher');
  const canEditVoucher = hasPermission('events_vouchers', 'edit_voucher');
  const canDeleteVoucher = hasPermission('events_vouchers', 'delete_voucher');
  const canCreateGame = hasPermission('events_vouchers', 'create_game');
  const canConfigRewards = hasPermission('events_vouchers', 'config_rewards');
  const [activeTab,        setActiveTab]        = useState('vouchers');
  const [promotions,       setPromotions]       = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [showModal,        setShowModal]        = useState(false);
  const [editingPromo,     setEditingPromo]     = useState(null); // null = tạo mới
  const [formData,         setFormData]         = useState(INIT_FORM);
  const [selectionData,    setSelectionData]    = useState([]);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [loadingSel,       setLoadingSel]       = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [uploadingImage,   setUploadingImage]   = useState(false); // Thêm state loading cho upload ảnh


  // ✅ STATE & LOGIC CHO CẤU HÌNH ĐIỂM THƯỞNG
  const [loyaltyConfig, setLoyaltyConfig] = useState({ daily_checkin_points: 10 });
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  const fetchLoyaltyConfig = useCallback(async () => {
    try {
      // Gọi đường dẫn API (Đổi đường dẫn /marketing/... cho khớp proxy nếu cần)
      const res = await api.get('/marketing/loyalty-config'); 
      if (res.data.success) setLoyaltyConfig(res.data.config);
    } catch (e) { console.error('Lỗi tải cấu hình điểm', e); }
  }, []);

  // Tự động tải cấu hình khi vào Tab Đổi điểm
  useEffect(() => {
    if (activeTab === 'exchange') {
      fetchLoyaltyConfig();
    }
  }, [activeTab, fetchLoyaltyConfig]);

  const handleSaveLoyaltyConfig = async () => {
    if (!canConfigRewards) {
      showToast('Bạn chưa có quyền lưu cấu hình điểm thưởng', 'error');
      return;
    }
    setSavingLoyalty(true);
    try {
      const res = await api.put('/marketing/loyalty-config', loyaltyConfig);
      if (res.data.success) {
        // Đổi thành showToast để đồng bộ với cấu trúc thông báo nội bộ của trang
        showToast('Lưu cấu hình hệ thống thành công!', 'success');
        setLoyaltyConfig(res.data.config);
      }
    } catch (e) {
      // Đổi thành showToast và truyền trạng thái 'error'
      showToast(e.response?.data?.message || 'Lỗi khi lưu cấu hình', 'error');
    } finally {
      setSavingLoyalty(false);
    }
  };

  // Thêm hàm xử lý upload ảnh gọi API /api/upload/image

  // Thêm hàm xử lý upload ảnh gọi API /api/upload/image
  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.url) {
        setFormData(prev => ({ ...prev, [fieldName]: res.data.url }));
        showToast('Tải ảnh lên thành công!');
      }
    } catch (err) {
      showToast('Lỗi khi tải ảnh lên', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = null; // Reset input file để có thể chọn lại cùng 1 ảnh
    }
  };
  const [confirmDelete,    setConfirmDelete]    = useState(null); // id cần xóa
  const [searchTable,      setSearchTable]      = useState('');
  const [previewWheel,     setPreviewWheel]     = useState(false);
  // ✅ Wheel Event state
  const [wheelEvents,      setWheelEvents]      = useState([]);
  const [showWheelModal,   setShowWheelModal]   = useState(false);
  const [editingWheel,     setEditingWheel]     = useState(null);
  const [wheelForm,        setWheelForm]        = useState(INIT_WHEEL_FORM);
  const [winners,          setWinners]          = useState([]);
  const [showWinners,      setShowWinners]      = useState(false);
  const [wheelSubmitting,  setWheelSubmitting]  = useState(false);
  const [gamePromos,       setGamePromos]       = useState([]);

  

  // ── Helpers ──────────────────────────────────────────────────────────────
  const showToast = (msg, type='success') => {
    if (type === 'error') {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };

  const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const fmtMoney  = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
  const fmtDisc   = (p) => p.discount_type === 'percentage'
    ? `Giảm ${p.discount_value}%`
    : `Giảm ${fmtMoney(p.discount_value)}`;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketingService.getAllPromotions();
      if (res.success) setPromotions(res.promotions);
    } catch { showToast('Lỗi tải danh sách', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  // Tự động mở modal tạo voucher nếu navigate từ trang vòng quay
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create' && params.get('type') === 'wheel' && canCreateGame) {
      setActiveTab('game');
      setEditingPromo(null);
      setFormData({
        ...INIT_FORM,
        is_game_reward: true,
        game_type: 'lucky_wheel',
        code: 'WHEEL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      });
      setSearchTerm('');
      setShowModal(true);
      // Xóa params khỏi URL để không bị mở lại khi refresh
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [canCreateGame]);

  // ✅ Fetch wheel events khi vào tab wheel
  const fetchWheelEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketingService.getWheelEvents();
      if (res.success) setWheelEvents(res.wheel_events);
    } catch { showToast('Lỗi tải vòng quay', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'wheel') { fetchWheelEvents(); fetchPromotions(); }
  }, [activeTab, fetchWheelEvents]);
  // Load danh sách promotion game để chọn khi tạo prize
  useEffect(() => {
    if (showWheelModal) {
      marketingService.getAllPromotions()
        .then(res => { if (res.success) setGamePromos(res.promotions.filter(p => p.is_game_reward)); })
        .catch(() => {});
    }
  }, [showWheelModal]);

  // Fetch items khi thay đổi apply_for
  useEffect(() => {
    if (formData.apply_for === 'all') { setSelectionData([]); return; }
    setLoadingSel(true);
    setFormData(prev => ({ ...prev, applicable_ids: [] }));
    marketingService.getSelectionData(formData.apply_for)
      .then(res => { if (res.success) setSelectionData(res.data); })
      .catch(() => {})
      .finally(() => setLoadingSel(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.apply_for]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const set = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  const openCreate = () => {
    const isWheel = activeTab === 'wheel' || activeTab === 'game';
    const isExchange = activeTab === 'exchange';
    if (isWheel ? !canCreateGame : !canCreateVoucher) return;
    setEditingPromo(null);
    setFormData({
      ...INIT_FORM,
      voucher_type: isWheel ? 'wheel' : isExchange ? 'exchange' : 'normal',
      is_game_reward: isWheel,
      is_exchange_reward: isExchange,
      game_type: isWheel ? 'lucky_wheel' : 'none',
    });
    setSearchTerm('');
    setShowModal(true);
  };

  const openEdit = (promo) => {
    if (!canEditVoucher) return;
    setEditingPromo(promo);
    // parse applicable_ids từ string DB → array
    const ids = promo.applicable_ids
      ? promo.applicable_ids.split(',').map(Number).filter(Boolean)
      : [];
    // format datetime-local
    const toLocalDT = (d) => d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0,16) : '';
    setFormData({
      ...INIT_FORM,
      ...promo,
      voucher_type: promo.is_game_reward ? 'wheel' : promo.is_exchange_reward ? 'exchange' : 'normal',
      applicable_ids: ids,
      start_date: toLocalDT(promo.start_date),
      end_date:   toLocalDT(promo.end_date),
      external_code:   promo.external_code   || '',
      reward_image_url: promo.reward_image_url || '',
      image_url: promo.image_url || '',
      exchange_limit: promo.exchange_limit !== undefined ? promo.exchange_limit : -1,
    });
    setSearchTerm('');
    setShowModal(true);
  };

  const handleToggleId = (id) => {
    setFormData(prev => {
      const has = prev.applicable_ids.includes(id);
      return { ...prev, applicable_ids: has ? prev.applicable_ids.filter(x => x !== id) : [...prev.applicable_ids, id] };
    });
  };

  const filteredSel = selectionData.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingPromo ? !canEditVoucher : (!formData.is_game_reward ? !canCreateVoucher : !canCreateGame)) {
      showToast('Bạn chưa có quyền thao tác mục này', 'error');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      showToast('Vui lòng chọn ngày bắt đầu và kết thúc', 'error'); return;
    }
    setSubmitting(true);
    const payload = {
      ...formData,
      code: formData.code.toUpperCase(),
      applicable_ids: formData.apply_for === 'all' ? [] : formData.applicable_ids,
    };
    try {
      if (editingPromo) {
        await marketingService.updatePromotion(editingPromo.id, payload);
        showToast('Cập nhật thành công!');
        setShowModal(false);
        fetchPromotions();
      } else {
        await marketingService.createPromotion(payload);
        showToast('Tạo khuyến mãi thành công!');
        setShowModal(false);
        // Nếu được mở từ trang vòng quay → quay lại trang vòng quay
        const fromWheel = sessionStorage.getItem('wheel_modal_open');
        if (fromWheel === 'true') {
          navigate('/quan-ly-khuyen-mai?tab=games');
        } else {
          fetchPromotions();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally { setSubmitting(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (!canDeleteVoucher) return showToast('Bạn chưa có quyền xóa voucher', 'error');
    try {
      await marketingService.deletePromotion(confirmDelete);
      showToast('Đã xóa khuyến mãi');
      setConfirmDelete(null);
      fetchPromotions();
    } catch { showToast('Lỗi khi xóa', 'error'); }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (promo) => {
    if (!canEditVoucher) return;
    try {
      const res = await marketingService.togglePromotion(promo.id);
      if (res.success) {
        showToast(res.message);
        setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: res.is_active } : p));
      }
    } catch { showToast('Lỗi bật/tắt', 'error'); }
  };

  // ── Wheel form helpers ────────────────────────────────────
  const setWheelField = (k, v) => setWheelForm(prev => ({ ...prev, [k]: v }));

  const setPrize = (idx, k, v) => setWheelForm(prev => ({
    ...prev,
    prizes: prev.prizes.map((p, i) => i === idx ? { ...p, [k]: v } : p)
  }));

  const addPrize = () => setWheelForm(prev => ({
    ...prev,
    prizes: [...prev.prizes, {
      label: 'Ô mới', promotion_id: '', reward_type: 'voucher',
      external_code: '', reward_image_url: '',
      probability: 0, quantity: -1,
      color: WHEEL_COLORS_DEFAULT[prev.prizes.length % WHEEL_COLORS_DEFAULT.length], is_miss: false
    }]
  }));

  const removePrize = (idx) => setWheelForm(prev => ({
    ...prev,
    prizes: prev.prizes.filter((_, i) => i !== idx)
  }));

  const totalProb = wheelForm.prizes.reduce((s, p) => s + parseFloat(p.probability || 0), 0);

  const openCreateWheel = () => {
    if (!canCreateGame) return;
    setEditingWheel(null);
    setWheelForm(INIT_WHEEL_FORM);
    setShowWheelModal(true);
  };

  const openEditWheel = (ev) => {
    if (!canEditVoucher && !canCreateGame) return;
    setEditingWheel(ev);
    const toLocalDT = (d) => d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset()*60000).toISOString().slice(0,16) : '';
    setWheelForm({
      name:          ev.name,
      description:   ev.description || '',
      banner_url:    ev.banner_url  || '',
      start_date:    toLocalDT(ev.start_date),
      end_date:      toLocalDT(ev.end_date),
      spins_per_day: ev.spins_per_day,
      cost_per_spin: ev.cost_per_spin,
      prizes: (ev.prizes || []).map(p => ({
        ...p,
        promotion_id:    p.promotion_id || '',
        reward_type:     p.reward_type || 'voucher',
        external_code:   p.external_code || '',
        reward_image_url: p.reward_image_url || '',
        probability:     parseFloat(p.probability),
        quantity:     p.quantity,
        color:        p.color || '#16a34a',
        is_miss:      p.is_miss || false
      }))
    });
    setShowWheelModal(true);
  };

  const handleWheelSubmit = async (e) => {
    e.preventDefault();
    if (editingWheel ? !canEditVoucher : !canCreateGame) {
      showToast('Bạn chưa có quyền thao tác vòng quay', 'error');
      return;
    }
    if (Math.abs(totalProb - 100) > 0.5)
      return showToast(`Tổng tỷ lệ = ${totalProb.toFixed(1)}% (phải đúng 100%)`, 'error');
    setWheelSubmitting(true);
    try {
      if (editingWheel) {
        await marketingService.updateWheelEvent(editingWheel.id, wheelForm);
        showToast('Cập nhật vòng quay thành công!');
      } else {
        await marketingService.createWheelEvent(wheelForm);
        showToast('Tạo vòng quay thành công!');
      }
      setShowWheelModal(false);
      fetchWheelEvents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    } finally { setWheelSubmitting(false); }
  };

  const handleToggleWheel = async (ev) => {
    if (!canEditVoucher && !canCreateGame) return;
    try {
      const res = await marketingService.toggleWheelEvent(ev.id);
      if (res.success) { showToast(res.message); fetchWheelEvents(); }
    } catch { showToast('Lỗi bật/tắt', 'error'); }
  };

  const handleDeleteWheel = async (id) => {
    if (!window.confirm('Xóa vòng quay này?')) return;
    if (!canDeleteVoucher && !canCreateGame) return showToast('Bạn chưa có quyền xóa vòng quay', 'error');
    try {
      await marketingService.deleteWheelEvent(id);
      showToast('Đã xóa vòng quay');
      fetchWheelEvents();
    } catch { showToast('Lỗi xóa', 'error'); }
  };

  const handleViewWinners = async (wheelId) => {
    try {
      const res = await marketingService.getWinners({ wheel_event_id: wheelId });
      if (res.success) { setWinners(res.winners); setShowWinners(true); }
    } catch { showToast('Lỗi tải danh sách trúng thưởng', 'error'); }
  };

  

  // ── Filter table ──────────────────────────────────────────────────────────
  const displayPromos = promotions.filter(p => {
    // 1. Lọc theo từ khóa tìm kiếm (Thêm fallback rỗng '' để tránh lỗi khi dữ liệu null)
    const matchesSearch = (p.code || '').toLowerCase().includes(searchTable.toLowerCase()) ||
                          (p.name || '').toLowerCase().includes(searchTable.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Tự động phân loại dữ liệu hiển thị theo Tab đang được chọn
    if (activeTab === 'vouchers') { // Lưu ý: key tab của bạn là 'vouchers' (có 's')
      return !p.is_game_reward && !p.is_exchange_reward;
    }
    if (activeTab === 'exchange') {
      return p.is_exchange_reward === true;
    }
    return true;
  });

  // ── Wheel preview data ────────────────────────────────────────────────────

  // ── Wheel preview data ────────────────────────────────────────────────────
  const WHEEL_COLORS = ['#16a34a','#d97706','#2563eb','#ea580c','#7c3aed','#db2777','#0891b2'];
  const gameRewards = promotions.filter(p => p.is_game_reward && p.is_active);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="discount-management-page">

      {/* Toast */}
      {toast && (
        <div className={`discount-management-page-toast discount-management-page-toast--${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="discount-management-page-header">
        <div>
          <h1 className="discount-management-page-title">Quản lý Khuyến mãi</h1>
          <p className="discount-management-page-sub">Tạo và quản lý voucher, phần thưởng game, đổi điểm cho bệnh nhân</p>
        </div>
        <div className="discount-management-page-header-stats">
          <div className="discount-management-page-stat">
            <span className="discount-management-page-stat-num">{promotions.filter(p => p.status === 'running').length}</span>
            <span className="discount-management-page-stat-label">Đang chạy</span>
          </div>
          <div className="discount-management-page-stat discount-management-page-stat--gold">
            <span className="discount-management-page-stat-num">{promotions.filter(p => p.is_game_reward).length}</span>
            <span className="discount-management-page-stat-label">Game</span>
          </div>
          <div className="discount-management-page-stat discount-management-page-stat--blue">
            <span className="discount-management-page-stat-num">{promotions.reduce((s, p) => s + (p.usage_count || 0), 0)}</span>
            <span className="discount-management-page-stat-label">Đã dùng</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="discount-management-page-tabs">
        {TYPE_TAB.map(t => (
          <button
            key={t.key}
            className={`discount-management-page-tab ${activeTab === t.key ? 'discount-management-page-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span className="discount-management-page-tab-icon">{t.icon}</span> {t.label}
            <span className="discount-management-page-tab-count">
              {promotions.filter(p => {
                if (t.key === 'exchange') return p.is_exchange_reward && !p.is_game_reward;
                return !p.is_game_reward && !p.is_exchange_reward;
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── BỔ SUNG: Khối cấu hình Điểm danh & Quy tắc Đổi điểm từ MarketingManagementPage ── */}
      {activeTab === 'exchange' && (
        <div className="discount-management-page-loyalty-config-zone">
          <div className="dmp-section-title" style={{ marginTop: 0, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚙️ Cấu hình hệ thống tích điểm & Thưởng danh</span>
            <button className="dmp-btn dmp-btn--primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleSaveLoyaltyConfig} disabled={savingLoyalty || !canConfigRewards}>
              {savingLoyalty ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
            </button>
          </div>
          <div className="discount-management-page-loyalty-grid">
            <div className="discount-management-page-loyalty-card">
              <div className="discount-management-page-loyalty-card-header">
                <span className="discount-management-page-loyalty-icon">📅</span>
                <h4>Cấu hình điểm danh hằng ngày</h4>
              </div>
              <div className="discount-management-page-loyalty-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
                  <span style={{ fontWeight: 600 }}>Điểm thưởng cơ bản:</span>
                  <div className="dmp-input-group" style={{ width: 140 }}>
                    <input type="number" min="0" className="dmp-input dmp-input--sm" value={loyaltyConfig.daily_checkin_points} onChange={e => setLoyaltyConfig(prev => ({...prev, daily_checkin_points: e.target.value}))} />
                    <span className="dmp-input-suffix">điểm/ngày</span>
                  </div>
                </div>
                <p>Cơ chế chuỗi ngày: <span className="discount-management-page-text-muted">Tự động cộng dồn tối đa 7 ngày liên tiếp để nhận quà chuỗi</span></p>
                <div className="discount-management-page-card-status"><span className="discount-management-page-dot-running"></span> Hệ thống đang vận hành</div>
              </div>
            </div>
            {/* Đã xóa thẻ cấu hình trò chơi vòng quay ở đây */}
          </div>
        </div>
      )}
      {activeTab !== 'wheel' && (
        <>
          {/* Toolbar */}
          <div className="discount-management-page-toolbar">
            <div className="discount-management-page-search-wrap">
              <span className="discount-management-page-search-icon">🔍</span>
              <input
                className="discount-management-page-search"
                placeholder={activeTab === 'exchange' ? "Tìm kiếm quà đổi điểm..." : "Tìm theo mã code, tên chương trình..."}
                value={searchTable}
                onChange={e => setSearchTable(e.target.value)}
              />
            </div>
            <div className="discount-management-page-toolbar-actions">
              {((activeTab === 'wheel' || activeTab === 'game') ? canCreateGame : canCreateVoucher) && (
                <button className="dmp-btn dmp-btn--primary" onClick={openCreate}>
                  {activeTab === 'exchange' ? '+ Thêm quà đổi điểm' : '+ Thêm mới'}
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="discount-management-page-table-wrap">
            <table className="discount-management-page-table">
              <thead>
                <tr>
                  <th>Mã Code</th>
                  <th>Hình ảnh</th>
                  <th>Tên chương trình</th>
                  <th>{activeTab === 'exchange' ? 'Điểm cần đổi' : 'Loại'}</th>
                  <th>{activeTab === 'exchange' ? 'Giới hạn đổi' : 'Giảm'}</th>
                  <th>Áp dụng</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {displayPromos.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="discount-management-page-center">Không có khuyến mãi phù hợp</td>
                  </tr>
                ) : displayPromos.map(p => {
                  const status = p.status || 'running';
                  return (
                    <tr key={p.id}>
                      <td>{p.code}</td>
                      <td>
                        {p.image_url ? (
                          <img 
                            src={p.image_url} 
                            alt={p.name} 
                            style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--dmp-border)' }} 
                          />
                        ) : (
                          <div style={{ width: '45px', height: '45px', background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>
                            Trống
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="discount-management-page-name">{p.name}</div>
                        {p.description && <div className="discount-management-page-desc">{p.description}</div>}
                      </td>
                      
                      {/* Biến đổi cột hiển thị linh hoạt theo Tab */}
                      <td>
                        {activeTab === 'exchange' ? (
                          <span style={{ fontWeight: 700, color: '#d97706' }}>⭐ {p.exchange_points || 0} điểm</span>
                        ) : (
                          p.discount_type === 'percentage' ? 'Phần trăm (%)' : 'Số tiền cố định'
                        )}
                      </td>
                      <td>
                        {activeTab === 'exchange' ? (
                          p.exchange_limit === -1 ? 'Không giới hạn' : `${p.exchange_limit} lần/người`
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--dmp-primary)' }}>
                            {p.discount_type === 'percentage' ? `Giảm ${p.discount_value}%` : `Giảm ${Number(p.discount_value).toLocaleString('vi-VN')}đ`}
                          </span>
                        )}
                      </td>

                      <td>
                        {(() => {
                          const used = p.usage_count || 0;
                          const limit = p.usage_limit || 0;
                          const remaining = limit - used;
                          const pct = limit > 0 ? (used / limit) * 100 : 0;
                          return (
                            <div style={{ minWidth: 90 }}>
                              <div style={{
                                fontSize: '12px', fontWeight: 600, marginBottom: 3,
                                color: remaining <= 0 ? '#dc2626' : remaining <= 10 ? '#d97706' : '#059669'
                              }}>
                                {used}/{limit}
                                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>
                                  (còn {remaining})
                                </span>
                              </div>
                              <div style={{ height: 5, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 99,
                                  width: `${Math.min(pct, 100)}%`,
                                  background: pct >= 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#10b981',
                                  transition: 'width 0.3s'
                                }} />
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        {p.apply_for === 'all' ? 'Tất cả hóa đơn' 
                         : p.apply_for === 'service' ? 'Dịch vụ khám' 
                         : p.apply_for === 'medicine' ? 'Hiệu thuốc' 
                         : 'Gói tư vấn'}
                      </td>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(p.start_date).toLocaleDateString('vi-VN')}<br/>
                        → {new Date(p.end_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <span className={STATUS_MAP[status]?.cls || 'dmp-badge'}>
                          {STATUS_MAP[status]?.label || status}
                        </span>
                      </td>
                      <td className="discount-management-page-center">
                        <div className="discount-management-page-actions">
                          {canEditVoucher && <button className="discount-management-page-icon-btn discount-management-page-icon-btn--edit" onClick={() => openEdit(p)} title="Sửa">✏️</button>}
                          {canDeleteVoucher && <button className="discount-management-page-icon-btn discount-management-page-icon-btn--del"  onClick={() => setConfirmDelete(p.id)} title="Xóa">🗑️</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      

      {/* ── MODAL TẠO / SỬA ── */}
      {showModal && (
        <div className="dmp-overlay" style={{ zIndex: 10005 }} onClick={() => setShowModal(false)}>
          <div className="dmp-modal" onClick={e => e.stopPropagation()}>

            <div className="dmp-modal__header">
              <h3>{editingPromo ? '✏️ Chỉnh sửa khuyến mãi' : `➕ Tạo ${activeTab === 'exchange' ? 'voucher đổi điểm' : 'voucher mới'}`}</h3>
              <button className="dmp-modal__close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form className="dmp-modal__body" onSubmit={handleSubmit}>

              {/* ── Thông tin cơ bản ── */}
              <div className="dmp-section-title">Thông tin cơ bản</div>
              <div className="dmp-grid-2">
                <div className="dmp-field">
                  <label>Tên chương trình <span className="dmp-req">*</span></label>
                  <input required value={formData.name} onChange={e => set('name', e.target.value)}
                    placeholder="VD: Ưu đãi mùa hè 30%" className="dmp-input" />
                </div>
                <div className="dmp-field">
                  <label>Mã Code <span className="dmp-req">*</span></label>
                  <input required value={formData.code} onChange={e => set('code', e.target.value.toUpperCase())}
                    placeholder="VD: SUMMER30" className="dmp-input" disabled={!!editingPromo} />
                  {editingPromo && <span className="dmp-hint">Không thể đổi mã đã tạo</span>}
                </div>
                <div className="dmp-field dmp-field--full">
                  <label>Hình ảnh Voucher</label>
                  <div className="discount-management-page-image-upload-wrapper">
                    <input value={formData.image_url} onChange={e => set('image_url', e.target.value)}
                      placeholder="Nhập link URL hoặc tải ảnh lên..." className="dmp-input" style={{ flex: 1 }} />
                    <input type="file" id="upload-image_url" style={{ display: 'none' }} accept="image/*"
                      onChange={e => handleImageUpload(e, 'image_url')} />
                    <label htmlFor="upload-image_url" className="dmp-btn dmp-btn--outline" style={{ margin: 0 }}>
                      {uploadingImage ? '⏳ Đang tải...' : '📁 Tải ảnh'}
                    </label>
                  </div>
                  {formData.image_url && (
                    <div className="discount-management-page-image-preview">
                      <img src={formData.image_url} alt="Preview" />
                    </div>
                  )}
                </div>
                <div className="dmp-field dmp-field--full">
                  <label>Mô tả</label>
                  <textarea value={formData.description} onChange={e => set('description', e.target.value)}
                    placeholder="Mô tả ngắn về chương trình khuyến mãi..." className="dmp-input dmp-textarea" rows={2} />
                </div>
              </div>

              {/* ── Thời gian ── */}
              <div className="dmp-section-title">Thời gian</div>
              <div className="dmp-grid-2">
                <div className="dmp-field">
                  <label>Ngày bắt đầu <span className="dmp-req">*</span></label>
                  <input required type="datetime-local" value={formData.start_date}
                    onChange={e => set('start_date', e.target.value)} className="dmp-input" />
                </div>
                <div className="dmp-field">
                  <label>Ngày kết thúc <span className="dmp-req">*</span></label>
                  <input required type="datetime-local" value={formData.end_date}
                    onChange={e => set('end_date', e.target.value)} className="dmp-input" />
                </div>
              </div>

              {/* ── Phân loại ── */}
              <div className="dmp-section-title">Phân loại</div>
              <div className="dmp-grid-2">
                <div className="dmp-field dmp-field--full">
                  <select value={formData.voucher_type} onChange={e => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      voucher_type: val,
                      is_game_reward: val === 'wheel',
                      is_exchange_reward: val === 'exchange'
                    }));
                  }} className="dmp-input">
                    <option value="normal">🎫 Voucher thường</option>
                    <option value="wheel">🎡 Voucher vòng quay</option>
                    <option value="exchange">⭐ Voucher đổi điểm</option>
                  </select>
                </div>
              </div>

              {/* ── Giá trị & Điều kiện ── */}
              <div className="dmp-section-title">Giá trị & Điều kiện</div>
              <div className="dmp-grid-2">
                <div className="dmp-field">
                  <label>Loại giảm</label>
                  <select value={formData.discount_type} onChange={e => set('discount_type', e.target.value)} className="dmp-input">
                    <option value="percentage">Theo % (phần trăm)</option>
                    <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>
                <div className="dmp-field">
                  <label>Giá trị giảm <span className="dmp-req">*</span></label>
                  <div className="dmp-input-group">
                    <input required type="number" min="0" value={formData.discount_value}
                      onChange={e => set('discount_value', e.target.value)} className="dmp-input" />
                    <span className="dmp-input-suffix">{formData.discount_type === 'percentage' ? '%' : 'đ'}</span>
                  </div>
                </div>
                <div className="dmp-field">
                  <label>Số lượng phát hành</label>
                  <input type="number" min="1" value={formData.usage_limit}
                    onChange={e => set('usage_limit', e.target.value)} className="dmp-input" />
                </div>
                <div className="dmp-field">
                  <label>Đơn hàng tối thiểu</label>
                  <div className="dmp-input-group">
                    <input type="number" min="0" value={formData.min_order_value}
                      onChange={e => set('min_order_value', e.target.value)} className="dmp-input" />
                    <span className="dmp-input-suffix">đ</span>
                  </div>
                </div>
                <div className="dmp-field">
                  <label>Giảm tối đa {formData.discount_type === 'fixed_amount' && <span className="dmp-hint">(Chỉ dùng cho giảm %)</span>}</label>
                  <div className="dmp-input-group">
                    <input type="number" min="0" value={formData.max_discount_amount}
                      onChange={e => set('max_discount_amount', e.target.value)} className="dmp-input"
                      disabled={formData.discount_type === 'fixed_amount'} />
                    <span className="dmp-input-suffix">đ</span>
                  </div>
                </div>
                <div className="dmp-field">
                  <label>Áp dụng cho</label>
                  <select value={formData.apply_for} onChange={e => set('apply_for', e.target.value)} className="dmp-input">
                    <option value="all">Tất cả dịch vụ</option>
                    <option value="service">Chỉ dịch vụ khám</option>
                    <option value="medicine">Chỉ thuốc</option>
                    <option value="consultation">Chỉ gói tư vấn</option>
                  </select>
                </div>
              </div>

              {/* Chọn danh sách cụ thể */}
              {formData.apply_for !== 'all' && (
                <div className="discount-management-page-selection-box">
                  <div className="discount-management-page-selection-header">
                    <span>Chọn {formData.apply_for === 'service' ? 'dịch vụ' : formData.apply_for === 'medicine' ? 'thuốc' : 'gói tư vấn'} cụ thể</span>
                    <span className="discount-management-page-selection-count">{formData.applicable_ids.length} đã chọn</span>
                  </div>
                  <div className="discount-management-page-selection-search">
                    <input placeholder="Tìm kiếm..." value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)} className="dmp-input dmp-input--sm" />
                    <button type="button" className="dmp-btn dmp-btn--xs dmp-btn--green"
                      onClick={() => setFormData(prev => ({ ...prev, applicable_ids: Array.from(new Set([...prev.applicable_ids, ...filteredSel.map(i => i.id)])) }))}>
                      Chọn tất cả
                    </button>
                    <button type="button" className="dmp-btn dmp-btn--xs dmp-btn--red"
                      onClick={() => setFormData(prev => ({ ...prev, applicable_ids: prev.applicable_ids.filter(id => !filteredSel.map(i => i.id).includes(id)) }))}>
                      Bỏ chọn
                    </button>
                  </div>
                  <div className="discount-management-page-selection-list">
                    {loadingSel ? <div className="discount-management-page-loading-row">Đang tải...</div>
                      : filteredSel.length === 0 ? <div className="discount-management-page-loading-row">Không tìm thấy</div>
                      : filteredSel.map(item => (
                        <label key={item.id} className="discount-management-page-selection-item">
                          <input type="checkbox" checked={formData.applicable_ids.includes(item.id)}
                            onChange={() => handleToggleId(item.id)} />
                          <span className="discount-management-page-selection-item-name">{item.name}</span>
                          <span className="discount-management-page-selection-item-price">{fmtMoney(item.price)}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* ── Cấu hình đặc biệt ── */}
              {formData.voucher_type !== 'normal' && (
                <>
                  <div className="dmp-section-title">Cấu hình đặc biệt</div>
                  <div className="discount-management-page-game-config">
                    
                    <label className="discount-management-page-checkbox-row">
                      <input type="checkbox" checked={formData.is_game_reward} disabled />
                      <span>🎮 Sử dụng làm phần thưởng trong Game (Vòng quay)</span>
                    </label>

                    {formData.voucher_type === 'wheel' && (
                      <div className="dmp-grid-2 dmp-game-fields">
                        <div className="dmp-field">
                          <label>Loại game</label>
                          <select value={formData.game_type} onChange={e => set('game_type', e.target.value)} className="dmp-input">
                            <option value="lucky_wheel">Vòng quay may mắn</option>
                            <option value="check_in">Điểm danh</option>
                          </select>
                        </div>
                        <div className="dmp-field">
                          <label>Tỷ lệ trúng (0–100%)</label>
                          <div className="dmp-input-group">
                            <input type="number" min="0" max="100" value={formData.game_probability}
                              onChange={e => set('game_probability', e.target.value)} className="dmp-input" />
                            <span className="dmp-input-suffix">%</span>
                          </div>
                        </div>
                        <div className="dmp-field">
                          <label>Loại phần thưởng</label>
                          <select value={formData.reward_type} onChange={e => set('reward_type', e.target.value)} className="dmp-input">
                            <option value="voucher">Voucher giảm giá</option>
                            <option value="card">Thẻ nạp điện thoại</option>
                            <option value="item">Hiện vật / Quà tặng</option>
                          </select>
                        </div>
                        {(formData.reward_type === 'card' || formData.reward_type === 'item') && (
                          <div className="dmp-field">
                            <label>Mã PIN / Mã nạp thẻ</label>
                            <input value={formData.external_code} onChange={e => set('external_code', e.target.value)}
                              placeholder="Nhập mã nạp thẻ hoặc PIN..." className="dmp-input" />
                          </div>
                        )}
                        <div className="dmp-field dmp-field--full">
                          <label>Ảnh phần thưởng (riêng game)</label>
                          <div className="discount-management-page-image-upload-wrapper">
                            <input value={formData.reward_image_url} onChange={e => set('reward_image_url', e.target.value)}
                              placeholder="Nhập link URL hoặc tải ảnh lên..." className="dmp-input" style={{ flex: 1 }} />
                            <input type="file" id="upload-reward_image_url" style={{ display: 'none' }} accept="image/*"
                              onChange={e => handleImageUpload(e, 'reward_image_url')} />
                            <label htmlFor="upload-reward_image_url" className="dmp-btn dmp-btn--outline" style={{ margin: 0 }}>
                              {uploadingImage ? '⏳ Đang tải...' : '📁 Tải ảnh'}
                            </label>
                          </div>
                          {formData.reward_image_url && (
                            <div className="discount-management-page-image-preview">
                              <img src={formData.reward_image_url} alt="Preview" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <label className="discount-management-page-checkbox-row" style={{ marginTop: 10 }}>
                      <input type="checkbox" checked={formData.is_exchange_reward} disabled />
                      <span>⭐ Hiển thị trong Cửa hàng Đổi Điểm</span>
                    </label>

                    {formData.voucher_type === 'exchange' && (
                      <div className="dmp-grid-2 dmp-game-fields">
                        <div className="dmp-field">
                          <label>Số điểm cần để đổi</label>
                          <div className="dmp-input-group">
                            <input type="number" min="1" value={formData.exchange_points}
                              onChange={e => set('exchange_points', e.target.value)} className="dmp-input" />
                            <span className="dmp-input-suffix">điểm</span>
                          </div>
                        </div>
                        <div className="dmp-field">
                          <label>Giới hạn đổi (Mỗi người) <span className="dmp-hint">(-1 là không giới hạn)</span></label>
                          <div className="dmp-input-group">
                            <input type="number" min="-1" value={formData.exchange_limit}
                              onChange={e => set('exchange_limit', e.target.value)} className="dmp-input" />
                            <span className="dmp-input-suffix">lần</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </>
              )}

              {/* Footer */}
              <div className="dmp-modal__footer">
                <button type="button" className="dmp-btn dmp-btn--ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="dmp-btn dmp-btn--primary" disabled={submitting}>
                  {submitting ? '⏳ Đang lưu...' : editingPromo ? '💾 Cập nhật' : '✨ Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── WHEEL EVENTS TAB ── */}
      {activeTab === 'wheel' && (
        <>
          <div className="discount-management-page-toolbar">
            <div style={{ fontSize: 13, color: 'var(--dmp-text-500)' }}>
              Mỗi sự kiện = 1 vòng quay độc lập. Tổng tỷ lệ các ô phải bằng <b>100%</b>.
            </div>
            <div className="discount-management-page-toolbar-actions">
              {canCreateGame && <button className="dmp-btn dmp-btn--primary" onClick={openCreateWheel}>🎡 Tạo Vòng Quay Mới</button>}
            </div>
          </div>

          {wheelEvents.length === 0 ? (
            <div className="discount-management-page-table-wrap" style={{ padding: 40, textAlign: 'center', color: 'var(--dmp-text-400)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎡</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Chưa có sự kiện vòng quay nào</div>
              <div style={{ fontSize: 13 }}>Nhấn "Tạo Vòng Quay Mới" để bắt đầu</div>
            </div>
          ) : (
            <div className="discount-management-page-table-wrap">
              <table className="discount-management-page-table">
                <thead>
                <tr>
                  <th>Mã Code</th>
                  <th>Hình ảnh</th>
                  <th>Tên chương trình</th>
                  <th>{activeTab === 'exchange' ? 'Điểm cần đổi' : 'Loại'}</th>
                  <th>{activeTab === 'exchange' ? 'Giới hạn đổi' : 'Giảm'}</th>
                  <th>Số lượng</th>
                  <th>Áp dụng</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
                <tbody>
                  {wheelEvents.map(ev => (
                    <tr key={ev.id}>
                      <td>
                        <div className="discount-management-page-name">{ev.name}</div>
                        {ev.description && <div className="discount-management-page-desc">{ev.description.substring(0,50)}</div>}
                      </td>
                      <td className="discount-management-page-dates">
                        <span>{fmtDate(ev.start_date)}</span>
                        <span className="discount-management-page-dates-sep">→</span>
                        <span>{fmtDate(ev.end_date)}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div>🔄 {ev.spins_per_day} lượt/ngày</div>
                        <div>⭐ {ev.cost_per_spin} điểm/lượt</div>
                      </td>
                      <td className="discount-management-page-center">
                        <b style={{ color: 'var(--dmp-blue)' }}>{ev.prizes?.length || 0} ô</b>
                      </td>
                      <td className="discount-management-page-center">
                        <b>{ev.stats?.totalPlays || 0}</b>
                      </td>
                      <td className="discount-management-page-center">
                        <b style={{ color: 'var(--dmp-primary)' }}>{ev.stats?.totalWins || 0}</b>
                        {ev.stats?.totalPlays > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--dmp-text-400)' }}>
                            ({ev.stats.winRate}%)
                          </div>
                        )}
                      </td>
                      <td>
                        {(() => {
                          const now = new Date();
                          const s = new Date(ev.start_date), e = new Date(ev.end_date);
                          if (!ev.is_active)   return <span className="dmp-badge dmp-badge--gray">Tắt</span>;
                          if (now < s)         return <span className="dmp-badge dmp-badge--blue">Sắp diễn ra</span>;
                          if (now > e)         return <span className="dmp-badge dmp-badge--red">Đã kết thúc</span>;
                          return <span className="dmp-badge dmp-badge--green">Đang chạy</span>;
                        })()}
                      </td>
                      <td className="discount-management-page-center">
                          <button
                          className={`discount-management-page-toggle ${ev.is_active ? 'discount-management-page-toggle--on' : 'discount-management-page-toggle--off'}`}
                          onClick={() => handleToggleWheel(ev)}
                          disabled={!canEditVoucher && !canCreateGame}
                        ><span className="discount-management-page-toggle-knob" /></button>
                      </td>
                      <td className="discount-management-page-center">
                        <div className="discount-management-page-actions">
                          <button className="discount-management-page-icon-btn" style={{ background: '#f0fdf4' }} onClick={() => handleViewWinners(ev.id)} title="Xem người trúng">🏆</button>
                          {(canEditVoucher || canCreateGame) && <button className="discount-management-page-icon-btn discount-management-page-icon-btn--edit" onClick={() => openEditWheel(ev)} title="Sửa">✏️</button>}
                          {(canDeleteVoucher || canCreateGame) && <button className="discount-management-page-icon-btn discount-management-page-icon-btn--del"  onClick={() => handleDeleteWheel(ev.id)} title="Xóa">🗑️</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── CONFIRM DELETE ── */}
      {confirmDelete && (
        <div className="dmp-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="discount-management-page-confirm" onClick={e => e.stopPropagation()}>
            <div className="discount-management-page-confirm-icon">🗑️</div>
            <h3>Xác nhận xóa</h3>
            <p>Thao tác này không thể hoàn tác. Bạn có chắc chắn muốn xóa khuyến mãi này không?</p>
            <div className="discount-management-page-confirm-actions">
              <button className="dmp-btn dmp-btn--ghost" onClick={() => setConfirmDelete(null)}>Hủy</button>
              <button className="dmp-btn dmp-btn--danger" onClick={handleDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW VÒNG QUAY ── */}
      {previewWheel && (
        <div className="dmp-overlay" onClick={() => setPreviewWheel(false)}>
          <div className="discount-management-page-wheel-preview" onClick={e => e.stopPropagation()}>
            <div className="discount-management-page-wheel-preview-header">
              <h3>Xem trước vòng quay</h3>
              <button className="dmp-modal__close" onClick={() => setPreviewWheel(false)}>✕</button>
            </div>
            <div className="discount-management-page-wheel-preview-body">
              {gameRewards.length === 0 ? (
                <p className="discount-management-page-preview-empty">Chưa có phần thưởng game nào đang hoạt động.</p>
              ) : (
                <>
                  <div className="discount-management-page-wheel-circle"
                    style={{
                      background: `conic-gradient(${gameRewards.map((_, i) => {
                        const s = 360 / gameRewards.length;
                        return `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * s}deg ${(i + 1) * s}deg`;
                      }).join(', ')})`,
                    }}
                  >
                    <div className="discount-management-page-wheel-circle-center">SPIN</div>
                  </div>
                  <div className="discount-management-page-wheel-legend">
                    {gameRewards.map((r, i) => (
                      <div key={r.id} className="discount-management-page-wheel-legend-item">
                        <span className="discount-management-page-wheel-legend-dot" style={{ background: WHEEL_COLORS[i % WHEEL_COLORS.length] }} />
                        <span>{r.name}</span>
                        <span className="discount-management-page-wheel-legend-prob">{r.game_probability}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WHEEL EVENT MODAL ── */}
      {showWheelModal && (
        <div className="dmp-overlay" onClick={() => setShowWheelModal(false)}>
          <div className="dmp-modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="dmp-modal__header">
              <h3>{editingWheel ? '✏️ Sửa Vòng Quay' : '🎡 Tạo Sự Kiện Vòng Quay Mới'}</h3>
              <button className="dmp-modal__close" onClick={() => setShowWheelModal(false)}>✕</button>
            </div>
            <form className="dmp-modal__body" onSubmit={handleWheelSubmit}>

              <div className="dmp-section-title">Thông tin sự kiện</div>
              <div className="dmp-grid-2">
                <div className="dmp-field dmp-field--full">
                  <label>Tên vòng quay <span className="dmp-req">*</span></label>
                  <input required value={wheelForm.name} onChange={e => setWheelField('name', e.target.value)}
                    placeholder="VD: Vòng quay Tháng 6 - Sức Khỏe Vàng" className="dmp-input" />
                </div>
                <div className="dmp-field">
                  <label>Ngày bắt đầu <span className="dmp-req">*</span></label>
                  <input required type="datetime-local" value={wheelForm.start_date}
                    onChange={e => setWheelField('start_date', e.target.value)} className="dmp-input" />
                </div>
                <div className="dmp-field">
                  <label>Ngày kết thúc <span className="dmp-req">*</span></label>
                  <input required type="datetime-local" value={wheelForm.end_date}
                    onChange={e => setWheelField('end_date', e.target.value)} className="dmp-input" />
                </div>
                <div className="dmp-field">
                  <label>Lượt quay tối đa / ngày</label>
                  <input type="number" min="1" max="10" value={wheelForm.spins_per_day}
                    onChange={e => setWheelField('spins_per_day', e.target.value)} className="dmp-input" />
                </div>
                <div className="dmp-field">
                  <label>Chi phí mỗi lượt (điểm)</label>
                  <input type="number" min="0" value={wheelForm.cost_per_spin}
                    onChange={e => setWheelField('cost_per_spin', e.target.value)} className="dmp-input" />
                </div>
              </div>

              {/* Danh sách ô thưởng */}
              <div className="dmp-section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>Cấu hình các ô thưởng</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: Math.abs(totalProb - 100) < 0.5 ? 'var(--dmp-primary)' : '#dc2626'
                }}>
                  Tổng: {totalProb.toFixed(1)}% {Math.abs(totalProb-100) < 0.5 ? '✓' : '(phải = 100%)'}
                </span>
              </div>

              {/* Preview nhỏ */}
              {wheelForm.prizes.length > 0 && (
                <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                  <div style={{
                    width:120, height:120, borderRadius:'50%', flexShrink:0,
                    background: `conic-gradient(${wheelForm.prizes.map((p,i)=>{
                      const s = 360/wheelForm.prizes.length;
                      return `${p.color||WHEEL_COLORS_DEFAULT[i%WHEEL_COLORS_DEFAULT.length]} ${i*s}deg ${(i+1)*s}deg`;
                    }).join(',')})`,
                    boxShadow:'0 4px 14px rgba(0,0,0,0.12)',
                    border:'4px solid white',
                    position:'relative'
                  }}>
                    <div style={{
                      position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                      width:32, height:32, borderRadius:'50%', background:'white',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, fontWeight:800, color:'var(--dmp-gold)', boxShadow:'0 1px 4px rgba(0,0,0,0.15)'
                    }}>SPIN</div>
                  </div>
                </div>
              )}

              {/* Bar tổng % trực quan */}
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'var(--dmp-text-400)' }}>Phân bổ tỷ lệ</span>
                  <span style={{ fontWeight:700, color: Math.abs(totalProb-100)<0.5 ? '#16a34a' : '#dc2626' }}>
                    {totalProb.toFixed(1)}% / 100%
                  </span>
                </div>
                <div style={{ height:8, borderRadius:4, background:'#e2e8f0', overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:4, transition:'width 0.3s',
                    background: `conic-gradient(${wheelForm.prizes.map((p,i)=>{
                      const s=360/wheelForm.prizes.length;
                      return `${p.color||WHEEL_COLORS_DEFAULT[i%WHEEL_COLORS_DEFAULT.length]} ${i*s}deg ${(i+1)*s}deg`;
                    }).join(',')})`,
                    width: `${Math.min(totalProb,100)}%`,
                    background: Math.abs(totalProb-100)<0.5 ? '#16a34a' : totalProb>100 ? '#dc2626' : '#f59e0b'
                  }} />
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                  {wheelForm.prizes.map((p,i)=>(
                    <span key={i} style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:p.color||WHEEL_COLORS_DEFAULT[i%WHEEL_COLORS_DEFAULT.length], display:'inline-block' }}/>
                      {p.label||'Ô '+(i+1)}: <b>{p.probability}%</b>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                {wheelForm.prizes.map((prize, idx) => (
                  <div key={idx} style={{
                    background: prize.is_miss ? '#f8fafc' : '#f0fdf4',
                    border: `1.5px solid ${prize.is_miss ? '#e2e8f0' : '#bbf7d0'}`,
                    borderRadius:10, padding:'10px 12px'
                  }}>
                    {/* Row 1: màu + tên + xóa */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <input type="color" value={prize.color || '#16a34a'}
                        onChange={e => setPrize(idx,'color',e.target.value)}
                        style={{ width:28, height:28, border:'2px solid #e2e8f0', cursor:'pointer', borderRadius:6, padding:2, flexShrink:0 }} />
                      <input value={prize.label} onChange={e => setPrize(idx,'label',e.target.value)}
                        placeholder="Tên ô thưởng" className="dmp-input dmp-input--sm" style={{ flex:1 }} />
                      <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, whiteSpace:'nowrap',
                        background: prize.is_miss?'#fee2e2':'#f1f5f9', borderRadius:6, padding:'4px 8px', cursor:'pointer' }}>
                        <input type="checkbox" checked={prize.is_miss}
                          onChange={e => setPrize(idx,'is_miss',e.target.checked)} />
                        😢 Mất lượt
                      </label>
                      <button type="button" onClick={() => removePrize(idx)}
                        style={{ background:'#fee2e2', border:'none', cursor:'pointer', color:'#dc2626',
                          width:28, height:28, borderRadius:6, fontSize:14, flexShrink:0 }}>✕</button>
                    </div>

                    {/* Row 2: % + số lượng (trực quan hơn) */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom: prize.is_miss ? 0 : 8 }}>
                      <div>
                        <div style={{ fontSize:11, color:'var(--dmp-text-400)', marginBottom:3 }}>
                          Tỷ lệ trúng &nbsp;
                          <span style={{ fontSize:10, color:'var(--dmp-text-300)' }}>(Nhập 0–100, tổng = 100%)</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <input type="range" min="0" max="100" step="0.5"
                            value={prize.probability}
                            onChange={e => setPrize(idx,'probability',parseFloat(e.target.value)||0)}
                            style={{ flex:1, accentColor: prize.color||'#16a34a' }} />
                          <div className="dmp-input-group" style={{ width:80 }}>
                            <input type="number" min="0" max="100" step="0.5"
                              value={prize.probability}
                              onChange={e => setPrize(idx,'probability',parseFloat(e.target.value)||0)}
                              className="dmp-input dmp-input--sm" />
                            <span className="dmp-input-suffix">%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:'var(--dmp-text-400)', marginBottom:3 }}>
                          Số lượng &nbsp;<span style={{ fontSize:10, color:'var(--dmp-text-300)' }}>(-1 = không giới hạn)</span>
                        </div>
                        <div className="dmp-input-group">
                          <input type="number" min="-1" value={prize.quantity}
                            onChange={e => setPrize(idx,'quantity',parseInt(e.target.value)||-1)}
                            className="dmp-input dmp-input--sm" />
                          <span className="dmp-input-suffix">sl</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: loại phần thưởng (chỉ hiện khi không phải mất lượt) */}
                    {!prize.is_miss && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div>
                          <div style={{ fontSize:11, color:'var(--dmp-text-400)', marginBottom:3 }}>Loại phần thưởng</div>
                          <select value={prize.reward_type || 'voucher'}
                            onChange={e => setPrize(idx,'reward_type',e.target.value)}
                            className="dmp-input dmp-input--sm">
                            <option value="voucher">🎫 Voucher giảm giá</option>
                            <option value="card">📱 Thẻ nạp điện thoại</option>
                            <option value="item">🎁 Hiện vật / Quà tặng</option>
                          </select>
                        </div>
                        {/* Chọn voucher từ kho nếu loại = voucher */}
                        {(!prize.reward_type || prize.reward_type === 'voucher') && (
                          <div>
                            <div style={{ fontSize:11, color:'var(--dmp-text-400)', marginBottom:3 }}>Chọn voucher từ kho</div>
                            {/* Thêm alignItems: 'stretch' để 2 ô tự động cao bằng nhau */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
                              <select value={prize.promotion_id || ''}
                                onChange={e => setPrize(idx,'promotion_id',e.target.value)}
                                className="dmp-input dmp-input--sm" style={{ flex: 1, margin: 0 }}>
                                <option value="">-- Chọn voucher --</option>
                                {promotions.filter(p => p.is_active).map(p => (
                                    <option key={p.id} value={p.id}>
                                      [{p.is_game_reward ? '🎡' : p.is_exchange_reward ? '⭐' : '🎫'}] {p.name} ({p.discount_type === 'percentage' ? p.discount_value + '%' : Number(p.discount_value).toLocaleString('vi-VN') + 'đ'})
                                    </option>
                                  ))}
                              </select>
                              <button 
                                type="button" 
                                className="dmp-btn dmp-btn--outline" 
                                /* Tùy chỉnh lại CSS của button để căn giữa chữ và triệt tiêu margin */
                                style={{ padding: '0 10px', fontSize: '11px', margin: 0, display: 'flex', alignItems: 'center' }}
                                onClick={() => {
                                  setEditingPromo(null);
                                  setFormData({
                                    ...INIT_FORM,
                                    code: 'WHEEL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                                    name: prize.label || '',
                                    voucher_type: 'wheel',
                                    is_game_reward: true,
                                    game_type: 'lucky_wheel',
                                    usage_limit: prize.quantity > 0 ? prize.quantity : 100,
                                    start_date: wheelForm.start_date || '',
                                    end_date: wheelForm.end_date || ''
                                  });
                                  setShowModal(true);
                                }}
                                title="Mở form tạo mới Voucher"
                              >
                                ➕ Tạo mới
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Mã PIN nếu loại = card hoặc item */}
                        {(prize.reward_type === 'card' || prize.reward_type === 'item') && (
                          <div>
                            <div style={{ fontSize:11, color:'var(--dmp-text-400)', marginBottom:3 }}>
                              {prize.reward_type === 'card' ? 'Mã PIN / Mã nạp thẻ' : 'Mã quà tặng'}
                            </div>
                            <input value={prize.external_code || ''}
                              onChange={e => setPrize(idx,'external_code',e.target.value)}
                              placeholder={prize.reward_type === 'card' ? 'VD: 0123-4567-8901' : 'Mã hiện vật...'}
                              className="dmp-input dmp-input--sm" />
                          </div>
                        )}
                        {/* URL ảnh */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ fontSize:11, color:'var(--dmp-text-400)', marginBottom:3 }}>
                            URL ảnh phần thưởng &nbsp;<span style={{ fontSize:10 }}>(ảnh thẻ cào, quà tặng...)</span>
                          </div>
                          <input value={prize.reward_image_url || ''}
                            onChange={e => setPrize(idx,'reward_image_url',e.target.value)}
                            placeholder="https://... (để trống nếu không có)"
                            className="dmp-input dmp-input--sm" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addPrize}
                  className="dmp-btn dmp-btn--ghost" style={{ alignSelf:'flex-start' }}>
                  + Thêm ô thưởng
                </button>
              </div>

              <div className="dmp-modal__footer">
                <button type="button" className="dmp-btn dmp-btn--ghost" onClick={() => setShowWheelModal(false)}>Hủy</button>
                <button type="submit" className="dmp-btn dmp-btn--primary" disabled={wheelSubmitting || Math.abs(totalProb-100)>0.5 || (editingWheel ? !canEditVoucher : !canCreateGame)}>
                  {wheelSubmitting ? '⏳ Đang lưu...' : editingWheel ? '💾 Cập nhật' : '🎡 Tạo vòng quay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      

      {/* ── WINNERS MODAL ── */}
      {showWinners && (
        <div className="dmp-overlay" onClick={() => setShowWinners(false)}>
          <div className="dmp-modal" style={{ maxWidth:640 }} onClick={e => e.stopPropagation()}>
            <div className="dmp-modal__header">
              <h3>🏆 Danh sách người trúng thưởng</h3>
              <button className="dmp-modal__close" onClick={() => setShowWinners(false)}>✕</button>
            </div>
            <div className="dmp-modal__body">
              {winners.length === 0 ? (
                <p style={{ textAlign:'center', color:'var(--dmp-text-400)', padding:24 }}>Chưa có ai trúng thưởng</p>
              ) : (
                <table className="discount-management-page-table">
                  <thead>
                    <tr><th>Người chơi</th><th>Phần thưởng</th><th>Thời gian</th><th>Điểm dùng</th></tr>
                  </thead>
                  <tbody>
                    {winners.map(w => (
                      <tr key={w.id}>
                        <td>
                          <div className="discount-management-page-name">{w.user?.full_name || 'Ẩn danh'}</div>
                          <div className="discount-management-page-desc">{w.user?.phone || w.user?.email || ''}</div>
                        </td>
                        <td>
                          <span className="dmp-badge dmp-badge--green">{w.reward_name}</span>
                        </td>
                        <td style={{ fontSize:12 }}>{new Date(w.created_at).toLocaleString('vi-VN')}</td>
                        <td className="discount-management-page-center"><b>{w.points_spent}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
};

export default DiscountManagementPage;
// client/src/pages/UserPromotionPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaTicketAlt, FaGamepad, FaStar, FaExchangeAlt, FaCalendarCheck,
  FaGift, FaCheckCircle, FaClock, FaTags, FaStoreAlt,
  FaTrophy, FaHistory, FaSpinner, FaExclamationCircle,
  FaBolt, FaArrowRight, FaTimes, FaWallet, FaFire,
  FaBoxOpen, FaPercent, FaMoneyBillWave, FaInfoCircle,
  FaRegCalendarAlt, FaCopy
} from 'react-icons/fa';
import marketingService from '../services/marketingService';
import api from '../services/api'; // ✅ Bổ sung thêm dòng này
import './UserPromotionPage.css';

// ─── CONSTANTS ────────────────────────────────────────────────
const APPLY_FOR_LABELS = {
  all:          'Tất cả hóa đơn',
  service:      'Dịch vụ khám bệnh',
  medicine:     'Đơn mua thuốc',
  consultation: 'Gói tư vấn',
  shipping:     'Phí vận chuyển',
};
const STORE_FILTERS = [
  { key: 'all',          label: 'Tất cả ưu đãi' },
  { key: 'service',      label: 'Dịch vụ Khám' },
  { key: 'medicine',     label: 'Hiệu Thuốc' },
  { key: 'consultation', label: 'Tư Vấn Online' },
];
const WHEEL_COLORS = [
  '#16a34a','#d97706','#2563eb','#ea580c',
  '#7c3aed','#db2777','#0891b2','#65a30d'
];

// ─── MAIN COMPONENT ───────────────────────────────────────────
const UserPromotionPage = ({ tab = 'vouchers' }) => {
  const navigate = useNavigate();

  // ── Tabs
  const [activeTab,     setActiveTab]     = useState(tab);
  const [voucherSubTab, setVoucherSubTab] = useState('public');
  const [gameSubTab,    setGameSubTab]    = useState('wheel');

  // ── Data
  const [publicVouchers,  setPublicVouchers]  = useState([]);
  const [myVouchers,      setMyVouchers]      = useState([]);
  const [gameHistory,     setGameHistory]     = useState([]);
  const [wheelRewards,    setWheelRewards]    = useState([]);
  const [userPoints, setUserPoints] = useState(null);
  const [checkinStreak,   setCheckinStreak]   = useState(0); // ✅ backend-driven
  const [lastCheckin,     setLastCheckin]     = useState(null);
  
  // ✅ THÊM STATE LƯU CẤU HÌNH TỪ ADMIN
  const [loyaltyConfig,   setLoyaltyConfig]   = useState({ daily_checkin_points: 10, wheel_cost_per_spin: 10 });
  const [activeWheel,     setActiveWheel]     = useState(null);

  // ── UI state
  const [loading,               setLoading]               = useState(false);
  const [isSpinning,            setIsSpinning]            = useState(false);
  const [wheelRotation,         setWheelRotation]         = useState(0);
  const [gameResult,            setGameResult]            = useState(null);
  const [winPopup,              setWinPopup]              = useState(null);
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState(null);
  const [voucherSearch,         setVoucherSearch]         = useState('');
  const [myVoucherSearch,       setMyVoucherSearch]       = useState('');
  const [storeFilter,           setStoreFilter]           = useState('all');
  const [toast,                 setToast]                 = useState(null);
  const [copiedCode,            setCopiedCode]            = useState(null);

  // ── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Copy to clipboard ─────────────────────────────────────
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      showToast(`Đã sao chép mã: ${code}`);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // ── Fetch functions ───────────────────────────────────────
  const fetchPublicVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const d = await marketingService.getPublicPromotions();
      if (d.success) setPublicVouchers(d.promotions);
    } catch { showToast('Không thể tải voucher', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  const fetchMyVouchers = useCallback(async () => {
    try {
      const d = await marketingService.getMyVouchers();
      if (d.success) setMyVouchers(d.vouchers);
    } catch (e) { console.error(e); }
  }, []);

  const fetchPoints = useCallback(async () => {
    try {
      const d = await marketingService.getMyPoints();
      if (d.success) {
        setUserPoints(d.points);
        setCheckinStreak(d.streak || 0);       // ✅ backend trả về streak
        setLastCheckin(d.last_checkin_date || null);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchWheelRewards = useCallback(async () => {
    try {
      const d = await marketingService.getGameRewards();
      let base = d.rewards?.length ? d.rewards : [];
      
      if (base.length === 0) {
        base = [{ id: 'miss', label: 'Chưa có quà', is_miss: true, game_probability: 100 }];
      }
      
      setWheelRewards(base);
      if (d.wheel_event) setActiveWheel(d.wheel_event); // ✅ Lấy cấu hình riêng của vòng quay nếu có
    } catch (e) { console.error(e); }
  }, []);

  const fetchGameHistory = useCallback(async () => {
    try {
      const d = await marketingService.getMyGameHistory();
      if (d.success) setGameHistory(d.history);
    } catch (e) { console.error(e); }
  }, []);

  // ✅ HÀM LẤY CẤU HÌNH ĐIỂM CHUNG
  const fetchLoyaltyConfig = useCallback(async () => {
    try {
      const res = await api.get('/marketing/loyalty-config');
      if (res.data.success) setLoyaltyConfig(res.data.config);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchPublicVouchers();
    fetchMyVouchers();
    fetchPoints();
    fetchWheelRewards();
    fetchGameHistory();
    fetchLoyaltyConfig(); // ✅ Gọi hàm lấy cấu hình khi load trang
  }, [fetchPublicVouchers, fetchMyVouchers, fetchPoints, fetchWheelRewards, fetchGameHistory, fetchLoyaltyConfig]);

  // ── Format helpers ────────────────────────────────────────
  const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');
  const fmtDisc = (p) => p.discount_type === 'percentage'
    ? `Giảm ${p.discount_value}%`
    : `Giảm ${Number(p.discount_value).toLocaleString('vi-VN')}đ`;

  // ── Wheel CSS background ──────────────────────────────────
  const wheelBg = wheelRewards.length > 1
    ? `conic-gradient(${wheelRewards.map((_, i) => {
        const s = 360 / wheelRewards.length;
        return `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * s}deg ${(i + 1) * s}deg`;
      }).join(', ')})`
    : '#d1fae5';

  // ✅ Tính toán số điểm mất cho 1 lượt quay (Ưu tiên sự kiện hiện tại, nếu không có thì lấy cấu hình chung)
  const currentSpinCost = activeWheel?.cost_per_spin !== undefined ? activeWheel.cost_per_spin : (loyaltyConfig.wheel_cost_per_spin || 10);
  const currentCheckinPoints = loyaltyConfig.daily_checkin_points || 10;

  // ── handleSpin ────────────────────────────────────────────
  const handleSpin = async () => {
    if (userPoints < currentSpinCost) {
      showToast(`Bạn cần ít nhất ${currentSpinCost} điểm để quay. Hãy điểm danh hằng ngày!`, 'error');
      return;
    }
    setIsSpinning(true);
    setGameResult(null);

    try {
      const d = await marketingService.playGame();
      fetchPoints(); // cập nhật điểm sau khi quay

      // ── tính góc quay để kim dừng đúng ô trúng ──
      const sliceAngle = 360 / wheelRewards.length;
      let idx = -1;
      
      if (d.result === 'win' && d.reward) {
        // So khớp id promotion hoặc tên nhãn vì backend trả về id của Promotion nhưng danh sách là WheelPrize
        idx = wheelRewards.findIndex(r => 
          (r.promotion && String(r.promotion.id) === String(d.reward.id)) ||
          r.label === d.reward.name ||
          r.name === d.reward.name ||
          String(r.id) === String(d.reward.id)
        );
      }
      
      if (idx === -1) {
        idx = wheelRewards.findIndex(r => r.is_miss || String(r.id) === 'miss');
      }
      if (idx === -1) idx = wheelRewards.length - 1; // fallback

      // Kim pointer ở top, ô idx nằm ở centerAngle
      const centerAngle = idx * sliceAngle + sliceAngle / 2;
      const target = 360 - centerAngle; // góc để ô đó nằm dưới kim

      setWheelRotation(prev => {
        const mod  = prev % 360;
        let   diff = target - mod;
        if (diff < 0) diff += 360;
        return prev + diff + 1800; // 5 vòng
      });

      // Delay khớp với transition 4s
      setTimeout(() => {
        setGameResult({ result: d.result, message: d.message });
        if (d.result === 'win' && d.reward) {
          fetchMyVouchers();
          fetchGameHistory();
          setWinPopup(d.reward);
        }
        setIsSpinning(false);
      }, 4100);

    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi khi quay thưởng', 'error');
      setIsSpinning(false);
    }
  };

  // ── handleCheckin ─────────────────────────────────────────
  const handleCheckin = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (lastCheckin && new Date(lastCheckin).toISOString().slice(0, 10) === today) {
      showToast('Bạn đã điểm danh hôm nay rồi! Quay lại ngày mai nhé.', 'error');
      return;
    }
    setLoading(true);
    try {
      const d = await marketingService.dailyCheckin();
      if (d.success) {
        setUserPoints(d.points);
        setLastCheckin(new Date().toISOString());
        setCheckinStreak(prev => Math.min(prev + 1, 7));
        showToast(d.message + ' 🎉');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Đã điểm danh hôm nay rồi!', 'error');
    } finally { setLoading(false); }
  };

  // ── handleExchangePoints ──────────────────────────────────
  const handleExchangePoints = async (promo) => {
    const cost = promo.exchange_points || 50;
    if (userPoints < cost) {
      showToast(`Bạn cần thêm ${cost - userPoints} điểm để đổi mã này!`, 'error');
      return;
    }
    setLoading(true);
    try {
      const d = await marketingService.exchangePoints(promo.id);
      if (d.success) {
        showToast(d.message);
        setUserPoints(d.points);
        fetchMyVouchers();
        fetchPublicVouchers();
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Đổi điểm thất bại', 'error');
    } finally { setLoading(false); }
  };

  // ── handleClaimVoucher ────────────────────────────────────
  const handleClaimVoucher = async (promotionId) => {
    try {
      const d = await marketingService.claimVoucher(promotionId);
      if (d.success) {
        showToast(d.message);
        fetchPublicVouchers();
        fetchMyVouchers();
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Không thể lưu voucher', 'error');
    }
  };

  // ── handleUseVoucher — dùng React Router ─────────────────
  const handleUseVoucher = (voucher) => {
    const promo = voucher.Promotion || voucher;
    if (promo.apply_for === 'service')
      navigate(`/appointment-booking?voucher=${promo.code}`);
    else if (promo.apply_for === 'consultation')
      navigate(`/consultation-booking?voucher=${promo.code}`);
    else
      navigate('/services');
    setSelectedVoucherDetail(null);
  };

  // ── checkin today? ────────────────────────────────────────
  const checkedInToday = lastCheckin
    ? new Date(lastCheckin).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
    : false;

  // ─── RENDER: VOUCHER CARD ────────────────────────────────
  const renderVoucherCard = (v, isMyVoucher) => {
    const promo = isMyVoucher ? (v.Promotion || v.promotion) : v;
    if (!promo) return null;
    const claimedVoucher = !isMyVoucher ? myVouchers.find(m => m.promotion_id === promo.id) : null;
    const isClaimed = !!claimedVoucher;
    const isClaimedAndUsed = claimedVoucher?.is_used === true;
    const remaining = promo.usage_limit - promo.usage_count;
    const pct       = (remaining / promo.usage_limit) * 100;
    const isHot     = !isMyVoucher && pct <= 10 && remaining > 0;

    return (
      <div key={isMyVoucher ? v.id : promo.id} className="upp-voucher-card">
        {isHot && <div className="upp-ribbon">Sắp hết ({remaining})</div>}
        <div className="upp-voucher-card__topbar" />
        <div className="upp-voucher-card__body">
          <div className="upp-voucher-card__icon"><FaGift /></div>
          <div className="upp-voucher-card__name">{promo.name}</div>

          {/* Code row with copy button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
            <span className="upp-voucher-card__code">{promo.code}</span>
            <button
              onClick={() => handleCopy(promo.code)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedCode === promo.code ? 'var(--upp-primary)' : 'var(--upp-n400)', padding: 0, display: 'flex', alignItems: 'center' }}
              title="Sao chép mã"
            >
              <FaCopy size={12} />
            </button>
          </div>

          <div className="upp-voucher-card__expiry"><FaClock /> HSD: {fmtDate(promo.end_date)}</div>

          {!isMyVoucher && (
            <div className="upp-voucher-card__progress">
              <div className="upp-voucher-card__progress-label">
                <span>Đã phát: <b>{promo.usage_count}/{promo.usage_limit}</b></span>
                {isHot && (
                  <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 700, fontSize: '0.68rem' }}>
                    <FaFire />HOT
                  </span>
                )}
              </div>
              <div className="upp-voucher-card__progress-bar">
                <div
                  className={`upp-voucher-card__progress-fill ${isHot ? 'upp-voucher-card__progress-fill--hot' : 'upp-voucher-card__progress-fill--normal'}`}
                  style={{ width: `${100 - pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Hiển thị trạng thái voucher trong Ví - mỗi UserVoucher chỉ dùng 1 lần */}
          {isMyVoucher && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 8,
              fontSize: '0.78rem',
              color: v.is_used ? '#dc2626' : '#059669',
              fontWeight: 600,
              background: v.is_used ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${v.is_used ? '#fecaca' : '#bbf7d0'}`,
              borderRadius: 6,
              padding: '4px 10px'
            }}>
              {v.is_used
                ? '❌ Đã sử dụng'
                : '✅ Chưa sử dụng · 1 lượt dùng'
              }
            </div>
          )}

          <div className="upp-voucher-card__actions">
            <button className="upp-btn upp-btn--sm upp-btn--outline" onClick={() => setSelectedVoucherDetail(promo)}>
              <FaInfoCircle /> Chi tiết
            </button>
            {isMyVoucher
              ? (
                <button
                  className="upp-btn upp-btn--sm upp-btn--primary"
                  onClick={() => handleUseVoucher(v)}
                  disabled={v.is_used}
                  style={v.is_used ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  <FaArrowRight /> Dùng ngay
                </button>
              ) : (
                <button
                  className={`upp-btn upp-btn--sm ${isClaimed ? 'upp-btn--disabled' : 'upp-btn--orange'}`}
                  onClick={() => !isClaimed && handleClaimVoucher(promo.id)}
                  disabled={isClaimed}
                >
                  {isClaimedAndUsed
                    ? <><FaCheckCircle /> Đã sử dụng</>
                    : isClaimed
                      ? <><FaCheckCircle /> Đã lưu</>
                      : <><FaTags /> Lưu mã</>
                  }
                </button>
              )
            }
          </div>
        </div>
      </div>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────
  return (
    <div className="upp-page">

      {/* Toast */}
      {toast && (
        <div className={`upp-toast upp-toast--${toast.type}`}>
          {toast.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
          {toast.msg}
        </div>
      )}

      {/* ── Marquee — CSS animation, không dùng <marquee> ── */}
      <div className="upp-marquee">
        <span className="upp-marquee__icon"><FaBolt /></span>
        <div className="upp-marquee__track">
          <span className="upp-marquee__inner">
            🎉 Chúc mừng 098****123 vừa quay trúng Thẻ Viettel 50K! &nbsp;&nbsp;—&nbsp;&nbsp;
            🎊 Chúc mừng 090****456 vừa nhận Voucher Giảm 50%! &nbsp;&nbsp;—&nbsp;&nbsp;
            🏆 Chúc mừng 093****789 vừa trúng Gói khám miễn phí! &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            🎉 Chúc mừng 098****123 vừa quay trúng Thẻ Viettel 50K! &nbsp;&nbsp;—&nbsp;&nbsp;
            🎊 Chúc mừng 090****456 vừa nhận Voucher Giảm 50%! &nbsp;&nbsp;—&nbsp;&nbsp;
            🏆 Chúc mừng 093****789 vừa trúng Gói khám miễn phí!
          </span>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="upp-header">
        <h2 className="upp-header__title">✨ Thế Giới Ưu Đãi &amp; Quà Tặng</h2>
        <p className="upp-header__sub">Khám phá kho voucher và tham gia tích điểm để nhận quà hấp dẫn!</p>
      </div>

      {/* ── Main Tabs ── */}
      <div className="upp-tabs">
        <button className={`upp-tab ${activeTab === 'vouchers' ? 'upp-tab--active' : ''}`} onClick={() => setActiveTab('vouchers')}>
          <FaTicketAlt /> Kho Voucher
        </button>
        <button className={`upp-tab ${activeTab === 'game' ? 'upp-tab--active' : ''}`} onClick={() => setActiveTab('game')}>
          <FaGamepad /> Vòng Quay
        </button>
        <button className={`upp-tab ${activeTab === 'loyalty' ? 'upp-tab--active' : ''}`} onClick={() => setActiveTab('loyalty')}>
          <FaStar /> Điểm Thưởng
        </button>
      </div>

      <div className="upp-content">

        {/* ════════════════════════════════
            TAB: KHO VOUCHER
        ════════════════════════════════ */}
        {activeTab === 'vouchers' && (
          <>
            <div className="upp-subtab-nav">
              <button
                className={`upp-subtab ${voucherSubTab === 'public' ? 'upp-subtab--active' : ''}`}
                onClick={() => setVoucherSubTab('public')}
              >
                <FaFire /> Kho Ưu Đãi
              </button>
              <button
                className={`upp-subtab ${voucherSubTab === 'my' ? 'upp-subtab--active' : ''}`}
                onClick={() => setVoucherSubTab('my')}
              >
                <FaWallet /> Ví Của Tôi
                {myVouchers.filter(v => !v.is_used).length > 0 && (
                  <span style={{
                    marginLeft: 4, background: 'var(--upp-primary)', color: '#fff',
                    borderRadius: '50%', width: 17, height: 17, fontSize: 10, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {myVouchers.filter(v => !v.is_used).length}
                  </span>
                )}
              </button>
            </div>
            <div style={{ padding: '8px 0 4px', display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder={voucherSubTab === 'public' ? '🔍 Tìm voucher theo tên hoặc mã...' : '🔍 Tìm trong ví của bạn...'}
                value={voucherSubTab === 'public' ? voucherSearch : myVoucherSearch}
                onChange={e => voucherSubTab === 'public' ? setVoucherSearch(e.target.value) : setMyVoucherSearch(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', border: '1.5px solid var(--upp-border)',
                  borderRadius: 'var(--upp-r-md)', fontSize: 13, outline: 'none',
                  fontFamily: 'var(--upp-font)', background: '#fff'
                }}
              />
            </div>

            {loading ? (
              <div className="upp-loading"><div className="upp-spinner" /><p>Đang tải...</p></div>
            ) : (() => {
              const searchTerm = voucherSubTab === 'public' ? voucherSearch.toLowerCase() : myVoucherSearch.toLowerCase();
              const list = voucherSubTab === 'public'
                ? publicVouchers.filter(p => !p.is_exchange_reward && !p.is_game_reward)
                    .filter(p => !searchTerm || p.name?.toLowerCase().includes(searchTerm) || p.code?.toLowerCase().includes(searchTerm))
                : myVouchers.filter(v => !v.is_used)
                    .filter(v => {
                      const p = v.Promotion || v.promotion;
                      return !searchTerm || p?.name?.toLowerCase().includes(searchTerm) || p?.code?.toLowerCase().includes(searchTerm);
                    })
              return list.length === 0
                ? (
                  <div className="upp-empty">
                    <div className="upp-empty__icon"><FaBoxOpen /></div>
                    <div className="upp-empty__title">
                      {voucherSubTab === 'public' ? 'Chưa có voucher nào' : 'Ví voucher đang trống'}
                    </div>
                    <div className="upp-empty__sub">
                      {voucherSubTab === 'public' ? 'Hãy quay lại sau nhé!' : 'Ghé Kho Ưu Đãi để lưu mã!'}
                    </div>
                  </div>
                )
                : <div className="upp-voucher-grid">{list.map(v => renderVoucherCard(v, voucherSubTab === 'my'))}</div>;
            })()}
          </>
        )}

        {/* ════════════════════════════════
            TAB: VÒNG QUAY
        ════════════════════════════════ */}
        {activeTab === 'game' && (
          <>
            <div className="upp-subtab-nav" style={{ justifyContent: 'center' }}>
              <button className={`upp-subtab ${gameSubTab === 'wheel'   ? 'upp-subtab--active' : ''}`} onClick={() => setGameSubTab('wheel')}>
                <FaGamepad /> Quay Thưởng
              </button>
              <button className={`upp-subtab ${gameSubTab === 'history' ? 'upp-subtab--active' : ''}`} onClick={() => setGameSubTab('history')}>
                <FaHistory /> Lịch Sử Trúng Thưởng
              </button>
            </div>

            {/* ── Wheel ── */}
            {gameSubTab === 'wheel' && (
              <div className="upp-game-area">
                <div className="upp-game-content">

                  {/* Chưa có vòng quay nào được tạo */}
                  {wheelRewards.length === 1 && wheelRewards[0]?.is_miss ? (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '40px 20px', textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: 72, marginBottom: 16,
                        animation: 'uppBounce 1.2s infinite alternate'
                      }}>🎡</div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                        border: '1.5px solid #f59e0b', borderRadius: 20,
                        padding: '5px 16px', fontSize: 12, fontWeight: 700,
                        color: '#92400e', marginBottom: 14, letterSpacing: 0.3
                      }}>
                        ⏳ Sắp Ra Mắt
                      </div>
                      <h3 style={{
                        fontSize: 22, fontWeight: 800, color: 'var(--upp-n900)',
                        margin: '0 0 10px'
                      }}>Vòng Quay May Mắn</h3>
                      <p style={{
                        fontSize: 14, color: 'var(--upp-n500)', maxWidth: 320,
                        lineHeight: 1.7, margin: '0 0 24px'
                      }}>
                        Chúng tôi đang chuẩn bị những phần thưởng hấp dẫn. Hãy
                        điểm danh mỗi ngày để tích điểm và sẵn sàng quay thưởng!
                      </p>
                      
                      <div style={{
                        background: 'linear-gradient(135deg, #064e3b, #16a34a)',
                        borderRadius: 14, padding: '16px 24px',
                        color: '#fff', fontSize: 13, maxWidth: 300, width: '100%'
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          💡 Điểm tích lũy của bạn
                        </div>
                        <div style={{
                          fontSize: 28, fontWeight: 800, color: '#fde68a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}>
                          <FaStar style={{ fontSize: 20 }} /> {userPoints ?? '—'}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                          Điểm danh hằng ngày để tích thêm điểm!
                        </div>
                      </div>
                    </div>
                  ) : (
                  <>
                  {/* Điểm hiện tại */}
                  <div className="upp-spin-cost">
                    <FaStar /> Điểm của bạn: <b>{userPoints}</b>
                  </div>

                  {/* Wheel stage: pointer + wheel */}
                  <div className="upp-wheel-stage">
                    <div className="upp-wheel-pointer" />
                    <div
                      className="upp-wheel-wrap"
                      style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        background: wheelBg
                      }}
                    >
                      <div className="upp-wheel-center">SPIN</div>
                      {wheelRewards.map((r, i) => {
                        const step = 360 / wheelRewards.length;
                        const label = (r.label || r.name || 'Quà tặng');
                        return (
                          <div
                            key={i}
                            className="upp-wheel-text"
                            // Fix lệch 90 độ so với CSS Conic-Gradient
                            style={{ transform: `rotate(${i * step + step / 2 - 90}deg)` }}
                          >
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <h3 className="upp-game-title">Vòng Quay May Mắn</h3>
                  <p className="upp-game-sub">
                    Tốn <b>{currentSpinCost} Điểm</b> / lượt quay &nbsp;|&nbsp; Tối đa <b>{activeWheel?.spins_per_day || 3} lượt/ngày</b>
                  </p>

                  <button className="upp-btn--spin" onClick={handleSpin} disabled={isSpinning || userPoints === null || userPoints < currentSpinCost}>
                    {isSpinning
                      ? <><FaSpinner style={{ animation: 'uppSpin 0.8s linear infinite', display: 'inline-block' }} /> Đang quay...</>
                      : userPoints === null ? <><FaSpinner style={{ animation: 'uppSpin 0.8s linear infinite', display: 'inline-block' }} /> Đang tải...</>
                      : userPoints < currentSpinCost ? '⚠ Không đủ điểm' : `🎯 QUAY NGAY (${currentSpinCost} ĐIỂM)`
                    }
                  </button>

                  {gameResult && (
                    <div className={`upp-game-result upp-game-result--${gameResult.result === 'win' ? 'win' : 'miss'}`}>
                      {gameResult.result === 'win' ? <FaCheckCircle /> : <FaExclamationCircle />}
                      <p>{gameResult.message}</p>
                    </div>
                  )}

                  {userPoints < currentSpinCost && !isSpinning && (
                    <p style={{ marginTop: 12, fontSize: 12, color: 'var(--upp-n500)' }}>
                      💡 Điểm danh hằng ngày để nhận +{currentCheckinPoints} điểm mỗi ngày!
                    </p>
                  )}
                  </>
                  )}
                </div>
              </div>
            )}
            {/* ── History ── */}
            {gameSubTab === 'history' && (
              gameHistory.length === 0
                ? (
                  <div className="upp-empty">
                    <div className="upp-empty__icon"><FaTrophy /></div>
                    <div className="upp-empty__title">Chưa có phần thưởng nào</div>
                    <div className="upp-empty__sub">Hãy thử Vòng quay ngay!</div>
                  </div>
                )
                : (
                  <div className="upp-history-list">
                    {gameHistory.map(v => {
                      const promoBase = v.promotion || v.Promotion;
                      const isMiss = v.result === 'miss';

                      // 🌟 FIX LỖI MODAL TRẮNG/INVALID DATE: Ưu tiên lấy dữ liệu đầy đủ nhất từ Ví Voucher
                      const fullVoucherInWallet = promoBase ? myVouchers.find(m => m.promotion_id === promoBase.id) : null;
                      const promoFull = fullVoucherInWallet ? (fullVoucherInWallet.Promotion || fullVoucherInWallet.promotion) : promoBase;
                      
                      // Kiểm tra dữ liệu ngày tháng an toàn
                      const dateString = v.created_at || v.createdAt;
                      const displayDate = dateString ? fmtDate(dateString) : 'Vừa xong';

                      return (
                        <div key={v.id} className={`upp-history-card ${isMiss ? 'upp-history-card--miss' : promoFull?.reward_type === 'card' ? 'upp-history-card--card' : 'upp-history-card--voucher'}`}>
                          <div className="upp-history-card__icon-wrap">
                            {isMiss ? '😔' : promoFull?.reward_type === 'card' ? '🎴' : <FaGift />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="upp-history-card__name">
                              {isMiss ? (v.reward_name || 'Không trúng lần này') : (promoFull?.name || v.reward_name || 'Phần thưởng')}
                            </span>
                            <span className="upp-history-card__date">
                              <FaRegCalendarAlt /> {isMiss ? 'Quay ngày:' : 'Trúng ngày:'} {displayDate}
                            </span>
                            {!isMiss && (
                              // Ràng buộc an toàn: Nếu có dữ liệu voucher thì mới hiện nút
                              promoFull ? (
                                promoFull.reward_type === 'card'
                                  ? (
                                    <span className="upp-history-card__code">
                                      Mã: {promoFull.external_code}
                                    </span>
                                  )
                                  : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                                      <span className="upp-history-card__saved" style={{ margin: 0 }}>
                                        <FaCheckCircle /> Đã lưu vào Ví
                                      </span>
                                      <button
                                        className="upp-btn upp-btn--outline"
                                        onClick={() => setSelectedVoucherDetail(promoFull)}
                                        style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px' }}
                                      >
                                        <FaInfoCircle /> Xem chi tiết
                                      </button>
                                    </div>
                                  )
                              ) : (
                                // Hiển thị cảnh báo cho những bản ghi cũ bị lỗi data
                                <span className="upp-history-card__date" style={{ color: 'var(--upp-orange)', marginTop: 4 }}>
                                  ⚠ Vòng quay cũ chưa có liên kết mã Voucher.
                                </span>
                              )
                            )}
                            {isMiss && (
                              <span style={{ fontSize: 11, color: 'var(--upp-n400)' }}>
                                Đã trừ {v.points_spent} điểm
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
            )}
          </>
        )}

        {/* ════════════════════════════════
            TAB: ĐIỂM THƯỞNG
        ════════════════════════════════ */}
        {activeTab === 'loyalty' && (
          <>
            {/* ── Check-in 7 ngày ── */}
            <div className="upp-checkin-box">
              <h2 className="upp-checkin-box__title">📅 Điểm danh 7 Ngày</h2>
              <div className="upp-checkin-box__points">
                <FaStar /> {userPoints} Điểm tích lũy
              </div>

              <button
                className="upp-btn upp-btn--md upp-btn--primary"
                onClick={handleCheckin}
                disabled={loading || checkedInToday}
                style={{ marginBottom: 4 }}
              >
                {checkedInToday
                  ? <><FaCheckCircle /> Đã điểm danh hôm nay</>
                  : <><FaCalendarCheck /> Điểm danh hôm nay (+{currentCheckinPoints}đ)</>
                }
              </button>
              {!checkedInToday && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '6px 0 0' }}>
                  Điểm danh liên tiếp 7 ngày để nhận thêm thưởng đặc biệt!
                </p>
              )}

              {/* 7-day strip — backend-driven */}
              <div className="upp-checkin-row">
                {[1, 2, 3, 4, 5, 6, 7].map(day => {
                  const done  = day < (checkinStreak % 7 === 0 && checkinStreak > 0 ? 8 : checkinStreak % 7);
                  const today = day === (checkinStreak % 7 === 0 && checkinStreak > 0 ? 7 : checkinStreak % 7);
                  return (
                    <div key={day} className="upp-checkin-item">
                      <div className={`upp-checkin-circle ${done ? 'upp-checkin-circle--done' : today ? 'upp-checkin-circle--today' : ''}`}>
                        {done || today ? <FaCheckCircle /> : `+${currentCheckinPoints}`}
                      </div>
                      <span className="upp-checkin-label">Ngày {day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Cửa hàng đổi điểm ── */}
            <h2 className="upp-store-title"><FaExchangeAlt /> Cửa Hàng Đổi Thưởng</h2>

            <div className="upp-store-filters">
              {STORE_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`upp-store-filter ${storeFilter === f.key ? 'upp-store-filter--active' : ''}`}
                  onClick={() => setStoreFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {(() => {
              const storeItems = publicVouchers
                .filter(p => p.is_exchange_reward)
                .filter(p => storeFilter === 'all' || p.apply_for === storeFilter);

              return storeItems.length === 0
                ? (
                  <div className="upp-empty">
                    <div className="upp-empty__icon"><FaStoreAlt /></div>
                    <div className="upp-empty__title">Chưa có voucher trong danh mục này</div>
                    <div className="upp-empty__sub">Hãy tích điểm và quay lại sau!</div>
                  </div>
                )
                : (
                  <div className="upp-store-grid">
                    {storeItems.map(promo => {
                      const cost     = promo.exchange_points || 50;
                      const canAfford = userPoints >= cost;
                      const alreadyHas = myVouchers.some(m => m.promotion_id === promo.id);
                      return (
                        <div key={promo.id} className="upp-store-card">
                          <div className="upp-store-card__cost"><FaStar /> {cost} Điểm</div>
                          <div className="upp-store-card__name">{promo.name}</div>
                          <div className="upp-store-card__discount">{fmtDisc(promo)}</div>
                          <p className="upp-store-card__meta">
                            <b>Áp dụng:</b> {APPLY_FOR_LABELS[promo.apply_for] || promo.apply_for}<br />
                            <b>Số lượng còn:</b> {promo.usage_limit - promo.usage_count} / {promo.usage_limit}<br />
                            <b>HSD:</b> {fmtDate(promo.end_date)}
                          </p>
                          {alreadyHas
                            ? (
                              <button className="upp-btn upp-btn--full upp-btn--disabled" disabled>
                                <FaCheckCircle /> Đã có trong ví
                              </button>
                            )
                            : (
                              <button
                                className={`upp-btn upp-btn--full ${canAfford ? 'upp-btn--primary' : 'upp-btn--disabled'}`}
                                onClick={() => canAfford && handleExchangePoints(promo)}
                                disabled={!canAfford || loading}
                              >
                                {canAfford
                                  ? <><FaExchangeAlt /> Đổi Điểm Ngay</>
                                  : <><FaExclamationCircle /> Thiếu {cost - userPoints} Điểm</>
                                }
                              </button>
                            )
                          }
                        </div>
                      );
                    })}
                  </div>
                );
            })()}
          </>
        )}

      </div>{/* end .upp-content */}

      {/* ════════════════════════════════
          WIN POPUP MODAL
      ════════════════════════════════ */}
      {winPopup && (
        <div className="upp-modal-overlay" onClick={() => setWinPopup(null)}>
          <div className="upp-modal upp-win-modal" onClick={e => e.stopPropagation()}>
            <div className="upp-win-modal__header">
              <div className="upp-win-modal__header-icon"><FaTrophy /></div>
              <h2 className="upp-win-modal__title">🎉 Bạn Đã Trúng!</h2>
            </div>
            <div className="upp-win-modal__body">
              {winPopup.reward_image_url
                ? <img src={winPopup.reward_image_url} alt="Quà" className="upp-win-modal__reward-img" />
                : <div className="upp-win-modal__reward-icon"><FaGift /></div>
              }
              <p className="upp-win-modal__name">{winPopup.name}</p>
              <div className="upp-win-modal__code-box">
                <div className="upp-win-modal__confetti upp-win-modal__confetti--left"><FaStar /></div>
                <div className="upp-win-modal__confetti upp-win-modal__confetti--right"><FaStar /></div>
                <p className="upp-win-modal__code-label">
                  {winPopup.reward_type === 'card' ? 'Mã nạp thẻ / Số PIN:' : 'Mã Code Voucher của bạn:'}
                </p>
                <p className="upp-win-modal__code-value">
                  {winPopup.reward_type === 'card' ? winPopup.external_code : winPopup.code}
                </p>
                <button
                  onClick={() => handleCopy(winPopup.reward_type === 'card' ? winPopup.external_code : winPopup.code)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--upp-orange)', fontSize: 12, fontWeight: 700, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <FaCopy /> Sao chép mã
                </button>
              </div>
              <p className="upp-win-modal__note">
                Phần thưởng đã được tự động lưu vào Ví / Lịch sử của bạn.
              </p>
              <button className="upp-btn upp-btn--full upp-btn--primary" onClick={() => setWinPopup(null)}>
                <FaCheckCircle /> Tuyệt vời, đóng lại!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          VOUCHER DETAIL MODAL
      ════════════════════════════════ */}
      {selectedVoucherDetail && (
        <div className="upp-modal-overlay" onClick={() => setSelectedVoucherDetail(null)}>
          <div className="upp-modal" onClick={e => e.stopPropagation()}>
            <div className="upp-detail-modal__header">
              <h3 className="upp-detail-modal__title">Chi tiết ưu đãi</h3>
              <button className="upp-detail-modal__close" onClick={() => setSelectedVoucherDetail(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="upp-detail-modal__body">
              <p className="upp-detail-modal__name">{selectedVoucherDetail.name}</p>
              <div className="upp-detail-modal__code-box">
                <p className="upp-detail-modal__code-label">Mã Voucher</p>
                <p className="upp-detail-modal__code-value">{selectedVoucherDetail.code}</p>
                <button
                  onClick={() => handleCopy(selectedVoucherDetail.code)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--upp-primary)', fontSize: 12, fontWeight: 700, marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <FaCopy /> {copiedCode === selectedVoucherDetail.code ? '✓ Đã sao chép!' : 'Sao chép mã'}
                </button>
              </div>
              <div className="upp-detail-modal__info">
                <div className="upp-detail-modal__info-row">
                  <FaPercent />
                  <span>
                    <b>Mức giảm: </b>
                    {selectedVoucherDetail.discount_type === 'percentage'
                      ? `${selectedVoucherDetail.discount_value}%`
                      : `${Number(selectedVoucherDetail.discount_value).toLocaleString('vi-VN')} VNĐ`
                    }
                  </span>
                </div>
                <div className="upp-detail-modal__info-row">
                  <FaTags />
                  <span><b>Áp dụng: </b>{APPLY_FOR_LABELS[selectedVoucherDetail.apply_for] || selectedVoucherDetail.apply_for}</span>
                </div>
                {Number(selectedVoucherDetail.min_order_value) > 0 && (
                  <div className="upp-detail-modal__info-row">
                    <FaMoneyBillWave />
                    <span><b>Đơn tối thiểu: </b>{Number(selectedVoucherDetail.min_order_value).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                )}
                {Number(selectedVoucherDetail.max_discount_amount) > 0 && (
                  <div className="upp-detail-modal__info-row">
                    <FaMoneyBillWave />
                    <span><b>Giảm tối đa: </b>{Number(selectedVoucherDetail.max_discount_amount).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                )}
                <div className="upp-detail-modal__info-row">
                  <FaClock />
                  <span><b>Hạn sử dụng: </b>{fmtDate(selectedVoucherDetail.end_date)}</span>
                </div>
                {selectedVoucherDetail.description && (
                  <div className="upp-detail-modal__desc">
                    <b>Mô tả: </b>{selectedVoucherDetail.description}
                  </div>
                )}
              </div>
              <button
                className="upp-btn upp-btn--full upp-btn--primary"
                style={{ marginTop: 18 }}
                onClick={() => handleUseVoucher(selectedVoucherDetail)}
              >
                <FaArrowRight /> Sử dụng ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserPromotionPage;
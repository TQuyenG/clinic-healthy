import api from './api';

const marketingService = {
  // ── ADMIN ──────────────────────────────────────────────
  getAllPromotions: (params) =>
    api.get('/marketing/promotions', { params }).then(r => r.data),

  createPromotion: (data) =>
    api.post('/marketing/promotions', data).then(r => r.data),

  updatePromotion: (id, data) =>
    api.put(`/marketing/promotions/${id}`, data).then(r => r.data),

  deletePromotion: (id) =>
    api.delete(`/marketing/promotions/${id}`).then(r => r.data),

  togglePromotion: (id) =>
    api.put(`/marketing/promotions/${id}/toggle`).then(r => r.data),

  getSelectionData: (type) =>
    api.get(`/marketing/promotions/selection-data?type=${type}`).then(r => r.data),

  // ── USER ───────────────────────────────────────────────
  getPublicPromotions: () =>
    api.get('/marketing/public-promotions').then(r => r.data),

  getMyVouchers: () =>
    api.get('/marketing/my-vouchers').then(r => r.data),

  claimVoucher: (promotion_id) =>
    api.post('/marketing/claim-voucher', { promotion_id }).then(r => r.data),

  validateVoucher: (data) =>
    api.post('/marketing/validate-voucher', data).then(r => r.data),

  // ── GAME ───────────────────────────────────────────────
  getGameRewards: () =>
    api.get('/marketing/game/rewards').then(r => r.data),

  getMyGameHistory: () =>
    api.get('/marketing/game/history').then(r => r.data),

  playGame: () =>
    api.post('/marketing/game/play').then(r => r.data),

  // ── LOYALTY ────────────────────────────────────────────
  getMyPoints: () =>
    api.get('/marketing/my-points').then(r => r.data),

  dailyCheckin: () =>
    api.post('/marketing/checkin').then(r => r.data),

  exchangePoints: (promoId) =>
    api.post(`/marketing/exchange-points/${promoId}`).then(r => r.data),

  // ── WHEEL EVENTS (Admin) ────────────────────────────────────
  getWheelEvents:    ()         => api.get('/marketing/wheel-events').then(r => r.data),
  createWheelEvent:  (data)     => api.post('/marketing/wheel-events', data).then(r => r.data),
  updateWheelEvent:  (id, data) => api.put(`/marketing/wheel-events/${id}`, data).then(r => r.data),
  toggleWheelEvent:  (id)       => api.put(`/marketing/wheel-events/${id}/toggle`).then(r => r.data),
  deleteWheelEvent:  (id)       => api.delete(`/marketing/wheel-events/${id}`).then(r => r.data),
  getWinners:        (params)   => api.get('/marketing/wheel-events/winners', { params }).then(r => r.data),
};

export default marketingService;
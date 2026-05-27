// client/src/pages/PaymentManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';
import useToast from '../hooks/useToast';
import {
  FaSyncAlt, FaSearch, FaCheckCircle, FaTimesCircle,
  FaFilter, FaCalendarAlt, FaUserMd, FaUser,
  FaMoneyBillWave, FaEye, FaChevronLeft, FaChevronRight,
  FaCalendarDay, FaPrint, FaExchangeAlt, FaUndo,
  FaChartBar, FaArrowUp, FaArrowDown, FaClock, FaTimes
} from 'react-icons/fa';
import './PaymentManagementPage.css';

// ─── helpers ────────────────────────────────────────────────────────────────
const getToday = () => new Date().toISOString().split('T')[0];

const fmt = (d) => {
  if (!d) return '---';
  try {
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '---'; }
};

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('vi-VN') + ' đ';

const getPaymentAmounts = (p) => {
  const finalAmt = parseInt(p?.amount) || 0;
  const originalAmtFromAPI = parseInt(p?.original_amount) || 0;
  const discountAmtFromAPI = parseInt(p?.discount_amount) || 0;

  if (originalAmtFromAPI > 0) {
    return {
      finalAmt,
      originalAmt: originalAmtFromAPI,
      discountAmt: discountAmtFromAPI,
    };
  }

  const originalAmt = p?.Appointment?.Service?.price
    ? parseInt(p.Appointment.Service.price)
    : (p?.Consultation?.consultation_fee ? parseInt(p.Consultation.consultation_fee) : finalAmt);
  const discountAmt = originalAmt > finalAmt ? originalAmt - finalAmt : 0;

  return { finalAmt, originalAmt, discountAmt };
};

const getPatientName = (p) =>
  p.patientName
  || p.Appointment?.guest_name && `${p.Appointment.guest_name} (Khách)`
  || p.Appointment?.Patient?.User?.full_name
  || p.Consultation?.patient?.full_name
  || p.User?.full_name
  || 'Khách vãng lai';

const getDoctorName = (p) =>
  p.doctorName
  || p.Appointment?.Doctor?.user?.full_name
  || p.Consultation?.doctor?.full_name
  || '---';

const getServiceName = (p) =>
  p.serviceName
  || p.Appointment?.Service?.name
  || (p.Consultation ? 'Tư vấn trực tuyến' : null)
  || '---';

const getTypeLabel = (p) => {
  if (p.type === 'consultation' || p.Consultation) return 'Tư vấn online';
  if (p.type === 'Lịch hẹn' || p.Appointment) return 'Lịch hẹn khám';
  return 'Khác';
};

const METHOD_LABELS = {
  vnpay: 'VNPay',
  momo: 'MoMo',
  bank_transfer: 'Chuyển khoản',
  cash: 'Tiền mặt',
  card: 'Thẻ',
};

const STATUS_LABELS = {
  pending: 'Chờ duyệt',
  paid: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Hoàn tiền',
};

// ─── Inline Print Invoice ────────────────────────────────────────────────────
const PrintInvoice = ({ data }) => {
  if (!data) return null;
  const finalAmt = parseInt(data.amount) || 0;
  const originalAmt = data.Appointment?.Service?.price
    ? parseInt(data.Appointment.Service.price) : finalAmt;
  const discountAmt = originalAmt > finalAmt ? originalAmt - finalAmt : 0;

  return (
    <div id="invoice-print-area" className="d-none d-print-block">
      <div className="inv-wrap">
        <div className="inv-header">
          <div className="inv-clinic-logo">🏥</div>
          <h2>PHÒNG KHÁM ĐA KHOA EASY MEDIFY</h2>
          <p>123 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
          <p>Hotline: 1900 1234 | easymedify.vn</p>
          <div className="inv-title">HÓA ĐƠN THANH TOÁN</div>
          <div className="inv-code">Mã: {data.Appointment?.code || data.Consultation?.consultation_code || data.code}</div>
        </div>

        <div className="inv-info-grid">
          <div><span>Bệnh nhân:</span> <strong>{getPatientName(data)}</strong></div>
          <div><span>Ngày in:</span> <strong>{new Date().toLocaleDateString('vi-VN')}</strong></div>
          <div><span>Địa chỉ:</span> {data.Appointment?.Patient?.User?.address || data.Appointment?.appointment_address || '---'}</div>
          <div><span>Bác sĩ:</span> {getDoctorName(data)}</div>
        </div>

        <table className="inv-table">
          <thead>
            <tr><th>Dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{getServiceName(data)}</td>
              <td>1</td>
              <td>{fmtMoney(originalAmt)}</td>
              <td>{fmtMoney(originalAmt)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td colSpan="3">Tổng cộng</td><td>{fmtMoney(originalAmt)}</td></tr>
            {discountAmt > 0 && (
              <tr className="inv-discount">
                <td colSpan="3">Giảm giá (Voucher)</td>
                <td>-{fmtMoney(discountAmt)}</td>
              </tr>
            )}
            <tr className="inv-total">
              <td colSpan="3">Thực thu ({METHOD_LABELS[data.method] || data.method})</td>
              <td>{fmtMoney(finalAmt)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="inv-sign">
          <div>
            <p>Người lập phiếu</p>
            <div className="inv-sign-line"></div>
            <p>Thu ngân viên</p>
          </div>
          <div>
            <p>Xác nhận của bệnh nhân</p>
            <div className="inv-sign-line"></div>
            <p>{getPatientName(data)}</p>
          </div>
        </div>
        <p className="inv-footer">Cảm ơn quý khách và hẹn gặp lại!</p>
      </div>
    </div>
  );
};

// ─── Manual Verify Modal ─────────────────────────────────────────────────────
const VerifyModal = ({ payment, onClose, onSuccess }) => {
  const [form, setForm] = useState({ status: 'paid', admin_note: '', provider_ref: '' });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await paymentService.verifyManualPayment(payment.id, form);
      if (res.data.success) {
        showToast('success', 'Đã cập nhật trạng thái thanh toán');
        onSuccess();
      } else {
        showToast('error', res.data.message || 'Lỗi cập nhật');
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pmp-modal-overlay" onClick={onClose}>
      <div className="pmp-modal pmp-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="pmp-modal-header">
          <span>Xác nhận thủ công</span>
          <button className="pmp-modal-close" onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>
        <div className="pmp-modal-body">
          <div className="pmp-verify-amount">
            <div className="pmp-verify-amount-num">{fmtMoney(payment.amount)}</div>
            <div className="pmp-verify-amount-code">{payment.code}</div>
          </div>

          <div className="pmp-form-group">
            <label>Hành động</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="paid">✅ Đã nhận tiền</option>
              <option value="failed">❌ Từ chối / Thất bại</option>
            </select>
          </div>

          <div className="pmp-form-group">
            <label>Mã tham chiếu ngân hàng</label>
            <input
              type="text"
              placeholder="FT2605xxxxxx..."
              value={form.provider_ref}
              onChange={e => setForm({ ...form, provider_ref: e.target.value })}
            />
          </div>

          <div className="pmp-form-group">
            <label>Ghi chú nội bộ</label>
            <textarea
              rows={3}
              placeholder="Ghi chú cho bộ phận kế toán..."
              value={form.admin_note}
              onChange={e => setForm({ ...form, admin_note: e.target.value })}
            />
          </div>
        </div>
        <div className="pmp-modal-footer">
          <button className="pmp-btn pmp-btn--ghost" onClick={onClose}>Hủy</button>
          <button
            className="pmp-btn pmp-btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailModal = ({ payment, loading, onClose }) => {
  if (!payment && !loading) return null;

  const patientName = getPatientName(payment || {});
  const doctorName = getDoctorName(payment || {});
  const serviceName = getServiceName(payment || {});
  const typeLabel = getTypeLabel(payment || {});
  const { finalAmt, originalAmt, discountAmt } = getPaymentAmounts(payment || {});
  const isSuccess = ['paid', 'paid_online', 'paid_at_clinic'].includes(payment?.status || payment?.payment_status);

  return (
    <div className="pmp-modal-overlay" onClick={onClose}>
      <div className="pmp-modal pmp-modal--xl" onClick={e => e.stopPropagation()}>
        <div className="pmp-modal-header">
          <span>Chi tiết thanh toán</span>
          <button className="pmp-modal-close" onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>

        <div className="pmp-modal-body pmp-detail-modal-body">
          {loading ? (
            <div className="pmp-detail-loading">
              <div className="pmp-spinner" />
              <span>Đang tải chi tiết giao dịch...</span>
            </div>
          ) : (
            <>
              <div className="pmp-detail-hero">
                <div>
                  <div className={`pmp-badge-status pmp-status-${payment?.status || payment?.payment_status || 'pending'}`}>
                    {isSuccess ? 'Thành công' : 'Chờ duyệt'}
                  </div>
                  <h3>{payment?.code || `GD-${payment?.id || '---'}`}</h3>
                  <p>{payment?.transaction_id ? `Mã GD: ${payment.transaction_id}` : 'Chưa có mã giao dịch'}</p>
                </div>
                <div className="pmp-detail-amount-box">
                  {discountAmt > 0 && <div className="pmp-detail-original">{fmtMoney(originalAmt)}</div>}
                  <div className="pmp-detail-final">{fmtMoney(finalAmt)}</div>
                  {discountAmt > 0 && <div className="pmp-detail-discount">Giảm {fmtMoney(discountAmt)}</div>}
                </div>
              </div>

              <div className="pmp-detail-grid">
                <div className="pmp-detail-card">
                  <div className="pmp-detail-card-hd"><FaUser /> Thông tin khách hàng</div>
                  <div className="pmp-detail-row"><span>Họ và tên</span><strong>{patientName}</strong></div>
                  <div className="pmp-detail-row"><span>Loại</span><strong>{typeLabel}</strong></div>
                  <div className="pmp-detail-row"><span>Bác sĩ</span><strong>{doctorName}</strong></div>
                  <div className="pmp-detail-row"><span>Dịch vụ</span><strong>{serviceName}</strong></div>
                  <div className="pmp-detail-row"><span>Ngày tạo</span><strong>{fmt(payment?.createdAt || payment?.created_at)}</strong></div>
                </div>

                <div className="pmp-detail-card">
                  <div className="pmp-detail-card-hd"><FaMoneyBillWave /> Thanh toán</div>
                  <div className="pmp-detail-row"><span>Phương thức</span><strong>{METHOD_LABELS[payment?.method] || payment?.method || '---'}</strong></div>
                  <div className="pmp-detail-row"><span>Trạng thái</span><strong>{STATUS_LABELS[payment?.status] || payment?.status || '---'}</strong></div>
                  <div className="pmp-detail-row"><span>Tổng cộng</span><strong>{fmtMoney(finalAmt)}</strong></div>
                  <div className="pmp-detail-row"><span>Giá gốc</span><strong>{fmtMoney(originalAmt)}</strong></div>
                  <div className="pmp-detail-row"><span>Giảm giá</span><strong>-{fmtMoney(discountAmt)}</strong></div>
                </div>
              </div>

              <div className="pmp-detail-note">
                {payment?.admin_note || payment?.note || 'Không có ghi chú bổ sung.'}
              </div>
            </>
          )}
        </div>

        <div className="pmp-modal-footer">
          <button className="pmp-btn pmp-btn--ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

// ─── Summary Stats Bar ────────────────────────────────────────────────────────
const StatsBar = ({ payments }) => {
  const stats = payments.reduce((acc, p) => {
    acc.total++;
    if (p.status === 'paid') { acc.paid++; acc.revenue += parseInt(p.amount) || 0; }
    if (p.status === 'pending') acc.pending++;
    if (p.status === 'failed') acc.failed++;
    return acc;
  }, { total: 0, paid: 0, pending: 0, failed: 0, revenue: 0 });

  return (
    <div className="pmp-stats-bar">
      <div className="pmp-stat">
        <FaMoneyBillWave className="pmp-stat-icon pmp-stat-icon--green" />
        <div>
          <div className="pmp-stat-val">{fmtMoney(stats.revenue)}</div>
          <div className="pmp-stat-lbl">Doanh thu</div>
        </div>
      </div>
      <div className="pmp-stat-divider" />
      <div className="pmp-stat">
        <FaCheckCircle className="pmp-stat-icon pmp-stat-icon--success" />
        <div>
          <div className="pmp-stat-val">{stats.paid}</div>
          <div className="pmp-stat-lbl">Thành công</div>
        </div>
      </div>
      <div className="pmp-stat-divider" />
      <div className="pmp-stat">
        <FaClock className="pmp-stat-icon pmp-stat-icon--warning" />
        <div>
          <div className="pmp-stat-val">{stats.pending}</div>
          <div className="pmp-stat-lbl">Chờ duyệt</div>
        </div>
      </div>
      <div className="pmp-stat-divider" />
      <div className="pmp-stat">
        <FaTimesCircle className="pmp-stat-icon pmp-stat-icon--danger" />
        <div>
          <div className="pmp-stat-val">{stats.failed}</div>
          <div className="pmp-stat-lbl">Thất bại</div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const PaymentManagementPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // [ĐÃ SỬA] Sửa lại mặc định lấy tất cả các ngày thay vì chỉ hôm nay
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    date: '',
    page: 1,
    limit: 10
  });

  const [verifyTarget, setVerifyTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [printData, setPrintData] = useState(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      // Chỉ gửi date nếu có giá trị
      if (!params.date) delete params.date;

      const res = await paymentService.getAllPayments(params);
      if (res.data.success) {
        setPayments(res.data.data);
        setPagination(res.data.pagination);
      } else {
        showToast('error', 'Không thể tải danh sách giao dịch');
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [filters]); // eslint-disable-line

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── handlers ───────────────────────────────────────────────────────────────
  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));

  const handlePrevDay = () => {
    const d = new Date(filters.date || getToday());
    d.setDate(d.getDate() - 1);
    setFilter('date', d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(filters.date || getToday());
    d.setDate(d.getDate() + 1);
    setFilter('date', d.toISOString().split('T')[0]);
  };

  const handleCheckStatus = async (payment) => {
    showToast('info', 'Đang gửi yêu cầu đối soát...');
    try {
      const res = await paymentService.checkTransactionStatus(payment.id);
      if (res.data.success) {
        showToast(res.data.isPaid ? 'success' : 'warning',
          res.data.isPaid ? '✅ Đối soát thành công - Giao dịch đã thanh toán' : `⚠️ ${res.data.message}`);
        fetchPayments();
      }
    } catch {
      showToast('error', 'Lỗi đối soát giao dịch');
    }
  };

  const handleOpenDetail = async (payment) => {
    setDetailTarget(payment);
    setDetailLoading(true);
    try {
      const res = await paymentService.getPaymentById(payment.id);
      if (res.data.success) {
        setDetailTarget(res.data.data);
      } else {
        showToast('error', 'Không thể tải chi tiết giao dịch');
      }
    } catch {
      showToast('error', 'Lỗi tải chi tiết giao dịch');
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrint = (payment) => {
    setPrintData(payment);
    setTimeout(() => window.print(), 400);
  };

  // ── amount helpers ─────────────────────────────────────────────────────────
  const getAmounts = (p) => {
    const finalAmt = parseInt(p.amount) || 0;
    // Ưu tiên dùng original_amount từ API (đã được tính sẵn ở backend)
    // Nếu không có thì fallback: lấy từ Service.price (lịch hẹn) hoặc consultation_fee (tư vấn)
    let originalAmt = parseInt(p.original_amount) || 0;
    if (!originalAmt) {
      originalAmt = p.Appointment?.Service?.price
        ? parseInt(p.Appointment.Service.price)
        : (p.Consultation?.consultation_fee
            ? parseInt(p.Consultation.consultation_fee)
            : finalAmt);
    }
    const discountAmt = parseInt(p.discount_amount) || (originalAmt > finalAmt ? originalAmt - finalAmt : 0);
    return { finalAmt, originalAmt, discountAmt };
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pmp-page">
      {/* ─── Header ─── */}
      <div className="pmp-header">
        <div className="pmp-header-left">
          <div className="pmp-header-icon"><FaMoneyBillWave /></div>
          <div>
            <h1 className="pmp-title">Quản Lý Giao Dịch</h1>
            <p className="pmp-subtitle">Theo dõi, đối soát và phê duyệt thanh toán</p>
          </div>
        </div>
        <div className="pmp-header-actions">
          <button className="pmp-btn pmp-btn--outline pmp-btn--icon" onClick={() => navigate('/quan-ly-thong-ke')} title="Thống kê doanh thu">
            <FaChartBar /> <span>Thống kê</span>
          </button>
          <button className="pmp-btn pmp-btn--primary pmp-btn--icon" onClick={fetchPayments} disabled={loading}>
            <FaSyncAlt className={loading ? 'pmp-spin' : ''} /> <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      {!loading && payments.length > 0 && <StatsBar payments={payments} />}

      {/* ─── Filters ─── */}
      <div className="pmp-filter-card">
        <div className="pmp-filter-row">
          <div className="pmp-filter-group">
            <label><FaFilter /> Trạng thái</label>
            <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="paid">Thành công</option>
              <option value="failed">Thất bại</option>
              <option value="refunded">Hoàn tiền</option>
            </select>
          </div>

          <div className="pmp-filter-group">
            <label><FaExchangeAlt /> Phương thức</label>
            <select value={filters.method} onChange={e => setFilter('method', e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="vnpay">VNPay</option>
              <option value="momo">MoMo</option>
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>

          <div className="pmp-filter-group pmp-filter-group--date">
            <label><FaCalendarAlt /> Ngày giao dịch</label>
            <div className="pmp-date-nav">
              <button className="pmp-date-nav-btn" onClick={handlePrevDay}><FaChevronLeft /></button>
              <input
                type="date"
                className="pmp-date-input"
                value={filters.date}
                onChange={e => setFilter('date', e.target.value)}
              />
              <button className="pmp-date-nav-btn" onClick={handleNextDay}><FaChevronRight /></button>
              <button
                className={`pmp-date-all-btn${!filters.date ? ' active' : ''}`}
                onClick={() => setFilter('date', '')}
              >
                <FaCalendarDay /> Tất cả
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="pmp-table-card">
        {loading ? (
          <div className="pmp-loading">
            <div className="pmp-spinner" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="pmp-empty">
            <FaMoneyBillWave className="pmp-empty-icon" />
            <p>Không có giao dịch nào trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="pmp-table-scroll">
            <table className="pmp-table">
              <thead>
                <tr>
                  <th className="pmp-th-stt">STT</th>
                  <th>Mã giao dịch</th>
                  <th>Khách hàng & Dịch vụ</th>
                  <th>Số tiền</th>
                  <th>Phương thức</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th className="pmp-th-actions">Xử lý</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => {
                  const { finalAmt, originalAmt, discountAmt } = getAmounts(p);
                  return (
                    <tr key={p.id} className={`pmp-row pmp-row--${p.status}`}>
                      <td className="pmp-td-stt" data-label="STT">
                        {(filters.page - 1) * filters.limit + idx + 1}
                      </td>

                      <td data-label="Mã GD">
                        <div className="pmp-code">{p.code || '---'}</div>
                        {p.transaction_id && (
                          <div className="pmp-sub" title={p.transaction_id}>
                            #{p.transaction_id.slice(-8)}
                          </div>
                        )}
                      </td>

                      <td data-label="Khách hàng">
                        <div className="pmp-patient">
                          <FaUser className="pmp-patient-icon" />
                          <span className="pmp-patient-name">{getPatientName(p)}</span>
                        </div>
                        <div className="pmp-doctor">
                          <FaUserMd className="pmp-doctor-icon" />
                          <span>{getDoctorName(p)}</span>
                        </div>
                        <div className="pmp-service-tag">{getServiceName(p)}</div>
                      </td>

                      <td data-label="Số tiền">
                        {discountAmt > 0 ? (
                          <div className="pmp-amount-wrap">
                            <div className="pmp-amount-original">{fmtMoney(originalAmt)}</div>
                            <div className="pmp-amount-final">{fmtMoney(finalAmt)}</div>
                            <div className="pmp-amount-discount">
                              <FaArrowDown /> {fmtMoney(discountAmt)}
                            </div>
                          </div>
                        ) : (
                          <div className="pmp-amount-final">{fmtMoney(finalAmt)}</div>
                        )}
                      </td>

                      <td data-label="Phương thức">
                        <span className={`pmp-badge-method pmp-method-${p.method}`}>
                          {METHOD_LABELS[p.method] || p.method}
                        </span>
                      </td>

                      <td data-label="Ngày tạo">
                        <div className="pmp-date">
                          <FaCalendarAlt className="pmp-date-icon" />
                          {fmt(p.createdAt || p.created_at)}
                        </div>
                      </td>

                      <td data-label="Trạng thái">
                        <span className={`pmp-badge-status pmp-status-${p.status}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>

                      <td data-label="Xử lý" className="pmp-td-actions">
                        <div className="pmp-actions">
                          {/* Xem chi tiết */}
                          <button
                            className="pmp-action-btn pmp-action-btn--view"
                            onClick={() => handleOpenDetail(p)}
                            title="Xem chi tiết"
                          >
                            <FaEye />
                            <span>Chi tiết</span>
                          </button>

                          {/* In hóa đơn */}
                          <button
                            className="pmp-action-btn pmp-action-btn--print"
                            onClick={() => handlePrint(p)}
                            title="In hóa đơn"
                          >
                            <FaPrint />
                            <span>In</span>
                          </button>

                          {/* Đối soát VNPay/MoMo */}
                          {['vnpay', 'momo'].includes(p.method) && p.status !== 'paid' && (
                            <button
                              className="pmp-action-btn pmp-action-btn--check"
                              onClick={() => handleCheckStatus(p)}
                              title="Đối soát giao dịch"
                            >
                              <FaSearch />
                              <span>Đối soát</span>
                            </button>
                          )}

                          {/* Duyệt thủ công */}
                          {['bank_transfer', 'cash'].includes(p.method) && p.status === 'pending' && (
                            <button
                              className="pmp-action-btn pmp-action-btn--approve"
                              onClick={() => setVerifyTarget(p)}
                              title="Duyệt thủ công"
                            >
                              <FaCheckCircle />
                              <span>Duyệt</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && payments.length > 0 && (
          <div className="pmp-pagination">
            <span className="pmp-pagination-info">
              Tổng <strong>{pagination.total}</strong> bản ghi
            </span>
            <div className="pmp-pagination-controls">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              >
                <FaChevronLeft />
              </button>
              <span>{filters.page} / {pagination.totalPages || 1}</span>
              <button
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      {verifyTarget && (
        <VerifyModal
          payment={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onSuccess={() => { setVerifyTarget(null); fetchPayments(); }}
        />
      )}

      {detailTarget && (
        <DetailModal
          payment={detailTarget}
          loading={detailLoading}
          onClose={() => setDetailTarget(null)}
        />
      )}

      {/* ─── Print area ─── */}
      <PrintInvoice data={printData} />
    </div>
  );
};

export default PaymentManagementPage;
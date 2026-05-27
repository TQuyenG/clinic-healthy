// client/src/pages/PaymentDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import paymentService from '../services/paymentService';
import useToast from '../hooks/useToast'; // <-- Đã bỏ ngoặc nhọn {}
import {
  FaArrowLeft, FaPrint, FaCheckCircle, FaTimesCircle,
  FaSearch, FaUser, FaUserMd, FaCalendarAlt, FaMoneyBillWave,
  FaExchangeAlt, FaFileAlt, FaStickyNote, FaMapMarkerAlt,
  FaPhone, FaEnvelope, FaClock, FaIdCard, FaClipboardList,
  FaChevronRight, FaInfoCircle, FaHistory, FaStethoscope
} from 'react-icons/fa';
import './Paymentdetailpage.css';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (d, opts) => {
  if (!d) return '---';
  try {
    return new Date(d).toLocaleString('vi-VN', opts || {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '---'; }
};

const fmtDate = (d) => fmt(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ';

const METHOD_LABELS = {
  vnpay: 'VNPay', momo: 'MoMo',
  bank_transfer: 'Chuyển khoản Ngân hàng',
  cash: 'Tiền mặt', card: 'Thẻ thanh toán',
};

const STATUS_CFG = {
  pending:  { label: 'Chờ duyệt',  cls: 'pdp-status--warning', icon: FaClock },
  paid:     { label: 'Thành công', cls: 'pdp-status--success', icon: FaCheckCircle },
  failed:   { label: 'Thất bại',   cls: 'pdp-status--danger',  icon: FaTimesCircle },
  refunded: { label: 'Đã hoàn',    cls: 'pdp-status--purple',  icon: FaHistory },
};

// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, children, accent }) => (
  <div className={`pdp-section ${accent ? `pdp-section--${accent}` : ''}`}>
    <div className="pdp-section-header">
      {Icon && <Icon className="pdp-section-icon" />}
      <h3>{title}</h3>
    </div>
    <div className="pdp-section-body">{children}</div>
  </div>
);

const InfoRow = ({ label, value, highlight, mono }) => (
  <div className="pdp-info-row">
    <span className="pdp-info-label">{label}</span>
    <span className={`pdp-info-value${highlight ? ' pdp-info-value--hl' : ''}${mono ? ' pdp-info-value--mono' : ''}`}>
      {value || '---'}
    </span>
  </div>
);

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
        showToast('success', 'Đã cập nhật trạng thái');
        onSuccess();
      } else showToast('error', res.data.message);
    } catch { showToast('error', 'Lỗi kết nối'); }
    finally { setLoading(false); }
  };

  return (
    <div className="pdp-overlay" onClick={onClose}>
      <div className="pdp-modal" onClick={e => e.stopPropagation()}>
        <div className="pdp-modal-hd">
          <span>Xác nhận thủ công</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="pdp-modal-bd">
          <div className="pdp-modal-amount">
            <div>{fmtMoney(payment.amount)}</div>
            <small>{payment.code}</small>
          </div>
          <div className="pdp-fg">
            <label>Hành động</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="paid">✅ Đã nhận tiền</option>
              <option value="failed">❌ Từ chối</option>
            </select>
          </div>
          <div className="pdp-fg">
            <label>Mã tham chiếu ngân hàng</label>
            <input type="text" placeholder="FT2605xxxxxx..." value={form.provider_ref}
              onChange={e => setForm({ ...form, provider_ref: e.target.value })} />
          </div>
          <div className="pdp-fg">
            <label>Ghi chú nội bộ</label>
            <textarea rows={3} value={form.admin_note} placeholder="Ghi chú cho kế toán..."
              onChange={e => setForm({ ...form, admin_note: e.target.value })} />
          </div>
        </div>
        <div className="pdp-modal-ft">
          <button className="pdp-btn pdp-btn--ghost" onClick={onClose}>Hủy</button>
          <button className="pdp-btn pdp-btn--primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ────────────────────────────────────────────────────────────────────
const PaymentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVerify, setShowVerify] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getPaymentById(id);
      if (res.data.success) {
        setPayment(res.data.data);
      } else {
        showToast('error', 'Không tìm thấy giao dịch');
      }
    } catch {
      showToast('error', 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]); // eslint-disable-line

  const handleCheckStatus = async () => {
    showToast('info', 'Đang đối soát...');
    try {
      const res = await paymentService.checkTransactionStatus(id);
      if (res.data.success) {
        showToast(res.data.isPaid ? 'success' : 'warning',
          res.data.isPaid ? '✅ Giao dịch đã thanh toán' : `⚠️ ${res.data.message}`);
        fetchDetail();
      }
    } catch { showToast('error', 'Lỗi đối soát'); }
  };

  const handlePrint = () => {
    window.print();
  };

  // ─── derived data ──────────────────────────────────────────────────────────
  const getPatientInfo = () => {
    if (!payment) return {};
    const appt = payment.Appointment;
    const cons = payment.Consultation;
    if (appt?.guest_name) {
      return {
        name: `${appt.guest_name} (Khách)`,
        phone: appt.guest_phone,
        email: appt.guest_email,
        gender: appt.guest_gender,
        dob: appt.guest_dob,
        address: appt.appointment_address,
      };
    }
    const u = appt?.Patient?.User || cons?.patient;
    return {
      name: u?.full_name || payment.patientName || '---',
      phone: u?.phone,
      email: u?.email,
      gender: u?.gender,
      dob: u?.dob,
      address: u?.address,
    };
  };

  const getDoctorInfo = () => {
    if (!payment) return {};
    const appt = payment.Appointment;
    const cons = payment.Consultation;
    return {
      name: appt?.Doctor?.user?.full_name || cons?.doctor?.full_name || payment.doctorName || '---',
    };
  };

  const getServiceInfo = () => {
    if (!payment) return {};
    const appt = payment.Appointment;
    const cons = payment.Consultation;
    return {
      name: appt?.Service?.name || (cons ? 'Tư vấn trực tuyến' : payment.serviceName) || '---',
      price: appt?.Service?.price,
      date: appt?.appointment_date || cons?.appointment_time,
      time: appt?.appointment_start_time,
      type: appt ? 'Lịch hẹn khám bệnh' : (cons ? 'Tư vấn trực tuyến' : 'Giao dịch khác'),
      code: appt?.code || cons?.consultation_code || '---',
    };
  };

  const getAmounts = () => {
    const finalAmt = parseInt(payment?.amount) || 0;
    // Ưu tiên dùng original_amount/discount_amount do backend tính sẵn
    const originalAmtFromAPI = parseInt(payment?.original_amount) || 0;
    const discountAmtFromAPI = parseInt(payment?.discount_amount) || 0;
    if (originalAmtFromAPI > 0) {
      return {
        finalAmt,
        originalAmt: originalAmtFromAPI,
        discountAmt: discountAmtFromAPI,
      };
    }
    // Fallback: tính từ Service.price (lịch hẹn không có voucher)
    const originalAmt = payment?.Appointment?.Service?.price
      ? parseInt(payment.Appointment.Service.price) : finalAmt;
    const discountAmt = originalAmt > finalAmt ? originalAmt - finalAmt : 0;
    return { finalAmt, originalAmt, discountAmt };
  };

  // ── loading / empty ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pdp-page">
        <div className="pdp-loading">
          <div className="pdp-spinner" />
          <span>Đang tải chi tiết giao dịch...</span>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="pdp-page">
        <div className="pdp-not-found">
          <FaFileAlt />
          <p>Không tìm thấy giao dịch #{id}</p>
          <button className="pdp-btn pdp-btn--primary" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const patient = getPatientInfo();
  const doctor = getDoctorInfo();
  const service = getServiceInfo();
  const { finalAmt, originalAmt, discountAmt } = getAmounts();
  const statusCfg = STATUS_CFG[payment.status] || STATUS_CFG.pending;
  const StatusIcon = statusCfg.icon;

  const canVerify = ['bank_transfer', 'cash'].includes(payment.method) && payment.status === 'pending';
  const canCheck  = ['vnpay', 'momo'].includes(payment.method) && payment.status !== 'paid';

  return (
    <div className="pdp-page">
      {/* ─── Topbar ─── */}
      <div className="pdp-topbar">
        <button className="pdp-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Quay lại
        </button>
        <div className="pdp-breadcrumb">
          <span onClick={() => navigate('/quan-ly-thanh-toan/giao-dich')}>Quản lý giao dịch</span>
          <FaChevronRight />
          <span>Chi tiết #{payment.id}</span>
        </div>
        <div className="pdp-topbar-actions">
          {canCheck && (
            <button className="pdp-btn pdp-btn--outline pdp-btn--icon" onClick={handleCheckStatus}>
              <FaSearch /> Đối soát
            </button>
          )}
          {canVerify && (
            <button className="pdp-btn pdp-btn--success pdp-btn--icon" onClick={() => setShowVerify(true)}>
              <FaCheckCircle /> Duyệt
            </button>
          )}
          <button className="pdp-btn pdp-btn--outline pdp-btn--icon" onClick={handlePrint}>
            <FaPrint /> In hóa đơn
          </button>
        </div>
      </div>

      {/* ─── Hero ─── */}
      <div className="pdp-hero">
        <div className="pdp-hero-left">
          <div className={`pdp-status-badge ${statusCfg.cls}`}>
            <StatusIcon /> {statusCfg.label}
          </div>
          <div className="pdp-hero-code">{payment.code || `GD-${payment.id}`}</div>
          <div className="pdp-hero-sub">
            {payment.transaction_id
              ? `Mã GD: ${payment.transaction_id}`
              : 'Chưa có mã giao dịch'}
          </div>
        </div>
        <div className="pdp-hero-right">
          {discountAmt > 0 && (
            <div className="pdp-hero-original">{fmtMoney(originalAmt)}</div>
          )}
          <div className="pdp-hero-amount">{fmtMoney(finalAmt)}</div>
          {discountAmt > 0 && (
            <div className="pdp-hero-discount">Giảm {fmtMoney(discountAmt)} (Voucher)</div>
          )}
          <div className="pdp-hero-method">
            <span className={`pdp-method-chip pdp-method-${payment.method}`}>
              {METHOD_LABELS[payment.method] || payment.method}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Content grid ─── */}
      <div className="pdp-grid">
        {/* Left column */}
        <div className="pdp-col">

          {/* Patient */}
          <Section icon={FaUser} title="Thông tin bệnh nhân" accent="blue">
            <InfoRow label="Họ và tên" value={patient.name} highlight />
            {patient.phone && <InfoRow label={<><FaPhone /> Điện thoại</>} value={patient.phone} />}
            {patient.email && <InfoRow label={<><FaEnvelope /> Email</>} value={patient.email} />}
            {patient.gender && <InfoRow label="Giới tính" value={patient.gender === 'male' ? 'Nam' : patient.gender === 'female' ? 'Nữ' : patient.gender} />}
            {patient.dob && <InfoRow label="Ngày sinh" value={fmtDate(patient.dob)} />}
            {patient.address && <InfoRow label={<><FaMapMarkerAlt /> Địa chỉ</>} value={patient.address} />}
          </Section>

          {/* Service */}
          <Section icon={FaStethoscope} title="Thông tin dịch vụ" accent="green">
            <InfoRow label="Loại dịch vụ" value={service.type} />
            <InfoRow label="Tên dịch vụ" value={service.name} highlight />
            <InfoRow label="Bác sĩ phụ trách" value={doctor.name ? `BS. ${doctor.name}` : '---'} />
            <InfoRow label="Mã lịch hẹn" value={service.code} mono />
            {service.date && <InfoRow label="Ngày hẹn" value={fmtDate(service.date)} />}
            {service.time && <InfoRow label="Giờ hẹn" value={service.time?.slice(0, 5)} />}
          </Section>

        </div>

        {/* Right column */}
        <div className="pdp-col">

          {/* Payment */}
          <Section icon={FaMoneyBillWave} title="Chi tiết thanh toán" accent="orange">
            <InfoRow label="Phương thức" value={METHOD_LABELS[payment.method] || payment.method} />
            <InfoRow label="Trạng thái" value={statusCfg.label} />
            <InfoRow label="Ngày tạo" value={fmt(payment.createdAt || payment.created_at)} />
            <InfoRow label="Ngày cập nhật" value={fmt(payment.updatedAt || payment.updated_at)} />
            {payment.transaction_id && (
              <InfoRow label="Mã GD hệ thống" value={payment.transaction_id} mono />
            )}
            {payment.provider_ref && (
              <InfoRow label="Mã tham chiếu NH" value={payment.provider_ref} mono />
            )}

            {/* Amount breakdown */}
            <div className="pdp-amount-breakdown">
              <div className="pdp-ab-row">
                <span>Giá dịch vụ</span>
                <span>{fmtMoney(originalAmt)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="pdp-ab-row pdp-ab-row--discount">
                  <span>Giảm giá (Voucher)</span>
                  <span>-{fmtMoney(discountAmt)}</span>
                </div>
              )}
              <div className="pdp-ab-total">
                <span>Thực thu</span>
                <span>{fmtMoney(finalAmt)}</span>
              </div>
            </div>
          </Section>

          {/* Admin note */}
          {(payment.admin_note || payment.proof_image_url) && (
            <Section icon={FaStickyNote} title="Ghi chú & Bằng chứng" accent="purple">
              {payment.admin_note && (
                <div className="pdp-note-box">{payment.admin_note}</div>
              )}
              {payment.proof_image_url && (
                <div className="pdp-proof">
                  <div className="pdp-proof-label"><FaFileAlt /> Ảnh chứng từ</div>
                  <img
                    src={payment.proof_image_url}
                    alt="Chứng từ thanh toán"
                    className="pdp-proof-img"
                    onClick={() => window.open(payment.proof_image_url, '_blank')}
                  />
                </div>
              )}
            </Section>
          )}

          {/* Raw response (expandable) */}
          {payment.raw_response && (
            <details className="pdp-raw">
              <summary><FaClipboardList /> Raw response từ cổng thanh toán</summary>
              <pre>{(() => {
                try { return JSON.stringify(JSON.parse(payment.raw_response), null, 2); }
                catch { return payment.raw_response; }
              })()}</pre>
            </details>
          )}

        </div>
      </div>

      {/* ─── Print area ─── */}
      <div id="pdp-print" className="d-none d-print-block">
        <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'Times New Roman, serif', padding: 24 }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>🏥</div>
            <h2 style={{ margin: 0, fontSize: 16 }}>PHÒNG KHÁM ĐA KHOA EASY MEDIFY</h2>
            <p style={{ margin: '4px 0', fontSize: 12 }}>123 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
            <h3 style={{ marginTop: 10, letterSpacing: 1 }}>HÓA ĐƠN THANH TOÁN</h3>
            <div style={{ fontSize: 12, color: '#555' }}>Mã: {service.code} | In lúc: {fmt(new Date())}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 13, marginBottom: 16 }}>
            <div><b>Bệnh nhân:</b> {patient.name}</div>
            <div><b>Ngày:</b> {new Date().toLocaleDateString('vi-VN')}</div>
            {patient.phone && <div><b>ĐT:</b> {patient.phone}</div>}
            <div><b>Bác sĩ:</b> {doctor.name ? `BS. ${doctor.name}` : '---'}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>Dịch vụ</th>
                <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'center' }}>SL</th>
                <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{service.name}</td>
                <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'center' }}>1</td>
                <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right' }}>{fmtMoney(originalAmt)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>Tổng cộng</td>
                <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{fmtMoney(originalAmt)}</td>
              </tr>
              {discountAmt > 0 && (
                <tr>
                  <td colSpan="2" style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', color: '#dc2626' }}>Giảm giá</td>
                  <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', color: '#dc2626' }}>-{fmtMoney(discountAmt)}</td>
                </tr>
              )}
              <tr>
                <td colSpan="2" style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: 15 }}>Thực thu</td>
                <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: 15 }}>{fmtMoney(finalAmt)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginTop: 30, fontSize: 13 }}>
            <div>
              <p>Người lập phiếu</p>
              <div style={{ borderBottom: '1px dashed #000', margin: '40px auto 6px', width: 120 }}></div>
              <p>Thu ngân viên</p>
            </div>
            <div>
              <p>Xác nhận bệnh nhân</p>
              <div style={{ borderBottom: '1px dashed #000', margin: '40px auto 6px', width: 120 }}></div>
              <p>{patient.name}</p>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12, marginTop: 16, color: '#555' }}>
            Cảm ơn quý khách và hẹn gặp lại!
          </p>
        </div>
      </div>

      {/* ─── Modal ─── */}
      {showVerify && (
        <VerifyModal
          payment={payment}
          onClose={() => setShowVerify(false)}
          onSuccess={() => { setShowVerify(false); fetchDetail(); }}
        />
      )}
    </div>
  );
};

export default PaymentDetailPage;
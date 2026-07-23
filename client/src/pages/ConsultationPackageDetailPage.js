// client/src/pages/ConsultationPackageDetailPage.js
// Trang chi tiết gói tư vấn — clone layout ServiceDetailPage
// Route: /goi-tu-van/:id

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import consultationService from '../services/consultationService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaInfoCircle, FaMoneyBillWave, FaCalendarAlt,
  FaClock, FaUserMd, FaComments, FaVideo, FaCheckCircle,
  FaShieldAlt, FaStar, FaTag, FaLaptopMedical, FaPercent,
  FaExclamationTriangle, FaAngleDown, FaAngleUp
} from 'react-icons/fa';
import './ConsultationPackageDetailPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const fmtPrice = (n) =>
  n != null ? `${parseInt(n).toLocaleString('vi-VN')}₫` : 'Miễn phí';

const ConsultationPackageDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [pkg,            setPkg]            = useState(null);
  const [doctors,        setDoctors]        = useState([]);
  const [refundPolicy,   setRefundPolicy]   = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [showRefund,     setShowRefund]     = useState(false);

  /* ── Fetch package ─────────────────────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // 1. Lấy tất cả gói rồi filter theo id (không có endpoint lấy 1 gói)
        const pkgRes = await consultationService.getAllPublicPackages({ limit: 100 });
        const allPkgs = pkgRes?.data?.data || [];
        const found   = allPkgs.find(p => String(p.id) === String(id));
        if (!found) throw new Error('Không tìm thấy gói tư vấn.');
        setPkg(found);

        // 2. Nếu gói có doctor_codes → lấy danh sách bác sĩ
        if (found.doctor_codes?.length) {
          try {
            const docRes = await consultationService.getAvailableDoctors({ limit: 50 });
            const allDocs = docRes?.data?.data || [];
            const filtered = allDocs.filter(d =>
              found.doctor_codes.includes(d.code)
            );
            setDoctors(filtered);
          } catch { /* bỏ qua nếu lỗi */ }
        }

        // 3. Lấy chính sách hoàn tiền
        try {
          const rpRes = await axios.get(`${API_URL}/settings/refund_policy`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const rpData = rpRes?.data?.value || rpRes?.data?.data || rpRes?.data;
          if (rpData?.consultation) setRefundPolicy(rpData.consultation);
        } catch { /* không bắt buộc */ }

      } catch (err) {
        setError(err.message || 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  /* ── Handlers ──────────────────────────────────────────────────── */
  const handleBook = (consultationType) => {
    if (!user) {
      toast.warning('Vui lòng đăng nhập để đặt lịch.');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    navigate('/dat-lich-tu-van', {
      state: {
        packageId:        parseInt(id),
        consultationType: consultationType || pkg?.package_type || 'chat',
      }
    });
  };

  const goBack = () => navigate('/dich-vu?tab=consultation');

  /* ── Loading ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="cpd-page">
        <div className="cpd-container">
          <div className="cpd-loading">
            <div className="cpd-spinner" />
            <p>Đang tải thông tin gói tư vấn...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ─────────────────────────────────────────────────────── */
  if (error || !pkg) {
    return (
      <div className="cpd-page">
        <div className="cpd-container">
          <div className="cpd-error">
            <FaInfoCircle className="cpd-error-icon" />
            <h2>{error ? 'Có lỗi xảy ra' : 'Không tìm thấy gói tư vấn'}</h2>
            <p>{error || 'Gói tư vấn này không tồn tại hoặc đã bị xóa.'}</p>
            <button className="cpd-btn-back-err" onClick={goBack}>
              <FaArrowLeft /> Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isChat  = pkg.package_type === 'chat';
  const isVideo = pkg.package_type === 'video';
  const isFree  = !pkg.price || parseFloat(pkg.price) === 0;
  const typeColor = isVideo ? '#6c63ff' : '#0ea5a4';

  /* ── Refund tiers ─────────────────────────────────────────────── */
  const refundRules = refundPolicy?.rules || [];
  const bookingFee  = refundPolicy?.booking_fee || 0;
  // Sắp xếp tiers từ xa đến gần (hours_before giảm dần)
  const sortedRules = [...refundRules].sort((a, b) => b.hours_before - a.hours_before);

  /* ── Main render ───────────────────────────────────────────────── */
  return (
    <div className="cpd-page">
      <div className="cpd-container">

        {/* Back button */}
        <button className="cpd-back-btn" onClick={goBack}>
          <FaArrowLeft /> Quay lại danh sách tư vấn
        </button>

        <div className="cpd-layout">

          {/* ══ LEFT: Main content ══════════════════════════════ */}
          <div className="cpd-main">

            {/* Hero card */}
            <div className="cpd-hero">
              <div className="cpd-image-wrap">
                {pkg.image_url ? (
                  <img
                    src={pkg.image_url}
                    alt={pkg.package_name}
                    className="cpd-image"
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=70'; }}
                  />
                ) : (
                  <img
                    src={isVideo
                      ? 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=70'
                      : 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=900&q=70'}
                    alt={pkg.package_name}
                    className="cpd-image"
                  />
                )}
                {/* Active badge */}
                <span className="cpd-status-badge">
                  <span className="cpd-status-dot" />
                  Đang hoạt động
                </span>
              </div>

              <div className="cpd-hero-body">
                <span className="cpd-type-badge" style={{ background: isVideo ? '#ede9fe' : '#e0f7f7', color: typeColor }}>
                  {isVideo ? <><FaVideo /> Video Call</> : <><FaComments /> Chat</>}
                </span>
                <h1 className="cpd-title">{pkg.package_name}</h1>
                {pkg.description && <p className="cpd-short-desc">{pkg.description}</p>}
              </div>
            </div>

            {/* Quick stats row */}
            <div className="cpd-stats-row">
              <div className="cpd-stat-card">
                <div className="cpd-stat-icon" style={{ color: typeColor }}><FaClock /></div>
                <div>
                  <p className="cpd-stat-label">Thời lượng</p>
                  <p className="cpd-stat-value">{pkg.duration_minutes} phút</p>
                </div>
              </div>
              <div className="cpd-stat-card">
                <div className="cpd-stat-icon" style={{ color: typeColor }}>
                  {isVideo ? <FaVideo /> : <FaComments />}
                </div>
                <div>
                  <p className="cpd-stat-label">Hình thức</p>
                  <p className="cpd-stat-value">{isVideo ? 'Video Call' : 'Chat'}</p>
                </div>
              </div>
              <div className="cpd-stat-card">
                <div className="cpd-stat-icon" style={{ color: typeColor }}><FaMoneyBillWave /></div>
                <div>
                  <p className="cpd-stat-label">Chi phí</p>
                  <p className="cpd-stat-value">{isFree ? 'Miễn phí' : fmtPrice(pkg.price)}</p>
                </div>
              </div>
              {doctors.length > 0 && (
                <div className="cpd-stat-card">
                  <div className="cpd-stat-icon" style={{ color: typeColor }}><FaUserMd /></div>
                  <div>
                    <p className="cpd-stat-label">Bác sĩ</p>
                    <p className="cpd-stat-value">{doctors.length} bác sĩ</p>
                  </div>
                </div>
              )}
            </div>

            {/* Doctors section */}
            {doctors.length > 0 && (
              <div className="cpd-section-card">
                <div className="cpd-section-header">
                  <FaUserMd style={{ color: typeColor }} />
                  <h3>Bác sĩ thực hiện</h3>
                </div>
                <div className="cpd-doctors-grid">
                  {doctors.map(doc => {
                    const name    = doc.user?.full_name || doc.full_name || 'Bác sĩ';
                    const avatar  = doc.user?.avatar_url || doc.avatar_url;
                    const spec    = doc.specialty?.name || 'Đa khoa';
                    const expYrs  = doc.experience_years || 0;
                    const docCode = doc.code;
                    return (
                      <div key={doc.id} className="cpd-doctor-card">
                        {avatar ? (
                          <img src={avatar} alt={name} className="cpd-doctor-avatar"
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5a4&color=fff&size=80`; }} />
                        ) : (
                          <div className="cpd-doctor-avatar-ph" style={{ background: typeColor }}>
                            <FaUserMd />
                          </div>
                        )}
                        <div className="cpd-doctor-info">
                          <p className="cpd-doctor-badge">Bác sĩ phụ trách</p>
                          <h4 className="cpd-doctor-name">BS. {name}</h4>
                          <p className="cpd-doctor-spec"><FaTag /> {spec}</p>
                          {expYrs > 0 && (
                            <span className="cpd-doctor-exp">
                              <FaStar /> {expYrs} năm kinh nghiệm
                            </span>
                          )}
                        </div>
                        <button
                          className="cpd-doctor-profile-btn"
                          onClick={() => navigate(`/bac-si/${docCode || doc.id}`)}
                        >
                          Xem hồ sơ
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description / Notes */}
            {(pkg.description || pkg.notes) && (
              <div className="cpd-section-card">
                <div className="cpd-section-header">
                  <FaInfoCircle style={{ color: typeColor }} />
                  <h3>Thông tin chi tiết</h3>
                </div>
                {pkg.description && <p className="cpd-desc-text">{pkg.description}</p>}
                {pkg.notes && pkg.notes !== pkg.description && (
                  <p className="cpd-notes-text">{pkg.notes}</p>
                )}
              </div>
            )}

            {/* Features */}
            <div className="cpd-section-card">
              <div className="cpd-section-header">
                <FaCheckCircle style={{ color: typeColor }} />
                <h3>Tính năng nổi bật</h3>
              </div>
              <div className="cpd-features-grid">
                {/* Features từ DB */}
                {Array.isArray(pkg.features) && pkg.features.map((f, i) => (
                  <div key={i} className="cpd-feature-item">
                    <FaCheckCircle style={{ color: typeColor }} />
                    {f}
                  </div>
                ))}
                {/* Default features nếu không có trong DB */}
                {(!pkg.features || pkg.features.length === 0) && (
                  <>
                    <div className="cpd-feature-item"><FaCheckCircle style={{ color: typeColor }} />Bác sĩ chuyên khoa giàu kinh nghiệm</div>
                    <div className="cpd-feature-item"><FaCheckCircle style={{ color: typeColor }} />Kết nối nhanh chóng, tiện lợi</div>
                    <div className="cpd-feature-item"><FaCheckCircle style={{ color: typeColor }} />Bảo mật thông tin tuyệt đối</div>
                    <div className="cpd-feature-item"><FaCheckCircle style={{ color: typeColor }} />Hỗ trợ gửi file, hình ảnh đính kèm</div>
                    {isVideo && <div className="cpd-feature-item"><FaCheckCircle style={{ color: typeColor }} />Video HD chất lượng cao</div>}
                    <div className="cpd-feature-item"><FaCheckCircle style={{ color: typeColor }} />Lưu lịch sử tư vấn</div>
                  </>
                )}
              </div>
            </div>

            {/* Chính sách hoàn tiền — ACCORDION */}
            <div className="cpd-section-card cpd-refund-card">
              <button
                className="cpd-refund-toggle"
                onClick={() => setShowRefund(v => !v)}
              >
                <div className="cpd-refund-toggle-left">
                  <FaShieldAlt style={{ color: '#3b82f6' }} />
                  <h3>Chính sách hoàn tiền</h3>
                </div>
                {showRefund ? <FaAngleUp /> : <FaAngleDown />}
              </button>

              {showRefund && (
                <div className="cpd-refund-body">

                  {/* Guarantee box — 100% */}
                  <div className="cpd-refund-guarantee">
                    <div className="cpd-refund-guarantee-title">
                      ✅ Hoàn tiền 100% trong các trường hợp sau
                    </div>
                    <div className="cpd-refund-guarantee-grid">
                      <div className="cpd-refund-guarantee-item">
                        <FaUserMd className="cpd-refund-gi-icon green" />
                        <div>
                          <strong>Bác sĩ / Admin hủy lịch</strong>
                          <p>Do bác sĩ bận đột xuất hoặc hệ thống thay đổi lịch.</p>
                          <span className="cpd-refund-tag green">Hoàn 100% + phí giữ chỗ</span>
                        </div>
                      </div>
                      <div className="cpd-refund-guarantee-item">
                        <FaLaptopMedical className="cpd-refund-gi-icon red" />
                        <div>
                          <strong>Sự cố kỹ thuật</strong>
                          <p>Lỗi kết nối, Video call không hoạt động, bác sĩ vắng mặt.</p>
                          <span className="cpd-refund-tag red">Hoàn 100% + phí giữ chỗ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Khách hàng tự hủy */}
                  <div className="cpd-refund-patient">
                    <h4 className="cpd-refund-sub-title">
                      <FaExclamationTriangle style={{ color: '#f59e0b' }} />
                      Khách hàng tự hủy lịch
                    </h4>

                    {bookingFee > 0 && (
                      <div className="cpd-refund-fee-note">
                        <FaPercent /> Phí giữ chỗ cố định không hoàn: <strong>{fmtPrice(bookingFee)}</strong>
                      </div>
                    )}

                    {sortedRules.length > 0 ? (
                      <div className="cpd-refund-tiers">
                        {sortedRules.map((rule, i) => {
                          const isGood = rule.refund_percent >= 80;
                          const isMid  = rule.refund_percent >= 30 && rule.refund_percent < 80;
                          return (
                            <div key={i} className={`cpd-refund-tier ${isGood ? 'tier-green' : isMid ? 'tier-yellow' : 'tier-red'}`}>
                              <div className="cpd-refund-tier-left">
                                <span className="cpd-refund-tier-condition">
                                  Hủy trước <strong>{rule.hours_before} giờ</strong>
                                </span>
                              </div>
                              <div className={`cpd-refund-tier-pct ${isGood ? 'green' : isMid ? 'yellow' : 'red'}`}>
                                Hoàn <strong>{rule.refund_percent}%</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback nếu chưa cấu hình */
                      <div className="cpd-refund-tiers">
                        <div className="cpd-refund-tier tier-green">
                          <span className="cpd-refund-tier-condition">Hủy trước <strong>24 giờ</strong></span>
                          <div className="cpd-refund-tier-pct green">Hoàn <strong>100%</strong></div>
                        </div>
                        <div className="cpd-refund-tier tier-yellow">
                          <span className="cpd-refund-tier-condition">Hủy trước <strong>12 giờ</strong></span>
                          <div className="cpd-refund-tier-pct yellow">Hoàn <strong>50%</strong></div>
                        </div>
                        <div className="cpd-refund-tier tier-red">
                          <span className="cpd-refund-tier-condition">Hủy dưới <strong>12 giờ</strong></span>
                          <div className="cpd-refund-tier-pct red">Hoàn <strong>0%</strong></div>
                        </div>
                      </div>
                    )}

                    <p className="cpd-refund-note">
                      <FaInfoCircle /> Hoàn tiền được xử lý trong vòng 3–5 ngày làm việc.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>{/* end .cpd-main */}

          {/* ══ RIGHT: Sidebar ══════════════════════════════════ */}
          <div className="cpd-sidebar">
            <div className="cpd-booking-card">

              {/* Sidebar header */}
              <div className="cpd-booking-header" style={{ background: `linear-gradient(135deg, ${typeColor} 0%, ${isVideo ? '#4f46e5' : '#0d8f8e'} 100%)` }}>
                <h3>
                  <FaCalendarAlt />
                  {isVideo ? 'Đặt lịch Video Call' : 'Đặt lịch Tư vấn Chat'}
                </h3>
                <div className="cpd-price-block">
                  <p className="cpd-price-label">Chi phí gói</p>
                  <p className="cpd-price-value">
                    <FaMoneyBillWave />
                    {isFree ? 'Miễn phí' : parseInt(pkg.price).toLocaleString('vi-VN')}
                    {!isFree && <span className="cpd-price-unit">VNĐ</span>}
                  </p>
                </div>
              </div>

              {/* Detail rows */}
              <div className="cpd-booking-body">
                <div className="cpd-detail-row">
                  <span className="cpd-detail-label"><FaClock /> Thời lượng</span>
                  <span className="cpd-detail-value">{pkg.duration_minutes} phút</span>
                </div>
                <div className="cpd-detail-row">
                  <span className="cpd-detail-label">
                    {isVideo ? <FaVideo /> : <FaComments />} Hình thức
                  </span>
                  <span className="cpd-detail-value">{isVideo ? 'Video Call HD' : 'Chat trực tuyến'}</span>
                </div>
                {pkg.package_code && (
                  <div className="cpd-detail-row">
                    <span className="cpd-detail-label"><FaTag /> Mã gói</span>
                    <span className="cpd-detail-value" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{pkg.package_code}</span>
                  </div>
                )}
                <div className="cpd-detail-row">
                  <span className="cpd-detail-label"><FaUserMd /> Bác sĩ</span>
                  <span className="cpd-detail-value">
                    {doctors.length > 0 ? `${doctors.length} bác sĩ` : 'Chọn khi đặt lịch'}
                  </span>
                </div>
                <div className="cpd-detail-row">
                  <span className="cpd-detail-label"><FaShieldAlt /> Bảo mật</span>
                  <span className="cpd-detail-value">Mã hóa đầu cuối</span>
                </div>

                {/* CTA buttons */}
                <button
                  className="cpd-btn-book cpd-btn-primary"
                  style={{ background: `linear-gradient(135deg, ${typeColor} 0%, ${isVideo ? '#4f46e5' : '#0d8f8e'} 100%)` }}
                  onClick={() => handleBook(pkg.package_type)}
                >
                  <FaCalendarAlt /> Đặt lịch ngay
                </button>

                {/* Nếu là chat thì cho phép đặt video thêm (nếu cần) */}
                {isChat && (
                  <button
                    className="cpd-btn-book cpd-btn-secondary"
                    onClick={() => navigate('/dich-vu?tab=consultation')}
                  >
                    <FaVideo /> Xem gói Video Call
                  </button>
                )}
                {isVideo && (
                  <button
                    className="cpd-btn-book cpd-btn-secondary"
                    onClick={() => navigate('/dich-vu?tab=consultation')}
                  >
                    <FaComments /> Xem gói Chat
                  </button>
                )}

                <div className="cpd-note-box">
                  <FaInfoCircle />
                  <p>Vui lòng đăng nhập để đặt lịch. Bạn có thể chọn bác sĩ và khung giờ phù hợp.</p>
                </div>

                {/* Quick refund summary in sidebar */}
                {sortedRules.length > 0 && (
                  <div className="cpd-sidebar-refund">
                    <p className="cpd-sidebar-refund-title">
                      <FaShieldAlt /> Chính sách hủy lịch
                    </p>
                    {sortedRules.slice(0, 2).map((r, i) => (
                      <div key={i} className="cpd-sidebar-refund-row">
                        <span>Trước {r.hours_before}h</span>
                        <span className={r.refund_percent >= 80 ? 'cpd-sr-green' : r.refund_percent >= 30 ? 'cpd-sr-yellow' : 'cpd-sr-red'}>
                          Hoàn {r.refund_percent}%
                        </span>
                      </div>
                    ))}
                    <button className="cpd-sidebar-refund-more" onClick={() => setShowRefund(true)}>
                      Xem đầy đủ chính sách ↓
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ConsultationPackageDetailPage;
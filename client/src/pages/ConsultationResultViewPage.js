// client/src/pages/ConsultationResultViewPage.js
// Trang xem kết quả tư vấn online (read-only) cho Bệnh nhân

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import {
  FaArrowLeft, FaUserMd, FaCalendarAlt, FaStethoscope,
  FaFileMedicalAlt, FaCheckCircle, FaNotesMedical, FaPills,
  FaHeartbeat, FaClipboardList, FaSpinner, FaExclamationTriangle,
  FaComments, FaVideo, FaClock, FaStar
} from 'react-icons/fa';
import './ConsultationResultViewPage.css';

const ConsultationResultViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await consultationService.getConsultationById(id);
        if (res.data.success) {
          setConsultation(res.data.data);
        } else {
          setError('Không tìm thấy kết quả tư vấn');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Lỗi khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className="crvp-loading">
      <FaSpinner className="crvp-spin" />
      <span>Đang tải kết quả tư vấn...</span>
    </div>
  );

  if (error || !consultation) return (
    <div className="crvp-error">
      <FaExclamationTriangle />
      <p>{error || 'Không tìm thấy kết quả tư vấn'}</p>
      <button onClick={() => navigate(-1)}>Quay lại</button>
    </div>
  );

  const prescription = (() => {
    const p = consultation.prescription_data;
    if (!p) return [];
    if (Array.isArray(p)) return p;
    try { return JSON.parse(p); } catch { return []; }
  })();

  return (
    <div className="crvp-page">
      {/* HEADER */}
      <header className="crvp-header">
        <button className="crvp-btn-back" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Quay lại
        </button>
        <div className="crvp-header-brand">
          <div className="crvp-brand-icon"><FaNotesMedical /></div>
          <span>Kết Quả Tư Vấn Online</span>
        </div>
        <span className="crvp-code-badge">
          {consultation.consultation_code || `#${id}`}
        </span>
      </header>

      <div className="crvp-body">

        {/* INFO CARDS */}
        <div className="crvp-info-row">
          <div className="crvp-info-card">
            <div className="crvp-info-icon"><FaUserMd /></div>
            <div className="crvp-info-content">
              <span className="crvp-info-label">Bác sĩ</span>
              <span className="crvp-info-value">{consultation.doctor?.full_name || 'N/A'}</span>
            </div>
          </div>
          <div className="crvp-info-card">
            <div className="crvp-info-icon"><FaCalendarAlt /></div>
            <div className="crvp-info-content">
              <span className="crvp-info-label">Thời gian tư vấn</span>
              <span className="crvp-info-value">{formatDateTime(consultation.appointment_time)}</span>
            </div>
          </div>
          <div className="crvp-info-card">
            <div className="crvp-info-icon">
              {consultation.consultation_type === 'video' ? <FaVideo /> : <FaComments />}
            </div>
            <div className="crvp-info-content">
              <span className="crvp-info-label">Loại tư vấn</span>
              <span className="crvp-info-value">
                {consultation.consultation_type === 'video' ? 'Video Call' : 'Chat trực tuyến'}
              </span>
            </div>
          </div>
          {consultation.duration_minutes > 0 && (
            <div className="crvp-info-card">
              <div className="crvp-info-icon"><FaClock /></div>
              <div className="crvp-info-content">
                <span className="crvp-info-label">Thời lượng</span>
                <span className="crvp-info-value">{consultation.duration_minutes} phút</span>
              </div>
            </div>
          )}
        </div>

        {/* TRIỆU CHỨNG BAN ĐẦU */}
        {consultation.chief_complaint && (
          <div className="crvp-section">
            <div className="crvp-section-title">
              <FaClipboardList /> Triệu chứng ban đầu
            </div>
            <p className="crvp-text">{consultation.chief_complaint}</p>
            {consultation.symptom_duration && (
              <p className="crvp-sub-text">Thời gian xuất hiện: <strong>{consultation.symptom_duration}</strong></p>
            )}
          </div>
        )}

        {/* KẾT QUẢ TƯ VẤN */}
        {consultation.diagnosis ? (
          <div className="crvp-result-block">
            <div className="crvp-result-header">
              <FaCheckCircle /> Kết luận của bác sĩ
            </div>

            <div className="crvp-result-grid">
              <div className="crvp-result-item">
                <span className="crvp-result-label"><FaStethoscope /> Chẩn đoán</span>
                <p className="crvp-result-value highlight">{consultation.diagnosis}</p>
              </div>

              {consultation.symptoms && (
                <div className="crvp-result-item">
                  <span className="crvp-result-label"><FaHeartbeat /> Triệu chứng ghi nhận</span>
                  <p className="crvp-result-value">{consultation.symptoms}</p>
                </div>
              )}

              {consultation.treatment_plan && (
                <div className="crvp-result-item">
                  <span className="crvp-result-label"><FaFileMedicalAlt /> Kế hoạch điều trị</span>
                  <p className="crvp-result-value">{consultation.treatment_plan}</p>
                </div>
              )}

              {consultation.advice && (
                <div className="crvp-result-item">
                  <span className="crvp-result-label"><FaNotesMedical /> Lời khuyên bác sĩ</span>
                  <p className="crvp-result-value">{consultation.advice}</p>
                </div>
              )}

              {consultation.clinical_note && (
                <div className="crvp-result-item">
                  <span className="crvp-result-label">Ghi chú lâm sàng</span>
                  <p className="crvp-result-value">{consultation.clinical_note}</p>
                </div>
              )}
            </div>

            {/* ĐƠN THUỐC */}
            {prescription.length > 0 && (
              <div className="crvp-prescription">
                <div className="crvp-prescription-title">
                  <FaPills /> Đơn thuốc
                </div>
                <table className="crvp-prescription-table">
                  <thead>
                    <tr>
                      <th>Tên thuốc</th>
                      <th>Số lượng</th>
                      <th>Liều dùng</th>
                      <th>Hướng dẫn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescription.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name || item.medicine_name || 'N/A'}</td>
                        <td>{item.quantity || item.amount || 'N/A'}</td>
                        <td>{item.dosage || item.dose || 'N/A'}</td>
                        <td>{item.instructions || item.note || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TÁI KHÁM */}
            {consultation.need_followup && consultation.followup_date && (
              <div className="crvp-followup">
                <FaCalendarAlt />
                <span>Ngày tái khám: <strong>{formatDate(consultation.followup_date)}</strong></span>
                {consultation.followup_notes && (
                  <p className="crvp-followup-note">{consultation.followup_notes}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="crvp-no-result">
            <FaExclamationTriangle />
            <p>Bác sĩ chưa cập nhật kết quả tư vấn</p>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="crvp-footer-actions">
          <button className="crvp-btn-back-footer" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Quay lại danh sách
          </button>
          {consultation.status === 'completed' && (
            <button
              className="crvp-btn-detail"
              onClick={() => navigate(`/tu-van/${id}`)}
            >
              <FaStar /> Xem chi tiết & Đánh giá
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ConsultationResultViewPage;
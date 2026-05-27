// client/src/pages/MedicalRecordViewPage.js
// Hồ sơ Y tế — Redesign v3
// • Class prefix: mrvp-   (không trùng với file khác)
// • Icon: tất cả qua <span className="mrvp-icon">
// • Per-section inline edit, completion pill ở header
// • Tiền sử bệnh: tag-checkbox + ghi chú tự do

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import medicalRecordService from '../services/medicalRecordService';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import './MedicalRecordViewPage.css';
import MedicalRecordSummarySections from '../components/medical/MedicalRecordSummarySections';

import {
  FaUserInjured, FaUserMd, FaCalendarAlt, FaNotesMedical,
  FaFileMedical, FaFilePrescription, FaDownload, FaSpinner,
  FaFileImage, FaFilePdf, FaFileWord, FaStethoscope,
  FaArrowLeft, FaPrint, FaSave, FaWeight, FaRuler, FaTint, FaIdCard,
  FaAllergies, FaHeartbeat, FaPhone, FaEdit, FaCheckCircle,
  FaInfoCircle, FaClipboardList, FaUser, FaExclamationTriangle,
  FaTimes, FaPlus, FaSyringe, FaPills, FaRunning, FaBeer, FaSmoking,
  FaShareAlt, FaGlobe
} from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/* ── Preset options ───────────────────────────────────────────────────── */
const ALLERGY_OPTS = [
  'Penicillin','Aspirin','Ibuprofen','Sulfonamide',
  'Hải sản','Đậu phộng','Sữa & Trứng','Latex','Phấn hoa / bụi'
];
const CHRONIC_OPTS = [
  'Tiểu đường','Cao huyết áp','Tim mạch','Hen suyễn',
  'COPD','Thận mạn','Gan mạn','Ung thư','Trầm cảm / Lo âu',
  'Tuyến giáp','Mỡ máu cao','Gout','Loãng xương'
];
const FAMILY_OPTS = [
  'Tim mạch','Tiểu đường','Ung thư','Đột quỵ',
  'Tăng huyết áp','Bệnh thận','Tâm thần','Loãng xương'
];
const VACCINE_OPTS = [
  'COVID-19','Cúm mùa','Viêm gan B','Viêm gan A',
  'Sởi - Quai bị - Rubella','Thủy đậu','HPV',
  'Uốn ván','Viêm màng não','Phế cầu'
];
const SMOKE_OPTS   = { no:'Không hút', former:'Đã bỏ', occasional:'Thỉnh thoảng', regular:'Thường xuyên' };
const ALCOHOL_OPTS = { no:'Không uống', occasional:'Thỉnh thoảng', moderate:'Vừa phải', frequent:'Thường xuyên' };
const EXERCISE_OPTS= { rarely:'Hiếm khi', '1-2':'1-2 lần/tuần', '3-4':'3-4 lần/tuần', daily:'Hàng ngày' };

/* ── Helpers ──────────────────────────────────────────────────────────── */
const parseList = (val) => {
  if (!val || val.toString().trim() === '') return [];
  try {
    const p = JSON.parse(val);
    if (Array.isArray(p)) return p;
  } catch (_) {}
  return val.toString().split(',').map(s => s.trim()).filter(Boolean);
};
const toJSON = (arr) => JSON.stringify(arr);

const calcCompletion = (d) => {
  const checks = [
    !!d.height, !!d.weight, !!d.blood_type, !!d.health_insurance,
    !!d.emergency_contact,
    parseList(d.allergies).length > 0,
    parseList(d.chronic_diseases).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

/* ── Icon helper ──────────────────────────────────────────────────────── */
const Icon = ({ as: Comp, className = '', style }) => (
  <span className={`mrvp-icon ${className}`} style={style} aria-hidden>
    <Comp />
  </span>
);

/* ══════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS — định nghĩa NGOÀI component chính để React không
   re-mount mỗi khi state thay đổi (fix bug mất focus / mất ký tự)
══════════════════════════════════════════════════════════════════════ */

/* ── Section wrapper ── */
const Sec = ({ id, title, icon, children, editingSection, onStartEdit, onCancel, onSave }) => {
  const on = editingSection === id;
  return (
    <div className="mrvp-section">
      <div className="mrvp-section-head">
        <span className="mrvp-section-title">
          <Icon as={icon} /> {title}
        </span>
        <div className="mrvp-sec-btns">
          {!on
            ? <button className="mrvp-btn-sedit" onClick={() => onStartEdit(id)}>
                <Icon as={FaEdit} /> Sửa
              </button>
            : <>
                <button className="mrvp-btn-scancel" onClick={onCancel}>Hủy</button>
                <button className="mrvp-btn-ssave" onClick={onSave}>
                  <Icon as={FaSave} /> Lưu
                </button>
              </>
          }
        </div>
      </div>
      <div className="mrvp-section-body">{children(on)}</div>
    </div>
  );
};

/* ── Tag group ── */
const TagGroup = ({ field, opts, label, icon, hint, sectionId, editingSection, draft, healthData, onToggleTag }) => {
  const on       = editingSection === sectionId;
  const src      = on ? (draft[field] ?? healthData[field]) : healthData[field];
  const selected = parseList(src);
  return (
    <div className="mrvp-taggroup">
      {label && (
        <div className="mrvp-taggroup-lbl">
          {icon && <Icon as={icon} />} {label}
        </div>
      )}
      {on && hint && <div className="mrvp-taggroup-hint">{hint}</div>}
      <div className="mrvp-tags">
        {opts.map(opt =>
          on ? (
            <button
              key={opt} type="button"
              className={`mrvp-tag-btn ${selected.includes(opt) ? 'mrvp-tag-btn--on' : ''}`}
              onClick={() => onToggleTag(field, opt)}
            >
              {selected.includes(opt) && <Icon as={FaCheckCircle} />} {opt}
            </button>
          ) : selected.includes(opt) ? (
            <span key={opt} className="mrvp-tag-chip">{opt}</span>
          ) : null
        )}
        {!on && selected.length === 0 && <span className="mrvp-tag-empty">Chưa có thông tin</span>}
      </div>
    </div>
  );
};

/* ── Vaccine group ── */
const VaxGroup = ({ editingSection, draft, healthData, onToggleTag }) => {
  const on       = editingSection === 'vaccines';
  const src      = on ? (draft.vaccination_history ?? healthData.vaccination_history) : healthData.vaccination_history;
  const selected = parseList(src);
  return (
    <div className="mrvp-tags">
      {VACCINE_OPTS.map(v =>
        on ? (
          <button
            key={v} type="button"
            className={`mrvp-vax-btn ${selected.includes(v) ? 'mrvp-vax-btn--on' : ''}`}
            onClick={() => onToggleTag('vaccination_history', v)}
          >
            {selected.includes(v) && <Icon as={FaCheckCircle} />} {v}
          </button>
        ) : selected.includes(v) ? (
          <span key={v} className="mrvp-vax-chip">
            <Icon as={FaCheckCircle} /> {v}
          </span>
        ) : null
      )}
      {!on && selected.length === 0 && <span className="mrvp-tag-empty">Chưa có thông tin</span>}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   COMPONENT CHÍNH
══════════════════════════════════════════════════════════════════════ */
const MedicalRecordViewPage = ({ mode }) => {
  const { record_id } = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const { user }      = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const initialTab  = queryParams.get('tab') || (record_id ? 'records' : 'health-profile');

  /* ── State ── */
  const [activeTab,      setActiveTab]      = useState(initialTab);
  const [record,         setRecord]         = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const [missingFields,  setMissingFields]  = useState([]);
  const [bmi,            setBmi]            = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [draft,          setDraft]          = useState({});
  const [medInput,       setMedInput]       = useState('');
  const [showShareConfirmModal, setShowShareConfirmModal] = useState(false);
  const [shareToggleLoading, setShareToggleLoading] = useState(false);
  const [pendingShareValue, setPendingShareValue] = useState(null);

  const [healthData, setHealthData] = useState({
    height:'', weight:'', blood_type:'', health_insurance:'',
    allergies:'[]', allergy_note:'',
    chronic_diseases:'[]', chronic_note:'',
    emergency_contact:'',
    family_history:'[]', family_note:'',
    current_medications:'[]',
    vaccination_history:'[]',
    smoking_status:'no', alcohol_consumption:'no', exercise_frequency:'rarely'
  });

  /* ── Effects (ALL hooks BEFORE any conditional return) ── */
  useEffect(() => {
    if (activeTab === 'records' && record_id) loadMedicalRecord();
    else if (activeTab === 'health-profile') loadHealthProfile();
  }, [record_id, activeTab]);

  useEffect(() => {
    const h = parseFloat(healthData.height);
    const w = parseFloat(healthData.weight);
    setBmi((h > 0 && w > 0) ? (w / ((h/100)**2)).toFixed(1) : null);
  }, [healthData.height, healthData.weight]);

  /* ── Conditional return AFTER hooks ── */
  if (mode === 'management') return <Navigate to="/ho-so-benh-an" replace />;

  /* ── Loaders ── */
  const loadMedicalRecord = async () => {
    try {
      setLoading(true);
      const res = await medicalRecordService.getMedicalRecordById(record_id);
      if (res.data.success) setRecord(res.data.data);
      else toast.error('Không thể tải hồ sơ y tế.');
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error('Bạn không có quyền xem hồ sơ này.');
        navigate('/login');
      } else toast.error('Lỗi khi tải dữ liệu.');
    } finally { setLoading(false); }
  };

  const loadHealthProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await userService.getMyRoleInfo();
      if (res.data.success) {
        const { missing_fields, roleData } = res.data.user;
        let med = {};
        if (roleData?.medical_history) {
          try { med = typeof roleData.medical_history === 'string' ? JSON.parse(roleData.medical_history) : roleData.medical_history; }
          catch (_) { med = {}; }
        }
        const merged = { ...healthData, ...(med || {}) };
        merged.share_with_doctors = !!merged.share_with_doctors;
        setHealthData(merged);
        setCompletionRate(calcCompletion(merged));
        setMissingFields(missing_fields || []);
      }
    } catch (_) { toast.error('Không thể tải hồ sơ sức khỏe'); }
    finally { setProfileLoading(false); }
  };

  /* ── Inline edit helpers ── */
  const startEdit  = (id) => { setEditingSection(id); setDraft({ ...healthData }); setMedInput(''); };
  const cancelEdit = ()   => { setEditingSection(null); setDraft({}); };
  const setField   = (k,v) => setDraft(p => ({ ...p, [k]: v }));

  const toggleTag = (field, value) => {
    const cur  = parseList(draft[field] ?? healthData[field]);
    const next = cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value];
    setField(field, toJSON(next));
  };

  const addMed = () => {
    if (!medInput.trim()) return;
    const cur = parseList(draft.current_medications ?? healthData.current_medications);
    setField('current_medications', toJSON([...cur, medInput.trim()]));
    setMedInput('');
  };
  const removeMed = (i) => {
    const cur = parseList(draft.current_medications ?? healthData.current_medications);
    setField('current_medications', toJSON(cur.filter((_,j) => j !== i)));
  };

  const saveSection = async () => {
    const merged = { ...healthData, ...draft };
    try {
      const res = await userService.updatePatientHealthInfo(merged);
      if (res.data.success) {
        setHealthData(merged);
        setCompletionRate(calcCompletion(merged));
        setEditingSection(null);
        toast.success('Đã lưu!');
      }
    } catch (_) { toast.error('Lỗi cập nhật'); }
  };

  const openShareConfirmModal = (nextValue) => {
    setPendingShareValue(nextValue);
    setShowShareConfirmModal(true);
  };

  const confirmShareToggle = async () => {
    if (pendingShareValue === null) return;

    try {
      setShareToggleLoading(true);
      const payload = { ...healthData, share_with_doctors: pendingShareValue };
      const res = await userService.updatePatientHealthInfo(payload);
      if (res.data.success) {
        setHealthData(payload);
        toast.success(pendingShareValue ? 'Đã bật chia sẻ công khai cho bác sĩ' : 'Đã tắt chia sẻ công khai cho bác sĩ');
        setShowShareConfirmModal(false);
        setPendingShareValue(null);
        await loadHealthProfile();
      }
    } catch (_) {
      toast.error('Không thể cập nhật trạng thái chia sẻ');
    } finally {
      setShareToggleLoading(false);
    }
  };

  /* ── BMI ── */
  const bmiStatus = () => {
    if (!bmi) return null;
    const v = parseFloat(bmi);
    if (v < 18.5) return { label:'Thiếu cân',    color:'#f59e0b' };
    if (v < 25)   return { label:'Bình thường',  color:'#22c55e' };
    if (v < 30)   return { label:'Thừa cân',     color:'#f97316' };
    return              { label:'Béo phì',       color:'#ef4444' };
  };
  const bs = bmiStatus();

  /* ── File helpers ── */
  const fileIcon = (name) => {
    const e = name.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','webp'].includes(e)) return FaFileImage;
    if (e === 'pdf') return FaFilePdf;
    if (['doc','docx'].includes(e)) return FaFileWord;
    return FaFileMedical;
  };
  const fileUrl = (url) => url ? `${API_URL}${url.startsWith('/') ? url : `/${url}`}` : '#';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'N/A';
  const patientName = record?.patient_name || record?.Appointment?.patient_name || record?.Patient?.User?.full_name || record?.Patient?.user?.full_name || record?.Appointment?.guest_name || 'N/A';
  const patientPhone = record?.patient_phone || record?.Appointment?.patient_phone || record?.Patient?.User?.phone || record?.Patient?.user?.phone || record?.Appointment?.guest_phone || 'N/A';
  const patientEmail = record?.patient_email || record?.Appointment?.patient_email || record?.Patient?.User?.email || record?.Patient?.user?.email || record?.Appointment?.guest_email || 'N/A';
  const doctorName = record?.doctor_name || record?.Doctor?.user?.full_name || 'N/A';
  const doctorPhone = record?.doctor_phone || record?.Doctor?.user?.phone || 'N/A';
  const doctorEmail = record?.doctor_email || record?.Doctor?.user?.email || 'N/A';
  const serviceName = record?.Service?.name || record?.Appointment?.Service?.name || record?.Appointment?.service_name || 'N/A';

  /* ── Props chung cho sub-components ── */
  const secProps = { editingSection, onStartEdit: startEdit, onCancel: cancelEdit, onSave: saveSection };
  const tagProps = { editingSection, draft, healthData, onToggleTag: toggleTag };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="mrvp-page">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="mrvp-header">
        <div className="mrvp-header-top">
          <button className="mrvp-btn-back" onClick={() => navigate(-1)}>
            <Icon as={FaArrowLeft} /> Quay lại
          </button>

          <div className="mrvp-brand">
            <div className="mrvp-brand-logo">
              <Icon as={FaNotesMedical} />
            </div>
            <span className="mrvp-brand-name">Hồ Sơ Y Tế</span>
          </div>

          {activeTab === 'health-profile' && (
            <div className={`mrvp-completion-pill ${completionRate < 100 ? 'mrvp-incomplete' : ''}`}>
              <div className="mrvp-completion-minibar">
                <div className="mrvp-completion-minibar-fill" style={{ width: `${completionRate}%` }} />
              </div>
              {completionRate}% hoàn thiện
              {missingFields.length > 0 && (
                <Icon as={FaInfoCircle} title={`Thiếu: ${missingFields.join(', ')}`} />
              )}
            </div>
          )}

          <div className="mrvp-header-actions">
            {activeTab === 'records' && record && (
              <button className="mrvp-btn-print" onClick={() => window.print()}>
                <Icon as={FaPrint} /> In hồ sơ
              </button>
            )}
          </div>
        </div>

        <nav className="mrvp-tabs">
          <button
            className={`mrvp-tab ${activeTab === 'records' ? 'mrvp-tab--active' : ''}`}
            onClick={() => {
              if (!record_id) navigate(user?.role === 'patient' ? '/danh-sach-ho-so?tab=records' : '/ho-so-benh-an');
              else setActiveTab('records');
            }}
          >
            <Icon as={FaClipboardList} /> Hồ sơ khám bệnh
          </button>
          {user?.role === 'patient' && (
            <button
              className={`mrvp-tab ${activeTab === 'health-profile' ? 'mrvp-tab--active' : ''}`}
              onClick={() => setActiveTab('health-profile')}
            >
              <Icon as={FaUser} /> Sức khỏe cá nhân
            </button>
          )}
        </nav>
      </header>

      {/* ── BODY ───────────────────────────────────────────────── */}
      <div className="mrvp-body">
        <div className="mrvp-wrap">

          {/* ══════════════════════════════════════════════
              TAB 1 – KHÁM BỆNH
          ══════════════════════════════════════════════ */}
          {activeTab === 'records' && (
            !record_id ? (
              <div className="mrvp-state mrvp-state--error">
                <Icon as={FaExclamationTriangle} />
                <span>Vui lòng chọn một hồ sơ khám bệnh để xem.</span>
                <button
                  style={{ marginTop:'.5rem', padding:'.4rem .875rem', fontSize:'var(--mrvp-fs-sm)', fontWeight:600, background:'var(--mrvp-green)', color:'#fff', border:'none', borderRadius:'var(--mrvp-r-sm)', cursor:'pointer' }}
                  onClick={() => navigate('/danh-sach-ho-so?tab=records')}
                >
                  Xem danh sách hồ sơ
                </button>
              </div>
            ) : loading ? (
              <div className="mrvp-state">
                <Icon as={FaSpinner} className="mrvp-icon--spin" />
                <span>Đang tải hồ sơ y tế...</span>
              </div>
            ) : !record ? (
              <div className="mrvp-state mrvp-state--error">
                <Icon as={FaExclamationTriangle} /><span>Không tìm thấy hồ sơ.</span>
              </div>
            ) : (
              <>
                <MedicalRecordSummarySections
                  record={record}
                  patientName={patientName}
                  patientPhone={patientPhone}
                  patientEmail={patientEmail}
                  doctorName={doctorName}
                  doctorPhone={doctorPhone}
                  doctorEmail={doctorEmail}
                  serviceName={serviceName}
                  fileUrl={fileUrl}
                />
              </>
            )
          )}

          {/* ══════════════════════════════════════════════
              TAB 2 – SỨC KHỎE CÁ NHÂN
          ══════════════════════════════════════════════ */}
          {activeTab === 'health-profile' && (
            profileLoading ? (
              <div className="mrvp-state">
                <Icon as={FaSpinner} className="mrvp-icon--spin" />
                <span>Đang tải hồ sơ sức khỏe...</span>
              </div>
            ) : (
              <div className="mrvp-hp-grid">

                {/* ── 1. Thông tin cơ bản ──────────────────── */}
                <Sec id="basic" title="Thông tin cơ bản" icon={FaUser} {...secProps}>
                  {(on) => (
                    <>
                      <div className="mrvp-field-row mrvp-field-row--3">
                        <div className="mrvp-field">
                          <div className="mrvp-label"><Icon as={FaRuler} /> Chiều cao (cm) <span className="mrvp-required">*</span></div>
                          {on
                            ? <input className="mrvp-input" type="number"
                                value={draft.height ?? healthData.height}
                                onChange={e => setField('height', e.target.value)}
                                placeholder="VD: 170" />
                            : <span className={`mrvp-val ${!healthData.height ? 'mrvp-val--empty' : ''}`}>
                                {healthData.height ? `${healthData.height} cm` : '—'}
                              </span>
                          }
                        </div>
                        <div className="mrvp-field">
                          <div className="mrvp-label"><Icon as={FaWeight} /> Cân nặng (kg) <span className="mrvp-required">*</span></div>
                          {on
                            ? <input className="mrvp-input" type="number"
                                value={draft.weight ?? healthData.weight}
                                onChange={e => setField('weight', e.target.value)}
                                placeholder="VD: 65" />
                            : <span className={`mrvp-val ${!healthData.weight ? 'mrvp-val--empty' : ''}`}>
                                {healthData.weight ? `${healthData.weight} kg` : '—'}
                              </span>
                          }
                        </div>
                        <div className="mrvp-field">
                          <div className="mrvp-label"><Icon as={FaTint} /> Nhóm máu</div>
                          {on
                            ? <select className="mrvp-select"
                                value={draft.blood_type ?? healthData.blood_type}
                                onChange={e => setField('blood_type', e.target.value)}>
                                <option value="">-- Chọn --</option>
                                {['A','B','AB','O'].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            : <span className={`mrvp-val ${!healthData.blood_type ? 'mrvp-val--empty' : ''}`}>
                                {healthData.blood_type || '—'}
                              </span>
                          }
                        </div>
                      </div>

                      {bs && (
                        <div className="mrvp-bmi" style={{ borderColor: bs.color }}>
                          <span className="mrvp-bmi-num" style={{ color: bs.color }}>{bmi}</span>
                          <span className="mrvp-bmi-sep">BMI</span>
                          <span className="mrvp-bmi-stat" style={{ color: bs.color }}>— {bs.label}</span>
                        </div>
                      )}

                      <div className="mrvp-field-row" style={{ marginTop: '.65rem' }}>
                        <div className="mrvp-field">
                          <div className="mrvp-label"><Icon as={FaIdCard} /> Số thẻ BHYT</div>
                          {on
                            ? <input className="mrvp-input" type="text"
                                value={draft.health_insurance ?? healthData.health_insurance}
                                onChange={e => setField('health_insurance', e.target.value)}
                                placeholder="VD: SV1234567890" />
                            : <span className={`mrvp-val ${!healthData.health_insurance ? 'mrvp-val--empty' : ''}`}>
                                {healthData.health_insurance || '—'}
                              </span>
                          }
                        </div>
                      </div>
                    </>
                  )}
                </Sec>

                {/* ── 2. Thói quen sinh hoạt ─────────────── */}
                <Sec id="lifestyle" title="Thói quen sinh hoạt" icon={FaHeartbeat} {...secProps}>
                  {(on) => (
                    <div className="mrvp-lifestyle">
                      {[
                        { key:'smoking_status',     icon:FaSmoking, label:'Hút thuốc',  opts:SMOKE_OPTS    },
                        { key:'alcohol_consumption', icon:FaBeer,   label:'Rượu / Bia', opts:ALCOHOL_OPTS  },
                        { key:'exercise_frequency',  icon:FaRunning,label:'Tập luyện',  opts:EXERCISE_OPTS },
                      ].map(({ key, icon, label, opts }) => (
                        <div key={key} className="mrvp-lifestyle-item">
                          <div className="mrvp-lifestyle-lbl"><Icon as={icon} /> {label}</div>
                          {on
                            ? <select className="mrvp-select"
                                value={draft[key] ?? healthData[key]}
                                onChange={e => setField(key, e.target.value)}>
                                {Object.entries(opts).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            : <span className="mrvp-lifestyle-val">{opts[healthData[key]] || '—'}</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </Sec>

                {/* ── 3. Tiền sử dị ứng & bệnh lý (full width) ── */}
                <div className="mrvp-hp-full">
                  <div className="mrvp-section">
                    <div className="mrvp-section-head">
                      <span className="mrvp-section-title">
                        <Icon as={FaAllergies} /> Tiền sử dị ứng &amp; bệnh lý
                      </span>
                      <div className="mrvp-sec-btns">
                        {editingSection !== 'history'
                          ? <button className="mrvp-btn-sedit" onClick={() => startEdit('history')}>
                              <Icon as={FaEdit} /> Sửa
                            </button>
                          : <>
                              <button className="mrvp-btn-scancel" onClick={cancelEdit}>Hủy</button>
                              <button className="mrvp-btn-ssave" onClick={saveSection}>
                                <Icon as={FaSave} /> Lưu
                              </button>
                            </>
                        }
                      </div>
                    </div>
                    <div className="mrvp-section-body">
                      <div className="mrvp-hint">
                        <Icon as={FaInfoCircle} />
                        Tick chọn mục bạn <strong>có hoặc đã từng có</strong>. Không nhớ rõ thì để trống — có thể bổ sung sau bất cứ lúc nào.
                      </div>

                      {/* Responsive: 3 cột desktop → 1 cột mobile */}
                      <div className="mrvp-history-grid">
                        <div>
                          <TagGroup
                            field="allergies" opts={ALLERGY_OPTS} icon={FaAllergies}
                            label="Dị ứng"
                            hint="Tick nếu bạn bị dị ứng với các chất sau:"
                            sectionId="history"
                            {...tagProps}
                          />
                          {editingSection === 'history' && (
                            <>
                              <div className="mrvp-note-lbl"><Icon as={FaEdit} /> Ghi chú thêm (nếu có)</div>
                              <textarea className="mrvp-textarea"
                                value={draft.allergy_note ?? healthData.allergy_note}
                                onChange={e => setField('allergy_note', e.target.value)}
                                placeholder="VD: Nổi mề đay khi tiếp xúc tôm cua..." />
                            </>
                          )}
                          {editingSection !== 'history' && healthData.allergy_note && (
                            <p className="mrvp-note-text">{healthData.allergy_note}</p>
                          )}
                        </div>

                        <div>
                          <TagGroup
                            field="chronic_diseases" opts={CHRONIC_OPTS} icon={FaHeartbeat}
                            label="Bệnh lý nền / Mạn tính"
                            hint="Tick nếu bạn đang hoặc từng mắc:"
                            sectionId="history"
                            {...tagProps}
                          />
                          {editingSection === 'history' && (
                            <>
                              <div className="mrvp-note-lbl"><Icon as={FaEdit} /> Ghi chú thêm</div>
                              <textarea className="mrvp-textarea"
                                value={draft.chronic_note ?? healthData.chronic_note}
                                onChange={e => setField('chronic_note', e.target.value)}
                                placeholder="VD: Tiểu đường type 2 phát hiện 2020..." />
                            </>
                          )}
                          {editingSection !== 'history' && healthData.chronic_note && (
                            <p className="mrvp-note-text">{healthData.chronic_note}</p>
                          )}
                        </div>

                        <div>
                          <TagGroup
                            field="family_history" opts={FAMILY_OPTS} icon={FaNotesMedical}
                            label="Tiền sử gia đình"
                            hint="Người thân ruột thịt có ai mắc bệnh:"
                            sectionId="history"
                            {...tagProps}
                          />
                          {editingSection === 'history' && (
                            <>
                              <div className="mrvp-note-lbl"><Icon as={FaEdit} /> Ghi chú thêm</div>
                              <textarea className="mrvp-textarea"
                                value={draft.family_note ?? healthData.family_note}
                                onChange={e => setField('family_note', e.target.value)}
                                placeholder="VD: Bố bị ung thư đại tràng năm 55 tuổi..." />
                            </>
                          )}
                          {editingSection !== 'history' && healthData.family_note && (
                            <p className="mrvp-note-text">{healthData.family_note}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 4. Thuốc đang dùng ─────────────────── */}
                <Sec id="medications" title="Thuốc đang dùng" icon={FaPills} {...secProps}>
                  {(on) => {
                    const meds = parseList(on ? (draft.current_medications ?? healthData.current_medications) : healthData.current_medications);
                    return (
                      <>
                        <p style={{ fontSize:'var(--mrvp-fs-xs)', color:'var(--mrvp-text-faint)', marginBottom:'.6rem' }}>
                          Thuốc kê đơn, vitamin, thực phẩm chức năng đang dùng thường xuyên.
                        </p>
                        {on && (
                          <div className="mrvp-med-row">
                            <input className="mrvp-input" type="text"
                              value={medInput}
                              onChange={e => setMedInput(e.target.value)}
                              onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); addMed(); } }}
                              placeholder="VD: Metformin 500mg × 2 lần/ngày" />
                            <button className="mrvp-btn-addmed" type="button" onClick={addMed}>
                              <Icon as={FaPlus} /> Thêm
                            </button>
                          </div>
                        )}
                        <div className="mrvp-med-chips">
                          {meds.length > 0
                            ? meds.map((m,i) => (
                                <span key={i} className="mrvp-med-chip">
                                  <Icon as={FaPills} /> {m}
                                  {on && (
                                    <button className="mrvp-btn-removemed" type="button" onClick={() => removeMed(i)}>
                                      <Icon as={FaTimes} />
                                    </button>
                                  )}
                                </span>
                              ))
                            : <span className="mrvp-tag-empty">Không có thuốc đang dùng</span>
                          }
                        </div>
                      </>
                    );
                  }}
                </Sec>

                {/* ── 5. Tiêm chủng ──────────────────────── */}
                <Sec id="vaccines" title="Lịch sử tiêm chủng" icon={FaSyringe} {...secProps}>
                  {() => (
                    <>
                      <p style={{ fontSize:'var(--mrvp-fs-xs)', color:'var(--mrvp-text-faint)', marginBottom:'.6rem' }}>
                        Các loại vaccine đã tiêm. Không nhớ thì để trống — không sao cả.
                      </p>
                      <VaxGroup {...tagProps} />
                    </>
                  )}
                </Sec>

                {/* ── 6. Liên hệ khẩn cấp ────────────────── */}
                <Sec id="emergency" title="Liên hệ khẩn cấp" icon={FaPhone} {...secProps}>
                  {(on) => (
                    <div className="mrvp-field">
                      <div className="mrvp-label"><Icon as={FaPhone} /> Người thân (Họ tên – Quan hệ – SĐT)</div>
                      {on
                        ? <input className="mrvp-input" type="text"
                            value={draft.emergency_contact ?? healthData.emergency_contact}
                            onChange={e => setField('emergency_contact', e.target.value)}
                            placeholder="VD: Nguyễn Văn A – Bố – 0912345678" />
                        : <span className={`mrvp-val ${!healthData.emergency_contact ? 'mrvp-val--empty' : ''}`}>
                            {healthData.emergency_contact || '—'}
                          </span>
                      }
                    </div>
                  )}
                </Sec>

                {/* ── Bottom actions ───────────────────────── */}
                <div className="mrvp-hp-full">
                  <div className="mrvp-share-block">
                    <div className="mrvp-share-copy">
                      <div className="mrvp-share-title">
                        <Icon as={FaGlobe} /> Chia sẻ hồ sơ cho bác sĩ
                      </div>
                      <p className="mrvp-share-text">
                        {healthData.share_with_doctors
                          ? 'Đang bật chia sẻ công khai để bác sĩ đang khám có thể xem hồ sơ sức khỏe của bạn.'
                          : 'Bật chia sẻ để bác sĩ đang khám xem nhanh thông tin sức khỏe cá nhân của bạn.'}
                      </p>
                    </div>
                    <button
                      className={`mrvp-btn-share ${healthData.share_with_doctors ? 'mrvp-btn-share--active' : ''}`}
                      type="button"
                      onClick={() => openShareConfirmModal(!healthData.share_with_doctors)}
                    >
                      <Icon as={FaShareAlt} />
                      {healthData.share_with_doctors ? 'Tắt chia sẻ công khai' : 'Bật chia sẻ công khai'}
                    </button>
                  </div>
                  <div className="mrvp-hp-actions">
                    <button className="mrvp-btn-export" type="button" onClick={() => window.print()}>
                      <Icon as={FaPrint} /> Xuất PDF
                    </button>
                  </div>
                </div>

                {showShareConfirmModal && (
                  <div className="mrvp-modal-overlay" role="presentation" onClick={() => !shareToggleLoading && setShowShareConfirmModal(false)}>
                    <div className="mrvp-modal" role="dialog" aria-modal="true" aria-labelledby="mrvp-share-modal-title" onClick={(e) => e.stopPropagation()}>
                      <div className="mrvp-modal-head">
                        <div className="mrvp-modal-title" id="mrvp-share-modal-title">
                          <Icon as={FaUserMd} /> {pendingShareValue ? 'Bật chia sẻ công khai?' : 'Tắt chia sẻ công khai?'}
                        </div>
                        <button
                          type="button"
                          className="mrvp-modal-close"
                          onClick={() => !shareToggleLoading && setShowShareConfirmModal(false)}
                          aria-label="Đóng"
                        >
                          <Icon as={FaTimes} />
                        </button>
                      </div>
                      <p className="mrvp-modal-text">
                        {pendingShareValue
                          ? 'Khi bật, bác sĩ đang khám có thể xem hồ sơ sức khỏe cá nhân của bạn để hỗ trợ chẩn đoán và tư vấn.'
                          : 'Khi tắt, bác sĩ sẽ không còn thấy hồ sơ sức khỏe cá nhân của bạn ở chế độ chia sẻ công khai.'}
                      </p>
                      <div className="mrvp-modal-actions">
                        <button
                          type="button"
                          className="mrvp-modal-btn mrvp-modal-btn--ghost"
                          onClick={() => setShowShareConfirmModal(false)}
                          disabled={shareToggleLoading}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="mrvp-modal-btn mrvp-modal-btn--primary"
                          onClick={confirmShareToggle}
                          disabled={shareToggleLoading}
                        >
                          {shareToggleLoading ? <Icon as={FaSpinner} className="mrvp-icon--spin" /> : null}
                          {shareToggleLoading ? 'Đang cập nhật...' : 'Xác nhận'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
};

export default MedicalRecordViewPage;
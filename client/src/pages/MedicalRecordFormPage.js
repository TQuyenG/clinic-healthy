// client/src/pages/MedicalRecordFormPage.js
// FILE MỚI - Trang Nhập/Cập nhật Hồ sơ Y tế (BS/Admin)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import appointmentService from '../services/appointmentService';
import serviceService from '../services/serviceService';
import medicalRecordService from '../services/medicalRecordService';
import api from '../services/api'; // [MỚI] Import API instance
import MedicalRecordSummarySections from '../components/medical/MedicalRecordSummarySections';
import consultationService from '../services/consultationService';

// Import CSS
import './MedicalRecordFormPage.css';
import './MedicalRecordViewPage.css';


// Import Icons (Theo yêu cầu, dùng thư viện)
import {
  FaUserInjured, FaUserMd, FaCalendarAlt, FaNotesMedical,
  FaFileMedical, FaFilePrescription, FaUpload, FaTrash,
  FaPlus, FaSpinner, FaSave, FaExclamationTriangle,
  FaFileImage, FaFilePdf, FaFileWord, FaTimes,
  FaSun, FaCloudSun, FaMoon, FaInfoCircle, FaBolt
} from 'react-icons/fa';
import { FaPills } from 'react-icons/fa';

// ─── helpers dùng chung trong SubServiceInline ───────────────────────────────
const formatDateISO = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getNextThreeDays = () => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

const formatCheckinSlotLabel = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = String(timeStr).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return String(timeStr).slice(0, 5);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} – ${String((h+1)%24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

const SHIFT_META = {
  morning:   { label: 'Buổi sáng',  Icon: FaSun      },
  afternoon: { label: 'Buổi chiều', Icon: FaCloudSun },
  evening:   { label: 'Buổi tối',   Icon: FaMoon     },
};

// ─── SlotPicker: chọn ngày → load slot từ API → hiển thị slot grid ───────────
const SlotPicker = ({ doctorId, serviceId, selectedDate, selectedTime, onDateChange, onTimeChange }) => {
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [availableShifts, setAvailableShifts] = useState({ morning: [], afternoon: [], evening: [] });
  const nextThreeDays = getNextThreeDays();

  useEffect(() => {
    if (!doctorId || !selectedDate || !serviceId) {
      setAvailableShifts({ morning: [], afternoon: [], evening: [] });
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingSlots(true);
      try {
        const res = await appointmentService.getAvailableSlots(doctorId, selectedDate, serviceId, 'offline');
        if (cancelled) return;
        if (res?.data?.success) {
          const rawSlots = res.data.data?.raw || [];
          const grouped = { morning: [], afternoon: [], evening: [] };
          rawSlots.forEach(slot => {
            if (slot.status === 'available' && grouped[slot.shift_name]) {
              grouped[slot.shift_name].push({ time: slot.time, shift_name: slot.shift_name });
            }
          });
          setAvailableShifts(grouped);
        } else {
          setAvailableShifts({ morning: [], afternoon: [], evening: [] });
        }
      } catch {
        if (!cancelled) setAvailableShifts({ morning: [], afternoon: [], evening: [] });
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [doctorId, selectedDate, serviceId]);

  const hasAnySlot = availableShifts.morning.length || availableShifts.afternoon.length || availableShifts.evening.length;

  if (!doctorId || !serviceId) {
    return (
      <div className="mrfp-slot-picker-hint">
        <FaInfoCircle /> Vui lòng chọn dịch vụ phụ trước khi chọn lịch.
      </div>
    );
  }

  return (
    <div className="mrfp-slot-picker">
      {/* Chọn ngày */}
      <div className="mrfp-slot-date-row">
        {nextThreeDays.map(date => {
          const iso = formatDateISO(date);
          return (
            <button
              key={iso}
              type="button"
              className={`mrfp-slot-date-btn ${selectedDate === iso ? 'active' : ''}`}
              onClick={() => { onDateChange(iso); onTimeChange(''); }}
            >
              <span className="mrfp-slot-date-weekday">
                {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
              </span>
              <strong className="mrfp-slot-date-num">
                {date.getDate()}/{date.getMonth() + 1}
              </strong>
            </button>
          );
        })}
        <input
          type="date"
          className="mrfp-slot-date-input"
          value={selectedDate}
          min={formatDateISO(new Date())}
          onChange={e => { onDateChange(e.target.value); onTimeChange(''); }}
        />
      </div>

      {/* Slot grid */}
      {selectedDate && (
        <div className="mrfp-slot-grid-area">
          {loadingSlots ? (
            <div className="mrfp-slot-loading">
              <FaSpinner className="mrfp-slot-spin" /> Đang tải lịch trống...
            </div>
          ) : !hasAnySlot ? (
            <div className="mrfp-slot-empty">
              <FaExclamationTriangle /> Không có slot trống cho ngày này.
            </div>
          ) : (
            ['morning', 'afternoon', 'evening'].map(pd => {
              const slots = availableShifts[pd];
              if (!slots?.length) return null;
              const { label, Icon } = SHIFT_META[pd];
              return (
                <div key={pd} className="mrfp-slot-section">
                  <div className="mrfp-slot-section-label">
                    <Icon /> {label}
                  </div>
                  <div className="mrfp-slot-grid">
                    {slots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`mrfp-slot-btn ${selectedTime === slot.time ? 'active' : ''}`}
                        onClick={() => onTimeChange(slot.time)}
                      >
                        {formatCheckinSlotLabel(slot.time)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ─── SubServiceInline ─────────────────────────────────────────────────────────
const SubServiceInline = ({ parentAppointment, rows: externalRows = null, onChange }) => {
  const rootRef = useRef(null);
  const [pickerRowId, setPickerRowId] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [rowsState, setRowsState] = useState([]);
  const rows = Array.isArray(externalRows) ? externalRows : rowsState;
  const updateRows = (next) => {
    if (typeof onChange === 'function') onChange(next);
    setRowsState(next);
  };
  const [submittingRow, setSubmittingRow] = useState(null);

  const parentContext = {
    code: parentAppointment?.code || '--',
    patientName: parentAppointment?.patient_name || parentAppointment?.Patient?.User?.full_name || parentAppointment?.guest_name || '--',
    patientPhone: parentAppointment?.patient_phone || parentAppointment?.Patient?.User?.phone || parentAppointment?.guest_phone || '--',
    doctorName: parentAppointment?.doctor_name || parentAppointment?.Doctor?.user?.full_name || '--',
    date: parentAppointment?.appointment_date ? new Date(parentAppointment.appointment_date).toLocaleDateString('vi-VN') : '--',
  };

  const selectedServiceIds = new Set(rows.filter((row) => row.service_id).map((row) => row.service_id));
  const linkedCount = rows.filter((row) => row.service_id && (row.appointment_code || row.status === 'scheduled' || row.status === 'immediate')).length;

  const getTextValue = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') return value.name || value.title || value.label || '';
    return '';
  };

  const normalizeService = (service) => ({
    id: service?.id,
    name: getTextValue(service?.name || service?.title),
    price: service?.price || 0,
    specialtyName: getTextValue(service?.specialty_name || service?.specialty),
    departmentName: getTextValue(service?.department_name || service?.department),
    description: getTextValue(service?.description),
  });

  useEffect(() => {
    // If externalRows provided, prefer that. Otherwise initialize from parentAppointment when empty.
    if (Array.isArray(externalRows) && externalRows.length > 0) {
      setRowsState(externalRows);
      return;
    }
    if (Array.isArray(parentAppointment?.service_indications) && parentAppointment.service_indications.length > 0 && rows.length === 0) {
      const mapped = parentAppointment.service_indications.map((item, index) => ({
        id: item.id || item.linked_appointment_id || Date.now() + index,
        service_id: item.service_id || null,
        service_name: item.service_name || item.name || '',
        price: item.price || 0,
        doctor_id: parentAppointment?.Doctor?.id || null,
        specialty: item.specialty || '',
        date: item.appointment_date || '',
        time: item.appointment_start_time || '',
        required: Boolean(item.required),
        mode: item.mode || 'schedule',
        status: item.status || (item.linked_appointment_code ? 'scheduled' : ''),
        appointment_code: item.linked_appointment_code || item.appointment_code || null,
        appointment_id: item.linked_appointment_id || item.appointment_id || null,
      }));
      updateRows(mapped);
    }
  }, [parentAppointment, externalRows]);

  useEffect(() => {
    if (pickerRowId == null) {
      setResults([]);
      setPickerQuery('');
      return;
    }

    if (pickerQuery && pickerQuery.trim().length > 1) {
      const t = setTimeout(() => loadServices(pickerQuery), 300);
      return () => clearTimeout(t);
    }

    if (!pickerQuery || pickerQuery.trim().length === 0) {
      loadServices('');
    } else {
      setResults([]);
    }
  }, [pickerQuery, pickerRowId]);

  useEffect(() => {
    const onDocMouseDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setPickerRowId(null);
      }
    };
    window.addEventListener('mousedown', onDocMouseDown);
    return () => {
      window.removeEventListener('mousedown', onDocMouseDown);
    };
  }, []);

  const loadServices = async (q) => {
    try {
      setLoadingResults(true);
      const res = await serviceService.getPublicServices({ search: q, limit: 20 });
      const payload = res?.data?.data;
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (payload && Array.isArray(payload.data)) list = payload.data;
      else if (payload && Array.isArray(payload.items)) list = payload.items;
      else if (payload && Array.isArray(payload.services)) list = payload.services;
      else list = [];
      setResults(list);
    } catch (err) {
      console.error('Load services error', err);
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const addRow = () => {
    const newRow = {
      id: Date.now() + Math.random(),
      service_id: null,
      service_name: '',
      price: 0,
      doctor_id: parentAppointment?.Doctor?.id || null,
      specialty: '',
      date: '',
      time: '',
      mode: 'schedule',
      required: false,
    };
    updateRows([...(rows || []), newRow]);
  };

  const findEarliestSlotAndPatch = async (row) => {
    try {
      // search next 3 days for first available slot
      const days = getNextThreeDays();
      for (const d of days) {
        const iso = formatDateISO(d);
        const res = await appointmentService.getAvailableSlots(row.doctor_id || parentAppointment?.Doctor?.id, iso, row.service_id, 'offline');
        if (res?.data?.success) {
          const raw = res.data.data?.raw || [];
          const available = raw.find(s => s.status === 'available');
          if (available && available.time) {
            patchRow(row.id, { date: iso, time: available.time });
            return { date: iso, time: available.time };
          }
        }
      }
      // no slot found - leave as is
      return null;
    } catch (err) {
      console.error('Error finding earliest slot', err);
      return null;
    }
  };

  const openPicker = (rowId) => {
    if (pickerRowId === rowId) {
      // toggle off
      setPickerRowId(null);
      return;
    }
    setPickerRowId(rowId);
    setPickerQuery('');
    loadServices('');
  };

  const selectServiceForRow = (rowId, service) => {
    const normalized = normalizeService(service);
    if (!normalized.id) return;
    if (selectedServiceIds.has(normalized.id)) return;
    updateRows((rows || []).map((row) => (
      row.id === rowId
        ? {
            ...row,
            service_id: normalized.id,
            service_name: normalized.name,
            price: normalized.price,
            specialty: normalized.specialtyName,
          }
        : row
    )));
    setPickerRowId(null);
  };

  const removeRow = (rowId) => updateRows((rows || []).filter((x) => x.id !== rowId));
  const patchRow = (rowId, patch) => updateRows((rows || []).map((x) => (x.id === rowId ? { ...x, ...patch } : x)));

  const handleSchedule = async (row) => {
    const mode = row.mode === 'immediate' ? 'immediate' : 'schedule';
    const appointmentDate = row.date || parentAppointment?.appointment_date || new Date().toISOString().split('T')[0];
    const appointmentTime = row.time || parentAppointment?.appointment_start_time || new Date().toTimeString().slice(0, 8);
    if (!row.service_id || !parentAppointment?.code) return;
    if (mode === 'schedule' && (!row.date || !row.time)) return;
    try {
      setSubmittingRow(row.id);
      const payload = {
        service_id: row.service_id,
        service_name: row.service_name,
        mode,
        appointment_date: appointmentDate,
        appointment_start_time: appointmentTime,
        required: row.required,
      };
      const res = await appointmentService.createSubServiceAppointment(parentAppointment.code, payload);
      if (res?.data?.success) {
        const created = res?.data?.data || {};
        patchRow(row.id, {
          status: mode === 'immediate' ? 'immediate' : 'scheduled',
          appointment_code: created.code || null,
          appointment_id: created.id || null,
          date: created.appointment_date || appointmentDate,
          time: created.appointment_start_time || appointmentTime,
        });
      }
    } catch (err) {
      console.error('Schedule booking error', err);
      toast.error('Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setSubmittingRow(null);
    }
  };

  return (
    <div className="medical-record-form-page-subservice-root" ref={rootRef}>
      <div className="medical-record-form-page-subservice-header">
        <div>
          <div className="medical-record-form-page-subservice-title">Chọn dịch vụ phụ</div>
          <div className="medical-record-form-page-subservice-subtitle">
            Chọn dịch vụ từ kho, rồi gắn ngay vào lịch hiện tại để bác sĩ và quầy dễ theo dõi.
          </div>
        </div>
        <div className="medical-record-form-page-subservice-header-actions">
          <div className="medical-record-form-page-subservice-count">Đã chọn {rows.filter((row) => row.service_id).length} dịch vụ</div>
          <button type="button" className="medical-record-form-page-subservice-btn-add-row" onClick={addRow}>
            <FaPlus /> Thêm dịch vụ phụ
          </button>
        </div>
      </div>

      <div className="medical-record-form-page-subservice-summary">
        <div className="medical-record-form-page-subservice-summary-item">
          <span className="medical-record-form-page-subservice-summary-label">Lịch gốc</span>
          <strong>{parentContext.code}</strong>
        </div>
        <div className="medical-record-form-page-subservice-summary-item">
          <span className="medical-record-form-page-subservice-summary-label">Bệnh nhân</span>
          <strong>{parentContext.patientName}</strong>
          <small>{parentContext.patientPhone}</small>
        </div>
        <div className="medical-record-form-page-subservice-summary-item">
          <span className="medical-record-form-page-subservice-summary-label">Bác sĩ</span>
          <strong>{parentContext.doctorName}</strong>
          <small>{parentContext.date}</small>
        </div>
        <div className="medical-record-form-page-subservice-summary-item medical-record-form-page-subservice-summary-item--highlight">
          <span className="medical-record-form-page-subservice-summary-label">Đã liên kết</span>
          <strong>{linkedCount}</strong>
          <small>dịch vụ đã có lịch hoặc đã đánh dấu</small>
        </div>
      </div>

      <div className="medical-record-form-page-subservice-rows">
        {rows.length === 0 ? (
          <div className="medical-record-form-page-subservice-empty">Chưa có dịch vụ phụ nào. Bấm <strong>Thêm dịch vụ phụ</strong> để bắt đầu.</div>
        ) : (
          rows.map((row, index) => (
            <div className="medical-record-form-page-subservice-row" key={row.id}>
              {/* Hàng 1: Số thứ tự + Tên dịch vụ (dropdown) + Nút xóa */}
              <div className="medical-record-form-page-subservice-row-line1">
                <div className="medical-record-form-page-subservice-row-index">{index + 1}</div>
                <div className="medical-record-form-page-subservice-row-name-wrap">
                  <button
                    type="button"
                    className={`medical-record-form-page-subservice-service-field ${row.service_id ? 'has-value' : 'placeholder'}`}
                    onClick={() => openPicker(row.id)}
                  >
                    {row.service_name || 'Tên dịch vụ'}
                  </button>
                  {pickerRowId === row.id && (
                    <div className="medical-record-form-page-subservice-picker">
                      <div className="medical-record-form-page-subservice-picker-search">
                        <input
                          value={pickerQuery}
                          onChange={(e) => setPickerQuery(e.target.value)}
                          placeholder="Tìm dịch vụ..."
                          className="medical-record-form-page-subservice-picker-input"
                        />
                        {loadingResults && <FaSpinner className="medical-record-form-page-subservice-spin" />}
                      </div>
                      <div className="medical-record-form-page-subservice-picker-list">
                        {results.length === 0 ? (
                          <div className="medical-record-form-page-subservice-picker-empty">Không có dịch vụ phù hợp.</div>
                        ) : results.map((service) => (
                          <button
                            type="button"
                            key={service.id}
                            className="medical-record-form-page-subservice-picker-item"
                            disabled={selectedServiceIds.has(service.id)}
                            onClick={() => selectServiceForRow(row.id, service)}
                          >
                            <div className="medical-record-form-page-subservice-picker-item-top">
                              <strong>{getTextValue(service.name || service.title)}</strong>
                              <span className="medical-record-form-page-subservice-picker-meta-inline">{getTextValue(service.specialty_name || service.specialty || service.department_name || service.department)} • {Number(service.price || 0).toLocaleString()}đ</span>
                            </div>
                            <div className="medical-record-form-page-subservice-picker-item-bottom">
                              <span className="medical-record-form-page-subservice-picker-action">{selectedServiceIds.has(service.id) ? 'Đã thêm' : 'Thêm'}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" className="medical-record-form-page-subservice-btn-remove" onClick={() => removeRow(row.id)}>
                  <FaTrash />
                </button>
              </div>

              {/* Hàng 2: Chuyên khoa + Giá tiền + Badge */}
              <div className="medical-record-form-page-subservice-row-line2">
                <span className="medical-record-form-page-subservice-row-price">
                  {getTextValue(row.specialty) ? `${getTextValue(row.specialty)} • ` : ''}{Number(row.price || 0).toLocaleString()}đ
                </span>
                <div className={`medical-record-form-page-subservice-required-badge ${row.required ? 'is-required' : 'is-optional'}`}>
                  {row.required ? 'Bắt buộc' : 'Tùy chọn'}
                </div>
                {row.status === 'scheduled' && (
                  <div className="medical-record-form-page-subservice-required-badge is-optional">Đã tạo lịch</div>
                )}
                {row.status === 'immediate' && (
                  <div className="medical-record-form-page-subservice-required-badge is-required">Làm ngay</div>
                )}
              </div>

              {/* Hàng 3: Chọn ngày + Slot picker + Checkboxes + Buttons hành động */}
              <div className="medical-record-form-page-subservice-row-line3">
                {/* Slot picker để chọn ngày/giờ */}
                {row.service_id && (
                    <SlotPicker
                    doctorId={row.doctor_id || parentAppointment?.Doctor?.id}
                    serviceId={row.service_id}
                    selectedDate={row.date}
                    selectedTime={row.time}
                    onDateChange={(date) => patchRow(row.id, { date, time: '' })}
                    onTimeChange={(time) => patchRow(row.id, { time })}
                  />
                )}

                {/* Controls hàng dưới */}
                <div className="medical-record-form-page-subservice-row-line3-controls">
                  <label className="medical-record-form-page-subservice-row-required" title="Đánh dấu dịch vụ này là bắt buộc phải thực hiện cho bệnh nhân">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(e) => patchRow(row.id, { required: e.target.checked })}
                    /> Bắt buộc
                  </label>
                  <label className="medical-record-form-page-subservice-row-do-now" title="Chọn để hệ thống tìm slot trống sớm nhất, sau đó nhấn 'Tạo liên kết ngay' để đặt lịch">
                    <input
                      type="checkbox"
                      checked={row.mode === 'immediate'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          patchRow(row.id, { mode: 'immediate' });
                        } else {
                          patchRow(row.id, { mode: 'schedule' });
                        }
                      }}
                    /> Làm ngay
                  </label>
                  <div className="medical-record-form-page-subservice-row-actions">
                    <button
                      type="button"
                      className="medical-record-form-page-subservice-btn-schedule"
                      onClick={() => handleSchedule(row)}
                      disabled={row.mode === 'schedule' && (!row.date || !row.time || submittingRow === row.id)}
                      title={row.mode === 'schedule' && (!row.date || !row.time) ? 'Vui lòng chọn ngày và giờ trước khi đặt lịch' : (row.mode === 'immediate' ? 'Nhấn để tạo lịch liên kết' : 'Nhấn để đặt lịch liên kết')}
                    >
                      {submittingRow === row.id
                        ? <FaSpinner className="medical-record-form-page-subservice-spin" />
                        : row.mode === 'immediate' ? <FaBolt /> : <FaCalendarAlt />
                      } {row.mode === 'immediate' ? 'Tạo liên kết ngay' : 'Đặt lịch liên kết'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const MedicalRecordFormPage = ({ embeddedCode = null, embeddedConsultationId = null, embeddedActiveRecordId = null, onClose = null } = {}) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = embeddedCode || params.code; // Mã lịch hẹn (AP-1234)
  const { user } = useAuth();
  const returnTo = searchParams.get('returnTo');
  const isConsultationMode = Boolean(embeddedConsultationId);

  const recordIdFromQuery = searchParams.get('record_id');
  const recordId = embeddedActiveRecordId || recordIdFromQuery;
  const [activeRecordId, setActiveRecordId] = useState(recordId);
  const isUpdateMode = useMemo(() => !!activeRecordId, [activeRecordId]);

  const getFallbackReturnPath = () => returnTo || (isConsultationMode ? `/tu-van/${code}` : `/lich-hen/${code}`);

  const [appointment, setAppointment] = useState(null);
  const [subServiceRows, setSubServiceRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // === Form State ===
  // 1. Dữ liệu text
  const [formData, setFormData] = useState({
    diagnosis: '',
    symptoms: '',
    treatment_plan: '',
    advice: '',
    follow_up_date: '',
    clinical_note: '', // Thêm ghi chú lâm sàng
    vitals: {          // Thêm các chỉ số sinh tồn
      blood_pressure: '',
      pulse: '',
      temperature: '',
      weight: '',
      height: '',
      respiratory_rate: ''
    }
  });

  // 2. Đơn thuốc
  const [prescriptionList, setPrescriptionList] = useState([
    { name: '', dosage: '', quantity: '', instructions: '', unit: '' }
  ]);

  // 3. Files (Logic upload phức tạp)
  // 3a. File MỚI (chưa upload)
  const [newTestImages, setNewTestImages] = useState([]); // Mảng các đối tượng File
  const [newReportFiles, setNewReportFiles] = useState([]); // Mảng các đối tượng File
  
  // 3b. File CŨ (đã upload, dùng cho chế độ Update)
  const [keptTestImages, setKeptTestImages] = useState([]); // Mảng các object { filename, url }
  const [keptReportFiles, setKeptReportFiles] = useState([]); // Mảng các object { filename, url }
  // [MỚI] State quản lý gợi ý thuốc
  const [medicineSuggestions, setMedicineSuggestions] = useState([]); 
  const [showSuggestionsIndex, setShowSuggestionsIndex] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const getPatientName = () => appointment?.patient_name || appointment?.Patient?.User?.full_name || appointment?.guest_name || '--';
  const getPatientPhone = () => appointment?.patient_phone || appointment?.Patient?.User?.phone || appointment?.guest_phone || '--';
  const getPatientEmail = () => appointment?.patient_email || appointment?.Patient?.User?.email || appointment?.guest_email || '--';
  const getDoctorName = () => appointment?.doctor_name || appointment?.Doctor?.user?.full_name || '--';
  const getDoctorPhone = () => appointment?.doctor_phone || appointment?.Doctor?.user?.phone || '--';
  const getDoctorEmail = () => appointment?.doctor_email || appointment?.Doctor?.user?.email || '--';
  const getServiceName = () => appointment?.service_name || appointment?.Service?.name || (appointment?.Appointment && appointment.Appointment.service_name) || '';
  const previewTestImages = [
    ...keptTestImages.map((file) => ({ ...file, source: 'Cũ' })),
    ...newTestImages.map((it) => ({ name: it.name, originalname: it.name, source: 'Mới', url: it.url, size: it.size }))
  ];
  const previewReportFiles = [
    ...keptReportFiles.map((file) => ({ ...file, source: 'Cũ' })),
    ...newReportFiles.map((it) => ({ name: it.name, originalname: it.name, source: 'Mới', url: it.url, size: it.size }))
  ];

  // File upload limits (reasonable average-high defaults)
  const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB per file
  const MAX_TOTAL_BYTES = 30 * 1024 * 1024; // 30 MB total
  const [notifyDoctor, setNotifyDoctor] = useState(true);
  const previewServiceIndications = (Array.isArray(subServiceRows) && subServiceRows.length > 0)
    ? subServiceRows
    : (Array.isArray(appointment?.service_indications)
      ? appointment.service_indications
      : Array.isArray(appointment?.Appointment?.service_indications)
        ? appointment.Appointment.service_indications
        : Array.isArray(appointment?.MedicalRecord?.service_indications)
          ? appointment.MedicalRecord.service_indications
          : []);
  const previewRecord = {
    ...appointment,
    patient_name: getPatientName(),
    patient_phone: getPatientPhone(),
    patient_email: getPatientEmail(),
    doctor_name: getDoctorName(),
    doctor_phone: getDoctorPhone(),
    doctor_email: getDoctorEmail(),
    diagnosis: formData.diagnosis,
    symptoms: formData.symptoms,
    treatment_plan: formData.treatment_plan,
    advice: formData.advice,
    follow_up_date: formData.follow_up_date,
    prescription_json: prescriptionList,
    vitals_json: formData.vitals,
    clinical_note: formData.clinical_note,
    service_indications: previewServiceIndications,
    test_images_json: previewTestImages,
    report_files_json: previewReportFiles,
    Appointment: {
      ...(appointment || {}),
      appointment_date: appointment?.appointment_date,
      patient_name: getPatientName(),
      patient_phone: getPatientPhone(),
      patient_email: getPatientEmail(),
      guest_name: appointment?.guest_name,
      guest_phone: appointment?.guest_phone,
      service_indications: previewServiceIndications,
    },
    Doctor: appointment?.Doctor || { user: { full_name: getDoctorName() } },
  };

  const sharedHealthHistory = useMemo(() => {
    const raw = appointment?.Patient?.medical_history;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    }
    return raw;
  }, [appointment]);

  const canViewSharedHealthProfile = Boolean(sharedHealthHistory?.share_with_doctors);

  const emptyVitals = {
    blood_pressure: '',
    pulse: '',
    temperature: '',
    weight: '',
    height: '',
    respiratory_rate: ''
  };

  const mapConsultationToAppointmentLike = (consultation) => ({
    id: consultation.id,
    code: consultation.consultation_code,
    appointment_code: consultation.consultation_code,
    patient_id: consultation.patient_id,
    doctor_id: consultation.doctor_id,
    appointment_time: consultation.appointment_time || null,
    status: consultation.status,
    patient_name: consultation.patient_name || consultation.Patient?.User?.full_name || consultation.patient?.full_name || '--',
    patient_phone: consultation.patient_phone || consultation.Patient?.User?.phone || consultation.patient?.phone || '--',
    patient_email: consultation.patient_email || consultation.Patient?.User?.email || consultation.patient?.email || '--',
    doctor_name: consultation.doctor_name || consultation.Doctor?.user?.full_name || consultation.doctor?.full_name || '--',
    doctor_phone: consultation.doctor_phone || consultation.Doctor?.user?.phone || consultation.doctor?.phone || '--',
    doctor_email: consultation.doctor_email || consultation.Doctor?.user?.email || consultation.doctor?.email || '--',
    patient: consultation.patient || null,
    doctor: consultation.doctor || null,
    Patient: consultation.Patient || (consultation.patient ? { User: { full_name: consultation.patient.full_name || consultation.patient_name, phone: consultation.patient.phone, email: consultation.patient.email }, medical_history: consultation.patient.medical_history } : { User: { full_name: consultation.patient_name || '--' } }),
    Doctor: consultation.Doctor || (consultation.doctor ? { user: { full_name: consultation.doctor.full_name || consultation.doctor_name, phone: consultation.doctor.phone, email: consultation.doctor.email } } : (consultation.doctor_name ? { user: { full_name: consultation.doctor_name } } : null)),
    service_indications: consultation.service_indications || [],
    appointment_date: consultation.appointment_date || consultation.appointment_time || null,
    service_name: consultation.service_name || consultation.package?.package_name || consultation.package?.package_name || '',
    appointment_start_time: consultation.appointment_start_time || null,
    MedicalRecord: consultation.MedicalRecord || null,
  });

  // === Tải dữ liệu ===
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        if (isConsultationMode) {
          const consultationKey = embeddedConsultationId || code;
          const consultResponse = await consultationService.getConsultationById(consultationKey);
          const consultation = consultResponse?.data?.data;

          if (!consultation) {
            toast.error('Không tìm thấy buổi tư vấn.');
            navigate(getFallbackReturnPath(), { replace: true });
            return;
          }

          const consultationDraft = consultation?.metadata?.result_draft || {};
          const appt = mapConsultationToAppointmentLike(consultation);
          setAppointment(appt);
          setSubServiceRows(Array.isArray(consultationDraft.service_indications)
            ? consultationDraft.service_indications
            : Array.isArray(consultation.service_indications)
              ? consultation.service_indications
              : []);
          setFormData({
            diagnosis: consultation.diagnosis || consultationDraft.diagnosis || '',
            symptoms: consultationDraft.symptoms || consultation.chief_complaint || '',
            treatment_plan: consultation.treatment_plan || consultationDraft.treatment_plan || '',
            advice: consultation.notes || consultationDraft.advice || '',
            follow_up_date: consultation.followup_date || consultationDraft.follow_up_date || '',
            clinical_note: consultation.followup_notes || consultationDraft.clinical_note || '',
            vitals: consultationDraft.vitals || emptyVitals
          });
          const draftPrescription = consultation.prescription_data || consultationDraft.prescription || [];
          setPrescriptionList((Array.isArray(draftPrescription) && draftPrescription.length > 0 ? draftPrescription : [{ name: '', dosage: '', quantity: '', instructions: '', unit: '' }]).map((p) => ({
            name: p.name || '',
            dosage: p.dosage || '',
            quantity: p.quantity || '',
            instructions: p.instructions || '',
            unit: p.unit || ''
          })));
          setKeptTestImages([]);
          setKeptReportFiles([]);
          setLoading(false);
          return;
        }

        // Appointment mode giữ nguyên luồng cũ
        let appt = null;

        try {
          const apptResponse = await appointmentService.getAppointmentByCode(code);
          if (apptResponse.data.success) {
            appt = apptResponse.data.data;
          }
        } catch (err) {
          console.warn('Appointment lookup failed, trying consultation:', err.message);
        }

        if (!appt) {
          try {
            const consultResponse = await consultationService.getConsultationById(code);
            if (consultResponse.data.success) {
              const consultation = consultResponse.data.data;
              appt = mapConsultationToAppointmentLike(consultation);
              console.log('✅ Loaded as consultation:', consultation.consultation_code);
            }
          } catch (consultErr) {
            console.error('Consultation lookup also failed:', consultErr.message);
          }
        }

        if (!appt) {
          toast.error('Không tìm thấy lịch hẹn hoặc buổi tư vấn.');
          navigate(getFallbackReturnPath(), { replace: true });
          return;
        }

        setAppointment(appt);
        const currentRecordId = recordId || appt?.MedicalRecord?.id || null;
        if (currentRecordId) {
          setActiveRecordId(String(currentRecordId));
        }
        const initialSvc = Array.isArray(appt?.service_indications) ? appt.service_indications
          : Array.isArray(appt?.Appointment?.service_indications) ? appt.Appointment.service_indications
          : Array.isArray(appt?.MedicalRecord?.service_indications) ? appt.MedicalRecord.service_indications
          : [];
        setSubServiceRows(initialSvc.map((item, index) => ({
          id: item.id || item.linked_appointment_id || Date.now() + index,
          service_id: item.service_id || null,
          service_name: item.service_name || item.name || '',
          price: item.price || 0,
          doctor_id: appt?.Doctor?.id || null,
          specialty: item.specialty || '',
          date: item.appointment_date || '',
          time: item.appointment_start_time || '',
          required: Boolean(item.required),
          mode: item.mode || 'schedule',
          status: item.status || (item.linked_appointment_code ? 'scheduled' : ''),
          appointment_code: item.linked_appointment_code || item.appointment_code || null,
          appointment_id: item.linked_appointment_id || item.appointment_id || null,
        })));

        if (currentRecordId) {
          const recordResponse = await medicalRecordService.getMedicalRecordById(currentRecordId);
          if (!recordResponse.data.success) {
            toast.error('Không tìm thấy hồ sơ y tế.');
            navigate(getFallbackReturnPath(), { replace: true });
            return;
          }
          const record = recordResponse.data.data;
          setFormData({
            diagnosis: record.diagnosis || '',
            symptoms: record.symptoms || '',
            treatment_plan: record.treatment_plan || '',
            advice: record.advice || '',
            follow_up_date: record.follow_up_date || '',
            clinical_note: record.clinical_note || '',
            vitals: record.vitals_json || emptyVitals
          });
          setPrescriptionList((record.prescription_json || [{ name: '', dosage: '', quantity: '', instructions: '', unit: '' }]).map((p) => ({
            name: p.name || '',
            dosage: p.dosage || '',
            quantity: p.quantity || '',
            instructions: p.instructions || '',
            unit: p.unit || ''
          })));
          setKeptTestImages(record.test_images_json || []);
          setKeptReportFiles(record.report_files_json || []);
          setSubServiceRows(record.service_indications || []);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
        navigate(getFallbackReturnPath(), { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [code, recordId, isUpdateMode, navigate, isConsultationMode, embeddedConsultationId]);

  // === Xử lý Form (Text) ===
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Xử lý riêng cho object vitals
    if (name.startsWith('vitals.')) {
      const vitalKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        vitals: { ...prev.vitals, [vitalKey]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // === Xử lý Đơn thuốc ===
  const handlePrescriptionChange = (index, e) => {
    const { name, value } = e.target;
    const newList = [...prescriptionList];
    newList[index][name] = value;
    setPrescriptionList(newList);
  };

  const addPrescriptionRow = () => {
    setPrescriptionList([...prescriptionList, { name: '', dosage: '', quantity: '', instructions: '', unit: '' }]);
  };

  const removePrescriptionRow = (index) => {
    if (prescriptionList.length > 1) {
      setPrescriptionList(prescriptionList.filter((_, i) => i !== index));
    }
  };

  // [MỚI] Hàm tìm kiếm thuốc khi gõ
  const handleSearchMedicine = async (index, value, force = false) => {
    // 1. Cập nhật text hiển thị ngay lập tức
    const newList = [...prescriptionList];
    newList[index].name = value;
    setPrescriptionList(newList);

    // 2. Gọi API tìm kiếm (Debounce đơn giản)
    // Nếu force=true thì tải từ kho ngay cả khi query rỗng
    const q = String(value || '').trim();
    if (force || q.length > 0) {
      try {
        const res = await api.get(`/articles/medicines?search=${encodeURIComponent(q)}&limit=8`);
        if (res.data && res.data.success) {
          // Normalize possible array shapes and keep all matching medicines, including out-of-stock ones.
          let meds = res.data.medicines || res.data.data || res.data.items || [];
          if (!Array.isArray(meds) && Array.isArray(res.data.data)) meds = res.data.data;
          if (!Array.isArray(meds)) meds = [];
          setMedicineSuggestions(meds);
          setShowSuggestionsIndex(index);
          } else {
          setMedicineSuggestions([]);
          setShowSuggestionsIndex(null);
        }
      } catch (error) {
        console.error(error);
        setMedicineSuggestions([]);
        setShowSuggestionsIndex(null);
      }
    } else {
      setMedicineSuggestions([]);
      setShowSuggestionsIndex(null);
    }
  };

  // [MỚI] Hàm chọn thuốc từ danh sách gợi ý
  const selectMedicine = (index, medicine) => {
    const newList = [...prescriptionList];
    newList[index].name = medicine.name;
    newList[index].unit = medicine.unit || medicine.default_unit || 'Hộp'; // Tự động điền đơn vị
    newList[index].quantity = newList[index].quantity || '1';
    setPrescriptionList(newList);
    setShowSuggestionsIndex(null); // Ẩn gợi ý
  };

  // [MỚI] Ẩn gợi ý khi click ra ngoài (dùng setTimeout để sự kiện click kịp chạy)
  const handleBlurSearch = () => {
    setTimeout(() => setShowSuggestionsIndex(null), 300);
  };

  // === Xử lý Files ===
  const handleFileChange = (e, fileType) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // compute current total bytes (kept + new)
    const keptBytes = [...keptTestImages, ...keptReportFiles].reduce((s, f) => s + (f.size || 0), 0);
    const currentNewBytes = [...newTestImages, ...newReportFiles].reduce((s, f) => s + (f.size || (f.file && f.file.size) || 0), 0);
    let totalBytes = keptBytes + currentNewBytes;

    const accepted = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`Tệp "${file.name}" vượt quá giới hạn ${Math.round(MAX_FILE_SIZE_BYTES/1024/1024)}MB và sẽ bị bỏ qua.`);
        continue;
      }
      if (totalBytes + file.size > MAX_TOTAL_BYTES) {
        toast.error(`Không thể thêm "${file.name}" — tổng dung lượng vượt giới hạn ${Math.round(MAX_TOTAL_BYTES/1024/1024)}MB.`);
        continue;
      }
      totalBytes += file.size;
      // create object with preview url
      accepted.push({ file, url: URL.createObjectURL(file), name: file.name, size: file.size });
    }

    if (fileType === 'test_images') {
      setNewTestImages(prev => [...prev, ...accepted]);
    } else {
      setNewReportFiles(prev => [...prev, ...accepted]);
    }
    // Reset input để có thể chọn lại file giống
    e.target.value = null; 
  };

  const removeNewFile = (index, fileType) => {
    if (fileType === 'test_images') {
      setNewTestImages(prev => {
        const item = prev[index];
        if (item && item.url) URL.revokeObjectURL(item.url);
        return prev.filter((_, i) => i !== index);
      });
    } else {
      setNewReportFiles(prev => {
        const item = prev[index];
        if (item && item.url) URL.revokeObjectURL(item.url);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const removeKeptFile = (index, fileType) => {
    // Khi xóa file "cũ", ta chỉ cần xóa nó khỏi mảng "kept"
    // Backend sẽ tự động phát hiện file nào không có trong "kept" và xóa đi
    if (fileType === 'test_images') {
      setKeptTestImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setKeptReportFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      newTestImages.forEach((it) => { if (it && it.url) URL.revokeObjectURL(it.url); });
      newReportFiles.forEach((it) => { if (it && it.url) URL.revokeObjectURL(it.url); });
    };
  }, []);

  const buildSubmissionData = ({ isDraft }) => {
    const submissionData = new FormData();

    submissionData.append('is_draft', isDraft ? 'true' : 'false');
    submissionData.append('appointment_id', appointment.id);
    submissionData.append('diagnosis', formData.diagnosis);
    submissionData.append('symptoms', formData.symptoms);
    submissionData.append('treatment_plan', formData.treatment_plan);
    submissionData.append('advice', formData.advice);
    submissionData.append('follow_up_date', formData.follow_up_date);
    submissionData.append('clinical_note', formData.clinical_note);
    submissionData.append('vitals', JSON.stringify(formData.vitals));

    const validPrescriptions = prescriptionList.filter((p) => p.name && p.quantity);
    if (validPrescriptions.length > 0) {
      submissionData.append('prescription_json', JSON.stringify(validPrescriptions));
    }

    // include sub-service indications so backend can persist them
    try {
      submissionData.append('service_indications', JSON.stringify(subServiceRows || []));
    } catch (err) {
      // noop
    }

    // newTestImages/newReportFiles are stored as { file, url, name, size }
    newTestImages.forEach((item) => submissionData.append('test_images', item.file));
    newReportFiles.forEach((item) => submissionData.append('report_files', item.file));

    // include notify flag for backend to optionally notify the doctor
    submissionData.append('notify_doctor', notifyDoctor ? 'true' : 'false');

    if (isUpdateMode) {
      submissionData.append('keep_test_images', JSON.stringify(keptTestImages));
      submissionData.append('keep_report_files', JSON.stringify(keptReportFiles));
    }

    return { submissionData };
  };

  // === Xử lý Submit ===
  const handleOpenPreview = (e) => {
    e.preventDefault();
    setShowPreviewModal(true);
  };

  const buildConsultationResultPayload = () => ({
    diagnosis: formData.diagnosis,
    symptoms: formData.symptoms,
    treatment_plan: formData.treatment_plan,
    advice: formData.advice,
    prescription: JSON.stringify(prescriptionList || []),
    notes: formData.advice || formData.clinical_note || '',
    severity_level: 'normal',
    need_followup: Boolean(formData.follow_up_date),
    followup_date: formData.follow_up_date || null,
    followup_notes: formData.clinical_note || formData.advice || '',
    vitals_json: formData.vitals,
    clinical_note: formData.clinical_note,
    service_indications: subServiceRows,
    test_images_json: previewTestImages,
    report_files_json: previewReportFiles,
    draft_data: {
      diagnosis: formData.diagnosis,
      symptoms: formData.symptoms,
      treatment_plan: formData.treatment_plan,
      advice: formData.advice,
      follow_up_date: formData.follow_up_date,
      clinical_note: formData.clinical_note,
      vitals: formData.vitals,
      prescription_json: prescriptionList,
      service_indications: subServiceRows,
      test_images_json: previewTestImages,
      report_files_json: previewReportFiles,
    }
  });

  const saveDraftMedicalRecord = async () => {
    if (isConsultationMode) {
      const consultationTargetId = embeddedConsultationId || appointment?.id;
      if (!consultationTargetId) return toast.error('Không tìm thấy buổi tư vấn');

      try {
        setIsSavingDraft(true);
        const response = await consultationService.saveConsultationDraft(consultationTargetId, buildConsultationResultPayload());
        toast.success('Lưu nháp thành công');
      } catch (error) {
        console.error('Save consultation draft error:', error);
        toast.error(error.response?.data?.message || 'Lỗi khi lưu nháp tư vấn');
      } finally {
        setIsSavingDraft(false);
      }
      return;
    }

    if (!appointment || !appointment.id) return toast.error('Không tìm thấy lịch hẹn');

    try {
      setIsSavingDraft(true);
      const { submissionData } = buildSubmissionData({ isDraft: true });
      const targetRecordId = activeRecordId || recordId;
      let response;
      if (targetRecordId) {
        response = await medicalRecordService.updateMedicalRecord(targetRecordId, submissionData);
      } else {
        response = await medicalRecordService.createMedicalRecord(submissionData);
      }
      const nextRecordId = response?.data?.data?.id;
      if (nextRecordId) {
        setActiveRecordId(String(nextRecordId));
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('record_id', String(nextRecordId));
        navigate({ pathname: window.location.pathname, search: nextSearchParams.toString() }, { replace: true });
      }
      toast.success('Lưu nháp thành công');
    } catch (error) {
        // Improved error diagnostics: log response body/status if available
        console.error('Save draft error:', error);
        const serverMessage = error?.response?.data?.message || error?.response?.data || null;
        const status = error?.response?.status;
        if (serverMessage) {
          toast.error(`Lưu nháp thất bại${status ? ` (Mã ${status})` : ''}: ${typeof serverMessage === 'string' ? serverMessage : JSON.stringify(serverMessage)}`);
        } else if (error?.message) {
          toast.error(`Lưu nháp thất bại: ${error.message}`);
        } else {
          toast.error('Lưu nháp thất bại. Vui lòng thử lại.');
        }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const executeFinalSubmit = async () => {
    // Check quyền nhân viên lâm sàng (Chỉ lưu sinh hiệu, không cần chẩn đoán)
    const isClinicalStaff = user?.role === 'staff' && (user?.department === 'clinical' || user?.staff?.department === 'clinical');

    if (isConsultationMode) {
      const consultationTargetId = embeddedConsultationId || appointment?.id;

      if (!isClinicalStaff && !formData.diagnosis.trim()) {
        toast.error('Chẩn đoán là trường bắt buộc đối với Bác sĩ.');
        return;
      }

      if (!consultationTargetId) {
        toast.error('Không tìm thấy buổi tư vấn');
        return;
      }

      try {
        setSubmitting(true);
        const response = await consultationService.completeConsultation(consultationTargetId, buildConsultationResultPayload());
        toast.success('Hoàn thành tư vấn thành công!');
        setShowPreviewModal(false);
        if (typeof onClose === 'function') {
          try { onClose(); } catch (e) { /* noop */ }
        } else {
          navigate(getFallbackReturnPath(), { replace: true });
        }
      } catch (error) {
        console.error('Submit consultation error:', error);
        toast.error(error.response?.data?.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Validation: Nếu là bác sĩ thì bắt buộc có chẩn đoán. Staff thì không cần.
    if (!isClinicalStaff && !formData.diagnosis.trim()) {
      toast.error('Chẩn đoán là trường bắt buộc đối với Bác sĩ.');
      return;
    }

    try {
      setSubmitting(true);
      const { submissionData } = buildSubmissionData({
        isDraft: isClinicalStaff
      });

      // 5. Gọi API
      const targetRecordId = activeRecordId || recordId;
      let response;
      if (targetRecordId) {
        response = await medicalRecordService.updateMedicalRecord(targetRecordId, submissionData);
        toast.success('Cập nhật hồ sơ y tế thành công!');
      } else {
        response = await medicalRecordService.createMedicalRecord(submissionData);
        toast.success('Tạo hồ sơ y tế thành công!');
      }

      const nextRecordId = response?.data?.data?.id;
      if (nextRecordId) {
        setActiveRecordId(String(nextRecordId));
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('record_id', String(nextRecordId));
        navigate({ pathname: window.location.pathname, search: nextSearchParams.toString() }, { replace: true });
      }

      // 6. Điều hướng: nếu được nhúng (onClose) gọi callback, ngược lại điều hướng
      setShowPreviewModal(false);
      if (typeof onClose === 'function') {
        try { onClose(); } catch (e) { /* noop */ }
      } else {
        navigate(getFallbackReturnPath(), { replace: true });
      }

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper render file
  const renderFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <FaFileImage />;
    if (ext === 'pdf') return <FaFilePdf />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord />;
    return <FaFileMedical />;
  };

  if (loading) {
    return (
      <div className="medical-record-form-page-container medical-record-form-page-loading">
        <FaSpinner className="medical-record-form-page-spin-icon" />
        <span>Đang tải dữ liệu hồ sơ...</span>
      </div>
    );
  }

  // Vitals card JSX extracted so we can render it before results in embedded mode
  const VitalsCard = (
    <div className="medical-record-form-page-card medical-record-form-page-vitals-card" style={{ backgroundColor: '#fff5f8', borderColor: '#ffb6c1' }}>
      <h2 className="medical-record-form-page-card-title" style={{ color: '#d81b60' }}>
        <FaNotesMedical /> Chỉ số cơ bản
      </h2>
      <div className="medical-record-form-page-vitals-grid">
        <div className="medical-record-form-page-form-group">
          <label>Huyết áp (mmHg)</label>
          <input type="text" name="vitals.blood_pressure" className="medical-record-form-page-input" value={formData.vitals.blood_pressure} onChange={handleFormChange} placeholder="Ví dụ: 120/80" />
        </div>
        <div className="medical-record-form-page-form-group">
          <label>Mạch (l/p)</label>
          <input type="number" name="vitals.pulse" className="medical-record-form-page-input" value={formData.vitals.pulse} onChange={handleFormChange} />
        </div>
        <div className="medical-record-form-page-form-group">
          <label>Nhiệt độ (°C)</label>
          <input type="number" step="0.1" name="vitals.temperature" className="medical-record-form-page-input" value={formData.vitals.temperature} onChange={handleFormChange} />
        </div>
        <div className="medical-record-form-page-form-group">
          <label>Cân nặng (kg)</label>
          <input type="number" step="0.1" name="vitals.weight" className="medical-record-form-page-input" value={formData.vitals.weight} onChange={handleFormChange} />
        </div>
        <div className="medical-record-form-page-form-group">
          <label>Chiều cao (cm)</label>
          <input type="number" name="vitals.height" className="medical-record-form-page-input" value={formData.vitals.height} onChange={handleFormChange} />
        </div>
        <div className="medical-record-form-page-form-group">
          <label>Nhịp thở (l/p)</label>
          <input type="number" name="vitals.respiratory_rate" className="medical-record-form-page-input" value={formData.vitals.respiratory_rate} onChange={handleFormChange} />
        </div>
        <div className="medical-record-form-page-form-group full-span">
          <label>Ghi chú lâm sàng ban đầu</label>
          <textarea name="clinical_note" className="medical-record-form-page-textarea" rows="2" value={formData.clinical_note} onChange={handleFormChange} placeholder="Triệu chứng hiện tại, lý do khám..." />
        </div>
      </div>
    </div>
  );

  return (
    <div className="medical-record-form-page-container">
      <form className="medical-record-form-page-form" onSubmit={handleOpenPreview}>
        
        {/* Header */}
        <div className="medical-record-form-page-header">
          <div className="medical-record-form-page-header-content">
            <h1>{isUpdateMode ? 'Cập nhật' : 'Tạo'} Hồ Sơ Y Tế</h1>
            <p>Nhập kết quả khám cho lịch hẹn <strong>{appointment?.code}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="medical-record-form-page-btn-submit medical-record-form-page-btn-secondary"
              onClick={saveDraftMedicalRecord}
              disabled={submitting || isSavingDraft}
            >
              {isSavingDraft ? <FaSpinner className="medical-record-form-page-spin-icon-small" /> : <FaSave />}
              Lưu nháp
            </button>
            {/* Prescription button intentionally removed: doctors prescribe only; pharmacy staff handle dispensing. */}
            <button
              type="submit"
              className="medical-record-form-page-btn-submit"
              disabled={submitting}
            >
              {submitting ? <FaSpinner className="medical-record-form-page-spin-icon-small" /> : <FaSave />}
              Xem trước & gửi
            </button>
            
          </div>
        </div>

        {/* Thông tin lịch hẹn */}
        <div className="medical-record-form-page-card medical-record-form-page-info-card">
          <div className="medical-record-form-page-info-item">
            <FaUserInjured className="medical-record-form-page-info-icon" />
            <div className="medical-record-form-page-info-text">
              <label>Bệnh nhân</label>
              <span>{getPatientName()}</span>
              <small className="medical-record-form-page-info-sub">{getPatientPhone()}{getPatientEmail() ? ` • ${getPatientEmail()}` : ''}</small>
            </div>
          </div>
          <div className="medical-record-form-page-info-item">
            <FaUserMd className="medical-record-form-page-info-icon" />
            <div className="medical-record-form-page-info-text">
              <label>Bác sĩ</label>
              <span>{getDoctorName()}</span>
              <small className="medical-record-form-page-info-sub">{getDoctorPhone()}{getDoctorEmail() ? ` • ${getDoctorEmail()}` : ''}</small>
            </div>
          </div>
          <div className="medical-record-form-page-info-item">
            <FaCalendarAlt className="medical-record-form-page-info-icon" />
            <div className="medical-record-form-page-info-text">
              <label>Ngày khám</label>
              <span>{appointment?.appointment_date ? new Date(appointment?.appointment_date).toLocaleDateString('vi-VN') : '--'}{getServiceName() ? ` • ${getServiceName()}` : ''}</span>
            </div>
          </div>
        </div>
        {canViewSharedHealthProfile && (
          <div className="medical-record-form-page-card" style={{ marginBottom: '1.5rem', padding: '1rem', borderLeft: '4px solid #22c55e' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <strong>Hồ sơ sức khỏe đã được chia sẻ</strong>
                <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Bác sĩ có thể mở nhanh hồ sơ công khai của bệnh nhân để xem chỉ số và tiền sử liên quan.
                </div>
              </div>
              <button
                type="button"
                className="medical-record-form-page-btn-submit medical-record-form-page-btn-secondary"
                onClick={() => navigate(`/ho-so-suc-khoe-cong-khai/${code}`)}
              >
                Xem hồ sơ công khai
              </button>
            </div>
          </div>
        )}

        {/* Cột chính */}
        <div className="medical-record-form-page-main-grid">
          {embeddedCode && VitalsCard}
          
          {/* Cột trái (Form chính) */}
          <div className="medical-record-form-page-left-col">

            {/* 1. Kết quả khám */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaNotesMedical />
                Kết quả khám
              </h2>
              <div className="medical-record-form-page-form-group-grid-2">
                {/* Chẩn đoán (Bắt buộc) */}
                <div className="medical-record-form-page-form-group full-span">
                  <label htmlFor="diagnosis">Chẩn đoán *</label>
                  <textarea
                    id="diagnosis"
                    name="diagnosis"
                    className="medical-record-form-page-textarea medical-record-form-page-highlight"
                    rows="3"
                    placeholder="Nhập chẩn đoán của bác sĩ..."
                    value={formData.diagnosis}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                {/* Triệu chứng */}
                <div className="medical-record-form-page-form-group">
                  <label htmlFor="symptoms">Triệu chứng (nếu có)</label>
                  <textarea
                    id="symptoms"
                    name="symptoms"
                    className="medical-record-form-page-textarea"
                    rows="2"
                    placeholder="Mô tả triệu chứng..."
                    value={formData.symptoms}
                    onChange={handleFormChange}
                  />
                </div>
                {/* Kế hoạch điều trị */}
                <div className="medical-record-form-page-form-group">
                  <label htmlFor="treatment_plan">Kế hoạch điều trị</label>
                  <textarea
                    id="treatment_plan"
                    name="treatment_plan"
                    className="medical-record-form-page-textarea"
                    rows="2"
                    placeholder="Kế hoạch điều trị..."
                    value={formData.treatment_plan}
                    onChange={handleFormChange}
                  />
                </div>
                {/* Lời khuyên */}
                <div className="medical-record-form-page-form-group full-span">
                  <label htmlFor="advice">Lời khuyên</label>
                  <textarea
                    id="advice"
                    name="advice"
                    className="medical-record-form-page-textarea"
                    rows="2"
                    placeholder="Lời khuyên, dặn dò..."
                    value={formData.advice}
                    onChange={handleFormChange}
                  />
                </div>

              </div>
            </div>

            {/* 2. Đơn thuốc */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaFilePrescription />
                Đơn thuốc (Nếu có)
              </h2>
              <div className="medical-record-form-page-prescription-list">
                {prescriptionList.map((item, index) => (
                  <div key={index} className="medical-record-form-page-prescription-row" style={{position: 'relative', overflow: 'visible'}}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '999px',
                        background: '#16a34a',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>
                    
                    <div className="medical-record-form-page-prescription-field medical-record-form-page-prescription-name-field">
                      <label className="medical-record-form-page-prescription-field-label">Tên thuốc</label>
                      <input
                        type="text"
                        name="name"
                        className="medical-record-form-page-input medical-record-form-page-prescription-name-input"
                        placeholder="Gõ tên thuốc, mã thuốc, thành phần hoặc nhóm thuốc trong kho..."
                        value={item.name}
                        onChange={(e) => handleSearchMedicine(index, e.target.value)}
                        onBlur={handleBlurSearch}
                        onFocus={(e) => {
                          const currentValue = e.target.value;
                          if (currentValue) handleSearchMedicine(index, currentValue, true);
                        }}
                        autoComplete="off"
                      />
                      <div className="medical-record-form-page-prescription-field-hint">
                        Gõ để tìm thuốc trong kho.
                      </div>
                      {/* Dropdown Gợi ý */}
                      {showSuggestionsIndex === index && medicineSuggestions.length > 0 && (
                        <ul className="medical-record-form-page-prescription-suggestion-panel">
                          {medicineSuggestions.map((med) => (
                            <li 
                              key={med.id}
                              className="medical-record-form-page-prescription-suggestion-item"
                              onClick={() => selectMedicine(index, med)}
                            >
                              <div className="medical-record-form-page-prescription-suggestion-top">
                                <strong>{med.name}</strong>
                                <span className="medical-record-form-page-prescription-suggestion-price">
                                  {med.price ? `${parseInt(med.price).toLocaleString()}đ` : ''}
                                </span>
                              </div>
                              <div className="medical-record-form-page-prescription-suggestion-meta">
                                {med.unit ? `${med.unit} • ` : ''}
                                {med.stock_total !== null && typeof med.stock_total !== 'undefined'
                                  ? `Còn ${med.stock_total}`
                                  : (med.category || med.group || 'Thuốc gợi ý')}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* [MỚI] Các trường đơn thuốc có nhãn rõ ràng */}
                    <div className="medical-record-form-page-prescription-field medical-record-form-page-prescription-unit-field">
                      <label className="medical-record-form-page-prescription-field-label">Đơn vị</label>
                      <input
                        type="text"
                        name="unit"
                        className="medical-record-form-page-input"
                        placeholder="Đơn vị"
                        value={item.unit}
                        onChange={(e) => handlePrescriptionChange(index, e)}
                      />
                    </div>

                    {/* SL */}
                    <div className="medical-record-form-page-prescription-field input-small">
                      <label className="medical-record-form-page-prescription-field-label">SL</label>
                      <input
                        type="text"
                        name="quantity"
                        className="medical-record-form-page-input"
                        placeholder="SL"
                        value={item.quantity}
                        onChange={(e) => handlePrescriptionChange(index, e)}
                      />
                    </div>

                    {/* Liều dùng */}
                    <div className="medical-record-form-page-prescription-field input-small">
                      <label className="medical-record-form-page-prescription-field-label">Liều dùng</label>
                      <input
                        type="text"
                        name="dosage"
                        className="medical-record-form-page-input"
                        placeholder="Liều dùng"
                        value={item.dosage}
                        onChange={(e) => handlePrescriptionChange(index, e)}
                      />
                    </div>

                    <div className="medical-record-form-page-prescription-field input-large">
                      <label className="medical-record-form-page-prescription-field-label">Hướng dẫn</label>
                      <input
                        type="text"
                        name="instructions"
                        className="medical-record-form-page-input input-large"
                        placeholder="Hướng dẫn (VD: Sáng 1, Tối 1 sau ăn)"
                        value={item.instructions}
                        onChange={(e) => handlePrescriptionChange(index, e)}
                      />
                    </div>
                    <button 
                      type="button" 
                      className="medical-record-form-page-btn-icon medical-record-form-page-btn-remove"
                      onClick={() => removePrescriptionRow(index)}
                      disabled={prescriptionList.length === 1}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                className="medical-record-form-page-btn-add"
                onClick={addPrescriptionRow}
              >
                <FaPlus /> Thêm thuốc
              </button>
            </div>

            {/* 3. Dịch vụ phụ */}
            <div style={{ marginTop: '0.25rem' }}>
              <h2 className="medical-record-form-page-card-title" style={{ borderRadius: '12px 12px 0 0' }}>
                <FaNotesMedical /> Danh sách dịch vụ phụ
              </h2>
              <SubServiceInline parentAppointment={appointment} rows={subServiceRows} onChange={setSubServiceRows} />
            </div>
          </div>

          {/* Cột phải (Tái khám & Upload) */}
          <div className="medical-record-form-page-right-col">
            {!embeddedCode && VitalsCard}

            {/* 3. Tái khám */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaCalendarAlt />
                Tái khám
              </h2>
              <div className="medical-record-form-page-form-group">
                <label htmlFor="follow_up_date">Ngày tái khám (Nếu có)</label>
                <input
                  type="date"
                  id="follow_up_date"
                  name="follow_up_date"
                  className="medical-record-form-page-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.follow_up_date}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            {/* 4. Upload Files */}
            <div className="medical-record-form-page-card">
              <h2 className="medical-record-form-page-card-title">
                <FaUpload />
                Tài liệu đính kèm
              </h2>
              {/* Cảnh báo an toàn */}
              <div className="medical-record-form-page-alert-box">
                <FaExclamationTriangle />
                <span>Không upload thông tin nhạy cảm (CCCD, Ngân hàng). Chỉ upload tệp liên quan đến khám bệnh.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={notifyDoctor} onChange={(e) => setNotifyDoctor(e.target.checked)} />
                  Thông báo bác sĩ khi có tệp đính kèm
                </label>
                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Giới hạn: {Math.round(MAX_FILE_SIZE_BYTES/1024/1024)}MB/tệp, tổng {Math.round(MAX_TOTAL_BYTES/1024/1024)}MB
                </div>
              </div>

              {/* Upload Ảnh XN */}
              <div className="medical-record-form-page-file-group">
                <label>Ảnh xét nghiệm (jpg, png, webp)</label>
                <label htmlFor="test_images_input" className="medical-record-form-page-file-uploader">
                  <FaUpload /> Nhấn để chọn ảnh
                </label>
                <input
                  id="test_images_input"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e, 'test_images')}
                  style={{ display: 'none' }}
                />
                <div className="medical-record-form-page-file-list">
                    {keptTestImages.map((file, index) => {
                      const fileUrl = file.url || file.file_url || file.path || null;
                      const isImage = (file.originalname || file.name || '').toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);
                      return (
                        <div key={`kept-img-${index}`} className="medical-record-form-page-file-item">
                          {isImage ? (
                            fileUrl ? <a href={fileUrl} target="_blank" rel="noreferrer"><img src={fileUrl} alt={file.originalname || file.name} style={{ height: 42, borderRadius: 6 }} /></a>
                                    : <FaFileImage />
                          ) : renderFileIcon(file.originalname || file.name || '')}
                          {fileUrl ? (
                            <a className="medical-record-form-page-file-name" href={fileUrl} target="_blank" rel="noreferrer" title={file.originalname || file.name}>{file.originalname || file.name}</a>
                          ) : (
                            <span className="medical-record-form-page-file-name" title={file.originalname || file.name}>{file.originalname || file.name}</span>
                          )}
                          <button type="button" onClick={() => removeKeptFile(index, 'test_images')}><FaTimes /></button>
                        </div>
                      );
                    })}
                    {newTestImages.map((item, index) => (
                      <div key={`new-img-${index}`} className="medical-record-form-page-file-item new">
                        {item.url ? <img src={item.url} alt={item.name} style={{ height: 42, borderRadius: 6 }} /> : <FaFileImage />}
                        <a className="medical-record-form-page-file-name" href={item.url} target="_blank" rel="noreferrer" title={item.name}>{item.name}</a>
                        <small style={{ marginLeft: 8, color: '#6b7280' }}>{(item.size/1024/1024).toFixed(2)}MB</small>
                        <button type="button" onClick={() => removeNewFile(index, 'test_images')}><FaTimes /></button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Upload File Báo cáo */}
              <div className="medical-record-form-page-file-group">
                <label>File báo cáo (pdf, doc, docx)</label>
                <label htmlFor="report_files_input" className="medical-record-form-page-file-uploader">
                  <FaUpload /> Nhấn để chọn file
                </label>
                <input
                  id="report_files_input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFileChange(e, 'report_files')}
                  style={{ display: 'none' }}
                />
                    <div className="medical-record-form-page-file-list">
                      {keptReportFiles.map((file, index) => {
                        const fileUrl = file.url || file.file_url || file.path || null;
                        return (
                          <div key={`kept-rep-${index}`} className="medical-record-form-page-file-item">
                            {renderFileIcon(file.originalname || file.name || '')}
                            {fileUrl ? (
                              <a className="medical-record-form-page-file-name" href={fileUrl} target="_blank" rel="noreferrer" title={file.originalname || file.name}>{file.originalname || file.name}</a>
                            ) : (
                              <span className="medical-record-form-page-file-name" title={file.originalname || file.name}>{file.originalname || file.name}</span>
                            )}
                            <button type="button" onClick={() => removeKeptFile(index, 'report_files')}><FaTimes /></button>
                          </div>
                        );
                      })}
                      {newReportFiles.map((item, index) => (
                        <div key={`new-rep-${index}`} className="medical-record-form-page-file-item new">
                          {renderFileIcon(item.name)}
                          <a className="medical-record-form-page-file-name" href={item.url} target="_blank" rel="noreferrer" title={item.name}>{item.name}</a>
                          <small style={{ marginLeft: 8, color: '#6b7280' }}>{(item.size/1024/1024).toFixed(2)}MB</small>
                          <button type="button" onClick={() => removeNewFile(index, 'report_files')}><FaTimes /></button>
                        </div>
                      ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPreviewModal && (
          <div className="mrfp-preview-overlay" onClick={() => !submitting && setShowPreviewModal(false)}>
            <div className="mrfp-preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mrfp-preview-header">
                <div>
                  <h3>Xem trước hồ sơ trước khi gửi</h3>
                  <p>Kiểm tra đầy đủ dữ liệu sẽ gửi cho bệnh nhân trước khi xác nhận.</p>
                </div>
                <button type="button" className="mrfp-preview-close" onClick={() => setShowPreviewModal(false)}>
                  <FaTimes />
                </button>
              </div>

              <MedicalRecordSummarySections
                record={previewRecord}
                patientName={getPatientName()}
                patientPhone={getPatientPhone()}
                patientEmail={getPatientEmail()}
                doctorName={getDoctorName()}
                doctorPhone={getDoctorPhone()}
                doctorEmail={getDoctorEmail()}
                serviceName={getServiceName()}
                fileUrl={(u) => u}
                showFileLinks={true}
              />

              <div className="mrfp-preview-actions">
                <button type="button" className="medical-record-form-page-btn-submit medical-record-form-page-btn-secondary" onClick={() => setShowPreviewModal(false)} disabled={submitting}>
                  Đóng
                </button>
                <button type="button" className="medical-record-form-page-btn-submit" onClick={executeFinalSubmit} disabled={submitting}>
                  {submitting ? <FaSpinner className="medical-record-form-page-spin-icon-small" /> : <FaSave />}
                  Xác nhận gửi
                </button>
              </div>
            </div>
          </div>
        )}

        

      </form>
    </div>
  );
};

export default MedicalRecordFormPage;


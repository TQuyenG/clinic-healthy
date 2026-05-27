import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  FaTimes,
  FaUserPlus,
  FaCalendarAlt,
  FaBolt,
  FaSearch,
  FaLayerGroup,
  FaStethoscope,
  FaComments,
  FaCheckCircle,
  FaInfoCircle,
} from 'react-icons/fa';
import appointmentService from '../../services/appointmentService';
import consultationService from '../../services/consultationService';
import serviceService from '../../services/serviceService';
import serviceCategoryService from '../../services/serviceCategoryService';
import userService from '../../services/userService';
import './WalkInReceptionModal.css';

const getToday = () => new Date().toISOString().split('T')[0];

const emptyPatient = {
  bookingFor: 'self',
  name: '',
  email: '',
  phone: '',
  dob: '',
  gender: 'Nam',
  relationship: '',
};

const emptyServiceForm = {
  serviceId: '',
  doctorId: '',
  date: getToday(),
  time: '',
  reason: '',
  findSoonestSlot: false,
};

const emptyConsultationForm = {
  specialtyId: '',
  doctorId: '',
  consultationPricingId: '',
  date: getToday(),
  time: '',
  chiefComplaint: '',
  filterType: 'chat',
  findSoonestSlot: false,
};

const WalkInReceptionModal = ({ show, onHide, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('service');
  const [loading, setLoading] = useState({ init: false, slots: false, submit: false, doctors: false });
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [specialtiesFromDoctors, setSpecialtiesFromDoctors] = useState([]);
  const [consultationPackages, setConsultationPackages] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotStats, setSlotStats] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('all');
  const [serviceSpecialtyFilter, setServiceSpecialtyFilter] = useState('');
  const [patient, setPatient] = useState(emptyPatient);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [consultationForm, setConsultationForm] = useState(emptyConsultationForm);

  const selectedConsultationPackage = useMemo(
    () => consultationPackages.find(item => String(item.id) === String(consultationForm.consultationPricingId)),
    [consultationPackages, consultationForm.consultationPricingId]
  );

  const selectableSlots = useMemo(
    () => (availableSlots || []).filter(slot => slot.isAvailable),
    [availableSlots]
  );

  const filteredServices = useMemo(() => {
    const keyword = serviceSearch.trim().toLowerCase();
    return (services || []).filter((service) => {
      const matchesCategory = selectedServiceCategory === 'all' || String(service.category_id) === String(selectedServiceCategory);
      const matchesKeyword = !keyword || [service.name, service.code, service.short_description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(keyword));
      return matchesCategory && matchesKeyword;
    });
  }, [services, serviceSearch, selectedServiceCategory]);

  const nextThreeDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  const formatDateISO = (date) => new Date(date).toISOString().split('T')[0];

  const handleServiceChange = async (serviceId, serviceList = services) => {
    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      setServiceSpecialtyFilter('');
      setServiceForm(prev => ({ ...prev, serviceId, doctorId: '', date: '', time: '' }));
      setAvailableSlots([]);
      
      const selectedService = serviceList.find(s => s.id === serviceId);
      if (!selectedService?.allow_doctor_choice) {
        setDoctors([]);
        setSpecialtiesFromDoctors([]);
        return;
      }

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/services/${serviceId}/doctors`);
      const apiResult = await response.json();
      let doctorsData = apiResult.success ? (apiResult.doctors || []) : [];
      if (!Array.isArray(doctorsData)) doctorsData = [];

      setAllDoctors(doctorsData);
      setDoctors(doctorsData);

      const specMap = new Map();
      doctorsData.forEach(d => {
        if (d.specialty?.id && d.specialty?.name) {
          specMap.set(d.specialty.id, { id: d.specialty.id, name: d.specialty.name });
        }
      });
      setSpecialtiesFromDoctors(Array.from(specMap.values()));
    } catch (error) {
      console.error('[WalkInReceptionModal] handleServiceChange error:', error);
      setDoctors([]);
      setSpecialtiesFromDoctors([]);
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

  const handleSpecialtyFilter = (specId) => {
    const newFilter = serviceSpecialtyFilter === specId ? '' : specId;
    setServiceSpecialtyFilter(newFilter);
    setServiceForm(prev => ({ ...prev, doctorId: '', date: '', time: '' }));
    
    if (newFilter) {
      setDoctors(allDoctors.filter(d => d.specialty?.id === newFilter));
    } else {
      setDoctors(allDoctors);
    }
  };

  useEffect(() => {
    if (!show) return;

    const init = async () => {
      try {
        setLoading(prev => ({ ...prev, init: true }));
        console.log('[WalkInReceptionModal] init start');

        const [serviceRes, specialtyRes, doctorRes] = await Promise.all([
          serviceService.getPublicServices({ limit: 1000 }),
          serviceCategoryService.getPublicServiceCategories(),
          userService.getAllDoctorsForAdmin({ limit: 500 }),
        ]);

        const serviceData = serviceRes?.data?.data || [];
        const specialtyData = specialtyRes?.data?.data || specialtyRes?.data?.specialties || specialtyRes?.data || [];
        const doctorData = doctorRes?.data?.data || doctorRes?.data?.users || doctorRes?.data || [];

        setServices(Array.isArray(serviceData) ? serviceData : []);
        setServiceCategories(Array.isArray(specialtyData) ? specialtyData : []);
        setSpecialties(Array.isArray(specialtyData) ? specialtyData : []);
        setDoctors(Array.isArray(doctorData) ? doctorData : []);

        console.log('[WalkInReceptionModal] init done', {
          services: serviceData?.length || 0,
          specialties: specialtyData?.length || 0,
          doctors: doctorData?.length || 0,
        });
      } catch (error) {
        console.error('[WalkInReceptionModal] init error', error);
        toast.error('Không tải được dữ liệu khởi tạo');
      } finally {
        setLoading(prev => ({ ...prev, init: false }));
      }
    };

    init();
  }, [show]);

  useEffect(() => {
    if (!show) return;
    if (activeTab !== 'consultation') return;
    if (!consultationForm.doctorId) return;

    const loadPackages = async () => {
      try {
        const res = await consultationService.getDoctorPricing(consultationForm.doctorId);
        const packageData = res?.data?.data || res?.data || [];
        setConsultationPackages(Array.isArray(packageData) ? packageData : []);
        console.log('[WalkInReceptionModal] consultation packages loaded', packageData?.length || 0);
      } catch (error) {
        console.error('[WalkInReceptionModal] loadPackages error', error);
        setConsultationPackages([]);
      }
    };

    loadPackages();
  }, [show, activeTab, consultationForm.doctorId]);

  useEffect(() => {
    if (!show) return;

    const loadSlots = async () => {
      const isServiceTab = activeTab === 'service';
      const date = isServiceTab ? serviceForm.date : consultationForm.date;
      const doctorId = isServiceTab ? serviceForm.doctorId : consultationForm.doctorId;
      const serviceId = isServiceTab ? serviceForm.serviceId : consultationForm.consultationPricingId;

      if (!doctorId || !date || !serviceId) {
        setAvailableSlots([]);
        return;
      }

      try {
        setLoading(prev => ({ ...prev, slots: true }));
        console.log('[WalkInReceptionModal] load slots', { activeTab, doctorId, date, serviceId });

        const res = isServiceTab
          ? await appointmentService.getAvailableSlots(doctorId, date, serviceId, 'offline')
          : await consultationService.getAvailableSlots(doctorId, date, serviceId);

        const raw = res?.data?.data?.raw || res?.data?.data?.availableSlots || [];
        const flat = Array.isArray(raw) ? raw : [];
        const normalized = flat.map((slot) => ({
          ...slot,
          isAvailable: Object.prototype.hasOwnProperty.call(slot, 'isAvailable')
            ? !!slot.isAvailable
            : Object.prototype.hasOwnProperty.call(slot, 'is_available')
              ? !!slot.is_available
              : Object.prototype.hasOwnProperty.call(slot, 'available')
                ? !!slot.available
                : Object.prototype.hasOwnProperty.call(slot, 'status')
                  ? slot.status === 'available'
                  : !slot.isBusy,
        }));

        setAvailableSlots(normalized);
        console.log('[WalkInReceptionModal] available slots', normalized.filter(slot => slot.isAvailable).length);
      } catch (error) {
        console.error('[WalkInReceptionModal] load slots error', error);
        setAvailableSlots([]);
      } finally {
        setLoading(prev => ({ ...prev, slots: false }));
      }
    };

    loadSlots();
  }, [show, activeTab, serviceForm.date, serviceForm.doctorId, serviceForm.serviceId, consultationForm.date, consultationForm.doctorId, consultationForm.consultationPricingId]);

  useEffect(() => {
    if (!show || activeTab !== 'service' || !serviceForm.serviceId) {
      setSlotStats(null);
      return;
    }

    const loadSlotStats = async () => {
      try {
        const response = await appointmentService.getSlotsStatsToday(serviceForm.serviceId);
        if (response?.data?.success) {
          setSlotStats(response.data.data || null);
        } else {
          setSlotStats(null);
        }
      } catch (error) {
        setSlotStats(null);
      }
    };

    loadSlotStats();
  }, [show, activeTab, serviceForm.serviceId, serviceForm.date]);

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  const resetAndClose = () => {
    setPatient(emptyPatient);
    setServiceForm(emptyServiceForm);
    setConsultationForm(emptyConsultationForm);
    setAvailableSlots([]);
    onHide?.();
  };

  const submitServiceWalkIn = async () => {
    if (!patient.name || !patient.phone || !serviceForm.serviceId || !serviceForm.doctorId || !serviceForm.date) {
      toast.error('Vui lòng điền đủ thông tin bắt buộc cho khám dịch vụ');
      return;
    }

    if (!serviceForm.findSoonestSlot && !serviceForm.time) {
      toast.error('Vui lòng chọn khung giờ cụ thể hoặc bật Khám ngay');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, submit: true }));
      console.log('[WalkInReceptionModal] submit service walk-in start');

      const payload = {
        guest_name: patient.name,
        guest_email: patient.email,
        guest_phone: patient.phone,
        guest_dob: patient.dob,
        guest_gender: patient.gender,
        service_id: serviceForm.serviceId,
        doctor_id: serviceForm.doctorId,
        appointment_date: serviceForm.date,
        appointment_start_time: serviceForm.time || undefined,
        reason: serviceForm.reason,
        payment_method: 'cash',
        findSoonestSlot: Boolean(serviceForm.findSoonestSlot || !serviceForm.time),
      };

      const response = await appointmentService.createAppointment({
        ...payload,
        appointment_type: 'offline',
      });

      if (response?.data?.success) {
        console.log('[WalkInReceptionModal] service walk-in created', response.data.data?.code);
        toast.success('Đã tạo lịch tiếp đón dịch vụ. Chờ thanh toán để cấp số.');
        onSuccess?.(response.data.data);
        resetAndClose();
      }
    } catch (error) {
      console.error('[WalkInReceptionModal] submit service error', error);
      toast.error(error.response?.data?.message || 'Không tạo được lịch dịch vụ');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const submitConsultationWalkIn = async () => {
    if (!patient.name || !patient.phone || !consultationForm.specialtyId || !consultationForm.doctorId || !consultationForm.consultationPricingId || !consultationForm.date) {
      toast.error('Vui lòng điền đủ thông tin bắt buộc cho tư vấn');
      return;
    }

    const selectedTime = consultationForm.time || (consultationForm.findSoonestSlot ? selectableSlots[0]?.time : '');
    if (!selectedTime) {
      toast.error('Vui lòng chọn giờ tư vấn hoặc bật Khám ngay');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, submit: true }));
      console.log('[WalkInReceptionModal] submit consultation start');

      const payload = {
        specialty_id: consultationForm.specialtyId,
        doctor_id: consultationForm.doctorId,
        consultation_pricing_id: consultationForm.consultationPricingId,
        appointment_time: `${consultationForm.date}T${selectedTime}:00`,
        date: consultationForm.date,
        time: selectedTime,
        chief_complaint: consultationForm.chiefComplaint,
        payment_method: 'cash',
        bookingFor: patient.bookingFor,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        dob: patient.dob,
        gender: patient.gender,
        relationship: patient.relationship,
        consultation_type: selectedConsultationPackage?.consultation_type || consultationForm.filterType,
      };

      const response = await consultationService.createConsultation(payload);
      if (response?.data?.success) {
        console.log('[WalkInReceptionModal] consultation created', response.data.data?.consultation_code || response.data.data?.id);
        toast.success('Đã tạo lịch tư vấn thành công.');
        onSuccess?.(response.data.data);
        resetAndClose();
      }
    } catch (error) {
      console.error('[WalkInReceptionModal] submit consultation error', error);
      toast.error(error.response?.data?.message || 'Không tạo được lịch tư vấn');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const renderPortal = () => {
    if (!show) return null;

    return createPortal(
      <div className="wrm-backdrop" onClick={resetAndClose}>
        <div className="wrm-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="wrm-header">
            <div>
              <div className="wrm-title">Tiếp đón khách tại quầy</div>
              <div className="wrm-subtitle">Tạo lịch tại quầy, lưu ở trạng thái pending rồi thanh toán sau.</div>
            </div>
            <button className="wrm-close" type="button" onClick={resetAndClose}>
              <FaTimes />
            </button>
          </div>

          <div className="wrm-tabs">
            <button className={`wrm-tab ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')} type="button">
              <FaStethoscope /> Dịch vụ khám
            </button>
            <button className={`wrm-tab ${activeTab === 'consultation' ? 'active' : ''}`} onClick={() => setActiveTab('consultation')} type="button">
              <FaComments /> Tư vấn
            </button>
          </div>

          <div className="wrm-body">
            <div className="wrm-note">
              <FaInfoCircle />
              <span>Hôm nay sẽ ưu tiên số thường. Lịch đặt trước từ hôm sau trở đi sẽ được backend tự tính số ưu tiên nếu phù hợp.</span>
            </div>

            {activeTab === 'service' ? (
              <div className="wrm-grid" style={{ gridTemplateColumns: '1fr 1.1fr' }}>
                {/* CỘT TRÁI: DỊ CH VỤ */}
                <div>
                  <div className="wrm-card">
                    <div className="wrm-card-title">Khám dịch vụ</div>
                    <div className="wrm-form-grid">
                      <div className="wrm-col-full">
                        <label>Dịch vụ *</label>
                        <div className="wrm-filter-toolbar" style={{display: 'grid', gap: 10}}>
                          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                            <FaSearch />
                            <input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Tìm dịch vụ, mã dịch vụ..." style={{flex: 1}} />
                          </div>
                          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                            <button type="button" className={`wrm-chip ${selectedServiceCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedServiceCategory('all')}>
                              <FaLayerGroup /> Tất cả
                            </button>
                            {serviceCategories.map(category => (
                              <button key={category.id} type="button" className={`wrm-chip ${String(selectedServiceCategory) === String(category.id) ? 'active' : ''}`} onClick={() => setSelectedServiceCategory(category.id)}>
                                <FaLayerGroup /> {category.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <select value={serviceForm.serviceId} onChange={(e) => handleServiceChange(e.target.value, services)}>
                          <option value="">-- Chọn dịch vụ --</option>
                          {filteredServices.map(item => (
                            <option key={item.id} value={item.id}>{item.name} {item.price ? `(${Number(item.price).toLocaleString('vi-VN')} VNĐ)` : ''}</option>
                          ))}
                        </select>
                      </div>

                      {serviceForm.serviceId && specialtiesFromDoctors.length > 0 && (
                        <div className="wrm-col-full">
                          <label>Lọc theo chuyên khoa</label>
                          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                            {specialtiesFromDoctors.map(spec => (
                              <button key={spec.id} type="button" className={`wrm-chip ${serviceSpecialtyFilter === spec.id ? 'active' : ''}`} onClick={() => handleSpecialtyFilter(spec.id)}>
                                {spec.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="wrm-col-full">
                        <label>Bác sĩ *</label>
                        <select value={serviceForm.doctorId} onChange={(e) => setServiceForm(prev => ({ ...prev, doctorId: e.target.value, time: '' }))} disabled={!serviceForm.serviceId || loading.doctors}>
                          <option value="">-- Chọn bác sĩ --</option>
                          {loading.doctors && <option>Đang tải bác sĩ...</option>}
                          {doctors.map(item => (
                            <option key={item.id || item.userId} value={item.id || item.userId}>{item.full_name || item.fullName || item.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="wrm-col-full">
                        <label>Ngày khám *</label>
                        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                          {nextThreeDays.map(date => {
                            const iso = formatDateISO(date);
                            const active = serviceForm.date === iso;
                            return (
                              <button key={iso} type="button" className={`wrm-chip ${active ? 'active' : ''}`} onClick={() => setServiceForm(prev => ({ ...prev, date: iso, time: '' }))}>
                                {date.toLocaleDateString('vi-VN', { weekday: 'short' })} {date.getDate()}/{date.getMonth() + 1}
                              </button>
                            );
                          })}
                          <input type="date" min={getToday()} value={serviceForm.date} onChange={(e) => setServiceForm(prev => ({ ...prev, date: e.target.value, time: '' }))} style={{minWidth: 160}} />
                        </div>
                      </div>

                      <div>
                        <label>Thời gian</label>
                        <input value={serviceForm.time} placeholder={serviceForm.findSoonestSlot ? 'Khám ngay - hệ thống tự chọn giờ sớm nhất' : 'Chọn từ slot bên dưới'} readOnly />
                      </div>
                      <div>
                        <label>Mở khám ngay</label>
                        <button type="button" className="wrm-btn wrm-btn-outline" onClick={() => setServiceForm(prev => ({ ...prev, findSoonestSlot: !prev.findSoonestSlot, time: !prev.findSoonestSlot ? '' : prev.time }))} disabled={loading.slots} style={{width: '100%', justifyContent: 'center'}}>
                          <FaBolt /> {serviceForm.findSoonestSlot ? 'Đang bật Khám ngay' : 'Khám ngay'}
                        </button>
                      </div>
                      <div className="wrm-col-full">
                        <label>Lý do khám</label>
                        <textarea rows={3} value={serviceForm.reason} onChange={(e) => setServiceForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="Triệu chứng hoặc nhu cầu khám..." />
                      </div>
                    </div>

                    <div className="wrm-note" style={{marginTop: 12}}>
                      <FaInfoCircle />
                      <span>Chọn một giờ cụ thể để đặt lịch bình thường. Nếu bật Khám ngay, hệ thống sẽ tự tìm slot sớm nhất còn trống.</span>
                    </div>

                    {slotStats && Object.keys(slotStats).length > 0 && (
                      <div className="wrm-slot-stats">
                        <div className="wrm-slot-title">Số chỗ còn theo ca (hôm nay)</div>
                        <div className="wrm-slot-stats-grid">
                          {Object.entries(slotStats).map(([key, value]) => (
                            <div key={key} className="wrm-slot-stat-item">
                              <div className="wrm-slot-stat-name">{value.display_name || key}</div>
                              <div className="wrm-slot-stat-remaining">Còn {value.remaining} chỗ</div>
                              <div className="wrm-slot-stat-meta">Đã đặt {value.booked}/{value.capacity}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="wrm-slot-area">
                      <div className="wrm-slot-title">Slot trống</div>
                      {loading.slots ? (
                        <div className="wrm-empty-state">Đang tải slot...</div>
                      ) : availableSlots.length > 0 ? (
                        <div className="wrm-slot-list">
                          {availableSlots.map((slot, index) => (
                            <button key={`${slot.time}-${index}`} type="button" className={`wrm-slot-btn ${serviceForm.time === slot.time ? 'active' : ''} ${!slot.isAvailable ? 'disabled' : ''}`} onClick={() => slot.isAvailable && setServiceForm(prev => ({ ...prev, time: slot.time, findSoonestSlot: false }))} disabled={!slot.isAvailable}>
                              <div className="wrm-slot-time">{slot.time?.slice(0, 5) || '--:--'}</div>
                              <div className="wrm-slot-label">{slot.reason || slot.label || (slot.isAvailable ? 'Slot trống' : 'Đã kín')}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="wrm-empty-state">Chưa có slot trống cho cấu hình hiện tại.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI: THÔNG TIN BỆNH NHÂN */}
                <div>
                  <div className="wrm-card">
                    <div className="wrm-card-title">Thông tin bệnh nhân</div>
                    <div className="wrm-form-grid">
                      <div className="wrm-col-full">
                        <label>Họ tên *</label>
                        <input value={patient.name} onChange={(e) => setPatient(prev => ({ ...prev, name: e.target.value }))} placeholder="Nhập họ tên" />
                      </div>
                      <div>
                        <label>Số điện thoại *</label>
                        <input value={patient.phone} onChange={(e) => setPatient(prev => ({ ...prev, phone: e.target.value }))} placeholder="0xxx..." />
                      </div>
                      <div>
                        <label>Email</label>
                        <input type="email" value={patient.email} onChange={(e) => setPatient(prev => ({ ...prev, email: e.target.value }))} placeholder="example@email.com" />
                      </div>
                      <div>
                        <label>Ngày sinh</label>
                        <input type="date" value={patient.dob} onChange={(e) => setPatient(prev => ({ ...prev, dob: e.target.value }))} />
                      </div>
                      <div>
                        <label>Giới tính</label>
                        <select value={patient.gender} onChange={(e) => setPatient(prev => ({ ...prev, gender: e.target.value }))}>
                          <option>Nam</option>
                          <option>Nữ</option>
                          <option>Khác</option>
                        </select>
                      </div>
                      <div className="wrm-col-full">
                        <label>Đặt lịch cho</label>
                        <select value={patient.bookingFor} onChange={(e) => setPatient(prev => ({ ...prev, bookingFor: e.target.value }))}>
                          <option value="self">Chính mình</option>
                          <option value="other">Người thân</option>
                        </select>
                      </div>
                      {patient.bookingFor === 'other' && (
                        <div className="wrm-col-full">
                          <label>Mối quan hệ</label>
                          <input value={patient.relationship} onChange={(e) => setPatient(prev => ({ ...prev, relationship: e.target.value }))} placeholder="Ví dụ: Con, Vợ, Chồng..." />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="wrm-grid" style={{ gridTemplateColumns: '1fr 1.1fr' }}>
                {/* TƯ VẤN: CỘT TRÁI */}
                <div>
                  <div className="wrm-card">
                    <div className="wrm-card-title">Chi tiết tư vấn</div>
                    <div className="wrm-form-grid">
                      <div className="wrm-col-full">
                        <label>Chuyên khoa *</label>
                        <select value={consultationForm.specialtyId} onChange={(e) => setConsultationForm(prev => ({ ...prev, specialtyId: e.target.value, doctorId: '', consultationPricingId: '', time: '' }))}>
                          <option value="">-- Chọn chuyên khoa --</option>
                          {specialties.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="wrm-col-full">
                        <label>Bác sĩ *</label>
                        <select value={consultationForm.doctorId} onChange={(e) => setConsultationForm(prev => ({ ...prev, doctorId: e.target.value, consultationPricingId: '', time: '' }))}>
                          <option value="">-- Chọn bác sĩ --</option>
                          {doctors.map(item => (
                            <option key={item.id || item.userId} value={item.id || item.userId}>{item.full_name || item.fullName || item.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="wrm-col-full">
                        <label>Gói tư vấn *</label>
                        <select value={consultationForm.consultationPricingId} onChange={(e) => setConsultationForm(prev => ({ ...prev, consultationPricingId: e.target.value, time: '' }))}>
                          <option value="">-- Chọn gói --</option>
                          {consultationPackages.map(item => (
                            <option key={item.id} value={item.id}>{item.package_name || item.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Ngày *</label>
                        <input type="date" min={getToday()} value={consultationForm.date} onChange={(e) => setConsultationForm(prev => ({ ...prev, date: e.target.value, time: '' }))} />
                      </div>
                      <div>
                        <label>Giờ *</label>
                        <input value={consultationForm.time} placeholder={consultationForm.findSoonestSlot ? 'Khám ngay - hệ thống tự chọn giờ sớm nhất' : 'Chọn từ slot bên dưới'} readOnly />
                      </div>
                      <div className="wrm-col-full">
                        <label>Lý do tư vấn *</label>
                        <textarea rows={3} value={consultationForm.chiefComplaint} onChange={(e) => setConsultationForm(prev => ({ ...prev, chiefComplaint: e.target.value }))} placeholder="Mô tả nhu cầu tư vấn..." />
                      </div>
                      <div className="wrm-col-full wrm-actions-inline">
                        <button type="button" className="wrm-btn wrm-btn-outline" onClick={() => setConsultationForm(prev => ({ ...prev, findSoonestSlot: !prev.findSoonestSlot, time: !prev.findSoonestSlot ? '' : prev.time }))} disabled={loading.slots}>
                          <FaBolt /> {consultationForm.findSoonestSlot ? 'Đang bật Khám ngay' : 'Khám ngay'}
                        </button>
                      </div>
                    </div>

                    <div className="wrm-slot-area">
                      <div className="wrm-slot-title">Slot trống</div>
                      {loading.slots ? (
                        <div className="wrm-empty-state">Đang tải slot...</div>
                      ) : availableSlots.length > 0 ? (
                        <div className="wrm-slot-list">
                          {availableSlots.map((slot, index) => (
                            <button key={`${slot.time}-${index}`} type="button" className={`wrm-slot-btn ${consultationForm.time === slot.time ? 'active' : ''} ${!slot.isAvailable ? 'disabled' : ''}`} onClick={() => slot.isAvailable && setConsultationForm(prev => ({ ...prev, time: slot.time, findSoonestSlot: false }))} disabled={!slot.isAvailable}>
                              <div className="wrm-slot-time">{slot.time?.slice(0, 5) || '--:--'}</div>
                              <div className="wrm-slot-label">{slot.reason || slot.label || (slot.isAvailable ? 'Slot trống' : 'Đã kín')}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="wrm-empty-state">Chưa có slot trống cho cấu hình hiện tại.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TƯ VẤN: CỘT PHẢI */}
                <div>
                  <div className="wrm-card">
                    <div className="wrm-card-title">Thông tin bệnh nhân</div>
                    <div className="wrm-form-grid">
                      <div className="wrm-col-full">
                        <label>Họ tên *</label>
                        <input value={patient.name} onChange={(e) => setPatient(prev => ({ ...prev, name: e.target.value }))} placeholder="Nhập họ tên" />
                      </div>
                      <div>
                        <label>Số điện thoại *</label>
                        <input value={patient.phone} onChange={(e) => setPatient(prev => ({ ...prev, phone: e.target.value }))} placeholder="0xxx..." />
                      </div>
                      <div>
                        <label>Email</label>
                        <input type="email" value={patient.email} onChange={(e) => setPatient(prev => ({ ...prev, email: e.target.value }))} placeholder="example@email.com" />
                      </div>
                      <div>
                        <label>Ngày sinh</label>
                        <input type="date" value={patient.dob} onChange={(e) => setPatient(prev => ({ ...prev, dob: e.target.value }))} />
                      </div>
                      <div>
                        <label>Giới tính</label>
                        <select value={patient.gender} onChange={(e) => setPatient(prev => ({ ...prev, gender: e.target.value }))}>
                          <option>Nam</option>
                          <option>Nữ</option>
                          <option>Khác</option>
                        </select>
                      </div>
                      <div className="wrm-col-full">
                        <label>Đặt lịch cho</label>
                        <select value={patient.bookingFor} onChange={(e) => setPatient(prev => ({ ...prev, bookingFor: e.target.value }))}>
                          <option value="self">Chính mình</option>
                          <option value="other">Người thân</option>
                        </select>
                      </div>
                      {patient.bookingFor === 'other' && (
                        <div className="wrm-col-full">
                          <label>Mối quan hệ</label>
                          <input value={patient.relationship} onChange={(e) => setPatient(prev => ({ ...prev, relationship: e.target.value }))} placeholder="Ví dụ: Con, Vợ, Chồng..." />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
                  <div>
                    <label>Số điện thoại *</label>
            <div className="wrm-footer">
              <div className="wrm-footer-hint">
                <FaInfoCircle /> Lịch sẽ được lưu trạng thái <strong>pending</strong>. Cấp số chỉ xảy ra sau khi thanh toán tại quầy.
              </div>
              <div className="wrm-footer-actions">
                <button type="button" className="wrm-btn wrm-btn-ghost" onClick={resetAndClose}>Hủy</button>
                <button
                  type="button"
                  className="wrm-btn wrm-btn-primary"
                  onClick={activeTab === 'service' ? submitServiceWalkIn : submitConsultationWalkIn}
                  disabled={loading.submit || loading.init}
                >
                  {loading.submit ? 'Đang lưu...' : <><FaUserPlus /> Tạo lịch tại quầy</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      );
    };

    return renderPortal();
  };
                      <div className="wrm-filter-toolbar" style={{display: 'grid', gap: 10}}>
                        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                          <FaSearch />
                          <input
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            placeholder="Tìm dịch vụ, mã dịch vụ..."
                            style={{flex: 1}}
                          />
                        </div>
                        <div className="wrm-category-row" style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                          <button type="button" className={`wrm-chip ${selectedServiceCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedServiceCategory('all')}>
                            <FaLayerGroup /> Tất cả
                          </button>
                          {serviceCategories.map(category => (
                            <button
                              key={category.id}
                              type="button"
                              className={`wrm-chip ${String(selectedServiceCategory) === String(category.id) ? 'active' : ''}`}
                              onClick={() => setSelectedServiceCategory(category.id)}
                            >
                              <FaLayerGroup /> {category.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <select
                        value={serviceForm.serviceId}
                        onChange={(e) => { setServiceForm(prev => ({ ...prev, serviceId: e.target.value, doctorId: '', time: '' })); setServiceSpecialtyFilter(''); }}
                      >
                        <option value="">-- Chọn dịch vụ --</option>
                        {filteredServices.map(item => (
                          <option key={item.id} value={item.id}>{item.name} {item.price ? `(${Number(item.price).toLocaleString('vi-VN')} VNĐ)` : ''}</option>
                        ))}
                      </select>
                    </div>
                    {serviceForm.serviceId && specialtiesFromServiceDoctors.length > 0 && (
                      <div className="wrm-col-full">
                        <label>Lọc theo chuyên khoa</label>
                        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                          {specialtiesFromServiceDoctors.map(spec => (
                            <button
                              key={spec.id}
                              type="button"
                              className={`wrm-chip ${serviceSpecialtyFilter === spec.id ? 'active' : ''}`}
                              onClick={() => setServiceSpecialtyFilter(serviceSpecialtyFilter === spec.id ? '' : spec.id)}
                            >
                              {spec.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="wrm-col-full">
                      <label>Bác sĩ *</label>
                      <select value={serviceForm.doctorId} onChange={(e) => setServiceForm(prev => ({ ...prev, doctorId: e.target.value, time: '' }))}>  
                        <option value="">-- Chọn bác sĩ --</option>
                        {doctorsForService.map(item => (
                          <option key={item.id || item.userId} value={item.id || item.userId}>{item.full_name || item.fullName || item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="wrm-col-full">
                      <label>Ngày khám *</label>
                      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                        {nextThreeDays.map(date => {
                          const iso = formatDateISO(date);
                          const active = serviceForm.date === iso;
                          return (
                            <button
                              key={iso}
                              type="button"
                              className={`wrm-chip ${active ? 'active' : ''}`}
                              onClick={() => setServiceForm(prev => ({ ...prev, date: iso, time: '' }))}
                            >
                              {date.toLocaleDateString('vi-VN', { weekday: 'short' })} {date.getDate()}/{date.getMonth() + 1}
                            </button>
                          );
                        })}
                        <input
                          type="date"
                          min={getToday()}
                          value={serviceForm.date}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, date: e.target.value, time: '' }))}
                          style={{minWidth: 160}}
                        />
                      </div>
                    </div>
                    <div>
                      <label>Thời gian</label>
                      <input value={serviceForm.time} placeholder={serviceForm.findSoonestSlot ? 'Khám ngay - hệ thống tự chọn giờ sớm nhất' : 'Chọn từ slot bên dưới'} readOnly />
                    </div>
                    <div>
                      <label>Mở khám ngay</label>
                      <button
                        type="button"
                        className="wrm-btn wrm-btn-outline"
                        onClick={() => setServiceForm(prev => ({
                          ...prev,
                          findSoonestSlot: !prev.findSoonestSlot,
                          time: !prev.findSoonestSlot ? '' : prev.time,
                        }))}
                        disabled={loading.slots}
                        style={{width: '100%', justifyContent: 'center'}}
                      >
                        <FaBolt /> {serviceForm.findSoonestSlot ? 'Đang bật Khám ngay' : 'Khám ngay'}
                      </button>
                    </div>
                    <div className="wrm-col-full">
                      <label>Lý do khám</label>
                      <textarea rows={3} value={serviceForm.reason} onChange={(e) => setServiceForm(prev => ({ ...prev, reason: e.target.value }))} placeholder="Triệu chứng hoặc nhu cầu khám..." />
                    </div>
                  </div>

                  <div className="wrm-note" style={{marginTop: 12}}>
                    <FaInfoCircle />
                    <span>Chọn một giờ cụ thể để đặt lịch bình thường. Nếu bật Khám ngay, hệ thống sẽ tự tìm slot sớm nhất còn trống.</span>
                  </div>

                  {slotStats && Object.keys(slotStats).length > 0 && (
                    <div className="wrm-slot-stats">
                      <div className="wrm-slot-title">Số chỗ còn theo ca (hôm nay)</div>
                      <div className="wrm-slot-stats-grid">
                        {Object.entries(slotStats).map(([key, value]) => (
                          <div key={key} className="wrm-slot-stat-item">
                            <div className="wrm-slot-stat-name">{value.display_name || key}</div>
                            <div className="wrm-slot-stat-remaining">Còn {value.remaining} chỗ</div>
                            <div className="wrm-slot-stat-meta">Đã đặt {value.booked}/{value.capacity}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="wrm-slot-area">
                    <div className="wrm-slot-title">Slot trống</div>
                    {loading.slots ? (
                      <div className="wrm-empty-state">Đang tải slot...</div>
                    ) : availableSlots.length > 0 ? (
                      <div className="wrm-slot-list">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={`${slot.time}-${index}`}
                            type="button"
                            className={`wrm-slot-btn ${serviceForm.time === slot.time ? 'active' : ''} ${!slot.isAvailable ? 'disabled' : ''}`}
                            onClick={() => slot.isAvailable && setServiceForm(prev => ({ ...prev, time: slot.time, findSoonestSlot: false }))}
                            disabled={!slot.isAvailable}
                          >
                            <div className="wrm-slot-time">{slot.time?.slice(0, 5) || '--:--'}</div>
                            <div className="wrm-slot-label">{slot.reason || slot.label || (slot.isAvailable ? 'Slot trống' : 'Đã kín')}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="wrm-empty-state">Chưa có slot trống cho cấu hình hiện tại.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                <div className="wrm-card">
                  <div className="wrm-card-title">Tư vấn</div>
                  <div className="wrm-form-grid">
                    <div className="wrm-col-full">
                      <label>Chuyên khoa *</label>
                      <select value={consultationForm.specialtyId} onChange={(e) => setConsultationForm(prev => ({ ...prev, specialtyId: e.target.value, doctorId: '', consultationPricingId: '', time: '' }))}>
                        <option value="">-- Chọn chuyên khoa --</option>
                        {specialties.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="wrm-col-full">
                      <label>Bác sĩ *</label>
                      <select value={consultationForm.doctorId} onChange={(e) => setConsultationForm(prev => ({ ...prev, doctorId: e.target.value, consultationPricingId: '', time: '' }))}>
                        <option value="">-- Chọn bác sĩ --</option>
                        {doctors.map(item => (
                          <option key={item.id || item.userId} value={item.id || item.userId}>{item.full_name || item.fullName || item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="wrm-col-full">
                      <label>Gói tư vấn *</label>
                      <select value={consultationForm.consultationPricingId} onChange={(e) => setConsultationForm(prev => ({ ...prev, consultationPricingId: e.target.value, time: '' }))}>
                        <option value="">-- Chọn gói --</option>
                        {consultationPackages.map(item => (
                          <option key={item.id} value={item.id}>{item.package_name || item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Ngày *</label>
                      <input type="date" min={getToday()} value={consultationForm.date} onChange={(e) => setConsultationForm(prev => ({ ...prev, date: e.target.value, time: '' }))} />
                    </div>
                    <div>
                      <label>Giờ *</label>
                      <input value={consultationForm.time} placeholder={consultationForm.findSoonestSlot ? 'Khám ngay - hệ thống tự chọn giờ sớm nhất' : 'Chọn từ slot bên dưới'} readOnly />
                    </div>
                    <div className="wrm-col-full">
                      <label>Lý do tư vấn *</label>
                      <textarea rows={3} value={consultationForm.chiefComplaint} onChange={(e) => setConsultationForm(prev => ({ ...prev, chiefComplaint: e.target.value }))} placeholder="Mô tả nhu cầu tư vấn..." />
                    </div>
                    <div className="wrm-col-full wrm-actions-inline">
                      <button
                        type="button"
                        className="wrm-btn wrm-btn-outline"
                        onClick={() => setConsultationForm(prev => ({
                          ...prev,
                          findSoonestSlot: !prev.findSoonestSlot,
                          time: !prev.findSoonestSlot ? '' : prev.time,
                        }))}
                        disabled={loading.slots}
                      >
                        <FaBolt /> {consultationForm.findSoonestSlot ? 'Đang bật Khám ngay' : 'Khám ngay'}
                      </button>
                    </div>
                  </div>

                  <div className="wrm-slot-area">
                    <div className="wrm-slot-title">Slot trống</div>
                    {loading.slots ? (
                      <div className="wrm-empty-state">Đang tải slot...</div>
                    ) : availableSlots.length > 0 ? (
                      <div className="wrm-slot-list">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={`${slot.time}-${index}`}
                            type="button"
                            className={`wrm-slot-btn ${consultationForm.time === slot.time ? 'active' : ''} ${!slot.isAvailable ? 'disabled' : ''}`}
                            onClick={() => slot.isAvailable && setConsultationForm(prev => ({ ...prev, time: slot.time, findSoonestSlot: false }))}
                            disabled={!slot.isAvailable}
                          >
                            <div className="wrm-slot-time">{slot.time?.slice(0, 5) || '--:--'}</div>
                            <div className="wrm-slot-label">{slot.reason || slot.label || (slot.isAvailable ? 'Slot trống' : 'Đã kín')}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="wrm-empty-state">Chưa có slot trống cho cấu hình hiện tại.</div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          <div className="wrm-footer">
            <div className="wrm-footer-hint">
              <FaInfoCircle /> Lịch sẽ được lưu trạng thái <strong>pending</strong>. Cấp số chỉ xảy ra sau khi thanh toán tại quầy.
            </div>
            <div className="wrm-footer-actions">
              <button type="button" className="wrm-btn wrm-btn-ghost" onClick={resetAndClose}>Hủy</button>
              <button
                type="button"
                className="wrm-btn wrm-btn-primary"
                onClick={activeTab === 'service' ? submitServiceWalkIn : submitConsultationWalkIn}
                disabled={loading.submit || loading.init}
              >
                {loading.submit ? 'Đang lưu...' : <><FaUserPlus /> Tạo lịch tại quầy</>}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return renderPortal();
};

export default WalkInReceptionModal;

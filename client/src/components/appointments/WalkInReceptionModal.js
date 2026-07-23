import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaTimes,
  FaUserPlus,
  FaBolt,
  FaSearch,
  FaLayerGroup,
  FaStethoscope,
  FaComments,
  FaVideo,
  FaInfoCircle,
  FaSpinner,
  FaSun,
  FaCloudSun,
  FaMoon,
  FaExclamationTriangle,
  FaChevronRight,
} from 'react-icons/fa';
import appointmentService from '../../services/appointmentService';
import consultationService from '../../services/consultationService';
import serviceService from '../../services/serviceService';
import serviceCategoryService from '../../services/serviceCategoryService';
import userService from '../../services/userService';
import specialtyService from '../../services/specialtyService';
import { normalizeUserList } from '../../utils/normalizeUser';
import './WalkInReceptionModal.css';

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [loading, setLoading] = useState({ init: false, doctors: false, slots: false, submit: false });
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [serviceDoctors, setServiceDoctors] = useState([]);
  const [consultationDoctors, setConsultationDoctors] = useState([]);
  const [serviceSpecialties, setServiceSpecialties] = useState([]);
  const [loadedConsultationSpecialties, setLoadedConsultationSpecialties] = useState([]);
  const [consultationPackages, setConsultationPackages] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotStats, setSlotStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [consultationSearchTerm, setConsultationSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedServiceSpecialty, setSelectedServiceSpecialty] = useState('');
  const [patient, setPatient] = useState(emptyPatient);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [consultationForm, setConsultationForm] = useState(emptyConsultationForm);

  const nextThreeDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  const formatDateISO = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredServices = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return services.filter((service) => {
      const matchesCategory = selectedCategory === 'all' || String(service.category_id) === String(selectedCategory);
      const matchesKeyword = !keyword || [service.name, service.description, service.code, service.short_description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(keyword));
      return matchesCategory && matchesKeyword;
    });
  }, [services, searchTerm, selectedCategory]);

  const selectedService = useMemo(
    () => services.find(item => String(item.id) === String(serviceForm.serviceId)),
    [services, serviceForm.serviceId]
  );

  const consultationSpecialties = useMemo(() => {
    if (loadedConsultationSpecialties.length > 0) return loadedConsultationSpecialties;
    const map = new Map();
    allDoctors.forEach((doctor) => {
      if (doctor.specialty?.id && doctor.specialty?.name) {
        map.set(doctor.specialty.id, {
          id: doctor.specialty.id,
          name: doctor.specialty.name,
        });
      }
    });
    return Array.from(map.values());
  }, [loadedConsultationSpecialties, allDoctors]);

  const selectedConsultationDoctor = useMemo(
    () => consultationDoctors.find(doctor => String(doctor.id || doctor.userId) === String(consultationForm.doctorId)),
    [consultationDoctors, consultationForm.doctorId]
  );

  const doctorsForConsultation = useMemo(() => {
    const keyword = consultationSearchTerm.trim().toLowerCase();
    return consultationDoctors.filter((doctor) => {
      const matchesKeyword = !keyword || [doctor.full_name, doctor.fullName, doctor.name, doctor.specialty?.name]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(keyword));
      return matchesKeyword;
    });
  }, [consultationDoctors, consultationSearchTerm]);

  const filteredConsultationPackages = useMemo(() => {
    const keyword = consultationSearchTerm.trim().toLowerCase();
    return consultationPackages.filter((pkg) => {
      // Check package type - use package_type first, then fallback to consultation_type
      const pkgType = pkg.package_type || pkg.consultation_type;
      // Filter by consultation type (chat or video)
      if (pkgType && String(pkgType) !== String(consultationForm.filterType)) return false;
      if (!keyword) return true;
      return [pkg.package_name, pkg.short_description, pkg.description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(keyword));
    });
  }, [consultationPackages, consultationForm.filterType, consultationSearchTerm]);

  const groupedSlots = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    availableSlots.forEach((slot) => {
      if (!slot?.isAvailable) return;
      const hour = Number(String(slot.time || '').slice(0, 2));
      if (!Number.isFinite(hour)) return;
      if (hour < 12) groups.morning.push(slot);
      else if (hour < 17) groups.afternoon.push(slot);
      else groups.evening.push(slot);
    });
    return groups;
  }, [availableSlots]);

  const deduplicatedServiceSlots = useMemo(() => {
    const seenTimes = new Set();
    const groups = { morning: [], afternoon: [], evening: [] };
    availableSlots.forEach((slot) => {
      if (!slot?.isAvailable) return;
      const hour = Number(String(slot.time || '').slice(0, 2));
      if (!Number.isFinite(hour)) return;
      const slotKey = slot.id ? `${slot.id}` : `${slot.time}-${hour}`;
      if (seenTimes.has(slotKey)) return;
      seenTimes.add(slotKey);
      if (hour < 12) groups.morning.push(slot);
      else if (hour < 17) groups.afternoon.push(slot);
      else groups.evening.push(slot);
    });
    return groups;
  }, [availableSlots]);

  const getSoonestAvailableTime = (slots = [], selectedDate = '') => {
    const now = new Date();
    const todayStr = getToday();

    return (Array.isArray(slots) ? slots : [])
      .filter(slot => slot?.isAvailable)
      .filter((slot) => {
        if (!selectedDate || selectedDate !== todayStr) return true;
        const slotDate = new Date(`${selectedDate}T${slot.time}:00`);
        return slotDate.getTime() > now.getTime();
      })
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))[0]?.time || '';
  };

  const selectedConsultationPackage = useMemo(
    () => consultationPackages.find(item => String(item.id) === String(consultationForm.consultationPricingId)),
    [consultationPackages, consultationForm.consultationPricingId]
  );

  useEffect(() => {
    if (!show) return;

    const init = async () => {
      try {
        setLoading(prev => ({ ...prev, init: true }));

        const [serviceRes, categoryRes, doctorRes, specialtyRes] = await Promise.all([
          serviceService.getPublicServices({ limit: 1000 }),
          serviceCategoryService.getPublicServiceCategories(),
          userService.getAllDoctorsForAdmin({ limit: 500 }),
          specialtyService.getPublicSpecialties(),
        ]);

        const serviceData = serviceRes?.data?.data || [];
        const categoryData = categoryRes?.data?.data || categoryRes?.data?.specialties || categoryRes?.data || [];
        const doctorData = doctorRes?.data?.data || doctorRes?.data?.users || doctorRes?.data || [];
        let specialtyData = [];
        if (specialtyRes?.data?.specialties && Array.isArray(specialtyRes.data.specialties)) specialtyData = specialtyRes.data.specialties;
        else if (specialtyRes?.data && Array.isArray(specialtyRes.data)) specialtyData = specialtyRes.data;
        else if (specialtyRes?.specialties && Array.isArray(specialtyRes.specialties)) specialtyData = specialtyRes.specialties;
        else if (Array.isArray(specialtyRes)) specialtyData = specialtyRes;

        setServices(Array.isArray(serviceData) ? serviceData : []);
        setServiceCategories(Array.isArray(categoryData) ? categoryData : []);
        setAllDoctors(normalizeUserList(Array.isArray(doctorData) ? doctorData : [], 'doctor'));
        setLoadedConsultationSpecialties(Array.isArray(specialtyData) ? specialtyData : []);
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
        const response = await consultationService.getDoctorPricing(consultationForm.doctorId);
        const packageData = response?.data?.data || response?.data || [];
        setConsultationPackages(Array.isArray(packageData) ? packageData : []);
      } catch (error) {
        console.error('[WalkInReceptionModal] load consultation packages error', error);
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

        const response = isServiceTab
          ? await appointmentService.getAvailableSlots(doctorId, date, serviceId, 'offline')
          : await consultationService.getAvailableSlots(doctorId, date, serviceId);

        const raw = response?.data?.data?.raw || response?.data?.data?.availableSlots || [];
        const normalized = (Array.isArray(raw) ? raw : []).map((slot) => ({
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
        })).map((slot) => {
          // Chặn chọn slot đã qua giờ trong ngày hiện tại để khớp "slot thực tế"
          const isToday = String(date) === getToday();
          if (!isToday || !slot?.time) return slot;
          const slotDateTime = new Date(`${date}T${slot.time}:00`);
          if (slotDateTime.getTime() <= Date.now()) {
            return { ...slot, isAvailable: false, reason: 'Đã qua giờ' };
          }
          return slot;
        }).sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));

        setAvailableSlots(normalized);
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

    const loadStats = async () => {
      try {
        const response = await appointmentService.getSlotsStatsToday(serviceForm.serviceId);
        setSlotStats(response?.data?.success ? (response.data.data || null) : null);
      } catch (error) {
        setSlotStats(null);
      }
    };

    loadStats();
  }, [show, activeTab, serviceForm.serviceId]);

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  const resetAndClose = () => {
    setPatient(emptyPatient);
    setServiceForm(emptyServiceForm);
    setConsultationForm(emptyConsultationForm);
    setServiceDoctors([]);
    setConsultationDoctors([]);
    setServiceSpecialties([]);
    setConsultationPackages([]);
    setAvailableSlots([]);
    setSlotStats(null);
    setSelectedServiceSpecialty('');
    setSearchTerm('');
    setConsultationSearchTerm('');
    setSelectedCategory('all');
    onHide?.();
  };

  const handleServiceChange = async (serviceId) => {
    setServiceForm(prev => ({ ...prev, serviceId, doctorId: '', date: '', time: '' }));
    setServiceDoctors([]);
    setServiceSpecialties([]);
    setSelectedServiceSpecialty('');
    setAvailableSlots([]);

    if (!serviceId) return;

    const selected = services.find(item => String(item.id) === String(serviceId));
    if (!selected?.allow_doctor_choice) {
      toast.info('Dịch vụ này sẽ được tự động phân công bác sĩ.');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const response = await axios.get(`${API_URL}/services/${serviceId}/doctors`);
      const rawDoctors = response?.data?.success ? (response.data.doctors || []) : [];
      const normalized = normalizeUserList(Array.isArray(rawDoctors) ? rawDoctors : [], 'doctor');
      setServiceDoctors(normalized);

      const specMap = new Map();
      normalized.forEach((doctor) => {
        if (doctor.specialty?.id && doctor.specialty?.name) {
          specMap.set(doctor.specialty.id, { id: doctor.specialty.id, name: doctor.specialty.name });
        }
      });
      setServiceSpecialties(Array.from(specMap.values()));
    } catch (error) {
      console.error('[WalkInReceptionModal] load service doctors error', error);
      toast.error('Lỗi tải danh sách bác sĩ cho dịch vụ này.');
      setServiceDoctors([]);
      setServiceSpecialties([]);
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

  const handleServiceSpecialtyFilter = (specialtyId) => {
    const nextValue = selectedServiceSpecialty === specialtyId ? '' : specialtyId;
    setSelectedServiceSpecialty(nextValue);
    setServiceForm(prev => ({ ...prev, doctorId: '', date: '', time: '' }));
  };

  const handleServiceDoctorChange = (doctorId) => {
    setServiceForm(prev => ({ ...prev, doctorId, time: '' }));
  };

  const handleConsultationSpecialtyChange = async (specialtyId) => {
    setConsultationForm(prev => ({
      ...prev,
      specialtyId,
      doctorId: '',
      consultationPricingId: '',
      date: '',
      time: '',
    }));
    setConsultationPackages([]);
    setAvailableSlots([]);

    // Load doctors for this specialty
    if (specialtyId) {
      try {
        setLoading(prev => ({ ...prev, doctors: true }));
        const response = await userService.getDoctorsBySpecialty(specialtyId);
        const doctorData = response?.data?.data || [];
        const filtered = Array.isArray(doctorData) ? doctorData : [];
        // Store doctors specifically for consultation
        const normalized = filtered.map(d => ({
          id: d.user_id || d.id,
          userId: d.user_id || d.id,
          full_name: d.user?.full_name || d.full_name,
          fullName: d.user?.full_name || d.full_name || d.name,
          name: d.user?.full_name || d.full_name || d.name,
          avatar_url: d.user?.avatar_url || d.avatar_url,
          specialty: d.specialty || d.user?.roleData?.specialty || { id: specialtyId },
        }));
        setConsultationDoctors(normalized);
      } catch (error) {
        console.error('[WalkInReceptionModal] load consultation doctors error', error);
        setConsultationDoctors([]);
      } finally {
        setLoading(prev => ({ ...prev, doctors: false }));
      }
    }
  };

  const handleConsultationDoctorChange = (doctorId) => {
    setConsultationForm(prev => ({
      ...prev,
      doctorId,
      consultationPricingId: '',
      date: '',
      time: '',
    }));
  };

  const handleServiceDatePick = (date) => {
    setServiceForm(prev => ({ ...prev, date, time: '' }));
    setAvailableSlots([]);
  };

  const handleConsultationDatePick = (date) => {
    setConsultationForm(prev => ({ ...prev, date, time: '' }));
    setAvailableSlots([]);
  };

  const submitServiceWalkIn = async () => {
    if (!patient.name || !patient.phone || !serviceForm.serviceId || !serviceForm.date) {
      toast.error('Vui lòng điền đủ thông tin bắt buộc cho khám dịch vụ');
      return;
    }

    const selectedTime = serviceForm.time || (serviceForm.findSoonestSlot ? getSoonestAvailableTime(availableSlots, serviceForm.date) : '');
    if (!selectedTime) {
      toast.error('Vui lòng chọn giờ khám hoặc bật Khám ngay');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, submit: true }));
      const payload = {
        guest_name: patient.name,
        guest_email: patient.email,
        guest_phone: patient.phone,
        guest_dob: patient.dob,
        guest_gender: patient.gender,
        service_id: serviceForm.serviceId,
        doctor_id: serviceForm.doctorId || null,
        appointment_date: serviceForm.date,
        appointment_start_time: selectedTime,
        appointment_type: 'offline',
        reason: serviceForm.reason,
        payment_method: 'cash',
        findSoonestSlot: Boolean(serviceForm.findSoonestSlot || !serviceForm.time),
      };

      const response = await appointmentService.createAppointment(payload);
      if (response?.data?.success) {
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

    const selectedTime = consultationForm.time || (consultationForm.findSoonestSlot ? getSoonestAvailableTime(availableSlots, consultationForm.date) : '');
    if (!selectedTime) {
      toast.error('Vui lòng chọn giờ tư vấn hoặc bật Khám ngay');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, submit: true }));
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

  const renderSlotList = (isServiceTab) => {
    const currentForm = isServiceTab ? serviceForm : consultationForm;
    const groups = isServiceTab ? deduplicatedServiceSlots : groupedSlots;

    if (loading.slots) {
      return <div className="wrm-empty-state">Đang tải slot...</div>;
    }

    if (!availableSlots.length) {
      return <div className="wrm-empty-state">Chưa có slot trống cho cấu hình hiện tại.</div>;
    }

    return (
      <>
        {['morning', 'afternoon', 'evening'].map((period) => (
          groups[period]?.length > 0 && (
            <div key={period} className="wrm-slot-section">
              <div className="wrm-slot-section-label">
                {period === 'morning' ? <FaSun /> : period === 'afternoon' ? <FaCloudSun /> : <FaMoon />}
                {period === 'morning' ? 'Buổi sáng' : period === 'afternoon' ? 'Buổi chiều' : 'Buổi tối'}
              </div>
              <div className="wrm-slot-list">
                {groups[period].map((slot) => (
                  <button
                    key={slot.id ? `slot-${slot.id}` : `${period}-${slot.time}`}
                    type="button"
                    className={`wrm-slot-btn ${currentForm.time === slot.time ? 'active' : ''} ${!slot.isAvailable ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!slot.isAvailable) return;
                      if (isServiceTab) {
                        setServiceForm(prev => ({ ...prev, time: slot.time, findSoonestSlot: false }));
                      } else {
                        setConsultationForm(prev => ({ ...prev, time: slot.time, findSoonestSlot: false }));
                      }
                    }}
                    disabled={!slot.isAvailable}
                  >
                    <div className="wrm-slot-time">{slot.time?.slice(0, 5) || '--:--'}</div>
                    <div className="wrm-slot-label">{slot.reason || slot.label || (slot.isAvailable ? 'Slot trống' : 'Đã kín')}</div>
                  </button>
                ))}
              </div>
            </div>
          )
        ))}
      </>
    );
  };

  const renderPatientCard = () => (
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
  );

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
              <div className="wrm-grid">
                <div>
                  <div className="wrm-card">
                    <div className="wrm-card-title">Khám dịch vụ</div>
                    <div className="wrm-form-grid">
                      <div className="wrm-col-full">
                        <label>Dịch vụ *</label>
                        <div className="wrm-filter-toolbar">
                          <div className="wrm-search-box">
                            <FaSearch />
                            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm dịch vụ, mã dịch vụ..." />
                          </div>
                          <div className="wrm-category-row">
                            <button type="button" className={`wrm-chip ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>
                              <FaLayerGroup /> Tất cả
                            </button>
                            {serviceCategories.map(category => (
                              <button
                                key={category.id}
                                type="button"
                                className={`wrm-chip ${String(selectedCategory) === String(category.id) ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category.id)}
                              >
                                <FaLayerGroup /> {category.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <select
                          value={serviceForm.serviceId}
                          onChange={(e) => handleServiceChange(e.target.value)}
                          disabled={loading.init}
                        >
                          <option value="">-- Chọn dịch vụ --</option>
                          {filteredServices.length === 0 && <option value="" disabled>Không tìm thấy dịch vụ phù hợp</option>}
                          {filteredServices.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name} {service.price ? `(${Number(service.price).toLocaleString('vi-VN')} VNĐ)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {serviceForm.serviceId && serviceSpecialties.length > 0 && (
                        <div className="wrm-col-full">
                          <label>Lọc theo chuyên khoa</label>
                          <div className="wrm-specialty-list">
                            {serviceSpecialties.map(spec => (
                              <button
                                key={spec.id}
                                type="button"
                                className={`wrm-chip ${selectedServiceSpecialty === spec.id ? 'active' : ''}`}
                                onClick={() => handleServiceSpecialtyFilter(spec.id)}
                              >
                                {spec.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="wrm-col-full">
                        <label>Bác sĩ *</label>
                        <select
                          value={serviceForm.doctorId}
                          onChange={(e) => handleServiceDoctorChange(e.target.value)}
                          disabled={!serviceForm.serviceId || loading.doctors}
                        >
                          <option value="">-- Chọn bác sĩ --</option>
                          {loading.doctors && <option>Đang tải bác sĩ...</option>}
                          {serviceDoctors.map(doctor => (
                            <option key={doctor.id || doctor.userId} value={doctor.id || doctor.userId}>
                              BS. {doctor.full_name || doctor.fullName || doctor.name}{doctor.specialty?.name ? ` (${doctor.specialty.name})` : ''}
                            </option>
                          ))}
                        </select>
                        {!selectedService?.allow_doctor_choice && serviceForm.serviceId && (
                          <small className="wrm-info-text"><FaInfoCircle /> Dịch vụ này sẽ được tự động phân công bác sĩ tại quầy.</small>
                        )}
                      </div>

                      <div className="wrm-col-full">
                        <label>Ngày khám *</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {nextThreeDays.map(date => {
                            const iso = formatDateISO(date);
                            const active = serviceForm.date === iso;
                            return (
                              <button
                                key={iso}
                                type="button"
                                className={`wrm-chip ${active ? 'active' : ''}`}
                                onClick={() => handleServiceDatePick(iso)}
                              >
                                {date.toLocaleDateString('vi-VN', { weekday: 'short' })} {date.getDate()}/{date.getMonth() + 1}
                              </button>
                            );
                          })}
                          <input
                            type="date"
                            min={getToday()}
                            value={serviceForm.date}
                            onChange={(e) => handleServiceDatePick(e.target.value)}
                            style={{ minWidth: 160 }}
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
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <FaBolt /> {serviceForm.findSoonestSlot ? 'Đang bật Khám ngay' : 'Khám ngay'}
                        </button>
                      </div>

                      <div className="wrm-col-full">
                        <label>Lý do khám</label>
                        <textarea
                          rows={3}
                          value={serviceForm.reason}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Triệu chứng hoặc nhu cầu khám..."
                        />
                      </div>
                    </div>

                    <div className="wrm-note" style={{ marginTop: 12 }}>
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
                      {renderSlotList(true)}
                    </div>
                  </div>
                </div>

                <div>
                  {renderPatientCard()}
                </div>
              </div>
            ) : (
              <div className="wrm-grid">
                <div>
                  <div className="wrm-card">
                    <div className="wrm-card-title">Chi tiết tư vấn</div>
                    <div className="wrm-form-grid">
                      <div className="wrm-col-full">
                        <label>Chuyên khoa *</label>
                        <div className="wrm-filter-toolbar">
                          <div className="wrm-search-box">
                            <FaSearch />
                            <input
                              value={consultationSearchTerm}
                              onChange={(e) => setConsultationSearchTerm(e.target.value)}
                              placeholder="Tìm chuyên khoa, bác sĩ, gói tư vấn..."
                            />
                          </div>
                          <div className="wrm-specialty-list">
                            {consultationSpecialties.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                className={`wrm-chip ${consultationForm.specialtyId === item.id ? 'active' : ''}`}
                                onClick={() => handleConsultationSpecialtyChange(item.id)}
                              >
                                <FaLayerGroup /> {item.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="wrm-col-full">
                        <label>Bác sĩ *</label>
                        <select
                          value={consultationForm.doctorId}
                          onChange={(e) => handleConsultationDoctorChange(e.target.value)}
                          disabled={!consultationForm.specialtyId || loading.doctors}
                        >
                          <option value="">-- Chọn bác sĩ --</option>
                          {loading.doctors && <option>Đang tải bác sĩ...</option>}
                          {doctorsForConsultation.map(item => (
                            <option key={item.id || item.userId} value={item.id || item.userId}>
                              BS. {item.full_name || item.fullName || item.name}{item.specialty?.name ? ` (${item.specialty.name})` : ''}
                            </option>
                          ))}
                        </select>
                        {selectedConsultationDoctor && (
                          <button
                            type="button"
                            className="wrm-doctor-card"
                            style={{ marginTop: 10 }}
                          >
                            <img
                              className="wrm-doctor-avatar"
                              src={selectedConsultationDoctor.avatar_url ? (selectedConsultationDoctor.avatar_url.startsWith('http') ? selectedConsultationDoctor.avatar_url : `${process.env.REACT_APP_UPLOAD_URL || 'http://localhost:3001'}${selectedConsultationDoctor.avatar_url.startsWith('/') ? '' : '/'}${selectedConsultationDoctor.avatar_url}`) : require('../../assets/images/avatar-default.jpg')}
                              alt={selectedConsultationDoctor.full_name || selectedConsultationDoctor.fullName || selectedConsultationDoctor.name}
                              onError={(e) => { e.target.onerror = null; e.target.src = require('../../assets/images/avatar-default.jpg'); }}
                            />
                            <div className="wrm-doctor-info">
                              <span className="wrm-doctor-name">BS. {selectedConsultationDoctor.full_name || selectedConsultationDoctor.fullName || selectedConsultationDoctor.name}</span>
                              <span className="wrm-doctor-specialty">{selectedConsultationDoctor.specialty?.name || 'Chưa cập nhật chuyên khoa'}</span>
                            </div>
                            <span className="wrm-doctor-cta">Xem hồ sơ <FaChevronRight /></span>
                          </button>
                        )}
                      </div>

                      <div className="wrm-col-full">
                        <label>Hình thức tư vấn *</label>
                        <div className="wrm-type-tabs">
                          <button
                            type="button"
                            className={`wrm-type-btn ${consultationForm.filterType === 'chat' ? 'active' : ''}`}
                            onClick={() => setConsultationForm(prev => ({ ...prev, filterType: 'chat', consultationPricingId: '', time: '' }))}
                          >
                            <FaComments /> Chat
                          </button>
                          <button
                            type="button"
                            className={`wrm-type-btn ${consultationForm.filterType === 'video' ? 'active' : ''}`}
                            onClick={() => setConsultationForm(prev => ({ ...prev, filterType: 'video', consultationPricingId: '', time: '' }))}
                          >
                            <FaVideo /> Video Call
                          </button>
                        </div>
                      </div>

                      <div className="wrm-col-full">
                        <label>Gói dịch vụ *</label>
                        <div className="wrm-pkg-list">
                          {filteredConsultationPackages.length === 0 ? (
                            <div className="wrm-empty-state">
                              {consultationSearchTerm.trim() ? 'Không tìm thấy gói dịch vụ phù hợp.' : 'Bác sĩ chưa thiết lập gói dịch vụ này.'}
                            </div>
                          ) : filteredConsultationPackages.map(pkg => {
                            const selected = String(consultationForm.consultationPricingId) === String(pkg.id);
                            return (
                              <label key={pkg.id} className={`wrm-pkg-item ${selected ? 'selected' : ''}`}>
                                <input
                                  type="radio"
                                  name="consultationPackage"
                                  checked={selected}
                                  onChange={() => setConsultationForm(prev => ({ ...prev, consultationPricingId: pkg.id, date: '', time: '' }))}
                                />
                                <div className="wrm-pkg-info">
                                  <span className="wrm-pkg-name">{pkg.package_name || pkg.name}</span>
                                  <span className="wrm-pkg-duration">{pkg.duration_minutes || pkg.duration || 0} phút</span>
                                </div>
                                <div className="wrm-pkg-price">{pkg.price ? Number(pkg.price).toLocaleString('vi-VN') : '0'} VNĐ</div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="wrm-col-full">
                        <label>Ngày *</label>
                        <div className="wrm-date-tabs">
                          {nextThreeDays.map(date => {
                            const iso = formatDateISO(date);
                            const active = consultationForm.date === iso;
                            return (
                              <button
                                key={iso}
                                type="button"
                                className={`wrm-date-btn ${active ? 'active' : ''}`}
                                onClick={() => handleConsultationDatePick(iso)}
                              >
                                <span className="wrm-date-btn-day">{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                <strong className="wrm-date-btn-num">{date.getDate()}/{date.getMonth() + 1}</strong>
                              </button>
                            );
                          })}
                          <input type="date" min={getToday()} value={consultationForm.date} onChange={(e) => handleConsultationDatePick(e.target.value)} />
                        </div>
                      </div>

                      <div>
                        <label>Giờ *</label>
                        <input value={consultationForm.time} placeholder={consultationForm.findSoonestSlot ? 'Khám ngay - hệ thống tự chọn giờ sớm nhất' : 'Chọn từ slot bên dưới'} readOnly />
                      </div>
                      <div>
                        <label>Mở khám ngay</label>
                        <button
                          type="button"
                          className="wrm-btn wrm-btn-outline"
                          onClick={() => setConsultationForm(prev => ({
                            ...prev,
                            findSoonestSlot: !prev.findSoonestSlot,
                            time: !prev.findSoonestSlot ? '' : prev.time,
                          }))}
                          disabled={loading.slots}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <FaBolt /> {consultationForm.findSoonestSlot ? 'Đang bật Khám ngay' : 'Khám ngay'}
                        </button>
                      </div>

                      <div className="wrm-col-full">
                        <label>Lý do tư vấn *</label>
                        <textarea
                          rows={3}
                          value={consultationForm.chiefComplaint}
                          onChange={(e) => setConsultationForm(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                          placeholder="Mô tả nhu cầu tư vấn..."
                        />
                      </div>
                    </div>

                    <div className="wrm-note" style={{ marginTop: 12 }}>
                      <FaInfoCircle />
                      <span>Chọn chuyên khoa, bác sĩ, gói tư vấn và thời gian để hệ thống giữ đúng lịch như form tư vấn gốc.</span>
                    </div>

                    <div className="wrm-slot-area">
                      <div className="wrm-slot-title">Slot trống</div>
                      {renderSlotList(false)}
                    </div>
                  </div>
                </div>

                <div>
                  {renderPatientCard()}
                  <div className="wrm-card" style={{ marginTop: 16 }}>
                    <div className="wrm-card-title">Lưu ý</div>
                    <div className="wrm-empty-state" style={{ background: '#f8fafc' }}>
                      Chọn chuyên khoa trước, sau đó chọn bác sĩ, gói tư vấn và khung giờ.
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                {loading.submit ? <FaSpinner className="abp-spin" /> : <FaUserPlus />}
                {loading.submit ? 'Đang lưu...' : 'Tạo lịch tại quầy'}
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

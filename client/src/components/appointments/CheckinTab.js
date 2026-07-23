import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import {
  FaTicketAlt,
  FaUserPlus,
  FaCheckCircle,
  FaTrash,
  FaStethoscope,
  FaCalendarAlt,
  FaSearch,
  FaUndo,
  FaPhone,
  FaFileAlt,
  FaInfoCircle,
  FaCreditCard,
  FaSpinner,
  FaBullhorn,
  FaPrint,
  FaTimes,
  FaHistory,
  FaMoneyBillWave,
  FaListOl,
  FaVolumeUp,
  FaVolumeMute,
} from 'react-icons/fa';
import appointmentService from '../../services/appointmentService';
import specialtyService from '../../services/specialtyService';
import WalkInReceptionModal from './WalkInReceptionModal';
import { useCallQueue } from '../../contexts/CallQueueContext';
import './CheckinTab.css';

const todayISO = () => new Date().toISOString().split('T')[0];

const CheckinTab = () => {
  const [appointments, setAppointments] = useState([]);
  const [specialties, setSpecialties] = useState({});
  const [filter, setFilter] = useState({
    date: todayISO(),
    keyword: '',
    queueScope: 'all',
    serviceKey: 'all',
    specialtyKey: 'all',
    doctorKey: 'all',
  });
  const [loading, setLoading] = React.useState(false);
  const { user } = useAuth();
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const { calling, setCalling, calledTicket, setCalledTicket } = useCallQueue();
  const [lastInProgressCode, setLastInProgressCode] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [statusView, setStatusView] = useState('all');
  const [absentCountdown, setAbsentCountdown] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true); // Audio toggle for TTS
  const [showCounterPaymentModal, setShowCounterPaymentModal] = useState(false);
  const [counterPaymentTarget, setCounterPaymentTarget] = useState(null);
  const [submittingCounterPayment, setSubmittingCounterPayment] = useState(false);
  const [selectedQueueAppointment, setSelectedQueueAppointment] = useState(null);
  const [showCallExpiredModal, setShowCallExpiredModal] = useState(false); // Popup when call timer expires
  const [counterPaymentForm, setCounterPaymentForm] = useState({
    payment_method: 'cash',
    amount_due: 0,
    amount_received: 0,
    change: 0
  });

  useEffect(() => {
    loadAppointments();
    loadSpecialties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.date]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadAppointments({ silent: true });
      loadCallLogs({ silent: true });
    }, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.date, filter.keyword]);

  useEffect(() => {
    loadCallLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.date]);

  const normalizeAppointments = (rows = []) => {
    return (Array.isArray(rows) ? rows : []).filter((item) => {
      const sameDate = String(item.appointment_date || '').slice(0, 10) === filter.date;
      // Giữ cả chưa thanh toán và đã hoàn thành để theo dõi đầy đủ trong ngày.
      const isTrackableStatus = ['confirmed', 'in_progress', 'completed', 'pending'].includes(item.status);
      const isTrackablePayment = ['unpaid', 'paid_online', 'paid_at_clinic', 'not_required'].includes(item.payment_status);
      return sameDate && isTrackableStatus && isTrackablePayment;
    });
  };

  const formatCountdown = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatCurrency = (value) => {
    try {
      const num = Number(value) || 0;
      return new Intl.NumberFormat('vi-VN').format(num);
    } catch (e) {
      return String(value);
    }
  };

  const parseNumber = (str) => {
    if (str === null || str === undefined) return 0;
    return Number(String(str).replace(/[^0-9.-]+/g, '')) || 0;
  };

  const loadSpecialties = async () => {
    try {
      const res = await specialtyService.getPublicSpecialties();
      if (res?.data?.success) {
        const specialtyList = Array.isArray(res.data.specialties)
          ? res.data.specialties
          : (Array.isArray(res.data.data) ? res.data.data : []);
        const map = {};
        specialtyList.forEach(spec => {
          if (spec?.id && spec?.name) {
            map[String(spec.id)] = spec.name;
          }
        });
        setSpecialties(map);
      } else {
        setSpecialties({});
      }
    } catch (error) {
      console.error('[CheckinTab] loadSpecialties error', error);
      setSpecialties({});
    }
  };

  const loadAppointments = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      console.log('[CheckinTab] loadAppointments start', filter.date);

      const response = await appointmentService.getAllAppointments({
        date_from: filter.date,
        date_to: filter.date,
        limit: 200,
      });

      if (!response?.data?.success) {
        toast.error('Không tải được danh sách lịch hẹn hôm nay');
        setAppointments([]);
        return;
      }

      let rows = normalizeAppointments(response.data.data || []);


      if (filter.keyword.trim()) {
        const keyword = filter.keyword.trim().toLowerCase();
        rows = rows.filter((appt) => {
          const name = (appt.Patient?.User?.full_name || appt.guest_name || '').toLowerCase();
          const code = String(appt.code || '').toLowerCase();
          const phone = String(appt.Patient?.User?.phone || appt.guest_phone || '');
          const service = String(appt.Service?.name || '').toLowerCase();
          return name.includes(keyword) || code.includes(keyword) || phone.includes(keyword) || service.includes(keyword);
        });
      }

      rows.sort((a, b) => {
        const statusRank = (item) => {
          if (item.status === 'in_progress') return 0;
          if (item.status === 'confirmed') return 1;
          return 2;
        };

        const statusDiff = statusRank(a) - statusRank(b);
        if (statusDiff !== 0) return statusDiff;

        const aIsU = String(a.display_queue || '').startsWith('U');
        const bIsU = String(b.display_queue || '').startsWith('U');
        if (aIsU !== bIsU) return aIsU ? -1 : 1;

        const aNum = parseInt(String(a.display_queue || a.queue_number || '0').replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(String(b.display_queue || b.queue_number || '0').replace(/\D/g, ''), 10) || 0;
        return aNum - bNum;
      });

      console.log('[CheckinTab] loaded appointments', rows.length);

      const currentInProgress = rows.find(item => item.status === 'in_progress')?.code || null;
      if (lastInProgressCode && !currentInProgress && rows.length > 0 && !silent) {
        toast.info(`Ca trước đã hoàn thành. Mời gọi số tiếp theo: ${rows[0].display_queue || rows[0].queue_number || rows[0].code}`);
      }
      setLastInProgressCode(currentInProgress);

      setAppointments(rows);
    } catch (error) {
      console.error('[CheckinTab] loadAppointments error', error);
      if (!silent) toast.error('Lỗi tải danh sách chờ khám');
      setAppointments([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getPatientName = (appt) => appt?.guest_name || appt?.Patient?.User?.full_name || 'N/A';
  const getPatientPhone = (appt) => appt?.guest_phone || appt?.Patient?.User?.phone || '--';
  const getPatientEmail = (appt) => appt?.Patient?.User?.email || '--';
  const getDoctorName = (appt) => appt?.Doctor?.user?.full_name || appt?.Doctor?.full_name || appt?.doctor_name || '--';
  const getDoctorPhone = (appt) => appt?.Doctor?.user?.phone || appt?.Doctor?.phone || '--';
  const getDoctorEmail = (appt) => appt?.Doctor?.user?.email || appt?.Doctor?.email || '--';
  const getDoctorKey = (appt) => String(appt?.Doctor?.user_id || appt?.doctor_id || getDoctorName(appt));
  
  const getSpecialtyName = (appt) => {
    const specialtyId = appt?.Doctor?.specialty_id || appt?.specialty_id;
    if (specialtyId && specialties[String(specialtyId)]) {
      return specialties[String(specialtyId)];
    }

    const doctorSpecialization = Array.isArray(appt?.Doctor?.specializations)
      ? appt.Doctor.specializations[0]
      : null;

    return appt?.Doctor?.specialty?.name
      || appt?.Doctor?.Specialty?.name
      || appt?.Doctor?.specialty_name
      || appt?.specialty_name
      || doctorSpecialization
      || '--';
  };
  const getSpecialtyKey = (appt) => String(appt?.Doctor?.specialty_id || appt?.specialty_id || getSpecialtyName(appt));
  const getServiceKey = (appt) => String(appt?.Service?.id || appt?.service_id || appt?.Service?.code || appt?.Service?.name || '--');
  const hasQueueNumber = (appt) => Boolean(appt?.display_queue || appt?.queue_number);
  const isCheckedIn = (appt) => ['in_progress'].includes(appt?.status) || Boolean(appt?.checked_in_at);
  const isCompleted = (appt) => String(appt?.status || '') === 'completed';
  const isPending = (appt) => String(appt?.status || '') === 'pending';
  const isUnpaid = (appt) => String(appt?.payment_status || '') === 'unpaid';
  const getServiceTag = (appt) => {
    const code = appt?.Service?.code || '';
    if (code) return code;
    const name = String(appt?.Service?.name || '').trim();
    if (!name) return 'DV';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase())
      .join('') || 'DV';
  };
  const getQueueScopeLabel = (appt) => {
    const queueNum = appt?.display_queue || appt?.queue_number || '--';
    const serviceTag = getServiceTag(appt);
    const dateLabel = appt?.appointment_date
      ? new Date(appt.appointment_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      : '--';
    return `${dateLabel} · ${serviceTag} · ${queueNum}`;
  };

  const serviceOptions = useMemo(() => {
    const map = {};
    appointments.forEach((appt) => {
      const key = getServiceKey(appt);
      const label = appt?.Service?.name || '--';
      if (key && !map[key]) map[key] = label;
    });
    return { all: '-- Tất cả dịch vụ --', ...map };
  }, [appointments]);

  const specialtyOptions = useMemo(() => {
    const map = {};
    appointments.forEach((appt) => {
      const key = getSpecialtyKey(appt);
      const label = getSpecialtyName(appt);
      if (key && label !== '--' && !map[key]) map[key] = label;
    });
    return { all: '-- Tất cả chuyên khoa --', ...map };
  }, [appointments, specialties]);

  const doctorOptions = useMemo(() => {
    const map = {};
    appointments.forEach((appt) => {
      const key = getDoctorKey(appt);
      const label = getDoctorName(appt);
      if (key && label !== '--' && !map[key]) map[key] = label;
    });
    return { all: '-- Tất cả bác sĩ --', ...map };
  }, [appointments]);

  const statusStats = useMemo(() => {
    const stats = {
      all: appointments.length,
      pending: 0,
      unpaid: 0,
      ready_checkin: 0,
      waiting_call: 0,
      completed: 0
    };

    appointments.forEach((appt) => {
      if (String(appt.status) === 'pending') stats.pending += 1;
      if (isUnpaid(appt)) stats.unpaid += 1;
      if (!isPending(appt) && !isCompleted(appt) && !isUnpaid(appt) && !isCheckedIn(appt)) stats.ready_checkin += 1;
      if (!isCompleted(appt) && isCheckedIn(appt)) stats.waiting_call += 1;
      if (isCompleted(appt)) stats.completed += 1;
    });

    return stats;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let rows = [...appointments];

    if (filter.keyword.trim()) {
      const keyword = filter.keyword.trim().toLowerCase();
      rows = rows.filter((appt) => {
        const name = getPatientName(appt).toLowerCase();
        const code = String(appt.code || '').toLowerCase();
        const phone = String(getPatientPhone(appt));
        const service = String(appt.Service?.name || '').toLowerCase();
        const doctor = String(getDoctorName(appt)).toLowerCase();
        const specialty = String(getSpecialtyName(appt)).toLowerCase();
        return name.includes(keyword)
          || code.includes(keyword)
          || phone.includes(keyword)
          || service.includes(keyword)
          || doctor.includes(keyword)
          || specialty.includes(keyword);
      });
    }

    if (filter.queueScope === 'service' && filter.serviceKey !== 'all') {
      rows = rows.filter(appt => getServiceKey(appt) === filter.serviceKey);
    }
    if (filter.queueScope === 'specialty' && filter.specialtyKey !== 'all') {
      rows = rows.filter(appt => getSpecialtyKey(appt) === filter.specialtyKey);
    }
    if (filter.queueScope === 'doctor' && filter.doctorKey !== 'all') {
      rows = rows.filter(appt => getDoctorKey(appt) === filter.doctorKey);
    }

    // Lọc nhanh theo thẻ thống kê trạng thái.
    if (statusView === 'pending') {
      rows = rows.filter((appt) => String(appt.status) === 'pending');
    } else if (statusView === 'unpaid') {
      rows = rows.filter((appt) => isUnpaid(appt));
    } else if (statusView === 'ready_checkin') {
      rows = rows.filter((appt) => !isPending(appt) && !isCompleted(appt) && !isUnpaid(appt) && !isCheckedIn(appt));
    } else if (statusView === 'waiting_call') {
      rows = rows.filter((appt) => !isCompleted(appt) && isCheckedIn(appt));
    } else if (statusView === 'completed') {
      rows = rows.filter((appt) => isCompleted(appt));
    }

    // Ưu tiên hiển thị: chưa check-in -> chờ gọi -> hoàn thành (đẩy xuống cuối).
    rows.sort((a, b) => {
      const groupRank = (appt) => {
        if (isCompleted(appt)) return 2;
        if (isCheckedIn(appt)) return 1;
        return 0;
      };

      const rankDiff = groupRank(a) - groupRank(b);
      if (rankDiff !== 0) return rankDiff;

      const aNum = parseInt(String(a.display_queue || a.queue_number || '0').replace(/\D/g, ''), 10) || 0;
      const bNum = parseInt(String(b.display_queue || b.queue_number || '0').replace(/\D/g, ''), 10) || 0;
      if (aNum !== bNum) return aNum - bNum;

      const aTime = String(a.appointment_start_time || '99:99:99');
      const bTime = String(b.appointment_start_time || '99:99:99');
      return aTime.localeCompare(bTime);
    });

    return rows;
  }, [appointments, filter, statusView]);

  const queueReadyAppointments = useMemo(
    () => filteredAppointments.filter((appt) => hasQueueNumber(appt) && isCheckedIn(appt) && !isCompleted(appt)),
    [filteredAppointments]
  );

  const activeQueueAppointment = useMemo(() => {
    if (selectedQueueAppointment) {
      const selectedKey = String(selectedQueueAppointment.code || selectedQueueAppointment.id);
      const matched = filteredAppointments.find((appt) => String(appt.code || appt.id) === selectedKey);
      if (matched) return matched;
      return selectedQueueAppointment;
    }

    if (calledTicket?.called) {
      const calledKey = String(calledTicket.called.code || calledTicket.called.id);
      const matched = filteredAppointments.find((appt) => String(appt.code || appt.id) === calledKey);
      if (matched) return matched;
      return calledTicket.called;
    }

    return queueReadyAppointments[0] || null;
  }, [calledTicket?.called, filteredAppointments, queueReadyAppointments, selectedQueueAppointment]);

  const isActiveQueueAppointment = (appt) => {
    if (!appt || !activeQueueAppointment) return false;
    return String(activeQueueAppointment.code || activeQueueAppointment.id) === String(appt.code || appt.id);
  };

  const activeQueueIsCalled = Boolean(calledTicket?.called) && Boolean(activeQueueAppointment) && String(calledTicket.called.code || calledTicket.called.id) === String(activeQueueAppointment.code || activeQueueAppointment.id);
  const activeQueueIsInProgress = Boolean(activeQueueAppointment) && String(activeQueueAppointment.status) === 'in_progress';
  const activeQueueCanCall = Boolean(activeQueueAppointment)
    && hasQueueNumber(activeQueueAppointment)
    && String(activeQueueAppointment.status) === 'confirmed'
    && !isCompleted(activeQueueAppointment);
  const activeQueueStatusLabel = activeQueueIsInProgress
    ? 'ĐANG KHÁM'
    : (activeQueueIsCalled ? 'ĐANG GỌI' : 'ĐÃ CHỌN GỌI');

  const playCallSoundAndSpeech = (queueNumber, patientName) => {
    // Guard: Only play sound and speech if audio is enabled
    if (!audioEnabled) {
      return;
    }

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.55);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.55);
    } catch (error) {
      console.warn('[CheckinTab] cannot play beep sound', error);
    }

    if ('speechSynthesis' in window && queueNumber) {
      const msg = new SpeechSynthesisUtterance(`Kính mời số ${queueNumber}, mời bệnh nhân ${patientName || ''} vào phòng khám.`);
      msg.lang = 'vi-VN';
      msg.rate = 0.95;
      msg.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(msg);
    }
  };

  const loadCallLogs = async ({ silent = false } = {}) => {
    try {
      const res = await appointmentService.getCallLogs(filter.date);
      if (res?.data?.success) {
        setCallLogs(Array.isArray(res.data.data) ? res.data.data : []);
      } else if (!silent) {
        toast.error('Không tải được nhật ký gọi số');
      }
    } catch (error) {
      if (!silent) {
        toast.error('Lỗi tải nhật ký gọi số');
      }
    }
  };

  const printTicket = (appt) => {
    if (!appt) return;
    const queueNum = appt.display_queue || appt.queue_number || '--';
    const printWindow = window.open('', '_blank', 'width=420,height=640');
    if (!printWindow) return;

    const html = `
      <html>
      <head>
        <title>Phieu goi so ${queueNum}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 16px; }
          .ticket { border: 2px dashed #111; padding: 16px; }
          .clinic { font-size: 14px; color: #444; text-align: center; }
          .queue { font-size: 56px; font-weight: 800; text-align: center; margin: 16px 0; }
          .line { margin: 8px 0; font-size: 14px; }
          .muted { color: #666; font-size: 12px; text-align: center; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="clinic">PHONG KHAM - PHIEU GOI SO</div>
          <div class="queue">${queueNum}</div>
          <div class="line"><strong>Ma lich:</strong> ${appt.code || '--'}</div>
          <div class="line"><strong>Benh nhan:</strong> ${getPatientName(appt)}</div>
          <div class="line"><strong>Dich vu:</strong> ${appt.Service?.name || '--'}</div>
          <div class="line"><strong>Ngay/ma:</strong> ${getQueueScopeLabel(appt)}</div>
          <div class="line"><strong>Gio:</strong> ${(appt.appointment_start_time || '').slice(0, 5)}</div>
          <div class="line"><strong>Ngay:</strong> ${new Date(appt.appointment_date).toLocaleDateString('vi-VN')}</div>
          <div class="muted">Vui long theo doi man hinh goi so</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const printBill = (appt, amount, received, change) => {
    if (!appt) return;
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;
    const html = `
      <html>
      <head>
        <title>Hoa don ${appt.code}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #111 }
          .inv { max-width: 520px; margin: 0 auto; }
          .h { text-align:center; font-weight:700; margin-bottom:12px }
          .row { display:flex; justify-content:space-between; margin:6px 0 }
          .total { font-size:18px; font-weight:800 }
          .muted { color:#666; font-size:12px }
        </style>
      </head>
      <body>
        <div class="inv">
          <div class="h">PHÒNG KHÁM - BIÊN NHẬN THANH TOÁN</div>
          <div class="row"><div>Mã lịch:</div><div>${appt.code}</div></div>
          <div class="row"><div>Bệnh nhân:</div><div>${getPatientName(appt)}</div></div>
          <div class="row"><div>Dịch vụ:</div><div>${appt.Service?.name || '--'}</div></div>
          <div class="row"><div>Ngày:</div><div>${new Date(appt.appointment_date).toLocaleDateString('vi-VN')}</div></div>
          <div class="row"><div>Giờ:</div><div>${(appt.appointment_start_time||'').slice(0,5)}</div></div>
          <hr />
          <div class="row"><div>Tổng cần thu:</div><div class="total">${formatCurrency(amount)}</div></div>
          <div class="row"><div>Khách đưa:</div><div>${formatCurrency(received)}</div></div>
          <div class="row"><div>Tiền trả lại:</div><div>${formatCurrency(change)}</div></div>
          <hr />
          <div class="muted">Cảm ơn quý khách. Vui lòng giữ biên nhận này.</div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleCallNumber = async (appt) => {
    if (!appt?.code) return;
    if (!hasQueueNumber(appt)) {
      toast.warning('Lịch hẹn này chưa có STT khám. Vui lòng cấp số/check-in trước khi gọi.');
      return;
    }
    try {
      setCalling(true);
      const res = await appointmentService.callQueueNumber(appt.code);
      if (res?.data?.success) {
        const called = res.data.data?.called || appt;
        const next = res.data.data?.next || null;
        setCalledTicket({ called, next, calledAt: new Date().toISOString() });
        setSelectedQueueAppointment(called);
        playCallSoundAndSpeech(called.display_queue || called.queue_number, getPatientName(called));
        toast.success(res.data.message || `Đang gọi số ${called.display_queue || called.queue_number}`);
        await loadAppointments({ silent: true });
        await loadCallLogs({ silent: true });
      } else {
        toast.error(res?.data?.message || 'Không thể gọi số');
      }
    } catch (error) {
      console.error('[CheckinTab] handleCallNumber error', error);
      toast.error(error.response?.data?.message || 'Lỗi khi gọi số khám');
    } finally {
      setCalling(false);
    }
  };

  const startAbsentCountdown = (seconds = 300) => {
    setAbsentCountdown(seconds);
  };

  const handleSelectQueueAppointment = (appt) => {
    if (!appt) return;
    setSelectedQueueAppointment(appt);
  };

  useEffect(() => {
    if (!calledTicket?.called) {
      setAbsentCountdown(0);
      return;
    }

    // start default 5 minutes countdown when a ticket is called
    startAbsentCountdown(300);
    const timer = setInterval(() => {
      setAbsentCountdown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calledTicket?.called]);

  useEffect(() => {
    // when countdown reaches zero and there is a called ticket, show expiry popup instead of auto-skip
    if (calledTicket?.called && absentCountdown === 0) {
      setShowCallExpiredModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absentCountdown]);

  useEffect(() => {
    if (!calledTicket?.called?.code) {
      return undefined;
    }

    let cancelled = false;
    const syncCalledTicket = async () => {
      try {
        const res = await appointmentService.getAppointmentByCode(calledTicket.called.code);
        if (cancelled || !res?.data?.success) return;

        const freshAppointment = res.data.data;
        if (['in_progress', 'completed', 'cancelled'].includes(freshAppointment?.status)) {
          setAbsentCountdown(0);
          setCalledTicket(null);
          setSelectedQueueAppointment(freshAppointment || null);
          await loadAppointments({ silent: true });
          await loadCallLogs({ silent: true });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[CheckinTab] syncCalledTicket error', error);
        }
      }
    };

    syncCalledTicket();
    const timer = setInterval(syncCalledTicket, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calledTicket?.called?.code]);

  const markPatientAbsent = async (reason = 'Vắng mặt tại quầy') => {
    if (!calledTicket?.called) return;
    try {
      setCalling(true);
      const appt = calledTicket.called;
      await appointmentService.markNoShow(appt.id || appt.code, reason);
      toast.success('Đã đánh dấu vắng mặt');
      await loadAppointments({ silent: true });
      await loadCallLogs({ silent: true });
      setCalledTicket(null);
      // call next
      if (queueReadyAppointments && queueReadyAppointments.length > 0) {
        await handleCallNumber(queueReadyAppointments[0]);
      }
    } catch (error) {
      console.error('[CheckinTab] markPatientAbsent error', error);
      toast.error('Lỗi khi đánh dấu vắng mặt');
    } finally {
      setCalling(false);
    }
  };

  const handleMarkEntered = async () => {
    if (!calledTicket?.called) return;
    const appt = calledTicket.called;
    if (appt.status === 'in_progress') {
      toast.info('Bệnh nhân đã vào khám rồi');
      return;
    }
    try {
      setCalling(true);
      await appointmentService.updateAppointmentDetails(appt.code, { status: 'in_progress' });
      toast.success('Đã đánh dấu bệnh nhân vào khám');
      await loadAppointments({ silent: true });
      // Keep the panel open so doctor can mark absent or print ticket if needed
    } catch (error) {
      console.error('[CheckinTab] handleMarkEntered error', error);
      toast.error(error.response?.data?.message || 'Lỗi khi đánh dấu vào khám');
    } finally {
      setCalling(false);
    }
  };

  const handleCallAgainFromExpired = async () => {
    if (!calledTicket?.called) return;
    try {
      setShowCallExpiredModal(false);
      // Reset the countdown and call again
      setAbsentCountdown(300); // Reset to 5 minutes
      playCallSoundAndSpeech(calledTicket.called.display_queue || calledTicket.called.queue_number, getPatientName(calledTicket.called));
      toast.info('Đang gọi lại...');
    } catch (error) {
      console.error('[CheckinTab] handleCallAgainFromExpired error', error);
      toast.error('Lỗi khi gọi lại');
    }
  };

  const handleCallAgain = (appt) => {
    if (!appt) return;
    (async () => {
      try {
        setCalling(true);
        const res = await appointmentService.callAgain(appt.code);
        if (res?.data?.success) {
          // play audio locally as well
          playCallSoundAndSpeech(appt.display_queue || appt.queue_number, getPatientName(appt));
          setAbsentCountdown(300);
          await loadCallLogs({ silent: true });
          toast.info(res.data.message || 'Đang gọi lại...');
        } else {
          toast.error(res?.data?.message || 'Không thể gọi lại');
        }
      } catch (err) {
        console.error('[CheckinTab] handleCallAgain error', err);
        toast.error(err.response?.data?.message || 'Không thể gọi lại');
      } finally {
        setCalling(false);
      }
    })();
  };

  const handleMarkAbsentFromExpired = async () => {
    if (!calledTicket?.called) return;
    try {
      setShowCallExpiredModal(false);
      const appt = calledTicket.called;
      await appointmentService.markNoShow(appt.id || appt.code, 'Vắng mặt - Hết thời gian chờ');
      toast.success('Đã đánh dấu vắng mặt');
      await loadAppointments({ silent: true });
      await loadCallLogs({ silent: true });
      setCalledTicket(null);
      // Call next if exists
      if (queueReadyAppointments && queueReadyAppointments.length > 0) {
        await handleCallNumber(queueReadyAppointments[0]);
      }
    } catch (error) {
      console.error('[CheckinTab] handleMarkAbsentFromExpired error', error);
      toast.error('Lỗi khi đánh dấu vắng mặt');
    }
  };

  const openCounterPaymentModal = (appt) => {
    const servicePrice = Number(appt?.Service?.price || 0);
    console.log('[CheckinTab] Open counter payment', { code: appt?.code, servicePrice });
    setCounterPaymentTarget(appt);
    setCounterPaymentForm({
      payment_method: 'cash',
      amount_due: servicePrice,
      amount_received: servicePrice,
      change: 0
    });
    setShowCounterPaymentModal(true);
  };

  const handleCounterPaymentSubmit = async () => {
    if (!counterPaymentTarget?.code) return;
    const amount = Number(counterPaymentForm.amount_due || 0);
    const isCash = counterPaymentForm.payment_method === 'cash';
    const received = isCash ? Number(counterPaymentForm.amount_received || 0) : amount;
    if (amount < 0 || received < 0) {
      toast.warning('Số tiền không hợp lệ');
      return;
    }

    try {
      setSubmittingCounterPayment(true);
      console.log('[CheckinTab] Counter payment submit', {
        code: counterPaymentTarget.code,
        payment_method: counterPaymentForm.payment_method,
        amount,
        amount_received: received,
        paid_at: new Date().toISOString()
      });

      const paymentMethod = isCash ? 'cash' : 'bank_transfer';
      const paymentStatus = isCash ? 'paid_at_clinic' : 'paid_online';

      const res = await appointmentService.updatePaymentInfo(counterPaymentTarget.code, {
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount,
        paid_at: new Date().toISOString()
      });

      if (res?.data?.success) {
        toast.success('Đã cập nhật thanh toán tại quầy');
        setShowCounterPaymentModal(false);
        setCounterPaymentTarget(null);
        await loadAppointments();
      } else {
        toast.error(res?.data?.message || 'Không thể cập nhật thanh toán');
      }
    } catch (error) {
      console.error('[CheckinTab] handleCounterPaymentSubmit error', error);
      toast.error(error.response?.data?.message || 'Lỗi cập nhật thanh toán tại quầy');
    } finally {
      setSubmittingCounterPayment(false);
    }
  };

  const handleCheckIn = async (appt) => {
    try {
      console.log('[CheckinTab] checkIn start', appt.code, appt.display_queue || appt.queue_number);
      
      // ========== [NEW] CHECK PAYMENT STATUS ==========
      // Block check-in if payment not completed
      if (appt.payment_status === 'unpaid' && appt.payment_method !== 'none') {
        toast.error(`⚠️ Không thể check-in: ${appt.code} chưa thanh toán. Vui lòng hoàn tất thanh toán trước!`);
        setCounterPaymentTarget(appt);
        setShowCounterPaymentModal(true);
        return;
      }
      
      // Check-in: Cấp số thứ tự (assign queue number)
      // Note: Backend automatically sets status to in_progress, so we revert it to confirmed
      // The status should only change to in_progress when doctor calls "Đã vào" (handleMarkEntered)
      const res = await appointmentService.checkIn(appt.code, 'clinical');
      if (res?.data?.success) {
        toast.success(`Đã check-in và cấp STT cho ${appt.code}`);
        
        // WORKAROUND: Backend sets status to in_progress during checkIn, but we need to keep it as 'confirmed'
        // until the doctor actually calls the patient (handleMarkEntered), so revert status here
        try {
          await appointmentService.updateAppointmentDetails(appt.code, { status: 'confirmed' });
          console.log('[CheckinTab] Status reverted to confirmed after check-in');
        } catch (revertError) {
          console.warn('[CheckinTab] Could not revert status, continuing anyway:', revertError);
        }
        
        await loadAppointments();
      } else {
        toast.error(res?.data?.message || 'Không thể check-in');
      }
    } catch (error) {
      console.error('[CheckinTab] handleCheckIn error', error);
      toast.error(error.response?.data?.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Bạn chắc chắn muốn hủy cuộc hẹn này?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      toast.success('Hủy cuộc hẹn thành công');
      loadAppointments();
    } catch (error) {
      console.error('[CheckinTab] handleCancel error', error);
      toast.error('Lỗi hủy cuộc hẹn');
    }
  };

  const handleWalkInSuccess = () => {
    setShowWalkInModal(false);
    loadAppointments();
  };

  return (
    <div className="checkin-tab-container">
      <div className="checkin-toolbar">
        <div className="checkin-date-nav">
          <FaCalendarAlt className="checkin-icon" />
          <input
            type="date"
            className="checkin-input"
            value={filter.date}
            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
          />
        </div>

        <div className="checkin-search">
          <input
            type="text"
            className="checkin-input checkin-flex-1"
            placeholder="Tìm kiếm (Tên, Mã, SĐT, Dịch vụ, Chuyên khoa, Bác sĩ)..."
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && loadAppointments()}
          />
          <button className="checkin-btn checkin-btn-primary" onClick={loadAppointments} type="button">
            <FaSearch /> Tìm
          </button>
          <button
            className="checkin-btn checkin-btn-secondary"
            onClick={() => setFilter({ date: todayISO(), keyword: '' })}
            type="button"
          >
            <FaUndo /> Tải lại
          </button>
        </div>

        <button className="checkin-btn checkin-btn-success" onClick={() => setShowWalkInModal(true)} type="button">
          <FaUserPlus /> Tiếp đón khách tại quầy
        </button>
      </div>

      {/* Scope Tabs & Filters */}
      <div className="checkin-toolbar">
        <div className="checkin-scope-tabs">
          <button
            className={`checkin-scope-btn ${filter.queueScope === 'all' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, queueScope: 'all', serviceKey: 'all', specialtyKey: 'all', doctorKey: 'all' })}
          >
            Tất cả
          </button>
          <button
            className={`checkin-scope-btn ${filter.queueScope === 'service' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, queueScope: 'service', serviceKey: 'all' })}
          >
            Theo dịch vụ
          </button>
          <button
            className={`checkin-scope-btn ${filter.queueScope === 'specialty' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, queueScope: 'specialty', specialtyKey: 'all' })}
          >
            Theo chuyên khoa
          </button>
          <button
            className={`checkin-scope-btn ${filter.queueScope === 'doctor' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, queueScope: 'doctor', doctorKey: 'all' })}
          >
            Theo bác sĩ
          </button>
        </div>

        {filter.queueScope === 'service' && Object.keys(serviceOptions).length > 1 && (
          <select
            className="checkin-filter-select"
            value={filter.serviceKey}
            onChange={(e) => setFilter({ ...filter, serviceKey: e.target.value })}
          >
            <option value="all">-- Tất cả dịch vụ --</option>
            {Object.entries(serviceOptions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}

        {filter.queueScope === 'specialty' && Object.keys(specialtyOptions).length > 1 && (
          <select
            className="checkin-filter-select"
            value={filter.specialtyKey}
            onChange={(e) => setFilter({ ...filter, specialtyKey: e.target.value })}
          >
            <option value="all">-- Tất cả chuyên khoa --</option>
            {Object.entries(specialtyOptions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}

        {filter.queueScope === 'doctor' && Object.keys(doctorOptions).length > 1 && (
          <select
            className="checkin-filter-select"
            value={filter.doctorKey}
            onChange={(e) => setFilter({ ...filter, doctorKey: e.target.value })}
          >
            <option value="all">-- Tất cả bác sĩ --</option>
            {Object.entries(doctorOptions).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="checkin-stats-grid">
        <button
          type="button"
          className={`checkin-stat-card ${statusView === 'all' ? 'active' : ''}`}
          onClick={() => setStatusView('all')}
        >
          <div className="checkin-stat-label"><FaListOl /> Tất cả</div>
          <div className="checkin-stat-value">{statusStats.all}</div>
        </button>
        <button
          type="button"
          className={`checkin-stat-card ${statusView === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusView('pending')}
        >
          <div className="checkin-stat-label"><FaHistory /> Chờ xác nhận</div>
          <div className="checkin-stat-value">{statusStats.pending}</div>
        </button>
        <button
          type="button"
          className={`checkin-stat-card ${statusView === 'unpaid' ? 'active' : ''}`}
          onClick={() => setStatusView('unpaid')}
        >
          <div className="checkin-stat-label"><FaMoneyBillWave /> Chưa thanh toán</div>
          <div className="checkin-stat-value">{statusStats.unpaid}</div>
        </button>
        <button
          type="button"
          className={`checkin-stat-card ${statusView === 'ready_checkin' ? 'active' : ''}`}
          onClick={() => setStatusView('ready_checkin')}
        >
          <div className="checkin-stat-label"><FaCheckCircle /> Chờ check-in</div>
          <div className="checkin-stat-value">{statusStats.ready_checkin}</div>
        </button>
        <button
          type="button"
          className={`checkin-stat-card ${statusView === 'waiting_call' ? 'active' : ''}`}
          onClick={() => setStatusView('waiting_call')}
        >
          <div className="checkin-stat-label"><FaBullhorn /> Chờ gọi số</div>
          <div className="checkin-stat-value">{statusStats.waiting_call}</div>
        </button>
        <button
          type="button"
          className={`checkin-stat-card ${statusView === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusView('completed')}
        >
          <div className="checkin-stat-label"><FaCheckCircle /> Hoàn thành</div>
          <div className="checkin-stat-value">{statusStats.completed}</div>
        </button>
      </div>

      <div className="checkin-grid">
        <div className="checkin-panel checkin-flex-1">
          <div className="checkin-panel-header">
            <FaStethoscope className="checkin-icon" />
            <h6 className="checkin-title">Chờ vào khám ({filteredAppointments.length})</h6>
          </div>
          <div className="checkin-table-wrapper">
            <table className="checkin-table">
              <thead>
                <tr>
                  <th className="checkin-th-idx">#</th>
                  <th className="checkin-th-code">Mã HS</th>
                  <th className="checkin-th-stt">Số TT</th>
                  <th className="checkin-th-name">Bệnh nhân</th>
                  <th>Dịch vụ</th>
                  <th>Chuyên khoa</th>
                  <th>Bác sĩ</th>
                  <th className="checkin-tc">Loại</th>
                  <th className="checkin-tr">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="checkin-empty">
                      <FaSpinner className="amp-fa-spin" /> Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appt, index) => {
                    const queueNum = appt.display_queue || appt.queue_number;
                    const isPaidClinic = appt.payment_status === 'paid_at_clinic' || appt.payment_status === 'paid_online' || appt.payment_status === 'not_required';
                    const completed = isCompleted(appt);
                    const pending = isPending(appt);
                    const unpaid = isUnpaid(appt);
                    const checkedIn = isCheckedIn(appt);
                    const canCallNow = checkedIn && hasQueueNumber(appt) && !completed;
                    const isActiveCalledTicket = Boolean(calledTicket?.called) && String(calledTicket.called.code || calledTicket.called.id) === String(appt.code || appt.id);
                    const isSelectedQueueAppointmentRow = isActiveQueueAppointment(appt);
                    return (
                      <tr
                        key={appt.id}
                        className={`checkin-tr-sm ${isSelectedQueueAppointmentRow ? 'checkin-tr-active-call' : ''}`}
                        onClick={() => handleSelectQueueAppointment(appt)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="checkin-tc checkin-gray-bold">{index + 1}</td>
                        <td className="checkin-code">{appt.code}</td>
                        <td className="checkin-tc">
                          {queueNum ? (
                            <div className="checkin-queue-wrap">
                              <span className={`checkin-badge checkin-badge-green ${isActiveCalledTicket ? 'checkin-badge-call-active' : ''}`}>{queueNum}</span>
                              <div className="checkin-queue-scope">{getQueueScopeLabel(appt)}</div>
                            </div>
                          ) : (
                            <span className="checkin-badge checkin-badge-gray">Chưa có</span>
                          )}
                        </td>
                        <td className="checkin-name">
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{getPatientName(appt)}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {getPatientPhone(appt)}{getPatientEmail(appt) !== '--' ? ` • ${getPatientEmail(appt)}` : ''}
                          </div>
                        </td>
                        <td className="checkin-service">{appt.Service?.name}</td>
                        <td className="checkin-gray" style={{ fontSize: '12px' }}>{getSpecialtyName(appt)}</td>
                        <td className="checkin-gray" style={{ fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '2px' }}>{getDoctorName(appt)}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {getDoctorPhone(appt)}{getDoctorEmail(appt) !== '--' ? ` • ${getDoctorEmail(appt)}` : ''}
                          </div>
                        </td>
                        <td className="checkin-tc">
                          {appt.queue_type === 'priority' ? (
                            <span className="checkin-badge checkin-badge-teal">Ưu tiên</span>
                          ) : (
                            <span className="checkin-badge checkin-badge-gray">Thường</span>
                          )}
                        </td>
                        <td className="checkin-tr">
                          <div className="checkin-actions">
                            {completed ? (
                              <span className="checkin-badge checkin-badge-green">Đã hoàn thành</span>
                            ) : pending ? (
                              <span className="checkin-badge checkin-badge-gray">Chờ xác nhận</span>
                            ) : unpaid ? (
                              <button
                                className="checkin-btn checkin-btn-sm checkin-btn-secondary"
                                onClick={() => openCounterPaymentModal(appt)}
                                title="Thanh toán tại quầy"
                                type="button"
                              >
                                <FaMoneyBillWave /> <span>Thanh toán quầy</span>
                              </button>
                            ) : !queueNum ? (
                              <button
                                className="checkin-btn checkin-btn-sm checkin-btn-success"
                                onClick={() => handleCheckIn(appt)}
                                title="Cấp STT khám"
                                type="button"
                              >
                                <FaTicketAlt /> <span>Cấp STT</span>
                              </button>
                            ) : String(appt.status) === 'in_progress' ? (
                              <span className="checkin-badge checkin-badge-green">Đang khám</span>
                            ) : !checkedIn ? (
                              <button
                                className="checkin-btn checkin-btn-sm checkin-btn-success"
                                onClick={() => handleCheckIn(appt)}
                                title={isPaidClinic ? 'Vào khám' : 'Check-in'}
                                type="button"
                              >
                                <FaCheckCircle /> <span>Check-in</span>
                              </button>
                            ) : isActiveCalledTicket ? (
                              <span className="checkin-badge checkin-badge-green" style={{ fontSize: '12px' }}>Đang gọi</span>
                            ) : (
                              <button
                                className="checkin-btn checkin-btn-sm checkin-btn-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectQueueAppointment(appt);
                                }}
                                title="Chọn lịch hẹn để gọi"
                                type="button"
                              >
                                <FaBullhorn /> <span>Chọn gọi</span>
                              </button>
                            )}
                            {!completed && (
                              <button
                                className="checkin-btn checkin-btn-sm checkin-btn-danger"
                                onClick={() => handleCancel(appt.id)}
                                title="Hủy"
                                type="button"
                              >
                                <FaTrash size={12} /> <span>Hủy</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="checkin-empty">
                      Không có lịch hẹn chờ khám trong ngày {new Date(filter.date).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="checkin-panel checkin-ticket-panel">
          <div className="checkin-panel-header">
            <FaTicketAlt className="checkin-icon" />
            <h6 className="checkin-title">Cần Gọi Tiếp Theo</h6>
          </div>
          <div className="checkin-ticket-body">
            {/* Section: Khách hiện tại đang được gọi */}
            {activeQueueAppointment && (
              <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#ecfdf5', border: '2px solid #22c55e', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  {activeQueueIsInProgress
                    ? activeQueueStatusLabel
                    : (activeQueueIsCalled ? `ĐANG GỌI - ${formatCountdown(absentCountdown)}` : activeQueueStatusLabel)}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
                  {activeQueueAppointment.display_queue || activeQueueAppointment.queue_number || '--'}
                </div>
                <div style={{ fontSize: '13px', color: '#1f2937', marginBottom: '2px' }}>
                  <strong>{getPatientName(activeQueueAppointment)}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                  {activeQueueAppointment.Service?.name || '--'}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="checkin-btn checkin-btn-secondary" type="button" onClick={() => printTicket(activeQueueAppointment)} style={{ flex: 1, minWidth: '90px' }}>
                    <FaPrint /> In phiếu
                  </button>
                  <button className="checkin-btn checkin-btn-secondary" type="button" onClick={() => handleCallAgain(activeQueueAppointment)} style={{ flex: 1, minWidth: '90px' }}>
                    <FaPhone /> Gọi lại
                  </button>
                  <button 
                    className={`checkin-btn checkin-btn-sm ${audioEnabled ? 'checkin-btn-primary' : 'checkin-btn-secondary'}`}
                    type="button" 
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    title={audioEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                    style={{ padding: '6px 10px', minWidth: '40px' }}
                  >
                    {audioEnabled ? <FaVolumeUp size={14} /> : <FaVolumeMute size={14} />}
                  </button>
                  {activeQueueIsInProgress ? (
                    <span className="checkin-badge checkin-badge-green" style={{ alignSelf: 'center' }}>Đang khám</span>
                  ) : activeQueueIsCalled ? (
                    <>
                      <button className="checkin-btn checkin-btn-success" type="button" onClick={handleMarkEntered} disabled={calling || activeQueueAppointment.status === 'in_progress'} style={{ flex: 1, minWidth: '80px' }}>
                        <FaCheckCircle /> Đã vào
                      </button>
                      <button className="checkin-btn checkin-btn-danger" type="button" onClick={() => markPatientAbsent('Vắng mặt tại quầy')} style={{ flex: 1, minWidth: '90px' }}>
                        Vắng mặt
                      </button>
                    </>
                  ) : !isCheckedIn(activeQueueAppointment) ? (
                    <button className="checkin-btn checkin-btn-success" type="button" onClick={() => handleCheckIn(activeQueueAppointment)} style={{ flex: 1, minWidth: '110px' }}>
                      <FaCheckCircle /> Check-in
                    </button>
                  ) : activeQueueCanCall ? (
                    <button className="checkin-btn checkin-btn-primary" type="button" onClick={() => handleCallNumber(activeQueueAppointment)} disabled={calling} style={{ flex: 1, minWidth: '110px' }}>
                      <FaBullhorn /> Gọi số
                    </button>
                  ) : (
                    <span className="checkin-badge checkin-badge-gray" style={{ alignSelf: 'center' }}>Không thể gọi</span>
                  )}
                </div>
              </div>
            )}

            {queueReadyAppointments.length > 0 ? (
              <>
                <div className="checkin-next-ticket-box">
                  <div className="checkin-next-ticket-label">Khách tiếp theo</div>
                  <div className="checkin-next-ticket-num">
                    {queueReadyAppointments[0]?.display_queue || queueReadyAppointments[0]?.queue_number || '--'}
                  </div>
                  <div className="checkin-next-ticket-scope">{getQueueScopeLabel(queueReadyAppointments[0])}</div>
                </div>
                <div className="checkin-next-ticket-customer">
                  <strong>Khách hàng:</strong>
                  <div>{queueReadyAppointments[0]?.guest_name || queueReadyAppointments[0]?.Patient?.User?.full_name || 'N/A'}</div>
                </div>
                <div className="checkin-next-ticket-info">
                  <div><FaPhone size={12} /> {getPatientPhone(queueReadyAppointments[0])}</div>
                  <div><FaFileAlt size={12} /> {queueReadyAppointments[0]?.code || '--'}</div>
                  <div><FaInfoCircle size={12} /> {queueReadyAppointments[0]?.Service?.name || '--'}</div>
                  <div><FaCreditCard size={12} /> {queueReadyAppointments[0]?.payment_status === 'paid_at_clinic' ? 'Đã thu quầy' : 'Đã thanh toán'}</div>
                </div>
                {/* Removed inline 'Chọn gọi' and 'In phiếu' buttons per request */}

                <div className="checkin-call-log-panel">
                  <div className="checkin-call-log-title"><FaHistory size={12} /> Nhật ký gọi số</div>
                  <div className="checkin-call-log-list">
                    {callLogs.length > 0 ? callLogs.slice(0, 8).map((log) => {
                      const details = log.details || {};
                      const queueLabel = log.queue_number || details.queue || '--';
                      const patientLabel = log.patient_name || details.called_patient_name || details.appointment_code || '--';
                      const calledAt = log.called_at || log.created_at;
                      return (
                        <div key={log.id} className="checkin-call-log-item">
                          <div className="checkin-call-log-main">
                            <strong>{queueLabel}</strong>
                            <span>{patientLabel}</span>
                          </div>
                          <div className="checkin-call-log-time">
                            {new Date(calledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="checkin-empty-ticket">Chưa có nhật ký gọi số</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="checkin-empty-ticket">Không có khách chờ khám đã có STT trong nhóm lọc hiện tại</div>
            )}
          </div>
        </div>
      </div>

      {showCounterPaymentModal && counterPaymentTarget && (
        <div className="checkin-call-overlay" onClick={() => setShowCounterPaymentModal(false)}>
          <div className="checkin-call-modal" onClick={(e) => e.stopPropagation()}>
            <button className="checkin-call-close" type="button" onClick={() => setShowCounterPaymentModal(false)}>
              <FaTimes />
            </button>
            <div className="checkin-call-label">THANH TOÁN TẠI QUẦY</div>
            <div className="checkin-call-name">{counterPaymentTarget.code}</div>
            <div className="checkin-call-service">{counterPaymentTarget.Service?.name || '--'}</div>

            <div className="checkin-payment-form">
              <label>Tiền cần thu</label>
              <div className="checkin-input" style={{ fontSize: '20px', fontWeight: 700, padding: '8px' }}>
                {formatCurrency(counterPaymentForm.amount_due)}
              </div>

              <label htmlFor="counter-payment-method">Phương thức</label>
              <select
                id="counter-payment-method"
                className="checkin-input"
                value={counterPaymentForm.payment_method}
                onChange={(e) => {
                  const nextMethod = e.target.value;
                  const due = Number(counterPaymentForm.amount_due || 0);
                  setCounterPaymentForm((prev) => ({
                    ...prev,
                    payment_method: nextMethod,
                    amount_received: nextMethod === 'cash' ? prev.amount_received || due : due,
                    change: nextMethod === 'cash' ? Math.max(0, (prev.amount_received || 0) - due) : 0
                  }));
                }}
              >
                <option value="cash">Tiền mặt</option>
                <option value="bank_transfer">Chuyển khoản / QR</option>
              </select>

              {counterPaymentForm.payment_method === 'cash' ? (
                <>
                  <label htmlFor="counter-payment-amount">Khách đưa (VND)</label>
                  <input
                    id="counter-payment-amount"
                    type="text"
                    className="checkin-input"
                    value={formatCurrency(counterPaymentForm.amount_received)}
                    onChange={(e) => {
                      const parsed = parseNumber(e.target.value);
                      setCounterPaymentForm((prev) => ({
                        ...prev,
                        amount_received: parsed,
                        change: Math.max(0, parsed - (prev.amount_due || 0))
                      }));
                    }}
                  />

                  <label>Tiền thối</label>
                  <div className="checkin-input" style={{ padding: '8px' }}>{formatCurrency(counterPaymentForm.change)}</div>
                </>
              ) : (
                <div className="checkin-payment-hint">
                  Chọn chuyển khoản / QR thì chỉ cần nhấn xác nhận đã thanh toán.
                </div>
              )}
            </div>

            <div className="checkin-call-actions">
              <button
                className="checkin-btn checkin-btn-primary"
                type="button"
                onClick={handleCounterPaymentSubmit}
                disabled={submittingCounterPayment}
                title="Xác nhận và lưu thanh toán"
              >
                <FaCreditCard /> {submittingCounterPayment ? 'Đang lưu...' : (counterPaymentForm.payment_method === 'cash' ? 'Xác nhận thanh toán' : 'Xác nhận đã thanh toán')}
              </button>
              <button
                className="checkin-btn checkin-btn-secondary"
                type="button"
                onClick={() => printBill(counterPaymentTarget, counterPaymentForm.amount_due, counterPaymentForm.amount_received, counterPaymentForm.change)}
              >
                <FaPrint /> In bill
              </button>
              <button
                className="checkin-btn checkin-btn-secondary"
                type="button"
                onClick={() => setShowCounterPaymentModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {showCallExpiredModal && calledTicket?.called && (
        <div className="checkin-call-overlay" onClick={() => setShowCallExpiredModal(false)}>
          <div className="checkin-call-modal" onClick={(e) => e.stopPropagation()}>
            <button className="checkin-call-close" type="button" onClick={() => setShowCallExpiredModal(false)}>
              <FaTimes />
            </button>
            <div className="checkin-call-label">THỜI GIAN GỌI ĐÃ HẾT</div>
            <div className="checkin-call-name">STT: {calledTicket.called.display_queue || calledTicket.called.queue_number}</div>
            <div className="checkin-call-service">{getPatientName(calledTicket.called)}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', marginBottom: '16px', textAlign: 'center' }}>
              Bệnh nhân không có mặt trong thời gian chờ. Bạn muốn gọi lại hay đánh dấu vắng mặt?
            </div>
            <div className="checkin-call-actions">
              <button
                className="checkin-btn checkin-btn-primary"
                type="button"
                onClick={handleCallAgainFromExpired}
              >
                <FaBullhorn /> Gọi lại
              </button>
              <button
                className="checkin-btn checkin-btn-danger"
                type="button"
                onClick={handleMarkAbsentFromExpired}
              >
                <FaTimes /> Đánh dấu vắng mặt
              </button>
            </div>
          </div>
        </div>
      )}

      <WalkInReceptionModal
        show={showWalkInModal}
        onHide={() => setShowWalkInModal(false)}
        onSuccess={handleWalkInSuccess}
      />
    </div>
  );
};

export default CheckinTab;




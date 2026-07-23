// client/src/pages/FrontDeskPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import WorkShiftModal from '../components/finance/WorkShiftModal';
// Custom Modal — không dùng Bootstrap
import { 
  FaUserPlus, FaMoneyBillWave, FaPills, FaSearch, FaPrint, FaEdit, 
  FaStethoscope, FaClock, FaCheckCircle, FaTrash, FaHistory, FaFilePrescription,
  FaQrcode, FaCreditCard, FaTag, FaArrowRight, FaUndo, FaTicketAlt, FaCalendarAlt, FaInfoCircle,
  FaChevronLeft, FaChevronRight, FaCalendarDay,
  FaHospital, FaUserMd, FaPhone, FaEnvelope, FaMapMarkerAlt, FaVideo, FaNotesMedical, FaUser,
  FaTimes, FaHeart, FaBan, FaShieldAlt, FaSmile, FaSpinner
} from 'react-icons/fa';
import appointmentService from '../services/appointmentService';
import WalkInReceptionModal from '../components/appointments/WalkInReceptionModal';
import usePermissions from '../hooks/usePermissions';
import './FrontDeskPage.css';

// ─── CUSTOM MODAL ──────────────────────────────────
import { createPortal } from 'react-dom';

const FrdModal = ({ show, onHide, size = 'md', children, className = '' }) => {
  useEffect(() => {
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!show) return null;
  const sizeClass = size === 'lg' ? 'frd-modal-lg' : size === 'xl' ? 'frd-modal-xl' : size === 'sm' ? 'frd-modal-sm' : '';

  return createPortal(
    <div className="frd-modal-backdrop" onClick={onHide}>
      <div className={`frd-modal-dialog ${sizeClass} ${className}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

FrdModal.Header = ({ children, onHide, className = '' }) => (
  <div className={`frd-modal-header ${className}`}>
    <div className="frd-modal-title">{children}</div>
    {onHide && (
      <button className="frd-modal-close" onClick={onHide} type="button">
        <FaTimes />
      </button>
    )}
  </div>
);
FrdModal.Body = ({ children, className = '' }) => <div className={`frd-modal-body ${className}`}>{children}</div>;
FrdModal.Footer = ({ children, className = '' }) => <div className={`frd-modal-footer ${className}`}>{children}</div>;

const FrontDeskPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
    
  // --- STATE ---
  const [activeTab, setActiveTab] = useState(localStorage.getItem('currentTab') || 'reception');

  useEffect(() => {
      localStorage.setItem('currentTab', activeTab);
  }, [activeTab]);
  
  const [receptionTab, setReceptionTab] = useState('payment');

  const [receptionFilter, setReceptionFilter] = useState({ 
      date: new Date().toISOString().split('T')[0], 
      keyword: '',
      status: 'all' 
  });

  const [bankConfig, setBankConfig] = useState({ bank_name: 'MB', account_no: '', account_name: '' });
  const [servicesList, setServicesList] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/services`);
        if (res.data.success) setServicesList(res.data.data || []);
      } catch (error) { console.error("Lỗi tải dịch vụ:", error); }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/payments/config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data.bank) setBankConfig(res.data.data.bank);
      } catch (error) { console.error("Lỗi tải cấu hình ngân hàng:", error); }
    };
    fetchPaymentConfig();
  }, []);

  const [shift, setShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [modalMode, setModalMode] = useState('start');

  // Reception State
  const [patients, setPatients] = useState([]);
  const [editingPatient, setEditingPatient] = useState(null); 
  const [regForm, setRegForm] = useState({
    name: '', phone: '', birth: '', gender: 'Nam', cccd: '', address: '', 
    examDate: new Date().toISOString().split('T')[0], symptoms: '', serviceId: '', doctor_id: ''
  });

  // Cashier State
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  // --- [MỚI] State cho Thanh toán & In ấn ---
  const [discountAmount, setDiscountAmount] = useState(0); // Tiền giảm giá

  // Pharmacy State
  const [pharmacyTab, setPharmacyTab] = useState('prescription');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);

  // State thông tin khách lẻ
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountCode, setDiscountCode] = useState('');

  const { user: authUser, hasPermission, canAccessModule, isAdmin } = usePermissions();

  // Permission checks for which tabs to show
  const canReception = canAccessModule('reception') || hasPermission('payments','pos') || isAdmin;
  const canCashier = hasPermission('payments','pos') || canAccessModule('payments') || isAdmin;
  const canPharmacy = canAccessModule('pharmacy') || hasPermission('pharmacy','view') || hasPermission('pharmacy','export_retail') || hasPermission('pharmacy','export_prescription') || hasPermission('medicines','view') || hasPermission('payments','pos') || isAdmin;

  const availableTabs = [];
  if (canReception) availableTabs.push({ key: 'reception', label: 'Cấp số Khám bệnh', icon: <FaUserPlus /> });
  if (canCashier) availableTabs.push({ key: 'cashier', label: 'Thu Ngân (Dịch vụ)', icon: <FaMoneyBillWave /> });
  if (canPharmacy) availableTabs.push({ key: 'pharmacy', label: 'Nhà Thuốc', icon: <FaPills /> });

  const handleSetActiveTab = (key) => {
    setActiveTab(key);
    try { localStorage.setItem('currentTab', key); } catch (e) {}
  };

  // --- STATE MỚI CHO QUY TRÌNH TIẾP ĐÓN WALK-IN THỰC TẾ ---
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_dob: '',
    guest_gender: 'Nam',
    appointment_type: 'offline',
    service_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_start_time: '',
    reason: ''
  });
  const [walkInDoctors, setWalkInDoctors] = useState([]);
  
  // [CẬP NHẬT] Đổi biến lưu slots thành lưu "Ca trống" (Sức chứa Offline)
  const [walkInShifts, setWalkInShifts] = useState([]);
  
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [printData, setPrintData] = useState(null); 
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const openDetail = (appt) => navigate(`/lich-hen/${appt.code}`);
  const [showPrintModal, setShowPrintModal] = useState(false); 
  
  const [unpaidAppointments, setUnpaidAppointments] = useState([]); 
  const [paidAppointments, setPaidAppointments] = useState([]);     
  
  // --- STATE MỚI: CẬP NHẬT THANH TOÁN TẠI QUẦY ---
  const [showPaymentUpdateModal, setShowPaymentUpdateModal] = useState(false);
  const [selectedApptForPayment, setSelectedApptForPayment] = useState(null);
  const [paymentUpdateForm, setPaymentUpdateForm] = useState({
    payment_method: 'cash', // 'cash' hoặc 'transfer'
    amount: 0,
    paid_at: new Date().toISOString()
  });
  const [updatingPayment, setUpdatingPayment] = useState(false);
  
  const [cashierFilter, setCashierFilter] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    keyword: '',
    status: 'all' 
  });
  const [cashierList, setCashierList] = useState([]);
  const [manualCalling, setManualCalling] = useState(null);

  const handleCallNext = () => {
      const waitingList = cashierList.filter(p => !['paid', 'paid_at_clinic', 'paid_online'].includes(p.payment_status));
      if (waitingList.length === 0) {
          toast.info("Không còn ai trong hàng chờ thanh toán!");
          setManualCalling(null);
          return;
      }
      const current = manualCalling || selectedBill || waitingList[0];
      const currentIndex = waitingList.findIndex(p => p.id === current.id);

      if (currentIndex !== -1 && currentIndex < waitingList.length - 1) {
          const nextPerson = waitingList[currentIndex + 1];
          setManualCalling(nextPerson); 
          setSelectedBill(nextPerson);  
          toast.info(`Đang mời: ${nextPerson.guest_name || nextPerson.Patient?.User?.full_name}`);
      } else {
          setManualCalling(waitingList[0]);
          setSelectedBill(waitingList[0]);
          toast.info("Đã quay lại đầu danh sách chờ.");
      }
  };

  useEffect(() => {
    if (activeTab === 'reception') loadReceptionData();
  }, [activeTab]);

  const handleCashierPrevDay = () => {
    const current = new Date(cashierFilter.date || new Date());
    current.setDate(current.getDate() - 1);
    setCashierFilter({ ...cashierFilter, date: current.toISOString().split('T')[0] });
  };
  const handleCashierNextDay = () => {
    const current = new Date(cashierFilter.date || new Date());
    current.setDate(current.getDate() + 1);
    setCashierFilter({ ...cashierFilter, date: current.toISOString().split('T')[0] });
  };

  const loadReceptionData = async () => {
    try {
      const params = { search: receptionFilter.keyword, limit: 100 };
      if (receptionFilter.date) {
        params.date_from = receptionFilter.date;
        params.date_to = receptionFilter.date;
      }

      const res = await appointmentService.getAllAppointments(params);
      
      if (res.data.success) {
        let all = res.data.data;
        if (receptionFilter.status === 'no_num') {
            all = all.filter(a => !a.payment_queue_number && !a.queue_number);
        } else if (receptionFilter.status === 'has_num') {
            all = all.filter(a => a.payment_queue_number || a.queue_number);
        }

        const unpaid = all.filter(a =>
          ((['pending', 'confirmed', 'waiting_pay'].includes(a.status) || a.isUpcoming) && a.payment_status === 'unpaid')
        ).sort((a,b) => (a.appointment_start_time || '').localeCompare(b.appointment_start_time || ''));
        setUnpaidAppointments(unpaid);

        const paid = all.filter(a => 
          (['confirmed', 'waiting_exam', 'in_progress', 'completed'].includes(a.status) || a.isUpcoming) && 
          (a.payment_status === 'paid_online' || a.payment_status === 'not_required' || a.payment_status === 'paid_at_clinic' || a.queue_number)
        ).sort((a,b) => {
           if (a.queue_number && b.queue_number) return a.queue_number - b.queue_number;
           if (a.queue_number) return -1;
           if (b.queue_number) return 1;
           return (a.appointment_start_time || '').localeCompare(b.appointment_start_time || '');
        });
        setPaidAppointments(paid);
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (activeTab === 'reception') loadReceptionData();
  }, [activeTab, receptionFilter.date]);

  const loadCashierData = async () => {
    try {
      let statusParam = 'waiting_pay'; 
      if (cashierFilter.status === 'all') statusParam = 'waiting_pay,confirmed,completed,in_progress';
      else if (cashierFilter.status === 'paid') statusParam = 'confirmed,completed,in_progress';
      
      const res = await appointmentService.getAllAppointments({ 
        status: statusParam, date_from: cashierFilter.date, date_to: cashierFilter.date, search: cashierFilter.keyword, limit: 100 
      });
      
      if (res.data.success) {
        const sortedList = res.data.data.sort((a, b) => {
           const isPaidA = ['paid_at_clinic','paid_online','paid'].includes(a.payment_status) ? 1 : 0;
           const isPaidB = ['paid_at_clinic','paid_online','paid'].includes(b.payment_status) ? 1 : 0;
           if (isPaidA !== isPaidB) return isPaidA - isPaidB;
           const sttA = a.payment_queue_number || 9999;
           const sttB = b.payment_queue_number || 9999;
           return sttA - sttB;
        });
        setCashierList(sortedList);
      }
    } catch (error) { console.error("Lỗi tải danh sách thu ngân:", error); }
  };

  useEffect(() => {
    if (activeTab === 'cashier') loadCashierData();
  }, [activeTab, cashierFilter.date]);

  // --- [SỬA LẠI ĐỂ TÍNH TIỀN THUỐC THEO CHUẨN] ---
  useEffect(() => {
    if (activeTab === 'pharmacy' && pharmacyTab === 'prescription') {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem('token');
          const cleanStr = (str) => {
             if (!str) return '';
             return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); 
          };
          const parsePrice = (p) => {
              if (p === null || p === undefined) return 0;
              const num = parseInt(p.toString().replace(/\D/g, ''));
              return isNaN(num) ? 0 : num;
          };

          let medList = [];
          try {
             const medRes = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/articles/medicines?limit=5000`, { headers: { Authorization: `Bearer ${token}` } });
             const rawData = medRes.data;
             if (Array.isArray(rawData.data)) medList = rawData.data; 
             else if (rawData.data && Array.isArray(rawData.data.rows)) medList = rawData.data.rows; 
             else if (Array.isArray(rawData.medicines)) medList = rawData.medicines; 
          } catch (err) {}
          
          const res = await appointmentService.getAllAppointments({ status: 'completed,confirmed,in_progress', limit: 50 });
          if (res.data.success) {
            const list = res.data.data
              .filter(a => a.MedicalRecord && a.MedicalRecord.prescription_json && a.MedicalRecord.prescription_json.length > 0)
              .map(a => {
                const isPaidAtClinic = ['paid_at_clinic','paid'].includes(a.payment_status);
                const enrichedItems = a.MedicalRecord.prescription_json.map(item => {
                  const docDrugNameClean = cleanStr(item.name);
                  let stockMed = medList.find(m => cleanStr(m.name) === docDrugNameClean);
                  if (!stockMed) stockMed = medList.find(m => docDrugNameClean.includes(cleanStr(m.name)));
                  if (!stockMed) stockMed = medList.find(m => cleanStr(m.name).includes(docDrugNameClean));

                  const rawPrice = stockMed ? (stockMed.price || stockMed.export_price) : 0;
                  const unitPrice = parsePrice(rawPrice);
                  const quantity = parseInt(item.quantity) || 1;
                  
                  return {
                    ...item, original_name: item.name, name: stockMed ? stockMed.name : item.name, 
                    unit: stockMed ? stockMed.unit : (item.unit || 'Đvi'), price: unitPrice, 
                    total: unitPrice * quantity, found: !!stockMed 
                  };
                });
                const totalAmount = enrichedItems.reduce((sum, i) => sum + i.total, 0);
                return {
                  id: a.MedicalRecord.id, appointment_id: a.id, patientName: a.guest_name || a.Patient?.User?.full_name || 'Khách lẻ',
                  patientCode: a.code, gender: a.guest_gender || a.Patient?.User?.gender || '--', diagnosis: a.MedicalRecord.diagnosis,
                  items: enrichedItems, status: isPaidAtClinic ? 'sold' : 'pending', total: totalAmount, customerPaid: isPaidAtClinic ? totalAmount : 0
                };
              });
            setPrescriptions(list);
          }
        } catch (error) {}
      };
      fetchData();
    }
  }, [activeTab, pharmacyTab]);

  const formatMoney = (n) => n ? n.toLocaleString() + ' đ' : '0 đ';

  // --- HANDLERS: WALK-IN REGISTRATION (ĐÃ SỬA LẠI LOGIC CHỌN CA OFF-LINE) ---
  const loadWalkInDoctors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users/by-role?role=doctor&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalkInDoctors(res.data.users || res.data.data || []);
    } catch (e) { console.error('Load doctors error:', e); }
  };

  useEffect(() => {
    if (showNewPatientForm) loadWalkInDoctors();
  }, [showNewPatientForm]);

  // [CẬP NHẬT] Hàm tải danh sách các "Ca làm việc" thay vì các "Slot 30 phút cứng"
  const loadWalkInShifts = async (doctorId, serviceId, date, appointmentType = 'offline') => {
    if (!doctorId || !serviceId || !date) return;
    try {
      // Tính ca theo loại hình khám để đồng bộ với booking page
      const res = await appointmentService.getAvailableSlots(doctorId, date, serviceId, appointmentType);
      if (res.data.success) {
        // Backend trả về mảng các slot đại diện cho ca (VD: 07:00, 08:00, 09:00).
        // Ta chỉ cần gom nhóm lại theo Ca (shift_name) để hiển thị gọn gàng hơn.
        const rawSlots = res.data.data.raw || [];
        
        // Trích xuất các ca riêng biệt
        const uniqueShiftsMap = new Map();
        rawSlots.forEach(slot => {
            if (slot.status === 'available' && !uniqueShiftsMap.has(slot.shift_name)) {
                // Lấy slot đầu tiên của ca đó làm giờ đại diện
                uniqueShiftsMap.set(slot.shift_name, {
                    time: slot.time, // Giờ đại diện (VD: "07:00")
                    label: slot.reason, // Text Backend trả về (VD: "Ca Sáng: Còn 12 chỗ")
                    shift_name: slot.shift_name
                });
            }
        });

        setWalkInShifts(Array.from(uniqueShiftsMap.values()));
      }
    } catch (e) { setWalkInShifts([]); }
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInForm.guest_name || !walkInForm.guest_phone || !walkInForm.service_id || !walkInForm.doctor_id || !walkInForm.appointment_start_time) {
      return toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc (kể cả chọn Ca khám)!');
    }
    setWalkInSubmitting(true);
    try {
      const isOnlineBooking = walkInForm.appointment_type === 'online';
      const payload = {
        service_id: walkInForm.service_id,
        doctor_id: walkInForm.doctor_id,
        appointment_date: walkInForm.appointment_date,
        appointment_start_time: walkInForm.appointment_start_time,
        appointment_type: walkInForm.appointment_type,
        reason: walkInForm.reason,
        payment_method: isOnlineBooking ? 'online' : 'cash',
        guest_name: walkInForm.guest_name,
        guest_phone: walkInForm.guest_phone,
        guest_email: walkInForm.guest_email,
        guest_dob: walkInForm.guest_dob,
        guest_gender: walkInForm.guest_gender,
        booking_context: {
          source: isOnlineBooking ? 'front_desk_online' : 'front_desk_walkin'
        }
      };

      const res = isOnlineBooking
        ? await appointmentService.createAppointment(payload)
        : await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/appointments/walk-in`, walkInForm, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });

      if (res.data.success) {
        toast.success(
          isOnlineBooking
            ? 'Đặt lịch online hộ bệnh nhân thành công!'
            : `Đăng ký thành công! Số chờ nộp tiền: ${res.data.data?.payment_queue_number}`
        );
        setShowNewPatientForm(false);
        setWalkInForm({
          guest_name: '', guest_email: '', guest_phone: '', guest_dob: '', guest_gender: 'Nam',
          appointment_type: 'offline', service_id: '', doctor_id: '', appointment_date: new Date().toISOString().split('T')[0],
          appointment_start_time: '', reason: ''
        });
        setWalkInShifts([]); // Xóa danh sách ca
        loadReceptionData(); // Reload danh sách đang đợi
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi đăng ký');
    } finally {
      setWalkInSubmitting(false);
    }
  };

  // --- HANDLERS: CASHIER ---
  const handlePayment = async () => {
    if (!selectedBill) return;
    const totalAmount = selectedBill.Service?.price || 0;
    const received = parseInt(paymentAmount);
    
    if (isNaN(received) || received < totalAmount) {
      return toast.error('Số tiền khách đưa không đủ!');
    }

    try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/payments`, {
            appointment_id: selectedBill.id, 
            payment_method: paymentMethod, 
            amount: totalAmount,
            payment_info: {
                amount_received: paymentMethod === 'cash' ? received : totalAmount,             
                change_amount: paymentMethod === 'cash' ? (received - totalAmount) : 0, 
                cashier_name: user?.full_name || 'Thu Ngân',              
                method_detail: paymentMethod === 'cash' ? 'Tiền mặt tại quầy' : 'Chuyển khoản ngân hàng'
            }
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (res.data.success) {
            toast.success(`Thu tiền thành công! Trả lại: ${formatMoney(received - totalAmount)}`);
            setPaymentAmount('');
            
            const printDataObj = {
                ...selectedBill,
                payment_status: 'paid_at_clinic',
                printType: 'invoice',
                clinicInfo: { name: "PHÒNG KHÁM ĐA KHOA EASY MEDIFY", address: "123 Đường Sức Khỏe, Quận 1, TP.HCM", phone: "1900 1234" },
                PaymentDetails: {
                    method: paymentMethod, transaction_id: `POS-${Date.now()}`, date: new Date(),
                    info: { amount_received: received, change_amount: received - totalAmount, cashier_name: user?.full_name || 'Thu Ngân', method_detail: 'Tiền mặt' }
                }
            };
            setPrintData(printDataObj);
            setShowPrintModal(true);
            
            const updatedBill = { ...selectedBill, payment_status: 'paid_at_clinic' };
            setSelectedBill(updatedBill);
            setManualCalling(null); 
            loadCashierData();
        }
    } catch (error) { toast.error(error.response?.data?.message || 'Lỗi khi thanh toán'); }
  };

  const handlePrescriptionPayment = async () => {
    if(!selectedPrescription) return;
    try {
        const token = localStorage.getItem('token');
        const res = await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/appointments/${selectedPrescription.appointment_id}/payment`, {
            payment_status: 'paid_at_clinic', payment_method: paymentMethod, amount: selectedPrescription.total
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (res.data.success) {
            toast.success('Thanh toán & Xuất thuốc thành công!');
            setPrescriptions(prescriptions.map(pr => pr.id === selectedPrescription.id ? {...pr, status: 'sold'} : pr));
            setSelectedPrescription(prev => ({...prev, status: 'sold'}));
            setPaymentAmount('');
        }
    } catch (error) { toast.error('Lỗi khi thanh toán đơn thuốc'); }
  };

  // --- HANDLER: CHECK-IN LỄ TÂN (ĐÃ SỬA CẤP ĐÚNG SỐ U VÀ N) ---
  const handleCheckIn = async (appt, type) => {
    try {
      const res = await appointmentService.checkIn(appt.code, type);
      if (res.data.success) {
        toast.success(res.data.message);
        // Lưu data in ra có chứa đúng display_queue
        setPrintData({ 
            ...res.data.data, 
            printType: 'ticket',
            display_queue: res.data.data.display_queue, // Bắt trường display_queue mới
            queue_number: res.data.data.queue_number,
            payment_queue_number: res.data.data.payment_queue_number
        }); 
        setShowPrintModal(true);     
        loadReceptionData();         
      }
    } catch (error) {
      toast.error('Lỗi check-in: ' + (error.response?.data?.message || 'Vui lòng thử lại'));
    }
  };

  const handleCancelAppt = async (apptId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lượt tiếp đón này không?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/appointments/${apptId}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Đã hủy thành công');
      loadReceptionData(); 
    } catch (error) { toast.error('Lỗi khi hủy'); }
  };

  // --- HANDLER: CẬP NHẬT THANH TOÁN TẠI QUẦY ---
  const openPaymentUpdateModal = (appt) => {
    setSelectedApptForPayment(appt);
    setPaymentUpdateForm({
      payment_method: 'cash',
      amount: appt.Service?.price || 0,
      paid_at: new Date().toISOString()
    });
    setShowPaymentUpdateModal(true);
  };

  const handleUpdatePaymentAtClinic = async () => {
    if (!selectedApptForPayment) return;
    
    if (paymentUpdateForm.amount <= 0) {
      toast.warning('Vui lòng nhập số tiền thanh toán > 0');
      return;
    }

    try {
      setUpdatingPayment(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/appointments/${selectedApptForPayment.code}/payment`,
        {
          payment_status: 'paid_at_clinic',
          payment_method: paymentUpdateForm.payment_method,
          amount: paymentUpdateForm.amount,
          paid_at: paymentUpdateForm.paid_at
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`✅ Xác nhận thanh toán ${paymentUpdateForm.payment_method === 'cash' ? 'tiền mặt' : 'chuyển khoản'} thành công!`);
        setShowPaymentUpdateModal(false);
        loadReceptionData();
      }
    } catch (error) {
      console.error('Payment update error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật thanh toán');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleShiftSubmit = async ({ amount, note, difference, shift_config_id }) => {
    try {
      const token = localStorage.getItem('token');
      if (modalMode === 'start') {
        const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/work-shifts/cashier/start`, {
          opening_cash: amount, opening_note: note, shift_config_id: shift_config_id || null
        }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { toast.success(res.data.message); setShift(res.data.data); setShowShiftModal(false); }
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/work-shifts/cashier/end`, {
          closing_cash_actual: amount, closing_note: note
        }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) {
          const { summary } = res.data.data;
          toast.success(res.data.message); setShift(null); setShowShiftModal(false);
          toast.info(`Tổng doanh thu: ${summary.revenue_cash.toLocaleString('vi-VN')}đ (TM) + ${summary.revenue_transfer.toLocaleString('vi-VN')}đ (CK) · ${summary.total_transactions} giao dịch`, { autoClose: 8000 });
        }
      }
    } catch (error) { toast.error(error.response?.data?.message || 'Lỗi khi xử lý ca làm việc'); }
  };

  // --- RENDERS ---
  const renderReception = () => {
    return (
    <div className="frdeskpage-content" > 
      {/* 1. HEADER ACTIONS */}
      <div className="frdeskpage-flex-between frdeskpage-mb-8">
          <div className="frdeskpage-flex frdeskpage-gap-4">
            <button 
              className={`frdeskpage-btn frdeskpage-btn-sm ${receptionTab === 'payment' ? 'frdeskpage-btn-primary' : 'frdeskpage-btn-secondary'}`}
              onClick={() => setReceptionTab('payment')}
            >
              <FaMoneyBillWave/> CHỜ NỘP TIỀN <span className="frdeskpage-badge-num frd-ml6">{unpaidAppointments.length}</span>
            </button>
            <button 
              className={`frdeskpage-btn frdeskpage-btn-sm ${receptionTab === 'exam' ? 'frdeskpage-btn-primary' : 'frdeskpage-btn-secondary'}`}
              onClick={() => setReceptionTab('exam')}
            >
              <FaStethoscope/> CHỜ VÀO KHÁM <span className="frdeskpage-badge-num frd-ml6">{paidAppointments.length}</span>
            </button>
          </div>

          <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" onClick={() => setShowNewPatientForm(true)}>
            <FaUserPlus/> Tiếp đón Khách tại quầy
          </button>
      </div>

      {/* 2. THANH BỘ LỌC (COMPACT) */}
      <div className="frdeskpage-toolbar frdeskpage-mb-8">
             <div className="frdeskpage-date-nav">
                <span className="frdeskpage-date-nav-icon"><FaCalendarAlt/></span>
                <input 
                  type="date" 
                  className="frdeskpage-input"
                  value={receptionFilter.date}
                  onChange={(e) => setReceptionFilter({...receptionFilter, date: e.target.value})}
                />
             </div>

             <select 
                className="frdeskpage-select frd-w150"
                value={receptionFilter.status}
                onChange={(e) => setReceptionFilter({...receptionFilter, status: e.target.value})}
             >
                <option value="all">Tất cả hồ sơ</option>
                <option value="no_num">Chưa cấp số</option>
                <option value="has_num">Đã cấp số</option>
             </select>

             <div className="frdeskpage-search frdeskpage-flex-1">
                <input 
                  type="text" 
                  className="frdeskpage-input frdeskpage-flex-1"
                  placeholder="Tìm kiếm bệnh nhân (Tên, Mã, SĐT)..."
                  value={receptionFilter.keyword}
                  onChange={(e) => setReceptionFilter({...receptionFilter, keyword: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && loadReceptionData()}
                />
                <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" onClick={loadReceptionData}><FaSearch/> Tìm</button>
                <button className="frdeskpage-btn frdeskpage-btn-secondary frdeskpage-btn-sm" onClick={() => { setReceptionFilter({date: new Date().toISOString().split('T')[0], keyword: '', status: 'all'}); loadReceptionData(); }}><FaUndo/> Tải lại</button>
             </div>
      </div>

      {/* 3. BẢNG DỮ LIỆU & VÙNG LẤY SỐ (2 CỘT) */}
      <div className="frd-reception-grid">
        
        {/* CỘT TRÁI: BẢNG DANH SÁCH */}
        <div className="frdeskpage-panel frdeskpage-flex-1">
          <div className="frdeskpage-panel-body">
            <table className="frdeskpage-table frdeskpage-table-compact">
              <thead >
                <tr>
                  <th className="frd-th-idx">#</th>
                  <th className="frd-th-code">Mã HS</th>
                  <th className="frd-th-stt">Số TT</th>
                  <th className="frd-tc frd-th-status">Đã Checkin</th>
                  <th className="frd-th-name">Họ tên bệnh nhân</th>
                  <th className="frd-th-dob">Năm sinh</th>
                  <th className="frd-th-phone">SĐT</th>
                  <th>Dịch vụ đăng ký</th>
                  <th className="frd-tc frd-th-status">Loại đặt</th>
                  <th className="frd-tc frd-th-status">Trạng thái</th>
                  <th className="frd-tr frd-th-action">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).map((appt, index) => {
                   // [SỬA LẠI]: Ưu tiên hiển thị display_queue trước nếu đã có
                   let sttDisplay = null;
                   if (receptionTab === 'payment') {
                       sttDisplay = appt.payment_queue_number;
                   } else if (receptionTab === 'exam') {
                       // Nếu đã có display_queue (U01, N02...) thì ưu tiên in ra
                       sttDisplay = appt.display_queue || appt.queue_number;
                   }

                   return (
                   <tr key={appt.id} className="frd-tr-sm">
                     <td className="frd-tc frd-gray-bold">{index + 1}</td>
                     <td><span className="frd-code-green">{appt.code}</span></td>
                     <td className="frd-tc">
                        {sttDisplay ? (
                            <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-green" style={{fontSize: '11px', padding: '3px 10px'}}>
                               {sttDisplay}
                            </span>
                        ) : (
                            <span className="frdeskpage-badge frdeskpage-badge-gray">Chưa có</span>
                        )}
                     </td>
                     <td className="frd-fw-700 frd-uppercase">
                        {appt.guest_name || appt.Patient?.User?.full_name}
                     </td>
                    <td className="frd-tc">
                      {appt.checked_in_at ? (
                        <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-blue">Đã Checkin</span>
                      ) : (
                        <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-gray">Chưa Checkin</span>
                      )}
                    </td>
                     <td className="frd-gray-text">
                        {appt.guest_dob ? new Date(appt.guest_dob).getFullYear() : (appt.Patient?.User?.dob ? new Date(appt.Patient.User.dob).getFullYear() : '--')}
                     </td>
                     <td>{appt.guest_phone || appt.Patient?.User?.phone}</td>
                     <td>
                       <div className="frd-service-cell" title={appt.Service?.name}>
                          {appt.Service?.name}
                       </div>
                     </td>
                     <td className="frd-tc">
                        {appt.queue_type === 'priority' ? (
                            <span className="frdeskpage-badge frdeskpage-badge-teal">App/Web</span>
                        ) : (
                            <span className="frdeskpage-badge frdeskpage-badge-gray">Tại quầy</span>
                        )}
                     </td>
                     <td className="frd-tc">
                       {receptionTab === 'payment' ? (
                          sttDisplay 
                          ? <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-amber">Chờ nộp tiền</span>
                          : <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-gray">Mới tiếp nhận</span>
                       ) : (
                          <span className="frdeskpage-badge frdeskpage-badge-pill frdeskpage-badge-blue">Chờ khám</span>
                       )}
                     </td>
                     <td className="frd-tr">
                       <div className="frdeskpage-flex-end frdeskpage-gap-2">
                           {!sttDisplay ? (
                               <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-xs frd-btn-action"
                                  onClick={() => handleCheckIn(appt, receptionTab === 'payment' ? 'payment' : 'clinical')}>
                                  <FaTicketAlt /> CẤP SỐ
                               </button>
                           ) : (
                               <>
                                 <button className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-xs frd-btn-action"
                                    onClick={() => {
                                        setPrintData({ 
                                            ...appt, 
                                            printType: 'ticket',
                                            payment_queue_number: receptionTab === 'payment' ? appt.payment_queue_number : null,
                                            // Ưu tiên in display_queue ra phiếu
                                            display_queue: receptionTab === 'exam' ? (appt.display_queue || appt.queue_number) : null
                                        }); 
                                        setShowPrintModal(true);
                                    }}>
                                    <FaPrint /> IN LẠI
                                 </button>
                                 {/* BUTTON MỚI: Thanh toán tại quầy cho online payment gặp lỗi */}
                                 {receptionTab === 'payment' && appt.payment_status === 'unpaid' && appt.status === 'pending' && (
                                   <button className="frdeskpage-btn frdeskpage-btn-success frdeskpage-btn-xs frd-btn-action"
                                      onClick={() => openPaymentUpdateModal(appt)}
                                      title="Xác nhận thanh toán tại quầy (cho case online lỗi)">
                                      <FaMoneyBillWave /> THANH TOÁN
                                   </button>
                                 )}
                               </>
                           )}
                           <button className="frdeskpage-btn frdeskpage-btn-danger frdeskpage-btn-xs frd-btn-icon-sm"
                              onClick={(e) => { e.stopPropagation(); handleCancelAppt(appt.id); }} title="Hủy">
                               <FaTrash size={10}/>
                           </button>
                       </div>
                     </td>
                   </tr>
                )})}
                
                {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).length === 0 && (
                  <tr>
                        <td colSpan="11" className="frd-empty-cell">
                          <span>Không có dữ liệu cho ngày {new Date(receptionFilter.date).toLocaleDateString('vi-VN')}</span>
                      </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CỘT PHẢI: VÙNG TICKET NHANH */}
        <div className="frdeskpage-panel frd-ticket-panel">
          <div className="frdeskpage-panel-header">
            <FaTicketAlt/>
            <h6 className="frd-panel-h6">Cần Gọi Tiếp Theo</h6>
          </div>
          <div className="frd-ticket-body">
            {(receptionTab === 'payment' ? unpaidAppointments : paidAppointments).length > 0 ? (
              <>
                <div className="frd-next-ticket-box">
                  <div className="frd-next-ticket-label">Khách tiếp theo</div>
                  <div className="frd-next-ticket-num">
                    {/* Ưu tiên hiển thị display_queue U/N */}
                    {receptionTab === 'payment' 
                      ? (unpaidAppointments[0]?.payment_queue_number || '--')
                      : (paidAppointments[0]?.display_queue || paidAppointments[0]?.queue_number || '--')
                    }
                  </div>
                </div>
                <div className="frd-next-ticket-customer">
                  <strong>Khách hàng:</strong> {((receptionTab === 'payment' ? unpaidAppointments : paidAppointments)[0]?.guest_name || (receptionTab === 'payment' ? unpaidAppointments : paidAppointments)[0]?.Patient?.User?.full_name) || 'N/A'}
                </div>
                <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-full frd-ticket-call-btn">
                  <FaCheckCircle/> Mời khách lên quầy
                </button>
              </>
            ) : (
              <div className="frd-ticket-empty">
                <div className="frd-ticket-empty-num">--</div>
                <div className="frd-ticket-empty-text">Không có khách chờ</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  }

  const renderCashier = () => {
    // Lấy khách hàng đang được chọn hoặc người đầu tiên trong hàng đợi để hiển thị "Đang gọi"
    // [SỬA] Logic ưu tiên hiển thị đúng người đang gọi
    const firstUnpaid = cashierList.find(p => !['paid', 'paid_at_clinic', 'paid_online'].includes(p.payment_status));
    const currentCalling = manualCalling || selectedBill || firstUnpaid || cashierList[0];

    return (
    <div className="front-desk-page-content front-desk-page-layout-split">
       {/* CỘT TRÁI: DANH SÁCH CHỜ */}
       <div className="front-desk-page-panel">
          
          {/* [SỬA] Ô GỌI SỐ CÓ NÚT NEXT */}
          {/* CALL BOX MỚI */}
          <div className="fd-call-box">
            <div>
              <div className="call-label">
                <FaHospital style={{marginRight: 5}}/> Đang mời thanh toán
              </div>
              <div className="call-name">
                {currentCalling
                  ? `${currentCalling.payment_queue_number ? 'Số ' + currentCalling.payment_queue_number + ' — ' : ''}${currentCalling.guest_name || currentCalling.Patient?.User?.full_name}`
                  : '— Chưa có khách —'}
              </div>
              <div className="call-sub">
                {currentCalling ? `Mã hồ sơ: ${currentCalling.code}` : 'Hàng đợi trống'}
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{textAlign: 'center'}}>
                <div className="call-number">{currentCalling?.payment_queue_number || '--'}</div>
                <div className="call-counter">Quầy 1</div>
              </div>
              <button className="fd-next-btn" onClick={handleCallNext} title="Mời số tiếp theo">
                <FaArrowRight /> GỌI TIẾP
              </button>
            </div>
          </div>

          <div className="front-desk-page-panel-header">
             <span><FaMoneyBillWave /> DANH SÁCH CHỜ ({cashierList.length})</span>
          </div>

          {/* [MỚI] THANH CÔNG CỤ LỌC (Ngày tháng & Tìm kiếm) */}
          {/* [ĐÃ SỬA] THANH CÔNG CỤ LỌC: Có mũi tên, icon lịch, nút Tất cả */}
          <div className="fd-toolbar">
          {/* Date navigator */}
          <div className="fd-date-nav">
            <button onClick={handleCashierPrevDay} title="Ngày trước"><FaChevronLeft size={10}/></button>
            <input
              type="date"
              value={cashierFilter.date}
              onChange={e => setCashierFilter({...cashierFilter, date: e.target.value})}
            />
            <button onClick={handleCashierNextDay} title="Ngày sau"><FaChevronRight size={10}/></button>
          </div>
        
          {/* Status filter */}
          <select
            className="front-desk-page-select"
            style={{width: 148, height: 30}}
            value={cashierFilter.status}
            onChange={e => setCashierFilter({...cashierFilter, status: e.target.value})}
          >
            <option value="all">Tất cả hồ sơ</option>
            <option value="unpaid">Chờ thu tiền</option>
            <option value="paid">Đã thu tiền</option>
          </select>
        
          {/* Search */}
          <div className="fd-search-box">
            <FaSearch size={11} style={{color: 'var(--fd-gray-500)', flexShrink: 0}}/>
            <input
              placeholder="Tên BN, Mã hồ sơ, SĐT..."
              value={cashierFilter.keyword}
              onChange={e => setCashierFilter({...cashierFilter, keyword: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && loadCashierData()}
            />
          </div>
          <button className="front-desk-page-btn front-desk-page-btn-primary front-desk-page-btn-sm" onClick={loadCashierData}>
            Tìm
          </button>
        </div>

          <div className="front-desk-page-panel-body p-0">
             <table className="front-desk-page-table">
                <thead>
                    <tr>
                        <th style={{width: '50px'}}>STT</th>
                        <th style={{width: '100px'}}>Mã HS</th>
                        <th>Họ tên</th>
                        <th style={{width: '80px'}}>Giờ</th>
                        <th>Bác sĩ</th>
                        <th>Dịch vụ</th>
                        <th className="text-end">Số tiền</th>
                        <th className="text-center">Trạng thái</th>
                        <th className="text-end">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                   {cashierList.map((p, index) => {
                    // Kiểm tra xem đơn này đã thanh toán chưa
                    const isPaid = ['paid_at_clinic', 'paid_online', 'paid'].includes(p.payment_status);

                    return (
                    <tr key={p.id} 
                        className={selectedBill?.id === p.id ? 'active' : ''}
                        // SỬA: Bỏ điều kiện !isPaid để luôn cho phép click xem chi tiết
                        onClick={() => setSelectedBill(p)} 
                        style={{cursor: 'pointer', backgroundColor: isPaid ? '#f0fdf4' : 'white'}} // Đổi màu xanh nhẹ nếu đã thu
                    >
                        <td>
                            <span className={`front-desk-page-badge ${isPaid ? 'badge-grey' : 'badge-num'}`}>
                              {index + 1}
                            </span>
                        </td>

                        <td><span className="fw-bold">{p.code}</span></td>
                        <td>{p.guest_name || p.Patient?.User?.full_name}</td>

                        <td>
                          <div className="fw-bold small">{p.appointment_start_time?.slice(0, 5)}</div>
                        </td>

                        <td>
                          <div className="small text-primary fw-bold">
                              {p.Doctor?.user?.full_name || 'Chưa chỉ định'}
                          </div>
                        </td>

                        <td><small>{p.Service?.name}</small></td>
                        
                        {/* Cột số tiền: Nếu đã thu hiện màu xanh, chưa thu hiện màu đỏ */}
                        <td className={`text-end fw-bold ${isPaid ? 'text-success' : 'text-danger'}`}>
                            {formatMoney(p.Service?.price)}
                        </td>
                        
                        {/* Cột trạng thái */}
                        <td>
                            {isPaid ? (
                                <span className="badge bg-success text-white">Đã thu tiền</span>
                            ) : (
                                <span className="front-desk-page-badge badge-wait">Chờ thu</span>
                            )}
                        </td>

                        {/* Cột thao tác: Hiện nút In hóa đơn nếu đã thu */}
                        <td>
                          <div className="d-flex justify-content-end gap-1">
                              <button 
                                className="btn btn-sm btn-light text-primary border"
                                onClick={(e) => { e.stopPropagation(); openDetail(p); }}
                                title="Xem chi tiết"
                              >
                                <FaInfoCircle />
                              </button>
                              
                              {isPaid ? (
                                  <button 
                                    className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1"
                                    onClick={async (e) => { 
                                    e.stopPropagation(); // Ngăn click nhầm vào dòng
                                    try {
                                        const token = localStorage.getItem('token');
                                        // Gọi API lấy thông tin thanh toán chi tiết từ Database (đã sửa ở Bước 1)
                                        const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/payments/appointment/${p.id}`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        });
                                        
                                        // Chuẩn bị dữ liệu in mặc định (Dự phòng)
                                        let finalPrintData = { 
                                            ...p,
                                            payment_status: 'paid_at_clinic', // Đảm bảo trạng thái đúng để in ra Hóa Đơn
                                            printType: 'invoice'
                                        };

                                        // Nếu API trả về dữ liệu thanh toán, gộp vào
                                        if (res.data.success && res.data.data) {
                                            const rawInfo = res.data.data.payment_info;
                                            // Parse JSON chuỗi payment_info từ DB
                                            const infoObj = (typeof rawInfo === 'string') ? JSON.parse(rawInfo) : rawInfo;
                                            
                                            finalPrintData.PaymentDetails = {
                                                ...res.data.data,
                                                info: infoObj || { amount_received: p.Service?.price, change_amount: 0 }
                                            };
                                        } else {
                                            // Nếu không tìm thấy record thanh toán (lỗi DB), tự tạo dữ liệu giả để vẫn in được
                                            finalPrintData.PaymentDetails = {
                                                method: 'cash',
                                                transaction_id: `OFFLINE-${p.id}`,
                                                info: { amount_received: p.Service?.price, change_amount: 0 }
                                            };
                                        }
                                        
                                        setPrintData(finalPrintData);
                                        setShowPrintModal(true); // Mở modal
                                    } catch (err) {
                                        console.error("Lỗi lấy thông tin in:", err);
                                        // Trường hợp lỗi mạng, vẫn mở modal in với thông tin cơ bản
                                        setPrintData({
                                            ...p, 
                                            payment_status: 'paid_at_clinic',
                                            PaymentDetails: { method: 'cash', info: { amount_received: p.Service?.price, change_amount: 0 } }
                                        }); 
                                        setShowPrintModal(true); 
                                    }
                                }}
                                  >
                                    <FaPrint /> In HĐ
                                  </button>
                                ) : (
                                  <button className="front-desk-page-btn front-desk-page-btn-primary front-desk-page-btn-sm">
                                    Thu tiền
                                  </button>
                              )}
                          </div>
                        </td>
                    </tr>
                  )})}
                  
                   {cashierList.length === 0 && (
                      <tr><td colSpan="9" className="text-center text-muted py-4">Không tìm thấy dữ liệu phù hợp</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* CỘT PHẢI: FORM THANH TOÁN */}
       <div className="front-desk-page-panel">
          <div className="front-desk-page-panel-header d-flex justify-content-between align-items-center">
              <span>THÔNG TIN THANH TOÁN</span>
              {/* [THÊM] Nút đóng panel khi không dùng */}
              {selectedBill && (
                  <button 
                      className="btn btn-sm btn-danger d-flex align-items-center justify-content-center p-0" 
                      style={{width: '24px', height: '24px', borderRadius: '50%'}}
                      onClick={() => setSelectedBill(null)}
                      title="Đóng bảng thanh toán"
                  >
                      <span style={{marginTop: '-2px'}}>×</span>
                  </button>
              )}
          </div>
          <div className="front-desk-page-panel-body">
            {selectedBill ? (
              <div className="fd-payment-info">
          
                {/* Header bệnh nhân */}
                <div style={{textAlign: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--fd-gray-300)'}}>
                  <div className="fd-queue-number">{selectedBill.payment_queue_number || '--'}</div>
                  <div className="fd-patient-name">{selectedBill.guest_name || selectedBill.Patient?.User?.full_name}</div>
                  <div className="fd-patient-code">{selectedBill.code}</div>
                  {['paid','paid_at_clinic','paid_online'].includes(selectedBill.payment_status) && (
                    <span className="fd-status-chip paid" style={{marginTop: 6}}>
                      <FaCheckCircle size={9}/> Đã thanh toán
                    </span>
                  )}
                </div>
          
                {/* Thông tin dịch vụ */}
                <div style={{background: 'var(--fd-green-20)', borderRadius: 8, padding: '10px 12px', marginBottom: 10}}>
                  <div className="fd-bill-row">
                    <span style={{color: 'var(--fd-gray-500)', fontSize: 11}}>Dịch vụ</span>
                    <span style={{fontWeight: 600, fontSize: 12, maxWidth: 160, textAlign: 'right'}}>{selectedBill.Service?.name}</span>
                  </div>
                  <div className="fd-bill-row">
                    <span style={{color: 'var(--fd-gray-500)', fontSize: 11}}>Bác sĩ</span>
                    <span style={{fontWeight: 600, fontSize: 12, color: 'var(--fd-blue-600)'}}>{selectedBill.Doctor?.user?.full_name || '—'}</span>
                  </div>
                  <div className="fd-bill-row">
                    <span style={{color: 'var(--fd-gray-500)', fontSize: 11}}>Giờ khám</span>
                    <span style={{fontWeight: 700, fontFamily: 'var(--fd-mono)', fontSize: 12}}>{selectedBill.appointment_start_time?.slice(0,5)}</span>
                  </div>
                </div>
          
                {/* Tổng tiền */}
                <div className="fd-bill-total">
                  <span className="label">Tổng cộng</span>
                  <span className="amount">{formatMoney(selectedBill.Service?.price)}</span>
                </div>
          
                {!['paid','paid_at_clinic','paid_online'].includes(selectedBill.payment_status) ? (
                  <>
                    {/* Mã giảm giá */}
                    <div style={{marginBottom: 8}}>
                      <div style={{fontSize: 11, fontWeight: 700, color: 'var(--fd-gray-500)', marginBottom: 3, textTransform: 'uppercase'}}>Voucher / Mã giảm giá</div>
                      <div style={{display: 'flex', gap: 6}}>
                        <input className="front-desk-page-input" placeholder="Nhập mã..." value={discountCode} onChange={e => setDiscountCode(e.target.value)}/>
                        <button className="front-desk-page-btn front-desk-page-btn-outline front-desk-page-btn-sm" style={{flexShrink: 0}} onClick={() => toast.info('Đang cập nhật')}>
                          <FaTag/>
                        </button>
                      </div>
                    </div>
          
                    <div className="front-desk-page-divider"/>
          
                    {/* Phương thức */}
                    <div style={{marginBottom: 10}}>
                      <div style={{fontSize: 11, fontWeight: 700, color: 'var(--fd-gray-500)', marginBottom: 5, textTransform: 'uppercase'}}>Phương thức</div>
                      <div className="fd-method-switcher">
                        <button className={`fd-method-btn ${paymentMethod==='cash'?'active':''}`} onClick={() => setPaymentMethod('cash')}>
                          <FaMoneyBillWave size={11}/> Tiền mặt
                        </button>
                        <button className={`fd-method-btn ${paymentMethod==='transfer'?'active':''}`} onClick={() => setPaymentMethod('transfer')}>
                          <FaQrcode size={11}/> Chuyển khoản
                        </button>
                      </div>
                    </div>
          
                    {/* Tiền khách đưa */}
                    {paymentMethod === 'cash' ? (
                      <div style={{marginBottom: 10}}>
                        <div style={{fontSize: 11, fontWeight: 700, color: 'var(--fd-gray-500)', marginBottom: 4, textTransform: 'uppercase'}}>Tiền khách đưa</div>
                        <input
                          type="number"
                          className="front-desk-page-input"
                          style={{fontSize: 15, fontWeight: 700, color: 'var(--fd-green-700)', fontFamily: 'var(--fd-mono)'}}
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          placeholder="0"
                          autoFocus
                        />
                        {paymentAmount && (
                          <div className="fd-change-box" style={{marginTop: 6}}>
                            <span style={{fontSize: 11, color: 'var(--fd-gray-500)'}}>Trả lại</span>
                            <span style={{fontWeight: 700, color: 'var(--fd-green-700)', fontFamily: 'var(--fd-mono)'}}>
                              {formatMoney(Math.max(0, parseInt(paymentAmount) - (selectedBill.Service?.price || 0)))}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{background: 'var(--fd-blue-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: 'var(--fd-blue-600)', display: 'flex', gap: 8, alignItems: 'flex-start'}}>
                        <FaInfoCircle style={{marginTop: 1, flexShrink: 0}}/>
                        <span>Yêu cầu khách quét QR hoặc chuyển khoản theo thông tin ngân hàng tại quầy.</span>
                      </div>
                    )}
          
                    {/* Nút thu tiền */}
                    <button className="fd-checkout-btn" onClick={handlePayment}>
                      <FaCheckCircle size={13}/> XÁC NHẬN THANH TOÁN
                    </button>
                    <button
                      className="front-desk-page-btn front-desk-page-btn-outline"
                      style={{width: '100%', justifyContent: 'center', marginTop: 6}}
                      onClick={() => setSelectedBill(null)}
                    >
                      Hủy bỏ
                    </button>
                  </>
                ) : (
                  <div className="fd-success-state">
                    <div className="fd-success-icon"><FaCheckCircle/></div>
                    <div style={{fontWeight: 700, color: 'var(--fd-green-700)', fontSize: 13}}>Giao dịch hoàn tất</div>
                    <button
                      className="front-desk-page-btn front-desk-page-btn-outline"
                      style={{width: '100%', justifyContent: 'center', marginTop: 4}}
                      onClick={async () => {
                        const token = localStorage.getItem('token');
                        let paymentData = null;
                        try {
                          const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/payments/appointment/${selectedBill.id}`, { headers: { Authorization: `Bearer ${token}` } });
                          if (res.data.success && res.data.data) {
                            const rawInfo = res.data.data.payment_info;
                            paymentData = { ...res.data.data, info: typeof rawInfo === 'string' ? JSON.parse(rawInfo) : rawInfo };
                          }
                        } catch(e) {}
                        if (!paymentData) paymentData = { method: 'cash', transaction_id: `OFFLINE-${selectedBill.id}`, info: { amount_received: selectedBill.Service?.price, change_amount: 0 } };
                        setPrintData({ ...selectedBill, PaymentDetails: paymentData });
                        setShowPrintModal(true);
                      }}
                    >
                      <FaPrint size={11}/> In lại hóa đơn
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="fd-empty-state">
                <FaMoneyBillWave size={36}/>
                <p>Chọn bệnh nhân<br/>để thu tiền</p>
              </div>
            )}
          </div>
       </div>
    </div>
  )};

  // 3. PHARMACY VIEW (NHÀ THUỐC) - ĐÃ CẬP NHẬT GIAO DIỆN MỚI
  // --- [MỚI] Hàm cập nhật số lượng/đơn vị thuốc và tính lại tổng tiền ---
  const handleUpdatePrescriptionItem = (index, field, value) => {
    if (!selectedPrescription) return;

    // 1. Sao chép danh sách item hiện tại
    const newItems = [...selectedPrescription.items];
    const currentItem = { ...newItems[index] };

    // 2. Cập nhật giá trị (Số lượng hoặc Đơn vị)
    if (field === 'quantity') {
      const qty = parseInt(value) || 0;
      currentItem.quantity = qty;
      // Tính lại thành tiền của dòng này
      currentItem.total = qty * (currentItem.price || 0);
    } else if (field === 'unit') {
      currentItem.unit = value;
    }

    newItems[index] = currentItem;

    // 3. Tính lại Tổng tiền toàn đơn
    const newTotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);

    // 4. Cập nhật State
    const updatedPrescription = {
      ...selectedPrescription,
      items: newItems,
      total: newTotal
    };

    setSelectedPrescription(updatedPrescription);

    // Cập nhật cả trong danh sách lớn để đồng bộ
    setPrescriptions(prev => prev.map(p => p.id === updatedPrescription.id ? updatedPrescription : p));
  };

  // 3. PHARMACY VIEW (NHÀ THUỐC) - ĐÃ CẬP NHẬT GIAO DIỆN MỚI
  const renderPharmacy = () => {
    return (
      <div className="front-desk-page-content front-desk-page-layout-split">
         {/* CỘT TRÁI: DANH SÁCH ĐƠN / THUỐC */}
         <div className="front-desk-page-panel">
            <div className="front-desk-page-panel-header">
               <div className="front-desk-page-sub-tabs m-0">
                  <div 
                    className={`front-desk-page-sub-tab-btn ${pharmacyTab==='prescription'?'active':''}`}
                    onClick={()=>setPharmacyTab('prescription')}
                  >
                     <FaFilePrescription /> Đơn thuốc Bác sĩ
                  </div>
               </div>
            </div>

            {/* TAB: ĐƠN THUỐC */}
            {pharmacyTab === 'prescription' && (
               <div className="front-desk-page-panel-body p-0">
                  <div className="p-2 border-bottom bg-light">
                     <div className="position-relative">
                        <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"/>
                        <input className="front-desk-page-input ps-4" placeholder="Tìm tên BN hoặc mã đơn..." />
                     </div>
                  </div>
                  <table className="front-desk-page-table">
                     <thead>
                        <tr><th>Mã</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Trạng thái</th><th>Thao tác</th></tr>
                     </thead>
                     <tbody>
                        {prescriptions.map(pr => (
                           <tr 
                              key={pr.id} 
                              className={selectedPrescription?.id === pr.id ? 'active' : ''}
                              onClick={() => setSelectedPrescription(pr)} // [FIX] Luôn cho phép click
                              style={{ cursor: 'pointer' }}
                           >
                              <td><span className="fw-bold">{pr.id}</span></td>
                              <td>{pr.patientName}<br/><small className="text-muted">{pr.patientCode}</small></td>
                              <td>{pr.doctor}</td>
                              <td>
                                {/* [FIX] Hiển thị trạng thái dựa trên biến status mới */}
                                {pr.status === 'sold' 
                                    ? <span className="front-desk-page-badge badge-done">Đã bán</span>
                                    : <span className="front-desk-page-badge badge-wait">Chờ bán</span>
                                }
                              </td>
                              <td>
                                 {/* Nút thao tác nhanh */}
                                 {pr.status !== 'sold' && (
                                   <button 
                                      className="front-desk-page-btn front-desk-page-btn-primary front-desk-page-btn-sm" 
                                      onClick={(e) => {
                                          e.stopPropagation(); 
                                          setSelectedPrescription(pr);
                                      }}
                                   >
                                      Bán thuốc
                                   </button>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            <div className="front-desk-page-panel-body p-3">
              <div className="text-muted small">
                Bán thuốc đã được chuyển sang trang riêng trong menu Quản lý Kho Thuốc.
              </div>
            </div>
         </div>

         {/* CỘT PHẢI: CHI TIẾT THANH TOÁN - KHÔI PHỤC ĐẦY ĐỦ THÔNG TIN */}
         {(pharmacyTab === 'prescription' && selectedPrescription) && (
         <div className="front-desk-page-panel d-flex flex-column h-100">
            {/* 1. HEADER */}
            <div className="front-desk-page-panel-header">
               <span><FaFilePrescription className="me-2"/> CHI TIẾT ĐƠN THUỐC</span>
               {selectedPrescription.status === 'sold' 
                  ? <span className="front-desk-page-badge badge-done"><FaCheckCircle/> ĐÃ THANH TOÁN</span>
                  : <span className="front-desk-page-badge badge-wait"><FaClock/> CHỜ THANH TOÁN</span>
               }
            </div>
            
            {/* BODY: Thông tin & Thuốc */}
            <div className="front-desk-page-panel-body d-flex flex-column bg-light p-2">
               
               {/* 2. THÔNG TIN BỆNH NHÂN (Compact Card) */}
               <div className="bg-white p-2 rounded border shadow-sm mb-2 d-flex gap-2 align-items-start">
                  <div className="bg-success bg-opacity-10 text-success rounded p-2 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                     <FaUser className="fs-5"/>
                  </div>
                  <div className="flex-grow-1">
                      <div className="d-flex justify-content-between">
                          <h6 className="fw-bold text-success mb-0 text-uppercase" style={{fontSize: '12px'}}>{selectedPrescription.patientName}</h6>
                          <span className="small text-muted">{selectedPrescription.gender}</span>
                      </div>
                      <div className="d-flex justify-content-between small text-muted" style={{fontSize: '11px'}}>
                          <span>Mã: {selectedPrescription.patientCode}</span>
                          <span>BS: {selectedPrescription.doctor}</span>
                      </div>
                      <div className="small text-dark mt-1 fst-italic border-top pt-1" style={{fontSize: '11px'}}>
                          <strong>Chẩn đoán:</strong> {selectedPrescription.diagnosis}
                      </div>
                  </div>
               </div>

               {/* 3. DANH SÁCH THUỐC (Table Compact - ĐÃ SỬA WIDTH) */ }
               <div className="flex-grow-1 bg-white rounded border shadow-sm p-0 mb-2 overflow-auto" style={{minHeight: '150px'}}>
                  <table className="front-desk-page-table">
                    <thead>
                        <tr>
                            {/* Giảm cột tên thuốc xuống một chút để nhường chỗ */}
                            <th className="ps-2">Tên thuốc</th>
                            {/* Tăng độ rộng cột ĐV và SL lên 70px và 60px */}
                            <th className="text-center" style={{width: '70px'}}>ĐV</th>
                            <th className="text-center" style={{width: '60px'}}>SL</th>
                            <th className="text-end pe-2">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedPrescription.items.map((it, i) => (
                            <tr key={i}>
                                <td className="ps-2">
                                    <div className="fw-bold text-dark text-truncate" style={{maxWidth: '140px'}} title={it.name}>{it.name}</div>
                                    <div className="text-muted" style={{fontSize: '10px'}}>Giá: {formatMoney(it.price)}</div>
                                </td>
                                <td className="text-center">
                                    {selectedPrescription.status !== 'sold' ? (
                                      <input 
                                        type="text" 
                                        className="input-compact" // Class mới thêm ở CSS
                                        value={it.unit || ''} onChange={(e) => handleUpdatePrescriptionItem(i, 'unit', e.target.value)}
                                      />
                                    ) : it.unit}
                                </td>
                                <td className="text-center">
                                    {selectedPrescription.status !== 'sold' ? (
                                      <input 
                                        type="number" min="1" 
                                        className="input-compact text-primary" // Class mới thêm ở CSS
                                        value={it.quantity} onChange={(e) => handleUpdatePrescriptionItem(i, 'quantity', e.target.value)}
                                      />
                                    ) : it.quantity}
                                </td>
                                <td className="text-end pe-2 fw-bold text-danger">
                                  {formatMoney(it.total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
               </div>

               {/* 4. THANH TOÁN (Khôi phục đầy đủ) */}
               <div className="bg-white p-2 rounded border shadow-sm flex-shrink-0">
                   {selectedPrescription.status !== 'sold' ? (
                       <div className="d-flex flex-column gap-2">
                           
                           {/* Mã giảm giá */}
                           <div className="d-flex gap-1">
                               <input 
                                  className="front-desk-page-input" 
                                  placeholder="Nhập mã giảm giá..." 
                                  value={discountCode} onChange={e => setDiscountCode(e.target.value)} 
                               />
                               <button className="front-desk-page-btn front-desk-page-btn-outline front-desk-page-btn-sm" onClick={() => toast.info('Tính năng đang phát triển')}>
                                 <FaTag/>
                               </button>
                           </div>

                           <div className="front-desk-page-divider"></div>

                           {/* Tính toán tiền */}
                           <div className="d-flex justify-content-between small">
                               <span className="text-muted">Tổng tiền:</span>
                               <span className="fw-bold">{formatMoney(selectedPrescription.total)}</span>
                           </div>
                           {discountAmount > 0 && (
                               <div className="d-flex justify-content-between small text-success">
                                   <span>Giảm giá:</span>
                                   <span>- {formatMoney(discountAmount)}</span>
                               </div>
                           )}
                           <div className="d-flex justify-content-between align-items-end">
                               <span className="fw-bold text-dark small">KHÁCH CẦN TRẢ:</span>
                               <span className="text-danger fw-bold fs-5">
                                 {formatMoney(selectedPrescription.total - (discountAmount || 0))}
                               </span>
                           </div>

                           {/* Phương thức & Tiền khách đưa */}
                           <div className="bg-light p-2 rounded border">
                               <div className="d-flex gap-1 mb-2">
                                  <button type="button" 
                                    className={`flex-grow-1 front-desk-page-btn front-desk-page-btn-sm ${paymentMethod==='cash' ? 'front-desk-page-btn-primary' : 'front-desk-page-btn-outline'}`}
                                    onClick={() => setPaymentMethod('cash')}
                                  >
                                    <FaMoneyBillWave/> Tiền mặt
                                  </button>
                                  <button type="button" 
                                    className={`flex-grow-1 front-desk-page-btn front-desk-page-btn-sm ${paymentMethod==='transfer' ? 'front-desk-page-btn-primary' : 'front-desk-page-btn-outline'}`}
                                    onClick={() => setPaymentMethod('transfer')}
                                  >
                                    <FaQrcode/> Chuyển khoản
                                  </button>
                               </div>

                               {paymentMethod === 'cash' && (
                                   <>
                                   <div className="d-flex align-items-center mb-1">
                                       <span className="small fw-bold text-muted me-2" style={{minWidth:'70px'}}>Khách đưa:</span>
                                       <input 
                                          type="number" 
                                          className="front-desk-page-input fw-bold text-primary" 
                                          value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} 
                                          placeholder="0" 
                                       />
                                   </div>
                                   <div className="d-flex align-items-center">
                                       <span className="small fw-bold text-muted me-2" style={{minWidth:'70px'}}>Tiền thừa:</span>
                                       <span className="fw-bold text-success">
                                           {paymentAmount ? formatMoney(parseInt(paymentAmount) - (selectedPrescription.total - discountAmount)) : '0 đ'}
                                       </span>
                                   </div>
                                   </>
                               )}
                           </div>

                           <button 
                              className="front-desk-page-btn front-desk-page-btn-primary w-100 justify-content-center py-2 text-uppercase shadow-sm" 
                              onClick={handlePaymentAndPrint}
                           >
                               <FaPrint className="me-2"/> THANH TOÁN
                           </button>
                       </div>
                   ) : (
                       /* ĐÃ THANH TOÁN */
                       <div className="text-center py-3">
                           <div className="text-success fw-bold mb-2">
                               <FaCheckCircle className="fs-4 mb-1 d-block mx-auto"/> 
                               GIAO DỊCH HOÀN TẤT
                           </div>
                           <div className="small text-muted mb-3">
                               Thực thu: {formatMoney(selectedPrescription.customerPaid || selectedPrescription.total)}
                           </div>
                           <button 
                              className="front-desk-page-btn front-desk-page-btn-outline w-100 justify-content-center" 
                              onClick={() => handleOpenPrintInvoice(selectedPrescription)}
                           >
                               <FaPrint className="me-2"/> IN LẠI HÓA ĐƠN
                           </button>
                       </div>
                   )}
               </div>
            </div>
         </div>
         )}
      </div>
    );
  };
  // =========================================================
  // [MỚI] CÁC HÀM XỬ LÝ THANH TOÁN & IN HÓA ĐƠN
  // =========================================================

  // 1. Hàm mở Modal In (Chuẩn bị dữ liệu)
  const handleOpenPrintInvoice = (prescription) => {
    const finalTotal = prescription.total - (prescription.discount || 0);
    const customerPaid = prescription.customerPaid || finalTotal;
    
    setPrintData({
      ...prescription,
      finalTotal: finalTotal,
      customerPaid: customerPaid,
      changeAmount: customerPaid - finalTotal,
      printDate: new Date().toLocaleString('vi-VN')
    });
    setShowPrintModal(true);
  };

  // 2. Hàm nhập tiền khách đưa
  const handlePaymentInputChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setPaymentAmount(val);
  };

  // 3. Hàm Thanh toán & Mở In
  const handlePaymentAndPrint = async () => {
    if (!selectedPrescription) return;
    
    const finalTotal = selectedPrescription.total - discountAmount;
    const received = parseInt(paymentAmount) || 0;

    // Validate tiền mặt
    if (paymentMethod === 'cash' && received < finalTotal) {
       return toast.error('Số tiền khách đưa chưa đủ!');
    }

    try {
        const token = localStorage.getItem('token');
        // Gọi API cập nhật thanh toán
        await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/appointments/${selectedPrescription.appointment_id}/payment`, {
            payment_status: 'paid_at_clinic',
            payment_method: paymentMethod,
            amount: finalTotal
        }, { headers: { Authorization: `Bearer ${token}` } });

        toast.success('Thanh toán thành công!');

        // Cập nhật trạng thái ngay lập tức
        const updatedPrescription = {
            ...selectedPrescription,
            status: 'sold', // Chuyển sang đã bán
            discount: discountAmount,
            customerPaid: received
        };

        // Cập nhật danh sách & item đang chọn
        setPrescriptions(prev => prev.map(p => p.id === selectedPrescription.id ? updatedPrescription : p));
        setSelectedPrescription(updatedPrescription);
        
        // Mở modal in
        handleOpenPrintInvoice(updatedPrescription);
        
        // Reset form
        setPaymentAmount('');
        setDiscountCode('');
        setDiscountAmount(0);

    } catch (error) {
        console.error(error);
        toast.error('Lỗi thanh toán');
    }
  };

  return (
    <div className="frdeskpage-container">
      {/* 1. Header & Shift Bar */}
      <div className="frdeskpage-header">
        <div className="frdeskpage-title">
           <FaStethoscope/> HỆ THỐNG LỄ TÂN & ĐIỀU PHỐI KHÁM
        </div>
        <div>
          {shift ? (
            <span className="frdeskpage-badge frdeskpage-badge-blue cursor-pointer" onClick={() => {setModalMode('end'); setShowShiftModal(true);}}>
              <FaCheckCircle /> Ca: {shift.staff}
            </span>
          ) : (
             <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-sm" onClick={() => {setModalMode('start'); setShowShiftModal(true);}}>
               <FaClock /> Mở ca
             </button>
          )}
        </div>
      </div>
      
      {/* 2. Navigation */}
      <div className="frdeskpage-nav">
        {availableTabs.map(t => (
          <div key={t.key} className={`frdeskpage-nav-item ${activeTab===t.key?'active':''}`} onClick={()=>handleSetActiveTab(t.key)}>
            {t.icon} {t.label}
          </div>
        ))}
      </div>

      {/* 3. Main Content */}
      {activeTab === 'reception' && renderReception()}
      {activeTab === 'cashier' && renderCashier()} 
      {activeTab === 'pharmacy' && renderPharmacy()}

      <WalkInReceptionModal
        show={showNewPatientForm}
        onHide={() => setShowNewPatientForm(false)}
        onSuccess={loadReceptionData}
      />

      <FrdModal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" className="frd-modal-detail">
        <div className="frd-detail-header">
          <div className="frd-detail-header-left">
            <div className="frdeskpage-patient-avatar frd-detail-avatar">
              <FaNotesMedical />
            </div>
            <div>
              <h5 className="frd-detail-title">HỒ SƠ LỊCH HẸN</h5>
              <small className="frd-detail-code">
                Mã hồ sơ: <span className="frd-detail-code-val">#{selectedDetail?.code}</span>
              </small>
            </div>
          </div>
          <button type="button" className="frd-modal-close" onClick={() => setShowDetailModal(false)}>
            <FaTimes />
          </button>
        </div>

        <FrdModal.Body className="frd-detail-body">
          {selectedDetail && (
            <div className="frd-detail-layout">
              <div className="frd-col-flex-col">
                <div className="frdeskpage-panel">
                  <div className="frdeskpage-panel-header">
                    <FaCalendarAlt />
                    <h6 className="frd-panel-h6">Thông tin lịch hẹn</h6>
                    <div className="frd-ml-auto">
                      {selectedDetail.status === 'pending' && <span className="frdeskpage-badge frdeskpage-badge-amber frdeskpage-badge-pill"><FaClock /> Chờ xác nhận</span>}
                      {selectedDetail.status === 'confirmed' && <span className="frdeskpage-badge frdeskpage-badge-blue frdeskpage-badge-pill"><FaCheckCircle /> Đã xác nhận</span>}
                      {selectedDetail.status === 'completed' && <span className="frdeskpage-badge frdeskpage-badge-green frdeskpage-badge-pill"><FaCheckCircle /> Hoàn thành</span>}
                      {selectedDetail.status === 'cancelled' && <span className="frdeskpage-badge frdeskpage-badge-red frdeskpage-badge-pill"><FaBan /> Đã hủy</span>}
                      {selectedDetail.status === 'waiting_exam' && <span className="frdeskpage-badge frdeskpage-badge-blue frdeskpage-badge-pill"><FaStethoscope /> Chờ khám</span>}
                    </div>
                  </div>
                  <div className="frdeskpage-p-12">
                    <div className="frd-info-grid-2">
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label"><FaTag /> Dịch vụ</span>
                        <span className="frdeskpage-adp-value frdeskpage-adp-value-lg">{selectedDetail.Service?.name || '---'}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label"><FaHeart /> Chuyên khoa</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.Specialty?.name || 'Đa khoa'}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label"><FaUserMd /> Bác sĩ phụ trách</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.Doctor?.user?.full_name || 'Chưa chỉ định'}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label"><FaVideo /> Hình thức</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.appointment_type === 'online' ? 'Tư vấn trực tuyến' : 'Khám tại viện'}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label"><FaCalendarDay /> Ngày khám</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.appointment_date ? new Date(selectedDetail.appointment_date).toLocaleDateString('vi-VN') : '---'}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label"><FaClock /> Giờ khám</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.appointment_start_time?.slice(0, 5)} - {selectedDetail.appointment_end_time?.slice(0, 5)}</span>
                      </div>
                      <div className="frd-col-full frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label"><FaMapMarkerAlt /> Địa chỉ</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.appointment_address || 'Tầng 1, Tòa nhà Easy Medify, 123 Đường Sức Khỏe, Quận 1, TP. HCM'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="frdeskpage-panel">
                  <div className="frdeskpage-panel-header">
                    <FaUser />
                    <h6 className="frd-panel-h6">Thông tin bệnh nhân</h6>
                  </div>
                  <div className="frdeskpage-p-12">
                    <div className="frd-info-grid-2">
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label">Họ và tên</span>
                        <span className="frdeskpage-adp-value frd-uppercase">{selectedDetail.guest_name || selectedDetail.Patient?.User?.full_name}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label">Số điện thoại</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.guest_phone || selectedDetail.Patient?.User?.phone || '---'}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label">Email</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.guest_email || selectedDetail.Patient?.User?.email || '---'}</span>
                      </div>
                      <div className="frdeskpage-adp-info-group">
                        <span className="frdeskpage-adp-label">Giới tính / Năm sinh</span>
                        <span className="frdeskpage-adp-value">{selectedDetail.Patient?.User?.gender || '---'} - {selectedDetail.Patient?.User?.dob ? new Date(selectedDetail.Patient.User.dob).getFullYear() : '---'}</span>
                      </div>
                      <div className="frd-col-full frd-symptom-box">
                        <strong className="frd-symptom-label"><FaStethoscope /> Lý do khám / Triệu chứng:</strong>
                        <span className="frd-symptom-text">{selectedDetail.reason || 'Bệnh nhân không ghi chú thêm.'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="frd-col-flex-col">
                <div className="frdeskpage-panel">
                  <div className="frdeskpage-panel-header frd-header-green">
                    <FaMoneyBillWave />
                    <h6 className="frd-panel-h6 frd-white">Thanh toán</h6>
                  </div>
                  <div className="frd-payment-detail-body">
                    <div className="frd-price-center">
                      <span className="frdeskpage-adp-label frd-block">Tổng chi phí dịch vụ</span>
                      <div className="frd-price-big">
                        {selectedDetail.Service?.price ? selectedDetail.Service.price.toLocaleString('vi-VN') : '0'} <span className="frd-price-unit">VNĐ</span>
                      </div>
                    </div>

                    <div className="frd-payment-status-block">
                      <span className="frdeskpage-adp-label frd-block">Trạng thái thanh toán</span>
                      {(selectedDetail.payment_status === 'paid' || selectedDetail.payment_status === 'paid_online' || selectedDetail.payment_status === 'paid_at_clinic') ? (
                        <span className="frdeskpage-badge frdeskpage-badge-green frdeskpage-badge-pill">
                          <FaCheckCircle /> ĐÃ THANH TOÁN
                        </span>
                      ) : (
                        <span className="frdeskpage-badge frdeskpage-badge-amber frdeskpage-badge-pill">
                          <FaClock /> CHƯA THANH TOÁN
                        </span>
                      )}
                    </div>

                    {['pending', 'confirmed', 'waiting_exam'].includes(selectedDetail.status) && selectedDetail.payment_status === 'unpaid' && (
                      <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-full frdeskpage-btn-lg frd-mt-8" onClick={() => { setShowDetailModal(false); openPaymentUpdateModal(selectedDetail); }}>
                        <FaMoneyBillWave /> Thu tiền ngay
                      </button>
                    )}
                  </div>
                </div>

                {selectedDetail.status === 'completed' && (
                  <div className="frdeskpage-panel">
                    <div className="frdeskpage-panel-header">
                      <FaShieldAlt />
                      <h6 className="frd-panel-h6">Kết quả khám</h6>
                    </div>
                    <div className="frdeskpage-p-12">
                      {selectedDetail.MedicalRecord ? (
                        <div className="frd-record-ok">
                          <FaCheckCircle /> Đã có hồ sơ bệnh án
                        </div>
                      ) : (
                        <div className="frd-record-empty">Bác sĩ chưa cập nhật kết quả.</div>
                      )}
                    </div>
                  </div>
                )}

                <button className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-full" onClick={() => setShowDetailModal(false)}>
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          )}
        </FrdModal.Body>
      </FrdModal>

      <WorkShiftModal
        show={showShiftModal}
        onHide={() => setShowShiftModal(false)}
        mode={modalMode}
        onSubmit={handleShiftSubmit}
        currentUser={user?.full_name || user?.username || 'Nhân viên'}
        shiftStats={{
          startCash: shift?.opening_cash || 0,
          revenueCash: shift?.live_revenue_cash || 0,
          revenueTransfer: shift?.live_revenue_transfer || 0,
          transactions: shift?.live_transactions || 0
        }}
        currentShiftData={shift}
      />

      {/* MODAL IN ẤN: Đã tự động in `display_queue` (U/N) thay cho `queue_number` */}
      <FrdModal show={showPrintModal && !!printData} onHide={() => setShowPrintModal(false)} size="sm">
        <FrdModal.Header onHide={() => setShowPrintModal(false)} className="frdeskpage-no-print frd-print-header">
          {printData?.printType === 'ticket' ? <><FaTicketAlt/> XEM TRƯỚC PHIẾU KHÁM BỆNH</> : <><FaPrint/> XEM TRƯỚC HÓA ĐƠN</>}
        </FrdModal.Header>

        <div className="frd-print-scroll printable-area">
          {printData && (
            <>
              {printData.printType === 'ticket' ? (
                <div className="frd-ticket-wrap">
                  <h6 className="frd-ticket-clinic-name">PK ĐA KHOA EASY MEDIFY</h6>
                  <div className="frd-ticket-clinic-addr">123 Đường Sức Khỏe, Quận 1, TP.HCM</div>
                  <div className="frdeskpage-ticket-divider"/>
                  <h5 className="frd-ticket-title">PHIẾU SỐ THỨ TỰ</h5>
                  <div className="frd-ticket-subtitle">(Vui lòng theo dõi màn hình)</div>
                  
                  <div className="frd-ticket-number-box">
                    <div className="frd-ticket-number-label">Số của bạn</div>
                    <div className="frd-ticket-number-val" style={{fontSize: '56px'}}>
                      {/* [SỬA]: IN RA CHUỖI HIỂN THỊ CÓ CHỮ U HOẶC N */}
                      {printData.display_queue || printData.payment_queue_number || '--'}
                    </div>
                  </div>
                  
                  <div className="frd-ticket-details">
                    <div className="frd-ticket-details-grid">
                      <span className="frdeskpage-ticket-label">Khách hàng:</span>
                      <span className="frdeskpage-ticket-value">{printData.guest_name || printData.Patient?.User?.full_name}</span>
                      <span className="frdeskpage-ticket-label">Mã hồ sơ:</span>
                      <span className="frdeskpage-ticket-value">{printData.code}</span>
                      <span className="frdeskpage-ticket-label">Dịch vụ:</span>
                      <span className="frdeskpage-ticket-value">{printData.Service?.name}</span>
                    </div>
                  </div>
                  <div className="frdeskpage-ticket-divider"/>
                  <div className="frd-ticket-footer">
                    <span>Giờ lấy số: {new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="frd-fw-700"><FaSmile /> Xin cảm ơn!</span>
                  </div>
                </div>
              ) : (
                <div className="frd-invoice-wrap">
                    {/* ... Hóa đơn in như cũ ... */}
                </div>
              )}
            </>
          )}
        </div>

        <FrdModal.Footer className="frdeskpage-no-print frd-print-footer">
          <button className="frdeskpage-btn frdeskpage-btn-ghost frdeskpage-btn-lg frdeskpage-flex-1" onClick={() => setShowPrintModal(false)}>
            ĐÓNG
          </button>
          <button className="frdeskpage-btn frdeskpage-btn-primary frdeskpage-btn-lg frdeskpage-flex-1" onClick={() => window.print()}>
            <FaPrint /> IN NGAY
          </button>
        </FrdModal.Footer>
      </FrdModal>

      {/* MODAL: CẬP NHẬT THANH TOÁN TẠI QUẦY */}
      <FrdModal show={showPaymentUpdateModal} onHide={() => setShowPaymentUpdateModal(false)} size="md">
        <FrdModal.Header onHide={() => setShowPaymentUpdateModal(false)}>
          <FaMoneyBillWave /> Thanh toán tại quầy
        </FrdModal.Header>
        <FrdModal.Body>
          {selectedApptForPayment && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Thông tin appointment */}
              <div style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '6px',
                borderLeft: '4px solid #2196F3'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px' }}>
                  📋 {selectedApptForPayment.code} - {selectedApptForPayment.guest_name || selectedApptForPayment.Patient?.User?.full_name}
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>
                  🏥 Dịch vụ: {selectedApptForPayment.Service?.name}
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>
                  💰 Giá: <strong>{(selectedApptForPayment.Service?.price || 0).toLocaleString('vi-VN')} VNĐ</strong>
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#d32f2f' }}>
                  ⚠️ Phương thức ban đầu: <strong>{selectedApptForPayment.payment_method || 'Chưa xác định'}</strong>
                </p>
              </div>

              {/* Form thanh toán */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  🔄 Phương thức thanh toán thực tế *
                </label>
                <select
                  value={paymentUpdateForm.payment_method}
                  onChange={(e) => setPaymentUpdateForm({ ...paymentUpdateForm, payment_method: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="transfer">Chuyển khoản</option>
                </select>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#666' }}>
                  {paymentUpdateForm.payment_method === 'cash' 
                    ? 'Bệnh nhân thanh toán bằng tiền mặt tại quầy'
                    : 'Bệnh nhân thanh toán bằng chuyển khoản ngân hàng (đã nhận tiền)'}
                </p>
              </div>

              {/* Số tiền */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  Số tiền thanh toán *
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentUpdateForm.amount}
                  onChange={(e) => setPaymentUpdateForm({ ...paymentUpdateForm, amount: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Info */}
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                padding: '10px',
                fontSize: '12px',
                color: '#856404'
              }}>
                <strong>ℹ️ Lưu ý:</strong> Khi nhấn "Xác nhận", hệ thống sẽ:
                <ul style={{ margin: '6px 0 0 16px', paddingLeft: '0' }}>
                  <li>Cập nhật trạng thái thanh toán = "Đã thanh toán tại quầy"</li>
                  <li>Xác nhận tự động lịch hẹn</li>
                  <li>Gửi thông báo cho bác sĩ</li>
                </ul>
              </div>
            </div>
          )}
        </FrdModal.Body>
        <FrdModal.Footer>
          <button 
            className="frdeskpage-btn frdeskpage-btn-secondary"
            onClick={() => setShowPaymentUpdateModal(false)}
            disabled={updatingPayment}
          >
            <FaTimes /> Hủy
          </button>
          <button 
            className="frdeskpage-btn frdeskpage-btn-success"
            onClick={handleUpdatePaymentAtClinic}
            disabled={updatingPayment}
            style={{ cursor: updatingPayment ? 'not-allowed' : 'pointer' }}
          >
            {updatingPayment ? <FaSpinner className="fa-spin" /> : <FaCheckCircle />}
            {updatingPayment ? ' Đang xử lý...' : ' Xác nhận thanh toán'}
          </button>
        </FrdModal.Footer>
      </FrdModal>
    </div>
  );
};

export default FrontDeskPage;
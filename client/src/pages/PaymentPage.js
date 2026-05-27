// client/src/pages/PaymentPage.js
// PHIÊN BẢN FINAL FIX: HIỂN THỊ ĐÚNG TÊN BÁC SĨ & KHÁCH HÀNG TRONG HÓA ĐƠN

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaCreditCard, FaQrcode, FaUniversity, FaWallet, 
  FaCheckCircle, FaArrowLeft, FaSpinner, FaLock, 
  FaInfoCircle, FaCopy, FaCamera, FaCheck, 
  FaClock, FaExclamationTriangle, FaMoneyBillWave,
  FaPrint, FaHome, FaCalendarCheck, FaFileInvoice
} from 'react-icons/fa';

// Import Services
import appointmentService from '../services/appointmentService';
import consultationService from '../services/consultationService';
import paymentService from '../services/paymentService';

import './PaymentPage.css';

const PaymentPage = () => {
  const { appointmentId, consultationId: consultationIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { consultation_id, type, preAppliedAmount, originalAmount, discountAmount, promotionId } = location.state || {}; 
  const consultationTargetId = consultationIdParam || consultation_id || null;
  const paymentType = type || (consultationTargetId ? 'consultation' : 'appointment');

  // Refs
  const fileInputRef = useRef(null);

  // State
  const [appointment, setAppointment] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [processing, setProcessing] = useState(false); 
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(''); 
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [uploadedBill, setUploadedBill] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  // --- THÊM STATE CHO VOUCHER ---
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]); // ✅ LƯU DANH SÁCH MÃ TỪ VÍ

  // ========== INIT ==========
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAppointmentDetails(),
          fetchPaymentConfig(),
          fetchMyVouchers() // ✅ GỌI API LẤY VÍ VOUCHER
        ]);
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [appointmentId, consultationTargetId, paymentType]);

  // ✅ HÀM LẤY DANH SÁCH VÍ VOUCHER CỦA USER
  const fetchMyVouchers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/marketing/my-vouchers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyVouchers(data.vouchers);
      }
    } catch (err) { console.error('Lỗi tải ví voucher:', err); }
  };
      

  // Timer logic
  useEffect(() => {
    if (appointment && appointment.payment_hold_until && paymentStatus !== 'completed') {
      const holdUntil = new Date(appointment.payment_hold_until);
      const now = new Date();
      const diff = Math.floor((holdUntil - now) / 1000);

      if (diff > 0) {
        setTimeLeft(diff);
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setTimerExpired(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      } else {
        setTimerExpired(true);
      }
    }
  }, [appointment, paymentStatus]);

  // Polling logic
  useEffect(() => {
    let intervalId;
    if (selectedMethod === 'bank_transfer' && paymentStatus !== 'completed') {
      intervalId = setInterval(async () => {
        try {
            let isPaid = false;
            if (paymentType === 'consultation' && consultationTargetId) {
              const res = await consultationService.getConsultationById(consultationTargetId);
                if (res.data.success && 
                    (res.data.data.payment_status === 'paid_online' || 
                     res.data.data.payment_status === 'paid_at_clinic')) {
                    isPaid = true;
                }
            } 
            else if (appointmentId) {
                const res = await appointmentService.getAppointmentById(appointmentId);
                if (res.data.success) {
                    const appt = res.data.data;
                    if (
                        appt.payment_status === 'paid_online' || 
                        appt.payment_status === 'paid_at_clinic' ||
                    (appt.Payment && appt.Payment.status === 'paid')
                    ) {
                        isPaid = true;
                    }
                }
            }

            if (isPaid) {
                setPaymentStatus('completed');
                toast.success('Đã nhận được tiền! Thanh toán thành công.');
                clearInterval(intervalId);
            }
        } catch (err) {}
      }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [selectedMethod, paymentStatus, consultationTargetId, appointmentId, paymentType]);

  // Tự động quay về trang chi tiết sau khi hệ thống xác nhận đã thanh toán
  useEffect(() => {
    if (paymentStatus !== 'completed' || !appointment) return;

    const timerId = setTimeout(() => {
      if (appointment.type === 'consultation') {
        navigate(`/tu-van/${consultationTargetId || appointment.id}`);
      } else {
        navigate(`/lich-hen/${appointment.code}`);
      }
    }, 2000);

    return () => clearTimeout(timerId);
  }, [paymentStatus, appointment, consultationTargetId, navigate]);

  // ========== API CALLS ==========

  const fetchPaymentConfig = async () => {
    try {
      const res = await paymentService.getPaymentConfig();
      if (res.data.success) {
        const settings = res.data.data;
        setConfig(settings);
        if (settings.bank?.enabled) setSelectedMethod('bank_transfer');
        else if (settings.vnpay?.enabled) setSelectedMethod('vnpay');
        else if (settings.momo?.enabled) setSelectedMethod('momo');
        else if (settings.cash?.enabled) setSelectedMethod('cash');
      }
    } catch (error) { toast.error('Không thể tải cấu hình thanh toán.'); }
  };

  const fetchAppointmentDetails = async () => {
    try {
      let res, data;
      if (paymentType === 'consultation' && consultationTargetId) {
      // --- TƯ VẤN ---
      res = await consultationService.getConsultationById(consultationTargetId);
      if (res.data.success) {
        data = res.data.data;
        setAppointment({
          id: data.id,
          code: data.consultation_code,
          amount: data.total_fee,
          serviceName: `Tư vấn trực tuyến (${data.package?.name || 'Gói chuẩn'})`,
          doctorName: data.doctor?.full_name || 'Hệ thống chỉ định',
          patientName: data.patient?.full_name || 'Bạn',
          time: data.appointment_time,
          payment_status: data.payment_status,
          payment_hold_until: data.payment_due_at,
          type: 'consultation'
        });
        if (data.payment_status === 'paid_online' || data.payment_status === 'paid_at_clinic') {
          setPaymentStatus('completed');
        }
      }
    } else {
      // --- LỊCH HẸN KHÁM ---
      res = await appointmentService.getAppointmentByCode(appointmentId);
      if (res.data.success) {
        data = res.data.data;
        const docName = data.Doctor?.user?.full_name || data.Doctor?.User?.full_name;
        const patName = data.Patient?.user?.full_name || data.Patient?.User?.full_name || data.guest_name;

        // Lấy amount thực từ Payment record (đã trừ discount khi đặt lịch)
        const paymentAmount = data.Payment?.amount 
          ? parseFloat(data.Payment.amount) 
          : data.Service?.price;
        const actualAmount = preAppliedAmount || paymentAmount;
        const basePrice = originalAmount || data.Service?.price;

        setAppointment({
          id: data.id,
          code: data.code,
          amount: actualAmount,           // ✅ Giá thực sau discount
          originalAmount: basePrice,      // Giá gốc để hiển thị "Tạm tính"
          serviceName: data.Service?.name,
          serviceId: data.Service?.id,
          doctorName: docName || 'Chưa phân công',
          patientName: patName || 'Bạn',
          time: `${data.appointment_date} ${data.appointment_start_time}`,
          payment_status: data.payment_status,
          payment_hold_until: data.payment_hold_until,
          type: 'appointment'
        });

        // ✅ Tự động hiển thị discount nếu có (từ state navigate hoặc từ Payment record)
        const appliedDiscount = discountAmount || (basePrice - actualAmount);
        if (appliedDiscount > 0) {
          setAppliedVoucher({
            code: 'Đã áp dụng',
            discount_amount: appliedDiscount,
            final_amount: actualAmount,
            promotion_id: promotionId || null
          });
        }

        if (data.payment_status === 'paid_online' || data.payment_status === 'paid_at_clinic') {
          setPaymentStatus('completed');
        }
      }
    }
    } catch (err) { setError(err.message || 'Lỗi tải thông tin đơn hàng'); }
  };

  // --- HÀM XỬ LÝ ÁP DỤNG VÀ HỦY VOUCHER ---
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return toast.warning('Vui lòng nhập mã voucher');
    setApplyingVoucher(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/marketing/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: voucherCode,
          order_type: appointment.type === 'consultation' ? 'consultation' : 'service',
          total_amount: appointment.amount,
          item_id: appointment.type === 'consultation' ? consultationTargetId : appointment.serviceId
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setAppliedVoucher(data.discount);
      } else {
        toast.error(data.message);
        setAppliedVoucher(null);
      }
    } catch (error) { toast.error('Lỗi kết nối kiểm tra mã!'); }
    setApplyingVoucher(false);
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setAppliedVoucher(null);
    toast.info('Đã gỡ mã giảm giá');
  };

  const handlePayment = async () => {
    if (!selectedMethod) return toast.warning('Vui lòng chọn phương thức');
    if (selectedMethod === 'momo' && config?.momo?.mode === 'personal' && !uploadedBill) {
      return toast.warning('Vui lòng tải lên ảnh chụp màn hình giao dịch');
    }

    setProcessing(true);
    try {


      const finalAmount = appliedVoucher ? appliedVoucher.final_amount : appointment.amount;

      const payload = {
      payment_method: selectedMethod,
      proof_image_url: uploadedBill ? uploadedBill.preview : null,
      promotion_id: appliedVoucher ? appliedVoucher.promotion_id : null,
      discount_amount: appliedVoucher ? appliedVoucher.discount_amount : 0,
      amount: appliedVoucher ? appliedVoucher.final_amount : appointment.amount  // ✅ THÊM DÒNG NÀY
    };

      let res;
      if (appointment.type === 'consultation') {
        payload.consultation_id = consultationTargetId;
        res = await paymentService.createConsultationPayment(payload);
      } else {
        payload.appointment_id = appointmentId;
        res = await paymentService.createPayment(payload);
      }

      if (res.data.success) {
        const { paymentUrl } = res.data;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          if (selectedMethod === 'bank_transfer') {
              toast.info('Đơn hàng đã tạo. Vui lòng chuyển khoản.');
          } else {
              toast.success('Gửi yêu cầu thành công! Chờ xác nhận.');
              setPaymentStatus('pending_approval');
          }
        }
      } else {
        toast.error(res.data.message);
      }
    } catch (error) { toast.error('Có lỗi xảy ra.'); } finally { setProcessing(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedBill({ file, preview: reader.result, name: file.name });
      reader.readAsDataURL(file);
    } else { toast.error('Ảnh quá lớn (>5MB)'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép!');
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ========== RENDER ==========

  if (loading) return <div className="payment-page-loading"><FaSpinner className="payment-page-spin" /> Đang tải dữ liệu...</div>;
  if (error) return <div className="payment-page-error">{error}</div>;

  // --- GIAO DIỆN HÓA ĐƠN THANH TOÁN THÀNH CÔNG ---
  if (paymentStatus === 'completed') {
    return (
      <div className="payment-page-wrapper">
        <div className="payment-page-invoice-container animate-fade-in">
          
          {/* Header Hóa đơn */}
          <div className="payment-page-invoice-header">
             <div className="invoice-icon-box"><FaCheckCircle /></div>
             <h2 className="invoice-title">Thanh Toán Thành Công!</h2>
             <p className="invoice-subtitle">Cảm ơn bạn đã sử dụng dịch vụ y tế của chúng tôi.</p>
          </div>

          {/* Body Hóa đơn */}
          <div className="payment-page-invoice-body">
             <div className="invoice-row-highlight">
                <span className="label">Mã hóa đơn:</span>
                <span className="value text-primary">{appointment?.code}</span>
             </div>

             <div className="invoice-divider"></div>

             <div className="invoice-details-grid">
                <div className="invoice-item">
                   <span className="label">Khách hàng:</span>
                   {/* ✅ SỬA: Hiển thị tên bệnh nhân lấy từ API */}
                   <span className="value">{appointment?.patientName}</span>
                </div>
                <div className="invoice-item">
                   <span className="label">Bác sĩ:</span>
                   {/* ✅ SỬA: Hiển thị tên bác sĩ lấy từ API */}
                   <span className="value">{appointment?.doctorName}</span>
                </div>
                <div className="invoice-item">
                   <span className="label">Dịch vụ:</span>
                   <span className="value">{appointment?.serviceName}</span>
                </div>
                <div className="invoice-item">
                   <span className="label">Thời gian:</span>
                   <span className="value">{new Date(appointment?.time).toLocaleString('vi-VN')}</span>
                </div>
                <div className="invoice-item">
                   <span className="label">Phương thức:</span>
                   <span className="value text-uppercase">
                      {selectedMethod === 'bank_transfer' ? 'Chuyển khoản' : selectedMethod || 'Đã thanh toán'}
                   </span>
                </div>
             </div>

             <div className="invoice-total-box">
              <span>Tổng thanh toán</span>
              <span className="amount">
                {formatCurrency(appliedVoucher ? appliedVoucher.final_amount : (appointment?.amount || 0))}
              </span>
            </div>

             <div className="invoice-status-badge">
                <FaCheckCircle className="me-1"/> Đã xác nhận thanh toán
             </div>
          </div>

          {/* Footer Actions */}
          <div className="payment-page-invoice-actions">
             <button className="payment-page-btn-secondary" onClick={() => window.print()}>
               <FaPrint /> In hóa đơn
             </button>
             <button className="payment-page-btn-secondary" onClick={() => navigate('/lich-hen-cua-toi')}>
               <FaCalendarCheck /> Xem lịch hẹn
             </button>
             <button className="payment-page-btn-primary" onClick={() => navigate('/')}>
               <FaHome /> Về trang chủ
             </button>
          </div>

        </div>
      </div>
    );
  }

  // --- GIAO DIỆN CHỜ DUYỆT ---
  if (paymentStatus === 'pending_approval') {
      return (
        <div className="payment-page-wrapper">
            <div className="payment-page-pending-box">
                <FaClock className="pending-icon" />
                <h3>Đang chờ xác nhận...</h3>
                <p>Hệ thống đã ghi nhận yêu cầu. Vui lòng chờ Admin duyệt trong giây lát.</p>
                <button className="payment-page-btn-primary" onClick={() => navigate('/lich-hen-cua-toi')}>
                   Quay lại danh sách
                </button>
            </div>
        </div>
      );
  }

  // --- GIAO DIỆN FORM THANH TOÁN ---
  return (
    <div className="payment-page-wrapper">
      <div className="payment-page-container">
        
        {/* Cột Trái */}
        <div className="payment-page-left-col">
          <div className="payment-page-card">
             <div className="payment-page-card-header">
                <FaWallet className="me-2"/> Phương Thức Thanh Toán
             </div>
             <div className="payment-page-card-body">
                
                <div className="payment-page-methods-grid">
                  {config?.bank?.enabled && (
                    <div className={`payment-page-method-item ${selectedMethod === 'bank_transfer' ? 'active' : ''}`} onClick={() => setSelectedMethod('bank_transfer')}>
                        <FaUniversity className="icon text-success"/>
                        <div className="info">
                           <div className="name">Chuyển khoản VietQR</div>
                           <div className="desc">Quét mã - Tự động xác nhận</div>
                        </div>
                        {selectedMethod === 'bank_transfer' && <FaCheckCircle className="check"/>}
                    </div>
                  )}
                  {/* ... (Giữ nguyên các method khác) ... */}
                  {config?.momo?.enabled && (
                    <div className={`payment-page-method-item ${selectedMethod === 'momo' ? 'active' : ''}`} onClick={() => setSelectedMethod('momo')}>
                        <FaQrcode className="icon text-pink"/>
                        <div className="info">
                           <div className="name">Ví MoMo</div>
                           <div className="desc">{config.momo.mode === 'personal' ? 'Quét mã cá nhân' : 'Cổng thanh toán'}</div>
                        </div>
                        {selectedMethod === 'momo' && <FaCheckCircle className="check"/>}
                    </div>
                  )}
                  {config?.vnpay?.enabled && (
                    <div className={`payment-page-method-item ${selectedMethod === 'vnpay' ? 'active' : ''}`} onClick={() => setSelectedMethod('vnpay')}>
                        <FaCreditCard className="icon text-blue"/>
                        <div className="info">
                           <div className="name">VNPAY</div>
                           <div className="desc">Thẻ ATM / Visa / QR Pay</div>
                        </div>
                        {selectedMethod === 'vnpay' && <FaCheckCircle className="check"/>}
                    </div>
                  )}
                  {config?.cash?.enabled && (
                    <div className={`payment-page-method-item ${selectedMethod === 'cash' ? 'active' : ''}`} onClick={() => setSelectedMethod('cash')}>
                        <FaMoneyBillWave className="icon text-orange"/>
                        <div className="info">
                           <div className="name">Tiền mặt</div>
                           <div className="desc">Thanh toán tại quầy</div>
                        </div>
                        {selectedMethod === 'cash' && <FaCheckCircle className="check"/>}
                    </div>
                  )}
                </div>

                <div className="payment-page-divider"></div>

                {/* Chi tiết VietQR */}
                {selectedMethod === 'bank_transfer' && config?.bank && (
                   <div className="payment-page-detail-section">
                      <div className="bank-transfer-layout">
                         <div className="qr-block">
                            <img 
                                src={`https://img.vietqr.io/image/${config.bank.bank_name}-${config.bank.account_no}-compact.png?amount=${appliedVoucher ? appliedVoucher.final_amount : appointment.amount}&addInfo=TKPQT2 ${appointment.code}`}
                                alt="VietQR" 
                            />
                            <span className="small-note">Quét bằng App Ngân hàng</span>
                         </div>
                         <div className="info-block">
                            <div className="info-row">
                               <span>Ngân hàng:</span> <strong>{config.bank.bank_name}</strong>
                            </div>
                            <div className="info-row">
                               <span>Chủ TK:</span> <strong>{config.bank.account_name}</strong>
                            </div>
                            <div className="info-row">
                               <span>Số TK:</span> 
                               <div className="copy-wrapper">
                                  <strong className="text-primary">{config.bank.account_no}</strong>
                                  <FaCopy onClick={() => copyToClipboard(config.bank.account_no)}/>
                               </div>
                            </div>
                            <div className="info-row highlight">
                               <span>Số tiền:</span> <strong className="text-danger">{formatCurrency(appliedVoucher ? appliedVoucher.final_amount : appointment.amount)}</strong>
                            </div>
                            <div className="info-row highlight-box">
                               <span>Nội dung:</span> 
                               <div className="copy-wrapper">
                                  <strong className="text-danger">TKPQT2 {appointment.code}</strong>
                                  <FaCopy onClick={() => copyToClipboard(`TKPQT2 ${appointment.code}`)}/>
                               </div>
                            </div>
                            <div className="auto-check-msg">
                               <FaSpinner className="payment-page-spin"/> Đang chờ tiền về... (Tự động)
                            </div>
                         </div>
                      </div>
                   </div>
                )}

                {/* Chi tiết Momo */}
                {selectedMethod === 'momo' && config?.momo && (
                    <div className="payment-page-detail-section">
                       {config.momo.mode === 'personal' ? (
                          <div className="momo-personal-layout">
                             <div className="alert-warning-box">
                                <FaExclamationTriangle/> Chế độ Test: Quét mã & Tải ảnh biên lai
                             </div>
                             <div className="qr-upload-flex">
                                <div className="qr-side">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://me.momo.vn/${config.momo.phone_number}/${appointment.amount}`} 
                                        alt="Momo QR" 
                                    />
                                    <div className="phone-tag">{config.momo.phone_number}</div>
                                </div>
                                <div className="upload-side" onClick={() => fileInputRef.current.click()}>
                                    <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*"/>
                                    {uploadedBill ? (
                                        <div className="file-preview">
                                           <img src={uploadedBill.preview} alt="Bill" />
                                           <span><FaCheck/> Đã chọn ảnh</span>
                                        </div>
                                    ) : (
                                        <div className="upload-placeholder">
                                           <FaCamera className="cam-icon"/>
                                           <span>Tải ảnh biên lai</span>
                                        </div>
                                    )}
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="gateway-msg">
                             <img src="/assets/images/momo-logo.png" alt="MoMo" width="50"/>
                             <p>Bạn sẽ được chuyển sang ứng dụng MoMo.</p>
                          </div>
                       )}
                    </div>
                )}

                <div className="payment-page-form-actions">
                   <button className="payment-page-btn-secondary" onClick={() => navigate(-1)}>
                      <FaArrowLeft/> Quay lại
                   </button>

                   {/* Ẩn nút Thanh toán khi chọn VietQR */}
                   {selectedMethod !== 'bank_transfer' && (
                       <button 
                          className="payment-page-btn-primary large" 
                          onClick={handlePayment}
                          disabled={processing || !selectedMethod}
                       >
                          {processing ? <><FaSpinner className="payment-page-spin"/> Đang xử lý...</> : <><FaLock/> Thanh Toán Ngay</>}
                       </button>
                   )}
                </div>

             </div>
          </div>
        </div>

        {/* Cột Phải */}
        <div className="payment-page-right-col">
           <div className="payment-page-card summary-card">
              <div className="payment-page-card-header bg-primary-light text-primary">
                 <FaFileInvoice className="me-2"/> Thông Tin Đơn Hàng
              </div>
              <div className="payment-page-card-body p-4">
                 <div className="summary-row">
                    <span>Mã hồ sơ:</span>
                    <span className="fw-bold">{appointment?.code}</span>
                 </div>
                 <div className="summary-row">
                    <span>Dịch vụ:</span>
                    <span className="fw-bold text-end" style={{maxWidth:'60%'}}>{appointment?.serviceName}</span>
                 </div>
                 <div className="summary-row">
                    <span>Bác sĩ:</span>
                    <span className="fw-bold">{appointment?.doctorName || '---'}</span>
                 </div>
                 <div className="summary-row">
                    <span>Thời gian:</span>
                    <span className="text-end">{new Date(appointment?.time).toLocaleString('vi-VN')}</span>
                 </div>
                 
                 <div className="summary-divider"></div>

                 {/* --- KHU VỰC CHỌN VOUCHER CỦA TÔI --- */}
                 <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexDirection: 'column' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#555' }}>Ưu đãi của bạn:</label>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <select 
                             value={voucherCode}
                             onChange={(e) => setVoucherCode(e.target.value)}
                             disabled={!!appliedVoucher}
                             style={{ flex: 1, padding: '10px 12px', border: '1px solid #00b894', borderRadius: '6px', backgroundColor: '#f4fffb' }}
                          >
                             <option value="">-- Chọn mã giảm giá từ Ví của bạn --</option>
                             {myVouchers.length === 0 && <option value="" disabled>Ví của bạn đang trống</option>}
                             {myVouchers.map(v => {
                                const applyMap = { 'all': 'Tất cả', 'service': 'Dịch vụ', 'medicine': 'Thuốc', 'consultation': 'Tư vấn', 'shipping': 'Freeship' };
                                return (
                                  <option key={v.id} value={v.Promotion.code}>
                                     {v.Promotion.code} - Giảm {v.Promotion.discount_type === 'percentage' ? `${v.Promotion.discount_value}%` : `${parseInt(v.Promotion.discount_value).toLocaleString('vi-VN')}đ`} (Dùng cho: {applyMap[v.Promotion.apply_for] || 'Khác'})
                                  </option>
                                );
                             })}
                          </select>

                          {appliedVoucher ? (
                             <button onClick={handleRemoveVoucher} style={{ padding: '0 15px', background: '#d63031', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Hủy mã</button>
                          ) : (
                             <button onClick={handleApplyVoucher} disabled={applyingVoucher || !voucherCode} style={{ padding: '0 15px', background: '#00b894', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {applyingVoucher ? 'Đang thử...' : 'Áp dụng'}
                             </button>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="summary-divider"></div>

                 {/* TÁCH BẠCH RÕ RÀNG TIỀN TRƯỚC VÀ SAU KHI GIẢM */}
                 <div className="summary-row">
                  <span>Tạm tính:</span>
                  <span>{formatCurrency(appointment?.originalAmount || appointment?.amount || 0)}</span>
                </div>

                 {appliedVoucher && (
                   <div className="summary-row" style={{ color: '#00b894', fontWeight: 'bold' }}>
                      <span>Khuyến mãi ({appliedVoucher.code}):</span>
                      <span>- {formatCurrency(appliedVoucher.discount_amount)}</span>
                   </div>
                 )}

                 <div className="summary-divider" style={{ borderTop: '2px dashed #eee', margin: '15px 0' }}></div>

                 <div className="summary-total" style={{ fontSize: '1.3rem' }}>
                    <span>Tổng thanh toán</span>
                    <span className="amount">{formatCurrency(appliedVoucher ? appliedVoucher.final_amount : (appointment?.amount || 0))}</span>
                 </div>
              </div>
            </div>
           {!timerExpired && timeLeft > 0 && (
              <div className="payment-page-timer-widget">
                 <FaClock className="timer-icon"/>
                 <div className="timer-text">Thời gian giữ chỗ</div>
                 <div className="timer-countdown">{formatTimer(timeLeft)}</div>
              </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default PaymentPage;
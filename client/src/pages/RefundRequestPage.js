// client/src/pages/RefundRequestPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import paymentService from '../services/paymentService';
import systemService from '../services/systemService';
import { 
  FaSearch, FaFilter, FaMoneyBillWave, FaEye, FaCheck, FaTimes, 
  FaQrcode, FaFileUpload, FaPaperPlane, FaUserCheck, FaHourglassHalf,
  FaCheckCircle, FaHospital, FaInfoCircle, FaExclamationTriangle
} from 'react-icons/fa';
import './RefundRequestPage.css';

const REQUEST_STATUS_META = {
  pending: { icon: FaHourglassHalf, label: 'Chờ xử lý' },
  completed: { icon: FaCheckCircle, label: 'Đã hoàn tất' },
  rejected: { icon: FaTimes, label: 'Đã từ chối' }
};

const REFUND_TYPE_META = {
  consultation: { icon: FaQrcode, label: 'Tư vấn' },
  appointment: { icon: FaHospital, label: 'Lịch hẹn' }
};

const RefundRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundPolicy, setRefundPolicy] = useState(null); // Policy từ cấu hình hệ thống
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'appointment' | 'consultation'
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [policyVerdict, setPolicyVerdict] = useState(null); // Kết quả đối chiếu điều khoản
  
  // Process Data
  const [processData, setProcessData] = useState({
    refund_ref: '',
    admin_note: '',
    proof_file: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchPolicy();
  }, [filterStatus]);

  const fetchPolicy = async () => {
    try {
      const res = await systemService.getRefundPolicy();
      // systemService.getRefundPolicy() trả về response.data trực tiếp
      // nên res = { success: true, data: { enable_refund, appointment, consultation, ... } }
      // hoặc res = default object nếu lỗi
      const policyData = res?.data || res;
      setRefundPolicy(policyData);
    } catch (e) {
      // Không crash nếa không lấy được policy
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await paymentService.getRefundRequests({ status: filterStatus });
      const data = res.data?.data && Array.isArray(res.data.data) ? res.data.data : [];
      setRequests(data);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi tải dữ liệu');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đối chiếu yêu cầu hoàn tiền với điều khoản hiện hành
   * Trả về: { eligible: bool, reason: string, expected_percent: number, warning: string|null }
   */
  const checkPolicyCompliance = (req) => {
    if (!refundPolicy) return { eligible: null, reason: 'Chưa tải được chính sách', warning: null };
    if (!refundPolicy.enable_refund) return { eligible: false, reason: 'Hệ thống đang tắt chức năng hoàn tiền', warning: null };
    
    const orderType = req.order_type || (req.Payment?.Consultation ? 'consultation' : 'appointment');
    const rules = refundPolicy[orderType]?.rules || [];
    const hoursLeft = req.hours_before_appointment;
    const policySnapshot = req.policy_snapshot;

    // Kiểm tra lỗi hệ thống (luôn được hoàn 100%)
    const cancelReason = req.reason?.toLowerCase() || '';
    const isSystemFault = cancelReason.includes('bác sĩ hủy') || cancelReason.includes('doctor cancel')
      || cancelReason.includes('sự cố') || cancelReason.includes('kỹ thuật');
    if (isSystemFault) {
      return { eligible: true, reason: 'Lỗi hệ thống / Bác sĩ hủy → Hoàn 100% theo cam kết', expected_percent: 100, warning: null };
    }

    if (hoursLeft === null) {
      return { eligible: null, reason: 'Không xác định được thời điểm hủy', warning: 'Cần kiểm tra thủ công' };
    }

    // Đối chiếu với rules trong policy
    const matchedRule = [...rules]
      .sort((a, b) => b.hours_before - a.hours_before)
      .find(rule => hoursLeft >= rule.hours_before);
    
    const snapshotPercent = policySnapshot?.applied_percent ?? policySnapshot?.refund_percent ?? null;
    const expectedPercent = matchedRule ? matchedRule.refund_percent : 0;
    
    let warning = null;
    if (snapshotPercent !== null && snapshotPercent !== expectedPercent) {
      warning = `Chính sách đã thay đổi: Lúc hủy áp dụng ${snapshotPercent}%, hiện tại quy định ${expectedPercent}%`;
    }

    if (expectedPercent === 0) {
      return { 
        eligible: false, 
        reason: `Hủy trước ${hoursLeft.toFixed(1)} giờ — không đủ điều kiện hoàn tiền theo chính sách hiện tại`,
        expected_percent: 0,
        booking_fee: refundPolicy[orderType]?.booking_fee || 0,
        actual_refund_amount: 0,
        warning
      };
    }

    const bookingFee = refundPolicy[orderType]?.booking_fee || 0;
    const amountOriginal = parseFloat(req.amount_original || 0);
    const refundBeforeFee = (amountOriginal * expectedPercent) / 100;
    const actualRefund = Math.max(0, refundBeforeFee - bookingFee);

    return {
      eligible: true,
      reason: `Hủy trước ${hoursLeft.toFixed(1)} giờ → Đủ điều kiện hoàn ${expectedPercent}% theo chính sách`,
      expected_percent: expectedPercent,
      booking_fee: bookingFee,
      actual_refund_amount: actualRefund,
      warning
    };
  };

  // Filter Logic
  const getRequestCode = (req) => {
    return req.Payment?.Appointment?.code
      || req.Payment?.Consultation?.consultation_code
      || req.Appointment?.code
      || req.Consultation?.consultation_code
      || req.id.toString();
  };

  const filteredRequests = requests.filter(req => {
    const term = searchTerm.toLowerCase();
    const code = getRequestCode(req);
    const user = req.User?.full_name?.toLowerCase() || '';
    return code.toLowerCase().includes(term) || user.includes(term);
  });

  // Action Handlers
  const handleOpenProcess = (req) => {
    const verdict = checkPolicyCompliance(req);
    // Gắn số tiền thực hoàn vào req để QR tự động dùng
    const enrichedReq = {
      ...req,
      _calculated_refund_amount: verdict.actual_refund_amount ?? req.refund_amount
    };
    setSelectedReq(enrichedReq);
    setProcessData({ refund_ref: '', admin_note: '', proof_file: null });
    setPolicyVerdict(verdict);
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setProcessData({ ...processData, proof_file: e.target.files[0] });
    }
  };

  const handleSubmit = async (action) => {
    if (action === 'completed') {
      if (!processData.refund_ref) return toast.warning('Vui lòng nhập mã giao dịch tham chiếu!');
      if (!processData.proof_file) return toast.warning('Vui lòng tải lên ảnh biên lai chuyển tiền!');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', action);
      formData.append('admin_note', processData.admin_note);
      if (action === 'completed') {
        formData.append('refund_ref', processData.refund_ref);
        formData.append('proof_image', processData.proof_file);
      }

      await paymentService.processRefundRequest(selectedReq.id, formData);
      
      toast.success(action === 'completed' ? 'Đã hoàn tiền & gửi mail cho khách!' : 'Đã từ chối yêu cầu');
      
      // Cập nhật selectedReq sang trạng thái đã xử lý → modal chuyển sang view mode ngay
      setSelectedReq(prev => ({
        ...prev,
        status: action,
        refund_ref: processData.refund_ref || prev.refund_ref,
        admin_note: processData.admin_note || prev.admin_note,
      }));
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi xử lý yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: Tạo link QR VietQR
  // Map tên ngân hàng phổ biến sang BIN VietQR
  const BANK_BIN_MAP = {
    'tpbank': '970423', 'tp bank': '970423',
    'vietcombank': '970436', 'vcb': '970436',
    'techcombank': '970407', 'tcb': '970407',
    'mbbank': '970422', 'mb': '970422',
    'bidv': '970418',
    'agribank': '970405',
    'vietinbank': '970415', 'ctg': '970415',
    'acb': '970416',
    'vpbank': '970432',
    'sacombank': '970403',
    'hdbank': '970437',
    'ocb': '970448',
    'msb': '970426',
  };

  const parseBankInfo = (snapshot) => {
    if (!snapshot) return { bank_name: null, account_no: null, account_name: null };
    if (snapshot.account_no) return snapshot; // Đã có structured data
    
    // Parse từ raw_text: "TPBank - STK: 00001360841 - Tên: DO HOAI TANH QUYEN"
    const raw = snapshot.raw_text || '';
    const stkMatch  = raw.match(/STK:\s*(\d+)/i);
    const tenMatch  = raw.match(/Tên:\s*([^-\n]+)/i);
    const bankMatch = raw.match(/^([^-]+)\s*-/i);
    return {
      bank_name:    bankMatch ? bankMatch[1].trim() : raw,
      account_no:   stkMatch  ? stkMatch[1].trim()  : null,
      account_name: tenMatch  ? tenMatch[1].trim()  : null,
    };
  };

  // overrideAmount: số tiền thực cần chuyển (đã trừ booking_fee), truyền vào khi gọi trong modal
  const getQRLink = (req, overrideAmount = null) => {
    if (!req?.bank_info_snapshot) return null;
    const { bank_name, account_no, account_name } = parseBankInfo(req.bank_info_snapshot);
    if (!account_no) return null;

    const binId = BANK_BIN_MAP[bank_name?.toLowerCase()] || '970423';
    const amount = overrideAmount ?? req.refund_amount;
    const desc = `Hoan tien don ${getRequestCode(req)}`;
    return `https://img.vietqr.io/image/${binId}-${account_no}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(desc)}&accountName=${encodeURIComponent(account_name || '')}`;
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatDate = (date) => new Date(date).toLocaleDateString('vi-VN') + ' ' + new Date(date).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});

  return (
    <div className="refund-request-page-container">
      <div className="refund-request-page-header">
        <div className="refund-request-page-title"><FaMoneyBillWave /> Quản Lý Yêu Cầu Hoàn Tiền</div>
        <div className="refund-request-page-filter-bar" style={{margin:0}}>
           {/* Quick Status Tabs */}
           {['pending', 'completed', 'rejected'].map(status => (
             <button 
               key={status}
               className={`refund-request-page-btn-filter ${filterStatus === status ? 'active' : ''}`}
               onClick={() => setFilterStatus(status)}
             >
               {(() => {
                 const StatusIcon = REQUEST_STATUS_META[status]?.icon || FaInfoCircle;
                 return <><StatusIcon /> {REQUEST_STATUS_META[status]?.label || 'Trạng thái'}</>;
               })()}
             </button>
           ))}
        </div>
      </div>

      <div className="refund-request-page-filter-bar">
        <FaSearch className="text-muted" />
        <input 
          type="text" 
          placeholder="Tìm theo mã đơn, tên khách..." 
          className="refund-request-page-input" 
          style={{width: '250px'}}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div style={{flex:1}}></div>
        <span className="text-muted" style={{fontSize:'12px'}}>Hiển thị: <b>{filteredRequests.length}</b> yêu cầu</span>
      </div>

      <div className="refund-request-page-table-wrapper">
        <table className="refund-request-page-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Loại</th>
              <th>Khách hàng</th>
              <th>Số tiền hoàn</th>
              <th>Ngân hàng nhận</th>
              <th>Đối chiếu điều khoản</th>
              <th>Người duyệt</th>
              <th>Ngày tạo / Xử lý</th>
              <th className="text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="text-center py-5">Đang tải dữ liệu...</td></tr>
            ) : filteredRequests.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-5 text-muted">Không tìm thấy dữ liệu phù hợp</td></tr>
            ) : (
              filteredRequests.map(req => {
                const verdict = checkPolicyCompliance(req);
                return (
                <tr key={req.id}>
                  <td>
                    <span style={{fontWeight:'bold', color:'#3b82f6'}}>
                      #{req.order_code || getRequestCode(req)}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize:'11px', fontWeight:600, padding:'2px 6px', borderRadius:'4px',
                      background: req.order_type === 'consultation' ? '#eff6ff' : '#f0fdf4',
                      color: req.order_type === 'consultation' ? '#1d4ed8' : '#047857',
                      border: '1px solid var(--rr-border)'
                    }}>
                      {req.order_type === 'consultation' ? <><FaQrcode /> Tư vấn</> : <><FaHospital /> Lịch hẹn</>}
                    </span>
                  </td>
                  <td>
                    <div style={{fontWeight:600}}>{req.User?.full_name}</div>
                    <div style={{fontSize:'11px', color:'#666'}}>{req.User?.email}</div>
                  </td>
                  <td>
                    {/* Ưu tiên dùng số tiền thực hoàn (đã tính toán lại) */}
                    <div className="refund-request-page-amount">
                      {formatCurrency(verdict.eligible && verdict.actual_refund_amount !== undefined ? verdict.actual_refund_amount : req.refund_amount)}
                    </div>
                    
                    {/* Hiện số tiền cũ trong DB gạch ngang nếu có sự chênh lệch do đổi chính sách */}
                    {verdict.eligible && verdict.actual_refund_amount !== parseFloat(req.refund_amount) && (
                      <div style={{fontSize:'10px', color:'#d97706', textDecoration:'line-through', marginBottom: '2px'}}>
                        Gốc DB: {formatCurrency(req.refund_amount)}
                      </div>
                    )}

                    {req.penalty_fee > 0 && (
                      <div style={{fontSize:'11px', color:'#ef4444'}}>
                        Phí phạt: -{formatCurrency(req.penalty_fee)}
                      </div>
                    )}
                    <div style={{fontSize:'10px', color:'#6b7280'}}>
                      Gốc: {formatCurrency(req.amount_original)}
                    </div>
                    {/* Cập nhật phí giữ chỗ hiển thị từ verdict thực tế */}
                    {(verdict.booking_fee > 0 || req.policy_snapshot?.booking_fee_deducted > 0) && (
                      <div style={{fontSize:'10px', color:'#f59e0b'}}>
                        Phí giữ chỗ: -{formatCurrency(verdict.booking_fee || req.policy_snapshot.booking_fee_deducted)}
                      </div>
                    )}
                  </td>
                  <td>
                    {(() => {
                      // Sử dụng hàm parseBankInfo đã có sẵn để bóc tách dữ liệu
                      const bankInfo = parseBankInfo(req.bank_info_snapshot);
                      const rawText = req.bank_info_snapshot?.raw_text;
                      
                      return (
                        <div style={{fontSize:'12px', lineHeight:'1.4'}}>
                          <b>{bankInfo.bank_name || rawText || 'N/A'}</b><br/>
                          {bankInfo.account_no && <>{bankInfo.account_no}<br/></>}
                          {bankInfo.account_name && <span style={{textTransform:'uppercase', fontSize:'11px'}}>{bankInfo.account_name}</span>}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{maxWidth:'180px'}}>
                    {verdict.eligible === true && (
                      <div style={{fontSize:'11px', color:'#047857', background:'#f0fdf4', padding:'3px 6px', borderRadius:'4px', border:'1px solid #bbf7d0', marginBottom:'3px'}}>
                        <FaCheckCircle /> <span>{verdict.reason}</span>
                      </div>
                    )}
                    {verdict.eligible === false && (
                      <div style={{fontSize:'11px', color:'#b91c1c', background:'#fef2f2', padding:'3px 6px', borderRadius:'4px', border:'1px solid var(--rr-border)', marginBottom:'3px', display:'flex', alignItems:'flex-start', gap:'4px'}}>
                        <FaTimes style={{marginTop:'1px', flexShrink:0}} /> <span>{verdict.reason}</span>
                      </div>
                    )}
                    {verdict.eligible === null && (
                      <div style={{fontSize:'11px', color:'#92400e', background:'#fffbeb', padding:'3px 6px', borderRadius:'4px', border:'1px solid var(--rr-border)', display:'flex', alignItems:'flex-start', gap:'4px'}}>
                        <FaExclamationTriangle style={{marginTop:'1px', flexShrink:0}} /> <span>{verdict.reason}</span>
                      </div>
                    )}
                    {verdict.warning && (
                      <div style={{fontSize:'10px', color:'#d97706', marginTop:'2px'}}>{verdict.warning}</div>
                    )}
                    {req.hours_before_appointment !== null && req.hours_before_appointment !== undefined && (
                      <div style={{fontSize:'10px', color:'#6b7280', marginTop:'2px'}}>
                        Hủy trước: <b>{req.hours_before_appointment}h</b>
                      </div>
                    )}
                  </td>
                  <td>
                    {req.Processor ? (
                       <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                         <FaUserCheck color="#10b981"/> <span style={{fontSize:'12px'}}>{req.Processor.full_name}</span>
                       </div>
                    ) : req.processed_by ? (
                      <span style={{fontSize:'12px', color:'#6b7280'}}>Admin #{req.processed_by}</span>
                    ) : '-'}
                  </td>
                  <td>
                    <div style={{fontSize:'11px'}}>Tạo: {formatDate(req.created_at)}</div>
                    {req.updated_at !== req.created_at && (
                      <div style={{fontSize:'11px', color:'#059669'}}>Xử lý: {formatDate(req.updated_at)}</div>
                    )}
                  </td>
                  <td className="text-end">
                    {req.status === 'pending' ? (
                      <button className="refund-request-page-btn-action btn-process" onClick={() => handleOpenProcess(req)}>
                        <FaMoneyBillWave /> Xử lý
                      </button>
                    ) : (
                      <button className="refund-request-page-btn-action btn-view" onClick={() => handleOpenProcess(req)}>
                        <FaEye /> Chi tiết
                      </button>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL XỬ LÝ HOÀN TIỀN */}
      {showModal && selectedReq && (
        <div className="refund-request-page-modal-overlay">
          <div className="refund-request-page-modal">
            <div className="refund-request-page-modal-header">
              <div className="refund-request-page-modal-title">
                {selectedReq.status === 'pending' ? <><FaPaperPlane /> Xử Lý Hoàn Tiền</> : <><FaInfoCircle /> Chi Tiết Yêu Cầu</>} #{selectedReq.id}
              </div>
              <button className="refund-request-page-modal-close" onClick={() => setShowModal(false)}><FaTimes/></button>
            </div>
            
            <div className="refund-request-page-modal-body">
              {/* Thông tin chuyển khoản & QR */}
              {selectedReq.status === 'pending' && (
                <div className="refund-request-page-qr-section">
                  {(() => {
                    const bankInfo = parseBankInfo(selectedReq.bank_info_snapshot);
                    // Tính số tiền QR trực tiếp từ policyVerdict (đã có sẵn, không bị async)
                    const qrAmount = (policyVerdict?.eligible && policyVerdict?.actual_refund_amount !== undefined)
                      ? policyVerdict.actual_refund_amount
                      : selectedReq.refund_amount;
                    const qrUrl = getQRLink(selectedReq, qrAmount);
                    return (
                      <>
                        <div style={{textAlign:'center'}}>
                          <div className="refund-request-page-qr-img" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fff'}}>
                            {qrUrl 
                              ? <img src={qrUrl} alt="VietQR" style={{width:140, height:140, borderRadius:6, border:'1px solid #ddd'}}/>
                              : <><FaQrcode size={40} color="#cbd5e1"/><div style={{fontSize:'10px', marginTop:'5px', color:'#999'}}>Không có QR</div></>
                            }
                            <div style={{fontSize:'10px', marginTop:'5px', color:'#64748b'}}>Quét mã chuyển khoản</div>
                          </div>
                        </div>
                        <div style={{flex:1}}>
                          <h4 style={{margin:'0 0 10px 0', fontSize:'14px', color:'#1e40af'}}>Thông tin chuyển khoản:</h4>
                          <div className="refund-request-page-info-grid">
                            <div>
                              <div className="refund-request-page-info-label">Ngân hàng</div>
                              <div className="refund-request-page-info-val">{bankInfo.bank_name || selectedReq.bank_info_snapshot?.raw_text}</div>
                            </div>
                            <div>
                              <div className="refund-request-page-info-label">Số tiền cần chuyển</div>
                              {/* Ưu tiên dùng actual_refund_amount từ policyVerdict (đã trừ booking_fee) */}
                              {policyVerdict?.eligible && policyVerdict?.actual_refund_amount !== undefined ? (
                                <div>
                                  <div className="refund-request-page-info-val" style={{color:'#ef4444', fontSize:'15px'}}>
                                    {formatCurrency(policyVerdict.actual_refund_amount)}
                                  </div>
                                  {policyVerdict.actual_refund_amount !== parseFloat(selectedReq.refund_amount) && (
                                    <div style={{fontSize:'10px', color:'#d97706', textDecoration:'line-through'}}>
                                      Gốc DB: {formatCurrency(selectedReq.refund_amount)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="refund-request-page-info-val" style={{color:'#ef4444', fontSize:'15px'}}>
                                  {formatCurrency(selectedReq.refund_amount)}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="refund-request-page-info-label">Số tài khoản</div>
                              <div className="refund-request-page-info-val text-primary" style={{fontSize:'14px'}}>{bankInfo.account_no || '---'}</div>
                            </div>
                            <div>
                              <div className="refund-request-page-info-label">Chủ tài khoản</div>
                              <div className="refund-request-page-info-val text-uppercase">{bankInfo.account_name || '---'}</div>
                            </div>
                          </div>
                          <div style={{fontSize:'11px', color:'#64748b', fontStyle:'italic'}}>
                            * Vui lòng kiểm tra kỹ thông tin trước khi chuyển khoản.
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Panel đối chiếu điều khoản */}
              {policyVerdict && selectedReq.status === 'pending' && (
                <div style={{
                  margin: '0 0 1rem 0',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${policyVerdict.eligible === true ? '#bbf7d0' : policyVerdict.eligible === false ? '#fecaca' : '#fde68a'}`,
                  background: policyVerdict.eligible === true ? '#f0fdf4' : policyVerdict.eligible === false ? '#fef2f2' : '#fffbeb'
                }}>
                  <div style={{fontWeight:700, fontSize:'13px', marginBottom:'4px', color: policyVerdict.eligible === true ? '#047857' : policyVerdict.eligible === false ? '#b91c1c' : '#92400e'}}>
                    {policyVerdict.eligible === true ? <><FaCheckCircle /> Đủ điều kiện hoàn tiền</> : policyVerdict.eligible === false ? <><FaTimes /> Không đủ điều kiện hoàn tiền</> : <><FaExclamationTriangle /> Cần xem xét thủ công</>}
                  </div>
                  <div style={{fontSize:'12px'}}>{policyVerdict.reason}</div>
                  {policyVerdict.warning && (
                    <div style={{fontSize:'11px', color:'#d97706', marginTop:'4px', fontStyle:'italic'}}>{policyVerdict.warning}</div>
                  )}
                  {selectedReq.hours_before_appointment !== null && (
                    <div style={{fontSize:'11px', color:'#6b7280', marginTop:'4px'}}>
                      Thời gian hủy trước lịch: <b>{selectedReq.hours_before_appointment} giờ</b>
                      {policyVerdict.expected_percent !== undefined && (
                        <span> → Tỷ lệ hoàn theo quy định: <b style={{color:'#059669'}}>{policyVerdict.expected_percent}%</b></span>
                      )}
                    </div>
                  )}
                  {policyVerdict.eligible && policyVerdict.booking_fee > 0 && (
                    <div style={{
                      marginTop:'8px', padding:'6px 8px', borderRadius:'4px',
                      background:'#fff7ed', border:'1px solid #fed7aa', fontSize:'11px'
                    }}>
                      <div style={{color:'#92400e', fontWeight:600, marginBottom:'2px', display:'flex', alignItems:'center', gap:'4px'}}><FaMoneyBillWave /> Chi tiết số tiền hoàn:</div>
                      <div style={{color:'#78350f'}}>
                        Số tiền gốc: <b>{formatCurrency(selectedReq.amount_original)}</b>
                      </div>
                      <div style={{color:'#78350f'}}>
                        Hoàn {policyVerdict.expected_percent}% = <b>{formatCurrency((selectedReq.amount_original * policyVerdict.expected_percent) / 100)}</b>
                      </div>
                      <div style={{color:'#dc2626'}}>
                        Trừ phí giữ chỗ cố định: <b>- {formatCurrency(policyVerdict.booking_fee)}</b>
                      </div>
                      <div style={{
                        color:'#059669', fontWeight:700, fontSize:'12px',
                        marginTop:'4px', paddingTop:'4px', borderTop:'1px dashed #fed7aa'
                      }}>
                        <FaCheckCircle /> Thực hoàn: <b>{formatCurrency(policyVerdict.actual_refund_amount)}</b>
                      </div>
                      {policyVerdict.actual_refund_amount !== parseFloat(selectedReq.refund_amount) && (
                        <div style={{color:'#d97706', marginTop:'4px', fontStyle:'italic'}}>
                          <FaExclamationTriangle /> Số tiền QR hiện tại ({formatCurrency(selectedReq.refund_amount)}) chưa khớp với tính toán chính sách. Nên hoàn đúng: {formatCurrency(policyVerdict.actual_refund_amount)}
                        </div>
                      )}
                    </div>
                  )}
                  {selectedReq.policy_snapshot && (
                    <div style={{fontSize:'10px', color:'#6b7280', marginTop:'4px'}}>
                      Policy lúc hủy: {selectedReq.policy_snapshot.applied_percent ?? '?'}% (hủy trước {selectedReq.policy_snapshot.hours_diff?.toFixed(1) ?? '?'}h)
                    </div>
                  )}
                </div>
              )}

              {/* Form xử lý */}
              {selectedReq.status === 'pending' ? (
                <>
                  <div className="refund-request-page-form-group">
                    <label className="refund-request-page-info-label">Mã giao dịch ngân hàng (Ref No) <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="refund-request-page-input" 
                      style={{width:'100%'}}
                      placeholder="Nhập mã tham chiếu giao dịch..."
                      value={processData.refund_ref}
                      onChange={e => setProcessData({...processData, refund_ref: e.target.value})}
                    />
                  </div>

                  <div className="refund-request-page-form-group">
                     <label className="refund-request-page-info-label">Ảnh biên lai giao dịch <span className="text-danger">*</span></label>
                     <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <label className="refund-request-page-btn-action btn-view" style={{cursor:'pointer'}}>
                           <FaFileUpload /> Chọn ảnh
                           <input type="file" hidden accept="image/*" onChange={handleFileChange}/>
                        </label>
                        {processData.proof_file && <span style={{fontSize:'12px', color:'#059669'}}><FaCheck/> {processData.proof_file.name}</span>}
                     </div>
                  </div>

                  <div className="refund-request-page-form-group">
                    <label className="refund-request-page-info-label">Ghi chú xử lý (Tùy chọn)</label>
                    <textarea 
                      className="refund-request-page-input refund-request-page-textarea"
                      placeholder="Nhập lý do từ chối hoặc ghi chú thêm..."
                      value={processData.admin_note}
                      onChange={e => setProcessData({...processData, admin_note: e.target.value})}
                    ></textarea>
                  </div>
                </>
              ) : (
                /* View Details Mode */
                <div className="refund-request-page-info-grid">
                   <div>
                      <div className="refund-request-page-info-label">Trạng thái</div>
                      <div className={`refund-request-page-badge ${selectedReq.status}`}>
                        {selectedReq.status === 'completed' ? 'Đã hoàn tất' : 'Đã từ chối'}
                      </div>
                   </div>
                   <div>
                      <div className="refund-request-page-info-label">Mã giao dịch Ref</div>
                      <div className="refund-request-page-info-val">{selectedReq.refund_ref || '---'}</div>
                   </div>
                   <div style={{gridColumn:'1/-1'}}>
                      <div className="refund-request-page-info-label">Ghi chú Admin</div>
                      <div className="refund-request-page-info-val" style={{fontWeight:400}}>{selectedReq.admin_note || 'Không có ghi chú'}</div>
                   </div>
                   {selectedReq.proof_images && (
                     <div style={{gridColumn:'1/-1'}}>
                        <div className="refund-request-page-info-label">Biên lai chuyển tiền</div>
                        {/* Demo hiển thị ảnh nếu có URL */}
                        <div style={{padding:'10px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'6px', marginTop:'5px'}}>
                           <a href={JSON.parse(selectedReq.proof_images)[0]} target="_blank" rel="noreferrer" style={{fontSize:'12px', color:'#3b82f6'}}>
                             Xem ảnh biên lai
                           </a>
                        </div>
                     </div>
                   )}
                </div>
              )}

            </div>
            
            <div className="refund-request-page-modal-footer">
              <button className="refund-request-page-btn-action btn-cancel" onClick={() => setShowModal(false)}>
                Đóng
              </button>
              
              {selectedReq.status === 'pending' && (
                <>
                  <button 
                    className="refund-request-page-btn-action btn-reject" 
                    onClick={() => handleSubmit('rejected')}
                    disabled={submitting}
                  >
                    Từ chối hoàn
                  </button>
                  <button 
                    className="refund-request-page-btn-action btn-complete" 
                    onClick={() => handleSubmit('completed')}
                    disabled={submitting}
                  >
                     {submitting ? 'Đang xử lý...' : <><FaPaperPlane /> Hoàn thành & Gửi mail</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundRequestPage;
// client/src/components/finance/WorkShiftModal.js
import React, { useState, useEffect } from 'react';
import { FaCashRegister, FaUser, FaClock, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './WorkShiftModal.css';

const WorkShiftModal = ({ 
  show, 
  onHide, 
  mode, // 'start' | 'end'
  onSubmit, 
  shiftStats = { startCash: 0, revenueCash: 0, transactions: 0, revenueTransfer: 0 },
  currentUser = 'Admin',
  currentShiftData = null // Dữ liệu ca đang mở (dùng khi đóng ca)
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [assignedShift, setAssignedShift] = useState(null); // Ca được phân công
  const [loadingShift, setLoadingShift] = useState(false);

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    if (!show) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setAmount('');
    setNote('');

    // Khi mở modal mở ca → tự động tìm ca phân công phù hợp giờ hiện tại
    if (mode === 'start') {
      setLoadingShift(true);
      import('../../services/api').then(({ default: api }) => {
        api.get('/work-shifts/config').then(res => {
          if (res.data.success) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const matched = res.data.data.find(s => {
              const [sh, sm] = s.start_time.split(':').map(Number);
              const [eh, em] = s.end_time.split(':').map(Number);
              return currentMinutes >= sh * 60 + sm && currentMinutes < eh * 60 + em;
            });
            setAssignedShift(matched || null);
          }
        }).catch(() => {}).finally(() => setLoadingShift(false));
      });
    }

    return () => clearInterval(timer);
  }, [show, mode]);

  if (!show) return null; // Không render gì nếu show = false

  // Logic tính toán
  const systemTotal = (shiftStats.startCash || 0) + (shiftStats.revenueCash || 0);
  const actualAmount = parseInt(amount) || 0;
  const difference = actualAmount - systemTotal;
  
  const formatMoney = (n) => n ? n.toLocaleString('vi-VN') : '0';

  // Format ngày giờ
  const timeString = currentTime.toLocaleTimeString('vi-VN');
  const dateString = currentTime.toLocaleDateString('vi-VN');

  return (
    <div className="ws-overlay">
      <div className="ws-container">
        
        {/* 1. HEADER */}
        <div className={`ws-header ${mode}`}>
          <div className="ws-title">
            <FaCashRegister /> 
            {mode === 'start' ? 'KHAI BÁO ĐẦU CA' : 'KẾT THÚC CA LÀM VIỆC'}
          </div>
          <FaTimes style={{cursor: 'pointer'}} onClick={onHide} size={20}/>
        </div>

        {/* 2. INFO BAR (Người dùng & Thời gian) */}
        <div className="ws-info-bar">
          <div className="ws-info-item">
            <FaUser className="text-primary"/> 
            <span>Nhân viên: {currentUser}</span>
          </div>
          <div className="ws-info-item">
            <FaClock className="text-success"/> 
            <span>{timeString} - {dateString}</span>
          </div>
        </div>

        {/* 3. BODY */}
        <div className="ws-body">
          {mode === 'start' ? (
            /* --- GIAO DIỆN MỞ CA --- */
            <>
              {/* Thông tin ca phân công */}
              <div style={{
                background: assignedShift ? '#e8f5e9' : '#fff8e1',
                border: `1px solid ${assignedShift ? '#c8e6c9' : '#ffe082'}`,
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {loadingShift ? (
                  <span style={{color: '#888'}}>Đang kiểm tra lịch phân công...</span>
                ) : assignedShift ? (
                  <>
                    <FaCheckCircle style={{color: '#2e7d32', flexShrink: 0}}/>
                    <div>
                      <div style={{fontWeight: 700, color: '#1b5e20'}}>
                        {assignedShift.display_name}
                      </div>
                      <div style={{color: '#388e3c', fontSize: 12}}>
                        {assignedShift.start_time?.slice(0,5)} – {assignedShift.end_time?.slice(0,5)} · Đúng ca phân công
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <FaExclamationTriangle style={{color: '#f57f17', flexShrink: 0}}/>
                    <div style={{color: '#e65100', fontSize: 12}}>
                      Không tìm thấy ca phân công khớp giờ hiện tại. Bạn vẫn có thể mở ca thủ công.
                    </div>
                  </>
                )}
              </div>

              <div className="ws-input-group">
                <label className="ws-label">Tiền mặt đang có trong két (Tiền lẻ/Tiền vốn):</label>
                <div className="position-relative">
                   <input 
                      type="number" 
                      className="ws-money-input"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      autoFocus
                   />
                   <span style={{position:'absolute', right: 20, top: 15, fontWeight:'bold', color: '#888'}}>VNĐ</span>
                </div>
                <small className="text-muted mt-2 d-block">
                  * Hãy đếm kỹ tiền lẻ trong két trước khi nhập. Số tiền này sẽ là số dư đầu kỳ.
                </small>
              </div>
            </>
          ) : (
            /* --- GIAO DIỆN KẾT CA --- */
            <>
               <div className="ws-diff-box mb-3">
                  <div className="diff-row">
                    <span>Tiền đầu ca:</span>
                    <strong>{formatMoney(shiftStats.startCash)} đ</strong>
                  </div>
                  <div className="diff-row text-success">
                    <span>Doanh thu ca (Tiền mặt):</span>
                    <strong>+ {formatMoney(shiftStats.revenueCash)} đ</strong>
                  </div>
                  <div className="diff-result text-primary">
                    <span>TỔNG LÝ THUYẾT TRONG KÉT:</span>
                    <span>{formatMoney(systemTotal)} đ</span>
                  </div>
               </div>

               <div className="ws-input-group">
                <label className="ws-label text-danger">TIỀN THỰC TẾ ĐẾM ĐƯỢC:</label>
                <div className="position-relative">
                   <input 
                      type="number" 
                      className={`ws-money-input ${difference !== 0 && amount ? 'error' : ''}`}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="Nhập tổng tiền đếm được..."
                      autoFocus
                   />
                   <span style={{position:'absolute', right: 20, top: 15, fontWeight:'bold', color: '#888'}}>VNĐ</span>
                </div>
              </div>

              {/* Hiển thị trạng thái thừa/thiếu */}
              {amount !== '' && (
                <div className={`p-2 rounded text-center fw-bold ${difference === 0 ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                   {difference === 0 ? (
                     <><FaCheckCircle/> Khớp số liệu chính xác</>
                   ) : (
                     <><FaExclamationTriangle/> {difference > 0 ? 'DƯ (THỪA): ' : 'THIẾU (THẤT THOÁT): '} {formatMoney(Math.abs(difference))} đ</>
                   )}
                </div>
              )}
            </>
          )}

          {/* Ô nhập ghi chú chung */}
          <div className="ws-input-group mt-3">
            <label className="ws-label">Ghi chú / Bàn giao ca:</label>
            <textarea 
              className="form-control" 
              rows="2"
              placeholder="Ghi chú về thiết bị hỏng, các vấn đề phát sinh..."
              value={note}
              onChange={e => setNote(e.target.value)}
            ></textarea>
          </div>
        </div>

        {/* 4. FOOTER */}
        <div className="ws-footer">
          <button className="ws-btn ws-btn-cancel" onClick={onHide}>Hủy bỏ</button>
          <button 
            className={`ws-btn ws-btn-submit ${mode === 'end' ? 'danger' : ''}`}
            onClick={() => onSubmit({
            amount: parseInt(amount) || 0,
            note,
            difference,
            shift_config_id: assignedShift?.id || null
          })}
            disabled={!amount}
          >
            {mode === 'start' ? 'XÁC NHẬN MỞ CA' : 'XÁC NHẬN KẾT CA'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WorkShiftModal;
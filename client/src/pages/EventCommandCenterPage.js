import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { 
  FaArrowLeft, FaGift, FaCheckCircle, FaTimesCircle, 
  FaUserFriends, FaQrcode, FaPrint, FaVideo 
} from 'react-icons/fa';
import eventService from '../services/eventService';
import './EventCommandCenterPage.css';

const EventCommandCenterPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Trạng thái quét & Check-in
  const [scanResult, setScanResult] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle'); // idle | success | warning | error
  const [cameraActive, setCameraActive] = useState(false);
  
  const scannerRef = useRef(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Tự động làm mới mỗi 10 giây (Realtime giả lập)
    return () => clearInterval(interval);
  }, [id]);

  const fetchStats = async () => {
    try {
      const res = await eventService.getCommandCenterStats(id);
      if (res.success) {
        setStats(res.stats);
        setLoading(false);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ');
      setLoading(false);
    }
  };

  const handleManualCodeSubmit = async (e) => {
    e.preventDefault();
    const code = e.target.qr_input.value.trim();
    if (code) {
      processQRCode(code);
      e.target.qr_input.value = '';
    }
  };

  const startCamera = () => {
    setCameraActive(true);
    setScanResult(null);
    setScanStatus('idle');
    
    // Đợi UI render xong mới khởi tạo scanner
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: {width: 250, height: 250},
        aspectRatio: 1.0 
      }, false);
      
      scannerRef.current.render((decodedText) => {
        stopCamera(); // Tắt cam ngay khi quét được
        processQRCode(decodedText);
      }, (error) => { /* Ignore errors during scanning */ });
    }, 100);
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
    }
    setCameraActive(false);
  };

  const processQRCode = async (code) => {
    setScanStatus('loading');
    try {
      const res = await eventService.checkIn(code);
      if (res.success) {
        setScanResult({
          message: res.message,
          data: res.registration,
          isWarning: res.is_already_checked_in
        });
        setScanStatus(res.is_already_checked_in ? 'warning' : 'success');
        fetchStats(); // Update dashboard
      } else {
        setScanResult({ message: res.message || 'Mã QR Không Hợp Lệ!' });
        setScanStatus('error');
      }
    } catch (err) {
      setScanResult({ message: err.response?.data?.message || 'Lỗi hệ thống!' });
      setScanStatus('error');
    }
  };

  const handleDistributeGift = async () => {
    if (!scanResult?.data?.id) return;
    try {
      const res = await eventService.distributeGift(scanResult.data.id);
      if (res.success) {
        setScanResult(prev => ({
          ...prev,
          data: { ...prev.data, gift_status: 'distributed' }
        }));
        fetchStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi phát quà');
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setScanStatus('idle');
  };

  if (loading) return <div className="ecc-loading">Đang tải Trung Tâm Điều Phối...</div>;
  if (error) return <div className="ecc-error">{error}</div>;

  return (
    <div className="ecc-layout">
      {/* CỘT TRÁI: KHU VỰC THAO TÁC LỄ TÂN */}
      <div className="ecc-reception-zone">
        <div className="ecc-header">
          <button className="ecc-btn-back" onClick={() => navigate('/quan-ly-su-kien')}><FaArrowLeft /></button>
          <h2>Màn Hình Lễ Tân / Check-in</h2>
        </div>

        {/* MÀN HÌNH CHỜ QUÉT */}
        {scanStatus === 'idle' && (
          <div className="ecc-scan-container">
            {!cameraActive ? (
              <div className="ecc-camera-placeholder">
                <FaQrcode className="ecc-big-icon" />
                <h3>Sẵn Sàng Quét Mã Khách Hàng</h3>
                <button className="ecc-btn-huge" onClick={startCamera}>
                  <FaVideo /> Bật Camera Quét Mã
                </button>
              </div>
            ) : (
              <div className="ecc-camera-active">
                <div id="reader" style={{ width: "100%", borderRadius: "12px", overflow: "hidden" }}></div>
                <button className="ecc-btn-cancel" onClick={stopCamera}>Tắt Camera</button>
              </div>
            )}

            <div className="ecc-manual-input">
              <p>Hoặc nhập mã thủ công:</p>
              <form onSubmit={handleManualCodeSubmit}>
                <input type="text" name="qr_input" placeholder="VD: EVT-1-12345..." autoComplete="off" autoFocus />
                <button type="submit">Xác Nhận</button>
              </form>
            </div>
          </div>
        )}

        {/* MÀN HÌNH ĐANG XỬ LÝ */}
        {scanStatus === 'loading' && (
          <div className="ecc-result ecc-result--loading">
            <div className="loader"></div>
            <h2>Đang kiểm tra vé...</h2>
          </div>
        )}

        {/* MÀN HÌNH KẾT QUẢ QUÉT */}
        {(scanStatus === 'success' || scanStatus === 'warning') && scanResult && (
          <div className={`ecc-result ${scanStatus === 'warning' ? 'ecc-result--warning' : 'ecc-result--success'}`}>
            <FaCheckCircle className="ecc-result-icon" />
            <h1 className="ecc-result-title">{scanResult.message}</h1>
            
            <div className="ecc-guest-card">
              <div className="ecc-guest-name">{scanResult.data.guest_name}</div>
              <div className="ecc-guest-info">SĐT: {scanResult.data.guest_phone || 'Không có'}</div>
              <div className="ecc-guest-info">Đi cùng: {scanResult.data.attendee_count} người</div>
              <div className="ecc-guest-time">Giờ check-in: {new Date(scanResult.data.checked_in_at).toLocaleTimeString('vi-VN')}</div>
            </div>

            <div className="ecc-action-board">
              {scanResult.data.gift_status === 'pending' ? (
                <button className="ecc-btn-gift-huge" onClick={handleDistributeGift}>
                  <FaGift /> XÁC NHẬN PHÁT QUÀ
                </button>
              ) : scanResult.data.gift_status === 'distributed' ? (
                <div className="ecc-gift-done"><FaCheckCircle /> ĐÃ NHẬN QUÀ</div>
              ) : (
                <div className="ecc-gift-none">Vé này không có quà tặng</div>
              )}
            </div>

            <div className="ecc-footer-actions">
              <button className="ecc-btn-outline"><FaPrint /> In Phiếu</button>
              <button className="ecc-btn-next" onClick={resetScanner}>QUÉT NGƯỜI TIẾP THEO</button>
            </div>
          </div>
        )}

        {/* MÀN HÌNH LỖI */}
        {scanStatus === 'error' && scanResult && (
          <div className="ecc-result ecc-result--error">
            <FaTimesCircle className="ecc-result-icon" />
            <h1 className="ecc-result-title">TỪ CHỐI CHECK-IN</h1>
            <p className="ecc-result-desc">{scanResult.message}</p>
            <button className="ecc-btn-next" onClick={resetScanner}>THỬ LẠI</button>
          </div>
        )}
      </div>

      {/* CỘT PHẢI: COMMAND CENTER DASHBOARD */}
      <div className="ecc-dashboard-zone">
        <div className="ecc-dash-header">
          <h3>Command Center</h3>
          <span className="ecc-live-badge"><span className="pulse"></span> LIVE</span>
        </div>

        <div className="ecc-stats-grid">
          <div className="ecc-stat-box">
            <span className="ecc-stat-label">Tổng đăng ký</span>
            <span className="ecc-stat-value">{stats?.total_registered || 0}</span>
          </div>
          <div className="ecc-stat-box highlight">
            <span className="ecc-stat-label">Đã Check-in</span>
            <span className="ecc-stat-value text-green">{stats?.total_checked_in || 0}</span>
          </div>
          <div className="ecc-stat-box">
            <span className="ecc-stat-label">Đang chờ (Chưa đến)</span>
            <span className="ecc-stat-value text-orange">{stats?.total_waiting || 0}</span>
          </div>
          <div className="ecc-stat-box">
            <span className="ecc-stat-label">Đã Phát Quà</span>
            <span className="ecc-stat-value text-purple">{stats?.gifts_distributed || 0}</span>
          </div>
        </div>

        <div className="ecc-progress-section">
          <div className="ecc-prog-header">
            <span>Tỉ lệ lấp đầy</span>
            <strong>{stats?.participation_rate || '0%'}</strong>
          </div>
          <div className="ecc-prog-bar">
            <div className="ecc-prog-fill" style={{ width: stats?.participation_rate || '0%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCommandCenterPage;
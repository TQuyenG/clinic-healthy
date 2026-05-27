// client/src/pages/PaymentSettingsPage.js
import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import { toast } from 'react-toastify';
import { 
  FaUniversity, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaMobileAlt, 
  FaSave, 
  FaInfoCircle, 
  FaCog,
  FaUser,
  FaBuilding,
  FaCheckCircle
} from 'react-icons/fa';
import './PaymentSettingsPage.css';

const PaymentSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState([]);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);

  // Tải danh sách ngân hàng từ VietQR API khi vào trang
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const data = await response.json();
        if (data.code === '00') {
          setBanks(data.data);
        }
      } catch (error) {
        console.error('Lỗi tải danh sách ngân hàng:', error);
      }
    };
    fetchBanks();
  }, []);
  
  const [config, setConfig] = useState({
    cash: { enabled: true },
    bank: { enabled: true, bank_name: '', account_no: '', account_name: '', template: 'compact' },
    momo: { enabled: false, mode: 'personal', phone_number: '', partner_code: '', access_key: '', secret_key: '' },
    vnpay: { enabled: false, tmn_code: '', hash_secret: '', url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await paymentService.getPaymentConfig();
      if (res.data.success) {
        setConfig(prev => ({
          cash: { ...prev.cash, ...(res.data.data.cash || {}) },
          bank: { ...prev.bank, ...(res.data.data.bank || {}) },
          momo: { ...prev.momo, ...(res.data.data.momo || {}) },
          vnpay: { ...prev.vnpay, ...(res.data.data.vnpay || {}) }
        }));
      }
    } catch (error) {
      toast.error('Không thể tải cấu hình thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleToggle = (section) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], enabled: !prev[section].enabled }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await paymentService.updatePaymentConfig(config);
      if (res.data.success) {
        toast.success(' Đã lưu cấu hình!');
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{height: '60vh'}}>
      <div className="text-center">
        <div className="spinner-border text-success mb-2" role="status" style={{width: '2.5rem', height: '2.5rem'}}></div>
        <p className="text-muted small">Đang tải...</p>
      </div>
    </div>
  );

  return (
    <div className="payment-settings-wrapper">
      <div className="container-fluid">
        
        {/* HEADER */}
        <div className="page-header">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
            <div>
              <h2>
                <FaCog size={18}/> 
                Cấu hình Thanh Toán
              </h2>
              <p className="text-muted mb-0">
                Quản lý phương thức thanh toán của phòng khám
              </p>
            </div>
            <button 
              className="btn-save" 
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Đang lưu...
                </>
              ) : (
                <>
                  <FaSave size={14}/> 
                  Lưu
                </>
              )}
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="settings-grid">
            
            {/* 1. TIỀN MẶT */}
            <div className="setting-card">
              <div className="card-header">
                <h5>
                  <FaMoneyBillWave size={16}/>
                  Tiền mặt
                </h5>
                <label className="custom-switch">
                  <input 
                    type="checkbox" 
                    checked={config.cash.enabled} 
                    onChange={() => handleToggle('cash')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
              <div className={`card-body ${!config.cash.enabled ? 'disabled' : ''}`}>
                <div className="success-indicator">
                  <div className="icon">
                    <FaCheckCircle size={16} />
                  </div>
                  <div className="content">
                    <h6>Thanh toán trực tiếp</h6>
                    <p>
                      Bệnh nhân thanh toán tại quầy. Nhân viên xác nhận thủ công trên hệ thống.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. NGÂN HÀNG */}
            <div className="setting-card">
              <div className="card-header">
                <h5>
                  <FaUniversity size={16}/>
                  VietQR
                </h5>
                <label className="custom-switch">
                  <input 
                    type="checkbox" 
                    checked={config.bank.enabled} 
                    onChange={() => handleToggle('bank')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
              <div className={`card-body ${!config.bank.enabled ? 'disabled' : ''}`}>
                <div className="info-box">
                  <FaInfoCircle size={13} className="flex-shrink-0 mt-1"/> 
                  <span>Hệ thống tự động tạo mã QR cho khách quét</span>
                </div>
                
                <div className="row g-2">
                  {/* --- BẮT ĐẦU SỬA: Thay thế input thường bằng Dropdown gợi ý --- */}
                  <div className="col-12 position-relative">
                    <label className="form-label">Tên Ngân hàng</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Nhập tên ngân hàng (VD: MBBank)..."
                      value={config.bank.bank_name}
                      onChange={(e) => {
                        handleChange('bank', 'bank_name', e.target.value);
                        setShowBankSuggestions(true);
                      }}
                      onFocus={() => setShowBankSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowBankSuggestions(false), 200)} // Delay để kịp nhận sự kiện click
                      autoComplete="off"
                    />
                    
                    {/* Danh sách gợi ý Dropdown */}
                    {showBankSuggestions && (
                      <div className="card position-absolute w-100 shadow overflow-auto" style={{ zIndex: 1000, maxHeight: '250px', top: '100%' }}>
                        <ul className="list-group list-group-flush">
                          {banks
                            .filter(bank => 
                              !config.bank.bank_name || 
                              bank.shortName.toLowerCase().includes(config.bank.bank_name.toLowerCase()) || 
                              bank.name.toLowerCase().includes(config.bank.bank_name.toLowerCase())
                            )
                            .map((bank) => (
                              <li 
                                key={bank.id} 
                                className="list-group-item list-group-item-action cursor-pointer d-flex align-items-center gap-2"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  handleChange('bank', 'bank_name', bank.shortName); // Lưu tên ngắn (VD: MBBank)
                                  setShowBankSuggestions(false);
                                }}
                              >
                                <img src={bank.logo} alt={bank.shortName} style={{ width: '40px', objectFit: 'contain' }} />
                                <div>
                                  <div className="fw-bold">{bank.shortName}</div>
                                  <div className="small text-muted" style={{ fontSize: '0.8rem' }}>{bank.name}</div>
                                </div>
                              </li>
                            ))}
                            {/* Hiển thị thông báo nếu không tìm thấy */}
                            {banks.filter(bank => 
                              !config.bank.bank_name || 
                              bank.shortName.toLowerCase().includes(config.bank.bank_name.toLowerCase()) || 
                              bank.name.toLowerCase().includes(config.bank.bank_name.toLowerCase())
                            ).length === 0 && (
                              <li className="list-group-item text-muted text-center small">Không tìm thấy ngân hàng</li>
                            )}
                        </ul>
                      </div>
                    )}
                  </div>
                  {/* --- KẾT THÚC SỬA --- */}
                  <div className="col-7">
                    <label className="form-label">Số tài khoản</label>
                    <input 
                      type="text" 
                      className="form-control font-monospace" 
                      placeholder="0123456789"
                      value={config.bank.account_no}
                      onChange={(e) => handleChange('bank', 'account_no', e.target.value)}
                    />
                  </div>
                  <div className="col-5">
                    <label className="form-label">Mẫu QR</label>
                    <select 
                      className="form-select"
                      value={config.bank.template}
                      onChange={(e) => handleChange('bank', 'template', e.target.value)}
                    >
                      <option value="compact">Compact</option>
                      <option value="qr_only">QR Only</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Chủ tài khoản</label>
                    <input 
                      type="text" 
                      className="form-control text-uppercase" 
                      placeholder="NGUYEN VAN A"
                      value={config.bank.account_name}
                      onChange={(e) => handleChange('bank', 'account_name', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. MOMO */}
            <div className="setting-card">
              <div className="card-header">
                <h5>
                  <FaMobileAlt size={16}/>
                  MoMo
                </h5>
                <label className="custom-switch">
                  <input 
                    type="checkbox" 
                    checked={config.momo.enabled} 
                    onChange={() => handleToggle('momo')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
              <div className={`card-body ${!config.momo.enabled ? 'disabled' : ''}`}>
                <div className="mb-3">
                  <label className="form-label">Chế độ</label>
                  <select 
                    className="form-select"
                    value={config.momo.mode}
                    onChange={(e) => handleChange('momo', 'mode', e.target.value)}
                  >
                    <option value="personal">Cá nhân</option>
                    <option value="business">Doanh nghiệp</option>
                  </select>
                </div>

                {config.momo.mode === 'personal' ? (
                  <div className="animate-fade-in mode-box personal">
                    <div className="mode-title text-success">
                      <FaUser size={13}/> Chuyển qua SĐT
                    </div>
                    <label className="form-label">SĐT MoMo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="0912345678"
                      value={config.momo.phone_number}
                      onChange={(e) => handleChange('momo', 'phone_number', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="animate-fade-in mode-box business">
                    <div className="mode-title text-warning">
                      <FaBuilding size={13}/> API Doanh nghiệp
                    </div>
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="form-label">Partner Code</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={config.momo.partner_code}
                          onChange={(e) => handleChange('momo', 'partner_code', e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">Access Key</label>
                        <input 
                          type="password" 
                          className="form-control"
                          value={config.momo.access_key}
                          onChange={(e) => handleChange('momo', 'access_key', e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">Secret Key</label>
                        <input 
                          type="password" 
                          className="form-control"
                          value={config.momo.secret_key}
                          onChange={(e) => handleChange('momo', 'secret_key', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. VNPAY */}
            <div className="setting-card">
              <div className="card-header">
                <h5>
                  <FaCreditCard size={16}/>
                  VNPay
                </h5>
                <label className="custom-switch">
                  <input 
                    type="checkbox" 
                    checked={config.vnpay.enabled} 
                    onChange={() => handleToggle('vnpay')}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
              <div className={`card-body ${!config.vnpay.enabled ? 'disabled' : ''}`}>
                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label">TmnCode</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Mã từ VNPay"
                      value={config.vnpay.tmn_code}
                      onChange={(e) => handleChange('vnpay', 'tmn_code', e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">HashSecret</label>
                    <input 
                      type="password" 
                      className="form-control"
                      value={config.vnpay.hash_secret}
                      onChange={(e) => handleChange('vnpay', 'hash_secret', e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">URL</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={config.vnpay.url}
                      onChange={(e) => handleChange('vnpay', 'url', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentSettingsPage;
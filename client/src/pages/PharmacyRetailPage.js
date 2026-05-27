import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import medicalRecordService from '../services/medicalRecordService';
import { toast } from 'react-toastify';
import {
  FaPills,
  FaSearch,
  FaTrash,
  FaMoneyBillWave,
  FaQrcode,
  FaPrint,
  FaPlus,
  FaUndo,
  FaShoppingCart,
  FaReceipt,
  FaFileImport,
  FaTh,
  FaList,
} from 'react-icons/fa';
import api from '../services/api';
import './FrontDeskPage.css';
import './PharmacyRetailPage.css';

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

const parseMoney = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^0-9.-]/g, '')) || 0;
};

const PharmacyRetailPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [search, setSearch] = useState('');
  const [medicineView, setMedicineView] = useState('grid');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', note: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [isPrescriptionMode, setIsPrescriptionMode] = useState(false);
  const [medicalRecordId, setMedicalRecordId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
    [cart]
  );

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, parseMoney(cashReceived) - totalAmount);
  }, [cashReceived, paymentMethod, totalAmount]);

  const loadMedicines = async (keyword = '') => {
    try {
      setLoadingMedicines(true);
      const res = await api.get('/pharmacy/medicines', {
        params: { search: keyword, limit: 100 }
      });
      setMedicines(Array.isArray(res.data?.medicines) ? res.data.medicines : []);
    } catch (error) {
      console.error('[PharmacyRetailPage] loadMedicines error', error);
      toast.error('Không tải được danh sách thuốc');
    } finally {
      setLoadingMedicines(false);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const res = await api.get('/payments/pharmacy/retail', { params: { page: 1 } });
      if (res?.data?.success) {
        setInvoices(Array.isArray(res.data.invoices) ? res.data.invoices : []);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('[PharmacyRetailPage] loadInvoices error', error);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadMedicines(search.trim());
  }, [search]);

  // If navigated with a medical_record_id (state or query), prefill cart as prescription
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const mrIdFromQuery = params.get('medical_record_id');
    const state = location.state || {};
    const mrId = state.medical_record_id || mrIdFromQuery || null;
    if (!mrId) return;

    const fetchAndPrefill = async () => {
      try {
        const res = await medicalRecordService.getMedicalRecordById(mrId);
        if (!res?.data?.success) return;
        const record = res.data.data;

        // load medicine list for matching
        let medList = [];
        try {
          const ml = await api.get('/pharmacy/medicines', { params: { limit: 5000 } });
          medList = Array.isArray(ml.data?.medicines) ? ml.data.medicines : (Array.isArray(ml.data?.data) ? ml.data.data : []);
        } catch (e) { /* ignore */ }

        const cleanStr = (str) => {
          if (!str) return '';
          return String(str).toLowerCase().normalize('NFD').replace(/[00-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        };

        const enriched = (record.prescription_json || []).map((it) => {
          const qty = parseInt(it.quantity || it.qty || it.count) || 1;
          const nameClean = cleanStr(it.name || it.medicine_name || '');
          let found = medList.find(m => cleanStr(m.name) === nameClean) || medList.find(m => cleanStr(m.name).includes(nameClean)) || medList.find(m => nameClean.includes(cleanStr(m.name)));
          const unitPrice = found ? (found.price || found.export_price || 0) : (it.price || 0);
          return {
            id: found ? found.id : (it.medicine_id || null),
            medicine_id: found ? found.id : (it.medicine_id || null),
            name: found ? found.name : (it.name || it.medicine_name || ''),
            price: Number(unitPrice) || 0,
            qty: qty,
            unit: found ? found.unit : (it.unit || 'Đvi'),
            original: it
          };
        }).filter(Boolean);

        setCart(enriched);
        setCustomer({ name: record.patient_name || record.patient?.name || record.appointment?.guest_name || '', phone: record.patient?.phone || record.appointment?.guest_phone || '' });
        setIsPrescriptionMode(true);
        setMedicalRecordId(mrId);
      } catch (err) {
        console.error('Failed to prefill prescription:', err);
        toast.error('Không thể tải đơn thuốc');
      }
    };

    fetchAndPrefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.state]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredMedicines = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return medicines.filter((medicine) => {
      const name = String(medicine.name || '').toLowerCase();
      const code = String(medicine.code || '').toLowerCase();
      const unit = String(medicine.unit || '').toLowerCase();
      return !keyword || name.includes(keyword) || code.includes(keyword) || unit.includes(keyword);
    });
  }, [medicines, search]);

  const medicineGridStyle = useMemo(() => {
    if (medicineView === 'grid') {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 10,
        width: '100%',
      };
    }

    return {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      width: '100%',
    };
  }, [medicineView]);

  const addMedicine = (medicine) => {
    const stock = Number(medicine.stock_total ?? medicine.stock ?? medicine.quantity ?? 0);
    if (stock <= 0) {
      toast.warning('Thuốc đã hết hàng');
      return;
    }

    setCart((prev) => {
      const exist = prev.find((item) => item.id === medicine.id);
      if (exist) {
        return prev.map((item) => (item.id === medicine.id ? { ...item, qty: Number(item.qty || 0) + 1 } : item));
      }
      return [...prev, { ...medicine, qty: 1 }];
    });
  };

  const updateQty = (index, qty) => {
    const nextQty = Math.max(1, Number(qty) || 1);
    setCart((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, qty: nextQty } : item)));
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const printInvoice = (invoice) => {
    if (!invoice) return;
    const printWindow = window.open('', '_blank', 'width=640,height=800');
    if (!printWindow) return;

    const rows = (invoice.items || [])
      .map(
        (item) => `
          <tr>
            <td>${item.name || ''}</td>
            <td style="text-align:center">${item.qty || 0}</td>
            <td style="text-align:right">${formatMoney((item.price || 0) * (item.qty || 0))}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
      <head>
        <title>Hóa đơn ${invoice.code || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #111; }
          .sheet { max-width: 560px; margin: 0 auto; }
          h1 { font-size: 18px; text-align: center; margin: 0 0 12px; }
          .meta { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; font-size: 13px; }
          th { text-align: left; }
          .right { text-align: right; }
          .summary { margin-top: 14px; border-top: 2px solid #111; padding-top: 12px; }
          .summary-row { display: flex; justify-content: space-between; margin: 4px 0; }
          .total { font-size: 18px; font-weight: 800; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h1>PHIẾU BÁN THUỐC</h1>
          <div class="meta"><span>Mã hóa đơn</span><strong>${invoice.code || '--'}</strong></div>
          <div class="meta"><span>Khách hàng</span><strong>${invoice.customer?.name || 'Khách lẻ'}</strong></div>
          <div class="meta"><span>SĐT</span><strong>${invoice.customer?.phone || '--'}</strong></div>
          <div class="meta"><span>Ngày</span><strong>${invoice.created_at ? new Date(invoice.created_at).toLocaleString('vi-VN') : '--'}</strong></div>
          <table>
            <thead>
              <tr><th>Thuốc</th><th style="width:60px; text-align:center">SL</th><th style="width:130px; text-align:right">Thành tiền</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">
            <div class="summary-row"><span>Phương thức</span><strong>${invoice.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản / QR'}</strong></div>
            <div class="summary-row total"><span>Tổng cộng</span><span>${formatMoney(invoice.total_amount || invoice.final_amount || 0)}</span></div>
          </div>
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.warning('Chưa có sản phẩm trong đơn');
      return;
    }

    const isCash = paymentMethod === 'cash';
    const received = isCash ? parseMoney(cashReceived) : totalAmount;
    if (isCash && received < totalAmount) {
      toast.warning('Số tiền khách đưa chưa đủ');
      return;
    }

    try {
      setSaving(true);
      if (isPrescriptionMode && medicalRecordId) {
        // Call sell-prescription endpoint
        const items = cart.map(i => ({ medicine_id: i.medicine_id || i.id, name: i.name, qty: i.qty, price: i.price }));
        const res = await api.post('/pharmacy/sell-prescription', { medical_record_id: medicalRecordId, items });
        if (res?.data?.success) {
          toast.success(res.data.message || 'Xuất kho theo đơn thuốc thành công');
          setCart([]);
          setIsPrescriptionMode(false);
          setMedicalRecordId(null);
          await loadInvoices();
          // navigate back to medical record or appointment if possible
          if (location.state?.returnTo) navigate(location.state.returnTo);
        } else {
          toast.error(res?.data?.message || 'Không thể xuất kho theo đơn thuốc');
        }
      } else {
        const res = await api.post('/pharmacy/retail', {
          items: cart,
          customer,
          payment_method: paymentMethod === 'cash' ? 'cash' : 'transfer',
          total_amount: totalAmount,
          final_amount: totalAmount,
        });

        if (res?.data?.success) {
          toast.success(res.data.message || 'Xuất hóa đơn thành công');
          setLastInvoice(res.data.invoice || null);
          setCart([]);
          setCustomer({ name: '', phone: '', address: '', note: '' });
          setPaymentMethod('cash');
          setCashReceived('');
          await loadInvoices();
        } else {
          toast.error(res?.data?.message || 'Không thể tạo hóa đơn');
        }
      }
    } catch (error) {
      console.error('[PharmacyRetailPage] handleCheckout error', error);
      toast.error(error.response?.data?.message || 'Lỗi tạo đơn bán lẻ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="front-desk-page-container" style={{ padding: 16 }}>
      <div className="front-desk-page-header">
        <div>
          <div className="front-desk-page-title">Bán thuốc</div>
          <div className="front-desk-page-subtitle">Bán thuốc cho bệnh nhân.</div>
        </div>
        <button className="front-desk-page-btn front-desk-page-btn-primary" onClick={loadInvoices} type="button">
          <FaReceipt /> Làm mới
        </button>
      </div>

      <div className="front-desk-page-grid">
        <div className="front-desk-page-panel">
          <div className="front-desk-page-panel-header">
            <span><FaPills className="me-2" /> Danh sách thuốc</span>
          </div>
          <div className="medicine-panel-body" style={{ maxHeight: '72vh', overflow: 'auto' }}>
            <div className="medicine-toolbar">
              <div className="medicine-search-group">
                <FaSearch color="#64748b" />
                <input
                  className="front-desk-page-input medicine-search-input"
                  placeholder="Tìm thuốc theo tên, mã, đơn vị..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="medicine-toolbar-actions">
                <div className="medicine-view-toggle">
                  <button
                    type="button"
                    className={medicineView === 'grid' ? 'active' : ''}
                    onClick={() => setMedicineView('grid')}
                    title="Dạng lưới"
                  >
                    <FaTh />
                  </button>
                  <button
                    type="button"
                    className={medicineView === 'list' ? 'active' : ''}
                    onClick={() => setMedicineView('list')}
                    title="Dạng danh sách"
                  >
                    <FaList />
                  </button>
                </div>
                <button type="button" className="front-desk-page-btn front-desk-page-btn-outline" onClick={() => setSearch('')}>
                  <FaUndo />
                </button>
              </div>
            </div>
            {loadingMedicines ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Đang tải thuốc...</div>
            ) : filteredMedicines.length > 0 ? (
              <div className={`medicine-grid medicine-view-${medicineView}`} style={medicineGridStyle}>
                {filteredMedicines.map((medicine) => {
                  const stock = Number(medicine.stock_total ?? medicine.stock ?? medicine.quantity ?? 0);
                  const inCart = cart.find((item) => item.id === medicine.id);
                  const goToImport = () => {
                    navigate('/quan-ly-kho-thuoc', {
                      state: {
                        autoOpenImport: true,
                        importMedicine: {
                          id: medicine.id,
                          name: medicine.name,
                          unit: medicine.unit,
                        },
                      },
                    });
                  };
                  const cardClass = medicineView === 'grid'
                    ? 'medicine-card medicine-card-compact'
                    : 'medicine-card medicine-card-list';
                  const isOutOfStock = stock <= 0;
                  return (
                    <div key={medicine.id} className={`medicine-card-shell ${isOutOfStock ? 'out-of-stock-shell' : ''}`}>
                      {isOutOfStock ? (
                        <div className={`${cardClass} out-of-stock`}>
                          <div className="medicine-card-head">
                            <div className="medicine-card-name">{medicine.name}</div>
                            <div className="medicine-card-head-right">
                              <strong className="medicine-card-price">{formatMoney(medicine.price || medicine.export_price || 0)}</strong>
                              <span className="medicine-card-status medicine-card-status-out">Hết hàng</span>
                            </div>
                          </div>
                          <div className="medicine-card-meta">
                            {medicine.unit || '—'} · Tồn: {stock}
                          </div>
                          <div className="medicine-card-actions">
                            <button type="button" className="medicine-import-btn medicine-import-btn-inline" onClick={goToImport} title="Nhập kho" aria-label="Nhập kho">
                              <FaFileImport />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`${cardClass} ${inCart ? 'in-cart' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => addMedicine(medicine)}
                        >
                          <div className="medicine-card-head">
                            <div className="medicine-card-name">{medicine.name}</div>
                            <div className="medicine-card-head-right">
                              <strong className="medicine-card-price">{formatMoney(medicine.price || medicine.export_price || 0)}</strong>
                              {inCart ? (
                                <span className="medicine-card-status medicine-card-status-in-cart">x{inCart.qty}</span>
                              ) : (
                                <span className="medicine-card-status medicine-card-status-add"><FaPlus /> Thêm</span>
                              )}
                            </div>
                          </div>
                          <div className="medicine-card-meta">
                            {medicine.unit || '—'} · Tồn: {stock}
                          </div>
                          {medicineView === 'list' && (
                            <div className="medicine-card-footnote">
                              Nhấn để thêm vào đơn
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Không tìm thấy thuốc phù hợp</div>
            )}
          </div>
        </div>

        <div className="front-desk-page-panel">
          <div className="front-desk-page-panel-header">
            <span><FaShoppingCart className="me-2" /> Đơn hàng ({cart.length})</span>
            <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatMoney(totalAmount)}</span>
          </div>

          <div className="front-desk-page-panel-body" style={{ maxHeight: '72vh', overflow: 'auto' }}>
            <div className="front-desk-page-order-shell">
            <div className="front-desk-page-total-summary compact">
              <div>
                <div className="front-desk-page-total-label">Tổng phải trả</div>
                <div className="front-desk-page-total-amount">{formatMoney(totalAmount)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="front-desk-page-total-label">Đổi</div>
                <div className="front-desk-page-total-amount">{formatMoney(changeAmount)}</div>
              </div>
            </div>

            <div>
              <div className="front-desk-page-section-title">Danh sách đã chọn</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {cart.length > 0 ? cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="cart-item">
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{formatMoney(item.price || item.export_price || 0)}</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    className="front-desk-page-input"
                    value={item.qty}
                    onChange={(e) => updateQty(index, e.target.value)}
                  />
                  <div style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                    {formatMoney((item.price || item.export_price || 0) * Number(item.qty || 0))}
                  </div>
                  <button type="button" onClick={() => removeFromCart(index)} style={{ border: 'none', background: 'transparent', color: '#dc2626' }}>
                    <FaTrash />
                  </button>
                </div>
              )) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Giỏ hàng trống</div>
              )}
            </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Thông tin khách hàng</div>
              <div className="front-desk-page-customer-grid">
                <input className="front-desk-page-input" placeholder="Tên khách (không bắt buộc)" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                <input className="front-desk-page-input" placeholder="Số điện thoại" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              </div>
              <input className="front-desk-page-input" placeholder="Địa chỉ" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              <input className="front-desk-page-input" placeholder="Ghi chú" value={customer.note} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} />

              <div className="front-desk-page-payment-methods">
                <button
                  type="button"
                  className={`front-desk-page-payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <FaMoneyBillWave /> Tiền mặt
                </button>
                <button
                  type="button"
                  className={`front-desk-page-payment-option ${paymentMethod === 'transfer' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('transfer')}
                >
                  <FaQrcode /> Chuyển khoản / QR
                </button>
              </div>

              {paymentMethod === 'cash' ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Khách đưa (nhập chỉ số tiền)</div>
                  <input
                    className="currency-input"
                    inputMode="numeric"
                    value={cashReceived ? formatMoney(parseMoney(cashReceived)) : ''}
                    onChange={(e) => {
                      const raw = String(e.target.value).replace(/[^0-9]/g, '');
                      setCashReceived(raw);
                    }}
                    placeholder="0"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: '#f8fafc' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Tiền thối</span>
                    <strong style={{ color: '#15803d' }}>{formatMoney(changeAmount)}</strong>
                  </div>
                  <div className="currency-hint">Chỉ cần nhập số tiền khách đưa; hệ thống tự tính tiền thối.</div>
                </div>
              ) : (
                <div className="front-desk-page-payment-note">
                  Chọn chuyển khoản / QR thì chỉ cần nhấn xác nhận đã thanh toán.
                </div>
              )}

              <div className="front-desk-page-order-actions">
                <button className="front-desk-page-btn front-desk-page-btn-primary" type="button" onClick={handleCheckout} disabled={saving || cart.length === 0}>
                  <FaMoneyBillWave /> {saving ? 'Đang lưu...' : (paymentMethod === 'cash' ? 'Xác nhận thanh toán' : 'Xác nhận đã thanh toán')}
                </button>
                <button
                  className="front-desk-page-btn front-desk-page-btn-outline"
                  type="button"
                  onClick={() => printInvoice(lastInvoice || { code: `REL${Date.now()}`, items: cart, customer, total_amount: totalAmount, payment_method: paymentMethod })}
                  disabled={cart.length === 0 && !lastInvoice}
                >
                  <FaPrint /> In bill
                </button>
                <button
                  className="front-desk-page-btn front-desk-page-btn-outline"
                  type="button"
                  onClick={() => {
                    setCart([]);
                    setCustomer({ name: '', phone: '', address: '', note: '' });
                    setPaymentMethod('cash');
                    setCashReceived('');
                  }}
                >
                  <FaUndo /> Làm mới
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="front-desk-page-panel" style={{ marginTop: 12 }}>
        <div className="front-desk-page-panel-header">
          <span><FaReceipt className="me-2" /> Hóa đơn gần đây</span>
          <button type="button" className="front-desk-page-btn front-desk-page-btn-outline" onClick={loadInvoices}>Tải lại</button>
        </div>
        <div className="front-desk-page-panel-body" style={{ overflow: 'auto' }}>
          {loadingInvoices ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Đang tải hóa đơn...</div>
          ) : (
            <table className="front-desk-page-table border rounded">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  <th>Khách hàng</th>
                  <th>SL</th>
                  <th>Tổng tiền</th>
                  <th>Ngày bán</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id || invoice.code}>
                    <td><span className="fw-bold text-primary">{invoice.code}</span></td>
                    <td>{invoice.customer_name || invoice.customer?.name || 'Khách lẻ'}<br /><small className="text-muted">{invoice.customer_phone || invoice.customer?.phone || '--'}</small></td>
                    <td className="text-center">{invoice.item_count || (invoice.items ? invoice.items.length : 0)}</td>
                    <td className="fw-bold text-danger">{formatMoney(invoice.amount || invoice.total_amount || invoice.final_amount || 0)}</td>
                    <td>{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyRetailPage;

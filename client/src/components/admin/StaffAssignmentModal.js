import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { normalizeUserList } from '../../utils/normalizeUser';
import { FaSearch, FaTimes, FaSave, FaUserMd, FaSitemap, FaUserTie, FaCheckSquare, FaSquare } from 'react-icons/fa';
import './StaffAssignmentModal.css';

const StaffAssignmentModal = ({ staffId, staffName, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  // --- THÊM ĐOẠN NÀY ---
  const [financeRole, setFinanceRole] = useState('cashier'); // Mặc định là Thu ngân

  const handleFinanceRoleChange = (role) => {
    setFinanceRole(role);
  };
  // ---------------------

  // --- BẮT ĐẦU THÊM MỚI ---
  // Định nghĩa các mẫu quyền cho từng vai trò tài chính
  // --- BẮT ĐẦU SỬA: ĐỊNH NGHĨA QUYỀN CHUẨN ---
  const FINANCE_ROLE_PERMISSIONS = {
    cashier: { // Thu ngân
      payments: ['view', 'verify'], // Đối soát giao dịch
      pharmacy: ['view', 'export_retail', 'export_prescription']
    },
    accountant: { // Kế toán
      payments: ['view', 'verify', 'approve', 'refund', 'config_refund'], 
      pharmacy: ['view', 'view_transactions', 'view_alerts'],
      refund_requests: ['view', 'approve', 'reject'], 
      statistics: ['view', 'revenue', 'export'] // Thêm export vào đây, bỏ dòng reports
    },
    manager: { // Trưởng phòng Tài chính
      payments: ['view', 'verify', 'approve', 'refund', 'config_refund'], 
      pharmacy: ['view', 'import', 'export_retail', 'export_prescription', 'view_batches', 'view_transactions', 'manage_suppliers', 'view_alerts', 'adjust_stock'],
      refund_requests: ['view', 'approve', 'reject'], 
      statistics: ['view', 'revenue', 'export'] // Thêm export vào đây, bỏ dòng reports
    }
  };

  const [formData, setFormData] = useState({
    department: 'clinical',
    rank: 'staff',
    manager_id: '',
    managed_doctor_ids: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Gọi song song 3 API
        const [resManagers, resDoctors, resCurrent] = await Promise.all([
          api.get('/staff/list?rank=manager'),
          api.get('/users/by-role?role=doctor&limit=1000'), 
          api.get(`/staff/${staffId}`)
        ]);

        setManagers(resManagers.data.data || []);
        
        // API /users/by-role?role=doctor đã trả về id = Doctor.id (không phải User.id)
  const doctorList = resDoctors.data.users || resDoctors.data.data || [];
  console.log('[StaffAssignmentModal] Loaded doctors:', doctorList.map(d => ({ id: d.id, name: d.full_name })));
  setDoctors(normalizeUserList(doctorList, 'doctor'));
        const current = resCurrent.data.data;
        setFormData({
          department: current.department || 'clinical',
          rank: current.rank || 'staff',
          manager_id: current.manager_id || '',
          managed_doctor_ids: current.managed_doctors?.doctor_ids || []
        });
        // --- THÊM ĐOẠN NÀY (Để tự động chọn đúng Radio khi mở modal sửa) ---
        if (current.department === 'finance') {
           // Map từ mô tả công việc sang key của radio button
           if (current.job_description === 'Kế toán Tổng hợp') setFinanceRole('accountant');
           else if (current.job_description === 'Quản lý Dịch vụ & Giá') setFinanceRole('manager');
           else setFinanceRole('cashier');
        }
        // ------------------------------------------------------------------
      } catch (error) {
        console.error(error);
        toast.error('Lỗi tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [staffId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // --- BẮT ĐẦU SỬA ---
      const payload = {
        department: formData.department,
        rank: formData.rank,
        manager_id: formData.manager_id || null,
        doctor_ids: formData.managed_doctor_ids,
        finance_role: formData.department === 'finance' ? financeRole : null,
        // Finance: gửi quyền cụ thể. Các phòng ban khác: báo backend dùng template mặc định
        permissions: formData.department === 'finance' ? FINANCE_ROLE_PERMISSIONS[financeRole] : undefined,
        apply_default_permissions: formData.department !== 'finance'
      };

      await api.put(`/staff/${staffId}/assign-doctors`, payload);
// --- KẾT THÚC SỬA ---
      toast.success('Cập nhật thành công!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Lỗi cập nhật');
      console.error(error); // Nên log lỗi ra để debug
    }
  };

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => 
      (doc.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [doctors, searchTerm]);

  const currentDoctors = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);

  const toggleDoctor = (id) => {
    setFormData(prev => {
      const exists = prev.managed_doctor_ids.includes(id);
      return {
        ...prev,
        managed_doctor_ids: exists
          ? prev.managed_doctor_ids.filter(d => d !== id)
          : [...prev.managed_doctor_ids, id]
      };
    });
  };

  return (
    <div className="staff-assignment-modal-overlay">
      <div className="staff-assignment-modal-container">
        
        {/* HEADER */}
        <div className="staff-assignment-modal-header">
          <div className="staff-assignment-modal-title-group">
            <FaUserTie className="staff-assignment-modal-icon-title" />
            <div>
              <h3>Phân Công Nhân Sự</h3>
              <span className="staff-assignment-modal-subtitle">Nhân viên: <strong>{staffName}</strong></span>
            </div>
          </div>
          <button onClick={onClose} className="staff-assignment-modal-close-btn"><FaTimes /></button>
        </div>

        {loading ? <div className="staff-assignment-modal-loading">Đang tải dữ liệu...</div> : (
          <form onSubmit={handleSubmit} className="staff-assignment-modal-body">
            
            {/* 1. CẤU TRÚC */}
            <div className="staff-assignment-modal-section">
              <h4 className="staff-assignment-modal-section-title"><FaSitemap /> Cấu Trúc & Vai Trò</h4>
              <div className="staff-assignment-modal-grid">
                {/* 1. Phần chọn Phòng Ban (Giữ nguyên hoặc đảm bảo đã có) */}
                <div className="staff-assignment-modal-input-group">
                  <label>Phòng Ban</label>
                  <select 
                    className="staff-assignment-modal-select"
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                  >
                    <option value="clinical">Vận hành Lâm sàng (Y tá)</option>
                    <option value="system">Quản trị Hệ thống (IT)</option>
                    <option value="support">CSKH & Hỏi đáp</option>
                    <option value="finance">Tài chính Kế toán</option>
                    <option value="content">Nội dung Y tế</option>
                  </select>
                </div>

                {/* --- BẮT ĐẦU ĐOẠN CODE MỚI (CHỈ CHÈN 1 LẦN) --- */}
                {formData.department === 'finance' && (
                  <div className="staff-assignment-modal-input-group full-width" style={{marginTop: '15px', background: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '1px solid #c8e6c9'}}>
                    <label style={{marginBottom: '10px', display: 'block', fontWeight: 'bold', color: '#2e7d32', fontSize: '13px', textTransform: 'uppercase'}}>
                      Chọn vai trò Tài chính (Phân quyền tự động)
                    </label>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                      {/* Option 1: Thu ngân */}
                      <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0'}}>
                        <input 
                          type="radio" 
                          name="finance_role" 
                          value="cashier"
                          checked={financeRole === 'cashier'}
                          onChange={(e) => handleFinanceRoleChange(e.target.value)}
                          style={{width: '18px', height: '18px', accentColor: '#2e7d32', cursor: 'pointer'}}
                        /> 
                        <div>
                          <strong style={{fontSize: '14px', color: '#333'}}>Nhân viên Thu ngân (Cashier)</strong>
                          <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                            Quyền: Đối soát giao dịch.
                          </div>
                        </div>
                      </label>

                      {/* Option 2: Kế toán */}
                      <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0'}}>
                        <input 
                          type="radio" 
                          name="finance_role" 
                          value="accountant"
                          checked={financeRole === 'accountant'}
                          onChange={(e) => handleFinanceRoleChange(e.target.value)}
                          style={{width: '18px', height: '18px', accentColor: '#2e7d32', cursor: 'pointer'}}
                        /> 
                        <div>
                          <strong style={{fontSize: '14px', color: '#333'}}>Kế toán Tổng hợp (Accountant)</strong>
                          <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                            Quyền: Đối soát, Xử lý hoàn tiền, Xem báo cáo thống kê.
                          </div>
                        </div>
                      </label>

                      {/* Option 3: Quản lý Giá */}
                      <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0'}}>
                        <input 
                          type="radio" 
                          name="finance_role" 
                          value="manager"
                          checked={financeRole === 'manager'}
                          onChange={(e) => handleFinanceRoleChange(e.target.value)}
                          style={{width: '18px', height: '18px', accentColor: '#2e7d32', cursor: 'pointer'}}
                        /> 
                        <div>
                          <strong style={{fontSize: '14px', color: '#333'}}>Trưởng phòng Tài chính (Manager)</strong>
                          <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                            Quyền: Đối soát, Hoàn tiền, Báo cáo thống kê, Cấu hình hoàn tiền & tài khoản.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
                {/* --- KẾT THÚC ĐOẠN CODE MỚI --- */}
                <div className="staff-assignment-modal-input-group full-width">
                  <label>Quản lý trực tiếp</label>
                  <select 
                    className="staff-assignment-modal-select"
                    value={formData.manager_id}
                    onChange={e => setFormData({...formData, manager_id: e.target.value})}
                  >
                    <option value="">-- Trực thuộc Ban Giám Đốc --</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.username} ({m.department})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. PHÂN CÔNG BÁC SĨ (Điều kiện hiển thị) */}
            {formData.department === 'clinical' && formData.rank === 'staff' ? (
              <div className="staff-assignment-modal-section">
                <div className="staff-assignment-modal-section-header">
                  <h4 className="staff-assignment-modal-section-title"><FaUserMd /> Bác Sĩ Phụ Trách</h4>
                  <div className="staff-assignment-modal-search-box">
                    <FaSearch /><input type="text" placeholder="Tìm tên/email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="staff-assignment-modal-list-container">
                  <div className="staff-assignment-modal-list-body">
                    {currentDoctors.map(doc => (
                      <div key={doc.id} className={`staff-assignment-modal-list-item ${formData.managed_doctor_ids.includes(doc.id) ? 'selected' : ''}`} onClick={() => toggleDoctor(doc.id)}>
                        <div className="staff-assignment-modal-col-checkbox">
                          {formData.managed_doctor_ids.includes(doc.id) ? <FaCheckSquare className="checkbox-active" /> : <FaSquare className="checkbox-inactive" />}
                        </div>
                        <div className="staff-assignment-modal-col-name">
                          {doc.full_name} <span style={{fontSize: '11px', color: '#888', marginLeft: '5px'}}>({doc.email})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Pagination (Giữ nguyên logic cũ) */}
                <div className="staff-assignment-modal-pagination">
                   {totalPages > 1 && (
                     <>
                       <button type="button" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>Prev</button>
                       <span>{currentPage}/{totalPages}</span>
                       <button type="button" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>Next</button>
                     </>
                   )}
                </div>
              </div>
            ) : (
              <div className="staff-assignment-modal-info-box">
                ℹ️ Chức năng <strong>Phân công bác sĩ</strong> chỉ khả dụng khi chọn phòng ban là <strong>Vận hành Lâm sàng</strong> và cấp bậc <strong>Nhân viên</strong>.
              </div>
            )}

            <div className="staff-assignment-modal-footer">
              <button type="button" onClick={onClose} className="staff-assignment-modal-btn-cancel">Hủy bỏ</button>
              <button type="submit" className="staff-assignment-modal-btn-save"><FaSave /> Lưu Thay Đổi</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StaffAssignmentModal;
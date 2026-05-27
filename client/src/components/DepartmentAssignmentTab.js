// client/src/components/DepartmentAssignmentTab.js

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  FaUsers, FaSearch, FaExchangeAlt, FaBuilding, FaUserTie,
  FaCheckCircle, FaFilter, FaEdit, FaUndo, FaSort, FaSortUp, FaSortDown, FaTimes, FaSave, FaPalette
} from 'react-icons/fa';
import './DepartmentAssignmentTab.css';
import './DeptAssign-ColorConfig.css';
import { useDepartmentColors } from '../contexts/DepartmentColorContext';
import { getRoleProfile, findRoleProfileByPermissions } from '../config/departmentRoleProfiles';

const DepartmentAssignmentTab = ({ DEPARTMENTS, departmentColors }) => {
  const { updateDepartmentColor, resetToDefaults } = useDepartmentColors();
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRank, setFilterRank] = useState('all');
  const [filterRoleProfile, setFilterRoleProfile] = useState('all');
  
  // Sort State
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Selection State
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  
  // Modal States
  const [modalType, setModalType] = useState(null); // 'single' or 'bulk' or 'color' or null
  const [editingStaff, setEditingStaff] = useState(null);
  const [formState, setFormState] = useState({ department: '', rank: '', role_profile: '' });
  const [roleProfiles, setRoleProfiles] = useState([]);
  
  // Color config state
  const [showColorConfig, setShowColorConfig] = useState(false);
  const [tempColors, setTempColors] = useState({});
  const [financeRole, setFinanceRole] = useState('cashier');

  useEffect(() => {
    loadAllStaff();
  }, []);

  const loadAllStaff = async () => {
    try {
      setLoading(true);
      const response = await api.get('/staff/all');
      if (response.data.success) {
        setAllStaff(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC XỬ LÝ DỮ LIỆU (Filter & Sort) ---
  const processedStaff = useMemo(() => {
    let result = [...allStaff];

    // 1. Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.User?.full_name || '').toLowerCase().includes(lowerSearch) ||
        (s.code || '').toLowerCase().includes(lowerSearch) ||
        (s.User?.email || '').toLowerCase().includes(lowerSearch)
      );
    }
    if (filterDepartment !== 'all') {
      result = result.filter(s => s.department === filterDepartment);
    }
    if (filterRank !== 'all') {
      result = result.filter(s => s.rank === filterRank);
    }

    if (filterRoleProfile !== 'all') {
      result = result.filter(s => {
        const roleInfo = s.role_info || s.roleInfo || s.role_meta || null;
        const explicit = roleInfo?.role_profile || s.role_profile || null;
        if (explicit) return explicit === filterRoleProfile;
        const matched = findRoleProfileByPermissions(s.department, s.permissions, s.job_description);
        return (matched?.code || '') === filterRoleProfile;
      });
    }

    // 2. Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = '';
        let valB = '';

        // Mapping key sang value thực tế
        switch (sortConfig.key) {
            case 'name': 
                valA = a.User?.full_name || ''; valB = b.User?.full_name || ''; break;
            case 'code': 
                valA = a.code || ''; valB = b.code || ''; break;
            case 'department': 
                valA = DEPARTMENTS[a.department]?.name || a.department || ''; 
                valB = DEPARTMENTS[b.department]?.name || b.department || ''; break;
            case 'rank': 
                valA = a.rank || ''; valB = b.rank || ''; break;
            default: break;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allStaff, searchTerm, filterDepartment, filterRank, sortConfig, DEPARTMENTS]);

  // --- HANDLERS ---

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort size={10} color="#ccc" />;
    return sortConfig.direction === 'asc' ? <FaSortUp size={10}/> : <FaSortDown size={10}/>;
  };

  const toggleSelectStaff = (id) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === processedStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(processedStaff.map(s => s.id));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDepartment('all');
    setFilterRank('all');
    setFilterRoleProfile('all');
    setSortConfig({ key: 'created_at', direction: 'desc' });
    toast.info('Đã reset bộ lọc');
  };

  // --- COLOR CONFIG HANDLERS ---
  const openColorConfig = () => {
    setTempColors({ ...departmentColors });
    setShowColorConfig(true);
  };

  const closeColorConfig = () => {
    setShowColorConfig(false);
    setTempColors({});
  };

  const handleColorChange = (deptCode, color) => {
    setTempColors(prev => ({ ...prev, [deptCode]: color }));
  };

  const handleSaveColors = () => {
    Object.entries(tempColors).forEach(([deptCode, color]) => {
      updateDepartmentColor(deptCode, color);
    });
    toast.success('Đã lưu cấu hình màu sắc');
    closeColorConfig();
  };

  const handleResetColors = () => {
    resetToDefaults();
    toast.success('Đã reset về màu mặc định');
    closeColorConfig();
  };

  // --- MODAL HANDLERS ---

  const openEditModal = (staff) => {
    const roleInfo = staff.role_info || staff.roleInfo || staff.role_meta || null;
    const derived = roleInfo?.role_profile || staff.role_profile || (findRoleProfileByPermissions(staff.department, staff.permissions, staff.job_description)?.code) || '';
    setEditingStaff(staff);
    setFormState({ department: staff.department, rank: staff.rank, role_profile: derived });
    setModalType('single');
  };

  const openBulkModal = () => {
    setFormState({ department: '', rank: '', role_profile: '' });
    setModalType('bulk');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingStaff(null);
    setFormState({ department: '', rank: '', role_profile: '' });
    setRoleProfiles([]);
  };

  useEffect(() => {
    const loadRoleProfiles = async () => {
      if (!modalType || !formState.department || formState.department === 'BGD') {
        setRoleProfiles([]);
        return;
      }

      try {
        const res = await api.get(`/staff/role-profiles/${formState.department}`);
        if (res.data.success) {
          const nextProfiles = res.data.data || [];
          setRoleProfiles(nextProfiles);
          setFormState(prev => {
            if (!prev.department || prev.department !== formState.department) {
              return prev;
            }

            const selectedExists = nextProfiles.some(profile => profile.code === prev.role_profile);
            if (selectedExists || nextProfiles.length === 0) {
              return prev;
            }

            return {
              ...prev,
              role_profile: nextProfiles[0].code
            };
          });
        } else {
          setRoleProfiles([]);
          setFormState(prev => ({
            ...prev,
            role_profile: prev.department === formState.department ? '' : prev.role_profile
          }));
        }
      } catch (error) {
        setRoleProfiles([]);
        setFormState(prev => ({
          ...prev,
          role_profile: prev.department === formState.department ? '' : prev.role_profile
        }));
      }
    };

    loadRoleProfiles();
  }, [modalType, formState.department]);

  const handleSave = async () => {
    try {
        const extraData = {};

      if (formState.role_profile) {
        extraData.role_profile = formState.role_profile;
      }

        if (modalType === 'single') {
            // Update Single
          if (
            formState.department === editingStaff.department &&
            formState.rank === editingStaff.rank &&
            !formState.role_profile &&
            formState.department !== 'finance'
          ) {
                toast.info('Không có thay đổi nào');
                closeModal();
                return;
            }
            // Gửi thêm extraData vào request
            const res = await api.put(`/staff/${editingStaff.id}`, { ...formState, ...extraData });
            if (res.data.success) {
                toast.success('Cập nhật thành công');
                loadAllStaff();
            }
        } else if (modalType === 'bulk') {
            // Update Bulk
            if (!formState.department && !formState.rank) {
                toast.warning('Vui lòng chọn ít nhất một thông tin để cập nhật');
                return;
            }
            // Gửi thêm extraData vào request
            const payload = {
                staff_ids: selectedStaffIds,
                ...(formState.department && { department: formState.department }),
                ...(formState.rank && { rank: formState.rank }),
                ...extraData
            };
            const res = await api.post('/staff/bulk-update', payload);
            if (res.data.success) {
                toast.success(`Đã cập nhật ${selectedStaffIds.length} nhân viên`);
                setSelectedStaffIds([]); // Clear selection
                loadAllStaff();
            }
        }
        closeModal();
    } catch (error) {
        console.error("Update error", error);
        toast.error('Có lỗi xảy ra khi cập nhật');
    }
  };

  const getRankLabel = (rank) => {
    const map = { manager: 'Trưởng phòng', staff: 'Nhân viên', admin: 'Quản trị' };
    return map[rank] || rank;
  };

  const availableRoleProfiles = useMemo(() => {
    const codes = new Set();
    const list = filterDepartment === 'all' ? allStaff : allStaff.filter(s => s.department === filterDepartment);
    list.forEach(s => {
      const roleInfo = s.role_info || s.roleInfo || s.role_meta || null;
      const code = roleInfo?.role_profile || s.role_profile || (findRoleProfileByPermissions(s.department, s.permissions, s.job_description)?.code);
      if (code) codes.add(code);
    });
    return Array.from(codes).map(code => {
      const deptForLookup = filterDepartment === 'all' ? (allStaff.find(s => (s.role_profile === code || (s.role_info && s.role_info.role_profile === code)) ) || {}).department : filterDepartment;
      const profile = getRoleProfile(deptForLookup, code);
      return { code, name: profile?.name || code };
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [allStaff, filterDepartment]);

  return (
    <div className="DeptAssign-container">
      {/* 1. Header */}
      <div className="DeptAssign-header">
        <div className="DeptAssign-header-left">
          <h3><FaUsers /> Phân bổ phòng ban</h3>
          <p>Quản lý nhân sự, thuyên chuyển công tác</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={openColorConfig}
            className="DeptAssign-color-config-btn"
          >
            <FaPalette /> Cấu hình màu
          </button>
          <span className="DeptAssign-total-badge">
            Tổng: <strong>{allStaff.length}</strong>
          </span>
        </div>
      </div>

      {/* 2. Toolbar */}
      <div className="DeptAssign-toolbar">
        <div className="DeptAssign-search-wrapper">
          <FaSearch className="DeptAssign-search-icon" />
          <input
            type="text"
            className="DeptAssign-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, mã, email..."
          />
        </div>

        <select 
          className="DeptAssign-select"
          value={filterDepartment} 
          onChange={(e) => setFilterDepartment(e.target.value)}
        >
          <option value="all">-- Tất cả Phòng ban --</option>
          {Object.entries(DEPARTMENTS).map(([key, dept]) => (
            <option key={key} value={key}>{dept.name}</option>
          ))}
        </select>

        <select 
          className="DeptAssign-select"
          value={filterRoleProfile}
          onChange={(e) => setFilterRoleProfile(e.target.value)}
        >
          <option value="all">-- Tất cả Vai trò con --</option>
          {availableRoleProfiles.map(p => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>

        <select 
          className="DeptAssign-select"
          value={filterRank} 
          onChange={(e) => setFilterRank(e.target.value)}
        >
          <option value="all">-- Tất cả Chức vụ --</option>
          <option value="manager">Trưởng phòng</option>
          <option value="staff">Nhân viên</option>
        </select>

        {/* Nút Reset đặt ngay cạnh, không xuống dòng */}
        <button 
          onClick={handleResetFilters}
          className="DeptAssign-btn DeptAssign-btn-secondary"
          title="Xóa bộ lọc"
        >
          <FaUndo />
        </button>

        {/* Nút Bulk Update chỉ hiện khi có chọn */}
        {selectedStaffIds.length > 0 && (
            <>
                <div className="DeptAssign-divider"></div>
                <button 
                    onClick={openBulkModal}
                    className="DeptAssign-btn DeptAssign-btn-primary"
                >
                    <FaExchangeAlt /> Cập nhật hàng loạt ({selectedStaffIds.length})
                </button>
            </>
        )}
      </div>

      {/* 3. Table */}
      <div className="DeptAssign-content">
        {loading ? (
          <div className="DeptAssign-loading">Đang tải dữ liệu...</div>
        ) : processedStaff.length === 0 ? (
          <div className="DeptAssign-empty">Không tìm thấy nhân viên nào</div>
        ) : (
          <table className="DeptAssign-table">
            <thead>
              <tr>
                <th style={{width: '40px', textAlign: 'center'}}>
                  <input
                    type="checkbox"
                    className="DeptAssign-checkbox"
                    checked={selectedStaffIds.length === processedStaff.length && processedStaff.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th onClick={() => handleSort('name')}>
                    Nhân viên {getSortIcon('name')}
                </th>
                <th onClick={() => handleSort('code')}>
                    Mã NV {getSortIcon('code')}
                </th>
                <th onClick={() => handleSort('department')}>
                    Phòng ban {getSortIcon('department')}
                </th>
                <th onClick={() => handleSort('rank')}>
                    Chức vụ {getSortIcon('rank')}
                </th>
                <th style={{textAlign: 'right'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {processedStaff.map(staff => {
                const isSelected = selectedStaffIds.includes(staff.id);
                return (
                  <tr key={staff.id} className={isSelected ? 'DeptAssign-row-selected' : ''}>
                    <td style={{textAlign: 'center'}}>
                      <input
                        type="checkbox"
                        className="DeptAssign-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStaff(staff.id)}
                      />
                    </td>
                    <td>
                      <div className="DeptAssign-user-cell">
                        <div className="DeptAssign-user-avatar">
                            {staff.User?.avatar_url ? <img src={staff.User.avatar_url} alt="" /> : (staff.User?.full_name?.charAt(0) || 'U')}
                        </div>
                        <div className="DeptAssign-user-info">
                            <span className="DeptAssign-user-name">{staff.User?.full_name || staff.username}</span>
                            <span className="DeptAssign-user-sub">{staff.User?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="DeptAssign-text-code">{staff.code}</span></td>
                    <td>
                        <span 
                          className="DeptAssign-badge DeptAssign-badge-dept"
                          style={{ 
                            background: `${departmentColors[staff.department]}20`,
                            color: departmentColors[staff.department],
                            borderLeft: `3px solid ${departmentColors[staff.department]}`
                          }}
                        >
                            <FaBuilding size={10} style={{marginRight:4}}/>
                            {DEPARTMENTS[staff.department]?.name || staff.department}
                        </span>
                    </td>
                    {/* --- SỬA CỘT CHỨC VỤ ĐỂ HIỆN THÊM VAI TRÒ TÀI CHÍNH --- */}
                    <td>
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px'}}>
                            <span className="DeptAssign-badge DeptAssign-badge-rank">
                                {getRankLabel(staff.rank)}
                            </span>
                            {/* Hiển thị vai trò con (role profile) nếu có, hoặc mô tả công việc */}
                            {(() => {
                                const roleInfo = staff.role_info || staff.roleInfo || staff.role_meta || null;
                                const explicit = roleInfo?.role_profile || staff.role_profile || null;
                                let label = '';
                                if (explicit) {
                                  const profile = getRoleProfile(staff.department, explicit);
                                  label = profile?.name || explicit;
                                } else {
                                  const matched = findRoleProfileByPermissions(staff.department, staff.permissions, staff.job_description);
                                  label = matched?.name || staff.job_description || '';
                                }

                                return label ? (
                                  <span style={{
                                    fontSize: '11px',
                                    color: '#155724',
                                    backgroundColor: '#d4edda',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #c3e6cb',
                                    whiteSpace: 'nowrap',
                                    fontWeight: '500'
                                  }}>{label}</span>
                                ) : null;
                            })()}
                        </div>
                    </td>
                    {/* ----------------------------------------------------- */}
                    <td style={{textAlign: 'right'}}>
                        <button className="DeptAssign-action-btn" onClick={() => openEditModal(staff)}>
                            <FaEdit /> Sửa
                        </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Footer */}
      <div className="DeptAssign-footer">
        <span>Hiển thị <strong>{processedStaff.length}</strong> bản ghi</span>
        {selectedStaffIds.length > 0 && (
            <span className="DeptAssign-selected-info">
                <FaCheckCircle size={12}/> Đã chọn {selectedStaffIds.length} nhân viên
            </span>
        )}
      </div>

      {/* 5. Shared Modal for Edit & Bulk Update */}
      {modalType && (
        <div className="DeptAssign-modal-overlay" onClick={closeModal}>
            <div className="DeptAssign-modal" onClick={e => e.stopPropagation()}>
                <div className="DeptAssign-modal-header">
                    <h3>
                        {modalType === 'single' ? <FaEdit /> : <FaExchangeAlt />}
                        {modalType === 'single' ? 'Chỉnh sửa nhân viên' : 'Cập nhật hàng loạt'}
                    </h3>
                    <button className="DeptAssign-modal-close" onClick={closeModal}><FaTimes/></button>
                </div>
                
                <div className="DeptAssign-modal-body">
                    {/* Nếu là single edit thì hiện thông tin user */}
                    {modalType === 'single' && editingStaff && (
                        <div className="DeptAssign-modal-info-box">
                            <div className="DeptAssign-user-avatar">
                                {editingStaff.User?.full_name?.charAt(0)}
                            </div>
                            <div>
                                <strong>{editingStaff.User?.full_name}</strong>
                                <div style={{fontSize: 12, color: '#666'}}>{editingStaff.code}</div>
                            </div>
                        </div>
                    )}

                    {/* Nếu là bulk update thì hiện số lượng đang chọn */}
                    {modalType === 'bulk' && (
                        <div className="DeptAssign-modal-info-box" style={{background: '#FFF3E0', borderColor: '#FFE0B2'}}>
                            <FaCheckCircle color="#F57C00"/> 
                            <span>Đang áp dụng cho <strong>{selectedStaffIds.length}</strong> nhân viên đã chọn.</span>
                        </div>
                    )}

                    {/* Form Fields */}
                    <div className="DeptAssign-form-group">
                        <label>Phòng ban mới</label>
                        <select 
                            className="DeptAssign-modal-select"
                            value={formState.department}
                          onChange={(e) => setFormState({...formState, department: e.target.value, role_profile: ''})}
                        >
                            {modalType === 'bulk' ? <option value="">-- Giữ nguyên (Không đổi) --</option> : null}
                            {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                                <option key={key} value={key}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="DeptAssign-form-group">
                        <label>Chức vụ mới</label>
                        <select 
                            className="DeptAssign-modal-select"
                            value={formState.rank}
                        onChange={(e) => setFormState({...formState, rank: e.target.value, role_profile: ''})}
                        >
                            {modalType === 'bulk' ? <option value="">-- Giữ nguyên (Không đổi) --</option> : null}
                            <option value="manager">Trưởng phòng</option>
                            <option value="staff">Nhân viên</option>
                        </select>
                    </div>

                    {formState.department && formState.department !== 'BGD' && (
                      <div className="DeptAssign-form-group">
                        <label>Vai trò con</label>
                        <select
                          className="DeptAssign-modal-select"
                          value={formState.role_profile}
                          onChange={(e) => setFormState({...formState, role_profile: e.target.value})}
                          disabled={roleProfiles.length === 0}
                        >
                          {roleProfiles.length > 0 ? (
                            roleProfiles.map(profile => (
                              <option key={profile.code} value={profile.code}>
                                {profile.name}
                              </option>
                            ))
                          ) : (
                            <option value="">Vai trò mặc định (cố định)</option>
                          )}
                        </select>
                        <div style={{fontSize: 12, color: '#666', marginTop: 6}}>
                          {roleProfiles.length > 0
                            ? 'Chọn vai trò con để tự áp dụng bộ quyền và mô tả công việc tương ứng.'
                            : 'Phòng ban này dùng vai trò mặc định cố định.'}
                        </div>
                      </div>
                    )}
                </div>

                <div className="DeptAssign-modal-footer">
                    <button className="DeptAssign-btn DeptAssign-btn-secondary" onClick={closeModal}>Hủy bỏ</button>
                    <button className="DeptAssign-btn DeptAssign-btn-primary" onClick={handleSave}>
                        <FaSave /> Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Color Config Modal */}
      {showColorConfig && (
        <div className="DeptAssign-modal-overlay" onClick={closeColorConfig}>
          <div className="DeptAssign-modal DeptAssign-modal-color" onClick={(e) => e.stopPropagation()}>
            <div className="DeptAssign-modal-header">
              <div>
                <h4><FaPalette /> Cấu hình màu sắc phòng ban</h4>
                <p style={{ fontSize: '13px', color: '#e6e6e6ff', margin: '4px 0 0 0' }}>
                  Màu này sẽ được áp dụng đồng bộ trên toàn bộ hệ thống
                </p>
              </div>
              <button className="DeptAssign-modal-close" onClick={closeColorConfig}>
                <FaTimes />
              </button>
            </div>

            <div className="DeptAssign-modal-body">
              <div className="DeptAssign-color-grid">
                {Object.entries(DEPARTMENTS).map(([deptCode, dept]) => (
                  <div key={deptCode} className="DeptAssign-color-item">
                    <div className="DeptAssign-color-label">
                      <span style={{ fontSize: '20px' }}>{dept.icon}</span>
                      <span style={{ fontWeight: '500', fontSize: '14px' }}>{dept.name}</span>
                    </div>
                    <div className="DeptAssign-color-picker-wrapper">
                      <input
                        type="color"
                        value={tempColors[deptCode] || departmentColors[deptCode] || '#757575'}
                        onChange={(e) => handleColorChange(deptCode, e.target.value)}
                        className="DeptAssign-color-input"
                      />
                      <span className="DeptAssign-color-hex">
                        {(tempColors[deptCode] || departmentColors[deptCode] || '#757575').toUpperCase()}
                      </span>
                    </div>
                    <div 
                      className="DeptAssign-color-preview"
                      style={{ 
                        background: tempColors[deptCode] || departmentColors[deptCode] || '#757575',
                        boxShadow: `0 0 0 3px ${tempColors[deptCode] || departmentColors[deptCode] || '#757575'}33`
                      }}
                    >
                      <FaCheckCircle style={{ color: 'white', fontSize: '20px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="DeptAssign-modal-footer">
              <button className="DeptAssign-btn DeptAssign-btn-secondary" onClick={handleResetColors}>
                <FaUndo /> Reset mặc định
              </button>
              <button className="DeptAssign-btn DeptAssign-btn-primary" onClick={handleSaveColors}>
                <FaSave /> Lưu màu sắc
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentAssignmentTab;
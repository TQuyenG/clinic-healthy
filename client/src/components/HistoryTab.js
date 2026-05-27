// client/src/components/HistoryTab.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import auditService from '../services/auditService';
import {
  FaHistory, FaSearch, FaFilter, FaTimes, FaRedo,
  FaFilePdf, FaFileExcel, FaArrowRight, FaClock,
  FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
import { getPermissionAuditChanges } from '../utils/permissionAudit';
import ROLE_PROFILES from '../config/departmentRoleProfiles';
import './HistoryTab.css';

const HistoryTab = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action_type: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.offset, sortBy, sortOrder]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        sortBy,
        sortOrder,
        limit: pagination.limit,
        offset: pagination.offset
      };
      const response = await auditService.getAuditLogs(params);
      setAuditLogs(response.data || []);
      setPagination(prev => ({ ...prev, total: response.total || 0 }));
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchAuditLogs();
  };

  const handleReset = () => {
    setFilters({ startDate: '', endDate: '', action_type: '' });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, offset: 0 }));
    setTimeout(fetchAuditLogs, 100);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Helper: Format permission value to Vietnamese
  const formatPermissionValue = (value) => {
    if (value === true || value === 'true') return <><FaCheckCircle style={{color: '#4caf50'}} /> Bật</>;
    if (value === false || value === 'false') return <><FaTimesCircle style={{color: '#f44336'}} /> Tắt</>;
    if (Array.isArray(value)) {
      if (value.length === 0) return <><FaTimesCircle style={{color: '#f44336'}} /> Không có quyền</>;
      return (
        <div style={{display: 'inline-flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center'}}>
          <FaCheckCircle style={{color: '#4caf50'}} /> 
          <span>Có quyền: </span>
          {value.map((perm, idx) => (
            <span key={idx} style={{
              background: '#e8f5e9', 
              color: '#2e7d32', 
              padding: '2px 8px', 
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {getPermissionActionName(perm)}
            </span>
          ))}
        </div>
      );
    }
    return String(value);
  };

  // Helper: Get module name in Vietnamese
  const getModuleName = (moduleKey) => {
    const moduleNames = {
      schedules: 'Lịch làm việc',
      appointments: 'Quản lý lịch hẹn',
      leave_requests: 'Yêu cầu nghỉ phép',
      overtime_requests: 'Yêu cầu tăng ca',
      flexible_schedule_requests: 'Lịch linh hoạt',
      doctors: 'Quản lý bác sĩ',
      patients: 'Quản lý bệnh nhân',
      medical_records: 'Hồ sơ bệnh án',
      articles: 'Quản lý bài viết',
      forum: 'Diễn đàn',
      consultations: 'Tư vấn trực tuyến',
      consultation_pricing: 'Gói tư vấn (Pricing)',
      payments: 'Thanh toán',
      services: 'Dịch vụ y tế',
      service_categories: 'Danh mục dịch vụ',
      system_settings: 'Cài đặt hệ thống',
      staff_management: 'Quản lý nhân viên'
    };
    return moduleNames[moduleKey] || moduleKey;
  };

  // Helper: Get permission action name in Vietnamese
  const getPermissionActionName = (actionKey) => {
    const actionNames = {
      // Common permissions
      view: 'Xem',
      create: 'Tạo mới',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      approve: 'Duyệt',
      reject: 'Từ chối',
      manage: 'Quản lý',
      hide: 'Ẩn/Hiện',
      cancel: 'Hủy',
      assign: 'Phân công',
      
      // Schedule permissions
      manage_schedule: 'Quản lý lịch',
      
      // Article permissions
      create_draft: 'Tạo nháp',
      suggest_medicine: 'Đề xuất thuốc',
      approve_medicine: 'Duyệt thuốc',
      create_medicine: 'Tạo thuốc',
      suggest_disease: 'Đề xuất bệnh lý',
      approve_disease: 'Duyệt bệnh lý',
      create_disease: 'Tạo bệnh lý',
      
      // Forum permissions (5 quyền chính)
      create_topic: 'Tạo topic',
      edit_topic: 'Sửa topic',
      toggle_topic: 'Ẩn/hiện topic',
      delete_topic: 'Xóa topic',
      assign_moderators: 'Phân công kiểm duyệt',
      
      // Consultation permissions
      reply: 'Trả lời',
      close: 'Đóng',
      
      // Payment permissions
      verify: 'Xác minh',
      refund: 'Hoàn tiền',
      
      // System settings permissions
      view_audit_logs: 'Xem lịch sử chỉnh sửa',
      edit_home: 'Quản lý Trang chủ',
      edit_about: 'Quản lý Giới thiệu',
      edit_facilities: 'Quản lý Cơ sở vật chất',
      edit_equipment: 'Quản lý Trang thiết bị',
      edit_header_footer: 'Quản lý Header/Footer/Navbar',
      edit_contact: 'Quản lý Liên hệ',
      edit_privacy: 'Quản lý Chính sách bảo mật',
      edit_terms: 'Quản lý Điều khoản',
      
      // Service permissions
      set_price: 'Định giá',
      
      // Staff management permissions
      assign_permissions: 'Phân quyền',
      assign_categories: 'Phân danh mục',
      
      // Other
      export: 'Xuất dữ liệu',
      update: 'Cập nhật'
    };
    return actionNames[actionKey] || actionKey;
  };

  // Format permissions object recursively
  const formatPermissionsChanges = (oldPerms, newPerms) => {
    const changes = [];
    const allModules = new Set([...Object.keys(oldPerms || {}), ...Object.keys(newPerms || {})]);

    allModules.forEach(moduleKey => {
      const oldModule = oldPerms?.[moduleKey];
      const newModule = newPerms?.[moduleKey];

      // Nếu cả 2 đều là array (danh sách permissions)
      if (Array.isArray(oldModule) && Array.isArray(newModule)) {
        const oldSet = new Set(oldModule);
        const newSet = new Set(newModule);
        
        // Tìm permissions được thêm
        const added = [...newSet].filter(p => !oldSet.has(p));
        // Tìm permissions bị xóa
        const removed = [...oldSet].filter(p => !newSet.has(p));
        
        if (added.length > 0) {
          changes.push({
            module: getModuleName(moduleKey),
            type: 'add',
            permissions: added
          });
        }
        
        if (removed.length > 0) {
          changes.push({
            module: getModuleName(moduleKey),
            type: 'remove',
            permissions: removed
          });
        }
      } 
      // Nếu 1 bên là array, 1 bên không (hoặc undefined)
      else if (Array.isArray(oldModule) || Array.isArray(newModule)) {
        const oldArray = Array.isArray(oldModule) ? oldModule : [];
        const newArray = Array.isArray(newModule) ? newModule : [];
        
        if (JSON.stringify(oldArray) !== JSON.stringify(newArray)) {
          changes.push({
            module: getModuleName(moduleKey),
            oldValue: formatPermissionValue(oldArray),
            newValue: formatPermissionValue(newArray)
          });
        }
      }
      // Xử lý object (nested permissions)
      else if (typeof oldModule === 'object' && typeof newModule === 'object') {
        const oldActions = oldModule || {};
        const newActions = newModule || {};
        const allActions = new Set([...Object.keys(oldActions), ...Object.keys(newActions)]);

        allActions.forEach(actionKey => {
          const oldValue = oldActions[actionKey];
          const newValue = newActions[actionKey];

          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
              module: getModuleName(moduleKey),
              action: getPermissionActionName(actionKey),
              oldValue: formatPermissionValue(oldValue),
              newValue: formatPermissionValue(newValue)
            });
          }
        });
      }
    });

    return changes;
  };

  const formatDetails = (details) => {
    if (!details) return <span className="history-tab-details">Không có chi tiết</span>;
    
    try {
      const parsed = typeof details === 'object' ? details : JSON.parse(details);
      
      // **MỚI: Xử lý permission_changes / changed từ backend (array string chi tiết)**
      const permissionChanges = getPermissionAuditChanges(parsed);
      if (Array.isArray(permissionChanges) && permissionChanges.length > 0) {
        return (
          <div className="history-tab-details">
            {permissionChanges.map((change, idx) => (
              <div key={idx} className="history-tab-details-item">
                • {change}
              </div>
            ))}
          </div>
        );
      }
      
      // **XỬ LÝ permission_update (fallback cho audit logs cũ)**
      if (parsed.permission_update) {
        return (
          <div className="history-tab-details">
            <div className="history-tab-details-item">
              {parsed.permission_update}
            </div>
          </div>
        );
      }
      
      // **CŨ: Xử lý permissions changes (old -> new structure) - Giữ lại để tương thích**
      if (parsed.permissions && typeof parsed.permissions === 'object' && 
          parsed.permissions.old && parsed.permissions.new) {
        const permChanges = formatPermissionsChanges(parsed.permissions.old, parsed.permissions.new);
        
        if (permChanges.length === 0) {
          return <div className="history-tab-details-item">Không có thay đổi quyền</div>;
        }

        return (
          <div className="history-tab-details">
            {permChanges.map((change, idx) => {
              // Hiển thị theo type (add/remove) hoặc old -> new
              if (change.type === 'add') {
                return (
                  <div key={idx} className="history-tab-details-item" style={{
                    background: '#e8f5e9',
                    border: '1px solid #4caf50',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '6px'
                  }}>
                    <FaCheckCircle style={{color: '#4caf50', marginRight: '6px'}} />
                    <strong style={{color: '#2e7d32'}}>Cấp quyền</strong> cho module <strong style={{color: '#1976d2'}}>{change.module}</strong>:
                    <div style={{marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                      {change.permissions.map((p, i) => (
                        <span key={i} style={{
                          background: '#c8e6c9',
                          color: '#1b5e20',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: '1px solid #4caf50'
                        }}>
                          ✓ {getPermissionActionName(p)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              } else if (change.type === 'remove') {
                return (
                  <div key={idx} className="history-tab-details-item" style={{
                    background: '#ffebee',
                    border: '1px solid #f44336',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '6px'
                  }}>
                    <FaTimesCircle style={{color: '#f44336', marginRight: '6px'}} />
                    <strong style={{color: '#c62828'}}>Thu hồi quyền</strong> khỏi module <strong style={{color: '#1976d2'}}>{change.module}</strong>:
                    <div style={{marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                      {change.permissions.map((p, i) => (
                        <span key={i} style={{
                          background: '#ffcdd2',
                          color: '#b71c1c',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: '1px solid #f44336'
                        }}>
                          ✗ {getPermissionActionName(p)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              } else if (change.action) {
                // Old format: có action cụ thể
                const isEnabling = String(change.newValue).includes('Bật');
                const actionText = isEnabling ? 'Bật quyền' : 'Tắt quyền';
                const bgColor = isEnabling ? '#e8f5e9' : '#fff3e0';
                const borderColor = isEnabling ? '#4caf50' : '#ff9800';
                const textColor = isEnabling ? '#2e7d32' : '#e65100';
                
                return (
                  <div key={idx} className="history-tab-details-item" style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '6px',
                    color: textColor
                  }}>
                    {isEnabling ? '✓' : '○'} <strong>{actionText} "{change.action}"</strong> trong module <strong style={{color: '#1976d2'}}>{change.module}</strong>
                  </div>
                );
              } else {
                // Format: old -> new value
                return (
                  <div key={idx} className="history-tab-details-item" style={{
                    background: '#e3f2fd',
                    border: '1px solid #2196f3',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '6px'
                  }}>
                    <FaArrowRight style={{color: '#1976d2', marginRight: '6px'}} />
                    <strong style={{color: '#1976d2'}}>{change.module}</strong>: {change.oldValue} → {change.newValue}
                  </div>
                );
              }
            })}
          </div>
        );
      }

      // Handle other types of changes
      if (typeof parsed === 'object') {
        const items = [];
          Object.entries(parsed).forEach(([key, value]) => {
          // Skip processed keys
          if (key === 'permissions' || key === 'permission_changes' || key === 'permission_update') {
            return;
          }

          // **MỚI: Xử lý permission_update (khi không có thay đổi chi tiết)**
          if (key === 'permission_update') {
            items.push(
              <div key={key} className="history-tab-details-item">
                {value}
              </div>
            );
            return;
          }

          // **MỚI: Xử lý doctor_assignment**
          if (key === 'doctor_assignment' && typeof value === 'object' && 'old' in value && 'new' in value) {
            items.push(
              <div key={key} className="history-tab-details-item">
                <FaArrowRight style={{color: '#4CAF50', marginRight: '4px'}} />
                Phân công bác sĩ từ <strong>{value.old}</strong> ({value.old_count || 0} bác sĩ) sang <strong>{value.new}</strong> ({value.new_count || 0} bác sĩ)
              </div>
            );
            return;
          }

          if (typeof value === 'object' && value !== null && 'old' in value && 'new' in value) {
            // Special handling for role_profile to display human name when possible
            if (key === 'role_profile') {
              const findName = (code) => {
                if (!code) return null;
                for (const dept of Object.values(ROLE_PROFILES)) {
                  for (const p of Object.values(dept)) {
                    if (p.code === code) return p.name;
                  }
                }
                return null;
              };
              const oldName = findName(value.old) || value.old || null;
              const newName = findName(value.new) || value.new || null;
              items.push(
                <div key={key} className="history-tab-details-item">
                  <FaArrowRight style={{color: '#2196F3', marginRight: '4px'}} />
                  Vai trò: <strong>{oldName || 'Không có'}</strong> → <strong>{newName || 'Không có'}</strong>
                </div>
              );
              return;
            }
            // Special handling for department changes
            if (key === 'department') {
              const deptNames = {
                BGD: 'Ban Giám Đốc',
                clinical: 'Vận hành lâm sàng',
                system: 'Hệ thống & IT',
                support: 'Chăm sóc KH',
                finance: 'Tài chính',
                content: 'Nội dung'
              };
              items.push(
                <div key={key} className="history-tab-details-item">
                  <FaArrowRight style={{color: '#2196F3', marginRight: '4px'}} />
                  Chuyển từ phòng <strong>{deptNames[value.old] || value.old || 'Chưa có'}</strong> sang <strong>{deptNames[value.new] || value.new || 'Chưa có'}</strong>
                </div>
              );
            }
            // Special handling for rank changes
            else if (key === 'rank') {
              const rankNames = { manager: 'Trưởng phòng', staff: 'Nhân viên', admin: 'Quản trị viên' };
              items.push(
                <div key={key} className="history-tab-details-item">
                  <FaArrowRight style={{color: '#2196F3', marginRight: '4px'}} />
                  Thay đổi chức vụ từ <strong>{rankNames[value.old] || value.old}</strong> thành <strong>{rankNames[value.new] || value.new}</strong>
                </div>
              );
            }
            // Special handling for work_status changes
            else if (key === 'work_status') {
              const statusNames = { active: 'Đang làm việc', inactive: 'Nghỉ việc', on_leave: 'Đang nghỉ phép' };
              items.push(
                <div key={key} className="history-tab-details-item">
                  <FaArrowRight style={{color: '#2196F3', marginRight: '4px'}} />
                  Trạng thái từ <strong>{statusNames[value.old] || value.old}</strong> sang <strong>{statusNames[value.new] || value.new}</strong>
                </div>
              );
            }
            // Generic old -> new change
            else {
              const oldVal = value.old === null ? 'Không có' : 
                            typeof value.old === 'boolean' ? (value.old ? 'Có' : 'Không') :
                            String(value.old);
              const newVal = value.new === null ? 'Không có' :
                            typeof value.new === 'boolean' ? (value.new ? 'Có' : 'Không') :
                            String(value.new);

              items.push(
                <div key={key} className="history-tab-details-item">
                  <strong>{key}:</strong>{' '}
                  <span className="history-tab-details-old">{oldVal}</span>
                  {' → '}
                  <span className="history-tab-details-new">{newVal}</span>
                </div>
              );
            }
          } else {
            // Simple value display
            const displayVal = value === null ? 'Không có' :
                              typeof value === 'boolean' ? (value ? 'Có' : 'Không') :
                              typeof value === 'object' ? JSON.stringify(value) :
                              String(value);

            items.push(
              <div key={key} className="history-tab-details-item">
                <strong>{key}:</strong> {displayVal}
              </div>
            );
          }
        });
        return <div className="history-tab-details">{items}</div>;
      }

      return <div className="history-tab-details">{String(parsed)}</div>;
    } catch (error) {
      console.error('Error formatting details:', error);
      return <div className="history-tab-details">{String(details)}</div>;
    }
  };

  const getActionStyle = (actionType) => {
    const styles = {
      create: { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
      update: { bg: '#FFF3E0', color: '#EF6C00', border: '#FFCC80' },
      delete: { bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' },
      login: { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' },
      permission: { bg: '#F3E5F5', color: '#7B1FA2', border: '#CE93D8' },
      assignment: { bg: '#E8F5E9', color: '#388E3C', border: '#A5D6A7' },
      default: { bg: '#F5F5F5', color: '#616161', border: '#E0E0E0' }
    };

    let key = 'default';
    if (actionType.includes('create') || actionType.includes('add')) key = 'create';
    else if (actionType.includes('permission')) key = 'permission';
    else if (actionType.includes('assignment')) key = 'assignment';
    else if (actionType.includes('update') || actionType.includes('change') || actionType.includes('edit')) key = 'update';
    else if (actionType.includes('delete') || actionType.includes('remove')) key = 'delete';
    else if (actionType.includes('login')) key = 'login';

    return styles[key];
  };
  
  return (
    <div className="HistoryTab-container">
      {/* 1. Header */}
      <div className="HistoryTab-header">
        <div className="HistoryTab-header-left">
          <h3><FaHistory /> Nhật ký hệ thống</h3>
          <p>Theo dõi chi tiết các thay đổi dữ liệu và hoạt động</p>
        </div>
        <div className="HistoryTab-header-right">
            <span className="HistoryTab-badge-total">
                Tổng: <strong>{pagination.total}</strong> bản ghi
            </span>
        </div>
      </div>

      {/* 2. Toolbar (Unified & Responsive) */}
      <div className="HistoryTab-toolbar">
        {/* Search Input Wrapper */}
        <div className="HistoryTab-search-wrapper">
          <FaSearch className="HistoryTab-search-icon"/>
          <input
            type="text"
            className="HistoryTab-input-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Tìm theo User, Hành động, ID..."
          />
        </div>

        {/* Direct Filter Inputs */}
        <input type="date" className="HistoryTab-input-date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            title="Từ ngày"
        />
        <span className="HistoryTab-separator-dash">-</span>
        <input type="date" className="HistoryTab-input-date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            title="Đến ngày"
        />
        
        <select className="HistoryTab-select"
            value={filters.action_type}
            onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
        >
            <option value="">-- Hành động --</option>
            <option value="create">Thêm mới</option>
            <option value="update">Cập nhật</option>
            <option value="delete">Xóa</option>
            <option value="login">Đăng nhập</option>
        </select>

        <select className="HistoryTab-select"
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
                const [f, o] = e.target.value.split(':');
                setSortBy(f); setSortOrder(o);
            }}
        >
            <option value="created_at:DESC">Mới nhất</option>
            <option value="created_at:ASC">Cũ nhất</option>
        </select>

        {/* Buttons */}
        <button onClick={handleSearch} className="HistoryTab-btn HistoryTab-btn-primary"><FaFilter /> Lọc</button>
        <button onClick={handleReset} className="HistoryTab-btn HistoryTab-btn-secondary"><FaTimes /> Reset</button>
        <button onClick={fetchAuditLogs} className="HistoryTab-btn HistoryTab-btn-icon-only" title="Tải lại"><FaRedo /></button>
        
        <div className="HistoryTab-divider-vertical"></div>
        
        <button className="HistoryTab-btn HistoryTab-btn-icon-only" title="Xuất PDF"><FaFilePdf /></button>
        <button className="HistoryTab-btn HistoryTab-btn-icon-only" title="Xuất Excel"><FaFileExcel /></button>
      </div>

      {/* 3. Table Content */}
      <div className="HistoryTab-content">
        {loading ? (
            <div className="HistoryTab-state-container">
                <FaRedo className="fa-spin" />
                <span>Đang tải dữ liệu...</span>
            </div>
        ) : auditLogs.length === 0 ? (
            <div className="HistoryTab-state-container">
                <FaHistory />
                <span>Không tìm thấy lịch sử hoạt động nào</span>
            </div>
        ) : (
            <table className="HistoryTab-table">
                <thead>
                    <tr>
                        <th className="HistoryTab-col-time">Thời gian</th>
                        <th className="HistoryTab-col-user">Người thực hiện</th>
                        <th className="HistoryTab-col-action">Hành động</th>
                        <th className="HistoryTab-col-target">Đối tượng</th>
                        <th className="HistoryTab-col-detail">Chi tiết thay đổi</th>
                    </tr>
                </thead>
                <tbody>
                    {auditLogs.map((log) => {
                        const style = getActionStyle(log.action_type);
                        return (
                            <tr key={log.id}>
                                <td className="HistoryTab-col-time">
                                    <div className="HistoryTab-time-wrapper">
                                        <FaClock size={10}/> {formatDate(log.created_at)}
                                    </div>
                                </td>
                                <td className="HistoryTab-col-user">
                                    <div className="HistoryTab-user-cell">
                                        <div className="HistoryTab-user-avatar">
                                            {(log.user?.full_name || log.user?.username || 'S').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="HistoryTab-user-text">
                                            <div className="HistoryTab-user-name">{log.user?.full_name || log.user?.username || 'System'}</div>
                                            <div className="HistoryTab-user-role">{log.user?.email || log.user?.role}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="HistoryTab-col-action">
                                    <span className="HistoryTab-action-badge" style={{
                                        background: style.bg, color: style.color, border: `1px solid ${style.border}`
                                    }}>
                                        {log.action_type.toUpperCase()}
                                    </span>
                                </td>
                                <td className="HistoryTab-col-target">
                                    <span className="HistoryTab-target-name">{log.target_name || log.target_type}</span>
                                    <div className="HistoryTab-target-id">ID: {log.target_id}</div>
                                </td>
                                <td className="HistoryTab-col-detail">
                                    {formatDetails(log.details)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )}
      </div>

      {/* 4. Footer */}
      <div className="HistoryTab-footer">
        <span className="HistoryTab-footer-info">
            Hiển thị {pagination.offset + 1} - {Math.min(pagination.offset + auditLogs.length, pagination.total)} trên tổng {pagination.total}
        </span>
        <div className="HistoryTab-pagination-group">
            <button 
                className="HistoryTab-btn-page" 
                disabled={pagination.offset === 0}
                onClick={() => setPagination(p => ({...p, offset: p.offset - p.limit}))}
            >
                Trước
            </button>
            <button 
                className="HistoryTab-btn-page"
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => setPagination(p => ({...p, offset: p.offset + p.limit}))}
            >
                Sau
            </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;
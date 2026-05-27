// client/src/components/PermissionsTab.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import permissionService from '../services/permissionService';
import { FaCheck, FaTimes, FaSpinner, FaSave, FaUndo, FaHistory } from 'react-icons/fa';
import { getPermissionAuditChanges } from '../utils/permissionAudit';
import './PermissionsTab.css';

const PermissionsTab = ({ staffId, staffName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState({});
  const [permissions, setPermissions] = useState({});
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [expandedModule, setExpandedModule] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Load permissions và modules khi mount
  useEffect(() => {
    loadData();
  }, [staffId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Lấy modules
      const modulesData = await permissionService.getPermissionModules();
      setModules(modulesData.data || {});

      // Lấy permissions hiện tại của staff
      const permissionsData = await permissionService.getStaffPermissions(staffId);
      const currentPerms = permissionsData.data.permissions || {};
      
      setPermissions(currentPerms);
      setOriginalPermissions(JSON.parse(JSON.stringify(currentPerms)));

      // Lấy audit logs
      const logsData = await permissionService.getPermissionAuditLogs(staffId, 20);
      setAuditLogs(logsData.data || []);
    } catch (error) {
      toast.error('Không thể tải dữ liệu quyền');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý check/uncheck permission
  const handleTogglePermission = (moduleKey, actionKey) => {
    setPermissions(prev => {
      const updated = { ...prev };
      if (!updated[moduleKey]) {
        updated[moduleKey] = {};
      }
      updated[moduleKey][actionKey] = !updated[moduleKey][actionKey];
      return updated;
    });
  };

  // Xử lý check tất cả permissions của 1 module
  const handleToggleAllModule = (moduleKey) => {
    const module = modules[moduleKey];
    if (!module) return;

    setPermissions(prev => {
      const updated = { ...prev };
      if (!updated[moduleKey]) {
        updated[moduleKey] = {};
      }

      // Kiểm tra tất cả quyền trong module có được check không
      const allChecked = module.permissions.every(perm => 
        updated[moduleKey][perm.key] === true
      );

      // Toggle: nếu tất cả checked thì uncheck tất cả, ngược lại check tất cả
      module.permissions.forEach(perm => {
        updated[moduleKey][perm.key] = !allChecked;
      });

      return updated;
    });
  };

  // Kiểm tra tất cả permissions trong module có được check không
  const isModuleAllChecked = (moduleKey) => {
    const module = modules[moduleKey];
    if (!module) return false;

    return module.permissions.every(perm => 
      permissions[moduleKey]?.[perm.key] === true
    );
  };

  // Kiểm tra có bất kỳ permission nào trong module được check không
  const hasModuleAnyPermission = (moduleKey) => {
    const module = modules[moduleKey];
    if (!module) return false;

    return module.permissions.some(perm => 
      permissions[moduleKey]?.[perm.key] === true
    );
  };

  // Xử lý lưu permissions
  const handleSave = async () => {
    try {
      setSaving(true);
      await permissionService.updateStaffPermissions(staffId, permissions);
      
      toast.success('Cập nhật quyền thành công');
      setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
      
      // Reload audit logs
      const logsData = await permissionService.getPermissionAuditLogs(staffId, 20);
      setAuditLogs(logsData.data || []);
    } catch (error) {
      toast.error('Lỗi khi cập nhật quyền');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Xử lý hủy thay đổi
  const handleReset = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
  };

  // Kiểm tra có thay đổi không
  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

  if (loading) {
    return (
      <div className="permissions-tab-loading">
        <FaSpinner className="spinner-icon" />
        <p>Đang tải dữ liệu quyền...</p>
      </div>
    );
  }

  return (
    <div className="permissions-tab">
      {/* HEADER */}
      <div className="permissions-header">
        <div className="permissions-title">
          <h3>Phân quyền cho {staffName}</h3>
          <p className="subtitle">Chọn những chức năng mà người dùng được phép thực hiện</p>
        </div>

        {/* BUTTONS */}
        <div className="permissions-actions">
          <button 
            className="btn-history"
            onClick={() => setShowLogs(!showLogs)}
            title="Xem lịch sử thay đổi"
          >
            <FaHistory /> Lịch sử
          </button>
          {hasChanges && (
            <>
              <button 
                className="btn-reset"
                onClick={handleReset}
                disabled={saving}
              >
                <FaUndo /> Hủy
              </button>
              <button 
                className="btn-save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <FaSpinner className="spinner" /> : <FaSave />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* AUDIT LOGS */}
      {showLogs && (
        <div className="permissions-audit-logs">
          <div className="logs-header">
            <h4>Lịch sử thay đổi quyền</h4>
            <button className="btn-close" onClick={() => setShowLogs(false)}>✕</button>
          </div>
          <div className="logs-list">
            {auditLogs.length === 0 ? (
              <p className="empty-logs">Chưa có thay đổi nào</p>
            ) : (
              auditLogs.map((log, idx) => (
                <div key={idx} className="log-item">
                  <div className="log-time">
                    {new Date(log.created_at).toLocaleString('vi-VN')}
                  </div>
                  <div className="log-user">
                    Được thay đổi bởi: <strong>{log.user?.full_name}</strong>
                  </div>
                  {(() => {
                    const changes = getPermissionAuditChanges(log.details);
                    if (!changes.length) return null;
                    return (
                    <div className="log-changes">
                      {changes.map((change, i) => (
                        <span key={i} className="change-badge">
                          {change}
                        </span>
                      ))}
                    </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PERMISSIONS MODULES */}
      <div className="permissions-modules">
        {Object.entries(modules).map(([moduleKey, module]) => (
          <div key={moduleKey} className="module-section">
            {/* MODULE HEADER */}
            <div
              className={`module-header ${hasModuleAnyPermission(moduleKey) ? 'has-permissions' : ''}`}
              onClick={() => setExpandedModule(expandedModule === moduleKey ? null : moduleKey)}
            >
              <div className="module-info">
                <span className="module-icon">{module.icon}</span>
                <div className="module-text">
                  <h4 className="module-name">{module.name}</h4>
                  <p className="module-description">{module.description}</p>
                </div>
              </div>

              {/* CHECKBOX MODULE */}
              <div className="module-checkbox">
                <input
                  type="checkbox"
                  checked={isModuleAllChecked(moduleKey)}
                  onChange={() => handleToggleAllModule(moduleKey)}
                  onClick={(e) => e.stopPropagation()}
                  className="checkbox-all"
                  title={isModuleAllChecked(moduleKey) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                />
                <span className="checkbox-label">
                  {isModuleAllChecked(moduleKey) ? '✓ Tất cả' : '◻ Tất cả'}
                </span>
              </div>

              {/* EXPAND INDICATOR */}
              <span className={`expand-icon ${expandedModule === moduleKey ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>

            {/* MODULE PERMISSIONS */}
            {expandedModule === moduleKey && (
              <div className="module-permissions">
                {module.permissions.map(action => (
                  <div key={`${moduleKey}-${action.key}`} className="permission-item">
                    <label >
                      <input
                        type="checkbox"
                        checked={permissions[moduleKey]?.[action.key] === true}
                        onChange={() => handleTogglePermission(moduleKey, action.key)}
                        className="permission-checkbox"
                      />
                      <div className="permission-content">
                        <span className="permission-label">{action.label}</span>
                        <span className="permission-description">{action.description}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FOOTER ACTIONS */}
      {hasChanges && (
        <div className="permissions-footer">
          <button 
            className="btn-cancel"
            onClick={handleReset}
            disabled={saving}
          >
            Hủy
          </button>
          <button 
            className="btn-save-footer"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <FaSpinner className="spinner" /> : <FaSave />}
            Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
};

export default PermissionsTab;

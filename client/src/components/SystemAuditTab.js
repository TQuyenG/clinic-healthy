// client/src/components/SystemAuditTab.js
// Component để hiển thị lịch sử cập nhật hệ thống (system settings pages)

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  FaHistory, FaSearch, FaFilter, FaTimes, FaRedo,
  FaFilePdf, FaFileExcel, FaArrowRight, FaClock,
  FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';
import './HistoryTab.css'; // Reuse same CSS
import { getPermissionAuditChanges, parsePermissionAuditDetails } from '../utils/permissionAudit';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SystemAuditTab = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    page_type: ''
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
      
      const token = localStorage.getItem('token');
      const params = {
        ...filters, // startDate, endDate, page_type
        sortBy,
        sortOrder,
        limit: pagination.limit,
        offset: pagination.offset
      };
      
      const response = await axios.get(`${API_BASE_URL}/settings/audit-logs`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAuditLogs(response.data.data || []);
      setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Không thể tải dữ liệu lịch sử');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchAuditLogs();
  };

  const handleReset = () => {
    setFilters({ startDate: '', endDate: '', page_type: '' });
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

  // Helper: Get page name in Vietnamese
  const getPageName = (pageKey) => {
    const pageNames = {
      home: 'Trang chủ',
      about: 'Giới thiệu',
      facilities: 'Cơ sở vật chất',
      equipment: 'Trang thiết bị',
      'header-nav-footer': 'Header/Footer',
      contact: 'Liên hệ',
      privacy: 'Chính sách bảo mật',
      terms: 'Điều khoản sử dụng',
      'refund_policy': 'Chính sách hoàn tiền'
    };
    return pageNames[pageKey] || pageKey;
  };

  // Format details for system settings changes
  const formatDetails = (details) => {
    if (!details) return <span className="history-tab-details">Không có chi tiết</span>;
    
    try {
      const parsed = parsePermissionAuditDetails(details) || {};

      const permissionChanges = getPermissionAuditChanges(parsed);
      if (permissionChanges.length > 0) {
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
      
      // Handle page update with updated_fields
      if (parsed.page && parsed.updated_fields) {
        return (
          <div className="history-tab-details">
            <div className="history-tab-details-item">
              <strong>Đã sửa:</strong> {parsed.updated_fields}
            </div>
            {parsed.field_count && (
              <div className="history-tab-details-item" style={{fontSize: '11px', color: '#888'}}>
                ({parsed.field_count} trường)
              </div>
            )}
          </div>
        );
      }
      
      // Handle page update without updated_fields
      if (parsed.page) {
        return (
          <div className="history-tab-details">
            <div className="history-tab-details-item">
              <strong>Trang:</strong> {getPageName(parsed.page)}
            </div>
            {parsed.action && (
              <div className="history-tab-details-item">
                <strong>Hành động:</strong> {parsed.action}
              </div>
            )}
          </div>
        );
      }

      // Generic object display
      if (typeof parsed === 'object') {
        const items = [];
        Object.entries(parsed).forEach(([key, value]) => {
          // Skip if value is null or undefined
          if (value === null || value === undefined) return;
          
          // Skip internal fields
          if (['page', 'action', 'field_count', 'timestamp'].includes(key)) return;
          
          // Handle object with old/new values
          if (typeof value === 'object' && value !== null && 'old' in value && 'new' in value) {
            items.push(
              <div key={key} className="history-tab-details-item">
                <strong>{key}:</strong>{' '}
                <span className="history-tab-details-old">{String(value.old)}</span>
                {' → '}
                <span className="history-tab-details-new">{String(value.new)}</span>
              </div>
            );
          } 
          // Handle nested objects/arrays
          else if (typeof value === 'object' && value !== null) {
            items.push(
              <div key={key} className="history-tab-details-item">
                <strong>{key}:</strong>{' '}
                <span style={{fontSize: '11px', color: '#888'}}>
                  {Array.isArray(value) ? `[${value.length} items]` : JSON.stringify(value, null, 2)}
                </span>
              </div>
            );
          } 
          // Handle primitive values
          else {
            items.push(
              <div key={key} className="history-tab-details-item">
                <strong>{key}:</strong> {String(value)}
              </div>
            );
          }
        });
        
        if (items.length === 0) {
          return <span className="history-tab-details">Không có chi tiết</span>;
        }
        
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
      system_update: { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' },
      content_update: { bg: '#F3E5F5', color: '#7B1FA2', border: '#CE93D8' },
      settings_change: { bg: '#FFF3E0', color: '#EF6C00', border: '#FFCC80' },
      permission_change: { bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' },
      default: { bg: '#F5F5F5', color: '#616161', border: '#E0E0E0' }
    };

    return styles[actionType] || styles.default;
  };

  const getActionLabel = (actionType) => {
    const labels = {
      system_update: 'Cập nhật hệ thống',
      content_update: 'Cập nhật nội dung',
      settings_change: 'Thay đổi cài đặt',
      permission_change: 'Thay đổi quyền'
    };
    return labels[actionType] || actionType;
  };
  
  return (
    <div className="HistoryTab-container">
      {/* 1. Header */}
      <div className="HistoryTab-header">
        <div className="HistoryTab-header-left">
          <h3><FaHistory /> Lịch sử cập nhật hệ thống</h3>
          <p>Theo dõi các thay đổi nội dung trang web và cài đặt hệ thống</p>
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
            placeholder="Tìm theo User, Trang, Hành động..."
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
            value={filters.page_type}
            onChange={(e) => setFilters({ ...filters, page_type: e.target.value })}
        >
            <option value="">-- Loại trang --</option>
            <option value="home">Trang chủ</option>
            <option value="about">Giới thiệu</option>
            <option value="facilities">Cơ sở vật chất</option>
            <option value="equipment">Trang thiết bị</option>
            <option value="header-nav-footer">Header/Footer</option>
            <option value="contact">Liên hệ</option>
            <option value="privacy">Chính sách bảo mật</option>
            <option value="terms">Điều khoản sử dụng</option>
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

        {/* Actions */}
        <button className="HistoryTab-btn HistoryTab-btn-primary" onClick={handleSearch}>
            <FaFilter /> Lọc
        </button>
        <button className="HistoryTab-btn HistoryTab-btn-secondary" onClick={handleReset}>
            <FaTimes /> Xóa
        </button>
        <button className="HistoryTab-btn HistoryTab-btn-secondary" onClick={fetchAuditLogs}>
            <FaRedo /> Tải lại
        </button>
      </div>

      {/* 3. Table/Data Area */}
      {loading ? (
        <div className="HistoryTab-loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="HistoryTab-empty">
          <FaHistory size={60} />
          <p>Chưa có lịch sử cập nhật nào</p>
        </div>
      ) : (
        <>
          <div className="HistoryTab-table-wrapper">
            <table className="HistoryTab-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}}>ID</th>
                  <th style={{width: '140px'}}><FaClock /> Thời gian</th>
                  <th style={{width: '180px'}}>Người thực hiện</th>
                  <th style={{width: '150px'}}>Hành động</th>
                  <th style={{width: '120px'}}>Trang</th>
                  <th>Chi tiết</th>
                  <th style={{width: '120px'}}>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => {
                  const style = getActionStyle(log.action_type);
                  return (
                    <tr key={log.id}>
                      <td>#{log.id}</td>
                      <td>{formatDate(log.created_at)}</td>
                      <td>
                        <div className="HistoryTab-user-cell">
                          {log.user?.avatar_url && (
                            <img 
                              src={log.user.avatar_url} 
                              alt={log.user.full_name}
                              className="HistoryTab-user-avatar"
                            />
                          )}
                          <div>
                            <div className="HistoryTab-user-name">
                              {log.user?.full_name || 'N/A'}
                            </div>
                            <div className="HistoryTab-user-email">
                              {log.user?.email || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span 
                          className="HistoryTab-badge"
                          style={{
                            backgroundColor: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`
                          }}
                        >
                          {getActionLabel(log.action_type)}
                        </span>
                      </td>
                      <td>
                        <strong>{getPageName(log.target_name)}</strong>
                      </td>
                      <td>{formatDetails(log.details)}</td>
                      <td>
                        <code style={{fontSize: '11px', color: '#666'}}>
                          {log.ip_address || 'N/A'}
                        </code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. Pagination */}
          <div className="HistoryTab-pagination">
            <div className="HistoryTab-pagination-info">
              Hiển thị {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} trong tổng số {pagination.total} bản ghi
            </div>
            <div className="HistoryTab-pagination-controls">
              <button
                className="HistoryTab-btn HistoryTab-btn-secondary"
                disabled={pagination.offset === 0}
                onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
              >
                ← Trước
              </button>
              <span className="HistoryTab-pagination-page">
                Trang {Math.floor(pagination.offset / pagination.limit) + 1} / {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <button
                className="HistoryTab-btn HistoryTab-btn-secondary"
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemAuditTab;

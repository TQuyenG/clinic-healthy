// client/src/pages/ReportManagementPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ReportManagementPage.css';
import { 
  FaFlag, FaEye, FaCheck, FaTimes, FaFilter, FaSyncAlt, 
  FaQuestionCircle, FaCommentDots, FaExclamationTriangle, FaSearch
} from 'react-icons/fa';
import { FORUM_QUESTION_ROUTE } from '../utils/constants';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const ReportManagementPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State bộ lọc
  const [filter, setFilter] = useState({
    status: '',
    entityType: '',
    search: '' // Thêm tìm kiếm text
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // State Modal & Xử lý
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    fetchReports();
  }, []); // Load lần đầu

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/forum/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        // Sắp xếp mới nhất trước
        const sorted = response.data.data.reports.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setReports(sorted);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      // alert('Không thể tải danh sách báo cáo'); // Tắt alert phiền phức
    } finally {
      setLoading(false);
    }
  };

  // --- Logic Lọc Client-side (cho mượt) ---
  const filteredReports = reports.filter(item => {
    const matchStatus = filter.status ? item.status === filter.status : true;
    const matchType = filter.entityType ? item.entityType === filter.entityType : true;
    const matchSearch = filter.search ? (
      item.description?.toLowerCase().includes(filter.search.toLowerCase()) ||
      item.reporter?.fullName?.toLowerCase().includes(filter.search.toLowerCase()) ||
      item.entity?.title?.toLowerCase().includes(filter.search.toLowerCase())
    ) : true;
    return matchStatus && matchType && matchSearch;
  });

  // --- Thống kê nhanh ---
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setAdminNote(report.adminNote || '');
    setShowModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedReport) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/forum/reports/${selectedReport.id}`,
        { status: newStatus, adminNote: adminNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setShowModal(false);
        fetchReports(); // Reload data
      }
    } catch (error) {
      console.error('Error updating report:', error);
    }
  };

  // --- Helpers ---
  const getReasonText = (reason) => {
    const reasons = {
      spam: 'Spam / Rác',
      inappropriate: 'Nội dung thô tục',
      misleading: 'Thông tin sai lệch',
      offensive: 'Xúc phạm',
      other: 'Lý do khác',
    };
    return reasons[reason] || reason;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Chờ xử lý', icon: <FaExclamationTriangle/>, class: 'status-pending' },
      reviewed: { text: 'Đang xem', icon: <FaEye/>, class: 'status-reviewed' },
      resolved: { text: 'Đã xử lý', icon: <FaCheck/>, class: 'status-resolved' },
      dismissed: { text: 'Đã bỏ qua', icon: <FaTimes/>, class: 'status-dismissed' },
    };
    const badge = badges[status] || { text: status, class: '' };
    return <span className={`admin-report-badge ${badge.class}`}>{badge.icon} {badge.text}</span>;
  };

  const getTypeBadge = (type) => {
    return type === 'question' 
      ? <span className="type-badge type-question"><FaQuestionCircle/> Câu hỏi</span> 
      : <span className="type-badge type-answer"><FaCommentDots/> Trả lời</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  // Reset Filters
  const resetFilters = () => setFilter({ status: '', entityType: '', search: '' });

  if (loading) return <div className="admin-report-loading"><FaSyncAlt className="fa-spin"/> Đang tải dữ liệu...</div>;

  return (
    <div className="admin-report-container">
      <div className="admin-report-wrapper">
        
        {/* HEADER */}
        <div className="admin-report-header">
          <div className="header-title">
            <h1><FaFlag /> Quản lý Báo cáo Vi phạm</h1>
          </div>
          <div className="header-actions">
             <button 
                className="btn-compact btn-white"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
             >
               <FaFilter /> {showFilterPanel ? 'Ẩn bộ lọc' : 'Bộ lọc'}
             </button>
             <button className="btn-compact btn-primary" onClick={fetchReports}>
               <FaSyncAlt /> Làm mới
             </button>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="admin-report-stats">
          <div className="stat-item total">
            <span className="label">Tổng số</span>
            <span className="value">{stats.total}</span>
          </div>
          <div className="stat-item pending">
            <span className="label">Cần xử lý</span>
            <span className="value">{stats.pending}</span>
          </div>
          <div className="stat-item resolved">
            <span className="label">Đã xử lý</span>
            <span className="value">{stats.resolved}</span>
          </div>
          <div className="stat-item dismissed">
            <span className="label">Đã bỏ qua</span>
            <span className="value">{stats.dismissed}</span>
          </div>
        </div>

        {/* FILTERS PANEL */}
        {showFilterPanel && (
          <div className="admin-report-filters animate-fade-down">
            <div className="filter-row">
              <div className="filter-group">
                 <label>Trạng thái</label>
                 <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
                   <option value="">-- Tất cả --</option>
                   <option value="pending">Chờ xử lý</option>
                   <option value="resolved">Đã giải quyết</option>
                   <option value="dismissed">Đã bỏ qua</option>
                 </select>
              </div>
              <div className="filter-group">
                 <label>Loại nội dung</label>
                 <select value={filter.entityType} onChange={e => setFilter({...filter, entityType: e.target.value})}>
                   <option value="">-- Tất cả --</option>
                   <option value="question">Câu hỏi</option>
                   <option value="answer">Câu trả lời</option>
                 </select>
              </div>
              <div className="filter-group search-group">
                 <label>Tìm kiếm</label>
                 <div className="input-with-icon">
                   <FaSearch/>
                   <input 
                      type="text" 
                      placeholder="Người báo cáo, nội dung..." 
                      value={filter.search}
                      onChange={e => setFilter({...filter, search: e.target.value})}
                   />
                 </div>
              </div>
              <div className="filter-actions">
                <button className="btn-compact btn-white" onClick={resetFilters}>Đặt lại</button>
              </div>
            </div>
          </div>
        )}

        {/* TABLE DATA */}
        <div className="admin-report-table-container">
          <table className="admin-report-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>ID</th>
                <th style={{width: '100px'}}>Loại</th>
                <th style={{width: '120px'}}>Lý do</th>
                <th>Nội dung bị báo cáo</th>
                <th style={{width: '150px'}}>Người báo cáo</th>
                <th style={{width: '110px'}}>Ngày tạo</th>
                <th style={{width: '110px'}}>Trạng thái</th>
                <th style={{width: '80px', textAlign: 'center'}}>XL</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map(report => (
                  <tr key={report.id} className={report.status === 'pending' ? 'row-highlight' : ''}>
                    <td className="fw-bold">#{report.id}</td>
                    <td>{getTypeBadge(report.entityType)}</td>
                    <td><span className="reason-text">{getReasonText(report.reason)}</span></td>
                    <td>
                      <div className="content-preview">
                        {report.entityType === 'question' 
                          ? <strong>{report.entity?.title || 'Nội dung đã bị xóa'}</strong>
                          : <span className="text-muted">{report.entity?.content?.substring(0, 60)}...</span>
                        }
                        {/* Đổi report-desc-tooltip thành report-description-tooltip */}
                        {report.description && <div className="report-description-tooltip">Note: {report.description}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="reporter-info">
                        <span className="name">{report.reporter?.fullName || 'Ẩn danh'}</span>
                        <span className="email">{report.reporter?.email}</span>
                      </div>
                    </td>
                    <td className="text-date">{formatDate(report.createdAt)}</td>
                    <td>{getStatusBadge(report.status)}</td>
                    <td className="text-center">
                      <button 
                        className="btn-icon-action" 
                        title="Xem & Xử lý"
                        onClick={() => handleViewReport(report)}
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">Không có báo cáo nào phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* COMPACT MODAL */}
      {showModal && selectedReport && (
        <div className="admin-report-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-report-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h5><FaFlag className="text-danger me-2"/> Chi tiết báo cáo #{selectedReport.id}</h5>
              <button className="close-btn" onClick={() => setShowModal(false)}><FaTimes/></button>
            </div>
            
            <div className="modal-body">
               {/* 2 Cột thông tin */}
               <div className="info-grid">
                  <div className="info-item">
                    <label>Người báo cáo:</label>
                    <span>{selectedReport.reporter?.fullName} <small>({selectedReport.reporter?.email})</small></span>
                  </div>
                  <div className="info-item">
                    <label>Thời gian:</label>
                    <span>{formatDate(selectedReport.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <label>Lý do:</label>
                    <span className="text-danger fw-bold">{getReasonText(selectedReport.reason)}</span>
                  </div>
                  <div className="info-item">
                    <label>Trạng thái:</label>
                    <span>{getStatusBadge(selectedReport.status)}</span>
                  </div>
               </div>

               {/* Nội dung báo cáo */}
               <div className="content-box">
                  <label className="section-label">Nội dung vi phạm:</label>
                  <div className="p-2 bg-light border rounded mb-2">
                    {selectedReport.entityType === 'question' ? (
                       <h6 className="mb-1 text-primary">{selectedReport.entity?.title}</h6>
                    ) : (
                       <p className="mb-0 small text-muted fst-italic">"{selectedReport.entity?.content}"</p>
                    )}
                  </div>
                  {selectedReport.description && (
                     <div className="alert alert-warning py-1 px-2 small mb-0">
                        <strong>Mô tả thêm:</strong> {selectedReport.description}
                     </div>
                  )}
               </div>

               {/* Admin Note */}
               <div className="admin-note-section mt-3">
                  <label className="section-label">Ghi chú xử lý:</label>
                  <textarea 
                    className="form-control form-control-sm"
                    rows="2"
                    placeholder="Nhập ghi chú của admin..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  ></textarea>
               </div>
            </div>

            <div className="modal-footer">
               <div className="left-actions">
                  <button 
                    className="btn-link-goto" 
                    onClick={() => window.open(`${FORUM_QUESTION_ROUTE}/${selectedReport.entityId}`, '_blank')}
                    disabled={!selectedReport.entityId}
                  >
                    <FaQuestionCircle/> Xem bài viết gốc
                  </button>
               </div>
               <div className="right-actions">
                  <button className="btn-compact btn-white" onClick={() => handleUpdateStatus('dismissed')}>
                    <FaTimes/> Bỏ qua
                  </button>
                  <button className="btn-compact btn-success" onClick={() => handleUpdateStatus('resolved')}>
                    <FaCheck/> Đã giải quyết
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagementPage;
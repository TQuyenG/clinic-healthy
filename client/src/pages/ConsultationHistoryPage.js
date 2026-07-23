// client/src/pages/ConsultationHistoryPage.js
// ✅ PHIÊN BẢN ĐỒNG BỘ: Sử dụng giao diện Admin (CRM Theme) cho Patient
// Giải quyết vấn đề: Trùng lặp tiêu đề, thiếu tab chức năng Realtime/Video

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import consultationService from '../services/consultationService';
import { 
  FaCalendarAlt, FaComments, FaVideo, FaSync, FaList, FaPlusCircle, FaFlag, FaCheckCircle, FaSpinner, FaExclamationTriangle
} from 'react-icons/fa';

// ⚠️ QUAN TRỌNG: Import CSS của trang Admin để giao diện giống hệt
import './ConsultationRealtimeManagementPage.css'; 

// Import các components con (Tái sử dụng)
import { ConsultationRealtimeList } from '../components/consultation/ConsultationRealtimeList';

const ConsultationHistoryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Lấy role thực của user để truyền đúng vào ConsultationRealtimeList
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || 'patient';

  // State quản lý Tab đang chọn: 'list' | 'chat' | 'video'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type === 'video') return 'video';
    if (type === 'chat') return 'chat';
    if (type === 'reports') return 'reports';
    return 'list';
  });

  const [myReports, setMyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null); // reportId đang mở
  const [reportMessages, setReportMessages] = useState({}); // { consultationId: [messages] }
  const [replyText, setReplyText] = useState({}); // { reportId: text }
  const [replySending, setReplySending] = useState(false);

  const fetchReportMessages = async (consultationId, force = false) => {
    // Chỉ skip nếu đã có data VÀ không force-reload
    if (!force && reportMessages[consultationId] !== undefined) return;
    // Set loading placeholder
    setReportMessages(prev => ({ ...prev, [consultationId]: null }));
    try {
      const res = await consultationService.getMyConsultationMessages(consultationId);
      if (res.data.success) {
        setReportMessages(prev => ({
          ...prev,
          [consultationId]: (res.data.data || []).filter(
            m => m.is_system_message || m.message_type === 'system'
          )
        }));
      }
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
      setReportMessages(prev => ({ ...prev, [consultationId]: [] }));
    }
  };

  const handleToggleReport = (report) => {
    const isOpen = expandedReport === report.id;
    setExpandedReport(isOpen ? null : report.id);
    if (!isOpen && report.consultation_id) {
      // force=true → luôn lấy tin nhắn mới nhất khi mở
      fetchReportMessages(report.consultation_id, true);
    }
  };

  const handleReply = async (report) => {
    const text = replyText[report.id]?.trim();
    if (!text) return;
    try {
      setReplySending(true);
      await consultationService.replyToSystemMessage(report.consultation_id, {
        message: text,
        report_id: report.id
      });
      setReplyText(prev => ({ ...prev, [report.id]: '' }));
      // Reload tin nhắn
      setReportMessages(prev => ({ ...prev, [report.consultation_id]: undefined }));
      await fetchReportMessages(report.consultation_id);
    } catch (err) {
      alert('Lỗi gửi tin nhắn: ' + (err.response?.data?.message || err.message));
    } finally {
      setReplySending(false);
    }
  };

  const fetchMyReports = async () => {
    try {
      setReportsLoading(true);
      const res = await consultationService.getMyReports();
      if (res.data.success) setMyReports(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải báo cáo:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lấy thống kê — phân biệt patient và doctor
  const fetchStats = async () => {
    try {
      setLoading(true);
      let res;
      if (userRole === 'doctor') {
        res = await consultationService.getDoctorStats();
      } else {
        res = await consultationService.getPatientStats();
      }
      if (res.data.success) {
        setStats(res.data.data.stats || res.data.data);
      }
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mount: chỉ fetch stats
  useEffect(() => {
    fetchStats();
  }, []);

  // Mỗi lần switch sang tab reports → fetch lại
  useEffect(() => {
    if (activeTab === 'reports') fetchMyReports();
  }, [activeTab]);

  // Lắng nghe WS: khi admin resolve sự cố → cập nhật card ngay, không cần F5
  useEffect(() => {
    const handleIncidentResolved = (e) => {
      const { report_id, status, admin_notes } = e.detail;
      setMyReports(prev => prev.map(r =>
        r.id === report_id
          ? { ...r, status, admin_notes: admin_notes || r.admin_notes }
          : r
      ));
    };
    window.addEventListener('consultation:incident_resolved', handleIncidentResolved);
    return () => {
      window.removeEventListener('consultation:incident_resolved', handleIncidentResolved);
    };
  }, []);

  // Xử lý khi chuyển Tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = tab === 'list' 
      ? '/lich-tu-van-cua-toi' 
      : `/lich-tu-van-cua-toi?type=${tab}`;
    window.history.replaceState(null, '', url);
    if (tab === 'reports') fetchMyReports();
  };

  return (
    <div className="crm-page">
      {/* 1. Header (Dùng chung style crm-header của Admin) */}
      <div className="crm-header">
        <div className="crm-header-info">
          <h1>
            {activeTab === 'video' ? <FaVideo className="crm-header-icon" /> : 
             activeTab === 'chat' ? <FaComments className="crm-header-icon" /> :
             <FaCalendarAlt className="crm-header-icon" />}
            <span>Quản lý Lịch Tư vấn cá nhân</span>
          </h1>
          <p className="crm-subtitle">
            Theo dõi lịch sử, tham gia tư vấn trực tuyến và video call
          </p>
        </div>
        
        <div className="crm-header-actions">
          <button className="crm-btn cpm-btn-primary" onClick={() => navigate('/dich-vu?tab=consultation')}>
            <FaPlusCircle /> <span>Đặt lịch mới</span>
          </button>
          <button className="crm-btn" style={{background: '#fff', border: '1px solid #ddd'}} onClick={fetchStats}>
            <FaSync />
          </button>
        </div>
      </div>

      {/* 2. Stats Cards (Tái sử dụng style Admin) */}
      {stats && (
        <div className="crm-stats-grid">
          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-primary">
              <FaCalendarAlt />
            </div>
            <div className="crm-stat-content">
              <h3>{stats.total_consultations || 0}</h3>
              <p>Tổng lịch hẹn</p>
            </div>
          </div>
          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-success">
              <FaComments />
            </div>
            <div className="crm-stat-content">
              <h3>{stats.completed || 0}</h3>
              <p>Đã hoàn thành</p>
            </div>
          </div>
          <div className="crm-stat-card">
            <div className="crm-stat-icon-box crm-bg-warning">
              <FaVideo />
            </div>
            <div className="crm-stat-content">
              <h3>{stats.total_video || 0}</h3>
              <p>Cuộc gọi Video</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs (Giống Admin) */}
      <div className="crm-tabs-wrapper">
        <div className="crm-tabs">
          <button
            className={`crm-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => handleTabChange('list')}
          >
            <FaList /> Tất cả lịch sử
          </button>
          
          <button
            className={`crm-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleTabChange('chat')}
          >
            <FaComments /> Tư vấn Chat
            <span className="crm-tab-badge" style={{marginLeft: 5}}>Realtime</span>
          </button>
          
          <button
            className={`crm-tab ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => handleTabChange('video')}
          >
            <FaVideo /> Video Call
          </button>

          <button
            className={`crm-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => handleTabChange('reports')}
          >
            <FaFlag /> Báo cáo của tôi
            {myReports.filter(r => r.status === 'pending' || r.status === 'investigating').length > 0 && (
              <span className="crm-tab-badge" style={{marginLeft: 5, background: '#e74c3c'}}>
                {myReports.filter(r => r.status === 'pending' || r.status === 'investigating').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 4. Content Area */}
      <div className="crm-content-area">
        {activeTab === 'list' && (
          <ConsultationRealtimeList initialType="all" role={userRole} />
        )}

        {activeTab === 'chat' && (
          <ConsultationRealtimeList initialType="chat" role={userRole} />
        )}

        {activeTab === 'video' && (
          <ConsultationRealtimeList initialType="video" role={userRole} />
        )}

        {activeTab === 'reports' && (
          <div className="crm-card" style={{padding: 24}}>
            <h3 style={{marginBottom: 16}}><FaFlag style={{marginRight: 8, color: '#e74c3c'}}/>Báo cáo sự cố của tôi</h3>
            {reportsLoading ? (
              <div style={{textAlign:'center', padding: 40}}><FaSpinner className="fa-spin"/> Đang tải...</div>
            ) : myReports.length === 0 ? (
              <div style={{textAlign:'center', padding: 40, color: '#999'}}>Bạn chưa có báo cáo nào.</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap: 12}}>
                {myReports.map(report => (
                  <div key={report.id} style={{
                    border: '1px solid #eee', borderRadius: 10, padding: 16,
                    borderLeft: `4px solid ${
                      report.status === 'resolved' ? '#27ae60' :
                      report.status === 'investigating' ? '#f39c12' : '#e74c3c'
                    }`
                  }}>
                    {/* Header: loại sự cố + trạng thái */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
                      <span style={{fontWeight: 700, fontSize: 15}}>
                        {({
                          technical:       '🔧 Kỹ thuật',
                          behavior:        '⚠️ Hành vi',
                          emergency:       '🚨 Khẩn cấp y tế / an toàn',
                          security:        '🔒 Bảo mật',
                          no_video:        '📹 Không có video',
                          no_audio:        '🔇 Không có âm thanh',
                          connection_lost: '📡 Mất kết nối',
                          poor_quality:    '📶 Chất lượng kém',
                          network_issue:   '🌐 Lỗi mạng',
                          server_error:    '🖥 Lỗi máy chủ',
                          other:           '📋 Khác',
                        })[report.report_type] || ('📋 ' + report.report_type)}
                      </span>
                      <span style={{
                        fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                        background: report.status === 'resolved' ? '#d5f5e3' :
                                    report.status === 'investigating' ? '#fef9e7' :
                                    report.status === 'acknowledged' ? '#e8f4fd' : '#fdecea',
                        color: report.status === 'resolved' ? '#1e8449' :
                               report.status === 'investigating' ? '#d68910' :
                               report.status === 'acknowledged' ? '#2471a3' : '#c0392b'
                      }}>
                        {report.status === 'pending' ? '⏳ Chờ xử lý' :
                         report.status === 'investigating' ? '🔍 Đang xử lý' :
                         report.status === 'resolved' ? '✅ Đã giải quyết' :
                         report.status === 'acknowledged' ? '👀 Đã tiếp nhận' : report.status}
                      </span>
                    </div>

                    {/* Thông tin chi tiết lịch hẹn */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '6px 16px', marginBottom: 10,
                      background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
                      fontSize: 13
                    }}>
                      <div>
                        <span style={{color:'#888'}}>📋 Mã tư vấn: </span>
                        <strong>{report.consultation?.consultation_code || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{color:'#888'}}>⏰ Giờ báo cáo: </span>
                        <strong>{new Date(report.created_at).toLocaleString('vi-VN')}</strong>
                      </div>
                      <div>
                        <span style={{color:'#888'}}>📅 Giờ hẹn: </span>
                        <strong>
                          {report.consultation?.appointment_time
                            ? new Date(report.consultation.appointment_time).toLocaleString('vi-VN')
                            : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span style={{color:'#888'}}>🎁 Gói tư vấn: </span>
                        <strong>
                          {report.consultation?.package?.package_name ||
                           report.consultation?.consultation_type?.toUpperCase() || 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span style={{color:'#888'}}>👤 Người báo cáo: </span>
                        <strong>{report.reporter?.full_name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{color:'#888'}}>🩺 Bác sĩ phụ trách: </span>
                        <strong>{report.consultation?.doctor?.full_name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{color:'#888'}}>🏥 Bệnh nhân: </span>
                        <strong>{report.consultation?.patient?.full_name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{color:'#888'}}>⚡ Mức độ: </span>
                        <strong style={{
                          color: report.priority === 'urgent' ? '#e74c3c' :
                                 report.priority === 'high' ? '#e67e22' : '#27ae60'
                        }}>
                          {report.priority === 'urgent' ? '🔴 Khẩn cấp' :
                           report.priority === 'high' ? '🟠 Cao' :
                           report.priority === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}
                        </strong>
                      </div>
                    </div>

                    {/* Mô tả sự cố */}
                    <div style={{marginBottom: 10, padding: '8px 12px', background: '#fffbe6', borderRadius: 6, fontSize: 13, borderLeft: '3px solid #f0a500'}}>
                      <strong>📝 Ghi chú:</strong> {report.description}
                    </div>

                    {/* Phản hồi từ admin */}
                    {report.admin_notes && (
                      <div style={{marginBottom: 10, padding: '8px 12px', background: '#f0f8ff', borderRadius: 6, fontSize: 13, borderLeft: '3px solid #2471a3'}}>
                        <strong>💬 Phản hồi từ hệ thống:</strong> {report.admin_notes}
                      </div>
                    )}

                    {/* Footer: nút xem tin nhắn */}
                    <div style={{display:'flex', justifyContent:'flex-end'}}>
                      <button
                        onClick={() => handleToggleReport(report)}
                        style={{
                          fontSize: 12, padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
                          background: expandedReport === report.id ? '#eaf4fb' : '#f8f9fa',
                          border: '1px solid #ddd', color: '#2471a3'
                        }}
                      >
                        {expandedReport === report.id ? '▲ Ẩn tin nhắn' : '💬 Xem tin nhắn hệ thống'}
                      </button>
                    </div>

                    {/* Khu vực tin nhắn hệ thống + trả lời */}
                    {expandedReport === report.id && (
                      <div style={{marginTop: 12, background: '#f9f9f9', borderRadius: 8, padding: 12}}>
                        {/* Danh sách tin nhắn */}
                        <div style={{maxHeight: 200, overflowY: 'auto', marginBottom: 10}}>
                          {!reportMessages[report.consultation_id] ? (
                            <div style={{textAlign:'center', color:'#999', fontSize: 13}}>⏳ Đang tải...</div>
                          ) : reportMessages[report.consultation_id].length === 0 ? (
                            <div style={{textAlign:'center', color:'#999', fontSize: 13}}>Chưa có tin nhắn nào từ hệ thống.</div>
                          ) : (
                            reportMessages[report.consultation_id].map(msg => (
                              <div key={msg.id} style={{
                                marginBottom: 8, padding: '6px 10px', borderRadius: 6,
                                background: '#fff3cd', fontSize: 13,
                                borderLeft: '3px solid #f0a500'
                              }}>
                                <div style={{fontWeight: 600, fontSize: 12, color: '#888', marginBottom: 2}}>
                                  🔔 Hệ thống · {new Date(msg.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                </div>
                                <div>{msg.content}</div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Ô trả lời — chỉ hiện khi chưa resolved */}
                        {report.status !== 'resolved' && report.status !== 'wont_fix' && (
                          <div style={{display:'flex', gap: 8}}>
                            <input
                              type="text"
                              placeholder="Nhập phản hồi của bạn..."
                              value={replyText[report.id] || ''}
                              onChange={e => setReplyText(prev => ({ ...prev, [report.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handleReply(report)}
                              style={{
                                flex: 1, padding: '6px 10px', borderRadius: 6,
                                border: '1px solid #ddd', fontSize: 13
                              }}
                            />
                            <button
                              onClick={() => handleReply(report)}
                              disabled={replySending || !replyText[report.id]?.trim()}
                              style={{
                                padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                                background: '#27ae60', color: '#fff', border: 'none', fontSize: 13,
                                opacity: replySending || !replyText[report.id]?.trim() ? 0.6 : 1
                              }}
                            >
                              {replySending ? '...' : '➤ Gửi'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultationHistoryPage;
// Path: client/src/components/consultation/ConsultationRealtimeMonitor.js
// ============================================================================
// ✅ ĐÃ VIẾT LẠI GIAO DIỆN VÀ CLASS NAME THEO CHỦ ĐỀ Y TẾ

import React, { useState, useEffect, useRef, useCallback } from 'react';
import consultationService from '../../services/consultationService';
import chatService from '../../services/chatService'; 
import { 
  FaExclamationTriangle, 
  FaCheck, 
  FaPaperPlane, 
  FaTimes, 
  FaUserShield, 
  FaNotesMedical, 
  FaHeadset,
  FaSpinner,
  FaVideo, FaVolumeOff, FaWifi, FaTachometerAlt, FaServer
} from 'react-icons/fa';

// Import file CSS mới
import './ConsultationRealtimeMonitor.css';

// Component Card Sự cố (Đã đổi class name)
const IncidentCard = ({ report, onResolve, onAction }) => {
  
  const INCIDENT_META = {
    technical:        { icon: <FaHeadset />,          title: "Lỗi kỹ thuật" },
    behavior:         { icon: <FaUserShield />,        title: "Vấn đề thái độ/hành vi" },
    emergency:        { icon: <FaNotesMedical />,      title: "Khẩn cấp y tế / an toàn" },
    security:         { icon: <FaExclamationTriangle />, title: "Vi phạm bảo mật" },
    no_video:         { icon: <FaVideo />,             title: "Không có hình ảnh" },
    no_audio:         { icon: <FaVolumeOff />,         title: "Không có âm thanh" },
    connection_lost:  { icon: <FaWifi />,              title: "Mất kết nối" },
    poor_quality:     { icon: <FaTachometerAlt />,     title: "Chất lượng kém" },
    network_issue:    { icon: <FaWifi />,              title: "Lỗi mạng" },
    server_error:     { icon: <FaServer />,            title: "Lỗi máy chủ" },
    other:            { icon: <FaExclamationTriangle />, title: "Sự cố khác" },
  };

  const getIncidentIcon  = (type) => (INCIDENT_META[type] || INCIDENT_META.other).icon;
  const getIncidentTitle = (type) => (INCIDENT_META[type] || INCIDENT_META.other).title;

  const consultation = report.consultation;
  const patientId = consultation?.patient?.id;
  const doctorId = consultation?.doctor?.id;

  return (
    <div className={`consultation-realtime-monitor-card consultation-realtime-monitor-card-${report.report_type}`}>
      {/* Header của Card */}
      <div className="consultation-realtime-monitor-card-header">
        <span className="consultation-realtime-monitor-card-icon">
          {getIncidentIcon(report.report_type)}
        </span>
        <h4 className="consultation-realtime-monitor-card-title">
          {getIncidentTitle(report.report_type)}
        </h4>
        <span className="consultation-realtime-monitor-card-time">
          {new Date(report.created_at).toLocaleTimeString('vi-VN')}
        </span>
      </div>
      
      {/* Thân Card */}
      <div className="consultation-realtime-monitor-card-body">
        <p className="consultation-realtime-monitor-card-description">
          <strong>Ghi chú:</strong> {report.description}
        </p>
        <div className="consultation-realtime-monitor-card-meta">
          <span><strong>Mã phiên:</strong> {consultation?.consultation_code}</span>
          <span><strong>Người báo cáo:</strong> {report.reporter?.full_name} (ID: {report.reporter_id})</span>
        </div>
      </div>
      
      {/* Nút hành động */}
      <div className="consultation-realtime-monitor-card-actions">
        <button 
          className="consultation-realtime-monitor-action-button"
          onClick={() => onAction('message_user', consultation.id, patientId)}
          title="Gửi tin nhắn riêng cho Bệnh nhân"
        >
          <FaPaperPlane /> Gửi BN
        </button>
        <button 
          className="consultation-realtime-monitor-action-button"
          onClick={() => onAction('message_doctor', consultation.id, doctorId)}
          title="Gửi tin nhắn riêng cho Bác sĩ"
        >
          <FaPaperPlane /> Gửi BS
        </button>
        <button
          className="consultation-realtime-monitor-action-button"
          onClick={() => onAction('view_chat', consultation.id)}
          title="Xem lịch sử chat"
        >
          💬 Xem chat
        </button>
        <button 
          className="consultation-realtime-monitor-action-button consultation-realtime-monitor-action-terminate"
          onClick={() => onAction('terminate', consultation.id)}
          title="Buộc kết thúc phiên"
        >
          <FaTimes /> Kết thúc
        </button>
        <button 
          className="consultation-realtime-monitor-action-button consultation-realtime-monitor-action-resolve"
          onClick={() => onResolve(report.id)}
          title="Đánh dấu là đã xử lý"
        >
          <FaCheck /> Xử lý
        </button>
      </div>
    </div>
  );

};

// Component Monitor chính (Đã đổi class name)
export const ConsultationRealtimeMonitor = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsListenerAttached = useRef(false);

  // --- LOGIC GIỮ NGUYÊN ---
  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await consultationService.getPendingIncidents();
      if (response.data.success) {
        setIncidents(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Không thể tải danh sách sự cố');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNewIncident = (incident) => {
    console.log('Sự cố mới từ WebSocket:', incident);
    setIncidents(prev => [incident, ...prev]);
  };

  useEffect(() => {
    fetchIncidents();
    if (!wsListenerAttached.current) {
      chatService.on('new_incident', handleNewIncident);
      wsListenerAttached.current = true;
      console.log('WebSocket: Đã lắng nghe sự kiện "new_incident"');
    }
    return () => {
      chatService.off('new_incident', handleNewIncident);
      wsListenerAttached.current = false;
    };
  }, [fetchIncidents]);

  const [resolveModal, setResolveModal] = useState(null); // { reportId, note, type }
  const [actionModal, setActionModal] = useState(null);   // { type, consultationId, targetUserId, message }

  const handleResolve = (reportId) => {
    setResolveModal({ reportId, note: '', actionType: 'resolved' });
  };

  const handleResolveSubmit = async () => {
    if (!resolveModal) return;
    try {
      await consultationService.resolveIncident(resolveModal.reportId, {
        admin_note: resolveModal.note,
        status: resolveModal.actionType
      });
      // Chỉ xóa khỏi danh sách nếu đã resolved/dismissed hẳn
      if (['resolved', 'wont_fix'].includes(resolveModal.actionType)) {
        setIncidents(prev => prev.filter(inc => inc.id !== resolveModal.reportId));
      } else {
        // Cập nhật trạng thái tại chỗ để admin thấy ngay
        setIncidents(prev => prev.map(inc =>
          inc.id === resolveModal.reportId
            ? { ...inc, status: resolveModal.actionType, admin_notes: resolveModal.note }
            : inc
        ));
      }
      setResolveModal(null);
      alert('✅ Đã cập nhật trạng thái báo cáo. Bệnh nhân sẽ nhận được thông báo.');
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAdminAction = (actionType, consultationId, targetUserId) => {
    if (actionType === 'view_chat') {
      handleViewChat(consultationId);
      return;
    }
    setActionModal({ actionType, consultationId, targetUserId, message: '', reason: '' });
  };

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { actionType, consultationId, targetUserId, message, reason } = actionModal;
    try {
      if (actionType === 'message_user' || actionType === 'message_doctor') {
        if (!message.trim()) { alert('Vui lòng nhập tin nhắn.'); return; }
        await consultationService.sendSystemMessage(consultationId, {
          message: `[ADMIN] ${message}`,
          type: 'private_admin',
          target_user_id: targetUserId,
          notify_both: actionModal.notifyBoth
        });
        alert('✅ Đã gửi tin nhắn hệ thống thành công!');
      } else if (actionType === 'terminate') {
        if (!reason.trim()) { alert('Vui lòng nhập lý do kết thúc.'); return; }
        await consultationService.forceEndConsultation(consultationId, { reason });
        setIncidents(prev => prev.filter(inc => inc.consultation?.id !== consultationId));
        alert('✅ Đã buộc kết thúc phiên.');
      }
      setActionModal(null);
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    }
  };

  const [chatHistoryModal, setChatHistoryModal] = useState(null); // { consultationId, messages }
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);

  const handleViewChat = async (consultationId) => {
    setChatHistoryModal({ consultationId, messages: [] });
    setChatHistoryLoading(true);
    try {
      const res = await consultationService.getConsultationChatHistory(consultationId);
      setChatHistoryModal({ consultationId, messages: res.data.data || [] });
    } catch (err) {
      alert('Không thể tải lịch sử chat: ' + (err.response?.data?.message || err.message));
      setChatHistoryModal(null);
    } finally {
      setChatHistoryLoading(false);
    }
  };
  // --- KẾT THÚC LOGIC ---

  return (
    <div className="consultation-realtime-monitor-container">
      {/* Header của trang */}
      <div className="consultation-realtime-monitor-header">
        <h3 className="consultation-realtime-monitor-title">
          <FaExclamationTriangle /> Bảng điều khiển Sự cố ({incidents.length})
        </h3>
        <span className="consultation-realtime-monitor-live-indicator">
          <span className="consultation-realtime-monitor-pulse-dot"></span> LIVE
        </span>
      </div>

      {/* Trạng thái Loading */}
      {loading && (
        <div className="consultation-realtime-monitor-empty-state">
          <FaSpinner className="consultation-realtime-monitor-spinner" />
          <p>Đang tải danh sách sự cố...</p>
        </div>
      )}

      {/* Trạng thái Lỗi */}
      {error && (
        <div className="consultation-realtime-monitor-empty-state consultation-realtime-monitor-error-state">
          <FaExclamationTriangle />
          <p>{error}</p>
        </div>
      )}

      {/* Trạng thái Rỗng */}
      {!loading && !error && incidents.length === 0 && (
        <div className="consultation-realtime-monitor-empty-state">
          <FaCheck />
          <p>Không có sự cố nào đang chờ xử lý.</p>
        </div>
      )}

      {/* Danh sách Card sự cố */}
      <div className="consultation-realtime-monitor-list">
        {incidents.map((report) => (
          <IncidentCard 
            key={report.id} 
            report={report}
            onResolve={handleResolve}
            onAction={handleAdminAction}
          />
        ))}
      </div>

      {/* Modal Xử lý sự cố */}
      {resolveModal && (
        <div className="crm-modal-overlay" onClick={() => setResolveModal(null)}>
          <div className="crm-modal-box" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">✅ Xử lý sự cố</div>
            <div className="crm-modal-body">
              <label>Loại xử lý</label>
              <select value={resolveModal.actionType} onChange={e => setResolveModal(p => ({ ...p, actionType: e.target.value }))}>
                <option value="resolved">✅ Đã giải quyết</option>
                <option value="investigating">🔍 Đang điều tra</option>
                <option value="wont_fix">🚫 Không xử lý</option>
              </select>
              <label>Ghi chú nội bộ</label>
              <textarea rows={3} placeholder="Nhập ghi chú xử lý..." value={resolveModal.note}
                onChange={e => setResolveModal(p => ({ ...p, note: e.target.value }))} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!resolveModal.notifyPatient}
                  onChange={e => setResolveModal(p => ({ ...p, notifyPatient: e.target.checked }))} />
                Gửi thông báo cho bệnh nhân
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!resolveModal.notifyDoctor}
                  onChange={e => setResolveModal(p => ({ ...p, notifyDoctor: e.target.checked }))} />
                Gửi thông báo cho bác sĩ
              </label>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn-sec" onClick={() => setResolveModal(null)}>Hủy</button>
              <button className="crm-btn-primary" onClick={handleResolveSubmit}>Xác nhận xử lý</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hành động Admin */}
      {actionModal && (
        <div className="crm-modal-overlay" onClick={() => setActionModal(null)}>
          <div className="crm-modal-box" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              {actionModal.actionType === 'terminate' ? '🚫 Buộc kết thúc phiên' : '✉️ Gửi tin nhắn hệ thống'}
            </div>
            <div className="crm-modal-body">
              {(actionModal.actionType === 'message_user' || actionModal.actionType === 'message_doctor') && (
                <>
                  <label>Tin nhắn gửi tới {actionModal.actionType === 'message_user' ? 'Bệnh nhân' : 'Bác sĩ'}</label>
                  <textarea rows={3} placeholder="Nhập nội dung tin nhắn..." value={actionModal.message}
                    onChange={e => setActionModal(p => ({ ...p, message: e.target.value }))} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={!!actionModal.notifyBoth}
                      onChange={e => setActionModal(p => ({ ...p, notifyBoth: e.target.checked }))} />
                    Gửi cho cả hai (bệnh nhân + bác sĩ)
                  </label>
                </>
              )}
              {actionModal.actionType === 'terminate' && (
                <>
                  <div style={{ padding: '8px', background: '#fff3cd', borderRadius: 6, marginBottom: 10, fontSize: 12 }}>
                    ⚠️ Hành động này sẽ kết thúc phiên ngay lập tức và thông báo tới cả hai bên.
                  </div>
                  <label>Lý do kết thúc bắt buộc *</label>
                  <textarea rows={3} placeholder="Nhập lý do..." value={actionModal.reason}
                    onChange={e => setActionModal(p => ({ ...p, reason: e.target.value }))} />
                </>
              )}
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn-sec" onClick={() => setActionModal(null)}>Hủy</button>
              <button
                className={actionModal.actionType === 'terminate' ? 'crm-btn-danger' : 'crm-btn-primary'}
                onClick={handleActionSubmit}
              >
                {actionModal.actionType === 'terminate' ? '🚫 Buộc kết thúc' : '✉️ Gửi tin nhắn'}
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Modal xem lịch sử chat */}
      {chatHistoryModal && (
        <div className="crm-modal-overlay" onClick={() => setChatHistoryModal(null)}>
          <div className="crm-modal-box crm-modal-chat" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              💬 Lịch sử chat — Phiên #{chatHistoryModal.consultationId}
              <button className="crm-modal-close-btn" onClick={() => setChatHistoryModal(null)}>✕</button>
            </div>
            <div className="crm-modal-chat-body">
              {chatHistoryLoading && <p style={{ textAlign: 'center', padding: 20 }}>⏳ Đang tải...</p>}
              {!chatHistoryLoading && chatHistoryModal.messages.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: 20 }}>Chưa có tin nhắn nào.</p>
              )}
              {chatHistoryModal.messages.map(msg => (
                <div key={msg.id} className={`crm-chat-msg crm-chat-msg-${msg.message_type}`}>
                  <div className="crm-chat-msg-sender">
                    {msg.message_type === 'system' ? '🔔 Hệ thống' : (msg.sender?.full_name || 'Người dùng')}
                    <span className="crm-chat-msg-time">
                      {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="crm-chat-msg-content">{msg.message || msg.content}</div>
                </div>
              ))}
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn-sec" onClick={() => setChatHistoryModal(null)}>Đóng</button>
              <button className="crm-btn-primary" onClick={() => {
                setChatHistoryModal(null);
                setActionModal({ actionType: 'message_user', consultationId: chatHistoryModal.consultationId, targetUserId: null, message: '', reason: '' });
              }}>
                ✉️ Trả lời bệnh nhân
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
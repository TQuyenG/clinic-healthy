// client/src/pages/ContactManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { 
  FaEnvelope, FaSearch, FaArrowLeft, FaCheck, FaPaperPlane,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaLock, 
  FaHandHoldingHeart, FaReply, FaUserTie, FaClock, FaTimes
} from 'react-icons/fa';
import './ContactManagementPage.css';

const STATUS_MAP = {
  new:        { label: 'Mới', bg: '#fee2e2', text: '#b91c1c' },
  processing: { label: 'Đang xử lý', bg: '#fef3c7', text: '#b45309' },
  replied:    { label: 'Đang trao đổi', bg: '#dbeafe', text: '#1d4ed8' },
  closed:     { label: 'Đã hoàn thành', bg: '#f1f5f9', text: '#475569' }
};

export default function ContactManagementPage() {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ new: 0, processing: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState(null);
  
  const [filters, setFilters] = useState({ status: 'all', search: '', page: 1, limit: 30 });
  
  // Email Composer States
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [emailBCC, setEmailBCC] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  
  const [toast, setToast] = useState(null);
  const [confirmPopup, setConfirmPopup] = useState({ visible: false, action: null, title: '', msg: '' });

  // Get current user ID (Giả sử bạn có auth hook, ở đây tạm parse từ token hoặc truyền props)
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
  const currentUserRole = JSON.parse(localStorage.getItem('user'))?.role;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.search) delete params.search;
      const res = await api.get('/contact/messages', { params });
      setMessages(res.data.data || []);
      setStats(res.data.stats || {});
    } catch {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleSelect = async (msg) => {
    // Gọi API để lấy chi tiết mới nhất
    try {
      const res = await api.get(`/contact/messages/${msg.id}`);
      const detailMsg = res.data.data;
      setSelectedMsg(detailMsg);
      setEmailSubject(`Re: [Ticket #${detailMsg.id}] ${detailMsg.subject}`);
      setEmailCC(''); setEmailBCC(''); setEmailContent('');
    } catch { showToast('Không thể tải chi tiết', 'error'); }
  };

  const handleClaimTicket = () => {
    setConfirmPopup({
      visible: true,
      title: 'Nhận xử lý Ticket',
      msg: 'Bạn có chắc chắn muốn nhận xử lý Ticket này? Hệ thống sẽ gửi email tự động báo cho khách hàng.',
      action: async () => {
        try {
          await api.post(`/contact/messages/${selectedMsg.id}/claim`);
          showToast('Đã nhận Ticket thành công');
          fetchMessages();
          handleSelect(selectedMsg); // Reload detail
        } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error'); }
        setConfirmPopup({ visible: false });
      }
    });
  };

  const handleReply = async () => {
    if (!emailContent.trim()) return showToast('Vui lòng soạn nội dung email', 'error');
    setIsReplying(true);
    try {
      await api.post(`/contact/messages/${selectedMsg.id}/reply`, { 
        reply_content_html: emailContent,
        email_subject: emailSubject,
        email_cc: emailCC,
        email_bcc: emailBCC
      });
      showToast('Đã gửi email thành công');
      fetchMessages();
      handleSelect(selectedMsg); // Reload to show new history
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi gửi mail', 'error'); }
    finally { setIsReplying(false); }
  };

  const handleCloseTicket = () => {
    setConfirmPopup({
      visible: true,
      title: 'Đóng Ticket',
      msg: 'Khách hàng sẽ nhận được email báo kết thúc. Bạn không thể trả lời thêm sau khi đóng.',
      action: async () => {
        try {
          await api.put(`/contact/messages/${selectedMsg.id}/close`);
          showToast('Đã đóng Ticket');
          fetchMessages();
          handleSelect(selectedMsg);
        } catch (e) { showToast('Lỗi đóng ticket', 'error'); }
        setConfirmPopup({ visible: false });
      }
    });
  };

  // Helper render History
  const renderHistory = () => {
    if (!selectedMsg?.admin_note) return null;
    try {
      const historyArr = JSON.parse(selectedMsg.admin_note);
      if (!Array.isArray(historyArr)) return null;
      return historyArr.map((item, idx) => (
        <div key={idx} className="c-mgr-thread-item">
          <div className="c-mgr-thread-head">
            <FaReply style={{ color: '#16a34a' }}/> 
            <strong>{item.sender === 'staff' ? 'Nhân viên hệ thống' : 'Khách hàng'}</strong> đã trả lời
            <span className="c-mgr-thread-time"><FaClock/> {new Date(item.timestamp).toLocaleString('vi-VN')}</span>
          </div>
          <div className="c-mgr-thread-body" dangerouslySetInnerHTML={{ __html: item.content }} />
        </div>
      ));
    } catch { return null; }
  };

  const canReply = selectedMsg && selectedMsg.status !== 'closed' && (selectedMsg.replied_by === currentUserId || currentUserRole === 'admin');
  const needsClaim = selectedMsg && selectedMsg.status === 'new' && !selectedMsg.replied_by;

  return (
    <div className="c-mgr-layout">
      {toast && (
        <div className={`c-mgr-toast c-mgr-toast-${toast.type}`}>
          {toast.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />} {toast.msg}
        </div>
      )}

      {/* CONFIRM POPUP */}
      {confirmPopup.visible && (
        <div className="c-mgr-overlay">
          <div className="c-mgr-popup">
            <h3>{confirmPopup.title}</h3>
            <p>{confirmPopup.msg}</p>
            <div className="c-mgr-popup-actions">
              <button className="c-mgr-btn-cancel" onClick={() => setConfirmPopup({visible: false})}>Hủy</button>
              <button className="c-mgr-btn-primary" onClick={confirmPopup.action}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER (CỘT TRÁI) */}
      <div className={`c-mgr-master ${selectedMsg ? 'c-mgr-hide-mob' : ''}`}>
        <div className="c-mgr-header">
          <div className="c-mgr-header-title">
            <FaEnvelope /> Quản lý Liên Hệ
          </div>
          <div className="c-mgr-filters">
            <div className="c-mgr-search">
              <FaSearch />
              <input 
                placeholder="Tìm tên, email, #ID..." 
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                onKeyPress={e => e.key === 'Enter' && fetchMessages()}
              />
            </div>
            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}>
              <option value="all">Tất cả trạng thái</option>
              <option value="new">Mới (Chưa nhận)</option>
              <option value="processing">Đang xử lý</option>
              <option value="replied">Đang trao đổi</option>
              <option value="closed">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        <div className="c-mgr-list">
          {loading ? <div className="c-mgr-empty">Đang tải...</div> 
          : messages.length === 0 ? <div className="c-mgr-empty">Không có Ticket nào</div>
          : messages.map(msg => {
              const st = STATUS_MAP[msg.status] || STATUS_MAP.new;
              return (
                <div key={msg.id} className={`c-mgr-item ${selectedMsg?.id === msg.id ? 'active' : ''}`} onClick={() => handleSelect(msg)}>
                  <div className="c-mgr-item-row">
                    <span className="c-mgr-item-name">#{msg.id} - {msg.name}</span>
                    <span className="c-mgr-item-date">{new Date(msg.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="c-mgr-item-subject">{msg.subject}</div>
                  <div className="c-mgr-item-row" style={{ marginTop: '6px' }}>
                    <span className="c-mgr-badge" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                    {msg.replier && <span className="c-mgr-assignee"><FaUserTie/> {msg.replier.full_name}</span>}
                  </div>
                </div>
              )
          })}
        </div>
      </div>

      {/* DETAIL (CỘT PHẢI) */}
      <div className={`c-mgr-detail ${!selectedMsg ? 'c-mgr-hide-mob' : ''}`}>
        {!selectedMsg ? (
          <div className="c-mgr-placeholder"><FaEnvelope /> Chọn một Ticket để xem và trả lời</div>
        ) : (
          <div className="c-mgr-detail-inner">
            <div className="c-mgr-detail-top">
              <button className="c-mgr-back-btn" onClick={() => setSelectedMsg(null)}><FaArrowLeft /> Trở lại</button>
              <div className="c-mgr-actions">
                <span className="c-mgr-badge" style={{ background: STATUS_MAP[selectedMsg.status].bg, color: STATUS_MAP[selectedMsg.status].text, marginRight: 10 }}>
                  {STATUS_MAP[selectedMsg.status].label}
                </span>
                {canReply && (
                  <button className="c-mgr-btn-close" onClick={handleCloseTicket}><FaCheck /> Đóng Ticket</button>
                )}
              </div>
            </div>

            <div className="c-mgr-scroll-area">
              <h2 className="c-mgr-subject-large">#{selectedMsg.id} - {selectedMsg.subject}</h2>
              
              <div className="c-mgr-mail-header">
                <div className="c-mgr-avatar">{selectedMsg.name.charAt(0).toUpperCase()}</div>
                <div className="c-mgr-mail-info">
                  <div className="c-mgr-mail-from"><strong>{selectedMsg.name}</strong> &lt;{selectedMsg.email}&gt;</div>
                  <div className="c-mgr-mail-date">{new Date(selectedMsg.created_at).toLocaleString('vi-VN')}</div>
                </div>
              </div>

              {/* NỘI DUNG GỐC KHÁCH GỬI */}
              <div className="c-mgr-mail-body">
                {selectedMsg.message.startsWith('🔒') ? (
                  <div className="c-mgr-lock-box"><FaLock /> {selectedMsg.message}</div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{selectedMsg.message}</div>
                )}
              </div>

              {/* LỊCH SỬ THREAD */}
              {renderHistory()}

              {/* PHẦN SOẠN EMAIL (Chỉ hiện khi đã nhận ticket và chưa đóng) */}
              {needsClaim ? (
                <div className="c-mgr-claim-box">
                  <FaHandHoldingHeart className="c-mgr-claim-icon"/>
                  <p>Ticket này chưa có người xử lý. Bạn cần nhận Ticket để có thể xem toàn bộ nội dung và trả lời khách hàng.</p>
                  <button className="c-mgr-btn-primary" onClick={handleClaimTicket}>Nhận Ticket Này</button>
                </div>
              ) : selectedMsg.status === 'closed' ? (
                <div className="c-mgr-closed-box">
                  <FaCheckCircle /> Ticket này đã được đóng và không thể trả lời thêm.
                </div>
              ) : canReply ? (
                <div className="c-mgr-composer">
                  <h4><FaReply/> Trả lời Email</h4>
                  <div className="c-mgr-input-group">
                    <label>Tới:</label>
                    <input type="text" value={`${selectedMsg.name} <${selectedMsg.email}>`} disabled />
                  </div>
                  <div className="c-mgr-input-group">
                    <label>Tiêu đề:</label>
                    <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                  </div>
                  <div className="c-mgr-input-group">
                    <label>CC:</label>
                    <input type="text" placeholder="Email cách nhau bởi dấu phẩy..." value={emailCC} onChange={e => setEmailCC(e.target.value)} />
                  </div>
                  <div className="c-mgr-input-group">
                    <label>BCC:</label>
                    <input type="text" placeholder="BCC ẩn danh..." value={emailBCC} onChange={e => setEmailBCC(e.target.value)} />
                  </div>
                  
                  {/* CKEDITOR */}
                  <div className="c-mgr-ckeditor-box">
                    <div id="c-mgr-toolbar"></div>
                    <div className="c-mgr-editor-wrapper">
                      {DecoupledEditor && (
                        <CKEditor
                          editor={DecoupledEditor}
                          data={emailContent}
                          onReady={editor => {
                            const toolbarContainer = document.querySelector('#c-mgr-toolbar');
                            if (toolbarContainer) toolbarContainer.appendChild(editor.ui.view.toolbar.element);
                          }}
                          onChange={(e, editor) => setEmailContent(editor.getData())}
                          config={{
                            toolbar: [ 'heading', '|', 'bold', 'italic', 'underline', 'link', 'bulletedList', 'numberedList', '|', 'undo', 'redo' ]
                          }}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="c-mgr-composer-footer">
                    <button className="c-mgr-btn-primary" onClick={handleReply} disabled={isReplying}>
                      {isReplying ? 'Đang gửi...' : <><FaPaperPlane/> Gửi Email</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="c-mgr-lock-box">
                  <FaLock /> Ticket này đang được xử lý bởi nhân viên khác ({selectedMsg.replier?.full_name}). Bạn không có quyền can thiệp.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './InRoomResultPanel.css';
import MedicalRecordFormPage from '../../pages/MedicalRecordFormPage';

const InRoomResultPanel = ({ appointmentCode, consultationCode, consultationId, onClose, onSubmitSuccess }) => {
  const panelCode = consultationCode || appointmentCode;
  console.log('🔍 InRoomResultPanel - code:', panelCode, 'consultationId:', consultationId);

  const rootRef = useRef(null);
  const dragHandleRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const embeddedActiveRecordId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('record_id');
  }, [location.search]);

  useEffect(() => {
    const layout = document.querySelector('.main-layout');
    if (layout) {
      layout.classList.add('inroom-panel-open');
      layout.style.setProperty('--inroom-panel-width', '420px');
    }
    // Cleanup
    return () => {
      if (layout) {
        layout.classList.remove('inroom-panel-open');
        layout.style.removeProperty('--inroom-panel-width');
      }
    };
  }, []);

  // Toggle collapse
  const toggleCollapse = () => {
    const layout = document.querySelector('.main-layout');
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    const width = newCollapsed ? '56px' : '420px';
    if (layout) layout.style.setProperty('--inroom-panel-width', width);
    if (rootRef.current) {
      rootRef.current.classList.toggle('collapsed', newCollapsed);
    }
  };

  // Drag to resize
  useEffect(() => {
    const handle = dragHandleRef.current;
    if (!handle) return;
    let dragging = false;
    let startX = 0;
    let startWidth = 420;
    const onMouseDown = (e) => {
      dragging = true;
      startX = e.clientX;
      const layout = document.querySelector('.main-layout');
      const val = layout ? parseInt(getComputedStyle(layout).getPropertyValue('--inroom-panel-width')) || 420 : 420;
      startWidth = val;
      document.body.style.userSelect = 'none';
    };
    const onMouseMove = (e) => {
      if (!dragging) return;
      const dx = startX - e.clientX; // dragging left increases width
      let newW = startWidth + dx;
      newW = Math.max(280, Math.min(720, newW));
      const layout = document.querySelector('.main-layout');
      if (layout) layout.style.setProperty('--inroom-panel-width', `${newW}px`);
    };
    const onMouseUp = () => {
      dragging = false;
      document.body.style.userSelect = '';
    };
    handle.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (!panelCode) {
    console.error('❌ InRoomResultPanel: code is missing!');
    return null;
  }

  return (
    <div className="inroom-result-panel-outer" aria-hidden={false}>
      <div
        ref={rootRef}
        className={`inroom-result-panel-root ${collapsed ? 'collapsed' : ''}`}
        role="dialog"
        aria-label="Nhập kết quả khám"
      >
        {/* Header luôn nằm trên cùng, không bị che */}
        <div className="inroom-result-panel-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 99999,
          background: '#f0fdf4',
          borderBottom: '2px solid #16a34a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          minHeight: '52px'
        }}>
          <div style={{fontWeight: 600, color: '#166534'}}>
            📋 Tạo Hồ Sơ Y Tế
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Thu gọn / mở rộng"
              style={{
                background: '#dcfce7',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >‹</button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng panel"
              title="Đóng"
              style={{
                background: '#fee2e2',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}
            >✕</button>
          </div>
        </div>

        <div className="inroom-result-panel-body" style={{overflow: 'auto', flex: 1}}>
          <MedicalRecordFormPage embeddedCode={panelCode} embeddedConsultationId={consultationId} embeddedActiveRecordId={embeddedActiveRecordId} onClose={onClose} onSubmitSuccess={onSubmitSuccess} />
        </div>
        <div ref={dragHandleRef} className="inroom-result-panel-handle" role="separator" aria-orientation="vertical" title="Kéo để thay đổi kích thước">
          <span className="inroom-result-panel-handle-icon">⋮⋮</span>
        </div>
      </div>
    </div>
  );
};

export default InRoomResultPanel;

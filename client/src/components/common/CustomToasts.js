import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import '../../styles/custom-toast.css';

const CustomToasts = () => {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="custom-toast-root" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className={`custom-toast-item custom-toast-${t.type}`} role="status">
          <div className="custom-toast-message">{t.message}</div>
          <button className="custom-toast-close" onClick={() => dismissToast(t.id)} aria-label="Đóng">×</button>
        </div>
      ))}
    </div>
  );
};

export default CustomToasts;

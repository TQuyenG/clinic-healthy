// FILE: client/src/components/common/Toast.js
// Mô tả: Component hiển thị thông báo toast (success, error, warning, info)

import React, { useState, useEffect } from 'react';
import '../../utils/css/toast.css';

let toastQueue = [];
let setToasts = null;

// Hàm để component bên ngoài có thể gọi
export const showToast = (message, type = 'info', duration = 3000) => {
  const id = Date.now() + Math.random();
  const toast = { id, message, type, duration };
  
  console.log(`[TOAST] Hiển thị: ${type.toUpperCase()} - ${message}`);
  
  if (setToasts) {
    setToasts(prev => [...prev, toast]);
  } else {
    toastQueue.push(toast);
  }
  
  return id;
};

// Gắn vào window để có thể gọi từ mọi nơi
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

const Toast = () => {
  const [toasts, setToastsState] = useState([]);

  useEffect(() => {
    setToasts = setToastsState;
    
    // Hiển thị các toast trong queue
    if (toastQueue.length > 0) {
      setToastsState(toastQueue);
      toastQueue = [];
    }
    
    return () => {
      setToasts = null;
    };
  }, []);

  useEffect(() => {
    // Tự động xóa toast sau duration
    toasts.forEach(toast => {
      setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
    });
  }, [toasts]);

  const removeToast = (id) => {
    setToastsState(prev => prev.filter(toast => toast.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <div className="toast-icon">
            {toast.type === 'success' && <span>✓</span>}
            {toast.type === 'error' && <span>✕</span>}
            {toast.type === 'warning' && <span>⚠</span>}
            {toast.type === 'info' && <span>ℹ</span>}
          </div>
          <div className="toast-message">{toast.message}</div>
          <button 
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
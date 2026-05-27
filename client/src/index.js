import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { CallQueueProvider } from './contexts/CallQueueContext';
import reportWebVitals from './reportWebVitals';

// ✅ Suppress ResizeObserver errors (common in React apps, không ảnh hưởng functionality)
const resizeObserverLoopErr = /ResizeObserver loop/;
const originalError = console.error;
console.error = (...args) => {
  if (args[0] && resizeObserverLoopErr.test(args[0])) {
    return; // Ignore ResizeObserver errors
  }
  originalError.call(console, ...args);
};

// ✅ Suppress ResizeObserver errors at window level
window.addEventListener('error', (e) => {
  if (e.message && resizeObserverLoopErr.test(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
});

// ✅ Patch ResizeObserver để triệt tiêu hoàn toàn màn hình đỏ (Webpack Overlay)
if (typeof window !== 'undefined' && window.ResizeObserver) {
  const _ResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends _ResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (error) {
            console.error(error);
          }
        });
      });
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CallQueueProvider>
      <App />
    </CallQueueProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

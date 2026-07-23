// client/src/services/ws.js
// Lightweight WebSocket client for forum real-time updates.

// client/src/services/ws.js
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

// Số lần thử reconnect tối đa - tránh spam server
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000; // 5 giây thay vì 2 giây

let socket = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let wsAvailable = true; // Flag đánh dấu WS có khả dụng không

function getUserId() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw)?.id || null;
  } catch (e) { return null; }
}

function getUserRole() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw)?.role || null;
  } catch (e) { return null; }
}

function connect() {
  // Nếu đã xác định WS không khả dụng → dừng hẳn
  if (!wsAvailable) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  try {
    socket = new WebSocket(WS_URL);
  } catch (e) {
    wsAvailable = false;
    return;
  }

  socket.onopen = () => {
    console.log('WS connected');
    reconnectAttempts = 0; // Reset counter khi kết nối thành công
    const userId = getUserId();
    const role = getUserRole();
    if (userId) {
      socket.send(JSON.stringify({ type: 'register', payload: { user_id: userId, role } }));
    }
  };

  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (!data?.type) return;

      const eventMap = {
        'forum_interaction':       'forum:interaction',
        'new_incident':            'consultation:new_incident',
        'system_message':          'consultation:system_message',
        'system_command':          'consultation:system_command',
        'incident_resolved':       'consultation:incident_resolved',
        'message_status_update':   'consultation:message_status',
      };

      const eventName = eventMap[data.type];
      if (eventName) {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data.payload }));
      }
    } catch (err) {
      console.error('WS message parse error', err);
    }
  };

  socket.onclose = () => {
    socket = null;
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // Đã thử đủ số lần → dừng reconnect, dùng polling thay thế
      wsAvailable = false;
      console.warn(`WS không khả dụng sau ${MAX_RECONNECT_ATTEMPTS} lần thử. Chuyển sang polling.`);
      startPollingFallback();
      return;
    }

    console.log(`WS closed, reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY/1000}s`);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
  };

  socket.onerror = () => {
    // Không log lỗi chi tiết để tránh spam console
  };
}

// Polling fallback khi WS không khả dụng (Apache hosting)
let pollingInterval = null;
function startPollingFallback() {
  if (pollingInterval) return;
  // Poll thông báo mới mỗi 15 giây thay vì real-time
  pollingInterval = setInterval(() => {
    window.dispatchEvent(new CustomEvent('ws:polling_tick'));
  }, 15000);
}

// Auto connect
if (typeof window !== 'undefined') {
  connect();
}

export default { connect };


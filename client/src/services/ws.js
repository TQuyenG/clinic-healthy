// client/src/services/ws.js
// Lightweight WebSocket client for forum real-time updates.

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

let socket = null;
let reconnectTimeout = null;

function getUserId() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch (e) {
    return null;
  }
}

function getUserRole() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw)?.role || null;
  } catch (e) {
    return null;
  }
}

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('WS connected to', WS_URL);
    // Register user if available
    const userId = getUserId();
    const role   = getUserRole(); // thêm hàm này bên dưới
    if (userId) {
      socket.send(JSON.stringify({ type: 'register', payload: { user_id: userId, role } }));
    }
  };

  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data && data.type === 'forum_interaction') {
        const event = new CustomEvent('forum:interaction', { detail: data.payload });
        window.dispatchEvent(event);
      }
      // Consultation realtime events
      if (data && data.type === 'new_incident') {
        const event = new CustomEvent('consultation:new_incident', { detail: data.payload });
        window.dispatchEvent(event);
      }
      if (data && data.type === 'system_message') {
        const event = new CustomEvent('consultation:system_message', { detail: data.payload });
        window.dispatchEvent(event);
      }
      if (data && data.type === 'system_command') {
        const event = new CustomEvent('consultation:system_command', { detail: data.payload });
        window.dispatchEvent(event);
      }
      // Admin đã xử lý xong sự cố → cập nhật tracker của user
      if (data && data.type === 'incident_resolved') {
        const event = new CustomEvent('consultation:incident_resolved', { detail: data.payload });
        window.dispatchEvent(event);
      }
      if (data && data.type === 'message_status_update') {
        const event = new CustomEvent('consultation:message_status', { detail: data.payload });
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error('WS message parse error', err);
    }
  };

  socket.onclose = (ev) => {
    console.log('WS closed, will reconnect in 2s', ev.reason);
    socket = null;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connect, 2000);
  };

  socket.onerror = (err) => {
    console.error('WS error', err);
  };
}

// Auto connect
if (typeof window !== 'undefined') {
  connect();
}

export default {
  connect,
};

import api from '../api';

export const getDashboardSummary = () => api.get('/dashboard/resumen');

export const connectDashboardEvents = (onUpdate, onError) => {
  const controller = new AbortController();
  let reconnectTimer = null;
  let stopped = false;
  const connect = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const baseUrl = String(api.defaults.baseURL || '').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/dashboard/eventos`, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(`SSE HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split(/\r?\n\r?\n/);
        buffer = messages.pop() || '';
        for (const message of messages) if (message.includes('event: dashboard:update')) await onUpdate();
      }
      if (!stopped) throw new Error('Conexión SSE cerrada');
    } catch (error) {
      if (stopped || error.name === 'AbortError') return;
      onError?.(error);
      reconnectTimer = window.setTimeout(connect, 3000);
    }
  };
  connect();
  return () => {
    stopped = true;
    controller.abort();
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
  };
};

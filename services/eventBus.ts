
type Handler = (data: any) => void;

class ProtocolEventBus {
  private handlers: { [key: string]: Handler[] } = {};

  on(event: string, handler: Handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter(h => h !== handler);
  }

  emit(event: string, data: any) {
    if (!this.handlers[event]) return;
    this.handlers[event].forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error(`[EventBus] Error in handler for ${event}:`, e);
      }
    });
  }
}

export const eventBus = new ProtocolEventBus();

export const PROTOCOL_EVENTS = {
  MESSAGE_RECEIVED: 'protocol:message_received',
  BLOCK_MINED: 'protocol:block_mined',
  SYSTEM_ALERT: 'protocol:system_alert',
  SYNC_STATUS: 'protocol:sync_status',
  AUTH_FAILURE: 'protocol:auth_failure'
};

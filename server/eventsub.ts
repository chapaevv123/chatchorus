import WebSocket from 'ws';

export type ConnectionState = 'CONNECTING' | 'LIVE_CONNECTED' | 'RECONNECTING' | 'ERROR' | 'DISCONNECTED';
export type SocketLike = Pick<WebSocket, 'on' | 'close' | 'terminate' | 'readyState'>;
export type SocketFactory = (url: string) => SocketLike;
export type ChatMessage = { id: string; broadcasterId: string; viewerId: string; viewer: string; text: string };
export class EventSubFatalError extends Error {}

export function parseChatNotification(message: any, broadcasterId: string): ChatMessage | null {
  if (message?.metadata?.message_type !== 'notification' || message?.payload?.subscription?.type !== 'channel.chat.message') return null;
  const event = message.payload.event;
  if (event?.broadcaster_user_id !== broadcasterId || typeof event?.message_id !== 'string' || !event.message_id ||
      typeof event?.chatter_user_id !== 'string' || !event.chatter_user_id || typeof event?.message?.text !== 'string') return null;
  const clean = (value: string, max: number) => value.slice(0, max).replace(/[\u0000-\u001f]/g, ' ');
  return { id: clean(event.message_id, 100), broadcasterId, viewerId: clean(event.chatter_user_id, 100),
    viewer: clean(String(event.chatter_user_name || event.chatter_user_login || 'Viewer'), 40), text: clean(event.message.text, 240) };
}

export function safeReconnectUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try { const url = new URL(raw); return url.protocol === 'wss:' && url.hostname === 'eventsub.wss.twitch.tv' && !url.port && !url.username && !url.password ? raw : null; }
  catch { return null; }
}

export class EventSubClient {
  private readonly options: {
    broadcasterId: string;
    socketFactory?: SocketFactory;
    subscribe: (sessionId: string) => Promise<void>;
    onChat: (message: ChatMessage) => void;
    onStatus: (state: ConnectionState, detail?: string) => void;
  };
  private active: SocketLike | null = null;
  private pending: SocketLike | null = null;
  private timers = new Map<SocketLike, ReturnType<typeof setTimeout>>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private epoch = 0;
  private attempts = 0;
  private stopped = true;
  constructor(options: {
    broadcasterId: string;
    socketFactory?: SocketFactory;
    subscribe: (sessionId: string) => Promise<void>;
    onChat: (message: ChatMessage) => void;
    onStatus: (state: ConnectionState, detail?: string) => void;
  }) { this.options = options; }

  start(): void { this.stop(); this.stopped = false; this.connect('wss://eventsub.wss.twitch.tv/ws', false); }
  stop(): void {
    this.stopped = true; this.epoch++;
    if (this.retryTimer) clearTimeout(this.retryTimer); this.retryTimer = null;
    for (const timer of this.timers.values()) clearTimeout(timer); this.timers.clear();
    this.active?.close(); this.pending?.close(); this.active = this.pending = null;
    this.options.onStatus('DISCONNECTED');
  }
  private arm(socket: SocketLike, ms: number): void {
    const old = this.timers.get(socket); if (old) clearTimeout(old);
    this.timers.set(socket, setTimeout(() => socket.terminate(), ms));
  }
  private disarm(socket: SocketLike): void { const timer = this.timers.get(socket); if (timer) clearTimeout(timer); this.timers.delete(socket); }
  private schedule(detail = ''): void {
    if (this.stopped || this.retryTimer) return;
    this.options.onStatus('RECONNECTING', detail);
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.attempts++, 5));
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connect('wss://eventsub.wss.twitch.tv/ws', false); }, delay);
  }
  private failHandoff(detail: string): void {
    this.epoch++;
    for (const timer of this.timers.values()) clearTimeout(timer); this.timers.clear();
    this.active?.close(); this.pending?.close(); this.active = this.pending = null;
    this.schedule(detail);
  }
  private connect(url: string, handoff: boolean): void {
    if (this.stopped) return;
    const epoch = this.epoch;
    this.options.onStatus(handoff ? 'RECONNECTING' : this.attempts ? 'RECONNECTING' : 'CONNECTING');
    const socket = (this.options.socketFactory || (value => new WebSocket(value)))(url);
    if (handoff) this.pending = socket; else this.active = socket;
    let keepaliveMs = 30_000;
    this.arm(socket, 15_000);
    socket.on('message', async raw => {
      if (this.stopped || epoch !== this.epoch || (socket !== this.active && socket !== this.pending)) return;
      try {
        const message = JSON.parse(String(raw));
        const kind = message?.metadata?.message_type;
        if (kind === 'session_welcome') keepaliveMs = Math.max(10, Math.min(600, Number(message?.payload?.session?.keepalive_timeout_seconds) || 30)) * 1000;
        this.arm(socket, keepaliveMs + 10_000);
        if (kind === 'session_welcome') {
          const sessionId = message?.payload?.session?.id;
          if (typeof sessionId !== 'string' || !sessionId) throw new Error('Missing EventSub session ID');
          if (handoff) {
            const old = this.active; this.active = socket; this.pending = null;
            if (old) { this.disarm(old); old.close(); }
          } else {
            await this.options.subscribe(sessionId);
          }
          this.attempts = 0; this.options.onStatus('LIVE_CONNECTED');
        } else if (kind === 'session_reconnect' && socket === this.active && !this.pending) {
          const target = safeReconnectUrl(message?.payload?.session?.reconnect_url);
          if (!target) throw new Error('Invalid EventSub reconnect URL');
          this.connect(target, true);
        } else if (kind === 'notification') {
          const chat = parseChatNotification(message, this.options.broadcasterId);
          if (chat) this.options.onChat(chat);
        } else if (kind === 'revocation') {
          this.stopped = true; this.options.onStatus('ERROR', 'Twitch revoked the chat subscription');
          for (const timer of this.timers.values()) clearTimeout(timer); this.timers.clear();
          this.active?.close(); this.pending?.close();
        }
      } catch (caught) {
        const detail = caught instanceof Error ? caught.message : 'EventSub error';
        if (caught instanceof EventSubFatalError) {
          this.stopped = true; this.options.onStatus('ERROR', detail);
          for (const timer of this.timers.values()) clearTimeout(timer); this.timers.clear();
          this.active?.close(); this.pending?.close(); return;
        }
        if (handoff) this.failHandoff(detail);
        else { this.options.onStatus('ERROR', detail); socket.close(); }
      }
    });
    socket.on('error', () => { if (!this.stopped && epoch === this.epoch) this.options.onStatus('ERROR', 'EventSub socket error'); });
    socket.on('close', () => {
      this.disarm(socket);
      if (this.stopped || epoch !== this.epoch) return;
      if (socket === this.pending) { this.failHandoff('EventSub handoff failed'); return; }
      if (socket === this.active) { this.active = null; if (!this.pending) this.schedule('EventSub disconnected; resubscribing'); }
    });
  }
}

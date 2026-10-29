import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventSubClient, EventSubFatalError, parseChatNotification, safeReconnectUrl, type SocketLike } from '../server/eventsub';

class FakeSocket extends EventEmitter {
  readyState = 1;
  closed = false;
  close(): void { if (this.closed) return; this.closed = true; this.readyState = 3; this.emit('close'); }
  terminate(): void { this.close(); }
  message(value: object): void { this.emit('message', JSON.stringify(value)); }
}
const welcome = (id: string) => ({ metadata: { message_type: 'session_welcome' }, payload: { session: { id, keepalive_timeout_seconds: 30 } } });
const chat = (id: string, broadcaster = 'channel') => ({ metadata: { message_type: 'notification' }, payload: {
  subscription: { type: 'channel.chat.message' }, event: { broadcaster_user_id: broadcaster, message_id: id, chatter_user_id: 'viewer-1', chatter_user_name: 'Ada', message: { text: 'hello' } } } });

afterEach(() => vi.useRealTimers());
describe('EventSub lifecycle', () => {
  it('requires a valid channel message and safe reconnect host', () => {
    expect(parseChatNotification(chat('m1'), 'channel')?.id).toBe('m1');
    expect(parseChatNotification(chat('m1', 'other'), 'channel')).toBeNull();
    expect(safeReconnectUrl('wss://eventsub.wss.twitch.tv/ws?x=1')).toBeTruthy();
    expect(safeReconnectUrl('wss://eventsub.wss.twitch.tv.evil.test/ws')).toBeNull();
  });
  it('subscribes after welcome, keeps the old socket live during handoff, and does not resubscribe on handoff', async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [], subscribed: string[] = [], received: string[] = [], states: string[] = [];
    const client = new EventSubClient({ broadcasterId: 'channel', socketFactory: () => { const s = new FakeSocket(); sockets.push(s); return s as unknown as SocketLike; },
      subscribe: async id => { subscribed.push(id); }, onChat: message => received.push(message.id), onStatus: state => states.push(state) });
    client.start(); sockets[0].message(welcome('initial')); await Promise.resolve(); await Promise.resolve();
    expect(subscribed).toEqual(['initial']); expect(states.at(-1)).toBe('LIVE_CONNECTED');
    sockets[0].message({ metadata: { message_type: 'session_reconnect' }, payload: { session: { reconnect_url: 'wss://eventsub.wss.twitch.tv/ws?reconnect=1' } } });
    expect(sockets).toHaveLength(2); expect(sockets[0].closed).toBe(false);
    sockets[0].message(chat('before-handoff'));
    expect(received).toEqual(['before-handoff']);
    sockets[1].message(welcome('handoff')); await Promise.resolve();
    expect(sockets[0].closed).toBe(true); expect(subscribed).toEqual(['initial']);
    sockets[1].message(chat('after-handoff')); expect(received).toEqual(['before-handoff', 'after-handoff']);
    client.stop();
  });
  it('resubscribes on unexpected loss and stops retrying after revocation', async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [], subscribed: string[] = [], states: string[] = [];
    const client = new EventSubClient({ broadcasterId: 'channel', socketFactory: () => { const s = new FakeSocket(); sockets.push(s); return s as unknown as SocketLike; },
      subscribe: async id => { subscribed.push(id); }, onChat: () => {}, onStatus: state => states.push(state) });
    client.start(); sockets[0].message(welcome('first')); await Promise.resolve();
    sockets[0].close(); expect(states.at(-1)).toBe('RECONNECTING');
    await vi.advanceTimersByTimeAsync(1000); expect(sockets).toHaveLength(2);
    sockets[1].message(welcome('second')); await Promise.resolve();
    expect(subscribed).toEqual(['first', 'second']);
    sockets[1].message({ metadata: { message_type: 'revocation' }, payload: { subscription: { status: 'authorization_revoked' } } });
    await vi.advanceTimersByTimeAsync(35_000);
    expect(sockets).toHaveLength(2); expect(states.at(-1)).toBe('ERROR');
    client.stop();
  });
  it('does not retry a permanent subscription authorization failure', async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [], states: string[] = [];
    const client = new EventSubClient({ broadcasterId: 'channel', socketFactory: () => { const s = new FakeSocket(); sockets.push(s); return s as unknown as SocketLike; },
      subscribe: async () => { throw new EventSubFatalError('Twitch API request failed (403)'); },
      onChat: () => {}, onStatus: state => states.push(state) });
    client.start(); sockets[0].message(welcome('first')); await Promise.resolve(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(35_000);
    expect(sockets).toHaveLength(1); expect(states.at(-1)).toBe('ERROR');
    client.stop();
  });
});

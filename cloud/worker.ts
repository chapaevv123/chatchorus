import { MusicState, type ChatEvent, type Mood } from '../src/music';

declare const WebSocketPair: { new(): { 0: WebSocket; 1: WebSocket } };

type Env = {
  USER_ROOM: { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
  PUBLIC_ORIGIN: string;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  TWITCH_EVENTSUB_SECRET: string;
  SESSION_SIGNING_KEY: string;
};
type Room = {
  uid: string; login: string; sessionHash: string; obsKey: string;
  accessToken: string; refreshToken: string; subscriptionId: string;
  verifiedId: string;
  connection: string; error: string; liveSeen: boolean; volume: number;
  muted: boolean; stopped: boolean; moodOverride: Mood | null;
  recent: Array<{ viewer: string; text: string; source: 'LIVE'; at: number }>;
};
const empty = (): Room => ({ uid: '', login: '', sessionHash: '', obsKey: '', accessToken: '', refreshToken: '', subscriptionId: '', verifiedId: '', connection: 'DISCONNECTED', error: '', liveSeen: false, volume: .58, muted: false, stopped: false, moodOverride: null, recent: [] });
const json = (body: unknown, status = 200, extra?: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
const random = (n = 32) => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const bytes = (value: string) => new TextEncoder().encode(value);
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
const sha = async (value: string) => hex(await crypto.subtle.digest('SHA-256', bytes(value)));
const hmac = async (key: string, value: string) => hex(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', bytes(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), bytes(value)));
function equal(a: string, b: string): boolean { if (a.length !== b.length) return false; let value = 0; for (let i = 0; i < a.length; i++) value |= a.charCodeAt(i) ^ b.charCodeAt(i); return value === 0; }
const cookie = (name: string, value: string, age: number) => `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const cookies = (request: Request) => Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(x => x.trim().split('=', 2)).filter(x => x.length === 2));
const safe = (value: unknown, limit = 240) => String(value ?? '').slice(0, limit).replace(/[\u0000-\u001f]/g, ' ');
const origin = (env: Env) => env.PUBLIC_ORIGIN.replace(/\/$/, '');
const redirectUri = (env: Env) => `${origin(env)}/oauth/callback`;
const stubFor = (env: Env, uid: string) => env.USER_ROOM.get(env.USER_ROOM.idFromName(uid));
async function room(env: Env, uid: string, path: string, data?: unknown): Promise<Response> {
  return stubFor(env, uid).fetch(new Request(`https://room.internal${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) }));
}
async function sign(env: Env, value: string): Promise<string> { return `${value}.${await hmac(env.SESSION_SIGNING_KEY, value)}`; }
async function verify(env: Env, signed: string, parts: number): Promise<string[] | null> {
  const fields = signed.split('.');
  if (fields.length !== parts + 1 || !equal(fields.at(-1) || '', await hmac(env.SESSION_SIGNING_KEY, fields.slice(0, -1).join('.')))) return null;
  return fields.slice(0, -1);
}
async function authenticate(request: Request, env: Env): Promise<{ uid: string; sid: string } | null> {
  const fields = await verify(env, cookies(request).__Host_cc_session || '', 3);
  if (!fields || !/^\d+$/.test(fields[0]) || !/^\d+$/.test(fields[2]) || Number(fields[2]) < Date.now()) return null;
  const response = await room(env, fields[0], '/session', { sid: fields[1] });
  return response.ok ? { uid: fields[0], sid: fields[1] } : null;
}
async function twitchToken(env: Env, grant: URLSearchParams): Promise<any> {
  const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: grant });
  if (!response.ok) throw new Error(`Twitch token request failed (${response.status})`);
  return response.json();
}
async function appToken(env: Env): Promise<string> {
  const data = await twitchToken(env, new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' }));
  if (typeof data.access_token !== 'string') throw new Error('Twitch app token missing');
  return data.access_token;
}
async function removeSubscription(env: Env, id: string): Promise<void> {
  if (!id) return;
  const token = await appToken(env);
  const response = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` } });
  if (!response.ok && response.status !== 404) throw new Error(`Twitch subscription deletion failed (${response.status})`);
}
async function subscribe(env: Env, uid: string): Promise<string> {
  const token = await appToken(env);
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', { method: 'POST', headers: { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'channel.chat.message', version: '1', condition: { broadcaster_user_id: uid, user_id: uid }, transport: { method: 'webhook', callback: `${origin(env)}/api/eventsub`, secret: env.TWITCH_EVENTSUB_SECRET } }) });
  if (!response.ok) throw new Error(`Twitch EventSub subscription failed (${response.status})`);
  const result: any = await response.json();
  const id = result.data?.[0]?.id;
  if (typeof id !== 'string' || !id) throw new Error('Twitch subscription ID missing');
  return id;
}
async function webhook(request: Request, env: Env): Promise<Response> {
  const messageId = request.headers.get('Twitch-Eventsub-Message-Id') || '';
  const timestamp = request.headers.get('Twitch-Eventsub-Message-Timestamp') || '';
  const signature = request.headers.get('Twitch-Eventsub-Message-Signature') || '';
  const sentAt = Date.parse(timestamp);
  if (!messageId || !timestamp || !signature || !Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > 600_000) return json({ error: 'Invalid webhook metadata' }, 403);
  const raw = await request.text();
  if (raw.length > 64_000) return json({ error: 'Webhook too large' }, 413);
  const expected = `sha256=${await hmac(env.TWITCH_EVENTSUB_SECRET, messageId + timestamp + raw)}`;
  if (!equal(signature, expected)) return json({ error: 'Invalid webhook signature' }, 403);
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid webhook body' }, 400); }
  const uid = body?.subscription?.condition?.broadcaster_user_id;
  if (!/^\d+$/.test(String(uid || '')) || body?.subscription?.condition?.user_id !== uid || body?.subscription?.type !== 'channel.chat.message') return json({ error: 'Invalid subscription' }, 400);
  const type = request.headers.get('Twitch-Eventsub-Message-Type');
  if (type === 'webhook_callback_verification') {
    await room(env, uid, '/challenge', { subscriptionId: body.subscription?.id });
    return new Response(String(body.challenge || ''), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  if (type === 'notification' || type === 'revocation') return room(env, uid, '/event', { type, id: messageId, subscription: body.subscription, event: body.event });
  return json({ error: 'Unknown webhook type' }, 400);
}
function safeMutation(request: Request, env: Env): boolean {
  return request.headers.get('Origin') === origin(env) && request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json') === true;
}
async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === '/api/eventsub' && request.method === 'POST') return webhook(request, env);
  if (path === '/api/health' && request.method === 'GET') return json({ service: 'chatchorus', state: env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET && env.TWITCH_EVENTSUB_SECRET && env.SESSION_SIGNING_KEY ? 'CONFIGURED' : 'SETUP_REQUIRED' });
  if (path === '/api/connect' && request.method === 'GET') {
    if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET || !env.TWITCH_EVENTSUB_SECRET || !env.SESSION_SIGNING_KEY) return json({ error: 'Twitch connection is being configured' }, 503);
    const state = random(24), expires = Date.now() + 300_000;
    const stateCookie = await sign(env, `${state}.${expires}`);
    const target = new URL('https://id.twitch.tv/oauth2/authorize');
    target.search = new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, redirect_uri: redirectUri(env), response_type: 'code', scope: 'user:read:chat user:bot channel:bot', state }).toString();
    return new Response(null, { status: 302, headers: { Location: target.toString(), 'Set-Cookie': cookie('__Host_cc_oauth', stateCookie, 300), 'Cache-Control': 'no-store' } });
  }
  if (path === '/oauth/callback' && request.method === 'GET') {
    const fields = await verify(env, cookies(request).__Host_cc_oauth || '', 2);
    const state = url.searchParams.get('state') || '';
    if (!fields || !equal(fields[0], state) || !/^\d+$/.test(fields[1]) || Number(fields[1]) < Date.now()) return json({ error: 'Invalid OAuth state' }, 403, { 'Set-Cookie': cookie('__Host_cc_oauth', '', 0) });
    const code = url.searchParams.get('code');
    if (!code) return json({ error: safe(url.searchParams.get('error') || 'Twitch authorization was cancelled') }, 400, { 'Set-Cookie': cookie('__Host_cc_oauth', '', 0) });
    try {
      const token = await twitchToken(env, new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, code, grant_type: 'authorization_code', redirect_uri: redirectUri(env) }));
      if (!token.access_token || !token.refresh_token) throw new Error('Twitch user token missing');
      const validation = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `Bearer ${token.access_token}` } });
      if (!validation.ok) throw new Error(`Twitch validation failed (${validation.status})`);
      const identity: any = await validation.json();
      const required = ['user:read:chat', 'user:bot', 'channel:bot'];
      if (identity.client_id !== env.TWITCH_CLIENT_ID || !/^\d+$/.test(String(identity.user_id || '')) || !required.every(scope => identity.scopes?.includes(scope))) throw new Error('Twitch identity or required chat scopes mismatch');
      const uid = String(identity.user_id), sid = random(32), obsKey = random(32);
      const previousResponse = await room(env, uid, '/login', { uid, login: safe(identity.login, 40), sidHash: await sha(sid), obsKey, accessToken: token.access_token, refreshToken: token.refresh_token });
      if (!previousResponse.ok) throw new Error('Could not persist Twitch session');
      const previous: any = await previousResponse.json();
      try {
        if (previous.subscriptionId) await removeSubscription(env, previous.subscriptionId);
        const subscriptionId = await subscribe(env, uid); await room(env, uid, '/subscription', { subscriptionId });
      }
      catch (error) { await room(env, uid, '/error', { error: error instanceof Error ? error.message : 'Subscription failed' }); }
      const signed = await sign(env, `${uid}.${sid}.${Date.now() + 30 * 86400_000}`);
      const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
      headers.append('Set-Cookie', cookie('__Host_cc_oauth', '', 0));
      headers.append('Set-Cookie', cookie('__Host_cc_session', signed, 30 * 86400));
      return new Response(null, { status: 302, headers });
    } catch (error) { return json({ error: error instanceof Error ? error.message : 'Twitch connection failed' }, 502, { 'Set-Cookie': cookie('__Host_cc_oauth', '', 0) }); }
  }
  if (path === '/api/status' && request.method === 'GET') {
    const auth = await authenticate(request, env);
    if (!auth) return json({ authorized: false, mode: 'DEMO', connection: 'DISCONNECTED' });
    return room(env, auth.uid, '/status');
  }
  if (path === '/api/ws' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    if (request.headers.get('Origin') !== origin(env)) return json({ error: 'Invalid WebSocket origin' }, 403);
    const obs = url.searchParams.get('obs') || '';
    let uid: string, key: string, role: string;
    if (obs) { const match = /^(\d+)\.([A-Za-z0-9_-]{40,})$/.exec(obs); if (!match) return json({ error: 'Invalid OBS key' }, 403); uid = match[1]; key = match[2]; role = 'obs'; }
    else { const auth = await authenticate(request, env); if (!auth) return json({ error: 'Not signed in' }, 401); uid = auth.uid; key = auth.sid; role = 'session'; }
    return stubFor(env, uid).fetch(new Request(`https://room.internal/ws?role=${role}&key=${encodeURIComponent(key)}`, { headers: { Upgrade: 'websocket' } }));
  }
  const auth = await authenticate(request, env);
  if (!auth) return json({ error: 'Not signed in' }, 401);
  if (path === '/api/obs' && request.method === 'GET') return room(env, auth.uid, '/obs');
  if (!path.startsWith('/api/') || request.method !== 'POST' || !safeMutation(request, env)) return json({ error: 'Forbidden' }, 403);
  if (path === '/api/logout') {
    const meta: any = await (await room(env, auth.uid, '/revoke-data')).json();
    try {
      if (meta.subscriptionId) await removeSubscription(env, meta.subscriptionId);
      if (meta.accessToken) {
        const revoked = await fetch('https://id.twitch.tv/oauth2/revoke', { method: 'POST', body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, token: meta.accessToken }) });
        if (!revoked.ok && revoked.status !== 401) throw new Error(`Twitch revocation failed (${revoked.status})`);
      }
    } catch { return json({ error: 'Twitch disconnect could not finish; retry sign out' }, 502); }
    await room(env, auth.uid, '/disconnect');
    return json({ authorized: false }, 200, { 'Set-Cookie': cookie('__Host_cc_session', '', 0) });
  }
  if (path === '/api/reconnect') {
    const meta: any = await (await room(env, auth.uid, '/revoke-data')).json();
    try { if (meta.subscriptionId) await removeSubscription(env, meta.subscriptionId); const id = await subscribe(env, auth.uid); return room(env, auth.uid, '/subscription', { subscriptionId: id }); }
    catch (error) { return json({ error: error instanceof Error ? error.message : 'Reconnect failed' }, 502); }
  }
  if (path === '/api/rotate-obs') return room(env, auth.uid, '/rotate-obs', { key: random(32) });
  if (['/api/mood', '/api/volume', '/api/stop', '/api/resume'].includes(path)) {
    let body: any = {};
    try { const raw = await request.text(); if (raw.length > 2048) return json({ error: 'Request too large' }, 413); body = raw ? JSON.parse(raw) : {}; }
    catch { return json({ error: 'Invalid JSON' }, 400); }
    return room(env, auth.uid, path.slice(4), body);
  }
  return json({ error: 'Not found' }, 404);
}

export default { fetch(request: Request, env: Env) { return handle(request, env).catch(() => json({ error: 'Service temporarily unavailable' }, 503)); } };

export class UserRoom {
  private music = new MusicState();
  constructor(private ctx: any, private env: Env) {}
  private async read(): Promise<Room> { return (await this.ctx.storage.get('room')) || empty(); }
  private async write(value: Room): Promise<void> { await this.ctx.storage.put('room', value); }
  private publicStatus(value: Room) { return { authorized: Boolean(value.sessionHash), uid: value.uid, login: value.login, mode: value.sessionHash ? 'LIVE' : 'DEMO', connection: value.connection, error: value.error, liveSeen: value.liveSeen, mood: this.music.mood, energy: this.music.energy, tempo: this.music.tempo, volume: value.volume, muted: value.muted, stopped: value.stopped, recent: value.recent }; }
  private broadcast(value: unknown): void { const payload = JSON.stringify(value); for (const ws of this.ctx.getWebSockets()) { try { ws.send(payload); } catch { /* closed browser */ } } }
  private status(value: Room): void { this.broadcast({ type: 'status', data: this.publicStatus(value) }); }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url), path = url.pathname;
    const value = await this.read();
    if (path === '/session') { const data: any = await request.json(); return equal(value.sessionHash, await sha(String(data.sid || ''))) && value.sessionHash ? json({ valid: true }) : json({ error: 'Session expired' }, 401); }
    if (path === '/status') return json(this.publicStatus(value));
    if (path === '/obs') return json({ url: `${this.env.PUBLIC_ORIGIN}/#obs=${value.uid}.${value.obsKey}` });
    if (path === '/revoke-data') return json({ subscriptionId: value.subscriptionId, accessToken: value.accessToken });
    if (path === '/ws') {
      const role = url.searchParams.get('role'), key = url.searchParams.get('key') || '';
      const allowed = role === 'obs' ? Boolean(value.obsKey && equal(key, value.obsKey)) : Boolean(value.sessionHash && equal(await sha(key), value.sessionHash));
      if (!allowed) return json({ error: 'Invalid browser session or OBS key' }, 403);
      const pair = new WebSocketPair(), client = pair[0], server = pair[1];
      this.ctx.acceptWebSocket(server);
      (server as any).serializeAttachment({ role });
      server.send(JSON.stringify({ type: 'status', data: this.publicStatus(value) }));
      return new Response(null, { status: 101, webSocket: client } as any);
    }
    let input: any = {};
    if (request.method === 'POST') { try { input = await request.json(); } catch { return json({ error: 'Invalid body' }, 400); } }
    if (path === '/login') {
      const old = value.subscriptionId;
      const next = { ...empty(), uid: input.uid, login: input.login, sessionHash: input.sidHash, obsKey: input.obsKey, accessToken: input.accessToken, refreshToken: input.refreshToken, connection: 'SUBSCRIPTION_PENDING' };
      await this.write(next); await this.ctx.storage.setAlarm(Date.now() + 3600_000); this.status(next);
      return json({ subscriptionId: old });
    }
    if (path === '/subscription') { value.subscriptionId = String(input.subscriptionId || ''); value.connection = value.verifiedId === value.subscriptionId ? 'LIVE_CONNECTED' : 'SUBSCRIPTION_PENDING'; value.error = ''; await this.write(value); this.status(value); return json(this.publicStatus(value)); }
    if (path === '/challenge') { value.verifiedId = String(input.subscriptionId || ''); if (value.subscriptionId && value.subscriptionId === value.verifiedId) value.connection = 'LIVE_CONNECTED'; await this.write(value); this.status(value); return json({ accepted: true }); }
    if (path === '/error') { value.connection = 'ERROR'; value.error = safe(input.error, 160); await this.write(value); this.status(value); return json(this.publicStatus(value)); }
    if (path === '/disconnect') { const next = empty(); await this.write(next); await this.ctx.storage.deleteAlarm(); for (const ws of this.ctx.getWebSockets()) { try { ws.close(1008, 'Signed out'); } catch {} } return json({ authorized: false }); }
    if (path === '/rotate-obs') { value.obsKey = String(input.key || ''); await this.write(value); for (const ws of this.ctx.getWebSockets()) if (ws.deserializeAttachment()?.role === 'obs') try { ws.close(1008, 'OBS key rotated'); } catch {} return json({ url: `${this.env.PUBLIC_ORIGIN}/#obs=${value.uid}.${value.obsKey}` }); }
    if (path === '/mood') { const moods = ['CALM', 'HAPPY', 'HYPE', 'MYSTERY', 'TENSE']; if (input.mood !== null && !moods.includes(input.mood)) return json({ error: 'Unknown mood' }, 400); value.moodOverride = input.mood; this.music.setOverride(value.moodOverride); await this.write(value); this.status(value); return json(this.publicStatus(value)); }
    if (path === '/volume') { if (typeof input.volume !== 'number' || input.volume < 0 || input.volume > 1 || typeof input.muted !== 'boolean') return json({ error: 'Invalid volume' }, 400); value.volume = input.volume; value.muted = input.muted; await this.write(value); this.status(value); return json(this.publicStatus(value)); }
    if (path === '/stop') { value.stopped = true; await this.write(value); this.broadcast({ type: 'stop' }); this.status(value); return json(this.publicStatus(value)); }
    if (path === '/resume') { value.stopped = false; await this.write(value); this.status(value); return json(this.publicStatus(value)); }
    if (path === '/event') {
      if (!value.sessionHash || !value.subscriptionId || input.subscription?.id !== value.subscriptionId || input.subscription?.condition?.broadcaster_user_id !== value.uid || input.subscription?.condition?.user_id !== value.uid) return json({ ignored: true });
      if (input.type === 'revocation') { value.connection = 'ERROR'; value.error = 'Twitch revoked chat access'; value.subscriptionId = ''; await this.write(value); this.status(value); return json({ accepted: true }); }
      const event = input.event;
      if (typeof event?.message_id !== 'string' || typeof event?.chatter_user_id !== 'string' || typeof event?.message?.text !== 'string' || event?.broadcaster_user_id !== value.uid) return json({ ignored: true });
      const seenKey = `seen:${safe(input.id, 120)}`;
      if (await this.ctx.storage.get(seenKey)) return json({ duplicate: true });
      await this.ctx.storage.put(seenKey, Date.now());
      const chat: ChatEvent = { id: safe(event.message_id, 100), viewerId: safe(event.chatter_user_id, 100), viewer: safe(event.chatter_user_name || event.chatter_user_login || 'Viewer', 40), text: safe(event.message.text), at: Date.now(), source: 'LIVE' };
      this.music.setOverride(value.moodOverride);
      const note = this.music.accept(chat);
      value.connection = 'LIVE_CONNECTED'; value.liveSeen = true;
      if (note && !value.stopped) { value.recent = [{ viewer: chat.viewer, text: chat.text, source: 'LIVE' as const, at: chat.at }, ...value.recent].slice(0, 12); this.broadcast({ type: 'note', data: note }); }
      await this.write(value); this.status(value); return json({ accepted: true });
    }
    return json({ error: 'Not found' }, 404);
  }
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void { if (typeof message === 'string' && message === 'ping') ws.send('pong'); }
  async alarm(): Promise<void> {
    const value = await this.read(); if (!value.accessToken || !value.sessionHash) return;
    try {
      let response = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `Bearer ${value.accessToken}` } });
      if (response.status === 401 && value.refreshToken) {
        const refreshed = await twitchToken(this.env, new URLSearchParams({ client_id: this.env.TWITCH_CLIENT_ID, client_secret: this.env.TWITCH_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: value.refreshToken }));
        if (!refreshed.access_token || !refreshed.refresh_token) throw new Error('Token refresh incomplete');
        value.accessToken = refreshed.access_token; value.refreshToken = refreshed.refresh_token;
        response = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `Bearer ${value.accessToken}` } });
      }
      if (!response.ok) throw new Error('Twitch authorization expired');
      const identity: any = await response.json();
      if (identity.user_id !== value.uid || identity.client_id !== this.env.TWITCH_CLIENT_ID || !['user:read:chat', 'user:bot', 'channel:bot'].every(scope => identity.scopes?.includes(scope))) throw new Error('Twitch identity or scopes changed');
      await this.write(value);
    } catch { value.connection = 'ERROR'; value.error = 'Twitch authorization must be renewed'; await this.write(value); this.status(value); }
    const stale = await this.ctx.storage.list({ prefix: 'seen:' });
    for (const [key, at] of stale) if (Date.now() - Number(at) > 3600_000) await this.ctx.storage.delete(key);
    await this.ctx.storage.setAlarm(Date.now() + 3600_000);
  }
}

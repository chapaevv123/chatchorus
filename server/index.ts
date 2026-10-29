import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import WebSocket, { WebSocketServer } from 'ws';
import { demoEvents, SCENARIOS, type Scenario } from '../src/demo.ts';
import { MusicState, type ChatEvent, type Mood } from '../src/music.ts';
import { EventSubClient, EventSubFatalError, type ConnectionState } from './eventsub.ts';
import { authorizationUrl, codeExchangeBody, matchesState, validatedUserId } from './oauth.ts';

const port = Number(process.env.PORT || 8787);
const clientId = process.env.TWITCH_CLIENT_ID || '';
const clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
const channelLogin = process.env.TWITCH_CHANNEL_LOGIN || '';
const redirectUri = `http://localhost:${port}/oauth/callback`;
const music = new MusicState();
const clients = new Set<WebSocket>();
let accessToken = '', refreshToken = '', userId = '', broadcasterId = '';
let refreshInFlight: Promise<void> | null = null;
let authEpoch = 0;
let state = '', stateExpires = 0;
let twitch: EventSubClient | null = null;
let validationTimer: ReturnType<typeof setInterval> | null = null;
let liveSeen = false;
let mode: 'DEMO' | 'LIVE' = 'DEMO';
let connection = 'DISCONNECTED';
let error = '';
let scenario: Scenario = 'quiet';
let demoTimers: ReturnType<typeof setTimeout>[] = [];
let recent: Array<{ viewer: string; text: string; source: string; at: number }> = [];

const safeString = (value: unknown, max = 200) => String(value ?? '').slice(0, max).replace(/[\u0000-\u001f]/g, ' ');
const status = () => ({ mode, connection, liveSeen, error, scenario, mood: music.mood, energy: music.energy, tempo: music.tempo, recent, configured: Boolean(clientId && clientSecret && channelLogin) });
function broadcast(value: unknown): void {
  const payload = JSON.stringify(value);
  for (const ws of clients) if (ws.readyState === WebSocket.OPEN) ws.send(payload);
}
function update(): void { broadcast({ type: 'status', data: status() }); }
function setConnection(value: string, detail = ''): void { connection = value; error = safeString(detail, 300); update(); }
function ingest(event: ChatEvent): void {
  if (event.source !== mode) return;
  const note = music.accept(event);
  if (!note) return;
  if (event.source === 'LIVE') liveSeen = true;
  recent = [{ viewer: event.viewer, text: event.text, source: event.source, at: event.at }, ...recent].slice(0, 12);
  broadcast({ type: 'note', data: note }); update();
}
function stopDemo(): void { for (const timer of demoTimers) clearTimeout(timer); demoTimers = []; }
function demo(next: Scenario): void {
  stopDemo(); scenario = next; mode = 'DEMO'; music.reset(); recent = []; update();
  const start = Date.now();
  for (const event of demoEvents(next, start)) demoTimers.push(setTimeout(() => ingest(event), Math.max(0, event.at - start)));
}
function closeTwitch(): void { twitch?.stop(); twitch = null; if (validationTimer) clearInterval(validationTimer); validationTimer = null; }
function disconnect(): void { authEpoch++; state = ''; stateExpires = 0; closeTwitch(); stopDemo(); accessToken = refreshToken = ''; userId = broadcasterId = ''; liveSeen = false; mode = 'DEMO'; scenario = 'quiet'; music.reset(); recent = []; setConnection('DISCONNECTED'); }
function invalidateSession(detail: string): void { disconnect(); setConnection('ERROR', detail); }
async function validateToken(): Promise<string> {
  if (!accessToken) throw new Error('No Twitch access token');
  const request = () => fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `Bearer ${accessToken}` } });
  let response = await request();
  if (response.status === 401) { await refreshAccessToken(); response = await request(); }
  if (!response.ok) throw new Error(`Twitch token validation failed (${response.status})`);
  const data = await response.json() as { client_id?: string; user_id?: string; scopes?: string[]; expires_in?: number };
  const validatedId = validatedUserId(data, clientId);
  return validatedId;
}
async function refreshAccessToken(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const epoch = authEpoch;
    if (!refreshToken) throw new Error('No Twitch refresh token');
    const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken });
    const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: params });
    if (!response.ok) throw new EventSubFatalError(`Twitch token refresh failed (${response.status})`);
    const token = await response.json() as { access_token: string; refresh_token: string };
    if (!token.access_token || !token.refresh_token) throw new Error('Twitch token refresh response incomplete');
    if (epoch !== authEpoch) throw new EventSubFatalError('Twitch authorization changed during refresh');
    accessToken = token.access_token; refreshToken = token.refresh_token;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
function startValidation(): void {
  if (validationTimer) clearInterval(validationTimer);
  validationTimer = setInterval(() => { void validateToken().catch(() => invalidateSession('Twitch authorization expired or was revoked')); }, 60 * 60 * 1000);
}
async function twitchFetch(url: string, init: RequestInit = {}): Promise<any> {
  const request = () => fetch(url, { ...init, headers: { 'Client-Id': clientId, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init.headers } });
  let response = await request();
  if (response.status === 401) { await refreshAccessToken(); response = await request(); }
  if (!response.ok) {
    const message = `Twitch API request failed (${response.status})`;
    if (response.status === 401 || response.status === 403) throw new EventSubFatalError(message);
    throw new Error(message);
  }
  return response.json();
}
function startTwitch(): void {
  closeTwitch();
  twitch = new EventSubClient({ broadcasterId,
    subscribe: async sessionId => { await twitchFetch('https://api.twitch.tv/helix/eventsub/subscriptions', { method: 'POST', body: JSON.stringify({ type: 'channel.chat.message', version: '1', condition: { broadcaster_user_id: broadcasterId, user_id: userId }, transport: { method: 'websocket', session_id: sessionId } }) }); },
    onChat: message => ingest({ id: message.id, viewerId: message.viewerId, viewer: message.viewer, text: message.text, at: Date.now(), source: 'LIVE' }),
    onStatus: (value: ConnectionState, detail) => setConnection(value, detail) });
  twitch.start(); startValidation();
}
function send(res: ServerResponse, code: number, data: unknown): void {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage): Promise<any> {
  let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 10_000) throw new Error('Request too large'); }
  return text ? JSON.parse(text) : {};
}
function localRequest(req: IncomingMessage): boolean {
  const host = req.headers.host || '';
  const origin = req.headers.origin;
  const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`, '127.0.0.1:5173', 'localhost:5173']);
  if (!allowed.has(host)) return false;
  if (!origin) return true;
  try { const parsed = new URL(origin); return parsed.protocol === 'http:' && allowed.has(parsed.host); }
  catch { return false; }
}
const server = createServer(async (req, res) => {
  if (!localRequest(req)) return send(res, 403, { error: 'Local requests only' });
  const path = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  try {
    if (path.pathname === '/api/status' && req.method === 'GET') return send(res, 200, status());
    if (path.pathname === '/api/connect' && req.method === 'POST') {
      if (!clientId || !clientSecret || !channelLogin) return send(res, 400, { error: 'Configure TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET and TWITCH_CHANNEL_LOGIN' });
      state = randomBytes(24).toString('base64url'); stateExpires = Date.now() + 300_000;
      return send(res, 200, { url: authorizationUrl(clientId, redirectUri, state) });
    }
    if (path.pathname === '/oauth/callback' && req.method === 'GET') {
      const incoming = path.searchParams.get('state') || '';
      const valid = matchesState(state, incoming, stateExpires, Date.now());
      if (!valid) return send(res, 400, { error: 'Invalid OAuth state' });
      state = ''; stateExpires = 0;
      const code = path.searchParams.get('code'); if (!code) return send(res, 400, { error: safeString(path.searchParams.get('error') || 'Missing code') });
      const epoch = authEpoch;
      const params = codeExchangeBody(clientId, clientSecret, redirectUri, code);
      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: params });
      if (!tokenResponse.ok) throw new Error(`OAuth token exchange failed (${tokenResponse.status}). Check app credentials and redirect URI.`);
      const token = await tokenResponse.json() as { access_token: string; refresh_token: string; expires_in: number };
      if (!token.access_token || !token.refresh_token) throw new Error('Twitch token response incomplete');
      if (epoch !== authEpoch) throw new Error('Twitch authorization was cancelled');
      accessToken = token.access_token; refreshToken = token.refresh_token;
      userId = await validateToken();
      const channel = await twitchFetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(channelLogin)}`); broadcasterId = channel.data?.[0]?.id;
      if (epoch !== authEpoch) throw new Error('Twitch authorization was cancelled');
      if (!userId || !broadcasterId) throw new Error('Twitch user or channel not found');
      stopDemo(); mode = 'LIVE'; music.reset(); liveSeen = false; startTwitch();
      res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store' }); return res.end();
    }
    if (path.pathname === '/api/disconnect' && req.method === 'POST') { disconnect(); return send(res, 200, status()); }
    if (path.pathname === '/api/demo' && req.method === 'POST') {
      const input = await body(req); if (!SCENARIOS.includes(input.scenario)) return send(res, 400, { error: 'Unknown scenario' });
      disconnect(); demo(input.scenario); return send(res, 200, status());
    }
    if (path.pathname === '/api/mood' && req.method === 'POST') {
      const input = await body(req); const moods: Mood[] = ['CALM', 'HAPPY', 'HYPE', 'MYSTERY', 'TENSE'];
      if (input.mood !== null && !moods.includes(input.mood)) return send(res, 400, { error: 'Unknown mood' });
      music.setOverride(input.mood); update(); return send(res, 200, status());
    }
    if (path.pathname === '/api/stop' && req.method === 'POST') { stopDemo(); music.reset(); broadcast({ type: 'stop' }); update(); return send(res, 200, status()); }
    if (req.method === 'GET' && !path.pathname.startsWith('/api/') && !path.pathname.startsWith('/oauth/')) {
      const file = path.pathname === '/' || path.pathname === '/overlay' ? 'index.html' : path.pathname.slice(1);
      const root = resolve('dist'); const target = resolve(join(root, file));
      if (!target.startsWith(root + '\\') && target !== root) return send(res, 403, { error: 'Forbidden' });
      const bytes = await readFile(target).catch(() => null);
      if (!bytes) return send(res, 404, { error: 'Not found' });
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); return res.end(bytes);
    }
    return send(res, 404, { error: 'Not found' });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Internal error';
    if (path.pathname === '/oauth/callback') invalidateSession(message);
    else setConnection('ERROR', message);
    return send(res, 500, { error: message });
  }
});
const wsServer = new WebSocketServer({ server, path: '/ws' });
wsServer.on('connection', (ws, req) => { if (!localRequest(req)) { ws.close(1008); return; } clients.add(ws); ws.send(JSON.stringify({ type: 'status', data: status() })); ws.on('close', () => clients.delete(ws)); });
server.listen(port, '127.0.0.1', () => console.log(`ChatChorus local controller: http://127.0.0.1:${port}`));

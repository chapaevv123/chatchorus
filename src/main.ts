import './style.css';
import { AudioController } from './audio';
import type { Mood, NoteEvent } from './music';
import { SCENARIOS, type Scenario } from './demo';

type Status = { mode: 'LIVE' | 'DEMO'; connection: string; liveSeen: boolean; error: string; scenario: Scenario; mood: Mood; energy: number; tempo: number; configured: boolean; recent: Array<{ viewer: string; text: string; source: string; at: number }> };
const audio = new AudioController();
const overlay = location.pathname === '/overlay';
const app = document.querySelector<HTMLDivElement>('#app')!;
let status: Status = { mode: 'DEMO', connection: 'DISCONNECTED', liveSeen: false, error: '', scenario: 'quiet', mood: 'CALM', energy: 0.18, tempo: 76, configured: false, recent: [] };
let socket: WebSocket | null = null;
let retry = 0;
let stopped = false;
const particles: Array<{ x: number; y: number; r: number; speed: number; life: number; hue: number }> = [];

app.innerHTML = `<main class="shell ${overlay ? 'overlay' : ''}">
  <canvas id="scene" aria-hidden="true"></canvas>
  <div class="wash"></div>
  <header class="topbar"><div class="brand"><span class="brand-mark">✳</span><span>CHAT<span class="brand-light">CHORUS</span></span></div><div class="top-right"><span id="mode" class="pill">DEMO</span><span id="connection" class="connection">OFFLINE</span></div></header>
  <section class="hero"><div class="eyebrow">THE STREAM BECOMES AN ORCHESTRA</div><h1>Every voice<br><em>changes the music.</em></h1><p id="subtitle">A living score shaped by your chat. Start a demo or connect to Twitch.</p><div class="hero-actions"><button id="audio" class="primary">▶ Enable audio</button>${overlay ? '' : '<button id="connect" class="secondary">Connect Twitch</button>'}</div><div id="audio-status" class="micro">Audio locked · click to start</div></section>
  <section class="stage" aria-label="Live music visualization"><div class="stage-head"><span>NOW PLAYING</span><span id="stage-state">CALM / 76 BPM</span></div><div id="rings" class="rings"><div class="ring one"></div><div class="ring two"></div><div class="ring three"></div><div class="core">✳</div></div><div class="stage-foot"><div><small>MOOD</small><strong id="mood-label">CALM</strong></div><div><small>ENERGY</small><strong id="energy-label">18%</strong></div><div><small>VOICES</small><strong id="voices-label">0</strong></div></div></section>
  ${overlay ? '<div class="overlay-note">CHAT CHORUS · <span id="overlay-live">DEMO</span></div>' : `<section class="panel"><div class="panel-title"><h2>Conductor desk</h2><span>LOCAL CONTROL</span></div><div class="controls"><label>Master volume <input id="volume" type="range" min="0" max="100" value="58" /></label><button id="mute" class="small">Mute</button><label>Mood <select id="mood-select"><option value="">Auto mood</option><option>CALM</option><option>HAPPY</option><option>HYPE</option><option>MYSTERY</option><option>TENSE</option></select></label><button id="stop" class="danger">■ Emergency stop</button></div><div class="demo-heading"><h3>Demo scenes</h3><span>SIMULATED CHAT · REPEATABLE</span></div><div id="scenarios" class="scenarios"></div><div class="activity"><h3>Recent voices</h3><div id="events" class="events">Waiting for chat…</div></div><div id="error" role="alert" class="error"></div><div class="obs-tip">OBS Browser Source → <code>http://127.0.0.1:8787/overlay</code> · 1920 × 1080 · click Interact → Enable audio.</div></section>`}
</main>`;

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = byId<HTMLCanvasElement>('scene'); const ctx = canvas.getContext('2d')!;
function render(): void {
  byId('mode').textContent = status.mode;
  byId('mode').className = `pill ${status.mode.toLowerCase()}`;
  byId('connection').textContent = status.mode === 'LIVE' ? status.connection.replaceAll('_', ' ') : 'LOCAL DEMO';
  byId('subtitle').textContent = status.mode === 'LIVE'
    ? (status.connection === 'LIVE_CONNECTED' ? (status.liveSeen ? 'Real Twitch chat is shaping this score.' : 'Connected to Twitch. Waiting for the first real chat message.') : `Twitch ${status.connection.toLowerCase().replaceAll('_', ' ')}. Incoming chat is not confirmed.`)
    : 'A living score shaped by simulated chat. Every demo event is labeled.';
  byId('stage-state').textContent = `${status.mood} / ${Math.round(status.tempo)} BPM`;
  byId('mood-label').textContent = status.mood; byId('energy-label').textContent = `${Math.round(status.energy * 100)}%`;
  byId('audio-status').textContent = audio.running ? 'Audio running in this browser' : 'Audio locked · click to start';
  byId('audio').textContent = audio.running ? '✓ Audio running' : '▶ Enable audio';
  const overlayLive = document.getElementById('overlay-live'); if (overlayLive) overlayLive.textContent = status.mode === 'LIVE' && status.connection === 'LIVE_CONNECTED' && status.liveSeen ? 'LIVE TWITCH CHAT' : status.mode === 'LIVE' ? `TWITCH · ${status.connection.replaceAll('_', ' ')}` : `DEMO · ${status.scenario.toUpperCase()}`;
  const connect = document.getElementById('connect') as HTMLButtonElement | null; if (connect) connect.textContent = status.mode === 'LIVE' ? 'Disconnect Twitch' : 'Connect Twitch';
  const error = document.getElementById('error'); if (error) error.textContent = status.error;
  const events = document.getElementById('events'); if (events) {
    events.replaceChildren();
    if (!status.recent.length) events.textContent = 'Waiting for chat…';
    for (const event of status.recent) { const row = document.createElement('div'); row.className = 'event'; const name = document.createElement('strong'); name.textContent = event.viewer; const text = document.createElement('span'); text.textContent = event.text; const source = document.createElement('small'); source.textContent = event.source; row.append(name, text, source); events.append(row); }
  }
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button => button.classList.toggle('selected', button.dataset.scenario === status.scenario && status.mode === 'DEMO'));
}
async function post(path: string, data: object = {}): Promise<any> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || `Request failed: ${response.status}`); return result;
}
async function action(fn: () => Promise<void>): Promise<void> { try { await fn(); } catch (error) { status.error = error instanceof Error ? error.message : 'Action failed'; render(); } }
byId('audio').addEventListener('click', () => action(async () => { await audio.start(); stopped = false; render(); }));
if (!overlay) {
  byId('connect').addEventListener('click', () => action(async () => { if (status.mode === 'LIVE') { status = await post('/api/disconnect'); await audio.stop(); } else { const response = await post('/api/connect'); location.href = response.url; } render(); }));
  byId<HTMLInputElement>('volume').addEventListener('input', event => audio.setVolume(Number((event.target as HTMLInputElement).value) / 100));
  byId('mute').addEventListener('click', () => { const button = byId<HTMLButtonElement>('mute'); const muted = button.textContent === 'Mute'; audio.setMuted(muted); button.textContent = muted ? 'Unmute' : 'Mute'; });
  byId<HTMLSelectElement>('mood-select').addEventListener('change', event => action(async () => { status = await post('/api/mood', { mood: (event.target as HTMLSelectElement).value || null }); render(); }));
  byId('stop').addEventListener('click', () => action(async () => { stopped = true; await audio.emergencyStop(); status = await post('/api/stop'); render(); }));
  const scenarios = byId('scenarios');
  for (const scene of SCENARIOS) { const button = document.createElement('button'); button.dataset.scenario = scene; button.textContent = scene.toUpperCase(); button.addEventListener('click', () => action(async () => { stopped = false; status = await post('/api/demo', { scenario: scene }); render(); })); scenarios.append(button); }
}
function connectSocket(): void {
  socket = new WebSocket(`ws://${location.host}/ws`);
  socket.onopen = () => { retry = 0; };
  socket.onmessage = message => { try { const data = JSON.parse(message.data); if (data.type === 'status') { status = data.data; audio.setMood(status.mood); audio.setTempo(status.tempo); render(); } if (data.type === 'note') { const note = data.data as NoteEvent; if (!stopped) audio.play(note); burst(note); } if (data.type === 'stop') { stopped = true; void audio.emergencyStop().then(render); } } catch { /* ignore malformed local frame */ } };
  socket.onclose = () => { setTimeout(connectSocket, Math.min(10000, 500 * 2 ** Math.min(retry++, 5))); };
}
function burst(note: NoteEvent): void { for (let i = 0; i < 10; i++) particles.push({ x: 0.53, y: 0.48, r: 1 + Math.random() * 3, speed: 0.3 + Math.random() * 0.6, life: 1, hue: 175 + note.voice * 25 }); byId('voices-label').textContent = String(Math.min(99, status.recent.length)); }
function draw(now: number): void {
  const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
  const cx = width * (overlay ? 0.5 : 0.68), cy = height * 0.48;
  for (let line = 0; line < 5; line++) { ctx.beginPath(); for (let x = 0; x <= width; x += 8) { const amp = (16 + line * 9) * (0.4 + status.energy); const y = cy + Math.sin(x / 90 + now / (900 + line * 140) + line) * amp + Math.sin(x / 180 - now / 1500) * 11 + (line - 2) * 34; if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = `hsla(${185 + line * 19}, 85%, 68%, ${0.07 + status.energy * 0.09})`; ctx.lineWidth = 1.5; ctx.stroke(); }
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.y -= p.speed / 120; p.x += Math.sin(now / 420 + i) / 2200; p.life -= 0.006; if (p.life <= 0) { particles.splice(i, 1); continue; } ctx.beginPath(); ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${p.life})`; ctx.fill(); }
  requestAnimationFrame(draw);
}
void fetch('/api/status').then(response => response.json()).then(value => { status = value; render(); }).catch(() => { status.error = 'Local controller unavailable. Start npm run dev.'; render(); });
connectSocket(); render(); requestAnimationFrame(draw);

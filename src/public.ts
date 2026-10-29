import './public.css';
import './premium.css';
import { AudioController } from './audio';
import { MusicState, type Mood, type NoteEvent } from './music';
import { demoEvents, SCENARIOS, type Scenario } from './demo';

type Recent = { viewer: string; text: string; source: 'LIVE'; at: number };
type Scene = 'AURORA' | 'NEON' | 'NOIR';
type Effect = 'CLEAN' | 'WARM' | 'BRIGHT';
type Status = { authorized: boolean; uid?: string; login?: string; mode?: string; connection: string; error?: string; liveSeen?: boolean; mood?: Mood; moodOverride?: Mood | null; energy?: number; tempo?: number; volume?: number; muted?: boolean; stopped?: boolean; scene?: Scene; effect?: Effect; overlayBackground?: 'STAGE' | 'TRANSPARENT'; recent?: Recent[] };
const audio = new AudioController(), demoMusic = new MusicState();
const obsToken = location.hash.startsWith('#obs=') ? location.hash.slice(5) : '';
const overlay = /^\d+\.[A-Za-z0-9_-]{40,}$/.test(obsToken);
if (location.hash.startsWith('#obs=') && !overlay) history.replaceState(null, '', '/');
const root = document.querySelector<HTMLDivElement>('#app')!;
let server: Status = { authorized: false, connection: 'DISCONNECTED' };
let uiMode: 'LIVE' | 'DEMO' = overlay ? 'LIVE' : 'DEMO';
let scenario: Scenario = 'quiet';
let socket: WebSocket | null = null, retry = 0, closedByUser = false;
let demoTimers: ReturnType<typeof setTimeout>[] = [];
let noteCount = 0, error = '', muted = false;
let obsUrl = '';
let demoScene: Scene = 'AURORA', demoEffect: Effect = 'CLEAN';
const particles: Array<{ x: number; y: number; hue: number; life: number }> = [];

root.innerHTML = `<main class="product ${overlay ? 'overlay' : ''}">
  <header class="bar"><div class="brand"><span class="brand-star">✳</span> CHAT<span>CHORUS</span></div><div class="bar-right"><span id="badge" class="badge">DEMO</span><span id="connection" class="connection">DISCONNECTED</span><button id="logout" class="text-button" hidden>Sign out</button></div></header>
  <div class="layout"><section class="desk"><div class="top"><p class="eyebrow">YOUR STREAM. YOUR SCORE.</p><h1>Make your chat <em>music.</em></h1><p id="intro">Connect your Twitch channel to hear every viewer become part of the soundtrack.</p><div class="primary-actions"><a id="connect" class="primary" href="/api/connect">Connect with Twitch</a><button id="audio" class="secondary">Enable audio</button></div><p id="audio-state" class="micro">Audio needs a click in this browser.</p></div>
  <section id="control" class="control" hidden><div class="section-head"><h2>Conductor desk</h2><span id="channel"></span></div><div class="control-grid"><label>Volume <input id="volume" type="range" min="0" max="100" value="58"></label><button id="mute" class="small">Mute</button><label>Mood <select id="mood"><option value="">Auto</option><option>CALM</option><option>HAPPY</option><option>HYPE</option><option>MYSTERY</option><option>TENSE</option></select></label><button id="stop" class="danger">Stop audio</button><button id="resume" class="small">Resume</button><button id="reconnect" class="small">Reconnect chat</button></div><div class="obs"><h3>Personal OBS Browser Source</h3><p>Use 1920 × 1080. This URL is private; anyone holding it can view your chat events. Use <strong>Interact → Enable audio</strong> if OBS blocks autoplay.</p><div class="obs-row"><input id="obs-url" type="password" readonly aria-label="Private OBS URL"><button id="copy-obs" class="small">Copy URL</button><button id="reveal-obs" class="small">Show</button><button id="rotate-obs" class="small">Rotate key</button></div></div></section>
  <section id="demo-panel" class="demo-panel"><div class="section-head"><h2>Try DEMO</h2><span>SIMULATED CHAT</span></div><p>Six repeatable scenes use sample messages. LIVE traffic is separate.</p><div id="scenes" class="scenes"></div><button id="return-live" class="small" hidden>Return to LIVE</button></section>
  <section class="feed"><div class="section-head"><h2>Recent voices</h2><span id="feed-source">DEMO</span></div><div id="messages" class="messages" aria-live="polite">Connect Twitch or select a DEMO scene.</div></section><p id="error" class="error" role="alert"></p></section>
  <section class="stage"><canvas id="score" aria-label="Music visualization"></canvas><div class="stage-top"><span>THE LIVING SCORE</span><span id="scene-label">DEMO · QUIET</span></div><div class="stage-core">✳</div><div class="stage-bottom"><div><small>MOOD</small><strong id="mood-label">CALM</strong></div><div><small>ENERGY</small><strong id="energy-label">18%</strong></div><div><small>NOTES</small><strong id="note-label">00</strong></div></div></section></div>
  <footer><span>Original Web Audio synthesis · DEMO messages are simulated</span><a href="https://github.com/chapaevv123/chatchorus" rel="noopener noreferrer" target="_blank">Source on GitHub ↗</a></footer>
</main>`;

document.querySelector('.layout')!.insertAdjacentHTML('afterbegin', `<nav class="studio-nav" aria-label="Studio sections"><span class="nav-mark" aria-hidden="true">✦</span><a href="#stage" title="Visualizer">◉<span>Studio</span></a><a href="#control" title="Music controls">♫<span>Sound</span></a><a href="#overlay-editor" title="OBS overlay">▣<span>Overlay</span></a><a href="#demo-panel" title="Sample chat">◇<span>Demo</span></a><a href="#feed" title="Recent voices">≋<span>Voices</span></a></nav>`);
document.querySelector('.stage')!.id = 'stage';
document.querySelector('.feed')!.id = 'feed';
document.querySelector('.control-grid')!.insertAdjacentHTML('beforeend', `<div class="control-choice"><span class="choice-title">Scene · changes the visual theme in studio and OBS</span><div id="live-scenes" class="choice-row" role="group" aria-label="Visual scene"><button type="button" data-live-scene="AURORA">Aurora</button><button type="button" data-live-scene="NEON">Neon</button><button type="button" data-live-scene="NOIR">Noir</button></div></div><div class="control-choice"><span class="choice-title">Sound color · changes the synth filter in studio and OBS</span><div id="effects" class="choice-row" role="group" aria-label="Sound color"><button type="button" data-effect="CLEAN">Clean</button><button type="button" data-effect="WARM">Warm</button><button type="button" data-effect="BRIGHT">Bright</button></div></div>`);
document.querySelector('.obs')!.id = 'overlay-editor';
document.querySelector('.obs')!.insertAdjacentHTML('afterbegin', `<span class="eyebrow">OVERLAY EDITOR · LIVE PREVIEW ON THE LEFT</span>`);
document.querySelector('.obs h3')!.insertAdjacentHTML('afterend', `<div class="overlay-options"><span class="choice-title">OBS background · choose a full scene or layer over your stream</span><div class="choice-row" role="group" aria-label="OBS background"><button type="button" data-overlay-background="STAGE">Full scene</button><button type="button" data-overlay-background="TRANSPARENT">Transparent</button></div></div>`);
document.querySelector('.stage-top')!.insertAdjacentHTML('afterbegin', `<span class="stage-live-dot" aria-hidden="true"></span>`);
document.querySelector('.stage')!.insertAdjacentHTML('beforeend', `<button id="overlay-unlock" class="overlay-unlock" type="button" hidden>Enable overlay audio</button>`);
document.querySelector('.top')!.insertAdjacentHTML('afterbegin', `<span class="top-kicker">CHAT CHORUS / LIVE MUSIC STUDIO</span>`);

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('score'), ctx = canvas.getContext('2d')!;
const setError = (message: string) => { error = message; el('error').textContent = message; };
function render(): void {
  const live = uiMode === 'LIVE';
  const liveConnected = live && server.connection === 'LIVE_CONNECTED';
  const scene = live ? server.scene || 'AURORA' : demoScene;
  const effect = live ? server.effect || 'CLEAN' : demoEffect;
  root.querySelector('.product')!.className = `product ${overlay ? 'overlay ' : ''}${live ? 'is-live ' : 'is-demo '}scene-${scene.toLowerCase()} ${server.overlayBackground === 'TRANSPARENT' ? 'overlay-transparent' : ''}`;
  document.querySelector('.top h1')!.innerHTML = server.authorized ? 'Your live <em>studio.</em>' : 'Make your chat <em>music.</em>';
  audio.setEffect(effect);
  el('overlay-unlock').toggleAttribute('hidden', !overlay || !server.authorized || audio.running || Boolean(server.stopped));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-live-scene]')) { const selected = button.dataset.liveScene === scene; button.setAttribute('aria-pressed', String(selected)); }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-effect]')) { const selected = button.dataset.effect === effect; button.setAttribute('aria-pressed', String(selected)); }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-overlay-background]')) button.setAttribute('aria-pressed', String(button.dataset.overlayBackground === (server.overlayBackground || 'STAGE')));
  el('badge').textContent = liveConnected ? 'LIVE' : live ? 'TWITCH WAITING' : 'DEMO'; el('badge').className = `badge ${liveConnected ? 'live' : ''}`;
  el('connection').textContent = live ? server.connection.replaceAll('_', ' ') : 'SAMPLE MESSAGES';
  el('scene-label').textContent = liveConnected ? `LIVE · ${server.login || 'TWITCH'}` : live ? `TWITCH · ${server.connection.replaceAll('_', ' ')}` : `DEMO · ${scenario.toUpperCase()}`;
  el('intro').textContent = overlay ? `Private OBS source for ${server.login || 'your channel'}.` : server.authorized ? `Connected as ${server.login}. Your own channel is the LIVE source.` : 'Connect your Twitch channel to hear every viewer become part of the soundtrack.';
  el('mood-label').textContent = live ? server.mood || 'CALM' : demoMusic.mood;
  el('energy-label').textContent = `${Math.round(100 * (live ? server.energy ?? .18 : demoMusic.energy))}%`;
  el('note-label').textContent = String(noteCount).padStart(2, '0');
  el('audio-state').textContent = server.stopped && live ? 'Audio is stopped for this channel.' : audio.running ? 'Audio is playing in this browser.' : 'Audio needs a click in this browser.';
  el('audio').textContent = audio.running ? 'Audio playing' : 'Enable audio';
  el<HTMLButtonElement>('audio').disabled = Boolean((overlay && !server.authorized) || (live && server.stopped));
  el('connect').toggleAttribute('hidden', overlay || server.authorized);
  el('logout').toggleAttribute('hidden', overlay || !server.authorized);
  el('control').toggleAttribute('hidden', overlay || !server.authorized);
  for (const href of ['#control', '#overlay-editor']) document.querySelector<HTMLAnchorElement>(`.studio-nav a[href="${href}"]`)!.toggleAttribute('hidden', overlay || !server.authorized);
  el('demo-panel').toggleAttribute('hidden', overlay);
  el('return-live').toggleAttribute('hidden', !server.authorized || live);
  el('channel').textContent = server.authorized ? `twitch.tv/${server.login || ''}` : '';
  if (server.authorized) { el<HTMLInputElement>('volume').value = String(Math.round((server.volume ?? .58) * 100)); muted = Boolean(server.muted); el('mute').textContent = muted ? 'Unmute' : 'Mute'; el<HTMLSelectElement>('mood').value = server.moodOverride || ''; }
  el('stop').toggleAttribute('hidden', Boolean(server.stopped));
  el('resume').toggleAttribute('hidden', !server.stopped);
  el('feed-source').textContent = live ? 'REAL TWITCH CHAT' : 'SIMULATED CHAT';
  el('error').textContent = error || server.error || '';
  if (live) { const messages = el('messages'); messages.replaceChildren(); if (!server.recent?.length) messages.textContent = server.liveSeen ? 'Waiting for more messages…' : 'Waiting for the first real Twitch message…'; for (const item of server.recent || []) { const row = document.createElement('div'); row.className = 'message'; const name = document.createElement('strong'); name.textContent = item.viewer; const text = document.createElement('span'); text.textContent = item.text; const source = document.createElement('small'); source.textContent = 'LIVE'; row.append(name, text, source); messages.append(row); } }
  audio.setMood(live ? server.mood || 'CALM' : demoMusic.mood);
  audio.setTempo(live ? server.tempo || 76 : demoMusic.tempo);
  if (live) { audio.setVolume(server.volume ?? .58); audio.setMuted(Boolean(server.muted || server.stopped)); }
}
async function api(path: string, body?: unknown): Promise<any> {
  const response = await fetch(path, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
async function run(action: () => Promise<void>): Promise<void> { try { setError(''); await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Action failed'); } }
function addNote(note: NoteEvent): void { if (uiMode !== note.source) return; noteCount++; audio.play(note); for (let i = 0; i < 10; i++) particles.push({ x: .5 + (Math.random() - .5) * .08, y: .52, hue: 170 + note.voice * 23, life: 1 }); render(); }
function demo(scene: Scenario): void {
  for (const timer of demoTimers) clearTimeout(timer); demoTimers = [];
  uiMode = 'DEMO'; scenario = scene; demoMusic.reset(); noteCount = 0;
  const messages = el('messages'); messages.replaceChildren();
  const start = Date.now();
  for (const item of demoEvents(scene, start)) demoTimers.push(setTimeout(() => { const note = demoMusic.accept(item); if (!note || uiMode !== 'DEMO') return; addNote(note); const row = document.createElement('div'); row.className = 'message'; const name = document.createElement('strong'); name.textContent = item.viewer; const text = document.createElement('span'); text.textContent = item.text; const source = document.createElement('small'); source.textContent = 'DEMO'; row.append(name, text, source); messages.prepend(row); while (messages.children.length > 12) messages.lastElementChild?.remove(); }, Math.max(0, item.at - start)));
  render();
}
function openSocket(): void {
  if (closedByUser || (!overlay && !server.authorized)) return;
  const path = overlay ? `/api/ws?obs=${encodeURIComponent(obsToken)}` : '/api/ws';
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${path}`);
  socket.onopen = () => { retry = 0; setError(''); };
  socket.onmessage = event => { try { const frame = JSON.parse(event.data); if (frame.type === 'status') { const wasStopped = server.stopped; server = frame.data; if (uiMode === 'LIVE') render(); if (overlay && server.authorized && !server.stopped) void audio.start().then(render).catch(() => render()); if (server.stopped && !wasStopped) void audio.emergencyStop().then(render); } else if (frame.type === 'note') addNote(frame.data as NoteEvent); else if (frame.type === 'stop') void audio.emergencyStop().then(render); } catch { /* malformed frame ignored */ } };
  socket.onclose = () => { if (closedByUser) return; server = { ...server, authorized: overlay ? false : server.authorized, connection: 'RECONNECTING' }; if (overlay) void audio.emergencyStop().then(render); else render(); void (async () => { if (!overlay) { try { const current = await api('/api/status'); if (!current.authorized) { server = current; uiMode = 'DEMO'; closedByUser = true; obsUrl = ''; el<HTMLInputElement>('obs-url').value = ''; await audio.emergencyStop(); setError('Session expired. Connect with Twitch again.'); render(); return; } } catch { /* service may be temporarily unavailable */ } } setError(overlay ? 'Overlay connection lost. Reconnecting… Check the OBS key if this continues.' : 'Connection lost. Reconnecting…'); setTimeout(openSocket, Math.min(15000, 500 * 2 ** Math.min(retry++, 5))); })(); };
  socket.onerror = () => { socket?.close(); };
}
function draw(time: number): void {
  const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
  const energy = uiMode === 'LIVE' ? server.energy ?? .18 : demoMusic.energy;
  for (let line = 0; line < 5; line++) { ctx.beginPath(); for (let x = 0; x <= width; x += 8) { const y = height * .53 + Math.sin(x / 82 + time / (800 + line * 130) + line) * (18 + energy * 52) + (line - 2) * 29; if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = `hsla(${180 + line * 18},90%,72%,${.09 + energy * .13})`; ctx.lineWidth = 1.5; ctx.stroke(); }
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.y -= .002; p.x += Math.sin(time / 310 + i) / 2500; p.life -= .007; if (p.life <= 0) { particles.splice(i, 1); continue; } ctx.beginPath(); ctx.arc(p.x * width, p.y * height, 2.8, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},90%,72%,${p.life})`; ctx.fill(); }
  requestAnimationFrame(draw);
}

el('audio').addEventListener('click', () => void run(async () => { await audio.start(); render(); }));
el('overlay-unlock').addEventListener('click', () => void run(async () => { await audio.start(); render(); }));
if (!overlay) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-live-scene]')) button.addEventListener('click', () => void run(async () => { server = await api('/api/scene', { scene: button.dataset.liveScene }); render(); }));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-effect]')) button.addEventListener('click', () => void run(async () => { server = await api('/api/effect', { effect: button.dataset.effect }); render(); }));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-overlay-background]')) button.addEventListener('click', () => void run(async () => { server = await api('/api/overlay', { background: button.dataset.overlayBackground }); render(); }));
  el('logout').addEventListener('click', () => void run(async () => { const result = await api('/api/logout', {}); closedByUser = true; socket?.close(); server = { authorized: false, connection: 'DISCONNECTED' }; uiMode = 'DEMO'; obsUrl = ''; el<HTMLInputElement>('obs-url').value = ''; await audio.emergencyStop(); setError(result.warning || ''); render(); }));
  el<HTMLInputElement>('volume').addEventListener('change', () => void run(async () => { server = await api('/api/volume', { volume: Number(el<HTMLInputElement>('volume').value) / 100, muted }); render(); }));
  el('mute').addEventListener('click', () => void run(async () => { muted = !muted; server = await api('/api/volume', { volume: Number(el<HTMLInputElement>('volume').value) / 100, muted }); el('mute').textContent = muted ? 'Unmute' : 'Mute'; render(); }));
  el<HTMLSelectElement>('mood').addEventListener('change', () => void run(async () => { server = await api('/api/mood', { mood: el<HTMLSelectElement>('mood').value || null }); render(); }));
  el('stop').addEventListener('click', () => void run(async () => { server = await api('/api/stop', {}); await audio.emergencyStop(); render(); }));
  el('resume').addEventListener('click', () => void run(async () => { server = await api('/api/resume', {}); await audio.start(); render(); }));
  el('reconnect').addEventListener('click', () => void run(async () => { server = await api('/api/reconnect', {}); render(); }));
  el('return-live').addEventListener('click', () => { uiMode = 'LIVE'; for (const timer of demoTimers) clearTimeout(timer); demoTimers = []; noteCount = 0; render(); });
  el('copy-obs').addEventListener('click', () => void run(async () => { if (!obsUrl) throw new Error('OBS URL is not available'); await navigator.clipboard.writeText(obsUrl); el('copy-obs').textContent = 'Copied'; }));
  el('reveal-obs').addEventListener('click', () => { const input = el<HTMLInputElement>('obs-url'); input.type = input.type === 'password' ? 'text' : 'password'; el('reveal-obs').textContent = input.type === 'password' ? 'Show' : 'Hide'; });
  el('rotate-obs').addEventListener('click', () => void run(async () => { const data = await api('/api/rotate-obs', {}); obsUrl = data.url; el<HTMLInputElement>('obs-url').value = obsUrl; }));
  for (const scene of SCENARIOS) { const button = document.createElement('button'); button.className = 'scene-button'; button.textContent = scene.toUpperCase(); button.dataset.scene = scene; button.addEventListener('click', () => void run(async () => { await audio.start(); demo(scene); })); el('scenes').append(button); }
}
void (async () => {
  try {
    if (overlay) { uiMode = 'LIVE'; openSocket(); }
    else { server = await api('/api/status'); if (server.authorized) { uiMode = 'LIVE'; closedByUser = false; obsUrl = (await api('/api/obs')).url; el<HTMLInputElement>('obs-url').value = obsUrl; el<HTMLInputElement>('volume').value = String(Math.round((server.volume ?? .58) * 100)); muted = Boolean(server.muted); openSocket(); } }
  } catch { setError('Service unavailable. DEMO remains available.'); }
  render(); requestAnimationFrame(draw);
})();

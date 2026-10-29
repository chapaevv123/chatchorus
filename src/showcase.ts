import './showcase.css';
import { AudioController } from './audio';
import { MusicState, type NoteEvent } from './music';
import { demoEvents, SCENARIOS, type Scenario } from './demo';

const audio = new AudioController();
const music = new MusicState();
const app = document.querySelector<HTMLDivElement>('#app')!;
const githubUrl = 'https://github.com/chapaevv123/chatchorus'; // Intended publication URL; verify before public deploy.
let active: Scenario = 'quiet';
let timers: ReturnType<typeof setTimeout>[] = [];
let playing = false;
let noteCount = 0;
const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; hue: number }> = [];

app.innerHTML = `<div class="site">
  <header class="nav wrap"><a class="logo" href="#top" aria-label="ChatChorus home"><span class="logo-glyph">✳</span> CHAT<span>CHORUS</span></a><div class="nav-right"><span class="demo-pill">● BROWSER DEMO</span><a href="${githubUrl}" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository, publication pending">GitHub ↗</a></div></header>
  <main id="top">
    <section class="hero wrap"><div class="hero-copy"><p class="kicker">AN ORCHESTRA MADE OF PEOPLE</p><h1>The stream<br>becomes <em>music.</em></h1><p class="lede">ChatChorus turns every chat message into a note, every viewer into a voice, and every stream into an original score.</p><div class="hero-buttons"><button id="start" class="cta">▶ &nbsp;Start the demo</button><a class="ghost" href="#how">How it works ↘</a></div><p class="honesty">This public preview uses simulated chat. Twitch LIVE runs in the local app.</p></div><div class="hero-art"><div class="art-frame"><canvas id="score" aria-label="Animated musical waves and particles"></canvas><div class="art-top"><span>THE LIVING SCORE</span><span id="scene-label">DEMO · QUIET</span></div><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="orbit orbit-c"></div><div class="art-center">✳</div><div class="art-bottom"><div><small>MOOD</small><strong id="mood">CALM</strong></div><div><small>ENERGY</small><strong id="energy">18%</strong></div><div><small>NOTES</small><strong id="notes">00</strong></div></div></div><span class="art-caption">Every message changes the arrangement.</span></div></section>
    <section class="demo-section" id="demo"><div class="wrap"><div class="section-top"><div><p class="kicker">HEAR THE DIFFERENCE</p><h2>Conduct the crowd.</h2><p>Select a scene and hear how the music reacts. Each scene is repeatable and clearly labeled DEMO.</p></div><div class="audio-state" id="audio-state" role="status">Audio is locked until you press play.</div></div><div class="scene-grid" id="scene-grid"></div><div class="demo-bottom"><div class="now"><span class="live-dot"></span><span id="now-text">Quiet room · the baseline keeps playing</span></div><button id="stop" class="stop">■ Stop audio</button></div><div class="chat-card"><div class="chat-title"><span>SIMULATED CHAT FEED</span><span id="tempo">76 BPM</span></div><div id="chat-feed" class="chat-feed" aria-live="polite"><span class="empty">Choose a scene to hear the chat become music.</span></div></div></div></section>
    <section class="how wrap" id="how"><div class="how-intro"><p class="kicker">FROM MESSAGE TO MELODY</p><h2>Participation you can <em>hear.</em></h2><p>No commands for viewers to remember. The chat itself becomes the instrument.</p></div><div class="steps"><article><span>01 / LISTEN</span><h3>Chat arrives</h3><p>Real Twitch messages enter through EventSub in the local app. This page plays labeled sample messages instead.</p></article><article><span>02 / COMPOSE</span><h3>Every viewer has a voice</h3><p>Stable timbres, beat quantization and chord-aware notes keep a busy room musical. One viewer is enough.</p></article><article><span>03 / PERFORM</span><h3>The scene responds</h3><p>Five moods shape the soundtrack and animated OBS overlay. Burst limits and an emergency stop keep the streamer in control.</p></article></div></section>
    <section class="closing"><div class="wrap closing-inner"><div><p class="kicker">BUILD THE MOMENT LIVE</p><h2>Make your chat part<br>of the show.</h2><p>Run ChatChorus locally for Twitch OAuth, real EventSub chat and OBS audio. The source repository is prepared for publication.</p></div><div><a class="cta source-link" href="${githubUrl}" target="_blank" rel="noopener noreferrer">Source on GitHub ↗</a><small>Repository link becomes active after owner-approved publication.</small></div></div></section>
  </main><footer class="wrap footer"><span>✳ CHAT CHORUS</span><span>Original Web Audio synthesis · DEMO traffic is simulated</span></footer>
</div>`;

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('score');
const context = canvas.getContext('2d')!;
const descriptions: Record<Scenario, [string, string]> = {
  quiet: ['Quiet', 'The baseline plays even when chat is still.'],
  one: ['One', 'A single viewer becomes an instrument.'],
  three: ['Three', 'Three distinct voices join the score.'],
  hype: ['Hype', 'Excited words lift the energy.'],
  burst: ['Burst', 'Rapid chat stays controlled and musical.'],
  calm: ['Calm', 'Return to a gentle baseline.'],
};

function reflect(): void {
  get('scene-label').textContent = `DEMO · ${active.toUpperCase()}`;
  get('mood').textContent = music.mood;
  get('energy').textContent = `${Math.round(music.energy * 100)}%`;
  get('notes').textContent = String(noteCount).padStart(2, '0');
  get('tempo').textContent = `${Math.round(music.tempo)} BPM`;
  get('audio-state').textContent = audio.running ? 'Audio is playing in this browser.' : 'Audio is locked until you press play.';
  document.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === active)));
  audio.setMood(music.mood); audio.setTempo(music.tempo);
}
function note(event: ReturnType<typeof demoEvents>[number]): void {
  const result = music.accept(event);
  if (!result) return;
  noteCount++;
  audio.play(result);
  reflect();
  const row = document.createElement('div'); row.className = 'chat-line';
  const name = document.createElement('strong'); name.textContent = result.viewer;
  const text = document.createElement('span'); text.textContent = result.text;
  const tag = document.createElement('small'); tag.textContent = 'DEMO';
  row.append(name, text, tag);
  const feed = get('chat-feed'); if (feed.querySelector('.empty')) feed.replaceChildren();
  feed.prepend(row); while (feed.children.length > 5) feed.lastElementChild?.remove();
  burst(result);
}
async function play(scene: Scenario): Promise<void> {
  try { await audio.start(); } catch { get('audio-state').textContent = 'Audio could not start in this browser.'; return; }
  for (const timer of timers) clearTimeout(timer); timers = [];
  music.reset(); active = scene; noteCount = 0; playing = true;
  get('chat-feed').replaceChildren();
  get('now-text').textContent = `${descriptions[scene][0]} · ${descriptions[scene][1]}`;
  reflect();
  const start = Date.now();
  for (const event of demoEvents(scene, start)) timers.push(setTimeout(() => note(event), Math.max(0, event.at - start)));
}
function burst(value: NoteEvent): void {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    particles.push({ x: .5, y: .5, vx: Math.cos(a) * (.001 + value.energy * .002), vy: Math.sin(a) * (.001 + value.energy * .002), life: 1, hue: 165 + value.voice * 24 });
  }
}
for (const scene of SCENARIOS) {
  const [title, description] = descriptions[scene];
  const button = document.createElement('button'); button.className = 'scene'; button.dataset.scene = scene;
  const index = document.createElement('small'); index.textContent = `0${SCENARIOS.indexOf(scene) + 1}`;
  const heading = document.createElement('strong'); heading.textContent = title;
  const caption = document.createElement('span'); caption.textContent = description;
  button.append(index, heading, caption); button.addEventListener('click', () => void play(scene)); get('scene-grid').append(button);
}
get('start').addEventListener('click', () => { void play('one'); document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' }); });
get('stop').addEventListener('click', () => { for (const timer of timers) clearTimeout(timer); timers = []; playing = false; void audio.emergencyStop().then(reflect); get('now-text').textContent = 'Audio stopped · choose a scene to begin again'; });
setInterval(() => { if (playing) { music.tick(Date.now()); reflect(); } }, 600);

function animate(now: number): void {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, w, h);
  for (let n = 0; n < 5; n++) { context.beginPath(); for (let x = 0; x <= w; x += 6) { const y = h * (.47 + n * .055) + Math.sin(x / 56 + now / (1150 + n * 150) + n) * (13 + music.energy * 38) + Math.sin(x / 107 - now / 1900) * 7; if (!x) context.moveTo(x, y); else context.lineTo(x, y); } context.strokeStyle = `hsla(${164 + n * 18},95%,68%,${.12 + n * .016})`; context.lineWidth = 1.4; context.stroke(); }
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= .008; if (p.life <= 0) { particles.splice(i, 1); continue; } context.beginPath(); context.arc(p.x * w, p.y * h, 1.8 + p.life * 2, 0, Math.PI * 2); context.fillStyle = `hsla(${p.hue},95%,72%,${p.life})`; context.fill(); }
  requestAnimationFrame(animate);
}
reflect(); requestAnimationFrame(animate);

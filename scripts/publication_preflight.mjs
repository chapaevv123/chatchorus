import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const issues = [];
const patterns = [
  ['GitHub token', /ghp_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}/],
  ['OpenAI key', /sk-[A-Za-z0-9]{25,}/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Bearer token', /Bearer\s+[A-Za-z0-9._-]{24,}/],
];
for (const file of tracked) {
  if (/^\.env($|\.)|(^|\/)\.dev\.vars$|^recordings\/|^media\/|^dist\/|^dist-showcase\/|^node_modules\//.test(file) && file !== '.env.example') issues.push(`Forbidden tracked path: ${file}`);
  if (/^docs\/assets\/.+\.(?:mp4|mov|webm|mkv)$/i.test(file)) issues.push(`Video file must not be tracked: ${file}`);
  if (/^docs\/assets\//.test(file) && readFileSync(join(root, file)).byteLength > 1_000_000) issues.push(`Large presentation asset: ${file}`);
  const content = readFileSync(join(root, file), 'utf8');
  for (const [label, pattern] of patterns) if (pattern.test(content)) issues.push(`${label} pattern in ${file}`);
  if (file === '.env.example' && /^TWITCH_CLIENT_SECRET=\S+/m.test(content)) issues.push('Nonempty secret in .env.example');
}
const dist = join(root, 'dist-showcase');
if (!existsSync(join(dist, 'index.html'))) issues.push('Missing static showcase build');
else {
  const assets = readdirSync(join(dist, 'assets')).filter(name => /\.(js|css)$/.test(name));
  if (assets.length < 2) issues.push('Static JS/CSS assets missing');
  for (const asset of assets) {
    const content = readFileSync(join(dist, 'assets', asset), 'utf8');
    if (/\/api\/|new\s+WebSocket\s*\(|\bWebSocket\s*\(|wss?:\/\/|TWITCH_CLIENT_SECRET|oauth\/callback/.test(content)) issues.push(`Backend reference in static asset ${asset}`);
  }
}
const publicDist = join(root, 'dist-public');
if (existsSync(join(publicDist, 'index.html'))) {
  const files = [join(publicDist, 'index.html'), ...readdirSync(join(publicDist, 'assets')).map(name => join(publicDist, 'assets', name))];
  for (const file of files) {
    if (!/\.(?:html|js|css)$/.test(file)) { issues.push(`Unexpected public build asset: ${file}`); continue; }
    const content = readFileSync(file, 'utf8');
    if (/TWITCH_CLIENT_SECRET|TWITCH_EVENTSUB_SECRET|SESSION_SIGNING_KEY|server\/index|localhost:8787|127\.0\.0\.1:8787|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}|Bearer\s+[A-Za-z0-9._-]{24,}/.test(content)) issues.push(`Private material in public build: ${file}`);
  }
}
const remote = (() => { try { return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } })();
const result = { local_preflight: issues.length ? 'FAIL' : 'PASS', tracked_files: tracked.length, static_build: existsSync(join(dist, 'index.html')), github_remote: remote || 'NOT_SET', publication_ready: false, issues };
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;

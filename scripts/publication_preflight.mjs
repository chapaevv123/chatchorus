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
  if (/^\.env($|\.)|(^|\/)\.dev\.vars$|^recordings\/|^dist\/|^dist-showcase\/|^node_modules\//.test(file) && file !== '.env.example') issues.push(`Forbidden tracked path: ${file}`);
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
    if (/\/api\/|WebSocket|TWITCH_CLIENT_SECRET|oauth\/callback/.test(content)) issues.push(`Backend reference in static asset ${asset}`);
  }
}
const remote = (() => { try { return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } })();
const result = { local_preflight: issues.length ? 'FAIL' : 'PASS', tracked_files: tracked.length, static_build: existsSync(join(dist, 'index.html')), github_remote: remote || 'NOT_SET', publication_ready: false, issues };
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;

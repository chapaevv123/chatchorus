import { spawn, type ChildProcess } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';

const port = randomInt(19000, 29000);
const base = `http://127.0.0.1:${port}`;
let child: ChildProcess | null = null;
afterAll(() => { child?.kill(); });

describe('local controller without a Twitch account', () => {
  it('serves safe status, documented OAuth URL, CSRF rejection and disconnect', async () => {
    child = spawn(process.execPath, ['--experimental-strip-types', 'server/index.ts'], {
      cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, PORT: String(port), TWITCH_CLIENT_ID: 'test-client', TWITCH_CLIENT_SECRET: 'test-secret', TWITCH_CHANNEL_LOGIN: 'test-channel' },
    });
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { const response = await fetch(`${base}/api/status`); if (response.ok) { ready = true; break; } } catch { /* startup */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    expect(ready).toBe(true);
    const status = await (await fetch(`${base}/api/status`)).json();
    expect(status).toMatchObject({ mode: 'DEMO', connection: 'DISCONNECTED', configured: true, liveSeen: false });
    expect(JSON.stringify(status)).not.toContain('test-secret');
    const response = await fetch(`${base}/api/connect`, { method: 'POST' });
    expect(response.status).toBe(200);
    const authorize = await response.json() as { url: string };
    expect(authorize.url).not.toContain('test-secret');
    const url = new URL(authorize.url);
    expect(url.searchParams.get('redirect_uri')).toBe(`http://localhost:${port}/oauth/callback`);
    expect(url.searchParams.get('scope')).toBe('user:read:chat');
    expect(url.searchParams.has('code_challenge')).toBe(false);
    const invalid = await fetch(`${base}/oauth/callback?state=wrong&code=fake`);
    expect(invalid.status).toBe(400);
    const disconnected = await fetch(`${base}/api/disconnect`, { method: 'POST' });
    expect((await disconnected.json()).connection).toBe('DISCONNECTED');
    const cancelled = await fetch(`${base}/oauth/callback?state=${encodeURIComponent(url.searchParams.get('state') || '')}&code=fake`);
    expect(cancelled.status).toBe(400);
  }, 15_000);
});

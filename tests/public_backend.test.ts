import { describe, expect, it, vi } from 'vitest';
import worker, { UserRoom } from '../cloud/worker';

function harness() {
  const objects = new Map<string, UserRoom>();
  const env: any = { TWITCH_CLIENT_ID: 'test-client', TWITCH_CLIENT_SECRET: 'test-secret', TWITCH_EVENTSUB_SECRET: 'test-webhook-secret-0123456789', SESSION_SIGNING_KEY: 'test-session-key-0123456789', PUBLIC_ORIGIN: 'https://chatchorus.pages.dev' };
  env.USER_ROOM = { idFromName: (name: string) => name, get: (id: string) => ({ fetch: (request: Request) => objects.get(id)!.fetch(request) }) };
  for (const uid of ['100', '200']) {
    const values = new Map<string, unknown>();
    const ctx = { storage: { get: async (key: string) => values.get(key), put: async (key: string, value: unknown) => { values.set(key, value); }, delete: async (key: string) => { values.delete(key); }, setAlarm: async () => undefined, deleteAlarm: async () => undefined, list: async () => new Map() }, getWebSockets: () => [] };
    objects.set(uid, new UserRoom(ctx, env));
  }
  const post = (uid: string, path: string, data: unknown) => objects.get(uid)!.fetch(new Request(`https://room.internal${path}`, { method: 'POST', body: JSON.stringify(data) }));
  const get = async (uid: string) => (await objects.get(uid)!.fetch(new Request('https://room.internal/status'))).json() as any;
  return { env, post, get };
}
async function signedWebhook(env: any, id: string, body: unknown, type: string) {
  const timestamp = new Date().toISOString();
  const raw = JSON.stringify(body);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.TWITCH_EVENTSUB_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(id + timestamp + raw)))].map(x => x.toString(16).padStart(2, '0')).join('');
  return worker.fetch(new Request('https://chatchorus.pages.dev/api/eventsub', { method: 'POST', headers: { 'Twitch-Eventsub-Message-Id': id, 'Twitch-Eventsub-Message-Timestamp': timestamp, 'Twitch-Eventsub-Message-Signature': `sha256=${mac}`, 'Twitch-Eventsub-Message-Type': type }, body: raw }), env);
}

describe('public backend boundaries', () => {
  it('rejects forged webhooks and invalid OAuth callback state', async () => {
    const { env } = harness();
    const forged = await worker.fetch(new Request('https://chatchorus.pages.dev/api/eventsub', { method: 'POST', headers: { 'Twitch-Eventsub-Message-Id': 'x', 'Twitch-Eventsub-Message-Timestamp': new Date().toISOString(), 'Twitch-Eventsub-Message-Signature': 'sha256=bad' }, body: '{}' }), env);
    expect(forged.status).toBe(403);
    const callback = await worker.fetch(new Request('https://chatchorus.pages.dev/oauth/callback?state=wrong&code=fake'), env);
    expect(callback.status).toBe(403);
    const start = await worker.fetch(new Request('https://chatchorus.pages.dev/api/connect'), env);
    expect(start.status).toBe(302);
    const target = new URL(start.headers.get('Location')!);
    expect(target.searchParams.get('scope')).toBe('user:read:chat user:bot channel:bot');
    expect(target.searchParams.get('redirect_uri')).toBe('https://chatchorus.pages.dev/oauth/callback');
    expect(start.headers.get('Set-Cookie')).toContain('HttpOnly');
  });

  it('routes verified events only to the matching channel and ignores duplicates', async () => {
    const { env, post, get } = harness();
    await post('100', '/login', { uid: '100', login: 'alpha', sidHash: 's1', obsKey: 'secretA', accessToken: 'a', refreshToken: 'r' });
    await post('200', '/login', { uid: '200', login: 'beta', sidHash: 's2', obsKey: 'secretB', accessToken: 'b', refreshToken: 'r' });
    await post('100', '/subscription', { subscriptionId: 'subA' });
    await post('200', '/subscription', { subscriptionId: 'subB' });
    const subscription = { id: 'subA', type: 'channel.chat.message', condition: { broadcaster_user_id: '100', user_id: '100' } };
    const challenge = await signedWebhook(env, 'challenge-a', { challenge: 'verify-me', subscription }, 'webhook_callback_verification');
    expect(await challenge.text()).toBe('verify-me');
    const event = { broadcaster_user_id: '100', message_id: 'message-a', chatter_user_id: 'viewer-1', chatter_user_name: 'Viewer', message: { text: 'hype!' } };
    const first = await signedWebhook(env, 'event-a', { subscription, event }, 'notification');
    expect((await first.json() as any).accepted).toBe(true);
    const duplicate = await signedWebhook(env, 'event-a', { subscription, event }, 'notification');
    expect((await duplicate.json() as any).duplicate).toBe(true);
    expect((await get('100')).recent).toHaveLength(1);
    expect((await get('200')).recent).toHaveLength(0);
    const cross = await post('200', '/event', { type: 'notification', id: 'cross', subscription, event });
    expect((await cross.json() as any).ignored).toBe(true);
    const invalidObs = await env.USER_ROOM.get('100').fetch(new Request('https://room.internal/ws?role=obs&key=wrong', { headers: { Upgrade: 'websocket' } }));
    expect(invalidObs.status).toBe(403);
  });

  it('logout invalidates one room without changing another', async () => {
    const { post, get } = harness();
    await post('100', '/login', { uid: '100', login: 'alpha', sidHash: 's1', obsKey: 'secretA', accessToken: 'a', refreshToken: 'r' });
    await post('200', '/login', { uid: '200', login: 'beta', sidHash: 's2', obsKey: 'secretB', accessToken: 'b', refreshToken: 'r' });
    await post('100', '/disconnect', {});
    expect((await get('100')).authorized).toBe(false);
    expect((await get('200')).authorized).toBe(true);
  });

  it('re-login rotates the web session; sign-out revokes it without affecting another streamer', async () => {
    const { env } = harness();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: string | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/oauth2/token')) {
        const params = init?.body as URLSearchParams;
        return Response.json(params.get('grant_type') === 'client_credentials' ? { access_token: 'app-token' } : { access_token: `user-${params.get('code')}`, refresh_token: 'refresh-token' });
      }
      if (url.includes('/oauth2/validate')) {
        const token = String((init?.headers as any)?.Authorization || '').replace('Bearer user-', '');
        return Response.json({ client_id: env.TWITCH_CLIENT_ID, user_id: token.startsWith('alpha') ? '100' : '200', login: token.startsWith('alpha') ? 'alpha' : 'beta', scopes: ['user:read:chat', 'user:bot', 'channel:bot'] });
      }
      if (url.includes('/eventsub/subscriptions')) return init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ data: [{ id: `sub-${Math.random()}` }] }, { status: 202 });
      if (url.includes('/oauth2/revoke')) return new Response(null, { status: 200 });
      throw new Error('Unexpected mocked Twitch endpoint');
    });
    const login = async (code: string) => {
      const start = await worker.fetch(new Request('https://chatchorus.pages.dev/api/connect'), env);
      const state = new URL(start.headers.get('Location')!).searchParams.get('state');
      const stateCookie = /__Host_cc_oauth=([^;]+)/.exec(start.headers.get('Set-Cookie')!)![1];
      const callback = await worker.fetch(new Request(`https://chatchorus.pages.dev/oauth/callback?state=${state}&code=${code}`, { headers: { Cookie: `__Host_cc_oauth=${stateCookie}` } }), env);
      expect(callback.status).toBe(302);
      const allCookies = callback.headers.getSetCookie().join(';');
      const session = /__Host_cc_session=([^;]+)/.exec(allCookies)![1];
      return session;
    };
    try {
      const alphaOld = await login('alpha-first');
      const beta = await login('beta-first');
      const alphaNew = await login('alpha-second');
      expect(alphaOld).not.toBe(alphaNew);
      const status = (session: string) => worker.fetch(new Request('https://chatchorus.pages.dev/api/status', { headers: { Cookie: `__Host_cc_session=${session}` } }), env);
      expect((await (await status(alphaOld)).json() as any).authorized).toBe(false);
      expect((await (await status(alphaNew)).json() as any).login).toBe('alpha');
      expect((await (await status(beta)).json() as any).login).toBe('beta');
      const logout = await worker.fetch(new Request('https://chatchorus.pages.dev/api/logout', { method: 'POST', headers: { Cookie: `__Host_cc_session=${alphaNew}`, Origin: 'https://chatchorus.pages.dev', 'Content-Type': 'application/json' }, body: '{}' }), env);
      expect(logout.status).toBe(200);
      expect((await (await status(alphaNew)).json() as any).authorized).toBe(false);
      expect((await (await status(beta)).json() as any).authorized).toBe(true);
    } finally { vi.stubGlobal('fetch', originalFetch); }
  });
});

import { timingSafeEqual } from 'node:crypto';

export function authorizationUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL('https://id.twitch.tv/oauth2/authorize');
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'user:read:chat', state }).toString();
  return url.toString();
}
export function codeExchangeBody(clientId: string, clientSecret: string, redirectUri: string, code: string): URLSearchParams {
  return new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code });
}
export function matchesState(expected: string, actual: string, expiresAt: number, now: number): boolean {
  return !!expected && !!actual && now < expiresAt && expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
export function validatedUserId(data: unknown, clientId: string): string {
  if (!data || typeof data !== 'object') throw new Error('Twitch token validation response invalid');
  const value = data as { client_id?: unknown; user_id?: unknown; scopes?: unknown };
  if (value.client_id !== clientId || typeof value.user_id !== 'string' || !value.user_id ||
      !Array.isArray(value.scopes) || !value.scopes.includes('user:read:chat')) throw new Error('Twitch token identity or scope mismatch');
  return value.user_id;
}

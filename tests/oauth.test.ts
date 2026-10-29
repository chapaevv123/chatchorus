import { describe, expect, it } from 'vitest';
import { authorizationUrl, codeExchangeBody, matchesState, validatedUserId } from '../server/oauth';

describe('documented Twitch authorization-code flow', () => {
  it('creates the documented authorization URL without exposing the client secret or unsupported PKCE fields', () => {
    const url = new URL(authorizationUrl('client-id', 'http://localhost:8787/oauth/callback', 'random-state'));
    expect(url.origin).toBe('https://id.twitch.tv');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('user:read:chat');
    expect(url.searchParams.get('state')).toBe('random-state');
    expect(url.searchParams.has('client_secret')).toBe(false);
    expect(url.searchParams.has('code_challenge')).toBe(false);
  });
  it('requires exact unexpired state and exchanges the code with the confidential client secret', () => {
    expect(matchesState('abc', 'abc', 200, 100)).toBe(true);
    expect(matchesState('abc', 'abd', 200, 100)).toBe(false);
    expect(matchesState('abc', 'abc', 100, 100)).toBe(false);
    const body = codeExchangeBody('client-id', 'secret', 'http://localhost:8787/oauth/callback', 'code');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_secret')).toBe('secret');
    expect(body.has('code_verifier')).toBe(false);
  });
  it('rejects a token for another client or without chat scope', () => {
    const valid = { client_id: 'client-id', user_id: 'reader-id', scopes: ['user:read:chat'] };
    expect(validatedUserId(valid, 'client-id')).toBe('reader-id');
    expect(() => validatedUserId({ ...valid, client_id: 'other' }, 'client-id')).toThrow();
    expect(() => validatedUserId({ ...valid, scopes: [] }, 'client-id')).toThrow();
  });
});

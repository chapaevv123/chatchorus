# ChatChorus LIVE preparation evidence — 2026-10-29

## Official protocol review and changes

Twitch's current [authorization-code documentation](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/) lists `client_id`, `redirect_uri`, `response_type=code`, `scope` and `state` for authorization, and `client_id`, `client_secret`, `code`, `grant_type=authorization_code`, `redirect_uri` for token exchange. It does not document `code_challenge` or `code_verifier` for this flow. The prior unverified PKCE extension was removed. ChatChorus now uses the documented confidential-client flow, a random five-minute state with constant-time comparison, server-only secret and tokens, validation of client ID/user ID/`user:read:chat` scope on login and hourly, and a single-flight refresh after HTTP 401. Neither tokens nor the client secret are logged or returned to the UI.

The [EventSub WebSocket documentation](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) says a normal lost socket requires resubscription, while `session_reconnect` moves existing subscriptions to a new URL and the old socket should remain active until the new welcome. `server/eventsub.ts` now implements those paths separately, retains the old socket during handoff, handles keepalives, stops on revocation or permanent authorization errors, and sanitizes accepted `channel.chat.message` events. The [subscription type](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/) requires `user:read:chat` for a user token and identifies the broadcaster and reader IDs.

## Actual local verification

- `npm run typecheck`: PASS.
- `npm test`: PASS, four files / 12 tests. Tests cover documented OAuth parameters and CSRF state, token identity/scope checks, fake-credential HTTP status/connect/disconnect without a Twitch call, real chat message structure, handoff preserving old-socket events, resubscription after loss, revocation/permanent-error stop, music and burst limits.
- `npm run build`: PASS, Vite 7.3.7 production output.
- `npm start`: PASS on `127.0.0.1:8787`; panel `/` and overlay `/overlay` returned HTTP 200. `/api/status` returned `mode=DEMO`, `connection=DISCONNECTED`, `configured=false`.
- No `.env` or `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_CHANNEL_LOGIN` environment values were present. OBS executable exists, but OBS was not running. Real OAuth, EventSub receipt and OBS audio are **not verified**.

## Pulse regression diagnosis

The prior `test_isolated_project_learning_cycle` failure was caused by fixture collision with the canonical DB's historical `evolution_spiral_tick_v3` row `2026-10-26T08:00[Europe/Kyiv]`: it was already `DEGRADED` at `2026-10-26T06:33:02Z`, with failed `discovery`. The test backed up the live DB and called `tick` on that same slot. On independent in-memory copies, the saved slot returned `DEGRADED`, `created=false`, while a copy with only that slot removed returned `COMPLETE`, `created=true`. The canonical DB was not changed. The test now uses its own `manual:isolated-project-learning:<project_id>` slot. The two targeted Pulse test files passed: **11/11**.

## Current gates

Owner must create/configure a Twitch Developer Application, authorize the channel locally, observe a real LIVE message, and verify OBS Browser Source audio meter and recording. The step-by-step runbook is `LIVE_VERIFICATION_RUNBOOK_RU.md`. No repository, video or Devpost submission was published. Evolution Score delta: 0; no capability promotion claimed.

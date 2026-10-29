# ChatChorus public product architecture

Status: implementation in progress. Existing local Node controller and static showcase remain available during the migration.

## Decision

Use the existing `chatchorus.pages.dev` Pages project for the interface and a Pages Function as a same-origin API gateway. A dedicated Cloudflare Worker holds Twitch client credentials and routes requests to a SQLite-backed Durable Object named for each Twitch user ID. Browser WebSockets terminate at that user's object; the object stores the active session hash, encrypted-by-platform user tokens, private OBS key, subscription ID and control state. Only sanitized note/status data reaches browsers. The original `src/music.ts`, `src/audio.ts` and `src/demo.ts` remain the music and DEMO engines.

Twitch EventSub uses **webhooks**. The Worker requests an app access token, subscribes to `channel.chat.message` for the authenticated broadcaster's own user ID, and verifies every incoming webhook's HMAC, timestamp, subscription ID and broadcaster ID before dispatch. This requires `user:read:chat`, `user:bot` and `channel:bot` consent from the streamer under Twitch's app-token rules. OAuth uses a confidential authorization-code flow, short-lived signed state cookie, server-side token exchange and identity validation. Session cookies are HttpOnly/Secure/SameSite=Lax; logout revokes the local session and ignores/deletes the EventSub subscription. The OBS URL uses a high-entropy fragment key that can be rotated and is never included in HTML or source control.

## Cost and capacity

Cloudflare's free plan currently includes SQLite-backed Durable Objects and 100,000 Worker requests plus 13,000 GB-seconds of Durable Object duration daily. A permanent Twitch WebSocket per streamer would exhaust free duration with only a few concurrent channels. Webhooks avoid that always-on outbound connection; browser WebSockets use the Durable Object hibernation API. On the free plan, hitting a quota stops the affected operation rather than charging. This is a bounded-capacity free product, not a promise of unlimited concurrent users.

## Self-critique and gates

- A Twitch callback URL change and server-side secrets are required before real OAuth can work. A deployed login button is not proof of LIVE service.
- OBS Browser Source Web Audio may require a user gesture; the overlay offers Enable audio and attempts startup where Chromium permits it. A real OBS recording is required to confirm audio.
- The browser's private OBS URL is a bearer capability. The fragment avoids sending it in normal page requests; anyone who receives that full URL can view the owner's stream events until the key is rotated.
- Webhook delivery is at least once. The object deduplicates message IDs and rejects a mismatched broadcaster/subscription. There is no replay during Twitch or Cloudflare outages.
- One active web session per Twitch user simplifies revocation. A fresh login replaces the previous session; other users are isolated by object ID.
- Do not replace the existing live site with a Connect button until the backend deploys and a no-secret public smoke test passes. Full LIVE/OBS acceptance remains pending owner operation if their Twitch account/OBS cannot be exercised here.

Sources: [Twitch EventSub subscription types](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types), [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth), [Twitch webhook verification](https://dev.twitch.tv/docs/eventsub/handling-webhook-events/), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/).

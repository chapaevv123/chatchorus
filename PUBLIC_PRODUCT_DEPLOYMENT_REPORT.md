# ChatChorus public product deployment — 2026-10-29

## Deployed state

The existing <https://chatchorus.pages.dev/> Pages project now serves the product interface rather than the showcase. The first screen presents **Connect with Twitch**. Pages routes `/api/*` and `/oauth/callback` to the service-only `chatchorus-backend` Worker. That Worker owns one SQLite-backed Durable Object per Twitch user ID and holds four Cloudflare Worker secrets; no public `workers.dev` endpoint was enabled. The existing GitHub repository remains <https://github.com/chapaevv123/chatchorus>.

Production Pages deployment `fc89306c-5a2e-4172-b4f4-c657b0a34095` serves source commit `a8d26bf36fa64c1573b7adcc0fb0ef4c3ba7725c`. Worker version `aadc14c8-65fb-4133-b7a2-47d2c12630fc` is service-bound. No second product, GitHub repository or Pages project was created.

## Security and tests

- `npm.cmd run typecheck`, `npm.cmd test` (16/16), `npm.cmd run build:public`, and `npm.cmd run preflight:publish` passed.
- The three-file public bundle was checked against seven nonempty local credential values, with zero matches. Public preflight found no known token/private-key patterns, server import or local controller path. The local `.env` and ignored `cloud/.dev.vars` were not committed or uploaded as static assets.
- Unit tests reject forged webhook signatures and invalid OAuth state, verify exact per-channel dispatch and deduplication, replace an old session on re-login, revoke a local session on sign-out, and keep another streamer's room unaffected. These tests use synthetic Twitch responses.
- Unauthenticated production requests: root HTTP 200, backend health HTTP 200 `CONFIGURED`, `/api/status` returns anonymous DEMO, OAuth start returns 302 to Twitch, bad OAuth callback returns 403, unsigned webhook returns 403. The OAuth start was not followed into a real user authorization.
- Headless Chromium on production: Connect is visible, One and Hype DEMO scenes produced notes/feed entries with audio playing, no JavaScript errors, and no horizontal overflow at 390 px. A deliberately invalid OBS key showed `TWITCH WAITING`, not LIVE, and kept audio disabled. A separately mocked authorized browser state displayed the control panel, channel name, hidden private OBS URL, mood/volume/stop/reconnect controls and sign-out. The mocked state is not Twitch or OBS verification.
- The existing `PRODUCT-FIRST / END-TO-END DELIVERY` standard was added to Pulse `AGENTS.md` for future authorized products.

## Exact remaining LIVE acceptance

1. In **Twitch Developer Console**, open the existing confidential ChatChorus app and add the OAuth Redirect URL `https://chatchorus.pages.dev/oauth/callback` exactly. Keep `http://localhost:8787/oauth/callback` if the local version should continue working. Do not send Client ID, Client Secret, tokens or the private OBS URL in chat.
2. Open <https://chatchorus.pages.dev/>, click Connect with Twitch and consent to `user:read:chat`, `user:bot` and `channel:bot`. Confirm the panel names the signed-in streamer's own channel and reaches `LIVE_CONNECTED` after Twitch webhook verification.
3. Copy the private OBS Browser Source URL into OBS at 1920 × 1080. Use **Interact → Enable audio** if OBS blocks autoplay. Send a real message in that Twitch channel, preferably from a viewer account. Confirm a LIVE feed row, a note/visual reaction and audible OBS mixer/recording output.
4. Reopen the site to verify session restoration, then test Reconnect chat, Rotate key, and Sign out. Verify the old OBS URL no longer works and the Twitch subscription has been removed. Two independent streamer accounts should be tested to confirm real-world isolation.

Until these steps are observed, public OAuth, Twitch event delivery and OBS audio are **UNVERIFIED**. The deployed app must not be marked ready or scored as an end-to-end success. YouTube and Devpost were untouched.

Architecture, limits, and official documentation: [public product architecture](PUBLIC_PRODUCT_ARCHITECTURE.md).

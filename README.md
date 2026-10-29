# ChatChorus — Twitch chat becomes music

**Public app:** https://chatchorus.pages.dev/
**Source:** https://github.com/chapaevv123/chatchorus

ChatChorus gives each streamer a live music studio for their own Twitch channel. Viewers write normal chat messages; the app turns accepted messages into notes in a shared, harmonically constrained score. The streamer can shape the mood, volume, visual scene and sound color, then add a personal Browser Source to OBS. No local installation is needed for the public app.

![Owner-recorded LIVE chat beside ChatChorus](docs/assets/hero-live.webp)

Current public interface, captured in clearly labeled DEMO mode on desktop and mobile: [desktop](docs/assets/public-demo-desktop.webp) · [mobile](docs/assets/public-demo-mobile.webp). The LIVE screenshot above is an earlier owner recording and does not show the latest interface.

## Use the public app

1. Open the public app and select **Connect with Twitch**. Authorize the requested chat scopes for your own channel.
2. The studio shows **LIVE CONNECTED** when Twitch confirms the EventSub subscription. Click **Enable audio** in the studio to unlock browser audio.
3. Copy your private OBS Browser Source URL from **Overlay Editor**. Add it to OBS as a 1920 × 1080 Browser Source. Keep this URL private; rotate its key if exposed.
4. In OBS, use **Interact → Enable overlay audio** if the browser source cannot autoplay. Check the OBS mixer meter. Capture either the OBS source or the studio audio, avoiding a double mix.
5. Send a real Twitch chat message. It should appear as **LIVE** in Recent voices and change the score. The same channel's OBS scene should react. Select **Aurora**, **Neon** or **Noir** for the visual scene and **Clean**, **Warm** or **Bright** for the synth filter. The Overlay Editor can switch OBS between a full scene and a transparent layer; the studio displays a checkerboard preview for the transparent option. Volume, mute, mood override, stop and reconnect work from the studio.
6. **Try DEMO** runs labeled sample messages. **Return to LIVE** restores the real feed. **Sign out** disconnects the current account; connecting again creates a new session and OBS key.

The owner confirmed OAuth, LIVE CONNECTED, real messages in Recent voices and creation of a personal OBS URL on production for `gg_punch` before the latest design update. Independent real OBS audio, a second streamer and the complete post-update journey still need owner checks. DEMO and automated test results are never presented as proof of LIVE operation.

## Architecture

```text
Twitch OAuth + channel.chat.message EventSub webhook
                    │
                    ▼
Cloudflare Pages Functions ── service binding ── Worker
                                              │
                                              ▼
                                  per-streamer SQLite Durable Object
                                  token + subscription + session + music state
                                              │
                                  authenticated WebSocket / private OBS key
                                     ├── LIVE Studio
                                     └── OBS Browser Source

Browser-only DEMO ── sample events ── same music and audio modules
```

Each broadcaster ID maps to one Durable Object. OAuth state is signed and expires after five minutes; session cookies are Secure, HttpOnly and SameSite=Lax. Sessions are checked against the active room session. EventSub messages require a valid Twitch HMAC signature and a matching broadcaster, user and subscription ID. Message IDs are deduplicated. Studio mutations require a valid session and exact same-origin JSON request. The OBS key is separate from the session cookie; rotating it closes prior OBS sockets. Signing in again closes prior room sockets. Tokens and server secrets remain in the Worker and Durable Object, outside browser bundles and Git.

The music engine assigns stable voices to viewers, quantizes notes to a four-chord progression, applies a per-viewer cooldown, limits bursts and caps concurrent oscillators. Original Web Audio synthesis provides the score. The three sound colors are real low-pass filter settings. Visual scene changes propagate through the room status to studio and OBS. A quiet room still has a baseline arrangement.

## Run and test locally

Requires Node.js 22.23.1+ and npm.

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:public
npm.cmd run build:showcase
npm.cmd run preflight:publish
```

The public app build is `dist-public/`. The older standalone local controller can still be run with `npm.cmd start`; its separate Twitch setup uses `.env.example` and the callback `http://localhost:8787/oauth/callback`. Never put a client secret in Vite variables or a Pages build. Deployment uses the existing Pages project and `cloud/wrangler.jsonc` Worker; see [public architecture](PUBLIC_PRODUCT_ARCHITECTURE.md) and [deployment report](PUBLIC_PRODUCT_DEPLOYMENT_REPORT.md).

The public app's Twitch Developer Console callback is exactly `https://chatchorus.pages.dev/oauth/callback`. It requests `user:read:chat`, `user:bot` and `channel:bot` for a broadcaster-owned webhook subscription. Worker secrets are configured privately in Cloudflare. The app uses the current Cloudflare free tier; capacity is bounded by its request and Durable Object quotas.

## Evidence and contest status

The local contest edit `media/final/ChatChorus_TwitchCon_Final.mp4` is 125.5 seconds and is excluded from Git. It captures an earlier local product and an editorial Codex session-log excerpt. It predates this public studio design and needs a new recording with current public Twitch/OBS behavior and actual Codex footage before it can be treated as final contest evidence. No YouTube or Devpost publication has been authorized.

- [Development evidence](CODEX_BUILD_EVIDENCE.md)
- [Tests](TEST_REPORT.md)
- [Submission draft](DEVPOST_SUBMISSION_DRAFT.md)
- [Official hackathon rules](https://twitchcon-codex.devpost.com/rules)

**Primary Codex Session ID:** `01a1873b-d813-7d70-9e13-65ca2449847b`

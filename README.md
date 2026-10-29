# ChatChorus — The Stream Becomes an Orchestra

ChatChorus turns Twitch chat into an original, harmonically constrained soundtrack and a 1920×1080 OBS scene. Every viewer gets a stable musical voice. Chat messages become quantized notes over a four-chord progression; mood and tempo react smoothly to activity. A quiet chat still has a baseline arrangement.

The application runs locally. A Node.js controller keeps Twitch tokens in memory, subscribes to `channel.chat.message` over EventSub WebSocket, deduplicates events, and sends sanitized note events to the control page and OBS overlay. The Vite frontend synthesizes audio with Web Audio. Six labeled demo scenes exercise the same note pipeline without claiming to be Twitch traffic.

## Requirements and installation

- Node.js 22.23 or newer and npm.
- A modern Chromium browser. OBS Studio is optional for local preview.
- A Twitch developer application and channel only for LIVE mode.

```powershell
cd projects/chatchorus
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:8787/`. Click **Enable audio** to unlock Web Audio. Choose **One** for the fastest audible demonstration, or another demo scene. `npm run dev` runs the Vite UI at `http://127.0.0.1:5173/` with the same local controller. `npm run typecheck`, `npm test`, and `npm run build` are the verification commands. The server binds to loopback only.

## Public browser showcase

`npm run build:showcase` produces a separate static site in `dist-showcase/`. It reuses `src/music.ts` and `src/audio.ts` but runs six DEMO scenes entirely in the browser; it makes no calls to the local controller, Twitch OAuth or EventSub. The proposed GitHub URL on the page remains pending until the owner approves and publishes the repository. `npm run preflight:publish` checks tracked files for obvious secrets and verifies that the static bundle contains no backend references. See `DEPLOY_CLOUDFLARE.md` for the prepared Cloudflare Pages settings. No public site has been deployed.

## Twitch OAuth setup

1. In the Twitch Developer Console, register a **confidential** application and set its OAuth redirect URL exactly to `http://localhost:8787/oauth/callback`. The local server still listens on `127.0.0.1:8787`; the callback hostname must match the registered URL.
2. Open the local `.env` in Notepad (`notepad .env`) and fill `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_CHANNEL_LOGIN`. The login is the channel to read, without `@`. Leave `PORT=8787`. Keep `.env` local; it is ignored by Git. Never paste the values, OAuth callback URL or tokens into a chat or issue.
3. Start the configured local app:

   ```powershell
   npm run build
   npm run start:live
   ```

4. Click **Connect Twitch**, authorize the `user:read:chat` scope in your browser, and send a real message in the configured channel. The badge says **LIVE** only after OAuth; the page separately says whether a real chat message has arrived. **Disconnect Twitch** clears tokens from controller memory. For a demo, select any scene; its badge is **DEMO**.

The implementation uses Twitch's documented confidential-client authorization-code flow with a random expiring `state`, server-side client secret, token validation on login and hourly, and refresh after HTTP 401. Twitch's published authorization-code documentation does not define PKCE parameters for this flow, so the unverified PKCE extension was removed. LIVE behavior still requires a real owner test. Access and refresh tokens stay in controller memory; the client secret is read from the local `.env` file and is never returned to the browser.

## OBS setup

1. Add a **Browser Source** with URL `http://127.0.0.1:8787/overlay`, width **1920**, height **1080**.
2. Use **Interact** on that source, then click **Enable audio** inside the overlay. Browser audio requires a user gesture. Confirm the overlay says **Audio running in this browser**.
3. Check the OBS audio meter and recording. If OBS exposes **Control audio via OBS** for the Browser Source, enable it and choose your desired monitor/output routing. Avoid capturing both the control page and Browser Source audio into the same recording.
4. After a source refresh or OBS restart, recheck audio unlock. **Emergency stop** from the control page stops both browser clients over the local WebSocket.

OBS audio and real Twitch traffic have not yet been verified on the owner's setup. The demo is visibly labeled and is not a substitute for the contest's Twitch footage requirement.

## Musical behavior and limits

Five moods: CALM, HAPPY, HYPE, MYSTERY, TENSE. A deterministic viewer hash selects one of five timbres. Notes land on the current mood's scale and the four-step root progression. One chat message produces one note, while the baseline plays even at zero viewers. Duplicate IDs are ignored; a viewer is limited to one note per 180 ms; the global pipeline accepts at most 24 notes per second; the synthesizer has an 18-voice ceiling and compressor. Mood and tempo ease toward new values. Volume, mute, mood override and emergency stop are available in the control page.

Demo scenes: **Quiet** (baseline only), **One** (solo viewer), **Three** (three viewers), **Hype** (high energy words), **Burst** (45 rapid events, visibly throttled), and **Calm** (return to quiet). Replay a scene to restart from a clean state.

## Architecture and contest status

- `server/index.ts`, `server/oauth.ts`, `server/eventsub.ts`: OAuth callback, token handling, EventSub lifecycle, local API/WebSocket, DEMO event scheduling.
- `src/music.ts`: pure note selection, mood and activity state, deduplication and limits.
- `src/audio.ts`: browser synthesis and audio lifecycle.
- `src/main.ts` and `src/style.css`: control page and dedicated OBS route.
- `tests/*.test.ts`: music, OAuth and EventSub lifecycle regression tests.

Built with Codex in two sessions. The main build session ID is `01a1873b-d813-7d70-9e13-65ca2449847b`; the earlier scaffolding session is `01a1872a-ee45-7842-96ff-28c16f8521df`. The repo, video and Devpost submission have not been published.

See `LIVE_VERIFICATION_RUNBOOK_RU.md` for the owner Twitch and OBS acceptance steps and `SUBMISSION.md` for the prepared English description and video shot list. Official requirements: [Devpost rules](https://twitchcon-codex.devpost.com/rules), [Devpost FAQ](https://twitchcon-codex.devpost.com/resources), [Twitch EventSub](https://dev.twitch.tv/docs/eventsub/handling-websocket-events), [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth).

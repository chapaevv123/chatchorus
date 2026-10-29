# Registered localhost OAuth callback — local verification

Date: 2026-10-29. The owner reported that the Twitch Developer Application is registered with exactly `http://localhost:8787/oauth/callback` and has supplied Client ID and Client Secret **locally to themselves**. No credential value was provided to Codex or inspected.

The application reads only `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_CHANNEL_LOGIN`, and `PORT`, as defined by `.env.example` and `server/index.ts`. The OAuth redirect URI in `server/index.ts` now uses `localhost`; both authorization and token exchange use that same value. The server remains bound to `127.0.0.1` and accepts localhost Host headers. The Russian runbook and README now state the registered callback. The OAuth tests assert the new URI.

A local `.env` was copied from `.env.example` with blank credential fields, then confirmed ignored by Git. Its contents were not read or printed. The owner must fill the existing fields in Notepad and restart the controller with `npm.cmd run start:live` before connecting. The current background controller was started without `.env`, so its safe status is `configured=false`.

Post-change checks: TypeScript typecheck passed; all 12 unit tests passed; production build passed. Local `/` and `/overlay` returned HTTP 200. A request to `http://localhost:8787/oauth/callback` with deliberately invalid state returned HTTP 400, proving that the registered hostname reaches the loopback controller and that CSRF rejection remains active. This does **not** verify real Twitch OAuth, EventSub chat delivery, or OBS audio.

Next owner test: locally populate `.env`, restart with `npm.cmd run start:live`, click **Connect Twitch**, approve `user:read:chat`, then send a real channel message. Only after `LIVE_CONNECTED` and `liveSeen=true` should OBS audio be checked using `LIVE_VERIFICATION_RUNBOOK_RU.md`. No public submission or deployment occurred.

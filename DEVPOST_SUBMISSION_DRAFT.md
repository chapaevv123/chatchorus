# ChatChorus — Devpost draft for owner review

**Status:** Draft only. No YouTube upload or Devpost submission. The product's final LIVE/OBS acceptance and replacement demo video remain open.

| Field | Verified value or pending action |
| --- | --- |
| Title | ChatChorus — Your Twitch Chat, Your Living Score |
| Tagline | Every viewer adds a voice to the music. |
| Public app | https://chatchorus.pages.dev/ |
| Source | https://github.com/chapaevv123/chatchorus |
| YouTube | Pending owner-authorized upload of a newly reviewed video |
| Primary Codex Session ID | `01a1873b-d813-7d70-9e13-65ca2449847b` |

## Project description (English, ready for factual review)

**Inspiration.** Twitch chat is fast and ephemeral. We wanted viewers to hear their participation without typing commands, and to give streamers a musical layer that works in a normal broadcast.

**What it does.** ChatChorus turns accepted messages in the streamer's own Twitch channel into notes. A deterministic viewer identity picks one of five voices. A shared key, five moods, a four-chord progression and beat alignment keep the result musical. A quiet channel still has a baseline score. The streamer can change volume, mute, select a mood, stop or resume audio, choose one of three visual scenes and select a synth filter. The personal OBS Browser Source receives the same channel's music and visualization, with either a full scene or transparent overlay background. Six clearly labeled DEMO sequences let visitors explore the engine without a Twitch account.

**How it works.** A broadcaster signs in through Twitch OAuth. Cloudflare Pages serves the studio and routes API requests to a service-only Worker. The Worker verifies OAuth state and token scopes, creates a `channel.chat.message` EventSub webhook subscription, verifies webhook signatures and routes each event to a Durable Object keyed by that broadcaster's Twitch ID. That room holds the session, private OBS key, current settings and recent messages. Authenticated WebSockets deliver notes and state to the studio and OBS. The Web Audio engine synthesizes the score in each browser context; browser and OBS audio need their own unlock gesture. Tokens and signing secrets stay server-side.

**How Codex helped.** The owner directed the concept and reviewed decisions. Codex implemented the Twitch integration, musical engine, public Cloudflare architecture, security boundaries, tests and studio interface. During development, Codex corrected an unsupported PKCE assumption, an EventSub handoff gap, and a session replacement risk. The primary session ID above identifies the main build thread. The source and evidence map are in the repository.

**Challenges and lessons.** Twitch webhooks need both a valid signature and per-channel subscription validation. Browser audio requires user activation; OBS has a separate browser context. Multi-streamer isolation requires routing by broadcaster ID and closing prior sessions on re-login or OBS key rotation. A live visual can be polished without inventing viewer counts or presenting DEMO traffic as LIVE.

**Built with.** TypeScript, Vite, Web Audio API, Canvas, Twitch OAuth, EventSub webhooks, Cloudflare Pages, Workers, SQLite Durable Objects, Vitest, OBS Browser Source and Codex.

## Instructions for judges (English)

1. Open the public app on desktop or mobile. The initial screen offers **Connect with Twitch** and a separately marked DEMO.
2. For a real channel test, sign in using a Twitch broadcaster account, grant the requested chat permissions and wait for **LIVE CONNECTED**. Click **Enable audio** in the studio.
3. Copy the private OBS URL into a 1920 × 1080 Browser Source. Do not share that URL in screenshots or a public submission. If the Browser Source cannot autoplay, use OBS **Interact → Enable overlay audio**.
4. Send an ordinary chat message in that channel. Check the LIVE-tagged Recent voices feed, note/visual response and OBS audio mixer. Change scene, sound color and volume in the studio; the OBS source should follow.
5. Select a DEMO sequence only when you want sample traffic. It is labeled DEMO and is separate from Twitch LIVE. You can reconnect, rotate the OBS key and sign out from the studio.

The repository README describes local tests and architecture. Judges can inspect the source without any private credentials. The public app is free to use during judging, subject to the underlying Cloudflare Free limits.

## Evidence and completion gates

- **Owner-confirmed before latest design deployment:** Twitch OAuth as `gg_punch`, LIVE CONNECTED, real LIVE-tagged chat messages and personal OBS URL creation.
- **Automated:** TypeScript build, unit/integration tests for OAuth state, signatures, channel isolation and sessions; browser checks of DEMO, mobile layout and unauthorized OBS key. Synthetic LIVE UI checks are labeled synthetic.
- **Still required:** post-update real chat to audible OBS output, second independent broadcaster isolation, reconnect, session expiration, logout and key rotation. Record the results without exposing URLs or tokens.
- **Video:** existing 125.5-second edit shows an older local UI, Twitch/OBS capture and an editorial Codex log excerpt. It should be replaced by footage of the current public app and a genuine Codex screen/session. Upload only after owner approval and verify a working public or unlisted YouTube link.
- **Eligibility:** owner must confirm individual/team eligibility, Devpost registration, rights to video assets and the required build period. The repository's first commit is dated October 29, 2026; verify the actual work chronology if asked.
- **Final submission:** owner must review the completed package, expressly authorize Devpost submission, and confirm Devpost displays **Submitted** before the deadline.

Official deadline: **November 2, 2026, 2:00 PM Pacific Time**; verify the live Devpost countdown. [Overview](https://twitchcon-codex.devpost.com/) · [Rules](https://twitchcon-codex.devpost.com/rules) · [FAQ](https://twitchcon-codex.devpost.com/resources)

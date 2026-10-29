# Devpost submission draft — owner review required

**Project title:** ChatChorus — The Stream Becomes an Orchestra

**Tagline:** Every chat message becomes a note. Every viewer has a voice.

**Primary Codex Session ID:** `01a1873b-d813-7d70-9e13-65ca2449847b`

**Earlier setup Session ID:** `01a1872a-ee45-7842-96ff-28c16f8521df`

**Repository URL:** `[insert verified GitHub/GitLab/Bitbucket URL after owner-approved publication]`

**Public showcase URL:** `[insert verified Cloudflare Pages URL after owner-approved deployment]`

**YouTube video URL:** `[insert public or unlisted URL after real Twitch/OBS recording and owner-approved upload]`

## Inspiration

Chat participation usually disappears as quickly as it scrolls. We wanted a stream where viewers could hear their collective effect immediately, without learning commands or triggering a chaotic soundboard. Even a stream with one viewer should feel alive.

## What it does

ChatChorus reads a streamer's Twitch chat through EventSub and turns each message into an original note on a harmonically constrained score. Each viewer receives a stable musical voice. Notes are quantized to the beat, and five moods shape scales, tempo and energy. A baseline arrangement keeps playing when chat is quiet. The separate OBS Browser Source displays animated waves, rings and particles as the score changes. Streamers can control volume, mute, mood override and emergency stop.

The public browser showcase has six clearly labeled **DEMO** scenes — Quiet, One, Three, Hype, Burst and Calm — that reuse the music engine without Twitch credentials. It never represents simulated chat as live Twitch activity.

## How we built it with Codex

The owner defined the product, approved the local-controller architecture and directed the contest scope. Codex researched the official Twitch and Devpost contracts, implemented the Node.js/TypeScript controller, confidential authorization-code OAuth callback, EventSub WebSocket lifecycle, Vite/Web Audio instrument, OBS overlay and public static demo, and wrote regression tests and setup documentation. Codex also found and corrected an undocumented PKCE assumption, a socket handoff gap and a test-fixture collision in Pulse's historical database. The primary Codex thread above contains most implementation work; the earlier thread prepared the project skeleton.

## Challenges and learning

- Browser audio requires a user action; OBS uses a separate browser context, so the overlay needs its own audio unlock.
- A planned EventSub reconnect preserves subscriptions, while an unexpected disconnect requires a fresh subscription. The old socket must keep receiving events until the new welcome arrives.
- Twitch's published confidential authorization-code flow documents a client-secret exchange and random `state`; it does not document the PKCE fields originally considered. The final implementation follows the published flow and validates the token and chat scope.
- Duplicate and burst chat events must be bounded before they reach the synthesizer.

## Accomplishments

The local controller, six deterministic demo scenes, soundtrack engine, public static showcase, and OBS overlay have passed local typecheck, unit tests and production builds. **Replace this paragraph with real Twitch and OBS observations only after the owner completes verification.** Do not claim LIVE/OBS verified based on a simulated demo or HTTP response.

## What's next

Verify an authorized Twitch channel and OBS audio recording, capture a concise real-world video, publish the repository and static showcase after owner approval, and submit the final evidence before the official deadline.

## Submission checklist

- [ ] Owner confirms eligibility, registration and originality.
- [ ] Real Twitch `channel.chat.message` observed and clearly shown in the video.
- [ ] OBS Browser Source audio meter and recorded sound confirmed.
- [ ] Repository link contains source, assets, install/test instructions; private GitHub/GitLab repo grants judges access if used.
- [ ] English description and a publicly visible or unlisted YouTube video **under three minutes** include Twitch operation and Codex build footage.
- [ ] Primary Session ID entered: `01a1873b-d813-7d70-9e13-65ca2449847b`.
- [ ] Owner authorizes publication, YouTube upload and Devpost submission; Devpost shows **Submitted**.

Official sources: [Rules](https://twitchcon-codex.devpost.com/rules), [FAQ](https://twitchcon-codex.devpost.com/resources). The site states November 2, 2026 2:00 PM Pacific; the FAQ's UTC conversion conflicts with the PST label. Use 21:00 UTC as the conservative internal cutoff pending live countdown confirmation. No prize is counted as earned revenue.

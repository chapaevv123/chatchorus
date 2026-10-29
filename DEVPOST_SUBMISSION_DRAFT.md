# Devpost submission draft — ChatChorus

**Status:** Prepared locally. No Devpost submission, repository publication, website deployment, or YouTube upload has occurred. Replace the URL fields below only with verified destinations.

- **Project title:** ChatChorus — The Stream Becomes an Orchestra
- **Tagline:** Every chat message becomes a note. Every viewer has a voice.
- **Code repository:** [add verified GitHub, GitLab or Bitbucket URL]
- **Live website:** [add verified static showcase URL]
- **YouTube video:** [add approved public or unlisted URL for the 2:05 final edit]
- **Primary Codex Session ID:** `01a1873b-d813-7d70-9e13-65ca2449847b`
- **Earlier setup session:** `01a1872a-ee45-7842-96ff-28c16f8521df`

## Inspiration

Most chat reactions disappear as soon as they scroll away. We wanted stream viewers to hear their collective impact without memorizing commands or turning the channel into a noisy soundboard. A single viewer should still be able to change the music.

## What it does

ChatChorus makes a Twitch stream's conversation into a living score. Each accepted chat message becomes a beat-aligned note. A stable viewer identity selects one of five instrument voices, while five moods shape scales, tempo and energy. A four-chord progression and a baseline arrangement keep the music coherent even in a quiet room. Deduplication, viewer cooldowns, a global burst limit and an 18-voice synthesizer ceiling prevent busy chat from overwhelming the audio.

The streamer connects Twitch, controls volume and mood, mutes, disconnects, or stops everything immediately from a local control panel. A separate OBS Browser Source renders animated waves, rings and particles and plays the soundtrack after its own audio unlock. Six repeatable browser-only scenes let anyone try the music engine without a Twitch account. Every simulated event is labeled **DEMO**.

## How we built it

The owner defined the concept and approved the local-first architecture. Codex helped implement the TypeScript/Node controller, Twitch confidential authorization-code OAuth, EventSub WebSocket lifecycle, Vite/Web Audio instrument, OBS overlay, static showcase and regression tests. The controller stores the client secret locally and tokens in memory. It validates OAuth state and token identity, sanitizes messages, and distinguishes planned EventSub handoff from unexpected socket loss. The public showcase reuses the musical engine but contains no Twitch credentials or backend.

Codex identified and corrected an unsupported PKCE assumption, an EventSub handoff gap, and a Pulse test fixture that collided with a saved historical slot. The primary build session above contains most implementation work. The final video includes an editorial card based on a genuine, dated excerpt from that session log; it does not imitate a Codex interface.

## Challenges

- Browser audio requires a user gesture; OBS Browser Source has a separate browser context and needs its own audio unlock.
- EventSub handoff preserves the old socket until the new welcome. An unexpected loss requires resubscription.
- Messages may duplicate or burst, so the musical pipeline limits them before synthesis.
- The recorded music was quiet. The final contest edit normalizes audio while preserving the complete owner-recorded Twitch segment.

## Accomplishments and proof

The owner reports connecting ChatChorus to the real Twitch channel `gg_punch`, sending real messages, hearing the resulting notes, and capturing audio and video in OBS. Inspection of the supplied 1:49 recording shows the LIVE-connected interface, actual `gg_punch` chat beside LIVE feed rows, changing mood and activity, and a later clearly labeled DEMO segment. The source has H.264 video and stereo AAC audio. The separate 2:05 contest edit adds a brief title, normalizes sound, and includes a sourced Codex build-note excerpt. These observations are distinct from automated tests and do not imply that Codex directly performed the Twitch authorization.

Local verification: TypeScript typecheck, 12 ChatChorus tests, production app build, static showcase build and publication preflight. The repository includes installation, configuration and OBS instructions. Screenshots and three small animated WebP clips in `docs/assets/` come from the actual owner recording and retain LIVE/DEMO labels.

## Technology

TypeScript, Node.js, Twitch OAuth authorization-code flow, Twitch EventSub WebSocket, Vite, Web Audio API, HTML Canvas, OBS Browser Source, Vitest, FFmpeg and Cloudflare Pages for the static showcase.

## What's next

Publish the reviewed repository and static showcase with verified links, upload the approved final video to YouTube, replace the three URL placeholders, and submit on Devpost with the primary Codex Session ID. Confirm the project shows **Submitted** before the deadline.

## Final entry checks

- [ ] Owner confirms individual eligibility, rights to the recorded material, and Devpost registration.
- [ ] Owner approves public GitHub publication, Cloudflare deployment and YouTube upload.
- [ ] Verify repository URL, website URL and YouTube URL after each publication.
- [ ] Confirm the final YouTube video is public or unlisted, under three minutes, plays with audio, shows real Twitch operation and the authentic Codex evidence card.
- [ ] Enter the primary Session ID exactly as shown above.
- [ ] Owner separately authorizes the final Devpost submission and verifies **Submitted** state.

[Official rules](https://twitchcon-codex.devpost.com/rules) · [FAQ](https://twitchcon-codex.devpost.com/resources). The official materials disagree on the UTC conversion of the November 2, 2026 2:00 PM Pacific deadline; retain 21:00 UTC as the conservative internal cutoff and check Devpost's live countdown. No prize is counted as earned revenue.

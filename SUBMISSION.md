# Devpost draft — ChatChorus

## Short description

The stream becomes an orchestra. ChatChorus gives each Twitch viewer a musical voice and turns real chat into a living, harmonically coherent soundtrack and OBS scene.

## Project description

ChatChorus makes chat participation audible without asking viewers to learn commands. A local TypeScript controller receives Twitch EventSub chat messages, deduplicates them, limits bursts, and translates each message into a quantized note. A viewer's stable identity selects one of five musical voices. The soundtrack stays coherent through mood-aware scales, a four-chord progression, and a baseline arrangement that works even when only one person is chatting. The OBS overlay turns those notes into animated waves, rings, and particles while displaying the current mood, energy, and clear LIVE/DEMO status.

Streamers can connect or disconnect Twitch, start audio, change volume, mute, override the mood, and stop everything immediately. Six reproducible demo scenes make it easy to explore Quiet, One, Three, Hype, Burst, and Calm without a Twitch account. Demo events are explicitly marked and are never represented as real chat.

Codex helped turn the owner's concept and approved architecture into a local Node/TypeScript controller, Web Audio instrument, separate OBS route, regression tests and setup documentation. The project was built across two Codex sessions. The primary session for the majority of implementation is `01a1873b-d813-7d70-9e13-65ca2449847b`; the earlier setup session is `01a1872a-ee45-7842-96ff-28c16f8521df`.

**Submission edit gate:** Replace any statement about real Twitch performance with verified footage and observations before submission. Current local verification covers DEMO and the server; live OAuth/EventSub and OBS recording still require owner setup.

## Video plan (target 2:15, maximum 2:50)

1. **0:00–0:20** — Show the Twitch channel and ChatChorus control panel side by side. State the one-sentence problem and show the LIVE status after actual connection.
2. **0:20–0:55** — Send two real messages from different Twitch users. Show the real chat, new notes, stable voices and OBS visual response. Capture audio from OBS.
3. **0:55–1:20** — Show one viewer alone, then a burst of real chat if available. Explain beat quantization and sound limits; use the DEMO Burst scene only if it is visibly labeled.
4. **1:20–1:45** — Demonstrate the five moods, volume/mute, and emergency stop in 3–5 actions. Show how the OBS Browser Source is attached.
5. **1:45–2:10** — Show Codex session evidence, code for EventSub/music and passing terminal tests. Mention the two session IDs and why the primary was chosen.
6. **2:10–2:25** — Return to live Twitch, end on the overlay, and show the Git repository URL.

Record real Twitch operation before finalizing the video. Capture only material you own or may use. Upload to public or unlisted YouTube only after owner approval.

## Owner actions before submission

- Confirm individual eligibility and Devpost registration.
- Create/configure the Twitch app and verify the documented authorization-code flow, EventSub connection and an observed real chat event.
- Verify OBS audio unlock, meter and recording on the target machine.
- Publish a GitHub/GitLab/Bitbucket repository with source and instructions, or grant judge access to a private GitHub/GitLab repository.
- Record the video with real Twitch footage and Codex build evidence, then upload it to publicly visible or unlisted YouTube.
- Enter repository URL, English description, video URL and primary Codex session ID in Devpost; check the submission state is **Submitted** before the deadline.

The official FAQ says November 2, 2026 at 21:00 UTC, while its Pacific time label converts differently after DST. Use 21:00 UTC as the conservative internal cutoff and confirm against the live Devpost countdown.

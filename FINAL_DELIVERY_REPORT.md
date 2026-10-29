# ChatChorus final local delivery evidence — 2026-10-29

## Provenance layers

- **Owner testimony:** The owner registered the Twitch app, connected the real channel `gg_punch`, sent real messages, heard ChatChorus's musical response, and recorded the interaction with audio in OBS. Codex did not perform or directly witness the owner authorization.
- **File inspection:** The supplied original `media/ChatChorus_Twitch_LIVE_Demo.mp4` exists, lasts 109.449 seconds, is 2560×1410 H.264 at 60 fps and has 48 kHz stereo AAC audio. Sampled frames show Twitch chat beside the connected ChatChorus panel, real messages mirrored as LIVE rows, changing mood/activity, and a later explicitly labeled DEMO scene. No OAuth callback, client secret or token was visible in the sampled frames. This sampling does not certify every pixel of the full recording.
- **Automated checks:** Typecheck, tests, builds, static-site and publication preflight results are recorded below. They do not substitute for real Twitch/OBS operation.

## Video edit

Original SHA-256: `222568b803afed14f76907d3110e1fd9a8b8006a320d349d27a38b9673c5e336`. The original file was not changed or added to Git.

The separate `media/final/ChatChorus_TwitchCon_Final.mp4` is 125.500 seconds, 1920×1080 H.264, 48 kHz stereo AAC, about 7.4 MB. Its SHA-256 is `f38f6f8fe9f03a2980f19deddb48135243ee30cba135f35bf06ed1dac1fdb434`. It contains a 3-second title, the **complete** 109.449-second original capture, and a 13-second Codex evidence card. The original audio's measured mean level was -37.8 dB, maximum -16.9 dB; the edit uses two-pass EBU R128 loudness normalization targeting -18 LUFS and -1.5 dBTP. The resulting measured mean is -21.1 dB including silent cards, with a -1.5 dB maximum. These measurements establish a significant level increase without detected clipping; they are not a substitute for owner playback review.

The final card is an editorial display, **not** a simulated Codex interface. Its English text translates a genuine assistant message at line 874 of the locally stored primary session JSONL, timestamp `2026-10-29T11:03:48.163Z`: “EventSub теперь сохраняет старый сокет до приветствия нового при handoff и заново подписывается после обычного обрыва.” The card also displays the primary Session ID and source file path. A literal screen recording of the Codex interface was unavailable in this environment; the owner should judge whether this authentic transcript excerpt satisfies the competition's footage requirement before upload. The final MP4 remains under the three-minute limit.

## Presentation assets and website

`docs/assets/` contains five still WebP frames from the original, three animated WebP clips (28 frames each, all under 113 KB), and a 1280×720 YouTube thumbnail. LIVE and DEMO labels remain visible. The README uses the real footage assets. The static showcase now includes a real-video section and verified-URL-gated YouTube, GitHub and Devpost links. Until publication it displays a real frame with a pending-video label. The music DEMO stays browser-only and clearly labeled.

The original and final MP4, local `.env`, and build output are ignored by Git. Public video files are not committed. The source and showcase require no Twitch secret at static-build time.

## Local gates

| Check | Outcome |
| --- | --- |
| TypeScript typecheck | PASS |
| ChatChorus unit tests | PASS, 12/12 across four files |
| Production app build | PASS |
| Static showcase build | PASS after media/showcase edit |
| GitHub publication preflight | PASS, 51 tracked files, zero issues; no remote or publication approval |
| Targeted Pulse regression tests | PASS, 11/11 |
| Final video container and full decode | PASS; H.264/AAC, 125.500 seconds |
| Static showcase HTTP | PASS, root HTTP 200; headless Edge visual capture was unavailable due a GPU-process failure, so no browser layout acceptance is claimed |
| Markdown and static-link check | PASS for local file references; published URLs remain deliberately unset |
| Public GitHub, Cloudflare, YouTube and Devpost | Not performed; each requires owner approval |

Canonical Pulse project `50228`, existing My Builds row `build_e9607624e10c7d5011889850` and Hackathon Radar opportunity `hro_65fe3ea37c9fbcd3ab4129ed` remain the sole records. Any new evidence is registered through the project's existing `.pulse/evolution-events.json` and Evolution bridge. No Evolution Score or prize revenue is inferred from this preparation.

## Reuse candidates for Pulse

The small WebP media pipeline, truthful LIVE/DEMO labels, verified-URL-gated static embed, README evidence layout and final submission checklist are candidate reusable patterns. Promotion requires an independent result and the existing Evolution Core gates; this work alone does not promote a capability.

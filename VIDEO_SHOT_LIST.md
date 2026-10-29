# ChatChorus judging video — original capture plan (superseded)

The owner has since supplied a real 1:49 Twitch/OBS recording. The actual 2:05 contest edit and its provenance are described in `FINAL_DELIVERY_REPORT.md`. This document remains as the historical capture plan.

The video must show **real Twitch operation**, the OBS scene and how Codex built the project. Demo chat is supplemental and must be labeled. Do not record until LIVE and OBS audio are verified. Avoid unrelated copyrighted music, game footage or third-party marks without permission.

| Time | Screen and action | Narration / caption |
| --- | --- | --- |
| 0:00–0:15 | Three panes: Twitch channel chat, ChatChorus control panel, OBS overlay. Show the source badge. | “ChatChorus turns a stream's chat into an original orchestra. Each message changes the score; each viewer has a voice.” |
| 0:15–0:35 | Click **Connect Twitch** if not already authorized. Show `LIVE_CONNECTED`; keep tokens and the OAuth callback URL out of view. | “The local controller reads real chat through Twitch EventSub. Tokens stay on this machine.” |
| 0:35–1:05 | Send two **real** chat messages, ideally from two viewers. Show Twitch chat, matching LIVE feed rows, overlay pulses and audible notes. | “Here are two real messages. Their notes land on the beat and fit the current harmony.” |
| 1:05–1:25 | Show OBS Browser Source and audio mixer meter while the arrangement continues. Display **Audio running in this browser**. | “The separate OBS scene renders the music visually and sends its own audio into OBS.” |
| 1:25–1:45 | Select **HYPE** mood, send one real hype message, then click **Emergency stop**. | “The streamer can steer the mood and stop audio immediately.” |
| 1:45–2:00 | Optional: select **Burst** in the public showcase. Keep the **DEMO** badge fully visible. | “This labeled simulation stress-tests burst limiting; it is not Twitch traffic.” |
| 2:00–2:25 | Show `server/eventsub.ts`, `src/music.ts`, `npm test` output and Codex `/status` with primary Session ID. | “Codex helped build the EventSub lifecycle, music engine, visual scene and regression tests. Primary session: `01a1873b-d813-7d70-9e13-65ca2449847b`.” |
| 2:25–2:35 | Return to real Twitch/OBS with active soundtrack. Show actual GitHub and public showcase URLs only after publication. | “Your chat becomes part of the performance.” |

Keep the video **under three minutes**. The official [rules](https://twitchcon-codex.devpost.com/rules) require Twitch functioning and Codex build footage; [FAQ](https://twitchcon-codex.devpost.com/resources) says unlisted YouTube is acceptable, while private videos are not.

## Available local recording helper

`ffmpeg` is installed and its `gdigrab` and `dshow` capture devices are present. `scripts/record_demo.ps1` is a prepared **real desktop and selected audio-device recorder**; it has not been run. The owner must choose an available DirectShow audio device and confirm its capture includes OBS output. To list devices, run `ffmpeg -hide_banner -list_devices true -f dshow -i dummy`. Then run, for example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\record_demo.ps1 -AudioDevice 'YOUR AUDIO CAPTURE DEVICE' -DurationSeconds 165
```

The script saves a unique MP4 in ignored `recordings/`, never overwrites an existing file, and does not upload. Inspect the result for true LIVE footage, sound, readability and accidental exposure of secrets before any publication.

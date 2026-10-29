# Windows restart recovery — 2026-10-29

Canonical Pulse checkpoint at recovery: **91** (`CHAT_CHORUS_TWITCHCON_2026`). The separate `main` repository was clean at commit `9738b78`; no remote was configured. `node_modules` and the prior build survived. Port 8787 was free, so the earlier controller was no longer running. No `.env` file or recording was present. GitHub CLI was installed but its current authentication token was invalid.

## Checks performed after restart

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test` | PASS, 12/12 across four files |
| `npm.cmd run build` | PASS |
| `npm.cmd run build:showcase` | PASS |
| `npm.cmd run preflight:publish` | PASS, no issues; `github_remote=NOT_SET`, `publication_ready=false` |
| Pulse targeted tests | PASS, 11/11 |
| Local controller | Restarted on `127.0.0.1:8787`; `/` and `/overlay` HTTP 200 |
| Safe API status | `DEMO`, `DISCONNECTED`, `configured=false`, `liveSeen=false` |

PowerShell's `npm.ps1` shim is blocked by this machine's execution policy; `npm.cmd` runs the same package scripts without changing Windows policy. No dependency reinstall or Windows startup change was needed.

Read-only reconciliation found one canonical My Builds row `build_e9607624e10c7d5011889850` for project `50228`, linked to Hackathon Radar `hro_65fe3ea37c9fbcd3ab4129ed`. Its GitHub and demo links remain empty, submission is not confirmed, award and receipt are empty, and Evolution Score delta is zero. Existing Evolution project events contain locally hash-verified build and test evidence; they do not prove a Twitch or OBS user outcome.

The official [Devpost rules](https://twitchcon-codex.devpost.com/rules) and [FAQ](https://twitchcon-codex.devpost.com/resources) were rechecked on 2026-10-29: repository URL, English description, primary Codex session ID, and a YouTube video under three minutes showing actual Twitch operation and Codex build footage are required. FAQ permits unlisted YouTube videos. The stated deadline is November 2, 2026 at 14:00 Pacific; the FAQ also says 21:00 UTC, which conflicts with the PST label. Retain **21:00 UTC** as the conservative internal cutoff and check the live Devpost countdown.

Pending owner actions remain real Twitch application credentials and local OAuth authorization, a real `channel.chat.message`, OBS audio meter and recording, GitHub authentication, explicit approval before public GitHub/Cloudflare/YouTube publication, and explicit approval before Devpost submission. No public operation was performed during recovery.

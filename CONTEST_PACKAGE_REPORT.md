# Contest package verification — 2026-10-29

## Local deliverables

- Separate local Git repository under `projects/chatchorus/`, branch `main`. No remote or public repository exists yet. The proposed URL in the showcase is publication pending.
- Static showcase in `showcase/` and `src/showcase.ts`, built with the existing Vite, music and audio modules. Six scenes are labeled DEMO. The static bundle does not call the local API, open WebSockets or contain Twitch credentials.
- Cloudflare Pages setup, Devpost English draft, Codex evidence map and a 2:35 video shot list are prepared. The FFmpeg helper can record the real desktop and a selected audio device; no recording was made or fabricated.
- No project-level license has been granted. The source and visual assets are original project work; dependency license metadata and publication constraints are recorded in `LICENSE_REVIEW.md`.

## Verification receipts

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 12 tests across 4 files |
| `npm run build` | PASS |
| `npm run build:showcase` | PASS, static `dist-showcase/` |
| `npm run preflight:publish` | PASS, 37 tracked files, no secret/path issues; `publication_ready` remains false because remote and approval are absent |
| Showcase HTTP smoke | `GET /` 200 and bundled JS 200 at `http://127.0.0.1:4173/` |
| Pulse targeted regression | PASS, 11 tests in `test_teacher_builds_integration_v1.py` and `test_project_evolution_bridge_v1.py` |
| `git diff --cached --check` | PASS |

The HTTP smoke confirms delivery, not visual QA, Twitch LIVE or OBS audio. Twitch OAuth and OBS verification remain with the owner. GitHub CLI authorization currently reports an invalid token; no remote creation or push was attempted. Do not publish, upload a video or submit Devpost without owner approval.

## Canonical Pulse linkage

- Canonical project `50228`, existing My Builds row `build_e9607624e10c7d5011889850`, Hackathon Radar opportunity `hro_65fe3ea37c9fbcd3ab4129ed`.
- `github_link` and `demo_link` remain empty until their real public URLs are verified. No duplicate project or build was created.
- The project event ledger records this local iteration and tests. Evolution Score delta remains zero; no capability promotion or prize revenue is claimed.

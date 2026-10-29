# ChatChorus local verification — 2026-10-29

## Verified

- `npm run typecheck`: PASS, TypeScript no emit.
- `npm test`: PASS, 1 file / 4 tests. Covered scale membership and quantization, stable solo voice, duplicate event IDs, 24-note global burst cap, reset and all six deterministic demo event lists.
- `npm run build`: PASS, Vite 7.3.7 production build. Output includes `dist/index.html` and bundled JS/CSS.
- `npm start`: PASS; Node 22.23.1 bound `127.0.0.1:8787`.
- Local HTTP smoke: `GET /api/status` returned `DEMO` / `DISCONNECTED`; `POST /api/demo` with `one` produced one recent event; `GET /overlay` returned HTTP 200 with the ChatChorus page; `POST /api/demo` with `burst` selected Burst; `POST /api/disconnect` returned `DISCONNECTED` / `DEMO`.
- The My Builds row `build_e9607624e10c7d5011889850` points to canonical project `50228`, with `IN_DEVELOPMENT` state and Hackathon Radar reference `hro_65fe3ea37c9fbcd3ab4129ed`. No reward or Evolution Score was claimed.

## Limits and open verification

- Twitch OAuth, EventSub subscription and receipt of a real `channel.chat.message` were not executed: no owner Twitch app credentials or authorized channel session were available. The Twitch OAuth documentation does not describe PKCE parameters, so the approved PKCE exchange still needs a real compatibility check.
- OBS Browser Source audio unlock, mixer meter and recording were not tested on the owner's OBS installation. The local HTTP overlay response is not a visual or audio acceptance test.
- Pixel layout, mobile interaction, keyboard flow and contrast have code-level CSS support but no browser automation or manual visual receipt yet.
- Pulse targeted regression run: `tests/test_teacher_builds_integration_v1.py` plus `tests/test_project_evolution_bridge_v1.py` gave 10 pass / 1 fail. `test_isolated_project_learning_cycle` expects `spiral.tick` for 2026-10-26 08:00 Kyiv to return `COMPLETE`, but the canonical source DB already holds that historical slot as `DEGRADED` with failed `discovery`. The test copies this DB and gets the saved result. This failure is not attributed to the new `IN_DEVELOPMENT` constant without further evidence.

## Development lesson

In this sandbox, esbuild's default configuration bundling tried to read `../../..` and failed with access denied, while Vite and Vitest worked with `--configLoader runner`. Node's `--experimental-strip-types` runs the local TypeScript server without the `tsx` temporary-directory failure. The ordinary `npm test`, `npm run build` and `npm start` commands now use those working paths. This is a local, evidenced workaround; it is not an independently promoted Pulse capability.

## Latest public product verification — 2026-10-29

The section above records the first local build. The current public product has a newer [completion review](PRODUCT_COMPLETION_REVIEW.md) with deployment IDs and open gates.

- `npm.cmd run typecheck`: PASS; `npm.cmd test`: 20/20 in 5 files; `npm.cmd run build:public` and `npm.cmd run build:showcase`: PASS.
- `npm.cmd run preflight:publish`: PASS, zero issues; 4 nonempty local secret values compared against the public bundle without printing them.
- Production browser: DEMO audio and notes, 390 px mobile, keyboard Connect, reduced motion, invalid OBS key and 1920 px transparent overlay check passed. The authenticated UI/control requests and overlay status were **synthetic**.
- Production HTTP: health 200, invalid OAuth callback 403, unsigned webhook 403, unauthorized overlay mutation 401.
- Owner reported production OAuth and actual Twitch chat before this design update. Real post-update OBS audio, second broadcaster isolation and recovery remain unverified.

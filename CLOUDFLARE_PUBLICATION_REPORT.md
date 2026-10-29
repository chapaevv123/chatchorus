# ChatChorus Cloudflare Pages publication — 2026-10-29

The owner approved publication of the existing static showcase. One Cloudflare Pages project named `chatchorus` was created in the existing account after a read-only project list returned `[]`. Wrangler 4.155.0 uploaded only the four files in `dist-showcase/` as a production deployment from branch `main`, source commit `a107b7a`. The public site is <https://chatchorus.pages.dev/>. Deployment ID: `dd2b8719-62e3-4265-bfea-2623b68180bf`.

## Before upload

- Typecheck and 12 ChatChorus tests passed. `npm.cmd run build:showcase` produced four files totaling 100,700 bytes; `npm.cmd run preflight:publish` passed with zero issues.
- The static output was scanned for API and OAuth routes, WebSocket endpoints, Twitch client secrets, auth-token and private-key patterns, private Windows paths, and server imports. No matches were found. Only `dist-showcase/` was uploaded; the local Twitch controller, `.env` and video files were excluded.
- The verified GitHub URL was embedded in the build. No YouTube ID or Devpost URL was supplied. The video remains a real-recording poster with a pending-link label.

## Public verification

- Unauthenticated `https://chatchorus.pages.dev/` returned HTTP 200. Published image returned HTTP 200 `image/webp`; JavaScript returned HTTP 200 `application/javascript`. The linked GitHub repository returned HTTP 200.
- Headless Chromium loaded the production URL without page errors. The page contained two links to the real GitHub repository; the poster loaded at natural width 1600 px; the video placeholder was visible and no YouTube iframe existed.
- Clicking Start the demo reported audio playing. Clicking One produced one note and one feed entry; Hype showed `DEMO · HYPE` with two feed entries. Stop audio returned to the locked state. At a 390 px viewport, document width was 390 px, with no horizontal overflow.
- My Builds canonical project `50228` should carry this URL as `demo_link`; Evolution evidence records the publication without a Score promotion. YouTube and Devpost remain unpublished and require separate owner decisions.

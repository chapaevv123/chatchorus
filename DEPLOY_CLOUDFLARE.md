# Static showcase deployment plan (Cloudflare Pages)

The public showcase is a static browser-only build. It contains the same musical engine and Web Audio instrument as the local Twitch app, but no OAuth controller, tokens, backend, or EventSub connection. All public interaction is labeled **DEMO**. Do not deploy `dist/` (the local control UI); deploy only `dist-showcase/`.

## Local preflight

```powershell
npm ci
npm run typecheck
npm test
npm run build:showcase
```

Expected artifact: `dist-showcase/index.html` plus bundled CSS/JS and the real-video poster in `dist-showcase/assets/`. The build must contain no `/api/`, `WebSocket`, `TWITCH_CLIENT_SECRET` or OAuth callback strings. Until verified public URLs are supplied, GitHub, YouTube and Devpost are displayed as pending labels, without broken or invented links.

## After owner approval and repository publication

1. In Cloudflare Dashboard, create a **Pages** project using **Connect to Git** and choose the ChatChorus repository. Confirm the account's Free plan and project settings before approving deployment.
2. Use repository root `/`, build command `npm run build:showcase`, output directory `dist-showcase`, and Node version `22.23.1` (the repository has `.node-version`). Set only verified optional public values: `VITE_PUBLIC_GITHUB_URL` (actual repository URL), `VITE_PUBLIC_YOUTUBE_ID` (11-character ID of the approved public/unlisted video), and `VITE_PUBLIC_DEVPOST_URL` after submission. Rebuild the site when any URL becomes available. Do not configure Twitch environment variables on Pages.
3. Review the preview URL, try **Start the demo**, **One**, **Hype**, **Burst**, **Calm**, **Stop audio**, keyboard controls and a narrow mobile viewport. Verify the badge says DEMO, the LIVE video section shows the actual YouTube embed only after upload, and each public link resolves to the actual destination.
4. Publish to the public `pages.dev` URL only after owner approval. Record the real deployment URL in canonical My Builds `demo_link`; do not set it to a proposed URL.

This plan follows [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/). Cloudflare documents a Free plan with Pages build limits; account eligibility and current quota still need owner confirmation. No Pages project or public deployment was created during preparation.

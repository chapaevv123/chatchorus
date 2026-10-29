# Originality and license review — 2026-10-29

- ChatChorus application code, CSS, canvas visuals and synthesized music were created for this contest during the submission window. The repository contains no stock photos, recorded music, borrowed game footage or copied UI template. The public demo's chat messages are synthetic and labeled DEMO.
- Direct and transitive installed package metadata observed in `node_modules` listed MIT, ISC, Apache-2.0, BSD-3-Clause and 0BSD licenses. Five `rxjs` subpath package manifests lacked their own license metadata; the root `rxjs` package carries its license. Dependency use remains subject to each package's actual license text.
- No repository-level open-source license has been selected by the owner. A public repository without a license is readable for judging but does not grant general reuse rights. The official competition rules allow a public or private repository; a private entry must grant judges access as specified by Devpost.
- Secrets are excluded by `.gitignore` (`.env`, `.env.*`, `.dev.vars`), and the prepared source scan found no GitHub token, OpenAI key, private-key block or long Bearer token. Run the publication preflight again immediately before any push.
- Before publishing, the owner must confirm that all code and any recorded video are theirs to submit, that the Twitch/OBS footage contains no unlicensed third-party material, and whether to add a repository license. No legal determination is inferred from this technical review.

[Official contest rules](https://twitchcon-codex.devpost.com/rules) permit standard frameworks and libraries but require a newly created entrant-owned project and the rights to third-party integrations and submitted materials.

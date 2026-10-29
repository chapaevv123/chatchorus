# GitHub publication preflight — ChatChorus

Date: 2026-10-29. This is a **read-only preparation record**. No repository was created or pushed.

## Account and duplicate check

- Inside the restricted command sandbox, `gh auth status` reported an invalid token, while `gh api user` failed with `connectex: ... forbidden by its access permissions`. The sandbox blocked GitHub API network access, so that result did not establish bad credentials.
- A read-only GitHub CLI check outside that network sandbox confirmed `chapaevv123` as the active account, HTTPS Git operations, and `repo`, `workflow`, `read:org`, `gist` scopes. No token value was displayed or stored in this record. Reauthentication is unnecessary.
- A read-only list returned **54** repositories in `chapaevv123`; none had `chorus` in its name. `gh repo view chapaevv123/chatchorus` returned “Could not resolve to a Repository”. This is a point-in-time duplicate check; repeat it immediately before creation.

## Local repository

- Existing source: `projects/chatchorus`, branch `main`, commit `9535ada` before this preflight note. No remote is configured.
- `npm.cmd run preflight:publish` passed with 51 tracked files and no issues. `.env`, the original and final MP4s, builds, `node_modules` and recordings are ignored.
- A read-only scan of **61 historical text blobs** found no tracked `.env`/media path, GitHub/OpenAI token, private key, long Bearer token, or nonempty `TWITCH_CLIENT_SECRET` pattern. This is pattern-based screening, not a guarantee about every possible secret format.
- `README.md` includes the verified small screenshots and animations. Large videos will be linked from YouTube after separate approval, not pushed to Git.

## Exact publication command — run only after owner approval

From `C:\Users\Win10_Game_OS\Pulse\projects\chatchorus`:

```powershell
gh auth status -h github.com
npm.cmd run preflight:publish
git status --short
gh repo view chapaevv123/chatchorus --json nameWithOwner,url
```

The last command should still report no repository. Stop if one exists and reconcile it before any write. After the owner explicitly approves **public GitHub publication**, run:

```powershell
gh repo create chapaevv123/chatchorus --public --source . --remote origin --push --description "ChatChorus turns Twitch chat into an original live orchestra and OBS scene"
```

Then verify the actual repository URL and public visibility with `gh repo view chapaevv123/chatchorus --json url,visibility,defaultBranchRef`, verify `git remote -v` and `git status --short`, and only then write the confirmed URL to My Builds `50228` and rebuild the static showcase with `VITE_PUBLIC_GITHUB_URL`.

This command creates a public GitHub repository and pushes the full local Git history. It has **not** been executed. Cloudflare, YouTube and Devpost each remain separate external operations with their own approval gates.

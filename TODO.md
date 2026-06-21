# TODO: Claw Empire Core

**Last audited:** 2026-05-24  
**Status:** Stable v2.0.4, clean working tree, all tests gated in CI pipeline  
**Path:** claw-empire

## 🚧 BOTTLENECKS — Need from Stockton

- [x] **Docker `.env.docker.private` setup** — Resolved: `.env.docker.private` stays gitignored (correct — it holds secrets), and a committed `.env.docker.private.example` template + README generation steps now document how container users create it. (2026-06-19)
- [x] **Stale `.env.docker` path** — Resolved/clarified: `.env.docker` IS tracked (whitelisted in `.gitignore`); compose loads `.env.docker` (non-secret, committed) + `.env.docker.private` (secrets, gitignored). Documented in README. (Original note was stale.) (2026-06-19)

## 👤 Stockton's tasks

- [ ] Verify Docker deployment pipeline (Dockerfile builds cleanly, compose runs on target infra)
- [x] Document `.env.docker` / `.env.docker.private` generation for containerized deployments — README "Prepare environment files" now points at `.env.docker.private.example` with the `randomBytes(32)` generation command and the required-secrets list. (2026-06-19, Claude)
- [ ] Audit OpenCode Go and Bailian Coding Plan presets post-v2.0.4 integration (Settings > API presets)
- [ ] Test Kimi Code end-to-end flow (provider selection → task execution → skill routing)

## 🤖 Claude's tasks

- [x] **Add `.env.docker` template** — Created `.env.docker.private.example` (committed, fill-in-the-blanks secrets template mirroring `.env.example`) and whitelisted `*.docker*.example` in `.gitignore` so templates can actually be tracked. (2026-06-19)
- [x] **Resolve Docker env references** — Confirmed `.env.docker` is already tracked and `.env.docker.private` is correctly gitignored; documented the split + private-secret generation in README and the new template. (2026-06-19)
- [ ] **Grep full codebase for TODO/FIXME** — Ripgrep timed out on full project (>20s); run locally to capture any sprint backlog — **M**
- [ ] **Pre-existing format gate red: `src/styles/theme.css` + `src/styles/utilities.css`** — Found 2026-06-20 while doing the `--th-accent` work: both CSS files fail `pnpm format:check` (Prettier) on the *committed* version, independent of any new edit. Prettier wants to expand their compact one-liner selector style — running `format --write` rewrites ~720 lines in `theme.css` alone (pure whitespace, no behavior change). Left it OUT of the accent commit on purpose so a 700-line reformat doesn't bury a 3-line refactor. Do this as its own standalone "chore(format): prettier the CSS" commit so `format:check` goes green — **M**
- [ ] **Verify E2E test isolation** — Post-v2.0.4 `.tmp/e2e-runtime` reset logic; confirm Playwright no longer reuses port 8810 by default — **M**
- [ ] **Cross-check migration script `auto-apply-v1.0.5.mjs`** — Hooked in all `pre*` scripts; verify it's idempotent for repeated dev runs — **M**
- [x] **Theme the text-selection + Firefox scrollbar** — Added theme-aware `--th-selection-bg`/`--th-selection-text` (cyan-tint dark, blue-tint light) in `src/styles/theme.css` and a global `::selection`/`::-moz-selection` rule + Firefox `scrollbar-width: thin; scrollbar-color` on `html` in `src/styles/utilities.css`. Highlighting text now matches the app palette instead of the browser-default blue, and Firefox scrollbars match the WebKit thumb (previously webkit-only). Pure presentation. Verified Vite transforms + serves both CSS modules with no errors. (2026-06-20, Claude) — follow-up idea: surface the accent color as a single `--th-accent` token so selection/focus/links share one source of truth.
- [x] **Pre-hydration loading splash** — Added a branded static splash inside `#root` in `index.html` (logo pulse + gradient wordmark + bouncing dots, dark-navy theme, `prefers-reduced-motion` guard). Paints instantly so first frame is a branded screen instead of a black void; React's `createRoot().render()` wipes it on mount. Also gitignored `.tmp/`. Verified computed styles in a real browser. (2026-06-20, Claude) — follow-up idea: make the splash read `data-theme` from localStorage so it matches light mode on reload.
- [x] **Theme-match the loading splash (no light-mode flash)** — `index.html` now runs a tiny synchronous inline script in `<head>` that reads `localStorage["climpire_theme"]` and sets `data-theme` on `<html>` before first paint (mirrors `ThemeContext.tsx`, defaulting to light). Added `[data-theme="light"] #app-loader` overrides that repaint the splash in the cream light palette (bg `#f7f3ec`, dark text) matching `theme.css`. Light-mode users (the default) no longer see a dark-navy flash on reload. Verified in a real browser via computed styles: dark splash = navy `rgb(20,20,58)→rgb(10,10,24)`, light splash = cream `rgb(255,253,248)→rgb(247,243,236)`, and the script picks light for null/unknown + dark only for "dark". Also ran `index.html` through Prettier — it was failing the project's `format:check` HTML glob (added by today's splash markup), so this clears a latent red format gate. (2026-06-20, Claude) — follow-up idea: surface the splash's gold accent + the `--th-accent` token from a single source so brand color has one home.
- [x] **Accent color = single source of truth (`--th-accent`)** — The thrice-repeated follow-up above is done. `src/styles/theme.css` now defines `--th-accent` (hex) + `--th-accent-rgb` (space-separated channels) once per theme, and `--th-focus-ring`, `--th-focus-ring-shadow`, and `--th-selection-bg` all derive from them via `var(--th-accent)` / `rgb(var(--th-accent-rgb) / <alpha>)`. Change the accent hue in one place and the focus ring + focus glow + text-selection tint all follow. Pure refactor, **zero visual change** — verified in a real browser (live app on :8800) by reading computed styles: dark `--th-focus-ring` resolves to `rgb(56,189,248)` (was `#38bdf8`) and selection to `rgba(56,189,248,0.3)`; light `--th-focus-ring` resolves to `rgb(37,99,235)` (was `#2563eb`) and selection to `rgba(37,99,235,0.22)` — identical to the old hardcoded values. (2026-06-20, Claude)

## ✅ Recently shipped

- v2.0.4 (2026-03-12): Docker first-class support, stale agent recovery, Kimi Code end-to-end, official API presets (OpenCode Go, Bailian), hydrated pack API assignment
- E2E runtime safety: reset `.tmp/e2e-runtime` before + after Playwright, opt-in server reuse via `PW_REUSE_EXISTING_SERVER=1`
- Emoji picker translation regression test (decision-request multiline/Korean parsing) — `src/components/chat/decision-request.test.ts:5-20`

## ⚠️ Memory mismatch detected

None. Memory from 2026-05-20 accurately reflects current state:
- v2.0.4 version stamp in `package.json:3` ✓
- TypeScript/Vite/SQLite/Docker stack confirmed ✓
- SQLite DB exists + recent (`claw-empire.sqlite`, last updated 2026-04-16 3:45 PM) ✓
- Clean main branch, dev branch tracking origin/dev with PR #66 merge ancestry ✓
- CI pipeline gates: format, lint, OpenAPI contract, type check, build, e2e tests ✓

## 🔍 Gap analysis — added by Claude 2026-06-08

- [ ] **Fix the stuck push (wrong GitHub owner on `origin`)** — Right now `main` is 9 commits ahead but can't be pushed because the `origin` remote points at a GitHub account that isn't the one logged in here (`origin` = `GreenSheep01201/claw-empire`, but the saved login is `stocktonsassistant-web`). Good news: a second remote called `aettam` (`Aettam/claw-empire.git`) already exists. Decide which GitHub repo is the real home, then either get added as a collaborator on it or repoint `origin` to a repo you own — and push so those 9 commits stop living only on this PC. (This is the #1 thing keeping your work from being backed up online.)
- [ ] **Actually stand up the public deploy — or decide to stay local** — The `deploy/` folder has finished server setup files (systemd + nginx) for putting this online, but it's never been deployed anywhere public. Either follow those configs to launch it on a server, or make a clear note that it's intentionally local-only, so this half-built deploy path stops being a loose end.
- [ ] **Confirm the database is being backed up somewhere** — The live data lives in one SQLite file (`claw-empire.sqlite`) that is correctly NOT committed to git. That's right for git, but it also means there is no copy anywhere if this PC dies. Set up a simple scheduled copy of that file to Dropbox/another drive so a disk failure doesn't wipe the whole pretend-company's state.

---

## Claude triage - 2026-06-09 (agent fleet scan)
_A fleet of Claude agents read this list on 2026-06-09 and sorted what is left._

**Claude can do these anytime - just ask:**
- [medium impact / small effort] Docker `.env.docker.private` setup â€” file referenced in docker-compose.yml:12 but not tracked; needs template or documented generation path
- [medium impact / small effort] Stale `.env.docker` path â€” compose references .env.docker but only .env + .env.example exist; clarify Docker-vs-local env separation
- [low impact / small effort] Document `.env.docker` / `.env.docker.private` generation for containerized deployments
- [medium impact / small effort] Add `.env.docker` template â€” create `.env.docker.example` mirroring `.env.example` structure for container users
- [medium impact / small effort] Resolve Docker env references â€” either create tracked `.env.docker` files or update compose to reference only `.env`
- [low impact / small effort] Grep full codebase for TODO/FIXME â€” ripgrep timed out on full project; run locally to capture any sprint backlog
- [medium impact / medium effort] Verify E2E test isolation â€” post-v2.0.4 `.tmp/e2e-runtime` reset logic; confirm Playwright no longer reuses port 8810 by default
- [medium impact / medium effort] Cross-check migration script `auto-apply-v1.0.5.mjs` â€” hooked in all `pre*` scripts; verify it's idempotent for repeated dev runs
- [high impact / small effort] Fix the stuck push (wrong GitHub owner on `origin`) â€” repoint origin or push to the existing `aettam` remote so 9 local-only commits get backed up online
- [high impact / small effort] Confirm the database is being backed up somewhere â€” set up a scheduled copy of `claw-empire.sqlite` to Dropbox/another drive

**Waiting on you (signups, keys, payments, decisions):**
- Verify Docker deployment pipeline (Dockerfile builds cleanly, compose runs on target infra)
- Audit OpenCode Go and Bailian Coding Plan presets post-v2.0.4 integration (Settings > API presets)
- Test Kimi Code end-to-end flow (provider selection â†’ task execution â†’ skill routing)
- Actually stand up the public deploy â€” or decide to stay local (deploy/ has finished systemd + nginx configs, never deployed)


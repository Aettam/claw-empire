# TODO: Claw Empire Core

**Last audited:** 2026-05-24  
**Status:** Stable v2.0.4, clean working tree, all tests gated in CI pipeline  
**Path:** claw-empire

## 🚧 BOTTLENECKS — Need from Stockton

- [ ] **Docker `.env.docker.private` setup** — File referenced in `docker-compose.yml:12` but not tracked (git-ignored). Needs template or documented generation path for container deployments.
- [ ] **Stale `.env.docker` path** — Docker compose references `.env.docker` (line 12) but only `.env` + `.env.example` exist in repo. Clarify Docker-vs-local env separation.

## 👤 Stockton's tasks

- [ ] Verify Docker deployment pipeline (Dockerfile builds cleanly, compose runs on target infra)
- [ ] Document `.env.docker` / `.env.docker.private` generation for containerized deployments
- [ ] Audit OpenCode Go and Bailian Coding Plan presets post-v2.0.4 integration (Settings > API presets)
- [ ] Test Kimi Code end-to-end flow (provider selection → task execution → skill routing)

## 🤖 Claude's tasks

- [ ] **Add `.env.docker` template** — Create `.env.docker.example` mirroring `.env.example` structure for container users — **S**
- [ ] **Resolve Docker env references** — Either create tracked `.env.docker` files or update compose to reference only `.env` — **S**
- [ ] **Grep full codebase for TODO/FIXME** — Ripgrep timed out on full project (>20s); run locally to capture any sprint backlog — **M**
- [ ] **Verify E2E test isolation** — Post-v2.0.4 `.tmp/e2e-runtime` reset logic; confirm Playwright no longer reuses port 8810 by default — **M**
- [ ] **Cross-check migration script `auto-apply-v1.0.5.mjs`** — Hooked in all `pre*` scripts; verify it's idempotent for repeated dev runs — **M**

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

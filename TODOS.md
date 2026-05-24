# TODOS

Captured backlog. Each entry has a concrete trigger or unlock condition. Not a wishlist.

## PR-A: Spot-check hardening (Tier-1) — deferred to week 4

**Why deferred:** Per design doc `~/.gstack/projects/niuguy-nearbyAI/feng-main-design-20260523-114753.md` rollout, PR-A ships after the prompt-review transparency UX (PR-T) and after first paid audit attempts. Customer reply signal will shape what hardening details actually matter.

**Architecture findings surfaced during /plan-eng-review on 2026-05-23 (capture before re-review):**

1. **Provenance trinity on PromptRun** — store `temperature`, `seed`, and `systemFingerprint` columns, not just `model` (string). `prisma/schema.prisma:PromptRun` currently stores only `model`. Without these, the "reproducible numbers" moat claim is unfalsifiable. Cost: 1 migration, 3 nullable columns.
2. **Seed composition** — plan §9.3 Tier 1 item 3 says `seed = hash(businessId)`. Use `hash(businessId, promptId, sampleIndex)` instead. The simpler form collapses §9.3 Tier 2 N=5 sampling — every sample becomes identical, defeating the purpose. The richer form gives stable reproducibility per (business, prompt, sample) while still allowing legitimate variance to surface across samples.
3. **Cross-provider determinism is a leaky abstraction** — OpenAI honors `seed`. Gemini via the OpenAI-compatible endpoint may not. Google AI Overviews via SearchAPI definitely doesn't. The dashboard cannot uniformly claim "reproducible" across providers; per-provider labelling required. Verify Gemini seed behavior before publishing the claim.
4. **`OPENAI_OBSERVATION_TEMPERATURE` env-var footgun** — `src/lib/ai/openai-client.ts:196` reads `Number(process.env.OPENAI_OBSERVATION_TEMPERATURE || 0.7)`. Flipping the default to 0 still leaves the env var active; a stale `.env` reverts the moat claim silently. Remove the env var entirely OR add a startup assertion that errors if it is not `"0"` in the observation path.

**Files in scope when re-reviewed:**
- `src/lib/ai/openai-client.ts` (temperature + seed + fingerprint capture)
- `src/lib/process-prompt-job.ts` (pass seed; store fingerprint)
- `src/lib/prompts.ts` (drop `withEvidenceRequest()`)
- `src/lib/extraction-schema.ts` (drop `targetAppears` as required; keep soft fields)
- `prisma/schema.prisma` + new migration (provenance columns)
- New: `src/lib/text/jaro-winkler.ts` or library dependency
- Tests in `src/lib/__tests__/`

---

## E2E Playwright tests for PR-T flows — trigger: first paid agency exists

**Why deferred:** Per /plan-eng-review D9, medium-tier route-handler tests cover the PR-T critical paths. Playwright is ~4–6h of new tooling that doesn't pay back before PMF.

**Trigger:** When the first paid agency runs an audit on the platform, build out Playwright coverage for the 3 user flows captured in `~/.gstack/projects/niuguy-nearbyAI/feng-main-eng-review-test-plan-20260523-221441.md`:
- First-time creation → /prompts → audit
- Edit / re-approve mid-monitoring
- Add custom + audit

**Where to start:** Vitest harness from PR-T already mocks Prisma; reuse the patterns. Add Playwright dep + a single test for the golden path first; expand only on regression.

---

## Custom prompt soft cap — trigger: any business hits >50 user-source prompts

**Why deferred:** Per /plan-eng-review D13, premature without evidence of abuse. Tracking telemetry is cheap; building the cap is not yet justified.

**Action now:** PR-T's POST `/api/businesses/[id]/prompts` should `trackEvent("user_prompt_added", { businessId, userPromptCount })` so the count is queryable.

**Trigger to build the cap:** When any business hits >50 user-source prompts, or any audit's per-business per-week LLM spend exceeds £5, ship a soft cap with friendly message.

**Where to start:** `src/app/api/businesses/[id]/prompts/route.ts` POST handler — add the trackEvent. Watch `~/.gstack/analytics/skill-usage.jsonl` (and Postgres TelemetryEvent rows) for the signal.

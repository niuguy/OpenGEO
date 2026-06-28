# Agentic, human-in-the-loop audit flow

Status: in progress. Steps 1–2 land the foundation (schema + strategist); steps 3–5
replace the front door. This doc is the source of truth for the redesign.

## Why

The audit setup today is a rigid 5-field form (`business-form.tsx`) that hardcodes a
"local business" framing. `POST /api/businesses` routes every target through
`businessToTargetProfile` with `kind: "local_business"` baked in
(`src/lib/targets/target-profile.ts`), so the `brand-reputation` pack and the rest of
the `TargetKind` union are unreachable from the UI even though the data model supports
them. Prompt generation is pure templates with no judgment about whether a prompt fits
the specific target, and the only human checkpoint — toggling DRAFT prompts on the
`/prompts` page — gives the reviewer no reasoning to review against.

The redesign is, in practice, a front-door problem. The back half (run → extract →
`geo-metrics` → snapshot → dashboard) is mature and stays untouched. The agentic work
concentrates in **intake** and **prompt proposal**, and reuses the existing review page
and metrics pipeline.

## Target flow

```
Seed (URL or name)
   │  reuse crawlWebsite + inferBusinessProfile to pre-fill, not ask blind
   ▼
Phase 1 — Adaptive wizard (intake agent under the hood)
   │  • classifies target kind FIRST: local vs national/public brand vs saas/person
   │  • asks only the fields that kind needs
   │      local  → service area, catchment, named competitors
   │      brand  → market category, audience, comparison set (no "location")
   │  • picks the pack from the kind (defaultPackForTargetKind already does this)
   ▼
   ⏸ GATE 1 — confirm context   (the completed wizard card IS the confirmation)
   ▼
Phase 2 — Prompt strategist (packs as floor, agent edits)
   │  • deterministic pack generates the base set (keeps samplingBasis + reproducibility)
   │  • agent returns EDITS not raw prompts: prune / rephrase / a few additions
   │    + a one-line rationale per cluster
   ▼
   ⏸ GATE 2 — review prompts   (existing /prompts page, now showing the rationale)
   ▼
Phase 3–4 — run → extract → metrics → dashboard   (UNCHANGED)
```

## Decisions

- **Intake UX: adaptive guided wizard**, not a conversational chat. Agent-driven
  inference and branching under the hood, presented as a short series of pre-filled
  cards that branch on the target-kind answer. Bounded and fast for a simple audit
  setup; a chat escape hatch can come later if needed.
- **Prompt generation: packs as floor, agent edits.** The deterministic pack is the
  base set; the strategist only prunes, rephrases, and adds a few profile-specific
  prompts. This preserves byte-for-byte reproducibility and the `samplingBasis` audit
  trail, and contains the bias risk flagged in `local-business.ts` (PR-A note) — the
  agent never authors the whole consumer query set.

## Framework

**No new agent framework for now — reuse the house `openai` SDK + `json_schema` strict
pattern** (`src/lib/ai/openai-client.ts`). The earlier proposal favored Vercel AI SDK
v6 + AI Gateway, and that remains the right call *if* the intake becomes a streaming
conversational chat. But the two decisions above remove that need: the wizard does
discrete structured inferences and the strategist does a single structured edit call —
both are exactly what the existing `response_format: json_schema` + Zod-parse pattern
already does across the codebase. Pulling in a parallel framework now would add surface
area for no capability we use yet. Revisit when/if we add the conversational escape
hatch.

Model: intake + strategist are low-volume / high-value, so they can use a stronger
model than the pinned `gpt-4o-mini` observation path. Controlled by a dedicated env var
(`STRATEGIST_MODEL`, default `gpt-4o`) so the cheap extraction path is unaffected.

## Data model changes

`Business`:
- `targetKind String @default("local_business")` — drives pack selection + which wizard
  fields render.
- `status String @default("DRAFT_INTAKE")` — lifecycle: `DRAFT_INTAKE` during setup →
  `ACTIVE` when the user starts the audit.
- `audience String?` — needed by non-local packs (brand-reputation).
- `profile Json?` — the full `TargetProfile` snapshot, for reproducibility.
- `location String @default("")` — was required non-null; national/public brands have
  no meaningful location. Kept non-null (default `""`) to avoid a null-handling ripple
  across the many `business.location` string consumers; fully nullable is deferred
  unless a consumer needs to distinguish "" from null.

`Prompt`:
- `rationale String?` — the strategist's one-line "why" per prompt, surfaced at Gate 2.

## Build sequence

1. **Schema migration + `TargetProfile` Zod schema.** Foundation, no behavior change.
2. **Strategist route + agent.** `POST /api/businesses/[id]/propose-prompts`,
   testable in isolation against a seeded Business.
3. **Intake wizard + agent**, replacing `business-form.tsx`.
4. **Wire Gate 1 → Gate 2 handoff**; show rationale on the review page.
5. **Model wiring + agent eval tests.**

Steps 1–2 are low-risk and independently shippable; the visible UX change is 3–4.

## Progress

- **Step 1 — done.** Migration `20260613120000_agentic_intake_fields` adds
  `Business.targetKind/status/audience/profile` + `location` default and
  `Prompt.rationale`; existing rows are backfilled to `status = 'ACTIVE'`. Apply with
  `pnpm prisma:migrate`. `TargetProfile` Zod contract in
  `src/lib/targets/target-profile-schema.ts` (compile-time guarded against the
  hand-written type).
- **Step 2 — done.** `src/lib/prompts/strategist.ts` (pure `applyStrategistEdits` +
  LLM `proposePrompts`, graceful fallback to the deterministic floor) and
  `POST /api/businesses/[id]/propose-prompts`. `persistGeneratedPrompts` now carries
  `rationale`. Covered by `src/lib/prompts/__tests__/strategist.test.ts` (8 tests).
  Model via `STRATEGIST_MODEL` (default `gpt-4o`).
- **Step 3 — done.** Intake agent (`src/lib/targets/intake-agent.ts`,
  `inferTargetProfile` + deterministic fallback), `POST /api/intake/suggest` (crawl +
  classify, no DB write) and `POST /api/intake/commit` (create Business `DRAFT_INTAKE` +
  propose prompts). `AuditWizard` (`src/components/audit-wizard.tsx`) replaces
  `business-form.tsx` at `/businesses/new` — seed → confirm, with the local-vs-national
  fork as the first control driving which fields render. Covered by
  `src/lib/targets/__tests__/intake-agent.test.ts` (4 tests).
- **Step 4 — done.** Commit redirects to the Gate-2 `/prompts` page; proposed prompts
  persist ACTIVE (opt-out review, since the strategist already prunes); each prompt's
  rationale renders under it. `run-prompts` graduates the business out of
  `DRAFT_INTAKE`. `generate-prompts` (dashboard "regenerate") is now profile-aware via
  the shared `resolveTargetProfile` + strategist, so non-local businesses aren't forced
  back onto local templates.
- **Not yet done — step 5:** stronger agent eval tests and any AI Gateway model wiring.
  Both agents currently run through the house `openai` SDK with `STRATEGIST_MODEL`.

`business-form.tsx` is now unused by `/businesses/new` (the backoffice still posts to
`/api/businesses` directly). It can be removed once the backoffice path is migrated.

Note: `pnpm lint` is currently broken project-wide (ESLint 9 / `@rushstack/eslint-patch`
incompatibility — ESLint fails to start before reading any file). Unrelated to this
change; `tsc --noEmit` and `pnpm test` are the working gates.

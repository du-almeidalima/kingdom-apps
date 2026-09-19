# PR #31 — Step 2: Plan & Progress Tracker

**Purpose of this document:** the single source of truth for **Step 2** (addressing the review feedback on PR #31's route-optimization feature). It contains all context needed to execute the work, a complete task backlog with acceptance criteria, and a progress tracker. Any developer or AI agent should be able to pick this up cold and continue.

**How to use it:**
- Work the tasks top-to-bottom by phase; respect the dependency notes.
- After completing a task: update its `Status` (and add commit SHA + date), run the verification protocol (section 7), and commit with a conventional commit message.
- Never delete or weaken a test to make a change pass. Never change pt-BR UI copy verbatim strings. `assign-*` testids are e2e contracts.
- Decisions that require the repository owner are listed in section 6 — do not guess them.

---

## 1. Context chain (read in order if you are new)

| Document | Where | What it is |
|---|---|---|
| PR #31 conversation | https://github.com/du-almeidalima/kingdom-apps/pull/31 | The original PR by @matinhu + the full review feedback (BUG-*/STR-*/REUSE-*/ALG-* IDs used throughout this plan originate there). **Not stored in this repo** — the task descriptions below inline everything needed. |
| `PR-31-MERGE-STEP-1.md` | repo root | Step 1 handoff: how matinhu's work was merged onto `development`, every conflict resolution, behavior deltas, verification evidence. Updated by the Step-1 reviewer in `37ed2f6`. |
| `PR-31-STEP-2-HANDOFF.md` | repo root | The independent review of Step 1 + this Step 2 task summary (Areas A–E). Written by the reviewing agent. |
| **This document** | repo root | Step 2 plan + progress tracker. |

**Feature summary:** territory `geo` caching (model + Firestore round-trip), a route optimizer (exact TSP ≤15 stops, NN+2-opt above, car-aware split), team/pairing capacity logic, and an assign-page planning panel ("Equipe & distribuição") that auto-selects the stalest territories, distributes them across cars, renders numbered/colored route badges on territory checkboxes, and shares one designation per car via WhatsApp.

**Step 1 outcome (one paragraph):** matinhu's 6 commits were merged onto `development` (63 commits ahead, zoneless/signals world) and semantically ported onto `AssignTerritoriesStateService` + `DesignationsHeaderBO`; the ordering fix was relocated into `DesignationsHeaderBO.batchGetTerritoriesInIds`; `shareForCar` became session-aware; checkbox badge became signal inputs; all gates green. **All review feedback was deliberately deferred to Step 2** except BUG-1's core (shared territories marked assigned/pruned — landed structurally via the state-service port).

## 2. Git state (verified 2026-09-19 — read carefully)

```
local:  feat/territory-route-optimization-dev @ 37ed2f6  (complete, verified)
remote: origin/feat/territory-route-optimization-dev @ eb9fc61  (INCOMPLETE — see below)
```

| Commit | What it is |
|---|---|
| `1d210fb` | Merge of PR #31. **Contains the merge but NOT the conflict resolutions** (see warning below). |
| `041af39` | Merge of upstream `development` (brings the e2e fix `8d8440d`). |
| `eb9fc61` | Step-1 review handoff doc. **This is the pushed remote tip.** |
| `37ed2f6` | The actual port: conflict resolutions + signal port + ordering fix + `replaceSelection` + checkbox signal inputs + checkbox unit tests + Step-1 doc updates. **Authored by Eduardo Lima (repo owner); local only, deliberately not pushed yet.** |

> ⚠️ **The remote branch is feature-less.** During Step 1, all 630 lines of conflict resolutions lived in the working tree but were not captured in the merge commit — every gate (unit/build/e2e) had passed against the *working tree*, not the commit. The Step-1 review caught this and committed the real content as `37ed2f6`. Consequence: `origin/...-dev @ eb9fc61` compiles but contains **no feature** (just development + matinhu's orphan service files). **Task T0.1 (push) is the first action of Step 2.**
>
> **Lesson (now a hard rule, section 8):** gates run against the working tree and prove nothing about the commit. Before every commit: `git status` must show **zero unstaged changes**; after committing: `git show HEAD --stat` and grep a newly-introduced symbol in `git show HEAD:<path>` to prove the content landed.

**Current verification state of `37ed2f6` content:**
- `npx nx test ministry-maps` — **501 passed** (80 suites) [re-verified 2026-09-19]
- `npx nx lint ministry-maps` — clean
- `npx nx build ministry-maps` — success (AOT)
- `npx nx typecheck-e2e ministry-maps` — success
- E2E scoped (`UC-ASSIGN` + `journey-admin-assign-work`) — 28 passed (per Step-1 review)
- E2E **full suite** — 216 passed / 1 skipped (`test.fixme` UC-PROF-07, pre-existing) on the identical tree content *before* the 2 new checkbox tests; **re-run in T0.2**

## 3. Task backlog

Status legend: ☐ pending · ◐ in progress · ☑ done · ⛔ blocked (see note)

### Phase 0 — Hygiene & re-baseline

| ID | Task | Acceptance criteria | Status |
|---|---|---|---|
| T0.1 | **Push `37ed2f6`** to `origin/feat/territory-route-optimization-dev` (restores remote integrity). Confirm with the user first — it was deliberately held. | `git status` clean; remote tip == `37ed2f6`. | ☐ |
| T0.2 | Re-run the **full** e2e suite on `37ed2f6` to re-baseline (the 216-pass evidence predates the 2 new checkbox tests). | `npx nx e2e ministry-maps` green (expect 218 passed / 1 skipped). Record exact numbers here. | ☐ |
| T0.3 | (Decision D7) Confirm history shape for the eventual PR: keep `1d210fb`+`37ed2f6` as-is (recommended: matinhu's commits preserved, port documented) vs. rewriting. | User decision recorded in section 6. | ☐ |

### Phase 1 — Functional bugs (from review: 🔴/🟠)

Fix these **together with** the component extraction (T2.1) — the review's checklist grouped them; the fixes land inside the new panel component and its unit tests.

| ID | Task | Spec | Acceptance criteria | Status |
|---|---|---|---|---|
| T1.1 | **BUG-1 remainder** — auto-distribute pool | Verify `handleAutoDistribute` excludes territories in `state.assignedTerritoryIndex()` on **all** selection passes (Step 1 already filters; lock it with a test). Pool = visible filtered list, stalest-first by `lastVisit`. | Unit test: seeded assigned ids never enter the auto-selection. | ☐ |
| T1.2 | **BUG-2** — dock submit vs active plan | While `plan()` is active, the dock's "Enviar Designação" currently sends **all** selected territories as ONE designation, contradicting per-car sharing. **Decision D1:** (a) disable dock submit while `plan()` is active (minimal, review-preferred), or (b) confirm dialog explaining one bulk designation will be created. Note the dock is `AssignTerritoriesDockComponent` (submit button has no testid; targeted by `title="Enviar Designação"`). | Chosen behavior implemented + unit test; e2e covers it in T6.4. | ☐ |
| T1.3 | **BUG-3** — auto-distribute ignores important alerts | `handleAutoDistribute` may silently auto-select territories with unresolved `MOVED` / `ASKED_TO_NOT_VISIT_AGAIN` alerts (`TerritoryAlertsBO.findImportantAlert`). **Decision D2:** (a) exclude them from auto-selection, keeping manual selection + dialog path (review-preferred), or (b) warning chip on the car card. | Chosen behavior + unit test: alert territory is never auto-selected (option a). | ☐ |
| T1.4 | **BUG-4** — team inputs don't refresh a visible plan | Route all four inputs (`Homens/Mulheres/Carros/Duração`) through one handler; if `plan()` is active, re-run `handleDistribute()` (or invalidate — pick refresh; review-proposed). The economize toggle then no longer needs its special case. | Unit test: change `men` while plan visible → plan recomputed. | ☐ |
| T1.5 | **BUG-7** — `trimToSuggested` wipes the plan | After trimming, if `plan()` was active, re-run `handleDistribute()` with the trimmed selection; only `plan.set(null)` when no plan was showing (the guard matters: trimming a manual selection must not create a distribution unprompted). | Unit test: trim with active plan → car cards/badges persist with trimmed set. | ☐ |

### Phase 2 — Architecture & gating (from review: 🔴/🟠)

| ID | Task | Spec | Acceptance criteria | Status |
|---|---|---|---|---|
| T2.1 | **STR-6** — extract the planning panel component | Move the `<details class="assign-team-panel">` block + per-car cards out of `AssignTerritoriesPageComponent` (~500 lines) into a new standalone component. **Naming (Decision D8):** review suggested `territory-distribution-panel` (`kingdom-apps-territory-distribution-panel` selector) at `features/territory/components/territory-distribution-panel/`; the Step-1 handoff suggested `assign-team-planning`. Contract (review's proposal, adapted to signals): inputs `selectedTerritories` / assigned ids or direct state-service injection; outputs `selectionChange`, `carShared` (page marks ids assigned via state), `planChange` (page maps badges onto checkboxes). Alternative accepted by the review: a feature-scoped state slice both consume. **Do T6.2 (testids) in the same change** — the template moves once. Page goes back to orchestrator: fetch/filter, checkbox list, dock, badge mapping. Keep `DesignationsHeaderBO.createDesignation` the SINGLE designation-creation path. | Page component shrinks to orchestration; panel has its own spec file; all Step-1 behavior preserved (gates green). | ☐ |
| T2.2 | **STR-5** — congregation settings gate (opt-in) | 1) Add `shouldEnableTerritoryRouteOptimization: boolean` (**name = Decision D3**) to `CongregationSettings` (`src/models/congregation.ts`); 2) add `false` default in `src/environments/environment.ts` `congregationSettingsDefaultValues`; 3) gate the panel render via `CongregationSettingsBO.getSettingOrDefault(...)` — exactly how `designationAccessExpiryDays` flows today. Default MUST be `false` (geocoding needs a paid-API backfill not every congregation runs; feature degrades silently without `geo`). | Panel hidden with default settings; visible when congregation doc opts in. Unit + e2e tests (T6.4 scenario 1). | ☐ |
| T2.3 | **STR-1** — dissolve `features/territory/services/` | The repo convention: injectable business logic → **BOs** (`features/<feature>/bo/<name>/<name>.bo.ts`); pure helpers → utils. Merge `TeamDistributionService` + `RouteOptimizerService` into one **`TerritoryDistributionBO`** at `features/territory/bo/territory-distribution/` (the optimizer is an implementation detail of the distribution; they're always used together). Move `capacity.ts` / `pairing.ts` as pure helpers next to the BO (or `features/territory/utils/`). Move their specs accordingly. Update the page/panel `inject()` sites. | No `services/` folder inside any feature; all specs still pass; no behavior change. | ☐ |
| T2.4 | **STR-2** — placement of `shared/route-optimizer/` (**Decision D4**) | Only the territory feature consumes it today. (a) Move under `features/territory/utils/route-optimizer/` (strictest), or (b) keep in `shared/` with a named plausible second consumer (map/statistics distance calcs). Either is defensible; decide consciously. Barrel + pure design stay. | Decision recorded + moved/kept; imports updated if moved. | ☐ |

### Phase 3 — Geocoding & backfill tool (from review: 🟠)

The tool lives at `tools/geocode-territories/` (backfill.mjs + README); it is outside every build/test target.

| ID | Task | Spec | Acceptance criteria | Status |
|---|---|---|---|---|
| T3.1 | **BUG-5** — absolute import path | `backfill.mjs` imports firebase-admin from the author's home dir. Fix via `createRequire` pointed at the functions workspace (where `firebase-admin` is a declared dep): `const require = createRequire(new URL('../../functions/ministry-maps/package.json', import.meta.url)); const admin = require('firebase-admin');` | `node tools/geocode-territories/backfill.mjs --help` runs on any clone. | ☐ |
| T3.2 | **BUG-6** — wrong default emulator port | Default is `127.0.0.1:8081`; repo's Firestore emulator runs on **8080** (`firebase.json`). Default to 8080, keep env-var override, update README. | README + code agree; documented default works out of the box. | ☐ |
| T3.3 | **STR-3** — dedupe geocode parsing (**Decision D5**) | `apps/.../shared/geocoding/geocode-parse.ts` is dead in the app (only its spec imports it) and the tool inlined a **drifted** copy (bbox `-23` vs `-24`; tool adds `Number.isFinite` guard). Review-recommended: make `tools/geocode-territories/` the only home (move parse helpers into `parse.mjs`, delete the app copy + spec). Alternative: keep the tested TS as source of truth and compile/import from the tool. **One copy must go.** | Single source of truth; no drifted duplicates. | ☐ |
| T3.4 | **STR-4** — parameterize the region | Hardcoded tri-city bbox (`lat -21..-23/lng -46..-48`) + hardcoded `, SP` state suffix break every other congregation. Add `--bbox latMin,latMax,lngMin,lngMax` flag (documented tri-city default) + region suffix derived from data (`Congregation.locatedOn`) or a `--region-suffix` flag. Document both in README ("use your congregation's region"). | A non-SP congregation's pins pass the bbox and queries. | ☐ |

### Phase 4 — Design system & reuse (from review: 🟠/🟡)

| ID | Task | Spec | Acceptance criteria | Status |
|---|---|---|---|---|
| T4.1 | **REUSE-1** — common-ui buttons | Replace `.assign-optimize-btn`, `.assign-auto-btn`, `.assign-share-btn`, `.assign-trim-btn` with `button[lib-button]` (`btnType='primary'|'secondary'` — see invite/territory dialogs for the pattern). Delete the custom button CSS; keep only feature-specific spacing in SCSS. | No bespoke button styling left; gates green. | ☐ |
| T4.2 | **REUSE-2** — common-ui form fields | Team inputs use raw `<input type="number">`. Convert to `lib-form-field` + `label[lib-label]` + `input[lib-input]` (pattern: `invite-create-dialog-form.component.ts`). | Panel inputs match app-wide form look. | ☐ |
| T4.3 | **REUSE-3** — color tokens | `CAR_COLORS` hand-copies 8 Tailwind hexes; badge/button green `#45c06c` is not a palette color (shared greens: `green200 #bbf7d0` … `green500 #22c55e` in `libs/common-ui/src/lib/styles/abstract/variables.ts`); SCSS carries more raw hexes (`.assign-over`, `.assign-warn`). One-off styling → Tailwind utilities; TS-needed colors (car colors) → define once (extend common-ui tokens or Tailwind config) and reference from both the array and SCSS. | No magic hex in two places; palette-consistent colors. | ☐ |
| T4.4 | **STR-8** — `GeoStatusEnum` | Inline `geoStatus?: 'ok' | 'approx' | 'failed'` → `models/enums/geo-status.ts` (`GeoStatusEnum`), matching `RoleEnum`/`VisitOutcomeEnum` conventions; update `Territory` + `FirebaseTerritoryModel` + converter typing. | Union lives in one typed enum; no behavior change. | ☐ |

### Phase 5 — Algorithm clarity (from review: 🟡, logic is correct & fuzz-tested — decisions + readability only)

| ID | Task | Spec | Acceptance criteria | Status |
|---|---|---|---|---|
| T5.1 | **ALG-1** — pairing rule + notation | (a) **Decision D6:** `formGroups` enforces strictly same-sex groups (a 1-man + 1-woman crew yields ZERO groups — deliberate, surfaced, well tested). Confirm keep as-is vs. plan a future opt-in congregation setting (no code change now). (b) Fix the notation collision: `WorkGroup.label` uses `M`/`W` (Men/Women) while `groupMakeup` renders `H`/`M` (Homem/Mulher) — the same letter means opposite genders. Drop the `label` field (nothing renders it) or rename to `H`/`M`; also remove `'WWM'` from the doc comment (algorithm never produces it). | (b) landed; (a) decision recorded. | ☐ |
| T5.2 | **ALG-2** — solver dispatch readability | `shared/route-optimizer/`: `solveTour` throws `StepCapExceededError` >15 although a heuristic exists; `EXACT_TSP_MAX_N = 15` and `HEURISTIC_MAX_N = 15` are two names for one number; docstrings reference an origin project (`step_cap_exceeded` API, "Intended for 10 < N <= 15" — the service only calls NN+2-opt above 15). Either dispatch to the heuristic inside `solveTour` (drop the throw) or rename to `solveExactTour`; collapse the constants; fix the stale docstrings. | Next reader understands dispatch without re-deriving; specs still pass. | ☐ |

### Phase 6 — Tests & e2e (from review: 🟠 — highest-value phase)

| ID | Task | Spec | Acceptance criteria | Status |
|---|---|---|---|---|
| T6.1 | **STR-7 unit** — the ported/new flows | Add specs (page or extracted panel) covering: auto-distribute selects stalest N & two-pass refinement; excludes assigned (T1.1) & alert territories (T1.3); team-change refreshes plan (T1.4); trim re-distributes (T1.5); car share marks ids assigned + unselects + button shows "Compartilhado" + error toast on failure; dock-submit gating per D1 (T1.2). Follow `.agents/rules/unit-testing.md` (ng-mocks + MockBuilder, zoneless). | All new behaviors unit-locked. | ☐ |
| T6.2 | **E2E testids** (do with T2.1) | Add `data-testid`s: `assign-team-panel` (the `<details>`), `assign-team-men`, `assign-team-women`, `assign-team-cars`, `assign-team-duration`, `assign-optimize-btn`, `assign-auto-distribute-btn`, `assign-car-card`, `assign-car-share-btn` (per card), `assign-route-badge` (checkbox badge). Extend `e2e/page-objects/assign-territories.page.ts` with locators + actions: `fillTeam()`, `optimize()`, `autoDistribute()`, `shareCar(index)`. | Page object compiles (typecheck-e2e); existing tests unaffected. | ☐ |
| T6.3 | **Seeder GeoPoint** (critical converter contract) | The app's read converter does `geo: data.geo ? {lat: data.geo.latitude, lng: data.geo.longitude} : undefined`. A plain `{lat,lng}` map written by the seeder survives as a map → app sees `{lat: undefined, lng: undefined}` which is **truthy** → passes the `t.geo` filter → haversine `NaN` → garbage route instead of "unlocated". Admin SDK does NOT auto-convert nested objects. In the seeder territory write: `geo: territory.geo ? new admin.firestore.GeoPoint(territory.geo.lat, territory.geo.lng) : undefined`. Add a dedicated spec: seed a plain-map geo doc via `db.firestore` directly → UI must treat it as unlocated (guards the converter contract). | Seeded geocoded territories usable in e2e; contract spec passes. | ☐ |
| T6.4 | **E2E specs UC-ASSIGN-25+** | Extend `territories-assign.spec.ts` (or sibling `territories-assign-route.spec.ts`). Allocate next free UC ids (catalog currently ends at UC-ASSIGN-30 — **check the file, ids may have advanced**); add a `J-09` journey entry only if the full auto-distribute → per-car share → publisher-sees-ordered-list flow is covered. Scenarios (highest value): (1) **feature gate** — default settings hide the panel; `settings.shouldEnableTerritoryRouteOptimization: true` congregation shows it (`buildCongregation` accepts settings overrides); (2) **auto-distribute** — seed N territories with known `lastVisit` + `geo` (line of coordinates → deterministic route), fill crew, click → exactly stalest K checked + car cards render; (3) **per-car share regression (BUG-1/BUG-2)** — share car 1 → `db.getDoc(designations, id)` contains exactly that car's ids **in route order** (assert array order — locks the ordering fix), row checked+disabled, dock submit per D1; (4) **alert exclusion** (with T1.3); (5) **empty-plan safety** — 1 man + 1 woman → zero groups → distribute disabled, nothing crashes. Use `captureWhatsAppPopup(page, () => shareBtn.click())` + `designationIdFromShareUrl`. Conventions: titles start with the UC id, `test.use({ role: 'admin' })`, web-first assertions only (no `waitForTimeout` — lint error), Firestore asserts wrapped in `await expect(async () => {...}).toPass()`. | New specs green; catalog entries reference them. | ☐ |
| T6.5 | **Docs catalog** (write use cases BEFORE the specs that implement them) | `apps/ministry-maps/docs/features/territories-assign.md`: add UC-ASSIGN-25+ entries (preconditions, steps, expected UI + persistence). `apps/ministry-maps/docs/domain/data-model.md`: add `geo`/`geoStatus`/`geocodedAt`. `docs/test-catalog.md` if the index requires it. | Docs match shipped behavior; links valid (`git diff --check`). | ☐ |

### Phase 7 — Smaller notes (from review: non-blocking)

| ID | Task | Spec | Status |
|---|---|---|---|
| T7.1 | Generalize `tools/geocode-territories/README.md` personal wording ("worktrees don't have their own functions/node_modules", key "lives in the `~/dev/...` env"); KEEP the "never commit the key" warning. | ☐ |
| T7.2 | Production rollout story for geocoding: the backfill only targets the emulator. Either an explicit `--project` flag + confirmation prompt for prod runs, or a Cloud Function parsing `mapsLink` coordinates server-side. Until a congregation backfills, `geo` is absent → feature silently degrades to "unlocated appended at end" — one more reason the STR-5 default is `false`. | ☐ |
| T7.3 | After T2.3: consolidate drifting constants — `AVG_KMH = 30` and `DEFAULT_VISIT_MIN` (15) exist in both `capacity.ts` and `team-distribution.service.ts`; `split-route.ts` has its own defaults; the page carries `DEFAULT_AVG_LEG_KM = 2` and `visitMin = 10` (10 vs 15 drift). One config object passed down (as `TeamInput` already partially does). | ☐ |

### Phase 8 — Final verification & PR

| ID | Task | Acceptance criteria | Status |
|---|---|---|---|
| T8.1 | Full verification on the final state (section 7, all five gates + full e2e suite, `--skip-nx-cache`). | All green; exact numbers recorded below in section 7. | ☐ |
| T8.2 | Open PR `feat/territory-route-optimization-dev` → `development` (approved flow). Close PR #31 with a credit comment linking the new PR ("continuing in #XX" — GitHub cross-links both ways; matinhu's authorship stays intact via the merged commits + `Co-authored-by` trailers). | PR open; #31 closed with credit; reviewer discussion preserved via link. | ☐ |
| T8.3 | (Optional) post-merge cleanup: delete the integration branch; retarget anything still pointing at it. | — | ☐ |

**Recommended execution order:** Phase 0 → T2.1 (+T6.2) → Phase 1 (+T6.1) → T2.2 → T2.3/T2.4 → Phase 3 → Phase 4 → Phase 5 → T6.3/T6.4/T6.5 → Phase 7 → Phase 8. Rationale: the extraction (T2.1) is the review's structural centerpiece; bugs and unit tests land cleanly inside the extracted component; the gate (T2.2) becomes a one-line `@if` after extraction.

## 4. Already done (do not redo)

- ✅ matinhu's 6 commits preserved verbatim in history; `Co-authored-by: @matinhu <matheulls@hotmail.com>` on the merge commit.
- ✅ `geo` model fields + Firestore round-trip (converter + `convertTerritoryGeoFieldsToFirestore` on create/update/batchUpdate).
- ✅ Ordering fix ported into `DesignationsHeaderBO.batchGetTerritoriesInIds` (single- AND multi-batch) + spec.
- ✅ `AssignTerritoriesStateService.replaceSelection()` + spec.
- ✅ Checkbox badge as signal inputs (`orderIndex`, `badgeColor`) + spec (Step-1 review added the spec).
- ✅ `shareForCar` via `DesignationsHeaderBO.createDesignation` + state service (session-aware; marks assigned; prunes cart; error toast).
- ✅ `carShared` derived done-state ("Compartilhado", disabled).
- ✅ STR-9 (constructor injection) — resolved by the port (everything uses `inject()`).
- ✅ Zoneless/OnPush conversion of the whole ported surface (signals + computed; `crew`, `flatRoute`).

## 5. Rules any executor must respect (from AGENTS.md + Step-1 lessons)

- **Standalone Angular only** (no NgModules); **zoneless + signals** (no Zone.js APIs; async-mutated state must be signals); **`inject()`** for new DI.
- **kebab-case files**, one folder per component; cross-project imports only via `@kingdom-apps/common-ui`; keep `common-ui` generic.
- **UI copy is pt-BR, verbatim** — tests rely on exact strings (e.g. `'Não foi possível criar a designação. Tente novamente.'`, `'Compartilhando…'`, `'Nenhuma designação em andamento'`).
- **E2E suite is zero-mock** (Playwright + real Firebase emulators, Java 21): import test/expect from `e2e/fixtures`; Firestore asserts in `toPass()` wrappers; no `waitForTimeout`; `npx nx typecheck-e2e ministry-maps` mandatory (Playwright never type-checks).
- **Conventional commits** (`feat(ministry-maps):`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`); smallest change that satisfies the task; no unrelated refactors.
- **Commit hygiene (hard rule, born from the Step-1 incident):** before `git commit` → `git status` must be empty of unstaged rows; after → `git show HEAD --stat` and spot-check a new symbol (`git show HEAD:<file> | grep <symbol>`). Gates verify the working tree, **never** the commit. Push after each milestone.
- When changing `libs/common-ui`: its own gates (`npx nx test common-ui`, `npx nx lint common-ui`) apply.

## 6. Decisions needed from the repository owner

| ID | Question | Options (review's lean) | Status |
|---|---|---|---|
| D1 | BUG-2 dock-submit behavior while a plan is active | (a) disable submit (minimal — review's "minimal safe behavior") · (b) confirm dialog for explicit bulk designation | ☐ |
| D2 | BUG-3 auto-distribute alert handling | (a) exclude silently from auto-selection (review-preferred) · (b) include + warning chip on car card | ☐ |
| D3 | STR-5 setting name | `shouldEnableTerritoryRouteOptimization` (review's suggestion) · shorter `enableRouteOptimization` (handoff's) | ☐ |
| D4 | STR-2 `shared/route-optimizer/` placement | (a) move under territory feature (strictest) · (b) keep in `shared/` naming a plausible second consumer (review: "your call, make it conscious") | ☐ |
| D5 | STR-3 geocode-parse source of truth | (a) tool-only, delete app copy (review-preferred) · (b) tested TS kept, compiled/imported by tool | ☐ |
| D6 | ALG-1 same-sex-only pairing rule | keep as-is (confirm intent) · plan a future opt-in setting (no code change now either way) | ☐ |
| D7 | History shape for the PR | (a) keep `1d210fb` + `37ed2f6` as-is (recommended — matinhu's commits preserved, port documented) · (b) rewrite for cleanliness (loses nothing textual but rewrites SHAs) | ☐ |
| D8 | Extracted panel component naming | `territory-distribution-panel` (review) · `assign-team-planning` (handoff) | ☐ |

## 7. Verification protocol

After each task: `npx nx test ministry-maps` + `npx nx lint ministry-maps`. After template-affecting tasks: `npx nx build ministry-maps` (AOT catches template type errors jest cannot). After each phase: `npx nx typecheck-e2e ministry-maps` + scoped e2e (`npx nx e2e ministry-maps --no-tui -- --grep "UC-ASSIGN"`). Before anything is merged/PR'd: **full suite** `npx nx e2e ministry-maps --no-tui`. Use `--skip-nx-cache` when the result matters. Record final numbers:

| Gate | Result | Date |
|---|---|---|
| `npx nx test ministry-maps` | 501 passed | 2026-09-19 |
| `npx nx lint ministry-maps` | clean | 2026-09-19 |
| `npx nx build ministry-maps` | success | 2026-09-19 |
| `npx nx typecheck-e2e ministry-maps` | success | 2026-09-19 |
| `npx nx e2e ministry-maps` (full) | _re-baseline in T0.2_ | — |

## 8. Definition of done (Step 2)

All backlog tasks ☑ or explicitly waived by the owner; decisions D1–D8 recorded; full verification table green; docs catalog updated; PR opened to `development` and #31 closed with credit. The feature ships **off by default** per congregation (STR-5) with the backfill tool usable by any congregation (STR-3/4, BUG-5/6) and every new behavior locked by unit and e2e tests (STR-7 / T6.x).

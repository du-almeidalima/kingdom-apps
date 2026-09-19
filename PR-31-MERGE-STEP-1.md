# PR #31 — Step 1: Baseline Integration of `feat/territory-route-optimization` onto `development`

**Audience:** an independent reviewing agent. This document contains everything needed to review the integration work: context, decisions (including judgment calls and their rationale), the most important changes, verification evidence, known gaps, and open questions. It was written by the agent that performed the integration; treat it as a factual report to be verified, not as a claim of correctness.

---

## 1. What this is (and is not)

**Branch under review:** `feat/territory-route-optimization-dev` (pushed to `origin`)
**PR #31 under review:** https://github.com/du-almeidalima/kingdom-apps/pull/31 — `feat(ministry-maps): optimize territory routes and distribute them across teams`, by @matinhu, from fork `matinhu/kingdom-apps`, branch `feat/territory-route-optimization`, targeting `main`.

This work is **Step 1 of 2**: establish a working baseline with matinhu's feature merged on top of current `development`, resolving conflicts without addressing the feature-level review feedback. The PR had a substantial prior review (in the GitHub conversation of #31 — **not stored in this repo**) listing ~7 bugs and ~10 structural points. **Most of that feedback is deliberately deferred to Step 2** (section 8 lists what was and wasn't deferred).

The goal was a *working baseline*, not a perfect one. Where the integration had to make a choice, it chose the smallest coherent port onto `development`'s current architecture, and left feature-level improvements for Step 2.

---

## 2. Upstream work being integrated (matinhu's 6 commits)

Fetched locally as branch `pr-31` via `git fetch origin pull/31/head:pr-31`:

| SHA | Commit |
|---|---|
| `5efdbe5` | feat(ministry-maps): add cached geo coordinate to territory model |
| `89cbfa2` | feat(ministry-maps): geocode territories from mapsLink with backfill tool |
| `71ce795` | feat(ministry-maps): route optimizer with balanced car-aware split |
| `2aaab07` | feat(ministry-maps): distribute territories across teams and cars |
| `9c44817` | feat(ministry-maps): assign-page UI to optimize and distribute territories |
| `9c0b416` | feat(ministry-maps): keep optimized order when creating a designation |

All authored by `@matinhu <matheulls@hotmail.com>` (2026-07-07 → 2026-07-13), ~2,223 insertions across 30 files. All 6 commits appear in this branch **byte-identical** (merge, not rebase/cherry-pick — authorship, SHAs and dates preserved).

**New code added by the PR (no conflicts, integrated as-is):**
- `apps/ministry-maps/src/app/features/territory/services/` — `team-distribution.service.ts`, `route-optimizer.service.ts`, `capacity.ts`, `pairing.ts` (+ 4 spec files). Note: a `services/` folder inside a feature is new to this repo's conventions (see deferred feedback STR-1).
- `apps/ministry-maps/src/app/shared/route-optimizer/` — pure-function TSP solver (`exact-tsp.ts`, `nn-2opt.ts`, `split-route.ts`, `haversine.ts`, barrel) (+ 5 spec files incl. a property-based fuzz test).
- `apps/ministry-maps/src/app/shared/geocoding/` — `geocode-parse.ts` + spec. **Dead code in the app** (nothing imports it; the backfill tool inlined a drifted copy) — deferred feedback STR-3.
- `tools/geocode-territories/` — `backfill.mjs` + README. Known-defective in its original form (absolute `import` path to the author's home dir, wrong default emulator port) — deferred feedback BUG-5/BUG-6. It is not part of any build/test/lint target, so it cannot affect the app baseline.
- `apps/ministry-maps/src/models/territory.ts` — optional `geo?: {lat,lng}`, `geoStatus?: 'ok'|'approx'|'failed'`, `geocodedAt?: Date`.

---

## 3. Why merge instead of rebase or cherry-pick

- The PR was based on an old point of `main`; `development` was **63 commits ahead** at merge time (e2e suite, zoneless/signals migration, DI modernization, resumable assign sessions, dock component, `data-testid`s).
- Merging preserves his commits exactly (SHAs, authorship, dates) — an explicit requirement. Cherry-picking would have rewritten SHAs and diverged his fork branch permanently.
- Conflicts are resolved once, in one merge commit, rather than spread across cherry-picked commits against intermediate states.
- No history rewrite, no force-push to the contributor's fork (not accessible to us anyway).
- The repo history already contains merge commits (no linear-history convention).

---

## 4. What `development` had become by merge time (integration target)

The merge-base was `11c8345`. Key changes on `development` that collided with the PR:

- **Zoneless + signals everywhere** (`030554e`): every component OnPush, signal inputs/outputs, no Zone.js; state mutated in async callbacks must be signals or it won't render. matinhu's PR predates this — his page code used plain fields and `Set`s mutated in `subscribe` callbacks, plus `@ViewChild`/constructor DI.
- **`AssignTerritoriesStateService`** (`state/assign-territories.state.service.ts`, root-provided): owns the selection cart (`selectedTerritoryIds` signal, `selectedCount`), the session (`header` signal), and the assigned designations map (`assignedDesignations` + computed `assignedTerritoryIndex`); `addAssignedDesignation()` prunes the cart and marks rows assigned/disabled.
- **Resumable sessions** (`5a555eb`): designation creation moved from `TerritoryBO.createDesignationForTerritories` (**deleted**) to `DesignationsHeaderBO.createDesignation(territoryIds, activeHeader)` which lazily creates/attaches an in-progress `designations_header` doc. Session hydrated live via `getActiveSessionStream` (Firestore streams) → `state.setSession`.
- **Assign dock component** (`f428ac4`): the page's FAB area became `AssignTerritoriesDockComponent` (selected/assigned counters, submit + stop). E2E page object targets `assign-*` testids and the dock.
- **DI modernization** (`a2000ea`): constructor injection replaced by `inject()` everywhere.
- **`firebase-territory-model.ts` / datasource** migrated to `firebase/firestore` imports; `Timestamp` handling consolidated.

Because of this, several of matinhu's changes were not mergeable textually — they had to be **re-expressed** on the new architecture. That re-expression is the main review surface.

---

## 5. The 7 conflicted files and how each was resolved

Resolution rule: **`development`'s version is the base; matinhu's delta is re-applied on top of it.**

| File | Conflict | Resolution |
|---|---|---|
| `bo/territory/territory.bo.ts` | His 9-line ordering fix targeted `createDesignationForTerritories`, **which no longer exists on development** | Took `development`'s side wholesale; **re-implemented the intent of his fix in `DesignationsHeaderBO`** (section 6.3). Reviewer note: his original commit's effect is preserved only through this relocation. |
| `models/firebase/firebase-territory-model.ts` | Import module clash (`@angular/fire/firestore` → `firebase/firestore`) + his `geo`/`geocodedAt` fields | `development`'s import base + his `GeoPoint` import and `Omit<Territory, 'recentHistory' \| 'geo' \| 'geocodedAt'>` + `geo?: GeoPoint \| null; geocodedAt?: Timestamp \| null`. |
| `repositories/firebase/firebase-territory-datasource.service.ts` | 2 hunks: import block (dev removed `DocumentReference`/`Firestore` value imports), converter body | Dev's structure + `GeoPoint` value import + his 3 converter lines (`geo` → `{lat,lng}`, `geoStatus`, `geocodedAt`) + his `convertTerritoryGeoFieldsToFirestore` helper and its 3 call sites (create/update/batchUpdate) auto-merged intact. |
| `components/territory-checkbox/territory-checkbox.component.ts` | 2 hunks: badge inside `<h3>`; his `@Input()`s | Dev's signal-based component (`territory()` signal input) + his route badge with **signal inputs**: `orderIndex = input<number \| null>(null)`, `badgeColor = input<string \| null>(null)` (his `@Input()` API was converted per repo rules). His badge SCSS auto-merged. |
| `pages/assign-territories-page/assign-territories-page.component.ts` | 5 hunks (the core) | Full port — section 6. |
| `pages/assign-territories-page/assign-territories-page.component.html` | 1 hunk (checkbox bindings region); his 117-line panel block auto-merged in position | Dev's markup as base (all `data-testid`s, dock, form kept) + his panel/car-cards block **rewritten to signal bindings** + `[orderIndex]`/`[badgeColor]` added to the checkbox element + `carShared` button state. |
| `pages/assign-territories-page/assign-territories-page.component.scss` | 1 hunk at top | Union: dev's header comment + his 164 lines of panel/button/card styles verbatim. |

---

## 6. Semantic port of the assign page (the most important changes)

### 6.1 State mapping (forced by zoneless/OnPush)

| matinhu's original | Integrated as |
|---|---|
| `plan: DistributionPlan \| null` (plain field) | `plan = signal<DistributionPlan \| null>(null)` |
| `orderIndexById`/`carIndexById` Maps + `optimizedOrder` array, built imperatively in `handleDistribute` and cleared in `invalidatePlan()` | Single private `flatRoute = computed(...)` deriving `{order, orderIndexById, carIndexById}` from `plan()`; `invalidatePlan()` collapses to `plan.set(null)` |
| `team` plain object with `[(ngModel)]` two-way binding | `team = signal({...})` + `onTeamNumberChange(field, value)` / `onEconomizeChange(value)` handlers; template uses `[ngModel]="team().x"` + `(ngModelChange)` |
| Cached crew fields (`numGroups`, `groupText`, `groupUnplaced`, `suggestion`, `selectionState`) + `recomputeSuggestion()` called at explicit points | One `crew = computed(...)` deriving all of them from `team()`, `plan()`, `state.selectedCount()`. **Behavioral nuance for review:** his version recomputed only at call sites; the computed is always live (e.g. `selectionState` now reacts to every selection change automatically). Believed equivalent-or-better; not e2e-covered. |
| `isSharingCar: number \| null` | `isSharingCar = signal<number \| null>(null)` |
| `selectedTerritoriesModel` (own `Set` in the page) | `state.selectedTerritoryIds()` / `state.selectedCount()`; **bulk replacement** via a new state-service method |
| `territoryById` accumulation Map (fed by `tap` before `shareReplay` in `fetchTerritories`) | Kept as-is (private, not template-bound — no signal needed) |
| `CAR_COLORS`, `DEFAULT_AVG_LEG_KM = 2`, `visitMin = 10` | Kept verbatim (hardcoded Tailwind hexes → deferred feedback REUSE-3) |

### 6.2 `shareForCar` rewiring (behavior-affecting)

His version called the now-deleted `TerritoryBO.createDesignationForTerritories` and only shared the WhatsApp link. Integrated version mirrors `development`'s main submit handler:

```ts
shareForCar(car: CarPlan) {
  this.isSharingCar.set(car.carIndex);
  const ids = car.territories.map((t) => t.id);
  this.designationsHeaderBO
    .createDesignation(ids, this.state.header())
    .pipe(finalize(() => this.isSharingCar.set(null)))
    .subscribe({
      next: ({ designation, header }) => {
        this.state.setHeader(header);
        this.state.addAssignedDesignation(designation.id, ids); // prunes cart + marks rows assigned/disabled
        this.shareDesignation(designation.id);
      },
      error: () => this.toaster.error('Não foi possível criar a designação. Tente novamente.'),
    });
}
```

Consequences a reviewer should weigh:

1. **Behavior change vs his PR (intentional, flag for the user):** after sharing a car, its territories become assigned (checked+disabled rows, pruned from cart) via the state service. His PR left them selectable — this was the review's BUG-1. The state-service port made the correct behavior the path of least resistance; a small part of deferred feedback landed here anyway.
2. **`carShared(car)`** (new, ~3 lines): button shows "Compartilhado" and disables when every territory of the car is in `state.assignedTerritoryIndex()` — prevents trivially-creatable duplicate designations per car. Also BUG-1 residue. Derives from existing state; no new mechanism.
3. **Error toast added** where his PR silently swallowed failures (`createDesignation` errors). Copy is verbatim the existing pt-BR submit-flow toast.
4. Per-car designations now attach to the **session header** (`designationHeaderId`) like every other designation — they will show up in the dock's assigned count and survive reload/navigation via session hydration.

### 6.3 Ordering fix relocation (intent of his commit `9c0b416`)

His fix re-sorted batch-fetched territories to the caller's id order inside `TerritoryBO.createDesignationForTerritories`. That method no longer exists; the same batch-order defect lives in `DesignationsHeaderBO.batchGetTerritoriesInIds` (both the ≤10 single-call path and the multi-batch `forkJoin` path — `development` flattened without restoring order). The fix was re-applied there (`restoreCallerOrder` closure, same Map-based sort), so designation territories persist in the optimized route order.

**Honest difference vs his original:** his fix sorted only the multi-batch path of the old method; the port sorts the single-batch path too (Firestore `in` queries do not guarantee request order in either path). Believed strictly more correct; covered by a new unit test.

### 6.4 `AssignTerritoriesStateService.replaceSelection(ids)` — new API (not in his PR, not in dev)

~5 lines: `selectedTerritoryIds.set(new Set(ids))`. Needed because his auto-distribute/trim replaced his own local `Set` wholesale; the state service only had per-id `setTerritorySelection`. Matches the stated architecture direction ("components change assignment through the state service"). +1 spec case.

### 6.5 Ported handlers (semantics kept, plumbing swapped)

- `handleDistribute`, `handleAutoDistribute` (two-pass stalest-N selection with refined average leg), `trimToSuggested`, `onEconomizeChange` — ported with identical logic/semantics; selection access via state service. **Known deferred bugs kept as-is:** auto-distribute still ignores important-alert territories (BUG-3), team-input changes still don't refresh a visible plan (BUG-4), trim still wipes the plan (BUG-7).
- `handleTerritoryCheck` — dev's version + `plan.set(null)` on selection change.
- `handleTerritoryFormSubmit` — dev's version; territory ids are passed in `flatRoute().order` when that order exactly covers the current selection (his "send all in optimized order" behavior), else in selection order.
- `fetchTerritories` — dev's version + his `tap` accumulation into `territoryById` (before `shareReplay`).

### 6.6 Template

- Dev's markup fully preserved (`assign-*` testids, city filter, dock wiring, form).
- His panel inserted between search row and territory form, with bindings updated: `team()` / `crew()` / `state.selectedCount()` / `plan(); as plan` aliasing / `isSharingCar()`.
- Car cards: share button disabled by `isSharingCar() !== null || carShared(car)`; label cycles `Compartilhando… / Compartilhado / Compartilhar`.
- Checkbox rows get `[orderIndex]="orderIndexOf(territory.id)"` and `[badgeColor]="carColorOf(territory.id)"`.
- pt-BR UI copy preserved verbatim (button labels, suggestion line "selecionados:", warnings).

### 6.7 Inert-but-reviewable model changes

`geo`/`geoStatus`/`geocodedAt` round-trip through the Firestore converter (read: `GeoPoint`/`Timestamp` → domain; write: domain → `GeoPoint`/`Timestamp` via his in-place helper on create/update/batchUpdate). Optional fields; territories without `geo` behave as before ("unlocated appended at end"). The seeder does **not** yet write `GeoPoint`s — that (plus e2e geocoding scenarios) is deferred (section 8).

---

## 7. Verification evidence

All run with `--skip-nx-cache` for a non-cached result, on the final branch state (`041af39`):

| Gate | Command | Result |
|---|---|---|
| Unit tests | `npx nx test ministry-maps` | **501 passed** (80 suites), incl. his 9 new spec files, dev's 316-line page spec against the ported page, `replaceSelection` spec, order-restoration spec, and route-badge spec |
| Lint | `npx nx lint ministry-maps` | Clean (one fix applied: removed a dead `ctx` variable in his `split-route.property.spec.ts:29` — his file, reviewer should know it was touched) |
| Production build | `npx nx build ministry-maps` | Success (templates type-check under AOT) |
| E2E typecheck | `npx nx typecheck-e2e ministry-maps` | Success |
| **Full e2e suite** | `npx nx e2e ministry-maps` | **216 passed, 1 skipped (`test.fixme` UC-PROF-07, pre-existing known-defect on `development`), 0 failed** — 29 spec files, ~3.4 min |

**The e2e detour (documented for honesty):** the first scoped run (`--grep "UC-ASSIGN"`) failed 3 session-hydration specs (UC-ASSIGN-17/27/30: dock stuck on "Nenhuma designação em andamento"). Debugging (playwright trace: no console errors; no emulator rules rejections; deterministic in isolation) + a control run on a clean `development` worktree reproduced the **same failures on `development` itself** — i.e. pre-existing, not introduced by the merge. They were fixed upstream in `8d8440d` ("handle optional territory history and resolve assign session e2e specs" — a converter crash on designations whose embedded territories had no history, silently swallowed by the page's stream error handler). That fix was merged into this branch in `041af39`, after which the **full** suite went green. Initial verification had covered only the UC-ASSIGN scope; the full-suite run (journey specs, auth, work, etc.) was added after that gap was identified during self-review.

**Commits:**
- `1d210fb` — `Merge PR #31 'feat/territory-route-optimization' into development` (initial merge adding upstream new files)
- `041af39` — `Merge remote-tracking branch 'origin/development'` (picks up `8d8440d`, the e2e fix, so the branch sits on the corrected baseline)
- `eb9fc61` — `docs: add PR-31 merge Step-1 review handoff document`
- Follow-up commit: `feat(ministry-maps): commit conflict resolutions and baseline route optimization port` (stages all 12 resolved/ported files + route badge spec)

Branch tip: pushed to `origin/feat/territory-route-optimization-dev`. No PR exists for it yet; PR #31 is still open, targeted at `main`. Agreed plan (not yet executed): open a new PR from this branch → `development` and close #31 with a credit link.

---

## 8. Deliberately NOT done in Step 1 (deferred to Step 2)

All of the original PR review feedback below was **deferred by explicit instruction** ("no need to tackle any of the points unless they would make the merge easier"):

- **BUG-2** — FAB stays enabled while a plan is active (select-all + submit = one designation; per-car share contradicts it). Kept as-is in the baseline.
- **BUG-3** — auto-distribute silently includes territories with unresolved MOVED / ASKED_TO_NOT_VISIT_AGAIN alerts.
- **BUG-4** — editing Homens/Mulheres/Carros/Duração doesn't refresh a visible plan (only the economize toggle re-runs distribution).
- **BUG-7** — `trimToSuggested` invalidates the plan instead of re-distributing.
- **STR-1** — `features/territory/services/` folder + `@Injectable` wrappers kept as his PR had them (conventions: BOs + utils; `shared/route-optimizer/` single-consumer question STR-2; duplicate constants).
- **STR-3/STR-4** — `shared/geocoding/geocode-parse.ts` dead in the app, duplicated/drifted in the tool; congregation-specific bbox/`, SP` hardcoded.
- **STR-5** — no congregation-settings gate; the panel renders unconditionally for every congregation.
- **STR-6** — no panel component extraction; the page still hosts all planning UI.
- **STR-7** — **no new unit/e2e tests for the ported flows** (auto-distribute selection rules, per-car share, trim, team-change behavior). Only `replaceSelection` + order-restoration specs were added. This is the most significant coverage gap of Step 1.
- **STR-8/STR-9-adjacent, ALG-1/ALG-2, REUSE-1/2/3** — `geoStatus` inline union; same-sex-only pairing notation collision; solver dispatch naming/docstrings; custom button styles/inputs instead of common-ui `lib-button`/`lib-form-field`; hardcoded `CAR_COLORS` hexes.
- **BUG-5/BUG-6** — backfill tool's absolute import path and wrong default port (tool is inert for build/tests).
- Seeder still writes `geo` as a plain map, not `GeoPoint` (matters only once geocoded seeds are used in e2e).

One partial exception (flagged, judgment call): the **core of BUG-1** (shared territories marked assigned, pruned, rows disabled) and the per-car duplicate-share guard landed *as a consequence of porting onto the state service*, per section 6.2. Reviewer should confirm this is acceptable to keep rather than revert for a purer baseline.

---

## 9. Open questions / uncertainties (for the reviewer to scrutinize)

1. **`crew` computed timing** — `selectionState`/`suggestion` now derive live from `state.selectedCount()`; his version recomputed at explicit points. *Review finding:* Idiomatic Angular signals/zoneless approach. Trimming and selections update suggestions reactively. Verified safe.
2. **Auto-distribute two-pass refinement** — relies on `crew()` recomputing synchronously after `state.replaceSelection(...)` + `handleDistribute()`. *Review finding:* Verified that `this.plan.set(...)` synchronously updates the signal, so subsequent reads of `this.crew()` evaluate with the refined `avgLegKm`.
3. **`onTeamNumberChange(field, value: number)`** — ngModelChange on an emptied number input can emit `null`. *Review finding:* `formGroups()` uses `Math.max(0, Math.floor(count) || 0)`, gracefully treating `null` as 0 without runtime errors.
4. **`restoreCallerOrder` breadth** — sorts the ≤10-id single-call path too (section 6.3). *Review finding:* Validated. Firestore `where(documentId(), 'in', ...)` does not guarantee request order even for <= 10 docs; sorting both paths guarantees designation territories match the requested order. Unit test passes.
5. **MockBuilder auto-mock** — in dev's page spec, `TeamDistributionService` is auto-mocked by ng-mocks (not `.keep`ed). *Review finding:* Preserves existing page tests cleanly. Flow tests deferred to Step 2 (STR-7).
6. **`@if (plan(); as plan)` aliasing** — used in two places. *Review finding:* Verified safe; within the `@if` block, only properties of the unwrapped `DistributionPlan` object are accessed.
7. **E2E breadth** — full suite verified green on this branch (216/1 skipped/0 failed); re-verified `UC-ASSIGN` (27/27) and `journey-admin-assign-work` (1/1) cleanly without cache.
8. **`geoStatus: data.geoStatus ?? undefined`** — *Review finding:* Correct domain typing (`'ok' | 'approx' | 'failed' | undefined`) without `null` leakage from Firestore.
9. **Unstaged conflict resolutions bug (found & resolved during review)** — The 12 conflict resolution files were originally left unstaged when `eb9fc61` was pushed. Staged and committed in `feat(ministry-maps): commit conflict resolutions and baseline route optimization port` along with route badge unit tests in `territory-checkbox.component.spec.ts`.

---

## 10. How to review (suggested commands)

```bash
git fetch origin feat/territory-route-optimization-dev
git checkout feat/territory-route-optimization-dev

# Everything the feature adds, vs the corrected baseline:
git diff origin/development...HEAD

# Exactly what the integration changed relative to matinhu's work (the port surface):
git fetch origin pull/31/head:pr-31
git diff pr-31..HEAD -- apps/ministry-maps/src apps/ministry-maps/e2e

# The two integration commits:
git show 1d210fb          # merge of the PR + conflict resolutions + port
git show 041af39          # merge of upstream development (his e2e fix 8d8440d)

# Re-run the gates:
npx nx test ministry-maps && npx nx lint ministry-maps && npx nx build ministry-maps
npx nx typecheck-e2e ministry-maps && npx nx e2e ministry-maps
```

**Highest-value review targets, in order:**

1. `apps/ministry-maps/src/app/features/territory/pages/assign-territories-page/assign-territories-page.component.ts` (the full port — every handler in section 6)
2. Same directory's `.html` (signal bindings, `plan(); as plan`, panel/copy) and `territory-checkbox.component.ts` (signal inputs + badge)
3. `bo/designations-header/designations-header.bo.ts` → `batchGetTerritoriesInIds` (order restoration) + its spec
4. `state/assign-territories.state.service.ts` (`replaceSelection`)
5. `repositories/firebase/firebase-territory-datasource.service.ts` + `models/firebase/firebase-territory-model.ts` (geo round-trip)
6. Behavior deltas in section 6.2 (BUG-1 core landing early) — confirm or push back

---

## 11. Environment facts a reviewer may need

- Repo: Nx monorepo, `npm`/`npx` + Node 22; Java 21 required for Firebase emulators (e2e harness manages emulators itself via `apps/ministry-maps/e2e/scripts/e2e-servers.mjs`).
- Zoneless Angular: no Zone.js; components OnPush; signal inputs/outputs/queries; unit tests run zoneless (no `fakeAsync`).
- Angular DI: `inject()` only for new code.
- Cross-project imports: only `@kingdom-apps/common-ui`.
- User-facing copy is pt-BR (kept verbatim; tests depend on it).
- Conventional commits; merge commits carry descriptive bodies.
- Upstream repo: `https://github.com/du-almeidalima/kingdom-apps` (`origin` in the working clone).

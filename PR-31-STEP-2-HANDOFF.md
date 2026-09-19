# PR #31 — Step 2 Handoff: Route Optimization & Distribution Refinements

**Audience:** The developer or agent executing **Step 2** of integrating PR #31 (`feat(ministry-maps): optimize territory routes and distribute them across teams`, upstream fork `matinhu/kingdom-apps`, PR #31).

---

## 1. Executive Summary & Current Git State

Step 1 (baseline integration and conflict resolution onto `development`) is **complete, reviewed, adjusted, and verified**.

* **Active Branch:** `feat/territory-route-optimization-dev`
* **Current HEAD:** Commit `37ed2f6` (`feat(ministry-maps): resolve merge conflicts and port route optimization to assign page`)
* **Tracking State:** Ahead of `origin/feat/territory-route-optimization-dev` by 1 commit (**deliberately not pushed yet** per user instruction).
* **Working Tree:** Clean.
* **Verification Status (all gates verified with `--skip-nx-cache`):**
  * Unit tests: `npx nx test ministry-maps` — **501 passed** (80 suites).
  * Linter: `npx nx lint ministry-maps` — **Clean** (0 warnings, 0 errors).
  * Production build: `npx nx build ministry-maps` — **Success** (AOT templates valid).
  * E2E Typecheck: `npx nx typecheck-e2e ministry-maps` — **Success**.
  * E2E runtime (`UC-ASSIGN` + `journey-admin-assign-work`): **28 passed**.

---

## 2. What Step 1 Accomplished (and What Was Fixed During Review)

1. **Clean Integration Baseline:**
   * Upstream commits from PR #31 (`5efdbe5` → `9c0b416`) are merged into `development`.
   * Upstream e2e fix (`8d8440d`) from `development` was integrated into the branch in merge commit `041af39`.
2. **Conflict Resolution & Zoneless/Signals Port:**
   * Converted planning state from plain fields with `(ngModelChange)` into Angular signals (`team`, `plan`, `crew`, `isSharingCar`, `flatRoute`).
   * Integrated route sharing with `AssignTerritoriesStateService` and `DesignationsHeaderBO.createDesignation` (session-aware, resumable).
   * Relocated territory ordering fix from deleted `TerritoryBO.createDesignationForTerritories` into `DesignationsHeaderBO.batchGetTerritoriesInIds` for both single-batch (≤10) and multi-batch (>10) paths.
   * Converted `TerritoryCheckboxComponent` badge inputs (`orderIndex`, `badgeColor`) to signal inputs `input<number | null>(null)`.
   * Added `AssignTerritoriesStateService.replaceSelection(ids)` for bulk selection replacement.
3. **Key Review Adjustment:**
   * Identified and fixed an uncommitted working tree issue where 12 conflict resolution and port files had not been staged before previous commits. All 12 files are now committed in `37ed2f6`.
   * Added missing unit tests in `territory-checkbox.component.spec.ts` for `orderIndex` and `badgeColor`.

---

## 3. Scope of Step 2: Outstanding Tasks & Review Feedback

All items below were deliberately deferred from Step 1 and constitute the scope of Step 2. They are organized by functional area.

### Area A: Functional Bugs & UI Consistency (Bugs BUG-1 to BUG-7)

| ID | Issue & Context | Target Location | Suggested Fix |
|---|---|---|---|
| **BUG-1 (Remainder)** | Auto-distribute does not check if territories are already assigned. While individual car shares prune cart and disable rows via state service, ensure auto-distribution excludes already assigned designations from the pool. | `assign-territories-page.component.ts` (`handleAutoDistribute`) | Verify `state.assignedTerritoryIndex()` is fully respected across all auto-selection paths. |
| **BUG-2** | Floating Dock submit button remains enabled while a per-car distribution plan is active. Submitting the dock assigns ALL selected territories into one bulk designation, conflicting with the per-car share cards. | `assign-territories-page.component.html` / dock component | Disable the dock submit button or prompt confirmation when `plan()` is active, or make the distinction clear to the user. |
| **BUG-3** | `handleAutoDistribute` selects overdue territories without checking for unresolved critical alerts (`MOVED`, `ASKED_TO_NOT_VISIT_AGAIN`). | `assign-territories-page.component.ts` (`handleAutoDistribute`) | Filter out territories where `TerritoryAlertsBO.findImportantAlert(t)` is present, or prompt the user before finalizing selection. |
| **BUG-4** | Changing team inputs (`Homens`, `Mulheres`, `Carros`, `Duração`) does not refresh a visible `plan()`. Only the economize toggle currently re-triggers `handleDistribute()`. | `assign-territories-page.component.ts` (`onTeamNumberChange`) | If `plan()` is not null, re-run `handleDistribute()` when team inputs change, or indicate that the plan is stale. |
| **BUG-7** | `trimToSuggested()` wipes out the active plan (`this.plan.set(null)`) instead of re-distributing the trimmed selection. | `assign-territories-page.component.ts` (`trimToSuggested`) | Re-run `handleDistribute()` after trimming so the user immediately sees the refined route. |

---

### Area B: Architecture, Folder Conventions & Component Extraction (STR-1, STR-5, STR-6)

1. **Feature Component Extraction (STR-6):**
   * Currently, the planning UI (`<details class="assign-team-panel">` and car cards) is embedded directly inside `AssignTerritoriesPageComponent` (~500 lines).
   * Extract this into a dedicated presentation/smart component: e.g. `AssignTeamPlanningComponent` under `apps/ministry-maps/src/app/features/territory/components/assign-team-planning/`.
   * Pass inputs/outputs via signals (`team`, `plan`, `crew`, `isSharingCar`, `distribute`, `autoDistribute`, `trim`, `shareCar`).
2. **Service Placement & BO Convention (STR-1 & STR-2):**
   * The folder `apps/ministry-maps/src/app/features/territory/services/` (`team-distribution.service.ts`, `route-optimizer.service.ts`, `capacity.ts`, `pairing.ts`) introduces a new convention not standard in the repo.
   * Consider refactoring or consolidating into:
     * Business Objects under `app/features/territory/bo/` or utils under `app/features/territory/utils/` / `app/shared/route-optimizer/`.
     * Check if `route-optimizer.service.ts` should live entirely inside `shared/route-optimizer`.
3. **Congregation Settings Gate (STR-5):**
   * Route optimization and team distribution currently render unconditionally.
   * Add a congregation setting (e.g. `enableRouteOptimization: boolean` via `CongregationSettingsBO`) to conditionally gate the panel's visibility for congregations that opt in or have geocoded territories.

---

### Area C: Design System & Styling Token Reuse (REUSE-1 to REUSE-3, STR-8)

1. **Common-UI Components:**
   * Replace bespoke `<button>` styles (`.assign-optimize-btn`, `.assign-auto-btn`, `.assign-trim-btn`, `.assign-share-btn`) with Common-UI buttons (`<button lib-button ...>`).
   * Replace raw `<input type="number">` and `<select>` with Common-UI form controls where applicable (`lib-form-field`, design token spacing).
2. **Color Tokens (REUSE-3):**
   * Replace hardcoded hex colors in `CAR_COLORS` (`#45c06c`, `#3b82f6`, etc.) and CSS classes (`.assign-over`, `.assign-warn`) with Kingdom Apps design tokens from `@kingdom-apps/common-ui` or CSS variables (`var(--kui-color-...)`).
3. **Domain Models & Unions (STR-8):**
   * Consolidate inline `geoStatus?: 'ok' | 'approx' | 'failed'` union into a typed enum or model under `apps/ministry-maps/src/models/enums/geo-status.ts`.

---

### Area D: Geocoding & Backfill Tooling (STR-3, STR-4, BUG-5, BUG-6)

1. **Dead Code vs. Tool Drift (STR-3, STR-4):**
   * `apps/ministry-maps/src/app/shared/geocoding/geocode-parse.ts` was added in PR #31 but is not imported by any app code.
   * `tools/geocode-territories/backfill.mjs` has an inlined, drifted copy with hardcoded São Paulo bounding boxes and state tags.
   * Consolidate `geocode-parse` so the backfill tool imports the shared parser cleanly without hardcoded local assumptions.
2. **Backfill Tool Fixes (BUG-5, BUG-6):**
   * Fix the absolute home-directory import path in `tools/geocode-territories/backfill.mjs`.
   * Update the default emulator port from the old port to the project emulator port (`8080`).
3. **Firestore Emulator Seed:**
   * Update `tools/executors/firebase-emulator/seed` if geocoded territories are to be included in standard E2E test runs.

---

### Area E: Automated Test Coverage (STR-7)

1. **Unit Tests:**
   * Add unit test specs for `AssignTerritoriesPageComponent` (or the extracted planning component) covering:
     * Auto-distribute stalest selection logic and two-pass refinement.
     * Team input changes and trim interaction.
     * Car sharing flow, disabling already shared cars, and error toast handling.
2. **E2E Tests:**
   * Add Playwright scenarios in `apps/ministry-maps/e2e/tests/territories-assign.spec.ts` exercising the planning panel:
     * Entering team numbers (men, women, cars) and verifying duo/trio capacity suggestions.
     * Clicking "Otimizar e distribuir" and verifying route badges on territory cards.
     * Sharing per-car designation and verifying the car card transitions to "Compartilhado".

---

## 4. Architectural Rules to Respect in Step 2

* **Zoneless & Signals:** No Zone.js. Every component `ChangeDetectionStrategy.OnPush`. Any state mutated in async callbacks must be a signal.
* **Angular DI:** Use `inject()` exclusively.
* **Component Selectors:** App components use `kingdom-apps-*` selector prefix.
* **Common UI Imports:** Intra-app imports are relative; cross-library imports strictly use `@kingdom-apps/common-ui`.
* **PT-BR Copy:** All UI labels and error/success messages must remain Brazilian Portuguese verbatim.
* **Commit Standards:** Use conventional commit messages (`feat(ministry-maps):`, `refactor(ministry-maps):`, `fix(ministry-maps):`, `test(ministry-maps):`).

---

## 5. Verification Commands for Step 2

Execute after every substantial change:

```bash
# Focused Unit Tests
npx nx test ministry-maps --skip-nx-cache

# Linting
npx nx lint ministry-maps --skip-nx-cache

# Production AOT Build
npx nx build ministry-maps --skip-nx-cache

# E2E Tests
npx nx typecheck-e2e ministry-maps --skip-nx-cache
npx nx e2e ministry-maps --grep UC-ASSIGN --skip-nx-cache
```

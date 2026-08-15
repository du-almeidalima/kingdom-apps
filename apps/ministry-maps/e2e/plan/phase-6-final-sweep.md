# Phase 6 — Final sweep (WP-34)

Close-out work once every other box is checked.

---

### WP-34 — Suite hygiene, coverage bookkeeping, manual checklist, HX-4 decision

- **Goal:** leave the suite, the catalog, and the repo docs in a consistent, trustworthy state.
- **Depends on:** WP-01 … WP-33.

#### Tasks

1. **Full-suite verification**
   - `npx nx typecheck-e2e ministry-maps` green.
   - `npx nx e2e ministry-maps --no-tui` green **twice back-to-back** (isolation proof — the suite's own
     README requirement).
   - `npx nx test ministry-maps` + `npx nx lint ministry-maps` green (app side, post-testid batches).
   - Spec count sanity: count implemented `UC-*` titles across `tests/` and compare against the
     tracking table (expected: 159 UC specs + 8 journey specs, minus any `test.fixme` judgement calls
     documented in their WPs, e.g. UC-PROF-07).

2. **Catalog bookkeeping** (`docs/test-catalog.md` — the only docs file this plan mutates)
   - Flip every implemented row's **Covered** cell to `✅ <spec file>` (and journeys likewise).
   - Leave the 11 not-automated rows marked as they are (✋ / blocked / unit-only).
   - Update the coverage summary table totals.

3. **Manual acceptance checklist** (publish as `e2e/MANUAL-ACCEPTANCE.md`)
   - One section per OAuth leg — UC-AUTH-04, UC-AUTH-05, UC-AUTH-06, UC-AUTH-07 (login outcomes) and
     UC-AUTH-17, UC-AUTH-18, UC-AUTH-19, UC-AUTH-20 (invite redemption matrix) — each with
     preconditions, exact steps, and the expected UI + Firestore persistence copied verbatim from
     `docs/features/auth-onboarding.md`.
   - Note the two HX-4-blocked entries (UC-ASSIGN-21, UC-AUTH-21) as "not verifiable without fault
     injection".
   - This file is what a human runs before a release until/unless emulator popup automation is adopted.

4. **HX-4 decision record** (fault injection)
   - Add a short note to `docs/test-catalog.md` §HX-4: either "implemented as …" (if someone built it)
     or "deliberately deferred — UC-ASSIGN-21 and UC-AUTH-21 remain documented risks; candidates for
     unit/integration coverage instead".
   - If HX-4 **was** built somewhere along the way, implement UC-ASSIGN-21 and UC-AUTH-21 in
     `territories-assign.spec.ts` / `auth.spec.ts` instead of listing them above.

5. **Docs drift check**
   - Re-read `docs/README.md`'s "derived artifact" note: for each feature doc, skim its **Sources**
     list and confirm no entry contradicted reality during implementation (every deviation found during
     the WPs should already have been patched into the docs per plan README §2.8 — this is the audit).
   - Update `e2e/README.md` (new fixtures, utilities, page objects, spec inventory) and the
     `.ai/rules/frontend/e2e-testing.md` pointer if the harness surface changed (new roles,
     `signInAsUser`, invitation-link factory).

6. **Tracking table** — all boxes in `e2e/plan/README.md` checked; commit message:
   `test(e2e): complete e2e suite rollout (final sweep)`.

#### Acceptance criteria

- Everything in task 1 green; catalog coverage table sums to the implemented counts; manual checklist
  committed; no open `TODO(...)` comments in specs without a catalog/plan reference.

---

## After the sweep (out of scope for this plan, recorded for the roadmap)

- CI wiring (GitHub Actions) for `nx e2e ministry-maps --no-tui` — listed in `e2e/README.md` §Out of Scope.
- Auth-emulator popup automation to convert the 8 OAuth manual legs into specs (decision needed:
  fragility vs coverage).
- Defect fixes from `docs/testability-gaps.md` §3 — each is a **product decision**; when one lands,
  update the locked-in spec + catalog entry together (never silently).

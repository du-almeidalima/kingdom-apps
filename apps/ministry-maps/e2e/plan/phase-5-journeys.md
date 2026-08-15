# Phase 5 — Journeys (WP-26 … WP-33)

The eight multi-role end-to-end flows. Each journey doc in `docs/journeys/` is written as an executable
script — translate it 1:1, reusing the page objects built in phases 2–4. **Do not re-invent seed shapes
here: copy the journey doc's seed block verbatim** (it already encodes every trap — `history: []`,
non-empty `note`, future `expiresAt`, clock-relative dates).

Conventions for all journey specs (from `docs/journeys/README.md`):

- Identity switches: `signInAs(...)` → work → `page.evaluate(() => (window as any).__E2E__.auth.signOut())`
  → the app lands on `/login` itself → next leg.
- Hand-off assertions wrap in `expect.poll`/`toPass` (fire-and-forget writes).
- Link passing = capture id (Firestore first, whatsapp popup only when the journey scopes the share-link
  composition) + `page.goto('/work/' + id)` / `page.goto('/sign-in/' + id)`.
- One `test()` per journey, ID-first title, `// UC-XXX-NN` comments at each composed step.

---

### WP-26 — `tests/journey-admin-assign-work.spec.ts` (J-01)

- **Covers:** J-01 (Admin creates 2 territories → builds D1 (new+seeded, cross-city) → builds D2
  (overlap) → publisher A completes the shared territory on D1 → publisher B sees it still pending on D2).
- **Depends on:** WP-10/11 (work POs), WP-15 (`TerritoryManageDialogPage`), WP-18/19
  (`AssignTerritoriesPage`, whatsapp capture from WP-04).
- **Key assertions:** per-leg hand-offs in `docs/journeys/j-01-admin-creates-assigns-publisher-works.md`
  — positionIndex allocation (3 in São Paulo, 2 in Osasco), D1/D2 snapshot independence (`DONE` on D1's
  shared entry, `PENDING` on D2's), final sweep (3 designations; history subcollection +1 only from D1).
- **Size:** L — the longest spec in the suite; keep the five legs as clearly commented sections in one
  `test()`.

### WP-27 — `tests/journey-visit-feedback.spec.ts` (J-02)

- **Covers:** J-02 (anonymous completes a revisit visit → elder verifies badge on `/territories`, entry
  in `Histórico de Visitas`, and `Visitas: 1`/`Revisitas: 1` on statistics + city scoping).
- **Depends on:** WP-01 (`signInAs('elder')`; interim `admin` substitution documented in the journey doc
  — use the real elder once WP-01 landed), WP-10 (work POs), WP-16 (`TerritoryAlertsPage` not needed;
  history dialog via `HistoryDialogPage` from WP-07), WP-20 (`StatisticsPage`).
- **Key assertions:** history doc `{ visitOutcome: 0, isRevisit: true, name: 'Ana' }` (no `isResolved`
  key), `Revisita` badge visible (seeded note!), statistics reconcile with the subcollection.

### WP-28 — `tests/journey-invite-onboarding.spec.ts` (J-03)

- **Covers:** J-03 (admin creates invite → anonymous opens valid link → consumed re-open shows
  `INVALID_LINK`; manual legs documented, not automated).
- **Depends on:** WP-02 (invite seeding), WP-09 (`SignInPage`), WP-23 (`InviteCreateDialogPage`).
- **Key assertions:** created doc shape (reference congregation, `createdBy` email, `isValid: true`);
  `Cadastrar` + enabled button on first open; simulate consumption via raw `db.firestore` update with a
  spec comment (per the journey doc — replaces the ✋ popup leg); second open shows
  `Esse link de convite não é mais válido.` and **no** button.
- **Note:** the ✋ legs (successful redemption, wrong-email) are **not** attempted — they're tracked in
  WP-34's manual checklist.

### WP-29 — `tests/journey-moved-alert.spec.ts` (J-04)

- **Covers:** J-04 (anonymous records `MOVED` → admin reveals territory via `Territórios que Mudaram`
  toggle → badge `Mudou` → resolves via `Morador Mudou` dialog → badge gone, `Mudaram: 0` after being 1).
- **Depends on:** WP-01 (organizer caveat — the journey doc explains why `admin` performs the
  resolution leg), WP-11 (work POs), WP-16 (`TerritoryAlertsPage`), WP-20 (`StatisticsPage`), WP-14
  (sort/filter dialog).
- **Key assertions:** post-completion `recentHistory.length === 1` (UC-WORK-23 overwrite semantics);
  territory hidden from the default list (UC-TERR-10); dual-store `isResolved: true` after resolution
  (UC-TERR-30).

### WP-30 — `tests/journey-city-rename.spec.ts` (J-05)

- **Covers:** J-05 (rename `São Paulo` → cascade to territories → stale filter without reload → correct
  after reload → delete `Osasco` via native confirm → orphan territory unreachable in UI, alive in
  Firestore).
- **Depends on:** WP-25 (`ConfigurationPage`, toast), WP-13 (`TerritoriesPage`), WP-04
  (`native-dialog.util`).
- **Key assertions:** batch rename persistence; the two-phase stale/fresh filter checks; orphan survives
  with stale `city` while `db.queryWhere(..., 'congregationId', ...)` still counts it.

### WP-31 — `tests/journey-expired-designation.spec.ts` (J-06)

- **Covers:** J-06 (expired+blocking: note + all actions disabled; expired+non-blocking: ⚠ same note,
  checkbox still disabled, only maps enabled; both leave zero writes).
- **Depends on:** WP-11 (work POs).
- **Key assertions:** verbatim note `Essa designação está desabilitada. Por favor peça ao seu SG uma
  designação nova.`; the disabled/enabled matrix per mode; empty history subcollections at the end.
- **Note:** do not point this at `seed.ids.designation` (history-less → UC-WORK-04); the journey doc's
  seed block builds two dedicated designations.

### WP-32 — `tests/journey-statistics-reconciliation.spec.ts` (J-07)

- **Covers:** J-07 (clock-relative seeded visits reconciled per period and per city against the
  subcollections; boundary inclusion/exclusion at month starts).
- **Depends on:** WP-20/21 (`StatisticsPage`).
- **Key assertions:** the journey doc's reconciliation table (`Este Mês` 2/1, `1 Mês` 3/1, `3 Meses`
  4/1 for São Paulo; Osasco 1/1; `Todas` 3/2); static totals under both scopes; zero writes overall.
- **Risk:** month-boundary flake — the seed computes dates from `new Date()`; the two distinct docs keep
  counts valid even on the 1st (journey doc §Testability notes). If a run crosses midnight between seed
  and assertion, `expect.poll` the counts.

### WP-33 — `tests/journey-empty-system.spec.ts` (J-08)

- **Covers:** J-08 (second congregation, one city, zero territories: empty list renders, assign renders
  with permanently disabled submit, statistics all zeros, CSV export = header-only file; zero writes).
- **Depends on:** WP-03 (`signInAsUser('j08-admin')` — hard blocker), WP-13 (`TerritoriesPage`), WP-18
  (`AssignTerritoriesPage`), WP-20 (`StatisticsPage`), WP-17 (CSV assertions via `csv-download.util`).
- **Key assertions:** absence-of-error assertions (no toast/banner/stuck spinner — the app has no
  empty-state copy); congregation scoping (no baseline territory visible); final zero-write sweep.
- **Note:** the zero-**cities** contrast (UC-TERR-04/UC-ASSIGN-04 ⚠) is explicitly **out** of this
  journey — those entries live in WP-13/WP-18.

---

## Phase 5 exit checklist

- [ ] All 8 journeys green, each asserting at every hand-off point its doc defines.
- [ ] No manual-only leg attempted; each simulated leg carries the spec comment its journey doc requires.
- [ ] `typecheck-e2e` + full suite green (twice — isolation check).

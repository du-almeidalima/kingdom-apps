# Phase 2 — Core user paths (WP-08 … WP-12)

Auth, invite sign-in, the `/work/:id` designation flow, and navigation — the app's highest-value surface
(48 catalog entries, most of them P0). All entries here are automatable today (the OAuth popup legs are
explicitly **not** in scope — see plan README §1).

---

### WP-08 — `tests/auth.spec.ts` (rendering, matrices, session lifecycle)

- **Goal:** own every automatable auth behaviour **plus** the consolidated guard redirect matrices.
- **Covers:** UC-AUTH-01 (verify `smoke.spec.ts` suffices — no duplicate), UC-AUTH-02, UC-AUTH-03,
  UC-AUTH-08, UC-AUTH-09, UC-AUTH-10, UC-AUTH-11 (matrix — resolves UC-NAV-07, UC-ASSIGN-24, UC-STAT-17,
  UC-USERS-17 legs), UC-AUTH-12 (matrix — resolves UC-NAV-06, UC-ASSIGN-23, UC-STAT-16, UC-USERS-16
  legs), UC-AUTH-13 (resolves UC-NAV-10), UC-AUTH-22, UC-AUTH-23.
- **Depends on:** WP-05 (testids). No harness extensions needed.
- **Files:**
  - create `e2e/page-objects/login.page.ts` (`heading`, `googleButton` = `.provider-login-button`).
  - create `e2e/page-objects/welcome.page.ts` (`heading` = `welcome-heading`).
  - create `e2e/page-objects/no-account.page.ts` (`container`, `image`).
  - create `e2e/tests/auth.spec.ts`.
- **Context to read first:** `docs/features/auth-onboarding.md` (all §1–§4 + UC-AUTH-22/23);
  `docs/domain/roles-and-permissions.md` §3.
- **Implementation notes:**
  - **Matrices as parametrized tests:**
    `for (const route of ['/home','/territories','/territories/assign','/territories/statistics','/users','/welcome'])`
    → anonymous: `await expect(page).toHaveURL(/\/login/)` (UC-AUTH-11);
    publisher signed in (minus `/welcome` itself): → `/welcome` (UC-AUTH-12). One `test.describe` with
    generated `test()`s keeps titles ID-tagged (e.g. `test('UC-AUTH-11 — anonymous redirect /users → /login')`).
  - UC-AUTH-09 (cold-state non-publisher → `/welcome`): assert **cancelled navigation** — URL stays
    `/welcome`, no welcome content renders (⚠ defect family; do not assert a `/home` redirect).
  - UC-AUTH-13: `/profile` + `/configuration` render anonymously (placeholder/banner assertions are
    owned by UC-PROF-03/UC-CFG-12 in their own WPs — here only assert **no redirect** happens).
  - UC-AUTH-22: `signInAs('admin')` → `goto('/home')` →
    `page.evaluate(() => (window as any).__E2E__.auth.signOut())` → `toHaveURL(/\/login/)` +
    `#profile-link` gone.
  - UC-AUTH-23: keep it mechanism-level (spinner element exists in the shell template); do not gate CI
    on catching the transient state.
- **Acceptance criteria:** all entries above green; typecheck green; no duplication of
  `smoke.spec.ts`'s login-render test.

### WP-09 — `tests/invite-sign-in.spec.ts` (invite page states)

- **Goal:** the three render states of `/sign-in/:inviteId`.
- **Covers:** UC-AUTH-14 (valid invite renders `Cadastrar` + enabled button), UC-AUTH-15 (missing →
  `Esse link de convite não é mais válido.`), UC-AUTH-16 (consumed → same + no button).
- **Depends on:** WP-02 (invitation_links seeding), WP-05 (testids).
- **Files:**
  - create `e2e/page-objects/sign-in.page.ts` (`heading`, `googleButton`, `errorMessage` =
    `sign-in-error`).
  - create `e2e/tests/invite-sign-in.spec.ts`.
- **Context to read first:** `docs/features/auth-onboarding.md` §Invite sign-in (all six entries,
  including the manual ones for context); `docs/domain/data-model.md` §2.6.
- **Implementation notes:**
  - Seed via `seed.factories.buildInvitationLink({ congregationId: seed.ids.congregation })`; the
    consumed variant via overrides `{ isValid: false, usedAt: <past Date>, usedBy: 'consumidor@example.com' }`.
  - Assert the exact error strings verbatim (accents included) and that the provider button is **absent**
    in error states (`sign-in-card` present, `googleButton` count 0).
  - Assert the invite doc is unchanged after mere rendering (no `usedAt`/`isValid` mutation).
  - Never click the provider button (OAuth popup — plan README §2.1 note).
- **Acceptance criteria:** 3 specs green; round-trip Firestore assertions included in each.

### WP-10 — `tests/work-designation.spec.ts` part A (open & complete)

- **Goal:** the anonymous receive-and-complete path end to end.
- **Covers:** UC-WORK-01 (active open), UC-WORK-02 (missing id → blank), UC-WORK-03 (encoded slash →
  console error), UC-WORK-04 (history-less → stuck `Loading...`), UC-WORK-05 (frozen snapshot), UC-WORK-06
  (signed-in identical), UC-WORK-07 (SPOKE), UC-WORK-08 (NOT_ANSWERED), UC-WORK-09 (MOVED), UC-WORK-10
  (ASKED_TO_NOT_VISIT_AGAIN), UC-WORK-11 (revisit ⇒ name required), UC-WORK-12 (name optional), UC-WORK-13
  (notes verbatim), UC-WORK-14 (empty notes → `Sem observações`).
- **Depends on:** WP-05 (testids).
- **Files:**
  - create `e2e/page-objects/work.page.ts` (`loading`, `pendingList`, `completedList`,
    `itemByAddress(address)` filtering `work-item`, per-row `checkbox/edit/undo/maps/history` locators,
    `expiredNote`, `allDone`).
  - create `e2e/page-objects/work-item-complete-dialog.page.ts` (`dialog`, `selectOutcome(label)`,
    `revisitCheckbox` (`#revisit-checkbox`), `nameInput` (`#publisher-name`), `notesInput`
    (`#congregation-address`), `nameError`, `submit()`, `cancel()`).
  - create `e2e/tests/work-designation.spec.ts` (this WP adds part A; WP-11 extends the same file).
- **Context to read first:** `docs/features/work-designations.md` (the header's seed warning is
  **mandatory**); `docs/domain/data-model.md` §4.1, §4.2, §4.2.1; `docs/domain/glossary.md` §3.
- **Implementation notes:**
  - Seed helper **inside the spec file** (or `work.page.ts`-adjacent helper): `seedWorkLink(id, territoryOverrides)` —
    builds a real territory + a designation embedding it with `history: []` and a future `expiresAt`.
    Every spec uses it; this mechanically prevents the UC-WORK-04 factory trap in every happy-path seed.
  - Write-back assertions wrapped in `expect.poll`/`toPass` (fire-and-forget writes — §4.2.1).
  - UC-WORK-03: listen for the page `console`/`pageerror` event to assert the throw; assert blank page.
  - UC-WORK-04: assert the `Loading...` text is **still visible** after a generous settled wait; keep
    this spec last in the file (it intentionally leaves a broken observable).
  - UC-WORK-05: mutate `territories/{id}` via raw `db.firestore` **after** `seed.write`, then open the
    link and assert the old address renders.
- **Acceptance criteria:** 14 specs green incl. all persistence assertions (`designations.status`,
  `history` subcollection docs with numeric `visitOutcome`, `lastVisit`).

### WP-11 — `tests/work-designation.spec.ts` part B (correct, reverse, affordances, expiry)

- **Goal:** the correction flows and the expiry matrix.
- **Covers:** UC-WORK-15 (cancel keeps PENDING), UC-WORK-16 (edit preserves id/date), UC-WORK-17 (undo
  via `Apagar Visita`), UC-WORK-18 (history button needs embedded history), UC-WORK-19 (maps gating +
  Chromium `_self`), UC-WORK-20 (expired + blocking), UC-WORK-21 (expired + non-blocking ⚠), UC-WORK-22
  (`Parabéns!` all-done), UC-WORK-23 (⚠ `recentHistory` overwrite — assert `length === 1` in the
  documented scenario).
- **Depends on:** WP-05 (testids), WP-04 (window.open stub for UC-WORK-19).
- **Files:** extend `e2e/tests/work-designation.spec.ts` + the two work POs from WP-10; use
  `e2e/utils/window-open-stub.util.ts`; use `ConfirmDialogPage` (WP-07) for UC-WORK-17.
- **Context to read first:** `docs/features/work-designations.md` §Cancel/edit/undo, §Conditional
  affordances, §Expiry & blocking, §Completion state & full write-back.
- **Implementation notes:**
  - UC-WORK-16: seed the designation territory `status: 'DONE'` with one embedded `buildVisitHistory`
    entry; after editing, assert the subcollection still has exactly one doc with the **same** `id` and
    `date`.
  - UC-WORK-17: `title="Apagar Visita"` eraser → `ConfirmDialogPage.confirm()` → assert status
    `PENDING`, subcollection empty, `lastVisit` `null`.
  - UC-WORK-19: assert the maps button's **absence** without `mapsLink`; for presence, install the
    window.open stub before clicking and assert the recorded URL (Chromium `_self` branch — never
    `waitForEvent('popup')`).
  - UC-WORK-20/21: seed `expiresAt: new Date('2020-01-01')` for determinism (no wall-clock tricks);
    assert the exact `lib-note` text and the disabled/enabled matrix (⚠ UC-WORK-21: checkbox disabled,
    maps enabled).
  - UC-WORK-23: seed territory with 5 visits + a fresh empty-history designation; after completion assert
    subcollection has 6 docs while parent `recentHistory.length === 1` (locks in the defect).
- **Acceptance criteria:** 9 specs green; file total 23 UC-WORK entries.

### WP-12 — `tests/navigation.spec.ts`

- **Goal:** shell chrome, home hub, router edge cases, home links.
- **Covers:** UC-NAV-01, UC-NAV-02, UC-NAV-03, UC-NAV-04, UC-NAV-05, UC-NAV-08, UC-NAV-09, UC-NAV-11,
  UC-NAV-12, UC-NAV-13, UC-NAV-14. (UC-NAV-06/07/10 are owned by WP-08's matrices — do not duplicate.)
- **Depends on:** WP-05 (testids); **WP-03** for UC-NAV-08 (seed `buildUser({ role: 'VIEWER' })` — a
  role string that is not `PUBLISHER` (would redirect), not `APP_ADMIN` (would bypass), and not in the
  route's allowed list, so the guard returns `false` — then sign in via `signInAsUser`).
- **Files:**
  - create `e2e/page-objects/home.page.ts` (`heading`, `cardTerritories`, `cardPeople`, links).
  - create `e2e/tests/navigation.spec.ts`; use `HeaderComponentPage` (WP-07).
- **Context to read first:** `docs/features/navigation-shell.md`; `docs/domain/glossary.md` §2 (home
  card labels).
- **Implementation notes:**
  - UC-NAV-08: assert URL retained + empty outlet (no content), no toast — the ⚠ silent-cancel reality.
  - UC-NAV-09: capture `console` errors, assert `Cannot match any routes` appears + empty outlet.
  - UC-NAV-04: mechanism-level only (like UC-AUTH-23).
  - Link tests (11–14): click from `/home`, assert URL + target heading testid from WP-05/06 batches.
- **Acceptance criteria:** 11 specs green; the three dup-owned entries are absent from this file
  (comment in the file header points at `auth.spec.ts`).

---

## Phase 2 exit checklist

- [ ] 48 catalog entries implemented (11 AUTH + 3 invite + 14+9 WORK + 11 NAV), zero manual legs attempted.
- [ ] Redirect-leg dups exist **only** in `auth.spec.ts`.
- [ ] `typecheck-e2e` + full suite green (twice — isolation check).

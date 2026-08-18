# Phase 0 — Harness foundations (WP-01 … WP-04)

The four harness extensions from
[`../../docs/test-catalog.md#harness-extensions-needed`](../../docs/test-catalog.md#harness-extensions-needed).
Everything here lives **inside `e2e/`** — no app code is touched. These unblock ~40 catalog rows, so they
land first. Each WP is independent of the others.

**Gate for the whole phase:** `npx nx typecheck-e2e ministry-maps` green + full suite still green
(these WPs must not change the behaviour of the two existing spec files).

---

### WP-01 — HX-1: extra `signInAs` roles (elder, organizer, superintendent, app_admin)

- **Goal:** make `signInAs('elder' | 'organizer' | 'superintendent' | 'app_admin')` work exactly like the
  existing `'admin' | 'publisher'` roles.
- **Covers (unblocks):** UC-NAV-08 (a custom non-listed role), UC-TERR-35/36, UC-ASSIGN-22, UC-STAT-15,
  UC-USERS-04/06/15, UC-PROF-05/06/07/08, J-02 (elder), J-04 (organizer).
- **Depends on:** nothing.
- **Files:**
  - edit `e2e/seed/default.seed.ts` — add 4 users to `DEFAULT_SEED_IDS`
    (`elderUser: 'seed-user-elder'`, `organizerUser: 'seed-user-organizer'`,
    `superintendentUser: 'seed-user-superintendent'`, `appAdminUser: 'seed-user-app-admin'`) and to the
    `buildDefaultSeed()` users array (realistic pt-BR names, `{id}@example.com` emails, correct
    `RoleEnum` values, `congregationId: seed-congregation`). The seeder already creates a matching Auth
    emulator user (`uid === doc id`, `DEFAULT_PASSWORD`) for every seeded user — nothing else needed.
  - edit `e2e/config/auth.config.ts` — extend `TestRole` and `ROLE_UIDS` with the four new mappings.
  - edit `e2e/README.md` — update the `ROLE_UIDS` / `signInAs` docs.
- **Context to read first:** `docs/domain/roles-and-permissions.md` §5–6; `e2e/seed/default.seed.ts`;
  `e2e/config/auth.config.ts`.
- **Acceptance criteria:**
  1. `typecheck-e2e` green.
  2. Baseline counts change — `users` goes from 4 to **8**: update the existing `smoke.spec.ts`
     baseline-count test and its docs comment (this is the one allowed edit to an existing spec).
  3. A scratch verification (can be a temporary spec, deleted before commit, or folded into the first
     consumer WP): each new role signs in via `signInAs` and the guard resolves it (e.g. elder reaches
     `/territories`, app_admin reaches `/users`).
  4. Full suite green.
- **Notes/risks:** keep the new users out of any assertion that counts/orders the `/users` list — the
  baseline user list grows, so later WPs that assert user-list ordering (WP-22) must be written against
  the **8-user** baseline (update `docs/features/users-invites.md` expectations if they cite `4` — see
  WP-22's note about syncing the docs).

### WP-02 — HX-2: `invitation_links` seed support

- **Goal:** seed invitation links through the harness vocabulary (`seed.factories.buildInvitationLink` +
  `seed.write({ invitationLinks: [...] })`) instead of raw `db.firestore` writes.
- **Covers (unblocks):** UC-AUTH-14/16 (automatable legs), UC-AUTH-17/18/19/20 (manual legs' seeds),
  J-03; simplifies UC-USERS-11/13 read-backs.
- **Depends on:** nothing.
- **Files:**
  - edit `e2e/seed/collections.ts` — add `invitation_links: 'invitation_links'` (mind the
    **underscore**) with the same "keep in sync with the datasource" comment
    (`FirebaseInvitationLinkDataSourceService.COLLECTION_NAME`).
  - create `e2e/seed/factories/invitation-link.factory.ts` — `buildInvitationLink(over)` with realistic
    defaults: `createdAt: new Date()`, `createdBy: 'carlos.almeida@example.com'`, `role:
    RoleEnum.ORGANIZER`, `isValid: true`, `email: undefined` (optional), `congregationId` **required
    override** (same pattern as `buildUser`/`buildTerritory`).
  - edit `e2e/seed/factories/index.ts` — export it.
  - edit `e2e/seed/types.ts` — `InvitationLinkSeed` type (typed against
    `src/models/invitation-link.ts`, with `congregationId` in place of the hydrated `congregation`) +
    optional `invitationLinks` field on `SeedDefinition`.
  - edit `e2e/seed/seeder.ts` — write invites **mirroring the app's creation-time shape**
    (`docs/domain/data-model.md` §2.6): `congregation` stored as a `DocumentReference`
    (`firestore.doc(\`congregations/${congregationId}\`)`), the doc's own `id` also written inside the
    body, dates as plain `Date`s.
  - edit `e2e/README.md` — document the new factory + collection.
- **Context to read first:** `docs/domain/data-model.md` §1, §2.6 (incl. the shape-drift caveat);
  `apps/ministry-maps/src/app/repositories/firebase/firebase-invitation-link-datasource.service.ts`.
- **Acceptance criteria:**
  1. `typecheck-e2e` green.
  2. Round-trip proof: `seed.write({ invitationLinks: [buildInvitationLink({ congregationId: seed.ids.congregation })] })`,
     then the raw doc read back via `db.firestore` shows `congregation` as a `DocumentReference` whose
     path is `congregations/seed-congregation`, `isValid === true`, and the embedded `id`.
  3. Full suite green.
- **Notes/risks:** do **not** model the consumed shape in the factory — consumption is a write the app
  performs; specs that need a consumed invite build one with `isValid: false, usedAt, usedBy` overrides
  (the seeder writes what it's given).

### WP-03 — HX-3: `signInAsUser(uid)` arbitrary-uid identity

- **Goal:** sign in as **any** seeded user, not just the named `ROLE_UIDS` ones — required for
  second-congregation identities.
- **Covers (unblocks):** UC-ASSIGN-03/04/14, UC-TERR-04, UC-STAT-13, J-08 (hard blocker).
- **Depends on:** nothing (pairs naturally with WP-01 but doesn't require it).
- **Files:**
  - edit `e2e/fixtures/auth.fixture.ts` — extract the token-mint + `__E2E__` sign-in + settle-wait logic
    into a reusable `signInWithUid(page, uid)`; expose `signInAsUser(uid)` in the fixture API; re-implement
    `signInAs(role)` as `signInWithUid(page, ROLE_UIDS[role])` (no behaviour change).
  - edit `e2e/README.md` — document `signInAsUser`.
- **Context to read first:** `e2e/fixtures/auth.fixture.ts`; `.agents/rules/e2e-testing.md` §Auth
  Fixture.
- **Acceptance criteria:**
  1. `typecheck-e2e` green.
  2. `signInAs('admin')` behaves byte-for-byte as before (existing specs untouched and green).
  3. Round-trip proof: seed `buildUser({ id: 'x-admin', role: 'ADMIN', congregationId: <new congregation> })`,
     `signInAsUser('x-admin')`, reach a guarded route scoped to that congregation.
  4. Full suite green.
- **Notes/risks:** keep the actionable timeout error messages the fixture already throws; the new API
  must surface the same guidance when the uid doesn't exist in the Auth emulator.

### WP-04 — HX-5: shared spec utilities

- **Goal:** one canonical implementation each of the five browser-interaction techniques, so specs don't
  copy boilerplate. Small, pure, individually importable helpers.
- **Covers (unblocks):** UC-TERR-21 (drag), UC-TERR-34 (CSV), UC-ASSIGN-19 (whatsapp popup),
  UC-USERS-14 (window.open), UC-WORK-19 (maps `_self`), UC-CFG-10 (native confirm); reused by J-01,
  J-05, J-08.
- **Depends on:** nothing.
- **Files (create under `e2e/utils/`, kebab-case, following the `e2e/firebase/*.util.ts` naming):**
  - `e2e/utils/window-open-stub.util.ts` — installs a `window.open` recorder via `page.addInitScript`
    (`(window as any).__openedUrls: string[]`) and returns a `getOpenedUrls(page)` reader. Used for
    UC-USERS-14 and the Firefox/Safari branch of UC-WORK-19.
  - `e2e/utils/whatsapp-link.util.ts` — `captureWhatsAppPopup(page, trigger: () => Promise<void>)`:
    wraps `page.waitForEvent('popup')` around the trigger, reads `popup.url()`, extracts and
    URL-decodes the `text=` param, returns `{ whatsappUrl, sharedUrl }` (the shared `/work/{id}` URL for
    id extraction). Documents the custom-protocol caveat inline.
  - `e2e/utils/csv-download.util.ts` — `downloadCsv(page, trigger)`: wraps
    `page.waitForEvent('download')`, returns `{ suggestedFilename, content }` where `content` is the
    full text read from `download.path()` (BOM-aware: assert/keep the `\uFEFF` prefix available to the
    caller).
  - `e2e/utils/native-dialog.util.ts` — `acceptNextDialog(page)` / `dismissNextDialog(page)`:
    `page.once('dialog', …)` registrars with a comment explaining the registration-before-click rule.
  - `e2e/utils/cdk-drag.util.ts` — `dragRowByMouse(page, source: Locator, target: Locator)`: hover →
    `mouse.down()` → ≥3 intermediate `mouse.move()` steps → `mouse.up()` (CDK ignores HTML5 drag events
    and `dragTo()`; see UC-TERR-21).
  - edit `e2e/README.md` — list the new utilities.
- **Context to read first:** `../../docs/testability-gaps.md` §2 (each technique's trap is documented
  there — mirror it in code comments).
- **Acceptance criteria:**
  1. `typecheck-e2e` green (these files are type-checked like everything else under `e2e/`).
  2. Each helper has JSDoc pointing at the catalog entry it serves.
  3. Full suite green.
- **Notes/risks:** keep helpers free of `test`/`expect` imports where practical (pure Playwright +
  Node), so they stay usable from fixtures too; the CSV helper must not strip the BOM itself — the
  assertion *is* about the BOM.

---

## Phase 0 exit checklist

- [ ] `signInAs` supports 6 roles; baseline users = 8; `smoke.spec.ts` count updated.
- [ ] `seed.factories.buildInvitationLink` + `seed.write({ invitationLinks })` work; `Collections.invitation_links` exists.
- [ ] `signInAsUser(uid)` exists; `signInAs(role)` delegates to it.
- [ ] Five utilities exist under `e2e/utils/` and are documented in `e2e/README.md`.
- [ ] `typecheck-e2e` + full suite green (twice — isolation check).

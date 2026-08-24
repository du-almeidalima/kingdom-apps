# Phase 4 — People & configuration (WP-22 … WP-25)

`/users` (list, edit, delete, invites), `/profile`, `/configuration` — 39 catalog entries.

---

### WP-22 — `tests/users.spec.ts` (list, edit, delete)

- **Goal:** the people administration surface.
- **Covers:** UC-USERS-01 (scope + role-priority order), UC-USERS-02 (row anatomy), UC-USERS-03 (foreign
  user hidden), UC-USERS-04 (dialog fields; `SUPERINTENDENT` only for APP_ADMIN), UC-USERS-05 (⚠ form
  disabled for non-APP_ADMIN, `Salvar` no-ops), UC-USERS-06 (APP_ADMIN edit persists), UC-USERS-07
  (editing self not special-cased), UC-USERS-08 (delete confirm + doc removal), UC-USERS-09 (⚠ Auth
  account survives), UC-USERS-15 (ORGANIZER/ELDER reduced UI). (UC-USERS-16/17 owned by WP-08.)
- **Depends on:** WP-06 (testids), WP-07 (`ConfirmDialogPage`), WP-01 (app_admin/organizer/elder
  identities).
- **Files:**
  - create `e2e/page-objects/users.page.ts` (`heading`, `list`, `rowByName(name)`, per-row `menuTrigger`,
    `initials`, `roleBadge`).
  - create `e2e/page-objects/user-edit-dialog.page.ts` (`dialog`, `nameInput`, `roleRadio(label)`,
    `save()`, form-disabled locator).
  - create `e2e/tests/users.spec.ts`.
- **Context to read first:** `docs/features/users-invites.md` §Listing, §Edit-user dialog, §Delete
  user, §Role gating.
- **Implementation notes:**
  - ⚠ **WP-01 grew the baseline to 8 users** — ordering/count assertions must use the post-WP-01
    baseline (role-priority order: admins/superintendent/app_admin first, then elders/organizers,
    publishers last — assert the relative order of the seeded names, not a hardcoded full list, to stay
    resilient). If `docs/features/users-invites.md` cites the 4-user baseline in a way that contradicts
    the new seeds, update that docs entry (plan README §2.8).
  - UC-USERS-01 ordering: assert the exact `db.getCollectionDocs` subset ↔ DOM order correspondence for
    the seeded roles.
  - UC-USERS-05 (⚠ core assertion): sign in as `admin`, open edit on a publisher row → every form
    control `disabled`; click `Salvar` anyway → assert the persisted doc is **unchanged** (no-op write),
    no error shown.
  - UC-USERS-06: `signInAs('app_admin')` → same dialog is enabled; change the name → persists.
  - UC-USERS-09 (⚠): after deleting a user, `db.getDoc(users, uid)` is `undefined` **and**
    `db.auth.getUser(uid)` still resolves (locks in the defect).
- **Acceptance criteria:** 10 entries green.

### WP-23 — `tests/users-invites.spec.ts` (invite creation & sharing)

- **Goal:** the invite-creation dialog and its share affordances.
- **Covers:** UC-USERS-10 (ADMIN-only FAB), UC-USERS-11 (defaults; persisted doc — `congregation` as
  `DocumentReference`, `createdBy` = email, `isValid: true`; blank email persists as `email: ''` ⚠),
  UC-USERS-13 (link = `${environment.baseUrl}sign-in/{id}` + clipboard copy), UC-USERS-14 (`Enviar` →
  whatsapp link; window.open stub).
- **Depends on:** WP-06 (testids), WP-04 (`window-open-stub.util`). (WP-02 is **not** required — the
  app writes the invite through the UI; read-backs can use `db.firestore.collection('invitation_links')`
  or, once WP-02 landed, `db.collections.invitation_links`.)
- **Files:**
  - create `e2e/page-objects/invite-create-dialog.page.ts` (`dialog`, `emailInput`
    (`invite-email-input`), `roleRadio(label)`, `submit()`; copy-view: `linkText`
    (`invite-copy-link-text`), `copyButton`, `sendButton`, `closeButton`).
  - create `e2e/tests/users-invites.spec.ts`.
- **Context to read first:** `docs/features/users-invites.md` §Invitation-link creation, §Invitation-
  link sharing.
- **Implementation notes:**
  - Capture the created id from `invite-copy-link-text`'s rendered `${baseUrl}sign-in/{id}`; the
    expected base URL comes from the app's environment (`http://localhost:4200/` under the harness) —
    derive it from the rendered text, never hardcode.
  - UC-USERS-11 persistence: `(await db.firestore.collection('invitation_links').doc(id).get()).data()`
    — `congregation` is a `DocumentReference` (assert `.path` or `.id`), `createdBy ===
'carlos.almeida@example.com'`, `role === 'ORGANIZER'` (default), `isValid === true`; the blank-email
    leg asserts `email === ''`.
  - UC-USERS-13 clipboard: `context.grantPermissions(['clipboard-read','clipboard-write'])`, click copy,
    `navigator.clipboard.readText()` === rendered link; assert checkmark swap is optional.
  - UC-USERS-14: install the window.open stub **before** clicking `Enviar`; assert the recorded URL
    starts with `whatsapp://send?text=` and contains the invite id; also assert the invite doc untouched
    (`isValid` still true).
- **Acceptance criteria:** 4 entries green.

### WP-24 — `tests/profile.spec.ts`

- **Goal:** identity card, congregation switch, logout.
- **Covers:** UC-PROF-01 (ADMIN card), UC-PROF-02 (PUBLISHER card), UC-PROF-03 (⚠ anonymous
  placeholders), UC-PROF-04 (switch hidden for ADMIN/PUBLISHER), UC-PROF-05 (switch lists congregations
  by name), UC-PROF-06 (switch persists + re-scopes without reload), UC-PROF-07 (⚠ no-congregation
  no-op — document-only leg), UC-PROF-08 (⚠ non-privileged switch throws, swallowed), UC-PROF-09 (logout
  confirm → `/login`), UC-PROF-10 (logout cancel).
- **Depends on:** WP-06 (testids), WP-07 (`ConfirmDialogPage`), WP-01 (superintendent/app_admin for
  05–08; 07's raw congregation-less user also needs WP-03's `signInAsUser` — or mark 07 as
  documentation-only per its P2 nature, see note below).
- **Files:**
  - create `e2e/page-objects/profile.page.ts` (`initials`, `name`, `roleBadge`, `congregationName`,
    `congregationSelect`, `logoutButton`).
  - create `e2e/tests/profile.spec.ts`.
- **Context to read first:** `docs/features/profile.md` (all entries); `docs/domain/roles-and-
permissions.md` §3.1, §4.
- **Implementation notes:**
  - UC-PROF-03: assert verbatim placeholders `XX`, `Meu Nome`, `LS Congregação`, `Publicador` and **no**
    redirect.
  - UC-PROF-05/06: seed a second congregation (`buildCongregation({ name: 'Congregação Vila Nova' })`);
    `signInAs('superintendent')`; after switching, assert the user's `congregation` reference changed and
    that an SPA navigation to `/territories` shows the new cities **without** reload (contrast with
    UC-CFG-11).
  - UC-PROF-07: P2 dead-guard — acceptable to implement as a comment-documented skip (`test.fixme` with
    a link to the entry) rather than an awkward raw-seed flow; decide in the WP and keep the reasoning
    in the spec.
  - UC-PROF-08: mutate the signed-in user's role to `PUBLISHER` via `db.firestore` mid-session, attempt
    the switch, assert the select reverts + no toast + reference unchanged.
  - UC-PROF-09: dialog title `Sair`, body `Você realmente deseja sair?`; after `Confirmar` →
    `toHaveURL(/\/login/)`.
- **Acceptance criteria:** 10 entries green (07 as implemented-or-`fixme` per the note).

### WP-25 — `tests/configuration.spec.ts`

- **Goal:** the cities management screen, including its defect catalogue.
- **Covers:** UC-CFG-01 (list), UC-CFG-02 (add row), UC-CFG-03 (rename inline), UC-CFG-04 (cancel),
  UC-CFG-05 (single-edit constraint + save mid-edit), UC-CFG-06 (empty-name toast), UC-CFG-07
  (duplicate-name toast), UC-CFG-08 (save → congregation + batch territory rename), UC-CFG-09 (new city
  skips batch), UC-CFG-10 (⚠ delete → orphan; native confirm), UC-CFG-11 (⚠ stale filter until reload),
  UC-CFG-12 (⚠ anonymous banner), UC-CFG-13 (⚠ PUBLISHER can edit and persist).
- **Depends on:** WP-06 (testids), WP-04 (`native-dialog.util`), WP-07 (`ToastPage`).
- **Files:**
  - create `e2e/page-objects/configuration.page.ts` (`heading`, `cityRows`, `rowByName(name)`,
    `cityInput` on the editing row, `addCityButton`, `saveButton`, per-row `editButton`/`deleteButton`,
    `noCongregationBanner`).
  - create `e2e/tests/configuration.spec.ts`.
- **Context to read first:** `docs/features/configuration-cities.md` (entire doc — note the
  **English** strings are asserted verbatim).
- **Implementation notes:**
  - Toast texts verbatim: `All cities must have a name.` / `City names must be unique.` /
    `Cities updated successfully!`
  - UC-CFG-08: assert `congregations/{id}.cities` deep-equals the renamed array **and** both affected
    territories' `city` fields updated, the other city's territory untouched.
  - UC-CFG-10: `acceptNextDialog(page)` **before** clicking `Delete`; after save, assert the city is
    gone from `cities` while `seed-territory-2.city` is still the removed name (⚠ orphan).
  - UC-CFG-11: after a rename + save, `page.goto('/territories')` shows the **old** options; then
    `page.reload()` shows the new name — assert both halves.
  - UC-CFG-13 (⚠ most severe): `signInAs('publisher')` → rename a city → save succeeds; assert the
    write persisted (locks in the unenforced gating).
- **Acceptance criteria:** 13 entries green.

---

## Phase 4 exit checklist

- [ ] 39 catalog entries implemented (10 + 4 + 10 + 13, plus 2 profile judgement calls documented).
- [ ] `typecheck-e2e` + full suite green (twice — isolation check).

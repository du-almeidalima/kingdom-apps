# Journeys (`J-NN`) — cross-feature, multi-role flows

A **journey** is an ordered, executable-style script that walks several use cases across multiple screens
and **multiple identities**, asserting both the DOM and Firestore at every hand-off. Journeys are where the
app's real value is proven end-to-end (e.g. "an admin assigns, a publisher works, an elder verifies").

Each journey becomes **one spec file** under `e2e/tests/` (suggested names are listed per journey and in
[`../test-catalog.md`](../test-catalog.md)); the `test()` title starts with the journey ID
(`test('J-02 — visit feedback loop to elder', ...)`) and the steps inside reference the composed UC IDs in
comments. Splitting a journey into several `test()` blocks is acceptable **only** if each block re-establishes
its own seed (remember: `resetAndSeed` wipes the emulators before every test — state never carries over
between tests, only between steps *inside* one test).

## Index

| ID | Journey | Identities | Priority | Suggested spec file |
|---|---|---|---|---|
| [J-01](./j-01-admin-creates-assigns-publisher-works.md) | Admin creates territories, builds **two** designations mixing new + seeded territories; each publisher opens their own link and sees exactly their own territories | Admin → anonymous ×2 | P0 | `e2e/tests/journey-admin-assign-work.spec.ts` |
| [J-02](./j-02-visit-feedback-loop-to-elder.md) | Publisher completes a territory with a revisit; an Elder then verifies the history entry, the badge, and the statistics delta | anonymous → Elder | P0 | `e2e/tests/journey-visit-feedback.spec.ts` |
| [J-03](./j-03-invite-onboarding.md) | Admin creates an invite; it is opened (valid), re-opened after consumption (`INVALID_LINK`), and attempted with a wrong email (`INVALID_EMAIL`) | Admin → anonymous invitee | P0 | `e2e/tests/journey-invite-onboarding.spec.ts` |
| [J-04](./j-04-moved-alert-resolution.md) | Publisher records `MOVED`; the alert appears on `/territories`; an Organizer resolves it; badge and `Mudaram` count update | anonymous → Organizer | P1 | `e2e/tests/journey-moved-alert.spec.ts` |
| [J-05](./j-05-city-rename-cascade.md) | Admin renames a city (batch territory update + filter reload caveat), then deletes a city and observes the orphaned territory | Admin | P1 | `e2e/tests/journey-city-rename.spec.ts` |
| [J-06](./j-06-expired-designation.md) | An expired designation blocks its actions when `shouldDesignationBlockAfterExpired` is `true`, and stays *equally* checkbox-blocked (maps-only difference) when `false` | Admin → anonymous | P1 | `e2e/tests/journey-expired-designation.spec.ts` |
| [J-07](./j-07-statistics-reconciliation.md) | History seeded across period boundaries is reconciled per period and per city against the Firestore subcollections | Admin | P1 | `e2e/tests/journey-statistics-reconciliation.spec.ts` |
| [J-08](./j-08-empty-system.md) | A brand-new congregation with no territories behaves gracefully across list, assign, statistics and CSV export | Admin (second congregation) | P1 | `e2e/tests/journey-empty-system.spec.ts` |

## Conventions

### 1. Identity switches inside one test

A journey runs on the single fixture-provided `page`. Switch identities **explicitly**:

| Switch | How | Notes |
|---|---|---|
| anonymous → role | `await signInAs('admin' \| 'publisher')` then `page.goto(target)` | `signInAs` leaves the page on `/login` by design (UC-AUTH-03); the caller always navigates. |
| role → anonymous | `await page.evaluate(() => (window as any).__E2E__.auth.signOut())` | Triggers the forced-logout subscription (UC-AUTH-22): both state services clear and the app navigates itself to `/login`. **Then** `page.goto(...)` for the anonymous leg. |
| role → another role | sign out (row above) **first**, then `signInAs(other)` | Never mint a second custom token over a live session: the app-level `UserStateService` would keep the previous user while Firebase swaps the auth user — an inconsistent state the app never produces on its own. |

Two *anonymous* publishers opening two different links (J-01) do **not** need two browser contexts:
`/work/:id` is unguarded and holds no session state, so sequential legs on the same page faithfully simulate
"two different people each opening their own WhatsApp link". A fresh `browser.newContext()` per person is a
valid stronger isolation, but it opts out of the composed fixtures (`seed`, `db`, `signInAs` are bound to
the default `page`) — prefer sequential legs unless a journey explicitly calls for isolation.

### 2. Hand-off assertions

- At every **hand-off point** (marked `⟶ HAND-OFF`), assert Firestore state via `db.*` **before** switching
  identity or screen. UI-only confirmation is not a hand-off.
- Client writes in this app are frequently **fire-and-forget** (see
  [`../domain/data-model.md §4.2.1`](../domain/data-model.md#421-the-visit-write-back-is-fire-and-forget)):
  wrap persistence assertions in `await expect(async () => { ... }).toPass()` or `expect.poll(...)` instead
  of a single immediate `toBe`, especially after `/work/:id` completions and invite consumption.
- Firestore `Timestamp`s come back from the Admin SDK as `Timestamp` objects — compare with
  `.toDate()`/`.toMillis()` and a small tolerance, never with `toEqual(new Date())`.

### 3. Passing links between identities

- "Sharing the link" is simulated by **capturing the designation/invite id** and later calling
  `page.goto('/work/' + id)` / `page.goto('/sign-in/' + id)`. Two capture techniques, in order of preference:
  1. **Firestore:** `db.queryWhere(db.collections.designations, 'congregationId', '==', seed.ids.congregation)`
     (filter out `seed.ids.designation`), or a raw `db.firestore.collection('invitation_links')` query.
  2. **The WhatsApp popup URL:** `page.waitForEvent('popup')` after submitting on `/territories/assign`,
     then decode the `text=` query param (UC-ASSIGN-19). Use this when the journey also wants to prove the
     share-link composition itself; otherwise prefer Firestore.
- The WhatsApp deep link, the real Google OAuth popup, and a mobile device are **out of scope** — see
  [`../testability-gaps.md`](../testability-gaps.md). Manual-only legs inside a journey are marked
  `✋ MANUAL-ONLY` and the automated alternative/simulation is stated right next to them.

### 4. Seed discipline

- Every journey states its full seed up front, in harness vocabulary (`seed.factories.build*`,
  `seed.write`, `DEFAULT_SEED_IDS`). Anything the harness cannot express yet (a second congregation admin,
  an `ELDER` identity, an invitation link) is marked `⚙ HARNESS-EXTENSION` and cross-referenced in
  [`../test-catalog.md#harness-extensions-needed`](../test-catalog.md#harness-extensions-needed); the
  interim workaround is written out inline, so the journey is executable today.
- `/work/:id` seeds must override `history: []` (or real entries) on **every** `buildDesignationTerritory`
  — the factory default omits `history` and crashes the page's read converter (UC-WORK-04).

## Sources

- `apps/ministry-maps/e2e/fixtures/{auth,database}.fixture.ts`, `e2e/config/auth.config.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`
- the composed use-case documents under `docs/features/`

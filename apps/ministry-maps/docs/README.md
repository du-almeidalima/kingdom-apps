# Ministry Maps — E2E Use-Case & Journey Map

This directory is the **behavioural specification of Ministry Maps written for test automation**.
It exists so that an agent (or a human) can open it in a *fresh session*, pick an entry, and write a
Playwright + Firebase-emulator E2E spec **without reading the application source code first**.

> This is a **derived artifact**. Every behavioural claim was verified against the source files listed
> in the `Sources` section at the bottom of each document. After a refactor, re-verify against those
> paths before trusting an entry.

---

## What is in here

| Path | Purpose |
|---|---|
| [`domain/data-model.md`](./domain/data-model.md) | The "second brain": Firestore collections, every model's fields, storage contracts and invariants. Read this **before writing any seed**. |
| [`domain/roles-and-permissions.md`](./domain/roles-and-permissions.md) | `RoleEnum`, `authGuard` semantics, `libAuthorize` directive, role → route/feature matrix. |
| [`domain/glossary.md`](./domain/glossary.md) | pt-BR ↔ English domain terms and the UI label dictionary used for locale-accurate selectors. |
| [`features/*.md`](./features) | One file per feature area, containing the numbered use cases (`UC-<AREA>-NN`). |
| [`journeys/*.md`](./journeys) | Cross-feature, multi-role scripts (`J-NN`) composing several use cases. |
| [`test-catalog.md`](./test-catalog.md) | Flat worklist: every UC/J with priority, suggested spec file, harness needs and blocking gaps. |
| [`testability-gaps.md`](./testability-gaps.md) | What must be added to the app (selectors, hooks) or worked around before certain specs can exist. |

### Feature documents

| File | ID prefix | Area |
|---|---|---|
| [`features/auth-onboarding.md`](./features/auth-onboarding.md) | `UC-AUTH` | `/login`, `/sign-in/:inviteId`, `/welcome`, `/no-account`, guards, logout |
| [`features/navigation-shell.md`](./features/navigation-shell.md) | `UC-NAV` | header, home hub links, role gating, unknown routes |
| [`features/territories-management.md`](./features/territories-management.md) | `UC-TERR` | `/territories` list, filters, CRUD, alerts, history, CSV |
| [`features/territories-assign.md`](./features/territories-assign.md) | `UC-ASSIGN` | `/territories/assign` designation creation & sharing |
| [`features/territories-statistics.md`](./features/territories-statistics.md) | `UC-STAT` | `/territories/statistics` metrics |
| [`features/work-designations.md`](./features/work-designations.md) | `UC-WORK` | `/work/:id` receiving and completing designations |
| [`features/users-invites.md`](./features/users-invites.md) | `UC-USERS` | `/users` list, edit, delete, invitation links |
| [`features/profile.md`](./features/profile.md) | `UC-PROF` | `/profile` identity card, congregation switch, logout |
| [`features/configuration-cities.md`](./features/configuration-cities.md) | `UC-CFG` | `/configuration` congregation cities |

---

## How to use this artifact (E2E-authoring workflow)

1. Read [`domain/data-model.md`](./domain/data-model.md) once — it prevents seeds that the app cannot read
   (e.g. `User.congregation` must be a Firestore `DocumentReference`, `visitOutcome` is a **number**).
2. Open [`test-catalog.md`](./test-catalog.md) and pick the highest-priority rows that are **not blocked**.
3. If a row is blocked, resolve the corresponding item in [`testability-gaps.md`](./testability-gaps.md) first
   (usually adding a `data-testid`), in a separate change from the spec.
4. Open the feature document, read the full use-case entry, and translate it 1:1 into a `test()` whose title
   starts with the UC ID, e.g. `test('UC-WORK-03 — completes a visit accepting a revisit', ...)`.
5. Assert **both** the DOM and Firestore. Every entry ships at least one persistence assertion; it is not
   optional — this suite exists to prove real backend behaviour.
6. Journeys become their own spec files; keep the step order and assert at every hand-off point.

### The harness you must use

Everything lives in [`../e2e`](../e2e) (see [`../e2e/README.md`](../e2e/README.md) and
`.ai/rules/frontend/e2e-testing.md`). Import `test`/`expect` from `../fixtures` only.

```ts
import { expect, test } from '../fixtures';

test('UC-TERR-01 — list shows only the congregation territories', async ({ page, seed, db, signInAs }) => {
  await seed.write({ territories: [seed.factories.buildTerritory({ congregationId: seed.ids.congregation })] });
  await signInAs('admin');
  // ...
  const territories = await db.getCollectionDocs(db.collections.TERRITORIES);
  expect(territories).toHaveLength(4);
});
```

Available today:

- `seed.factories` — `buildCongregation`, `buildUser`, `buildTerritory`, `buildVisitHistory`,
  `buildDesignation`, `buildDesignationTerritory`
- `seed.write(definition)` — writes a `SeedDefinition` (`congregations`, `users`, `territories`, `designations`)
- `seed.ids` — `DEFAULT_SEED_IDS` (see [`domain/data-model.md`](./domain/data-model.md#default-e2e-baseline-seed))
- `db.*` read helpers — exact signatures (get these right, the docs use them verbatim):

  ```ts
  db.collections            // { congregations, users, territories, designations } — lowercase keys
  db.historySubcollection   // 'history'
  db.getDoc(collection, id)                            // → data | undefined
  db.getDocSnapshot(collection, id)                    // → DocumentSnapshot (inspect Timestamp / DocumentReference)
  db.getCollectionDocs(collection)                     // → data[]
  db.getSubcollectionDocs(collection, id, subcollection)
  db.queryWhere(collection, field, operator, value)     // → data[]
  db.firestore / db.auth                               // raw Admin SDK escape hatch
  ```
- `signInAs('admin' | 'publisher')` and the `authenticatedPage` fixture
- `resetAndSeed` — automatic per-test wipe + default seed (the emulator starts **empty**)

Anything not in that list (an ELDER identity, an invitation-link factory, …) is a **harness extension**;
it is listed in [`test-catalog.md`](./test-catalog.md#harness-extensions-needed). Add it to the harness,
do not inline ad-hoc Admin-SDK writes in a spec.

---

## Conventions

### ID scheme

- Use cases: `UC-<AREA>-NN` — `AREA` ∈ `AUTH`, `NAV`, `TERR`, `ASSIGN`, `STAT`, `WORK`, `USERS`, `PROF`, `CFG`.
- Journeys: `J-NN`.
- IDs are **stable forever**. Never renumber. Superseded entries are marked `(deprecated)` and kept in place;
  new behaviour always takes the next free number.

### Priorities

| Priority | Meaning |
|---|---|
| **P0** | Core path — if this breaks, the app fails its purpose (assign a territory, work it, persist the visit, sign in). Automate first. |
| **P1** | Important variant, guard, or negative path that users hit regularly (filters, expiry, permissions, validation). |
| **P2** | Cosmetic, rare, or low-risk detail (labels, ordering nuances, empty-state copy). |

### Language

Prose is **English**. Every user-visible string is quoted **verbatim in pt-BR**, accents included, because
selectors rely on it (`getByRole('button', { name: 'Concluir' })`). Never translate a quoted UI string.

### Behaviour vs intent

Where the implementation contradicts what a reader would expect, the entry documents **what the code does
today** and adds a `⚠ suspected defect` note plus the assertion a test should make *now*. Tests must lock in
reality; changing the behaviour is a separate product decision. All such items are consolidated in
[`testability-gaps.md`](./testability-gaps.md#documented-current-behaviour-vs-suspected-defects).

### Use-case entry template

Every entry in `features/*.md` follows exactly this shape:

```markdown
#### UC-WORK-03 — Publisher completes a visit accepting a revisit
- **Actor:** Publisher holding the designation link (no auth required)
- **Route:** `/work/:designationId`
- **Preconditions (seed):** default baseline; `buildDesignation({ expiresAt: <future>, territories: [buildDesignationTerritory({ status: PENDING })] })`
- **Steps:** 1. open link → 2. tick the item checkbox → 3. choose "Morador contatado" → 4. tick "Aceitou revisita" → 5. leave "Seu Nome" empty → 6. observe submit disabled → 7. fill name → 8. "Concluir"
- **Expected UI:** name label shows `*`; "Por favor, coloque o seu nome"; after submit the row shows the undo affordance
- **Expected persistence:** `designations/{id}.territories[0].status === 'DONE'`; `territories/{tid}/history/{visitId}` created with `isRevisit: true`, `visitOutcome: 0`; parent `lastVisit` bumped and `recentHistory` contains the entry
- **Edge cases:** cancel keeps `PENDING`; undo removes the history entry
- **Priority:** P0 · **Gaps:** needs `data-testid` on work-item checkbox + outcome radios
```

Journeys use the same vocabulary but are written as an ordered script with explicit
**identity-switch** and **hand-off assertion** markers.

---

## Sources

This index was written from:

- `apps/ministry-maps/src/app/app-routes.ts`
- `apps/ministry-maps/e2e/fixtures/*`, `apps/ministry-maps/e2e/seed/*`, `apps/ministry-maps/e2e/README.md`
- `.ai/rules/frontend/e2e-testing.md`

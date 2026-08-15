# J-01 — Admin creates territories, assigns two designations, two publishers work their own links

- **Priority:** P0 — the app's core value chain: create → assign → receive → complete.
- **Identities:** `Admin` (`signInAs('admin')`) → `anonymous` (publisher A) → `anonymous` (publisher B).
- **Suggested spec file:** `e2e/tests/journey-admin-assign-work.spec.ts`.
- **Composes:** UC-TERR-14, UC-TERR-15, UC-TERR-17, UC-ASSIGN-09, UC-ASSIGN-11, UC-ASSIGN-15, UC-ASSIGN-16,
  UC-ASSIGN-17, UC-ASSIGN-19, UC-WORK-01, UC-WORK-05, UC-WORK-07, UC-AUTH-22.

## Seed

Default baseline only (`seed-territory-1`/`-2`/`-3`, `seed-user-admin`, congregation settings
`designationAccessExpiryDays: 7`, `shouldDesignationBlockAfterExpired: true`).

## Script

### Leg 1 — Admin creates two new territories (`/territories`)

1. `signInAs('admin')` → `page.goto('/territories')`. The default city `São Paulo` is pre-selected.
2. Click the `+` FAB (`title="Adicionar Território"`). In the dialog `Adicionar Território`, fill
   `Endereço` with `Rua Nova Jornada, 10 - Sé`, leave every other default, click `Adicionar`
   (UC-TERR-14: only `Endereço` gates submit).
3. Switch the page city filter to `Osasco`, click `+` again — the dialog's `Cidade` is prefilled with
   `Osasco` (UC-TERR-15) — fill `Endereço` with `Rua Via Leve, 22 - Jardim`, click `Adicionar`.

⟶ **HAND-OFF (Firestore):** `db.queryWhere(db.collections.territories, 'address', '==', 'Rua Nova Jornada, 10 - Sé')`
returns one doc with `city === 'São Paulo'` and `positionIndex === 3` (max+1 for São Paulo, whose baseline
max is `2` — UC-TERR-17); `Rua Via Leve, 22 - Jardim` has `city === 'Osasco'` and `positionIndex === 2`
(Osasco's baseline max is `1`). `db.getCollectionDocs(db.collections.territories)` now has **5** docs.

### Leg 2 — Admin builds designation D1 (mixed new + seeded, across cities)

4. `page.goto('/territories/assign')`. With city `São Paulo`, tick `Rua Nova Jornada, 10 - Sé` and
   `Rua das Acácias, 45 - Pinheiros` (`seed-territory-1`) — the FAB (`title="Enviar Designação"`) enables
   (UC-ASSIGN-09).
5. Switch the city `<select>` to `Osasco` and tick `Rua Via Leve, 22 - Jardim` — the São Paulo selections
   survive the switch invisibly (UC-ASSIGN-11).
6. Start `const popupPromise = page.waitForEvent('popup')`, then click the FAB. Read the popup's URL,
   which is `whatsapp://send?text=<urlencoded>` — decode it to extract `${origin}/work/{D1}`
   (UC-ASSIGN-19). If the popup event proves unreliable in the environment, fall back to Firestore:
   `db.queryWhere(db.collections.designations, 'congregationId', '==', seed.ids.congregation)` and pick the
   doc that is not `seed.ids.designation`.

⟶ **HAND-OFF (Firestore, D1):** `db.getDoc(db.collections.designations, D1)` —
`congregationId === seed.ids.congregation`; `createdBy === seed.ids.adminUser`; `createdAt` ≈ now;
`expiresAt` ≈ `createdAt + 7 * 86_400_000` ms (tolerance of a few seconds — UC-ASSIGN-13);
`settings.shouldDesignationBlockAfterExpired === true` (copied from the congregation — UC-ASSIGN-15);
`territories` has exactly **3** entries (`Rua Nova Jornada…`, `Rua das Acácias…`, `Rua Via Leve…`), every
entry `status === 'PENDING'`, every entry **has** a `history` key and **lacks** `recentHistory`
(UC-ASSIGN-16 — this is also what keeps `/work/:id` openable, per UC-WORK-04).

### Leg 3 — Admin builds designation D2 with a deliberate overlap

7. `page.reload()` on `/territories/assign` (the full reload resets the component's
   `selectedTerritoriesModel`/`assignedTerritories` Sets — see UC-ASSIGN-17 — making the just-assigned
   territories tickable again).
8. City `São Paulo`: tick `Rua das Acácias, 45 - Pinheiros` (**again — the overlap**) and
   `Rua Harmonia, 300 - Vila Madalena` (`seed-territory-3`). Submit as in step 6; capture `D2`.

⟶ **HAND-OFF (Firestore, D2):** `db.getDoc(db.collections.designations, D2).territories` contains
`seed-territory-1` and `seed-territory-3`, both `status: 'PENDING'` — D1 and D2 are fully independent
documents (UC-ASSIGN-17). `db.getCollectionDocs(db.collections.designations)` has grown to **3** docs
(baseline `seed-designation` + D1 + D2).

### Leg 4 — Publisher A opens their link and completes the shared territory

9. Switch identity to anonymous: `await page.evaluate(() => (window as any).__E2E__.auth.signOut())` —
   the app navigates itself to `/login` (UC-AUTH-22).
10. `page.goto('/work/' + D1)`. Wait for `Loading...` to clear.
11. Assert the page renders **exactly** D1's three addresses (`Rua Nova Jornada, 10 - Sé`,
    `Rua das Acácias, 45 - Pinheiros`, `Rua Via Leve, 22 - Jardim`) and **not** `Rua Harmonia…`
    (UC-WORK-01). No login prompt; URL stays `/work/{D1}`.
12. Complete `Rua das Acácias, 45 - Pinheiros`: tick its checkbox → dialog `Concluir Visita` → keep the
    pre-selected `Morador contatado` → `Concluir` (UC-WORK-07). The row moves under `Concluídos`.

⟶ **HAND-OFF (Firestore, wrap in `expect.poll`/`toPass` — the write-back is fire-and-forget):**
`db.getDoc(db.collections.designations, D1).territories` — the `seed-territory-1` entry is
`status === 'DONE'`, the other two still `PENDING`. **Crucially**,
`db.getDoc(db.collections.designations, D2).territories` — its `seed-territory-1` entry is **still
`PENDING`**: the designation snapshots are frozen and independent (UC-ASSIGN-17/UC-WORK-05).
`db.getSubcollectionDocs(db.collections.territories, 'seed-territory-1', db.historySubcollection)` has
grown from 2 to **3** docs, the newest with `visitOutcome: 0`, `isRevisit: false`;
`db.getDoc(db.collections.territories, 'seed-territory-1').lastVisit` is a fresh `Timestamp`.

### Leg 5 — Publisher B opens their own link

13. `page.goto('/work/' + D2)` (still anonymous — a second person opening their own WhatsApp link; see
    `journeys/README.md` §1 for why no second browser context is needed).
14. Assert the page renders **exactly** D2's two addresses (`Rua das Acácias, 45 - Pinheiros`,
    `Rua Harmonia, 300 - Vila Madalena`) and none of D1's new territories.
15. Assert `Rua das Acácias, 45 - Pinheiros` renders here as **pending with an enabled checkbox**, even
    though the *same physical territory* was completed on D1 in leg 4 — D2's embedded snapshot was frozen
    at creation time (UC-WORK-05).

⟶ **FINAL SWEEP (Firestore):** 3 designations total; D1 = 1 `DONE` + 2 `PENDING`; D2 = 2 `PENDING`;
baseline `seed-designation` untouched; `territories/seed-territory-1/history` has exactly 3 docs (the one
new visit came only from D1).

## Testability notes

- **Gaps:** no `data-testid` on `/territories/assign` or `/work/:id` — rows are located by their address
  text; the FABs by `title` (`Adicionar Território`, `Enviar Designação`); the manage-dialog address field
  by `#territory-address` or its `Endereço` label; the complete-visit dialog per
  [`../domain/glossary.md §3`](../domain/glossary.md#3-visit-dialog-labels-concluir-visita--editar-visita).
- The WhatsApp popup capture (step 6) uses the technique documented in UC-ASSIGN-19; the Firestore fallback
  is the robust default — assert the popup URL **shape** only if the journey's scope includes the
  share-link composition itself.
- Do **not** reuse `seed.ids.designation` as one of the two links: it is expired, blocking, and unopenable
  (UC-WORK-04, [`../domain/data-model.md §5`](../domain/data-model.md#5-default-e2e-baseline-seed)).

## Sources

- `docs/features/territories-management.md` (UC-TERR-14/15/17)
- `docs/features/territories-assign.md` (UC-ASSIGN-09/11/13/15/16/17/19)
- `docs/features/work-designations.md` (UC-WORK-01/04/05/07)
- `docs/features/auth-onboarding.md` (UC-AUTH-22)
- `apps/ministry-maps/e2e/fixtures/{auth,database}.fixture.ts`

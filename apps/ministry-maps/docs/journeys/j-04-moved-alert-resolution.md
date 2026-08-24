# J-04 — Publisher reports "moved"; the alert appears on `/territories`; an Organizer resolves it

- **Priority:** P1 — the alert lifecycle across two roles and three features (`/work/:id` → `/territories`
  → `/territories/statistics`).
- **Identities:** `anonymous` (publisher) → `ORGANIZER` (⚙ HARNESS-EXTENSION — interim: `admin`; note the
  substitution carefully, see below).
- **Suggested spec file:** `e2e/tests/journey-moved-alert.spec.ts`.
- **Composes:** UC-WORK-09, UC-WORK-23, UC-TERR-10, UC-TERR-24, UC-TERR-27, UC-TERR-30, UC-STAT-03,
  UC-AUTH-22.

## Seed

Default baseline **plus** one territory and one active designation embedding it:

```ts
const territory = seed.factories.buildTerritory({
  id: 'j04-territory',
  congregationId: seed.ids.congregation,
  city: 'São Paulo',
  address: 'Rua da Mudança, 404 - Moema',
  note: 'Portaria 24h.', // non-empty note is REQUIRED for badges (UC-TERR-27)
  history: [],
});
const designation = seed.factories.buildDesignation({
  id: 'j04-designation',
  congregationId: seed.ids.congregation,
  createdBy: seed.ids.adminUser,
  expiresAt: new Date(Date.now() + 7 * 86_400_000),
  territories: [
    seed.factories.buildDesignationTerritory({
      id: 'j04-territory',
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua da Mudança, 404 - Moema',
      note: 'Portaria 24h.', // on the snapshot too — the work write-back overwrites the
      // territory doc with the designation snapshot fields; an empty snapshot note
      // would clobber the seeded note and hide the Mudou badge (UC-TERR-27).
      history: [], // REQUIRED (UC-WORK-04)
    }),
  ],
});
await seed.write({ territories: [territory], designations: [designation] });
```

⚙ **HARNESS-EXTENSION (Organizer identity):** `signInAs('organizer')` does not exist today. **Interim:**
use `signInAs('admin')` with a `TODO(J-04)` comment. ⚠ Choose the substitute deliberately: an `ORGANIZER`
on `/territories` does **not** see the list-item edit/alert menu at all (`EDIT_ALLOWED` excludes it —
UC-TERR-36), so with a real organizer identity steps 5–7 (menu → `Mudou` → resolve) are **impossible** and
the journey's resolution leg belongs to an `ADMIN`/`ELDER`. Two faithful options: (a) substitute
`signInAs('admin')` and keep the resolution leg; (b) once the extension lands, re-scope this journey so the
organizer only **observes** the badge/statistics and a second identity (`admin`/`elder`) resolves. Option
(a) is documented below.

## Script

### Leg 1 — Publisher records "Morador mudou de endereço"

1. `page.goto('/work/j04-designation')` anonymously (no `signInAs`).
2. Tick the row → dialog `Concluir Visita` → select `Morador mudou de endereço` → `Concluir` (UC-WORK-09).
   The row moves under `Concluídos`.

⟶ **HAND-OFF (Firestore, `expect.poll`/`toPass`):**
`db.getSubcollectionDocs(db.collections.territories, 'j04-territory', db.historySubcollection)` has 1 doc
with `visitOutcome: 2` and **no** `isResolved` key (the work dialog never writes it — UC-WORK-09);
`db.getDoc(db.collections.territories, 'j04-territory')` has `lastVisit` ≈ now and
`recentHistory.length === 1` — the designation's embedded history started empty, so the write-back
overwrote `recentHistory` down to just the new entry (UC-WORK-23 — assert `1`, not `5`); that single entry
is the unresolved `MOVED` visit.

### Leg 2 — Admin observes the alert and the moved count

3. Switch identity: `signInAs('admin')` → `page.goto('/territories/statistics')`.
4. Assert `Gerais` → `Mudaram: 1` (UC-STAT-03: unresolved `MOVED` in `recentHistory` — the seeded baseline
   contributes 0).
5. `page.goto('/territories')`, city `São Paulo`. **The moved territory is absent from the default list**
   — unresolved-moved territories are filtered out unless the `Territórios que Mudaram` toggle is on
   (UC-TERR-10).
6. Open the sort/filter dialog (`Ordenar e Filtrar`) → tick `Territórios que Mudaram`
   (`Incluir territórios que mudaram de endereço`) → `Aplicar` (UC-TERR-10).
7. The `Rua da Mudança, 404 - Moema` row now renders, showing the badge `Mudou`
   (`title="Essa pessoa se mudou"` — UC-TERR-24; visible because the note is non-empty — UC-TERR-27).

⟶ **HAND-OFF (Firestore):** re-assert the badge's data source —
`db.getDoc(db.collections.territories, 'j04-territory').recentHistory[0]` matches
`{ visitOutcome: 2 }` with `isResolved` falsy.

### Leg 3 — Admin resolves the "Mudou" alert

8. Open the row's menu → `Mudou` → dialog titled `Morador Mudou` with intro
   `Recentemente um publicador reportou que esse morador não está mais nesse endereço:` and prompt
   `O que você quer fazer?` (UC-TERR-30).
9. Keep the default radio `Remover Marcação` → click `Salvar`.
10. The dialog closes and the row's `Mudou` badge disappears (the list is manually re-fetched —
    UC-TERR-30).

⟶ **HAND-OFF (Firestore):** the resolution wrote **both** representations —
`db.getSubcollectionDocs(db.collections.territories, 'j04-territory', db.historySubcollection)[0]
.isResolved === true` **and** `db.getDoc(db.collections.territories, 'j04-territory')
.recentHistory[0].isResolved === true` (UC-TERR-30's two-write contract).

### Leg 4 — Verify the badge and the count are gone

11. Back on `/territories` (same filter state), the `Mudou` badge is gone; the territory now renders in the
    default list again (a resolved `MOVED` no longer triggers the "hide unless toggled" filter —
    UC-TERR-10's edge case).
12. `page.goto('/territories/statistics')` → `Gerais` → `Mudaram: 0` (resolved entries do not count —
    UC-STAT-03).

⟶ **FINAL SWEEP (Firestore):** designation `j04-designation` territory entry is `status === 'DONE'` (leg 1,
never touched by the resolution); the territory's single history doc is `visitOutcome: 2,
isResolved: true`; `Mudaram` reconciles to `0`.

## Testability notes

- **Gaps:** ⚙ `signInAs('organizer')`/`signInAs('elder')` harness extension (see the scoping caveat above —
  a real `ORGANIZER` cannot perform the resolution leg); no `data-testid` on the badge, the sort/filter
  toggles, the `Morador Mudou` dialog radios, or the statistics tiles — select by the verbatim strings.
- Resolution passes the **full** `recentHistory` for the `Mudou` dialog, so this journey never exercised
  the (now-fixed, 2026-08) truncation defect of UC-TERR-31 — that defect needed a _filtered_ subset,
  which only happens on the `Revisita`/`Não Visitar` dialogs. Do not conflate the two.
- Statistics are one-shot reads: navigate to the page **after** each mutation's hand-off poll has settled.

## Sources

- `docs/features/work-designations.md` (UC-WORK-09/23)
- `docs/features/territories-management.md` (UC-TERR-10/24/27/30/31/36)
- `docs/features/territories-statistics.md` (UC-STAT-03)
- `docs/domain/data-model.md` (§4.1, §4.4)

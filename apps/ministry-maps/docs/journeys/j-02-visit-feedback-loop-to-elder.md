# J-02 — Publisher completes a territory; an Elder verifies history, badge and statistics

- **Priority:** P0 — the feedback loop that justifies the whole write-back path: work done in the field
  becomes visible to the congregation's leadership.
- **Identities:** `anonymous` (publisher holding the link) → `ELDER` (⚙ HARNESS-EXTENSION — see below).
- **Suggested spec file:** `e2e/tests/journey-visit-feedback.spec.ts`.
- **Composes:** UC-WORK-01, UC-WORK-07, UC-WORK-11, UC-WORK-13, UC-TERR-26, UC-TERR-28, UC-STAT-01,
  UC-STAT-04, UC-STAT-10, UC-STAT-11.

## Seed

Default baseline **plus**:

```ts
const territory = seed.factories.buildTerritory({
  id: 'j02-territory',
  congregationId: seed.ids.congregation,
  city: 'São Paulo',
  address: 'Rua do Feedback, 77 - Bela Vista',
  note: 'Casa com portão azul.',       // non-empty note is REQUIRED — badges only render with a note (UC-TERR-27)
  history: [],
});
const designation = seed.factories.buildDesignation({
  id: 'j02-designation',
  congregationId: seed.ids.congregation,
  createdBy: seed.ids.adminUser,
  expiresAt: new Date(Date.now() + 7 * 86_400_000),   // active — the factory default is in the past
  territories: [
    seed.factories.buildDesignationTerritory({
      id: 'j02-territory',
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Feedback, 77 - Bela Vista',
      history: [],                    // REQUIRED — the factory default omits it and crashes the page (UC-WORK-04)
    }),
  ],
});
await seed.write({ territories: [territory], designations: [designation] });
```

⚙ **HARNESS-EXTENSION (Elder identity):** `signInAs` only supports `'admin'`/`'publisher'` today. This
journey wants an `ELDER` (`ROLE_UIDS.elder` → a seeded `ELDER` user). **Interim substitution:** run the
elder legs with `signInAs('admin')` and leave a `TODO(J-02)` comment — everything asserted here renders
identically for `ADMIN` and `ELDER` on the paths used (both reach `/territories` and
`/territories/statistics`; the only UI difference is the overflow/export menu, which this journey never
touches — see UC-TERR-35).

## Script

### Leg 1 — Anonymous publisher completes the visit with a revisit

1. `page.goto('/work/j02-designation')` directly — this journey starts anonymous; no `signInAs` call.
2. Wait for `Loading...` to clear; the row `Rua do Feedback, 77 - Bela Vista` renders (UC-WORK-01).
3. Tick the row's checkbox → dialog `Concluir Visita` opens with `Morador contatado` pre-selected.
4. Tick `Aceitou revisita` (`#revisit-checkbox`) — the `Seu Nome` label gains its red `*` — fill
   `Seu Nome` (`#publisher-name`) with `Ana` (UC-WORK-11).
5. Fill the `Notas` textarea (`#congregation-address`) with `Voltarei na próxima semana.` (UC-WORK-13).
6. Click `Concluir`. The row moves under `Concluídos`.

⟶ **HAND-OFF (Firestore, wrap in `expect.poll`/`toPass`):**
`db.getSubcollectionDocs(db.collections.territories, 'j02-territory', db.historySubcollection)` has exactly
**1** doc with `{ visitOutcome: 0, isRevisit: true, name: 'Ana', notes: 'Voltarei na próxima semana.' }`
(and no `isResolved` key — the work dialog never writes it);
`db.getDoc(db.collections.territories, 'j02-territory')` has `lastVisit` ≈ now (fresh `Timestamp`) and
`recentHistory` containing that same entry; `db.getDoc(db.collections.designations, 'j02-designation')
.territories[0].status === 'DONE'`.

### Leg 2 — Elder verifies on `/territories`

7. Switch identity: `signInAs('elder')` (or the interim `signInAs('admin')`) → `page.goto('/territories')`
   with city `São Paulo`.
8. Assert the `Rua do Feedback, 77 - Bela Vista` row shows the badge `Revisita`
   (`title="Essa pessoa foi marcada como revisita recentemente"` — UC-TERR-26; `hasRecentRevisit` only
   looks at the `isRevisit` boolean).
9. Open the row's menu → `Histórico` (always visible, UC-TERR-29) → dialog `Histórico de Visitas`
   (UC-TERR-28): exactly one row showing the `Morador contatado` outcome icon, the notes text
   `Voltarei na próxima semana.`, a `Revisita` badge, and the footer line `Ana, <today's date>`.
   Close with `Fechar`.

⟶ **HAND-OFF (Firestore):** re-assert via `db.getDoc(db.collections.territories, 'j02-territory')
.recentHistory` that the entry the badge came from is the same `{ isRevisit: true }` visit — the badge
reads `recentHistory`, not the subcollection ([`../domain/data-model.md §4.1`](../domain/data-model.md#41-dual-history-subcollection-vs-recenthistory-vs-lastvisit)).

### Leg 3 — Elder verifies on `/territories/statistics`

10. `page.goto('/territories/statistics')`. Keep the default period `Este Mês`.
11. Assert the `Gerais` section: `Territórios: 4` (3 baseline + `j02-territory`), `Estudos bíblicos: 1`
    (unchanged — the new territory is not a bible student), `Mudaram: 0` (UC-STAT-01).
12. Assert `Por período`: `Visitas: 1`, `Revisitas: 1` — the `SPOKE` (`0`) outcome counts as a visit
    (UC-STAT-10) and the `isRevisit: true` boolean counts as a revisit (UC-STAT-11); the visit's date
    (today) falls inside the current-month window (UC-STAT-04).
13. Switch the city filter to `Osasco`: `Visitas: 0`, `Revisitas: 0` — the new visit belongs to a
    `São Paulo` territory (city scoping, UC-STAT-02).

⟶ **FINAL SWEEP (Firestore):** the numbers asserted on screen reconcile 1:1 with the backend —
`db.getSubcollectionDocs(db.collections.territories, 'j02-territory', db.historySubcollection)` is the sole
source of the dynamic counts (UC-STAT-12), and it holds exactly one doc, written only by leg 1.

## Testability notes

- **Gaps:** ⚙ harness extension for the `ELDER` identity (interim `admin` substitution documented above);
  no `data-testid` on the badge, the history dialog, or the statistics tiles — select by the verbatim
  strings quoted above.
- The statistics page is a **one-shot** read (`getDocs`, no listener —
  [`../domain/data-model.md §4.6`](../domain/data-model.md#46-realtime-vs-one-shot-reads)): always navigate
  to it *after* the write has landed (the leg-1 hand-off poll guarantees this).
- Baseline history dates (2024) fall outside every dynamic period, so the baseline contributes `0` to all
  `Por período` numbers — only the leg-1 visit is counted (see the note at the top of
  [`../features/territories-statistics.md`](../features/territories-statistics.md)).

## Sources

- `docs/features/work-designations.md` (UC-WORK-01/07/11/13)
- `docs/features/territories-management.md` (UC-TERR-26/27/28/29/35)
- `docs/features/territories-statistics.md` (UC-STAT-01/02/04/10/11/12)
- `docs/domain/data-model.md` (§4.1, §4.6)

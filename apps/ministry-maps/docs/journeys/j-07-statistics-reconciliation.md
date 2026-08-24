# J-07 — Statistics reconciliation across period boundaries and city scopes

- **Priority:** P1 — proves the dynamic metrics reconcile with the real `history` subcollections for every
  period option and for single-city vs "Todas" scopes, using dates planted precisely on period boundaries.
- **Identities:** `Admin` throughout (`signInAs('admin')`).
- **Suggested spec file:** `e2e/tests/journey-statistics-reconciliation.spec.ts`.
- **Composes:** UC-STAT-01, UC-STAT-02, UC-STAT-04 … UC-STAT-12, UC-STAT-19; the boundary note at the top
  of [`../features/territories-statistics.md`](../features/territories-statistics.md).

## Seed

Default baseline **plus** one territory whose history is planted **relative to the test's own clock**
(absolute 2024 dates fall outside every dynamic period — they must contribute `0` everywhere). Compute the
dates at seed time:

```ts
const now = new Date();
const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

const visits = [
  // IN  — every period's window (today)
  seed.factories.buildVisitHistory({ id: 'j07-v-today', visitOutcome: 0, isRevisit: true, date: now }),
  // IN  — this month, ON its first day (boundary-inclusive)
  seed.factories.buildVisitHistory({ id: 'j07-v-month-1st', visitOutcome: 0, isRevisit: false, date: firstOfThisMonth }),
  // IN  — previous month; OUT of "Este Mês" (boundary-exclusive)
  seed.factories.buildVisitHistory({ id: 'j07-v-prev-mid', visitOutcome: 4, isRevisit: false, date: new Date(now.getFullYear(), now.getMonth() - 1, 15) }),
  // OUT — last day of the month before the previous one; only inside "3 Meses"+ windows
  seed.factories.buildVisitHistory({ id: 'j07-v-old', visitOutcome: 0, isRevisit: false, date: new Date(now.getFullYear(), now.getMonth() - 2, 28) }),
];
await seed.write({
  territories: [seed.factories.buildTerritory({ id: 'j07-territory-sp', congregationId: seed.ids.congregation, city: 'São Paulo', history: visits }), seed.factories.buildTerritory({ id: 'j07-territory-os', congregationId: seed.ids.congregation, city: 'Osasco', history: [seed.factories.buildVisitHistory({ id: 'j07-v-os', visitOutcome: 0, isRevisit: true, date: now })] })],
});
```

Expected counts derived from that seed (the journey's reconciliation table):

| Period (`<select>` label) | Window start       | São Paulo `Visitas`              | São Paulo `Revisitas` |
| ------------------------- | ------------------ | -------------------------------- | --------------------- |
| `Este Mês` (THIS_MONTH)   | `firstOfThisMonth` | **2** (`v-today`, `v-month-1st`) | **1**                 |
| `1 Mês` (ONE_MONTH)       | `firstOfPrevMonth` | **3** (+ `v-prev-mid`)           | **1**                 |
| `3 Meses` (THREE_MONTHS)  | 1st of month −2    | **4** (+ `v-old`)                | **1**                 |

`REVISIT` (`4`) counts as a _visit_ (UC-STAT-10); only `isRevisit: true` counts as a _revisita_
(UC-STAT-11) — `v-prev-mid` is therefore a visit but never a revisita.

## Script

### Leg 1 — Baseline contributes nothing to dynamic metrics

1. `signInAs('admin')` → `page.goto('/territories/statistics')` → city `Todas`, period `Este Mês`.
2. Before relying on the planted visits, assert the counterfactual: the **baseline's** 2024 history
   contributes `0` — with city `Osasco` selected the counts are driven solely by `j07-territory-os`
   (see leg 3), and with city `São Paulo` solely by `j07-territory-sp` (baseline São Paulo history is all
   2024 — UC-STAT-19).

### Leg 2 — Reconcile each period for São Paulo

3. Select city `São Paulo`. For each row of the reconciliation table: select the period in the
   `Por período` `<select>` → assert `Visitas: N` / `Revisitas: M` exactly as tabulated (UC-STAT-04/05/06;
   the `6 meses` / `1 ano` / `Este Ano` options are covered by UC-STAT-07/08/09 individually — asserting
   them here too is a bonus, all windows here also yield `4`/`1` given `v-old` is only 2 months old).

⟶ **HAND-OFF (Firestore, per row):** `db.getSubcollectionDocs(db.collections.territories,
'j07-territory-sp', db.historySubcollection)` filtered client-side to the same window yields the same
count — the UI number and the subcollection reconcile 1:1 (UC-STAT-12).

### Leg 3 — City scoping vs "Todas"

4. Select city `Osasco`, period `Este Mês` → `Visitas: 1`, `Revisitas: 1` (only `j07-territory-os`'s
   visit — UC-STAT-02).
5. Select `Todas`, period `Este Mês` → `Visitas: 3` (2 São Paulo + 1 Osasco), `Revisitas: 2`.

⟶ **HAND-OFF (Firestore):** static section under `Todas`: `Territórios: 5` (3 baseline + 2 planted),
`Estudos bíblicos: 1` (baseline `seed-territory-3` only), `Mudaram: 0` (UC-STAT-01); under `São Paulo`:
`Territórios: 3`.

### Leg 4 — The out-of-window boundary stays out

6. Period `Este Mês`, city `São Paulo`: assert `v-prev-mid` (15th of last month) is excluded — the count
   is `2`, not `3` (UC-STAT-19's boundary rule: windows start on the 1st of the computed month).
7. Period `1 Mês`: the same visit is now included — count `3` (leg 2, row 2) — proving the boundary lies
   exactly at `firstOfPrevMonth`.

⟶ **FINAL SWEEP (Firestore):** no write happened anywhere in this journey —
`db.getCollectionDocs(db.collections.territories)` still has 5 docs and every `history` subcollection is
byte-identical to the seed; statistics are a pure read model.

## Testability notes

- **Gaps:** no `data-testid` on the period `<select>`, the city `<select>`, or any metric tile — select by
  the verbatim labels (`Este Mês`, `1 Mês`, `3 Meses`, `Visitas`, `Revisitas`, tile text like
  `Territórios: 5`).
- **Clock discipline:** every date is computed from `new Date()` at seed time — never hardcode an absolute
  date for dynamic-period assertions. Mind the first day of the month: on the 1st, `v-month-1st` and
  `v-today` coincide in value — the two distinct docs keep the counts valid regardless.
- Statistics are one-shot reads — always change the period/city **through the page's own selects** (which
  recompute client-side from the already-fetched dataset) rather than re-navigating; only the initial page
  load reads Firestore.

## Sources

- `docs/features/territories-statistics.md` (all UC-STAT entries + the dynamic-period note)
- `docs/domain/data-model.md` (§4.1 dual history, §4.6 one-shot reads)
- `apps/ministry-maps/e2e/seed/factories/visit-history.factory.ts`, `e2e/seed/factories/territory.factory.ts`

# J-05 — City rename cascade, and the orphaned-territory consequence of a city delete

- **Priority:** P1 — configuration writes cascade into territories, with two documented rough edges
  (stale client state; orphans after delete) that this journey locks in as today's behaviour.
- **Identities:** `Admin` throughout (`signInAs('admin')`).
- **Suggested spec file:** `e2e/tests/journey-city-rename.spec.ts`.
- **Composes:** UC-CFG-01, UC-CFG-03, UC-CFG-08, UC-CFG-09, UC-CFG-10, UC-CFG-11, UC-TERR-02.

## Seed

Default baseline (`cities: ['São Paulo', 'Osasco']`; `seed-territory-1`/`-3` in `São Paulo`,
`seed-territory-2` in `Osasco`).

> **Locale reminder:** `/configuration` is the app's only English-language screen — every string below is
> verbatim and intentionally **not** pt-BR (see [`../features/configuration-cities.md`](../features/configuration-cities.md)
> header note).

## Script

### Leg 1 — Rename `São Paulo` → `São Paulo Centro` and verify the cascade

1. `signInAs('admin')` → `page.goto('/configuration')` → assert the heading `Manage Congregation Cities`,
   the subtitle `Congregação Jardim Primavera`, and 2 rows (UC-CFG-01).
2. Click `Edit` on the `São Paulo` row → clear the input → type `São Paulo Centro` → click
   `Save Changes` (UC-CFG-03; `Save Changes` is clickable even while the row is mid-edit — UC-CFG-05).
3. Assert the success toast `Cities updated successfully!` and the row now reading `São Paulo Centro`.

⟶ **HAND-OFF (Firestore):** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities`
deep-equals `['São Paulo Centro', 'Osasco']` (order preserved); **and** the batch rename landed —
`db.getDoc(db.collections.territories, 'seed-territory-1').city === 'São Paulo Centro'`,
`db.getDoc(db.collections.territories, 'seed-territory-3').city === 'São Paulo Centro'`, while
`db.getDoc(db.collections.territories, 'seed-territory-2').city === 'Osasco'` (untouched, different city —
UC-CFG-08/09).

### Leg 2 — Observe the stale `/territories` filter, then the reload fix

4. Navigate to `/territories` **without reloading** (SPA-style `page.goto('/territories')` — the app's own
   in-memory user state is what matters here).
5. Assert the city `<select>` (`territories-city-filter`) still offers the **old** names
   `São Paulo` / `Osasco` / `Todas` — `ConfigurationBO` never calls `UserStateService.setUser(...)`, so the
   in-memory congregation is stale (UC-CFG-11, ⚠ suspected defect — assert the staleness, not a graceful
   update).
6. `page.reload()` → assert the `<select>` now offers `São Paulo Centro` / `Osasco` / `Todas`
   (UC-CFG-11's reload requirement).
7. Select `São Paulo Centro` → both renamed territories are listed under it (UC-TERR-02).

⟶ **HAND-OFF (Firestore):** unchanged since leg 1 — the backend was correct the whole time; only the
client cache was stale.

### Leg 3 — Delete `Osasco` and observe the orphaned territory

8. `page.goto('/configuration')`.
9. **Before clicking**, register the native-dialog handler:
   `page.once('dialog', dialog => dialog.accept())` — the `Delete` button calls the browser's native
   `confirm('Are you sure you want to delete this city?')`, which a locator can never see and which hangs
   the test if unhandled (UC-CFG-10).
10. Click `Delete` on the `Osasco` row → the row disappears immediately (local splice) → click
    `Save Changes` → toast `Cities updated successfully!`.

⟶ **HAND-OFF (Firestore):** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities`
deep-equals `['São Paulo Centro']`; **but** `db.getDoc(db.collections.territories, 'seed-territory-2')
.city` is **still exactly `'Osasco'`** — the delete is never translated into a territory update
(UC-CFG-10, ⚠ suspected defect). The territory document and its `history` subcollection are fully intact:
`db.getSubcollectionDocs(db.collections.territories, 'seed-territory-2', db.historySubcollection)` still
returns its baseline visit.

### Leg 4 — The orphan is unreachable in the UI but alive in the data

11. `page.goto('/territories')` → `page.reload()` (apply the reload lesson from leg 2).
12. Assert the city `<select>` now offers only `São Paulo Centro` and `Todas`; assert
    `Rua ...` of `seed-territory-2` (`Av. dos Autonomistas, 1200 - Centro`) appears under **neither**
    option — its `city` value matches no `<option>`, and the `Todas` view fetches all congregation
    territories but the pipe groups/sorts them by city against the select's known cities — verify the
    observable outcome for your assertion: the address is **not listed in any selectable city view**.
13. Contrast with the backend: `db.queryWhere(db.collections.territories, 'congregationId', '==',
    seed.ids.congregation)` still returns **3** docs — the orphan is invisible in the UI, not deleted.

⟶ **FINAL SWEEP (Firestore):** `congregations/{id}.cities === ['São Paulo Centro']`; territories =
3 docs with cities `São Paulo Centro`, `Osasco` (orphan), `São Paulo Centro`; no history doc was lost at
any point in the journey.

## Testability notes

- **Gaps:** no `data-testid` anywhere on `/configuration` — rows/buttons by their English text; the native
  `confirm()` requires `page.once('dialog', …)` registered **before** the triggering click (UC-CFG-10);
  the toast has no testid — assert its exact text.
- Leg 2's stale-filter assertion is **today's reality** (⚠ suspected defect) — if the app is later fixed to
  refresh user state on save, this journey's step 5 must be rewritten to expect the new names immediately.
- The leg-4 `Todas`-view assertion is written defensively because the pipe's city grouping against a
  stale/absent city name is not contractually documented — assert what you observe and cross-check against
  UC-TERR-02's ordering rules; the non-negotiable assertion is step 13's backend count.

## Sources

- `docs/features/configuration-cities.md` (UC-CFG-01/03/05/08/09/10/11)
- `docs/features/territories-management.md` (UC-TERR-02)
- `docs/domain/data-model.md` (§4.6 realtime vs one-shot reads)

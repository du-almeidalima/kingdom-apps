# J-08 — Empty-system journey: a brand-new congregation across list, assign, statistics and CSV

- **Priority:** P1 — the first-run experience: nothing may crash, and every "you can't do that yet" must be
  a graceful absence, not an error.
- **Identities:** `Admin` of a **second, empty congregation** (⚙ HARNESS-EXTENSION — see below).
- **Suggested spec file:** `e2e/tests/journey-empty-system.spec.ts`.
- **Composes:** UC-TERR-03, UC-TERR-34, UC-ASSIGN-03, UC-STAT-13, plus the contrast entry UC-TERR-04 /
  UC-ASSIGN-04 (zero-**cities**, a different and buggier condition — documented, not exercised by default).

## Seed

Default baseline (untouched) **plus** a second congregation with one city, one admin, and **zero**
territories:

```ts
const congregation = seed.factories.buildCongregation({ id: 'j08-congregation', name: 'Congregação Vila Nova', cities: ['Campinas'] });
const admin = seed.factories.buildUser({ id: 'j08-admin', name: 'Felipe Ramos', email: 'felipe.ramos@example.com', role: 'ADMIN', congregationId: 'j08-congregation' });
await seed.write({ congregations: [congregation], users: [admin] });
```

⚙ **HARNESS-EXTENSION (second-congregation identity):** `signInAs('admin')` is bound to
`seed-user-admin` of the **baseline** congregation — it cannot sign in as `j08-admin` today. Required
extension: a way to mint a token for an arbitrary seeded uid (e.g. `signInAsUser(uid)`), or a named
`ROLE_UIDS` entry for this journey. **Interim workaround:** none that preserves the journey's meaning
(scoping to the empty congregation *is* the point) — mark this journey **blocked** on the extension, or run
it with the baseline admin against a *city with no territories* (UC-TERR-03's partial approximation, which
does not cover assign/statistics/CSV scoping).

## Script

### Leg 1 — `/territories` renders an empty, stable list

1. Sign in as `j08-admin` (extension) → `page.goto('/territories')`.
2. Assert the page renders fully: heading (`territories-heading`), the city `<select>` offering
   `Campinas` then `Todas` (the congregation's own cities — **not** the baseline's `São Paulo`/`Osasco`),
   and the `territories-list` container present with **zero** `territory-list-item` rows (UC-TERR-03 —
   there is no dedicated empty-state copy).
3. Assert **no** baseline territory ever appears (congregation scoping — UC-TERR-01's core guarantee in
   its purest form).

⟶ **HAND-OFF (Firestore):** `db.queryWhere(db.collections.territories, 'congregationId', '==',
'j08-congregation')` returns `[]`; `db.getCollectionDocs(db.collections.territories)` still has the 3
baseline docs (the new congregation added none).

### Leg 2 — `/territories/assign` renders but cannot submit

4. `page.goto('/territories/assign')`.
5. Assert the page does **not** crash: heading `Designar Território`, the city `<select>` with
   `Campinas`/`Todas`, the checkbox list area rendering **zero** rows, and the floating submit button
   (`title="Enviar Designação"`) permanently `disabled` — creating a designation is impossible from this
   screen for this congregation (UC-ASSIGN-03).

⟶ **HAND-OFF (Firestore):** `db.getCollectionDocs(db.collections.designations)` unchanged (still only the
baseline `seed-designation`) — nothing could be submitted.

### Leg 3 — `/territories/statistics` hangs in the loading state (⚠ defect)

6. `page.goto('/territories/statistics')`.
7. ⚠ **Today's reality (per UC-STAT-13 / `docs/testability-gaps.md` §3 #42):** with zero territories,
   `FirebaseTerritoryDatasourceService.getAllByCongregation({ getHistory: true })` returns
   `combineLatest([])`, which **never emits**. `filteredTerritories$` never resolves, `finalize` never
   flips `isLoading`, and the static/dynamic sections never render. Assert the **hang**, not zeros: the
   heading renders, the loading branch (`statistics-loading`) stays visible, the city `<select>` stays
   `disabled` (it renders `Campinas`/`Todas` but is never enabled), and the `statistics-static-section`
   / `statistics-dynamic-section` are absent. This is a locked-in suspected defect — do not assert the
   intended "all zeros" behaviour until the BO is fixed.

> **Doc note (reality vs. original entry):** an earlier version of this leg asserted `Territórios: 0` /
> `Visitas: 0` etc. That was the *intended* behaviour, not today's. UC-STAT-13 already pins down the
> hang; this journey re-asserts the same reality in the empty-congregation context.

⟶ **HAND-OFF (Firestore):** no document was created by visiting the screen (the hang is read-side only).

### Leg 4 — CSV export of an empty territory set

8. Back on `/territories`, open the overflow menu (⋮) → `Exportar Territórios`
   (UC-TERR-34; the menu is visible — `j08-admin` is an `ADMIN`).
9. `page.waitForEvent('download')` → assert the download's suggested filename matches
   `mm-territorios-*.csv` and the success toast `Territórios exportados com sucesso.` appears.
10. Read the downloaded file and assert it contains **only** the header row
    `Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da Bíblia;Última Visita`
    (UTF-8 BOM prefixed, `;`-delimited) and **zero** data rows — an empty export is a valid CSV, not an
    error (UC-TERR-34's shape with `n = 0`).

⟶ **FINAL SWEEP (Firestore):** the whole journey was write-free — congregations: 2 docs; users: 5;
territories: 3 (all baseline); designations: 1 (baseline). The new congregation never gained data by being
browsed.

## Contrast entry (documented, not exercised)

A congregation with **zero cities** (`cities: []`) is a *different* condition from zero territories, and a
buggy one: the city-filter ternary defect (`UC-TERR-04` / `UC-ASSIGN-04`, ⚠ suspected defect) collapses the
list instead of rendering it empty. Keep that scenario **out** of this happy-path journey — it has its own
entries and needs the same harness extension.

## Testability notes

- **Gaps:** ⚙ second-congregation identity extension (see Seed — this journey is **blocked** without it);
  no `data-testid` on assign/statistics screens; CSV assertions need `page.waitForEvent('download')` and a
  file read (`download.path()` / `createReadStream`).
- The journey deliberately asserts **absence of errors** (no toast, no banner, no stuck spinner) rather
  than presence of empty-state copy — the app has no empty-state copy on these screens; do not invent one
  in the spec.

## Sources

- `docs/features/territories-management.md` (UC-TERR-01/03/04/34)
- `docs/features/territories-assign.md` (UC-ASSIGN-03/04)
- `docs/features/territories-statistics.md` (UC-STAT-13)
- `docs/domain/data-model.md` (§4.3, §5)

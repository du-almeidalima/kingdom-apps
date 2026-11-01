# J-05 — City rename cascade, immediate client-state sync, safe visit write-backs, and city removal transfer

- **Priority:** P1 — congregation city mutations cascade to territories, immediately update `UserStateService` without a hard reload, preserve renamed cities when pre-rename Designations record visits, and transfer or delete territories on city removal.
- **Identities:** `Admin` (`signInAs('admin')`) + anonymous/publisher `/work/:id` visit completion.
- **Suggested spec file:** `e2e/tests/journey-city-rename.spec.ts`.
- **Composes:** UC-CFG-01, UC-CFG-04, UC-CFG-06, UC-TERR-02, UC-WORK-10.

## Seed

Default baseline (`cities: ['São Paulo', 'Osasco']`; `seed-territory-1`/`-3` in `São Paulo`,
`seed-territory-2` in `Osasco`), plus an active `Designation` created before the city rename embedding a snapshot of `seed-territory-1` with `city: 'São Paulo'`.

## Script

### Leg 1 — Rename `São Paulo` → `São Paulo Centro` and verify the cascade

1. `signInAs('admin')` → `page.goto('/congregation')` → assert heading `Administrar Congregação`, subtitle `Congregação Jardim Primavera`, and 2 city rows (`UC-CFG-01`).
2. Click `Editar` on `São Paulo` → fill `São Paulo Centro` → click `Salvar` (`UC-CFG-04`).
3. Assert toast `Cidade atualizada com sucesso!` and row reading `São Paulo Centro`.

⟶ **HAND-OFF (Firestore):** `congregations/{id}.cities` deep-equals `['São Paulo Centro', 'Osasco']`; `seed-territory-1` and `seed-territory-3` have `city === 'São Paulo Centro'`; `seed-territory-2` remains `city === 'Osasco'`.

### Leg 2 — SPA navigate to `/territories` without reload and verify immediate city selector update

4. Navigate via client-side router (`popstate`) to `/territories` without `page.reload()`.
5. Assert `territories-city-filter` immediately offers `['São Paulo Centro', 'Osasco', 'Todas']` because `CongregationBO.renameCity` refreshed `UserStateService`.
6. Select `São Paulo Centro` → both renamed territories render under it (`UC-TERR-02`).

### Leg 3 — Complete a visit on the pre-rename Designation and verify `city` is preserved

7. Open `/work/j05-pre-rename-designation` (whose frozen snapshot still has `city: 'São Paulo'`).
8. Complete the visit on `Rua das Acácias, 45 - Pinheiros`.

⟶ **HAND-OFF (Firestore):** `territories/seed-territory-1` receives the new visit in `history` and `recentHistory` / `lastVisit`, while `territories/seed-territory-1.city` remains `'São Paulo Centro'` (never overwritten by the stale snapshot).

### Leg 4 — Remove `Osasco` and transfer its territory to `São Paulo Centro`

9. Navigate to `/congregation` → click `Remover` on `Osasco` (`UC-CFG-06`).
10. In the `Remover Cidade` dialog, confirm `Transferir para outra cidade` with target `São Paulo Centro`.
11. Assert toast `Cidade removida com sucesso!` and `Osasco` row removed.
12. SPA-navigate to `/territories` → assert city selector offers `['São Paulo Centro', 'Todas']` and `Av. dos Autonomistas, 1200 - Centro` (`seed-territory-2`) is now listed under `São Paulo Centro` with sequential `positionIndex: 3`.

## Sources

- `docs/features/configuration-cities.md`
- `docs/features/territories-management.md`
- `docs/features/work-designations.md`
- `e2e/tests/journey-city-rename.spec.ts`

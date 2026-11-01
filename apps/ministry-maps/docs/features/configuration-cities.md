# Congregation administration — name, cities, and provisioning (`UC-CFG`)

This document describes the behavioural use cases for the `/congregation` screen (`Administrar Congregação`):
immediate-persistence Congregation name editing, adding, inline-renaming, drag-and-drop reordering, and
removing a Congregation's `cities[]` (with Territory transfer or deletion), plus the `APP_ADMIN`-only
`Adicionar Congregação` dialog.

**Route:** `/congregation`
**Actors:** `ADMIN` and `APP_ADMIN` reach and edit the page (`data.roles: [RoleEnum.ADMIN]` with `APP_ADMIN` bypass in `authGuard`). Only `APP_ADMIN` sees and can use `Adicionar Congregação` (`*libAuthorize="[RoleEnum.APP_ADMIN]"` and Firestore `/congregations` `create` security rule). `PUBLISHER` is redirected to `/welcome`, anonymous visitors are redirected to `/login`, and `ORGANIZER`, `ELDER`, and `SUPERINTENDENT` are denied by `authGuard`.
Field/model shapes are in [`../domain/data-model.md`](../domain/data-model.md); pt-BR ↔ English vocabulary
is in [`../domain/glossary.md`](../domain/glossary.md).

### Screen rendering & role gating

#### UC-CFG-01 — Renders congregation name and cities in `pt-BR` and hides `Adicionar Congregação` for `ADMIN`

- **Actor:** Admin
- **Route:** `/congregation`
- **Preconditions (seed):** default baseline (`seed.ids.congregation` name `Congregação Jardim Primavera`, cities `['São Paulo', 'Osasco']`)
- **Steps:** 1. `signInAs('admin')` → 2. open `/congregation`
- **Expected UI:** heading `Administrar Congregação` (`config-heading`); subtitle `Congregação Jardim Primavera` (`config-congregation-subtitle`); name input pre-filled with `Congregação Jardim Primavera` (`config-congregation-name-input`) and `Salvar Nome` (`config-save-name`) disabled; `Adicionar Congregação` (`config-add-congregation`) not rendered in DOM; 2 city rows (`config-city-row`) in array order showing `São Paulo` and `Osasco` with drag handles (`config-city-drag-handle`), `Editar` (`config-edit-city`), and `Remover` (`config-delete-city`) buttons
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` deep-equals `['São Paulo', 'Osasco']`
- **Edge cases:** when `congregation.cities` is `[]`, `config-empty-cities` renders `Nenhuma cidade cadastrada. Adicione uma cidade acima.`
- **Priority:** P0

### Congregation name

#### UC-CFG-02 — Edits and saves the congregation name immediately with empty/unchanged guard

- **Actor:** Admin
- **Route:** `/congregation`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/congregation` → 2. clear/whitespace `config-congregation-name-input` (observe `Salvar Nome` disabled) → 3. type `Congregação Nova Primavera` → 4. click `Salvar Nome`
- **Expected UI:** toast `Nome da congregação atualizado com sucesso!`; subtitle updates immediately to `Congregação Nova Primavera`; `Salvar Nome` becomes disabled again because the input now matches the saved name
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).name === 'Congregação Nova Primavera'`; `UserStateService` is updated in-place via `setUser`
- **Priority:** P0

### Cities management (add, inline rename, drag-and-drop reorder, remove)

#### UC-CFG-03 — Adds a city immediately and rejects empty or case-insensitively duplicate names with `pt-BR` toasts

- **Actor:** Admin
- **Route:** `/congregation`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click `Adicionar Cidade` with whitespace input → 2. type `são paulo` and click `Adicionar Cidade` → 3. type `Guarulhos` and click `Adicionar Cidade`
- **Expected UI:** step 1 shows error toast `O nome da cidade não pode estar vazio.`; step 2 shows error toast `O nome da cidade deve ser único.`; step 3 shows success toast `Cidade adicionada com sucesso!`, clears `config-new-city-input`, and renders `Guarulhos` as the 3rd city row
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` deep-equals `['São Paulo', 'Osasco', 'Guarulhos']`; `UserStateService` is updated immediately
- **Priority:** P0

#### UC-CFG-04 — Inline city rename allows one row at a time, supports cancel, and cascades rename to territories on save

- **Actor:** Admin
- **Route:** `/congregation`
- **Preconditions (seed):** default baseline (`seed-territory-1`/`-3` in `São Paulo`, `seed-territory-2` in `Osasco`)
- **Steps:** 1. click `Editar` on `São Paulo` → 2. observe `Osasco`'s `Editar`/`Remover` buttons are disabled → 3. type a temporary name and click `Cancelar` (reverts to `São Paulo`) → 4. click `Editar` on `São Paulo`, type `Sampa`, and click `Salvar`
- **Expected UI:** toast `Cidade atualizada com sucesso!`; row exits edit mode and displays `Sampa`
- **Expected persistence:** `congregations/{id}.cities` is `['Sampa', 'Osasco']`; `seed-territory-1` and `seed-territory-3` have `city: 'Sampa'`; `seed-territory-2` remains `city: 'Osasco'`; `UserStateService` is updated immediately
- **Priority:** P0

#### UC-CFG-05 — Drag-and-drop reorders cities, persists immediately on drop, and refreshes `/territories` without reload

- **Actor:** Admin
- **Route:** `/congregation` then `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. drag `Osasco` handle onto `São Paulo` row → 2. SPA-navigate to `/territories` without browser reload
- **Expected UI:** city rows on `/congregation` reorder to `['Osasco', 'São Paulo']`; `/territories` city filter options immediately list `['Osasco', 'São Paulo', 'Todas']` without `page.reload()`
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` deep-equals `['Osasco', 'São Paulo']`
- **Priority:** P0

#### UC-CFG-06 — Remove city with Transfer moves territories to destination city with sequential `positionIndex` values

- **Actor:** Admin
- **Route:** `/congregation`
- **Preconditions (seed):** default baseline (`São Paulo` has `seed-territory-1` at index `0` and `seed-territory-3` at index `2`; `Osasco` has `seed-territory-2` at index `1`)
- **Steps:** 1. click `Remover` on `São Paulo` → 2. in the `Remover Cidade` dialog (`remove-city-dialog`), keep `Transferir para outra cidade` (`remove-city-option-transfer`) selected with destination `Osasco` (`remove-city-target-select`) → 3. click `Confirmar` (`remove-city-confirm`)
- **Expected UI:** toast `Cidade removida com sucesso!`; `São Paulo` row is removed
- **Expected persistence:** `congregations/{id}.cities` is `['Osasco']`; `seed-territory-1` and `seed-territory-3` move to `city: 'Osasco'` with sequential `positionIndex` values `2` and `3` (appended after `seed-territory-2`'s max index `1`)
- **Priority:** P0

#### UC-CFG-07 — Remove city with Delete deletes territories and their `history` subcollections; transfer is disabled when only 1 city remains

- **Actor:** Admin
- **Route:** `/congregation`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click `Remover` on `São Paulo` → 2. select `Excluir territórios` (`remove-city-option-delete`) and click `Confirmar` → 3. click `Remover` on the sole remaining city `Osasco`
- **Expected UI:** after step 2, `São Paulo` is removed; in step 3, `remove-city-option-transfer` radio input and `remove-city-target-select` are disabled and `Excluir territórios` is pre-selected; confirming leaves 0 rows and renders `config-empty-cities`
- **Expected persistence:** `seed-territory-1` and `seed-territory-3` parent documents and their `history` subcollection documents are permanently deleted in a Firestore transaction; `seed-territory-2` is untouched until `Osasco` is deleted
- **Priority:** P0

### Add Congregation (`APP_ADMIN` only)

#### UC-CFG-08 — `APP_ADMIN` creates a new Congregation via `Adicionar Congregação` dialog and switches active Congregation

- **Actor:** App Admin (`signInAs('app_admin')`)
- **Route:** `/congregation`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click `Adicionar Congregação` (`config-add-congregation`) → 2. fill name `Congregação Vale Verde` and location `Campinas, SP` → 3. add cities via `Enter` and `Adicionar` button (`add-congregation-add-city-btn`) and remove an unwanted chip via its accessible remove button → 4. configure `Configurações` (`add-congregation-expiry-days-input`, `add-congregation-block-expired-checkbox`) → 5. click `Criar` (`add-congregation-submit`)
- **Expected UI:** toast `Congregação criada com sucesso!`; dialog closes; `/congregation` immediately displays `Congregação Vale Verde` and its cities (`Campinas`, `Valinhos`)
- **Expected persistence:** new document created in `congregations` with auto-generated `id`, `name`, `locatedOn`, `cities`, and `settings`; `users/{appAdminUid}.congregation` reference updated to the newly created congregation
- **Priority:** P0

### Error & access states

#### UC-CFG-11 — User without a congregation sees `pt-BR` error banner

- **Actor:** Admin with a dangling congregation reference
- **Route:** `/congregation`
- **Expected UI:** `config-no-congregation-banner` renders `Nenhuma congregação encontrada. Verifique se você está autenticado.`
- **Priority:** P1

#### UC-CFG-12 — Anonymous visit redirects to `/login`

- **Actor:** Anonymous
- **Route:** `/congregation`
- **Expected UI:** URL redirects to `/login`
- **Priority:** P0

#### UC-CFG-13 — Non-admin roles cannot access `/congregation`

- **Actor:** Publisher, Organizer, Elder, Superintendent
- **Route:** `/congregation`
- **Expected UI:** `PUBLISHER` is redirected to `/welcome`; `ORGANIZER`, `ELDER`, and `SUPERINTENDENT` have navigation cancelled by `authGuard` (`config-heading` never renders)
- **Priority:** P0

## Sources

- `apps/ministry-maps/src/app/features/congregation/pages/congregation-page/congregation-page.component.ts`
- `apps/ministry-maps/src/app/features/congregation/components/congregation-name-form/congregation-name-form.component.ts`
- `apps/ministry-maps/src/app/features/congregation/components/congregation-cities/congregation-cities.component.ts`
- `apps/ministry-maps/src/app/features/congregation/components/congregation-remove-city-dialog/congregation-remove-city-dialog.component.ts`
- `apps/ministry-maps/src/app/features/congregation/components/congregation-add-dialog/congregation-add-dialog.component.ts`
- `apps/ministry-maps/src/app/features/congregation/bo/congregation/congregation.bo.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-congregation-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-territory-datasource.service.ts`
- `apps/ministry-maps/e2e/page-objects/configuration.page.ts`
- `apps/ministry-maps/e2e/tests/configuration.spec.ts`

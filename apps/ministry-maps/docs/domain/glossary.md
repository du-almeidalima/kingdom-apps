# Glossary — pt-BR ↔ English, and the UI label dictionary

The application UI is **pt-BR only**; there is no i18n layer. Selectors therefore depend on literal
Portuguese strings. This file is the shared vocabulary; screen-specific labels live in each
[`../features/*.md`](../features) document.

---

## 1. Domain vocabulary

Canonical domain definitions and preferred terminology live in [`../../GLOSSARY.md`](../../GLOSSARY.md) (mapped from the workspace root [`/GLOSSARY-MAP.md`](../../../../GLOSSARY-MAP.md)). This document retains only the verbatim UI label and E2E selector dictionary below.

---

## 2. Cross-app UI labels

Shared components, so these strings appear on many screens.

| Label (verbatim)                                                | Where                                   | Notes                                          |
| --------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `Cancelar`                                                      | every confirm dialog and form footer    | `ConfirmDialogComponent`                       |
| `Confirmar`                                                     | every confirm dialog                    | `ConfirmDialogComponent` primary button        |
| `Ministry Maps`                                                 | header                                  | app name                                       |
| `Meu Perfil`                                                    | header user button `title`              | only rendered when logged in (`#profile-link`) |
| `Bem-Vindo {firstName}!`                                        | `/home` heading                         | first token of `User.name`                     |
| `Designar Territórios`                                          | `/home` card title **and** link         | → `/territories/assign`                        |
| `Crie listas com territórios e compartilhe com os publicadores` | `/home` card subtitle                   |                                                |
| `Territórios`                                                   | `/home` link and `/territories` heading | → `/territories`                               |
| `Estatísticas`                                                  | `/home` link                            | → `/territories/statistics`                    |
| `Histórico de Designações`                                      | `/home` link                            | → `/territories/designations`                  |
| `Congregação`                                                   | `/home` card title, link, and `/congregation` heading | link → `/congregation` (`ADMIN` / `APP_ADMIN` only) |
| `Administrar congregação e publicadores`                        | `/home` card subtitle                   |                                                |
| `Pessoas`                                                       | `/home` link and `/congregation/users` heading | → `/congregation/users`                        |
| `Adicionar Congregação`                                         | `/congregation` button & dialog title   | `APP_ADMIN` only                               |
| `Nome da Congregação`                                           | `/congregation` name-card caption       | name is edited through the adjacent pencil icon |
| `Cidades`                                                       | `/congregation` card heading            | cities show a per-city territory count          |
| `Arraste para reordenar`                                        | `/congregation` cities hint             | drag a city row to change its order              |
| `Adicionar`                                                     | `/congregation` city-row button         | appends a new city to the congregation         |
| `Remover Cidade`                                                | `/congregation` dialog title            | final city removal confirmation dialog         |
| `Transferir para outra cidade` / `Excluir territórios`          | `Remover Cidade` dialog choice tiles    | resolution choices; a warning summarizes the effect |
| `Transferir territórios` / `Excluir cidade e territórios`       | `Remover Cidade` dialog confirm button | label and primary/danger style follow the choice |
| `Contatados` / `Ninguém atendeu` / `Mudaram` / `Não visitar` / `Revisita` | Designations history outcome labels | Short labels for visit outcomes. |
| `Criar Link de Convite`                                         | `/congregation/users` FAB `title`       | `ADMIN` only                                   |

## 3. Visit dialog labels (`Concluir Visita` / `Editar Visita`)

Domain-level because the same four outcomes appear in the territory history and statistics.

| Label (verbatim)                      | Bound value                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Concluir Visita`                     | dialog title (create)                                                                                              |
| `Editar Visita`                       | dialog title (edit)                                                                                                |
| `Resultado da visita`                 | section heading                                                                                                    |
| `Morador contatado`                   | `VisitOutcomeEnum.SPOKE` (`0`)                                                                                     |
| `Ninguém atendeu`                     | `VisitOutcomeEnum.NOT_ANSWERED` (`1`)                                                                              |
| `Morador mudou de endereço`           | `VisitOutcomeEnum.MOVED` (`2`)                                                                                     |
| `Morador pediu para não ser visitado` | `VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN` (`3`)                                                                  |
| `Aceitou revisita`                    | `isRevisit` checkbox (`#revisit-checkbox`)                                                                         |
| `Seu Nome` (+ red `*` when required)  | `name` input (`#publisher-name`)                                                                                   |
| `Por favor, coloque o seu nome`       | validation message shown when `isRevisit` is ticked and `name` is empty                                            |
| `Notas`                               | section heading                                                                                                    |
| `Conte como foi o contato:`           | `notes` textarea label (textarea id is `congregation-address` — a copy/paste artifact, still usable as a selector) |
| `Concluir`                            | submit button (create)                                                                                             |
| `Atualizar`                           | submit button (edit)                                                                                               |
| `Cancelar`                            | closes without saving                                                                                              |

There is **no** option for `VisitOutcomeEnum.REVISIT` (`4`) — see
[`data-model.md §3.2`](./data-model.md#32-visitoutcomeenum--numeric).

The dialog has `disableClose = true`: it cannot be dismissed with `Escape` or a backdrop click, only via
`Cancelar` / `Concluir`.

## 4. Territory icon labels (`TerritoryIconTranslatorPipe`)

Used in the manage dialog, the CSV export and the list item's accessible text.

| Stored value | Label           |
| ------------ | --------------- |
| `m`          | `Homem`         |
| `w`          | `Mulher`        |
| `cp`         | `Casal`         |
| `c`          | `Criança/Jovem` |
| `o`          | `Outro`         |

## 5. Role labels (`getTranslatedRole`)

`App Admin.` · `Admin` · `Organizador` · `Ancião` · `Superintendente` · `Publicador`
(see [`roles-and-permissions.md`](./roles-and-permissions.md#1-roles)).

---

## 6. Writing selectors against pt-BR text

- Prefer `data-testid` where it exists, or the shared page objects under `apps/ministry-maps/e2e/page-objects/`.
- Otherwise use accessible-name queries with the **verbatim** string:
  `page.getByRole('button', { name: 'Concluir' })`.
- Accents matter: `Ninguém`, `Ancião`, `Estatísticas`, `Congregação`. Never normalise them.
- Some labels are duplicated across screens (`Designar Territórios` is both a card title and a link) —
  scope the query to a container or use `getByRole('link', …)`.
- Ids that exist and are stable enough to use today: `#profile-link`, `#revisit-checkbox`,
  `#publisher-name`, `#congregation-address` (the notes textarea).

---

## Sources

- `apps/ministry-maps/src/app/shared/components/header/header.component.ts`
- `apps/ministry-maps/src/app/features/home/pages/home-page/home-page.component.html`
- `apps/ministry-maps/src/app/features/work/components/work-item-complete-dialog/work-item-complete-dialog.component.ts`
- `apps/ministry-maps/src/app/shared/pipes/territory-icon-translator/territory-icon-translator.pipe.ts`
- `apps/ministry-maps/src/app/features/congregation/pages/users-page/users-page.component.html`
- `libs/common-ui/src/lib/components/confirm-dialog/confirm-dialog.component.ts`
- `apps/ministry-maps/src/models/enums/role.ts`

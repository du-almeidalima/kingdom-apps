# Designations History (`UC-HIST`)

Routes `/territories/designations` and `/territories/designations/:headerId`. The feature is for authenticated
ORGANIZER, ADMIN, ELDER and SUPERINTENDENT users in a congregation; APP_ADMIN bypasses the role list. A PUBLISHER is
redirected to `/welcome`.

## Screens and data flow

The list shows all headers belonging to the current congregation, newest first, 20 at a time. It reads one page of
headers (21 documents to determine whether another page exists) and displays each session's date, status and closure
source. It does not read progress documents.

The detail page listens to its header and `designations_header/{headerId}/progress/summary`. It shows overall progress,
outcome counts, closure information and one progress card per designation. Expanding a card reads its designation once
and lists the embedded territory snapshots with completion status and outcome. `Reenviar` opens the existing WhatsApp
share flow for `/work/{designationId}`.

Assign registers each created designation and its total in the progress summary. `/work/:id` writes the latest outcome
and completion date at `territories.{designationId}_{territoryId}`; edits replace that entry and undo deletes it. These
client-side writes keep the detail view live without a Cloud Function. Legacy designations without a header are skipped;
missing legacy progress documents are tolerated until backfill.

## Copy contract

| Surface | Text |
| --- | --- |
| Home link | `Histórico de Designações` |
| List heading | `Histórico de designações` |
| Row | `Sessão de dd/MM/yyyy`; `Iniciada às HH:mm` |
| Status | `Em andamento`; `Encerrada` |
| Closure | `Encerrada manualmente em …`; `Encerrada automaticamente em …` |
| Load more | `Carregar mais` |
| Empty list | `Nenhuma sessão de designações encontrada.` |
| Detail summary | `{done} de {total} territórios concluídos`; `{percent}%` |
| Outcomes | `Contatados`; `Ninguém atendeu`; `Mudaram`; `Não visitar`; `Revisita` |
| Legacy progress | `Progresso indisponível para esta sessão.` |
| Missing detail | `Sessão de designações não encontrada.` |
| Missing designation | `Designação não encontrada.` |

## Read budget

| Action | Reads |
| --- | ---: |
| List page | 1 query, up to 21 headers; no progress reads |
| Open detail | 1 live header + 1 live progress document |
| Expand a designation | 1 one-shot designation read, cached for the page |
| Assign page | unchanged; it never reads progress |

## Use cases

### UC-HIST-01 — Home link opens the history list

- **Actor:** ADMIN
- **Route:** `/home` → `/territories/designations`
- **Expected:** The `Histórico de Designações` home link opens the history heading.
- **Priority:** P0 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-02 — Lists scoped sessions with status and closure source

- **Actor:** ADMIN
- **Route:** `/territories/designations`
- **Expected:** Headers from this congregation appear newest first with status and USER/CRON closure copy; another congregation is excluded.
- **Priority:** P0 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-03 — Loads more sessions

- **Actor:** ADMIN
- **Route:** `/territories/designations`
- **Expected:** 20 rows initially; `Carregar mais` appends the 21st and disappears when there are no more results.
- **Priority:** P1 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-04 — Shows the empty state

- **Actor:** ADMIN
- **Route:** `/territories/designations`
- **Expected:** `Nenhuma sessão de designações encontrada.`
- **Priority:** P1 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-05 — Shows overall and per-designation progress

- **Actor:** ADMIN
- **Route:** `/territories/designations/:headerId`
- **Expected:** Totals, percentage, non-zero outcome counts and ordered designation cards match the progress summary.
- **Priority:** P0 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-06 — Expands territories and re-shares a designation

- **Actor:** ADMIN
- **Route:** `/territories/designations/:headerId`
- **Expected:** The card shows completed/pending territories and expiration; `Reenviar` shares `/work/{id}`.
- **Priority:** P1 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-07 — Handles legacy and missing headers

- **Actor:** ADMIN
- **Route:** `/territories/designations/:headerId`
- **Expected:** Legacy headers show unavailable progress; unknown ids show the not-found message.
- **Priority:** P1 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-08 — Enforces route roles

- **Actor:** ORGANIZER, ADMIN, ELDER, SUPERINTENDENT, APP_ADMIN, PUBLISHER
- **Route:** `/territories/designations`
- **Expected:** The first five roles can open the page; PUBLISHER is redirected to `/welcome`.
- **Priority:** P0 · **Coverage:** `territories-designations-history.spec.ts`

### UC-HIST-09 — Anonymous work updates detail live

- **Actor:** ADMIN and anonymous publisher
- **Route:** Detail page plus `/work/:id`
- **Expected:** Completing an anonymous visit changes the open detail summary without reload.
- **Priority:** P0 · **Coverage:** `territories-designations-history.spec.ts`

## Sources

- `src/app/features/territory/bo/designations-history/designations-history.bo.ts`
- `src/app/repositories/firebase/firebase-designations-progress-datasource.service.ts`
- `src/app/features/work/bo/work.bo.ts`, `src/app/features/work/pages/work-page/work-page.component.ts`
- `firestore.rules`, `firestore.indexes.json`
- `e2e/tests/territories-designations-history.spec.ts`

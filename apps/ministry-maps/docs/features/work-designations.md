# Work / receiving designations (`UC-WORK`)

This document describes the behavioural use cases for `/work/:id` (the router param is literally named
`id`, not `designationId`, but it is a designation id) — the bare, unauthenticated link a publisher receives to work a list of territories ("designação"). **Actor:** any holder of the link, most often
`PUBLISHER`, but the route carries **no guard** (`data: { roles: ['*'] }` on `WorkModule`, and `WorkRoutesModule`
attaches none either) — anonymous visitors and every signed-in role reach the identical page. Field/model shapes referenced below are defined in [`../domain/data-model.md`](../domain/data-model.md) (read **§4.1**
and **§4.2** first — they already document the dual-history contract and the frozen-snapshot contract this whole feature depends on); pt-BR ↔ English vocabulary and the dialog's verbatim labels are in
[`../domain/glossary.md`](../domain/glossary.md#3-visit-dialog-labels-concluir-visita--editar-visita).

> **Read this before seeding any "happy path" entry below.** `seed.factories.buildDesignationTerritory()`
> produces an object with **no `history` key at all**, and the app's designation-read converter
> (`convertHistoryDateFirebaseTimestampToDate` in `firebase-designation-datasource.service.ts`) does
> `t.history.map(...)` on every embedded territory with **no null-guard**. Any designation whose embedded
> territory omits `history` throws inside the `docData` pipeline the instant `/work/:id` opens (see
> UC-WORK-04). This even affects the **default baseline** `seed-designation` (its own embedded territory has
> no `history` override — see [`data-model.md §5`](../domain/data-model.md#5-default-e2e-baseline-seed)).
> Every entry below that needs a *working* page explicitly overrides `history: []` on
> `buildDesignationTerritory(...)`; do not omit it when writing a new seed for this feature.

**Quick reference — the two expiry flags `WorkPageComponent` computes in `ngOnInit`:**

| Flag         | Formula                                                                    | Drives                                                                                                  |
|--------------|----------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `isDisabled` | `designation?.expiresAt ? designation.expiresAt.getTime() < Date.now() : false` | the info note (`@if (isDisabled)`); the checkbox/edit/undo `disabled` input on `kingdom-apps-work-item` |
| `isBlocked`  | `isDisabled && !!designation.settings?.shouldDesignationBlockAfterExpired` | only the maps button's `disabled` input on `kingdom-apps-work-item`                                     |

Read that table before writing any expiry test (UC-WORK-20/21): the naming suggests `isBlocked` gates everything, but it only ever gates the maps affordance.

### Opening the designation link

#### UC-WORK-01 — Anonymous open of a valid, active designation renders its territories

- **Actor:** Anonymous (no session, no cookies)
- **Route:** `/work/:id`
- **Preconditions (seed):** `seed.factories.buildDesignation({ id: 'd-active', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser, expiresAt: <7 days in the future>, territories: [seed.factories.buildDesignationTerritory({ id: seed.ids.territories[0], congregationId: seed.ids.congregation, city: 'São Paulo', address: 'Rua das Acácias, 45 - Pinheiros', history: [] })] })`
- **Steps:** 1. `page.goto('/work/d-active')` with no prior sign-in → 2. wait for the loading state to clear
- **Expected UI:** the `Loading...` text (`@if (isLoading)`) disappears; a `Territórios` (`t-headline4`) heading appears; one `kingdom-apps-work-item` row renders showing `territory.address` (`Rua das Acácias, 45 - Pinheiros`) as its title and `territory.city` (`São Paulo`) in the footer; no login prompt, no redirect — the URL stays `/work/d-active`
- **Expected persistence:** N/A read-only open — assert no write occurred: `db.getDoc(db.collections.designations, 'd-active').territories[0].status === 'PENDING'` (unchanged)
- **Edge cases:** the page never calls any auth API before rendering — `DesignationRepository.getById` is the only network call in `ngOnInit`
- **Priority:** P0 · **Gaps:** no `data-testid` anywhere on this screen; select the row by its address text

#### UC-WORK-02 — Non-existent designation id renders a blank page forever, no error

- **Actor:** Anonymous
- **Route:** `/work/:id`
- **Preconditions (seed):** none (do not seed a designation with this id)
- **Steps:** 1. `page.goto('/work/does-not-exist')`
- **Expected UI:** `docData` on a missing doc emits `undefined`, so `designation` stays `undefined`; `isLoading` still flips to `false` (the `tap` runs on every `next`, including `undefined`); the `@if (designation)` block never renders — the page shows a bare `<main class="container">` with nothing inside, no error text, no "not found" copy, no spinner stuck on screen
- **Expected persistence:** `db.getDoc(db.collections.designations, 'does-not-exist')` is `undefined`
- **Edge cases:** there is no `catchError`/error UI anywhere in `WorkPageComponent.ngOnInit` for this path — do not assert an error message, none exists
- **Priority:** P1 · **Gaps:** no `data-testid`/landmark to assert "empty state reached"; assert absence of the `Territórios` heading instead

#### UC-WORK-03 — ⚠ Id containing an encoded slash throws synchronously, page never loads

- **Actor:** Anonymous
- **Route:** `/work/:id`
- **Preconditions (seed):** none
- **Steps:** 1. `page.goto('/work/abc%2Fdef')` (a single URL-encoded `/` inside the param)
- **Expected UI:** Angular's router matches the one path segment `abc%2Fdef` against `work/:id` and decodes it to `abc/def` before `paramMap.get('id')` returns it; `doc(this.designationCollection, 'abc/def')` is then called with an **odd** total segment count (`designations` + `abc` + `def` = 3), which the Firestore SDK rejects as an invalid document reference and throws synchronously inside `ngOnInit`, before the component ever subscribes. **Today's reality:** the page never reaches its `isLoading` state change; console shows an uncaught `FirebaseError`/`Error`, and the visible page is whatever the last-rendered template was (blank on a fresh navigation)
- **Expected persistence:** N/A — no read is attempted; assert no document was created (`db.getDoc(db.collections.designations, 'abc/def')` stays `undefined`, N/A shape anyway)
- **Edge cases:** a plain non-slash malformed string (emojis, extremely long ids, leading/trailing spaces) does **not** throw — it behaves exactly like UC-WORK-02 (valid doc path, simply not found)
- **Priority:** P2 · **Gaps:** `⚠ suspected defect` — no try/catch around `doc()`/`ngOnInit`; test must assert the console error and blank page, not a graceful message

#### UC-WORK-04 — ⚠ Embedded territory without a `history` array crashes the read pipeline

- **Actor:** Anonymous
- **Route:** `/work/:id`
- **Preconditions (seed):** `seed.factories.buildDesignation({ id: 'd-no-history', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser, expiresAt: <future>, territories: [seed.factories.buildDesignationTerritory({ id: seed.ids.territories[0], congregationId: seed.ids.congregation })] })` — **deliberately omit** the `history` override (the factory default)
- **Steps:** 1. `page.goto('/work/d-no-history')`
- **Expected UI:** `convertHistoryDateFirebaseTimestampToDate` runs `t.history.map((h) => ({...}))` for every embedded territory with no `t.history ?? []` fallback; since the seeded doc has no `history` field, this throws `Cannot read properties of undefined (reading 'map')` inside the `docData` conversion. The returned observable errors; `.subscribe(designation => {...})` has **no** error callback, so the error is unhandled and the emission never reaches `tap`. **Today's reality:** `isLoading` stays `true` forever — the page shows `Loading...` indefinitely, and the browser console logs the uncaught error
- **Expected persistence:** N/A — assert the read never completed: the designation doc itself is unaffected (`db.getDoc(db.collections.designations, 'd-no-history').territories[0].status === 'PENDING'`, i.e. nothing changed, only the UI is stuck)
- **Edge cases:** this reproduces for the **default baseline** `seed-designation` too, since its embedded territory has no `history` override either — never navigate to `/work/seed-designation` in a spec without first patching that field
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` — the converter needs `(t.history ?? []).map(...)`; consolidate in the testability-gaps summary below; test must assert the stuck `Loading...` text, not a rendered list

#### UC-WORK-05 — Rendering reflects the frozen embedded snapshot, not the live territory doc

- **Actor:** Anonymous
- **Route:** `/work/:id`
- **Preconditions (seed):** a territory `seed.factories.buildTerritory({ id: 'src-territory', congregationId: seed.ids.congregation, address: 'Rua Original, 1', history: [] })`; a designation embedding it via `seed.factories.buildDesignationTerritory({ id: 'src-territory', congregationId: seed.ids.congregation, address: 'Rua Original, 1', history: [] })`, `expiresAt: <future>` — then, **after** `seed.write`, mutate/delete `src-territory` directly (`db.firestore.collection('territories').doc('src-territory').update({ address: 'Rua Editada, 2' })` or delete it entirely)
- **Steps:** 1. edit (or delete) `territories/src-territory` via the Admin SDK → 2. `page.goto('/work/<designationId>')`
- **Expected UI:** the row still shows `Rua Original, 1` (the address embedded at designation-creation time), even though `territories/src-territory` now reads `Rua Editada, 2` or does not exist at all — `DesignationRepository.getById` never reads the `territories` collection
- **Expected persistence:** `db.getDoc(db.collections.territories, 'src-territory').address === 'Rua Editada, 2'` (or `undefined` if deleted) while `db.getDoc(db.collections.designations, id).territories[0].address === 'Rua Original, 1'` — the two documents diverge on purpose
- **Edge cases:** the visit **write-back** on completion still targets the real `territories/src-territory` id (see UC-WORK-23) — if that parent doc was deleted, `TerritoryRepository.update` (`updateDoc`) rejects because the document no longer exists; that failure path is unobserved by the UI (`concat([...]).pipe(retry(2))` in `handleTerritoryUpdated` is **never subscribed to**, see UC-WORK-23's gap note)
- **Priority:** P1 · **Gaps:** none beyond the general selector gap

#### UC-WORK-06 — Signed-in admin sees an identical, unguarded page

- **Actor:** Admin
- **Route:** `/work/:id`
- **Preconditions (seed):** same as UC-WORK-01
- **Steps:** 1. `signInAs('admin')` → 2. `page.goto('/work/d-active')`
- **Expected UI:** identical DOM to UC-WORK-01 — same heading, same row, same enabled checkbox; nothing in `WorkPageComponent`/`WorkRoutesModule` reads the signed-in user or role
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'` (context only — role is never consulted by this route)
- **Edge cases:** the header still shows the logged-in chrome (`Meu Perfil` link) around the `<router-outlet>`, but the work content itself is role-agnostic; a signed-in `PUBLISHER` behaves the same way too
- **Priority:** P2 · **Gaps:** none

### Completing a visit — the four outcomes

#### UC-WORK-07 — Complete a visit as "Morador contatado" (`SPOKE`, `0`)

- **Actor:** Publisher (no auth required)
- **Route:** `/work/:id`
- **Preconditions (seed):** `seed.factories.buildDesignation({ id: 'd-spoke', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser, expiresAt: <future>, territories: [seed.factories.buildDesignationTerritory({ id: 'tid-1', congregationId: seed.ids.congregation, history: [] })] })`; `seed.factories.buildTerritory({ id: 'tid-1', congregationId: seed.ids.congregation, history: [] })`
- **Steps:** 1. open `/work/d-spoke` → 2. click the row's checkbox (`handleCheck`) → 3. dialog title `Concluir Visita` opens with `Morador contatado` pre-selected (form default) → 4. leave "Aceitou revisita" unticked, "Seu Nome" empty, notes empty → 5. click `Concluir`
- **Expected UI:** dialog closes; the row disappears from "Territórios" and reappears under a new `Concluídos` (`t-headline4`) heading, now showing the eraser icon instead of a checkbox
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, 'tid-1', db.historySubcollection)` gains one doc with `{ visitOutcome: 0, isRevisit: false, notes: '', name: '' }`; `db.getDoc(db.collections.designations, 'd-spoke').territories[0].status === 'DONE'`; `db.getDoc(db.collections.territories, 'tid-1').lastVisit` is a fresh `Timestamp` (set client-side to `new Date()` in `handleTerritoryUpdated`, not the visit's own date field, which is set independently at the same instant)
- **Edge cases:** the visit id is `Date.now().toString()` at click time — two visits completed within the same millisecond (unlikely in a real browser) would collide on id
- **Priority:** P0 · **Gaps:** no `data-testid` on the checkbox, the dialog, or any radio; select radios by their pt-BR label text via `kingdom-apps-icon-radio`

#### UC-WORK-08 — Complete a visit as "Ninguém atendeu" (`NOT_ANSWERED`, `1`)

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape as UC-WORK-07, fresh id `d-not-answered` / `tid-2`
- **Steps:** 1. open the link → 2. check the row → 3. select `Ninguém atendeu` → 4. `Concluir`
- **Expected UI:** same completion transition as UC-WORK-07
- **Expected persistence:** the new `territories/tid-2/history/{visitId}` doc has `visitOutcome: 1`; `designations/{id}.territories[0].status === 'DONE'`
- **Edge cases:** this outcome carries no special alert semantics on this screen — the "unresolved NOT_ANSWERED" alert badge is a `/territories`-only concept (see `../features/territories-management.md`), and `isResolved` is never set by this dialog (it stays `undefined` on every visit created here)
- **Priority:** P1 · **Gaps:** same selector gap as UC-WORK-07

#### UC-WORK-09 — Complete a visit as "Morador mudou de endereço" (`MOVED`, `2`)

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape, fresh id `d-moved` / `tid-3`
- **Steps:** 1. open the link → 2. check the row → 3. select `Morador mudou de endereço` → 4. `Concluir`
- **Expected UI:** same completion transition
- **Expected persistence:** the new history doc has `visitOutcome: 2`
- **Edge cases:** as with UC-WORK-08, `isResolved` is not written here — a `MOVED` outcome recorded from `/work/:id` needs a separate `/territories` action to ever gain `isResolved: true`
- **Priority:** P1 · **Gaps:** same selector gap as UC-WORK-07

#### UC-WORK-10 — Complete a visit as "Morador pediu para não ser visitado" (`ASKED_TO_NOT_VISIT_AGAIN`, `3`)

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape, fresh id `d-no-visit` / `tid-4`
- **Steps:** 1. open the link → 2. check the row → 3. select `Morador pediu para não ser visitado` → 4. `Concluir`
- **Expected UI:** same completion transition
- **Expected persistence:** the new history doc has `visitOutcome: 3`
- **Edge cases:** `VisitOutcomeEnum.REVISIT` (`4`) is never reachable through this dialog — there is no fifth radio; do not write a test expecting it
- **Priority:** P1 · **Gaps:** same selector gap as UC-WORK-07

### Revisit & publisher name

#### UC-WORK-11 — "Aceitou revisita" makes "Seu Nome" required and blocks submit

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape as UC-WORK-07, fresh id `d-revisit` / `tid-5`
- **Steps:** 1. open the link → 2. check the row → 3. tick `Aceitou revisita` (`#revisit-checkbox`) → 4. leave `Seu Nome` (`#publisher-name`) empty → 5. observe → 6. type a name → 7. `Concluir`
- **Expected UI:** immediately after step 3, the `Seu Nome` label gains a red `*`; the `Concluir` button becomes `disabled` (`[disabled]="form.invalid"`); the moment the empty `name` control is touched/invalid, the text `Por favor, coloque o seu nome` appears under the input; after step 6 the message disappears and `Concluir` re-enables
- **Expected persistence:** before step 6, no write happens (button is disabled, form never submits); after step 7, the new history doc has `isRevisit: true`, `name: '<typed name>'`
- **Edge cases:** unticking `Aceitou revisita` again clears the `required` validator (`_setIsRevisitListener`) — a previously-invalid empty name becomes valid immediately, re-enabling `Concluir` without the message
- **Priority:** P0 · **Gaps:** no `data-testid` on the submit button or the error message span; select via `#revisit-checkbox`/`#publisher-name` ids (documented as stable in `glossary.md §6`) and the exact message text

#### UC-WORK-12 — Publisher name stays optional when revisit is not accepted

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape, fresh id `d-no-revisit` / `tid-6`
- **Steps:** 1. open the link → 2. check the row → 3. leave `Aceitou revisita` unticked and `Seu Nome` empty → 4. `Concluir`
- **Expected UI:** `Concluir` is enabled the whole time (the `name` control has no validator by default); no error message ever renders; the dialog closes
- **Expected persistence:** the new history doc has `isRevisit: false`, `name: ''`
- **Edge cases:** typing a name while `Aceitou revisita` is unticked is allowed and persists normally — the field is simply optional, not hidden
- **Priority:** P1 · **Gaps:** same selector gap as UC-WORK-11

### Notes

#### UC-WORK-13 — Free-text notes are persisted verbatim

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape, fresh id `d-notes` / `tid-7`
- **Steps:** 1. open the link → 2. check the row → 3. type `Conversamos sobre a Bíblia, ficou interessado.` into the `Notas` textarea (id `congregation-address`, label `Conte como foi o contato:`) → 4. `Concluir`
- **Expected UI:** dialog closes normally
- **Expected persistence:** the new history doc has `notes: 'Conversamos sobre a Bíblia, ficou interessado.'` exactly (no trimming/transformation in `handleFormSubmit`)
- **Edge cases:** opening the history dialog afterward (UC-WORK-18) shows that exact string as the row's body text
- **Priority:** P1 · **Gaps:** no `data-testid` on the textarea; use `#congregation-address`

#### UC-WORK-14 — Leaving notes empty persists an empty string

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape, fresh id `d-empty-notes` / `tid-8`
- **Steps:** 1. open the link → 2. check the row → 3. leave the `Notas` textarea empty → 4. `Concluir` → 5. open the history button on the now-done row
- **Expected UI:** the history dialog (`Histórico de Visitas`) renders that row's body as `Sem observações` — the template's `{{ history.notes ? history.notes : 'Sem observações' }}` fallback, since `notes` is `''` (falsy)
- **Expected persistence:** the new history doc has `notes: ''` (not `null`/`undefined` — the form control's initial value)
- **Edge cases:** this is distinct from "no history at all" (UC-WORK-18) — the button is present here because `history.length === 1` after the first completion
- **Priority:** P2 · **Gaps:** none beyond the general selector gap

### Cancel, edit, undo

#### UC-WORK-15 — Cancelling the dialog keeps the territory `PENDING` and writes nothing

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same shape, fresh id `d-cancel` / `tid-9`
- **Steps:** 1. open the link → 2. check the row → 3. in the dialog, change the outcome, tick `Aceitou revisita`, type notes → 4. click `Cancelar`
- **Expected UI:** dialog closes (`libDialogClose`, no `dialogRef.close(data)` call); the row remains in `Territórios`, checkbox unchecked
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, 'tid-9', db.historySubcollection)` is still empty; `db.getDoc(db.collections.designations, 'd-cancel').territories[0].status === 'PENDING'`; `db.getDoc(db.collections.territories, 'tid-9').lastVisit` is unchanged (`null`/absent)
- **Edge cases:** the dialog has `disableClose = true`, so `Escape`/backdrop click do **not** close it either — only `Cancelar` or a valid `Concluir` do; a Playwright test that presses `Escape` expecting the dialog to close will fail
- **Priority:** P0 · **Gaps:** none beyond the general selector gap

#### UC-WORK-16 — Editing the last visit preserves its id and date, only edited fields change

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** a designation whose embedded territory already carries one `history` entry: `seed.factories.buildDesignationTerritory({ id: 'tid-10', congregationId: seed.ids.congregation, status: 'DONE', history: [seed.factories.buildVisitHistory({ id: 'visit-1', visitOutcome: 0, notes: 'original', date: new Date('2024-05-01T10:00:00Z') })] })`; matching `buildTerritory({ id: 'tid-10', ... })` with the same visit in its `history`
- **Steps:** 1. open the link (the territory renders under `Concluídos`, since `status: 'DONE'`) → 2. click the pencil (`handleEdit`) → 3. dialog title `Editar Visita`, form pre-filled from the last history entry (`notes: 'original'`, outcome `Morador contatado`) → 4. change `notes` to `'updated'` → 5. `Atualizar`
- **Expected UI:** submit label reads `Atualizar` (not `Concluir`); dialog closes
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, 'tid-10', db.historySubcollection)` still has exactly **one** doc, same `id === 'visit-1'` and the **same** `date` (`2024-05-01T10:00:00Z`) — `handleEdit` explicitly reuses `lastHistoryEntry?.date` and `lastHistoryEntry?.id`; only `notes` (and any other form field actually changed) differs: `notes === 'updated'`
- **Edge cases:** `handleEdit` operates on `this.territory.history` (the **designation-embedded** array), not the real subcollection — if the embedded snapshot's `history` ever diverges from the subcollection (e.g. UC-WORK-23's overwrite defect), editing "the last visit" edits the embedded copy, and the write-back still targets the real doc by the same reused `id`, so the two stay in sync only because the id/date are carried over unchanged
- **Priority:** P1 · **Gaps:** no `data-testid` on the pencil button; select via its `lib-icon-button` + `pencil-lined` icon or DOM order

#### UC-WORK-17 — Undoing ("Apagar Visita") a completed visit reverts status and removes the history doc

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** a designation with one `DONE` embedded territory carrying exactly one `history` entry (same shape as UC-WORK-16, fresh ids `d-undo` / `tid-11` / `visit-11`)
- **Steps:** 1. open the link → 2. click the eraser icon on the done row (`handleUndo`) → 3. confirmation dialog title `Apagar Visita`, body `Você gostaria de apagar essa visita?` then `Isso vai apagar todos os dados que você preencheu.` → 4. `Confirmar`
- **Expected UI:** the row moves back from `Concluídos` to `Territórios`, showing the plain checkbox again
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, 'tid-11', db.historySubcollection)` is now empty (the `visit-11` doc is deleted); `db.getDoc(db.collections.designations, 'd-undo').territories[0].status === 'PENDING'`; `db.getDoc(db.collections.territories, 'tid-11').lastVisit` becomes `null` — `WorkBO.undoLastVisitChanges` computes it from the (now empty) remaining history, **it is not recomputed by the repository itself** ([`data-model.md §4.1`](../domain/data-model.md#41-dual-history-subcollection-vs-recenthistory-vs-lastvisit)); `recentHistory` loses the matching entry (filtered by id inside `TerritoryRepository.deleteVisitHistory`, a call independent of the `lastVisit` write)
- **Edge cases:** clicking `Cancelar` in the confirmation dialog leaves everything untouched; undoing when the embedded `history` has **more than one** entry is a race — `WorkBO`'s own `territoryRepository.update()` call and `deleteVisitHistory`'s internal `update()` call both write `recentHistory` concurrently (`forkJoin`), so the final value depends on which `updateDoc` lands last — do not write a strict-ordering assertion for that case, only for the single-entry case above
- **Priority:** P1 · **Gaps:** no `data-testid` on the eraser button or the confirm dialog buttons; use `title="Apagar Visita"` and the exact body text

### Conditional affordances

#### UC-WORK-18 — History button is present only when the embedded territory carries `history`

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** two rows in the same designation — one `buildDesignationTerritory({ id: 'tid-12', history: [] })` (empty array, not omitted) and one `buildDesignationTerritory({ id: 'tid-13', history: [seed.factories.buildVisitHistory({ visitOutcome: 0, notes: 'obs', isRevisit: true, name: 'Roberto' })] })`
- **Steps:** 1. open the link → 2. inspect both rows' button groups
- **Expected UI:** `tid-12`'s row has **no** clock/history icon button (`@if (territory.history && territory.history.length > 0)` is false for `[]`); `tid-13`'s row has it — clicking opens `Histórico de Visitas` showing one entry, its notes text, a `Revisita` badge (`title="Essa pessoa foi marcada como revisita recentemente"`), and `Roberto, <date>` on the footer line, footer button `Fechar`
- **Expected persistence:** `db.getDoc(db.collections.designations, id).territories` — entry for `tid-12` has `history: []`, entry for `tid-13` has `history.length === 1`
- **Edge cases:** the dialog's list comes from `territory.history.slice().reverse()` — the **embedded** array, not `getTerritoryVisitHistory(id)` against the subcollection ([`data-model.md §4.2`](../domain/data-model.md#42-designation-territories-are-frozen-snapshots)); a visit added to the real subcollection by some other means (e.g. directly via `/territories`) after the designation was created never appears here
- **Priority:** P1 · **Gaps:** no `data-testid` on the history button or dialog rows; select by icon (`time-17`) or by the dialog title text

#### UC-WORK-19 — ⚠ Maps button is gated by `mapsLink`, but on Chromium it navigates the same tab, not a popup

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** two rows — one `buildDesignationTerritory({ id: 'tid-14', history: [] })` with **no** `mapsLink`, one `buildDesignationTerritory({ id: 'tid-15', history: [], mapsLink: 'https://maps.app.goo.gl/example' })`
- **Steps:** 1. open the link → 2. inspect both rows → 3. click the maps icon on `tid-15`'s row
- **Expected UI:** `tid-14`'s row has no maps button at all (`@if (territory.mapsLink)`); `tid-15`'s row has it. `handleOpenMaps` calls `openGoogleMapsHandler`, which branches on `navigator.userAgent` (`getAgentBrowser`): **Chrome/Chromium** (Playwright's default browser reports as Chrome) calls `window.open(sanitizedLink, '_self')` — this **replaces the current tab's location**, it does **not** open a new tab/window. Only Firefox/Safari/unknown branches use `'_blank'` (a real popup), and Samsung builds an `intent://` URL. **Today's reality on the default Chromium project:** `page.waitForEvent('popup')` will **never** fire; the correct technique is `page.waitForURL(sanitizedLink)` or a `page.route`/`page.on('request')` intercept, or stubbing `window.open` before the click (`page.exposeBinding`/`addInitScript` to record the call instead of letting it navigate away from the emulator app)
- **Expected persistence:** N/A (no write); assert `db.getDoc(db.collections.designations, id).territories` — `tid-14` entry has no `mapsLink` key, `tid-15` entry has `mapsLink === 'https://maps.app.goo.gl/example'`
- **Edge cases:** if a spec's Playwright project is configured for `firefox`/`webkit`, the popup technique **does** apply there (`_blank` branch) — the correct technique is browser-project-dependent, not universal
- **Priority:** P1 · **Gaps:** `⚠ suspected defect`/testability trap — document both techniques; no `data-testid` on the maps button, select by icon (`map-5`)

### Expiry & blocking

#### UC-WORK-20 — Expired designation with `shouldDesignationBlockAfterExpired: true` blocks every action

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** `seed.factories.buildDesignation({ id: 'd-blocked', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser, expiresAt: new Date('2020-01-01'), settings: { shouldDesignationBlockAfterExpired: true }, territories: [seed.factories.buildDesignationTerritory({ id: 'tid-16', congregationId: seed.ids.congregation, history: [] })] })`
- **Steps:** 1. open `/work/d-blocked`
- **Expected UI:** an info note (`lib-note type="info"`) renders with the exact text `Essa designação está desabilitada. Por favor peça ao seu SG uma designação nova.`; the row's checkbox is `disabled`; if the row also had a `mapsLink`, that button is `disabled` too (`isBlocked = isDisabled && settings.shouldDesignationBlockAfterExpired`, both `true` here)
- **Expected persistence:** clicking the disabled checkbox produces no write — `db.getSubcollectionDocs(db.collections.territories, 'tid-16', db.historySubcollection)` stays empty after the interaction attempt
- **Edge cases:** this is exactly the shape of the **default baseline** `seed-designation` (already expired, already blocking) **except** it also needs `history: []` on its embedded territory to avoid UC-WORK-04 — do not reuse `seed.ids.designation` directly without patching that field first
- **Priority:** P0 · **Gaps:** no `data-testid` on the note; match `lib-note`'s rendered text

#### UC-WORK-21 — ⚠ Expired designation with `shouldDesignationBlockAfterExpired: false` still disables the checkbox

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** same as UC-WORK-20 but `settings: { shouldDesignationBlockAfterExpired: false }`, ids `d-expired-nonblocking` / `tid-17`, and give `tid-17` a `mapsLink`
- **Steps:** 1. open `/work/d-expired-nonblocking`
- **Expected UI:** the same info note renders (`@if (isDisabled)` only checks expiry, **not** the setting) — reading the note alone, a user would assume the page is unusable either way. **Today's reality:** the row's checkbox is **still `disabled`**, because `WorkPageComponent` passes `[disabled]="isDisabled"` (expiry alone) to `kingdom-apps-work-item`, and the checkbox/edit/undo buttons all bind to that same `disabled` input — **not** to `blocked`. Only the maps button binds to `[blocked]="isBlocked"` (`isDisabled && settings.shouldDesignationBlockAfterExpired`), which is `false` here, so **only the maps button is actually enabled**
- **Expected persistence:** clicking the (disabled) checkbox produces no write, exactly like the blocking case: `db.getSubcollectionDocs(db.collections.territories, 'tid-17', db.historySubcollection)` stays empty
- **Edge cases:** this contradicts the intuitive reading of `shouldDesignationBlockAfterExpired: false` as "still fully usable after expiry" — in reality it only changes whether the **maps** button is clickable; the primary "complete a visit" action never re-enables once `expiresAt` has passed, regardless of this setting
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` — `disabled` should likely be gated by `isBlocked`, not `isDisabled`, for the checkbox/edit/undo; test must assert the checkbox is disabled and only the maps button is enabled, not that the page is "fully usable"

### Completion state & full write-back

#### UC-WORK-22 — Completing every territory shows the "Parabéns!" all-done state

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** a designation with exactly one `PENDING` embedded territory, `history: []`, fresh ids `d-alldone` / `tid-18`, `expiresAt` in the future
- **Steps:** 1. open the link → 2. check the row, complete with any outcome → 3. `Concluir`
- **Expected UI:** the `Territórios` heading and the pending list disappear entirely; in their place: heading `Parabéns!` (`t-headline2`) and paragraph `Todos os territórios foram concluidos, que Jeová abençoe seu trabalho!` (verbatim, including the missing accent on "concluidos" in the source); the `Concluídos` section still renders below with the one done row
- **Expected persistence:** `db.getDoc(db.collections.designations, 'd-alldone').territories.every(t => t.status === 'DONE')` is `true`
- **Edge cases:** the "all done" copy is driven purely by `territories.length === 0` (the client-side `PENDING` bucket), not by any designation-level `status` field — a designation object has no own `status`
- **Priority:** P1 · **Gaps:** none beyond the general selector gap

#### UC-WORK-23 — ⚠ Full write-back of a completed visit can overwrite pre-existing `recentHistory`

- **Actor:** Publisher
- **Route:** `/work/:id`
- **Preconditions (seed):** `seed.factories.buildTerritory({ id: 'tid-19', congregationId: seed.ids.congregation, history: [seed.factories.buildVisitHistory(), seed.factories.buildVisitHistory(), seed.factories.buildVisitHistory(), seed.factories.buildVisitHistory(), seed.factories.buildVisitHistory()] })` (5 existing visits, so the seeder's own `recentHistory` computation fills all 5 slots); a designation embedding `seed.factories.buildDesignationTerritory({ id: 'tid-19', congregationId: seed.ids.congregation, history: [] })` (the **designation's own** history starts empty, `expiresAt` future) — this is the realistic shape for a freshly-created designation over an already-visited territory
- **Steps:** 1. open the link → 2. check the row, pick any outcome, `Concluir` (the **6th** visit overall for this territory, but the 1st inside this designation)
- **Expected UI:** the row moves to `Concluídos` as usual
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, 'tid-19', db.historySubcollection)` now has **6** docs (the new one added via `setVisitHistory`, the previous 5 untouched — subcollection writes are additive); `db.getDoc(db.collections.territories, 'tid-19').lastVisit` is the new visit's timestamp; `db.getDoc(db.collections.designations, id).territories[0].status === 'DONE'`. **`recentHistory` reality:** `handleTerritoryUpdated` calls `territoryRepository.update(territory)` with `territory.history` equal to the **designation-embedded** array only (`[...(this.territory.history ?? []), newEntry]` — here just `[newEntry]`, length 1), so `TerritoryRepository.update` recomputes `recentHistory = [newEntry]` — **the parent doc's `recentHistory`, which held 5 entries a moment ago, is overwritten down to a single entry.** Assert `db.getDoc(db.collections.territories, 'tid-19').recentHistory.length === 1` today, **not** 5 and **not** 6-capped-to-5
- **Edge cases:** this only happens because the designation's embedded `history` does not carry the territory's pre-existing visits — a designation created by the app immediately after those 5 visits (same session) might embed them and avoid this; this catalog covers only what the seeded, decoupled scenario above produces
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` — `update()`'s "last 5, ascending" recompute silently drops history the caller doesn't know about; test must assert the overwrite (`length === 1`), which is the opposite of a "5-entry cap" and is the actual regression risk this entry exists to lock in

#### UC-WORK-24 — Non-existent designation id renders designation not-found screen

- **Actor:** Anonymous
- **Route:** `/work/:id`
- **Preconditions (seed):** none (do not seed a designation with this id)
- **Steps:** 1. `page.goto('/work/<non-existent-id>')`
- **Expected UI:** `isNotFound` becomes `true`; the `<kingdom-apps-designation-not-found>` component renders with heading `Designação não encontrada` (`data-testid="designation-not-found-heading"`) and body copy explaining that the designation may have expired or been removed, instructing the publisher to contact their Group Overseer (SG); neither the `Territórios` nor the `Concluídos` section renders.
- **Expected persistence:** `db.getDoc(db.collections.designations, '<non-existent-id>')` is `undefined`
- **Priority:** P0 · **Gaps:** none (`data-testid="work-designation-not-found"`, `data-testid="designation-not-found-heading"`, `data-testid="designation-not-found-icon"` present)

## Testability gaps (summary)

- **Zero `data-testid`s exist on `/work/:id`** — the four app-wide ids (`territories-heading`, `territories-list`,
  `territories-city-filter`, `territory-list-item`) all belong to `/territories`. Every affordance here (checkbox, dialog fields, submit/cancel buttons, pencil/eraser/maps/history icons, the confirm dialog) must be selected by pt-BR text, `title` attributes, or the handful of stable ids (`#revisit-checkbox`,
  `#publisher-name`, `#congregation-address`).
- **Confirmed defects to lock in as today's behaviour, not tomorrow's fix:**
  - UC-WORK-03 — a URL-encoded slash in the id throws synchronously before any subscription.
  - UC-WORK-04 — an embedded territory without `history` (the factory default, and the default baseline
    `seed-designation` itself) crashes the read pipeline and hangs on `Loading...` forever.
  - UC-WORK-19 — Chromium's `window.open(link, '_self')` branch means `page.waitForEvent('popup')` never fires on the default Playwright project; use `waitForURL` or stub `window.open` instead.
  - UC-WORK-21 — `shouldDesignationBlockAfterExpired: false` does **not** restore the checkbox/edit/undo controls after expiry; only the maps button responds to that setting.
  - UC-WORK-23 — completing a visit for a territory whose designation-embedded `history` doesn't carry its pre-existing visits overwrites `recentHistory` down to just the new entry, discarding older ones that are still present in the real subcollection.
- **Harness gaps:** `signInAs` only covers `'admin'`/`'publisher'` (both behave identically here per UC-WORK-06, so no extension is strictly required for this feature); there is no seed helper to directly mutate an already-written territory mid-test (UC-WORK-05 needs a raw `db.firestore` write, not a
  `seed.write` call, since `seed.write` only ever adds to the pre-test baseline).
- **Native/browser obstacles:** the maps affordance's behaviour is Playwright-project-dependent (see UC-WORK-19); the complete/edit dialog has `disableClose = true`, so `Escape`/backdrop-click tests must not be written expecting a close.

## Sources

- `apps/ministry-maps/src/app/features/work/pages/work-page/work-page.component.ts`
- `apps/ministry-maps/src/app/features/work/pages/work-page/work-page.component.html`
- `apps/ministry-maps/src/app/features/work/components/work-item/work-item.component.ts`
- `apps/ministry-maps/src/app/features/work/components/work-item-complete-dialog/work-item-complete-dialog.component.ts`
- `apps/ministry-maps/src/app/features/work/bo/work.bo.ts`
- `apps/ministry-maps/src/app/features/work/work-routes.module.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-designation-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-territory-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/designation.repository.ts`, `territories.repository.ts`
- `apps/ministry-maps/src/app/shared/components/dialogs/history-dialog/history-dialog.component.ts`
- `apps/ministry-maps/src/app/shared/utils/open-google-maps.ts`, `user-agent.ts`, `territory-icon-mapper.ts`
- `apps/ministry-maps/src/app/shared/utils/firebase-entity-converter.ts`
- `apps/ministry-maps/src/app/app-routes.ts` (route mount `work` → `FeatureRoutesEnum.WORK`, `data.roles: ['*']`)
- `apps/ministry-maps/src/models/designation.ts`, `territory.ts`, `territory-visit-history.ts`,
  `firebase/firebase-designation-territory-model.ts`, `enums/visit-outcome.ts`, `enums/designation-status.ts`
- `apps/ministry-maps/e2e/seed/default.seed.ts`, `e2e/seed/seeder.ts`, `e2e/seed/factories/designation.factory.ts`
- `apps/ministry-maps/e2e/fixtures/database.fixture.ts`, `e2e/fixtures/auth.fixture.ts`, `e2e/fixtures/index.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`,
  `docs/domain/glossary.md`, `docs/features/territories-management.md`

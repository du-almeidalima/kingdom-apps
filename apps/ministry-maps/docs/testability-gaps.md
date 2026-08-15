# Testability gaps — what stands between this catalog and green specs

Everything that must be **added to the app** (selectors, hooks), **worked around in Playwright**
(native dialogs, `window.open`, downloads, the OAuth popup), or **accepted as current behaviour**
(suspected defects a spec must lock in rather than "fix"). Per-screen detail lives in each feature doc's own *Testability gaps (summary)* section; this file is the consolidated view.

---

## 1. Missing `data-testid` inventory

Only **four** `data-testid` attributes exist in the entire app, all on `/territories`:

| testid                    | Element                        | Used by           |
|---------------------------|--------------------------------|-------------------|
| `territories-heading`     | `/territories` heading         | `TerritoriesPage` |
| `territories-list`        | `/territories` list container  | `TerritoriesPage` |
| `territories-city-filter` | `/territories` city `<select>` | `TerritoriesPage` |
| `territory-list-item`     | one territory row              | `TerritoriesPage` |

Every other screen needs selectors. Until testids land, specs rely on **verbatim pt-BR text**
(`getByRole('button', { name: 'Concluir' })`), the handful of stable ids/`title`s catalogued in
[`domain/glossary.md §6`](./domain/glossary.md#6-writing-selectors-against-pt-br-text)
(`#profile-link`, `#revisit-checkbox`, `#publisher-name`, `#congregation-address`,
`title="Adicionar Território"`, `title="Enviar Designação"`, `title="Criar Link de Convite"`,
`title="Meu Perfil"`, `title="Apagar Visita"`), and component tag names (`kingdom-apps-territory-checkbox`, `kingdom-apps-work-item`, `kingdom-apps-icon-radio`, `lib-note`).

Recommended additions, in priority order (add them **in a separate change** from any spec, per
[`README.md` §How to use](./README.md#how-to-use-this-artifact-e2e-authoring-workflow)):

| Screen                    | Elements that need testids                                                                                                                                                                                 | Unblocks                     |
|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| `/work/:id`               | work-item checkbox, pencil/eraser/maps/history buttons, complete-visit dialog (radios, submit, cancel, error message), info note, `Concluídos` section                                                     | UC-WORK-01…23, J-01/02/04/06 |
| `/territories/assign`     | city `<select>`, checkbox row, submit FAB, search input, sort/filter toggles                                                                                                                               | UC-ASSIGN-01…24, J-01, J-08  |
| `/territories/statistics` | city `<select>`, period `<select>`, each metric tile (`Territórios`, `Pessoas`, `Estudos bíblicos`, `Mudaram`, `Visitas`, `Revisitas`)                                                                     | UC-STAT-01…19, J-02/04/07/08 |
| `/users`                  | list rows, row overflow trigger + items, invite FAB, edit dialog (name input, role radios, `Salvar`), invite dialog (email input, radios, `Criar Link`), copy-link view (link text, copy button, `Enviar`) | UC-USERS-01…17, J-03         |
| `/territories` dialogs    | manage dialog fields (`Endereço`, `Cidade`, `Ícone`, `Quantidade de pessoas`, `Link do Maps`, `Estudando a Bíblia`, `Instrutor`), alert-resolution radios, overflow menu trigger + `Exportar Territórios`  | UC-TERR-09…34, J-01          |
| `/configuration`          | city rows, `Edit`/`Delete`/`+ Add City`/`Save Changes`, toast                                                                                                                                              | UC-CFG-01…13, J-05           |
| auth screens              | login/sign-in provider button, error paragraph, `/welcome` heading, `/no-account` container                                                                                                                | UC-AUTH-01…23, J-03          |
| `/profile`                | identity card fields, congregation `<select>`, `SAIR` button                                                                                                                                               | UC-PROF-01…10                |
| `/home` + header          | cards/links, headings of target pages                                                                                                                                                                      | UC-NAV-05…14                 |

---

## 2. Native / browser-level obstacles and their Playwright techniques

### 2.1 OAuth popup (`signInWithPopup`) — the big one

Both `/login` and `/sign-in/:inviteId` authenticate through a real Google OAuth popup. **No spec may click `Entrar com uma conta do Google` today** — use `signInAs` (custom token) for every signed-in state, and treat the popup-dependent entries (UC-AUTH-04/05/06/07, UC-AUTH-17/18/19/20, J-03 legs 7 & 12) as **manual acceptance checks** with fully documented expected persistence.

*Future upgrade path (not adopted):* the Auth emulator serves a fake-provider page inside that popup, so
`page.waitForEvent('popup')` + filling the emulator's own account form could automate the legs end-to-end. Adopting it is a suite-level decision (fragility vs coverage); the manual legs are written to translate 1:1 if it ever happens.

### 2.2 Native `confirm()` — `/configuration` city delete

`UC-CFG-10` calls `window.confirm('Are you sure you want to delete this city?')`. A locator can never see it, and an unhandled native dialog **hangs the test**. Register the handler **before** the click:

```ts
page.once('dialog', dialog => dialog.accept());   // or .dismiss() for the cancel path
await page.getByRole('button', { name: 'Delete' }).first().click();
```

### 2.3 `window.open` — maps and WhatsApp shares

Three call sites, three different traps:

| Flow                                       | Call                                                                                              | Trap                                                                                                                                        | Technique                                                                                                                                                                                                                                                       |
|--------------------------------------------|---------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/work/:id` maps button (UC-WORK-19)       | `window.open(link, '_self')` **on Chromium** (`_blank` on Firefox/Safari, `intent://` on Samsung) | `page.waitForEvent('popup')` **never fires** on the default Chromium project — the same tab navigates away from the app                     | Prefer a stub: `page.addInitScript(() => { (window as any).__opened = []; window.open = (u) => { (window as any).__opened.push(u); return null; }; })`, then assert the recorded URL. Alternative: `page.waitForURL`. Never `waitForEvent('popup')` on Chromium |
| `/territories/assign` share (UC-ASSIGN-19) | `window.open('whatsapp://send?text=' + url)` on desktop; `window.location.href = …` on mobile UA  | custom protocol — headless Chromium surfaces a `popup` event with the attempted URL but no real navigation; mobile path has no popup at all | `const popup = await page.waitForEvent('popup')` → read `popup.url()` and decode `text=`; for the mobile UA path intercept the navigation instead                                                                                                               |
| `/users` invite `Enviar` (UC-USERS-14)     | same `whatsapp://` builder                                                                        | same as above, plus `waitForEvent('popup')` is unreliable for custom protocols                                                              | the `window.open` stub from row 1 is the robust option here                                                                                                                                                                                                     |

### 2.4 CSV download — `/territories` export (UC-TERR-34, J-08)

```ts
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByText('Exportar Territórios').click(),
]);
const stream = await download.createReadStream();  // or download.path()
```

Assert: suggested filename `mm-territorios-<ISO-`-`timestamp>.csv`; content starts with the UTF-8 **BOM**
(`\uFEFF`); header `Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da
Bíblia;Última Visita`; `;` delimiter; `dd/MM/yyyy` dates; rows sorted by city.

### 2.5 Clipboard — invite copy button (UC-USERS-13)

```ts
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
// …click the copy icon…
const text = await page.evaluate(() => navigator.clipboard.readText());
```

(Designation sharing has **no** clipboard affordance at all — UC-ASSIGN-20.)

### 2.6 CDK drag-and-drop — `/territories` reorder (UC-TERR-21)

Playwright's `dragTo()` and HTML5 drag events do **not** drive Angular CDK drag-drop. Use the low-level mouse API: `hover()` the handle → `mouse.down()` → several `mouse.move()` steps (CDK needs intermediate moves) → `mouse.up()`.

### 2.7 Timing-sensitive states (assert mechanisms, not transient pixels)

- `isAuthenticating` full-viewport `.spinner` (UC-AUTH-23 / UC-NAV-04) and the statistics `lib-spinner`
  (UC-STAT-14) may be too fast to catch against the emulator — synchronize on **settled** states (final URL/heading), never on catching the spinner.
- Fire-and-forget writes ([`domain/data-model.md §4.2.1`](./domain/data-model.md#421-the-visit-write-back-is-fire-and-forget)):
  wrap persistence assertions in `expect.poll`/`toPass` after `/work/:id` completions, invite consumption, and alert resolutions.
- `expiresAt` assertions need a few-seconds tolerance (UC-ASSIGN-13); `Timestamp` comparisons go through
  `.toDate()`/`.toMillis()`, never `toEqual(new Date())`.

---

## 3. Documented current behaviour vs suspected defects

Tests must **lock in reality**. Every entry below is what the code does today, where it is documented, and the assertion to make **now**. Fixing any of them is a product decision that must also update the linked entries (and, per `README.md`, never renumber their IDs).

| #  | Item                                                      | Documented at                                            | Current reality → assertion to make today                                                                                                                                                 | Suspected intent                                  |
|----|-----------------------------------------------------------|----------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| 1  | Alert badges gated by `note`                              | UC-TERR-27, data-model §4.4                              | Territory with qualifying alert data but `note: ''` renders **no** badges → assert absence                                                                                                | Badges should render regardless of `note`         |
| 2  | Empty `cities` ternary                                    | UC-TERR-04, UC-ASSIGN-04                                 | `cities.length >= 0 ? cities[0] : ALL` assigns `undefined`; the filter observable errors and the **whole** page content fails to render (empty router outlet) → assert heading/select/list all absent                                                        | `length > 0` fallback to `Todas`                  |
| 3  | Active-filter badge baseline                              | UC-TERR-12                                               | Fresh load already shows badge `1` (counts the default-on toggle) → assert `1`                                                                                                            | Baseline should be the config default (`0`)       |
| 4  | Instructor field reset                                    | UC-TERR-16                                               | Re-ticking `Estudando a Bíblia` **wipes** a typed instructor → assert the field is empty after re-tick                                                                                    | Reset on the *false* transition                   |
| 5  | Orphaned history on delete                                | UC-TERR-20                                               | Deleting a territory leaves `territories/{id}/history` docs behind → assert the subcollection **survives**                                                                                | Cascade or explicit cleanup                       |
| 6  | History dialog unordered                                  | UC-TERR-28                                               | `getTerritoryVisitHistory` has no `orderBy`/`limit`; rows reversed client-side → assert set, not order                                                                                    | Chronological order, maybe capped                 |
| 7  | Alert resolution truncates `recentHistory`                | UC-TERR-31, data-model §4.1                              | Resolving `Revisita`/`Não Visitar` rewrites `recentHistory` from a filtered subset, dropping unrelated entries → assert `recentHistory.length` shrinks                                    | Only the resolved entries should change           |
| 8  | No maps affordance on `/territories`                      | UC-TERR-33                                               | `mapsLink` is modelled and editable but never openable from this screen → assert no maps button exists                                                                                    | Consistency with assign/work rows                 |
| 9  | No selected-count on assign                               | UC-ASSIGN-12                                             | Only the FAB's binary enabled state signals selection → assert via post-submit array length, not DOM count                                                                                | A visible count                                   |
| 10 | Designation embedded `history` sliced from unordered read | UC-ASSIGN-16                                             | `getAllInIds` reads without `orderBy`; `.slice(-5)` of an arbitrary order → with 6+ visits the embedded 5 are **not guaranteed** newest                                                   | Slice the 5 most recent by date                   |
| 11 | Batching comment cites wrong limit                        | UC-ASSIGN-18                                             | Code batches `in`-queries at 10; Firestore's real cap is 30 → no behavioural assertion; document only                                                                                     | Comment accuracy                                  |
| 12 | Share link uses `location.origin`                         | UC-ASSIGN-19                                             | Designation share link is built from `location.origin`, invites from `environment.baseUrl` → assert the link contains `location.origin`                                                   | One canonical base-URL source                     |
| 13 | No clipboard affordance on assign                         | UC-ASSIGN-20                                             | Zero `navigator.clipboard` usage app-wide on this flow → assert absence; only WhatsApp deep link exists                                                                                   | A copy button                                     |
| 14 | Optimistic "assigned" marking survives failure            | UC-ASSIGN-21                                             | On a failed create, checkboxes stay checked-and-disabled with no error and no designation → assert DOM implies assigned while `designations` is unchanged (**blocked**: needs HX-4)       | Rollback + error surface                          |
| 15 | Encoded slash in `/work/:id`                              | UC-WORK-03                                               | `abc%2Fdef` decodes to an odd-segment doc path and throws synchronously → assert console error + blank page                                                                               | Try/catch + not-found UI                          |
| 16 | Missing `history` crashes work page                       | UC-WORK-04, data-model §4.2                              | Read converter runs `t.history.map` unguarded; page hangs on `Loading...` forever → assert the stuck `Loading...`                                                                         | `(t.history ?? []).map`                           |
| 17 | Maps button `_self` on Chromium                           | UC-WORK-19                                               | `window.open(link, '_self')` navigates the same tab → never wait for `popup` on Chromium                                                                                                  | `_blank` everywhere                               |
| 18 | Non-blocking expiry still disables                        | UC-WORK-21                                               | `shouldDesignationBlockAfterExpired: false` re-enables **only** the maps button; checkbox/edit/undo stay disabled → assert exactly that                                                   | The whole row should re-enable                    |
| 19 | Visit write-back overwrites `recentHistory`               | UC-WORK-23, data-model §4.2.1                            | Completing from a fresh designation rewrites parent `recentHistory` to only the designation-embedded entries + new one → assert the overwrite (`length === 1` in the documented scenario) | Merge with the real subcollection                 |
| 20 | `peopleQuantity: 0` counts as 1                           | UC-STAT-01                                               | A zero-people territory contributes `1` to `Pessoas` → assert `1`                                                                                                                         | Count `0`                                         |
| 21 | `Mudaram` reads only `recentHistory`                      | UC-STAT-03                                               | An unresolved `MOVED` older than the last 5 visits is invisible to the count → assert `0` despite subcollection presence                                                                  | Read the full subcollection                       |
| 22 | User-edit form always disabled                            | UC-USERS-05                                              | Every non-`APP_ADMIN` editor gets a disabled form, yet `Salvar` submits (a no-op write of unchanged data) → assert disabled + persisted doc unchanged                                     | Condition should include `ADMIN`/`SUPERINTENDENT` |
| 23 | Auth user survives user deletion                          | UC-USERS-09                                              | Deleting a user removes the Firestore doc but the `deleteUser` callable is never subscribed → assert `db.auth.getUser(uid)` still resolves                                                | Chain/subscribe the callable                      |
| 24 | Invite `email: ''` persisted                              | UC-USERS-11                                              | Leaving `Email (opcional)` blank writes `email: ''` (not absent) → assert the empty string                                                                                                | Omit the field                                    |
| 25 | Invite `congregation` shape drift                         | data-model §2.6                                          | Created as `DocumentReference`, overwritten as embedded object on consumption (`update` = full `setDoc`, no merge) → assert per-write-path shape                                          | One consistent shape                              |
| 26 | Invite `isValid` doc-comment inverted                     | UC-AUTH-16, data-model §2.6                              | Comment says "When used, this is set to true"; code sets `false` → trust `false === consumed`                                                                                             | Comment accuracy                                  |
| 27 | Congregation-switch error swallowed                       | UC-PROF-08                                               | Unauthorized switch throws inside the BO; UI shows nothing, `<select>` reverts → assert revert + no toast                                                                                 | Surface the error                                 |
| 28 | No-congregation guard is dead code                        | UC-PROF-07                                               | `EMPTY_CONGREGATION` backstop makes the `!user.congregation` branch unreachable from the UI → unit-level note only                                                                        | —                                                 |
| 29 | `roles: ['*']` guard early return                         | roles §3.1; UC-AUTH-13, UC-PROF-03, UC-CFG-12, UC-NAV-10 | `/profile` and `/configuration` render for anonymous visitors (placeholders/banner) → assert **no** redirect                                                                              | Require authentication                            |
| 30 | Cancelled navigation has no feedback                      | UC-NAV-08, UC-AUTH-09                                    | Guard `false` cancels navigation silently (empty outlet on deep link) → assert empty outlet + URL                                                                                         | Redirect to a forbidden page/toast                |
| 31 | Unenforced configuration gating                           | UC-CFG-13                                                | `EDIT_CONGREGATION_CONFIGURATION` is never wired to any `*libAuthorize`; a `PUBLISHER` can edit and **persist** city changes → assert the write succeeds                                  | Wire the directive                                |
| 32 | City delete orphans territories                           | UC-CFG-10                                                | Deleting a city removes it from `congregation.cities` but territories keep the stale name → assert the territory survives with its old `city`                                             | Migrate/block/delete territories                  |
| 33 | Stale user state after city save                          | UC-CFG-11                                                | `/territories` filter ignores a cities save until a **full reload** (no `setUser` call) → assert stale options, then reload                                                               | Refresh `UserStateService` on save                |
| 34 | Non-atomic cities save                                    | UC-CFG-08                                                | Congregation update + territory batch rename run in `forkJoin`, not one transaction → happy-path asserts both; failure window is HX-4-blocked                                             | Single atomic write                               |
| 35 | Swallowed invite-load failure                             | UC-AUTH-21                                               | Repo error → `catchError(EMPTY)`; page renders the normal card; clicking then wedges `loading` forever → blocked (HX-4); document only                                                    | Error state + retry                               |
| 36 | English copy on `/configuration`                          | UC-CFG-06/07 + feature-doc header                        | The only non-pt-BR screen (`Manage Congregation Cities`, toasts in English) → assert the English strings verbatim                                                                         | pt-BR localisation                                |
| 37 | Sign-in page copy typos                                   | UC-AUTH-14                                               | `Parar criar uma conta, clique no botão a baixo.` (*sic*) → assert verbatim, never "correct" it                                                                                           | `Para` / `abaixo`                                 |
| 38 | Provider-login-button constructor quirk                   | UC-AUTH-02                                               | Provider resolved in the constructor, pre-`@Input` — invisible today (only Google used) → no assertion needed                                                                             | Read the input reactively                         |
| 39 | `data.authGuardPipe` dead config                          | roles §2                                                 | `redirectUnauthorizedToLogin` sits in `data` unused; the custom guard does everything → no assertion                                                                                      | Remove or wire                                    |
| 40 | Dead `@default` error branch on sign-in                   | UC-AUTH-15                                               | `Um erro aconteceu ao tentar carregar seu convite.` is unreachable → never assert that string                                                                                             | Reachable fallback                                |
| 41 | Forced logout navigation does not complete               | UC-AUTH-22                                               | Auth state clears and `#profile-link` disappears, but the browser remains on `/home` and no `Login` heading renders → assert the cleared state and retained URL                                                                                 | Navigate to `/login` after auth-state loss         |
| 42 | Empty congregation hangs statistics loading              | UC-STAT-13                                              | `combineLatest([])` in `FirebaseTerritoryDatasourceService.getAllByCongregation({ getHistory: true })` never emits when the congregation has 0 territories; `filteredTerritories$` never resolves, `finalize` never flips `isLoading`, and the static/dynamic sections never render → assert the stuck `statistics-loading` + absent `statistics-static-section` | `combineLatest([])` → `of([])`, or guard the empty case |

---

## 4. Harness blockers (cross-reference)

The four harness extensions that gate catalogue rows — full definitions and affected entries in
[`test-catalog.md#harness-extensions-needed`](./test-catalog.md#harness-extensions-needed):

- **HX-1** extra `signInAs` roles (`elder`, `organizer`, `superintendent`, `app_admin`)
- **HX-2** `invitation_links` seed support (factory + `Collections` entry + seeder)
- **HX-3** second-congregation / arbitrary-uid identity
- **HX-4** fault-injection hook (entries stay blocked/documented without it)
- **HX-5** shared spec utilities (window.open stub, whatsapp decoder, CSV reader, confirm registrar, CDK drag sequence) — boilerplate avoidance, not blockers

## Sources

- every `docs/features/*.md` *Testability gaps (summary)* section (consolidated here)
- `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`, `docs/domain/glossary.md`
- `apps/ministry-maps/src/app/shared/utils/open-google-maps.ts`, `share-utils.ts`
- `libs/common-ui/src/lib/components/confirm-dialog/confirm-dialog.component.ts`

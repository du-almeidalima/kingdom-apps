# Users & invitations (`UC-USERS`)

This document describes the behavioural use cases for the `/users` ("Pessoas") screen: the congregation's
user list, the edit-user dialog, the delete-user confirmation, and invitation-link creation/sharing.

**Route:** `/users`
**Actors:** `ADMIN`, `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN` can reach the page (see
[`../domain/roles-and-permissions.md`](../domain/roles-and-permissions.md)); `PUBLISHER` is redirected to
`/welcome`; anonymous visitors are redirected to `/login`. Within the page, only `APP_ADMIN`,
`SUPERINTENDENT` and `ADMIN` see the per-row overflow menu (edit/delete); only `ADMIN` (+ `APP_ADMIN`
bypass) sees the "Criar Link de Convite" floating action button — see the *Role gating* group. Field/model
shapes referenced below are defined in [`../domain/data-model.md`](../domain/data-model.md); pt-BR ↔
English vocabulary is in [`../domain/glossary.md`](../domain/glossary.md).

The invite flow (creation → composed link → sign-in via `/sign-in/:inviteId` → consumption) spans two
feature areas; this document only covers the `/users`-side half (creation and sharing). Consumption of the
link and the resulting account creation belong to `UC-AUTH` (`features/auth-onboarding.md`) and are out of
scope here except where needed to explain what a created `invitation_links` doc means for a later test.

### Listing and congregation scope

#### UC-USERS-01 — List is scoped to the signed-in user's congregation and ordered by role priority
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline (8 users since WP-01: `seed-user-admin` `ADMIN`, `seed-user-publisher-1..3` `PUBLISHER`, plus `seed-user-elder` `ELDER`, `seed-user-organizer` `ORGANIZER`, `seed-user-superintendent` `SUPERINTENDENT`, `seed-user-app-admin` `APP_ADMIN`)
- **Steps:** 1. sign in as admin → 2. open `/users`
- **Expected UI:** all 8 baseline users render as `kingdom-apps-user-list-item` rows. `UsersPageComponent.sortUserFn` sorts by a fixed priority map — `APP_ADMIN`(1) → `SUPERINTENDENT`(2) → `ADMIN`(3) → `ELDER`(4) → `ORGANIZER`(5) → `PUBLISHER`(6), unknown role → 99 — and `Array.prototype.sort` is stable, so same-priority users keep whatever relative order the Firestore query returned. The baseline therefore renders in role-priority order: Daniel Ferreira (`APP_ADMIN`), Felipe Rodrigues (`SUPERINTENDENT`), Carlos Almeida (`ADMIN`), Marcos Oliveira (`ELDER`), Ricardo Santos (`ORGANIZER`), then the 3 `PUBLISHER`s (priority 6) — in practice (no explicit `orderBy` in `getAllByCongregation`) the emulator returns Ana Souza, Pedro Lima, Mariana Costa in ascending document-id order
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'`; `db.getCollectionDocs(db.collections.users)` has length `8`
- **Edge cases:** the tie-break order among same-role users is **not** a documented contract (no `orderBy` clause exists) — a test asserting the exact order of the 3 publishers is locking in incidental Firestore behaviour, not a guarantee; re-verify if the seeder or query changes
- **Priority:** P0 · **Gaps:** no `data-testid` on the list or its container; select rows by name text

#### UC-USERS-02 — Each row shows initials, name and the translated role badge
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/users` → 2. inspect the Carlos Almeida row
- **Expected UI:** the figure caption shows initials `CA` (`getUserInitials`: first letter of the first two space-separated name tokens — a single-word name instead yields its first two characters, e.g. `'Maria'` → `MA`; a missing/`undefined` name falls back to `XX`); the `<h2>` shows `Carlos Almeida`; the badge shows the `getTranslatedRole` label `Admin` with CSS class `user-item__privilege-badge--admin` (`role.toLowerCase()`)
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser)` has `name === 'Carlos Almeida'` and `role === 'ADMIN'`
- **Edge cases:** the badge class is derived from the raw enum value lower-cased, not from the pt-BR label — a role added to `RoleEnum` without a matching SCSS class (`user-item__privilege-badge--<value>`) renders text with no badge styling, not an error
- **Priority:** P1 · **Gaps:** no `data-testid` on the initials figure or badge; select via row text

#### UC-USERS-03 — A user from another congregation is never listed
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline; plus `buildCongregation()` (a second congregation) and `buildUser({ congregationId: <second congregation id>, role: 'ADMIN' })` in it
- **Steps:** 1. sign in as admin (of `seed-congregation`) → 2. open `/users`
- **Expected UI:** exactly the 8 baseline rows render; the foreign user never appears, regardless of its role
- **Expected persistence:** `db.getCollectionDocs(db.collections.users)` returns `9` total docs; a query built as `db.queryWhere(db.collections.users, 'congregation', '==', db.firestore.collection('congregations').doc(seed.ids.congregation))` returns exactly the `8` baseline users
- **Edge cases:** the scoping query (`getAllByCongregation`) compares `DocumentReference` equality only — it does not additionally filter by role, so even a foreign `APP_ADMIN` is excluded from this list (congregation scoping is unconditional)
- **Priority:** P0 · **Gaps:** none

### Edit-user dialog

#### UC-USERS-04 — Dialog fields and role options; `SUPERINTENDENT` is offered only to an `APP_ADMIN` editor
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as admin → 2. open `/users` → 3. row menu (`⋮`) on Ana Souza → `Editar`
- **Expected UI:** dialog title `Editar Usuário`; fields `Nome` (text input, prefilled `Ana Souza`) and `Permissão` (a `kingdom-apps-icon-radio` group, prefilled to the user's current role). As an `ADMIN` editor, exactly 4 options render, in this order: `Publicador` ("Permisão mais básica, apenas está associado a uma congregação."), `Organizador` ("Indicada para Publicadores qualificados ou Servos Ministeriais; Pode designar e atualizar territórios."), `Ancião` ("Tem todas as permissões de um Organizador, mas também pode adicionar/remover territórios e ver pessoas da congregação."), `Administrador` ("Permissões geralmente dada ao SS. Tem acesso total aos mapas da congregação além de poder adicionar, excluir e alterar permissões de usuários."); `Superintendente` is **not** rendered (`canEditAdminRoles = currentUser.role.includes('APP_ADMIN')` is `false` for an `ADMIN` editor). Footer: `Cancelar` / `Salvar` (spinner while submitting)
- **Expected persistence:** N/A — opening the dialog performs no write
- **Edge cases:** `canEditAdminRoles` is computed once in the constructor from a `String.prototype.includes` substring check on the editor's own role, not `===` — functionally equivalent to equality for today's `RoleEnum` values, but worth knowing if a future role value contains the substring `APP_ADMIN`
- **Priority:** P1 · **Gaps:** no `data-testid` on the radio group or its options; select via the `kingdom-apps-icon-radio` label text (`Publicador`/`Organizador`/`Ancião`/`Administrador`/`Superintendente`)

#### UC-USERS-05 — ⚠ suspected defect: the edit form is disabled for every editor except `APP_ADMIN`, yet "Salvar" still submits unchanged data
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as admin → 2. row menu on Ana Souza (`PUBLISHER`) → `Editar` → 3. try to type in `Nome` and click a different `Permissão` radio → 4. click `Salvar` anyway
- **Expected UI:** both the `Nome` input and every `Permissão` radio are disabled/non-interactive — typing and clicking have no visible effect. The `Salvar` `<button>` itself is **not** disabled (disabling a `FormGroup` does not disable a plain submit button outside its controls), so clicking it still fires `(ngSubmit)` and the dialog closes as if the save succeeded
- **Expected persistence:** `handleFormSubmit` reads `form.getRawValue()` (which bypasses the `disabled` state and returns the original prefilled values) and calls `userRepository.update(...)` with those **unchanged** values, so `db.getDoc(db.collections.users, seed.ids.publisherUsers[0])` is byte-for-byte identical to before the dialog was opened — but a Firestore `setDoc` round-trip did occur (a client-visible no-op write, not a blocked one)
- **Edge cases:** root cause — the guard is `if ((data.user.role === RoleEnum.SUPERINTENDENT || RoleEnum.ADMIN || RoleEnum.APP_ADMIN) && currentUser.role !== RoleEnum.APP_ADMIN)`. `RoleEnum.ADMIN` and `RoleEnum.APP_ADMIN` are non-empty string constants, so the `||` chain is **always truthy** regardless of `data.user.role` — the whole condition collapses to `currentUser.role !== RoleEnum.APP_ADMIN`. This means the target user's role is irrelevant: editing a `PUBLISHER`, an `ELDER`, or another `ADMIN` all disable the form identically, for **any** editor who is not `APP_ADMIN`
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` — the intended condition was almost certainly `(data.user.role === SUPERINTENDENT || data.user.role === ADMIN || data.user.role === APP_ADMIN)`; **assert today's reality**: form disabled, persisted doc unchanged after `Salvar`, for any `ADMIN`/`ELDER`/`SUPERINTENDENT` editor

#### UC-USERS-06 — An `APP_ADMIN` editor gets a usable form and edits persist
- **Actor:** App Admin (harness extension needed — only `admin`/`publisher` exist in `signInAs` today)
- **Route:** `/users`
- **Preconditions (seed):** default baseline; an extra seeded user with `role: 'APP_ADMIN'`
- **Steps:** 1. sign in as that `APP_ADMIN` user → 2. row menu on Ana Souza → `Editar` → 3. change `Nome` to `Ana Souza Silva`, select `Ancião` → 4. `Salvar`
- **Expected UI:** both fields are interactive (form not disabled); the `Superintendente` option is also visible (per UC-USERS-04's gate); dialog closes on save; the list re-renders immediately (live `collectionData`) showing the new name and the `Ancião` badge, and the row moves up (priority 4, above the two remaining publishers)
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.publisherUsers[0])` has `name === 'Ana Souza Silva'` and `role === 'ELDER'`
- **Edge cases:** `handleFormSubmit` spreads onto `structuredClone(data.user)`, so only `name`/`role` change — the user's `congregation` reference and `id`/`email` are resent unchanged on every save
- **Priority:** P1 · **Gaps:** `signInAs('appAdmin')` harness extension needed (no seeded `APP_ADMIN` uid in `ROLE_UIDS` today)

#### UC-USERS-07 — Editing your own account is not special-cased
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as admin → 2. row menu on **Carlos Almeida** (the signed-in admin's own row) → `Editar`
- **Expected UI:** the dialog opens exactly as for any other user — there is no `data.user.id === currentUser.id` check anywhere in `UsersEditDialogComponent`. Because the editor's role is `ADMIN` (not `APP_ADMIN`), the form is disabled per UC-USERS-05's bug even though the admin is editing themselves; there is no "you are editing your own account" warning or confirmation of any kind
- **Expected persistence:** clicking `Salvar` re-persists the unchanged doc, same mechanics as UC-USERS-05; `db.getDoc(db.collections.users, seed.ids.adminUser)` is unchanged
- **Edge cases:** the overflow menu that opens this dialog (`*libAuthorize="[APP_ADMIN, SUPERINTENDENT, ADMIN]"`) is gated on the **viewer's** role, not the row's user, so an admin always sees the menu on their own row too; an `APP_ADMIN` editing themselves via this same path (no bug for them, per UC-USERS-06) could demote their own role with zero guardrail
- **Priority:** P2 · **Gaps:** none beyond UC-USERS-04/05's selectors

### Delete user

#### UC-USERS-08 — Delete confirmation dialog and Firestore doc removal
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline (`seed-user-publisher-1`, Ana Souza)
- **Steps:** 1. sign in as admin → 2. open `/users` → 3. row menu on Ana Souza → `Apagar` → 4. observe the confirmation dialog → 5. `Confirmar`
- **Expected UI:** dialog title `Apagar Usuário`; body exactly `Você realmente deseja apagar esse Usuário?` then `Essa ação não poderá ser desfeita.`; footer buttons `Cancelar` / `Confirmar`; after confirming, the row disappears from the list immediately (live `collectionData` listener, no reload needed)
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.publisherUsers[0])` is `undefined`
- **Edge cases:** clicking `Cancelar` closes the dialog with no request sent — `userRepository.delete` is never called and the row remains
- **Priority:** P0 · **Gaps:** no `data-testid` on the confirm dialog, the row menu trigger, or the menu items; select via role/text

#### UC-USERS-09 — ⚠ suspected defect: deleting a user removes the Firestore doc but the Auth account survives
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline (`seed-user-publisher-1`, Ana Souza — every seeded user also has an Auth emulator account, password `test-password-123`)
- **Steps:** 1–5. same as UC-USERS-08 (delete Ana Souza and confirm)
- **Expected UI:** same as UC-USERS-08 — the row disappears
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.publisherUsers[0])` is `undefined` (Firestore doc gone), **but** `db.auth.getUser(seed.ids.publisherUsers[0])` still **resolves successfully** (does not throw `auth/user-not-found`) — the Firebase Auth account for that uid is still present
- **Edge cases:** root cause — `FirebaseUserDatasourceService.delete` calls `this.deleteUserFn(userId)` (an `httpsCallableData` `Observable`) inside a bare `try { ... } catch`, but **never subscribes to it**. An Angular Fire callable `Observable` only invokes the underlying HTTPS request on subscription, so the Cloud Function that should delete the Auth account is never actually called; only the eagerly-created `deleteDoc(...)` promise resolves. The now-doc-less Auth account remains fully usable (same email/password) — a subsequent sign-in attempt with it would be treated as "no account" per the data model's identity contract, since there is no `users/{uid}` doc to resolve, but the credential itself is not revoked
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` — `deleteUserFn(userId)` must be subscribed to (or chained via `switchMap`) for the Cloud Function to run; **assert today's reality**: `db.auth.getUser(uid)` resolves without throwing after the delete flow completes — do not assert the Auth account is removed

### Invitation-link creation

#### UC-USERS-10 — "Criar Link de Convite" is an `ADMIN`-only floating action button
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as admin → 2. open `/users` → 3. observe the floating action button
- **Expected UI:** a green FAB with `title="Criar Link de Convite"` and a plus icon renders, gated by `*libAuthorize="CREATE_INVITE_LINK_ALLOWED"` where `CREATE_INVITE_LINK_ALLOWED = [RoleEnum.ADMIN]`; clicking it opens the invite-create dialog (UC-USERS-11)
- **Expected persistence:** N/A (UI-only gate); `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'`
- **Edge cases:** `APP_ADMIN` also sees the FAB via the directive's universal role bypass even though it is not in the listed array; `SUPERINTENDENT`, `ELDER`, `ORGANIZER` never see it (see UC-USERS-15)
- **Priority:** P0 · **Gaps:** the button carries no visible text, only an icon and a `title` attribute — select it with `page.getByTitle('Criar Link de Convite')`; no `data-testid`

#### UC-USERS-11 — Invite dialog defaults to `ORGANIZER`, email is optional, and the persisted doc's `congregation` is a `DocumentReference`
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as admin → 2. click the FAB → 3. observe the role radios and default selection → 4. optionally type an email into `Email (opcional)` → 5. click `Criar Link`
- **Expected UI:** dialog title `Criar Link de Convite`; `Email (opcional)` input with helper text `Para criar um link que só possa ser usado com esse email.`; `Permissão` radio group offering only **`Publicador`, `Organizador`, `Ancião`** (no `Administrador`/`Superintendente`/`App Admin.` options here, unlike the edit dialog), with `Organizador` pre-selected (`role: formBuilder.control(RoleEnum.ORGANIZER, { nonNullable: true })`); submit button `Criar Link` (spinner while submitting); on success the dialog swaps to the copy-link view (UC-USERS-13)
- **Expected persistence:** a new doc is created (raw path, since `invitation_links` is not in `db.collections`): `db.firestore.collection('invitation_links')` gains one doc with `createdAt` (a `Timestamp`, now), `createdBy` equal to the admin's **email** (`carlos.almeida@example.com` — `createdBy: currentUser.email`, not the uid), `role: 'ORGANIZER'` (or whichever selected), `isValid: true`, and `congregation` written as a **Firestore `DocumentReference`** pointing at `congregations/{seed.ids.congregation}` — `FirebaseInvitationLinkDataSourceService.add` re-wraps the already-hydrated `Congregation` object back into a reference via `createDocumentRef(...)` immediately before `setDoc`. Assert `(await db.firestore.collection('invitation_links').doc(id).get()).data()!['congregation'].id === seed.ids.congregation` (a reference, not a plain embedded object with `.name`/`.cities`)
- **Edge cases:** leaving `Email (opcional)` blank submits `email: ''` (an **empty string**, not omitted) — the form control defaults to `''`, and `InviteBO`'s `email ?? undefined` only substitutes on `null`/`undefined`, so an empty string survives into the persisted doc as `email: ''`, not as a missing field; this contradicts a reader's expectation that "optional" means the field is absent when unset
- **Priority:** P0 · **Gaps:** `invitation_links` harness extension needed — no `Collections` entry, no `buildInvitationLink` factory (raw `db.firestore.collection('invitation_links')` is the workaround today); this also means the `congregation`-as-reference finding above should be reconciled with `data-model.md §2.6`, which currently describes it as an "embedded object, not a reference" — that description matches the **hydrated, in-memory** `InvitationLink` type but not the raw persisted document; no `data-testid` on the role radios or email input

#### UC-USERS-12 — Invite creation with no congregation is effectively unreachable via the UI; the guard only fires when the whole user is `null`
- **Actor:** Admin (hypothetical — see Edge cases)
- **Route:** `/users`
- **Preconditions (seed):** none reproducible through normal seed + UI flow
- **Steps:** none — this state cannot be reached by signing in and navigating, because by the time `/users` renders and the FAB is visible, `UserStateService.currentUser` is always a fully resolved, non-null `User`
- **Expected UI:** N/A
- **Expected persistence:** N/A
- **Edge cases:** `InviteBO.createInviteLink` guards with `if (!this.userState.currentUser?.congregation) { ...; return EMPTY; }`. This only evaluates truthy when `currentUser` itself is `null`/`undefined` — a merely-**empty** congregation is not enough: `FirebaseUserDatasourceService.resolveUser` always backstops a user doc with a missing `congregation` field by substituting a **truthy** `EMPTY_CONGREGATION` object (`{ id: '', name: '', cities: [], ... }`), so a real signed-in user whose Firestore doc lacks a congregation still passes this guard and proceeds to call `add()` with `congregation.id === ''` — which would call `createDocumentRef('')` and likely throw (Firestore document ids must be non-empty), an unhandled case distinct from the "no doc written, logged error" premise. The only way the documented `EMPTY`+log branch is actually exercised is `currentUser === null`, which the existing unit test `invite.bo.spec.ts` ("should return EMPTY when user has no congregation") reproduces via `userState.setUser(null)` — i.e. it tests "no user", not "user with no congregation". Reaching `currentUser === null` while the invite dialog is open is not possible through normal navigation (the `authGuard` and `*libAuthorize` both require a resolved user with an `ADMIN` role before the FAB even renders)
- **Priority:** P2 · **Gaps:** this scenario is **unit-test-only** today (`invite.bo.spec.ts`); do not attempt to automate it as an E2E spec without a harness extension that can force `UserStateService.currentUser` to `null` (or seed a dangling `congregation` reference to exercise the `createDocumentRef('')` edge case instead, which is E2E-reachable but needs a new seeded identity)

### Invitation-link sharing

#### UC-USERS-13 — The generated link is `${environment.baseUrl}sign-in/{id}` and is copyable to the clipboard
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline; continues right after UC-USERS-11's successful submit
- **Steps:** 1. after `Criar Link` succeeds → 2. observe the copy-link screen → 3. click the copy icon button
- **Expected UI:** the dialog view swaps to `kingdom-apps-invite-create-dialog-copy-link` (same dialog `title` `Criar Link de Convite`); heading `Link de convite criado`; paragraph `Compartilhe esse link com o irmão que vai acessar o aplicativo.`; a `lib-copy-text-block` shows the composed link `${environment.baseUrl}sign-in/{newDocId}` with help text `Esse link só pode ser usado uma vez.`; clicking the copy button calls Angular CDK `Clipboard.copy()` and swaps the icon to a checkmark for 2 seconds; footer buttons `Fechar` / `Enviar` (paper-plane icon, UC-USERS-14)
- **Expected persistence:** same created doc as UC-USERS-11; additionally read back the just-created doc's id (e.g. `db.queryWhere` is not available for `invitation_links` — query `db.firestore.collection('invitation_links').where('createdBy','==','carlos.almeida@example.com').orderBy('createdAt','desc').limit(1)`) and assert the on-screen text equals the harness's own `${baseUrl}sign-in/{thatId}`
- **Edge cases:** Playwright must grant clipboard permissions before asserting the copy (`context.grantPermissions(['clipboard-read', 'clipboard-write'])`), then read back with `page.evaluate(() => navigator.clipboard.readText())`; clicking the copy button again while the checkmark is showing (`isTextCopied()` is `true`) is a no-op — `handleCopyClick` returns immediately, so it does not re-flash or re-copy
- **Priority:** P1 · **Gaps:** no `data-testid` on the copy button, the link text, or the help text; the exact `environment.baseUrl` used by the app under test must come from the harness's own config, not be hardcoded in the spec

#### UC-USERS-14 — "Enviar" builds a `whatsapp://` link; desktop opens a new window, mobile navigates in place
- **Actor:** Admin
- **Route:** `/users`
- **Preconditions (seed):** default baseline; continues right after UC-USERS-13
- **Steps:** 1. on the copy-link screen, click `Enviar`
- **Expected UI:** `handleSendInvitationLink` builds the message `Por favor, acesse o link abaixo e conecte com sua conta Google para acessar o MM.%0a%0a{link}` and passes it to `createSendWhatsAppLink`, producing `whatsapp://send?text=...` (a custom, non-`http(s)` protocol URL, and only the two `%0a` newlines are encoded — accented pt-BR characters and the link itself are left raw). `isMobileDevice()` tests the `User-Agent` against `/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i`: on a **desktop** UA it calls `window.open(builtUrl)`; on a **mobile** UA it instead sets `window.location.href = builtUrl` (a same-tab navigation, not a new window)
- **Expected persistence:** N/A — purely a client-side share action; assert the invite doc from UC-USERS-11 is untouched (`isValid` still `true`, no `usedAt`/`usedBy`)
- **Edge cases:** because `whatsapp://` is a custom protocol, most environments without a registered handler will not actually open a new page/tab, so `page.waitForEvent('popup')` is **unreliable** here — stub `window.open` instead (`page.addInitScript` to replace `window.open` with a recorder before clicking `Enviar`, then assert the captured URL string) for the desktop path; for the mobile path (`test.use({ userAgent: '...iPhone...' })`), intercept the navigation instead (e.g. `page.route('whatsapp://**', ...)` or listen for `page.on('framenavigated')`), since no popup is created at all
- **Priority:** P2 · **Gaps:** no `data-testid` on the `Enviar` button (select by role/name `Enviar`); document the `window.open`-stub technique in the harness before writing this spec, since the standard popup-waiting pattern will not work

### Role gating

#### UC-USERS-15 — `ORGANIZER`/`ELDER` see the list but not the edit/delete menu or the invite FAB
- **Actor:** Organizer (harness extension needed — only `admin`/`publisher` exist in `signInAs` today)
- **Route:** `/users`
- **Preconditions (seed):** default baseline; an extra user with `role: 'ORGANIZER'` in `seed-congregation`
- **Steps:** 1. sign in as that user → 2. open `/users`
- **Expected UI:** the page and its rows render normally — `ORGANIZER` is included in the route's allowed roles (`USERS_ALLOWED_ROLES = [ORGANIZER, ADMIN, ELDER, SUPERINTENDENT]`). However every row's `⋮` overflow trigger (`*libAuthorize="[APP_ADMIN, SUPERINTENDENT, ADMIN]"`) is absent, so `Editar`/`Apagar` are unreachable from any row (including the organizer's own); the `Criar Link de Convite` FAB (`[ADMIN]`) is also absent
- **Expected persistence:** `db.getDoc(db.collections.users, thatUid).role === 'ORGANIZER'`
- **Edge cases:** `ELDER` gets the identical reduced UI on this screen — unlike `/territories`, where `ELDER` can edit but `ORGANIZER` cannot (see [`../domain/roles-and-permissions.md §4`](../domain/roles-and-permissions.md#4-in-template-authorization---libauthorize)), `/users`' overflow menu excludes both `ELDER` and `ORGANIZER` equally; `SUPERINTENDENT` sits in between — it gets the overflow menu (edit/delete) but **not** the invite FAB, since `CREATE_INVITE_LINK_ALLOWED` is `[ADMIN]` only
- **Priority:** P1 · **Gaps:** `signInAs('organizer')`/`signInAs('elder')` harness extension needed

#### UC-USERS-16 — Publisher is redirected to `/welcome`
- **Actor:** Publisher
- **Route:** `/users`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as publisher → 2. `page.goto('/users')`
- **Expected UI:** the URL becomes `/welcome` (`authGuard` step 2a: `role === PUBLISHER && path !== 'welcome'`)
- **Expected persistence:** N/A (guard-only, no write); assert `db.getCollectionDocs(db.collections.users)` is unchanged (still `8` baseline docs) to prove no side effect
- **Edge cases:** this is the same redirect target as every other guarded admin route (`/territories`, `/home`) — publishers are locked out of `/users` uniformly
- **Priority:** P0 · **Gaps:** none

#### UC-USERS-17 — Anonymous access redirects to `/login`
- **Actor:** Anonymous
- **Route:** `/users`
- **Preconditions (seed):** none required
- **Steps:** 1. `page.goto('/users')` without signing in
- **Expected UI:** the URL becomes `/login`
- **Expected persistence:** N/A (auth guard, no Firestore write); assert `db.getCollectionDocs(db.collections.users)` is unchanged
- **Edge cases:** contrast with `/profile`/`/configuration`, which use `roles: ['*']` and do **not** redirect anonymous visitors (see [`../domain/roles-and-permissions.md §3.1`](../domain/roles-and-permissions.md#31--suspected-defect--roles--short-circuits-the-login-check)) — `/users` redirects because its `data.roles` is a concrete list, not `['*']`
- **Priority:** P0 · **Gaps:** none

## Testability gaps (summary)

- Zero `data-testid`s exist anywhere on `/users` — the list, list-item menu, edit dialog, invite dialog and
  copy-link screen must all be selected by pt-BR text, role, or `title` attribute.
- `invitation_links` is not in `db.collections` and has no `buildInvitationLink` factory — every assertion
  against it today must use the raw `db.firestore.collection('invitation_links')` escape hatch
  (UC-USERS-11, UC-USERS-13).
- `signInAs` only supports `'admin'`/`'publisher'` — every `APP_ADMIN`, `SUPERINTENDENT`, `ELDER`,
  `ORGANIZER` scenario in this document (UC-USERS-06, UC-USERS-15) needs a new seeded uid and a
  `ROLE_UIDS`/`TestRole` entry before it can be automated.
- Documented current-behaviour-vs-defect items: UC-USERS-05 (edit form disabled for every non-`APP_ADMIN`
  editor regardless of the target's role, because of an always-truthy `||` chain; "Salvar" still submits
  unchanged data), UC-USERS-09 (deleting a user removes the Firestore doc but leaves the Auth account
  intact, because the `deleteUser` callable `Observable` is never subscribed).
- Documentation inconsistency found while verifying: `InvitationLink.congregation` is declared as an
  embedded `Congregation` object and described that way in
  [`../domain/data-model.md`](../domain/data-model.md#26-invitationlink--srcmodelsinvitation-linkts) §2.6,
  but `FirebaseInvitationLinkDataSourceService.add` re-wraps it into a Firestore `DocumentReference`
  immediately before `setDoc` — the raw persisted document stores a reference, matching the `users`
  collection's linking style, not an embedded object (UC-USERS-11). That existing doc was not modified as
  part of this catalog; reconcile it in a follow-up pass.
- UC-USERS-12 ("no congregation" invite creation) is unit-test-only today (`invite.bo.spec.ts`) — the
  guard only fires when the whole `currentUser` is `null`, a state that is not reachable via black-box
  navigation once the invite FAB is visible; do not write an E2E spec for it without first adding a harness
  hook to force that state (or seed a dangling congregation reference to exercise the related, E2E-reachable
  `createDocumentRef('')` edge case instead).
- WhatsApp share (UC-USERS-14) opens a custom `whatsapp://` URL via `window.open` on desktop —
  `page.waitForEvent('popup')` is unreliable for an unregistered protocol; stub `window.open` instead.

## Sources

- `apps/ministry-maps/src/app/features/users/pages/users-page/users-page.component.ts`
- `apps/ministry-maps/src/app/features/users/pages/users-page/users-page.component.html`
- `apps/ministry-maps/src/app/features/users/components/user-list-item/user-list-item.component.ts`
- `apps/ministry-maps/src/app/features/users/components/user-edit-dialog/users-edit-dialog.component.ts`
- `apps/ministry-maps/src/app/features/users/components/invite-create-dialog/invite-create-dialog.component.ts`
- `apps/ministry-maps/src/app/features/users/components/invite-create-dialog/invite-create-form/invite-create-dialog-form.component.ts`
- `apps/ministry-maps/src/app/features/users/components/invite-create-dialog/invite-create-copy-link/invite-create-dialog-copy-link.component.ts`
- `apps/ministry-maps/src/app/features/users/bo/invite/invite-bo.service.ts`, `invite.bo.spec.ts`
- `apps/ministry-maps/src/app/features/users/config/users-roles.config.ts`
- `apps/ministry-maps/src/app/features/users/users-routes.module.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-user-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-invitation-link-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/user.repository.ts`, `invitation-link.repository.ts`
- `apps/ministry-maps/src/app/shared/utils/user-utils.ts`, `share-utils.ts`, `user-agent.ts`,
  `firebase-entity-converter.ts`
- `apps/ministry-maps/src/app/state/user.state.service.ts`
- `apps/ministry-maps/src/app/core/features/auth/services/auth.service.ts`
- `apps/ministry-maps/src/app/core/features/auth/guards/auth.guard.ts`
- `apps/ministry-maps/src/app/core/features/auth/models/enums/auth-routes.ts`
- `apps/ministry-maps/src/models/user.ts`, `invitation-link.ts`, `enums/role.ts`
- `apps/ministry-maps/src/environments/environment.ts`
- `libs/common-ui/src/lib/components/copy-text-block/copy-text-block.component.ts`
- `libs/common-ui/src/lib/components/confirm-dialog/confirm-dialog.component.ts`
- `libs/common-ui/src/lib/directives/authorize/authorize.directive.ts`
- `apps/ministry-maps/e2e/seed/default.seed.ts`, `e2e/seed/factories/user.factory.ts`,
  `e2e/seed/factories/congregation.factory.ts`
- `apps/ministry-maps/e2e/fixtures/database.fixture.ts`, `auth.fixture.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`,
  `docs/domain/glossary.md`

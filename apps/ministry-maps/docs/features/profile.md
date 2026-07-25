# Profile (`UC-PROF`)

This document describes the behavioural use cases for the `/profile` screen: the signed-in user's
identity card, the congregation-switch affordance (`APP_ADMIN`/`SUPERINTENDENT` only), and logout.

**Route:** `/profile`
**Actors:** every signed-in role (`PUBLISHER`, `ORGANIZER`, `ELDER`, `ADMIN`, `SUPERINTENDENT`,
`APP_ADMIN`) reaches the page — there is no redirect for anyone. **Anonymous** visitors also reach it,
because the route's `data.roles` is `['*']`, which makes `authGuard` return `true` **before** any login
check (see [`../domain/roles-and-permissions.md §3.1`](../domain/roles-and-permissions.md#31-suspected-defect--roles--short-circuits-the-login-check)).
Only `APP_ADMIN`/`SUPERINTENDENT` see the congregation-switch card. Field/model shapes referenced below
are in [`../domain/data-model.md`](../domain/data-model.md); pt-BR ↔ English vocabulary is in
[`../domain/glossary.md`](../domain/glossary.md).

### Identity card

#### UC-PROF-01 — Identity card renders the signed-in ADMIN's name, role badge and congregation
- **Actor:** Admin
- **Route:** `/profile`
- **Preconditions (seed):** default baseline (`seed.ids.adminUser` = `Carlos Almeida`, role `ADMIN`, congregation `seed.ids.congregation` = `Congregação Jardim Primavera`)
- **Steps:** 1. `signInAs('admin')` → 2. open `/profile`
- **Expected UI:** the `figcaption` inside `.user-initials-figure` reads `CA` (`getUserInitials('Carlos Almeida')` → first letter of the first two space-separated tokens); the `<h2 class="t-headline4">` reads exactly `Carlos Almeida`; `.user-card__privilege-badge` reads exactly `Admin` (`getTranslatedRole(RoleEnum.ADMIN)`); the subtitle `<span class="t-body2">` reads exactly `Congregação Jardim Primavera`
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).name === 'Carlos Almeida'` and `.role === 'ADMIN'`; `db.getDocSnapshot(db.collections.users, seed.ids.adminUser).data().congregation` is a Firestore `DocumentReference` whose path resolves to `db.collections.congregations/seed.ids.congregation`; `db.getDoc(db.collections.congregations, seed.ids.congregation).name === 'Congregação Jardim Primavera'`
- **Edge cases:** none of `fullName`/`congregation`/`role`/the initials figure carry a `data-testid` — select by class or text; a hypothetical single-word name falls through to `splitWords[0].substring(0,2)` instead of the two-initial rule (untested by this seed)
- **Priority:** P0 · **Gaps:** no `data-testid` on the identity card or any of its fields

#### UC-PROF-02 — Identity card renders for a PUBLISHER (badge `Publicador`)
- **Actor:** Publisher
- **Route:** `/profile`
- **Preconditions (seed):** default baseline (`seed.ids.publisherUsers[0]` = `Ana Souza`, role `PUBLISHER`)
- **Steps:** 1. `signInAs('publisher')` → 2. open `/profile`
- **Expected UI:** initials `AS`; name `Ana Souza`; badge exactly `Publicador` (`getTranslatedRole` default case); congregation subtitle still `Congregação Jardim Primavera` (same seeded congregation as the admin)
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.publisherUsers[0]).role === 'PUBLISHER'`
- **Edge cases:** the congregation-switch card (see `UC-PROF-04`) is absent for this role — `*libAuthorize` clears the `<kingdom-apps-change-congregation>` block since `PUBLISHER` is not in `[APP_ADMIN, SUPERINTENDENT]`
- **Priority:** P1 · **Gaps:** none

#### UC-PROF-03 — ⚠ Anonymous visit does not redirect and renders placeholder identity content
- **Actor:** Anonymous
- **Route:** `/profile`
- **Preconditions (seed):** none required; do not sign in
- **Steps:** 1. `page.goto('/profile')` without calling `signInAs`
- **Expected UI:** the URL stays `/profile` (no redirect to `/login`) because `authGuard`'s step 1 (`roles.includes('*')`) returns `true` before checking authentication. `user()` (the `toSignal` of `UserStateService.$user`, seeded `null`) is falsy, so the computed signals fall back to their defaults: initials figure reads `XX` (`getUserInitials(undefined)`), name reads `Meu Nome`, congregation subtitle reads `LS Congregação`, badge reads `Publicador` (`getTranslatedRole(RoleEnum.PUBLISHER)` fallback). The congregation-switch card and any `*libAuthorize`-gated block are absent (no user → directive clears content). The `SAIR` logout button still renders and is clickable
- **Expected persistence:** N/A (no Firestore read happens without a resolved uid); assert `db.getCollectionDocs(db.collections.users)` is unchanged (still the 4 baseline users) to prove no side effect
- **Edge cases:** do not write a test expecting a `/login` redirect here — that is not current behaviour; the correct assertion is "stays on `/profile` and shows the placeholder strings above"
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` (tracked in [`../domain/roles-and-permissions.md §3.1`](../domain/roles-and-permissions.md#31-suspected-defect--roles--short-circuits-the-login-check)); no `data-testid`s to assert the placeholder state, must match on the literal fallback strings

### Congregation switch (`APP_ADMIN` / `SUPERINTENDENT` only)

#### UC-PROF-04 — Switch card is hidden for `ADMIN` and `PUBLISHER`
- **Actor:** Admin, Publisher
- **Route:** `/profile`
- **Preconditions (seed):** default baseline
- **Steps:** 1. `signInAs('admin')` → open `/profile` → observe → 2. `signInAs('publisher')` → open `/profile` → observe
- **Expected UI:** in both cases the "Administrador" section (`kingdom-apps-change-congregation`, title `Administrador`, intro `Selecione a congregação que deseja ver:`) never renders — `ProfileBO.CHANGE_CONGREGATION_ALLOWED = [APP_ADMIN, SUPERINTENDENT]` excludes both `ADMIN` and `PUBLISHER`, and `*libAuthorize` clears the block for any non-matching role
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'`; `db.getDoc(db.collections.users, seed.ids.publisherUsers[0]).role === 'PUBLISHER'` — neither is in the allow-list
- **Edge cases:** this differs from [`../domain/roles-and-permissions.md §4`](../domain/roles-and-permissions.md#4-in-template-authorization---libauthorize) table only in emphasis — `ADMIN` (the congregation's own admin) explicitly cannot switch congregations, only `SUPERINTENDENT`/`APP_ADMIN` (circuit-level roles) can
- **Priority:** P1 · **Gaps:** none

#### UC-PROF-05 — Switch card lists every congregation, ordered by name
- **Actor:** Superintendent or App Admin (harness extension needed — only `'admin'`/`'publisher'` exist in `signInAs` today)
- **Route:** `/profile`
- **Preconditions (seed):** default baseline plus a second congregation `buildCongregation({ id: 'seed-congregation-2', name: 'Congregação Vila Nova' })`; a user with role `SUPERINTENDENT` or `APP_ADMIN`
- **Steps:** 1. sign in as that user → 2. open `/profile` → 3. open the `<select>` inside "Administrador"
- **Expected UI:** the `<option>`s are the full congregation list ordered alphabetically by `name` (`getCongregations()` runs `orderBy('name','asc')`) — `Congregação Jardim Primavera` before `Congregação Vila Nova`; the initially selected option matches `user().congregation.id`; before this fetch resolves, the `<select>` shows exactly one bootstrap option built client-side from the current user's own congregation (`congregations` signal's initial value)
- **Expected persistence:** `db.getCollectionDocs(db.collections.congregations)` returns both seeded congregations; assert their `name`s match the option order above
- **Edge cases:** `getCongregations()` is a one-shot `getDocs`, not a live listener — a congregation created by another actor after this page has loaded will not appear without a reload
- **Priority:** P1 · **Gaps:** `signInAs('superintendent'|'app_admin')` harness extension needed; no `data-testid` on the `<select>` (use `lib-select`/`name="Cidade"` — note the attribute is literally `name="Cidade"`, a copy/paste artifact, not `"Congregação"`)

#### UC-PROF-06 — Switching congregation persists the reference, updates state, and needs a fresh navigation (not a hard reload) to affect `/territories`
- **Actor:** Superintendent or App Admin (harness extension needed)
- **Route:** `/profile`
- **Preconditions (seed):** default baseline plus `seed-congregation-2` (`Congregação Vila Nova`, cities `['Campinas']`); a `SUPERINTENDENT`/`APP_ADMIN` user on `seed-congregation`
- **Steps:** 1. open `/profile` → 2. select `Congregação Vila Nova` in the switch `<select>` → 3. navigate to `/territories`
- **Expected UI:** the switch section shows its `isLoading` spinner (`kingdom-apps-section [isLoading]`) while the write is in flight; afterwards `/territories`'s city filter offers `Campinas` (from the new congregation), because `TerritoriesPageComponent.ngOnInit` re-reads `UserStateService.currentUser` **fresh on every navigation that recreates the component** — `ProfileBO.changeUserCongregation` calls `UserStateService.setUser(updatedUser)` synchronously in its success `tap`, so the in-memory state is already correct by the time `/territories` mounts; a full browser reload is **not** required for this specific flow (contrast with `UC-CFG-11`, where no `setUser` call exists at all)
- **Expected persistence:** `db.getDocSnapshot(db.collections.users, <uid>).data().congregation` is now a `DocumentReference` to `congregations/seed-congregation-2`; `db.getDoc(db.collections.congregations, 'seed-congregation-2').cities` still `['Campinas']` (unchanged by the switch)
- **Edge cases:** if `/territories` was already mounted **before** the switch (e.g. two open tabs, or a SPA route that does not destroy the component), it will not react — `ngOnInit` runs once, it does not subscribe to `UserStateService.$user` reactively (see [`../domain/data-model.md §4.6`](../domain/data-model.md#46-realtime-vs-one-shot-reads))
- **Priority:** P1 · **Gaps:** `signInAs('superintendent'|'app_admin')` harness extension needed

#### UC-PROF-07 — ⚠ `ProfileBO.changeUserCongregation` silently no-ops for a user without a congregation
- **Actor:** Superintendent or App Admin (harness extension needed)
- **Route:** `/profile`
- **Preconditions (seed):** a `SUPERINTENDENT`/`APP_ADMIN` user document with `congregation` unset (no `DocumentReference` field at all)
- **Steps:** 1. programmatically invoke the switch flow with that user's id (or, once the harness supports it, sign in and use the `<select>` — note that `resolveUser`'s `EMPTY_CONGREGATION` fallback means such a user would actually see an empty-string `congregation.id`, not a missing field, so this path is only reachable if the Firestore doc itself omits `congregation`) → 2. attempt to switch
- **Expected UI:** `changeUserCongregation` returns `of(null)` — no error, no toast, nothing visibly happens; `isLoading` still flips back to `false` via `finalize`
- **Expected persistence:** `db.getDoc(db.collections.users, uid)` is byte-for-byte unchanged — no write occurs, since the `switchMap` short-circuits before calling `userRepository.update`
- **Edge cases:** this guard is defensive dead code in the current UI, because `resolveUser()` always substitutes `EMPTY_CONGREGATION` for a missing reference before the user ever reaches `UserStateService` — a "no congregation" user's `.congregation` object is always truthy (just empty), so the `!user.congregation` branch inside `ProfileBO` can only be hit by a raw Firestore document lacking the field entirely
- **Priority:** P2 · **Gaps:** `⚠ suspected defect`-adjacent (dead/unreachable guard from the UI); `signInAs('superintendent'|'app_admin')` harness extension needed to exercise even the reachable half

#### UC-PROF-08 — ⚠ `ProfileBO.changeUserCongregation` throws for a non-privileged role, and the UI swallows the error silently
- **Actor:** Any role outside `[APP_ADMIN, SUPERINTENDENT]`
- **Route:** `/profile`
- **Preconditions (seed):** default baseline; the target user's Firestore `role` is mutated (via `db.firestore`) to `PUBLISHER` **after** the switch card has already rendered (so the template-level `*libAuthorize` gate, evaluated once in `ngOnInit`, does not re-hide the card)
- **Steps:** 1. sign in as a `SUPERINTENDENT`/`APP_ADMIN` seed user → open `/profile` (card renders) → 2. via `db.firestore`, set that user's `role` to `PUBLISHER` → 3. select a different congregation in the `<select>`
- **Expected UI:** `ProfileBO.changeUserCongregation` throws `Error('Changing congregations is not authorized by Non-Admin users.')` inside the `switchMap`; `ChangeCongregationComponent.handleChangeCongregation` calls `.subscribe()` with **no error callback**, so the error is unhandled (surfaces only as a browser console error) — `isLoading` still resets to `false` via `finalize` (which runs on both `next` and `error`); no toast, no inline message appears anywhere; because `user()`'s signal was never updated, the next change-detection cycle resets the native `<select>`'s displayed value back to the original congregation (`[ngModel]` is one-way bound from the signal)
- **Expected persistence:** `db.getDoc(db.collections.users, uid).congregation` (the reference) is unchanged — `getById` runs first and the throw happens before any `userRepository.update` call
- **Edge cases:** in practice this branch is unreachable through the UI without exactly this kind of mid-session role downgrade, because the template gate and the BO's own role check use the same allow-list — a test locking in this behaviour is documenting a defence-in-depth path, not a common user journey
- **Priority:** P2 · **Gaps:** `⚠ suspected defect` — the thrown error is never surfaced to the user; test must assert the `<select>` visually reverts and no toast appears, not that an error message is shown; `signInAs('superintendent'|'app_admin')` harness extension needed

### Logout

#### UC-PROF-09 — Logout confirmation dialog, confirm → `/login` and cleared state
- **Actor:** Admin (or Publisher — identical flow)
- **Route:** `/profile`
- **Preconditions (seed):** default baseline
- **Steps:** 1. `signInAs('admin')` → open `/profile` → 2. click the `SAIR` button (icon `log-out-7` + label text `SAIR`) → 3. observe the confirmation dialog → 4. click `Confirmar`
- **Expected UI:** dialog title exactly `Sair`; body text exactly `Você realmente deseja sair?`; footer buttons `Cancelar` / `Confirmar` (shared `ConfirmDialogComponent`, see [`../domain/glossary.md §2`](../domain/glossary.md#2-cross-app-ui-labels)); after `Confirmar`, the page navigates to `/login`
- **Expected persistence:** N/A for the logout action itself (it only calls Firebase Auth `signOut`, no Firestore write); assert `db.auth` no longer has an active session for that uid, and that `db.getCollectionDocs(db.collections.users)` is unchanged (logout never deletes/modifies the user document)
- **Edge cases:** `AuthService.logOut()` calls `authRepository.logOut()` without subscribing to the returned observable — the underlying `signOut(auth)` promise is still created (and thus executes) eagerly at call time, so the sign-out itself is not silently skipped (same "fire-and-forget but still fires" pattern as [`../domain/data-model.md §4.2.1`](../domain/data-model.md#421-the-visit-write-back-is-fire-and-forget)); the actual navigation to `/login` is driven separately, by `AuthService`'s `authStateChanged` subscription noticing the user disappeared
- **Priority:** P0 · **Gaps:** no `data-testid` on the `SAIR` button or the dialog; select by role/text (`getByRole('button', { name: 'Sair' })`-style queries work since the icon has no separate accessible text)

#### UC-PROF-10 — Logout cancel keeps the user on `/profile`
- **Actor:** Admin
- **Route:** `/profile`
- **Preconditions (seed):** default baseline
- **Steps:** 1. `signInAs('admin')` → open `/profile` → 2. click `SAIR` → 3. click `Cancelar`
- **Expected UI:** dialog closes; the URL stays `/profile`; the identity card still shows `Carlos Almeida` / `Admin` / `Congregação Jardim Primavera`
- **Expected persistence:** `db.auth` session for `seed.ids.adminUser` remains active; `db.getDoc(db.collections.users, seed.ids.adminUser)` unchanged
- **Edge cases:** `ConfirmDialogComponent.handleCancel(false)` closes with a falsy result, which the page's `.closed.subscribe(res => { if (res) { … } })` guard ignores entirely — clicking the dialog's own close affordance (if any) behaves identically to `Cancelar` since both resolve the same `closed` observable with a falsy value
- **Priority:** P1 · **Gaps:** none

## Testability gaps (summary)

- Zero `data-testid`s exist on `/profile` — the identity card, its initials/name/badge/congregation fields,
  the congregation-switch section and `<select>`, and the `SAIR` button must all be selected by CSS class
  or verbatim pt-BR text.
- Harness extensions needed: `signInAs` only supports `'admin'`/`'publisher'` — every `SUPERINTENDENT`/
  `APP_ADMIN` scenario in this document (`UC-PROF-05`, `UC-PROF-06`, `UC-PROF-07`, `UC-PROF-08`) needs a new
  seeded user and `ROLE_UIDS` entry before it can be automated end-to-end.
- Documented current-behaviour-vs-defect items (see the corresponding entry for the assertion to make
  today): `UC-PROF-03` (anonymous visitor sees placeholder identity content instead of a `/login` redirect),
  `UC-PROF-07` (no-congregation guard is unreachable dead code from the UI), `UC-PROF-08` (unauthorized
  congregation-switch error is thrown but never surfaced to the user).
- `UC-PROF-06` documents a nuance that a future author must not conflate with `UC-CFG-11`: switching
  congregation on `/profile` **does** call `UserStateService.setUser(...)`, so a same-tab navigation
  (without a hard reload) already sees the new state: it is `/configuration`'s city-rename save that skips
  `setUser` and truly requires a reload.

## Sources

- `apps/ministry-maps/src/app/features/profile/pages/profile-page/profile-page.component.ts`
- `apps/ministry-maps/src/app/features/profile/pages/profile-page/profile-page.component.html`
- `apps/ministry-maps/src/app/features/profile/bo/profile.bo.ts`
- `apps/ministry-maps/src/app/features/profile/components/change-congregation.component.ts`
- `apps/ministry-maps/src/app/features/profile/profile-routes.ts`
- `apps/ministry-maps/src/app/state/user.state.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-congregation-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-user-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/user.repository.ts`, `congregation.repository.ts`
- `apps/ministry-maps/src/app/shared/utils/user-utils.ts`
- `apps/ministry-maps/src/app/core/features/auth/services/auth.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-auth-datasource.service.ts`
- `libs/common-ui/src/lib/components/confirm-dialog/confirm-dialog.component.ts`
- `apps/ministry-maps/src/app/features/territory/pages/territories-page/territories-page.component.ts`
- `apps/ministry-maps/src/app/app-routes.ts`
- `apps/ministry-maps/src/models/enums/role.ts`
- `apps/ministry-maps/e2e/seed/default.seed.ts`, `e2e/config/auth.config.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`, `docs/domain/glossary.md`

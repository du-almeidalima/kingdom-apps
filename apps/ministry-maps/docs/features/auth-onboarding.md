# Auth & onboarding (`UC-AUTH`)

This document describes the behavioural use cases for authentication and onboarding: the `/login` screen,
provider sign-in outcomes, the `/welcome` and `/no-account` pages, the guard redirect matrix, the
`/sign-in/:inviteId` invite flow, and session lifecycle (forced logout, the app-wide auth spinner).

**Routes** (from `auth-routes.ts` + `app-routes.ts`):

| URL                  | Component                | Guard       | `data.roles`  |
| -------------------- | ------------------------ | ----------- | ------------- |
| `/login`             | `LoginPageComponent`     | —           | —             |
| `/welcome`           | `WelcomePageComponent`   | `authGuard` | `[PUBLISHER]` |
| `/no-account`        | `NoAccountPageComponent` | —           | —             |
| `/sign-in/:inviteId` | `SignInPageComponent`    | —           | —             |

The guard itself is fully documented in
[`../domain/roles-and-permissions.md §3`](../domain/roles-and-permissions.md#3-authguard-semantics); the
`User`/`InvitationLink` shapes in [`../domain/data-model.md`](../domain/data-model.md) (§2.4, §2.6); pt-BR ↔
English vocabulary in [`../domain/glossary.md`](../domain/glossary.md).

> **Read this before writing any auth spec — the two hard constraints of this feature:**
>
> 1. **The OAuth popup leg is not automatable.** Both `/login` and `/sign-in/:inviteId` sign in via
>    `signInWithPopup(auth, new GoogleAuthProvider())` — a real browser popup against a Google account,
>    which the Playwright suite does not exercise (see
>    [`../testability-gaps.md`](../testability-gaps.md)). Entries whose core behaviour **requires** that
>    popup (marked _manual-only leg_) are documented with full steps/persistence contracts so they can be
>    executed as manual acceptance checks today and automated later if the suite ever adopts the Auth
>    emulator's popup automation. Everything else uses the `signInAs` custom-token fixture.
> 2. **There is no `invitation_links` support in the seed harness yet.** The collection (note the
>    **underscore**) is absent from `e2e/seed/collections.ts`, there is no `buildInvitationLink` factory,
>    and the seeder writes no invites. Invite entries below write the raw doc via the `db.firestore`
>    escape hatch until the harness extension lands — see
>    [`../test-catalog.md#harness-extensions-needed`](../test-catalog.md#harness-extensions-needed). The
>    persisted shape that matters: `congregation` is stored as a **`DocumentReference`** (the datasource
>    resolves it on read), and the doc's own `id` is also written **inside** the document body.
>
> Also note the fixture invariant the whole suite relies on: **`/login` never auto-navigates on
> auth-state change** (UC-AUTH-03) — that is why `signInAs` can leave the page on `/login` with a live
> session and let the caller `goto` the guarded route it wants.

### The login screen (`/login`)

#### UC-AUTH-01 — Anonymous visit to `/` redirects through the guard chain to `/login`, which renders

- **Actor:** Anonymous
- **Route:** `/` → `/home` → `/login`
- **Preconditions (seed):** default baseline; do not sign in
- **Steps:** 1. `page.goto('/')`
- **Expected UI:** the root path `''` redirects to `/home` (`pathMatch: 'full'`), `/home`'s `authGuard` finds no user and `resolveUserFromAuthProvider()` emits `undefined`, producing `UrlTree(['login'])`; the final URL is `/login` and the page renders a `lib-card` containing the only `<h1>` on the page with exact text `Login`
- **Expected persistence:** N/A — no Firestore write; assert `db.getCollectionDocs(db.collections.users)` is unchanged (still the 8 baseline users)
- **Edge cases:** while the guard's user resolution is in flight, the app shell shows the full-viewport `.spinner` instead of the `<router-outlet>` (`AuthService.isAuthenticating` signal, see UC-AUTH-23) — assertions must target the settled state, e.g. `await expect(page).toHaveURL(/\/login/)` then the `h1`
- **Priority:** P0 · **Gaps:** none — **already covered** by `e2e/tests/smoke.spec.ts` ("renders the Login screen against the seeded emulator"); do not duplicate, extend that spec if more assertions are wanted

#### UC-AUTH-02 — Login screen renders a single Google provider button

- **Actor:** Anonymous
- **Route:** `/login`
- **Steps:** 1. `page.goto('/login')`
- **Expected UI:** exactly one `button.provider-login-button` inside the card, with the verbatim label `Entrar com uma conta do Google`, `type="button"`, not disabled; although `FIREBASE_PROVIDERS` defines `GOOGLE` and `MICROSOFT`, only the Google button is rendered; while `loading` is true (after a click) the button becomes `disabled` and shows a `lib-spinner`
- **Expected persistence:** N/A (render-only); assert `db.getCollectionDocs(db.collections.users)` unchanged
- **Edge cases:** `ProviderLoginButtonComponent` resolves its provider in `ngOnInit` via its signal input (`provider()`); alt text falls back to the Google default only when the input is missing — invisible today since Google is the only provider ever passed; clicking the button opens the OAuth popup (manual-only leg, see the header note) — do not click it in an automated spec
- **Priority:** P0 · **Gaps:** no `data-testid` on the button; select by CSS class `button.provider-login-button` or by name `Entrar com uma conta do Google`

#### UC-AUTH-03 — An already-signed-in user on `/login` is NOT auto-redirected (fixture invariant)

- **Actor:** Admin (or any role)
- **Route:** `/login`
- **Preconditions (seed):** default baseline
- **Steps:** 1. `signInAs('admin')` (this internally lands on `/login` and establishes the session via `__E2E__.signInWithCustomToken`) → 2. wait/assert **without** any further navigation
- **Expected UI:** the URL stays `/login` and the `Login` heading remains rendered — neither `LoginPageComponent` nor any app-level listener reacts to the new auth state with a navigation. **Current E2E reality:** the custom-token fixture establishes Firebase Auth but does not hydrate `UserStateService` on this unguarded route, so the header's `#profile-link` (`title="Meu Perfil"`) is not rendered until a guarded route resolves the user.
- **Expected persistence:** `db.auth.getUser(seed.ids.adminUser)` resolves (the Auth account exists); no Firestore write
- **Edge cases:** this invariant is what makes the whole `signInAs` fixture design work — if a future change makes `/login` redirect signed-in users, every `signInAs` call followed by an assertion (rather than an explicit `goto`) breaks; a regression test for this entry is effectively a test of the fixture itself
- **Priority:** P1 · **Gaps:** none

### Provider sign-in outcomes (popup legs — manual-only)

#### UC-AUTH-04 — ⚙️ Provider sign-in as a known `PUBLISHER` lands on `/welcome`

- **Actor:** Publisher (`seed-user-publisher-1`, `Ana Souza`)
- **Route:** `/login`
- **Preconditions (seed):** default baseline
- **Steps (manual):** 1. open `/login` → 2. click `Entrar com uma conta do Google` → 3. complete the popup with the Google account whose email is `seed-user-publisher-1@example.com`
- **Expected UI:** after the popup closes, `signInWithPopup` resolves, `users/{uid}` is read **from the server** (`getDocFromServer`), both state services are populated, and — because `user.role === RoleEnum.PUBLISHER` — the page navigates to `/welcome` (not `/home`); the welcome content of UC-AUTH-08 renders
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.publisherUsers[0]).role === 'PUBLISHER'`; no write occurs on this path (an existing user doc is only read)
- **Edge cases:** the role funnel is decided by the login page's own `subscribe` (`user.role === PUBLISHER ? navigate(['welcome']) : navigate(['home'])`) — it is **not** the guard that performs this landing redirect
- **Priority:** P0 · **Gaps:** **manual-only leg** — requires the `signInWithPopup` OAuth flow (see header note); the post-conditions are independently verifiable via `signInAs('publisher')` + `page.goto('/welcome')` (UC-AUTH-08), which is the automated approximation

#### UC-AUTH-05 — ⚙️ Provider sign-in as a known non-publisher lands on `/home`

- **Actor:** Admin (`seed-user-admin`, `Carlos Almeida`)
- **Route:** `/login`
- **Preconditions (seed):** default baseline
- **Steps (manual):** 1. open `/login` → 2. complete the Google popup with `carlos.almeida@example.com`
- **Expected UI:** same flow as UC-AUTH-04, but `user.role === 'ADMIN'` → navigates to `/home`; the home hub renders per UC-NAV-05 (`Bem-Vindo Carlos!`); every non-`PUBLISHER` role (`ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN`) lands identically on `/home`
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'`; no write
- **Edge cases:** none — the branch is a plain `else` of the publisher check
- **Priority:** P0 · **Gaps:** **manual-only leg** — automated approximation: `signInAs('admin')` + `page.goto('/home')` (already exercised by `territories.spec.ts` flows and UC-NAV-05)

#### UC-AUTH-06 — ⚙️ Provider sign-in with an unknown account deletes the Auth account and lands on `/no-account`

- **Actor:** A Google account with **no** `users/{uid}` document (uninvited visitor)
- **Route:** `/login`
- **Preconditions (seed):** default baseline; the popup account's uid must not exist in `users`
- **Steps (manual):** 1. open `/login` → 2. complete the popup with any unknown Google account
- **Expected UI:** `handleUserAuthentication` finds no user doc and — because the login page passes `createUser = false` (the default) — **deletes the just-created Firebase Auth account** (`providerUser.delete()`, which also signs the user out), then emits a falsy value; the login page navigates to `/no-account`; the `/no-account` content of UC-AUTH-10 renders
- **Expected persistence:** no `users` doc is ever created (collection still has the 8 baseline users); `db.auth.getUser(<uid>)` throws `auth/user-not-found` — the Auth account is **gone**, not merely signed out (this deletion is deliberate: uninvited popup sign-ins must not pollute the Auth user base)
- **Edge cases:** the deletion happens **only** on the `/login` path — the same unknown account presented to `/sign-in/:inviteId` is treated per UC-AUTH-17/18 instead; do not conflate the two paths in one spec
- **Priority:** P0 · **Gaps:** **manual-only leg** — the observable approximation is a direct `page.goto('/no-account')` (UC-AUTH-10) plus the unit-tested deletion contract (`firebase-auth-datasource.service.spec.ts` covers "should delete user after log in that doesn't exist in the database"); there is no harness hook to simulate a popup-completed unknown account

#### UC-AUTH-07 — ⚙️ Cancelling or erroring the popup keeps the user on `/login`

- **Actor:** Anonymous
- **Route:** `/login`
- **Preconditions (seed):** none
- **Steps (manual):** 1. open `/login` → 2. click the Google button → 3. close the popup without choosing an account
- **Expected UI:** the `signInWithProvider` observable errors (`auth/popup-closed-by-user`); `LoginPageComponent`'s `subscribe` has **no error handler**, so nothing navigates and nothing renders an error — the user simply stays on `/login`; `finalize` still resets `loading`, re-enabling the button (the spinner disappears)
- **Expected persistence:** no Auth account is created for a cancelled popup; `db.getCollectionDocs(db.collections.users)` unchanged
- **Edge cases:** the unhandled error surfaces in the browser console — a spec (if ever automated) should assert "URL stays `/login` and the button is enabled again", not any error copy, because none exists
- **Priority:** P1 · **Gaps:** **manual-only leg**

### Welcome & no-account pages

#### UC-AUTH-08 — `/welcome` renders the greeting and congregation name for a signed-in publisher

- **Actor:** Publisher
- **Route:** `/welcome`
- **Preconditions (seed):** default baseline (`seed-user-publisher-1` = `Ana Souza`, congregation `Congregação Jardim Primavera`)
- **Steps:** 1. `signInAs('publisher')` → 2. `page.goto('/welcome')`
- **Expected UI:** heading `Bem-Vindo Ana!` (`userName` = first space-separated token of `User.name`); body `Sua conta foi criada com sucesso!`; then `Sua conta está ligada a congregação Congregação Jardim Primavera. Agora um dos administradores de sua congregação precisa te dar as permissões para você acessar as outras partes do aplicativo.` — **no buttons, no links, no logout** anywhere on the page
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.publisherUsers[0]).congregation` (a `DocumentReference`, inspect via `db.getDocSnapshot`) resolves to `congregations/seed-congregation`
- **Edge cases:** the guard allows this route for `PUBLISHER` exactly (`data.roles: [PUBLISHER]`) and `APP_ADMIN` (bypass); the page reads `UserStateService.currentUser` **once** in its constructor — a later role/congregation change does not update the rendered copy without a re-navigation
- **Priority:** P0 · **Gaps:** no `data-testid`; select the heading by role/text `Bem-Vindo Ana!`

#### UC-AUTH-09 — A signed-in non-publisher hitting `/welcome` is bounced — redirect or cancelled navigation depending on state warmth

- **Actor:** Admin
- **Route:** `/welcome`
- **Preconditions (seed):** default baseline; `signInAs('admin')`
- **Steps:** 1. `page.goto('/welcome')` directly (cold app state — `signInAs` leaves `UserStateService` empty, see UC-AUTH-03)
- **Expected UI:** the guard's no-user-in-state branch resolves the user (`ADMIN`) and evaluates `canAccessRoute(ADMIN, [PUBLISHER])` → **`false`** — a boolean, so the navigation is **cancelled**: the URL stays `/welcome` and the shell renders with an empty router outlet (same family as UC-NAV-08 — ⚠ suspected defect: no feedback at all). **Warm-state variant:** if `UserStateService` already holds the admin (e.g. an SPA-internal navigation to `/welcome` after `/home` rendered), the guard's step 2b fires first and returns `UrlTree(['home'])` — a real redirect; that variant is documented for completeness but is not reachable via `page.goto` alone
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'`; no write
- **Edge cases:** do not assert a `/home` redirect for the cold (automatable) path — the redirect only happens with warm state; assert "stays on `/welcome` with no welcome content rendered"
- **Priority:** P1 · **Gaps:** ⚠ suspected defect (cancelled-navigation family, consolidated with UC-NAV-08)

#### UC-AUTH-10 — `/no-account` renders its informational content with no actions

- **Actor:** Anyone (unguarded route)
- **Route:** `/no-account`
- **Preconditions (seed):** none
- **Steps:** 1. `page.goto('/no-account')`
- **Expected UI:** heading `Olá!`; the image `assets/images/map-image.png` (`alt="MM Image"`); the three paragraphs: `Olá! Agradecemos por usar o Ministry Maps (MM).` · `Não conseguimos localizar sua conta, mas não se preocupe: você não precisa de uma conta para usar o aplicativo!` · `Se precisar de acesso à área restrita, é só pedir ao seu Superintendente de Grupo (SG) para enviar um link de cadastro. Estamos aqui para ajudar!`; **no buttons, no links** — the component class is empty
- **Expected persistence:** N/A (static content); assert `db.getCollectionDocs(db.collections.users)` unchanged
- **Edge cases:** when reached through the real flow (UC-AUTH-06), the visitor is fully unauthenticated because the unknown Auth account was deleted before navigation — a direct `goto` reproduces the same visual state without that cleanup
- **Priority:** P1 · **Gaps:** none beyond the missing `data-testid`s

### Guard redirect matrix

#### UC-AUTH-11 — Anonymous visitors are redirected to `/login` from every genuinely guarded route

- **Actor:** Anonymous
- **Route:** all routes whose `data.roles` is a concrete list
- **Preconditions (seed):** default baseline; do not sign in
- **Steps:** 1. `page.goto(route)` for each of `/home`, `/territories`, `/territories/assign`, `/territories/statistics`, `/users`, `/welcome`
- **Expected UI:** every one of them ends at URL `/login` with the `Login` heading — the guard's `resolveUserFromAuthProvider()` emits `undefined` (no Firebase session) and maps to `UrlTree(['login'])`
- **Expected persistence:** N/A (guard redirects perform no writes); spot-assert `db.getCollectionDocs(db.collections.designations)` is untouched after the loop
- **Edge cases:** `/work/:id` is deliberately **absent** from this list (unguarded by design, UC-WORK-01), and `/profile` + `/configuration` are absent because of the `roles: ['*']` early return (UC-AUTH-13); per-feature owners of the individual legs: UC-NAV-07 (`/home`), UC-TERR-37 (`/territories`, **already covered** by `territories.spec.ts`), UC-ASSIGN-24, UC-STAT-17, UC-USERS-17, UC-AUTH-09 (`/welcome` is covered for the non-publisher case; the anonymous case lands on `/login` per this entry)
- **Priority:** P0 · **Gaps:** none — write this as one parametrized spec (`for (const route of [...])`) rather than six specs; do not duplicate the existing `/territories` assertion from `territories.spec.ts`

#### UC-AUTH-12 — A signed-in publisher hitting any guarded admin route is funneled to `/welcome`

- **Actor:** Publisher
- **Route:** `/home`, `/territories`, `/territories/assign`, `/territories/statistics`, `/users`
- **Preconditions (seed):** default baseline; `signInAs('publisher')`
- **Steps:** 1. `page.goto(route)` for each admin route
- **Expected UI:** every attempt ends at URL `/welcome` rendering the UC-AUTH-08 content (`Bem-Vindo Ana!`) — the guard's publisher rule (`role === PUBLISHER && path !== 'welcome' → UrlTree(['welcome'])`) fires regardless of which concrete role list the route declares
- **Expected persistence:** N/A (redirect only); assert `db.getDoc(db.collections.users, seed.ids.publisherUsers[0]).role === 'PUBLISHER'`
- **Edge cases:** per-feature owners of individual legs: UC-NAV-06 (`/home`), UC-ASSIGN-23, UC-STAT-16, UC-USERS-16, and the `/territories` leg inside `territories-management.md` — one parametrized spec can own the whole matrix, or each feature spec can own its own leg; do not duplicate both ways
- **Priority:** P0 · **Gaps:** none

#### UC-AUTH-13 — ⚠ `roles: ['*']` routes (`/profile`, `/configuration`, `/work/:id`) render for anonymous visitors

- **Actor:** Anonymous
- **Route:** `/profile`, `/configuration`, `/work/:id`
- **Preconditions (seed):** default baseline; do not sign in
- **Steps:** 1. `page.goto('/profile')` → 2. `page.goto('/configuration')` → 3. `page.goto('/work/<any-seeded-id>')`
- **Expected UI:** none of them redirect — the guard's step 1 (`!roles || roles.includes('*')`) returns `true` **before** any authentication check (full analysis in [`../domain/roles-and-permissions.md §3.1`](../domain/roles-and-permissions.md#31-suspected-defect--roles--short-circuits-the-login-check)); `/profile` shows the placeholder identity of UC-PROF-03, `/configuration` shows the no-congregation state of UC-CFG-12, and `/work/:id` is unguarded **by design** (a publisher receives a bare link — UC-WORK-01)
- **Expected persistence:** N/A; assert `db.getCollectionDocs(db.collections.users)` unchanged after all three visits
- **Edge cases:** ⚠ suspected defect for `/profile` and `/configuration` (they should arguably require a session); `/work/:id` is intentional and must **not** be "fixed" by a test expecting a redirect; the detailed per-page assertions live in UC-PROF-03 / UC-CFG-12 / UC-NAV-10 — this entry only owns the consolidated guard-level statement
- **Priority:** P1 · **Gaps:** ⚠ suspected defect (consolidated in [`../testability-gaps.md`](../testability-gaps.md#documented-current-behaviour-vs-suspected-defects))

### Invite sign-in (`/sign-in/:inviteId`)

#### UC-AUTH-14 — A valid invite renders the `Cadastrar` card with the provider button

- **Actor:** Invitee (anonymous holder of the link)
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** write a raw invite doc (harness extension pending — see the header note): `db.firestore.collection('invitation_links').doc('invite-valid').set({ id: 'invite-valid', createdBy: 'carlos.almeida@example.com', congregation: db.firestore.doc('congregations/seed-congregation'), createdAt: new Date(), role: 'ORGANIZER', email: 'novo.irmao@example.com', isValid: true })`
- **Steps:** 1. `page.goto('/sign-in/invite-valid')` with no session
- **Expected UI:** while loading, nothing of the card body renders decisively (`loading` gates it); once `InvitationLinkRepository.getById` resolves a valid invite, the card shows heading `Cadastrar`, the `MM Image` image, `Bem vindo ao Ministry Maps ou MM!`, `Parar criar uma conta, clique no botão a baixo.` (both **sic** — "Parar"/"a baixo" typos exist in the source), and the enabled `Entrar com uma conta do Google` button; **no** error paragraph renders
- **Expected persistence:** the invite doc is unchanged by the mere render — `db.firestore.doc('invitation_links/invite-valid').get()` still has `isValid === true` and no `usedAt`/`usedBy`
- **Edge cases:** the invite's `congregation` reference is resolved on read; if it dangles, the datasource substitutes `EMPTY_CONGREGATION` and logs an error, but the page still renders normally (the invite is still returned) — a dangling-congregation invite therefore does **not** produce `INVALID_LINK` at render time (it fails later, at sign-in, per UC-AUTH-17's `INVALID_CREATE_USER_DATA` swallow)
- **Priority:** P0 · **Gaps:** harness extension needed (`invitation_links` in `Collections` + `buildInvitationLink` factory); no `data-testid` — select by the `Cadastrar` heading and the button class

#### UC-AUTH-15 — A missing invite id renders `Esse link de convite não é mais válido.`

- **Actor:** Invitee
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** none — do **not** create any invite with this id
- **Steps:** 1. `page.goto('/sign-in/does-not-exist')`
- **Expected UI:** `getById` returns `undefined` → `errorCode = 'INVALID_LINK'` → the error block renders: `Esse link de convite não é mais válido.` followed by `Por favor, peça para um administrador criar outro link para você.`; the heading `Cadastrar` and the image still render (they sit outside the `@if (errorCode)`), but the provider button is **not rendered at all** (it lives in the `@else` branch) — the invitee cannot do anything further on this page
- **Expected persistence:** `db.firestore.doc('invitation_links/does-not-exist').get()` — `exists === false`
- **Edge cases:** there is a third, `@default` error branch (`Um erro aconteceu ao tentar carregar seu convite.`) that is **dead code** — `errorCode` can only ever be `''`, `'INVALID_LINK'` or `'INVALID_EMAIL'`; never assert that string
- **Priority:** P0 · **Gaps:** no `data-testid` on the error paragraph; match the exact pt-BR text

#### UC-AUTH-16 — A consumed invite (`isValid: false`) renders the same INVALID_LINK state

- **Actor:** Invitee re-opening an already-used link
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** raw invite doc as in UC-AUTH-14 but with `isValid: false`, `usedAt: <a past Date>`, `usedBy: 'consumidor@example.com'` (id `invite-consumed`)
- **Steps:** 1. `page.goto('/sign-in/invite-consumed')`
- **Expected UI:** identical to UC-AUTH-15 — the `!invite || !invite.isValid` check collapses "missing" and "consumed" into the same `INVALID_LINK` state: `Esse link de convite não é mais válido.` + `Por favor, peça para um administrador criar outro link para você.`, no provider button
- **Expected persistence:** the invite doc remains `isValid === false` — nothing writes to it on render
- **Edge cases:** note the model's doc-comment inversion (`/** When used, this is set to true */` on `isValid`) — the code sets it to **false** on consumption; trust the code ([`data-model.md §2.6`](../domain/data-model.md#26-invitationlink--srcmodelsinvitation-linkts))
- **Priority:** P0 · **Gaps:** harness extension needed (same as UC-AUTH-14)

#### UC-AUTH-17 — ⚙️ Successful invite sign-in creates the users doc, consumes the invite, and lands per role

- **Actor:** Invitee whose Google email matches the invite's `email` (or the invite has no email)
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** valid invite as in UC-AUTH-14 with `email: 'novo.irmao@example.com'`, `role: 'ORGANIZER'`; the popup account's email must be exactly `novo.irmao@example.com` and must not already exist in `users`
- **Steps (manual):** 1. open `/sign-in/invite-valid` → 2. click `Entrar com uma conta do Google` → 3. complete the popup with the matching account
- **Expected UI:** `signInWithProvider(provider, true, { inviteId, role: 'ORGANIZER', email: 'novo.irmao@example.com', congregation })` runs; the client-side email check passes (compared case-insensitively on both sides); the user profile is provisioned **server-side** by the `provisionUserFromInvite` Cloud Function (client-side `users` creation is denied by the Firestore rules — a role can never be forged from the browser); because the new user's role is `ORGANIZER` (not `PUBLISHER`), the page navigates to **`/home`** — a `PUBLISHER`-role invite would land on `/welcome` instead
- **Expected persistence:** the callable creates the `users/{uid}` doc with the invite's role + congregation (reference) and the auth token's email/name/photo, and consumes the invite **atomically in the same transaction**: `transaction.update(invite, { isValid: false, usedAt: serverTimestamp, usedBy: <email> })` — only those three fields change (no full-doc overwrite); assert the user doc via the raw snapshot and the invite mutation with `expect.poll`/`toPass` (the callable races the landing navigation)
- **Edge cases:** the email guard runs twice — client-side (mismatch deletes the Auth account → INVALID_EMAIL, UC-AUTH-18) and again inside the callable (defense in depth, case-insensitive); the callable is idempotent per caller uid and re-validates `isValid` inside the transaction, so a double-redeem race cannot burn a second invite; an APP_ADMIN-granting invite is rejected server-side (`permission-denied`)
- **Priority:** P0 · **Gaps:** **manual-only leg** (OAuth popup); the callable contract is covered end-to-end by `provision-user.spec.ts` (UC-USERS-18..23) against the Functions emulator; the unit-level contract is covered by `firebase-auth-datasource.service.spec.ts`

#### UC-AUTH-18 — ⚙️ A mismatched invite email deletes the Auth account and surfaces INVALID_EMAIL

- **Actor:** Invitee who completes the popup with the **wrong** Google account
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** valid invite with `email: 'novo.irmao@example.com'`; the popup account's email is anything else
- **Steps (manual):** 1. open the link → 2. complete the popup with the mismatching account
- **Expected UI:** `handleUserAuthentication` finds no user doc, the case-insensitive email comparison fails, the **Auth account is deleted**, and `Error(AuthErrorEnum.INVALID_EMAIL)` is thrown; the page's `catchError` maps it to `errorCode = 'INVALID_EMAIL'` → the error block renders `Esse link não está associado a esse email.` + `Por favor, peça para um administrador criar outro link para você.`; the provider button disappears (same `@else` suppression as INVALID_LINK), so the invitee cannot retry without reloading the page
- **Expected persistence:** `db.auth.getUser(<uid>)` throws `auth/user-not-found` (account deleted); **no** `users` doc created; the invite doc is **untouched** (`isValid` still `true` — consumption only happens on success)
- **Edge cases:** the deletion means the same wrong account can be used again immediately (e.g. after reloading) — it leaves no residue; only `err.message === 'INVALID_EMAIL'` is mapped — any other popup error is swallowed by the same `catchError` and leaves `errorCode` unchanged
- **Priority:** P1 · **Gaps:** **manual-only leg** (OAuth popup); unit-level contract in `firebase-auth-datasource.service.spec.ts`

#### UC-AUTH-19 — ⚙️ An invite without an email is redeemable by any Google account

- **Actor:** Any invitee
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** valid invite **without** the `email` field (it is optional — `InviteBO.createInviteLink` writes `email: email ?? undefined`)
- **Steps (manual):** 1. open the link → 2. complete the popup with any unknown Google account
- **Expected UI:** the email guard is skipped entirely when `createUserConfig.email` is falsy; the flow proceeds exactly like UC-AUTH-17 (user created with the invite's role/congregation, invite consumed, landing per role)
- **Expected persistence:** same contract as UC-AUTH-17, with the popup account's own email/name on the new doc
- **Edge cases:** this is the generic "congregation link" mode — anyone holding the URL can redeem it exactly once (`isValid` flips on first success), after which UC-AUTH-16 applies to every later visitor
- **Priority:** P1 · **Gaps:** **manual-only leg** (OAuth popup); harness extension needed for the seed

#### UC-AUTH-20 — ⚙️ An existing user redeeming an invite keeps their existing doc and role; the invite is still consumed

- **Actor:** A user whose `users/{uid}` doc already exists (e.g. the seeded admin)
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** valid invite with `role: 'PUBLISHER'` and **no** email restriction; the popup account is the admin's (`carlos.almeida@example.com`, existing `ADMIN` doc)
- **Steps (manual):** 1. open the link → 2. complete the popup with the existing account
- **Expected UI:** `handleUserAuthentication` finds the existing doc and returns it **as-is** — the invite's role/congregation are **not** applied; the `provisionUserFromInvite` callable is **never reached** (the existing profile short-circuits), so the invite **stays valid**; the page navigates by the **existing** role (`ADMIN` → `/home`, not `/welcome`)
- **Expected persistence:** the existing `users/{uid}` doc is byte-for-byte unchanged (role stays `ADMIN`); the invite doc is **untouched** (`isValid` still `true`, no `usedAt`/`usedBy`) — unlike the legacy client-side flow, an existing user opening a link can no longer burn someone else's invite
- **Edge cases:** there is no "already signed in" handling on this page at all — a user with a live session sees the same card and can re-open the link harmlessly (idempotent no-op); the invite remains redeemable by its intended new user
- **Priority:** P2 · **Gaps:** **manual-only leg** (OAuth popup); the idempotency contract is covered by `provision-user.spec.ts` (UC-USERS-19)

#### UC-AUTH-21 — ⚠ An invite-load repository failure is swallowed; the page renders the normal state

- **Actor:** Invitee
- **Route:** `/sign-in/:inviteId`
- **Preconditions (seed):** a scenario that makes `InvitationLinkRepository.getById` **throw** (not merely return `undefined`) — e.g. a network-layer failure; not reproducible against the emulator without fault injection
- **Steps:** 1. open the link while the read is failing
- **Expected UI:** the page's `catchError(() => EMPTY)` swallows the error: `errorCode` stays `''`, `loading` flips to `false` via `finalize`, and the card renders the **normal** (non-error) content — heading `Cadastrar`, the welcome copy, and the enabled provider button — even though `this.invite` is unset; clicking the button in this state hits the `if (!this.invite) { return; }` early return, which leaves `loading = true` forever (the button spins indefinitely and nothing happens — ⚠ suspected defect, pathological branch)
- **Expected persistence:** N/A — no write is possible
- **Edge cases:** **unit-test-only today** — there is no harness hook to force a Firestore read failure (same class of blocker as UC-ASSIGN-21); documented so a future fault-injection extension knows the expected behaviour
- **Priority:** P2 · **Gaps:** blocked — requires a fault-injection harness extension; ⚠ suspected defect (the `loading` early-return branch)

### Session lifecycle

> The **UI logout flow** (the `SAIR` button on `/profile`, the `Sair` / `Você realmente deseja sair?`
> confirm dialog, and its cancel path) is owned by **UC-PROF-09 / UC-PROF-10** and deliberately not
> duplicated here. This section owns the app-level session mechanics.

#### UC-AUTH-22 — Forced logout on auth-state loss clears both state services and navigates to `/login`

- **Actor:** Any signed-in user
- **Route:** any (start on `/home`)
- **Preconditions (seed):** default baseline; `signInAs('admin')` → `page.goto('/home')` (so the guard resolves the user into `UserStateService`/`AuthUserStateService` — `isLoggedIn` must be `true` for the subscription to act)
- **Steps:** 1. from the rendered `/home`, drop the session without any UI logout: `await page.evaluate(() => (window as any).__E2E__.auth.signOut())` → 2. wait for the navigation
- **Expected UI:** `AuthService`'s constructor subscription to `authStateChanged()` sees a logged-in user disappear (`userState.isLoggedIn && !authStateChange`) and clears **both** `UserStateService` and `AuthUserStateService`; the header's `#profile-link` disappears (it is gated by `isLoggedIn`), but **current E2E reality** is that the URL remains `/home` and the `Login` heading does not render. ⚠ suspected defect: the subscription's `router.navigate(['/login'])` does not change the URL in this browser-level path.
- **Expected persistence:** N/A (client-side session only); assert `db.getDoc(db.collections.users, seed.ids.adminUser)` is unchanged — a session loss never touches the Firestore doc
- **Edge cases:** use the **client-side** `signOut()` hook for this — a server-side `db.auth.deleteUser(uid)` does **not** push to the open client in real time (the web SDK only discovers revocation on its next token refresh), so that variant would hang the assertion; also note `AuthService.logOut()` itself performs no navigation — the UI logout (UC-PROF-09) reaches `/login` through this very same subscription
- **Priority:** P1 · **Gaps:** none — uses the existing `__E2E__` hook; assert the URL with `await expect(page).toHaveURL(/\/login/)`

#### UC-AUTH-23 — The `isAuthenticating` full-viewport spinner replaces the router outlet during user resolution

- **Actor:** Any visitor hitting a guarded route with a live session
- **Route:** `/home`
- **Preconditions (seed):** default baseline; `signInAs('admin')` (session live, but `UserStateService` still empty)
- **Steps:** 1. `page.goto('/home')` → 2. observe the shell during guard resolution
- **Expected UI:** while `authGuard` awaits `resolveUserFromAuthProvider()`, `AuthService.isAuthenticating` is `true` and `app.component.html` renders the `.spinner` element **instead of** the `<router-outlet>`; once resolution completes (`finalize` sets it `false`), the outlet renders `/home` per UC-NAV-05
- **Expected persistence:** N/A (transient UI state)
- **Edge cases:** timing-sensitive — the spinner may be too fast to observe reliably against the local emulator; treat this as an assertion of the _mechanism_ (`app.component.html`'s `@if (authService.isAuthenticating())`) rather than a must-catch visual state, and never write spec synchronisation logic that depends on catching the spinner (use settled-state waits on the final URL/heading instead)
- **Priority:** P2 · **Gaps:** no `data-testid` on the spinner; overlap with UC-NAV-04 (same mechanism from the shell's perspective)

## Testability gaps (summary)

- **The OAuth popup is the fundamental blocker of this feature** (`signInWithPopup` on both `/login` and
  `/sign-in/:inviteId`): UC-AUTH-04/05/06/07 and UC-AUTH-17/18/19/20 are **manual-only legs** today. Their
  render-level and persistence-level pre/post-conditions are fully documented above so they can run as
  manual acceptance checks; the automatable approximations (`signInAs` + `goto`) are stated per entry.
  Consolidated, with candidate techniques, in
  [`../testability-gaps.md`](../testability-gaps.md).
- **No `invitation_links` harness support** — the collection is missing from `e2e/seed/collections.ts`,
  there is no factory, and the seeder never writes invites (UC-AUTH-14/16/17/18/19/20 all seed via the raw
  `db.firestore` escape hatch). See
  [`../test-catalog.md#harness-extensions-needed`](../test-catalog.md#harness-extensions-needed).
- **Zero `data-testid`s on any auth screen** — usable selectors today: `h1` text (`Login`, `Cadastrar`),
  `button.provider-login-button`, `a#profile-link`, `img[alt="MM Image"]`, and the verbatim pt-BR error
  paragraphs.
- **Documented current-behaviour-vs-defect items** (assert today's reality, not the intended one):
  UC-AUTH-09 (cold-state non-publisher hitting `/welcome` gets a **cancelled navigation**, not the
  warm-state `/home` redirect — UC-NAV-08 family), UC-AUTH-13 (`roles: ['*']` routes render anonymously —
  `roles-and-permissions.md §3.1`), UC-AUTH-21 (invite-load failure swallowed; the button-click early
  return then leaves `loading` stuck `true`), plus the dead `@default` error branch on the sign-in page
  (never assert `Um erro aconteceu ao tentar carregar seu convite.`).
- **Fault-injection scenarios** (UC-AUTH-21, like UC-ASSIGN-21) need a harness hook that does not exist —
  flagged as blocked rather than automated.

## Sources

- `apps/ministry-maps/src/app/core/features/auth/auth-routes.ts`
- `apps/ministry-maps/src/app/core/features/auth/models/enums/auth-routes.ts`
- `apps/ministry-maps/src/app/core/features/auth/pages/login-page/login-page.component.ts` / `.html`
- `apps/ministry-maps/src/app/core/features/auth/pages/welcome-page/welcome-page.component.ts`
- `apps/ministry-maps/src/app/core/features/auth/pages/no-account-page/no-account-page.component.ts`
- `apps/ministry-maps/src/app/core/features/auth/pages/sign-in-page/sign-in-page.component.ts` / `.html`
- `apps/ministry-maps/src/app/core/features/auth/services/auth.service.ts`
- `apps/ministry-maps/src/app/core/features/auth/guards/auth.guard.ts` (and `auth.guard.spec.ts`)
- `apps/ministry-maps/src/app/repositories/firebase/firebase-auth-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-invitation-link-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-user-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/auth.repository.ts`, `invitation-link.repository.ts`
- `apps/ministry-maps/src/app/features/users/bo/invite/invite-bo.service.ts`
- `apps/ministry-maps/src/app/features/users/components/invite-create-dialog/invite-create-dialog.component.ts`
- `apps/ministry-maps/src/app/state/user.state.service.ts`
- `libs/common-ui/src/lib/state/auth-user/auth-user.state.service.ts`
- `libs/common-ui/src/lib/components/provider-login-button/provider-login-button.component.ts`
- `apps/ministry-maps/src/app/app-routes.ts`, `src/app/app.component.html`
- `apps/ministry-maps/src/models/invitation-link.ts`, `user.ts`, `enums/role.ts`
- `apps/ministry-maps/e2e/fixtures/auth.fixture.ts`, `e2e/config/auth.config.ts`, `e2e/tests/smoke.spec.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`, `docs/domain/glossary.md`

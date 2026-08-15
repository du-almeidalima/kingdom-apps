# Navigation shell (`UC-NAV`)

Behavioral specifications for the application's root shell and main navigation hub. This covers the header, role-based access to the `/home` hub, and the behavior of the router when encountering unauthorized or unknown routes.

### Shell and Header

#### UC-NAV-01 — Authenticated header shows profile link
- **Actor:** Any signed-in user
- **Route:** `/home` (or any)
- **Preconditions (seed):** default baseline; `signInAs('publisher')`
- **Steps:** 1. Observe the header
- **Expected UI:** `Ministry Maps` title present; profile link `#profile-link` (title `Meu Perfil`) is visible
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-publisher-1')` exists with `role: 'PUBLISHER'`
- **Edge cases:** none
- **Priority:** P0 · **Gaps:** none

#### UC-NAV-02 — Anonymous header hides profile link
- **Actor:** Anonymous visitor
- **Route:** `/login`
- **Preconditions (seed):** default baseline
- **Steps:** 1. Open `/login` → 2. Observe the header
- **Expected UI:** `Ministry Maps` title present; profile link `#profile-link` is NOT rendered in the DOM
- **Expected persistence:** `db.auth` current user is null
- **Edge cases:** none
- **Priority:** P1 · **Gaps:** none

#### UC-NAV-03 — Logo navigates to home
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline; `signInAs('admin')`
- **Steps:** 1. click the `MM` logo/header link
- **Expected UI:** navigates to `/home`
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-admin').role === 'ADMIN'`
- **Edge cases:** none
- **Priority:** P1 · **Gaps:** none

#### UC-NAV-04 — Application loading state
- **Actor:** Any user
- **Route:** `/`
- **Preconditions (seed):** none
- **Steps:** 1. Open the app → 2. Observe the state while `isAuthenticating` is true
- **Expected UI:** A central spinner `.spinner` is visible; `router-outlet` is NOT rendered (shell hides content during auth resolution)
- **Expected persistence:** none (transient UI state)
- **Edge cases:** slow network simulated via emulator delay
- **Priority:** P2 · **Gaps:** none

### Home Hub Access

#### UC-NAV-05 — Authorized home hub shows greeting and navigation cards
- **Actor:** Admin (Carlos Almeida)
- **Route:** `/home`
- **Preconditions (seed):** default baseline (`seed-user-admin` name is `Carlos Almeida`); `signInAs('admin')`
- **Steps:** 1. Open `/home`
- **Expected UI:** Heading `Bem-Vindo Carlos!`; Two cards: `Designar Territórios` (with links `Designar Territórios`, `Administrar Territórios`, `Estatísticas Territórios`) and `Pessoas` (with link `Administrar Pessoas`)
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-admin')` has `name: 'Carlos Almeida'`, `role: 'ADMIN'`
- **Edge cases:** if name is a single token `Carlos`, greeting is `Bem-Vindo Carlos!`
- **Priority:** P0 · **Gaps:** no `data-testid` on cards or links; ORGANIZER/ELDER see the exact same UI as ADMIN (no template gating)
- **Sources:** `apps/ministry-maps/src/app/features/home/pages/home-page/home-page.component.ts`

#### UC-NAV-06 — Publisher restricted from admin areas (Redirect to Welcome)
- **Actor:** Publisher
- **Route:** `/home`
- **Preconditions (seed):** default baseline; `signInAs('publisher')`
- **Steps:** 1. Try to open `/home`
- **Expected UI:** Redirected to `/welcome`; heading `Bem-Vindo Ana!` (for `Ana Souza`); text "Sua conta foi criada com sucesso!" and instructions to contact an admin
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-publisher-1').role === 'PUBLISHER'`
- **Edge cases:** publisher trying to reach `/territories` or `/users` also redirects to `/welcome`
- **Priority:** P0 · **Gaps:** none

#### UC-NAV-07 — Anonymous restricted from home hub (Redirect to Login)
- **Actor:** Anonymous visitor
- **Route:** `/home`
- **Preconditions (seed):** default baseline
- **Steps:** 1. Try to open `/home` directly
- **Expected UI:** Redirected to `/login`
- **Expected persistence:** `db.auth` current user is null
- **Edge cases:** any guarded route (except Profile/Configuration due to defect) redirects to `/login`
- **Priority:** P0 · **Gaps:** none

### Router Behavior and Guards

#### UC-NAV-08 — Unauthorized role results in cancelled navigation (⚠ suspected defect)
- **Actor:** A user with a valid role that is NOT in the allowed list for a route
- **Route:** `/territories`
- **Preconditions (seed):** A user seeded with a custom role (e.g., `GUEST`) that is not in `ORGANIZER, ADMIN, ELDER, SUPERINTENDENT`
- **Steps:** 1. Sign in as the unauthorized user → 2. Try to open `/territories`
- **Expected UI:** Navigation is cancelled; previous URL is retained (if navigating from within) or shell renders with an empty router outlet (if deep-linking); no error message or redirect to a forbidden page
- **Expected persistence:** `db.getDoc(db.collections.users, id).role` is not in the allowed roles for the route
- **Edge cases:** user stays on a "broken" looking shell with only the header visible
- **Priority:** P1 · **Gaps:** `⚠ suspected defect`: should probably redirect to a 'Forbidden' page or show a toast; requires harness extension for custom roles
- **Sources:** `apps/ministry-maps/src/app/core/features/auth/guards/auth.guard.ts`

#### UC-NAV-09 — Unknown route behavior
- **Actor:** Any user
- **Route:** `/nao-existe`
- **Preconditions (seed):** none
- **Steps:** 1. Navigate to a non-existent path
- **Expected UI:** The shell renders with an empty router outlet; **current browser reality** is that the URL settles at `/` after the failed navigation; console shows `Error: Cannot match any routes`
- **Expected persistence:** none
- **Edge cases:** none
- **Priority:** P2 · **Gaps:** no 404 page exists; test should assert empty outlet and console error presence
- **Sources:** `apps/ministry-maps/src/app/app-routes.ts`

#### UC-NAV-10 — Anonymous can reach Profile and Configuration (⚠ suspected defect)
- **Actor:** Anonymous visitor
- **Route:** `/profile`
- **Preconditions (seed):** none
- **Steps:** 1. Navigate to `/profile` or `/configuration` while signed out
- **Expected UI:** Navigation succeeds (no redirect to `/login`); page shows empty/placeholder state (e.g., Profile shows no name/role)
- **Expected persistence:** `db.auth` current user is null
- **Edge cases:** `authGuard` short-circuits because `roles: ['*']` is evaluated before the login check
- **Priority:** P1 · **Gaps:** `⚠ suspected defect`: these routes should require authentication
- **Sources:** `apps/ministry-maps/src/app/core/features/auth/guards/auth.guard.ts`

### Smoke Navigation Links

#### UC-NAV-11 — Home link navigates to Territories list
- **Actor:** Admin
- **Route:** `/home`
- **Preconditions (seed):** default baseline; `signInAs('admin')`
- **Steps:** 1. click `Administrar Territórios` link
- **Expected UI:** URL becomes `/territories`; heading `territories-heading` (`data-testid`) is visible
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-admin').role === 'ADMIN'`
- **Edge cases:** none
- **Priority:** P0 · **Gaps:** none

#### UC-NAV-12 — Home link navigates to Assign Territories
- **Actor:** Admin
- **Route:** `/home`
- **Preconditions (seed):** default baseline; `signInAs('admin')`
- **Steps:** 1. click `Designar Territórios` link (inside the card)
- **Expected UI:** URL becomes `/territories/assign`; page renders the designation interface
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-admin').role === 'ADMIN'`
- **Edge cases:** none
- **Priority:** P0 · **Gaps:** no `data-testid` on Assign page heading
- **Sources:** `apps/ministry-maps/src/app/features/territory/pages/assign-territories-page/assign-territories-page.component.ts`

#### UC-NAV-13 — Home link navigates to Territories Statistics
- **Actor:** Admin
- **Route:** `/home`
- **Preconditions (seed):** default baseline; `signInAs('admin')`
- **Steps:** 1. click `Estatísticas Territórios` link
- **Expected UI:** URL becomes `/territories/statistics`; page renders statistics charts/metrics
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-admin').role === 'ADMIN'`
- **Edge cases:** none
- **Priority:** P0 · **Gaps:** no `data-testid` on Statistics page heading

#### UC-NAV-14 — Home link navigates to Users list
- **Actor:** Admin
- **Route:** `/home`
- **Preconditions (seed):** default baseline; `signInAs('admin')`
- **Steps:** 1. click `Administrar Pessoas` link
- **Expected UI:** URL becomes `/users`; page renders the users list
- **Expected persistence:** `db.getDoc(db.collections.users, 'seed-user-admin').role === 'ADMIN'`
- **Edge cases:** none
- **Priority:** P0 · **Gaps:** no `data-testid` on Users page heading

## Testability gaps (summary)

- **Selectors:** No `data-testid` on `/home` cards or links. No `data-testid` on the headings of `/territories/assign`, `/territories/statistics`, or `/users`.
- **Feedback:** Navigation to unauthorized routes (return `false` in guard) provides no user feedback, resulting in a "broken" shell state.
- **Routing:** Lack of a 404/Wildcard route means unknown paths fail silently in the UI with a console error.
- **Harness:** Testing non-standard roles (e.g. `GUEST`) or roles like `ELDER`/`ORGANIZER` requires extending the `signInAs` fixture and `ROLE_UIDS`.

## Sources

- `apps/ministry-maps/src/app/app.component.ts` / `.html`
- `apps/ministry-maps/src/app/shared/components/header/header.component.ts`
- `apps/ministry-maps/src/app/features/home/pages/home-page/home-page.component.ts` / `.html`
- `apps/ministry-maps/src/app/app-routes.ts`
- `apps/ministry-maps/src/app/features/home/home-routes.module.ts`
- `apps/ministry-maps/src/app/core/features/auth/guards/auth.guard.ts`
- `apps/ministry-maps/src/app/core/features/auth/pages/welcome-page/welcome-page.component.ts`
- `libs/common-ui/src/lib/directives/authorize/authorize.directive.ts`
- `libs/common-ui/src/lib/components/toaster/toaster.service.ts`

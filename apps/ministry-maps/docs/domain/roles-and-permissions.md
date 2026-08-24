# Roles, guards and permissions

Who can reach which route, which UI affordances they see, and exactly how the guard behaves — including
the places where the current behaviour is weaker than it looks.

---

## 1. Roles

`RoleEnum` (`src/models/enums/role.ts`), stored as a plain string on `users/{uid}.role`:

| Role             | pt-BR label (`getTranslatedRole`) | Intended meaning                                       |
| ---------------- | --------------------------------- | ------------------------------------------------------ |
| `APP_ADMIN`      | `App Admin.`                      | Application maintainer. **Bypasses every role check.** |
| `SUPERINTENDENT` | `Superintendente`                 | Circuit-level oversight; may switch congregation.      |
| `ADMIN`          | `Admin`                           | Congregation admin (usually the service overseer).     |
| `ELDER`          | `Ancião`                          | Elder.                                                 |
| `ORGANIZER`      | `Organizador`                     | Brother organising field-service group work.           |
| `PUBLISHER`      | `Publicador`                      | Regular publisher. **Cannot reach any admin route.**   |

A user written without a role is stored as `PUBLISHER` (`FirebaseUserDatasourceService.put`).

---

## 2. Route table

From `src/app/app-routes.ts` + `src/app/core/features/auth/auth-routes.ts` and each feature's
`*-routes.module.ts`.

| Route                                                            | Guard                           | `data.roles`                              | Effective access                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                                                         | —                               | —                                         | Everyone, including anonymous.                                                                                                                                 |
| `/welcome`                                                       | `canActivate: [authGuard]`      | `[PUBLISHER]`                             | Publishers (and `APP_ADMIN`). A signed-in non-publisher is redirected to `/home`. Anonymous → `/login`.                                                        |
| `/no-account`                                                    | —                               | —                                         | Everyone.                                                                                                                                                      |
| `/sign-in/:inviteId`                                             | —                               | —                                         | Everyone (invite landing page).                                                                                                                                |
| `/work/:id`                                                      | **none**                        | `['*']` (unused, no guard attached)       | **Everyone, including anonymous.** By design: publishers receive a bare link.                                                                                  |
| `/territories`, `/territories/assign`, `/territories/statistics` | `canActivateChild: [authGuard]` | `ORGANIZER, ADMIN, ELDER, SUPERINTENDENT` | Those roles + `APP_ADMIN`. Publisher → `/welcome`. Anonymous → `/login`.                                                                                       |
| `/home`                                                          | `canActivate: [authGuard]`      | `ORGANIZER, ADMIN, ELDER, SUPERINTENDENT` | Same as above.                                                                                                                                                 |
| `/users`                                                         | `canActivate: [authGuard]`      | `ORGANIZER, ADMIN, ELDER, SUPERINTENDENT` | Same as above.                                                                                                                                                 |
| `/profile`                                                       | `canActivate: [authGuard]`      | `['*']`                                   | **Everyone, including anonymous** (see §3.1).                                                                                                                  |
| `/configuration`                                                 | `canActivate: [authGuard]`      | `['*']`                                   | **Everyone, including anonymous** (see §3.1).                                                                                                                  |
| `''`                                                             | —                               | —                                         | Redirects to `/home` (which then applies the guard).                                                                                                           |
| unknown path                                                     | —                               | —                                         | **No wildcard route and no 404 component** → Angular logs an `Error: Cannot match any routes` and the shell renders with an empty router outlet (header only). |

`data.authGuardPipe: redirectUnauthorizedToLogin` is present on several routes but is **dead
configuration**: it belongs to `@angular/fire`'s `AuthGuard`, which is not used. Redirects come from the
custom `authGuard` only.

---

## 3. `authGuard` semantics

`src/app/core/features/auth/guards/auth.guard.ts`, evaluated in this exact order:

```
1. roles missing OR roles.includes('*')      → return true              (no login check!)
2. user already in UserStateService:
   2a. role === PUBLISHER && path !== 'welcome' → UrlTree(['welcome'])
   2b. path === 'welcome' && role !== PUBLISHER → UrlTree(['home'])
   2c. role === APP_ADMIN || roles.includes(role) → true, else false
3. no user in state → authService.resolveUserFromAuthProvider():
   3a. resolved user is falsy      → UrlTree(['login'])
   3b. resolved role === PUBLISHER → UrlTree(['welcome'])
   3c. APP_ADMIN || roles.includes(role) → true, else false
```

### 3.1 ⚠ Suspected defect — `roles: ['*']` short-circuits the login check

Step 1 returns `true` **before** any authentication check. Consequently `/profile` and `/configuration`
render for anonymous visitors (they show empty/placeholder state rather than redirecting to `/login`).

**Assert today's behaviour:** anonymous navigation to `/profile` and `/configuration` stays on that URL
(no redirect) and shows placeholder content. Do not write a test that expects a redirect to `/login`.

### 3.2 Returning `false` vs redirecting

Step 2c/3c return a **boolean**. A `false` result cancels the navigation without redirecting, so the
browser stays on the previous URL (or shows an empty outlet on a direct deep link). Only the publisher
and anonymous cases produce actual redirects.

### 3.3 Publisher lock-in

Any signed-in `PUBLISHER` hitting a guarded route is pushed to `/welcome` — including
`/territories/*`, `/users` and `/home`. `/work/:id` is unaffected (unguarded).

### 3.4 `APP_ADMIN` bypass

`canAccessRoute` returns `true` whenever `user.role === APP_ADMIN`, regardless of `data.roles`.
Note step 2a is evaluated _before_ it, but an `APP_ADMIN` is never a `PUBLISHER`, so there is no conflict.

---

## 4. In-template authorization — `*libAuthorize`

`libs/common-ui/src/lib/directives/authorize/authorize.directive.ts`:

- Input: a role string or array — `*libAuthorize="[RoleEnum.ADMIN]"`.
- Reads `AuthUserStateService` (a **separate**, common-ui-scoped state holding `{ roles, name }`), which
  `AuthService` fills on sign-in / user resolution / server refresh.
- Empty or missing roles → content is rendered.
- **No user → content is cleared.** So on `/profile` and `/configuration` an anonymous visitor sees no
  role-gated blocks at all.
- Renders when any directive role matches, or when the user has `APP_ADMIN`.
- Evaluated **once in `ngOnInit`** — it is not reactive. If the role changes later, the affordance does not
  appear/disappear until the view is recreated (navigate away and back, or reload).

### Role-gated affordances

| Affordance                                                      | Location                                                                | Allowed roles                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Territories page overflow menu (sort/filter, export CSV, …)     | `territories-page.component.html`                                       | `APP_ADMIN, SUPERINTENDENT, ADMIN`                                          |
| Territory list-item menu: edit, alerts block, separator, delete | `territory-list-item.component.ts` (`EDIT_ALLOWED`)                     | `ADMIN, ELDER, SUPERINTENDENT` (+ `APP_ADMIN` bypass) — **not** `ORGANIZER` |
| User list-item overflow menu (edit / remove)                    | `user-list-item.component.ts`                                           | `APP_ADMIN, SUPERINTENDENT, ADMIN`                                          |
| "Criar Link de Convite" FAB                                     | `users-page.component.html` (`CREATE_INVITE_LINK_ALLOWED`)              | `ADMIN` (+ `APP_ADMIN` bypass)                                              |
| Congregation switch on profile                                  | `profile-page.component.html` (`ProfileBO.CHANGE_CONGREGATION_ALLOWED`) | `APP_ADMIN, SUPERINTENDENT`                                                 |
| Congregation cities editing                                     | `configuration-roles.config.ts` (`EDIT_CONGREGATION_CONFIGURATION`)     | `ADMIN` (+ `APP_ADMIN` bypass)                                              |

`ProfileBO.changeUserCongregation` also enforces the rule in code: it throws
`Changing congregations is not authorized by Non-Admin users.` for any role outside
`[APP_ADMIN, SUPERINTENDENT]`.

---

## 5. Role → feature matrix

Read as "can reach and use":

| Feature / route              | PUBLISHER    | ORGANIZER | ELDER     | ADMIN     | SUPERINTENDENT | APP_ADMIN | anonymous             |
| ---------------------------- | ------------ | --------- | --------- | --------- | -------------- | --------- | --------------------- |
| `/login`                     | ✔            | ✔         | ✔         | ✔         | ✔              | ✔         | ✔                     |
| `/welcome`                   | ✔            | → `/home` | → `/home` | → `/home` | → `/home`      | ✔         | → `/login`            |
| `/work/:id`                  | ✔            | ✔         | ✔         | ✔         | ✔              | ✔         | ✔                     |
| `/home`                      | → `/welcome` | ✔         | ✔         | ✔         | ✔              | ✔         | → `/login`            |
| `/territories` (list, CRUD)  | → `/welcome` | ✔         | ✔         | ✔         | ✔              | ✔         | → `/login`            |
| ↳ overflow menu (filter/CSV) | –            | ✖ hidden  | ✖ hidden  | ✔         | ✔              | ✔         | –                     |
| `/territories/assign`        | → `/welcome` | ✔         | ✔         | ✔         | ✔              | ✔         | → `/login`            |
| `/territories/statistics`    | → `/welcome` | ✔         | ✔         | ✔         | ✔              | ✔         | → `/login`            |
| `/users` (list)              | → `/welcome` | ✔         | ✔         | ✔         | ✔              | ✔         | → `/login`            |
| ↳ edit / delete user menu    | –            | ✖ hidden  | ✖ hidden  | ✔         | ✔              | ✔         | –                     |
| ↳ create invite link         | –            | ✖ hidden  | ✖ hidden  | ✔         | ✖ hidden       | ✔         | –                     |
| `/profile`                   | ✔            | ✔         | ✔         | ✔         | ✔              | ✔         | ✔ (placeholders)      |
| ↳ change congregation        | ✖ hidden     | ✖ hidden  | ✖ hidden  | ✖ hidden  | ✔              | ✔         | ✖ hidden              |
| `/configuration`             | ✔ ⚠          | ✔         | ✔         | ✔         | ✔              | ✔         | ✔ ⚠ (no congregation) |

⚠ `/configuration` uses `roles: ['*']`, so even a `PUBLISHER` reaches it directly by URL — the guard's
publisher redirect is never reached because step 1 returns first.

---

## 6. Testing identities

`signInAs(role)` mints a custom token for `ROLE_UIDS[role]`. One baseline user per role is seeded (HX-1,
landed in WP-01):

| Fixture role       | uid                        | `RoleEnum`       |
| ------------------ | -------------------------- | ---------------- |
| `'admin'`          | `seed-user-admin`          | `ADMIN`          |
| `'publisher'`      | `seed-user-publisher-1`    | `PUBLISHER`      |
| `'elder'`          | `seed-user-elder`          | `ELDER`          |
| `'organizer'`      | `seed-user-organizer`      | `ORGANIZER`      |
| `'superintendent'` | `seed-user-superintendent` | `SUPERINTENDENT` |
| `'app_admin'`      | `seed-user-app-admin`      | `APP_ADMIN`      |

Sign-in through the UI uses `signInWithPopup` against a real OAuth provider and is **not automatable** —
use `signInAs` (custom token) for everything except the login-screen rendering tests.

Logging out is testable: `AuthService` subscribes to `authStateChanged` and, when a previously logged-in
user disappears, clears both state services and navigates to `/login`.

---

## Sources

- `apps/ministry-maps/src/app/app-routes.ts`
- `apps/ministry-maps/src/app/core/features/auth/auth-routes.ts`
- `apps/ministry-maps/src/app/core/features/auth/guards/auth.guard.ts`
- `apps/ministry-maps/src/app/core/features/auth/services/auth.service.ts`
- `apps/ministry-maps/src/app/features/{territory,home,users}/*-routes.module.ts`
- `apps/ministry-maps/src/app/features/users/config/users-roles.config.ts`
- `apps/ministry-maps/src/app/features/configuration/config/configuration-roles.config.ts`
- `apps/ministry-maps/src/app/features/profile/bo/profile.bo.ts`
- `libs/common-ui/src/lib/directives/authorize/authorize.directive.ts`
- `libs/common-ui/src/lib/state/auth-user/auth-user.state.service.ts`
- `apps/ministry-maps/e2e/config/auth.config.ts`

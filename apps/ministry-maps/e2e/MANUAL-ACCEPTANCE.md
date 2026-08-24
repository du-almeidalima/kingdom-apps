# Ministry Maps E2E — manual acceptance

Run this checklist before a release until OAuth-popup automation is adopted. Use the real
`signInWithPopup` flow; `signInAs`/custom-token authentication does not verify these branches. Record the
release/build, browser, tester, and date with the results.

- **Release/build:**
- **Browser:**
- **Tester:**
- **Date:**

## Login outcomes

### UC-AUTH-04 — Provider sign-in as a known `PUBLISHER` lands on `/welcome`

- **Preconditions (seed):** default baseline
- **Steps (manual):** 1. open `/login` → 2. click `Entrar com uma conta do Google` → 3. complete the popup with the Google account whose email is `seed-user-publisher-1@example.com`
- **Expected UI:** after the popup closes, `signInWithPopup` resolves, `users/{uid}` is read **from the server** (`getDocFromServer`), both state services are populated, and — because `user.role === RoleEnum.PUBLISHER` — the page navigates to `/welcome` (not `/home`); the welcome content of UC-AUTH-08 renders
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.publisherUsers[0]).role === 'PUBLISHER'`; no write occurs on this path (an existing user doc is only read)
- **Result:** ☐ Pass ☐ Fail

### UC-AUTH-05 — Provider sign-in as a known non-publisher lands on `/home`

- **Preconditions (seed):** default baseline
- **Steps (manual):** 1. open `/login` → 2. complete the Google popup with `carlos.almeida@example.com`
- **Expected UI:** same flow as UC-AUTH-04, but `user.role === 'ADMIN'` → navigates to `/home`; the home hub renders per UC-NAV-05 (`Bem-Vindo Carlos!`); every non-`PUBLISHER` role (`ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN`) lands identically on `/home`
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'`; no write
- **Result:** ☐ Pass ☐ Fail

### UC-AUTH-06 — Provider sign-in with an unknown account deletes the Auth account and lands on `/no-account`

- **Preconditions (seed):** default baseline; the popup account's uid must not exist in `users`
- **Steps (manual):** 1. open `/login` → 2. complete the popup with any unknown Google account
- **Expected UI:** `handleUserAuthentication` finds no user doc and — because the login page passes `createUser = false` (the default) — **deletes the just-created Firebase Auth account** (`providerUser.delete()`, which also signs the user out), then emits a falsy value; the login page navigates to `/no-account`; the `/no-account` content of UC-AUTH-10 renders
- **Expected persistence:** no `users` doc is ever created (collection still has the 8 baseline users); `db.auth.getUser(<uid>)` throws `auth/user-not-found` — the Auth account is **gone**, not merely signed out (this deletion is deliberate: uninvited popup sign-ins must not pollute the Auth user base)
- **Result:** ☐ Pass ☐ Fail

### UC-AUTH-07 — Cancelling or erroring the popup keeps the user on `/login`

- **Preconditions (seed):** none
- **Steps (manual):** 1. open `/login` → 2. click the Google button → 3. close the popup without choosing an account
- **Expected UI:** the `signInWithProvider` observable errors (`auth/popup-closed-by-user`); `LoginPageComponent`'s `subscribe` has **no error handler**, so nothing navigates and nothing renders an error — the user simply stays on `/login`; `finalize` still resets `loading`, re-enabling the button (the spinner disappears)
- **Expected persistence:** no Auth account is created for a cancelled popup; `db.getCollectionDocs(db.collections.users)` unchanged
- **Result:** ☐ Pass ☐ Fail

## Invite redemption matrix

### UC-AUTH-17 — Successful invite sign-in creates the users doc, consumes the invite, and lands per role

- **Preconditions (seed):** valid invite as in UC-AUTH-14 with `email: 'novo.irmao@example.com'`, `role: 'ORGANIZER'`; the popup account's email must be exactly `novo.irmao@example.com` and must not already exist in `users`
- **Steps (manual):** 1. open `/sign-in/invite-valid` → 2. click `Entrar com uma conta do Google` → 3. complete the popup with the matching account
- **Expected UI:** `signInWithProvider(provider, true, { inviteId, role: 'ORGANIZER', email: 'novo.irmao@example.com', congregation })` runs; the client-side email check passes (compared case-insensitively on both sides); the user profile is provisioned **server-side** by the `provisionUserFromInvite` Cloud Function (client-side `users` creation is denied by the Firestore rules); the invite is consumed atomically in the same transaction; because the new user's role is `ORGANIZER` (not `PUBLISHER`), the page navigates to **`/home`** — a `PUBLISHER`-role invite would land on `/welcome` instead
- **Expected persistence:** the callable creates `users/{uid}` with the invite's role + congregation (reference) and the auth token's email/name/photo; the invite doc gets `isValid: false`, `usedAt` ≈ now (server timestamp), `usedBy: 'novo.irmao@example.com'` via a field-level `transaction.update` — only those three fields change (no full-doc overwrite)
- **Result:** ☐ Pass ☐ Fail

### UC-AUTH-18 — A mismatched invite email deletes the Auth account and surfaces INVALID_EMAIL

- **Preconditions (seed):** valid invite with `email: 'novo.irmao@example.com'`; the popup account's email is anything else
- **Steps (manual):** 1. open the link → 2. complete the popup with the mismatching account
- **Expected UI:** `handleUserAuthentication` finds no user doc, the case-insensitive email comparison fails, the **Auth account is deleted**, and `Error(AuthErrorEnum.INVALID_EMAIL)` is thrown; the page's `catchError` maps it to `errorCode = 'INVALID_EMAIL'` → the error block renders `Esse link não está associado a esse email.` + `Por favor, peça para um administrador criar outro link para você.`; the provider button disappears (same `@else` suppression as INVALID_LINK), so the invitee cannot retry without reloading the page
- **Expected persistence:** `db.auth.getUser(<uid>)` throws `auth/user-not-found` (account deleted); **no** `users` doc created; the invite doc is **untouched** (`isValid` still `true` — consumption only happens on success)
- **Result:** ☐ Pass ☐ Fail

### UC-AUTH-19 — An invite without an email is redeemable by any Google account

- **Preconditions (seed):** valid invite **without** the `email` field (it is optional — `InviteBO.createInviteLink` writes `email: email ?? undefined`)
- **Steps (manual):** 1. open the link → 2. complete the popup with any unknown Google account
- **Expected UI:** the email guard is skipped entirely when `createUserConfig.email` is falsy; the flow proceeds exactly like UC-AUTH-17 (user created with the invite's role/congregation, invite consumed, landing per role)
- **Expected persistence:** same contract as UC-AUTH-17, with the popup account's own email/name on the new doc
- **Result:** ☐ Pass ☐ Fail

### UC-AUTH-20 — An existing user redeeming an invite keeps their existing doc and role; the invite stays valid

- **Preconditions (seed):** valid invite with `role: 'PUBLISHER'` and **no** email restriction; the popup account is the admin's (`carlos.almeida@example.com`, existing `ADMIN` doc)
- **Steps (manual):** 1. open the link → 2. complete the popup with the existing account
- **Expected UI:** `handleUserAuthentication` finds the existing doc and returns it **as-is** — the invite's role/congregation are **not** applied; the `provisionUserFromInvite` callable is never reached (the existing profile short-circuits), so the invite **stays valid**; the page navigates by the **existing** role (`ADMIN` → `/home`, not `/welcome`)
- **Expected persistence:** the existing `users/{uid}` doc is byte-for-byte unchanged (role stays `ADMIN`); the invite doc is **untouched** (`isValid` still `true` — no `usedAt`/`usedBy`)
- **Result:** ☐ Pass ☐ Fail

## Not verifiable without fault injection

- `UC-AUTH-21` — invite-load repository failure: **not verifiable without fault injection**.
- `UC-ASSIGN-21` — designation write failure: **not verifiable without fault injection**.

HX-4 is deliberately deferred. These entries remain documented risks and candidates for unit/integration coverage.

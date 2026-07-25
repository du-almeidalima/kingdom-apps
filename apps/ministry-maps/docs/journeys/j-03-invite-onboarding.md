# J-03 — Invite onboarding: creation, valid open, consumed re-open, wrong-email attempt

- **Priority:** P0 — the only way new users join a congregation; every leg is either fully automatable or
  explicitly marked manual-only.
- **Identities:** `Admin` (`signInAs('admin')`) → `anonymous` (the invitee).
- **Suggested spec file:** `e2e/tests/journey-invite-onboarding.spec.ts`.
- **Composes:** UC-USERS-10, UC-USERS-11, UC-USERS-13, UC-AUTH-14, UC-AUTH-16, UC-AUTH-17 (✋ manual),
  UC-AUTH-18 (✋ manual), UC-AUTH-22.

## Seed

Default baseline. Invite documents are read/written via the raw `db.firestore.collection('invitation_links')`
escape hatch (note the **underscore**) — ⚙ HARNESS-EXTENSION: no `Collections` entry, no
`buildInvitationLink` factory, no seeder support today (see
[`../test-catalog.md#harness-extensions-needed`](../test-catalog.md#harness-extensions-needed)).

## Script

### Leg 1 — Admin creates an invite for an Organizer

1. `signInAs('admin')` → `page.goto('/users')` → click the FAB (`title="Criar Link de Convite"` —
   UC-USERS-10).
2. In the dialog `Criar Link de Convite`: keep the pre-selected `Organizador` radio (the default —
   UC-USERS-11), type `novo.organizador@example.com` into `Email (opcional)`, click `Criar Link`.
3. The dialog swaps to the copy-link view: heading `Link de convite criado`, paragraph
   `Compartilhe esse link com o irmão que vai acessar o aplicativo.`, and a `lib-copy-text-block` showing
   `${baseUrl}sign-in/{inviteId}` with help text `Esse link só pode ser usado uma vez.` (UC-USERS-13).
   Capture `{inviteId}` from the rendered link text (or query Firestore:
   `db.firestore.collection('invitation_links').where('createdBy', '==', 'carlos.almeida@example.com')`).

⟶ **HAND-OFF (Firestore):** the new `invitation_links/{inviteId}` doc has `role === 'ORGANIZER'`,
`email === 'novo.organizador@example.com'`, `isValid === true`, `createdBy === 'carlos.almeida@example.com'`
(the **email**, not the uid), a `createdAt` `Timestamp`, and `congregation` stored as a **Firestore
`DocumentReference`** pointing at `congregations/seed-congregation` (creation-time shape — see the
shape-drift caveat in [`../domain/data-model.md §2.6`](../domain/data-model.md#26-invitationlink--srcmodelsinvitation-linkts)).

### Leg 2 — Invitee opens the valid link

4. Switch identity to anonymous: `await page.evaluate(() => (window as any).__E2E__.auth.signOut())` →
   the app lands on `/login` (UC-AUTH-22).
5. `page.goto('/sign-in/' + inviteId)` (UC-AUTH-14).
6. Assert the `Cadastrar` heading, the welcome copy `Bem vindo ao Ministry Maps ou MM!` /
   `Parar criar uma conta, clique no botão a baixo.` (both *sic*), and the **enabled** button
   `Entrar com uma conta do Google`; assert **no** error paragraph renders.

⟶ **HAND-OFF (Firestore):** the invite doc is untouched — `isValid` still `true`, no `usedAt`/`usedBy`
(rendering never consumes).

### Leg 3 — Successful redemption (✋ MANUAL-ONLY) and its automated simulation

7. ✋ **MANUAL-ONLY (UC-AUTH-17):** click `Entrar com uma conta do Google` and complete the popup with the
   Google account whose email is `novo.organizador@example.com`. Expected: a `users/{uid}` doc is created
   with `role: 'ORGANIZER'` and `congregation` referencing `seed-congregation`; the invite flips to
   `isValid: false` with `usedAt` ≈ now and `usedBy: 'novo.organizador@example.com'`; the user lands on
   `/home` (non-publisher role). The OAuth popup is not automatable today — see
   [`../testability-gaps.md`](../testability-gaps.md).
8. **Automated simulation (keeps the journey executable in CI):** mark the invite as consumed directly —
   `db.firestore.doc('invitation_links/' + inviteId).update({ isValid: false, usedAt: new Date(),
   usedBy: 'novo.organizador@example.com' })`. Add a comment in the spec: *"simulates UC-AUTH-17, which is
   manual-only; replace with the real popup flow if the suite ever adopts emulator popup automation."*

⟶ **HAND-OFF (Firestore):** `(await db.firestore.doc('invitation_links/' + inviteId).get()).data()` —
`isValid === false`, `usedAt`/`usedBy` set.

### Leg 4 — Re-opening the consumed link shows `INVALID_LINK`

9. Still anonymous, `page.goto('/sign-in/' + inviteId)` again (UC-AUTH-16).
10. Assert the error block: `Esse link de convite não é mais válido.` followed by
    `Por favor, peça para um administrador criar outro link para você.`; the `Cadastrar` heading still
    renders, but the Google button is **absent** (it lives in the `@else` branch).

⟶ **HAND-OFF (Firestore):** the invite doc is unchanged (still consumed) — the page performs no write.

### Leg 5 — Wrong-email attempt on a fresh invite (✋ MANUAL-ONLY)

11. Repeat legs 1–2 to create a **second** invite, this time with `Email (opcional)` =
    `especifico@example.com`, and open its link anonymously.
12. ✋ **MANUAL-ONLY (UC-AUTH-18):** complete the popup with a **different** Google account
    (`outra.pessoa@example.com`). Expected: the Auth account is **deleted**, the page shows
    `Esse link não está associado a esse email.` + `Por favor, peça para um administrador criar outro link
    para você.`, the button disappears (no retry without reload), the invite stays `isValid: true`
    (consumption only happens on success), and no `users` doc is created.
13. **Automated partial alternative:** none — the `INVALID_EMAIL` branch only fires from the popup flow.
    The closest automated coverage of this leg's building blocks is UC-AUTH-15 (missing invite → same
    error-block anatomy) plus the unit tests in `firebase-auth-datasource.service.spec.ts`.

⟶ **FINAL SWEEP (Firestore):** `db.getCollectionDocs(db.collections.users)` still has the 4 baseline docs
(no invitee doc was created by any automated leg); the first invite doc is consumed, the second (if the
manual leg ran) still valid.

## Testability notes

- **Gaps:** ⚙ `invitation_links` harness extension (factory + `Collections` entry + seeder support);
  ✋ OAuth popup legs (steps 7 and 12) are manual-only — everything else runs unattended.
- Do not click `Entrar com uma conta do Google` in an automated spec (see
  [`auth-onboarding.md`](../features/auth-onboarding.md) header note); the button's **presence/absence**
  is the automatable signal used in legs 2 and 4.
- If leg 1 additionally asserts the clipboard copy (UC-USERS-13's icon click), grant permissions first:
  `context.grantPermissions(['clipboard-read', 'clipboard-write'])` — optional here; the journey only reads
  the rendered link text.
- The `Enviar` (WhatsApp) button on the copy-link view is out of scope for this journey (UC-USERS-14 —
  `window.open` with a `whatsapp://` URL; see [`../testability-gaps.md`](../testability-gaps.md)).

## Sources

- `docs/features/users-invites.md` (UC-USERS-10/11/13/14)
- `docs/features/auth-onboarding.md` (UC-AUTH-14/15/16/17/18/22)
- `docs/domain/data-model.md` (§2.6 invitation-link shape drift)
- `apps/ministry-maps/e2e/fixtures/auth.fixture.ts`

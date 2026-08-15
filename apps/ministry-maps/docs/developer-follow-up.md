# Ministry Maps — developer follow-up register

This is the developer-facing backlog derived from the completed E2E sweep on **2026-08-12**. It
tracks all **42 documented current-behaviour concerns** plus the remaining release and engineering
checks. The suite was green with **183 passed and 1 accepted `test.fixme`**, but many tests
intentionally lock in today's undesirable behaviour. A green `⚠` test therefore means "the known
issue is still present", not "nothing needs attention".

Sources of truth:

- [`testability-gaps.md` §3](./testability-gaps.md#3-documented-current-behaviour-vs-suspected-defects)
  contains the detailed current-versus-intended behaviour.
- [`test-catalog.md`](./test-catalog.md) maps each use case to its E2E coverage and existing P0/P1/P2
  test priority.
- [`../e2e/MANUAL-ACCEPTANCE.md`](../e2e/MANUAL-ACCEPTANCE.md) contains the executable OAuth
  release checklist.

## How to use this register

The **score is an engineering triage recommendation**, independent of the catalog's test-automation
priority:

| Score | Meaning |
|---|---|
| 9–10 | Address immediately: authorization exposure, likely data loss, or a broken core workflow. |
| 7–8 | High: significant functional or reliability impact, usually with limited scope or a workaround. |
| 5–6 | Medium: incorrect output or degraded UX with contained impact. |
| 1–4 | Low: polish, dead code, documentation drift, or optional usability work. |

Evidence labels:

- `⚠ E2E` — an automated test currently proves and preserves the issue.
- `⏸ HX-4` — the failure scenario is documented but needs fault injection before it can be automated.
- `✋ Manual` — the real Google OAuth popup boundary is covered by manual acceptance only.
- `⏭ Fixme` — an intentionally skipped test records unreachable/dead behaviour.
- `📝 Review` — found during source/catalog review; no direct browser assertion is appropriate.

## Immediate follow-ups — score 9–10

| Done | Score | Evidence | References | Issue and developer action/check |
|---|---:|---|---|---|
| ☐ | 10 | `⚠ E2E` | Gap #19 · `UC-WORK-23` | **Visit completion can overwrite `recentHistory`.** Merge against authoritative history instead of replacing it with the designation snapshot; verify unrelated entries survive. |
| ☐ | 10 | `⚠ E2E` | Gap #23 · `UC-USERS-09` | **Deleting a user leaves their Firebase Auth account active.** Await/subscribe to the callable deletion and verify both Firestore and Auth records are removed, including partial-failure handling. |
| ☐ | 10 | `⚠ E2E` | Gap #29 · `UC-AUTH-13`, `UC-PROF-03`, `UC-CFG-12`, `UC-NAV-10` | **`roles: ['*']` bypasses authentication.** Check authentication before wildcard role authorization and verify anonymous users are redirected from `/profile` and `/configuration`. |
| ☐ | 10 | `⚠ E2E` | Gap #31 · `UC-CFG-13` | **Configuration authorization is not enforced.** Wire `EDIT_CONGREGATION_CONFIGURATION` into the UI/route and verify backend rules also prevent a publisher from persisting city changes. |
| ☐ | 10 | `⚠ E2E` | Gap #16 · `UC-WORK-04` | **A designation territory without `history` leaves the work page loading forever.** Normalize to `(history ?? [])` and render a recoverable error for malformed data. |
| ☐ | 9 | `⚠ E2E` | Gap #7 · `UC-TERR-31` | **Resolving an alert truncates unrelated `recentHistory`.** Update only matching entries and verify all unrelated recent visits remain intact. |
| ☐ | 9 | `⚠ E2E` | Gap #5 · `UC-TERR-20` | **Territory deletion orphans its history subcollection.** Choose cascade deletion or intentional retention, then test cleanup/retention and access implications explicitly. |
| ☐ | 9 | `⏸ HX-4` | Gap #14 · `UC-ASSIGN-21` | **Failed designation creation still looks assigned.** Roll back optimistic checkbox state, re-enable controls, and surface an actionable error when persistence fails. |
| ☐ | 9 | `⚠ E2E` + `✋ Manual` | Gap #25 · `UC-AUTH-17` | **Invitation `congregation` changes shape during consumption.** Adopt one canonical schema (preferably `DocumentReference`), avoid full-document shape drift, and plan migration compatibility. |
| ☐ | 9 | `⚠ E2E` | Gap #32 · `UC-CFG-10`, `J-05` | **Deleting a city leaves territories with an invisible stale city.** Block deletion, migrate affected territories, or require an explicit replacement city. |
| ☐ | 9 | `⚠ E2E` + `⏸ HX-4` | Gap #34 · `UC-CFG-08` | **City rename persistence is non-atomic.** Make congregation and territory updates atomic where practical, or add reconciliation; fault-test every partial-failure boundary. |
| ☐ | 9 | `⚠ E2E` | Gap #41 · `UC-AUTH-22` | **Forced auth-state loss leaves the browser on `/home`.** Clear state and complete navigation to `/login`; verify protected content cannot remain visible. |

## High-priority follow-ups — score 7–8

| Done | Score | Evidence | References | Issue and developer action/check |
|---|---:|---|---|---|
| ☐ | 8 | `⚠ E2E` | Gap #2 · `UC-TERR-04`, `UC-ASSIGN-04` | **An empty `cities` array breaks territory and assignment screens.** Use a real empty-state fallback instead of selecting `cities[0]`, and verify both routes remain usable. |
| ☐ | 8 | `⚠ E2E` | Gap #10 · `UC-ASSIGN-16` | **Designation history snapshots can contain an arbitrary five visits.** Order by visit date before taking the newest five. |
| ☐ | 8 | `⚠ E2E` | Gap #12 · `UC-ASSIGN-19` | **Designation links use `location.origin` while invites use configured `baseUrl`.** Select one canonical URL source and verify production, beta, and local links. |
| ☐ | 8 | `⚠ E2E` | Gap #18 · `UC-WORK-21`, `J-06` | **Non-blocking expiry still disables work controls.** Apply `shouldDesignationBlockAfterExpired` consistently to checkbox, edit, undo, history, and maps actions. |
| ☐ | 8 | `⚠ E2E` | Gap #22 · `UC-USERS-05` | **Non-`APP_ADMIN` user editing is always disabled.** Correct the role condition or clarify the intended policy, then verify authorized edits persist and unauthorized edits cannot submit. |
| ☐ | 8 | `⏸ HX-4` | Gap #35 · `UC-AUTH-21` | **Invite-load failures render a normal card and can wedge loading forever.** Add an explicit error/retry state and always clear loading on repository failure. |
| ☐ | 7 | `⚠ E2E` | Gap #1 · `UC-TERR-27` | **Operational alert badges disappear when `note` is empty.** Decouple alert visibility from notes so `Mudou`, `Não quer visitas`, and revisit states remain visible. |
| ☐ | 7 | `⚠ E2E` | Gap #21 · `UC-STAT-03` | **`Mudaram` ignores unresolved moves outside capped `recentHistory`.** Calculate from authoritative history or maintain a dedicated unresolved-state field. |
| ☐ | 7 | `⚠ E2E` | Gap #33 · `UC-CFG-11`, `J-05` | **City filters remain stale after saving configuration.** Refresh `UserStateService` after persistence and verify SPA navigation sees the new cities without reload. |
| ☐ | 7 | `⚠ E2E` | Gap #42 · `UC-STAT-13`, `J-08` | **Statistics hangs for congregations with zero territories.** Return an empty observable result (for example `of([])`) instead of waiting on `combineLatest([])`. |

## Medium-priority follow-ups — score 5–6

| Done | Score | Evidence | References | Issue and developer action/check |
|---|---:|---|---|---|
| ☐ | 6 | `⚠ E2E` | Gap #4 · `UC-TERR-16` | **Re-enabling Bible-study status wipes the typed instructor.** Reset the instructor only when disabling the status, or require explicit confirmation before discarding input. |
| ☐ | 6 | `⚠ E2E` | Gap #6 · `UC-TERR-28` | **Visit history has no deterministic ordering or limit.** Add a date order and decide whether the dialog should paginate/cap large histories. |
| ☐ | 6 | `⚠ E2E` | Gap #15 · `UC-WORK-03` | **An encoded slash in a designation ID crashes to a blank page.** Validate route IDs and convert malformed Firestore paths into a not-found/error state. |
| ☐ | 6 | `⚠ E2E` | Gap #17 · `UC-WORK-19` | **Maps navigation replaces the app tab on Chromium.** Standardize a new-tab/external-navigation policy and verify browser-specific branches. |
| ☐ | 6 | `⚠ E2E` | Gap #20 · `UC-STAT-01` | **`peopleQuantity: 0` is counted as one person.** Replace truthy fallback logic with a nullish/default check and preserve valid zeroes. |
| ☐ | 6 | `⚠ E2E` | Gap #27 · `UC-PROF-08` | **Congregation-switch errors are swallowed.** Restore the selection and show a clear error/toast with a retry path. |
| ☐ | 6 | `⚠ E2E` | Gap #30 · `UC-NAV-08`, `UC-AUTH-09` | **Denied navigation fails silently or leaves an empty outlet.** Route to a forbidden/login screen or display permission feedback consistently. |
| ☐ | 5 | `⚠ E2E` | Gap #8 · `UC-TERR-33` | **Stored map links cannot be opened from `/territories`.** Decide whether to add the same maps affordance available in assign/work views. |

## Low-priority follow-ups — score 1–4

| Done | Score | Evidence | References | Issue and developer action/check |
|---|---:|---|---|---|
| ☐ | 4 | `⚠ E2E` | Gap #3 · `UC-TERR-12` | **The fresh-load active-filter badge starts at `1`.** Decide whether defaults count as active filters; if not, use the configured baseline as zero. |
| ☐ | 4 | `⚠ E2E` | Gap #9 · `UC-ASSIGN-12` | **Assignment has no selected-territory count.** Add a visible count if users need confirmation before submitting large selections. |
| ☐ | 4 | `⚠ E2E` | Gap #13 · `UC-ASSIGN-20` | **Designation sharing has no copy-to-clipboard action.** Add copy feedback alongside WhatsApp sharing if cross-channel sharing is required. |
| ☐ | 4 | `⚠ E2E` | Gap #24 · `UC-USERS-11` | **Blank optional invite email is stored as `''`.** Normalize blank input to an absent field and verify old records remain readable. |
| ☐ | 3 | `⏭ Fixme` | Gap #28 · `UC-PROF-07` | **The no-congregation switch guard is unreachable.** Remove the dead branch or make the state representable, then replace the accepted `test.fixme` with an executable test. |
| ☐ | 3 | `⚠ E2E` | Gap #36 · `UC-CFG-06`, `UC-CFG-07` | **`/configuration` is the only English screen.** Localize its labels, confirm dialog, and toasts to pt-BR, then update verbatim E2E assertions. |
| ☐ | 3 | `⚠ E2E` | Gap #37 · `UC-AUTH-14` | **The sign-in page contains `Parar criar…` / `a baixo` typos.** Correct the copy and update the intentional verbatim assertion. |
| ☐ | 3 | `📝 Review` | Gap #40 · `UC-AUTH-15` | **The generic invite-load error branch is unreachable.** Route unknown failures to it or remove the dead copy after the error model is clarified. |
| ☐ | 2 | `📝 Review` | Gap #11 · `UC-ASSIGN-18` | **The batching comment cites Firestore's old limit.** Update the comment from 10 to the current limit of 30 without changing deliberate batch sizing unless separately justified. |
| ☐ | 2 | `⚠ E2E` | Gap #26 · `UC-AUTH-16` | **The `isValid` comment says consumption sets it to `true`, while code sets `false`.** Correct the model documentation and retain `false === consumed`. |
| ☐ | 2 | `📝 Review` | Gap #38 · `UC-AUTH-02` | **The provider button resolves its provider before `@Input` initialization.** Make provider selection reactive before introducing any non-Google provider. |
| ☐ | 2 | `📝 Review` | Gap #39 · roles §2 | **`data.authGuardPipe` is dead route configuration.** Remove it or wire it into the custom guard so routing policy has one source of truth. |

## Release and engineering checks

| Done | Score | Check | Required follow-up |
|---|---:|---|---|
| ☐ | 10 | **Run the eight real OAuth-popup checks before release.** | Execute `UC-AUTH-04`–`07` and `UC-AUTH-17`–`20` from [`MANUAL-ACCEPTANCE.md`](../e2e/MANUAL-ACCEPTANCE.md), recording release, browser, tester, date, and persistence results. These include three P0 login outcomes and invite account-deletion/consumption contracts. |
| ☐ | 8 | **Decide whether to implement HX-4 fault injection.** | It blocks `UC-ASSIGN-21`, `UC-AUTH-21`, and the partial-failure leg of `UC-CFG-08`. If a browser hook is not desirable, add equivalent unit/integration failure-path coverage. |
| ☐ | 7 | **Clear the application lint baseline in a separate refactor.** | The 2026-08-12 run had 59 errors and 89 warnings: 58 `prefer-inject` errors plus one `no-unused-expressions` error. Preserve behaviour while applying the project's `inject()` rule, then rerun `npx nx lint ministry-maps`. |
| ☐ | 5 | **Consider automating the Firebase Auth emulator popup.** | Evaluate `page.waitForEvent('popup')` with the emulator provider form. Adopt only if it reliably replaces all eight manual legs without mocking the authentication flow. |

## Completion protocol for each product fix

1. Change or add the focused regression test so it expresses the intended behaviour; do not simply
   delete the current warning assertion.
2. Update the linked feature entry and the matching row in
   [`testability-gaps.md` §3](./testability-gaps.md#3-documented-current-behaviour-vs-suspected-defects).
3. Remove `⚠` from the test title/catalog only after the corrected behaviour is green against Firebase
   emulators and both DOM and Firestore assertions pass.
4. Run the affected E2E spec and every downstream journey that references the same UC ID, then run the
   full E2E suite.

# Route and component verification matrix

**Status: Seeded for implementation; all rows are `Not started`**
**Scope: later visual/E2E ledger; this planning packet provides no completed evidence**

Use this matrix with [../style-migration-matrix.md](../style-migration-matrix.md) and [../testing-and-documentation.md](../testing-and-documentation.md). Requirements are owned by [../requirements.md](../requirements.md).

## Appearance and viewport protocol

Every route row must cover these appearance checks unless the row explicitly narrows them:

- **L** — storage contains `light` while Playwright emulates a dark OS; assert root preference/resolution remain light.
- **D** — storage contains `dark` while Playwright emulates a light OS; assert root preference/resolution remain dark.
- **SL** — storage is missing or contains `system`, OS is light.
- **SD** — storage is missing or contains `system`, OS is dark.
- **LIVE** — while `system` is active, change the emulated scheme without reload and verify the open route plus any open overlay updates.

Set storage with `page.addInitScript` before navigation when testing first paint. Do not set storage after page content loads and call that flash-free evidence.

Manual/visual checks run at minimum at:

- Phone: `390 × 844`.
- Desktop: `1440 × 900`.

For every reachable state, verify canvas, surface, elevated content, text/helper/placeholder, links/actions, icons, borders, focus-visible, disabled, selected, validation/status cues, native controls/autofill, scroll/overscroll, and absence of theme-induced layout shift. Record evidence in this matrix or [acceptance-checklist.md](./acceptance-checklist.md).

Allowed status values are `Not started`, `In progress`, `Blocked`, and `Done`. Do not mark a row `Done` until its relevant style rows, focused tests, both explicit themes, both system resolutions, and required widths pass.

## Fixtures, routes, and role facts

Use existing support instead of bypassing guards:

- Fixtures: `apps/ministry-maps/e2e/fixtures/index.ts`, `auth.fixture.ts`, and `database.fixture.ts`.
- Roles/config: `apps/ministry-maps/e2e/config/auth.config.ts`; available roles are `admin`, `publisher`, `elder`, `organizer`, `superintendent`, and `app_admin`; `authenticatedPage` defaults to `admin`.
- Deterministic data: `apps/ministry-maps/e2e/seed/default.seed.ts`, `factories.ts`, `seeder.ts`, `types.ts`, and `collections.ts`.
- Default seed: one congregation, users for every role, three territories, and one designation. Extend through existing factories only when a required empty/error/status state is not represented.

Current routing facts are regression constraints, not invitations to fix access control during styling:

- `/home`, `/territories`, and `/users` use `authGuard` for Organizer/Admin/Elder/Superintendent; current guard behavior also permits App Admin.
- Territory edit actions are gated to Admin/Elder/Superintendent.
- User invite creation and configuration editing are gated to Admin.
- `/welcome` is guarded for Publisher.
- `/profile` and `/configuration` declare wildcard roles; the current guard short-circuits wildcard access. Use authenticated fixtures for theme flows, preserve behavior, and do not change guards in this feature.
- `/work/:id` has no route guard today and existing E2E covers anonymous access. Do not “fix” this during theme work.
- There is no wildcard fallback route today. Verify current unknown-route behavior without adding or redesigning a 404 route.

## Shell and startup matrix

| ID | Route/surface | Current component/files | Reachable states | Required fixture/role | Existing automation anchor | Appearance/width gate | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| R-001 | Document startup and first paint | `apps/ministry-maps/src/index.html`; `apps/ministry-maps/src/app/app-config.ts`; planned `core/theme/ThemeService` | Missing/valid/invalid storage; blocked read; system light/dark; explicit override; hard reload; throttled startup | Anonymous page is sufficient; no Firebase dependency | Add focused theme spec; constants/service unit spec | L/D/SL/SD before app content; phone + desktop; no light flash | Not started | — |
| R-002 | Root host, global loading, lazy-route transition | `apps/ministry-maps/src/app/app.component.ts`; `app.component.html`; `apps/ministry-maps/src/styles/main.scss` and global partials | Initial loading, lazy route pending, route content, unknown route/current behavior, error/fallback if reachable | Anonymous for auth route and `authenticatedPage` for shell route | `e2e/tests/smoke.spec.ts`; `auth.spec.ts` | L/D/SL/SD; LIVE during loading where controllable; both widths | Not started | — |
| R-003 | Shared app header/navigation | `apps/ministry-maps/src/app/shared/components/header/`; generic `libs/common-ui/src/lib/components/header/` | Desktop/mobile, active/inactive navigation, hover/focus/pressed, logo, profile/action menu, disabled/hidden role actions | `admin`; repeat publisher-visible navigation where role differs | `e2e/page-objects/header.page.ts`; `e2e/tests/navigation.spec.ts` | L/D/SL/SD; LIVE with menu open; both widths | Not started | — |

## Signed-out/auth route matrix

| ID | Actual route | Current component directory | Reachable states | Required fixture/role | Existing automation anchor | Appearance/width gate | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| R-010 | `/login` | `apps/ministry-maps/src/app/core/features/auth/pages/login-page/`; provider control under `core/features/auth/components/` | Default, provider hover/focus, loading, auth error, disabled, validation/help/link, browser autofill | Anonymous; emulator auth failure/success through existing fixture | `e2e/page-objects/login.page.ts`; `e2e/tests/auth.spec.ts`; `smoke.spec.ts` | L/D/SL/SD before auth; LIVE with focused control; both widths | Not started | — |
| R-011 | `/no-account` | `apps/ministry-maps/src/app/core/features/auth/pages/no-account-page/` | Inline template, explanatory content, available action/link, focus, navigation | Anonymous or existing no-account auth setup | `e2e/page-objects/no-account.page.ts`; `e2e/tests/auth.spec.ts` | L/D/SL/SD; both widths | Not started | — |
| R-012 | `/sign-in/:inviteId` | `apps/ministry-maps/src/app/core/features/auth/pages/sign-in-page/` | Valid invite, invalid/expired invite, loading, form empty/invalid/valid, provider action, error, autofill | Anonymous; create invite through seed factory/journey setup, never bypass route logic | `e2e/page-objects/sign-in.page.ts`; `e2e/tests/invite-sign-in.spec.ts`; `journey-invite-onboarding.spec.ts` | L/D/SL/SD; LIVE with form visible; both widths | Not started | — |
| R-013 | `/welcome` | `apps/ministry-maps/src/app/core/features/auth/pages/welcome-page/` | Inline template, content/card/action, loading/navigation, focused link/control | Authenticated `publisher` because route guard is Publisher | `e2e/page-objects/welcome.page.ts`; `e2e/tests/auth.spec.ts` | L/D/SL/SD; both widths | Not started | — |

## Authenticated and business route matrix

| ID | Actual route | Current component directories | Reachable states | Required fixture/role | Existing automation anchor | Appearance/width gate | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| R-020 | `/home` | `apps/ministry-maps/src/app/features/home/pages/home-page/` | Loading, empty/limited role content, populated cards, links/actions, hover/focus | `admin` primary; one `organizer` or `elder` role-visibility pass | `e2e/page-objects/home.page.ts`; `e2e/tests/navigation.spec.ts`; guard cases in `auth.spec.ts` | L/D/SL/SD; LIVE on populated route; both widths | Not started | — |
| R-021 | `/profile` existing account UI | `apps/ministry-maps/src/app/features/profile/pages/profile-page/`; `features/profile/components/change-congregation.component.*` | Identity/initials, role/congregation, authorized and hidden congregation change, action loading/error, logout confirm/cancel/confirm | `admin` for change/logout; `publisher` for role-gated verification | `e2e/page-objects/profile.page.ts`; `confirm-dialog.page.ts`; `e2e/tests/profile.spec.ts` | L/D/SL/SD; LIVE with confirm open; both widths | Not started | — |
| R-022 | `/profile` appearance control | Planned `features/profile/components/appearance-settings/`; Profile page integration | Initial checked state, each radio, keyboard arrows/space, focus-visible, immediate switch, write failure, reload/navigation persistence | `authenticatedPage` (`admin`); service unit double covers storage write failure | Extend `e2e/page-objects/profile.page.ts` and `e2e/tests/profile.spec.ts` or add focused theme spec | Select D/L/system; LIVE after Sistema; both widths; exact test IDs | Not started | — |
| R-030 | `/territories` | `features/territory/pages/territories-page/`; components `territory-list-item/`, `territory-checkbox/` where reachable, alert badges/global styles | Loading, empty, populated, every alert type, menu/filter, hover/focus, disabled, edit/delete actions, confirmation/toast | `admin` primary; `elder`/`superintendent` edit visibility; organizer read-only where applicable | `e2e/page-objects/territories.page.ts`; `territory-alerts.page.ts`; `sort-filter-dialog.page.ts`; `e2e/tests/territories*.spec.ts` | L/D/SL/SD; LIVE with menu/filter open; both widths | Not started | — |
| R-031 | `/territories/assign` | `features/territory/pages/assign-territories-page/`; `territory-checkbox/`; generic sort/filter/confirm | Loading, no eligible territories, populated, unselected/selected/disabled, filter, assign confirm/cancel, success/error feedback | `admin`; use existing seeded territories/designation and empty-system factory as needed | `e2e/page-objects/assign-territories.page.ts`; `sort-filter-dialog.page.ts`; `confirm-dialog.page.ts`; `e2e/tests/territories-assign.spec.ts` | L/D/SL/SD; LIVE with selection/dialog; both widths | Not started | — |
| R-032 | `/territories/statistics` | `features/territory/pages/statistics-territories-page/`; statistics dynamic/static section components; shared Section | Loading, empty, populated/reconciled values, labels/dividers, overflow/scroll at phone width | `admin`; deterministic statistics/reconciliation journey seed | `e2e/page-objects/statistics.page.ts`; `e2e/tests/territories-statistics.spec.ts`; `journey-statistics-reconciliation.spec.ts` | L/D/SL/SD; LIVE on populated statistics; both widths | Not started | — |
| R-040 | `/work/:id` | `features/work/pages/work-page/`; `components/work-item/`; `work-item-complete-dialog/`; shared history/outcome radio | Loading, missing/invalid designation if supported, populated, every work/expiry status, hover/focus/disabled, complete form invalid/valid/loading, history | Use seeded designation; `publisher` for normal journey; retain existing anonymous-access regression case | `e2e/page-objects/work.page.ts`; `work-item-complete-dialog.page.ts`; `history-dialog.page.ts`; `e2e/tests/work-designation.spec.ts`; journey specs | L/D/SL/SD; LIVE with completion/history open; both widths | Not started | — |
| R-050 | `/users` | `features/users/pages/users-page/`; `components/user-list-item/`; invite-create and user-edit component trees | Loading, empty/populated, every role badge, filter, hover/focus/disabled, edit, invite form invalid/loading, copied link, confirm/delete if reachable | `admin` for invite/edit; one non-admin authorized route role to verify hidden create action | `e2e/page-objects/users.page.ts`; `user-edit-dialog.page.ts`; `invite-create-dialog.page.ts`; `e2e/tests/users.spec.ts`; `users-invites.spec.ts` | L/D/SL/SD; LIVE with dialog/copy state; both widths | Not started | — |
| R-060 | `/configuration` | `features/configuration/pages/main-page/`; `components/config-manage-congregation-citites/` | Loading, empty/populated city list, add/edit/delete, validation, hover/focus/disabled, success/error toast | `admin` for editing; preserve wildcard route behavior without guard refactor | `e2e/page-objects/configuration.page.ts`; `toast.page.ts`; `e2e/tests/configuration.spec.ts`; `journey-city-rename.spec.ts` | L/D/SL/SD; LIVE during edit/toast; both widths | Not started | — |

## Route-independent overlay and transient matrix

| ID | Surface | Current owners | Reachable states | Required fixture/trigger | Existing automation anchor | Appearance/width gate | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| O-001 | Generic dialog/backdrop/focus trap | `libs/common-ui/src/lib/components/dialog/`; `confirm-dialog/`; global CDK backdrop in app styles | Open/close, header/content/footer, hover/focus, confirm/cancel, backdrop, scroll lock, focus trap/restoration | Trigger profile logout plus one destructive territory/user action | `e2e/page-objects/confirm-dialog.page.ts`; profile/territory/user specs | D and LIVE while open mandatory; L/SL/SD; both widths | Not started | — |
| O-002 | Sort/filter menu/dialog | `libs/common-ui/src/lib/components/sort-filter/`; shared menu styles | Closed/open, badge, text/select/toggle, selected, clear/apply, disabled/focus, overflow | Trigger from populated `/territories` or assign route using `admin` | `e2e/page-objects/sort-filter-dialog.page.ts`; `territories-filters.spec.ts` | D and LIVE while open mandatory; both widths | Not started | — |
| O-003 | Toast/portal and validation feedback | `libs/common-ui/src/lib/components/toaster/`; `portal/`; `note/`; form-control error styles | Info/success/warning/error, stacked/timeout/close if supported, field error, helper text | Existing save/error actions on auth/config/territory; do not add test-only production trigger | `e2e/page-objects/toast.page.ts`; route specs that trigger feedback | All severity states in L/D; LIVE with toast if stable; phone + desktop | Not started | — |
| O-004 | History dialog | `apps/ministry-maps/src/app/shared/components/dialogs/history-dialog/` | Empty/populated timeline, icons/dividers, close/focus/scroll | Seeded territory/work history using existing journey setup | `e2e/page-objects/history-dialog.page.ts`; work/territory journeys | D and LIVE while open; L/SL/SD; both widths | Not started | — |
| O-005 | Territory manage/delete/move/alert dialogs | `features/territory/components/territory-manage-dialog/`; `territory-delete-dialog/`; `territory-move-alert-dialog/`; `territory-generic-alert-dialog/` | Empty/invalid/valid, loading/disabled, alert types, destructive confirm, error/success | `admin`; seeded territory and alert factories | `territory-manage-dialog.page.ts`; `territory-alerts.page.ts`; territory specs/journeys | L/D plus LIVE on representative dialog; both widths | Not started | — |
| O-006 | Work completion dialog and outcome options | `features/work/components/work-item-complete-dialog/`; `shared/components/visit-outcome-option/` | Required/invalid/valid, each native radio outcome, keyboard focus/selection, loading/disabled | Seeded designation with `publisher` | `work-item-complete-dialog.page.ts`; `work-designation.spec.ts`; visit-feedback journey | L/D plus LIVE while open; both widths | Not started | — |
| O-007 | User edit/invite dialogs and copy block | `features/users/components/user-edit-dialog/`; `invite-create-dialog/`; generic CopyTextBlock | Initial/populated, invalid/valid, loading/disabled, role options, generated/copy state, close/focus | `admin`; seeded user/invite factory | `user-edit-dialog.page.ts`; `invite-create-dialog.page.ts`; users/invite specs | L/D plus LIVE with dialog open; both widths | Not started | — |
| O-008 | Native browser controls/autofill/chrome | Global theme/color-scheme metadata; generic input/select/radio/button styles | Autofill, placeholder, select popup, native radio checked/focus, scrollbar/overscroll, mobile browser theme color | Login/profile/config forms; real/manual browser where emulation cannot represent chrome | Theme E2E plus manual evidence | L/D/SL/SD; phone + desktop; record browser/version | Not started | — |

## Image and asset audit

For every route above:

- Confirm logos, maps/territory images, and user/content imagery are not inverted or recolored globally.
- Classify the asset as `retain with reason` when it remains legible.
- If contrast fails, add a targeted surrounding surface/border treatment first. Change the asset itself only with product/design approval.
- Record the route, state, theme, width, and evidence; do not introduce a blanket CSS filter.

## Matrix completion gate

Do not mark the route matrix complete until:

- Every route and overlay row has explicit light and explicit dark evidence at phone and desktop widths.
- Every route has system-light/system-dark evidence; representative routes and all overlay classes have a live system transition check.
- Roles/fixtures use repository support and no guard is bypassed or changed for theming.
- Empty, loading, populated, validation/error, disabled, selected, hover, focus-visible, and open-overlay states are covered where reachable.
- Root attributes, computed semantic colors, browser metadata, and no-flash behavior have automated evidence where stable.
- Contrast/non-color/status/focus/native control checks have recorded evidence.
- Existing business E2E flows remain passing.

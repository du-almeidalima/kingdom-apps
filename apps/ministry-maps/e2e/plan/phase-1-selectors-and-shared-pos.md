# Phase 1 — Selectors & shared page objects (WP-05 … WP-07)

Two **app-code** batches (additive `data-testid` attributes only — see plan README §2.1) and one batch
of shared page objects. These make phase 2–4 specs robust instead of text-selector-heavy.

**Gate for WP-05/WP-06:** `npx nx test ministry-maps` (app unit tests) + `npx nx lint ministry-maps`
green — proves the attribute-only change altered nothing. `npx nx e2e ministry-maps` green.
**Gate for WP-07:** `typecheck-e2e` + full suite green.

> **testid convention:** kebab-case `<area>-<element>`, matching the existing `territories-heading`,
> `territories-list`, `territories-city-filter`, `territory-list-item`. Add attributes only — no
> structural, class, or logic edits. If an element below turns out not to exist exactly as named, follow
> the actual template and note the deviation in the commit message.

---

### WP-05 — testids batch A: auth screens, home/header, `/work/:id`, `/territories/assign`

- **Goal:** every phase-2 selector need has a testid.
- **Covers (unblocks):** WP-08 … WP-12 specs.
- **Depends on:** nothing (app-code change, independent of phase 0).
- **Files (app code — attribute-only edits):**
  - `core/features/auth/pages/login-page/login-page.component.html` → `login-card` (on `lib-card`),
    keep using `button.provider-login-button` class for the provider button (no testid needed).
  - `core/features/auth/pages/sign-in-page/sign-in-page.component.html` → `sign-in-card`,
    `sign-in-error` (the error `<p>`), keep provider button class.
  - `core/features/auth/pages/welcome-page/welcome-page.component.ts` (inline template) →
    `welcome-heading` (the `h2`).
  - `core/features/auth/pages/no-account-page/no-account-page.component.ts` (inline template) →
    `no-account-container`.
  - `app.component.html` → `app-loading-spinner` (the `.spinner` element).
  - `shared/components/header/header.component.html` → header already has `#profile-link`; add nothing
    unless a nav container is useful (`header-nav`).
  - `features/home/pages/home-page/home-page.component.html` → `home-heading`, `home-card-territories`,
    `home-card-people`.
  - `features/work/pages/work-page/work-page.component.html` → `work-loading`, `work-expired-note`
    (the `lib-note`), `work-pending-list`, `work-completed-list`, `work-all-done`.
  - `features/work/components/work-item/work-item.component.html` → `work-item`,
    `work-item-checkbox`, `work-item-edit`, `work-item-undo`, `work-item-maps`, `work-item-history`.
  - `features/work/components/work-item-complete-dialog/work-item-complete-dialog.component.html` →
    `work-complete-dialog`, `work-complete-submit`, `work-complete-cancel`, `work-complete-name-error`
    (the `Por favor, coloque o seu nome` span). Outcome radios keep pt-BR text selection
    (`kingdom-apps-icon-radio`), `#revisit-checkbox`, `#publisher-name`, `#congregation-address` already
    exist.
  - `features/territory/pages/assign-territories-page/assign-territories-page.component.html` →
    `assign-heading`, `assign-city-filter`, `assign-territory-list`, keep submit FAB's
    `title="Enviar Designação"` (usable as-is).
  - `features/territory/components/territory-checkbox/territory-checkbox.component.html` →
    `assign-territory-checkbox`.
  - `features/users/pages/users-page/users-page.component.html` → `users-heading` (phase-4 need, cheap
    to add here).
- **Context to read first:** `docs/testability-gaps.md` §1 (inventory); each template.
- **Acceptance criteria:**
  1. Every attribute above present in the rendered DOM (spot-check with `page.getByTestId`).
  2. `npx nx test ministry-maps` + `npx nx lint ministry-maps` green.
  3. E2E suite green (existing specs unaffected).
- **Notes/risks:** separate commit from any spec work. If a component renders the same element multiple
  times (e.g. `work-item`), the testid repeats per row — that's fine and matches `territory-list-item`;
  specs disambiguate with `.filter({ hasText })`.

### WP-06 — testids batch B: territories dialogs, statistics, users, profile, configuration

- **Goal:** every phase-3/4 selector need has a testid.
- **Covers (unblocks):** WP-13 … WP-25 specs.
- **Depends on:** nothing (independent of WP-05; can run in parallel).
- **Files (app code — attribute-only edits):**
  - `features/territory/components/territory-manage-dialog/*.html` → `territory-manage-dialog`,
    `territory-submit`, `territory-cancel`, `territory-city-select`, `territory-icon-select`,
    `territory-people-input`, `territory-maps-link-input`, `territory-bible-student-checkbox`,
    `territory-instructor-input` (address input already has `#territory-address`).
  - `shared/components/sort-filter/*` (or the feature's sort/filter dialog template) →
    `sort-filter-dialog`, `sort-filter-toggle-bible-student`, `sort-filter-toggle-moved`,
    `sort-filter-icon-select`, `sort-filter-apply`, `sort-filter-badge` (badge is on the page trigger).
  - `features/territory/components/territory-list-item/*` → `territory-item-menu` (overflow trigger),
    `territory-item-drag-handle`, `territory-alert-badge` (badge chips share this testid; specs filter
    by text), `territory-history-button` (if the history affordance is a distinct button).
  - `features/territory/pages/territories-page/territories-page.component.html` →
    `territories-overflow-menu` (⋮ trigger), `territories-export-item` (`Exportar Territórios`),
    `territories-add-button` (the `+` FAB; it already has `title="Adicionar Território"` — add the
    testid anyway for uniformity).
  - `shared/components/dialogs/history-dialog/history-dialog.component.html` → `history-dialog`,
    `history-dialog-row`, `history-dialog-close`.
  - `shared/components/dialogs/territory-alerts/*` (the three resolution dialogs) →
    `alert-resolve-dialog`, `alert-resolve-radio` (radios keep text selection), `alert-resolve-save`.
  - `libs/common-ui` confirm dialog → `confirm-dialog`, `confirm-dialog-confirm`,
    `confirm-dialog-cancel` (common-ui is shared — adding attributes there is allowed; no logic).
  - `features/territory/pages/statistics-territories-page/*.html` → `statistics-heading`,
    `statistics-city-filter`, `statistics-period-filter`, `statistics-static-section`,
    `statistics-dynamic-section`, `statistic-tile-territories`, `statistic-tile-people`,
    `statistic-tile-bible-studies`, `statistic-tile-moved`, `statistic-tile-visits`,
    `statistic-tile-revisits`, `statistics-loading`.
  - `features/users/pages/users-page/users-page.component.html` → `users-list`.
  - `features/users/components/user-list-item/*` → `user-list-item`, `user-item-menu`,
    `user-item-initials`, `user-item-role-badge`.
  - `features/users/components/user-edit-dialog/*` → `user-edit-dialog`, `user-edit-name-input`,
    `user-edit-save`.
  - `features/users/components/invite-create-dialog/*` → `invite-create-dialog`, `invite-email-input`,
    `invite-submit`, `invite-copy-link-text`, `invite-copy-button`, `invite-send-button`,
    `invite-close-button`.
  - `features/profile/pages/profile-page/profile-page.component.html` → `profile-initials`,
    `profile-name`, `profile-role-badge`, `profile-congregation-name`, `profile-logout-button`,
    `profile-congregation-select` (on the change-congregation `<select>`).
  - `features/configuration/components/config-manage-congregation-citites/*.html` →
    `config-cities-list`, `config-city-row`, `config-city-input`, `config-add-city`, `config-save`,
    `config-edit-city`, `config-delete-city`, `config-no-congregation-banner`.
  - `libs/common-ui` toaster → `toast-message`.
- **Context to read first:** `docs/testability-gaps.md` §1; each template.
- **Acceptance criteria:** same three gates as WP-05.
- **Notes/risks:** same as WP-05. Exact component paths may differ slightly — locate via
  `glob`/`grep` for the template that owns each verbatim string in `docs/`.

### WP-07 — Shared page objects

- **Goal:** one PO per cross-feature UI construct, following the existing
  `page-objects/territories.page.ts` pattern (readonly locators in constructor via
  `page.getByTestId(...)`/`getByRole(...)`, no baked-in waits beyond the object's own effect).
- **Covers (unblocks):** every area spec (ConfirmDialog alone is used by TERR-20, WORK-17, ASSIGN-07/08,
  USERS-08/09, PROF-09/10).
- **Depends on:** WP-05 + WP-06 for the testid-backed locators (can be written against `getByRole` +
  text first if phase 1 hasn't landed — but prefer landing after the batches).
- **Files (create under `e2e/page-objects/`):**
  - `confirm-dialog.page.ts` — `confirm()`, `cancel()`, `title()` (`confirm-dialog-*` testids).
  - `history-dialog.page.ts` — `rows`, `close()`, `title()`.
  - `sort-filter-dialog.page.ts` — `open()` (from the page trigger), `toggleBibleStudents()`,
    `toggleMoved()`, `selectIcon(value)`, `selectSort(label)`, `apply()`, `badge()`; used by both
    `/territories` and `/territories/assign`.
  - `header-component.page.ts` — `profileLink` (`#profile-link`), `logo`, `title`.
  - `toast.page.ts` — `message()` (`toast-message`), `expectText(text)` helper.
  - edit `e2e/README.md` — add the new POs to the page-objects section.
- **Context to read first:** `e2e/page-objects/territories.page.ts` (pattern);
  `.agents/rules/e2e-testing.md` §Page Objects.
- **Acceptance criteria:**
  1. `typecheck-e2e` green.
  2. POs contain no assertions beyond their own effect; synchronisation stays with callers
     (web-first assertions, global `expect: { timeout: 10_000 }`).
  3. Full suite green.
- **Notes/risks:** keep these POs small — area-specific dialogs (manage territory, complete visit,
  user edit, invite create, alert resolution) get their own POs inside their phase WPs, not here.

---

## Phase 1 exit checklist

- [ ] All phase-2/3/4 screens have the testids their specs need (batches A + B merged, app unit tests green).
- [ ] Five shared POs exist and are documented.
- [ ] `typecheck-e2e` + full suite green (twice — isolation check).

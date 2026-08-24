# Dark/light mode acceptance checklist

**Status: Final implementation gate — not executed**
**Scope: every box intentionally remains unchecked in this planning-only packet**

Use [../requirements.md](../requirements.md), [../testing-and-documentation.md](../testing-and-documentation.md), [../style-migration-matrix.md](../style-migration-matrix.md), and [route-component-matrix.md](./route-component-matrix.md). A later implementer checks an item only after adding concrete evidence: test name, command result, route/state/viewport screenshot, measured contrast record, or focused manual note. “Implemented” or “looks good” is not evidence.

## Contract and scope

| Gate                                                                                                                             | Requirement(s)             | Evidence |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------- |
| [ ] Product exposes exactly `system`, `light`, and `dark`; no additional mode/toggle exists.                                     | FR-02–FR-03, NG-02–NG-03   | —        |
| [ ] Control is located only in the `/profile` appearance section.                                                                | FR-01, NG-02               | —        |
| [ ] Appearance applies to the entire signed-out/authenticated app, shell, transient states, and overlays.                        | FR-27, AC-09–AC-12         | —        |
| [ ] Preference is device/browser-local only; no user/account/Firestore/backend/migration storage exists.                         | FR-14, NG-01, AC-16        | —        |
| [ ] No unrelated layout/navigation/workflow, routing NgModule, route guard, directory, DI, or design-system refactor is present. | ENG-01–ENG-05, NG-04–NG-05 | —        |
| [ ] No header/nav theme control, scheduled theme, custom colors, or global animated transition was added.                        | A11Y-06, NG-02–NG-03       | —        |

## Profile appearance control

| Gate                                                                                                                          | Requirement(s)        | Evidence |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| [ ] Standalone `AppearanceSettingsComponent` uses `inject(ThemeService)` and is directly imported by standalone Profile page. | ENG-01–ENG-03         | —        |
| [ ] Native `fieldset`/`legend` and three same-name radio inputs are present.                                                  | FR-02, A11Y-05        | —        |
| [ ] Legend is `Aparência`; labels are `Sistema`, `Claro`, and `Escuro`.                                                       | FR-03–FR-04           | —        |
| [ ] Helper is exactly “Use Sistema para acompanhar a aparência definida no seu dispositivo.”                                  | FR-04                 | —        |
| [ ] Test IDs are `profile-theme-system`, `profile-theme-light`, and `profile-theme-dark`.                                     | FR-03                 | —        |
| [ ] Current preference controls native checked state; labels and keyboard behavior are accessible.                            | FR-06, A11Y-05, AC-08 | —        |
| [ ] Every selection applies immediately and invokes one matching service call; no Save or success toast exists.               | FR-05, FR-20          | —        |
| [ ] Section appears after identity/congregation and before logout.                                                            | FR-01, FR-07          | —        |
| [ ] Identity, role/congregation, change authorization/flow, confirm logout, and logout behavior remain passing.               | FR-07, AC-14          | —        |

## Persistence, resolution, and events

| Gate                                                                                                    | Requirement(s)        | Evidence |
| ------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| [ ] Exact key is `ministry-maps.theme-preference`; only exact literals are stored.                      | FR-08–FR-09           | —        |
| [ ] Missing key resolves to `system`; light/no-preference OS resolves light.                            | FR-10, FR-15          | —        |
| [ ] Missing/system key plus dark OS resolves dark.                                                      | FR-15, AC-01          | —        |
| [ ] Explicit `light` remains light under either OS scheme.                                              | FR-15–FR-16, AC-04    | —        |
| [ ] Explicit `dark` remains dark under either OS scheme.                                                | FR-15–FR-16, AC-03    | —        |
| [ ] `system` follows OS dark↔light changes live without reload.                                         | FR-16, AC-02, AC-05   | —        |
| [ ] Invalid storage becomes `system` and never appears in root state.                                   | FR-10, AC-06          | —        |
| [ ] Storage read failure is safe and does not block startup.                                            | FR-10, AC-06          | —        |
| [ ] Storage write failure preserves in-memory selection/root/meta for the page lifetime.                | FR-11, AC-06          | —        |
| [ ] Valid matching-key storage event updates immediately without a write-back loop.                     | FR-12–FR-13, AC-07    | —        |
| [ ] Removed/invalid matching-key event becomes `system`; unrelated events are ignored.                  | FR-12–FR-13, AC-07    | —        |
| [ ] Repeated initialization registers no duplicate listeners; destruction removes exact listeners once. | ENG-06, TS-U20–TS-U21 | —        |

## Root state, metadata, and first paint

| Gate | Requirement(s) | Evidence |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | ----- | --- |
| [ ] Root `data-theme` always contains the preference (`system                                                                         | light               | dark`). | FR-17 | — |
| [ ] Root `data-resolved-theme` always contains effective `light                                                                       | dark`. | FR-18 | — |
| [ ] Root/browser `color-scheme` follows the effective scheme. | FR-19 | — |
| [ ] Exactly one identifiable theme-color meta follows `#E7E6E4` light / `#121212` dark. | FR-19, FR-26 | — |
| [ ] Defensive synchronous head initializer is before render-blocking app styles/content. | FR-21–FR-22 | — |
| [ ] Head initializer validates storage, evaluates the dark media query, sets both attributes/color scheme/meta, and catches failures. | FR-22–FR-23 | — |
| [ ] CSS/no-JavaScript/no-attribute fallback is light-compatible. | FR-24 | — |
| [ ] Angular initializer adopts an already-correct state without visible change and blocks on no profile/auth/backend work. | FR-25 | — |
| [ ] Head and TypeScript constants agree on key, values, query, attributes, selector, and metadata colors. | FR-26 | — |
| [ ] Hard reload with stored dark, including throttled manual check, shows no light canvas/content flash. | AC-01, AC-09, AC-12 | — |

## Token architecture and rendered-color migration

| Gate                                                                                                                      | Requirement(s) | Evidence |
| ------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- |
| [ ] Every contracted `--kui-*` token has no-attribute/light, dark, and system-dark declarations.                          | FR-28–FR-29    | —        |
| [ ] Every contracted `--mm-*` app/status/role token has light/dark/system declarations.                                   | FR-29–FR-30    | —        |
| [ ] Unrelated `common-ui` consumers without theme attributes retain current light behavior.                               | ENG-04–ENG-05  | —        |
| [ ] `common-ui` contains no `--mm-*`, Ministry Maps model, route, role, territory, or work concept.                       | FR-29, ENG-04  | —        |
| [ ] Components introduce no unreviewed one-off theme values or Sass color functions on CSS variables.                     | FR-28, FR-33   | —        |
| [ ] No widespread Tailwind `dark:` duplication or app override of private library internals exists.                       | FR-33          | —        |
| [ ] Presentation-only runtime color maps/inputs are semantic classes/currentColor; retained concrete values have reasons. | FR-31          | —        |
| [ ] Inheriting SVG icons use `currentColor` and remain visible on ordinary/inverse/action/status surfaces.                | FR-31          | —        |
| [ ] Logos, maps, territory, and user/content imagery are not blanket-inverted; retained/targeted handling is documented.  | FR-32          | —        |
| [ ] Final color search leaves no unclassified rendered palette/literal/inline/Tailwind color occurrence.                  | AC-15          | —        |

## Generic `common-ui` surfaces

| Gate                                                                                                          | Matrix row(s)                     | Evidence |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------- |
| [ ] Theme exports, body, typography, forms, validation, and menu foundations pass in light/dark/no-attribute. | KUI-001–KUI-004                   | —        |
| [ ] Button/FAB/Icon/IconButton/Spinner default, hover, active, focus, disabled, and loading states pass.      | KUI-005, KUI-010–KUI-012, KUI-018 | —        |
| [ ] Card/header/body/link/copy surfaces and interactions pass.                                                | KUI-006–KUI-007, KUI-016          | —        |
| [ ] Dialog/footer/confirm/backdrop/focus-trap states pass.                                                    | KUI-008–KUI-009                   | —        |
| [ ] FormField/Input/Select/Label/Search placeholder/autofill/validation/focus states pass.                    | KUI-013–KUI-014                   | —        |
| [ ] Sort/filter trigger, badge, dialog, text/select/toggle and selected states pass.                          | KUI-015                           | —        |
| [ ] Note/Toaster all info/success/warning/error variants pass with non-color cues.                            | KUI-017, KUI-019                  | —        |
| [ ] Generic Header remains reusable/light-compatible and passes inverse/dark states.                          | KUI-020                           | —        |

## Ministry Maps routes, shell, and overlays

| Gate                                                                                                                                                | Matrix row(s)                | Evidence |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- |
| [ ] Root host/loading/lazy transition and app header/navigation pass at phone/desktop in L/D/SL/SD/LIVE.                                            | R-001–R-003, MM-001–MM-004   | —        |
| [ ] Shared history, Section, and visit-outcome native radio states pass.                                                                            | MM-005–MM-007                | —        |
| [ ] `/login`, `/no-account`, `/sign-in/:inviteId`, and `/welcome` pass before/after auth in all appearances.                                        | R-010–R-013, MM-008–MM-009   | —        |
| [ ] `/home` loading/empty/populated/interactive states pass with authorized fixtures.                                                               | R-020, MM-010                | —        |
| [ ] `/profile` account, congregation, appearance, and logout states pass.                                                                           | R-021–R-022, MM-011–MM-012   | —        |
| [ ] `/territories` lists/items/alerts/actions/filter/dialogs pass.                                                                                  | R-030, MM-013–MM-015, MM-017 | —        |
| [ ] `/territories/assign` selection/filter/confirm/empty/populated states pass.                                                                     | R-031, MM-014–MM-015, MM-017 | —        |
| [ ] `/territories/statistics` empty/populated/reconciled/responsive states pass.                                                                    | R-032, MM-016                | —        |
| [ ] `/work/:id` all statuses, expiry, completion/outcome/history states pass.                                                                       | R-040, MM-018–MM-019         | —        |
| [ ] `/users` all role badges, list/actions, invite/copy/edit states pass.                                                                           | R-050, MM-020–MM-022         | —        |
| [ ] `/configuration` city empty/populated/CRUD/validation/feedback states pass without path/guard refactor.                                         | R-060, MM-023–MM-024         | —        |
| [ ] Dialog/backdrop, sort/filter, toast/validation, history, territory, work, and user overlays pass in dark and LIVE system transition while open. | O-001–O-007, MM-025          | —        |
| [ ] Native controls/autofill/scrollbars/overscroll/browser chrome pass at phone/desktop.                                                            | O-008                        | —        |
| [ ] Existing route guards, component role gates, anonymous Work behavior, and unknown-route behavior remain unchanged.                              | AC-14, ENG-06                | —        |

## Accessibility and quality

| Gate                                                                                                               | Requirement(s) | Evidence |
| ------------------------------------------------------------------------------------------------------------------ | -------------- | -------- |
| [ ] Normal text pairings measure at least `4.5:1` in both schemes.                                                 | A11Y-01        | —        |
| [ ] Large text pairings measure at least `3:1`.                                                                    | A11Y-02        | —        |
| [ ] Focus indicators and meaningful control boundaries measure at least `3:1`.                                     | A11Y-02        | —        |
| [ ] Selection, validation, feedback, role, territory, and work status are not color-only.                          | A11Y-03        | —        |
| [ ] Focus-visible, hover, active, selected, disabled, placeholder, autofill, and validation states remain visible. | A11Y-04        | —        |
| [ ] Appearance radios pass fieldset/legend/label/name/checked/keyboard semantics.                                  | A11Y-05        | —        |
| [ ] No global animated color transition exists and reduced-motion behavior is safe.                                | A11Y-06        | —        |
| [ ] Native controls, overlays/focus restoration, browser chrome, and loading/fallback states are usable.           | A11Y-07        | —        |
| [ ] Theme switching causes no horizontal/layout shift at required widths.                                          | AC-12          | —        |

## Automated tests and regressions

| Gate                                                                                                       | Required evidence         | Evidence |
| ---------------------------------------------------------------------------------------------------------- | ------------------------- | -------- |
| [ ] ThemeService unit cases TS-U01–TS-U25 pass.                                                            | Focused test names/result | —        |
| [ ] Initializer/head cases TS-I01–TS-I04 pass by unit/E2E evidence.                                        | Test/manual references    | —        |
| [ ] Appearance/Profile cases TS-P01–TS-P10 pass.                                                           | Focused test names/result | —        |
| [ ] E2E scenarios TS-E01–TS-E20 pass.                                                                      | Spec/test names/result    | —        |
| [ ] Accessibility checks TS-A01–TS-A10 have automated/manual evidence.                                     | Audit records             | —        |
| [ ] Existing common-ui component/service specs remain passing.                                             | Nx result                 | —        |
| [ ] Existing auth/navigation/profile/territory/work/users/configuration specs and journeys remain passing. | E2E result                | —        |
| [ ] Both style and route matrices have no `Not started`, `In progress`, or `Blocked` rows.                 | Matrix review             | —        |

## Durable documentation

| Gate                                                                                                                   | Requirement(s) | Evidence |
| ---------------------------------------------------------------------------------------------------------------------- | -------------- | -------- |
| [ ] `docs/user-guide/profile.md` documents actual Aparência behavior and device-local persistence.                     | AC-16          | —        |
| [ ] `docs/developer-guide/theming.md` documents root/service/storage/token/overlay/test contracts.                     | AC-16          | —        |
| [ ] Developer style guide, component catalog, README, and architecture guide reflect actual implementation.            | AC-16          | —        |
| [ ] Existing docs README and `docs/features/profile.md` link the new guides without contradictory duplicate contracts. | AC-16          | —        |
| [ ] E2E README is updated only if a shared helper/invocation was introduced.                                           | ENG-06         | —        |
| [ ] All changed documentation relative links and commands are valid.                                                   | AC-16          | —        |

## Required command results

| Gate                                       | Command                              | Evidence |
| ------------------------------------------ | ------------------------------------ | -------- |
| [ ] Shared unit tests pass.                | `npx nx test common-ui`              | —        |
| [ ] Shared lint passes.                    | `npx nx lint common-ui`              | —        |
| [ ] Ministry Maps unit tests pass.         | `npx nx test ministry-maps`          | —        |
| [ ] Ministry Maps lint passes.             | `npx nx lint ministry-maps`          | —        |
| [ ] Ministry Maps production build passes. | `npx nx build ministry-maps`         | —        |
| [ ] E2E TypeScript check passes.           | `npx nx typecheck-e2e ministry-maps` | —        |
| [ ] Full Ministry Maps E2E target passes.  | `npx nx e2e ministry-maps`           | —        |
| [ ] Whitespace/integrity check passes.     | `git diff --check`                   | —        |

## Final sign-off

| Gate                                                                                                             | Evidence |
| ---------------------------------------------------------------------------------------------------------------- | -------- |
| [ ] Every `FR-*`, `A11Y-*`, `ENG-*`, and `AC-*` requirement has linked evidence.                                 | —        |
| [ ] Every migration and route row is `Done`; every remaining rendered color has a reason.                        | —        |
| [ ] Final diff contains no Firestore/user model/backend/migration or unrelated refactor.                         | —        |
| [ ] Durable docs describe actual behavior; packet historical requirements were not rewritten to hide deviations. | —        |
| [ ] Product owner/reviewer accepts recorded visual/accessibility evidence.                                       | —        |

The feature is not complete while any box above is unchecked or lacks evidence. Do not check any item merely because this planning packet exists.

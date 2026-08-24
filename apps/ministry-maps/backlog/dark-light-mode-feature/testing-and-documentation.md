# Testing and documentation plan

**Status: Ready for later implementation**
**Scope: test/documentation specification only; no command below is claimed passing by this packet**

This document owns validation scenarios, durable documentation deliverables, and requirement traceability. Execute it alongside [implementation-runbook.md](./implementation-runbook.md), [style-migration-matrix.md](./style-migration-matrix.md), and [assets/route-component-matrix.md](./assets/route-component-matrix.md).

## Testing principles

- Add/update tests in the same implementation slice as the behavior, markup, or default they cover.
- For the new service and appearance component, write core, negative, and edge-case tests before implementation and observe them fail for the intended reason.
- Assert public signals, DOM attributes, semantic classes, native state, storage calls, and metadata. Do not unit-test browser color serialization or private methods.
- Computed inheritance, first paint, route integration, overlays, and responsive rendering belong in E2E/manual checks.
- Preserve every existing behavior assertion. Never delete, skip, weaken, or replace a failing test to pass a migration.
- Use injected document/window doubles for service tests; do not leak mutated process-global browser state between tests.
- Use existing E2E fixtures/page objects/seed factories and role guards; do not seed through production bypasses or change route access for theming.
- Do not add screenshot-baseline infrastructure unless independently adopted by the repository. Use stable state/computed-style assertions plus recorded manual evidence.

## Unit test plan

### `ThemeService`

Add `apps/ministry-maps/src/app/core/theme/theme.service.spec.ts`. Build deterministic doubles for nullable `Window`, storage, `MediaQueryList`, root document/meta, media listeners, storage listeners, and cleanup.

| Test ID | Scenario                          | Required assertions                                                                                                                                           |
| ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS-U01  | Missing key, light OS             | Preference `system`; resolved `light`; both root attributes; `colorScheme=light`; light meta; no storage write.                                               |
| TS-U02  | Missing key, dark OS              | Preference `system`; resolved/root/meta dark.                                                                                                                 |
| TS-U03  | Stored `system`                   | Retains preference `system` and resolves from each media environment.                                                                                         |
| TS-U04  | Stored `light`                    | Preference/resolution light under dark OS; exact attributes/meta; no initialization rewrite.                                                                  |
| TS-U05  | Stored `dark`                     | Preference/resolution dark under light OS; exact attributes/meta.                                                                                             |
| TS-U06  | Invalid stored value              | Treat as `system`; resolve media; no throw and no invalid root value.                                                                                         |
| TS-U07  | Storage read throws               | Same safe fallback as missing key; app/root setup continues.                                                                                                  |
| TS-U08  | `setPreference('system')`         | Update signal/root/meta immediately, persist exact literal once, resolve current media.                                                                       |
| TS-U09  | `setPreference('light')`          | Immediate explicit light and one exact-key/value write under dark media.                                                                                      |
| TS-U10  | `setPreference('dark')`           | Immediate explicit dark and one exact-key/value write under light media.                                                                                      |
| TS-U11  | Runtime-invalid setter value      | Explicit programmer error; malformed state/write never occurs. Keep test narrowly cast at boundary.                                                           |
| TS-U12  | Storage write throws              | Selected signal/root/meta remain applied in memory; method does not crash startup/interaction.                                                                |
| TS-U13  | Media dark→light while system     | System-dark signal, resolved signal, root resolved attribute, color scheme and meta all update immediately.                                                   |
| TS-U14  | Media change while explicit light | Track current media internally but preference/resolved/root/meta stay light.                                                                                  |
| TS-U15  | Media change while explicit dark  | Track media but explicit dark remains. Switching later to system uses latest media state.                                                                     |
| TS-U16  | Valid storage event               | Matching key updates preference/root/meta; `setItem`/`removeItem` are not called.                                                                             |
| TS-U17  | Removed storage event             | Matching key with `newValue=null` becomes `system`; no write loop.                                                                                            |
| TS-U18  | Invalid storage event             | Matching key with malformed value becomes `system`; no write loop.                                                                                            |
| TS-U19  | Unrelated storage event           | No signal/root/meta/write change.                                                                                                                             |
| TS-U20  | Repeated `initialize()`           | Storage/media setup and each listener occur once; no duplicate behavior or write.                                                                             |
| TS-U21  | Destroy cleanup                   | Removes the exact registered media/storage listeners once.                                                                                                    |
| TS-U22  | Null `defaultView`                | Safe `system`/light fallback; document attributes/meta still set when available.                                                                              |
| TS-U23  | Missing/throwing `matchMedia`     | Safe system-light fallback; explicit setter choices still apply.                                                                                              |
| TS-U24  | Missing theme-color meta          | Signals/root/color scheme work without throw.                                                                                                                 |
| TS-U25  | Head/runtime constant drift       | Storage key, allowed values, query, attribute names, selector and `#E7E6E4`/`#121212` metadata match `index.html`, directly or through approved E2E fallback. |

Service-test rules:

- Verify listener functions can be emitted after initialization and are the same references removed at destruction.
- Reset TestBed/document fixtures after each test.
- Do not require real browser localStorage/matchMedia.
- Do not assert implementation-only field names; assert public signals and observable document/storage/listener behavior.

### Head initializer and Angular registration

| Test ID | Scenario                     | Required evidence                                                                                                        |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| TS-I01  | App initializer registration | `ThemeService.initialize()` is invoked once through standalone `provideAppInitializer`; no NgModule/deprecated provider. |
| TS-I02  | Script placement             | Identifiable metadata precedes script; script precedes render-blocking app style/content.                                |
| TS-I03  | Defensive script             | Storage and media failures are caught independently; attributes still get safe values.                                   |
| TS-I04  | Angular adoption             | Head-correct state does not visibly change when service initializes with the same environment.                           |

Prefer a small source-contract assertion only when repository Jest configuration can read `index.html` cleanly. Otherwise TS-I02–TS-I04 require E2E/manual evidence; do not add brittle filesystem hacks to unit tests.

### Appearance settings and Profile

Add `appearance-settings.component.spec.ts` and update the existing Profile/change-congregation specs.

| Test ID | Scenario                   | Required assertions                                                                                                                       |
| ------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TS-P01  | Static semantics/copy      | One `fieldset`, legend `Aparência`, exact helper text, labels Sistema/Claro/Escuro.                                                       |
| TS-P02  | Stable controls            | Same radio `name`; exact values and `data-testid` values; each label is associated.                                                       |
| TS-P03  | Initial system             | Mock preference signal `system`; only system radio is checked.                                                                            |
| TS-P04  | Initial explicit choices   | Parameterized light/dark signal determines only the matching checked radio.                                                               |
| TS-P05  | Select system              | Native change calls `setPreference('system')` exactly once.                                                                               |
| TS-P06  | Select light               | Calls `setPreference('light')` exactly once.                                                                                              |
| TS-P07  | Select dark                | Calls `setPreference('dark')` exactly once.                                                                                               |
| TS-P08  | Keyboard-compatible markup | Controls remain native radios in document order; no custom keyboard interception or color-only checked cue. Browser keyboard flow is E2E. |
| TS-P09  | Profile placement/import   | Appearance section renders after identity/congregation content and before logout; standalone direct import.                               |
| TS-P10  | Profile regressions        | Identity, initials, role/congregation, authorized change, confirmation/cancel/logout and hidden unauthorized action remain covered.       |

### Component migration regressions

- Update affected `common-ui` specs when icon/spinner defaults become `currentColor`, runtime severity maps become semantic classes, CSS property defaults change, or markup/public inputs change.
- Update app specs when inline presentation becomes semantic classes, status modifiers change, or runtime color inputs are removed/defaulted.
- Assert semantic variant/class/state selection and preserved inputs/events; do not assert computed hex strings in Jest.
- Add a missing adjacent spec only when changed public behavior/defaults lack coverage. A pure Sass replacement may rely on compile/lint/E2E/manual evidence rather than a fabricated unit test.
- Preserve CVA behavior, native controls, projection, click/disabled/loading, dialog close/focus, toast queue/timing, route data, authorization, and business-state assertions.

## E2E and integration plan

### Helper contract

Extend existing helpers or add one focused theme helper only if it reduces duplication. Do not add production test hooks.

```ts
await page.emulateMedia({ colorScheme: 'dark' });
await page.addInitScript(
  ({ key, value }) => {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  },
  { key: 'ministry-maps.theme-preference', value: 'system' },
);
```

The helper must run before `page.goto`. For blocked-storage coverage, replace or throw from storage methods in an init script before the application head script; restore isolation with a fresh context. Use `page.emulateMedia({ colorScheme: ... })` for OS changes and stable root/meta/computed-style assertions for automation.

Reuse current support:

- `apps/ministry-maps/e2e/fixtures/index.ts`, `auth.fixture.ts`, `database.fixture.ts`.
- `apps/ministry-maps/e2e/config/auth.config.ts` roles and deterministic seed files.
- Existing page objects for login, profile, header, territories, work, users, configuration, dialogs, filters, history, and toast.
- Existing business specs/journeys listed in [assets/route-component-matrix.md](./assets/route-component-matrix.md).

### Required automated scenarios

| Test ID | Scenario                                      | Required assertions                                                                                                                       |
| ------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TS-E01  | No stored value + dark OS on first navigation | Before asserting app content: `data-theme=system`, `data-resolved-theme=dark`, dark `color-scheme`, dark theme-color.                     |
| TS-E02  | No stored value + light OS                    | System/light root and metadata before content.                                                                                            |
| TS-E03  | Live system change                            | On an open route, dark→light and light→dark update resolved attribute, metadata, and representative computed token colors without reload. |
| TS-E04  | Select Escuro                                 | Profile radio checked; root becomes dark and exact storage literal is written immediately.                                                |
| TS-E05  | Dark persistence                              | Reload and navigate to another route; preference/resolution remain dark before content.                                                   |
| TS-E06  | Select Claro under dark OS                    | Root/storage light and remains light after media changes.                                                                                 |
| TS-E07  | Select Sistema                                | Root preference becomes system and current OS resolves; later media change updates live.                                                  |
| TS-E08  | Radio keyboard behavior                       | Tab to group; arrow/space changes native checked state and invokes one matching preference update.                                        |
| TS-E09  | Signed-out stored dark                        | `/login` honors dark before authentication/content; auth controls remain usable.                                                          |
| TS-E10  | Invalid/removed storage startup               | Invalid or missing value safely resolves to system; page loads.                                                                           |
| TS-E11  | Blocked storage startup                       | Simulated getter failure does not block content; safe system result appears.                                                              |
| TS-E12  | Home dark representative                      | Authorized Home canvas/card/text/link use expected semantic computed values.                                                              |
| TS-E13  | Territory/Work dark representative            | Domain status surface/foreground/border and action states remain visible with business text/icon cue.                                     |
| TS-E14  | Users dark representative                     | Role badges and list/action surfaces use expected dark semantic values.                                                                   |
| TS-E15  | Configuration dark representative             | City list/form/action/validation surfaces use expected dark semantic values.                                                              |
| TS-E16  | Overlay dark inheritance                      | Open dialog/backdrop and menu/filter; surfaces/text/focus inherit dark while root remains unchanged.                                      |
| TS-E17  | Feedback dark inheritance                     | Trigger toast or validation error; severity content/border/icon are visible and non-color label exists.                                   |
| TS-E18  | Live system with overlay open                 | Open representative CDK overlay in system-dark, switch OS light, and verify route plus overlay update without reopen.                     |
| TS-E19  | Profile regression                            | Existing logout confirm/cancel/confirm and congregation-change role flows still pass.                                                     |
| TS-E20  | Business route regressions                    | Existing auth/navigation/territory/work/users/configuration E2E scopes pass without guard/data bypass.                                    |

First-paint automation cannot prove the absence of every single painted frame. Combine pre-content root assertions with manual throttled hard reload evidence. Do not claim a no-flash pass solely from a post-load screenshot.

## Manual visual matrix

Complete every row in [assets/route-component-matrix.md](./assets/route-component-matrix.md) at `390×844` and `1440×900` for explicit light, explicit dark, system-light, and system-dark. Perform at least one live system transition per route group and while each overlay class is open.

Check reachable states:

- Default, initial loading, empty, populated, error/validation, disabled, selected/checked, hover, active, focus-visible, and open-overlay.
- Text, helper/caption, placeholder, link, icon, boundary, divider, shadow, and semantic status pairings.
- Native input/select/radio, browser autofill, scrollbar, overscroll canvas, browser theme color, and PWA/loading shell where applicable.
- Mobile wrapping/overflow and desktop density; no horizontal shift or layout change caused by theme switching.
- Logos/maps/territory/user imagery remains uninverted; add only targeted surrounding treatment when evidence identifies a defect.
- Hard reload with stored dark under throttling: no visible light canvas/content flash.
- Explicit choice remains fixed through OS change; system follows without reload.

Evidence format: route matrix row ID, state, appearance, viewport, browser/version, screenshot or concise manual note, and any linked issue. Do not check a row with only “looks good.”

## Accessibility plan

| Test ID | Check                           | Pass condition                                                                                               |
| ------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| TS-A01  | Normal text contrast            | At least `4.5:1` against actual rendered background in both schemes.                                         |
| TS-A02  | Large text contrast             | At least `3:1`.                                                                                              |
| TS-A03  | Focus/control boundary contrast | Focus indicators and meaningful boundaries at least `3:1` against adjacent colors.                           |
| TS-A04  | Non-color status                | Selection, validation, feedback and domain statuses retain label/icon/native state/border or equivalent cue. |
| TS-A05  | Keyboard                        | All appearance radios, menus, dialogs and migrated controls are reachable/operable; focus is visible.        |
| TS-A06  | Native radio semantics          | Fieldset/legend, labels, same-name exclusivity, checked state, arrow/space behavior.                         |
| TS-A07  | Dialog semantics                | Focus trap, initial focus, Escape/close where supported, restoration, backdrop and scroll behavior.          |
| TS-A08  | Disabled/placeholder/autofill   | Each is distinguishable and usable; disabled essential information is not hidden in low-contrast text.       |
| TS-A09  | Reduced motion                  | No global theme transition; switching is immediate with no motion requirement.                               |
| TS-A10  | Browser/native integration      | Resolved color-scheme/theme-color, native controls and scrollbars are coherent.                              |

Use automated accessibility tooling already present in the repository when available, but retain manual keyboard and contrast checks for states/tools cannot reach. Record the measured foreground/background values and ratio for any pairing not already covered by the seed contract.

## Regression plan

- Run existing adjacent component specs for every modified file, then the whole owning project target.
- Preserve auth guards/current route behavior, profile logout/congregation changes, territory assignment/alerts/statistics, work completion/history/expiry, users/invites, and configuration city flows.
- Verify no-attribute `common-ui` consumption remains light-compatible.
- Verify no Firestore/user model/repository/Functions/migration file changed.
- Verify runtime SVG/public color input migrations do not break callers outside Ministry Maps; use CodeGraph/dependency search before changing public defaults.
- Repeat the rendered-color search and classify all remaining values as migrate/retain/false positive.

## Durable documentation deliverables

These files are created or updated only with the later feature implementation, not during packet creation. The user confirmed that the new `user-guide` and `developer-guide` hierarchy should be introduced.

| File                                                                 | Required content                                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `apps/ministry-maps/docs/user-guide/profile.md`                  | Where `Aparência` is located; Sistema/Claro/Escuro meaning; immediate application; device/browser-only persistence; system live behavior; no account sync.                                                                                  |
| Add `apps/ministry-maps/docs/developer-guide/theming.md`             | Root attributes, preference/resolution truth table, service API, storage/failure/event contract, head initializer, metadata, token ownership/naming, adding/reviewing tokens, currentColor/runtime values, overlays, route checks, testing. |
| Add `apps/ministry-maps/docs/developer-guide/style-guide.md`         | Require semantic runtime tokens for rendered theme values; state/on-color rules; forbid one-off colors, Sass-on-var and `dark:` proliferation; focus/contrast/currentColor guidance.                                                        |
| Add `apps/ministry-maps/docs/developer-guide/component-catalog.md`   | Updated generic component defaults/contracts and standalone Profile appearance component semantics/test IDs.                                                                                                                                |
| Add `apps/ministry-maps/docs/developer-guide/README.md`              | Index and link the new theming/style/component/architecture guides.                                                                                                                                                                         |
| Add/update `apps/ministry-maps/docs/developer-guide/architecture.md` | Durable client-only theme boundary/data flow; explicitly no backend/account persistence. If introduced new, integrate existing architecture links without replacing root `ARCHITECTURE.md`.                                                 |
| Update `apps/ministry-maps/docs/README.md`                           | Link user/developer guide indexes and theming guide.                                                                                                                                                                                        |
| Update `apps/ministry-maps/docs/features/profile.md`                 | Link to user guide and summarize actual appearance behavior without duplicating the full contract.                                                                                                                                          |
| Update relevant current feature/style docs                           | Only facts changed by implementation; keep backlog execution details out of durable docs.                                                                                                                                                   |
| Conditional `apps/ministry-maps/e2e/README.md`                       | Document a shared media/storage helper and verified invocation only if one is introduced.                                                                                                                                                   |

Documentation must describe actual merged behavior, not future tense. Validate every relative link and command. `requirements.md` remains historical/product contract; durable docs explain supported usage/maintenance.

## Requirement-to-test traceability

| Requirement(s)  | Primary automated evidence                          | Additional evidence                                        |
| --------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| FR-01–FR-07     | TS-P01–TS-P10; TS-E04–TS-E08, TS-E19                | Profile route row R-021/R-022; user docs.                  |
| FR-08–FR-14     | TS-U01, TS-U03–TS-U12, TS-U16–TS-U19                | TS-E04–TS-E11; scope diff audit.                           |
| FR-15–FR-20     | TS-U01–TS-U05, TS-U08–TS-U15                        | TS-E01–TS-E07; root/meta evidence.                         |
| FR-21–FR-26     | TS-I01–TS-I04, TS-U25                               | TS-E01, TS-E02, TS-E09–TS-E11; throttled manual reload.    |
| FR-27–FR-33     | Updated component specs; semantic-class assertions  | TS-E09, TS-E12–TS-E18; all style/route rows; color search. |
| A11Y-01–A11Y-04 | Component semantics where stable                    | TS-A01–TS-A04 and full manual route matrix.                |
| A11Y-05         | TS-P01–TS-P08                                       | TS-E08; TS-A05/TS-A06.                                     |
| A11Y-06–A11Y-07 | No-transition source check; component regressions   | TS-A07–TS-A10 and route/overlay evidence.                  |
| ENG-01–ENG-06   | Unit/lint/typecheck/build; source/dependency review | Matrix row tests and final diff audit.                     |
| AC-01           | TS-E01                                              | R-001 evidence.                                            |
| AC-02           | TS-U13; TS-E03                                      | LIVE route/overlay notes.                                  |
| AC-03           | TS-P07; TS-E04/TS-E05                               | Profile radio/storage evidence.                            |
| AC-04           | TS-U09/TS-U14; TS-E06                               | Explicit override note.                                    |
| AC-05           | TS-U08/TS-U13; TS-E07                               | System radio/LIVE evidence.                                |
| AC-06           | TS-U06/TS-U07/TS-U12/TS-U22–TS-U24                  | TS-E10/TS-E11.                                             |
| AC-07           | TS-U16–TS-U19                                       | Optional multi-context E2E if stable.                      |
| AC-08           | TS-P01–TS-P08                                       | TS-E08; TS-A06.                                            |
| AC-09           | TS-E09                                              | Auth route R-010.                                          |
| AC-10           | Updated route/component specs                       | TS-E12–TS-E15; route matrix.                               |
| AC-11           | Dialog/Note/Toaster/spec regressions                | TS-E16–TS-E18; O-001–O-007.                                |
| AC-12           | TS-E01–TS-E07                                       | Full viewport/appearance manual matrix.                    |
| AC-13           | Applicable semantic/unit assertions                 | TS-A01–TS-A10 evidence.                                    |
| AC-14           | TS-P10                                              | TS-E19 and existing profile scopes.                        |
| AC-15           | All owning project tests                            | Migration matrices, final color search, command results.   |
| AC-16           | Documentation link checks                           | Durable docs review and final scope diff.                  |

## Command gates

Run focused targets after each slice and the full sequence at the end. Inspect target help/config before using any narrower E2E or Jest flags.

```bash
npx nx test common-ui
npx nx lint common-ui
npx nx test ministry-maps
npx nx lint ministry-maps
npx nx build ministry-maps
npx nx typecheck-e2e ministry-maps
npx nx e2e ministry-maps
git diff --check
```

Run in the displayed dependency order. Every command must exit successfully before implementation acceptance. If a command fails, assume the feature change caused it until evidence proves a recorded baseline/environment issue; make a genuine repair attempt and do not submit a failed build/test/lint/typecheck/E2E.

For this present planning-only packet, application targets are intentionally not required. Validate packet links/commands and run only `git diff --check`; do not record application commands as passed unless actually executed during later implementation.

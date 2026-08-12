# Ministry Maps dark/light mode implementation packet

**Status: Ready for implementation**
**Scope: planning only; production code unchanged**

This directory is the authoritative implementation packet for adding app-wide appearance preferences to Ministry Maps. It is written for a local implementation model that must be able to execute the work without rediscovering product behavior, architecture, styling ownership, migration scope, or validation requirements.

> This change contains plans only. None of the feature behavior, theme tokens, profile controls, tests, or durable product documentation described here has been implemented or validated yet.

## Start here

Before editing production files:

1. Read [requirements.md](./requirements.md). It owns product behavior, accessibility requirements, and acceptance criteria.
2. Read [current-state-audit.md](./current-state-audit.md). It identifies the existing styling architecture, known light-only owners, and verification-only surfaces.
3. Read [technical-design.md](./technical-design.md). It owns runtime architecture, bootstrap behavior, service boundaries, and failure handling.
4. Read [assets/theme-token-contract.md](./assets/theme-token-contract.md). It owns all approved semantic token names and seed values.
5. Read [style-migration-matrix.md](./style-migration-matrix.md). Use it as the styling work ledger.
6. Read [assets/route-component-matrix.md](./assets/route-component-matrix.md). Use it to prepare roles, fixtures, states, widths, and appearance combinations.
7. Execute [implementation-runbook.md](./implementation-runbook.md) in order.
8. Apply [testing-and-documentation.md](./testing-and-documentation.md) during every phase, not only at the end.
9. Complete [assets/acceptance-checklist.md](./assets/acceptance-checklist.md) as the final release gate.

If documents appear to conflict, stop. `requirements.md` wins for behavior, `assets/theme-token-contract.md` wins for token names and values, and `implementation-runbook.md` wins for execution order. Resolve the conflict in this packet before changing the application.

## Frozen product decisions

- Theme the entire application: signed-out authentication/onboarding, authenticated routes, app shell, loading and error states, CDK overlays, dialogs, menus, toasts, and shared controls.
- Put the appearance preference on `/profile`.
- Offer exactly `system`, `light`, and `dark`, shown as `Sistema`, `Claro`, and `Escuro`.
- Follow operating-system appearance changes live while `system` is selected.
- Persist the preference only in the current browser/device under `ministry-maps.theme-preference`.
- Keep generic semantic tokens in `libs/common-ui`; keep Ministry Maps domain/status tokens in the application.
- Apply the resolved appearance before first paint and let Angular adopt the same state after bootstrap.
- Use semantic CSS custom properties as the runtime source of theme values.

## Non-goals

- Do not write theme state to Firestore, user models, repositories, Functions, or migrations.
- Do not add cross-device synchronization, scheduled themes, custom colors, or additional choices.
- Do not add a header/navigation toggle.
- Do not redesign layouts, typography, navigation, or business workflows.
- Do not migrate unrelated legacy feature-routing NgModules.
- Do not introduce a Tailwind `dark:`-class theme system or app-owned overrides of `common-ui` internals.
- Do not invert logos, maps, territory imagery, or user-provided imagery globally.

## Execution protocol

- Complete one phase, its focused tests, and its applicable matrix rows before starting the next phase.
- Change a component and its adjacent unit test in the same slice.
- Mark a migration row `Done` only after explicit light and explicit dark checks pass; verify `system` at route level.
- Record baseline failures separately. Never weaken, skip, or delete tests to make a phase pass.
- Stop and do not proceed when a phase stop condition or focused command fails.
- Avoid opportunistic module, routing, dependency-injection, or design-system refactors.
- Keep all new/modified Angular components standalone, use `inject()` for new dependencies, use kebab-case file names, and use `@kingdom-apps/common-ui` for cross-project imports.

## Phase checklist

- [ ] Phase 0 — Read the packet and repository rules, establish baselines, and prepare matrix rows.
- [ ] Phase 1 — Establish generic and Ministry Maps semantic token foundations.
- [ ] Phase 2 — Add flash-free runtime theme state and its unit coverage.
- [ ] Phase 3 — Migrate generic `common-ui` components.
- [ ] Phase 4 — Migrate the app shell, shared UI, and signed-out/auth flows.
- [ ] Phase 5 — Add the profile control and migrate authenticated feature routes.
- [ ] Phase 6 — Complete E2E, accessibility, visual, documentation, and command gates.

These boxes track the later implementation. They intentionally remain unchecked in this planning-only change.

## Definition of done

The later feature implementation is done only when all of the following are true:

- The three-state preference behaves exactly as specified in [requirements.md](./requirements.md), including failure and cross-tab cases.
- Correct root attributes and browser metadata are present before Angular content paints.
- Every row in both migration matrices is classified, implemented, and supported by evidence.
- Generic `common-ui` consumers without theme attributes retain the existing light default.
- Every required route and overlay is usable in light, dark, system-light, and system-dark states.
- WCAG AA contrast, non-color cues, focus visibility, native control, autofill, validation, and reduced-motion requirements pass.
- Unit, E2E, build, lint, typecheck, and integrity commands in [testing-and-documentation.md](./testing-and-documentation.md) pass.
- Durable user/developer documentation is updated under `apps/ministry-maps/docs` as specified.
- No Firestore schema, user model, backend, or migration change exists.
- Every final gate in [assets/acceptance-checklist.md](./assets/acceptance-checklist.md) has evidence and is checked by the implementer.

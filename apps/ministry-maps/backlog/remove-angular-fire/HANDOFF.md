# Handoff — remove `@angular/fire`, migrate to the vanilla Firebase JS SDK

> Paste this document as the opening message of a new conversation to continue the work.
> The full implementation packet already exists — read it before writing any code.

## The ask

Remove the `@angular/fire` dependency (`21.0.0-rc.0-canary.f54c0fe` — a pre-release canary)
from Ministry Maps and drive Firebase through the native modular JS SDK
(`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/functions`) with full
type support. The codebase already isolates Firebase behind repository interfaces
(`app/repositories/*`), so **pages, BOs, guards, and repository interfaces must not change** —
the swap is contained in `app.config.ts`, the 6 datasources, the logger, the converter,
the 6 `models/firebase/*` files, and 5 spec files.

## Read in this order (all under `apps/ministry-maps/backlog/remove-angular-fire/`)

1. `README.md` — frozen decisions, non-goals, execution protocol, phase checklist, definition of done
2. `requirements.md` — behavior constraints and acceptance criteria
3. `current-state-audit.md` — every current `@angular/fire` usage; re-export vs wrapper; the
   streaming vs one-shot contract that must survive
4. `technical-design.md` — target design: DI tokens, bootstrap, RxJS interop helpers, deploy target
5. `implementation-runbook.md` — the 8 phases to execute, in order, with gates
6. `testing-and-validation.md` — how the existing suites prove parity

Then follow repo rules in `AGENTS.md` (zoneless + signals, no NgModules, npm/nx commands,
conventional commits, smallest-change scope).

## Non-negotiables (details in the packet)

- **Read semantics preserved exactly**: live listeners stay live (`docData`/`collectionData`
  → `onSnapshot`-backed helpers), one-shot stays one-shot, cache-first user read keeps its
  fallback chain.
- **Observable laziness preserved**: callables (`deleteUser`, `provisionUserFromInvite`)
  stay cold — nothing executes until subscribe (`defer` is mandatory); eager paths
  (popup sign-in, `add` writes) stay eager.
- `window.__E2E__ = { auth, signInWithCustomToken }` keeps its exact shape, dev-only.
- Bootstrap parity: same emulator wiring (auth 9099, firestore 8080, functions 5001, gated
  by `development && !useCloud`), same `persistentLocalCache` + multi-tab manager, same HMR guards.
- Repository interfaces, `REPOSITORIES_PROVIDERS`, Firestore schema/rules/indexes, and
  `functions/ministry-maps` are untouched.
- Drop `@angular/fire/remote-config` (provided, never consumed) and the inert
  `authGuardPipe` route data (the custom guard never reads it).
- Replace the `@angular/fire:deploy` executor with firebase-tools, keeping the `deploy`
  target name (CI discovers it by name and already provides `FIREBASE_TOKEN`).

## Execution model

- Follow `implementation-runbook.md` phase by phase (0 → 7). `@angular/fire` stays
  installed until Phase 6 — its RxJS wrappers accept vanilla SDK instances, which is what
  keeps every phase green and shippable.
- Never weaken/skip/delete a failing test. Classify failures: mock-path drift = test issue;
  any observable-behavior difference (streaming, timing, laziness) = production regression
  → stop and fix the code.

## Validation commands

```bash
npx nx run-many -t test lint -p ministry-maps common-ui   # 385 + 145 unit tests
npx nx build ministry-maps                                # production build
npx nx typecheck-e2e ministry-maps
npx nx e2e ministry-maps -- e2e/tests/<spec>.ts           # focused (emulator-backed, Java 21)
npx nx e2e ministry-maps                                  # full suite — release gate (29 specs)
```

Definition of done: `rg "@angular/fire" apps libs` (excluding the backlog packet) is empty,
`firebase` is a direct `^12.4.0` dependency, all unit + e2e suites green, bundle size within
±2%, deploy target verified (`firebase deploy --only hosting:prod --dry-run`), and the docs
listed in the runbook's Phase 7 are updated.

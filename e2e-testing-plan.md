# E2E Testing Plan — Kingdom Apps (ministry-maps)

> **Stack:** Playwright · Firebase Emulators · Firebase Admin SDK · Nx 22 · Angular 21
 
---

## Architecture Overview

```
┌─────────────────────┐          ┌──────────────────────┐          ┌──────────────────────┐
│  Firebase Emulators │          │    Angular 21 PWA    │          │   Playwright Tests   │
│                     │          │                      │          │                      │
│  Auth       :9099   │ ◄──────► │  ministry-maps app   │ ◄─────── │  Global setup        │
│  Firestore  :8080   │          │  emulators, no mocks │          │  Test suites         │
│  Functions  :5001   │          │                      │          │                      │
└─────────────────────┘          └──────────────────────┘          └──────────────────────┘
          ▲                                                                    │
          └────────────────────────────────────────────────────────────────────┘
                         Firebase Admin SDK (Node.js context)
                          seed data · assert Firestore state
```

**Core philosophy:** tests validate against real emulated Firebase data, not mocks. After every
write action, the test queries Firestore directly via Admin SDK to confirm persistence — not just
that the UI updated.

**Data:** tests leverage the Firebase Admin SDK to display and interact with
data. Seeding is split into two layers:

- **Default seed** — a minimal, predictable baseline, Congregation, Territories, Users, and anything that you find that is necessary for the basic functionalities. wiped
  and re-applied before every test so every test starts from the same known state.
- **On-demand factories** — helper functions a test calls explicitly when it needs specific data
  (e.g. creating a territory before testing designation assignment).
---

## Stack Choice

Playwright is the right tool for Nx 22 + Angular 21. It ships a first-party Nx plugin
(`@nx/playwright`), supports TypeScript natively, has a powerful fixtures system for reusing auth
sessions across tests, and its Trace Viewer makes debugging CI failures fast. The emulator suite is
already running for local dev — the only missing piece is wiring Admin SDK into the Playwright
Node.js context so tests can both seed and assert against it.
 
---

## Firebase Admin SDK Setup

Playwright is already installed and capturing Firebase auth sessions. The only new dependency is
`firebase-admin`, which runs exclusively in Playwright's Node.js context (never in the browser).

```bash
npm install --save-dev firebase-admin --legacy-peer-deps
```

### Directory structure

All new code lives under the existing e2e project:

```
apps/ministry-maps-e2e/src/
├── fixtures/
│   └── database.fixture.ts             ← clears + re-seeds before each test
├── helpers/
│   ├── admin-sdk.ts                    ← Admin SDK connection + assertion helpers
│   └── seed/
│       ├── default.seed.ts             ← minimal baseline every test expects
│       └── factories/
│           ├── index.ts
│           ├── territory.factory.ts
│           ├── designation.factory.ts
│           └── user.factory.ts
├── page-objects/
│   ├── base.page.ts
│   ├── territory-list.page.ts
│   ├── territory-form.page.ts
│   └── users.page.ts
└── tests/
    ├── territories.spec.ts
    ├── users.spec.ts
    └── work.spec.ts
```

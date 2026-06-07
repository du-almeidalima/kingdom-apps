---
applyTo: "**"
instruction: "This is the main overview for Kingdom Apps. More specific rules are automatically loaded based on file context."
---

# Kingdom Apps - AI Context Rules

## Project Overview

**Kingdom Apps** is an Nx monorepo containing applications to help with ministry and congregation work. While related to Jehovah's Witnesses organization work, this is not officially associated with the organization.

## Technology Stack Summary

- **Frontend:** Angular 21+ (Standalone Components), TypeScript 5.9+, RxJS, Signals
- **Styling:** Tailwind CSS + SCSS (7-1 Architecture)
- **Backend:** Firebase (Cloud Functions v2, Firestore, Auth, Remote Config)
- **Monorepo:** Nx 22.6.5+
- **Testing:** Jest with jest-preset-angular (unit); Playwright + Firebase Emulators (E2E)
- **PWA:** Angular Service Worker

## Project Structure

```
kingdom-apps/
├── apps/
│   └── ministry-maps/          # Main PWA application
├── libs/
│   └── common-ui/              # Shared UI components (NO app logic!)
├── functions/
│   └── ministry-maps/          # Cloud Functions (JavaScript v2)
├── tools/
│   └── executors/firebase-emulator/seed/  # Emulator seed data
└── .ai/
    └── rules/                  # Contextual rules (auto-loaded)
```

## Core Principles & Commands

See the root `AGENTS.md` for project core principles and essential CLI commands.

## Contextual Rules

More detailed rules are automatically loaded based on your current work:

- **Frontend Development** → `.ai/rules/frontend/`
  - `angular-components.md` - Component patterns
  - `angular-services.md` - Services, DI, state
  - `styling.md` - SCSS, Tailwind
  - `unit-testing.md` - Jest + ng-mocks patterns
  - `e2e-testing.md` - Playwright + Firebase Emulator seeding

- **Backend Development** → `.ai/rules/backend/`
  - `firebase-functions.md` - Cloud Functions v2
  - `firestore.md` - Database patterns

- **Architecture** → `.ai/rules/architecture/`
  - `monorepo.md` - Nx structure
  - `common-ui.md` - Shared library
  - `repositories.md` - Data access pattern

- **Workflow** → `.ai/rules/workflow/`
  - `development.md` - Dev environment
  - `git-commits.md` - Git standards
  - `deployment.md` - Build & deploy

- **Reference** → `.ai/rules/reference/`
  - `quick-commands.md` - CLI reference
  - `patterns.md` - Common patterns

## Pre-Commit Checklist

- ✅ File names in `kebab-case`
- ✅ Using `inject()` not constructor injection
- ✅ Path aliases for imports
- ✅ Tests pass: `nx test`
- ✅ Linting passes: `nx lint`
- ✅ Conventional commit message
- ✅ Standalone components
- ✅ No app logic in `libs/common-ui`
- ✅ Firebase seed data updated if DB changed

## Getting Help

- **Commands:** See `.ai/rules/reference/quick-commands.md`
- **Patterns:** See `.ai/rules/reference/patterns.md`
- **README.md** - Setup and workflow information

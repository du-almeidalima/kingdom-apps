---
applyTo: "**"
instruction: "This is the main overview for Kingdom Apps. More specific rules are automatically loaded based on file context."
---

# Kingdom Apps - AI Context Rules

## Project Overview

**Kingdom Apps** is an Nx monorepo containing applications to help with ministry and congregation work. While related to Jehovah's Witnesses organization work, this is not officially associated with the organization.

## Technology Stack Summary

- **Frontend:** Angular 19+ (Standalone Components), TypeScript 5.7+, RxJS, Signals
- **Styling:** Tailwind CSS + SCSS (7-1 Architecture)
- **Backend:** Firebase (Cloud Functions v2, Firestore, Auth, Remote Config)
- **Monorepo:** Nx 20.5+
- **Testing:** Jest with jest-preset-angular
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

## Core Principles

1. **Standalone Components Only** - No NgModules for new components
2. **Use `inject()` Function** - NOT constructor injection
3. **Path Aliases Required** - `@kingdom-apps/common-ui` (never relative paths)
4. **Firebase Emulators Default** - For local development
5. **Conventional Commits** - `feat:`, `fix:`, `refactor:`, etc.
6. **SCSS 7-1 Architecture** - `abstract/`, `base/`, `components/`
7. **Nx Affected Commands** - For efficiency
8. **libs/common-ui** - UI components only, NO application-specific logic

## Essential Commands

```bash
# Development
npm start                        # Start dev server with emulators
nx serve ministry-maps           # Serve app
nx test ministry-maps            # Run tests
nx lint ministry-maps            # Lint code

# Firebase Emulators
firebase emulators:export tools/executors/firebase-emulator/seed  # Save DB state

# Nx
nx affected -t test              # Test affected
nx affected -t lint              # Lint affected
nx graph                         # Visualize dependencies
```

## Critical Rules

### Always Use `inject()` Not Constructor Injection
```typescript
// ✅ CORRECT
export class MyComponent {
  private readonly myService = inject(MyService);
}

// ❌ WRONG
export class MyComponent {
  constructor(private myService: MyService) {}
}
```

### Always Use Path Aliases
```typescript
// ✅ CORRECT
import { ButtonComponent } from '@kingdom-apps/common-ui';

// ❌ WRONG
import { ButtonComponent } from '../../libs/common-ui/src/...';
```

### File Naming: Always kebab-case
- `my-component.component.ts`
- `my-service.service.ts`
- `entity-name.bo.ts`

### Commit Messages: Conventional Commits
```
feat(territory): add assignment feature
fix(auth): resolve login redirect
refactor(common-ui): simplify button API
infra(firebase): update seed data
```

## Contextual Rules

More detailed rules are automatically loaded based on your current work:

- **Frontend Development** → `.ai/rules/frontend/`
  - `angular-components.md` - Component patterns
  - `angular-services.md` - Services, DI, state
  - `styling.md` - SCSS, Tailwind
  - `testing.md` - Jest patterns

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

---
apply: always
---

# Kingdom Apps - AI Guidelines

These guidelines consolidate the rules created for the Kingdom Apps project. Please leverage these rules in every session to maintain project standards.

## Project Overview

**Kingdom Apps** is a Nx monorepo containing applications for ministry work.

- **Frontend:** Angular 19+ (Standalone), TypeScript 5.7+, RxJS, Signals.
- **Styling:** Tailwind CSS + SCSS (7-1 Architecture).
- **Backend:** Firebase (Cloud Functions v2, Firestore).
- **Monorepo:** Nx 20.5+.

## Core Principles (Always Active)

- **Standalone Components Only**: No NgModules.
- **Use `inject()` Function**: NEVER use constructor injection.
- **Path Aliases Required**: Use `@kingdom-apps/` aliases (e.g., `@kingdom-apps/common-ui`).
- **File Naming**: Always `kebab-case`.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, etc.
- **libs/common-ui**: UI components only, NO application-specific logic.

## Contextual Rules (By Model Decision)

Junie must intelligently apply the following rules based on the context of the task. Refer to the specified files in `.ai/rules/` when the corresponding instruction is relevant.

### Frontend

- **Instruction**: Apply these rules when creating or modifying Angular components.
  - **Context**: `**/*.component.ts`, `**/*.component.html`, `**/*.component.scss`
  - **Source**: `.ai/rules/frontend/angular-components.md`
- **Instruction**: Apply these rules when creating or modifying Angular services and state management.
  - **Context**: `**/*.service.ts`, `**/services/**`, `**/state/**/*.ts`
  - **Source**: `.ai/rules/frontend/angular-services.md`
- **Instruction**: Apply these rules when working with SCSS, Tailwind, or global styles.
  - **Context**: `**/*.scss`, `tailwind.config.js`
  - **Source**: `.ai/rules/frontend/styling.md`
- **Instruction**: Apply these rules when writing or modifying Jest tests.
  - **Context**: `**/*.spec.ts`, `jest.config.ts`
  - **Source**: `.ai/rules/frontend/testing.md`

### Backend

- **Instruction**: Apply these rules when working with Firebase Cloud Functions.
  - **Context**: `functions/**/*.js`
  - **Source**: `.ai/rules/backend/firebase-functions.md`
- **Instruction**: Apply these rules when working with Firestore data modeling or rules.
  - **Context**: `firestore.rules`, `**/models/**`
  - **Source**: `.ai/rules/backend/firestore.md`

### Architecture & Workflow

- **Instruction**: Apply when working with Nx monorepo structure and configuration.
  - **Context**: `nx.json`, `project.json`, `tsconfig.base.json`
  - **Source**: `.ai/rules/architecture/monorepo.md`
- **Instruction**: Apply when working with the shared `common-ui` library.
  - **Context**: `libs/common-ui/**`
  - **Source**: `.ai/rules/architecture/common-ui.md`
- **Instruction**: Apply when implementing the data access repository pattern.
  - **Source**: `.ai/rules/architecture/repositories.md`
- **Instruction**: Apply when using Git, creating branches, or writing commit messages.
  - **Source**: `.ai/rules/workflow/git-commits.md`
- **Instruction**: Apply when handling development, build, or deployment processes.
  - **Source**: `.ai/rules/workflow/development.md`, `.ai/rules/workflow/deployment.md`

## Reference

Refer to `.ai/rules/reference/quick-commands.md` and `.ai/rules/reference/patterns.md` for CLI commands and common code patterns.

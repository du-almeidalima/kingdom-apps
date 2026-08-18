---
description: Apply when creating git commits, branches, or pull requests.
---

# Git & Commit Standards

## Conventional Commits (required)

`<type>(<scope>): <lowercase imperative description>`

- **Types in actual use:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore` (incl. `chore(deps)`, `chore(e2e)`, `chore(ai)`). `infra`/`perf`/`style` have never been used in this repo — use `chore` for tooling.
- **Scopes in actual use:** `ministry-maps`, `functions`, `e2e`, `theme`, `users`, `firebase`, `deps`, `work-page`, `monorepo`, `ai`, `mm` — pick the one matching the area touched.
- Bodies: blank line, then bullet details; `Co-authored-by:` trailers where applicable.

```
feat(theme): implement dark and light mode support
fix(functions): build typescript functions before starting local emulators
test(e2e): add territories management specs
```

## Branches & integration

Day-to-day work happens on `development` or short-lived `feat/*` / `feature/*` branches (both prefixes exist). Integration is PR/merge into `main`; pushes to `main` trigger the CI deploy job (`.agents/rules/deployment.md`).

## Pull requests

- Tests and lint pass (CI enforces `nx affected -t test`).
- Include seed changes (`tools/executors/firebase-emulator/seed`) when the DB shape changed.

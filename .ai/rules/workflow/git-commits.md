---
applyTo: "**"
instruction: "Apply when creating git commits."
---

# Git & Commit Standards

## Conventional Commits
**REQUIRED** format: `<type>(<scope>): <description>`

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `style:` - Code style (formatting, no logic)
- `test:` - Tests
- `docs:` - Documentation
- `infra:` - Infrastructure/build/tooling
- `chore:` - Maintenance

### Examples
```
feat(territory): add assignment feature
fix(auth): resolve login redirect issue
refactor(common-ui): simplify button component
infra(firebase): update emulator seed data
test(territory): add unit tests for calculation
```

## Branch Names
- `feature/territory-assignment`
- `fix/auth-redirect`
- `refactor/button-api`

## Pull Requests
- Include seed data updates if DB changed
- Tests pass
- Linting passes
- Clear description

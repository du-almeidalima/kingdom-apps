---
applyTo:
  - "**/*.spec.ts"
  - "**/test/**"
  - "**/jest.config.ts"
instruction: "Apply these rules when writing tests."
---

# Testing Guidelines

## Testing Framework

- **Framework:** Jest
- **Preset:** `jest-preset-angular`
- **Mocking:** `ng-mocks`
- **Location:** `*.spec.ts` files next to implementation

## Test File Naming

```
component-name.component.spec.ts
service-name.service.ts
```
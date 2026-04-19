---
applyTo:
  - "**/nx.json"
  - "**/project.json"
  - "**/workspace.json"
instruction: "Apply when working with Nx monorepo structure."
---

# Nx Monorepo Guidelines

## Structure
```
kingdom-apps/
├── apps/ministry-maps/     # Deployable PWA
├── libs/common-ui/          # Shared UI library
├── functions/ministry-maps/ # Cloud Functions
└── tools/                   # Custom executors
```

## Commands
```bash
nx serve ministry-maps           # Serve app
nx test ministry-maps            # Test app
nx affected -t test              # Test affected
nx affected -t lint              # Lint affected
nx graph                         # View dependency graph
```

## Project Configuration
Each project has `project.json` defining targets (build, serve, test, lint, deploy).

## Generators
```bash
nx g @nx/angular:component <name>
nx g @nx/angular:service <name>
```

## Path Aliases
Defined in `tsconfig.base.json`:
```json
{
  "paths": {
    "@kingdom-apps/common-ui": ["libs/common-ui/src/index.ts"]
  }
}
```

Always use path aliases for cross-library imports.

---
applyTo: "**"
instruction: "Quick reference for common commands."
---

# Quick Command Reference

## Development
```bash
npm start                        # Start dev + emulators
nx serve ministry-maps           # Serve app only
nx test ministry-maps            # Run tests
nx lint ministry-maps            # Lint code
nx build ministry-maps           # Build app
```

## Firebase
```bash
firebase emulators:start         # Start emulators
firebase emulators:export tools/executors/firebase-emulator/seed  # Save data
firebase deploy                  # Deploy to production
```

## Nx
```bash
nx affected -t test              # Test affected projects
nx affected -t lint              # Lint affected projects
nx affected -t build             # Build affected projects
nx graph                         # View dependency graph
```

## Generators
```bash
nx g @nx/angular:component <name>  # Generate component
nx g @nx/angular:service <name>    # Generate service
nx g @nx/angular:library <name>    # Generate library
```

## Testing
```bash
nx test ministry-maps            # Run all tests
nx test ministry-maps --watch    # Watch mode
nx test ministry-maps --codeCoverage  # With coverage
nx affected -t test              # Test affected
```

## Path Aliases
`@kingdom-apps/common-ui` → `libs/common-ui/src/index.ts`

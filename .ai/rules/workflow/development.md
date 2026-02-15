---
applyTo: "**"
instruction: "Apply during local development workflow."
---

# Development Workflow

## Environment Setup
**Default:** Firebase Emulators for local development
- Auth: `http://localhost:9099`
- Firestore: `localhost:8080`
- Functions: `localhost:5001`
- UI: `http://127.0.0.1:4000/`

## Starting Development
```bash
npm start  # Starts app + emulators
```

## Cloud Mode (Optional)
Set `NX_USE_CLOUD=true` in `.env` file.
Clear browser cache & localStorage when switching modes.

## Firebase Emulator Data
**CRITICAL:** Emulator doesn't persist data!

Save changes:
```bash
firebase emulators:export tools/executors/firebase-emulator/seed
```

**When to export:**
- After schema changes
- After adding test data
- Before submitting PR with DB changes
- Include in PR

## Development Flow
1. Make code changes
2. Test locally with emulators
3. Run tests: `nx test ministry-maps`
4. Run lint: `nx lint ministry-maps`
5. Export seed data if DB changed
6. Commit with conventional message

---
applyTo:
  - "**/project.json"
  - "**/ngsw-config.json"
  - "**/firebase.json"
instruction: "Apply when working with build and deployment."
---

# Build & Deployment

## Build Commands
```bash
nx build ministry-maps                           # Development build
nx build ministry-maps --configuration=production # Production build
```

## Bundle Budgets
- Initial bundle: max 1.5MB (warning at 500KB)
- Component styles: max 8KB (warning at 4KB)

## PWA Configuration
- Service worker: `ngsw-config.json`
- Manifest: `public/manifest.webmanifest`
- Icons: `public/icons/`

## Firebase Deployment
```bash
nx deploy ministry-maps  # Deploy to Firebase Hosting
```

## Build Outputs
- Development: `dist/apps/ministry-maps/`
- Assets from common-ui: `assets/common-ui/`

## Pre-Deploy Checklist
- ✅ Tests pass
- ✅ Lint passes
- ✅ Build succeeds
- ✅ Bundle size within limits
- ✅ Service worker configured
- ✅ Environment variables set

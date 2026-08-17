---
applyTo:
  - "functions/**/*.ts"
  - "functions/**/index.ts"
instruction: "Apply when working with Firebase Cloud Functions."
---

# Firebase Cloud Functions

## Setup
- **Language:** TypeScript
- **Version:** Functions v2
- **Runtime:** Node 22
- **Location:** `functions/ministry-maps/`
- **Output Directory:** `functions/ministry-maps/lib/`

## Function Example
```typescript
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

export const myFunction = onCall<RequestData, Promise<ResponseData>>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  // Function logic
  return { success: true };
});
```

## Key Rules
- Always verify `request.auth` for protected functions
- Use `firebase-functions/logger` for logging
- Handle errors with `HttpsError`
- Role-based access: Check user roles (ADMIN, APP_ADMIN)
- Keep functions modular in `src/functions/` and export from `src/index.ts`
- Write unit tests under `test/` and run `npm --prefix functions/ministry-maps test`

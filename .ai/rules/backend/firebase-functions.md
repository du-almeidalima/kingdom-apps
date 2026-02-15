---
applyTo:
  - "functions/**/*.js"
  - "functions/**/index.js"
instruction: "Apply when working with Firebase Cloud Functions."
---

# Firebase Cloud Functions

## Setup
- **Language:** JavaScript (not TypeScript)
- **Version:** Functions v2
- **Runtime:** Node 20
- **Location:** `functions/ministry-maps/`

## Function Example
```javascript
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

exports.myFunction = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const db = getFirestore();
  // Function logic

  return { success: true };
});
```

## Key Rules
- Always verify `request.auth` for protected functions
- Use `firebase-functions/logger` for logging
- Handle errors with `HttpsError`
- Role-based access: Check user roles (ADMIN, APP_ADMIN)

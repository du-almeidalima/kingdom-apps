# Kingdom Apps

Welcome to the Kingdom Apps monorepo!

This monorepo contains projects aimed to help the ministry and congregation work.
Although its purpose is related to Jehovah's Witnesses organization work, this is not associated by any means with the
Jehovah Witness and any of its trademarks.

## Structure

This monorepo is divided into Apps and Libs.

- **Apps** are the deployable applications that the end user is going to use; that includes the Ministry Maps project.
- **Libs** are shareable code that applications can import and use, those are not deployable and shouldn't contain application-specific logic.

## Prerequisites

To run and deploy the Kingdom Apps monorepo, you will need:

- Node.js - 22
- NPM - 10+
- [Firebase Tools](https://github.com/firebase/firebase-tools) - `npm install -g firebase-tools`

> **Note:** `npm install` / `npm ci` needs `--legacy-peer-deps` due to Angular 21 + Firebase RC dependency conflicts.

## Projects

- Ministry Maps: PWA application to manage territory and designations for the ministry service.

## Development

### Local Development (with Firebase Emulators)

Run the Firebase emulators in one terminal:

```bash
nx serve firebase-emulator
```

And the Angular dev server in another:

```bash
nx serve ministry-maps
```

The app will be available at http://localhost:4200/ and auto-reload on source changes.  
The Firebase Emulator UI is available at http://127.0.0.1:4000/.

### Cloud Mode

To connect to Firebase in the cloud instead of the emulators, set `NX_USE_CLOUD=true` in your `.env` file and run `nx serve ministry-maps`. Be sure to clear cached data from your browser when switching between local and cloud mode (this includes localStorage).

### Seeding Data

Firebase Emulator doesn't persist any data.
Everytime it's served, it uses the backed-up data in:

```
tools 
└───executors
    └───firebase-emulator
        └───seed
```

To update the **seed** data back-up, run the command:

`firebase emulators:export tools/executors/firebase-emulator/seed`

> **_NOTE:_** Anytime a change that requires DB data to work is made, please, run the above command and add it to the Pull Request before merging your feature.

## Understand this workspace

Run `nx graph` to see a diagram of the dependencies of the projects.

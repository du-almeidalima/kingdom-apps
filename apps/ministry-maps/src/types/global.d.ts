/**
 * Development-only hook exposed on `window` when the app runs against the Firebase Auth emulator
 * (see `provideAuth` in `app.config.ts`). The E2E suite drives sign-in/sign-out through it instead
 * of automating the OAuth popup. Never present in production builds.
 */
declare global {
  interface Window {
    __E2E__?: unknown;
  }
}

export {};

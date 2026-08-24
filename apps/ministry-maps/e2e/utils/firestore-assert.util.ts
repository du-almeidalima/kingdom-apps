import { expect } from '@playwright/test';

/**
 * Asserts the value exists and returns it narrowed, replacing `!` assertions on
 * Firestore `data()` results and `.find()` lookups. Failing here produces a clear
 * "expected undefined to be defined" report instead of an opaque TypeError.
 */
export function expectData<T>(value: T | null | undefined): NonNullable<T> {
  expect(value).toBeDefined();
  return value as NonNullable<T>;
}

import { Congregation } from '../../src/models/congregation';
import { Designation } from '../../src/models/designation';
import { RoleEnum } from '../../src/models/enums/role';
import { Territory } from '../../src/models/territory';
import { TerritoryVisitHistory } from '../../src/models/territory-visit-history';

/**
 * Admin-SDK write shapes.
 *
 * These describe the payloads the seeder writes to the emulators. They use
 * plain `Date` values and ids (not Firestore `Timestamp`/`DocumentReference`):
 * the Admin SDK converts `Date` -> `Timestamp` automatically, and the seeder
 * turns `congregationId` into a real `DocumentReference` so the app's
 * converters keep working unchanged.
 */

/** A congregation document. Mirrors the real {@link Congregation} model 1:1. */
export type CongregationSeed = Congregation;

/**
 * A user document keyed by its auth `uid`.
 *
 * `id` is used both as the Firestore document id and the Auth emulator `uid`
 * (the app keys `users/{uid}` by the auth uid). `congregationId` is resolved to
 * a `DocumentReference` on `/congregations/{id}` at write time.
 */
export interface UserSeed {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  role: RoleEnum;
  congregationId: string;
  /** Optional Auth emulator password (defaults applied by the seeder). */
  password?: string;
}

/**
 * A territory document plus its full visit history.
 *
 * The seeder writes `history` to the `territories/{id}/history` subcollection
 * and stores the most recent entries in `recentHistory` (with `lastVisit`) on
 * the parent document, matching the app's datasource behaviour.
 */
export interface TerritorySeed extends Omit<Territory, 'recentHistory' | 'lastVisit'> {
  history: TerritoryVisitHistory[];
}

/** A designation document. Mirrors the real {@link Designation} model 1:1. */
export type DesignationSeed = Designation;

/** A full set of entities to write to the emulators. */
export interface SeedDefinition {
  congregations: CongregationSeed[];
  users: UserSeed[];
  territories: TerritorySeed[];
  designations: DesignationSeed[];
}

/** Ids of everything created by a single {@link seed} call, for assertions. */
export interface SeedResult {
  congregationIds: string[];
  userIds: string[];
  territoryIds: string[];
  designationIds: string[];
}

/**
 * Single source of truth for the Firestore collection + subcollection names the
 * E2E seed and assertion layers read from / write to.
 *
 * These MUST stay in sync with the app's datasource services (the values are
 * intentionally re-declared here rather than imported, because those classes
 * are Angular `@Injectable`s that pull in the browser Firebase SDK and therefore
 * cannot be loaded in Playwright's Node context):
 *
 * - `FirebaseCongregationDatasourceService.COLLECTION_NAME` → 'congregations'
 * - `FirebaseUserDatasourceService.COLLECTION_NAME` → 'users'
 * - `FirebaseTerritoryDatasourceService.COLLECTION_NAME` → 'territories'
 * - `FirebaseTerritoryDatasourceService['historySubCollectionName']` → 'history'
 * - `FirebaseDesignationDatasourceService['collectionName']` → 'designations'
 * - `FirebaseInvitationLinkDataSourceService.COLLECTION_NAME` → 'invitation_links' (mind the underscore)
 */
export const Collections = {
  congregations: 'congregations',
  users: 'users',
  territories: 'territories',
  designations: 'designations',
  invitation_links: 'invitation_links',
  logs: 'logs',
} as const;

/** Subcollection that stores a territory's full visit history. */
export const TERRITORY_HISTORY_SUBCOLLECTION = 'history';

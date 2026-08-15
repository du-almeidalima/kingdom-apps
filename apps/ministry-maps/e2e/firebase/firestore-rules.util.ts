import { auth } from '../config/firebase-admin.context';
import {
  AUTH_SIGN_IN_CUSTOM_TOKEN_URL,
  FIRESTORE_DOCUMENTS_URL,
} from '../config/emulator.config';

/**
 * Converts a JS value into Firestore REST API v1 Value format.
 */
function encodeFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: encodeFirestoreFields(value as Record<string, unknown>) } };
  }
  return { stringValue: String(value) };
}

/**
 * Converts a JS object into Firestore REST API v1 fields format.
 */
function encodeFirestoreFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    fields[key] = encodeFirestoreValue(val);
  }
  return fields;
}

/**
 * Formats a document payload for Firestore REST v1 API.
 * If already wrapped with `{ fields: ... }`, returns as is.
 */
function formatFirestoreDocumentPayload(data: Record<string, unknown>): string {
  if ('fields' in data && typeof data['fields'] === 'object') {
    return JSON.stringify(data);
  }
  return JSON.stringify({ fields: encodeFirestoreFields(data) });
}

/**
 * Mints an ID token for the given `uid` against the Auth emulator.
 *
 * 1. Generates a custom token with Admin SDK `auth.createCustomToken(uid)`.
 * 2. Exchanges the custom token for a real ID token via the Auth emulator REST endpoint.
 */
export async function mintIdToken(uid: string): Promise<string> {
  const customToken = await auth.createCustomToken(uid);

  const response = await fetch(AUTH_SIGN_IN_CUSTOM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to mint ID token for uid '${uid}' (HTTP ${response.status}): ${text}`);
  }

  const json = (await response.json()) as { idToken?: string };
  if (!json.idToken) {
    throw new Error(`Auth emulator did not return an idToken for uid '${uid}'`);
  }

  return json.idToken;
}

/** Builds the full REST URL for a document or collection path in the default database. */
function getDocumentUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${FIRESTORE_DOCUMENTS_URL}/${cleanPath}`;
}

/**
 * Performs a GET request on a Firestore document path as an anonymous or authenticated user.
 * Returns the HTTP response status (200 = allowed, 403 = permission denied, 404 = not found).
 */
export async function readDocAs(path: string, idToken?: string): Promise<number> {
  const url = getDocumentUrl(path);
  const headers: Record<string, string> = {};
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  return response.status;
}

/**
 * Attempts to create a document at `path` via a PATCH upsert on the Firestore REST v1 API.
 * `path` MUST be a full document path (e.g. `collection/docId`, including subcollection doc
 * paths) so the caller can reference the created id afterwards — a server-generated id from a
 * collection POST could never be asserted on.
 * Uses `Authorization: Bearer <idToken>` if provided.
 * Returns the HTTP response status (200 = allowed, 403 = permission denied).
 */
export async function createDocAs(
  path: string,
  data: Record<string, unknown> = {},
  idToken?: string,
): Promise<number> {
  const url = getDocumentUrl(path);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: formatFirestoreDocumentPayload(data),
  });

  return response.status;
}

/**
 * Attempts to update an existing document at `path` via PATCH on the Firestore REST v1 API.
 * Returns the HTTP response status (200 = allowed, 403 = permission denied).
 */
export async function updateDocAs(
  path: string,
  data: Record<string, unknown> = {},
  idToken?: string,
): Promise<number> {
  const url = getDocumentUrl(path);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: formatFirestoreDocumentPayload(data),
  });

  return response.status;
}

/**
 * Attempts to delete a document at `path` via DELETE on the Firestore REST v1 API.
 * Returns the HTTP response status (200 = allowed, 403 = permission denied).
 */
export async function deleteDocAs(path: string, idToken?: string): Promise<number> {
  const url = getDocumentUrl(path);
  const headers: Record<string, string> = {};
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(url, { method: 'DELETE', headers });
  return response.status;
}

import { EMULATOR_CONFIG } from '../config/emulator.config';

/**
 * Invokes a callable on the Functions emulator over the raw callable REST protocol
 * (the same one the client SDK uses). Returns `{ status, httpStatus, body }`, where
 * `status` is `ok` or the callable error code (`PERMISSION_DENIED`, …) and `body`
 * holds the decoded response (`body.result` on success, `body.error` on failure).
 */
export async function callFunction(
  functionName: string,
  data: unknown,
  idToken?: string,
): Promise<{ status: string; httpStatus: number; body: Record<string, unknown> }> {
  const url = `http://${EMULATOR_CONFIG.functions.host}:${EMULATOR_CONFIG.functions.port}` +
    `/${EMULATOR_CONFIG.projectId}/us-central1/${functionName}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const status = body['error']
    ? ((body['error'] as Record<string, unknown>)['status'] as string ?? 'UNKNOWN')
    : 'ok';

  return { status, httpStatus: response.status, body };
}

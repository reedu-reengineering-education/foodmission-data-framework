const SENSITIVE_KEYS = new Set([
  'jwt',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'idtoken',
  'id_token',
  'password',
  'newpassword',
  'currentpassword',
  'authorization',
  'cookie',
  'secret',
  'clientsecret',
  'client_secret',
  'apikey',
  'api_key',
  'x-api-key',
  'credentials',
]);

const MAX_DEPTH = 5;

export const REDACTED = '[REDACTED]';

/**
 * Copy of `value` with credential-like keys (case-insensitive) replaced by
 * `[REDACTED]`, so objects can be logged safely. Strings, numbers and Errors
 * are returned as-is; nesting deeper than 5 levels is cut off.
 */
export function redact(value: unknown): unknown {
  return redactValue(value, 0, new WeakSet());
}

function redactValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value !== 'object' || value instanceof Error) {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  if (depth >= MAX_DEPTH) {
    return '[Truncated]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? REDACTED
      : redactValue(item, depth + 1, seen);
  }
  return result;
}

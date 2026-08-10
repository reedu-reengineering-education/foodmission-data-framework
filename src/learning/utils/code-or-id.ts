import { isUUID } from 'class-validator';

/** Resolve a path param that may be a UUID id or a unique business code. */
export function codeOrIdWhere(
  codeOrId: string,
): { id: string } | { code: string } {
  return isUUID(codeOrId, '4') || isUUID(codeOrId, 'all')
    ? { id: codeOrId }
    : { code: codeOrId };
}

export function isUuidParam(value: string): boolean {
  return isUUID(value, '4') || isUUID(value, 'all');
}

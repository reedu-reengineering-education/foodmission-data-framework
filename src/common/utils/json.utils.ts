// src/common/utils/json.utils.ts

/**
 * Deep clones a value using JSON serialization.
 * Returns undefined if input is undefined or null.
 */
import { Prisma } from '@prisma/client';

export function deepCloneJson(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

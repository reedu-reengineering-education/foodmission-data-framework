import { ValidateIf } from 'class-validator';

/**
 * Optional, but `null` is not a way to say "absent".
 *
 * `@IsOptional()` skips validation for `null` as well as `undefined`, so an
 * explicit `null` reaches the repository and hits a non-nullable Prisma column,
 * surfacing as a 500 instead of a 400. This skips validation only for an
 * omitted field, leaving `null` to be rejected by the field's own validators.
 */
export const IsOptionalNotNull = () =>
  ValidateIf((_, value) => value !== undefined);

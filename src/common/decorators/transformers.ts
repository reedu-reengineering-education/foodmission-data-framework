import { Transform } from 'class-transformer';

/**
 * Transforms empty strings to undefined so optional filters are ignored.
 */
export const TransformEmptyStringToUndefined = () =>
  Transform(({ value }) => {
    if (value === '') return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  });

/**
 * Transforms "true"/"false" strings to booleans. Leaves other values unchanged.
 */
export const TransformBooleanString = () =>
  Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });


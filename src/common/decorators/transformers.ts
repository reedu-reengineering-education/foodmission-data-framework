import { Transform } from 'class-transformer';

export const TransformBooleanString = () =>
  Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  });

export const TransformTrimToUndefined = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

export const TransformCSVToStringArray = () =>
  Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => (v ? v.toString().trim() : '')).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return value;
  });

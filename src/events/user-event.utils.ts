export function buildEventMetadata(
  metadata: Record<string, unknown> = {},
  subject?: { type: string; id?: string | null },
): Record<string, unknown> {
  if (!subject?.type) {
    return metadata;
  }
  return {
    ...metadata,
    subject: {
      type: subject.type,
      ...(subject.id != null ? { id: subject.id } : {}),
    },
  };
}

/** Normalize Prisma Json / unknown into a plain object for API responses. */
export function asObjectMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

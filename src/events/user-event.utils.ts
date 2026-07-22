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

import { BadRequestException } from '@nestjs/common';

export type ProgressIndicatorOwner =
  | { userId: string; groupId?: null }
  | { groupId: string; userId?: null };

/**
 * Exactly one of userId / groupId must be set (mirrors DB CHECK
 * `progress_indicators_owner_xor`).
 */
export function assertProgressIndicatorOwner(owner: {
  userId?: string | null;
  groupId?: string | null;
}): ProgressIndicatorOwner {
  const hasUser = Boolean(owner.userId);
  const hasGroup = Boolean(owner.groupId);

  if (hasUser === hasGroup) {
    throw new BadRequestException(
      'ProgressIndicator requires exactly one of userId or groupId',
    );
  }

  if (hasUser) {
    return { userId: owner.userId as string, groupId: null };
  }

  return { groupId: owner.groupId as string, userId: null };
}

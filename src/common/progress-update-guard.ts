import { BadRequestException } from '@nestjs/common';
import { ProgressStatus } from './progress-status';

type ProgressItem = 'mission' | 'challenge';

type ProgressUpdate = { completed?: boolean; failed?: boolean };

type StoredProgress = { status: string; completed: boolean } | null;

export function assertValidProgressUpdate(
  item: ProgressItem,
  update: ProgressUpdate,
): void {
  if (update.failed && update.completed) {
    throw new BadRequestException(
      `A ${item} cannot be failed and completed at once`,
    );
  }
}

export function assertProgressUpdatable(
  item: ProgressItem,
  current: StoredProgress,
  update: ProgressUpdate,
): void {
  if (current?.status === ProgressStatus.FAILED) {
    throw new BadRequestException(
      `This ${item} has failed; restart it to try again`,
    );
  }
  if (update.failed && current?.completed) {
    throw new BadRequestException(`A completed ${item} cannot be failed`);
  }
}

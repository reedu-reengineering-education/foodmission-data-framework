import { MealLogsRepository } from '../repositories/meal-logs.repository';
import {
  MEAL_LOG_DRAFT_TTL_DAYS,
  MealLogDraftCleanupScheduler,
} from './meal-log-draft-cleanup.scheduler';

describe('MealLogDraftCleanupScheduler', () => {
  it('deletes drafts older than the TTL', async () => {
    const repository = {
      deleteDraftsCreatedBefore: jest.fn().mockResolvedValue(2),
    };
    const scheduler = new MealLogDraftCleanupScheduler(
      repository as unknown as MealLogsRepository,
    );
    const now = new Date('2026-10-13T12:00:00.000Z');

    await expect(scheduler.deleteStaleDrafts(now)).resolves.toBe(2);

    const before = repository.deleteDraftsCreatedBefore.mock.calls[0][0];
    expect(now.getTime() - before.getTime()).toBe(
      MEAL_LOG_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  it('logs and carries on when the delete fails', async () => {
    const repository = {
      deleteDraftsCreatedBefore: jest.fn().mockRejectedValue(new Error('db')),
    };
    const scheduler = new MealLogDraftCleanupScheduler(
      repository as unknown as MealLogsRepository,
    );

    await expect(scheduler.deleteStaleDrafts()).resolves.toBe(0);
  });
});

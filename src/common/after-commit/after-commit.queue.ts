import { Injectable, Logger } from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';

export interface AfterCommitTask {
  /** Used in log lines, e.g. `quest QUEST.DIET_CHANGES.BEGINNER.1 for user u1`. */
  label: string;
  /**
   * Re-reads state on the base Prisma client to check the writer's transaction
   * is visible. Retried on a backoff; the task is skipped if it never returns
   * true. Omit when the caller is already outside any transaction.
   */
  confirm?: () => Promise<boolean>;
  run: () => Promise<void>;
}

/**
 * Runs work *after* the caller's database transaction commits.
 *
 * Two distinct hazards make this necessary, and both are easy to reintroduce:
 *
 * 1. **Deadlock.** `GamificationWalletService.award()` opens its own
 *    `$transaction` and takes `SELECT … FOR UPDATE` on the wallet row. Called
 *    from inside a caller-supplied `tx`, it blocks on locks that transaction
 *    still holds, on a second connection, until the statement timeout.
 *
 * 2. **Transaction poisoning.** Postgres marks a transaction aborted as soon as
 *    any statement in it fails. Catching and logging that error does not undo
 *    it — the caller carries on and every subsequent statement fails with
 *    `current transaction is aborted`. So derived work must not run statements
 *    inside someone else's transaction at all, however carefully it is wrapped.
 *
 * Deferring solves both: the work runs on a clean connection with no locks
 * held, and a failure inside it cannot touch the writer's transaction.
 *
 * Tasks are serialised process-wide and never throw out of `schedule`.
 *
 * Note: the queue is in-memory and per-process. A crash between the writer's
 * commit and the drain loses the task with no retry, and each replica keeps its
 * own chain. If durability is ever needed, an outbox table keyed on the
 * triggering `UserEvent.id` slots in behind this same interface.
 */
@Injectable()
export class AfterCommitQueue {
  /**
   * A deferred task is scheduled while the writer's transaction is still open,
   * so the first confirm almost always misses. Back off rather than give up.
   */
  static readonly DEFAULT_CONFIRM_DELAYS_MS = [250, 1000, 3000];

  private readonly logger = new Logger(AfterCommitQueue.name);
  private pending: Promise<void> = Promise.resolve();

  /**
   * Queues tasks to run once the caller's transaction has had a chance to
   * commit. Fire-and-forget: returns immediately and never throws.
   */
  schedule(
    tasks: AfterCommitTask[],
    confirmDelaysMs: number[] = AfterCommitQueue.DEFAULT_CONFIRM_DELAYS_MS,
  ): void {
    if (tasks.length === 0) {
      return;
    }

    this.pending = this.pending
      .then(() => this.drain(tasks, confirmDelaysMs))
      .catch((error) => {
        this.logger.error(
          'After-commit drain failed',
          error instanceof Error ? error.stack : error,
        );
      });
  }

  /**
   * Runs tasks inline. For callers already outside a transaction, where the
   * result should be visible before they respond — no backoff by default,
   * since there is nothing to wait for.
   */
  async run(
    tasks: AfterCommitTask[],
    confirmDelaysMs: number[] = [],
  ): Promise<void> {
    await this.drain(tasks, confirmDelaysMs);
  }

  /**
   * Resolves once everything scheduled so far has settled. For tests and
   * graceful shutdown — the request path never waits on this.
   */
  async awaitIdle(): Promise<void> {
    await this.pending;
  }

  private async drain(
    tasks: AfterCommitTask[],
    confirmDelaysMs: number[],
  ): Promise<void> {
    for (const task of tasks) {
      try {
        if (task.confirm && !(await this.confirm(task, confirmDelaysMs))) {
          this.logger.warn(`Skipping ${task.label}: never confirmed`);
          continue;
        }
        await task.run();
      } catch (error) {
        // One failing task must not strand the ones queued behind it.
        this.logger.error(
          `After-commit task failed: ${task.label}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  private async confirm(
    task: AfterCommitTask,
    confirmDelaysMs: number[],
  ): Promise<boolean> {
    for (let attempt = 0; attempt <= confirmDelaysMs.length; attempt += 1) {
      if (attempt > 0) {
        await delay(confirmDelaysMs[attempt - 1]);
      }
      if (await task.confirm!()) {
        return true;
      }
    }
    return false;
  }
}

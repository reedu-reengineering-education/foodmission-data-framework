import { AfterCommitQueue } from './after-commit.queue';
import {
  afterCommitQueuePending,
  afterCommitTasksTotal,
} from './after-commit.metrics';
import { metricValue } from '../metrics/metric-value.testing';

describe('AfterCommitQueue', () => {
  let queue: AfterCommitQueue;

  beforeEach(() => {
    queue = new AfterCommitQueue();
  });

  it('runs scheduled tasks in order', async () => {
    const order: string[] = [];

    queue.schedule(
      [
        {
          label: 'first',
          run: () => Promise.resolve(void order.push('first')),
        },
        {
          label: 'second',
          run: () => Promise.resolve(void order.push('second')),
        },
      ],
      [],
    );
    await queue.awaitIdle();

    expect(order).toEqual(['first', 'second']);
  });

  it('runs a task with no confirm immediately', async () => {
    const run = jest.fn().mockResolvedValue(undefined);

    await queue.run([{ label: 'task', run }]);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries confirm on the backoff and runs once it succeeds', async () => {
    const confirm = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const run = jest.fn().mockResolvedValue(undefined);

    await queue.run([{ label: 'task', confirm, run }], [1, 1, 1]);

    expect(confirm).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('skips a task whose confirm never succeeds', async () => {
    const run = jest.fn().mockResolvedValue(undefined);

    await queue.run(
      [{ label: 'task', confirm: () => Promise.resolve(false), run }],
      [1, 1],
    );

    expect(run).not.toHaveBeenCalled();
  });

  it('keeps running later tasks after one throws', async () => {
    const second = jest.fn().mockResolvedValue(undefined);

    await queue.run([
      {
        label: 'boom',
        run: () => {
          throw new Error('boom');
        },
      },
      { label: 'second', run: second },
    ]);

    expect(second).toHaveBeenCalledTimes(1);
  });

  it('never rejects out of schedule', async () => {
    queue.schedule(
      [
        {
          label: 'boom',
          run: () => {
            throw new Error('boom');
          },
        },
      ],
      [],
    );

    await expect(queue.awaitIdle()).resolves.toBeUndefined();
  });

  it('awaitIdle resolves only once scheduled work has settled', async () => {
    let done = false;

    queue.schedule(
      [
        {
          label: 'slow',
          run: async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            done = true;
          },
        },
      ],
      [],
    );

    expect(done).toBe(false);
    await queue.awaitIdle();
    expect(done).toBe(true);
  });

  it('counts task outcomes and drains the pending gauge', async () => {
    const before = {
      ok: await metricValue(afterCommitTasksTotal, { outcome: 'ok' }),
      failed: await metricValue(afterCommitTasksTotal, { outcome: 'failed' }),
      skipped: await metricValue(afterCommitTasksTotal, { outcome: 'skipped' }),
    };
    const pendingBefore = await metricValue(afterCommitQueuePending);

    queue.schedule(
      [
        { label: 'ok', run: () => Promise.resolve() },
        { label: 'boom', run: () => Promise.reject(new Error('boom')) },
        {
          label: 'never visible',
          confirm: () => Promise.resolve(false),
          run: () => Promise.resolve(),
        },
      ],
      [],
    );
    expect(await metricValue(afterCommitQueuePending)).toBe(pendingBefore + 3);

    await queue.awaitIdle();

    expect(await metricValue(afterCommitQueuePending)).toBe(pendingBefore);
    expect(await metricValue(afterCommitTasksTotal, { outcome: 'ok' })).toBe(
      before.ok + 1,
    );
    expect(
      await metricValue(afterCommitTasksTotal, { outcome: 'failed' }),
    ).toBe(before.failed + 1);
    expect(
      await metricValue(afterCommitTasksTotal, { outcome: 'skipped' }),
    ).toBe(before.skipped + 1);
  });

  it('does not touch the pending gauge for inline runs', async () => {
    const pendingBefore = await metricValue(afterCommitQueuePending);

    await queue.run([{ label: 'inline', run: () => Promise.resolve() }]);

    expect(await metricValue(afterCommitQueuePending)).toBe(pendingBefore);
  });
});

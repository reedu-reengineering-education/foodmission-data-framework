import { AfterCommitQueue } from './after-commit.queue';

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
});

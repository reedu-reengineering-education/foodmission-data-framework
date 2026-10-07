import { progressEventKey } from './progress-event-keys';

describe('progressEventKey', () => {
  const first = new Date('2026-09-20T08:00:00.000Z');
  const second = new Date('2026-10-02T09:00:00.000Z');
  const base = { kind: 'mission' as const, userId: 'u1', id: 'm1' };

  it('scopes started, updated, failed and restarted keys to the attempt', () => {
    expect(
      progressEventKey({ ...base, transition: 'failed', startedAt: first }),
    ).toBe(`mission-failed:u1:m1:${first.getTime()}`);
    expect(
      progressEventKey({
        ...base,
        transition: 'updated',
        startedAt: first,
        progress: 40,
        completed: false,
      }),
    ).toBe(`mission-updated:u1:m1:40:false:${first.getTime()}`);
    expect(
      progressEventKey({ ...base, transition: 'started', startedAt: first }),
    ).not.toBe(
      progressEventKey({ ...base, transition: 'started', startedAt: second }),
    );
  });

  it('keeps one completed key across attempts, so the reward is paid once', () => {
    expect(
      progressEventKey({ ...base, transition: 'completed', startedAt: first }),
    ).toBe('mission-completed:u1:m1');
    expect(
      progressEventKey({ ...base, transition: 'completed', startedAt: second }),
    ).toBe('mission-completed:u1:m1');
  });

  it('keeps the original keys for rows without a start time', () => {
    expect(
      progressEventKey({ ...base, transition: 'started', startedAt: null }),
    ).toBe('mission-started:u1:m1');
  });
});

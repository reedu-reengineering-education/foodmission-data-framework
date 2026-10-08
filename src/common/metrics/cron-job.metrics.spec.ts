import {
  cronJobDurationSeconds,
  cronJobFailuresTotal,
  cronJobLastSuccessTimestamp,
  trackCronJob,
} from './cron-job.metrics';
import { metricValue } from './metric-value.testing';

describe('trackCronJob', () => {
  it('stamps the last success time and returns the result', async () => {
    const before = Date.now() / 1000;

    await expect(
      trackCronJob('test-ok', () => Promise.resolve('b1')),
    ).resolves.toBe('b1');

    expect(
      await metricValue(cronJobLastSuccessTimestamp, { task: 'test-ok' }),
    ).toBeGreaterThanOrEqual(before);
    expect(
      await metricValue(cronJobDurationSeconds, { task: 'test-ok' }),
    ).toBeGreaterThanOrEqual(0);
  });

  it('counts failures, rethrows, and leaves the last success untouched', async () => {
    await expect(
      trackCronJob('test-fail', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');

    expect(await metricValue(cronJobFailuresTotal, { task: 'test-fail' })).toBe(
      1,
    );
    expect(
      await metricValue(cronJobLastSuccessTimestamp, { task: 'test-fail' }),
    ).toBe(0);
  });
});

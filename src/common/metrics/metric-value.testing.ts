import type { Counter, Gauge } from 'prom-client';

/** Current value of a prom-client metric for an exact label set (0 if unseen). Test-only. */
export async function metricValue(
  metric: Counter<string> | Gauge<string>,
  labels: Record<string, string> = {},
): Promise<number> {
  const { values } = await metric.get();
  return (
    values.find((v) =>
      Object.entries(labels).every(([k, val]) => v.labels[k] === val),
    )?.value ?? 0
  );
}

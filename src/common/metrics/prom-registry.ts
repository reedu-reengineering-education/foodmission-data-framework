import {
  Counter,
  Gauge,
  Histogram,
  register,
  type CounterConfiguration,
  type GaugeConfiguration,
  type HistogramConfiguration,
} from 'prom-client';

/**
 * Get-or-create helpers on the global prom-client registry, which
 * MetricsController serves on `/api/v1/metrics`.
 *
 * Metrics are module-level singletons rather than injected so modules can
 * record without depending on MonitoringModule (lean e2e apps don't mount it).
 * Reusing an existing registration keeps re-imports and repeated service
 * construction (jest, hot reload) from throwing on duplicate names.
 *
 * Label values must stay low-cardinality: never put user, entity or request
 * ids in a label.
 */
export function getOrCreateCounter<L extends string>(
  config: CounterConfiguration<L>,
): Counter<L> {
  return (
    (register.getSingleMetric(config.name) as Counter<L> | undefined) ??
    new Counter({ ...config, registers: [register] })
  );
}

export function getOrCreateGauge<L extends string>(
  config: GaugeConfiguration<L>,
): Gauge<L> {
  return (
    (register.getSingleMetric(config.name) as Gauge<L> | undefined) ??
    new Gauge({ ...config, registers: [register] })
  );
}

export function getOrCreateHistogram<L extends string>(
  config: HistogramConfiguration<L>,
): Histogram<L> {
  return (
    (register.getSingleMetric(config.name) as Histogram<L> | undefined) ??
    new Histogram({ ...config, registers: [register] })
  );
}

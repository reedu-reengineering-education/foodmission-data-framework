/**
 * OpenTelemetry Configuration
 *
 * This module provides configuration utilities for OpenTelemetry setup.
 * It's used by the bootstrap file to initialize the OpenTelemetry SDK.
 */

export interface OtelConfig {
  enabled: boolean;
  endpoint: string;
  headers?: Record<string, string>;
  serviceName: string;
  serviceVersion: string;
  serviceNamespace: string;
  environment: string;
}

/**
 * Load OpenTelemetry configuration from environment variables
 *
 * Uses a single OTEL Collector endpoint that routes logs and traces to appropriate backends.
 */
export const loadOtelConfig = (): OtelConfig => {
  const enabled = process.env.OTEL_LOGS_ENABLED === 'true';
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const serviceName = process.env.OTEL_SERVICE_NAME || 'foodmission-api';
  const serviceNamespace = process.env.OTEL_SERVICE_NAMESPACE || 'foodmission';
  const serviceVersion =
    process.env.npm_package_version ||
    process.env.OTEL_SERVICE_VERSION ||
    '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  let headers: Record<string, string> | undefined;
  if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
    try {
      headers = JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS);
    } catch (error) {
      console.error(
        'Failed to parse OTEL_EXPORTER_OTLP_HEADERS:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  return {
    enabled,
    endpoint,
    headers,
    serviceName,
    serviceNamespace,
    serviceVersion,
    environment,
  };
};

/**
 * Validate OpenTelemetry configuration
 */
export const validateOtelConfig = (config: OtelConfig): boolean => {
  if (!config.enabled) {
    return true;
  }

  if (!config.endpoint) {
    console.error(
      'OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL is enabled',
    );
    return false;
  }

  try {
    new URL(config.endpoint);
  } catch {
    console.error(`Invalid OTEL_EXPORTER_OTLP_ENDPOINT: ${config.endpoint}`);
    return false;
  }

  return true;
};

/**
 * OpenTelemetry Bootstrap
 *
 * This file initializes the OpenTelemetry SDK before the NestJS application starts.
 * It must be imported at the very top of main.ts to ensure proper instrumentation.
 *
 * Features:
 * - Native OpenTelemetry Logs API
 * - OTLP log export to observability backends
 * - Distributed tracing with OTLP trace export
 * - Automatic instrumentation of Node.js libraries
 * - Graceful shutdown handling
 */

import 'dotenv/config'

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { loadOtelConfig, validateOtelConfig } from './common/logging/otel.config';
import { logs } from '@opentelemetry/api-logs';

const config = loadOtelConfig();

if (config.enabled) {
  // Validate configuration before initializing
  if (!validateOtelConfig(config)) {
    console.error('Invalid OpenTelemetry configuration. Skipping initialization.');
    process.exit(1);
  }

  try {
    const logExporter = new OTLPLogExporter({
      url: `${config.endpoint}/v1/logs`,
      headers: config.headers,
    });

    const traceExporter = new OTLPTraceExporter({
      url: `${config.endpoint}/v1/traces`,
      headers: config.headers,
    });

    // Define service resource attributes following OpenTelemetry semantic conventions
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'service.namespace': config.serviceNamespace,
      'deployment.environment': config.environment,
    });

    // Create and register LoggerProvider explicitly
    const logRecordProcessor = new BatchLogRecordProcessor(logExporter);
    const loggerProvider = new LoggerProvider({ 
      resource,
      processors: [logRecordProcessor]
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    const sdk = new NodeSDK({
      resource,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
      instrumentations: [
        // Auto-instrument common Node.js libraries
        getNodeAutoInstrumentations({
          // HTTP instrumentation (covers Express and outgoing HTTP/HTTPS requests)
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req) => {
              // Ignore health check endpoints to reduce noise
              const url = req.url || '';
              return url.includes('/health') || url.includes('/metrics');
            },
          },
          // Express instrumentation
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          // Disable noisy instrumentations
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false,
          },
        }),
        // Prisma instrumentation for database queries
        new PrismaInstrumentation(),
      ],
    });

    sdk.start();
    console.log(
      `✓ OpenTelemetry SDK initialized successfully\n` +
        `  Service: ${config.serviceName} (v${config.serviceVersion})\n` +
        `  Environment: ${config.environment}\n` +
        `  Endpoint: ${config.endpoint}`,
    );

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down OpenTelemetry SDK...');
      sdk
        .shutdown()
        .then(() => console.log('✓ OpenTelemetry SDK shut down successfully'))
        .catch((error) =>
          console.error('✗ Error shutting down OpenTelemetry SDK:', error),
        )
        .finally(() => process.exit(0));
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('\nSIGINT received, shutting down OpenTelemetry SDK...');
      sdk
        .shutdown()
        .then(() => console.log('✓ OpenTelemetry SDK shut down successfully'))
        .catch((error) =>
          console.error('✗ Error shutting down OpenTelemetry SDK:', error),
        )
        .finally(() => process.exit(0));
    });
  } catch (error) {
    console.error(
      '✗ Failed to initialize OpenTelemetry SDK:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    // Don't crash the application if OpenTelemetry fails to initialize
    console.warn('⚠ Application will continue without OpenTelemetry logging');
  }
} else {
  console.log('OpenTelemetry logging is disabled (OTEL_LOGS_ENABLED=false)');
}

# Logging & OpenTelemetry Setup

Native OpenTelemetry logging for distributed tracing and cloud-native observability.

## Quick Start

### Basic Logging

```typescript
import { LoggingService } from './common/logging/logging.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggingService) {}

  doSomething() {
    this.logger.log('Operation started', 'MyService');
    this.logger.error('Operation failed', error.stack, 'MyService');
  }
}
```

### Enable OpenTelemetry

```bash
# .env
OTEL_LOGS_ENABLED="true"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/logs"
OTEL_SERVICE_NAME="foodmission-api"

# Test setup
npm run test:otel
```

## Trace ID (Request Tracking)

Every request gets a unique trace ID from OpenTelemetry:

```json
{
  "timestamp": "2024-03-16T10:30:00.000Z",
  "level": "info",
  "message": "Database query executed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "userId": "user-123"
}
```

**Response Header:** `X-Trace-ID: 4bf92f3577b34da6a3ce929d0e0e4736`

Clients can use this ID for debugging and support tickets.

## Specialized Logging

```typescript
// Database operations
this.logger.logDatabaseOperation('SELECT', 'users', 45, true);

// Auth events
this.logger.logAuthEvent('login', userId, true, { method: 'oauth2' });

// Business events
this.logger.logBusinessEvent('order_created', 'Order', orderId, { amount: 99.99 });

// External API calls
this.logger.logExternalApiCall('OpenFoodFacts', '/api/v0/product/123', 'GET', 250, 200, true);
```

## Configuration

```bash
# Logging
LOG_LEVEL="info"                     # error, warn, info, http, debug
LOG_CONSOLE="true"
LOG_FILE="true"
LOG_DIR="./logs"

# OpenTelemetry (optional)
OTEL_LOGS_ENABLED="false"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/logs"
OTEL_SERVICE_NAME="foodmission-api"
```

## OpenTelemetry (Optional)

Test with Jaeger locally:

```bash
# Start Jaeger
docker run -d --name jaeger -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one:latest

# Enable in .env
OTEL_LOGS_ENABLED="true"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318/v1/logs"

# Test setup
npm run test:otel

# View traces at http://localhost:16686
```

Supports any OTLP backend: Jaeger, Grafana, Datadog, New Relic, etc.

## Troubleshooting

**Logs not appearing in OpenTelemetry:**
- Run `npm run test:otel` to diagnose
- Check `OTEL_LOGS_ENABLED="true"`
- Verify endpoint connectivity

**High log volume:**
- Set `LOG_LEVEL="warn"` in production
- Disable file logging if using centralized logs

## Resources

- [OpenTelemetry Logs API](https://opentelemetry.io/docs/specs/otel/logs/)
- [OpenTelemetry JavaScript SDK](https://opentelemetry.io/docs/languages/js/)
- [Grafana Loki](https://grafana.com/docs/loki/latest/)

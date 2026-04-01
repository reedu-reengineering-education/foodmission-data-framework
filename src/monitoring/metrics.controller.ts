import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { MetricsService } from './metrics.service';

@ApiTags('Monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description:
      'Returns application metrics in Prometheus format for scraping',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        example: `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/foods",status_code="200"} 42

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/foods",status_code="200",le="0.1"} 10
http_request_duration_seconds_bucket{method="GET",route="/api/foods",status_code="200",le="0.3"} 25
http_request_duration_seconds_bucket{method="GET",route="/api/foods",status_code="200",le="0.5"} 35
http_request_duration_seconds_bucket{method="GET",route="/api/foods",status_code="200",le="+Inf"} 42
http_request_duration_seconds_sum{method="GET",route="/api/foods",status_code="200"} 8.2
http_request_duration_seconds_count{method="GET",route="/api/foods",status_code="200"} 42`,
      },
    },
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}

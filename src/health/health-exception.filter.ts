import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Passes the Terminus health check body through as-is with a 503 status,
 * bypassing the global error envelope for health endpoints.
 */
@Catch(ServiceUnavailableException)
export class HealthExceptionFilter implements ExceptionFilter {
  catch(exception: ServiceUnavailableException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { details: _, ...body } = exception.getResponse() as any;
    response.status(503).json(body);
  }
}

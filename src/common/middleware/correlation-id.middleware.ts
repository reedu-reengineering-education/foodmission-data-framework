import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithCorrelation extends Request {
  correlationId: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    // Try to get correlation ID from headers, otherwise generate a new one
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['correlation-id'] as string) ||
      uuidv4();

    // Attach correlation ID to request object
    req.correlationId = correlationId;

    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Log the incoming request
    this.logger.log(`Incoming request: ${req.method} ${req.url}`, {
      correlationId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      contentType: req.headers['content-type'],
    });

    next();
  }
}

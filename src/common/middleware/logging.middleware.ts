import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../logging/logging.service';
import { trace } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import {
  getRequestUrl,
  shouldSkipObservabilityRoute,
} from '../utils/observability-route-filter';

export interface RequestWithLogging extends Request {
  startTime?: number;
  traceId?: string;
  requestId?: string;
  /** Unverified JWT `sub`, for log attribution only. */
  userId?: string;
}

const SLOW_REQUEST_MS = 5000;

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly loggingService: LoggingService) {}

  use(req: RequestWithLogging, res: Response, next: NextFunction): void {
    const requestUrl = getRequestUrl(req);
    // Query strings can hold search terms and other user input; never log them.
    const requestPath = requestUrl.split('?')[0];
    const skipObservabilityLogging = shouldSkipObservabilityRoute(
      requestUrl,
      req.headers['user-agent'] || '',
    );

    // Get trace ID from OpenTelemetry (or generate fallback)
    const traceId = this.getTraceId();
    const requestId = uuidv4();

    // Set timing
    req.startTime = Date.now();
    req.traceId = traceId;
    req.requestId = requestId;

    // Add trace ID and request ID to response headers for client debugging
    res.setHeader('X-Trace-ID', traceId);
    res.setHeader('X-Request-ID', requestId);

    // Set trace ID in logging service
    this.loggingService.setTraceId(traceId);

    // Set request context
    this.loggingService.setRequestContext({
      requestId,
      method: req.method,
      url: requestPath,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
    });

    // Extract user context from JWT if available
    this.extractUserContext(req);

    if (skipObservabilityLogging) {
      next();
      return;
    }

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = ((chunk?: any, encoding?: any, cb?: any) => {
      const responseTime = Date.now() - (req.startTime || Date.now());
      this.logResponse(req, res, responseTime, requestPath);

      // Call original end method
      return originalEnd.call(res, chunk, encoding, cb);
    }) as typeof res.end;

    next();
  }

  private getTraceId(): string {
    // Try to get trace ID from OpenTelemetry active span
    const span = trace.getActiveSpan();
    if (span) {
      const traceId = span.spanContext().traceId;
      if (traceId) return traceId;
    }

    // Fallback: generate UUID if OpenTelemetry is not active
    return uuidv4();
  }

  private extractUserContext(req: RequestWithLogging): void {
    try {
      // Try to extract user info from JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = this.decodeJwtPayload(token);

        if (payload && payload.sub) {
          req.userId = payload.sub;
          this.loggingService.setUserContext(payload.sub);
        }
      }
    } catch {
      // Ignore JWT parsing errors - user context is optional
    }
  }

  private decodeJwtPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * One line per request. Headers, body and query string are deliberately
   * left out: they can carry credentials and user-entered text.
   */
  private logResponse(
    req: RequestWithLogging,
    res: Response,
    responseTime: number,
    path: string,
  ): void {
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    this.loggingService.logWithMeta(
      level,
      `${req.method} ${path} ${status} ${responseTime}ms`,
      {
        log_type: 'http',
        method: req.method,
        url: path,
        statusCode: status,
        responseTime,
        contentLength: res.get('content-length'),
        traceId: req.traceId,
        requestId: req.requestId,
        ...(req.userId && { userId: req.userId }),
      },
    );

    if (responseTime > SLOW_REQUEST_MS) {
      this.loggingService.warn(
        `Slow request: ${req.method} ${path} took ${responseTime}ms`,
        'LoggingMiddleware',
      );
    }
  }
}

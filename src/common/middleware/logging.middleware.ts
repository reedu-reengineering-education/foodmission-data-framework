import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../logging/logging.service';
import { trace } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithLogging extends Request {
  startTime?: number;
  traceId?: string;
  requestId?: string;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly loggingService: LoggingService) {}

  use(req: RequestWithLogging, res: Response, next: NextFunction): void {
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
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
    });

    // Extract user context from JWT if available
    this.extractUserContext(req);

    // Log incoming request
    this.logIncomingRequest(req);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      // Log outgoing response
      const responseTime = Date.now() - (req.startTime || Date.now());
      this.logOutgoingResponse(req, res, responseTime);

      // Call original end method
      originalEnd.call(res, chunk, encoding, cb);
    }.bind(this);

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

  private logIncomingRequest(req: RequestWithLogging): void {
    const message = `Incoming ${req.method} ${req.url}`;

    this.loggingService.http(message, {
      type: 'request',
      method: req.method,
      url: req.url,
      query: req.query,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body),
      traceId: req.traceId,
      requestId: req.requestId,
    });
  }

  private logOutgoingResponse(
    req: RequestWithLogging,
    res: Response,
    responseTime: number,
  ): void {
    const message = `Outgoing ${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;

    this.loggingService.http(message, {
      type: 'response',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('content-length'),
      traceId: req.traceId,
      requestId: req.requestId,
    });

    // Log slow requests as warnings
    if (responseTime > 5000) {
      this.loggingService.warn(
        `Slow request detected: ${req.method} ${req.url} took ${responseTime}ms`,
        'LoggingMiddleware',
      );
    }

    // Log errors as warnings
    if (res.statusCode >= 400) {
      const level = res.statusCode >= 500 ? 'error' : 'warn';
      this.loggingService.logWithMeta(level, `HTTP ${res.statusCode} error`, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        traceId: req.traceId,
      });
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

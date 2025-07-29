import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { SecurityService } from '../security.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly helmetMiddleware: any;

  constructor(private readonly securityService: SecurityService) {
    // Configure Helmet with security headers
    this.helmetMiddleware = helmet(this.securityService.getSecurityHeaders());
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Apply Helmet security headers
    this.helmetMiddleware(req, res, () => {
      // Add custom security headers
      res.setHeader('X-API-Version', '1.0.0');
      res.setHeader(
        'X-Request-ID',
        req.headers['x-correlation-id'] || 'unknown',
      );

      // Remove sensitive headers that might leak information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Log suspicious requests
      this.logSuspiciousActivity(req);

      next();
    });
  }

  private logSuspiciousActivity(req: Request) {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript injection
      /vbscript:/i, // VBScript injection
      /onload=/i, // Event handler injection
      /onerror=/i, // Error handler injection
    ];

    const url = req.url;
    const userAgent = req.get('User-Agent') || '';
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});

    const isSuspicious = suspiciousPatterns.some(
      (pattern) =>
        pattern.test(url) ||
        pattern.test(userAgent) ||
        pattern.test(body) ||
        pattern.test(query),
    );

    if (isSuspicious) {
      this.securityService.logSecurityEvent('SUSPICIOUS_REQUEST', {
        ip: req.ip,
        userAgent,
        url,
        method: req.method,
        body: req.body,
        query: req.query,
        headers: req.headers,
      });
    }

    // Log requests with unusual characteristics
    if (userAgent.length > 1000) {
      this.securityService.logSecurityEvent('UNUSUAL_USER_AGENT', {
        ip: req.ip,
        userAgent: userAgent.substring(0, 200) + '...',
        url,
      });
    }

    // Log requests with too many parameters
    if (Object.keys(req.query || {}).length > 50) {
      this.securityService.logSecurityEvent('EXCESSIVE_PARAMETERS', {
        ip: req.ip,
        url,
        paramCount: Object.keys(req.query || {}).length,
      });
    }
  }
}

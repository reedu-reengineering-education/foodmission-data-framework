import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    return sanitizeHtml(input, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {},
      disallowedTagsMode: 'discard',
    });
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeHtml(input.trim());
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validate environment variables for security
   */
  validateEnvironmentVariables(): void {
    const requiredVars = [
      'DATABASE_URL',
      'KEYCLOAK_BASE_URL',
      'KEYCLOAK_REALM',
      'KEYCLOAK_CLIENT_ID',
    ];

    // KEYCLOAK_AUTH_SERVER_URL is optional (falls back to KEYCLOAK_BASE_URL)

    const missingVars = requiredVars.filter(
      (varName) => !this.configService.get(varName),
    );

    if (missingVars.length > 0) {
      this.logger.error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      );
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      );
    }

    this.logger.log('Environment variables validation completed');
  }

  /**
   * Get security headers configuration
   */
  getSecurityHeaders() {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ],
          scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for Swagger UI compatibility
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' as const },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' as const },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' as const },
      xssFilter: true,
    };
  }

  /**
   * Get CORS configuration
   */
  getCorsConfiguration() {
    const allowedOrigins = this.configService
      .get('ALLOWED_ORIGINS')
      ?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://foodmission.dev',
      'https://api.foodmission.dev',
    ];

    return {
      origin: (
        origin: string,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          this.logger.warn(`CORS blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Correlation-ID',
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
    };
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, details: any = {}) {
    this.logger.warn(`Security Event: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

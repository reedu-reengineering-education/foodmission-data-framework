import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { SecurityService } from '../security.service';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: RateLimitStore = {};
  private defaultLimit = 100;
  private defaultTtl = 60000; // 1 minute

  constructor(private readonly securityService: SecurityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Skip rate limiting for health checks
    if (request.url?.startsWith('/api/v1/health')) {
      return true;
    }

    // Skip rate limiting for metrics endpoint (internal monitoring)
    if (request.url?.startsWith('/api/v1/metrics')) {
      return true;
    }

    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const tracker = this.getTracker(request);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanupExpiredEntries(now);
    
    const entry = this.store[tracker];
    
    if (!entry) {
      // First request from this tracker
      this.store[tracker] = {
        count: 1,
        resetTime: now + this.defaultTtl,
      };
      return true;
    }
    
    if (now > entry.resetTime) {
      // Reset the counter
      entry.count = 1;
      entry.resetTime = now + this.defaultTtl;
      return true;
    }
    
    if (entry.count >= this.defaultLimit) {
      // Rate limit exceeded
      this.securityService.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        url: request.url,
        method: request.method,
        userId: request.user?.sub,
        limit: this.defaultLimit,
        ttl: this.defaultTtl,
      });
      
      throw new ThrottlerException();
    }
    
    // Increment counter
    entry.count++;
    return true;
  }

  private getTracker(req: Record<string, any>): string {
    // Use IP address and user ID (if authenticated) for tracking
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userId = req.user?.sub || 'anonymous';
    return `${ip}-${userId}`;
  }

  private cleanupExpiredEntries(now: number) {
    for (const [key, entry] of Object.entries(this.store)) {
      if (now > entry.resetTime) {
        delete this.store[key];
      }
    }
  }
}
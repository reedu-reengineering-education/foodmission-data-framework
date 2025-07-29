import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { RateLimitGuard } from './rate-limit.guard';
import { SecurityService } from '../security.service';
import { ConfigService } from '@nestjs/config';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let securityService: SecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        SecurityService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'test-value'),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    securityService = module.get<SecurityService>(SecurityService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should create tracker from IP and user ID', () => {
      const req = {
        ip: '192.168.1.1',
        user: { sub: 'user-123' },
      };

      const tracker = guard['getTracker'](req);
      expect(tracker).toBe('192.168.1.1-user-123');
    });

    it('should handle missing IP', () => {
      const req = {
        connection: { remoteAddress: '10.0.0.1' },
        user: { sub: 'user-123' },
      };

      const tracker = guard['getTracker'](req);
      expect(tracker).toBe('10.0.0.1-user-123');
    });

    it('should handle anonymous user', () => {
      const req = {
        ip: '192.168.1.1',
      };

      const tracker = guard['getTracker'](req);
      expect(tracker).toBe('192.168.1.1-anonymous');
    });

    it('should handle unknown IP', () => {
      const req = {
        user: { sub: 'user-123' },
      };

      const tracker = guard['getTracker'](req);
      expect(tracker).toBe('unknown-user-123');
    });
  });

  describe('canActivate', () => {
    beforeEach(() => {
      // Set NODE_ENV to something other than 'test' for rate limiting tests
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      // Reset NODE_ENV
      process.env.NODE_ENV = 'test';
      // Clear the rate limit store
      guard['store'] = {};
    });

    it('should allow first request', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.168.1.1',
            get: jest.fn(() => 'test-agent'),
            url: '/api/v1/foods',
            method: 'GET',
            user: { sub: 'user-123' },
          }),
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should skip health check endpoints', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/api/v1/health/check',
          }),
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should skip metrics endpoints', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            url: '/api/v1/metrics',
          }),
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should skip rate limiting in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.168.1.1',
            url: '/api/v1/foods',
          }),
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow requests within rate limit', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.168.1.1',
            get: jest.fn(() => 'test-agent'),
            url: '/api/v1/foods',
            method: 'GET',
            user: { sub: 'user-123' },
          }),
        }),
      } as ExecutionContext;

      // Make several requests within limit
      for (let i = 0; i < 5; i++) {
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should throw ThrottlerException when rate limit exceeded', async () => {
      const logSpy = jest.spyOn(securityService, 'logSecurityEvent');
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.168.1.1',
            get: jest.fn(() => 'test-agent'),
            url: '/api/v1/foods',
            method: 'POST',
            user: { sub: 'user-123' },
          }),
        }),
      } as ExecutionContext;

      // Set a low limit for testing
      guard['defaultLimit'] = 2;

      // Make requests up to the limit
      await guard.canActivate(context);
      await guard.canActivate(context);

      // This should exceed the limit
      await expect(guard.canActivate(context)).rejects.toThrow(
        ThrottlerException,
      );

      expect(logSpy).toHaveBeenCalledWith('RATE_LIMIT_EXCEEDED', {
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        url: '/api/v1/foods',
        method: 'POST',
        userId: 'user-123',
        limit: 2,
        ttl: 60000,
      });
    });

    it('should reset counter after TTL expires', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.168.1.1',
            get: jest.fn(() => 'test-agent'),
            url: '/api/v1/foods',
            method: 'GET',
            user: { sub: 'user-123' },
          }),
        }),
      } as ExecutionContext;

      // Set a low limit and TTL for testing
      guard['defaultLimit'] = 2;
      guard['defaultTtl'] = 100; // 100ms

      // Make requests up to the limit
      await guard.canActivate(context);
      await guard.canActivate(context);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow requests again
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});

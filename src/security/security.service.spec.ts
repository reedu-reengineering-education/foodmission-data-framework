import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecurityService } from './security.service';

describe('SecurityService', () => {
  let service: SecurityService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
                JWT_SECRET: 'test-secret-that-is-long-enough-for-security',
                KEYCLOAK_BASE_URL: 'http://localhost:8080',
                KEYCLOAK_REALM: 'test-realm',
                KEYCLOAK_CLIENT_ID: 'test-client',
                ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = service.sanitizeHtml(input);
      expect(result).toBe('Hello World');
    });

    it('should handle empty input', () => {
      expect(service.sanitizeHtml('')).toBe('');
      expect(service.sanitizeHtml(null as any)).toBe(null);
      expect(service.sanitizeHtml(undefined as any)).toBe(undefined);
    });

    it('should handle non-string input', () => {
      expect(service.sanitizeHtml(123 as any)).toBe(123);
      expect(service.sanitizeHtml({} as any)).toEqual({});
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string input', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = service.sanitizeInput(input);
      expect(result).toBe('Hello');
    });

    it('should sanitize object input', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        description: 'Safe text',
        nested: {
          value: '<img src="x" onerror="alert(1)">',
        },
      };
      const result = service.sanitizeInput(input);
      expect(result).toEqual({
        name: 'John',
        description: 'Safe text',
        nested: {
          value: '',
        },
      });
    });

    it('should sanitize array input', () => {
      const input = ['<script>test</script>', 'safe', '<b>bold</b>'];
      const result = service.sanitizeInput(input);
      expect(result).toEqual(['', 'safe', 'bold']);
    });

    it('should handle mixed types', () => {
      const input = {
        strings: ['<script>test</script>', 'safe'],
        number: 123,
        boolean: true,
        object: {
          html: '<div>content</div>',
        },
      };
      const result = service.sanitizeInput(input);
      expect(result).toEqual({
        strings: ['', 'safe'],
        number: 123,
        boolean: true,
        object: {
          html: 'content',
        },
      });
    });
  });

  describe('validateEnvironmentVariables', () => {
    it('should pass with valid environment variables', () => {
      expect(() => service.validateEnvironmentVariables()).not.toThrow();
    });

    it('should throw error for missing required variables', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'DATABASE_URL') return undefined;
        return 'test-value';
      });

      expect(() => service.validateEnvironmentVariables()).toThrow(
        'Missing required environment variables: DATABASE_URL'
      );
    });

    it('should warn about weak JWT secret', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'short';
        const config = {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
          KEYCLOAK_BASE_URL: 'http://localhost:8080',
          KEYCLOAK_REALM: 'test-realm',
          KEYCLOAK_CLIENT_ID: 'test-client',
        };
        return config[key];
      });

      service.validateEnvironmentVariables();
      expect(loggerSpy).toHaveBeenCalledWith(
        'JWT_SECRET should be at least 32 characters long for security'
      );
    });
  });

  describe('getSecurityHeaders', () => {
    it('should return security headers configuration', () => {
      const headers = service.getSecurityHeaders();
      expect(headers).toHaveProperty('contentSecurityPolicy');
      expect(headers).toHaveProperty('frameguard');
      expect(headers).toHaveProperty('hsts');
      expect(headers.hidePoweredBy).toBe(true);
      expect(headers.noSniff).toBe(true);
      expect(headers.xssFilter).toBe(true);
    });

    it('should have proper CSP directives', () => {
      const headers = service.getSecurityHeaders();
      const csp = headers.contentSecurityPolicy.directives;
      expect(csp.defaultSrc).toEqual(["'self'"]);
      expect(csp.objectSrc).toEqual(["'none'"]);
      expect(csp.frameSrc).toEqual(["'none'"]);
    });
  });

  describe('getCorsConfiguration', () => {
    it('should return CORS configuration', () => {
      const corsConfig = service.getCorsConfiguration();
      expect(corsConfig).toHaveProperty('origin');
      expect(corsConfig).toHaveProperty('methods');
      expect(corsConfig).toHaveProperty('allowedHeaders');
      expect(corsConfig.credentials).toBe(true);
    });

    it('should allow configured origins', (done) => {
      const corsConfig = service.getCorsConfiguration();
      const callback = jest.fn((err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });

      corsConfig.origin('http://localhost:3000', callback);
    });

    it('should block unconfigured origins', (done) => {
      const corsConfig = service.getCorsConfiguration();
      const callback = jest.fn((err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Not allowed by CORS');
        expect(allow).toBe(false);
        done();
      });

      corsConfig.origin('http://malicious-site.com', callback);
    });

    it('should allow requests with no origin', (done) => {
      const corsConfig = service.getCorsConfiguration();
      const callback = jest.fn((err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });

      corsConfig.origin(undefined as any, callback);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      
      service.logSecurityEvent('TEST_EVENT', { detail: 'test' });
      
      expect(loggerSpy).toHaveBeenCalledWith(
        'Security Event: TEST_EVENT',
        expect.objectContaining({
          event: 'TEST_EVENT',
          detail: 'test',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log security events without details', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      
      service.logSecurityEvent('SIMPLE_EVENT');
      
      expect(loggerSpy).toHaveBeenCalledWith(
        'Security Event: SIMPLE_EVENT',
        expect.objectContaining({
          event: 'SIMPLE_EVENT',
          timestamp: expect.any(String),
        })
      );
    });
  });
});
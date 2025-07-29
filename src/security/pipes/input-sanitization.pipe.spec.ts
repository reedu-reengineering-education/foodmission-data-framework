import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InputSanitizationPipe } from './input-sanitization.pipe';
import { SecurityService } from '../security.service';
import { ConfigService } from '@nestjs/config';

describe('InputSanitizationPipe', () => {
  let pipe: InputSanitizationPipe;
  let securityService: SecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputSanitizationPipe,
        SecurityService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'test-value'),
          },
        },
      ],
    }).compile();

    pipe = module.get<InputSanitizationPipe>(InputSanitizationPipe);
    securityService = module.get<SecurityService>(SecurityService);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should sanitize input using SecurityService', () => {
      const input = '<script>alert("xss")</script>Hello';
      const metadata = { type: 'body' } as any;
      
      const result = pipe.transform(input, metadata);
      expect(result).toBe('Hello');
    });

    it('should handle null/undefined input', () => {
      const metadata = { type: 'body' } as any;
      
      expect(pipe.transform(null, metadata)).toBeNull();
      expect(pipe.transform(undefined, metadata)).toBeUndefined();
    });

    it('should validate body size', () => {
      const largeObject = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      const metadata = { type: 'body' } as any;
      
      expect(() => pipe.transform(largeObject, metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform(largeObject, metadata)).toThrow('Request body too large');
    });

    it('should validate query parameters count', () => {
      const manyParams = {};
      for (let i = 0; i < 60; i++) {
        manyParams[`param${i}`] = 'value';
      }
      const metadata = { type: 'query' } as any;
      
      expect(() => pipe.transform(manyParams, metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform(manyParams, metadata)).toThrow('Too many query parameters');
    });

    it('should validate query parameter value length', () => {
      const longValue = 'x'.repeat(1500);
      const queryParams = { longParam: longValue };
      const metadata = { type: 'query' } as any;
      
      expect(() => pipe.transform(queryParams, metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform(queryParams, metadata)).toThrow("Query parameter 'longParam' is too long");
    });

    it('should allow valid query parameters', () => {
      const validParams = {
        search: 'apple',
        category: 'fruit',
        limit: '10',
      };
      const metadata = { type: 'query' } as any;
      
      expect(() => pipe.transform(validParams, metadata)).not.toThrow();
    });

    it('should allow valid body size', () => {
      const validBody = {
        name: 'Apple',
        description: 'A red apple',
        category: 'fruit',
      };
      const metadata = { type: 'body' } as any;
      
      expect(() => pipe.transform(validBody, metadata)).not.toThrow();
    });

    it('should handle sanitization errors', () => {
      const logSpy = jest.spyOn(securityService, 'logSecurityEvent');
      jest.spyOn(securityService, 'sanitizeInput').mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const input = 'test input';
      const metadata = { type: 'body' } as any;
      
      expect(() => pipe.transform(input, metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform(input, metadata)).toThrow('Invalid input data');
      expect(logSpy).toHaveBeenCalledWith('INPUT_SANITIZATION_ERROR', {
        error: 'Sanitization failed',
        value: 'test input',
        metadata,
      });
    });

    it('should handle object sanitization errors', () => {
      const logSpy = jest.spyOn(securityService, 'logSecurityEvent');
      jest.spyOn(securityService, 'sanitizeInput').mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const input = { name: 'test' };
      const metadata = { type: 'body' } as any;
      
      expect(() => pipe.transform(input, metadata)).toThrow(BadRequestException);
      expect(logSpy).toHaveBeenCalledWith('INPUT_SANITIZATION_ERROR', {
        error: 'Sanitization failed',
        value: JSON.stringify(input),
        metadata,
      });
    });

    it('should not validate size for non-body/query types', () => {
      const largeInput = 'x'.repeat(2 * 1024 * 1024);
      const metadata = { type: 'param' } as any;
      
      expect(() => pipe.transform(largeInput, metadata)).not.toThrow();
    });
  });
});
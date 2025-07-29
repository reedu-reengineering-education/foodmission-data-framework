import { Injectable, PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { SecurityService } from '../security.service';

@Injectable()
export class InputSanitizationPipe implements PipeTransform {
  constructor(private readonly securityService: SecurityService) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      return value;
    }

    try {
      // Additional validation for specific types
      if (metadata.type === 'body') {
        this.validateBodySize(value);
      }

      if (metadata.type === 'query') {
        this.validateQueryParameters(value);
      }

      // Sanitize the input to prevent XSS and injection attacks
      const sanitized = this.securityService.sanitizeInput(value);
      
      return sanitized;
    } catch (error) {
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.securityService.logSecurityEvent('INPUT_SANITIZATION_ERROR', {
        error: error.message,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        metadata,
      });
      
      throw new BadRequestException('Invalid input data');
    }
  }

  private validateBodySize(body: any) {
    const bodyString = JSON.stringify(body);
    const maxSize = 1024 * 1024; // 1MB limit

    if (bodyString.length > maxSize) {
      throw new BadRequestException('Request body too large');
    }
  }

  private validateQueryParameters(query: any) {
    const maxParams = 50;
    const maxValueLength = 1000;

    if (Object.keys(query).length > maxParams) {
      throw new BadRequestException('Too many query parameters');
    }

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' && value.length > maxValueLength) {
        throw new BadRequestException(`Query parameter '${key}' is too long`);
      }
    }
  }
}
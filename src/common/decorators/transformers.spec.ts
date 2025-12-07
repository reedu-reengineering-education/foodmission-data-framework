import { plainToInstance } from 'class-transformer';
import {
  TransformBooleanString,
  TransformEmptyStringToUndefined,
} from './transformers';

class TestDto {
  @TransformEmptyStringToUndefined()
  optionalString?: string;

  @TransformBooleanString()
  optionalBool?: boolean;
}

describe('transformers', () => {
  describe('TransformEmptyStringToUndefined', () => {
    it('should convert empty string to undefined', () => {
      const dto = plainToInstance(TestDto, { optionalString: '' });
      expect(dto.optionalString).toBeUndefined();
    });

    it('should convert whitespace string to undefined', () => {
      const dto = plainToInstance(TestDto, { optionalString: '   ' });
      expect(dto.optionalString).toBeUndefined();
    });

    it('should keep non-empty strings', () => {
      const dto = plainToInstance(TestDto, { optionalString: 'value' });
      expect(dto.optionalString).toBe('value');
    });
  });

  describe('TransformBooleanString', () => {
    it('should convert "true" to boolean true', () => {
      const dto = plainToInstance(TestDto, { optionalBool: 'true' });
      expect(dto.optionalBool).toBe(true);
    });

    it('should convert "false" to boolean false', () => {
      const dto = plainToInstance(TestDto, { optionalBool: 'false' });
      expect(dto.optionalBool).toBe(false);
    });

    it('should leave other values unchanged', () => {
      const dto = plainToInstance(TestDto, { optionalBool: 'maybe' as any });
      expect(dto.optionalBool).toBe('maybe');
    });
  });
});

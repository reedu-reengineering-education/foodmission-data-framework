import { plainToInstance } from 'class-transformer';
import {
  TransformBooleanString,
  TransformCSVToStringArray,
  TransformTrimToUndefined,
} from './transformers';

class TestDto {
  @TransformTrimToUndefined()
  optionalString?: string;

  @TransformBooleanString()
  optionalBool?: boolean;
}

class TestCSVDto {
  @TransformCSVToStringArray()
  csv?: string[] | string;
}

describe('transformers', () => {
  describe('TransformTrimToUndefined', () => {
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

  describe('TransformCSVToStringArray', () => {
    it('should split comma-separated string into trimmed array', () => {
      const dto = plainToInstance(TestCSVDto, { csv: 'a, b , c' });
      expect(dto.csv).toEqual(['a', 'b', 'c']);
    });

    it('should trim array entries and drop empties', () => {
      const dto = plainToInstance(TestCSVDto, { csv: [' a ', '', 'c'] });
      expect(dto.csv).toEqual(['a', 'c']);
    });

    it('should leave non-string/array unchanged', () => {
      const dto = plainToInstance(TestCSVDto, { csv: 123 as any });
      expect(dto.csv).toBe(123);
    });
  });
});

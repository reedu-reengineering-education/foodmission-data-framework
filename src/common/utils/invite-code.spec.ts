import {
  generateInviteCode,
  isValidInviteCode,
  INVITE_CODE_LENGTH,
} from './invite-code';

describe('invite-code utils', () => {
  describe('generateInviteCode', () => {
    it('should generate a code of correct length', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
    });

    it('should generate only uppercase alphanumeric characters', () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique codes on subsequent calls', () => {
      const codes = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        codes.add(generateInviteCode());
      }

      // All codes should be unique (extremely unlikely to have collisions in 100 iterations)
      expect(codes.size).toBe(iterations);
    });

    it('should not contain ambiguous characters (0, O, I, 1, L)', () => {
      // Generate multiple codes to increase confidence
      for (let i = 0; i < 50; i++) {
        const code = generateInviteCode();
        expect(code).not.toMatch(/[0OI1L]/);
      }
    });

    it('should generate codes that match the expected format (e.g., AXY1278)', () => {
      const code = generateInviteCode();
      // Should be 7 characters, uppercase letters and digits only
      expect(code).toMatch(/^[A-Z0-9]{7}$/);
    });
  });

  describe('isValidInviteCode', () => {
    it('should return true for valid invite codes', () => {
      expect(isValidInviteCode('AXY1278')).toBe(true);
      expect(isValidInviteCode('ABCDEFG')).toBe(true);
      expect(isValidInviteCode('1234567')).toBe(true);
      expect(isValidInviteCode('A1B2C3D')).toBe(true);
    });

    it('should return true for generated codes', () => {
      const code = generateInviteCode();
      expect(isValidInviteCode(code)).toBe(true);
    });

    it('should return false for codes that are too short', () => {
      expect(isValidInviteCode('ABC123')).toBe(false);
      expect(isValidInviteCode('A')).toBe(false);
      expect(isValidInviteCode('')).toBe(false);
    });

    it('should return false for codes that are too long', () => {
      expect(isValidInviteCode('ABC12345')).toBe(false);
      expect(isValidInviteCode('ABCDEFGHIJ')).toBe(false);
    });

    it('should return false for codes with lowercase letters', () => {
      expect(isValidInviteCode('axy1278')).toBe(false);
      expect(isValidInviteCode('Axy1278')).toBe(false);
    });

    it('should return false for codes with special characters', () => {
      expect(isValidInviteCode('ABC-123')).toBe(false);
      expect(isValidInviteCode('ABC_123')).toBe(false);
      expect(isValidInviteCode('ABC 123')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidInviteCode(null as unknown as string)).toBe(false);
      expect(isValidInviteCode(undefined as unknown as string)).toBe(false);
    });

    it('should return false for UUID format (old format)', () => {
      expect(isValidInviteCode('550e8400-e29b-41d4-a716-446655440000')).toBe(
        false,
      );
    });
  });

  describe('INVITE_CODE_LENGTH', () => {
    it('should be 7 characters', () => {
      expect(INVITE_CODE_LENGTH).toBe(7);
    });
  });
});

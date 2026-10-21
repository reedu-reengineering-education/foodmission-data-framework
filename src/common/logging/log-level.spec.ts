import { nestLogLevels, resolveLogLevel } from './log-level';

describe('log-level', () => {
  describe('resolveLogLevel', () => {
    it('returns a known level, ignoring case and whitespace', () => {
      expect(resolveLogLevel(' DEBUG ')).toBe('debug');
    });

    it('falls back to info for empty or unknown values', () => {
      expect(resolveLogLevel('')).toBe('info');
      expect(resolveLogLevel('http')).toBe('info');
    });
  });

  describe('nestLogLevels', () => {
    it('hides debug and verbose at info', () => {
      expect(nestLogLevels('info')).toEqual(['fatal', 'error', 'warn', 'log']);
    });

    it('includes debug at debug', () => {
      expect(nestLogLevels('debug')).toContain('debug');
      expect(nestLogLevels('debug')).not.toContain('verbose');
    });

    it('keeps only errors at error', () => {
      expect(nestLogLevels('error')).toEqual(['fatal', 'error']);
    });
  });
});

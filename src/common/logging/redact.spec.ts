import { redact, REDACTED } from './redact';

describe('redact', () => {
  it('replaces credential-like keys at any depth, ignoring case', () => {
    expect(
      redact({
        jwt: 'eyJ...',
        user: { Password: 'secret1', name: 'Ana' },
        headers: { Authorization: 'Bearer x', 'x-api-key': 'k' },
        list: [{ refreshToken: 'r' }],
      }),
    ).toEqual({
      jwt: REDACTED,
      user: { Password: REDACTED, name: 'Ana' },
      headers: { Authorization: REDACTED, 'x-api-key': REDACTED },
      list: [{ refreshToken: REDACTED }],
    });
  });

  it('returns strings, numbers and Errors unchanged', () => {
    const error = new Error('boom');
    expect(redact('text')).toBe('text');
    expect(redact(42)).toBe(42);
    expect(redact(error)).toBe(error);
  });

  it('does not modify the original object', () => {
    const original = { token: 't' };
    redact(original);
    expect(original.token).toBe('t');
  });

  it('handles circular references', () => {
    const value: Record<string, unknown> = { name: 'a' };
    value.self = value;
    expect(redact(value)).toEqual({ name: 'a', self: '[Circular]' });
  });
});

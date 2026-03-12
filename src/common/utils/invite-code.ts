import * as crypto from 'crypto';

/**
 * Characters used for generating invite codes.
 * Using uppercase letters and digits for better readability.
 * Excludes similar-looking characters (0, O, I, 1, L) to avoid confusion.
 */
const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 7;

/**
 * Generates a human-readable invite code.
 * Format: 7 uppercase alphanumeric characters (e.g., AXY1278)
 *
 * @returns A 7-character alphanumeric invite code
 */
export function generateInviteCode(): string {
  let code = '';
  while (code.length < INVITE_CODE_LENGTH) {
    const byte = crypto.randomBytes(1)[0];
    // 224 is the largest multiple of 32 (INVITE_CODE_CHARS.length) less than 256
    if (byte >= 224) {
      continue;
    }
    code += INVITE_CODE_CHARS[byte % INVITE_CODE_CHARS.length];
  }
  return code;
}

/**
 * Validates that a string matches the expected invite code format.
 * @param code The code to validate
 * @returns true if the code is valid, false otherwise
 */
export function isValidInviteCode(code: string): boolean {
  if (!code || code.length !== INVITE_CODE_LENGTH) {
    return false;
  }

  const validPattern = /^[A-Z0-9]{7}$/;
  return validPattern.test(code);
}

export { INVITE_CODE_LENGTH };

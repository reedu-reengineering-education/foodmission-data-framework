/**
 * Leaf module: idempotency keys for the account-lifecycle events.
 *
 * Both AuthService (the `/auth/register` route) and UserProfilesService (users
 * who appear via Keycloak without ever calling it) record USER_REGISTERED, and
 * the two must agree byte-for-byte or a user gets two registration facts.
 * AuthModule imports UsersModule, so the key lives here — a file that imports
 * nothing — rather than in either service.
 */

/** One USER_REGISTERED fact per user, ever. */
export function userRegisteredIdempotencyKey(userId: string): string {
  return `user-registered:${userId}`;
}

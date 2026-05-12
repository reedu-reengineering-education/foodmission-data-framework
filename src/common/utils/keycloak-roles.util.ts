/**
 * Extracts the roles array for a given Keycloak user object and clientId.
 * @param user The user object (decoded JWT or Keycloak user info)
 * @param clientId The Keycloak clientId (default: process.env.KEYCLOAK_CLIENT_ID || 'foodmission-api')
 * @returns The roles array for the client, or [] if not present.
 */
export function extractKeycloakRoles(
  user: { resource_access?: Record<string, { roles?: string[] }> },
  clientId: string = process.env.KEYCLOAK_CLIENT_ID || 'foodmission-api',
): string[] {
  if (user.resource_access && user.resource_access[clientId]) {
    return user.resource_access[clientId].roles ?? [];
  }
  return [];
}

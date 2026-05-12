import { extractKeycloakRoles } from './keycloak-roles.util';

describe('extractKeycloakRoles', () => {
  const clientId = 'test-client';
  const user = {
    resource_access: {
      [clientId]: {
        roles: ['user', 'admin'],
      },
    },
  };

  it('returns roles for valid client', () => {
    expect(extractKeycloakRoles(user, clientId)).toEqual(['user', 'admin']);
  });

  it('returns empty array if resource_access missing', () => {
    expect(extractKeycloakRoles({}, clientId)).toEqual([]);
  });

  it('returns empty array if clientId missing', () => {
    expect(extractKeycloakRoles({ resource_access: {} }, clientId)).toEqual([]);
  });

  it('returns empty array if roles missing', () => {
    expect(
      extractKeycloakRoles({ resource_access: { [clientId]: {} } }, clientId),
    ).toEqual([]);
  });

  it('uses default clientId if not provided', () => {
    process.env.KEYCLOAK_CLIENT_ID = 'test-client';
    expect(extractKeycloakRoles(user)).toEqual(['user', 'admin']);
  });
});

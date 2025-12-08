import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_PUBLIC } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from './database-auth.guards';
import { UserRepository } from '../../user/repositories/user.repository';

describe('DataBaseAuthGuard', () => {
  let guard: DataBaseAuthGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockRequest: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockUserRepository = {
      findByKeycloakId: jest.fn(),
    } as any;

    mockRequest = {
      user: null,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    guard = new DataBaseAuthGuard(mockReflector, mockUserRepository);
  });

  describe('canActivate', () => {
    it('should allow access when route is marked as public', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        META_PUBLIC,
        [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
      );
      expect(mockUserRepository.findByKeycloakId).not.toHaveBeenCalled();
    });

    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      [{}, 'empty object'],
    ])(
      'should throw UnauthorizedException when route is not public and user is %s',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (userValue, _description) => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        mockRequest.user = userValue;

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'No valid JWT token found',
        );
      },
    );

    it('should authenticate user when valid JWT token is present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const keycloakId = 'keycloak-123';
      const dbUserId = 'db-user-123';
      const jwtRoles = ['user', 'admin'];
      mockRequest.user = {
        sub: keycloakId,
        email: 'user@example.com',
        roles: jwtRoles,
      };
      const mockDbUser = {
        id: dbUserId,
        keycloakId: keycloakId,
      };

      mockUserRepository.findByKeycloakId.mockResolvedValue(mockDbUser as any);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockUserRepository.findByKeycloakId).toHaveBeenCalledWith(
        keycloakId,
      );
      expect(mockRequest.user.id).toBe(dbUserId);
      expect(mockRequest.user.keycloakId).toBe(keycloakId);
      expect(mockRequest.user.sub).toBe(keycloakId);
      expect(mockRequest.user.email).toBe('user@example.com');
      expect(mockRequest.user.roles).toEqual(jwtRoles);
    });

    it('should use cached user when available', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const keycloakId = 'keycloak-123';
      const dbUserId = 'db-user-123';
      mockRequest.user = { sub: keycloakId };

      mockUserRepository.findByKeycloakId.mockResolvedValue({
        id: dbUserId,
        keycloakId: keycloakId,
      } as any);

      await guard.canActivate(mockExecutionContext);

      mockUserRepository.findByKeycloakId.mockClear();

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockUserRepository.findByKeycloakId).not.toHaveBeenCalled();
      expect(mockRequest.user.id).toBe(dbUserId);
    });

    it('should throw UnauthorizedException when user not found in database', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const keycloakId = 'keycloak-123';
      mockRequest.user = { sub: keycloakId };

      mockUserRepository.findByKeycloakId.mockResolvedValue(null);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'User not found in database',
      );
    });

    it('should throw UnauthorizedException when database lookup fails', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const keycloakId = 'keycloak-123';
      mockRequest.user = { sub: keycloakId };

      const dbError = new Error('Database connection failed');
      mockUserRepository.findByKeycloakId.mockRejectedValue(dbError);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'Failed to authenticate user: Database connection failed',
      );
    });
  });
});

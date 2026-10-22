import {
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_PUBLIC } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from './database-auth.guards';
import { UsersRepository } from '../../users/repositories/users.repository';

describe('DataBaseAuthGuard', () => {
  let guard: DataBaseAuthGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockUserRepository: jest.Mocked<UsersRepository>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockRequest: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockUserRepository = {
      findByKeycloakId: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      touchLastLoginAt: jest.fn().mockResolvedValue({ count: 1 }),
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
      expect(mockUserRepository.touchLastLoginAt).toHaveBeenCalledWith(
        dbUserId,
        expect.any(Date),
        5 * 60 * 1000,
      );
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

    describe('logging', () => {
      let warn: jest.SpyInstance;
      let error: jest.SpyInstance;
      let log: jest.SpyInstance;

      beforeEach(() => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        warn = jest
          .spyOn(Logger.prototype, 'warn')
          .mockImplementation(() => undefined);
        error = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => undefined);
        log = jest
          .spyOn(Logger.prototype, 'log')
          .mockImplementation(() => undefined);
      });

      afterEach(() => jest.restoreAllMocks());

      it('logs a database failure as an error with its stack', async () => {
        mockRequest.user = { sub: 'keycloak-123' };
        const dbError = new Error('Database connection failed');
        mockUserRepository.findByKeycloakId.mockRejectedValue(dbError);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException,
        );

        expect(error).toHaveBeenCalledWith(
          'Database auth failed for Keycloak user keycloak-123: Database connection failed',
          dbError.stack,
        );
      });

      it('warns, without an error log, when the user has no local row', async () => {
        mockRequest.user = { sub: 'keycloak-123' };
        mockUserRepository.findByKeycloakId.mockResolvedValue(null);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'User not found in database',
        );

        expect(warn).toHaveBeenCalledWith(
          'Valid token but no local user for Keycloak user keycloak-123',
        );
        expect(error).not.toHaveBeenCalled();
      });

      it('logs when a user is linked to a new Keycloak id by email', async () => {
        mockRequest.user = { sub: 'keycloak-new', email: 'a@example.com' };
        mockUserRepository.findByKeycloakId.mockResolvedValue(null);
        mockUserRepository.findByEmail.mockResolvedValue({
          id: 'user-1',
          keycloakId: 'keycloak-old',
        } as any);
        mockUserRepository.update.mockResolvedValue({
          id: 'user-1',
          keycloakId: 'keycloak-new',
        } as any);

        await guard.canActivate(mockExecutionContext);

        expect(log).toHaveBeenCalledWith(
          'Linked user user-1 to Keycloak user keycloak-new by email (previous Keycloak id: keycloak-old)',
        );
        expect(log.mock.calls.join(' ')).not.toContain('a@example.com');
      });
    });
  });
});

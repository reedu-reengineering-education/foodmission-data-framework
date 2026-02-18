import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { HttpService } from '@nestjs/axios';
import { UserRepository } from '../user/repositories/user.repository';
import { UserProfileService } from '../user/services/user-profile.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';
import { HttpException } from '@nestjs/common';

describe('AuthService.register', () => {
  let service: AuthService;
  let mockHttpService: jest.Mocked<Partial<HttpService>>;
  let mockUserRepo: jest.Mocked<Partial<UserRepository>>;
  let mockProfileService: jest.Mocked<Partial<UserProfileService>>;
  let mockKeycloakAdminService: jest.Mocked<Partial<KeycloakAdminService>>;

  beforeEach(async () => {
    mockHttpService = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    mockUserRepo = {
      create: jest.fn(),
    };

    mockProfileService = {
      getOrCreateProfile: jest.fn(),
    };

    mockKeycloakAdminService = {
      createUser: jest.fn(),
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: UserProfileService, useValue: mockProfileService },
        { provide: KeycloakAdminService, useValue: mockKeycloakAdminService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should create local user when Keycloak returns body', async () => {
    const dto: any = {
      username: 'u1',
      password: 'p',
      email: 'e@example.com',
      firstName: 'First',
      lastName: 'Last',
    };

    // Mock KeycloakAdminService.createUser to return a user with ID
    const kcUser = {
      id: 'kc-1',
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
    };
    (mockKeycloakAdminService.createUser as jest.Mock).mockResolvedValue(
      kcUser,
    );

    const createdLocal = { id: 'local-1', email: dto.email };
    (mockUserRepo.create as jest.Mock).mockResolvedValue(createdLocal);

    const res = await service.register(dto);
    expect(res.createdUser).toBeDefined();
    expect(res.createdUser.id).toBe('kc-1');
    expect(res.localUser).toEqual(createdLocal);
    expect(mockKeycloakAdminService.createUser).toHaveBeenCalledWith({
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
    });
  });

  it('should extract id from Location header when body missing', async () => {
    const dto: any = {
      username: 'u2',
      password: 'p',
      email: 'e2@example.com',
      firstName: 'F2',
      lastName: 'L2',
    };

    // Mock KeycloakAdminService to return user with extracted ID
    const kcUser = { id: 'generated-id-123' };
    (mockKeycloakAdminService.createUser as jest.Mock).mockResolvedValue(
      kcUser,
    );

    const createdLocal = { id: 'local-2', email: dto.email };
    (mockUserRepo.create as jest.Mock).mockResolvedValue(createdLocal);

    const res = await service.register(dto);
    expect(res.createdUser).toBeDefined();
    expect(res.createdUser.id).toBe('generated-id-123');
    expect(res.localUser).toEqual(createdLocal);
  });

  it('should attempt cleanup and rethrow repo HttpException', async () => {
    const dto: any = {
      username: 'u3',
      password: 'p',
      email: 'e3@example.com',
      firstName: 'F3',
      lastName: 'L3',
    };

    // Mock KeycloakAdminService.createUser
    const kcUser = { id: 'kc-3', email: dto.email };
    (mockKeycloakAdminService.createUser as jest.Mock).mockResolvedValue(
      kcUser,
    );

    // repo throws HttpException (e.g. conflict)
    const conflict = new HttpException({ message: 'conflict' }, 409);
    (mockUserRepo.create as jest.Mock).mockRejectedValue(conflict);

    // Mock the cleanup deleteUser call
    (mockKeycloakAdminService.deleteUser as jest.Mock).mockResolvedValue(
      undefined,
    );

    await expect(service.register(dto)).rejects.toThrow(HttpException);
    expect(mockKeycloakAdminService.deleteUser).toHaveBeenCalledWith('kc-3');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { HttpService } from '@nestjs/axios';
import { UserRepository } from '../user/repositories/user.repository';
import { UserProfileService } from '../user/services/user-profile.service';
import { of, throwError } from 'rxjs';
import { HttpException } from '@nestjs/common';

describe('AuthService.register', () => {
  let service: AuthService;
  let mockHttpService: Partial<HttpService> & any;
  let mockUserRepo: Partial<UserRepository> & any;
  let mockProfileService: Partial<UserProfileService> & any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: UserProfileService, useValue: mockProfileService },
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

    // token endpoint
    (mockHttpService.post as jest.Mock).mockImplementationOnce(() =>
      of({ data: { access_token: 'token' } }),
    );
    // admin create endpoint returns body
    (mockHttpService.post as jest.Mock).mockImplementationOnce(() =>
      of({
        data: {
          id: 'kc-1',
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      }),
    );

    const createdLocal = { id: 'local-1', email: dto.email };
    (mockUserRepo.create as jest.Mock).mockResolvedValue(createdLocal);

    const res = await service.register(dto);
    expect(res.createdUser).toBeDefined();
    expect(res.createdUser.id).toBe('kc-1');
    expect(res.localUser).toEqual(createdLocal);
  });

  it('should extract id from Location header when body missing', async () => {
    const dto: any = {
      username: 'u2',
      password: 'p',
      email: 'e2@example.com',
      firstName: 'F2',
      lastName: 'L2',
    };

    (mockHttpService.post as jest.Mock).mockImplementationOnce(() =>
      of({ data: { access_token: 'token' } }),
    );

    (mockHttpService.post as jest.Mock).mockImplementationOnce(() =>
      of({
        status: 201,
        data: undefined,
        headers: { location: '/admin/realms/realm/users/generated-id-123' },
      }),
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

    (mockHttpService.post as jest.Mock).mockImplementationOnce(() =>
      of({ data: { access_token: 'token' } }),
    );

    (mockHttpService.post as jest.Mock).mockImplementationOnce(() =>
      of({ data: { id: 'kc-3', email: dto.email } }),
    );

    // repo throws HttpException (e.g. conflict)
    const conflict = new HttpException({ message: 'conflict' }, 409);
    (mockUserRepo.create as jest.Mock).mockRejectedValue(conflict);

    // expect delete to be called
    (mockHttpService.delete as jest.Mock).mockImplementation(() => of({}));

    await expect(service.register(dto)).rejects.toThrow(HttpException);
    expect(mockHttpService.delete).toHaveBeenCalled();
  });
});

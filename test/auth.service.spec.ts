import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { HttpService } from '@nestjs/axios';
import { UsersRepository } from '../src/users/repositories/users.repository';
import { UsersProfileService } from '../src/users/services/users-profile.service';
import { KeycloakAdminService } from '../src/keycloak-admin/keycloak-admin.service';
import { of } from 'rxjs';

describe('AuthService.login', () => {
  let service: AuthService;
  let httpService: jest.Mocked<HttpService>;
  let userProfileService: jest.Mocked<UsersProfileService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {},
        },
        {
          provide: UsersProfileService,
          useValue: {
            getOrCreateProfile: jest.fn(),
          },
        },
        {
          provide: KeycloakAdminService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    httpService = module.get(HttpService);
    userProfileService = module.get(UsersProfileService);
  });

  it('should call Keycloak token endpoint and userinfo, then ensure profile exists', async () => {
    const tokens = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    };
    const kcUser = {
      sub: 'kc-sub-123',
      email: 'admin@foodmission.dev',
      given_name: 'Admin',
      family_name: 'User',
    };

    httpService.post.mockReturnValueOnce(of({ data: tokens } as any));
    httpService.get.mockReturnValueOnce(of({ data: kcUser } as any));

    (userProfileService.getOrCreateProfile as jest.Mock).mockResolvedValueOnce(
      {},
    );

    const result = await service.login({
      username: 'admin',
      password: 'admin123',
    });

    expect(httpService.post).toHaveBeenCalled();
    expect(httpService.get).toHaveBeenCalled();
    expect(userProfileService.getOrCreateProfile).toHaveBeenCalledWith({
      sub: kcUser.sub,
      email: kcUser.email,
      given_name: kcUser.given_name,
      family_name: kcUser.family_name,
    });
    expect(result).toEqual(tokens);
  });
});

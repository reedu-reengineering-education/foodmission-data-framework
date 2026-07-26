import {
  AuthService,
  userLoggedInIdempotencyKey,
} from '../src/auth/auth.service';
import { HttpService } from '@nestjs/axios';
import { UsersRepository } from '../src/users/repositories/users.repository';
import { UserProfilesService } from '../src/users/services/user-profiles.service';
import { KeycloakAdminService } from '../src/keycloak-admin/keycloak-admin.service';
import { UserEventService } from '../src/events/services/user-event.service';
import {
  EventSource,
  EventSubjectType,
  EventType,
} from '../src/events/event-types';
import { of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';

const userEventServiceMock = {
  record: jest.fn(),
  findByIdempotencyKey: jest.fn(),
};

describe('AuthService.triggerPasswordReset', () => {
  let service: AuthService;
  let usersRepository: any;
  let keycloakAdminService: any;

  beforeEach(async () => {
    usersRepository = {
      findByEmail: jest.fn(),
    };
    keycloakAdminService = {
      sendResetPasswordEmail: jest.fn(),
    };
    userEventServiceMock.record.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: UserProfilesService,
          useValue: {},
        },
        {
          provide: KeycloakAdminService,
          useValue: keycloakAdminService,
        },
        {
          provide: UserEventService,
          useValue: userEventServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should trigger reset for self', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      keycloakId: 'kc-1',
      email: 'user@x.com',
    });
    keycloakAdminService.sendResetPasswordEmail.mockResolvedValue(undefined);
    await expect(
      service.triggerPasswordReset('kc-1', 'user@x.com', ['user'], undefined),
    ).resolves.toBeUndefined();
    expect(keycloakAdminService.sendResetPasswordEmail).toHaveBeenCalledWith(
      'kc-1',
      undefined,
    );
  });

  it('should trigger reset for admin', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      keycloakId: 'kc-2',
      email: 'other@x.com',
    });
    keycloakAdminService.sendResetPasswordEmail.mockResolvedValue(undefined);
    await expect(
      service.triggerPasswordReset(
        'kc-1',
        'other@x.com',
        ['admin'],
        'http://redirect',
      ),
    ).resolves.toBeUndefined();
    expect(keycloakAdminService.sendResetPasswordEmail).toHaveBeenCalledWith(
      'kc-2',
      'http://redirect',
    );
  });

  it('should throw NotFoundException if user not found for admin', async () => {
    usersRepository.findByEmail.mockResolvedValue(undefined);
    await expect(
      service.triggerPasswordReset(
        'kc-1',
        'notfound@x.com',
        ['admin'],
        undefined,
      ),
    ).rejects.toThrow('User not found');
  });
});

describe('AuthService.login', () => {
  let service: AuthService;
  let httpService: jest.Mocked<HttpService>;
  let userProfileService: jest.Mocked<UserProfilesService>;
  let usersRepository: { touchLastLoginAt: jest.Mock };
  let userEventService: { record: jest.Mock };

  beforeEach(async () => {
    usersRepository = {
      touchLastLoginAt: jest.fn().mockResolvedValue({ count: 1 }),
    };
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };

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
          useValue: usersRepository,
        },
        {
          provide: UserProfilesService,
          useValue: {
            getOrCreateProfile: jest.fn(),
          },
        },
        {
          provide: KeycloakAdminService,
          useValue: {},
        },
        {
          provide: UserEventService,
          useValue: userEventService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    httpService = module.get(HttpService);
    userProfileService = module.get(UserProfilesService);
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
    const profile = { id: 'local-user-1' };

    httpService.post.mockReturnValueOnce(of({ data: tokens } as any));
    httpService.get.mockReturnValueOnce(of({ data: kcUser } as any));

    (userProfileService.getOrCreateProfile as jest.Mock).mockResolvedValueOnce(
      profile,
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
    expect(usersRepository.touchLastLoginAt).toHaveBeenCalledWith(profile.id);
    expect(userEventService.record).toHaveBeenCalledWith({
      userId: profile.id,
      eventType: EventType.USER_LOGGED_IN,
      source: EventSource.API,
      subject: { type: EventSubjectType.USER, id: profile.id },
      idempotencyKey: userLoggedInIdempotencyKey(profile.id),
    });
    expect(result).toEqual(tokens);
  });

  it('should still return tokens when USER_LOGGED_IN recording fails', async () => {
    const tokens = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    };
    const kcUser = {
      sub: 'kc-sub-123',
      email: 'admin@foodmission.dev',
    };
    const profile = { id: 'local-user-1' };

    httpService.post.mockReturnValueOnce(of({ data: tokens } as any));
    httpService.get.mockReturnValueOnce(of({ data: kcUser } as any));
    (userProfileService.getOrCreateProfile as jest.Mock).mockResolvedValueOnce(
      profile,
    );
    userEventService.record.mockRejectedValueOnce(new Error('db down'));

    const result = await service.login({
      username: 'admin',
      password: 'admin123',
    });

    expect(result).toEqual(tokens);
    expect(userEventService.record).toHaveBeenCalled();
  });
});

describe('AuthService.sendResetPasswordEmailIfExists', () => {
  let service: AuthService;
  let usersRepository: any;
  let keycloakAdminService: any;

  beforeEach(async () => {
    usersRepository = {
      findByEmail: jest.fn(),
    };
    keycloakAdminService = {
      sendResetPasswordEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: {} },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: UserProfilesService, useValue: {} },
        { provide: KeycloakAdminService, useValue: keycloakAdminService },
        {
          provide: UserEventService,
          useValue: { record: jest.fn(), findByIdempotencyKey: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should return true if user exists and email sent', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      keycloakId: 'kc-1',
      email: 'user@x.com',
    });
    keycloakAdminService.sendResetPasswordEmail.mockResolvedValue(undefined);
    await expect(
      service.sendResetPasswordEmailIfExists('user@x.com'),
    ).resolves.toBe(true);
    expect(keycloakAdminService.sendResetPasswordEmail).toHaveBeenCalledWith(
      'kc-1',
      undefined,
    );
  });

  it('should return false if user does not exist', async () => {
    usersRepository.findByEmail.mockResolvedValue(undefined);
    await expect(
      service.sendResetPasswordEmailIfExists('notfound@x.com'),
    ).resolves.toBe(false);
    expect(keycloakAdminService.sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  it('should return false if email send fails', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      keycloakId: 'kc-2',
      email: 'fail@x.com',
    });
    keycloakAdminService.sendResetPasswordEmail.mockRejectedValue(
      new Error('Keycloak error'),
    );
    await expect(
      service.sendResetPasswordEmailIfExists('fail@x.com'),
    ).resolves.toBe(false);
    expect(keycloakAdminService.sendResetPasswordEmail).toHaveBeenCalledWith(
      'kc-2',
      undefined,
    );
  });
});

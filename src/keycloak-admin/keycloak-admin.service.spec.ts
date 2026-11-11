import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { KeycloakAdminService } from './keycloak-admin.service';

describe('KeycloakAdminService.createUser', () => {
  let service: KeycloakAdminService;
  let post: jest.Mock;

  beforeEach(async () => {
    process.env.KEYCLOAK_BASE_URL = 'http://keycloak.test';
    process.env.KEYCLOAK_REALM = 'foodmission';
    process.env.KEYCLOAK_SERVICE_CLIENT_ID = 'svc';

    post = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        { provide: HttpService, useValue: { post } },
      ],
    }).compile();
    service = module.get(KeycloakAdminService);
  });

  const createUser = () =>
    service.createUser({
      username: 'jane',
      email: 'jane@example.com',
      password: 'short',
    });

  it('returns the Keycloak error description when the password breaks the realm policy', async () => {
    post
      .mockReturnValueOnce(of({ data: { access_token: 'tok' } }))
      .mockReturnValueOnce(
        throwError(() => ({
          response: {
            status: 400,
            data: {
              error: 'invalidPasswordMinLengthMessage',
              error_description: 'Invalid password: minimum length 6.',
            },
          },
        })),
      );

    const error = await createUser().catch((err) => err);

    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toMatchObject({
      message: 'Invalid password: minimum length 6.',
    });
  });

  it('keeps Keycloak errorMessage when there is no error description', async () => {
    post
      .mockReturnValueOnce(of({ data: { access_token: 'tok' } }))
      .mockReturnValueOnce(
        throwError(() => ({
          response: {
            status: 409,
            data: { errorMessage: 'User exists with same username or email' },
          },
        })),
      );

    const error = await createUser().catch((err) => err);

    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toMatchObject({
      message: 'User exists with same username or email',
    });
  });
});

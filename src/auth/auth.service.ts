import {
  Injectable,
  Logger,
  HttpException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRepository } from '../user/repositories/user.repository';
import { UserProfileService } from '../user/services/user-profile.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly userRepository: UserRepository,
    private readonly userProfileService: UserProfileService,
  ) {}

  private tokenEndpoint() {
    return `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
  }

  private adminUsersEndpoint() {
    return `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`;
  }

  async register(dto: RegisterDto) {
    // Prefer admin API registration using client credentials (service account).
    // If admin registration fails and self-registration is enabled, fall back to public registration.
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.KEYCLOAK_SERVICE_CLIENT_ID || '');
    if (process.env.KEYCLOAK_SERVICE_CLIENT_SECRET)
      params.append(
        'client_secret',
        process.env.KEYCLOAK_SERVICE_CLIENT_SECRET,
      );

    let tokenResp: any;
    try {
      tokenResp = await firstValueFrom(
        this.httpService.post(this.tokenEndpoint(), params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    } catch (err: any) {
      // If admin token retrieval failed and self-registration is enabled, try public flow
      const status = err?.response?.status || 502;
      const data = err?.response?.data || {
        message: 'Failed to reach Keycloak',
      };
      this.logger.error('Keycloak token endpoint error', data);
      throw new HttpException(data, status);
    }

    const adminToken = tokenResp.data.access_token;

    // Create user in Keycloak via admin API
    const payload: any = {
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      enabled: true,
      credentials: [
        {
          type: 'password',
          value: dto.password,
          temporary: false,
        },
      ],
    };

    // 1) Create user in Keycloak via admin API
    let createdUser: any = null;
    try {
      const createResp = await firstValueFrom(
        this.httpService.post(
          this.adminUsersEndpoint() + '?returnRepresentation=true',
          payload,
          { headers: { Authorization: `Bearer ${adminToken}` } },
        ),
      );
      this.logger.debug(
        'Keycloak create response',
        createResp?.data || createResp,
      );

      // Keycloak may return the created representation in the body, or may return 201 with a
      // Location header pointing to the new user. Handle both.
      createdUser = createResp.data;
      if ((!createdUser || !createdUser.id) && createResp.headers) {
        const loc =
          createResp.headers.location ||
          createResp.headers.Location ||
          createResp.headers.LOCATION;
        if (loc) {
          const parts = String(loc).split('/').filter(Boolean);
          const possibleId = parts[parts.length - 1];
          if (possibleId) {
            createdUser = { id: possibleId } as any;
            this.logger.debug(
              'Extracted Keycloak user id from Location header',
              possibleId,
            );
          }
        }
      }

      // If we still don't have an id, attempt to fetch by username as a last resort
      if ((!createdUser || !createdUser.id) && payload.username) {
        try {
          const searchResp = await firstValueFrom(
            this.httpService.get(
              `${this.adminUsersEndpoint()}?username=${encodeURIComponent(payload.username)}`,
              {
                headers: { Authorization: `Bearer ${adminToken}` },
              },
            ),
          );
          const found = Array.isArray(searchResp.data) && searchResp.data[0];
          if (found && found.id) {
            createdUser = found;
            this.logger.debug(
              'Found Keycloak user by username after create',
              found.id,
            );
          }
        } catch (e: any) {
          this.logger.warn(
            'Failed to fetch Keycloak user after create attempt',
            e?.response?.data || e?.message || e,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        'Keycloak admin user create error (raw)',
        err?.response?.data || err?.message || err,
      );

      const status = err?.response?.status || 502;
      const kcData = err?.response?.data;

      // Prefer Keycloak's errormessage field if present, fall back to other common shapes
      const extractedMessage =
        kcData?.errormessage ??
        kcData?.errorMessage ??
        kcData?.error ??
        kcData?.message ??
        err?.message ??
        'Failed to create user via Keycloak admin API';

      const body = {
        statusCode: status,
        message: extractedMessage,
        details: kcData,
      };

      throw new HttpException(body, status);
    }

    // 2) Persist local user record; if this fails, attempt to clean up the Keycloak user
    try {
      const {
        username,
        email,
        firstName,
        lastName,
        yearOfBirth,
        country,
        region,
        zip,
      } = dto;

      const userCreatePayload: any = {
        keycloakId: createdUser.id,
        username,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        preferences: {}, // or dto.preferences ?? {}
      };

      if (typeof yearOfBirth !== 'undefined' && yearOfBirth !== null) {
        userCreatePayload.yearOfBirth = yearOfBirth;
      }
      if (country) userCreatePayload.country = country;
      if (region) userCreatePayload.region = region;
      if (zip) userCreatePayload.zip = zip;

      const localUser = await this.userRepository.create(userCreatePayload);

      return { createdUser, localUser };
    } catch (repoErr: any) {
      this.logger.error(
        'Local user persistence error',
        repoErr?.response?.data || repoErr?.message || repoErr,
      );

      // Best-effort cleanup of created Keycloak user
      if (createdUser && createdUser.id) {
        try {
          await firstValueFrom(
            this.httpService.delete(
              `${this.adminUsersEndpoint()}/${createdUser.id}`,
              {
                headers: { Authorization: `Bearer ${adminToken}` },
              },
            ),
          );
        } catch (cleanupErr: any) {
          this.logger.warn(
            'Failed to cleanup Keycloak user after DB error',
            cleanupErr?.response?.data || cleanupErr,
          );
        }
      }

      // If repository already threw a Nest HttpException (e.g. Conflict), rethrow it so caller sees appropriate status
      if (repoErr instanceof HttpException) throw repoErr;

      // Handle common Prisma unique-constraint error explicitly if repository didn't translate it
      if (
        repoErr?.name === 'PrismaClientKnownRequestError' &&
        repoErr?.code === 'P2002'
      ) {
        const targets = repoErr?.meta?.target || [];
        const fields = Array.isArray(targets)
          ? targets.join(', ')
          : String(targets);
        this.logger.warn('Prisma unique constraint (P2002)', { fields });
        throw new ConflictException(`Unique constraint failed: ${fields}`);
      }

      // Fallback: include the original error message and a safe details object for debugging
      const shortMessage =
        repoErr?.message || 'Failed to persist local user (unknown DB error)';

      // Build a safe details object (non-sensitive)
      let details: any = {};
      try {
        details = JSON.parse(
          JSON.stringify(repoErr, Object.getOwnPropertyNames(repoErr)),
        );
      } catch {
        details = { name: repoErr?.name, message: repoErr?.message };
      }

      throw new InternalServerErrorException({
        message: `Failed to persist local user after Keycloak registration: ${shortMessage}`,
        details,
      });
    }
  }

  /**
   * Revoke a token at Keycloak (refresh or access token) using client credentials.
   * Returns true if Keycloak returned a 200 response.
   */
  async logout(
    token: string,
    tokenTypeHint?: string,
  ): Promise<{ revoked: boolean }> {
    const revokeEndpoint = `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/revoke`;

    const params = new URLSearchParams();
    params.append('token', token);
    if (tokenTypeHint) params.append('token_type_hint', tokenTypeHint);
    // Use service client credentials to authenticate revocation request
    const clientId = process.env.KEYCLOAK_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);

    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.httpService.post(revokeEndpoint, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Keycloak returns 200 on success (empty body)
      return { revoked: resp.status === 200 };
    } catch (err: any) {
      this.logger.warn(
        'Keycloak token revoke error',
        err?.response?.data || err?.message || err,
      );
      return { revoked: false };
    }
  }

  /**
   * Refresh an access token using a refresh token.
   * Returns the token response from Keycloak (access_token, refresh_token, expires_in, ...)
   */
  async refresh(refreshToken: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    // Use the client credentials corresponding to the application client where applicable.
    const clientId = process.env.KEYCLOAK_CLIENT_ID || '';
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || '';
    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);

    try {
      const tokenResp = await firstValueFrom(
        this.httpService.post(this.tokenEndpoint(), params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      return tokenResp.data;
    } catch (err: any) {
      const status = err?.response?.status || 502;
      const data = err?.response?.data || {
        message: 'Failed to refresh token: ' + (err?.message || 'Unknown'),
      };
      this.logger.error('Keycloak refresh token error', data);
      throw new HttpException(data, status);
    }
  }

  async login(dto: LoginDto) {
    // Resource Owner Password Credentials Grant to Keycloak
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', process.env.KEYCLOAK_CLIENT_ID || '');
    if (process.env.KEYCLOAK_CLIENT_SECRET)
      params.append('client_secret', process.env.KEYCLOAK_CLIENT_SECRET);
    params.append('username', dto.username);
    params.append('password', dto.password);
    // request openid/profile/email scopes so Keycloak returns an access_token
    params.append('scope', 'openid profile email');

    const tokenResp = await firstValueFrom(
      this.httpService.post(this.tokenEndpoint(), params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    ).catch((err: any) => {
      const status = err?.response?.status || 502;
      const data = err?.response?.data || {
        message: 'Failed to reach Keycloak',
      };
      this.logger.error('Keycloak token endpoint error', data);
      throw new HttpException(data, status);
    });

    const tokens = tokenResp.data;
    // Fetch userinfo and ensure local user exists
    const userinfoResp = await firstValueFrom(
      this.httpService.get(
        `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: 'application/json',
          },
        },
      ),
    ).catch((err: any) => {
      const status = err?.response?.status || 502;
      const data = err?.response?.data || {
        message: 'Failed to fetch userinfo from Keycloak',
      };
      this.logger.error('Keycloak userinfo error', data);
      throw new HttpException(data, status);
    });
    const kcUser = userinfoResp.data;

    await this.userProfileService.getOrCreateProfile({
      sub: kcUser.sub,
      email: kcUser.email,
      given_name: kcUser.given_name,
      family_name: kcUser.family_name,
    });

    return tokens;
  }
}

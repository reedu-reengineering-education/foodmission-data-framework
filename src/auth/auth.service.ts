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
import { UsersRepository } from '../users/repositories/users.repository';
import { UserProfilesService } from '../users/services/user-profiles.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly userRepository: UsersRepository,
    private readonly userProfileService: UserProfilesService,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  private tokenEndpoint() {
    return `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
  }

  async register(dto: RegisterDto) {
    // Create user in Keycloak via admin API using KeycloakAdminService
    const createdUser = await this.keycloakAdminService.createUser({
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });

    if (!createdUser || !createdUser.id) {
      throw new InternalServerErrorException(
        'Failed to get Keycloak user ID after creation',
      );
    }

    // Persist local user record; if this fails, attempt to clean up the Keycloak user

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

      // Actually persist user (uncomment and implement as needed)
      // await this.userRepository.create(userCreatePayload);
    } catch (repoErr: any) {
      this.logger.error(
        'Local user persistence error',
        repoErr?.response?.data || repoErr?.message || repoErr,
      );

      // Best-effort cleanup of created Keycloak user
      if (createdUser && createdUser.id) {
        try {
          await this.keycloakAdminService.deleteUser(createdUser.id);
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
   * Triggers a password reset email for the user (self or admin for others).
   * @param requesterKeycloakId - The Keycloak ID of the requester
   * @param targetEmail - The email of the user to reset
   * @param requesterRoles - The roles of the requester
   */
  async triggerPasswordReset(
    requesterKeycloakId: string,
    targetEmail: string,
    requesterRoles: string[],
    redirectUri?: string,
  ): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findByEmail(targetEmail);
    if (!user) {
      // Do not leak existence
      return;
    }
    // Only allow if requester is admin or is requesting for self

    const isAdmin =
      Array.isArray(requesterRoles) && requesterRoles.includes('admin');

    if (!isAdmin && user.keycloakId !== requesterKeycloakId) {
      throw new HttpException('Forbidden', 403);
    }
    await this.keycloakAdminService.sendResetPasswordEmail(
      user.keycloakId,
      redirectUri,
    );
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

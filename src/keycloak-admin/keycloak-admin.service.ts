import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

/**
 * Service for Keycloak Admin API operations.
 * Uses service account credentials for administrative actions.
 */
@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);

  constructor(private readonly httpService: HttpService) {}

  private tokenEndpoint() {
    return `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
  }

  private adminUsersEndpoint() {
    return `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${process.env.KEYCLOAK_REALM}/users`;
  }

  /**
   * Get an admin access token using service account credentials.
   */
  private async getAdminToken(): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.KEYCLOAK_SERVICE_CLIENT_ID || '');
    if (process.env.KEYCLOAK_SERVICE_CLIENT_SECRET) {
      params.append(
        'client_secret',
        process.env.KEYCLOAK_SERVICE_CLIENT_SECRET,
      );
    }

    let tokenResp: AxiosResponse;
    try {
      tokenResp = await firstValueFrom(
        this.httpService.post(this.tokenEndpoint(), params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const data = err?.response?.data || {
        error: 'token_error',
        error_description: 'Failed to obtain service account token',
      };
      this.logger.error(
        'Failed to get service account token',
        JSON.stringify(data),
      );
      throw new HttpException(data, status);
    }

    return tokenResp.data.access_token;
  }

  /**
   * Create a new user in Keycloak via Admin API.
   * @param userData - User creation payload
   * @returns The created user representation with Keycloak ID
   */
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<any> {
    const accessToken = await this.getAdminToken();

    const payload: any = {
      username: userData.username,
      email: userData.email,
      enabled: true,
      credentials: [
        {
          type: 'password',
          value: userData.password,
          temporary: false,
        },
      ],
    };

    let createdUser: any = null;
    try {
      const createResp = await firstValueFrom(
        this.httpService.post(
          this.adminUsersEndpoint() + '?returnRepresentation=true',
          payload,
          { headers: { Authorization: `Bearer ${accessToken}` } },
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
                headers: { Authorization: `Bearer ${accessToken}` },
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

      return createdUser;
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
  }

  /**
   * Delete a user from Keycloak by their Keycloak ID (sub).
   * @param keycloakId - The Keycloak user ID (sub claim)
   */
  async deleteUser(keycloakId: string): Promise<void> {
    const accessToken = await this.getAdminToken();

    const deleteUrl = `${this.adminUsersEndpoint()}/${keycloakId}`;
    try {
      await firstValueFrom(
        this.httpService.delete(deleteUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(`Successfully deleted Keycloak user: ${keycloakId}`);
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const data = err?.response?.data || {
        error: 'delete_error',
        error_description: 'Failed to delete user from Keycloak',
      };
      this.logger.error(
        `Failed to delete Keycloak user ${keycloakId}`,
        JSON.stringify(data),
      );

      // If user not found in Keycloak (404), log but don't throw
      if (status === 404) {
        this.logger.warn(
          `Keycloak user ${keycloakId} not found - may have been already deleted`,
        );
        return;
      }

      throw new HttpException(data, status);
    }
  }
}

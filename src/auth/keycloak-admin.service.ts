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

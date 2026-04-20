import { Injectable, Logger } from '@nestjs/common';
import {
  KeycloakAdminEventDto,
  KeycloakUserEventDto,
} from './dto/keycloak-event.dto';
import { UserProfilesService } from '../users/services/user-profiles.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly userProfilesService: UserProfilesService) {}

  /**
   * Extract the event action from the type string
   * e.g., "access.DELETE_ACCOUNT" -> "DELETE_ACCOUNT"
   *       "admin.USER-DELETE" -> "USER-DELETE"
   */
  private extractEventAction(type: string): string {
    const parts = type.split('.');
    return parts.length > 1 ? parts[1] : type;
  }

  /**
   * Process incoming Keycloak user events
   * Currently only handles DELETE_ACCOUNT events
   */
  async handleKeycloakUserEvent(event: KeycloakUserEventDto): Promise<void> {
    const keycloakUserId = event.authDetails?.userId;
    const action = this.extractEventAction(event.type);

    this.logger.log(
      `Received Keycloak user event: ${event.type} for user ${keycloakUserId || 'unknown'}`,
    );

    switch (action) {
      case 'DELETE_ACCOUNT':
        await this.handleUserDelete(event);
        break;
      // Uncomment to handle other events:
      // case 'LOGIN':
      //   await this.handleUserLogin(event);
      //   break;
      // case 'LOGOUT':
      //   await this.handleUserLogout(event);
      //   break;
      // case 'REGISTER':
      //   await this.handleUserRegister(event);
      //   break;
      // case 'UPDATE_PROFILE':
      //   await this.handleUserProfileUpdate(event);
      //   break;
      default:
        this.logger.debug(`Unhandled user event type: ${event.type}`);
    }
  }

  /**
   * Process incoming Keycloak admin events
   * Currently only handles USER-DELETE events
   */
  async handleKeycloakAdminEvent(event: KeycloakAdminEventDto): Promise<void> {
    const action = this.extractEventAction(event.type);

    this.logger.log(
      `Received Keycloak admin event: ${event.type} (${event.operationType} on ${event.resourceType})`,
    );

    // Handle USER-DELETE by type action or operationType
    if (
      action === 'USER-DELETE' ||
      (event.resourceType === 'USER' && event.operationType === 'DELETE')
    ) {
      await this.handleAdminUserDelete(event);
      return;
    }

    // Uncomment to handle other admin events:
    // if (action === 'USER-CREATE' || (event.resourceType === 'USER' && event.operationType === 'CREATE')) {
    //   await this.handleAdminUserCreate(event);
    //   return;
    // }
    // if (action === 'USER-UPDATE' || (event.resourceType === 'USER' && event.operationType === 'UPDATE')) {
    //   await this.handleAdminUserUpdate(event);
    //   return;
    // }

    this.logger.debug(`Unhandled admin event: ${event.type}`);
  }

  /**
   * Handle user-initiated account deletion
   * User is already deleted from Keycloak, delete local data
   */
  private async handleUserDelete(event: KeycloakUserEventDto): Promise<void> {
    const keycloakUserId = event.authDetails?.userId;
    const username = event.details?.username;

    if (!keycloakUserId) {
      this.logger.warn('DELETE_ACCOUNT event missing userId in authDetails');
      return;
    }

    this.logger.log(
      `Processing user account deletion: ${keycloakUserId} (username: ${username})`,
    );

    await this.userProfilesService.deleteUserByKeycloakId(keycloakUserId);

    this.logger.log(
      `Successfully deleted local data for user: ${keycloakUserId}`,
    );
  }

  /**
   * Handle admin-initiated user deletion
   * User is already deleted from Keycloak, delete local data
   */
  private async handleAdminUserDelete(
    event: KeycloakAdminEventDto,
  ): Promise<void> {
    // Extract keycloakUserId from resourcePath (e.g., "users/5742e900-998d-456a-84bd-6e9ac3b66d08")
    // or from details.userId
    let keycloakUserId = event.details?.userId;

    if (!keycloakUserId && event.resourcePath) {
      const match = event.resourcePath.match(/users\/([a-f0-9-]+)/i);
      if (match) {
        keycloakUserId = match[1];
      }
    }

    if (!keycloakUserId) {
      this.logger.warn(
        'USER-DELETE admin event missing userId in details and resourcePath',
      );
      return;
    }

    this.logger.log(
      `Processing admin user deletion: ${keycloakUserId} (admin: ${event.authDetails?.username})`,
    );

    await this.userProfilesService.deleteUserByKeycloakId(keycloakUserId);

    this.logger.log(
      `Successfully deleted local data for user: ${keycloakUserId}`,
    );
  }

  // =====================================================================
  // UNUSED EVENT HANDLERS (uncomment and implement as needed)
  // =====================================================================

  // private async handleUserLogin(event: KeycloakUserEventDto): Promise<void> {
  //   const userId = event.authDetails?.userId;
  //   const ipAddress = event.authDetails?.ipAddress;
  //   this.logger.debug(`User login: ${userId} from ${ipAddress}`);
  //   // TODO: Implement login tracking logic (e.g., update last login timestamp)
  // }

  // private async handleUserLogout(event: KeycloakUserEventDto): Promise<void> {
  //   const userId = event.authDetails?.userId;
  //   this.logger.debug(`User logout: ${userId}`);
  //   // TODO: Implement logout logic if needed
  // }

  // private async handleUserRegister(event: KeycloakUserEventDto): Promise<void> {
  //   const userId = event.authDetails?.userId;
  //   this.logger.debug(`User registered: ${userId}`);
  //   // TODO: Implement post-registration logic (e.g., send welcome email, create profile)
  // }

  // private async handleUserProfileUpdate(event: KeycloakUserEventDto): Promise<void> {
  //   const userId = event.authDetails?.userId;
  //   this.logger.debug(`User profile updated: ${userId}`);
  //   // TODO: Sync profile changes from Keycloak to local database
  // }

  // private async handleAdminUserCreate(event: KeycloakAdminEventDto): Promise<void> {
  //   this.logger.debug(`Admin created user at: ${event.resourcePath}`);
  //   // TODO: Handle user creation via admin console
  // }

  // private async handleAdminUserUpdate(event: KeycloakAdminEventDto): Promise<void> {
  //   this.logger.debug(`Admin updated user at: ${event.resourcePath}`);
  //   // TODO: Sync user changes from admin operations
  // }
}

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRepository } from '../../user/repositories/user.repository';

@Injectable()
export class DataBaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  private userCache = new Map<string, any>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('Den Request holen');

    const request = context.switchToHttp().getRequest();

    // Prüfe ob JWT Guard bereits durchgelaufen ist
    if (!request.user || !request.user.sub) {
      throw new UnauthorizedException('No valid JWT token found');
    }

    console.log('Den Request bearbeiten');
    const keycloakId = request.user.sub;
    console.log(`Authenticating user with Keycloak ID: ${keycloakId}`);

    if (this.userCache.has(keycloakId)) {
      const cachedUser = this.userCache.get(keycloakId);
      request.user = {
        ...request.user,
        id: cachedUser.id,
        keycloakId: cachedUser.keycloakId,
      };
      return true;
    }

    try {
      const dbUser = await this.userRepository.findByKeycloakId(keycloakId);

      if (!dbUser) {
        throw new UnauthorizedException('User not found in database');
      }

      this.userCache.set(keycloakId, {
        id: dbUser.id,
        keycloakId: keycloakId,
      });

      request.user = {
        ...request.user, // Behalte JWT-Infos (roles, etc.)
        id: dbUser.id,
        keycloakId: keycloakId,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        `Failed to authenticate user: ${error.message}`,
      );
    }
  }
}

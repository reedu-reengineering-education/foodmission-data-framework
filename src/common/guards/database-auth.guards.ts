import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_PUBLIC } from 'nest-keycloak-connect';
import { UserRepository } from '../../user/repositories/user.repository';

@Injectable()
export class DataBaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRepository: UserRepository,
  ) {}

  private userCache = new Map<string, any>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(META_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    if (!request.user || !request.user.sub) {
      throw new UnauthorizedException('No valid JWT token found');
    }

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

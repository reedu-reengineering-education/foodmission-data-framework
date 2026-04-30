import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_PUBLIC } from 'nest-keycloak-connect';
import { UsersRepository } from '../../users/repositories/users.repository';

@Injectable()
export class DataBaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersRepository: UsersRepository,
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

    // JWT guard should populate user claims for non-public routes; bail out if missing.
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
      // Primary lookup by keycloakId (sub claim)
      let dbUser = await this.usersRepository.findByKeycloakId(keycloakId);

      // Fallback: if not found, try by email and update keycloakId to align seeded users with Keycloak
      if (!dbUser && request.user?.email) {
        const byEmail = await this.usersRepository.findByEmail(
          request.user.email,
        );
        if (byEmail) {
          dbUser = await this.usersRepository.update(byEmail.id, {
            keycloakId,
          });
        }
      }

      if (!dbUser) {
        throw new UnauthorizedException('User not found in database');
      }

      this.userCache.set(keycloakId, { id: dbUser.id, keycloakId });

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

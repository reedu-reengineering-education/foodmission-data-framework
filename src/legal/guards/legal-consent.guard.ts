import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_PUBLIC } from 'nest-keycloak-connect';
import { LegalService } from '../services/legal.service';

export const SKIP_LEGAL_CONSENT_KEY = 'skipLegalConsent';
export const SkipLegalConsent = () => SetMetadata(SKIP_LEGAL_CONSENT_KEY, true);

@Injectable()
export class LegalConsentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly legalService: LegalService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(META_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipLegalConsent = this.reflector.getAllAndOverride<boolean>(
      SKIP_LEGAL_CONSENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipLegalConsent) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id as string | undefined;
    if (!userId) return true;

    const locale =
      (request.query?.locale as string | undefined) ??
      (request.query?.lang as string | undefined);

    await this.legalService.assertUserAcceptedRequiredDocs(userId, locale);
    return true;
  }
}

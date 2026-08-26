import { Injectable } from '@nestjs/common';
import { LegalDocType, UserConsent } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LegalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserConsentsByDocTypes(userId: string, docTypes: LegalDocType[]) {
    if (docTypes.length === 0) return [];
    return this.prisma.userConsent.findMany({
      where: {
        userId,
        docType: { in: docTypes },
      },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  async findLatestConsentsByDocTypes(userId: string, docTypes: LegalDocType[]) {
    const rows = await this.prisma.userConsent.findMany({
      where: {
        userId,
        docType: { in: docTypes },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    const latest = new Map<LegalDocType, UserConsent>();
    for (const row of rows) {
      if (!latest.has(row.docType)) {
        latest.set(row.docType, row);
      }
    }
    return latest;
  }

  async acceptDocument(
    userId: string,
    docType: LegalDocType,
    version: string,
    locale: string,
    contentHash: string,
    sourceRef?: string,
  ) {
    return this.prisma.userConsent.upsert({
      where: {
        userId_docType_version_locale: {
          userId,
          docType,
          version,
          locale,
        },
      },
      update: {
        docType,
        version,
        locale,
        contentHash,
        sourceRef,
      },
      create: {
        userId,
        docType,
        version,
        locale,
        contentHash,
        sourceRef,
      },
    });
  }
}

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { readFile, readdir, stat } from 'fs/promises';
import matter from 'gray-matter';
import { join } from 'path';
import { LegalDocType } from '@prisma/client';
import { LegalRepository } from '../repositories/legal.repository';
import {
  AcceptLegalConsentResponseDto,
  LegalConsentStatusResponseDto,
  LegalDocumentResponseDto,
} from '../dto/legal.dto';

type FrontMatter = {
  version?: string;
  locale?: string;
  title?: string;
  docType?: string;
  sourceRef?: string;
};

type MarkdownLegalDocument = {
  key: string;
  docType: LegalDocType;
  version: string;
  title: string;
  content: string;
  locale: string;
  updatedAt: Date;
  contentHash: string;
  sourceRef?: string;
};

/**
 * `__dirname` is `src/legal/services` in dev/tests and
 * `dist/src/legal/services` in a built app; legal markdown is in
 * `catalog/legal-documents` and copied by nest-cli as an asset.
 */
const LEGAL_DOCS_DIR = join(
  __dirname,
  '..',
  '..',
  'catalog',
  'legal-documents',
);

@Injectable()
export class LegalService implements OnModuleInit {
  constructor(private readonly legalRepository: LegalRepository) {}

  private readonly logger = new Logger(LegalService.name);
  private readonly documents = new Map<string, MarkdownLegalDocument>();

  private normalizeLocale(locale?: string): string {
    const normalized = (locale ?? 'en').trim().toLowerCase();
    return normalized || 'en';
  }

  private mapDocTypeString(s?: string): LegalDocType {
    if (!s) return LegalDocType.TERMS_OF_SERVICE;
    const lower = s.toLowerCase();
    if (lower.includes('term')) return LegalDocType.TERMS_OF_SERVICE;
    if (lower.includes('privacy')) return LegalDocType.PRIVACY_POLICY;
    return LegalDocType.TERMS_OF_SERVICE;
  }

  private buildDocumentKey(
    docType: LegalDocType,
    version: string,
    locale: string,
  ): string {
    return `${docType}:${version}:${locale}`;
  }

  private parseVersion(version: string): number[] {
    return version
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .map((n) => (Number.isFinite(n) ? n : 0));
  }

  private compareVersion(a: string, b: string): number {
    const pa = this.parseVersion(a);
    const pb = this.parseVersion(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i += 1) {
      const av = pa[i] ?? 0;
      const bv = pb[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  private selectLatest(
    docs: MarkdownLegalDocument[],
  ): MarkdownLegalDocument | undefined {
    if (docs.length === 0) return undefined;
    return [...docs].sort((a, b) => {
      const versionCmp = this.compareVersion(a.version, b.version);
      if (versionCmp !== 0) return -versionCmp;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    })[0];
  }

  private parseDocType(
    frontDocType: string | undefined,
    fileName: string,
  ): LegalDocType {
    if (frontDocType) return this.mapDocTypeString(frontDocType);
    return this.mapDocTypeString(fileName);
  }

  private async findMarkdownFiles(dir: string, prefix = ''): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = prefix ? join(prefix, entry.name) : entry.name;

      if (entry.isDirectory()) {
        files.push(...(await this.findMarkdownFiles(fullPath, relPath)));
      } else if (entry.name.endsWith('.md')) {
        files.push(relPath);
      }
    }

    return files;
  }

  private async loadDocuments(): Promise<void> {
    this.documents.clear();

    let files: string[] = [];
    try {
      files = await this.findMarkdownFiles(LEGAL_DOCS_DIR);
    } catch (error) {
      this.logger.error(
        `Legal docs directory missing or unreadable: ${LEGAL_DOCS_DIR}`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    for (const file of files) {
      const filePath = join(LEGAL_DOCS_DIR, file);
      try {
        const raw = await readFile(filePath, 'utf-8');
        const parsed = matter(raw);
        const front = parsed.data as FrontMatter;
        const body = parsed.content.trim();

        const docType = this.parseDocType(front.docType, file);

        const versionFromPath = file.match(/^v(\d+(?:\.\d+)*)\//i)?.[1];
        const versionFromFile = file.match(/-v?(\d+(?:\.\d+)*)/i)?.[1];
        const version =
          front.version ?? versionFromPath ?? versionFromFile ?? '1.0';

        const localeFromFile = file.match(
          /\.([a-z]{2}(?:-[A-Za-z0-9]+)?)\.md$/i,
        )?.[1];
        const locale = this.normalizeLocale(
          front.locale ?? localeFromFile ?? 'en',
        );

        const titleFromContent = body.match(/^#\s+(.*)/m)?.[1]?.trim();
        const title =
          front.title ?? titleFromContent ?? file.replace(/\.md$/, '');

        const fileStat = await stat(filePath);

        const contentHash = createHash('sha256')
          .update(body || raw, 'utf8')
          .digest('hex');
        const key = this.buildDocumentKey(docType, version, locale);

        this.documents.set(key, {
          key,
          docType,
          version,
          title,
          content: body || raw,
          locale,
          updatedAt: fileStat.mtime,
          contentHash,
          sourceRef: front.sourceRef,
        });
      } catch (error) {
        this.logger.error(
          `Failed to parse legal markdown file: ${filePath}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  async onModuleInit(): Promise<void> {
    await this.loadDocuments();
  }

  private findLatestDocumentByType(
    docType: LegalDocType,
    locale: string,
  ): MarkdownLegalDocument | undefined {
    const all = [...this.documents.values()].filter(
      (doc) => doc.docType === docType,
    );

    const localized = this.selectLatest(
      all.filter((doc) => doc.locale === locale),
    );
    if (localized) return localized;

    return this.selectLatest(all.filter((doc) => doc.locale === 'en'));
  }

  private findLatestRequiredDocuments(locale: string): MarkdownLegalDocument[] {
    const terms = this.findLatestDocumentByType(
      LegalDocType.TERMS_OF_SERVICE,
      locale,
    );
    const privacy = this.findLatestDocumentByType(
      LegalDocType.PRIVACY_POLICY,
      locale,
    );
    return [terms, privacy].filter((d): d is MarkdownLegalDocument =>
      Boolean(d),
    );
  }

  private toDto(doc: MarkdownLegalDocument): LegalDocumentResponseDto {
    return {
      key: doc.key,
      docType: doc.docType,
      version: doc.version,
      title: doc.title,
      content: doc.content,
      locale: doc.locale,
      updatedAt: doc.updatedAt,
    };
  }

  getLatestDocument(
    docType: LegalDocType,
    locale?: string,
  ): LegalDocumentResponseDto {
    const normalizedLocale = this.normalizeLocale(locale);
    const doc = this.findLatestDocumentByType(docType, normalizedLocale);

    if (!doc) {
      throw new NotFoundException(`No published document found for ${docType}`);
    }

    return this.toDto(doc);
  }

  getRequiredDocuments(locale?: string): LegalDocumentResponseDto[] {
    const normalizedLocale = this.normalizeLocale(locale);
    const docs = this.findLatestRequiredDocuments(normalizedLocale);
    return docs.map((doc) => this.toDto(doc));
  }

  async getConsentStatus(
    userId: string,
    locale?: string,
  ): Promise<LegalConsentStatusResponseDto> {
    const normalizedLocale = this.normalizeLocale(locale);
    const required = this.findLatestRequiredDocuments(normalizedLocale);

    const allConsents = await this.legalRepository.findUserConsentsByDocTypes(
      userId,
      [LegalDocType.TERMS_OF_SERVICE, LegalDocType.PRIVACY_POLICY],
    );

    const acceptedByKey = new Map(
      allConsents.map((consent) => [
        this.buildDocumentKey(consent.docType, consent.version, consent.locale),
        consent,
      ]),
    );

    const latestAcceptedByType =
      await this.legalRepository.findLatestConsentsByDocTypes(userId, [
        LegalDocType.TERMS_OF_SERVICE,
        LegalDocType.PRIVACY_POLICY,
      ]);

    const documents = required.map((doc) => {
      const exact = acceptedByKey.get(doc.key);
      const consentsForType = allConsents.filter(
        (c) => c.docType === doc.docType,
      );
      const isVersionAccepted = consentsForType.some(
        (c) => this.compareVersion(c.version, doc.version) >= 0,
      );
      const latestForType = latestAcceptedByType.get(doc.docType);
      return {
        docType: doc.docType,
        documentKey: doc.key,
        requiredVersion: doc.version,
        locale: doc.locale,
        accepted: Boolean(exact) || isVersionAccepted,
        acceptedVersion: latestForType?.version,
        acceptedAt: latestForType?.acceptedAt,
      };
    });

    return {
      mustAccept: documents.some((d) => !d.accepted),
      documents,
    };
  }

  async acceptDocument(
    userId: string,
    documentKey: string,
  ): Promise<AcceptLegalConsentResponseDto> {
    const doc = this.documents.get(documentKey);
    if (!doc) {
      throw new NotFoundException('Legal document not found or unpublished');
    }

    const consent = await this.legalRepository.acceptDocument(
      userId,
      doc.docType,
      doc.version,
      doc.locale,
      doc.contentHash,
      doc.sourceRef,
    );

    return {
      accepted: true,
      userId: consent.userId,
      documentKey: this.buildDocumentKey(
        consent.docType,
        consent.version,
        consent.locale,
      ),
      docType: consent.docType,
      version: consent.version,
      locale: consent.locale,
      acceptedAt: consent.acceptedAt,
    };
  }

  async assertUserAcceptedRequiredDocs(
    userId: string,
    locale?: string,
  ): Promise<void> {
    const status = await this.getConsentStatus(userId, locale);
    if (!status.mustAccept) return;

    throw new ForbiddenException({
      code: 'LEGAL_CONSENT_REQUIRED',
      message: 'You must accept the latest legal documents before continuing.',
      pendingDocuments: status.documents.filter((d) => !d.accepted),
    });
  }
}

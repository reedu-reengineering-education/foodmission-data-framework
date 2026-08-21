import { PrismaClient, LegalDocType } from '@prisma/client';
import { createHash } from 'crypto';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

type FrontMatter = {
  version?: string;
  locale?: string;
  title?: string;
  docType?: string;
};

function mapDocTypeString(s?: string): string {
  if (!s) return 'OTHER';
  const lower = s.toLowerCase();
  if (lower.includes('term')) return 'TERMS_OF_SERVICE';
  if (lower.includes('privacy')) return 'PRIVACY_POLICY';
  return 'OTHER';
}

export async function seedLegalDocuments(prisma: PrismaClient) {
  console.log('📜 Validating legal markdown and seeding sample consent...');

  const docsDir = path.join(__dirname, '../../../src/catalog/legal-documents');
  if (!fs.existsSync(docsDir)) {
    console.warn(`Docs directory not found: ${docsDir}`);
    return 0;
  }

  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));
  const parsedDocs: Array<{
    docType: LegalDocType;
    version: string;
    locale: string;
    contentHash: string;
  }> = [];

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const front = parsed.data as FrontMatter;
    const body = parsed.content;

    // Determine docType
    let docTypeKey = 'OTHER';
    if (front.docType) docTypeKey = mapDocTypeString(front.docType);
    else docTypeKey = mapDocTypeString(file);
    const docType =
      (LegalDocType as any)[docTypeKey] ?? (LegalDocType as any).OTHER;

    // version
    let version = front.version;
    if (!version) {
      const vMatch = file.match(/-v?(\d+(?:\.\d+)*)/i);
      version = vMatch ? vMatch[1] : '1.0';
    }

    // locale
    let locale = front.locale;
    if (!locale) {
      const localeMatch = file.match(/\.([a-z]{2}(?:-[A-Za-z0-9]+)?)\.md$/i);
      locale = localeMatch ? localeMatch[1] : 'en';
    }

    // title
    let title = front.title;
    if (!title) {
      const h = body.match(/^#\s+(.*)/m);
      title = h ? h[1].trim() : file.replace(/\.md$/, '');
    }

    const content = body.trim() || raw;
    const contentHash = createHash('sha256')
      .update(content, 'utf8')
      .digest('hex');
    parsedDocs.push({
      docType,
      version: version ?? '1.0',
      locale,
      contentHash,
    });
  }

  // Create a sample consent record for the dev user (if present)
  const devUser = await prisma.user.findUnique({
    where: { email: 'dev@foodmission.dev' },
  });
  if (devUser) {
    const terms = parsedDocs.find(
      (c) =>
        c.docType === (LegalDocType as any).TERMS_OF_SERVICE &&
        c.locale === 'en',
    );
    if (terms) {
      await prisma.userConsent.upsert({
        where: {
          userId_docType_version_locale: {
            userId: devUser.id,
            docType: terms.docType,
            version: terms.version,
            locale: terms.locale,
          },
        },
        update: {
          acceptedAt: new Date(),
          contentHash: terms.contentHash,
        },
        create: {
          userId: devUser.id,
          docType: terms.docType,
          version: terms.version,
          locale: terms.locale,
          contentHash: terms.contentHash,
        },
      });
    }
  }

  console.log(`✅ Parsed ${parsedDocs.length} legal markdown documents`);
  return parsedDocs.length;
}

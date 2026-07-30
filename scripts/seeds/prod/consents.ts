import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export type ConsentFormSeed = {
  key: string;
  name: string;
  required?: boolean;
  title: string;
  body: string;
};

export const CONSENTS_DATA_DIR = path.join(
  'prisma',
  'seeds',
  'data',
  'consents',
);

export async function seedConsents(prisma: PrismaClient) {
  console.log('🌱 Seeding consent forms...');

  const formsPath = path.join(process.cwd(), CONSENTS_DATA_DIR, 'forms.json');
  const forms = JSON.parse(
    fs.readFileSync(formsPath, 'utf-8'),
  ) as ConsentFormSeed[];

  const results = { formsUpserted: 0 };

  for (const formData of forms) {
    await prisma.consentForm.upsert({
      where: { key: formData.key },
      update: {
        name: formData.name,
        title: formData.title,
        body: formData.body,
        required: formData.required ?? true,
        active: true,
      },
      create: {
        key: formData.key,
        name: formData.name,
        title: formData.title,
        body: formData.body,
        required: formData.required ?? true,
        active: true,
      },
    });
    results.formsUpserted += 1;
    console.log(`  ✓ Consent form: ${formData.key}`);
  }

  return results;
}

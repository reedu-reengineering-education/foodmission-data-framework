import * as fs from 'fs';
import * as path from 'path';

export function readPrismaSchema(): string {
  const prismaDir = path.join(__dirname, '..', '..', 'prisma');
  const prismaModelsDir = path.join(prismaDir, 'models');

  const rootSchemaFiles = fs
    .readdirSync(prismaDir)
    .filter((file) => file.endsWith('.prisma'))
    .sort()
    .map((file) => path.join(prismaDir, file));

  const modelSchemaFiles = fs.existsSync(prismaModelsDir)
    ? fs
        .readdirSync(prismaModelsDir)
        .filter((file) => file.endsWith('.prisma'))
        .sort()
        .map((file) => path.join(prismaModelsDir, file))
    : [];

  return [...rootSchemaFiles, ...modelSchemaFiles]
    .map((filePath) => fs.readFileSync(filePath, 'utf-8'))
    .join('\n\n');
}

export function parsePrismaEnum(schema: string, enumName: string): string[] {
  const re = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = schema.match(re);
  if (!match) {
    throw new Error(`Enum not found in prisma/*.prisma: ${enumName}`);
  }

  return match[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith('//'))
    .map((l) => l.replace(/,.*/, '')) // tolerate commas if ever added
    .filter((l) => /^[A-Z0-9_]+$/.test(l));
}

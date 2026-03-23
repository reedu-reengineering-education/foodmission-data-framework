import * as fs from 'fs';
import * as path from 'path';

export function readPrismaSchema(): string {
  const schemaPath = path.join(
    __dirname,
    '..',
    '..',
    'prisma',
    'schema.prisma',
  );
  return fs.readFileSync(schemaPath, 'utf-8');
}

export function parsePrismaEnum(schema: string, enumName: string): string[] {
  const re = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = schema.match(re);
  if (!match) {
    throw new Error(`Enum not found in schema.prisma: ${enumName}`);
  }

  return match[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith('//'))
    .map((l) => l.replace(/,.*/, '')) // tolerate commas if ever added
    .filter((l) => /^[A-Z0-9_]+$/.test(l));
}

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// CSV placed under prisma/seeds/data/nevo/
const CSV_PATH = path.join(
  process.cwd(),
  'prisma',
  'seeds',
  'data',
  'nevo',
  'nevo2025-langual-foodex2.csv',
);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseLangual(raw: string): string[] {
  if (!raw) return [];
  const cleaned = raw.replace(/"/g, '').trim();
  if (cleaned === '') return [];
  return cleaned
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseFoodEx2(raw: string): string[] {
  if (!raw) return [];
  const cleaned = raw.replace(/"/g, '').trim();
  if (cleaned === '') return [];
  // split on #, $, ;, comma and whitespace
  return cleaned
    .split(/[#\$;,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function seedNevoLangualFoodex(prisma: PrismaClient) {
  if (!fs.existsSync(CSV_PATH)) {
    console.warn(
      `CSV not found at ${CSV_PATH}; skipping NEVO LanguaL/FoodEx2 import.`,
    );
    return { processed: 0, updated: 0, missing: 0 };
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length <= 1) {
    console.log('No data rows found in CSV.');
    return { processed: 0, updated: 0, missing: 0 };
  }

  const header = lines.shift();
  console.log(`\n🌱 Seeding NEVO LanguaL/FoodEx2 mappings from ${CSV_PATH}...`);
  console.log(`   header: ${header}`);

  let total = 0;
  let updated = 0;
  let missing = 0;

  for (const line of lines) {
    total++;
    const cols = parseCsvLine(line);
    // Expect: NEVO-code,NEVO-naam,English food name,LANGUAL CODES,FoodEx2 code
    const nevoCodeRaw = cols[0];
    const nevoCode = parseInt(nevoCodeRaw, 10);
    if (isNaN(nevoCode)) {
      console.warn(`Skipping line ${total}: invalid NEVO code: ${nevoCodeRaw}`);
      continue;
    }

    const langualRaw = cols[3] ?? '';
    const foodexRaw = cols[4] ?? '';
    const langualCodes = parseLangual(langualRaw);
    const foodex2Codes = parseFoodEx2(foodexRaw);

    const existing = await prisma.genericFood.findUnique({
      where: { nevoCode },
    });
    if (!existing) {
      missing++;
      console.warn(`No GenericFood found for NEVO code ${nevoCode}`);
      continue;
    }

    await prisma.genericFood.update({
      where: { nevoCode },
      data: {
        langualCodes,
        foodex2Codes,
      },
    });

    updated++;
  }

  console.log('\n✅ NEVO LanguaL/FoodEx2 mapping seeding completed!');
  console.log(`   - processed: ${total}`);
  console.log(`   - updated:   ${updated}`);
  console.log(`   - missing:   ${missing}`);
  return { processed: total, updated, missing };
}

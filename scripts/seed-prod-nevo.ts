import { PrismaClient } from '@prisma/client';
import { seedRecipes } from '../prisma/seeds/themealdb';
import * as fs from 'fs';
import * as path from 'path';

const CSV_PATH = path.join(
  __dirname,
  '..',
  'prisma',
  'seeds',
  'data',
  'nevo',
  'NEVO2025_v9.0.csv',
);

const COL = {
  NEVO_VERSION: 0,
  FOOD_GROUP: 2,
  NEVO_CODE: 3,
  FOOD_NAME: 5,
  SYNONYM: 6,
  QUANTITY: 7,
  CONTAINS_TRACES_OF: 9,
  IS_FORTIFIED_WITH: 10,
  ENERCJ: 11,
  ENERCC: 12,
  WATER: 13,
  PROT: 14,
  PROTPL: 15,
  PROTAN: 16,
  NT: 17,
  TRP: 18,
  FAT: 19,
  FACID: 20,
  FASAT: 21,
  FAMSCIS: 22,
  FAPU: 23,
  FAPUN3: 24,
  FAPUN6: 25,
  FATRS: 26,
  CHO: 27,
  SUGAR: 28,
  NVSUGAF: 29,
  STARCH: 30,
  POLYL: 31,
  FIBT: 32,
  ALC: 33,
  OA: 34,
  ASH: 35,
  CHORL: 36,
  NA: 37,
  K: 38,
  CA: 39,
  P: 40,
  MG: 41,
  FE: 42,
  HAEM: 43,
  NHAEM: 44,
  CU: 45,
  SE: 46,
  ZN: 47,
  ID: 48,
  VITA_RAE: 49,
  VITA_RE: 50,
  RETOL: 51,
  CARTBTOT: 52,
  CARTA: 53,
  LUTN: 54,
  ZEA: 55,
  CRYPXB: 56,
  LYCPN: 57,
  VITD: 58,
  CHOCALOH: 59,
  CHOCAL: 60,
  ERGCAL: 61,
  VITE: 62,
  TOCPHA: 63,
  TOCPHB: 64,
  TOCPHD: 65,
  TOCPHG: 66,
  VITK: 67,
  VITK1: 68,
  VITK2: 69,
  THIA: 70,
  RIBF: 71,
  VITB6: 72,
  VITB12: 73,
  NIAEQ: 74,
  NIA: 75,
  FOL: 76,
  FOLFD: 77,
  FOLAC: 78,
  VITC: 79,
  F4_0: 80,
  F6_0: 81,
  F8_0: 82,
  F10_0: 83,
  F11_0: 84,
  F12_0: 85,
  F13_0: 86,
  F14_0: 87,
  F15_0: 88,
  F16_0: 89,
  F17_0: 90,
  F18_0: 91,
  F19_0: 92,
  F20_0: 93,
  F21_0: 94,
  F22_0: 95,
  F23_0: 96,
  F24_0: 97,
  F25_0: 98,
  F26_0: 99,
  FASATXR: 100,
  F10_1CIS: 101,
  F12_1CIS: 102,
  F14_1CIS: 103,
  F16_1CIS: 104,
  F18_1CIS: 105,
  F20_1CIS: 106,
  F22_1CIS: 107,
  F24_1CIS: 108,
  FAMSCXR: 109,
  F18_2CN6: 110,
  F18_2CN9: 111,
  F18_2CT: 112,
  F18_2TC: 113,
  F18_2R: 114,
  F18_3CN3: 115,
  F18_3CN6: 116,
  F18_4CN3: 117,
  F20_2CN6: 118,
  F20_3CN9: 119,
  F20_3CN6: 120,
  F20_3CN3: 121,
  F20_4CN6: 122,
  F20_4CN3: 123,
  F20_5CN3: 124,
  F21_5CN3: 125,
  F22_2CN6: 126,
  F22_2CN3: 127,
  F22_3CN3: 128,
  F22_4CN6: 129,
  F22_5CN6: 130,
  F22_5CN3: 131,
  F22_6CN3: 132,
  F24_2CN6: 133,
  FAPUXR: 134,
  F10_1TRS: 135,
  F12_1TRS: 136,
  F14_1TRS: 137,
  F16_1TRS: 138,
  F18_1TRS: 139,
  F18_2TTN6: 140,
  F18_3TTTN3: 141,
  F20_1TRS: 142,
  F20_2TT: 143,
  F22_1TRS: 144,
  F24_1TRS: 145,
  FAMSTXR: 146,
  FAUN: 147,
} as const;

function parseFloat_(raw: string): number | null {
  const cleaned = raw.replace(/"/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const normalized = cleaned.replace(',', '.');
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

function parseString(raw: string): string {
  return raw.replace(/"/g, '').trim();
}

function parseStringOrNull(raw: string): string | null {
  const value = parseString(raw);
  return value === '' ? null : value;
}

function parseInt_(raw: string): number {
  const cleaned = raw.replace(/"/g, '').trim();
  return parseInt(cleaned, 10);
}

async function main() {
  const prisma = new PrismaClient();

  console.log('🔒 Running production NEVO create-only seed (no updates)');

  if (!fs.existsSync(CSV_PATH)) {
    console.warn(`⚠️  NEVO CSV not found at ${CSV_PATH}, nothing to do.`);
    await prisma.$disconnect();
    return;
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');
  const dataLines = lines.slice(1);
  console.log(`   Found ${dataLines.length} entries in NEVO CSV`);

  let created = 0;
  for (const line of dataLines) {
    const cols = line.split('|');
    if (cols.length < 12) continue;
    const nevoCode = parseInt_(cols[COL.NEVO_CODE]);
    if (isNaN(nevoCode)) continue;

    const exists = await prisma.foodCategory.findUnique({
      where: { nevoCode },
    });
    if (exists) continue; // skip existing — create-only

    const data = {
      nevoVersion: parseString(cols[COL.NEVO_VERSION]),
      foodGroup: parseString(cols[COL.FOOD_GROUP]),
      foodName: parseString(cols[COL.FOOD_NAME]),
      synonym: parseStringOrNull(cols[COL.SYNONYM]),
      quantity: parseStringOrNull(cols[COL.QUANTITY]),
      containsTracesOf: parseStringOrNull(cols[COL.CONTAINS_TRACES_OF]),
      isFortifiedWith: parseStringOrNull(cols[COL.IS_FORTIFIED_WITH]),
      energyKj: parseFloat_(cols[COL.ENERCJ]),
      energyKcal: parseFloat_(cols[COL.ENERCC]),
      water: parseFloat_(cols[COL.WATER]),
      proteins: parseFloat_(cols[COL.PROT]),
      proteinsPlant: parseFloat_(cols[COL.PROTPL]),
      proteinsAnimal: parseFloat_(cols[COL.PROTAN]),
      nitrogenTotal: parseFloat_(cols[COL.NT]),
      tryptophan: parseFloat_(cols[COL.TRP]),
      fat: parseFloat_(cols[COL.FAT]),
      carbohydrates: parseFloat_(cols[COL.CHO]),
      sugars: parseFloat_(cols[COL.SUGAR]),
      addedSugars: parseFloat_(cols[COL.NVSUGAF]),
      starch: parseFloat_(cols[COL.STARCH]),
      polyols: parseFloat_(cols[COL.POLYL]),
      fiber: parseFloat_(cols[COL.FIBT]),
      alcohol: parseFloat_(cols[COL.ALC]),
      organicAcids: parseFloat_(cols[COL.OA]),
      ash: parseFloat_(cols[COL.ASH]),
      fattyAcidsTotal: parseFloat_(cols[COL.FACID]),
      saturatedFat: parseFloat_(cols[COL.FASAT]),
      monoUnsaturatedFat: parseFloat_(cols[COL.FAMSCIS]),
      polyUnsaturatedFat: parseFloat_(cols[COL.FAPU]),
      omega3Fat: parseFloat_(cols[COL.FAPUN3]),
      omega6Fat: parseFloat_(cols[COL.FAPUN6]),
      transFat: parseFloat_(cols[COL.FATRS]),
      chloride: parseFloat_(cols[COL.CHORL]),
      sodium: parseFloat_(cols[COL.NA]),
      potassium: parseFloat_(cols[COL.K]),
      calcium: parseFloat_(cols[COL.CA]),
      phosphorus: parseFloat_(cols[COL.P]),
      magnesium: parseFloat_(cols[COL.MG]),
      iron: parseFloat_(cols[COL.FE]),
      ironHaem: parseFloat_(cols[COL.HAEM]),
      ironNonHaem: parseFloat_(cols[COL.NHAEM]),
      copper: parseFloat_(cols[COL.CU]),
      selenium: parseFloat_(cols[COL.SE]),
      zinc: parseFloat_(cols[COL.ZN]),
      iodine: parseFloat_(cols[COL.ID]),
      vitaminARae: parseFloat_(cols[COL.VITA_RAE]),
      vitaminARe: parseFloat_(cols[COL.VITA_RE]),
      retinol: parseFloat_(cols[COL.RETOL]),
      betaCarotene: parseFloat_(cols[COL.CARTBTOT]),
      alphaCarotene: parseFloat_(cols[COL.CARTA]),
      lutein: parseFloat_(cols[COL.LUTN]),
      zeaxanthin: parseFloat_(cols[COL.ZEA]),
      betaCryptoxanthin: parseFloat_(cols[COL.CRYPXB]),
      lycopene: parseFloat_(cols[COL.LYCPN]),
      vitaminD: parseFloat_(cols[COL.VITD]),
      hydroxyCholecalciferol: parseFloat_(cols[COL.CHOCALOH]),
      cholecalciferol: parseFloat_(cols[COL.CHOCAL]),
      ergocalciferol: parseFloat_(cols[COL.ERGCAL]),
      vitaminE: parseFloat_(cols[COL.VITE]),
      alphaTocopherol: parseFloat_(cols[COL.TOCPHA]),
      betaTocopherol: parseFloat_(cols[COL.TOCPHB]),
      deltaTocopherol: parseFloat_(cols[COL.TOCPHD]),
      gammaTocopherol: parseFloat_(cols[COL.TOCPHG]),
      vitaminK: parseFloat_(cols[COL.VITK]),
      vitaminK1: parseFloat_(cols[COL.VITK1]),
      vitaminK2: parseFloat_(cols[COL.VITK2]),
      thiamin: parseFloat_(cols[COL.THIA]),
      riboflavin: parseFloat_(cols[COL.RIBF]),
      vitaminB6: parseFloat_(cols[COL.VITB6]),
      vitaminB12: parseFloat_(cols[COL.VITB12]),
      niacinEquivalents: parseFloat_(cols[COL.NIAEQ]),
      niacin: parseFloat_(cols[COL.NIA]),
      folateTotal: parseFloat_(cols[COL.FOL]),
      folateFood: parseFloat_(cols[COL.FOLFD]),
      folicAcid: parseFloat_(cols[COL.FOLAC]),
      vitaminC: parseFloat_(cols[COL.VITC]),
      fa4_0: parseFloat_(cols[COL.F4_0]),
      fa6_0: parseFloat_(cols[COL.F6_0]),
      fa8_0: parseFloat_(cols[COL.F8_0]),
      fa10_0: parseFloat_(cols[COL.F10_0]),
      fa11_0: parseFloat_(cols[COL.F11_0]),
      fa12_0: parseFloat_(cols[COL.F12_0]),
      fa13_0: parseFloat_(cols[COL.F13_0]),
      fa14_0: parseFloat_(cols[COL.F14_0]),
      fa15_0: parseFloat_(cols[COL.F15_0]),
      fa16_0: parseFloat_(cols[COL.F16_0]),
      fa17_0: parseFloat_(cols[COL.F17_0]),
      fa18_0: parseFloat_(cols[COL.F18_0]),
      fa19_0: parseFloat_(cols[COL.F19_0]),
      fa20_0: parseFloat_(cols[COL.F20_0]),
      fa21_0: parseFloat_(cols[COL.F21_0]),
      fa22_0: parseFloat_(cols[COL.F22_0]),
      fa23_0: parseFloat_(cols[COL.F23_0]),
      fa24_0: parseFloat_(cols[COL.F24_0]),
      fa25_0: parseFloat_(cols[COL.F25_0]),
      fa26_0: parseFloat_(cols[COL.F26_0]),
      saturatedFatRemainder: parseFloat_(cols[COL.FASATXR]),
      fa10_1cis: parseFloat_(cols[COL.F10_1CIS]),
      fa12_1cis: parseFloat_(cols[COL.F12_1CIS]),
      fa14_1cis: parseFloat_(cols[COL.F14_1CIS]),
      fa16_1cis: parseFloat_(cols[COL.F16_1CIS]),
      fa18_1cis: parseFloat_(cols[COL.F18_1CIS]),
      fa20_1cis: parseFloat_(cols[COL.F20_1CIS]),
      fa22_1cis: parseFloat_(cols[COL.F22_1CIS]),
      fa24_1cis: parseFloat_(cols[COL.F24_1CIS]),
      monoUnsaturatedFatRemainder: parseFloat_(cols[COL.FAMSCXR]),
      fa18_2cn6: parseFloat_(cols[COL.F18_2CN6]),
      fa18_2cn9: parseFloat_(cols[COL.F18_2CN9]),
      fa18_2ct: parseFloat_(cols[COL.F18_2CT]),
      fa18_2tc: parseFloat_(cols[COL.F18_2TC]),
      fa18_2r: parseFloat_(cols[COL.F18_2R]),
      fa18_3cn3: parseFloat_(cols[COL.F18_3CN3]),
      fa18_3cn6: parseFloat_(cols[COL.F18_3CN6]),
      fa18_4cn3: parseFloat_(cols[COL.F18_4CN3]),
      fa20_2cn6: parseFloat_(cols[COL.F20_2CN6]),
      fa20_3cn9: parseFloat_(cols[COL.F20_3CN9]),
      fa20_3cn6: parseFloat_(cols[COL.F20_3CN6]),
      fa20_3cn3: parseFloat_(cols[COL.F20_3CN3]),
      fa20_4cn6: parseFloat_(cols[COL.F20_4CN6]),
      fa20_4cn3: parseFloat_(cols[COL.F20_4CN3]),
      fa20_5cn3: parseFloat_(cols[COL.F20_5CN3]),
      fa21_5cn3: parseFloat_(cols[COL.F21_5CN3]),
      fa22_2cn6: parseFloat_(cols[COL.F22_2CN6]),
      fa22_2cn3: parseFloat_(cols[COL.F22_2CN3]),
      fa22_3cn3: parseFloat_(cols[COL.F22_3CN3]),
      fa22_4cn6: parseFloat_(cols[COL.F22_4CN6]),
      fa22_5cn6: parseFloat_(cols[COL.F22_5CN6]),
      fa22_5cn3: parseFloat_(cols[COL.F22_5CN3]),
      fa22_6cn3: parseFloat_(cols[COL.F22_6CN3]),
      fa24_2cn6: parseFloat_(cols[COL.F24_2CN6]),
      polyUnsaturatedFatRemainder: parseFloat_(cols[COL.FAPUXR]),
      fa10_1trans: parseFloat_(cols[COL.F10_1TRS]),
      fa12_1trans: parseFloat_(cols[COL.F12_1TRS]),
      fa14_1trans: parseFloat_(cols[COL.F14_1TRS]),
      fa16_1trans: parseFloat_(cols[COL.F16_1TRS]),
      fa18_1trans: parseFloat_(cols[COL.F18_1TRS]),
      fa18_2ttN6: parseFloat_(cols[COL.F18_2TTN6]),
      fa18_3tttN3: parseFloat_(cols[COL.F18_3TTTN3]),
      fa20_1trans: parseFloat_(cols[COL.F20_1TRS]),
      fa20_2tt: parseFloat_(cols[COL.F20_2TT]),
      fa22_1trans: parseFloat_(cols[COL.F22_1TRS]),
      fa24_1trans: parseFloat_(cols[COL.F24_1TRS]),
      transFatRemainder: parseFloat_(cols[COL.FAMSTXR]),
      fattyAcidsUnidentified: parseFloat_(cols[COL.FAUN]),
    } as any;

    try {
      await prisma.foodCategory.create({ data: { nevoCode, ...data } });
      created += 1;
    } catch (err: any) {
      // If a concurrent process created the same nevoCode, skip
      if (err && err.code === 'P2002') {
        continue;
      }
      console.error(
        'Error creating NEVO record',
        nevoCode,
        err?.message || err,
      );
    }
  }

  console.log(`   ✅ Created ${created} new NEVO food categories`);

  try {
    console.log(
      '\n🍽️  Seeding recipes linked to NEVO categories (skip existing)...',
    );
    const result = await seedRecipes(prisma, { skipExisting: true });
    if (result.errors && result.errors > 0) {
      console.error(
        `   ❌ Recipe seeding completed with ${result.errors} errors`,
      );
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('   ❌ Failed to seed recipes:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed', err);
  process.exitCode = 1;
});

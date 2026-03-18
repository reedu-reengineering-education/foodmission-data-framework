import * as fs from 'fs';
import * as path from 'path';
import { StaticValuesService } from './services/static-values.service';

function parsePrismaEnum(schema: string, enumName: string): string[] {
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

describe('Static values contract (schema.prisma)', () => {
  const schemaPath = path.join(
    __dirname,
    '..',
    '..',
    'prisma',
    'schema.prisma',
  );
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const service = new StaticValuesService();

  it('matches Gender enum', () => {
    expect(service.listGenders().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'Gender'),
    );
  });

  it('matches ActivityLevel enum', () => {
    expect(service.listActivityLevels().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'ActivityLevel'),
    );
  });

  it('matches AnnualIncomeLevel enum', () => {
    expect(service.listAnnualIncomeLevels().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'AnnualIncomeLevel'),
    );
  });

  it('matches EducationLevel enum', () => {
    expect(service.listEducationLevels().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'EducationLevel'),
    );
  });

  it('matches Unit enum', () => {
    expect(service.listUnits().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'Unit'),
    );
  });

  it('matches TypeOfMeal enum', () => {
    expect(service.listTypeOfMeals().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'TypeOfMeal'),
    );
  });

  it('matches MealType enum', () => {
    expect(service.listMealTypes().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'MealType'),
    );
  });

  it('matches GroupRole enum', () => {
    expect(service.listGroupRoles().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'GroupRole'),
    );
  });
});

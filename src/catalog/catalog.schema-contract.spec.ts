import { CatalogService } from './services/catalog.service';
import { I18nService } from 'nestjs-i18n';
import {
  parsePrismaEnum,
  readPrismaSchema,
} from '../../test/utils/prisma-schema';

describe('Catalog contract (schema.prisma)', () => {
  const schema = readPrismaSchema();
  const service = new CatalogService({
    translate: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? '',
  } as I18nService);

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

  it('matches GroupRole enum', () => {
    expect(service.listGroupRoles().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'GroupRole'),
    );
  });
});

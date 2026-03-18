import { StaticValuesService } from './services/static-values.service';
import {
  parsePrismaEnum,
  readPrismaSchema,
} from '../../test/utils/prisma-schema';

describe('Static values contract (schema.prisma)', () => {
  const schema = readPrismaSchema();
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

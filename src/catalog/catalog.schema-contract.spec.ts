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

  it('matches WeeklyMeatRange enum', () => {
    expect(service.listWeeklyMeatRanges().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'WeeklyMeatRange'),
    );
  });

  it('matches WeeklyBeefFrequency enum', () => {
    expect(service.listWeeklyBeefFrequencies().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'WeeklyBeefFrequency'),
    );
  });

  it('matches WeeklyFoodWasteRange enum', () => {
    expect(service.listWeeklyFoodWasteRanges().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'WeeklyFoodWasteRange'),
    );
  });

  it('matches WeeklyUpfRange enum', () => {
    expect(service.listWeeklyUpfRanges().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'WeeklyUpfRange'),
    );
  });

  it('matches WeeklyReusableRange enum', () => {
    expect(service.listWeeklyReusableRanges().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'WeeklyReusableRange'),
    );
  });

  it('matches UserSegment enum', () => {
    expect(service.listUserSegments().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'UserSegment'),
    );
  });

  it('matches Motivation enum', () => {
    expect(service.listMotivations().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'Motivation'),
    );
  });

  it('matches ProgressIndicatorKind enum', () => {
    expect(
      service.listProgressIndicatorKinds().data.map((x) => x.code),
    ).toEqual(parsePrismaEnum(schema, 'ProgressIndicatorKind'));
  });

  it('matches ProgressPrecision enum', () => {
    expect(service.listProgressPrecisions().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'ProgressPrecision'),
    );
  });

  it('matches WalletCurrency enum', () => {
    expect(service.listWalletCurrencies().data.map((x) => x.code)).toEqual(
      parsePrismaEnum(schema, 'WalletCurrency'),
    );
  });
});

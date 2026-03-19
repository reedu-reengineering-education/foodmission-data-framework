import { parsePrismaEnum } from './prisma-schema';

describe('prisma schema utils', () => {
  it('parses enum values, stripping comments and blank lines', () => {
    const schema = `
      enum Gender {
        // comment
        MALE

        FEMALE
        OTHER,
        UNSPECIFIED
      }
    `;

    expect(parsePrismaEnum(schema, 'Gender')).toEqual([
      'MALE',
      'FEMALE',
      'OTHER',
      'UNSPECIFIED',
    ]);
  });

  it('throws when enum is not found', () => {
    expect(() => parsePrismaEnum('model X { id String }', 'Missing')).toThrow(
      /Enum not found/i,
    );
  });
});

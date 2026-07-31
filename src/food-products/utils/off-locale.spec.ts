import { pickLocalizedString } from './off-locale';

describe('pickLocalizedString', () => {
  it('prefers the requested locale suffix', () => {
    expect(
      pickLocalizedString(
        {
          product_name_de: 'Nougatcreme',
          product_name_en: 'Hazelnut spread',
          product_name: 'Nutella',
        },
        'product_name',
        'de',
      ),
    ).toBe('Nougatcreme');
  });

  it('falls back to English when requested locale is missing', () => {
    expect(
      pickLocalizedString(
        {
          product_name_en: 'Hazelnut spread',
          product_name: 'Nutella',
        },
        'product_name',
        'de',
      ),
    ).toBe('Hazelnut spread');
  });

  it('falls back to bare field when en and locale suffix are missing', () => {
    expect(
      pickLocalizedString(
        {
          product_name: 'Nutella',
        },
        'product_name',
        'de',
      ),
    ).toBe('Nutella');
  });

  it('uses languages map as last resort', () => {
    expect(
      pickLocalizedString(
        {
          product_name_languages: {
            de: 'Nougatcreme',
            fr: 'Pâte à tartiner',
          },
        },
        'product_name',
        'de',
      ),
    ).toBe('Nougatcreme');
  });

  it('defaults to English suffix when lang is omitted', () => {
    expect(
      pickLocalizedString(
        {
          product_name_en: 'Hazelnut spread',
          product_name: 'Nutella',
        },
        'product_name',
      ),
    ).toBe('Hazelnut spread');
  });

  it('ignores blank strings in the chain', () => {
    expect(
      pickLocalizedString(
        {
          product_name_de: '   ',
          product_name_en: 'Hazelnut spread',
        },
        'product_name',
        'de',
      ),
    ).toBe('Hazelnut spread');
  });
});

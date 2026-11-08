import { offImageUrl, offProductPath } from './off-images';

const BASE = 'https://images.openfoodfacts.org/images/products';

describe('offProductPath', () => {
  it('splits 13-digit barcodes 3/3/3/rest', () => {
    expect(offProductPath('8001250120342')).toBe('800/125/012/0342');
  });

  it('pads barcodes of 9-12 digits to 13 before splitting', () => {
    expect(offProductPath('123456789012')).toBe('012/345/678/9012');
  });

  it('keeps short barcodes unsplit', () => {
    expect(offProductPath('12345678')).toBe('12345678');
  });
});

describe('offImageUrl', () => {
  const product = {
    _id: '8001250120342',
    lc: 'it',
    images: {
      selected: {
        front: { en: { rev: '160' }, it: { rev: '146' } },
        ingredients: { fr: { rev: '98' } },
      },
    },
  };

  it('uses the requested language when selected', () => {
    expect(offImageUrl(product, 'front', 'en')).toBe(
      `${BASE}/800/125/012/0342/front_en.160.400.jpg`,
    );
  });

  it("falls back to the product's main language", () => {
    expect(offImageUrl(product, 'front', 'de')).toBe(
      `${BASE}/800/125/012/0342/front_it.146.400.jpg`,
    );
  });

  it('falls back to any selected language', () => {
    expect(offImageUrl(product, 'ingredients', 'de')).toBe(
      `${BASE}/800/125/012/0342/ingredients_fr.98.400.jpg`,
    );
  });

  it('reads the legacy images.<type>_<lc> shape', () => {
    expect(
      offImageUrl(
        { _id: '12345678', images: { front_de: { rev: 7 } } },
        'front',
        'de',
      ),
    ).toBe(`${BASE}/12345678/front_de.7.400.jpg`);
  });

  it('returns undefined without a selected image', () => {
    expect(offImageUrl(product, 'nutrition', 'en')).toBeUndefined();
    expect(offImageUrl({ _id: '1' }, 'front')).toBeUndefined();
  });
});

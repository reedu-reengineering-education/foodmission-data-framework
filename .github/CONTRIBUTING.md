# Contributing Translations

Thanks for helping improve localization coverage.

## Translation Locations

- `src/i18n/en/` is the base locale.
- Other locale folders should stay aligned with base namespace files when updated.
- CI validates English only; missing keys in other locales fall back to English at runtime.
- Before updating non-English translations, run:
  - `npm run i18n:validate:locales`
  - `npm run i18n:missing`

## Spreadsheet handoff (translation vendor)

Export **all keys** for every target locale to Excel (one sheet per locale) or CSV (one file per locale):

```bash
npm run i18n:export
# optional: --out translations/handoff.xlsx --locales de,it --namespaces catalog
# csv writes translations/handoff.de.csv, translations/handoff.it.csv, ...
npm run i18n:export -- --format csv --out translations/handoff.csv
```

Each locale sheet/file has columns: `key`, `en`, `translation`.

- **Sheet name** = locale code (`de`, `it`, …)
- **key** = `{namespace}.{path}` (e.g. `catalog.genders.MALE`, `common.app.name`)
- **en** = English reference (read-only for vendor)
- **translation** = editable; pre-filled with current value

CSV mode writes one file per locale: `handoff.de.csv`, `handoff.it.csv`, …

After the vendor returns the filled file:

```bash
npm run i18n:import -- --dry-run
npm run i18n:import
npm run i18n:validate:locales
```

Import patches existing JSON files (it does not replace them), skips blank cells, and sets `meta.lastImportedAt` on updated files. The `meta` block is internal metadata in English only and is never exported.

## Before Opening a PR

1. Update translation values only (avoid changing key names).
2. Keep placeholders untouched (for example `{{count}}`).
3. Run `npm run i18n:validate` (always) and, when touching non-English files, also:
   - `npm run i18n:validate:locales`
   - `npm run i18n:missing`

## Pull Request Expectations

- Describe which locales/namespaces were updated.
- Mention any terminology decisions.
- Confirm validation commands passed locally.

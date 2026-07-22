# Contributing Translations

Thanks for helping improve localization coverage.

## Which script do I use?

| Goal | Command | Touches |
| --- | --- | --- |
| Validate English UI JSON | `npm run i18n:validate` | `src/i18n/en/` |
| Validate all UI locales | `npm run i18n:validate:locales` | `src/i18n/*/` |
| List missing UI keys | `npm run i18n:missing` | `src/i18n/*/` |
| Vendor handoff: **UI strings** | `npm run i18n:export` / `i18n:import` | JSON under `src/i18n/` |
| Vendor handoff: **DB content** | `npm run i18n:export:db` / `i18n:import:db` | `entity_translations` table |
| Bulk-load NEVO food translations after seed | `npm run db:import:nevo-translations` | NEVO CSV → `entity_translations` |

- **`i18n:export` / `i18n:import`** — app UI copy (JSON files)
- **`i18n:export:db` / `i18n:import:db`** — database strings (food names, missions, …)
- **`db:import:nevo-translations`** — one-shot NEVO CSV load after seed (separate from vendor handoff)

## Translation locations (UI JSON)

- `src/i18n/en/` is the base locale.
- Other locale folders should stay aligned with base namespace files when updated.
- CI validates English only; missing keys in other locales fall back to English at runtime.
- Before updating non-English translations, run:
  - `npm run i18n:validate:locales`
  - `npm run i18n:missing`

## Vendor handoff: UI strings

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

After the vendor returns the filled file:

```bash
npm run i18n:import -- --dry-run
npm run i18n:import
npm run i18n:validate:locales
```

Import patches existing JSON files (it does not replace them), skips blank cells, and sets `meta.lastImportedAt` on updated files.

## Vendor handoff: DB strings

```bash
npm run i18n:export:db
# optional: --locales de,it --include-nl --fields foodName,foodGroup,remark
# csv: --format csv --out translations/entity-handoff.csv

npm run i18n:import:db -- --dry-run
npm run i18n:import:db
```

Sheet columns: `key`, `en`, `translation`. Keys look like `GenericFood.{nevoCode}.foodName`.

## NEVO food translations (deployment)

Full runbook: [scripts/README.md](../scripts/README.md#nevo-deployment-new-database).

```bash
npm run db:migrate:deploy   # or db:migrate locally
npm run db:seed:prod        # English NEVO foods (+ other prod seed data)
npm run db:import:nevo-translations -- --dry-run
npm run db:import:nevo-translations
```

For dev: use `db:seed` instead of `db:seed:prod`. Vendor gap-fills after import: `i18n:export:db` / `i18n:import:db`.

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

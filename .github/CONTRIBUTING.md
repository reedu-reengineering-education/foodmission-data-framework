# Contributing Translations

Thanks for helping improve localization coverage.

## Translation Locations

- `src/i18n/en/` is the base locale.
- Other locale folders should stay aligned with base namespace files when updated.
- CI validates English only; missing keys in other locales fall back to English at runtime.
- Before updating non-English translations, run:
  - `npm run i18n:validate:locales`
  - `npm run i18n:missing`

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

For full guidance, see `docs/TRANSLATION_CONTRIBUTOR_GUIDE.md`.

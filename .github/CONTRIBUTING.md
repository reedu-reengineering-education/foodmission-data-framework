# Contributing Translations

Thanks for helping improve localization coverage.

## Translation Locations

- `src/i18n/en/` is the base locale.
- Other locale folders must stay aligned with base namespace files.

## Before Opening a PR

1. Update translation values only (avoid changing key names).
2. Keep placeholders untouched (for example `{{count}}`).
3. Run:
   - `npm run i18n:validate`
   - `npm run i18n:missing`

## Pull Request Expectations

- Describe which locales/namespaces were updated.
- Mention any terminology decisions.
- Confirm validation commands passed locally.

For full guidance, see `docs/TRANSLATION_CONTRIBUTOR_GUIDE.md`.

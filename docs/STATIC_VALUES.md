# Static Values API

This document describes the **Static Values** endpoints used by the FOODMISSION App for dropdowns and pickers (e.g. **regions**, **countries**, profile fields).

## Endpoints

Base path: `/api/v1/static-values`

## Authentication

For onboarding and account creation, all required dropdown data is **public** (no JWT required):
- `startup`
- `countries`, `regions`, `languages`
- profile dropdowns: `genders`, `activity-levels`, `education-levels`, `annual-income-levels`
- onboarding helpers: `dietary-preferences`, `shopping-responsibilities`

For in-app usage, a few endpoints are **JWT-protected** (requires `Roles('user','admin')`):
- `units`
- `type-of-meals`
- `meal-types`
- `group-roles`

### Startup bundle

`GET /api/v1/static-values/startup`

Returns small, frequently-needed lists for regular app startup and onboarding, **excluding** world-wide geography lists (countries/regions) because those are large and paginated.

Includes:
- `genders`
- `activityLevels`
- `educationLevels`
- `annualIncomeLevels`
- `dietaryPreferences` (Phase 1)
- `shoppingResponsibilities`

### World-wide geography (paginated)

These endpoints support `page` and `limit` (default limit: 10), and optional `search`.

- `GET /api/v1/static-values/countries?page=1&limit=10&search=nether`
- `GET /api/v1/static-values/regions?page=1&limit=10&countryCode=NL&search=hol`

Notes:
- `regions.countryCode` is **recommended** for performance with world-wide data.
- `regions` values use a composite code format: `${countryCode}-${subdivisionCode}`.
- **Data source**: served at runtime from `iso-3166-2` (no DB seeding required).

### Languages (paginated)

`GET /api/v1/static-values/languages?page=1&limit=10&search=eng`

Language codes follow ISO 639-1.
**Data source**: served at runtime from `iso-639-1` (no DB seeding required).

### DB-canonical enums (non-paginated)

These lists are derived from Prisma enums (`@prisma/client`) to stay canonical to the database schema:

- `GET /api/v1/static-values/genders`
- `GET /api/v1/static-values/activity-levels`
- `GET /api/v1/static-values/education-levels`
- `GET /api/v1/static-values/annual-income-levels`
- `GET /api/v1/static-values/units`
- `GET /api/v1/static-values/type-of-meals`
- `GET /api/v1/static-values/meal-types`
- `GET /api/v1/static-values/group-roles`

## Dietary preferences (two phases)

### Phase 1 (implemented)

`GET /api/v1/static-values/dietary-preferences`

Provides a minimal set aligned with the current recipe seed/tagging pipeline:
- `NONE`
- `VEGAN` → maps to recipe tag filter `tags=vegan`
- `VEGETARIAN` → maps to recipe tag filter `tags=vegetarian`

Each option may include a `meta.recipeFilter.includeTags` hint that matches the existing recipes query API (`GET /api/v1/recipes?tags=...`).

### Phase 2 (planned)

Add "free-from" options (e.g. `GLUTEN_FREE`, `DAIRY_FREE`) once the recipes API supports **negative** allergen filtering (e.g. `excludeAllergens=`) or the seed pipeline adds explicit `gluten-free`/`dairy-free` tags.

## Shopping responsibility

`GET /api/v1/static-values/shopping-responsibilities`

This value is not modeled as a dedicated DB enum because it is a household behavior and can be user- or group-specific. Recommended storage is in existing JSON preference fields:
- `User.preferences.shoppingResponsibility` (user-level)
- or `GroupMembership.preferences.shoppingResponsibility` (group/household-level)


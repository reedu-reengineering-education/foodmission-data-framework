# Catalog API

This document describes the **Catalog** endpoints used by the FOODMISSION App for dropdowns and pickers (e.g. **regions**, **countries**, profile fields).

## Endpoints

Base path: `/api/v1/catalog`

## Authentication

For onboarding and account creation, all required dropdown data is **public** (no JWT required):
- `startup`
- `countries`, `regions`, `languages`
- profile dropdowns: `genders`, `activity-levels`, `education-levels`, `annual-income-levels`
- onboarding helpers: `dietary-preferences`, `shopping-responsibilities`

For in-app usage, a few endpoints are **JWT-protected** (requires `Roles('user','admin')`):
- `units`
- `type-of-meals`
- `group-roles`

### Startup bundle

`GET /api/v1/catalog/startup`

Returns small, frequently-needed lists for regular app startup and onboarding, **excluding** world-wide geography lists (countries/regions) because those are large and paginated.

Includes:
- `genders`
- `activityLevels`
- `educationLevels`
- `annualIncomeLevels`
- `dietaryPreferences`
- `shoppingResponsibilities`

### World-wide geography (paginated)

These endpoints support `page` and `limit` (default limit: 10), and optional `search`.

- `GET /api/v1/catalog/countries?page=1&limit=10&search=nether`
- `GET /api/v1/catalog/regions?page=1&limit=10&countryCode=NL&search=hol`

Notes:
- `regions.countryCode` is **recommended** for performance with world-wide data.
- `regions` values use a composite code format: `${countryCode}-${subdivisionCode}`.
- **Data source**: served at runtime from `iso-3166-2` (no DB seeding required).

### Languages (paginated)

`GET /api/v1/catalog/languages?page=1&limit=10&search=eng`

Language codes follow ISO 639-1.
**Data source**: served at runtime from `iso-639-1` (no DB seeding required).

### DB-canonical enums (non-paginated)

These lists are derived from Prisma enums (`@prisma/client`) to stay canonical to the database schema:

- `GET /api/v1/catalog/genders`
- `GET /api/v1/catalog/activity-levels`
- `GET /api/v1/catalog/education-levels`
- `GET /api/v1/catalog/annual-income-levels`
- `GET /api/v1/catalog/units`
- `GET /api/v1/catalog/type-of-meals`
- `GET /api/v1/catalog/group-roles`

## Dietary preferences

`GET /api/v1/catalog/dietary-preferences`

Returns the full set of currently supported dietary preference values:
- `VEGAN`
- `VEGETARIAN`
- `PESCATARIAN`
- `GLUTEN_FREE`
- `DAIRY_FREE`
- `NUT_FREE`
- `HALAL`
- `KOSHER`

## Shopping responsibility

`GET /api/v1/catalog/shopping-responsibilities`

This value is not modeled as a dedicated DB enum because it is a household behavior and can be user- or group-specific. Recommended storage is in existing JSON preference fields:
- `User.preferences.shoppingResponsibility` (user-level)
- or `GroupMembership.preferences.shoppingResponsibility` (group/household-level)


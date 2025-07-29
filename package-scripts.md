# Package Scripts for OpenAPI Generation

Add these scripts to your `package.json` for easy OpenAPI generation:

```json
{
  "scripts": {
    "openapi:generate": "node scripts/generate-openapi.js",
    "openapi:serve": "npm run build && npm run openapi:generate && echo 'OpenAPI spec generated! Import docs/openapi.json into Postman'",
    "docs:generate": "npm run openapi:generate"
  }
}
```

## Usage

### Generate OpenAPI spec file:
```bash
npm run openapi:generate
```

### Build and generate (recommended):
```bash
npm run openapi:serve
```

The generated file will be saved to `docs/openapi.json` and can be imported directly into Postman.
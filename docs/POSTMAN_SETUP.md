# 📮 Postman Collection Setup Guide

This guide shows you how to generate and use a Postman collection from your NestJS OpenAPI specification.

## 🚀 Quick Start

### Method 1: Import from Running API (Recommended)

1. **Start your API:**
   ```bash
   npm run start:dev
   ```

2. **Open Postman and Import:**
   - Click **Import** (top left)
   - Select **Link** tab
   - Enter: `http://localhost:3000/api/docs-json`
   - Click **Continue** → **Import**

### Method 2: Generate Static File

1. **Generate OpenAPI spec:**
   ```bash
   npm run build
   npm run postman:collection
   ```

2. **Import into Postman:**
   - Open Postman
   - Click **Import** → **Upload Files**
   - Select `docs/openapi.json`
   - Click **Import**

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run openapi:generate` | Generate OpenAPI spec file |
| `npm run openapi:serve` | Build + generate spec |
| `npm run postman:collection` | Alias for openapi:serve |

## 🎯 What You'll Get

The generated Postman collection includes:

### 📁 **Authentication Endpoints**
- `GET /auth/info` - Keycloak configuration
- `GET /auth/health` - Health check
- `GET /auth/profile` - User profile (requires JWT)
- `PUT /auth/profile/preferences` - Update preferences
- `PUT /auth/profile/settings` - Update settings
- `GET /auth/token-info` - JWT token details
- `GET /auth/admin-only` - Admin-only test endpoint

### 📁 **Food Management** (if implemented)
- Food CRUD operations
- OpenFoodFacts integration endpoints

### 📁 **User Management** (if implemented)
- User profile management
- Dietary preferences

### 📁 **Health Monitoring**
- Health check endpoints
- Metrics and monitoring

## 🔐 Setting Up Authentication

### Step 1: Create Environment Variables

In Postman, create a new environment with these variables:

```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "keycloakUrl": "http://localhost:8080",
  "realm": "foodmission",
  "clientId": "foodmission-web",
  "username": "your-username",
  "password": "your-password",
  "accessToken": ""
}
```

### Step 2: Get Access Token

Create a new request to get a JWT token:

**Request:** `POST {{keycloakUrl}}/realms/{{realm}}/protocol/openid-connect/token`

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Body (x-www-form-urlencoded):**
```
grant_type: password
client_id: {{clientId}}
username: {{username}}
password: {{password}}
```

**Tests Script (to auto-save token):**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("accessToken", response.access_token);
    console.log("Access token saved to environment");
}
```

### Step 3: Use Token in Protected Endpoints

For protected endpoints, add this header:
```
Authorization: Bearer {{accessToken}}
```

## 📋 Pre-configured Collection Features

The generated collection includes:

### ✅ **Pre-configured Authentication**
- Bearer token authentication setup
- Environment variable placeholders

### ✅ **Request Examples**
- Sample request bodies
- Response schemas
- Parameter descriptions

### ✅ **Environment Support**
- Development, staging, production servers
- Configurable base URLs

### ✅ **Documentation**
- Endpoint descriptions
- Parameter explanations
- Response examples

## 🛠️ Customizing the Collection

### Adding Custom Headers

You can add global headers to all requests:

1. Right-click collection → **Edit**
2. Go to **Authorization** tab
3. Set up Bearer Token with `{{accessToken}}`

### Creating Test Scripts

Add test scripts to validate responses:

```javascript
// Test for successful response
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test response structure
pm.test("Response has required fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('email');
});

// Save data for next request
pm.test("Save user ID", function () {
    const jsonData = pm.response.json();
    pm.environment.set("userId", jsonData.id);
});
```

## 🔄 Keeping Collection Updated

### Auto-sync with API Changes

1. **During Development:**
   ```bash
   npm run start:dev
   ```
   Re-import from `http://localhost:3000/api/docs-json`

2. **For CI/CD:**
   ```bash
   npm run build
   npm run postman:collection
   ```
   Use the generated `docs/openapi.json` file

### Version Control

Consider committing the generated `docs/openapi.json` to version control for team sharing:

```bash
git add docs/openapi.json
git commit -m "Update Postman collection"
```

## 🚨 Troubleshooting

### Common Issues

1. **"Cannot import" error:**
   - Ensure your API is running
   - Check the URL is accessible
   - Verify OpenAPI spec is valid JSON

2. **Authentication fails:**
   - Check Keycloak is running
   - Verify user credentials
   - Ensure client configuration is correct

3. **Missing endpoints:**
   - Rebuild your project: `npm run build`
   - Regenerate spec: `npm run postman:collection`
   - Re-import into Postman

### Validation

Test your setup with these endpoints:

1. **Public endpoint:** `GET /auth/health`
2. **Get token:** `POST /realms/foodmission/protocol/openid-connect/token`
3. **Protected endpoint:** `GET /auth/profile` (with Bearer token)

## 📚 Additional Resources

- [Postman Documentation](https://learning.postman.com/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [NestJS Swagger Module](https://docs.nestjs.com/openapi/introduction)
- [Keycloak Documentation](https://www.keycloak.org/documentation)

## 🎉 Success!

You now have a fully functional Postman collection that stays in sync with your API! 

The collection includes all your endpoints with proper authentication, request examples, and documentation. Happy testing! 🚀
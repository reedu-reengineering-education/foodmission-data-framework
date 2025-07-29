# Stateless Authentication with Keycloak

This setup provides lightweight, stateless authentication leveraging Keycloak's built-in features.

## Architecture Overview

```
Frontend (React/Vue/etc) 
    ↓ (Direct OAuth2 flow)
Keycloak Server
    ↓ (JWT Bearer tokens)
NestJS API (Stateless validation)
    ↓ (Optional user mapping)
PostgreSQL (App-specific data only)
```

## Key Features

- **Stateless**: No sessions stored in backend
- **Bearer-only**: API only validates JWT tokens from Keycloak
- **Direct frontend auth**: Frontend handles OAuth2 flow directly with Keycloak
- **Minimal backend**: Only validates tokens and maps users for app-specific data

## Configuration

### Environment Variables
```bash
# Keycloak Configuration
KEYCLOAK_AUTH_SERVER_URL="http://localhost:8080"
KEYCLOAK_REALM="foodmission"
KEYCLOAK_CLIENT_ID="foodmission-api"          # Backend client (confidential)
KEYCLOAK_CLIENT_SECRET="your-secret"
KEYCLOAK_WEB_CLIENT_ID="foodmission-web"      # Frontend client (public)
FRONTEND_URL="http://localhost:3000"
```

### Keycloak Client Setup

1. **Backend Client** (`foodmission-api`):
   - Type: Confidential
   - Access Type: Bearer-only
   - Used for: Token validation only

2. **Frontend Client** (`foodmission-web`):
   - Type: Public
   - Access Type: Standard flow enabled
   - Valid redirect URIs: `http://localhost:3000/*`
   - Used for: OAuth2 authorization code flow

## API Endpoints

### Public Endpoints
- `GET /auth/info` - Keycloak configuration for frontend
- `GET /auth/health` - Health check

### Protected Endpoints (Require Bearer token)
- `GET /auth/profile` - Get/create user profile
- `PUT /auth/profile/preferences` - Update user preferences
- `PUT /auth/profile/settings` - Update user settings
- `GET /auth/token-info` - JWT token details
- `GET /auth/admin-only` - Admin role required

## Frontend Integration

The frontend should:
1. Get auth config from `/auth/info`
2. Handle OAuth2 flow directly with Keycloak
3. Store JWT tokens (access + refresh)
4. Send Bearer tokens to API

### Example Frontend Code
```javascript
// Get auth configuration
const authConfig = await fetch('/api/auth/info').then(r => r.json());

// Initialize Keycloak client
const keycloak = new Keycloak({
  url: authConfig.authServerUrl,
  realm: authConfig.realm,
  clientId: authConfig.clientId
});

// Initialize authentication
await keycloak.init({
  onLoad: 'login-required',
  checkLoginIframe: false
});

// Use token in API calls
const response = await fetch('/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${keycloak.token}`
  }
});
```

## Database Schema

Only app-specific user data is stored:

```sql
-- User profiles (mapped from Keycloak)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_id VARCHAR NOT NULL UNIQUE,
  email VARCHAR NOT NULL UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  preferences JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Features

- **JWT Validation**: Automatic token validation via Keycloak
- **Role-based Access**: Use `@Roles()` decorator
- **No Sessions**: Completely stateless
- **Token Refresh**: Handled by frontend/Keycloak
- **CORS**: Configure for your frontend domain

## Benefits

1. **Simplified Backend**: No token exchange, no session management
2. **Scalable**: Stateless design scales horizontally
3. **Secure**: Leverages Keycloak's security features
4. **Maintainable**: Less custom authentication code
5. **Standard**: Uses OAuth2/OIDC standards

## Migration from Session-based

If migrating from session-based auth:
1. Remove session storage (Redis/memory)
2. Remove token exchange logic
3. Update frontend to handle OAuth2 directly
4. Keep user mapping for app-specific data
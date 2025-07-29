# Authentication System

This document describes the authentication and authorization system implemented in the FOODMISSION Data Framework.

## Overview

The authentication system uses Keycloak as the identity provider with JWT tokens for API access. It supports:

- Keycloak integration using `nest-keycloak-connect`
- JWT token validation
- Role-based access control
- User synchronization between Keycloak and local database

## Architecture

### Components

1. **AuthModule**: Main authentication module that configures Keycloak integration
2. **AuthService**: Handles user validation, creation, and JWT operations
3. **AuthController**: Provides authentication endpoints
4. **Guards**: Protect routes with authentication and authorization
5. **Strategies**: JWT validation strategy for internal tokens

### Flow

1. User authenticates with Keycloak
2. Keycloak token is validated by the application
3. User is created/updated in local database if needed
4. Internal JWT token is issued for API access
5. Subsequent requests use JWT token for authentication

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET="your-jwt-secret-key-change-in-production"

# Keycloak Configuration
KEYCLOAK_AUTH_SERVER_URL="http://localhost:8080"
KEYCLOAK_REALM="foodmission"
KEYCLOAK_CLIENT_ID="foodmission-api"
KEYCLOAK_CLIENT_SECRET="your-keycloak-client-secret"
```

### Keycloak Setup

1. Start Keycloak using Docker Compose:
   ```bash
   npm run docker:up
   ```

2. Access Keycloak admin console at `http://localhost:8080`
   - Username: `admin`
   - Password: `admin`

3. Create a realm named `foodmission`
4. Create a client named `foodmission-api`
5. Configure client settings as needed

## API Endpoints

### Public Endpoints

- `GET /auth/health` - Health check endpoint

### Protected Endpoints

- `POST /auth/login` - Login with Keycloak token
- `GET /auth/profile` - Get current user profile
- `GET /auth/admin-only` - Admin-only endpoint (requires admin role)

## Usage Examples

### Login Flow

```typescript
// Client sends Keycloak token to login endpoint
POST /auth/login
Authorization: Bearer <keycloak-token>

// Response includes internal JWT token
{
  "access_token": "internal-jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Accessing Protected Resources

```typescript
// Use internal JWT token for subsequent requests
GET /auth/profile
Authorization: Bearer <internal-jwt-token>

// Response
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "keycloakId": "keycloak-user-id"
}
```

### Role-Based Access

```typescript
// Endpoints can be protected with roles
@Roles({ roles: ['admin'] })
@Get('admin-only')
async adminEndpoint() {
  return { message: 'Admin access granted' };
}
```

## Database Schema

The system maintains user information in the local database:

```sql
model User {
  id          String   @id @default(cuid())
  keycloakId  String   @unique
  email       String   @unique
  firstName   String
  lastName    String
  preferences UserPreferences?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Security Features

1. **Token Validation**: All tokens are validated against Keycloak
2. **User Synchronization**: Users are automatically created/updated from Keycloak
3. **Role-Based Access**: Endpoints can be protected with specific roles
4. **Error Handling**: Comprehensive error handling for authentication failures
5. **Environment Configuration**: Sensitive configuration via environment variables

## Testing

The authentication system includes comprehensive tests:

- Unit tests for AuthService
- Integration tests for JWT strategy
- End-to-end tests for authentication endpoints

Run tests with:
```bash
npm test
npm run test:e2e
```

## Development

### Local Development

1. Start the development environment:
   ```bash
   npm run docker:up
   npm run start:dev
   ```

2. The application will be available at `http://localhost:3000`
3. Keycloak admin console at `http://localhost:8080`

### Adding New Protected Endpoints

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles, Resource } from 'nest-keycloak-connect';

@Controller('api')
@Resource('api')
export class ApiController {
  @Get('protected')
  @Roles({ roles: ['user'] })
  async protectedEndpoint() {
    return { message: 'Protected content' };
  }
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check token validity and Keycloak configuration
2. **403 Forbidden**: Verify user has required roles
3. **Connection Issues**: Ensure Keycloak is running and accessible
4. **Database Errors**: Check database connection and schema

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will provide detailed logs for authentication flows and errors.
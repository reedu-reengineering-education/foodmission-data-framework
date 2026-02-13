# Keycloak Setup for FOODMISSION Data Framework

This directory contains the complete Keycloak realm configuration for the FOODMISSION Data Framework.

## 🚀 Quick Setup (Recommended)

### Step 1: Start Keycloak

```bash
# Start Keycloak in development mode
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

### Step 2: Import Realm Configuration

1. **Open Keycloak Admin Console**: http://localhost:8080
2. **Login** with:
   - Username: `admin`
   - Password: `admin`
3. **Import Realm**:
   - Click the dropdown next to "master" (top left)
   - Click "Create Realm"
   - Click "Browse..." and select `foodmission-realm.json` from this directory
   - Click "Create"

### Step 3: Restart Your Application

```bash
# Your .env file is already configured with the correct client secret
npm run start:dev
```

## 🔐 Pre-configured Users

The realm comes with three test users:

### Admin User

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@foodmission.dev`
- **Roles**: `admin`, `user`

### Developer User

- **Username**: `developer`
- **Password**: `dev123`
- **Email**: `dev@foodmission.dev`
- **Roles**: `user`

## 🎨 Custom Theme Setup

This project supports custom Keycloak themes via .jar files from external repositories.

### Option 1: Automatic Theme Download (Recommended)

1. **Configure the theme repository** in `download-theme.sh`:

   ```bash
   # Edit these variables
   GITHUB_REPO="your-org/your-keycloak-theme-repo"
   THEME_VERSION="latest"  # or specific version like "v1.0.0"
   ```

2. **Download the theme**:

   ```bash
   ./download-theme.sh
   ```

3. **Restart Keycloak**:
   ```bash
   docker-compose -f docker-compose.dev.yml restart keycloak
   ```

### Option 2: Manual Theme Installation

1. **Download the .jar file** from your theme repository releases
2. **Place it in** `keycloak/themes/` directory
3. **Restart Keycloak container**

### Applying the Theme

1. **Access Keycloak Admin Console**: http://localhost:8080
2. **Go to Realm Settings** → **Themes**
3. **Select your custom theme** from the dropdown
4. **Save** the configuration

## 🔧 Pre-configured Client

### FOODMISSION API Client

- **Client ID**: `foodmission-api`
- **Client Secret**: `foodmission-dev-secret-2025` (already in your .env)
- **Valid Redirect URIs**:
  - `http://localhost:3000/*`
  - `http://localhost:3001/*`
  - `http://127.0.0.1:3000/*`
  - `http://127.0.0.1:3001/*`
- **Web Origins**:
  - `http://localhost:3000`
  - `http://localhost:3001`
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3001`

## 🧪 Testing Authentication

### 1. Get Auth Configuration

```bash
curl http://localhost:3000/api/v1/auth/info
```

### 2. Test Stateless Authentication

1. Use the configuration to set up frontend authentication
2. Authenticate directly with Keycloak using OAuth2/OIDC
3. Use JWT tokens for API requests:

```bash
curl -H "Authorization: Bearer <jwt-token>" http://localhost:3000/api/v1/auth/profile
```

### 3. Test Protected Endpoints

```bash
# Get user profile (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/auth/profile

# Test admin endpoint (requires admin role)
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  http://localhost:3000/api/v1/auth/admin-only
```

## 📋 What's Included in the Configuration

### Realm Settings

- **Realm Name**: `foodmission`
- **Display Name**: `FOODMISSION`
- **Token Lifespans**: Configured for development
- **Security Settings**: Basic security enabled

### Roles

- `admin`: Administrator role with full access
- `user`: Regular user role (default)

### Client Configuration

- **Authentication Flow**: Standard flow enabled
- **Direct Access Grants**: Enabled for testing
- **Service Accounts**: Disabled
- **Protocol Mappers**: Username, email, names, and roles

### Security Features

- **Brute Force Protection**: Disabled for development
- **Email Verification**: Disabled for development
- **Remember Me**: Disabled
- **User Registration**: Limited through service account

## 🔄 Updating the Configuration

If you need to modify the realm configuration:

1. Make changes in Keycloak Admin Console
2. Export the realm:
   - Go to **Realm Settings** → **Action** → **Partial export**
   - Select what to export (users, clients, roles, etc.)
   - Download the JSON file
3. Replace `foodmission-realm.dev.json` with the new configuration

## 🐳 Docker Compose Alternative

For a more permanent setup, you can use Docker Compose:

```yaml
# docker-compose.keycloak.yml
version: '3.8'
services:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    command: start-dev
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    ports:
      - '8080:8080'
    volumes:
      - keycloak_data:/opt/keycloak/data

volumes:
  keycloak_data:
```

Run with:

```bash
docker-compose -f docker-compose.keycloak.yml up -d
```

## 🔍 Troubleshooting

### Common Issues

1. **"Realm not found"**: Make sure you imported the realm correctly
2. **"Invalid client"**: Check that the client secret in `.env` matches the configuration
3. **"Invalid redirect URI"**: Ensure your application URL is in the client's redirect URIs
4. **"User not found"**: Use the pre-configured users listed above

### Verification Steps

1. **Check Keycloak is running**: http://localhost:8080
2. **Verify realm exists**: Should see "foodmission" in realm dropdown
3. **Check client configuration**: Go to Clients → foodmission-api
4. **Test user login**: Try logging in with test users in Keycloak

## 🎯 Next Steps

Once Keycloak is set up:

1. **Test the authentication flow** using the API endpoints
2. **Integrate with your frontend** application
3. **Customize user roles** and permissions as needed
4. **Set up production configuration** with proper security settings

The realm configuration provides a complete, ready-to-use authentication setup for development and testing! 🎉

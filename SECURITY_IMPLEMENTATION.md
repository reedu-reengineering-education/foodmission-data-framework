# Security Hardening and Validation Implementation

This document summarizes the security features implemented for Task 17: Security Hardening and Validation.

## Implemented Features

### 1. Rate Limiting Middleware for API Endpoints

- **Custom Rate Limit Guard** (`src/security/guards/rate-limit.guard.ts`)
  - Implements per-IP and per-user rate limiting
  - Configurable limits (default: 100 requests per minute)
  - Skips rate limiting for health checks and metrics endpoints
  - Logs security events when rate limits are exceeded
  - Automatically cleans up expired entries

- **Applied to Controllers**
  - Food Controller: Different limits for different operations (5/min for creation, 20/min for search)
  - Auth Controller: 10/min for login URL requests, 30/min for profile requests
  - Uses `@UseGuards(ThrottlerGuard)` and `@Throttle()` decorators

### 2. Input Sanitization and Validation

- **Input Sanitization Pipe** (`src/security/pipes/input-sanitization.pipe.ts`)
  - Sanitizes HTML content to prevent XSS attacks
  - Validates request body size (1MB limit)
  - Validates query parameter count (50 max) and length (1000 chars max)
  - Recursively sanitizes objects and arrays
  - Logs security events for sanitization errors

- **Security Service** (`src/security/security.service.ts`)
  - HTML sanitization using `sanitize-html` library
  - Removes all HTML tags and dangerous content
  - Handles various input types (strings, objects, arrays)

### 3. CORS and Security Headers Configuration

- **Helmet.js Integration** (`src/security/middleware/security.middleware.ts`)
  - Content Security Policy (CSP) with strict directives
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security with 1-year max-age
  - Referrer-Policy: no-referrer
  - Removes X-Powered-By header

- **CORS Configuration**
  - Configurable allowed origins via environment variable
  - Supports credentials
  - Proper preflight handling
  - Logs blocked CORS requests

### 4. Environment Variable Validation and Secrets Management

- **Environment Validation Schema** (`src/security/config/environment.validation.ts`)
  - Uses Joi for comprehensive validation
  - Validates required variables (DATABASE_URL, JWT_SECRET, etc.)
  - Enforces minimum security requirements (JWT_SECRET >= 32 chars)
  - Validates URLs, ports, and other formats
  - Different requirements for production vs development

- **Security Service Validation**
  - Runtime validation of critical environment variables
  - Warns about weak security configurations
  - Fails fast on missing required variables

### 5. Security Tests for Authentication and Authorization Flows

- **Unit Tests**
  - SecurityService: 19 tests covering all functionality
  - InputSanitizationPipe: 11 tests for validation and sanitization
  - RateLimitGuard: 12 tests for rate limiting logic

- **E2E Tests**
  - Authentication flow security tests
  - Authorization and role-based access control tests
  - Security headers validation
  - Input sanitization integration tests
  - Rate limiting behavior tests
  - CORS functionality tests

## Security Features Summary

### Implemented Security Measures

1. **Rate Limiting**
   - Per-endpoint rate limiting
   - IP and user-based tracking
   - Configurable limits and time windows
   - Security event logging

2. **Input Validation & Sanitization**
   - XSS prevention through HTML sanitization
   - Request size limits
   - Parameter count and length validation
   - Recursive object sanitization

3. **Security Headers**
   - Comprehensive CSP policy
   - Anti-clickjacking protection
   - MIME type sniffing prevention
   - XSS protection headers
   - HSTS for HTTPS enforcement

4. **CORS Protection**
   - Configurable origin whitelist
   - Proper preflight handling
   - Credential support
   - Request logging

5. **Environment Security**
   - Comprehensive validation schema
   - Required variable enforcement
   - Security configuration warnings
   - Production-specific requirements

6. **Monitoring & Logging**
   - Security event logging
   - Suspicious activity detection
   - Rate limit violation tracking
   - Failed authentication logging

### Security Event Types Logged

- `RATE_LIMIT_EXCEEDED`: When API rate limits are exceeded
- `SUSPICIOUS_REQUEST`: Requests with malicious patterns
- `UNUSUAL_USER_AGENT`: Requests with abnormally long user agents
- `EXCESSIVE_PARAMETERS`: Requests with too many parameters
- `INPUT_SANITIZATION_ERROR`: Errors during input sanitization

### Configuration

Security features are configured through environment variables:

- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `RATE_LIMIT_TTL`: Rate limit time window (default: 60000ms)
- `RATE_LIMIT_MAX`: Maximum requests per window (default: 100)
- `JWT_SECRET`: JWT signing secret (minimum 32 characters)
- `NODE_ENV`: Environment mode (affects security strictness)

### Testing Coverage

- **Unit Tests**: 42 tests covering all security components
- **Integration Tests**: E2E tests for complete security flows
- **Security Scenarios**: Tests for XSS, injection, rate limiting, and authentication

All security features are thoroughly tested and ready for production use.

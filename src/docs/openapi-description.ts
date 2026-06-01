export function buildOpenApiDescription(
  apiVersion: string,
  apiRelease: string,
): string {
  return `
      A comprehensive backend system for managing food-related data and operations.

      **API Version:** ${apiVersion}
      **Release:** ${apiRelease}
      
      ## Features
      - **Authentication**: Secure JWT-based authentication via Keycloak
      - **Food Management**: CRUD operations for food items with categorization
      - **OpenFoodFacts Integration**: Automatic nutritional data retrieval
      - **User Management**: User profiles and dietary preferences
      - **Health Monitoring**: Comprehensive health checks and metrics
      
      ## Getting Started
      1. Obtain a JWT token from the authentication endpoints
      2. Include the token in the Authorization header: \`Bearer <token>\`
      3. Use the interactive documentation below to explore available endpoints
      
      ## Authentication
      This API uses stateless JWT authentication via Keycloak.
      
      1. Get Keycloak configuration from \`/auth/info\`
      2. Authenticate directly with Keycloak using OAuth2/OIDC
      3. Include JWT tokens in the Authorization header: \`Bearer <token>\`
      
      ## Rate Limiting
      API requests are rate-limited to prevent abuse. Check response headers for rate limit information.
      
      ## Error Handling
      All endpoints follow a consistent error response format. When an error occurs, the API returns a JSON object with the following structure:
      
      - **statusCode**: HTTP status code (e.g., 400, 401, 404, 500)
      - **message**: Human-readable error message or array of validation errors
      - **error**: Error code/type (e.g., 'VALIDATION_ERROR', 'RESOURCE_NOT_FOUND')
      - **timestamp**: ISO 8601 timestamp when the error occurred
      - **path**: API path where the error occurred
      - **traceId**: Unique identifier for request tracing
      - **details**: Optional object containing additional error information (e.g., validation errors array)
      
      ### Common Error Responses
      
      - **400 Bad Request**: Invalid input data or validation failed. The \`details.errors\` field contains an array of validation error messages.
      - **401 Unauthorized**: Authentication required or invalid/expired JWT token.
      - **403 Forbidden**: Authenticated but insufficient permissions for the requested resource.
      - **404 Not Found**: The requested resource does not exist.
      - **409 Conflict**: Resource already exists or state conflict (e.g., duplicate email).
      - **422 Unprocessable Entity**: Request is well-formed but semantically incorrect (business validation failed).
      - **429 Too Many Requests**: Rate limit exceeded. Check response headers for retry information.
      - **500 Internal Server Error**: An unexpected server error occurred. The trace ID can be used for support.
      
      ### Example Error Response
      
      \`\`\`json
      {
        "statusCode": 400,
        "message": "Validation failed",
        "error": "VALIDATION_ERROR",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "path": "/api/v1/food-products",
        "traceId": "abc123def456",
        "details": {
          "errors": [
            "name should not be empty",
            "categoryId must be a valid UUID"
          ]
        }
      }
      \`\`\`
      
      ## Support
      For support and documentation, visit our [GitHub repository](https://github.com/reedu-reengineering-education/foodmission-data-framework).
    `;
}

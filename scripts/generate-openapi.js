#!/usr/bin/env node

/**
 * Script to generate OpenAPI specification file
 * Usage: node scripts/generate-openapi.js
 */

const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const fs = require('fs');
const path = require('path');

async function generateOpenApiSpec() {
  try {
    console.log('🚀 Starting OpenAPI spec generation...');

    const apiVersion =
      process.env.API_VERSION || process.env.npm_package_version || '1.0.0';
    const apiRelease =
      process.env.API_RELEASE || process.env.OTEL_SERVICE_VERSION || apiVersion;

    // Import the AppModule (using dynamic import for ES modules)
    const { AppModule } = await import('../dist/src/app.module.js');

    // Create NestJS application
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    // Configure Swagger/OpenAPI (same as main.ts)
    const config = new DocumentBuilder()
      .setTitle('Foodmission Data Framework API')
      .setDescription(
        `
        A comprehensive backend system for managing food-related data and operations.
        
        **API Version:** ${apiVersion}
        **Release:** ${apiRelease}
        
        ## Features
        - **Authentication**: Secure JWT-based authentication via Keycloak
        - **Food products**: CRUD for catalog items (barcoded products, OpenFoodFacts)
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
      `,
      )
      .setVersion(apiVersion)
      .setContact(
        'FOODMISSION Team',
        'https://github.com/reedu-reengineering-education/foodmission-data-framework',
        'support@foodmission.dev',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token obtained from Keycloak authentication',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag(
        'auth',
        'Authentication and authorization endpoints for Keycloak integration',
      )
      .addTag(
        'food-products',
        'Branded/barcoded food products with OpenFoodFacts nutritional metadata',
      )
      .addTag(
        'generic-foods',
        'Generic food entries (e.g., "apple", "rice") used when no branded product is needed',
      )
      .addTag(
        'users',
        'User profile management and dietary preferences configuration',
      )
      .addTag(
        'health',
        'Application health checks, readiness probes, and monitoring metrics',
      )
      .addTag('missions', 'Mission management - Create and manage user missions')
      .addTag('challenges', 'Challenge management - Create and manage user challenges')
      .addTag('auth-admin', 'Admin-only authentication and user administration')
      .addTag('user-groups', 'User group creation, membership, and invitations')
      .addTag('shopping-lists', 'Shopping list lifecycle management')
      .addTag(
        'shopping-list-items',
        'Shopping list item operations and item status updates',
      )
      .addTag(
        'pantry',
        'Pantry tracking for available ingredients and household stock',
      )
      .addTag('meals', 'Meal management and meal composition')
      .addTag('meal-items', 'Meal item operations for foods within a meal')
      .addTag('meal-logs', 'Meal logging and nutrition tracking entries')
      .addTag('recipes', 'Recipe management and recommendation endpoints')
      .addTag(
        'food-waste',
        'Food waste registration, analytics, and reduction insights',
      )
      .addTag(
        'knowledge',
        'Knowledge base content, quizzes, and progress tracking',
      )
      .addTag(
        'analytics-meal-log',
        'Anonymized meal-log analytics, reports, and batch workflows',
      )
      .addTag('catalog', 'Reference datasets and dropdown options')
      .addTag('monitoring', 'Prometheus metrics and operational observability')
      .addTag(
        'performance',
        'Performance diagnostics for cache and database behavior',
      )
      .addTag('webhooks', 'Inbound webhook handlers and event processing')
      .addServer('http://localhost:3000', 'Local development server')
      .addServer('https://api.foodmission.eu', 'Production server')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey, methodKey) => methodKey,
      deepScanRoutes: true,
    });

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write OpenAPI spec to file
    const outputPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log('✅ OpenAPI specification generated successfully!');
    console.log(`📄 File saved to: ${outputPath}`);
    console.log('');
    console.log('🔗 To use the generated spec:');
    console.log('1. Import into any OpenAPI-compatible tool');
    console.log(`2. Or use the file directly: ${outputPath}`);
    console.log('');
    console.log('🌐 Or use the running API:');
    console.log('1. Start your API: npm run start:dev');
    console.log('2. Import from: http://localhost:3000/api/docs-json');

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating OpenAPI spec:', error.message);
    console.error('');
    console.error('💡 Make sure to:');
    console.error('1. Build your project first: npm run build');
    console.error('2. Ensure all dependencies are installed: npm install');
    process.exit(1);
  }
}

generateOpenApiSpec();

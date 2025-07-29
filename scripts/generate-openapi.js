#!/usr/bin/env node

/**
 * Script to generate OpenAPI specification file for Postman import
 * Usage: node scripts/generate-openapi.js
 */

const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const fs = require('fs');
const path = require('path');

async function generateOpenApiSpec() {
  try {
    console.log('🚀 Starting OpenAPI spec generation...');
    
    // Import the AppModule (using dynamic import for ES modules)
    const { AppModule } = await import('../dist/app.module.js');
    
    // Create NestJS application
    const app = await NestFactory.create(AppModule, { logger: false });
    
    // Configure Swagger/OpenAPI (same as main.ts)
    const config = new DocumentBuilder()
      .setTitle('FOODMISSION Data Framework API')
      .setDescription(`
        A comprehensive backend system for managing food-related data and operations.
        
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
      `)
      .setVersion('1.0.0')
      .setContact(
        'FOODMISSION Team',
        'https://github.com/reedu-reengineering-education/foodmission-data-framework',
        'support@foodmission.dev'
      )
      .setLicense(
        'MIT',
        'https://opensource.org/licenses/MIT'
      )
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
      .addTag('auth', 'Authentication and authorization endpoints for Keycloak integration')
      .addTag('foods', 'Food item management with OpenFoodFacts integration for nutritional data')
      .addTag('users', 'User profile management and dietary preferences configuration')
      .addTag('health', 'Application health checks, readiness probes, and monitoring metrics')
      .addServer('http://localhost:3000/api/v1', 'Development server')
      .addServer('https://api.foodmission.dev/api/v1', 'Production server')
      .addServer('https://staging-api.foodmission.dev/api/v1', 'Staging server')
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
    console.log('🔗 To import into Postman:');
    console.log('1. Open Postman');
    console.log('2. Click Import > Upload Files');
    console.log(`3. Select: ${outputPath}`);
    console.log('4. Click Import');
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
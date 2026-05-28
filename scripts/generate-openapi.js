#!/usr/bin/env node

/**
 * Script to generate OpenAPI specification file
 * Usage: node scripts/generate-openapi.js
 */

const { NestFactory } = require('@nestjs/core');
const { SwaggerModule } = require('@nestjs/swagger');
const fs = require('fs');
const path = require('path');

async function generateOpenApiSpec() {
  try {
    console.log('🚀 Starting OpenAPI spec generation...');

    // Import the AppModule (using dynamic import for ES modules)
    const { AppModule } = await import('../dist/src/app.module.js');
    const { createSwaggerConfig } = await import(
      '../dist/src/docs/swagger.config.js'
    );

    // Create NestJS application
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    const config = createSwaggerConfig();

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

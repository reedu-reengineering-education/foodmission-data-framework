import './otel-logging.bootstrap';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SecurityService } from './security/security.service';
import { InputSanitizationPipe } from './security/pipes/input-sanitization.pipe';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { LoggingService } from './common/logging/logging.service';
import { createSwaggerConfig, getSwaggerMetadata } from './docs/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // Get security service for configuration
  const securityService = app.get(SecurityService);

  // Validate environment variables
  securityService.validateEnvironmentVariables();

  // Enable CORS with security configuration
  app.enableCors(securityService.getCorsConfiguration());

  // Apply global exception filters for better error formatting
  const loggingService = app.get(LoggingService);
  app.useGlobalFilters(new ValidationExceptionFilter(loggingService));

  // Enable validation pipes globally with input sanitization
  app.useGlobalPipes(
    new InputSanitizationPipe(securityService),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');

  // Configure Swagger/OpenAPI
  const config = createSwaggerConfig({ includeOAuth2: true });
  const { apiVersion, apiRelease } = getSwaggerMetadata();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      displayOperationId: false,
      displayRequestDuration: true,
      oauth2RedirectUrl: '/api/docs/oauth2-redirect.html',
      initOAuth: {
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        realm: process.env.KEYCLOAK_REALM,
        appName: 'FOODMISSION API Documentation',
        scopes: ['openid', 'profile', 'email', 'roles'],
        useBasicAuthenticationWithAccessCodeGrant: false,
      },
    },
    customSiteTitle: `Foodmission API Documentation (v${apiVersion}, ${apiRelease})`,
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { color: #2c3e50 }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0 }
    `,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger documentation available at: ${await app.getUrl()}/api/docs`,
  );
  if (process.env.NODE_ENV === 'development') {
    Logger.log(
      'JWT `sub` must match `User.keycloakId` for seeded dev users — see keycloak/README.md#seeded-users-and-database',
      'Bootstrap',
    );
  }
}
void bootstrap();

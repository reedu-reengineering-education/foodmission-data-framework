import './otel-logging.bootstrap';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SecurityService } from './security/security.service';
import { InputSanitizationPipe } from './security/pipes/input-sanitization.pipe';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { LoggingService } from './common/logging/logging.service';
import {
  OPENAPI_DOCS_PATH,
  OPENAPI_GLOBAL_PREFIX,
  registerOpenApi,
} from './docs';

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

  app.setGlobalPrefix(OPENAPI_GLOBAL_PREFIX);

  registerOpenApi(app);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger documentation available at: ${await app.getUrl()}/${OPENAPI_DOCS_PATH}`,
  );
  if (process.env.NODE_ENV === 'development') {
    Logger.log(
      'JWT `sub` must match `User.keycloakId` for seeded dev users — see keycloak/README.md#seeded-users-and-database',
      'Bootstrap',
    );
  }
}
void bootstrap();

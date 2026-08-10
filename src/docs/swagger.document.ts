import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { SwaggerModule } from '@nestjs/swagger';
import { createSwaggerConfig, getSwaggerMetadata } from './swagger.config';

export const OPENAPI_GLOBAL_PREFIX = 'api/v1';
export const OPENAPI_DOCS_PATH = 'api/docs';

const documentOptions = {
  operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  deepScanRoutes: true as const,
};

export type OpenApiDocument = ReturnType<typeof createOpenApiDocument>;

const ROLES_METADATA_KEY = 'roles';

const HTTP_METHOD_BY_REQUEST_METHOD: Record<RequestMethod, string> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.ALL]: 'get',
  [RequestMethod.OPTIONS]: 'options',
  [RequestMethod.HEAD]: 'head',
  [RequestMethod.SEARCH]: 'get',
  [RequestMethod.MKCOL]: 'post',
  [RequestMethod.COPY]: 'post',
  [RequestMethod.MOVE]: 'post',
  [RequestMethod.PROPFIND]: 'get',
  [RequestMethod.PROPPATCH]: 'patch',
  [RequestMethod.LOCK]: 'post',
  [RequestMethod.UNLOCK]: 'post',
};

function normalizePathFragments(pathMeta: unknown): string[] {
  if (Array.isArray(pathMeta)) {
    return pathMeta.map((p) => String(p ?? ''));
  }
  if (pathMeta === undefined || pathMeta === null) {
    return [''];
  }
  return [String(pathMeta)];
}

function normalizeJoinedPath(...parts: string[]): string {
  const cleaned = parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .map((p) => p.replace(/:([A-Za-z0-9_]+)/g, '{$1}'))
    .filter((p) => p.length > 0);

  if (cleaned.length === 0) {
    return '/';
  }

  return `/${cleaned.join('/')}`;
}

function isAdminOnly(roles: string[] | undefined): boolean {
  if (!roles || roles.length !== 1) {
    return false;
  }
  return roles[0] === 'admin';
}

function hasAdminOnlySummaryLabel(summary: string): boolean {
  return (
    /\badmin[-\s]?only\b/i.test(summary) || /\bonly\s+admin\b/i.test(summary)
  );
}

function appendAdminOnlyLabel(operation: {
  summary?: string;
  description?: string;
}): void {
  if (operation.summary && !hasAdminOnlySummaryLabel(operation.summary)) {
    operation.summary = `${operation.summary} (Admin only)`;
  }

  const note = 'Access: Admin only.';
  if (!operation.description) {
    operation.description = note;
    return;
  }

  if (!operation.description.includes(note)) {
    operation.description = `${operation.description}\n\n${note}`;
  }
}

function annotateAdminOnlyOperations(
  app: INestApplication,
  document: OpenApiDocument,
): void {
  const container = (
    app as unknown as {
      container?: { getModules?: () => Map<unknown, unknown> };
    }
  ).container;
  const modulesMap = container?.getModules?.();
  if (!modulesMap) {
    return;
  }

  for (const moduleRef of modulesMap.values() as Iterable<{
    controllers?: Map<unknown, { instance?: object }>;
  }>) {
    const controllers = moduleRef.controllers;
    if (!controllers) continue;

    for (const wrapper of controllers.values()) {
      const instance = wrapper.instance;
      if (!instance) continue;

      const controllerClass = (instance as { constructor: object }).constructor;
      const controllerPaths = normalizePathFragments(
        Reflect.getMetadata(PATH_METADATA, controllerClass),
      );
      const controllerRoles = Reflect.getMetadata(
        ROLES_METADATA_KEY,
        controllerClass,
      ) as string[] | undefined;

      const prototype = Object.getPrototypeOf(instance) as Record<
        string,
        unknown
      >;
      for (const methodName of Object.getOwnPropertyNames(prototype)) {
        if (methodName === 'constructor') continue;

        const handler = prototype[methodName];
        if (typeof handler !== 'function') continue;

        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        if (requestMethod === undefined) continue;

        const httpMethod = HTTP_METHOD_BY_REQUEST_METHOD[requestMethod];
        if (!httpMethod) continue;

        const methodPaths = normalizePathFragments(
          Reflect.getMetadata(PATH_METADATA, handler),
        );
        const methodRoles = Reflect.getMetadata(ROLES_METADATA_KEY, handler) as
          string[] | undefined;
        const effectiveRoles = methodRoles ?? controllerRoles;
        if (!isAdminOnly(effectiveRoles)) continue;

        for (const ctrlPath of controllerPaths) {
          for (const methodPath of methodPaths) {
            const candidates = [
              normalizeJoinedPath('api/v1', ctrlPath, methodPath),
              normalizeJoinedPath(ctrlPath, methodPath),
            ];

            for (const pathKey of candidates) {
              const pathItem = (
                document.paths as
                  | Record<
                      string,
                      Record<string, { summary?: string; description?: string }>
                    >
                  | undefined
              )?.[pathKey];
              const operation = pathItem?.[httpMethod];
              if (!operation) continue;
              appendAdminOnlyLabel(operation);
              break;
            }
          }
        }
      }
    }
  }
}

export function createOpenApiDocument(app: INestApplication) {
  const config = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config, documentOptions);
  annotateAdminOnlyOperations(app, document);
  return document;
}

function setupOpenApiDocs(
  app: INestApplication,
  document: OpenApiDocument,
): void {
  const { apiRelease } = getSwaggerMetadata();

  SwaggerModule.setup(OPENAPI_DOCS_PATH, app, document, {
    useGlobalPrefix: false,
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
      oauth2RedirectUrl: `/${OPENAPI_DOCS_PATH}/oauth2-redirect.html`,
      initOAuth: {
        clientId: process.env.KEYCLOAK_CLIENT_ID,
        realm: process.env.KEYCLOAK_REALM,
        appName: 'Foodmission API Documentation',
        scopes: ['openid', 'profile', 'email', 'roles'],
        useBasicAuthenticationWithAccessCodeGrant: false,
      },
    },
    customSiteTitle: `Foodmission API Documentation (v${apiRelease})`,
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
}

export function registerOpenApi(app: INestApplication): void {
  const document = createOpenApiDocument(app);
  setupOpenApiDocs(app, document);
}

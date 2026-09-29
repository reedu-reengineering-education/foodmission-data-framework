import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

/**
 * Resolves the whole dependency graph without starting the app: `compile()`
 * instantiates every provider, controller and guard but runs no lifecycle
 * hooks, so no database or Keycloak connection is opened.
 *
 * Controller and e2e specs build their own testing modules and override
 * guards, so a module that forgets an import (e.g. a `@UseGuards` guard whose
 * dependency the module cannot see) only fails at `npm start`. This catches it
 * in CI instead.
 */
describe('AppModule', () => {
  it('resolves all dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});

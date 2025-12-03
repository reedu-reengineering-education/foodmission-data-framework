import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { DataBaseAuthGuard } from '../guards/database-auth.guards';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  createMockAuthGuard,
  createMockThrottlerGuard,
} from './mock-factories';
import { MockService } from './type-helpers';

export interface ControllerTestConfig<TController, TService> {
  ControllerClass: new (...args: any[]) => TController;
  ServiceToken: any;
  mockService: MockService<TService>;
}

export async function createControllerTestModule<TController, TService>(
  config: ControllerTestConfig<TController, TService>,
): Promise<TestingModule> {
  const mockAuthGuard = createMockAuthGuard();
  const mockThrottlerGuard = createMockThrottlerGuard();

  return Test.createTestingModule({
    controllers: [config.ControllerClass],
    providers: [
      {
        provide: config.ServiceToken,
        useValue: config.mockService,
      },
      {
        provide: DataBaseAuthGuard,
        useValue: mockAuthGuard,
      },
      {
        provide: ThrottlerGuard,
        useValue: mockThrottlerGuard,
      },
      Reflector,
    ],
  })
    .overrideGuard(DataBaseAuthGuard)
    .useValue(mockAuthGuard)
    .overrideGuard(ThrottlerGuard)
    .useValue(mockThrottlerGuard)
    .compile();
}

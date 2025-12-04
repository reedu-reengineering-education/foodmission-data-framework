import { Request } from 'express';
import { MockGuard } from './type-helpers';

export function createMockAuthGuard(): MockGuard {
  return {
    canActivate: jest.fn(() => true),
  };
}

export function createMockThrottlerGuard(): MockGuard {
  return {
    canActivate: jest.fn(() => true),
  };
}

export function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    path: '/api/v1/test',
    originalUrl: '/api/v1/test',
    url: '/api/v1/test',
    method: 'GET',
    headers: {},
    query: {},
    params: {},
    body: {},
    get: jest.fn(),
    ...overrides,
  } as Request;
}

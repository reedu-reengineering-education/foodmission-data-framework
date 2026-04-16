import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { extractCurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  let mockContext: Partial<ExecutionContext>;
  let getRequest: jest.Mock;

  beforeEach(() => {
    getRequest = jest.fn();
    mockContext = {
      switchToHttp: () => ({ getRequest }),
    } as any;
  });

  it('should return the user object if present', () => {
    const user = { id: '123', keycloakId: 'kc-1', email: 'test@example.com' };
    getRequest.mockReturnValue({ user });
    const result = extractCurrentUser(
      undefined,
      mockContext as ExecutionContext,
    );
    expect(result).toBe(user);
  });

  it('should return a specific user property if data is provided', () => {
    const user = { id: '123', keycloakId: 'kc-1', email: 'test@example.com' };
    getRequest.mockReturnValue({ user });
    const result = extractCurrentUser('id', mockContext as ExecutionContext);
    expect(result).toBe('123');
  });

  it('should throw UnauthorizedException if user is missing', () => {
    getRequest.mockReturnValue({});
    expect(() =>
      extractCurrentUser(undefined, mockContext as ExecutionContext),
    ).toThrow(UnauthorizedException);
  });
});

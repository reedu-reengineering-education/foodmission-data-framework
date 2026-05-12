import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';
import { AdminResetPasswordDto } from './dto/reset-password.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            triggerPasswordReset: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should confirm admin access', () => {
    expect(controller.adminEndpoint()).toEqual({
      message: 'Admin access granted',
      status: 'success',
    });
  });

  it('should trigger admin password reset', async () => {
    const user = {
      sub: 'admin-id',
      email: 'admin@example.com',
      resource_access: { 'foodmission-api': { roles: ['admin'] } },
    };
    const dto: AdminResetPasswordDto = { email: 'target@example.com' };
    await controller.adminResetPassword(user, dto);
    expect(authService.triggerPasswordReset).toHaveBeenCalledWith(
      user.sub,
      dto.email,
      ['admin'],
    );
  });
});

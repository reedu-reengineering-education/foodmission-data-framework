import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ShoppingListItemsController } from './shopping-list-items.controller';
import { ShoppingListItemService } from '../services/shopping-list-items.service';

describe('ShoppingListItemsController', () => {
  let controller: ShoppingListItemsController;
  let service: jest.Mocked<ShoppingListItemService>;

  const shoppingListId = '98e6c344-5fbe-400c-a682-ecca1e5fbfe4';
  const itemId = 'e4e562a0-5e11-4f7f-b951-7fce2d2686d1';

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ShoppingListItemService>> = {
      findById: jest.fn(),
      findByShoppingList: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      clearCheckedItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShoppingListItemsController],
      providers: [{ provide: ShoppingListItemService, useValue: mockService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ShoppingListItemsController);
    service = module.get(ShoppingListItemService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes checked attribute through patch update', async () => {
    service.update.mockResolvedValue({ checked: true } as any);

    await controller.update(
      shoppingListId,
      itemId,
      { checked: true } as any,
      'user-1',
    );

    expect(service.update).toHaveBeenCalledWith(
      itemId,
      { checked: true },
      'user-1',
      shoppingListId,
    );
  });

  it('has no toggle endpoint in controller api', () => {
    expect(
      (controller as unknown as { toggleChecked?: unknown }).toggleChecked,
    ).toBeUndefined();
  });
});

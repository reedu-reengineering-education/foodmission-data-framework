import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShoppingListService } from './shoppingList.service';
import { ShoppingListRepository } from '../repositories/shoppingList.repository';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';


describe('ShoppingListService', () => {
  let service: ShoppingListService;
  let shoppingListRepository: jest.Mocked<ShoppingListRepository>;
 

  const mockShoppingList = {
    id: 'list-1',
    title: 'Test shoppingList',
   
  };


  });

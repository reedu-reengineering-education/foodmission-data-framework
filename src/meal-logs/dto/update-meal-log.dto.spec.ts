import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TypeOfMeal } from '@prisma/client';
import { UpdateMealLogDto } from './update-meal-log.dto';
import { EventType } from '../../events/event-types';

describe('UpdateMealLogDto', () => {
  const validate_ = (payload: Record<string, unknown>) =>
    validate(plainToInstance(UpdateMealLogDto, payload));

  it('accepts an omitted field', async () => {
    expect(await validate_({ typeOfMeal: TypeOfMeal.BREAKFAST })).toHaveLength(
      0,
    );
  });

  it.each([
    ['mealId', 'isUuid'],
    ['timestamp', 'isDateString'],
    ['mealFromPantry', 'isBoolean'],
    ['eatenOut', 'isBoolean'],
  ])(
    'rejects an explicit null for %s rather than passing it to Prisma',
    async (property, constraint) => {
      const errors = await validate_({ [property]: null });

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(property);
      expect(errors[0].constraints).toHaveProperty(constraint);
    },
  );

  // Whether they may change (drafts only) is checked by the service.
  it('accepts flags and swaps', async () => {
    expect(
      await validate_({
        flags: [EventType.MEAL_VEGAN],
        swaps: [EventType.SWAP_BEEF_TO_LEGUMES],
      }),
    ).toHaveLength(0);
  });

  it('rejects an unknown flag', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    await expect(
      pipe.transform(
        { flags: ['NOT_A_FLAG'] },
        { type: 'body', metatype: UpdateMealLogDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

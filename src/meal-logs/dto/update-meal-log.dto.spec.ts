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

  it('rejects flags and swaps, so an edit cannot diverge from the event ledger', async () => {
    // Matches the global pipe in main.ts, which is what strips/refuses
    // properties the DTO does not declare.
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    await expect(
      pipe.transform(
        {
          flags: [EventType.MEAL_VEGAN],
          swaps: [EventType.SWAP_BEEF_TO_LEGUMES],
        },
        { type: 'body', metatype: UpdateMealLogDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

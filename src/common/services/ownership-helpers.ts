import { NotFoundException } from '@nestjs/common';

type Finder<T> = (id: string) => Promise<T | null>;
type OwnershipGetter<T> = (entity: T) => string;

export async function getOwnedEntityOrThrow<T>(
  id: string,
  userId: string,
  findById: Finder<T>,
  getOwnerId: OwnershipGetter<T>,
  notFoundMessage: string,
): Promise<T> {
  const entity = await findById(id);
  if (!entity) {
    throw new NotFoundException(notFoundMessage);
  }
  if (getOwnerId(entity) !== userId) {
    throw new NotFoundException(notFoundMessage);
  }
  return entity;
}

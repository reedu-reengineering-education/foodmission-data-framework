import { ForbiddenException, NotFoundException } from '@nestjs/common';

type Finder<T> = (id: string) => Promise<T | null>;
type OwnershipGetter<T> = (entity: T) => string | null;

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
  const ownerId = getOwnerId(entity);
  // If entity has no owner (null), it cannot be modified by users
  if (ownerId === null || ownerId !== userId) {
    throw new ForbiddenException('No permission to access this resource');
  }
  return entity;
}

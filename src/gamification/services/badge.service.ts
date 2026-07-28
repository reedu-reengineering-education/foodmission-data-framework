import { Injectable } from '@nestjs/common';

/**
 * Stub until Badge catalog exists.
 * Always returns an empty list so profile assembly stays behind one seam.
 */
@Injectable()
export class BadgeService {
  listForUser(_userId: string): Promise<string[]> {
    void _userId;
    return Promise.resolve([]);
  }
}

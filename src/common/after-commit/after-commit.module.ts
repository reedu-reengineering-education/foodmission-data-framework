import { Module } from '@nestjs/common';
import { AfterCommitQueue } from './after-commit.queue';

/**
 * Deliberately imports nothing, so any module can depend on it without risking
 * a cycle. Kept out of CommonModule (which pulls in UsersModule) for the same
 * reason.
 */
@Module({
  providers: [AfterCommitQueue],
  exports: [AfterCommitQueue],
})
export class AfterCommitModule {}

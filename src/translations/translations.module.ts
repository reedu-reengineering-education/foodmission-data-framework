import { Global, Module } from '@nestjs/common';
import { TranslationService } from './services/translation.service';

@Global()
@Module({
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationsModule {}

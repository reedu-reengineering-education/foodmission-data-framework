import { IntersectionType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { LearningLangQueryDto } from './learning-lang-query.dto';

export class PaginatedLangQueryDto extends IntersectionType(
  PaginationQueryDto,
  LearningLangQueryDto,
) {}

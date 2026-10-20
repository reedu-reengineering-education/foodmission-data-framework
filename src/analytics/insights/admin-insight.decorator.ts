import { applyDecorators, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { InsightDefinition } from '../shared/insight';
import { DEFAULT_WEEKS, MAX_WEEKS } from '../shared/insight-query.dto';

/** Admin-only, never @Public(). */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(DataBaseAuthGuard),
    ApiBearerAuth('JWT-auth'),
    Roles('admin'),
  );

/** GET route for one insight, with its documented semantics in Swagger. */
export function AdminInsight(definition: InsightDefinition) {
  const decorators = [
    Get(definition.id),
    AdminOnly(),
    ApiOperation({
      summary: `${definition.title} (admin only)`,
      description: definition.description,
    }),
    ApiResponse({
      status: 200,
      description:
        '{ meta, rows: [{ group, values }] }; split rows with fewer than minGroupSize users are dropped and counted in meta.suppressedGroups.',
    }),
  ];
  if (definition.by) {
    decorators.push(
      ApiQuery({ name: 'by', required: false, enum: [...definition.by] }),
    );
  }
  if (definition.timeSeries) {
    decorators.push(
      ApiQuery({
        name: 'weeks',
        required: false,
        type: Number,
        example: DEFAULT_WEEKS,
        description: `1–${MAX_WEEKS}`,
      }),
    );
  }
  return applyDecorators(...decorators);
}

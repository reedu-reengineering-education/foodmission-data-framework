import { ParseEnumPipe, Query } from '@nestjs/common';
import {
  DemographicDimension,
  DemographicDimensionEnum,
} from '../analytics-utils';

export const DimQuery = (name: 'dim1' | 'dim2' | 'dimension') =>
  Query(
    name,
    new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
  ) as ParameterDecorator;

export type DimQueryValue = DemographicDimension;

import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'

import { V2BreakdownDto, V2SummaryDto, V2TimeseriesDto } from './v2-base.dto'

const MEASURE_VALUES = ['median', 'average', 'p75', 'p95', 'quantiles']

const MeasureApiProperty = () =>
  ApiProperty({
    required: false,
    enum: MEASURE_VALUES,
    default: 'median',
    description:
      "Aggregate function applied to performance timings. 'quantiles' is only meaningful on the timeseries endpoint (returns p50/p75/p95 of the total load time); other endpoints treat it as 'median'.",
  })

export class V2PerfTimeseriesDto extends V2TimeseriesDto {
  @MeasureApiProperty()
  @IsOptional()
  @IsIn(MEASURE_VALUES, { message: 'The provided measure is incorrect' })
  measure?: string
}

export class V2PerfSummaryDto extends V2SummaryDto {
  @MeasureApiProperty()
  @IsOptional()
  @IsIn(MEASURE_VALUES, { message: 'The provided measure is incorrect' })
  measure?: string
}

export class V2PerfBreakdownDto extends V2BreakdownDto {
  @MeasureApiProperty()
  @IsOptional()
  @IsIn(MEASURE_VALUES, { message: 'The provided measure is incorrect' })
  measure?: string
}

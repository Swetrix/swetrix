import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator'
import { BadRequestException } from '@nestjs/common'

export class SaveDataExportDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/)
  gcpProjectId: string

  @IsString()
  @Matches(/^[A-Za-z0-9_]{1,1024}$/)
  datasetId: string

  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9-]{1,39}$/)
  location: string

  @IsString()
  @Matches(/^[A-Za-z_][A-Za-z0-9_]{0,100}$/)
  tablePrefix: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  credentials?: string

  @IsBoolean()
  enabled: boolean
}

export class ExportEventsDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string

  @IsIn(['pageviews', 'custom_events'])
  type: 'pageviews' | 'custom_events'
}

export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10)

export const shiftDay = (day: string, offset: number) =>
  utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86_400_000))

export const validateExportDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    utcDay(parsed) !== date ||
    date < '2000-01-01' ||
    date >= utcDay()
  ) {
    throw new BadRequestException(
      'Choose a valid completed UTC date on or after 2000-01-01.',
    )
  }
}

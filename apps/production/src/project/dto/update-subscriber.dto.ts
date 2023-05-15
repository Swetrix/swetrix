import { PickType } from '@nestjs/swagger'
import { Matches, IsUUID } from 'class-validator'
import { AddSubscriberBodyDto } from './add-subscriber.dto'

export class UpdateSubscriberParamsDto {
  @Matches(/^(?!.*--)[a-zA-Z0-9-]{12}$/)
  readonly projectId: string

  @IsUUID('4')
  readonly subscriberId: string
}

export class UpdateSubscriberBodyDto extends PickType(AddSubscriberBodyDto, [
  'reportFrequency',
] as const) {}

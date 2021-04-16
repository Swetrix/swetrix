import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class EventsDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID'
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: 'user-subscribed',
    description: 'Event type'
  })
  ev: string

  // Tracking metrics
  @ApiProperty({
    example: {
      ref: 'duckduckgo',
      plan: 'gold+',
    },
    description: 'Custom parameters related to the event'
  })
  params: object
}
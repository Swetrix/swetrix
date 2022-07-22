import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty } from 'class-validator'

export class EventsDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: 'user-subscribed',
    description: 'Event name',
    maxLength: 64,
  })
  @IsNotEmpty()
  ev: string

  @ApiProperty({
    description:
      'If true, only 1 event with the same ID will be saved per user session',
  })
  unique: object
}

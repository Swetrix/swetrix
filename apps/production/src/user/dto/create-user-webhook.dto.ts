import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class CreateUserWebhookDto {
  // TODO validation
  @ApiProperty({ example: 'Name of the webhook' })
  @IsString()
  name: string

  @ApiProperty({ example: 'Url of the webhook' })
  @IsString()
  url: string
}

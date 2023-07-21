import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class CreateCommentQueryDto {
  @ApiProperty()
  @IsUUID()
  userId: string
}

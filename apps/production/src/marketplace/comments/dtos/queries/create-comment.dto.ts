import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class CreateCommentQueryDto {
  @ApiProperty()
  @IsString()
  userId: string
}

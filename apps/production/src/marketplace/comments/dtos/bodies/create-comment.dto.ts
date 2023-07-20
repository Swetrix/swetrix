import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateCommentBodyDto {
  @ApiProperty()
  @IsUUID()
  extensionId: string

  @ApiProperty()
  @IsString()
  text: string | null

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number | null
}

export class ReplyCommentBodyDto {
  @ApiProperty()
  @IsString()
  reply: string | null
}

import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsString, Max, Min } from 'class-validator'

export class CreateCommentBodyDto {
  @ApiProperty()
  @IsNumber()
  extensionId: number

  @ApiProperty()
  @IsString()
  text: string | null

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number | null
}

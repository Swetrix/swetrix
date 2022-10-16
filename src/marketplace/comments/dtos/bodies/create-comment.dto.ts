import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateCommentBodyDto {
  @ApiProperty()
  @IsNumber()
  extensionId: number

  @ApiProperty()
  @IsString()
  @IsOptional()
  text: string | null

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating: number | null
}

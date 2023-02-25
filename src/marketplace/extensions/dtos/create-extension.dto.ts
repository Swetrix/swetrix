import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator'

export class CreateExtensionBodyDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  readonly name: string

  @IsOptional()
  @IsString()
  @Length(1, 1024)
  readonly description?: string

  @IsOptional()
  @IsNumberString()
  readonly price?: string
}

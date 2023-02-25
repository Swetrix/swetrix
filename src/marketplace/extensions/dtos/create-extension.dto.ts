import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator'
import { HasMimeType, IsFile, IsFiles, MaxFileSize } from 'nestjs-form-data'

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

  @IsOptional()
  @IsFile()
  @MaxFileSize(10 * 1024 * 1024)
  @HasMimeType(['image/jpeg', 'image/png'])
  readonly mainImage?: Express.Multer.File

  @IsOptional()
  @IsFiles()
  @MaxFileSize(10 * 1024 * 1024, { each: true })
  @HasMimeType(['image/jpeg', 'image/png'], { each: true })
  readonly additionalImages?: Express.Multer.File[]

  @IsOptional()
  @IsFile()
  @MaxFileSize(10 * 1024 * 1024)
  @HasMimeType(['text/javascript', 'application/javascript'])
  readonly extensionScript?: Express.Multer.File
}

import { IntersectionType, PartialType } from '@nestjs/mapped-types'
import { IsUUID } from 'class-validator'
import {
  CreateExtensionBodyDto,
  AdditionalExtensionInfo,
} from './create-extension.dto'

export class UpdateExtensionParamsDto {
  @IsUUID()
  readonly extensionId: string
}

export class UpdateExtensionBodyDto extends IntersectionType(
  PartialType(CreateExtensionBodyDto),
  PartialType(AdditionalExtensionInfo),
) {}

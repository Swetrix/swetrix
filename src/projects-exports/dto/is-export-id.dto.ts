import { IsUUID } from 'class-validator'

export class IsExportIdDto {
  @IsUUID('4', { message: 'Invalid export ID.' })
  exportId: string
}

import { ApiProperty } from '@nestjs/swagger'

export class UpgradeUserProfileDTO {
  @ApiProperty({ required: true })
  planCode: string
}

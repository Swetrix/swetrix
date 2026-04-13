import { IsNumberString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class StartGa4ImportDto {
  @ApiProperty({
    description:
      'GA4 property ID (numeric ID, not the "properties/" prefixed form)',
    example: '123456789',
  })
  @IsNumberString()
  propertyId: string
}

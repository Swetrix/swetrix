import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, Length } from 'class-validator'

export class ProxyDomainCreateDTO {
  @ApiProperty({
    example: 't.example.com',
    required: true,
    description:
      'Subdomain you control that will reverse-proxy Swetrix. Avoid words ad blockers target (analytics, tracking, ...).',
  })
  @IsNotEmpty()
  @Length(3, 253)
  hostname: string
}

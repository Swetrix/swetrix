import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class OIDCInitiateDto {
  @ApiProperty({
    description: 'Redirect URL after successful authentication',
  })
  @IsString()
  redirectUrl: string

  @ApiProperty({
    description:
      "Provider name (not used, but it's here for compatibility with the Cloud Version. On Community Edition it's always set to openid-connect)",
    required: false,
  })
  @IsString()
  @IsOptional()
  provider?: string
}

export class OIDCProcessTokenDto {
  @ApiProperty({ description: 'Code from the OIDC callback' })
  @IsString()
  code: string

  @ApiProperty({
    description: 'State from the OIDC callback (to get JWT tokens)',
  })
  @IsString()
  hash: string
}

export class OIDCGetJWTByHashDto {
  @ApiProperty({
    description: 'OIDC session identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  hash: string
}

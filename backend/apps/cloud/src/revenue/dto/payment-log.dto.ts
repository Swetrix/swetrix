import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator'

export class GetProfileIdDto {
  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsString()
  pid: string
}

export class GetSessionIdDto {
  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsString()
  pid: string
}

export class LogPaymentDto {
  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsString()
  pid: string

  @ApiPropertyOptional({ description: 'Profile ID for attribution' })
  @IsOptional()
  @IsString()
  profileId?: string

  @ApiPropertyOptional({ description: 'Session ID for attribution' })
  @IsOptional()
  @IsString()
  sessionId?: string

  @ApiPropertyOptional({ description: 'Transaction ID' })
  @IsOptional()
  @IsString()
  transactionId?: string

  @ApiPropertyOptional({ description: 'Payment amount' })
  @IsOptional()
  @IsNumber()
  amount?: number

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, string | number | boolean>
}

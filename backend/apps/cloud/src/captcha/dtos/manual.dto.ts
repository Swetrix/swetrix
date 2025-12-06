import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsNumber } from 'class-validator'

export class VerifyDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'A unique project ID',
  })
  @IsNotEmpty()
  @IsString()
  pid: string

  @ApiProperty({
    required: true,
    description: 'The challenge string received from /generate',
  })
  @IsNotEmpty()
  @IsString()
  challenge: string

  @ApiProperty({
    required: true,
    description: 'The nonce that solves the PoW challenge',
  })
  @IsNotEmpty()
  @IsNumber()
  nonce: number

  @ApiProperty({
    required: true,
    description: 'The resulting hash (SHA-256 of challenge + nonce)',
  })
  @IsNotEmpty()
  @IsString()
  solution: string
}

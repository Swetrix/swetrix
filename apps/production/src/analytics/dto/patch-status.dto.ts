import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsIn } from 'class-validator'

export class PatchStatusDTO {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  pid: string

  @ApiProperty({
    example: 'c138c2b1826d9fec65d230e471ab2c25',
    description: 'Error id',
  })
  eid: string

  @ApiProperty({
    example: [
      'c138c2b1826d9fec65d230e471ab2c25',
      'b2d12867d59d1d4f9986b52311a97cd5',
    ],
    description: 'Error id list',
  })
  eids: string

  @ApiProperty({
    enum: ['resolved', 'active'],
    required: true,
  })
  @IsIn(['resolved', 'active'])
  status: 'resolved' | 'active'
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { Role } from '../entity/project-share.entity';

export class ShareUpdateDTO {
  @ApiProperty({
    example: 'viewer',
    required: true,
    description: 'Users role in your project',
  })
  @IsNotEmpty()
  role: Role;
}

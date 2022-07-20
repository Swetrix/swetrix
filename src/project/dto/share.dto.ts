import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { Role } from '../entity/project-share.entity';

export class ShareDTO {
  @ApiProperty({
    example: 'user@example.com',
    required: true,
    description: 'User you want to invite to your project',
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'viewer',
    required: true,
    description: 'Users role in your project',
  })
  @IsNotEmpty()
  role: Role;
}

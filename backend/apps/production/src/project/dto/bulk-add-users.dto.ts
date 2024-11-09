import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'

import { Role } from '../entity/project-share.entity'

class UserProjectAccess {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User you want to invite to your project',
  })
  @IsNotEmpty()
  email: string

  @ApiProperty({
    example: 'viewer',
    description: 'Users role in your project',
  })
  @IsNotEmpty()
  role: Role

  @ApiProperty({
    example: ['project-id-1', 'project-id-2'],
    description: 'Array of project IDs to add the user to',
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  projectIds: string[]
}

export class BulkAddUsersDto {
  @ApiProperty({
    type: [UserProjectAccess],
    description: 'Array of users and their project access details',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserProjectAccess)
  @ArrayMinSize(1)
  users: UserProjectAccess[]
}

import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'

@Entity()
export class Project {
  @ApiProperty()
  @PrimaryColumn('varchar', { unique: true })
  id: string

  @ApiProperty()
  @Column('varchar', { length: 80 })
  name: string

  @ApiProperty()
  @Column('varchar', {
    length: 500, 
    nullable: true,
  })
  origins: string

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, user => user.projects)
  admin: User
}
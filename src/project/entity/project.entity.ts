import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'

@Entity()
export class Project {
  @ApiProperty()
  @PrimaryColumn('varchar', {
    unique: true,
    length: 12,
  })
  id: string

  @ApiProperty()
  @Column('varchar', { length: 50 })
  name: string

  @ApiProperty()
  @Column('varchar', {
    length: 500, 
    nullable: true,
  })
  origins: string

  @ApiProperty()
  @Column({
    default: true,
  })
  active: boolean

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, user => user.projects)
  admin: User

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date
}
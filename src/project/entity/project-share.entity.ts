import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'
import { Project } from './project.entity'

@Entity()
export class ProjectShare {
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, user => user.sharedProjects)
  user: User

  @ManyToOne(() => Project, project => project.share)
  project: Project

  @ApiProperty()
  @Column({
    default: false,
  })
  confirmed: boolean

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date
}

import {
  Entity,
  Column,
  ManyToOne,
  BeforeUpdate,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'
import { Project } from './project.entity'

export const roles = ['admin', 'viewer']

export enum Role {
  viewer = 'viewer',
  admin = 'admin',
}

@Entity()
export class ProjectShare {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /**
   * User whom with the project was shared
   */
  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, user => user.sharedProjects)
  user: User

  /**
   * Project in question
   */
  @ManyToOne(() => Project, project => project.share)
  project: Project

  /**
   * Boolean indicating whether the user accepted project invitation
   */
  @ApiProperty()
  @Column({
    default: false,
  })
  confirmed: boolean

  /**
   * User's role in the project
   */
  @Column({
    type: 'enum',
    enum: Role,
  })
  role: Role

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date

  @BeforeUpdate()
  updateTimestamp() {
    this.updated = new Date()
  }
}

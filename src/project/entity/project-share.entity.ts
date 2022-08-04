import { Entity, Column, ManyToOne, BeforeUpdate, PrimaryGeneratedColumn, JoinColumn } from 'typeorm'
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

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, user => user.sharedProjects, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User

  @ManyToOne(() => Project, project => project.share, { onDelete: 'CASCADE' })
  @JoinColumn()
  project: Project

  @ApiProperty()
  @Column({
    default: false,
  })
  confirmed: boolean

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
    this.updated = new Date
  }

  @Column('varchar')
  userId: string

  @Column('project')
  projectId: string
}

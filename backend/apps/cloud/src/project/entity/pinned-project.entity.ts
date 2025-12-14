import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'
import { Project } from './project.entity'

@Entity()
@Unique(['user', 'project'])
export class PinnedProject {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date
}

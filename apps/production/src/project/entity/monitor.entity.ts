import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { Project } from './project.entity'

@Entity('monitor')
export class MonitorEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number

  @ApiProperty()
  @Column({ type: 'varchar' })
  type: string

  @ApiProperty()
  @Column({ type: 'varchar' })
  name: string

  @ApiProperty()
  @Column({ type: 'varchar' })
  url: string

  @ApiProperty()
  @Column({ type: 'int' })
  interval: number

  @ApiProperty()
  @Column({ type: 'int' })
  retries: number

  @ApiProperty()
  @Column({ type: 'int' })
  retryInterval: number

  @ApiProperty()
  @Column({ type: 'int' })
  timeout: number

  @ApiProperty()
  @Column({ type: 'json' })
  acceptedStatusCodes: number[]

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  description: string | null

  @ManyToOne(() => Project, project => project.monitors, {
    onDelete: 'CASCADE',
  })
  project: Project

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date

  @ApiProperty()
  @Column({ type: 'json', nullable: true })
  httpOptions: {
    method: string[]
    body?: Record<string, unknown>
    headers?: Record<string, string>
  }
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { MonitorGroupEntity } from './monitor-group.entity'

@Entity('monitor')
export class MonitorEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar' })
  type: string

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar' })
  url: string

  @Column({ type: 'int' })
  interval: number

  @Column({ type: 'int' })
  retries: number

  @Column({ type: 'int' })
  retryInterval: number

  @Column({ type: 'int' })
  timeout: number

  @Column({ type: 'json' })
  acceptedStatusCodes: number[]

  @Column({ type: 'text', nullable: true })
  description: string | null

  @ManyToOne(() => MonitorGroupEntity, group => group.monitors, {
    onDelete: 'CASCADE',
  })
  group: MonitorGroupEntity

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

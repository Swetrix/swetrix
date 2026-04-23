import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { Project } from '../../project/entity/project.entity'
import { NotificationChannel } from '../../notification-channel/entity/notification-channel.entity'
import { QueryCondition, QueryMetric, QueryTime } from '../dto/alert.dto'

@Entity()
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Project, (project) => project.alerts)
  project: Project

  @ApiProperty()
  @Column('varchar', { length: 50 })
  name: string

  @ApiProperty()
  @Column({
    type: 'boolean',
    default: true,
  })
  active: boolean

  @Column({
    type: 'boolean',
    default: true,
    name: 'alert_on_new_errors_only',
  })
  alertOnNewErrorsOnly: boolean

  @Column({
    type: 'boolean',
    default: false,
    name: 'alert_on_every_custom_event',
  })
  alertOnEveryCustomEvent: boolean

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @ApiProperty()
  @Column({
    type: 'datetime',
    nullable: true,
    default: null,
  })
  lastTriggered: Date | null

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: QueryMetric,
    nullable: true,
    default: null,
  })
  queryMetric: QueryMetric

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: QueryCondition,
    nullable: true,
    default: null,
  })
  queryCondition: QueryCondition

  @ApiProperty()
  @Column({
    type: 'int',
    nullable: true,
    default: null,
  })
  queryValue: number

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: QueryTime,
    nullable: true,
    default: null,
  })
  queryTime: QueryTime

  @ApiProperty()
  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
  })
  queryCustomEvent: string

  @ApiProperty()
  @Column('text', { nullable: true, default: null })
  messageTemplate: string | null

  @ApiProperty()
  @Column('varchar', { length: 255, nullable: true, default: null })
  emailSubjectTemplate: string | null

  @ManyToMany(() => NotificationChannel, (channel) => channel.alerts)
  @JoinTable({
    name: 'alert_channels',
    joinColumn: { name: 'alertId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'channelId', referencedColumnName: 'id' },
  })
  channels: NotificationChannel[]
}

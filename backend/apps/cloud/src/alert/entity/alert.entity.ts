import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { Project } from '../../project/entity/project.entity'
import { QueryCondition, QueryMetric, QueryTime } from '../dto/alert.dto'

@Entity()
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Project, project => project.alerts)
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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @ApiProperty()
  @Column({
    type: 'date',
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
}

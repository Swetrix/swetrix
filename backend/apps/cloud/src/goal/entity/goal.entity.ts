import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { Project } from '../../project/entity/project.entity'

export enum GoalType {
  PAGEVIEW = 'pageview',
  CUSTOM_EVENT = 'custom_event',
}

export enum GoalMatchType {
  EXACT = 'exact',
  CONTAINS = 'contains',
}

export interface MetadataFilter {
  key: string
  value: string
}

export type GoalConditionRelation = 'AND' | 'OR'
export type GoalConditionEventType = 'any' | GoalType
export type GoalConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'

export interface GoalCondition {
  id?: string
  eventType: GoalConditionEventType
  field: string
  operator: GoalConditionOperator
  value?: string
  metadataKey?: string
}

export interface GoalConditions {
  relation: GoalConditionRelation
  conditions: GoalCondition[]
}

@Entity()
export class Goal {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar', { length: 100 })
  name: string

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: GoalType,
  })
  type: GoalType

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: GoalMatchType,
    default: GoalMatchType.EXACT,
  })
  matchType: GoalMatchType

  @ApiProperty()
  @Column('varchar', { length: 500, nullable: true })
  value: string | null

  @ApiProperty()
  @Column('json', { nullable: true })
  metadataFilters: MetadataFilter[] | null

  @ApiProperty()
  @Column('json', { nullable: true })
  conditions: GoalConditions | null

  @ApiProperty()
  @Column({
    type: 'boolean',
    default: true,
  })
  active: boolean

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, (project) => project.goals)
  @JoinColumn()
  project: Project

  @ApiProperty()
  @CreateDateColumn()
  created: Date
}

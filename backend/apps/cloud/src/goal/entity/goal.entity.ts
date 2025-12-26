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
  @Column({
    type: 'boolean',
    default: true,
  })
  active: boolean

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, project => project.goals)
  @JoinColumn()
  project: Project

  @ApiProperty()
  @CreateDateColumn()
  created: Date
}

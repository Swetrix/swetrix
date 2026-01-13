import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { Project } from '../../project/entity/project.entity'
import { FeatureFlagType, TargetingRule } from '../evaluation'

// Re-export types for backward compatibility
export { FeatureFlagType, TargetingRule }

@Entity()
@Unique(['project', 'key'])
export class FeatureFlag {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar', { length: 100 })
  key: string

  @ApiProperty()
  @Column('varchar', { length: 500, nullable: true })
  description: string | null

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: FeatureFlagType,
    default: FeatureFlagType.BOOLEAN,
  })
  flagType: FeatureFlagType

  @ApiProperty()
  @Column('tinyint', { unsigned: true, default: 100 })
  rolloutPercentage: number

  @ApiProperty()
  @Column('json', { nullable: true })
  targetingRules: TargetingRule[] | null

  @ApiProperty()
  @Column({
    type: 'boolean',
    default: true,
  })
  enabled: boolean

  @ApiProperty({ type: () => Project })
  @ManyToOne(() => Project, (project) => project.featureFlags)
  @JoinColumn()
  project: Project

  @ApiProperty()
  @Column('varchar', { length: 36, nullable: true })
  experimentId: string | null

  @ApiProperty()
  @CreateDateColumn()
  created: Date
}

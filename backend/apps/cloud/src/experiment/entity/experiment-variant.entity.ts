import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { Experiment } from './experiment.entity'

@Entity()
export class ExperimentVariant {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar', { length: 100 })
  name: string

  @ApiProperty()
  @Column('varchar', { length: 100 })
  key: string

  @ApiProperty()
  @Column('varchar', { length: 300, nullable: true })
  description: string | null

  @ApiProperty()
  @Column('tinyint', { unsigned: true, default: 50 })
  rolloutPercentage: number

  @ApiProperty()
  @Column('boolean', { default: false })
  isControl: boolean

  @ApiProperty({ type: () => Experiment })
  @ManyToOne(() => Experiment, experiment => experiment.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  experiment: Experiment
}

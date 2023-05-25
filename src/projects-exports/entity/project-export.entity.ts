import { ApiProperty } from '@nestjs/swagger'
import { Project } from 'src/project/entity/project.entity'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'

@Entity()
export class ProjectExport {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar', { length: 12 })
  projectId: string

  @ApiProperty({ nullable: true })
  @Column('varchar', { nullable: true, default: null })
  url: string | null

  @ApiProperty({ format: 'date' })
  @Column('date')
  startDate: Date

  @ApiProperty({ format: 'date' })
  @Column('date')
  endDate: Date

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Project, project => project.exports)
  @JoinColumn()
  project: Project
}

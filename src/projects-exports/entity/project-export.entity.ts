import { ApiProperty } from '@nestjs/swagger'
import { Project } from 'src/project/entity/project.entity'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
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

  @ManyToOne(() => Project, project => project.exports)
  @JoinColumn()
  project: Project
}

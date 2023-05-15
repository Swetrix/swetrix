import { ApiProperty } from '@nestjs/swagger'
import { Project } from 'src/project/entity/project.entity'
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'

@Entity()
export class ProjectExport {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty({ nullable: true })
  @Column('varchar', { nullable: true, default: null })
  url: string | null

  @ApiProperty()
  @ManyToOne(() => Project, project => project.exports)
  project: Project
}

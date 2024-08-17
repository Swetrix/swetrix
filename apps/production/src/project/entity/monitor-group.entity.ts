import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm'
import { Project } from './project.entity'
import { MonitorEntity } from './monitor.entity'

@Entity('monitor_groups')
export class MonitorGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @ManyToOne(() => Project, project => project.monitorsGroups, {
    onDelete: 'CASCADE',
  })
  project: Project

  @OneToMany(() => MonitorEntity, monitor => monitor.id)
  monitors: MonitorEntity[]
}

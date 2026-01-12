import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  BeforeUpdate,
} from 'typeorm'

import { Project } from '../../project/entity/project.entity'
import { OrganisationMember } from './organisation-member.entity'

@Entity()
export class Organisation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 50 })
  name: string

  @OneToMany(() => OrganisationMember, (member) => member.organisation)
  members: OrganisationMember[]

  @OneToMany(() => Project, (project) => project.organisation)
  projects: Project[]

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date

  @BeforeUpdate()
  updateTimestamp() {
    this.updated = new Date()
  }
}

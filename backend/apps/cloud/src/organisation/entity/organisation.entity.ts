import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  BeforeUpdate,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'
import { Project } from '../../project/entity/project.entity'
import { OrganisationMember } from './organisation-member.entity'

@Entity()
export class Organisation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 50 })
  name: string

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, user => user.ownedOrganisations)
  owner: User

  @OneToMany(() => OrganisationMember, member => member.organisation)
  members: OrganisationMember[]

  @OneToMany(() => Project, project => project.organisation)
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

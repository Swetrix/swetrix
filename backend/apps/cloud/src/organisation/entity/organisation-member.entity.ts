import {
  Entity,
  Column,
  ManyToOne,
  BeforeUpdate,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'
import { Organisation } from './organisation.entity'

export enum OrganisationRole {
  owner = 'owner',
  admin = 'admin',
  viewer = 'viewer',
}

@Entity()
export class OrganisationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.organisationMemberships)
  user: User

  @ManyToOne(() => Organisation, (org) => org.members)
  organisation: Organisation

  @Column({
    type: 'enum',
    enum: OrganisationRole,
  })
  role: OrganisationRole

  @Column({
    default: false,
  })
  confirmed: boolean

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date

  @BeforeUpdate()
  updateTimestamp() {
    this.updated = new Date()
  }
}

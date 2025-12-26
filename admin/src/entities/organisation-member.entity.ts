import "reflect-metadata";
import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from './user.entity.js'
import { Organisation } from './organisation.entity.js'

export enum OrganisationRole {
  owner = 'owner',
  admin = 'admin',
  viewer = 'viewer',
}

@Entity()
export class OrganisationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, user => user.organisationMemberships)
  user: User

  @ManyToOne(() => Organisation, org => org.members)
  organisation: Organisation

  @Column({
    type: 'enum',
    enum: OrganisationRole,
  })
  role: OrganisationRole

  @Column({
    type: "boolean",
    default: false,
  })
  confirmed: boolean

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date
}

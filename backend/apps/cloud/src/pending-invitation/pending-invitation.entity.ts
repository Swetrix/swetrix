import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm'

export enum PendingInvitationType {
  PROJECT_SHARE = 'project_share',
  ORGANISATION_MEMBER = 'organisation_member',
}

@Entity()
export class PendingInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 254 })
  email: string

  @Column({
    type: 'enum',
    enum: PendingInvitationType,
  })
  type: PendingInvitationType

  @Column('varchar', { nullable: true })
  projectId: string | null

  @Column('varchar', { nullable: true })
  organisationId: string | null

  @Column('varchar')
  role: string

  @Column('varchar')
  inviterId: string

  @CreateDateColumn()
  created: Date
}

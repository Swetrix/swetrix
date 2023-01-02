import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  JoinTable,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'
import { ProjectShare } from './project-share.entity'
import { ExtensionToProject } from '../../marketplace/extensions/entities/extension-to-project.entity'

// In case of modifying some properties here, make sure to also edit them in common/constants.ts -> selfhosted -> clickhouse
// and to add them to the GDPR data export email template
@Entity()
export class Project {
  @ApiProperty()
  @PrimaryColumn('varchar', {
    unique: true,
    length: 12,
  })
  id: string

  @ApiProperty()
  @Column('varchar', { length: 50 })
  name: string

  @ApiProperty()
  @Column('simple-array')
  origins: string[]

  @ApiProperty()
  @Column('simple-array', { nullable: true, default: null })
  ipBlacklist: string[]

  @ApiProperty()
  @Column({
    default: true,
  })
  active: boolean

  @ApiProperty()
  @Column({
    default: false,
  })
  public: boolean

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, user => user.projects)
  admin: User

  @ApiProperty({ type: () => ProjectShare })
  @OneToMany(() => ProjectShare, share => share.project)
  share: ProjectShare[]

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @OneToMany(
    () => ExtensionToProject,
    extensionToProject => extensionToProject.project,
  )
  @JoinTable()
  extensions: ExtensionToProject[]

  @ApiProperty()
  @Column({
    type: 'int',
    nullable: true,
    default: null,
  })
  alertIfOnlineUsersExceeds: number | null

  @ApiProperty()
  @Column({
    type: 'date',
    nullable: true,
    default: null,
  })
  lastSendedAlert: Date | null
}

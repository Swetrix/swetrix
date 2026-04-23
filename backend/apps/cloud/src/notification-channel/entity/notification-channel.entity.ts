import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  Index,
  Check,
} from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { User } from '../../user/entities/user.entity'
import { Organisation } from '../../organisation/entity/organisation.entity'
import { Project } from '../../project/entity/project.entity'
import { Alert } from '../../alert/entity/alert.entity'

export enum NotificationChannelType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  WEBPUSH = 'webpush',
}

// Discriminated config payload by type. Persisted as JSON.
export type NotificationChannelConfig =
  | { address: string; unsubscribed?: boolean } // email
  | { chatId: string } // telegram
  | { url: string; secret?: string | null } // discord | slack | webhook
  | {
      endpoint: string
      keys: { p256dh: string; auth: string }
      userAgent?: string | null
    } // webpush

@Entity({ name: 'notification_channel' })
@Check(
  '`channel_scope_check`',
  '((`userId` IS NOT NULL) + (`organisationId` IS NOT NULL) + (`projectId` IS NOT NULL)) = 1',
)
export class NotificationChannel {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ApiProperty()
  @Column('varchar', { length: 100 })
  name: string

  @ApiProperty({ enum: NotificationChannelType })
  @Column({
    type: 'enum',
    enum: NotificationChannelType,
  })
  type: NotificationChannelType

  @ApiProperty()
  @Column('json')
  config: NotificationChannelConfig

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isVerified: boolean

  @Column('varchar', { length: 64, nullable: true, default: null })
  verificationToken: string | null

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @ApiProperty()
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated: Date

  @Index()
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  user: User | null

  @Index()
  @ManyToOne(() => Organisation, { nullable: true, onDelete: 'CASCADE' })
  organisation: Organisation | null

  @Index()
  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  project: Project | null

  @ManyToMany(() => Alert, (alert) => alert.channels)
  alerts: Alert[]
}

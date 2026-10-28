import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm'
import { Project } from '../../project/entity/project.entity'

@Entity('data_export')
@Index('IDX_data_export_due', ['enabled', 'nextSyncAt'])
export class DataExport {
  @PrimaryColumn('varchar', { length: 36 })
  id: string

  @Column('varchar', { length: 12, unique: true })
  projectId: string

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project

  @Column('varchar', { length: 36 })
  ownerId: string

  @Column('varchar', { length: 36 })
  revision: string

  @Column('varchar', { length: 63 })
  gcpProjectId: string

  @Column('varchar', { length: 1024 })
  datasetId: string

  @Column('varchar', { length: 64 })
  location: string

  @Column('varchar', { length: 128 })
  tablePrefix: string

  @Column('text', { select: false })
  encryptedCredentials: string

  @Column('varchar', { length: 254 })
  serviceAccountEmail: string

  @Column('date')
  startDate: string

  @Column('date')
  nextDate: string

  @Column('boolean', { default: true })
  enabled: boolean

  @Column('varchar', { length: 16, default: 'idle' })
  status: 'idle' | 'queued' | 'syncing' | 'error'

  @Column('datetime', { nullable: true })
  nextSyncAt: Date | null

  @Column('date', { nullable: true })
  lastSyncedDate: string | null

  @Column('datetime', { nullable: true })
  lastSyncedAt: Date | null

  @Column('double', { default: 0 })
  lastRowCount: number

  @Column('varchar', { length: 500, nullable: true })
  lastError: string | null

  @CreateDateColumn()
  createdAt: Date
}

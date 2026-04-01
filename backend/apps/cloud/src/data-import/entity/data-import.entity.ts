import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'

import { Project } from '../../project/entity/project.entity'

export enum DataImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const MAX_IMPORT_ID = 255

@Entity('data_import')
export class DataImport {
  @PrimaryGeneratedColumn()
  id: number

  @Column('tinyint', { unsigned: true })
  importId: number

  @Column('varchar', { length: 12 })
  projectId: string

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project

  @Column('varchar', { length: 30 })
  provider: string

  @Column({
    type: 'enum',
    enum: DataImportStatus,
    default: DataImportStatus.PENDING,
  })
  status: DataImportStatus

  @Column({ type: 'date', nullable: true })
  dateFrom: Date | null

  @Column({ type: 'date', nullable: true })
  dateTo: Date | null

  @Column({ default: 0 })
  totalRows: number

  @Column({ default: 0 })
  importedRows: number

  @Column({ default: 0 })
  invalidRows: number

  @Column('text', { nullable: true })
  errorMessage: string | null

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: 'datetime', nullable: true })
  finishedAt: Date | null
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { ExtensionStatus } from './enums/extension-status.enum'

@Entity()
export class Extension {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column('varchar')
  title!: string

  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null

  @Column({ type: 'uuid', unique: true })
  url: string

  @Column('varchar')
  version: string

  @Column({
    type: 'enum',
    enum: ExtensionStatus,
    default: ExtensionStatus.PENDING,
  })
  status: string
}

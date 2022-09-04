import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Category } from '../categories/category.entity'
import { ExtensionStatus } from './enums/extension-status.enum'

@Entity()
export class Extension {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('varchar')
  name: string

  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null

  @Column('varchar')
  version: string

  @Column({
    type: 'enum',
    enum: ExtensionStatus,
    default: ExtensionStatus.PENDING,
  })
  status: string

  @Column({ type: 'int', default: 0 })
  price: number

  @Column({ type: 'varchar', nullable: true, default: null })
  mainImage: string | null

  @Column('simple-array')
  additionalImages: string[] | []

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToMany(() => Category, category => category.extensions)
  @JoinTable()
  categories: Category[] | []
}

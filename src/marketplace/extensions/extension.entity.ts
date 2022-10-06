import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Category } from '../categories/category.entity'
import { ExtensionStatus } from './enums/extension-status.enum'
import { User } from 'src/user/entities/user.entity'

@Entity()
export class Extension {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => User, user => user.ownedExtensions)
  owner!: User

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
  categories: Category[] | []

  @Column({ type: 'int', default: 0 })
  installs: number
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../../../user/entities/user.entity'
import { ExtensionStatus } from '../enums/extension-status.enum'
import { Category } from '../../categories/category.entity'
import { ExtensionToUser } from './extension-to-user.entity'
import { ExtensionToProject } from './extension-to-project.entity'

@Entity()
export class Extension {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid')
  ownerId: string

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

  @OneToMany(
    () => ExtensionToUser,
    extensionToUser => extensionToUser.extension,
  )
  @JoinTable()
  users: ExtensionToUser[]

  @OneToMany(
    () => ExtensionToProject,
    extensionToProject => extensionToProject.extension,
  )
  @JoinTable()
  projects: ExtensionToProject[]
}

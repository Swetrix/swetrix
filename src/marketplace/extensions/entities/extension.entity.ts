import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
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
import { Comment } from '../../comments/entities/comment.entity'
import { Complaint } from '../../complaints/entities/complaint.entity'

@Entity()
export class Extension {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => User, user => user.ownedExtensions)
  owner: User

  @Column('varchar')
  name: string

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null

  @Column('varchar', { default: '0.0.1' })
  version: string

  @Column({
    type: 'enum',
    enum: ExtensionStatus,
    default: ExtensionStatus.PENDING, // REVIEW: Should this be PENDING or NO_EXTENSION_UPLOADED?
  })
  status: string

  @Column({ type: 'int', default: 0 })
  price: number

  @Column({ type: 'varchar', nullable: true, default: null })
  mainImage: string | null

  @Column('simple-array')
  additionalImages: string[] | []

  @Column({ type: 'varchar', nullable: true, default: null })
  fileURL: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Category, category => category.extensions)
  category: Category

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

  @OneToMany(() => Comment, comment => comment.extension)
  @JoinTable()
  comments: Comment[]

  @OneToMany(() => Complaint, complaint => complaint.extension)
  @JoinTable()
  complaints: Complaint[]
}

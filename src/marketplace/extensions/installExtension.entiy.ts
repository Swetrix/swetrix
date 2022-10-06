import { Entity, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm'
import { Extension } from './extension.entity'
import { User } from 'src/user/entities/user.entity'
import { Project } from 'src/project/entity/project.entity'
@Entity()
export class InstallExtension {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Extension, extension => extension.id)
  extensionId!: string

  @ManyToOne(() => User, user => user.id)
  userId!: string

  @Column({
    default: true,
  })
  active?: boolean

  @ManyToOne(() => Project, project => project.id)
  projects?: Project[] | null
}

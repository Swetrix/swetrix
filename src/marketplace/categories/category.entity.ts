import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Extension } from '../extensions/extension.entity'

@Entity()
export class Category {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'varchar', unique: true })
  title!: string

  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null

  @ManyToMany(() => Extension, extension => extension.categories)
  @JoinTable()
  extensions: Extension[]
}

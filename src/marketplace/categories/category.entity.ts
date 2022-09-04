import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Extension } from '../extensions/extension.entity'

@Entity()
export class Category {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'varchar', unique: true })
  name!: string

  @ManyToMany(() => Extension, extension => extension.categories)
  extensions!: Extension[] | []
}

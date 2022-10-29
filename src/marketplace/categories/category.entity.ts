import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Extension } from '../extensions/entities/extension.entity'

@Entity()
export class Category {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ type: 'varchar', unique: true })
  name: string

  @OneToMany(() => Extension, extension => extension.category)
  extensions: Extension[] | []
}

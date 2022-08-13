import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Category {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'varchar', unique: true })
  title!: string

  @Column({ type: 'varchar', nullable: true, default: null })
  description!: string | null
}

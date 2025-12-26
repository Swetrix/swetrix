import "reflect-metadata";
import { Entity, Column, PrimaryColumn, ManyToOne } from "typeorm";
import { User } from './user.entity.js'
import { Organisation } from './organisation.entity.js'

export enum BotsProtectionLevel {
  OFF = 'off',
  BASIC = 'basic',
}

@Entity()
export class Project {
  @PrimaryColumn('varchar', {
    unique: true,
    length: 12,
  })
  id: string

  @Column('varchar', { length: 50 })
  name: string

  @Column('simple-array')
  origins: string[]

  @Column({
    type: "boolean",
    default: true,
  })
  active: boolean

  @Column({
    type: "boolean",
    default: false,
  })
  public: boolean

  @Column('boolean', { default: false })
  isTransferring: boolean

  @Column({
    type: 'enum',
    enum: BotsProtectionLevel,
    default: BotsProtectionLevel.BASIC,
  })
  botsProtectionLevel: BotsProtectionLevel

  @ManyToOne(() => User, user => user.projects)
  admin: User

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column('boolean', { default: false })
  isArchived: boolean

  @ManyToOne(() => Organisation, org => org.projects, { nullable: true })
  organisation: Organisation | null
}

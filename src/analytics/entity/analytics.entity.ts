import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

enum EventType {
  PAGEVIEWS = 'pageviews',
}

@Entity()
export class Analytics {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 11 })
  pid: string

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.PAGEVIEWS,
  })
  ev: string

  @Column('varchar', { length: 6 })
  tz: string

  @Column('varchar', { length: 500 }) // maybe it should be 2083? https://support.microsoft.com/uk-ua/topic/maximum-url-length-is-2-083-characters-in-internet-explorer-174e7c8a-6666-f4e0-6fd6-908b53c12246
  pg: string

  @Column('varchar', { length: 8 })
  lc: string

  @Column('varchar', { length: 500 }) // same question as pg
  ref: string

  @Column()
  sw: number

  @Column('varchar', { length: 100 }) 
  so: string

  @Column('varchar', { length: 100 }) 
  me: string

  @Column('varchar', { length: 100 }) 
  ca: string

  @Column()
  lt: number
}

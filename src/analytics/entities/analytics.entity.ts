import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'

import { Project } from '../../project/entity/project.entity'

enum EventType {
  PAGEVIEWS = 'pageviews',
}

@Entity()
export class Analytics {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('varchar', { length: 11 })
  pid: string

  // @ApiProperty({ type: () => Project })
  // @ManyToOne(() => Project, proj => proj.id)
  // pid: Project

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.PAGEVIEWS,
  })
  ev: string

  @Column('varchar', {
    length: 64,
    nullable: true,
  })
  tz: string

  @Column('varchar', {
    length: 500,
    nullable: true,
   }) // maybe it should be 2083? https://support.microsoft.com/uk-ua/topic/maximum-url-length-is-2-083-characters-in-internet-explorer-174e7c8a-6666-f4e0-6fd6-908b53c12246
  pg: string

  @Column('varchar', {
    length: 8,
    nullable: true,
   })
  lc: string

  @Column('varchar', {
    length: 500,
    nullable: true,
   }) // same question as pg
  ref: string

  @Column({
    nullable: true,
  })
  sw: number

  @Column('varchar', {
    length: 100,
    nullable: true,
   }) 
  so: string

  @Column('varchar', {
    length: 100,
    nullable: true,
   }) 
  me: string

  @Column('varchar', {
    length: 100,
    nullable: true,
  }) 
  ca: string

  @Column({ nullable: true })
  lt: number

  @CreateDateColumn()
  created: Date;
}

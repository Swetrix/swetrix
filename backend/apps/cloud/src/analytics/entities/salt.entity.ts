import { Column, Entity, PrimaryColumn } from 'typeorm'

import { SaltRotationType } from '../salt.service'

@Entity()
export class Salt {
  @PrimaryColumn('varchar', { length: 10 })
  rotation: SaltRotationType

  @Column('text')
  salt: string

  @Column({ type: 'timestamp' })
  expiresAt: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date
}

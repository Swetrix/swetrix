import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'crypto'
import { sign } from 'jsonwebtoken'
import { Repository } from 'typeorm'
import { EXPIRES_IN } from './constants/refresh-token.constant'
import { RefreshToken } from './entity/refresh-token.entity'
import { ISaveRefreshToken } from './interfaces/save-refresh-token.interface'

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  async generate(userId: string): Promise<RefreshToken> {
    const refreshToken = sign(
      { userId },
      this.configService.get('JWT_REFRESH_SECRET'),
      {
        expiresIn: EXPIRES_IN,
      },
    )

    const refreshTokenHash = createHash('sha1')
      .update(refreshToken)
      .digest('hex')
    return await this.save({ userId, refreshTokenHash })
  }

  async save(data: ISaveRefreshToken): Promise<RefreshToken> {
    const entity = this.refreshTokenRepository.create(data)
    return await this.refreshTokenRepository.save(entity)
  }

  async delete(refreshTokenHash: string): Promise<void> {
    await this.refreshTokenRepository.delete({ refreshTokenHash })
  }
}

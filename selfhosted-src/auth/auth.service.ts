import {
  Injectable,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { genSalt, hash } from 'bcrypt'
import * as _isEmpty from 'lodash/isEmpty'

import {
  SelfhostedUser,
  generateSelfhostedUser,
} from 'selfhosted-src/user/entities/user.entity'
import {
  saveRefreshTokenClickhouse,
  findRefreshTokenClickhouse,
  deleteRefreshTokenClickhouse,
} from 'selfhosted-src/common/utils'
import {
  SELFHOSTED_EMAIL,
  SELFHOSTED_PASSWORD,
  JWT_ACCESS_TOKEN_SECRET,
} from 'selfhosted-src/common/constants'

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  public async hashPassword(password: string): Promise<string> {
    const salt = await genSalt(10)
    return hash(password, salt)
  }

  public async generateJwtAccessToken(
    userId: string,
    isSecondFactorAuthenticated = false,
  ) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        isSecondFactorAuthenticated,
      },
      {
        algorithm: 'HS256',
        expiresIn: 60 * 30,
        secret: JWT_ACCESS_TOKEN_SECRET,
      },
    )
  }

  public async validateUser(
    email: string,
    password: string,
  ): Promise<SelfhostedUser | null> {
      if (email !== SELFHOSTED_EMAIL || password !== SELFHOSTED_PASSWORD) {
        return null
      }

      return generateSelfhostedUser()
  }

  private async generateJwtRefreshToken(
    userId: string,
    isSecondFactorAuthenticated = false,
  ) {
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        isSecondFactorAuthenticated,
      },
      {
        algorithm: 'HS256',
        expiresIn: 60 * 60 * 24 * 30,
        secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      },
    )

      await saveRefreshTokenClickhouse(userId, refreshToken)

    return refreshToken
  }

  public async checkRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
      const tokens = await findRefreshTokenClickhouse(userId, refreshToken)
      return !_isEmpty(tokens)
  }

  public async generateJwtTokens(
    userId: string,
    isSecondFactorAuthenticated = false,
  ) {
    const accessToken = await this.generateJwtAccessToken(
      userId,
      isSecondFactorAuthenticated,
    )

    let refreshToken = 'NOT_AVAILABLE'

    if (isSecondFactorAuthenticated) {
      refreshToken = await this.generateJwtRefreshToken(
        userId,
        isSecondFactorAuthenticated,
      )
    }

    return { accessToken, refreshToken }
  }

  async logout(userId: string, refreshToken: string) {
    await deleteRefreshTokenClickhouse(userId, refreshToken)
  }
}

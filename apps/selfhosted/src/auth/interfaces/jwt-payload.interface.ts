export interface IJwtPayload {
  sub: string
  isSecondFactorAuthenticated: boolean
}

export interface IJwtRefreshTokenPayload extends IJwtPayload {
  refreshToken: string
}

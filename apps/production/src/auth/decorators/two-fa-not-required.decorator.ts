import { SetMetadata } from '@nestjs/common'

export const IS_TWO_FA_NOT_REQUIRED_KEY = 'isTwoFaNotRequired'
export const TwoFaNotRequired = () =>
  SetMetadata(IS_TWO_FA_NOT_REQUIRED_KEY, true)

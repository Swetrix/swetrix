import { SetMetadata, CustomDecorator } from '@nestjs/common'

/**
 * Should be applied to controllers where user has to be authenticated but 2FA is not required.
 */
export const TwoFaNotRequired = (): CustomDecorator<string> =>
  SetMetadata('twoFaNotRequired', true)

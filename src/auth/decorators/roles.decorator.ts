import { SetMetadata } from '@nestjs/common'
import { UserType } from 'src/user/entities/user.entity'

export const IS_ROLES_KEY = 'roles'
export const Roles = (...roles: UserType[]) => SetMetadata(IS_ROLES_KEY, roles)

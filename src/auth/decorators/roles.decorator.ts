import { SetMetadata } from '@nestjs/common'
import { UserType } from 'src/user/entities/user.entity'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles)

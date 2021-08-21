import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { sign } from 'jsonwebtoken'
import { Response } from 'express'
import * as bcrypt from 'bcrypt'

import { UserService } from '../user/user.service'
import { User } from '../user/entities/user.entity'
import { JWT_LIFE_TIME } from '../common/constants'

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
  ) {}

  hashPassword(pass: string): string {
    return bcrypt.hashSync(pass, process.env.PASSWORD_SALT)
  }

  checkPassword(passToCheck: string, hashedPass: string): boolean {
    const hashedPassToCheck = this.hashPassword(passToCheck)

    return hashedPassToCheck === hashedPass
  }

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.userService.findOneWhere({ email })

    if (user && this.checkPassword(pass, user.password)) {
      return user
    }

    throw new UnprocessableEntityException('Email or password is incorrect')
  }

  async login(user: User, res: Response): Promise<any> {
    const options = {
      httpOnly: true,
      sameSite: false,
      hostonly: true
    }

    const token = sign({ user_id: user.id }, process.env.JWT_SECRET, {
      expiresIn: JWT_LIFE_TIME,
    })

    res.cookie('token', token, options)
    delete user.password
    return { access_token: token, user }
  }
}

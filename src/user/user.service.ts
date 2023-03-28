import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as dayjs from 'dayjs'
import * as _isEmpty from 'lodash/isEmpty'
import * as _size from 'lodash/size'
import * as _omit from 'lodash/omit'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { User, ACCOUNT_PLANS, TRIAL_DURATION } from './entities/user.entity'
import { UserProfileDTO } from './dto/user.dto'
import { RefreshToken } from './entities/refresh-token.entity'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async create(userDTO: UserProfileDTO | User): Promise<User> {
    return this.usersRepository.save(userDTO)
  }

  async paginate(
    options: PaginationOptionsInterface,
  ): Promise<Pagination<User>> {
    const [results, total] = await this.usersRepository.findAndCount({
      take: options.take || 10,
      skip: options.skip || 0,
    })

    return new Pagination<User>({
      results,
      total,
    })
  }

  async update(id: string, update: Record<string, unknown>): Promise<any> {
    return this.usersRepository.update({ id }, update)
  }

  async updateByEmail(
    email: string,
    update: Record<string, unknown>,
  ): Promise<any> {
    return this.usersRepository.update({ email }, update)
  }

  async updateBySubID(
    subID: string,
    update: Record<string, unknown>,
  ): Promise<any> {
    return this.usersRepository.update({ subID }, update)
  }

  async delete(id: string): Promise<any> {
    return this.usersRepository.delete(id)
  }

  async count(): Promise<number> {
    return this.usersRepository.count()
  }

  omitSensitiveData(user: User): User {
    return _omit(user, [
      'password',
      'twoFactorRecoveryCode',
      'twoFactorAuthenticationSecret',
    ])
  }

  findOneWhere(
    where: Record<string, unknown>,
    relations: string[] = [],
  ): Promise<User> {
    return this.usersRepository.findOne({ where, relations })
  }

  findOne(id: string, params: object = {}): Promise<User> {
    return this.usersRepository.findOne({
      where: { id },
      ...params,
    })
  }

  findOneWithRelations(id: string, relations: string[]): Promise<User> {
    return this.usersRepository.findOne(id, { relations })
  }

  findWhereWithRelations(
    where: Record<string, unknown>,
    relations: string[],
  ): Promise<User[]> {
    return this.usersRepository.find({
      where,
      relations,
    })
  }

  find(params: object): Promise<User[]> {
    return this.usersRepository.find(params)
  }

  findWhere(where: Record<string, unknown>): Promise<User[]> {
    return this.usersRepository.find({ where })
  }

  validatePassword(pass: string): void {
    const err = []
    if (_isEmpty(pass)) {
      err.push('Password cannot be empty')
    }

    if (_size(pass) > 50) {
      err.push('Maximum password length is 50 letters')
    }

    if (_size(pass) < 8) {
      err.push('at least 8 characters')
    }

    // if(!/[a-z]/.test(pass))
    //   err.push('should contain at least one lower case')
    // if(!/[A-Z]/.test(pass))
    //   err.push('should contain at least one upper case')
    // if(!(/[!@#$%^&*(),.?":{}|<>]/g.test(pass)))
    //   err.push('should contain at least one symbol')

    if (!_isEmpty(err)) {
      throw new BadRequestException(err)
    }
  }

  processUser(user: User): object {
    // @ts-ignore
    const maxEventsCount = ACCOUNT_PLANS[user?.planCode]?.monthlyUsageLimit || 0
    const userData = {
      // @ts-ignore
      ...user,
      password: undefined,
      twoFactorRecoveryCode: undefined,
      twoFactorAuthenticationSecret: undefined,
      maxEventsCount,
    }

    return userData
  }

  search(query: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .select()
      .where('email like :query', { query: `%${query}%` })
      .limit(5)
      .getMany()
  }

  public async findUser(email: string) {
    return this.usersRepository.findOne({ email })
  }

  public async createUser(user: Pick<User, 'email' | 'password'>) {
    return this.usersRepository.save({
      ...user,
      trialEndDate: dayjs
        .utc()
        .add(TRIAL_DURATION, 'day')
        .format('YYYY-MM-DD HH:mm:ss'),
    })
  }

  public async findUserById(id: string) {
    return this.usersRepository.findOne({ id })
  }

  public async updateUser(id: string, user: Partial<Omit<User, 'id'>>) {
    return this.usersRepository.update({ id }, user)
  }

  public async saveRefreshToken(userId: string, refreshToken: string) {
    return this.refreshTokenRepository.save({
      userId,
      refreshToken,
    })
  }

  public async findRefreshToken(userId: string, refreshToken: string) {
    return this.refreshTokenRepository.findOne({
      where: {
        userId,
        refreshToken,
      },
    })
  }

  public async deleteRefreshToken(userId: string, refreshToken: string) {
    await this.refreshTokenRepository.delete({
      userId,
      refreshToken,
    })
  }

  public async findUserByApiKey(apiKey: string) {
    return this.usersRepository.findOne({ where: { apiKey } })
  }

  async getUser(id: string) {
    return this.usersRepository.findOne({ id })
  }

  async getUserByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } })
  }
}

import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as _isEmpty from 'lodash/isEmpty'
import * as _size  from 'lodash/size'

import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { User } from './entities/user.entity'
import { UserProfileDTO } from './dto/user.dto'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userDTO: UserProfileDTO | User): Promise<User> {
    return await this.usersRepository.save(userDTO)
  }

  async paginate(options: PaginationOptionsInterface): Promise<Pagination<User>> {
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

  async updateByEmail(email: string, update: Record<string, unknown>): Promise<any> {
    return this.usersRepository.update({ email }, update)
  }

  async updateBySubID(subID: number, update: Record<string, unknown>): Promise<any> {
    return this.usersRepository.update({ subID }, update)
  }

  async delete(id: string): Promise<any> {
    return this.usersRepository.delete(id)
  }

  async count(): Promise<number> {
    return await this.usersRepository.count()
  }

  findOneWhere(where: Record<string, unknown>, relations: string[] = []): Promise<User> {
    return this.usersRepository.findOne({ where, relations })
  }

  findOne(id: string, params: object = {}): Promise<User> {
    return this.usersRepository.findOne({
      where: { id }, ...params,
    })
  }

  findOneWithRelations(id: string, relations: string[]): Promise<User> {
    return this.usersRepository.findOne(id, { relations })
  }

  findWhereWithRelations(where: Record<string, unknown>, relations: string[]): Promise<User[]> {
    return this.usersRepository.find({
      where, relations,
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

    if(_size(pass) > 50) {
      err.push('Maximum password length is 50 letters')
    }

    if(_size(pass) < 8) {
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

  search(query: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .select()
      .where('email like :query', { query: `%${query}%` })
      .limit(5)
      .getMany()
  }
}

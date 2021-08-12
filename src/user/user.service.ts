import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

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
    return this.usersRepository.update({id}, update)
  }

  async delete(id: string): Promise<any> {
    return this.usersRepository.delete(id)
  }

  findOneWhere(where: Record<string, unknown>, relations: string[] = []): Promise<User> {
    return this.usersRepository.findOne({ where, relations })
  }

  findOne(id: string): Promise<User> {
    return this.findOneWhere({ id })
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

  validatePassword(pass: string): string | null {
    if(!pass) {
      return null
    }

    const err = []
    if(pass.length > 50)
      err.push('Maximum password length is 50 letters')
    if(pass.length < 8)
      err.push('at least 8 characters')
    // if(!/[a-z]/.test(pass))
    //   err.push('should contain at least one lower case')
    // if(!/[A-Z]/.test(pass))
    //   err.push('should contain at least one upper case')
    // if(!(/[!@#$%^&*(),.?":{}|<>]/g.test(pass)))
    //   err.push('should contain at least one symbol')

    if (err.length > 0)
      throw new BadRequestException(err)
    else {
      return null
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

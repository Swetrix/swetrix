import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { Complaint } from './entities/complaint.entity'

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private complaintsRepository: Repository<Complaint>,
  ) {}

  async findAndCount(
    options: FindManyOptions<Complaint>,
  ): Promise<[Complaint[], number]> {
    return this.complaintsRepository.findAndCount({ ...options })
  }

  async findOne(options: FindOneOptions<Complaint>): Promise<Complaint> {
    return this.complaintsRepository.findOne({ ...options })
  }

  async save(complaint: Partial<Complaint>): Promise<Complaint> {
    return this.complaintsRepository.save(complaint)
  }

  async update(id: number, complaint: Partial<Complaint>): Promise<void> {
    await this.complaintsRepository.update({ id }, complaint)
  }
}

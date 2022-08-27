import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { Extension } from './extension.entity'
import { ICreateExtension } from './interfaces/create-extension.interface'
import { ISaveExtension } from './interfaces/save-extension.interface'
import { IUpdateExtension } from './interfaces/update-extension.interface'

@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
  ) {}

  async findOne(options: FindOneOptions<Extension>): Promise<Extension> {
    return await this.extensionRepository.findOne({ ...options })
  }

  create(extension: ICreateExtension): Extension {
    return this.extensionRepository.create(extension)
  }

  async save(extension: ISaveExtension): Promise<ISaveExtension & Extension> {
    return await this.extensionRepository.save(extension)
  }

  async findById(id: string): Promise<Extension> {
    return await this.findOne({ where: { id } })
  }

  async update(id: string, extension: IUpdateExtension) {
    await this.extensionRepository.update({ id }, extension)
  }

  async delete(id: string): Promise<void> {
    await this.extensionRepository.delete({ id })
  }

  async findAndCount(
    options: FindManyOptions<Extension>,
  ): Promise<[Extension[], number]> {
    return await this.extensionRepository.findAndCount({ ...options })
  }
}

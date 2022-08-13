import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOneOptions, Repository } from 'typeorm'
import { Extension } from './extension.entity'
import { ICreateExtension } from './interfaces/create-extension.interface'
import { ISaveExtension } from './interfaces/save-extension.interface'

@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
  ) {}

  async findOne(options: FindOneOptions<Extension>): Promise<Extension> {
    return await this.extensionRepository.findOne({ ...options })
  }

  async findTitle(title: string): Promise<Extension> {
    return await this.findOne({ where: { title }, select: ['title'] })
  }

  create(extension: ICreateExtension): Extension {
    return this.extensionRepository.create(extension)
  }

  async save(extension: ISaveExtension): Promise<ISaveExtension & Extension> {
    return await this.extensionRepository.save(extension)
  }

  async findById(id: number): Promise<Extension> {
    return await this.findOne({ where: { id } })
  }
}

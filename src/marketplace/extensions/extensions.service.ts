import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { ExtensionToProject } from './entities/extension-to-project.entity'
import { Extension } from './entities/extension.entity'
import { ICreateExtension } from './interfaces/create-extension.interface'
import { ISaveExtension } from './interfaces/save-extension.interface'
import { IUpdateExtension } from './interfaces/update-extension.interface'

@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(ExtensionToProject)
    private readonly extensionToProjectRepository: Repository<ExtensionToProject>,
  ) {}

  async findOne(options: FindOneOptions<Extension>): Promise<Extension> {
    return await this.extensionRepository.findOne({ ...options })
  }

  create(extension: ICreateExtension): Extension {
    return this.extensionRepository.create(extension)
  }

  // async createInstall(
  //   installExtension: InstallExtension,
  // ): Promise<InstallExtension> {
  //   return this.InstallExtensionRepository.create(installExtension)
  // }

  // async saveInstall(extension: InstallExtension): Promise<InstallExtension> {
  //   return await this.InstallExtensionRepository.save(extension)
  // }

  // async updateInstall(
  //   id: string,
  //   installExtension: InstallExtension,
  // ): Promise<any> {
  //   return this.InstallExtensionRepository.update(id, installExtension)
  // }

  // async deleteInstall(id: string): Promise<any> {
  //   return this.InstallExtensionRepository.delete(id)
  // }

  // async findInstall(params: object): Promise<InstallExtension[]> {
  //   return this.InstallExtensionRepository.find(params)
  // }

  // async findOneInstall(
  //   id: string,
  //   params: Object = {},
  // ): Promise<InstallExtension | null> {
  //   return this.InstallExtensionRepository.findOne(id, params)
  // }

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
    relations: string[] = [],
  ): Promise<[Extension[], number]> {
    return await this.extensionRepository.findAndCount({
      ...options,
      relations: relations,
    })
  }
}

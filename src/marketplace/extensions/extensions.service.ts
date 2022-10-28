import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm'
import { ExtensionToProject } from './entities/extension-to-project.entity'
import { ExtensionToUser } from './entities/extension-to-user.entity'
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
    @InjectRepository(ExtensionToUser)
    private readonly extensionToUserRepository: Repository<ExtensionToUser>,
  ) {}

  async findOne(options: FindOneOptions<Extension>): Promise<Extension> {
    return await this.extensionRepository.findOne({ ...options })
  }

  create(extension: ICreateExtension): Extension {
    return this.extensionRepository.create(extension)
  }

  async findOneExtensionToProject(
    options: FindOneOptions<ExtensionToProject>,
  ): Promise<ExtensionToProject> {
    return await this.extensionToProjectRepository.findOne({ ...options })
  }

  async createExtensionToProject(
    extensionToProject: Pick<ExtensionToProject, 'extensionId' | 'projectId'>,
  ): Promise<
    Pick<ExtensionToProject, 'extensionId' | 'projectId'> & ExtensionToProject
  > {
    return await this.extensionToProjectRepository.save(extensionToProject)
  }

  async deleteExtensionToProject(
    extensionId: string,
    projectId: string,
  ): Promise<void> {
    await this.extensionToProjectRepository.delete({ extensionId, projectId })
  }

  async findAndCountExtensionToProject(
    options: FindManyOptions<ExtensionToProject>,
    relations: string[] = [],
  ): Promise<[ExtensionToProject[], number]> {
    return await this.extensionToProjectRepository.findAndCount({
      ...options,
      relations,
    })
  }

  async findAndCountExtensionToUser(
    options: FindManyOptions<ExtensionToUser>,
    relations: string[] = [],
  ): Promise<[ExtensionToUser[], number]> {
    return await this.extensionToUserRepository.findAndCount({
      ...options,
      relations,
    })
  }

  async findOneExtensionToUser(
    options: FindOneOptions<ExtensionToUser>,
  ): Promise<ExtensionToUser> {
    return await this.extensionToUserRepository.findOne({ ...options })
  }

  async createExtensionToUser(
    extensionToUser: Pick<ExtensionToUser, 'extensionId' | 'userId'>,
  ): Promise<
    Pick<ExtensionToUser, 'extensionId' | 'userId'> & ExtensionToUser
  > {
    return await this.extensionToUserRepository.save(extensionToUser)
  }

  async deleteExtensionToUser(
    extensionId: string,
    userId: string,
  ): Promise<void> {
    await this.extensionToUserRepository.delete({ extensionId, userId })
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

  async allowedToManage(
    ownerId: string,
    id: string,
  ): Promise<any> {
    const extension = await this.findOne({
      where: { owner: ownerId, id },
    })

    if (!extension) {
      throw new ForbiddenException('You are not allowed to manage this extension')
    }
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
    relations: string[] = [],
  ): Promise<[Extension[], number]> {
    return await this.extensionRepository.findAndCount({
      ...options,
      relations,
    })
  }
}

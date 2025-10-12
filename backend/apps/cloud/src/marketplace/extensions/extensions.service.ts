import { ForbiddenException, Injectable } from '@nestjs/common'
import _pick from 'lodash/pick'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, FindOneOptions, Like, Repository } from 'typeorm'
import { UserService } from '../../user/user.service'
import { ExtensionToProject } from './entities/extension-to-project.entity'
import { ExtensionToUser } from './entities/extension-to-user.entity'
import { Extension } from './entities/extension.entity'
import { ICreateExtension } from './interfaces/create-extension.interface'
import { ISaveExtension } from './interfaces/save-extension.interface'
import { User } from '../../user/entities/user.entity'
import { IUpdateExtension } from './interfaces/update-extension.interface'
import { CreateExtensionType, UpdateExtensionType } from './types'
import { ExtensionStatus } from './enums/extension-status.enum'
import { CdnService } from '../cdn/cdn.service'
import { VersionTypes } from './interfaces'
import { SearchExtensionQueries } from './dtos/search-extension-queries.dto'
import { GetAllExtensionsQueries } from './dtos/get-all-extensions-queries.dto'
import { ExtensionVersionType } from './dtos/create-extension.dto'

const DEFAULT_EXTENSION_VERSION = '0.0.1'

@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(ExtensionToProject)
    private readonly extensionToProjectRepository: Repository<ExtensionToProject>,
    @InjectRepository(ExtensionToUser)
    private readonly extensionToUserRepository: Repository<ExtensionToUser>,
    private readonly cdnService: CdnService,
    private readonly userService: UserService,
  ) {}

  async findOne(options: FindOneOptions<Extension>): Promise<Extension> {
    return this.extensionRepository.findOne({ ...options })
  }

  create(extension: ICreateExtension): Extension {
    return this.extensionRepository.create(extension)
  }

  async findOneExtensionToProject(
    options: FindOneOptions<ExtensionToProject>,
  ): Promise<ExtensionToProject> {
    return this.extensionToProjectRepository.findOne({ ...options })
  }

  async createExtensionToProject(
    extensionToProject: Pick<ExtensionToProject, 'extensionId' | 'projectId'>,
  ): Promise<
    Pick<ExtensionToProject, 'extensionId' | 'projectId'> & ExtensionToProject
  > {
    return this.extensionToProjectRepository.save(extensionToProject)
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
    return this.extensionToProjectRepository.findAndCount({
      ...options,
      relations,
    })
  }

  async findAndCountExtensionToUser(
    options: FindManyOptions<ExtensionToUser>,
    relations: string[] = [],
  ): Promise<[ExtensionToUser[], number]> {
    return this.extensionToUserRepository.findAndCount({
      ...options,
      relations,
    })
  }

  async findOneExtensionToUser(
    options: FindOneOptions<ExtensionToUser>,
  ): Promise<ExtensionToUser> {
    return this.extensionToUserRepository.findOne({ ...options })
  }

  async createExtensionToUser(
    extensionToUser: Pick<ExtensionToUser, 'extensionId' | 'userId'>,
  ): Promise<
    Pick<ExtensionToUser, 'extensionId' | 'userId'> & ExtensionToUser
  > {
    return this.extensionToUserRepository.save(extensionToUser)
  }

  async deleteExtensionToUser(
    extensionId: string,
    userId: string,
  ): Promise<void> {
    await this.extensionToUserRepository.delete({ extensionId, userId })
  }

  filterOwner(owner: User) {
    return _pick(owner, ['nickname'])
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

  async allowedToManage(ownerId: string, id: string): Promise<any> {
    const extension = await this.findOne({
      where: { owner: { id: ownerId }, id },
    })

    if (!extension) {
      throw new ForbiddenException(
        'You are not allowed to manage this extension',
      )
    }
  }

  async save(extension: ISaveExtension): Promise<ISaveExtension & Extension> {
    return this.extensionRepository.save(extension)
  }

  async findById(id: string): Promise<Extension> {
    return this.findOne({ where: { id } })
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
    return this.extensionRepository.findAndCount(options)
  }

  async createExtension(extension: CreateExtensionType) {
    return this.extensionRepository.save({
      owner: { id: extension.ownerId },
      name: extension.name,
      description: extension.description,
      status: extension.extensionScript
        ? ExtensionStatus.PENDING
        : ExtensionStatus.NO_EXTENSION_UPLOADED,
      price: extension.price && Number(extension.price),
      category: { id: extension.categoryId && Number(extension.categoryId) },
      companyLink: extension.companyLink,
      mainImage:
        extension.mainImage &&
        (await this.cdnService.uploadFile(extension.mainImage)).filename,
      additionalImages: extension.additionalImages
        ? [
            ...(await Promise.all(
              extension.additionalImages.map(
                async image =>
                  (await this.cdnService.uploadFile(image)).filename,
              ),
            )),
          ]
        : [],
      fileURL:
        extension.extensionScript &&
        (await this.cdnService.uploadFile(extension.extensionScript)).filename,
      version: DEFAULT_EXTENSION_VERSION,
      tags: ['New'],
    })
  }

  async findUserExtension(extensionId: string, userId: string) {
    const user = await this.userService.findUserById(userId)

    if (!user) return null

    return this.extensionRepository.findOne({
      where: { id: extensionId, owner: { id: userId } },
    })
  }

  async updateExtension(
    extensionId: string,
    extension: UpdateExtensionType,
    extensionVersion: string,
  ) {
    const oldExtension = await this.extensionRepository.findOne({
      where: { id: extensionId },
    })

    const additionalImages = [...oldExtension.additionalImages]

    if (extension.additionalImages) {
      additionalImages.push(
        ...(await Promise.all(
          extension.additionalImages.map(
            async image => (await this.cdnService.uploadFile(image)).filename,
          ),
        )),
      )
    }

    if (extension.additionalImagesToDelete) {
      extension.additionalImagesToDelete.forEach(async image => {
        const index = additionalImages.indexOf(image)

        if (index > -1) {
          additionalImages.splice(index, 1)
        }

        if (additionalImages.includes(image)) {
          await this.cdnService.deleteFile(image)
        }
      })
    }

    await this.extensionRepository.update(
      { id: extensionId },
      {
        name: extension.name ? extension.name : oldExtension.name,
        description: extension.description
          ? extension.description
          : oldExtension.description,
        version: extension.version
          ? this.extensionVersion(extensionVersion, extension.version)
          : oldExtension.version,
        status: extension.extensionScript
          ? ExtensionStatus.PENDING
          : oldExtension.status,
        price: extension.price ? Number(extension.price) : oldExtension.price,
        category: { id: extension.categoryId && Number(extension.categoryId) },
        companyLink: extension.companyLink,
        mainImage: extension.mainImage
          ? (await this.cdnService.uploadFile(extension.mainImage)).filename
          : oldExtension.mainImage,
        additionalImages,
        fileURL: extension.extensionScript
          ? (await this.cdnService.uploadFile(extension.extensionScript))
              .filename
          : oldExtension.fileURL,
      },
    )

    return this.extensionRepository.findOne({
      where: { id: extensionId },
    })
  }

  extensionVersion(
    extensionVersion: string,
    versionType: ExtensionVersionType,
  ) {
    const versionTypes: VersionTypes = {
      major: [1, 0, 0],
      minor: [0, 1, 0],
      patch: [0, 0, 1],
    }

    const updateVersion: number[] = extensionVersion.split('.').map(Number)
    const versionUpdate: number[] = versionTypes[versionType]

    updateVersion[0] += versionUpdate[0]
    updateVersion[1] += versionUpdate[1]
    updateVersion[2] += versionUpdate[2]

    const newVersion: string = updateVersion.join('.')

    return newVersion
  }

  async searchExtension(data: SearchExtensionQueries) {
    return this.extensionRepository.findAndCount({
      skip: data.offset || 0,
      take: data.limit > 100 ? 100 : data.limit || 10,
      where: {
        name: Like(`%${data.term}%`),
        status: ExtensionStatus.ACCEPTED,
      },
      order: {
        createdAt:
          data.sortBy && data.sortBy === 'createdAt' ? 'DESC' : undefined,
        updatedAt:
          data.sortBy && data.sortBy === 'updatedAt' ? 'DESC' : undefined,
      },
      relations: ['owner', 'users', 'category'],
    })
  }

  async getExtensions(data: GetAllExtensionsQueries) {
    return this.extensionRepository.findAndCount({
      skip: data.offset || 0,
      take: data.limit > 100 ? 100 : data.limit || 10,
      where: {
        status: ExtensionStatus.ACCEPTED,
      },
      relations: ['owner', 'users', 'category'],
    })
  }

  async find(options: FindManyOptions<Extension>): Promise<Extension[]> {
    return this.extensionRepository.find(options)
  }

  async getExtensionInstallCount(
    extensionId: string,
    twoWeeksAgo?: Date,
  ): Promise<number> {
    const query = this.extensionToProjectRepository
      .createQueryBuilder('extensionToProject')
      .where('extensionToProject.extensionId = :extensionId', { extensionId })

    if (twoWeeksAgo) {
      query.andWhere('extensionToProject.createdAt > :twoWeeksAgo', {
        twoWeeksAgo,
      })
    }

    return query.getCount()
  }
}

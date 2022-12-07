import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { getRepository, Like } from 'typeorm'
import * as _map from 'lodash/map'
import * as _size from 'lodash/size'
import * as _isEmpty from 'lodash/isEmpty'
import { CreateExtension } from './dtos/create-extension.dto'
import { DeleteExtensionParams } from './dtos/delete-extension-params.dto'
import { GetExtensionParams } from './dtos/get-extension-params.dto'
import { GetAllExtensionsQueries } from './dtos/get-all-extensions-queries.dto'
import { ExtensionsService } from './extensions.service'
import { UserService } from '../../user/user.service'
import { ISaveExtension } from './interfaces/save-extension.interface'
import { UpdateExtensionParams } from './dtos/update-extension-params.dto'
import { UpdateExtension } from './dtos/update-extension.dto'
import { SearchExtensionQueries } from './dtos/search-extension-queries.dto'
import { CategoriesService } from '../categories/categories.service'
import { SortByExtension } from './enums/sort-by-extension.enum'
import { CdnService } from '../cdn/cdn.service'
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator'
import { Extension } from './entities/extension.entity'
import { GetInstalledExtensionsQueriesDto } from './dtos/queries/get-installed-extensions.dto'
import { InstallExtensionParamsDto } from './dtos/params/install-extension.dto'
import { UninstallExtensionParamsDto } from './dtos/params/uninstall-extension.dto'
import { InstallExtensionBodyDto } from './dtos/bodies/install-extension.dto'
import { UninstallExtensionBodyDto } from './dtos/bodies/uninstall-extension.dto'
import { ProjectService } from '../../project/project.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { UserType } from '../../user/entities/user.entity'
import { ExtensionStatus } from './enums/extension-status.enum'

@ApiTags('extensions')
@UsePipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    whitelist: true,
  }),
)
@Controller('extensions')
export class ExtensionsController {
  private readonly logger = new Logger(ExtensionsController.name)

  constructor(
    private readonly extensionsService: ExtensionsService,
    private readonly categoriesService: CategoriesService,
    private readonly userService: UserService,
    private readonly cdnService: CdnService,
    private readonly projectService: ProjectService,
  ) {}

  @Get('installed')
  async getInstalledExtensions(
    @Query() queries: GetInstalledExtensionsQueriesDto,
    @CurrentUserId() userId: string,
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    this.logger.debug({ queries })

    if (!userId) {
      throw new ForbiddenException('You must be logged in to access this route.')
    }

    const [extensionsToUser, count] = await this.extensionsService.findAndCountExtensionToUser({
      where: {
        userId,
      },
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 25 : queries.limit || 25,
    }, ['extension'])

    const extensions = _map(extensionsToUser, (extensionToUser) => {
      return extensionToUser.extension
    })

    // todo: also return projectExtensions - via findAndCountExtensionToProject

    // @ts-ignore
    return { extensions, count }
  }

  @ApiQuery({
    description: 'Extension offset',
    example: '5',
    name: 'offset',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension limit',
    example: '25',
    name: 'limit',
    required: false,
    type: String,
  })
  @Get()
  async getAllExtensions(@Query() queries: GetAllExtensionsQueries): Promise<{
    extensions: Extension[]
    count: number
  }> {
    let [extensions, count] = await this.extensionsService.findAndCount(
      {
        skip: queries.offset || 0,
        take: queries.limit > 100 ? 25 : queries.limit || 25,
        where: {
          status: ExtensionStatus.ACCEPTED,
        },
      },
      ['owner', 'users', 'category'],
    )

    // temporary fix; the usersQuantity should be counted via .count() method of typeorm
    extensions = _map(extensions, extension => {
      extension.usersQuantity = _size(extension.users)
      extension.users = undefined
      extension.owner = this.extensionsService.filterOwner(extension.owner)
      return extension
    })

    return { extensions, count }
  }

  @ApiQuery({
    description: 'Extension term',
    example: '',
    name: 'term',
    type: String,
  })
  @ApiQuery({
    description: 'Extension category',
    example: '',
    name: 'category',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension sortBy',
    example: 'createdAt',
    name: 'sortBy',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension offset',
    example: '5',
    name: 'offset',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension limit',
    example: '25',
    name: 'limit',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension owner id',
    name: 'ownerId',
    example: 'ea5a0383-e5ba-4dab-989e-3108d5a2e3bc',
    required: false,
    type: String,
  })
  @Get('published')
  async getAllPublishedExtensions(
    @Query() queries: GetAllExtensionsQueries,
    @CurrentUserId() userId: string,
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    if (!userId) {
      throw new ForbiddenException('You must be logged in to access this route.')
    }

    let [extensions, count] = await this.extensionsService.findAndCount({
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 25 : queries.limit || 25,
      where: {
        owner: userId,
      },
    }, ['category'])

    return { extensions, count }
  }

  @ApiQuery({
    description: 'Extension term',
    example: '',
    name: 'term',
    type: String,
  })
  @ApiQuery({
    description: 'Extension category',
    example: '',
    name: 'category',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension sortBy',
    example: 'createdAt',
    name: 'sortBy',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension offset',
    example: '5',
    name: 'offset',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Extension limit',
    example: '25',
    name: 'limit',
    required: false,
    type: String,
  })
  @Get('search')
  async searchExtension(@Query() queries: SearchExtensionQueries): Promise<{
    extensions: Extension[]
    count: number
  }> {
    if (queries.category) {
      const [extensions, count] = await getRepository(Extension)
        .createQueryBuilder('extension')
        .leftJoin('extension.category', 'category')
        .where('extension.name LIKE :term', { term: `%${queries.term}%` })
        .andWhere('category.name = :category', { category: queries.category })
        .andWhere('extension.status = :status', {
          status: ExtensionStatus.ACCEPTED,
        })
        .skip(queries.offset || 0)
        .take(queries.limit > 100 ? 25 : queries.limit || 25)
        .getManyAndCount()

      return { extensions, count }
    }

    if (queries.sortBy) {
      if (queries.sortBy === SortByExtension.CREATED_AT) {
        const [extensions, count] = await getRepository(Extension)
          .createQueryBuilder('extension')
          .where('extension.name LIKE :term', { term: `%${queries.term}%` })
          .andWhere('extension.status = :status', {
            status: ExtensionStatus.ACCEPTED,
          })
          .orderBy('extension.createdAt', 'DESC')
          .skip(queries.offset || 0)
          .take(queries.limit > 100 ? 25 : queries.limit || 25)
          .getManyAndCount()

        return { extensions, count }
      }

      if (queries.sortBy === SortByExtension.UPDATED_AT) {
        const [extensions, count] = await getRepository(Extension)
          .createQueryBuilder('extension')
          .where('extension.name LIKE :term', { term: `%${queries.term}%` })
          .andWhere('extension.status = :status', {
            status: ExtensionStatus.ACCEPTED,
          })
          .orderBy('extension.updatedAt', 'DESC')
          .skip(queries.offset || 0)
          .take(queries.limit > 100 ? 25 : queries.limit || 25)
          .getManyAndCount()

        return { extensions, count }
      }
    }

    const [extensions, count] = await this.extensionsService.findAndCount({
      where: {
        name: Like(`%${queries.term}%`),
        status: ExtensionStatus.ACCEPTED,
      },
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 25 : queries.limit || 25,
    })

    return { extensions, count }
  }

  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @Get(':extensionId')
  async getExtension(@Param() params: GetExtensionParams): Promise<Extension> {
    const extension = await this.extensionsService.findOne({
      where: {
        id: params.extensionId,
      },
      relations: ['category'],
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    return extension
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainImage', maxCount: 1 },
      { name: 'additionalImages', maxCount: 5 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  async createExtension(
    @Body() body: CreateExtension,
    @CurrentUserId() userId: string,
    @UploadedFiles()
    files: {
      mainImage?: Express.Multer.File
      additionalImages?: Express.Multer.File[]
      file?: Express.Multer.File
    },
  ): Promise<ISaveExtension & Extension> {
    if (!userId) {
      throw new ForbiddenException('You must be logged in to access this route.')
    }

    const additionalImageFilenames = []

    if (files.additionalImages) {
      Promise.all(
        files.additionalImages.map(async additionalImage => {
          additionalImageFilenames.push(
            (await this.cdnService.uploadFile(additionalImage))?.filename,
          )
        }),
      )
    }

    let fileURL
    let mainImageURL
    let statusInfo

    try {
      fileURL = files.file && (await this.cdnService.uploadFile(files.file[0]))?.filename
    } catch (e) {
      throw new InternalServerErrorException('Failed to upload extension to the CDN.')
    }

    try {
      mainImageURL = files.mainImage && (await this.cdnService.uploadFile(files.mainImage[0]))?.filename
    } catch (e) {
      throw new InternalServerErrorException('Failed to upload main image to the CDN.')
    }

    if (fileURL) {
      statusInfo = ExtensionStatus.PENDING
    } else {
      statusInfo = ExtensionStatus.NO_EXTENSION_UPLOADED
    }

    const user = await this.userService.findOne(userId)
    const extensionInstance = this.extensionsService.create({
      name: body.name,
      description: body.description,
      version: '0.0.1',
      price: body.price,
      owner: user,
      mainImage: mainImageURL,
      status: statusInfo,
      additionalImages: additionalImageFilenames,
      fileURL,
      category: body.categoryID
        ? await this.categoriesService.findById(body.categoryID)
        : undefined,
    })

    return await this.extensionsService.save(extensionInstance)
  }

  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mainImage', maxCount: 1 },
      { name: 'additionalImages', maxCount: 5 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.CUSTOMER)
  @Patch(':extensionId')
  async updateExtension(
    @Param() params: UpdateExtensionParams,
    @Body() body: UpdateExtension,
    @CurrentUserId() userId: string,
    @UploadedFiles()
    files: {
      mainImage?: Express.Multer.File
      additionalImages?: Express.Multer.File[]
      file?: Express.Multer.File
    },
  ): Promise<ISaveExtension & Extension> {
    this.extensionsService.allowedToManage(userId, params.extensionId)
    const extension = await this.extensionsService.findOne({
      where: {
        id: params.extensionId,
        owner: userId,
      },
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    const additionalImagesConcat = [
      ...(files.additionalImages || []),
      ...(body.additionalImagesCdn || []),
    ]

    const additionalImageFilenames = []

    try {
      if (additionalImagesConcat) {
        await Promise.all(
          additionalImagesConcat.map(async additionalImage => {
            if (typeof additionalImage === 'string') {
              additionalImageFilenames.push(additionalImage)
            } else {
              additionalImageFilenames.push(
                (await this.cdnService.uploadFile(additionalImage))?.filename,
              )
            }
          }),
        )
      }
    } catch (e) {
      throw new InternalServerErrorException(
        'Failed to upload additional images to the CDN.',
      )
    }

    let fileURL
    let mainImageURL
    let statusInfo

    try {
      fileURL =
        files.file &&
        (await this.cdnService.uploadFile(files.file[0]))?.filename
    } catch (e) {
      throw new InternalServerErrorException(
        'Failed to upload extension to the CDN.',
      )
    }

    try {
      mainImageURL =
        files.mainImage &&
        (await this.cdnService.uploadFile(files.mainImage[0]))?.filename
    } catch (e) {
      throw new InternalServerErrorException(
        'Failed to upload main image to the CDN.',
      )
    }

    let updateVersion

    if (body.version && fileURL) {
      switch (body.version) {
        case 'major':
          updateVersion = extension.version.split('.')
          updateVersion[0] = (parseInt(updateVersion[0]) + 1).toString()
          updateVersion[1] = '0'
          updateVersion[2] = '0'
          break
        case 'minor':
          updateVersion = extension.version.split('.')
          updateVersion[1] = (parseInt(updateVersion[1]) + 1).toString()
          updateVersion[2] = '0'
          break
        case 'patch':
          updateVersion = extension.version.split('.')
          updateVersion[2] = (parseInt(updateVersion[2]) + 1).toString()
          break
      }
      updateVersion = updateVersion.join('.')
    }

    if (fileURL) {
      statusInfo = ExtensionStatus.PENDING
    } else {
      statusInfo = ExtensionStatus.NO_EXTENSION_UPLOADED
    }

    const extensionInstance = this.extensionsService.create({
      ...extension,
      name: body.name || extension.name,
      description: body.description || extension.description,
      version: updateVersion || extension.version,
      price: body.price || extension.price,
      status: statusInfo,
      mainImage: mainImageURL || extension.mainImage,
      additionalImages: _isEmpty(additionalImageFilenames)
        ? extension.additionalImages
        : additionalImageFilenames,
      fileURL: fileURL || extension.fileURL,
      category: body.categoryID
        ? await this.categoriesService.findById(body.categoryID)
        : extension.category,
    })

    return await this.extensionsService.save(extensionInstance)
  }

  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Patch(':extensionId/approve')
  async approveExtension(@Param() params: UpdateExtensionParams): Promise<Extension> {
    const { extensionId } = params

    const extension = await this.extensionsService.findOne({
      where: { id: extensionId },
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    extension.status = ExtensionStatus.ACCEPTED

    return await this.extensionsService.save(extension)
  }

  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Patch(':extensionId/reject')
  async rejectExtension(@Param() params: UpdateExtensionParams): Promise<Extension> {
    const { extensionId } = params

    const extension = await this.extensionsService.findOne({
      where: { id: extensionId },
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    extension.status = ExtensionStatus.REJECTED

    return await this.extensionsService.save(extension)
  }

  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @Delete(':extensionId')
  async deleteExtension(
    @Param() params: DeleteExtensionParams,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    const { extensionId } = params

    this.extensionsService.allowedToManage(userId, extensionId)

    await this.extensionsService.delete(extensionId)
  }

  @Post(':extensionId/install')
  async installExtension(
    @Param() params: InstallExtensionParamsDto,
    @Body() body: InstallExtensionBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.debug({ params, body })
    if (!userId) {
      throw new ForbiddenException('You must be logged in to access this route.')
    }

    const extension = await this.extensionsService.findOne({
      where: { id: params.extensionId },
    })
    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    const user = await this.userService.findOne(userId)
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (!body.projectId) {
      const extensionToUser =
        await this.extensionsService.findOneExtensionToUser({
          where: {
            extensionId: extension.id,
            userId: user.id,
          },
        })
      if (extensionToUser) {
        throw new ConflictException('Extension already installed.')
      }

      return await this.extensionsService.createExtensionToUser({
        extensionId: extension.id,
        userId: user.id,
      })
    }

    const project = await this.projectService.findOne(body.projectId)
    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const extensionToProject =
      await this.extensionsService.findOneExtensionToProject({
        where: {
          extensionId: extension.id,
          projectId: project.id,
        },
      })
    if (extensionToProject) {
      throw new ConflictException('Extension already installed.')
    }

    return await this.extensionsService.createExtensionToProject({
      extensionId: extension.id,
      projectId: project.id,
    })
  }

  @Delete(':extensionId/uninstall')
  async uninstallExtension(
    @Param() params: UninstallExtensionParamsDto,
    @Body() body: UninstallExtensionBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.debug({ params, body })
    if (!userId) {
      throw new ForbiddenException('You must be logged in to access this route.')
    }

    const extension = await this.extensionsService.findOne({
      where: { id: params.extensionId },
    })
    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    const user = await this.userService.findOne(userId)
    if (!user) {
      throw new NotFoundException('User not found.')
    }

    if (!body.projectId) {
      const extensionToUser =
        await this.extensionsService.findOneExtensionToUser({
          where: {
            extensionId: extension.id,
            userId: user.id,
          },
        })
      if (!extensionToUser) {
        throw new NotFoundException('Extension not installed.')
      }

      return await this.extensionsService.deleteExtensionToUser(
        extension.id,
        user.id,
      )
    }

    const project = await this.projectService.findOne(body.projectId)
    if (!project) {
      throw new NotFoundException('Project not found.')
    }

    this.projectService.allowedToManage(project, userId, user.roles)

    const extensionToProject =
      await this.extensionsService.findOneExtensionToProject({
        where: {
          extensionId: extension.id,
          projectId: project.id,
        },
      })
    if (!extensionToProject) {
      throw new NotFoundException('Extension not installed.')
    }

    return await this.extensionsService.deleteExtensionToProject(
      extension.id,
      project.id,
    )
  }
}

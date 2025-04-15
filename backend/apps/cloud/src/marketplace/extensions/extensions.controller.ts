import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { FormDataRequest } from 'nestjs-form-data'
import { Like } from 'typeorm'
import _map from 'lodash/map'
import _size from 'lodash/size'
import { CurrentUserId } from '../../auth/decorators/current-user-id.decorator'
import { JwtAccessTokenGuard } from '../../auth/guards'
import { Auth } from '../../auth/decorators'
import { AppLoggerService } from '../../logger/logger.service'
import { DeleteExtensionParams } from './dtos/delete-extension-params.dto'
import { GetExtensionParams } from './dtos/get-extension-params.dto'
import { GetAllExtensionsQueries } from './dtos/get-all-extensions-queries.dto'
import { ExtensionsService } from './extensions.service'
import { UserService } from '../../user/user.service'
import { UpdateExtensionParams } from './dtos/update-extension-params.dto'
import { SearchExtensionQueries } from './dtos/search-extension-queries.dto'
import { CategoriesService } from '../categories/categories.service'
import { Extension } from './entities/extension.entity'
import { GetInstalledExtensionsQueriesDto } from './dtos/queries/get-installed-extensions.dto'
import { InstallExtensionParamsDto } from './dtos/params/install-extension.dto'
import { UninstallExtensionParamsDto } from './dtos/params/uninstall-extension.dto'
import { InstallExtensionBodyDto } from './dtos/bodies/install-extension.dto'
import { UninstallExtensionBodyDto } from './dtos/bodies/uninstall-extension.dto'
import { ProjectService } from '../../project/project.service'
import { Roles } from '../../auth/decorators/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { UserType } from '../../user/entities/user.entity'
import { ExtensionStatus } from './enums/extension-status.enum'
import {
  CreateExtensionBodyDto,
  UpdateExtensionBodyDto,
  UpdateExtensionParamsDto,
} from './dtos'

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
  constructor(
    private readonly extensionsService: ExtensionsService,
    private readonly categoriesService: CategoriesService,
    private readonly userService: UserService,
    private readonly logger: AppLoggerService,
    private readonly projectService: ProjectService,
  ) {}

  @Get('installed')
  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  async getInstalledExtensions(
    @Query() queries: GetInstalledExtensionsQueriesDto,
    @CurrentUserId() userId: string,
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    this.logger.log({ queries }, 'GET /extensions/installed')

    if (!userId) {
      throw new ForbiddenException(
        'You must be logged in to access this route.',
      )
    }

    const [extensionsToUser, count] =
      await this.extensionsService.findAndCountExtensionToUser(
        {
          where: {
            userId,
          },
          skip: queries.offset || 0,
          take: queries.limit > 100 ? 25 : queries.limit || 25,
        },
        [
          'extension',
          'extension.owner',
          'extension.category',
          'extension.users',
        ],
      )

    let extensions = _map(extensionsToUser, extensionToUser => {
      return extensionToUser.extension
    })

    extensions = _map(extensions, extension => {
      // @ts-expect-error
      extension.usersQuantity = _size(extension.users)
      extension.users = undefined
      // @ts-expect-error
      extension.owner = this.extensionsService.filterOwner(extension.owner)
      return extension
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
  async getExtensions(@Query() queries: GetAllExtensionsQueries) {
    let [extensions, count] =
      await this.extensionsService.getExtensions(queries)

    extensions = _map(extensions, extension => {
      // @ts-expect-error
      extension.usersQuantity = _size(extension.users)
      extension.users = undefined
      // @ts-expect-error
      extension.owner = this.extensionsService.filterOwner(extension.owner)
      return extension
    })

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
  @Auth([UserType.ADMIN])
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Get('admin')
  async getAllExtensionsAdmin(
    @Query() queries: GetAllExtensionsQueries,
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    let [extensions, count] = await this.extensionsService.findAndCount({
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 25 : queries.limit || 25,
      relations: ['owner', 'users', 'category'],
    })

    extensions = _map(extensions, extension => {
      // @ts-expect-error
      extension.usersQuantity = _size(extension.users)
      extension.users = undefined
      // @ts-expect-error
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
  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  async getAllPublishedExtensions(
    @Query() queries: GetAllExtensionsQueries,
    @CurrentUserId() userId: string,
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    if (!userId) {
      throw new ForbiddenException(
        'You must be logged in to access this route.',
      )
    }

    let [extensions, count] = await this.extensionsService.findAndCount({
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 100 : queries.limit || 10,
      where: {
        owner: { id: userId },
      },
      relations: ['owner', 'users', 'category'],
    })

    extensions = _map(extensions, extension => {
      // @ts-expect-error
      extension.usersQuantity = _size(extension.users)
      extension.users = undefined
      // @ts-expect-error
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
  @Get('search')
  async searchExtension(@Query() queries: SearchExtensionQueries) {
    let [extensions, count] =
      await this.extensionsService.searchExtension(queries)

    extensions = _map(extensions, extension => {
      // @ts-expect-error
      extension.usersQuantity = _size(extension.users)
      extension.users = undefined
      // @ts-expect-error
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
  @ApiBearerAuth()
  @Roles(UserType.ADMIN)
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Get('admin/search')
  async searchExtensionAdmin(
    @Query() queries: SearchExtensionQueries,
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    const [extensions, count] = await this.extensionsService.findAndCount({
      where: {
        name: Like(`%${queries.term}%`),
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
  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  @FormDataRequest()
  async createExtension(
    @Body() body: CreateExtensionBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<Extension> {
    if (body.categoryId) {
      const category = await this.categoriesService.getCategoryById(
        Number(body.categoryId),
      )

      if (!category) {
        throw new BadRequestException('Category not found.')
      }
    }

    return this.extensionsService.createExtension({
      ownerId: userId,
      ...body,
    })
  }

  @Patch(':extensionId')
  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  @FormDataRequest()
  async updateExtension(
    @Param() params: UpdateExtensionParamsDto,
    @Body() body: UpdateExtensionBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<Extension> {
    const extension = await this.extensionsService.findUserExtension(
      params.extensionId,
      userId,
    )

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    if (body.categoryId) {
      const category = await this.categoriesService.getCategoryById(
        Number(body.categoryId),
      )

      if (!category) {
        throw new BadRequestException('Category not found.')
      }
    }

    if (Object.keys(body).length === 0) {
      throw new BadRequestException('Extension body is required.')
    }

    const extensionBodyAdditionalImagesCount = body.additionalImages
      ? body.additionalImages.length
      : 0
    const extensionAdditionalImagesCount = extension.additionalImages.length
    const maxAdditionalImagesCount = 5
    const additionalImagesToDelete = body.additionalImagesToDelete
      ? body.additionalImagesToDelete.length
      : 0
    const sum =
      extensionAdditionalImagesCount +
      extensionBodyAdditionalImagesCount -
      additionalImagesToDelete

    if (sum > maxAdditionalImagesCount || sum < 0) {
      throw new BadRequestException(
        `You can upload maximum ${maxAdditionalImagesCount} additional images.`,
      )
    }

    return this.extensionsService.updateExtension(
      params.extensionId,
      body,
      extension.version,
    )
  }

  @ApiBearerAuth()
  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @Patch(':extensionId/approve')
  async approveExtension(
    @Param() params: UpdateExtensionParams,
  ): Promise<Extension> {
    const { extensionId } = params

    const extension = await this.extensionsService.findOne({
      where: { id: extensionId },
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    extension.status = ExtensionStatus.ACCEPTED

    return this.extensionsService.save(extension)
  }

  @ApiBearerAuth()
  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @UseGuards(JwtAccessTokenGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @Patch(':extensionId/reject')
  async rejectExtension(
    @Param() params: UpdateExtensionParams,
  ): Promise<Extension> {
    const { extensionId } = params

    const extension = await this.extensionsService.findOne({
      where: { id: extensionId },
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    extension.status = ExtensionStatus.REJECTED

    return this.extensionsService.save(extension)
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
  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  async installExtension(
    @Param() params: InstallExtensionParamsDto,
    @Body() body: InstallExtensionBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<any> {
    this.logger.log({ params, body }, 'POST /extensions/:extensionId/install')

    if (!userId) {
      throw new ForbiddenException(
        'You must be logged in to access this route.',
      )
    }

    const extension = await this.extensionsService.findOne({
      where: { id: params.extensionId },
    })
    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    const user = await this.userService.findOne({ where: { id: userId } })
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

      return this.extensionsService.createExtensionToUser({
        extensionId: extension.id,
        userId: user.id,
      })
    }

    const project = await this.projectService.findOne({
      where: { id: body.projectId },
    })
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
      await this.extensionsService.deleteExtensionToUser(extension.id, user.id)
    }

    return this.extensionsService.createExtensionToProject({
      extensionId: extension.id,
      projectId: project.id,
    })
  }

  @Delete(':extensionId/uninstall')
  @Auth([UserType.CUSTOMER, UserType.ADMIN])
  async uninstallExtension(
    @Param() params: UninstallExtensionParamsDto,
    @Body() body: UninstallExtensionBodyDto,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    this.logger.log(
      { params, body },
      'DELETE /extensions/:extensionId/uninstall',
    )

    if (!userId) {
      throw new ForbiddenException(
        'You must be logged in to access this route.',
      )
    }

    const extension = await this.extensionsService.findOne({
      where: { id: params.extensionId },
    })
    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    const user = await this.userService.findOne({ where: { id: userId } })
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

      return this.extensionsService.deleteExtensionToUser(extension.id, user.id)
    }

    const project = await this.projectService.findOne({
      where: { id: body.projectId },
    })
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

    return this.extensionsService.deleteExtensionToProject(
      extension.id,
      project.id,
    )
  }
}

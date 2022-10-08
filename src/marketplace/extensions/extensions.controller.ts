import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { getRepository, Like } from 'typeorm'
import { CreateExtension } from './dtos/create-extension.dto'
import { DeleteExtensionParams } from './dtos/delete-extension-params.dto'
import { GetExtensionParams } from './dtos/get-extension-params.dto'
import { GetAllExtensionsQueries } from './dtos/get-all-extensions-queries.dto'
import { ExtensionsService } from './extensions.service'
import { UserService } from '../../user/user.service'
import { ISaveExtension } from './interfaces/save-extension.interface'
import { UpdateExtensionParams } from './dtos/update-extension-params.dto'
import { UpdateExtension } from './dtos/update-extension.dto'
import { BodyValidationPipe } from '../common/pipes/body-validation.pipe'
import { SearchExtensionQueries } from './dtos/search-extension-queries.dto'
import { CategoriesService } from '../categories/categories.service'
import { SortByExtension } from './enums/sort-by-extension.enum'
import { CdnService } from '../cdn/cdn.service'
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator'
import { Extension } from './entities/extension.entity'
import { GetInstalledExtensionsQueriesDto } from './dtos/queries/get-installed-extensions.dto'
import { InstallExtensionParamsDto } from './dtos/params/install-extension.dto'
import { UninstallExtensionParamsDto } from './dtos/params/uninstall-extension.dto'
import { InstallExtensionQueriesDto } from './dtos/queries/install-extension.dto'
import { UninstallExtensionQueriesDto } from './dtos/queries/uninstall-extension.dto'
import { InstallExtensionBodyDto } from './dtos/bodies/install-extension.dto'
import { UninstallExtensionBodyDto } from './dtos/bodies/uninstall-extension.dto'

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
  ) {}

  @Get('installed')
  async getInstalledExtensions(
    @Query() queries: GetInstalledExtensionsQueriesDto,
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    this.logger.debug({ queries })

    const [extensions, count] = await this.extensionsService.findAndCount({
      where: {
        ownerId: queries.userId,
      },
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 25 : queries.limit || 25,
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
  @Get()
  async getAllExtensions(@Query() queries: GetAllExtensionsQueries): Promise<{
    extensions: Extension[]
    count: number
  }> {
    const [extensions, count] = await this.extensionsService.findAndCount(
      {
        skip: queries.offset || 0,
        take: queries.limit > 100 ? 25 : queries.limit || 25,
      },
      ['owner'],
    )

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
  ): Promise<{
    extensions: Extension[]
    count: number
  }> {
    const [extensions, count] = await this.extensionsService.findAndCount({
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 25 : queries.limit || 25,
      where: {
        ownerId: queries.ownerId,
      },
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
  async searchExtension(@Query() queries: SearchExtensionQueries): Promise<{
    extensions: Extension[]
    count: number
  }> {
    if (queries.category) {
      const [extensions, count] = await getRepository(Extension)
        .createQueryBuilder('extension')
        .leftJoin('extension.categories', 'category')
        .where('extension.name LIKE :term', { term: `%${queries.term}%` })
        .andWhere('category.name = :category', { category: queries.category })
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
      relations: ['categories'],
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
    ]),
  )
  async createExtension(
    @Body() body: CreateExtension,
    @CurrentUserId() userId: string,
    @UploadedFiles()
    files: {
      mainImage?: Express.Multer.File
      additionalImages?: Express.Multer.File[]
    },
  ): Promise<ISaveExtension & Extension> {
    const additionalImageFilenames = []

    if (files.additionalImages) {
      files.additionalImages.map(async additionalImage => {
        additionalImageFilenames.push(
          (await this.cdnService.uploadFile(additionalImage))?.filename,
        )
      })
    }

    const user = await this.userService.findOne(userId)
    const extensionInstance = this.extensionsService.create({
      name: body.name,
      description: body.description,
      version: body.version,
      price: body.price,
      owner: user,
      mainImage: files.mainImage
        ? (await this.cdnService.uploadFile(files.mainImage[0]))?.filename
        : undefined,
      additionalImages: files.additionalImages ? additionalImageFilenames : [],
      categories: body.categoriesIds
        ? await this.categoriesService.findByIds(body.categoriesIds)
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
  @Patch(':extensionId')
  async updateExtension(
    @Param() params: UpdateExtensionParams,
    @Body(new BodyValidationPipe()) body: UpdateExtension,
  ): Promise<UpdateExtension> {
    const extension = await this.extensionsService.findById(params.extensionId)

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    await this.extensionsService.update(extension.id, body)

    return body
  }

  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @Delete(':extensionId')
  async deleteExtension(@Param() params: DeleteExtensionParams): Promise<void> {
    const extension = await this.extensionsService.findById(params.extensionId)

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    await this.extensionsService.delete(extension.id)
  }

  @Post(':extensionId/install')
  async installExtension(
    @Param() params: InstallExtensionParamsDto,
    @Query() queries: InstallExtensionQueriesDto,
    @Body() body: InstallExtensionBodyDto,
  ): Promise<void> {
    this.logger.debug({ params, queries, body })
  }

  @Delete(':extensionId/uninstall')
  async uninstallExtension(
    @Param() params: UninstallExtensionParamsDto,
    @Query() queries: UninstallExtensionQueriesDto,
    @Body() body: UninstallExtensionBodyDto,
  ): Promise<void> {
    this.logger.debug({ params, queries, body })
  }
}

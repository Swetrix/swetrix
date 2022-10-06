import { UpdateUserProfileDTO } from './../../user/dto/update-user.dto'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import { InstallExtensionParams } from './dtos/install-extension.dto'
import { Extension } from './extension.entity'
import { InstallExtension } from './installExtension.entiy'
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

import * as _forEach from 'lodash/forEach'

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
    private readonly cdnService: CdnService,
  ) {}

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
  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: 'de025965-3221-4d09-ba35-a09da59793a6',
    type: String,
  })
  @Get('install/:extensionId')
  async installExtension(
    @Param() params: InstallExtensionParams,
    @CurrentUserId() userId: string,
  ): Promise<{ user: UpdateUserProfileDTO; extension: UpdateExtension }> {
    const extension = await this.extensionsService.findById(params.extensionId)

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    const user = await this.userService.findOne(userId)

    _forEach(user.installExtensions, ({ id }) => {
      console.log(id, 'id')
      if (id === extension.id) {
        throw new BadRequestException('Extension already installed.')
      }
    })
    extension.installs += 1
    await this.extensionsService.update(extension.id, {
      installs: extension.installs,
    })

    const installExtensionDate = new InstallExtension()
    installExtensionDate.extensionId = extension.id
    installExtensionDate.userId = userId
    installExtensionDate.projects = null
    installExtensionDate.active = true

    const extensionInstallInstance = await this.extensionsService.createInstall(
      installExtensionDate,
    )

    const installExtension = await this.extensionsService.saveInstall(
      extensionInstallInstance,
    )

    await this.userService.update(userId, {
      installExtensions: installExtension.id,
    })

    const test = await this.userService.findOneWithRelations(userId, [
      'installExtensions',
      'installExtensions.extensionId',
      'installExtensions.projects',
      'installExtensions.userId',
    ])
    return { user: test, extension }
  }
}

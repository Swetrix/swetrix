import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { getRepository, Like } from 'typeorm'
import { CreateExtension } from './dtos/create-extension.dto'
import { DeleteExtensionParams } from './dtos/delete-extension-params.dto'
import { GetExtensionParams } from './dtos/get-extension-params.dto'
import { GetAllExtensionsQueries } from './dtos/get-all-extensions-queries.dto'
import { Extension } from './extension.entity'
import { ExtensionsService } from './extensions.service'
import { ISaveExtension } from './interfaces/save-extension.interface'
import { UpdateExtensionParams } from './dtos/update-extension-params.dto'
import { UpdateExtension } from './dtos/update-extension.dto'
import { BodyValidationPipe } from '../common/pipes/body-validation.pipe'
import { SearchExtensionQueries } from './dtos/search-extension-queries.dto'
import { Category } from '../categories/category.entity'
import { CategoriesService } from '../categories/categories.service'

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
  async createExtension(
    @Body() body: CreateExtension,
  ): Promise<ISaveExtension & Extension> {
    const categories: Category[] = []

    if (body.categoriesIds) {
      await Promise.all(
        body.categoriesIds.map(async categoryId => {
          const category = await this.categoriesService.findById(categoryId)

          if (!category) {
            throw new NotFoundException('Category not found.')
          }

          categories.push(category)
        }),
      )
    }

    const extensionInstance = this.extensionsService.create({
      name: body.name,
      description: body.description,
      version: body.version,
      categories,
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
}

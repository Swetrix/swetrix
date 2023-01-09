import {
  Body,
  ConflictException,
  Controller,
  Delete,
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
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Roles } from '../../auth/decorators/roles.decorator'
import { RolesGuard } from '../../auth/guards/roles.guard'
import { UserType } from '../../user/entities/user.entity'
import { CategoriesService } from './categories.service'
import { Category } from './category.entity'
import { CreateCategory } from './dtos/create-category.dto'
import { DeleteCategoryParams } from './dtos/delete-category-params.dto'
import { GetAllCategoriesQueries } from './dtos/get-all-categories-queries.dto'
import { GetCategoryParams } from './dtos/get-category-params.dto'
import { UpdateCategoryParams } from './dtos/update-category-params.dto'
import { UpdateCategory } from './dtos/update-category.dto'
import { ISaveCategory } from './interfaces/save-category.interface'
import { BodyValidationPipe } from '../common/pipes/body-validation.pipe'

@ApiTags('categories')
@UsePipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    whitelist: true,
  }),
)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiQuery({
    description: 'Category offset',
    example: '15',
    name: 'offset',
    required: false,
    type: String,
  })
  @ApiQuery({
    description: 'Category limit',
    example: '75',
    name: 'limit',
    required: false,
    type: String,
  })
  @Get()
  async getAllCategories(@Query() queries: GetAllCategoriesQueries): Promise<{
    categories: Category[]
    count: number
  }> {
    const [categories, count] = await this.categoriesService.findAndCount({
      skip: queries.offset || 0,
      take: queries.limit > 100 ? 25 : queries.limit || 25,
    })

    return { categories, count }
  }

  @ApiParam({
    name: 'categoryId',
    description: 'Category ID',
    example: 1,
    type: Number,
  })
  @Get(':categoryId')
  async getCategory(@Param() params: GetCategoryParams): Promise<Category> {
    const category = await this.categoriesService.findOne({
      where: {
        id: params.categoryId,
      },
      relations: ['extensions'],
    })

    if (!category) {
      throw new NotFoundException('Category not found.')
    }

    return category
  }

  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Post()
  async createCategory(
    @Body() body: CreateCategory,
  ): Promise<ISaveCategory & Category> {
    const categoryName = await this.categoriesService.findByName(body.name)

    if (categoryName) {
      throw new ConflictException('A category with that name already exists.')
    }

    const categoryInstance = this.categoriesService.create(body)

    return await this.categoriesService.save(categoryInstance)
  }

  @ApiParam({
    name: 'categoryId',
    description: 'Category ID',
    example: 1,
    type: Number,
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Patch(':categoryId')
  async updateCategory(
    @Param() params: UpdateCategoryParams,
    @Body(new BodyValidationPipe()) body: UpdateCategory,
  ): Promise<UpdateCategory> {
    const category = await this.categoriesService.findById(params.categoryId)

    if (!category) {
      throw new NotFoundException('Category not found.')
    }

    if (body.name) {
      const categoryName = await this.categoriesService.findByName(body.name)

      if (categoryName) {
        throw new ConflictException('A category with that name already exists.')
      }
    }

    await this.categoriesService.update(category.id, body)

    return body
  }

  @ApiParam({
    name: 'categoryId',
    description: 'Category ID',
    example: 1,
    type: Number,
  })
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @Delete(':categoryId')
  async deleteCategory(@Param() params: DeleteCategoryParams): Promise<void> {
    const category = await this.categoriesService.findById(params.categoryId)

    if (!category) {
      throw new NotFoundException('Category not found.')
    }

    await this.categoriesService.delete(category.id)
  }
}

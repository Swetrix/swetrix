import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { Category } from './category.entity'
import { GetAllCategoriesQueries } from './dtos/get-all-categories-queries.dto'
import { GetCategoryParams } from './dtos/get-category-params.dto'

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
}

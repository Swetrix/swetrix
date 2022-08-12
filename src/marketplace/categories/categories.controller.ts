import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { Category } from './category.entity'
import { CreateCategory } from './dtos/create-category.dto'
import { UpdateCategoryParams } from './dtos/update-category-params.dto'
import { UpdateCategory } from './dtos/update-category.dto'
import { ISaveCategory } from './interfaces/save-category.interface'

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async createCategory(
    @Body() body: CreateCategory,
  ): Promise<ISaveCategory & Category> {
    const title = await this.categoriesService.findTitle(body.title)

    if (title) {
      throw new ConflictException('The category already exists.')
    }

    const categoryInstance = this.categoriesService.create(body)

    return await this.categoriesService.save(categoryInstance)
  }

  @Patch(':categoryId')
  async updateCategory(
    @Param() params: UpdateCategoryParams,
    @Body() body: UpdateCategory,
  ): Promise<UpdateCategory> {
    const category = await this.categoriesService.findById(params.categoryId)

    if (!category) {
      throw new NotFoundException('Category not found.')
    }

    await this.categoriesService.update(category.id, body)

    return body
  }
}
